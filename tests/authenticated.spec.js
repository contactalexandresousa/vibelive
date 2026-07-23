// Testes de fluxo autenticado de verdade (login, gasto, saque) — rodam contra
// um projeto Supabase de STAGING separado (vibelive-staging), nunca contra
// produção, porque criam conta, gastam moeda e abrem pedido de saque de
// verdade. As migrations do projeto de staging são as mesmas de produção
// (aplicadas 1:1), então testar aqui cobre exatamente as mesmas RPCs/RLS.
//
// Pula inteiro se as credenciais de staging não estiverem no ambiente — assim
// dá pra rodar `npm test` localmente sem configurar nada, e o job de CI só
// entra nesse arquivo quando os secrets STAGING_* existem no repositório.
const { test, expect } = require("@playwright/test");

const STAGING_URL = process.env.STAGING_SUPABASE_URL;
const STAGING_ANON_KEY = process.env.STAGING_SUPABASE_ANON_KEY;
const STAGING_SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

test.skip(!STAGING_URL || !STAGING_ANON_KEY || !STAGING_SERVICE_ROLE_KEY, "Credenciais de staging não configuradas neste ambiente");

// Mesmo algoritmo de dígito verificador de public._is_valid_cpf (migration
// 0041) — gera um CPF que passa na validação real do servidor, sem usar
// nenhum CPF de pessoa de verdade.
function generateValidCpf() {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (base.every((d) => d === base[0])) base[8] = (base[8] + 1) % 10;
  const checkDigit = (digits, weightStart) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) sum += digits[i] * (weightStart - i);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = checkDigit(base, 10);
  const d2 = checkDigit([...base, d1], 11);
  return [...base, d1, d2].join("");
}

async function createStagingTestUser(email, password) {
  const res = await fetch(`${STAGING_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: STAGING_SERVICE_ROLE_KEY, Authorization: `Bearer ${STAGING_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { birth_date: "2000-01-01", terms_accepted: true } }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Falha ao criar usuário de staging: ${JSON.stringify(body)}`);
  return body.id;
}

async function deleteStagingTestUser(userId) {
  await fetch(`${STAGING_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: STAGING_SERVICE_ROLE_KEY, Authorization: `Bearer ${STAGING_SERVICE_ROLE_KEY}` },
  });
}

