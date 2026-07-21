// Cria uma preferência de pagamento (Checkout Pro) no Mercado Pago pra
// compra de moedas com cartão de crédito. Diferente do PIX (create-pix-payment,
// que chama a API de Pagamentos direto), Checkout Pro é hospedado pelo próprio
// Mercado Pago — o cliente abre a página deles (init_point) numa aba nova, e o
// resultado chega aqui do mesmo jeito que o PIX: só pelo webhook (mp-webhook),
// nunca por um valor que o cliente devolve depois.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://contactalexandresousa.github.io/vibelive/";

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
  const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const pkg = PACKAGES[body.package_code];
  if (!pkg) {
    return new Response(JSON.stringify({ error: "Pacote inválido" }), { status: 400, headers: corsHeaders });
  }

  // Gerado ANTES de chamar o Mercado Pago e mandado como external_reference:
  // é assim que o webhook (que só recebe o id do pagamento, criado só quando
  // o cliente termina de preencher o cartão) consegue achar esta linha depois
  // — diferente do PIX, aqui não existe mp_payment_id no momento da criação.
  const cardPaymentId = crypto.randomUUID();

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      items: [{
        title: `VibeLive - ${pkg.coins} moedas`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: pkg.brl,
      }],
      payer: { email: user.email },
      // Foco em cartão: exclui boleto e transferência (categoria em que o PIX
      // entra na taxonomia do Mercado Pago) — a compra via PIX já tem seu
      // próprio botão/fluxo dedicado (create-pix-payment).
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
        installments: 12,
      },
      back_urls: { success: SITE_URL, failure: SITE_URL, pending: SITE_URL },
      external_reference: cardPaymentId,
    }),
  });

  const mpData = await mpRes.json();
  if (!mpRes.ok) {
    console.error("Erro Mercado Pago (preference):", JSON.stringify(mpData));
    return new Response(JSON.stringify({ error: "Não foi possível iniciar o pagamento com cartão" }), { status: 502, headers: corsHeaders });
  }

  const { data: row, error: insertErr } = await supabase.from("card_payments").insert({
    id: cardPaymentId,
    user_id: user.id,
    mp_preference_id: mpData.id,
    package_code: body.package_code,
    coins_amount: pkg.coins,
    brl_amount: pkg.brl,
    status: "pending",
    init_point: mpData.init_point,
  }).select().single();

  if (insertErr) {
    console.error("Erro ao salvar checkout de cartão:", insertErr.message);
    return new Response(JSON.stringify({ error: "Erro interno ao registrar pagamento" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ payment: row }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
