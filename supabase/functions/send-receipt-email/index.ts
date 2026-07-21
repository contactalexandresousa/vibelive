// Recebe {user_id, subject, html} — de um gatilho do Postgres (via pg_net,
// mesmo padrão do send-push em 0039) ou direto do webhook do Mercado Pago —
// e manda um e-mail transacional de verdade via Resend. Sem verificação de
// entrada pelo mesmo motivo do send-push: o pior caso de bater aqui direto é
// reenviar um recibo legítimo pro dono de um uuid, nunca fabrica conteúdo
// novo nem expõe dado sensível de outra pessoa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

// onboarding@resend.dev funciona sem verificar domínio próprio — a troca pra
// um remetente com o domínio do VibeLive é só essa constante, quando/se um
// domínio for verificado na conta Resend.
const FROM_ADDRESS = "VibeLive <onboarding@resend.dev>";

Deno.serve(async (req) => {
  try {
    const { user_id, subject, html } = await req.json();
    if (!user_id || !subject || !html) {
      return new Response("missing user_id/subject/html", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.admin.getUserById(user_id);
    if (error || !data.user?.email) {
      return new Response("user has no email", { status: 200 });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: data.user.email,
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      console.error("Falha ao enviar e-mail via Resend:", await resendRes.text());
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Erro no send-receipt-email:", err);
    return new Response("error", { status: 200 });
  }
});
