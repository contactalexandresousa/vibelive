// Gera um token de acesso ao LiveKit para o usuário autenticado entrar numa
// sala (como transmissor ou como espectador). Precisa rodar server-side
// porque a assinatura do token exige o API Secret do LiveKit, que é um
// segredo de verdade e nunca pode aparecer em código que roda no navegador
// (mesmo raciocínio do Access Token do Mercado Pago).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2?target=deno";

const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY")!;
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  const roomName = body.room_name;
  if (!roomName || typeof roomName !== "string") {
    return new Response(JSON.stringify({ error: "room_name obrigatório" }), { status: 400, headers: corsHeaders });
  }

  const { data: profile } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name || profile?.username || "Visitante";

  // Só quem está entrando na PRÓPRIA sala (room_name termina com o próprio
  // user id) pode publicar vídeo/áudio — em qualquer outra sala, entra só
  // como espectador. Evita que alguém peça um token com can_publish e invada
  // a transmissão de outra pessoa.
  const canPublish = roomName === `live-${user.id}`;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: user.id,
    name: displayName,
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return new Response(JSON.stringify({ token, canPublish }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
