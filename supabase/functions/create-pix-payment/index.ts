// Cria uma cobrança PIX real na API do Mercado Pago. Roda como Edge Function
// (não no cliente) porque precisa do Access Token do Mercado Pago, que é um
// segredo de verdade — diferente da anon key do Supabase, ele NUNCA pode
// aparecer em código que roda no navegador.
//
// Mesmo princípio de segurança usado nas RPCs da carteira (supabase/migrations/0002):
// o cliente só manda o código do pacote, nunca o valor — o valor em reais e em
// moedas é decidido aqui dentro, a partir de um catálogo fixo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PACKAGES: Record<string, { coins: number; brl: number }> = {
  p50: { coins: 50, brl: 4.99 },
  p150: { coins: 150, brl: 12.99 },
  p500: { coins: 500, brl: 39.99 },
  p1200: { coins: 1200, brl: 79.99 },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const pkg = PACKAGES[body.package_code];
  if (!pkg) {
    return new Response(JSON.stringify({ error: "Pacote inválido" }), { status: 400, headers: corsHeaders });
  }

  const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      transaction_amount: pkg.brl,
      description: `VibeLive - ${pkg.coins} moedas`,
      payment_method_id: "pix",
      payer: { email: user.email ?? `${user.id}@vibelive.anon` },
    }),
  });

  const mpData = await mpRes.json();
  if (!mpRes.ok) {
    console.error("Erro Mercado Pago:", JSON.stringify(mpData));
    return new Response(JSON.stringify({ error: "Não foi possível gerar o pagamento PIX" }), { status: 502, headers: corsHeaders });
  }

  const { data: row, error: insertErr } = await supabase.from("pix_payments").insert({
    user_id: user.id,
    mp_payment_id: String(mpData.id),
    package_code: body.package_code,
    coins_amount: pkg.coins,
    brl_amount: pkg.brl,
    status: "pending",
    qr_code: mpData.point_of_interaction?.transaction_data?.qr_code ?? null,
    qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
  }).select().single();

  if (insertErr) {
    console.error("Erro ao salvar pagamento:", insertErr.message);
    return new Response(JSON.stringify({ error: "Erro interno ao registrar pagamento" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ payment: row }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
