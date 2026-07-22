// Checa uma imagem já enviada pro Storage contra a API da Sightengine antes
// dela virar avatar/post/foto de DM. Chamada logo depois do upload (a partir
// de uploadAvatar/uploadPostMedia/uploadDmMedia em supabase-client.js), nunca
// dentro de um gatilho de banco — não tem nenhuma escrita em transação aqui,
// então nenhuma das armadilhas de pg_net/RAISE EXCEPTION do rate limit se
// aplicam.
//
// Se SIGHTENGINE_API_USER/SECRET não estiverem configurados ainda (conta não
// criada), ou se a Sightengine cair/der erro, a checagem libera a imagem —
// um provedor de moderação fora do ar não deveria travar upload legítimo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGHTENGINE_API_USER = Deno.env.get("SIGHTENGINE_API_USER");
const SIGHTENGINE_API_SECRET = Deno.env.get("SIGHTENGINE_API_SECRET");

const THRESHOLD = 0.5;

// Diferente de log-rate-limit-block (só chamada do Postgres via pg_net),
// esta função é chamada direto do navegador logo após o upload — precisa de
// CORS de verdade, senão o preflight OPTIONS falha silenciosamente como
// "Failed to fetch" no cliente.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

async function logBlock(userId: string | null, context: string, reason: string, imageUrl: string) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from("moderation_blocks").insert({ user_id: userId, context, reason, image_url: imageUrl });
  } catch (err) {
    console.error("Falha ao registrar bloqueio de moderação:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { image_url, user_id, context } = await req.json();
    if (!image_url) return json({ approved: true });

    if (!SIGHTENGINE_API_USER || !SIGHTENGINE_API_SECRET) {
      // Credenciais ainda não configuradas — libera sem checar em vez de
      // bloquear todo upload da plataforma por uma dependência ausente.
      return json({ approved: true });
    }

    const params = new URLSearchParams({
      url: image_url,
      models: "nudity-2.1,weapon,violence,gore-2.0",
      api_user: SIGHTENGINE_API_USER,
      api_secret: SIGHTENGINE_API_SECRET,
    });

    const resp = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
    if (!resp.ok) {
      console.error("Sightengine respondeu com erro:", resp.status, await resp.text());
      return json({ approved: true });
    }
    const data = await resp.json();

    const nudity = data.nudity || {};
    const nudityScore = Math.max(nudity.sexual_activity || 0, nudity.sexual_display || 0, nudity.erotica || 0);
    const weaponScore = typeof data.weapon === "number" ? data.weapon : (data.weapon && data.weapon.classes && Math.max(...Object.values(data.weapon.classes as Record<string, number>))) || 0;
    const violenceScore = (data.violence && data.violence.prob) || 0;
    const goreScore = (data.gore && data.gore.prob) || 0;

    let reason: string | null = null;
    if (nudityScore > THRESHOLD) reason = "nudez ou conteúdo sexual";
    else if (weaponScore > THRESHOLD) reason = "arma";
    else if (violenceScore > THRESHOLD) reason = "violência";
    else if (goreScore > THRESHOLD) reason = "conteúdo gráfico";

    if (reason) {
      await logBlock(user_id || null, context || "unknown", reason, image_url);
      return json({ approved: false, reason });
    }

    return json({ approved: true });
  } catch (err) {
    console.error("Erro no moderate-image:", err);
    return json({ approved: true });
  }
});
