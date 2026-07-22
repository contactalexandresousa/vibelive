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

  // Quem foi removido dessa live pelo anfitrião (moderate-live-room, ação
  // "ban") não pode nem entrar de novo — o kick imediato via LiveKit só
  // cobre quem já tava conectado; sem essa checagem, dava pra só recarregar
  // a página e voltar.
  if (roomName.startsWith("live-")) {
    const broadcasterId = roomName.slice("live-".length);
    if (broadcasterId !== user.id) {
      const { data: ban } = await supabase
        .from("live_room_bans")
        .select("broadcaster_id")
        .eq("broadcaster_id", broadcasterId)
        .eq("banned_user_id", user.id)
        .maybeSingle();
      if (ban) {
        return new Response(JSON.stringify({ error: "Você foi removido dessa live pelo anfitrião." }), { status: 403, headers: corsHeaders });
      }
    }
  }

  const { data: profile } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name || profile?.username || "Visitante";

  // Só quem está entrando na PRÓPRIA sala (room_name termina com o próprio
  // user id) pode publicar vídeo/áudio — em qualquer outra sala, entra só
  // como espectador. Evita que alguém peça um token com can_publish e invada
  // a transmissão de outra pessoa.
  let canPublish = roomName === `live-${user.id}`;

  // Segunda chance: co-transmissor com convite ACEITO pra essa live específica
  // também pode publicar — a decisão de quem confia é toda no banco (RLS já
  // garante que só virou "accepted" com aceite de fato de quem foi convidado),
  // aqui só consulta o resultado com a service role.
  if (!canPublish) {
    const { data: session } = await supabase
      .from("live_sessions")
      .select("id")
      .eq("room_name", roomName)
      .is("ended_at", null)
      .maybeSingle();
    if (session) {
      const { data: invite } = await supabase
        .from("live_cohost_invites")
        .select("id")
        .eq("live_session_id", session.id)
        .eq("invited_user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();
      canPublish = !!invite;
    }
  }

  // Chamada de vídeo 1:1 (call-<id>): publica quem for chamador OU chamado
  // de uma chamada já aceita — os dois lados publicam a própria câmera na
  // mesma sala, diferente da live (onde só o anfitrião publica por padrão).
  if (!canPublish && roomName.startsWith("call-")) {
    const { data: call } = await supabase
      .from("call_invites")
      .select("id")
      .eq("room_name", roomName)
      .eq("status", "accepted")
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
      .maybeSingle();
    canPublish = !!call;
  }

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
