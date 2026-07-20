/* ==========================================================================
   VibeLive - Cliente Supabase (Auth + Banco de Dados)
   Esta chave é pública por design — a segurança vem das políticas de Row
   Level Security no banco, não do sigilo desta chave.
   ========================================================================== */

const SUPABASE_URL = "https://mydudottsuvizwurrddz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vgVCQ6DxZV9D6NYL0Gz0SQ_3BM8BsDe";

// URL pública do projeto LiveKit Cloud (vídeo ao vivo real via WebRTC).
// Assim como a Supabase URL, é segura para ficar no cliente — a segurança
// vem do token assinado no servidor (Edge Function create-livekit-token).
const LIVEKIT_URL = "wss://vibelive-8axxiyus.livekit.cloud";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const Auth = {
  async getSession() {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await sb.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signInAnonymously() {
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  }
};

const DB = {
  async getProfile(userId) {
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    return data;
  },

  async searchProfiles(query) {
    const { data, error } = await sb
      .from("profiles")
      .select("username, display_name, avatar_url, bio")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, fields) {
    const { data, error } = await sb.from("profiles").update(fields).eq("id", userId).select().single();
    if (error) throw error;
    return data;
  },

  // Carteira — todas as mutações passam por RPC, nunca por UPDATE direto na tabela.
  async sendGift(giftCode, broadcasterHandle) {
    const { data, error } = await sb.rpc("send_gift", { p_gift_code: giftCode, p_broadcaster_handle: broadcasterHandle });
    if (error) throw error;
    return data;
  },

  async sendQuickRose(broadcasterHandle) {
    const { data, error } = await sb.rpc("send_quick_rose", { p_broadcaster_handle: broadcasterHandle || null });
    if (error) throw error;
    return data;
  },

  async purchaseVip() {
    const { data, error } = await sb.rpc("purchase_vip");
    if (error) throw error;
    return data;
  },

  async spinRoulette() {
    const { data, error } = await sb.rpc("spin_roulette");
    if (error) throw error;
    return data; // { profile, prize }
  },

  async claimDailyCheckin() {
    const { data, error } = await sb.rpc("claim_daily_checkin");
    if (error) throw error;
    return data;
  },

  // PIX real via Mercado Pago — a Edge Function decide o valor a partir do
  // código do pacote (o cliente nunca manda quantia), e só o webhook do
  // Mercado Pago (server-side, nunca o cliente) confirma o pagamento.
  async createPixPayment(packageCode) {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-pix-payment`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ package_code: packageCode })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Não foi possível gerar o pagamento PIX");
    return body.payment;
  },

  subscribeToPixPayment(paymentRowId, onUpdate) {
    const channel = sb.channel(`pix_payment:${paymentRowId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "pix_payments",
        filter: `id=eq.${paymentRowId}`
      }, (payload) => onUpdate(payload.new))
      .subscribe();
    return channel;
  },

  // Posts / curtidas / comentários
  async createPost(mediaUrl, mediaType, caption) {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("posts").insert({
      user_id: user.id, media_url: mediaUrl, media_type: mediaType, caption
    }).select().single();
    if (error) throw error;
    return data;
  },

  async getMyPosts() {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async getPostLikeState(postId) {
    const { data: { user } } = await sb.auth.getUser();
    const [{ count }, { data: mine }] = await Promise.all([
      sb.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", postId),
      sb.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", user.id)
    ]);
    return { likesCount: count || 0, likedByMe: mine.length > 0 };
  },

  async toggleLike(postId, currentlyLiked) {
    const { data: { user } } = await sb.auth.getUser();
    if (currentlyLiked) {
      const { error } = await sb.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from("post_likes").insert({ post_id: postId, user_id: user.id });
      if (error) throw error;
    }
    return this.getPostLikeState(postId);
  },

  async getComments(postId) {
    const { data, error } = await sb
      .from("post_comments")
      .select("*, profiles(username, display_name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  async addComment(postId, text) {
    const { data, error } = await sb.rpc("add_post_comment", { p_post_id: postId, p_text: text });
    if (error) throw error;
    return data;
  },

  // Seguir (streamers mockados, guardados pelo handle)
  async getFollows() {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("follows").select("followed_handle").eq("follower_id", user.id);
    if (error) throw error;
    return data.map(r => r.followed_handle);
  },

  async follow(handle) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("follows").insert({ follower_id: user.id, followed_handle: handle });
    if (error) throw error;
  },

  async unfollow(handle) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("follows").delete().eq("follower_id", user.id).eq("followed_handle", handle);
    if (error) throw error;
  },

  // Vídeo ao vivo real (LiveKit) — token assinado no servidor, o cliente nunca
  // vê o API Secret do LiveKit.
  async createLivekitToken(roomName) {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-livekit-token`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ room_name: roomName })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Não foi possível conectar ao vídeo");
    return body.token;
  },

  // Quem está transmitindo de verdade agora (separado dos streamers mockados).
  async startLiveSession(roomName) {
    const { data: { user } } = await sb.auth.getUser();
    // Encerra qualquer sessão própria anterior que tenha ficado pendurada
    // (ex: fechou a aba sem clicar em "Encerrar") antes de abrir uma nova.
    await sb.from("live_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
    const { error } = await sb.from("live_sessions").insert({ user_id: user.id, room_name: roomName });
    if (error) throw error;
  },

  async endLiveSession() {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("live_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
    if (error) throw error;
  },

  async getActiveLiveSessions() {
    const { data, error } = await sb
      .from("live_sessions")
      .select("*, profiles(username, display_name, avatar_url)")
      .is("ended_at", null)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  subscribeToLiveSessionsChanges(onChange) {
    const channel = sb.channel("live_sessions_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, onChange)
      .subscribe();
    return channel;
  },

  // Chat real da sala de live — mensagens persistidas e sincronizadas via Realtime
  // entre todo mundo assistindo à mesma sala (broadcasterHandle).
  async getLiveChatHistory(broadcasterHandle, limit = 50) {
    const { data, error } = await sb
      .from("live_chat_messages")
      .select("*")
      .eq("broadcaster_handle", broadcasterHandle)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.reverse();
  },

  async sendLiveChatMessage(broadcasterHandle, username, text) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("live_chat_messages").insert({
      broadcaster_handle: broadcasterHandle, user_id: user.id, username, text, type: "chat"
    });
    if (error) throw error;
  },

  // Inscreve num único canal por sala: mensagens novas (postgres_changes) +
  // contagem real de quem está conectado agora (Presence). Quem chamar é
  // responsável por dar sb.removeChannel(canal) ao sair da sala.
  subscribeToLiveRoom(broadcasterHandle, { onMessage, onViewerCountChange }) {
    const channel = sb.channel(`live_chat:${broadcasterHandle}`, {
      config: { presence: { key: crypto.randomUUID() } }
    })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "live_chat_messages",
        filter: `broadcaster_handle=eq.${broadcasterHandle}`
      }, (payload) => onMessage(payload.new))
      .on("presence", { event: "sync" }, () => {
        onViewerCountChange(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ online_at: new Date().toISOString() });
        }
      });
    return channel;
  }
};
