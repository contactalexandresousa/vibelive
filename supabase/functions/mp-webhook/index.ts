// Recebe a notificação do Mercado Pago quando o status de um pagamento muda.
// Nunca confia no corpo da notificação — sempre busca o pagamento de verdade
// na API do Mercado Pago antes de creditar qualquer coisa (é assim que a
// documentação do Mercado Pago recomenda: o webhook é só um "avise que mudou
// algo", não uma fonte confiável de dados).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Dispara o recibo de compra por e-mail — já estamos numa Edge Function, então
// chama send-receipt-email direto por fetch, sem precisar do pg_net que os
// gatilhos SQL usam pra fazer a mesma coisa (0059).
async function sendPurchaseReceipt(userId: string, methodLabel: string, coins: number, brl: number) {
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">`
    + `<h2 style="color:#ff4d6d;margin:0 0 16px;">VibeLive</h2>`
    + `<p style="font-size:15px;color:#1c1c22;">Recebemos seu pagamento via ${methodLabel} de <strong>R$ ${brl.toFixed(2).replace(".", ",")}</strong> e já creditamos <strong>🪙 ${coins} moedas</strong> na sua conta.</p>`
    + `<p style="font-size:12px;color:#8b8b93;margin-top:24px;">Este é um recibo automático, não é preciso responder.</p>`
    + `</div>`;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-receipt-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, subject: "VibeLive — Pagamento confirmado", html }),
    });
  } catch (err) {
    console.error("Falha ao disparar recibo de compra:", err);
  }
}

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

    const newStatus = payment.status === "approved" ? "approved"
      : payment.status === "rejected" ? "rejected"
      : (payment.status === "cancelled" || payment.status === "expired") ? "expired"
      : "pending";

    // PIX: criado com mp_payment_id já preenchido (a cobrança é feita direto
    // na API de Pagamentos), então basta achar pelo id do pagamento.
    const { data: pixRow } = await supabase.from("pix_payments").select("*").eq("mp_payment_id", String(paymentId)).maybeSingle();
    if (pixRow) {
      if (pixRow.status === "approved") return new Response("already processed", { status: 200 });
      if (newStatus === "pending") return new Response("still pending", { status: 200 });

      await supabase.from("pix_payments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", pixRow.id);

      if (newStatus === "approved") {
        const { error: creditErr } = await supabase.rpc("credit_coins_from_pix", {
          p_user_id: pixRow.user_id,
          p_amount: pixRow.coins_amount,
          p_pix_payment_id: pixRow.id,
        });
        if (creditErr) console.error("Falha ao creditar moedas do PIX:", creditErr.message);
        else await sendPurchaseReceipt(pixRow.user_id, "PIX", pixRow.coins_amount, Number(pixRow.brl_amount));
      }
      return new Response("ok", { status: 200 });
    }

    // Cartão (Checkout Pro): o pagamento só existe depois que o cliente
    // termina o checkout no Mercado Pago, então a linha em card_payments não
    // tem mp_payment_id ainda — só dá pra achar pelo external_reference (o id
    // da própria linha, gerado em create-card-checkout antes de chamar o MP).
    const cardPaymentId = payment.external_reference;
    if (!cardPaymentId) {
      return new Response("payment not found locally", { status: 200 });
    }
    const { data: cardRow } = await supabase.from("card_payments").select("*").eq("id", cardPaymentId).maybeSingle();
    if (!cardRow) {
      return new Response("payment not found locally", { status: 200 });
    }
    if (cardRow.status === "approved") return new Response("already processed", { status: 200 });
    if (newStatus === "pending") return new Response("still pending", { status: 200 });

    await supabase.from("card_payments")
      .update({ status: newStatus, mp_payment_id: String(paymentId), updated_at: new Date().toISOString() })
      .eq("id", cardRow.id);

    if (newStatus === "approved") {
      const { error: creditErr } = await supabase.rpc("credit_coins_from_card", {
        p_user_id: cardRow.user_id,
        p_amount: cardRow.coins_amount,
        p_card_payment_id: cardRow.id,
      });
      if (creditErr) console.error("Falha ao creditar moedas do cartão:", creditErr.message);
      else await sendPurchaseReceipt(cardRow.user_id, "cartão de crédito", cardRow.coins_amount, Number(cardRow.brl_amount));
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    return new Response("error", { status: 200 });
  }
});
