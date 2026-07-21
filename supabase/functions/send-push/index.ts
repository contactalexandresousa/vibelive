// Recebe {user_id, title, body, url} de um gatilho do Postgres (via pg_net,
// migration 0039) e manda notificação push de verdade pra todo navegador
// inscrito daquele usuário. Sem verificação de autenticação de entrada: o
// pior que dá pra fazer batendo aqui direto é reenviar uma notificação já
// legítima pra alguém que tem o uuid de outro usuário — não fabrica conteúdo
// novo nem lê nada sensível, então não vale a complexidade extra de um segredo
// compartilhado gravado em texto no repositório.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails("mailto:contato.salepm@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title) {
      return new Response("missing user_id/title", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error || !subs || subs.length === 0) {
      return new Response("no subscriptions", { status: 200 });
    }

    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/" });

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        // Inscrição expirada/revogada pelo navegador — limpa pra não tentar de novo.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Falha ao enviar push:", err?.statusCode, err?.body || err?.message);
        }
      }
    }));

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Erro no send-push:", err);
    return new Response("error", { status: 200 });
  }
});
