// Recebe a notificação do Mercado Pago quando o status de um pagamento muda.
// Nunca confia no corpo da notificação — sempre busca o pagamento de verdade
// na API do Mercado Pago antes de creditar qualquer coisa (é assim que a
// documentação do Mercado Pago recomenda: o webhook é só um "avise que mudou
// algo", não uma fonte confiável de dados).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Sempre responde 200 pro Mercado Pago não ficar reenviando o mesmo evento
  // em loop — falhas ficam só no log da função.
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const paymentId = body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");

    if (!paymentId) {
      return new Response("ignored: no payment id", { status: 200 });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!mpRes.ok) {
      console.error("Falha ao buscar pagamento no Mercado Pago:", paymentId);
      return new Response("mp fetch failed", { status: 200 });
    }
    const payment = await mpRes.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: row } = await supabase.from("pix_payments").select("*").eq("mp_payment_id", String(paymentId)).maybeSingle();
    if (!row) {
      return new Response("payment not found locally", { status: 200 });
    }
    // Idempotência: se um pagamento já aprovado receber outra notificação, não credita de novo.
    if (row.status === "approved") {
      return new Response("already processed", { status: 200 });
    }

    const newStatus = payment.status === "approved" ? "approved"
      : payment.status === "rejected" ? "rejected"
      : (payment.status === "cancelled" || payment.status === "expired") ? "expired"
      : "pending";

    if (newStatus === "pending") {
      return new Response("still pending", { status: 200 });
    }

    await supabase.from("pix_payments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (newStatus === "approved") {
      const { error: creditErr } = await supabase.rpc("credit_coins_from_pix", {
        p_user_id: row.user_id,
        p_amount: row.coins_amount,
        p_pix_payment_id: row.id,
      });
      if (creditErr) {
        console.error("Falha ao creditar moedas do PIX:", creditErr.message);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    return new Response("error", { status: 200 });
  }
});