// Um PATCH comum via PostgREST (mesmo com a service role key) não funciona
// aqui: o trigger protect_profile_economy (0010) reverte qualquer update em
// coins/xp/level/is_vip quando current_user não é 'postgres'/'supabase_admin'
// — e PostgREST roda como o role "service_role", não como "postgres". Por
// isso existe _test_seed_profile, uma função SECURITY DEFINER dona de
// postgres criada só no projeto de staging (nunca nas migrations
// compartilhadas com produção) — dentro dela current_user vira postgres,
// exatamente como as RPCs reais da carteira (send_gift etc.) já fazem.
async function seedStagingProfile(userId, coins) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(`${STAGING_URL}/rest/v1/rpc/_test_seed_profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: STAGING_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${STAGING_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ p_user_id: userId, p_coins: coins }),
    });
    if (!res.ok) throw new Error(`Falha ao chamar _test_seed_profile: ${await res.text()}`);

    // O UPDATE dentro da função não erra se a linha ainda não existir (0
    // linhas afetadas, sem exceção) — a linha em profiles só aparece depois
    // que a trigger handle_new_user roda em cima do INSERT em auth.users,
    // que pode não ter acontecido ainda no instante em que admin.createUser
    // responde. Confirma lendo de volta antes de considerar concluído.
    const profile = await getStagingProfile(userId);
    if (profile && profile.coins === coins) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`profiles.id=${userId} nunca apareceu pra receber o saldo de teste`);
}

async function getStagingProfile(userId) {
  const res = await fetch(`${STAGING_URL}/rest/v1/profiles?id=eq.${userId}&select=coins`, {
    headers: { apikey: STAGING_SERVICE_ROLE_KEY, Authorization: `Bearer ${STAGING_SERVICE_ROLE_KEY}` },
  });
  const rows = await res.json();
  return rows[0];
}

// Aponta o app pro Supabase de staging antes de qualquer script do app rodar
// (supabase-client.js lê window.__TEST_SUPABASE_URL__/__TEST_SUPABASE_KEY__
// antes de criar o client, com fallback pra produção quando não existem).
async function gotoStaging(page) {
  await page.addInitScript(
    ({ url, key }) => {
      window.__TEST_SUPABASE_URL__ = url;
      window.__TEST_SUPABASE_KEY__ = key;
    },
    { url: STAGING_URL, key: STAGING_ANON_KEY }
  );
  await page.goto("/index.html");
  await page.waitForFunction(() => typeof STATE !== "undefined" && STATE.activeScreen === "discover", { timeout: 10000 });
}

test.describe("Login real (staging)", () => {
  let userId;
  const email = `auth-test-${Date.now()}@gmail.com`;
  const password = "TestSenha123!";

  test.beforeAll(async () => {
    userId = await createStagingTestUser(email, password);
    await seedStagingProfile(userId, 0);
  });

  test.afterAll(async () => {
    await deleteStagingTestUser(userId);
  });

  test("login pela tela real autentica e mantém sessão após recarregar", async ({ page }) => {
    await gotoStaging(page);
    await page.evaluate(() => navigateTo("auth"));
    await page.waitForSelector("#screen-auth.active");

    await page.fill("#auth-username", email);
    await page.fill("#auth-password", password);
    await page.click("#btn-auth-submit");

    await page.waitForFunction(() => typeof STATE !== "undefined" && STATE.isLoggedIn === true, { timeout: 15000 });

    await page.reload();
    await page.waitForFunction(() => typeof STATE !== "undefined" && STATE.activeScreen !== "splash", { timeout: 10000 });
    const stillLoggedIn = await page.evaluate(async () => !!(await Auth.getSession()));
    expect(stillLoggedIn).toBe(true);
  });
});

test.describe("Gasto real (staging)", () => {
  let userId;
  const email = `spend-test-${Date.now()}@gmail.com`;
  const password = "TestSenha123!";

  test.beforeAll(async () => {
    userId = await createStagingTestUser(email, password);
    await seedStagingProfile(userId, 1000);
  });

  test.afterAll(async () => {
    await deleteStagingTestUser(userId);
  });

  test("girar roleta debita moedas de verdade no servidor e persiste após reload", async ({ page }) => {
    await gotoStaging(page);
    await page.evaluate(
      async ({ email, password }) => { await Auth.signIn(email, password); },
      { email, password }
    );

    const before = (await getStagingProfile(userId)).coins;
    expect(before).toBe(1000);

    const result = await page.evaluate(async () => await DB.spinRoulette());
    expect(result.profile.coins).toBe(before - 10);

    await page.reload();
    const after = await getStagingProfile(userId);
    expect(after.coins).toBe(before - 10);
  });
});

test.describe("Saque real (staging)", () => {
  // fullyParallel:true deixa cada teste ir pra um worker diferente por
  // padrão — como os dois testes aqui dividem o MESMO usuário criado uma vez
  // em beforeAll, cada worker reimportaria este arquivo e geraria seu próprio
  // Date.now(), correndo o risco de duas criações simultâneas com e-mails
  // colididos (mesma millisecond) ou dois usuários que o segundo teste não
  // enxerga. "serial" garante os dois na mesma instância de worker.
  test.describe.configure({ mode: "serial" });

  let userId;
  const email = `withdraw-test-${Date.now()}@gmail.com`;
  const password = "TestSenha123!";
  const cpf = generateValidCpf();

  test.beforeAll(async () => {
    userId = await createStagingTestUser(email, password);
    await seedStagingProfile(userId, 1000);
  });

  test.afterAll(async () => {
    await deleteStagingTestUser(userId);
  });

  test("cadastra CPF válido e solicita saque real, debitando o saldo e criando o pedido", async ({ page }) => {
    await gotoStaging(page);
    await page.evaluate(
      async ({ email, password }) => { await Auth.signIn(email, password); },
      { email, password }
    );

    const outcome = await page.evaluate(async (cpf) => {
      try {
        await DB.setMyCpf(cpf);
        const request = await DB.requestWithdrawal(500, cpf, "cpf");
        return { ok: true, request };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    }, cpf);
    expect(outcome.ok, outcome.error).toBe(true);
    expect(outcome.request.coins_amount).toBe(500);
    expect(outcome.request.status).toBe("pending");

    const profile = await getStagingProfile(userId);
    expect(profile.coins).toBe(500);

    await page.reload();
    const afterReload = await getStagingProfile(userId);
    expect(afterReload.coins).toBe(500);
  });

  test("saque abaixo do mínimo é rejeitado pelo servidor, não só pelo cliente", async ({ page }) => {
    await gotoStaging(page);
    await page.evaluate(
      async ({ email, password }) => { await Auth.signIn(email, password); },
      { email, password }
    );

    // Captura o erro DENTRO do page.evaluate e devolve como string simples —
    // um objeto de erro do PostgREST lançado através da fronteira do evaluate
    // não chega no lado do Node com .message utilizável (vira só "Object").
    const errorMessage = await page.evaluate(async (cpf) => {
      try {
        await DB.requestWithdrawal(10, cpf, "cpf");
        return null;
      } catch (err) {
        return err.message || String(err);
      }
    }, cpf);
    expect(errorMessage).toContain("saque mínimo");
  });
});
