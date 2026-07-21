// Testes de fumaça: rodam contra o Supabase de PRODUÇÃO de verdade, então de
// propósito só fazem operações de leitura pública e checagens de UI — nada
// que crie conta, gaste moeda ou grave dado nenhum. Cobrem a classe de
// regressão mais comum (erro de JS que quebra o carregamento, elemento com
// id errado, modal que não abre). Fluxos autenticados completos (login,
// gasto, saque) têm sua própria suíte em authenticated.spec.js, rodando
// contra um projeto Supabase de staging separado — ver aquele arquivo.
const { test, expect } = require("@playwright/test");

test.describe("Carregamento inicial", () => {
  test("app carrega sem erro de console e cai no Discover como visitante", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/index.html");
    await page.waitForFunction(() => typeof STATE !== "undefined" && STATE.activeScreen === "discover", { timeout: 10000 });

    expect(errors).toEqual([]);
    await expect(page.locator("#screen-discover")).toHaveClass(/active/);
  });

  test("categorias Vibe Hot/Nova/Privada existem e alternam a aba ativa", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => typeof STATE !== "undefined" && STATE.activeScreen === "discover", { timeout: 10000 });

    await page.click('.vibe-category-card[data-filter="nova"]');
    await expect(page.locator('.vibe-category-card[data-filter="nova"]')).toHaveClass(/active/);

    await page.click('.vibe-category-card[data-filter="privada"]');
    await expect(page.locator('.vibe-category-card[data-filter="privada"]')).toHaveClass(/active/);
  });
});

test.describe("Formulário de autenticação", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => typeof STATE !== "undefined" && STATE.activeScreen === "discover", { timeout: 10000 });
    await page.evaluate(() => navigateTo("auth"));
    await page.waitForSelector("#screen-auth.active");
  });

  test("aba Criar Conta mostra data de nascimento, termos e código de convite", async ({ page }) => {
    await page.click("#btn-tab-register");
    await expect(page.locator("#auth-birthdate-group")).toBeVisible();
    await expect(page.locator("#auth-terms-group")).toBeVisible();
    await expect(page.locator("#auth-referral-group")).toBeVisible();
  });

  test("cadastro sem aceitar os Termos é bloqueado no cliente antes de qualquer chamada de rede", async ({ page }) => {
    let signupCalled = false;
    await page.route("**/auth/v1/signup", (route) => {
      signupCalled = true;
      route.abort();
    });

    await page.click("#btn-tab-register");
    await page.fill("#auth-username", `smoke-test-${Date.now()}@example.com`);
    await page.fill("#auth-password", "SenhaTeste123!");
    await page.fill("#auth-confirm-password", "SenhaTeste123!");
    await page.fill("#auth-birthdate", "2000-01-01");
    // Não marca o checkbox de termos de propósito.
    await page.click("#btn-auth-submit");
    await page.waitForTimeout(500);

    expect(signupCalled).toBe(false);
  });

  test("modal de Termos de Uso abre com as duas abas (Uso/Privacidade)", async ({ page }) => {
    await page.evaluate(() => openTermsModal());
    await expect(page.locator("#modal-terms")).toBeVisible();
    await expect(page.locator("#terms-tab-uso")).toBeVisible();

    await page.click("#btn-terms-tab-privacidade");
    await expect(page.locator("#terms-tab-privacidade")).toBeVisible();
  });
});

test.describe("Central de Ajuda", () => {
  test("abre e fecha sem erro", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => typeof STATE !== "undefined" && STATE.activeScreen === "discover", { timeout: 10000 });

    await page.evaluate(() => openHelpModal());
    await expect(page.locator("#modal-help")).toBeVisible();

    await page.evaluate(() => closeHelpModal());
    await expect(page.locator("#modal-help")).toBeHidden();
  });
});

test.describe("Dados públicos reais (leitura, sem autenticação)", () => {
  test("busca de perfis sem digitar nada sugere contas reais da plataforma", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => typeof STATE !== "undefined" && STATE.activeScreen === "discover", { timeout: 10000 });

    await page.evaluate(() => openSearchOverlay());
    await page.waitForTimeout(1500);

    const container = page.locator("#search-results-container");
    // Só verifica que ALGUMA coisa renderizou (perfis reais ou o estado vazio
    // com o texto de instrução) — não assume quantidade, já que é dado real
    // de produção que muda com o tempo.
    await expect(container).not.toBeEmpty();
  });
});
