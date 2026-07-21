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

  async signInWithOAuth(provider) {
    // redirectTo precisa estar na allow-list configurada em supabase/config.toml
    // (additional_redirect_urls) — mesma regra do resetPasswordForEmail.
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  },

  async resetPasswordForEmail(email) {
    // redirectTo precisa estar na allow-list configurada em supabase/config.toml
    // (additional_redirect_urls) — senão o Supabase rejeita o link.
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
};

const DB = {
  async getProfile(userId) {
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    return data;
  },

  // Contadores reais do perfil (seguindo/seguidores/curtidas) — antes eram
  // números fixos e falsos no HTML.
  async getProfileStats(userId, username) {
    const [followingRes, followersRes, postsRes] = await Promise.all([
      sb.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      sb.from("follows").select("*", { count: "exact", head: true }).eq("followed_handle", username),
      sb.from("posts").select("id").eq("user_id", userId)
    ]);
    if (followingRes.error) throw followingRes.error;
    if (followersRes.error) throw followersRes.error;
    if (postsRes.error) throw postsRes.error;

    let likesCount = 0;
    const postIds = (postsRes.data || []).map(p => p.id);
    if (postIds.length > 0) {
      const { count, error } = await sb.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", postIds);
      if (error) throw error;
      likesCount = count || 0;
    }

    return {
      followingCount: followingRes.count || 0,
      followersCount: followersRes.count || 0,
      likesCount
    };
  },

  // Métricas reais de transmissão (tempo total e número de lives) — o painel
  // "Métricas" do perfil mostrava números fixos (inclusive uma pontuação de
  // PK, recurso que nem existe mais no app).
  async getLiveMetrics(userId) {
    const { data, error } = await sb
      .from("live_sessions")
      .select("started_at, ended_at")
      .eq("user_id", userId);
    if (error) throw error;

    const totalMs = (data || []).reduce((sum, s) => {
      const end = s.ended_at ? new Date(s.ended_at) : new Date();
      return sum + Math.max(0, end - new Date(s.started_at));
    }, 0);

    return {
      totalLives: (data || []).length,
      totalMinutes: Math.round(totalMs / 60000)
    };
  },

  async isUsernameAvailable(username) {
    const { data, error } = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
    if (error) throw error;
    return !data;
  },

  async searchProfiles(query) {
    const { data, error } = await sb
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, private_content_price")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);
    if (error) throw error;
    return data;
  },

  // Upload real de avatar (Supabase Storage). Caminho é sempre
  // "<user_id>/avatar.<ext>" — RLS do bucket só deixa cada um escrever na
  // própria pasta. upsert:true substitui o arquivo anterior direto.
  async uploadAvatar(userId, file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await sb.storage.from("avatars").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "image/jpeg"
    });
    if (uploadError) throw uploadError;

    const { data } = sb.storage.from("avatars").getPublicUrl(path);
    // Cache-buster: o nome do arquivo não muda entre uploads (upsert), então
    // sem isso o navegador/CDN poderia continuar mostrando a imagem antiga.
    return `${data.publicUrl}?t=${Date.now()}`;
  },

  // Upload real de foto/vídeo de publicação (Supabase Storage). Substitui o
  // antigo seletor de mídia de estoque ("MÍDIA DEMO"). Caminho único por
  // arquivo (não upsert, diferente do avatar) já que cada post é permanente.
  async uploadPostMedia(userId, file) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await sb.storage.from("posts").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream"
    });
    if (uploadError) throw uploadError;

    const { data } = sb.storage.from("posts").getPublicUrl(path);
    return data.publicUrl;
  },

  // Painel de moderação — só retorna dados se a conta logada tiver
  // is_admin=true (RLS bloqueia qualquer outra pessoa antes de chegar aqui).
  async getAllReports() {
    const { data, error } = await sb
      .from("user_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const userIds = [...new Set(data.flatMap(r => [r.reporter_id, r.reported_id]).filter(Boolean))];
    let profileMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles, error: profErr } = await sb
        .from("profiles")
        .select("id, username, display_name")
        .in("id", userIds);
      if (profErr) throw profErr;
      profileMap = new Map(profiles.map(p => [p.id, p]));
    }
    return data.map(r => ({ ...r, reporter: profileMap.get(r.reporter_id), reported: profileMap.get(r.reported_id) }));
  },

  async markReportReviewed(reportId) {
    const { error } = await sb.from("user_reports").update({ reviewed_at: new Date().toISOString() }).eq("id", reportId);
    if (error) throw error;
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
  async createPost(mediaUrl, mediaType, caption, isPrivate = false) {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("posts").insert({
      user_id: user.id, media_url: mediaUrl, media_type: mediaType, caption, is_private: isPrivate
    }).select().single();
    if (error) throw error;
    return data;
  },

  // Conteúdo privado com preço definido pelo criador — desbloqueio único
  // (não é assinatura recorrente), pago com moedas (elas mesmas compradas
  // via PIX real ou ganhas de graça no app).
  async unlockPrivateContent(creatorId) {
    const { data, error } = await sb.rpc("unlock_private_content", { p_creator_id: creatorId });
    if (error) throw error;
    return data;
  },

  async getPrivateContentInfo(creatorId) {
    const { data: { user } } = await sb.auth.getUser();
    const isOwner = user && user.id === creatorId;

    const profileRes = await sb.from("profiles").select("id, username, display_name, avatar_url, private_content_price").eq("id", creatorId).single();
    if (profileRes.error) throw profileRes.error;

    let unlocked = isOwner;
    if (!isOwner && user) {
      const unlockRes = await sb.from("private_content_unlocks").select("creator_id").eq("creator_id", creatorId).eq("unlocker_id", user.id).maybeSingle();
      if (unlockRes.error) throw unlockRes.error;
      unlocked = !!unlockRes.data;
    }

    let posts = [];
    if (unlocked) {
      const postsRes = await sb.from("posts").select("*").eq("user_id", creatorId).eq("is_private", true).order("created_at", { ascending: false });
      if (postsRes.error) throw postsRes.error;
      posts = postsRes.data;
    }

    return { profile: profileRes.data, isOwner, unlocked, posts };
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

  // Quem eu sigo E que também me segue de volta — só essas pessoas podem ser
  // convidadas pra uma live restrita.
  async getMutualFollowers() {
    const { data: { user } } = await sb.auth.getUser();
    const me = await sb.from("profiles").select("username").eq("id", user.id).single();
    if (me.error) throw me.error;

    const [followingRes, followersRes] = await Promise.all([
      sb.from("follows").select("followed_handle").eq("follower_id", user.id),
      sb.from("follows")
        .select("profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)")
        .eq("followed_handle", me.data.username)
    ]);
    if (followingRes.error) throw followingRes.error;
    if (followersRes.error) throw followersRes.error;

    const followingSet = new Set((followingRes.data || []).map(r => r.followed_handle));
    return (followersRes.data || [])
      .map(r => r.profiles)
      .filter(p => p && followingSet.has(p.username));
  },

  // Live com senha: hash nunca sai do banco — set/check rodam via RPC
  // SECURITY DEFINER (0031_onboarding_and_live_features.sql).
  async setLiveSessionPassword(roomName, password) {
    const { error } = await sb.rpc("set_live_session_password", { p_room_name: roomName, p_password: password || null });
    if (error) throw error;
  },

  async checkLiveSessionPassword(roomName, password) {
    const { data, error } = await sb.rpc("check_live_session_password", { p_room_name: roomName, p_password: password });
    if (error) throw error;
    return data;
  },

  // Live restrita a convidados (seguidores mútuos escolhidos por quem transmite).
  async setLiveSessionInviteOnly(roomName, inviteOnly) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("live_sessions").update({ invite_only: inviteOnly }).eq("room_name", roomName).eq("user_id", user.id);
    if (error) throw error;
  },

  async inviteToLiveSession(liveSessionId, invitedUserId) {
    const { error } = await sb.from("live_session_invites").insert({ live_session_id: liveSessionId, invited_user_id: invitedUserId });
    if (error) throw error;
  },

  async isInvitedToLiveSession(liveSessionId, userId) {
    const { data, error } = await sb
      .from("live_session_invites")
      .select("live_session_id")
      .eq("live_session_id", liveSessionId)
      .eq("invited_user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
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

  // Exclusão real de conta (Auth Admin API, via Edge Function). Sempre exclui
  // quem está autenticado no momento da chamada — nunca aceita um id à parte.
  async deleteAccountForever() {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${session.access_token}` }
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Não foi possível excluir a conta");
    return body;
  },

  // Quem está transmitindo de verdade agora (separado dos streamers mockados).
  async startLiveSession(roomName, title) {
    const { data: { user } } = await sb.auth.getUser();
    // Encerra qualquer sessão própria anterior que tenha ficado pendurada
    // (ex: fechou a aba sem clicar em "Encerrar") antes de abrir uma nova.
    await sb.from("live_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
    const { error } = await sb.from("live_sessions").insert({ user_id: user.id, room_name: roomName, title: title || null });
    if (error) throw error;
  },

  async endLiveSession() {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("live_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
    if (error) throw error;
  },

  async getActiveLiveSessions() {
    // profiles!live_sessions_user_id_fkey desambigua explicitamente pro
    // PostgREST — desde que live_session_invites também liga live_sessions a
    // profiles (convidados), existe mais de um caminho possível sem isso.
    // created_at do profile alimenta o filtro "Vibe Nova" (conta com menos
    // de 1 semana); viewer_count alimenta o "Vibe Hot".
    const { data, error } = await sb
      .from("live_sessions")
      .select("*, profiles!live_sessions_user_id_fkey(username, display_name, avatar_url, created_at)")
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

  // Contagem real de espectadores agora (Presence), gravada pelo próprio
  // transmissor pra alimentar o ranking "Vibe Hot" no Discover.
  async updateLiveViewerCount(roomName, count) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("live_sessions").update({ viewer_count: count }).eq("room_name", roomName).eq("user_id", user.id);
    if (error) throw error;
  },

  // Quem eu sigo que vende conteúdo privado — alimenta o botão "Conteúdo
  // pago" do Discover.
  async getFollowedPaidCreators() {
    const { data: { user } } = await sb.auth.getUser();
    const { data: followingRows, error: followErr } = await sb.from("follows").select("followed_handle").eq("follower_id", user.id);
    if (followErr) throw followErr;
    const handles = (followingRows || []).map(r => r.followed_handle);
    if (handles.length === 0) return [];

    const { data, error } = await sb
      .from("profiles")
      .select("id, username, display_name, avatar_url, private_content_price")
      .in("username", handles)
      .not("private_content_price", "is", null);
    if (error) throw error;
    return data;
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
  // contagem e avatares reais de quem está conectado agora (Presence). Quem
  // chamar é responsável por dar sb.removeChannel(canal) ao sair da sala.
  subscribeToLiveRoom(broadcasterHandle, { onMessage, onViewerCountChange }, myPresence = {}) {
    const channel = sb.channel(`live_chat:${broadcasterHandle}`, {
      config: { presence: { key: crypto.randomUUID() } }
    })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "live_chat_messages",
        filter: `broadcaster_handle=eq.${broadcasterHandle}`
      }, (payload) => onMessage(payload.new))
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const avatars = Object.values(state)
          .map(entries => entries[0] && entries[0].avatar_url)
          .filter(Boolean);
        onViewerCountChange(Object.keys(state).length, avatars);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ online_at: new Date().toISOString(), ...myPresence });
        }
      });
    return channel;
  },

  // Mensagens diretas (DM) reais — persistidas e sincronizadas via Realtime.
  async getConversations() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return []; // sem sessão ainda (ex: chamado antes do login carregar) — sem conversas, não é erro
    const { data: messages, error } = await sb
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Agrupa por "outro participante", mantendo só a mensagem mais recente de cada.
    const byPartner = new Map();
    for (const m of messages) {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!byPartner.has(partnerId)) {
        byPartner.set(partnerId, {
          partnerId,
          lastMessage: m.text,
          lastAt: m.created_at,
          unread: m.recipient_id === user.id && !m.read_at
        });
      }
    }

    const partnerIds = [...byPartner.keys()];
    if (partnerIds.length === 0) return [];

    const { data: profiles, error: profErr } = await sb
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", partnerIds);
    if (profErr) throw profErr;
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return [...byPartner.values()].map(c => ({ ...c, profile: profileMap.get(c.partnerId) }));
  },

  async getConversationHistory(partnerId) {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  async sendDirectMessage(recipientId, text) {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb
      .from("direct_messages")
      .insert({ sender_id: user.id, recipient_id: recipientId, text })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markConversationRead(partnerId) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", partnerId)
      .eq("recipient_id", user.id)
      .is("read_at", null);
    if (error) throw error;
  },

  // Um único canal por sessão: qualquer mensagem que EU receber (de quem for)
  // passa por aqui. Quem chamar decide o que fazer (atualizar inbox, anexar
  // na conversa aberta etc.) — mesmo padrão de canal único usado na sala de live.
  subscribeToDirectMessages(myUserId, onMessage) {
    const channel = sb.channel(`dm_inbox:${myUserId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: `recipient_id=eq.${myUserId}`
      }, (payload) => onMessage(payload.new))
      .subscribe();
    return channel;
  },

  // Bloqueio e denúncia — o bloqueio de DM é reforçado no servidor (trigger),
  // isto aqui é só a interface pro cliente gerenciar a própria lista.
  async blockUser(blockedId) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("blocked_users").insert({ blocker_id: user.id, blocked_id: blockedId });
    if (error) throw error;
  },

  async unblockUser(blockedId) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", blockedId);
    if (error) throw error;
  },

  async getBlockedUsers() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
    if (error) throw error;
    return data.map(r => r.blocked_id);
  },

  async reportUser(reportedId, reason) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("user_reports").insert({ reporter_id: user.id, reported_id: reportedId, reason });
    if (error) throw error;
  },

  // Notificações reais (novo seguidor, alguém que você segue foi ao vivo) —
  // as linhas são criadas por triggers no banco (follows/live_sessions),
  // nunca pelo cliente.
  async getNotifications(limit = 30) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data: rows, error } = await sb
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const actorIds = [...new Set(rows.filter(r => r.actor_id).map(r => r.actor_id))];
    let profileMap = new Map();
    if (actorIds.length > 0) {
      const { data: profiles, error: profErr } = await sb
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", actorIds);
      if (profErr) throw profErr;
      profileMap = new Map(profiles.map(p => [p.id, p]));
    }
    return rows.map(r => ({ ...r, actor: profileMap.get(r.actor_id) }));
  },

  async getUnreadNotificationCount() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 0;
    const { count, error } = await sb
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) throw error;
    return count || 0;
  },

  async markNotificationsRead() {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) throw error;
  },

  subscribeToNotifications(myUserId, onNotification) {
    const channel = sb.channel(`notifications:${myUserId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${myUserId}`
      }, (payload) => onNotification(payload.new))
      .subscribe();
    return channel;
  }
};
