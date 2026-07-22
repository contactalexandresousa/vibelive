// Ações de moderação da própria live (banir/desbanir, silenciar/dessilenciar
// no chat) — precisa rodar server-side por dois motivos: (1) confirmar que
// quem pediu é DE VERDADE o dono da sala, nunca confiando em nada vindo do
// cliente; (2) "remover da live" chama a Server SDK do LiveKit
// (RoomServiceClient.removeParticipant) pra desconectar na hora quem já
// está conectado — isso exige o API Secret, que nunca pode rodar no navegador
// (mesmo raciocínio de create-livekit-token).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RoomServiceClient } from "https://esm.sh/livekit-server-sdk@2?target=deno";

const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY")!;
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;
// Mesmo host do LIVEKIT_URL usado no cliente (supabase-client.js), só que
// https em vez de wss — LiveKit Cloud serve REST e WebSocket no mesmo domínio.
const LIVEKIT_HTTP_URL = "https://vibelive-8axxiyus.livekit.cloud";
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
  const { action, target_user_id, room_name } = body;
  if (!["ban", "unban", "mute", "unmute"].includes(action) || !target_user_id || !room_name) {
    return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: corsHeaders });
  }

  // Mesma regra de room_name de create-livekit-token: a sala de alguém é
  // sempre "live-<user_id>" — só o dono pode moderar.
  if (room_name !== `live-${user.id}`) {
    return new Response(JSON.stringify({ error: "Só quem está transmitindo pode moderar essa sala" }), { status: 403, headers: corsHeaders });
  }
  if (target_user_id === user.id) {
    return new Response(JSON.stringify({ error: "Não é possível moderar a própria conta" }), { status: 400, headers: corsHeaders });
  }

  if (action === "ban") {
    await supabase.from("live_room_bans").upsert({ broadcaster_id: user.id, banned_user_id: target_user_id });
    try {
      const roomService = new RoomServiceClient(LIVEKIT_HTTP_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
      await roomService.removeParticipant(room_name, target_user_id);
    } catch (_err) {
      // Pode já não estar mais conectado (ex: saiu sozinho antes) — o
      // registro em live_room_bans (que barra token novo) já resolve esse
      // caso, não é motivo pra falhar a chamada inteira.
    }
  } else if (action === "unban") {
    await supabase.from("live_room_bans").delete().eq("broadcaster_id", user.id).eq("banned_user_id", target_user_id);
  } else if (action === "mute") {
    await supabase.from("live_chat_mutes").upsert({ broadcaster_id: user.id, muted_user_id: target_user_id });
  } else if (action === "unmute") {
    await supabase.from("live_chat_mutes").delete().eq("broadcaster_id", user.id).eq("muted_user_id", target_user_id);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
