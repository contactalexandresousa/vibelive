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

  async signUp(email, password, birthDate, referredByUsername) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { birth_date: birthDate, terms_accepted: true, referred_by_username: referredByUsername || null } }
    });
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
  },

  // 2FA (TOTP) — o Supabase Auth já guarda tudo (fatores, desafios) do lado
  // dele; não precisa de nenhuma tabela/migration nossa pra isso.
  async mfaListFactors() {
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) throw error;
    return data;
  },

  async mfaEnroll() {
    // Nome único por tentativa: listFactors() só devolve fatores VERIFICADOS
    // (um fator "unverified" abandonado fica invisível pro cliente), então
    // sem isso, uma segunda tentativa de cadastro colide com "já existe um
    // fator com esse nome" mesmo sem nenhum fator visível pra limpar.
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `totp-${Date.now()}` });
    if (error) throw error;
    return data;
  },

  async mfaChallengeAndVerify(factorId, code) {
    const { data: challenge, error: challengeErr } = await sb.auth.mfa.challenge({ factorId });
    if (challengeErr) throw challengeErr;
    const { data, error } = await sb.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (error) throw error;
    return data;
  },

  async mfaUnenroll(factorId) {
    const { error } = await sb.auth.mfa.unenroll({ factorId });
    if (error) throw error;
  },

  async mfaGetAssuranceLevel() {
    const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data;
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

  // Sugestões de perfis reais antes de digitar qualquer coisa na busca.
  async getRandomProfiles(limit = 8) {
    const { data, error } = await sb.rpc("get_random_profiles", { p_limit: limit });
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

  async verifyAgeAndAcceptTerms(birthDate) {
    const { data, error } = await sb.rpc("verify_age_and_accept_terms", { p_birth_date: birthDate });
    if (error) throw error;
    return data;
  },

  // Coleta tudo que a própria RLS já deixa o dono ver, em cada tabela onde a
  // conta aparece — sem endpoint novo, sem service role, só as mesmas
  // políticas que já protegem cada tabela no dia a dia.
  async exportAllMyData() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const [
      profile, posts, transactions, withdrawals,
      subscriptionsAsSubscriber, subscriptionsAsCreator,
      messagesSent, messagesReceived, notifications, follows,
      unlocksAsBuyer, unlocksAsCreator, identity, blocks, reports
    ] = await Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).single(),
      sb.from("posts").select("*").eq("user_id", user.id),
      sb.from("wallet_transactions").select("*").eq("user_id", user.id),
      sb.from("withdrawal_requests").select("*").eq("user_id", user.id),
      sb.from("creator_subscriptions").select("*").eq("subscriber_id", user.id),
      sb.from("creator_subscriptions").select("*").eq("creator_id", user.id),
      sb.from("direct_messages").select("*").eq("sender_id", user.id),
      sb.from("direct_messages").select("*").eq("recipient_id", user.id),
      sb.from("notifications").select("*").eq("user_id", user.id),
      sb.from("follows").select("*").eq("follower_id", user.id),
      sb.from("private_content_unlocks").select("*").eq("unlocker_id", user.id),
      sb.from("private_content_unlocks").select("*").eq("creator_id", user.id),
      sb.from("user_identity").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("blocked_users").select("*").eq("blocker_id", user.id),
      sb.from("user_reports").select("*").eq("reporter_id", user.id),
    ]);

    return {
      exported_at: new Date().toISOString(),
      account_email: user.email,
      profile: profile.data,
      posts: posts.data,
      wallet_transactions: transactions.data,
      withdrawal_requests: withdrawals.data,
      subscriptions_as_subscriber: subscriptionsAsSubscriber.data,
      subscriptions_as_creator: subscriptionsAsCreator.data,
      direct_messages_sent: messagesSent.data,
      direct_messages_received: messagesReceived.data,
      notifications: notifications.data,
      follows: follows.data,
      private_content_unlocked_from_others: unlocksAsBuyer.data,
      private_content_sold_to_others: unlocksAsCreator.data,
      identity_cpf: identity.data,
      blocked_users: blocks.data,
      reports_submitted: reports.data,
    };
  },

  async logLoginEvent() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error } = await sb.from("login_events").insert({ user_id: user.id, user_agent: navigator.userAgent });
    if (error) throw error;
  },

  async getMyLoginEvents(limit = 15) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb
      .from("login_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getMyReferralCount() {
    const { data, error } = await sb.rpc("get_my_referral_count");
    if (error) throw error;
    return data;
  },

  async getMyTransactions(limit = 50) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getEarningsSummary() {
    const { data, error } = await sb.rpc("get_earnings_summary");
    if (error) throw error;
    return data;
  },

  async getEarningsByDay(days = 14) {
    const { data, error } = await sb.rpc("get_earnings_by_day", { p_days: days });
    if (error) throw error;
    return data;
  },

  async adminFindProfileByUsername(username) {
    const { data, error } = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
    if (error) throw error;
    return data;
  },

  async adminSuspendUser(userId, reason) {
    const { data, error } = await sb.rpc("admin_suspend_user", { p_user_id: userId, p_reason: reason });
    if (error) throw error;
    return data;
  },

  async adminUnsuspendUser(userId) {
    const { data, error } = await sb.rpc("admin_unsuspend_user", { p_user_id: userId });
    if (error) throw error;
    return data;
  },

  async adminSetVerified(userId, verified) {
    const { data, error } = await sb.rpc("admin_set_verified", { p_user_id: userId, p_verified: verified });
    if (error) throw error;
    return data;
  },

  async getAdminAuditLog(limit = 50) {
    const { data, error } = await sb
      .from("admin_audit_log")
      .select("*, admin:profiles!admin_audit_log_admin_id_fkey(username, display_name), target:profiles!admin_audit_log_target_user_id_fkey(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async logClientError(message, stack, url) {
    const { error } = await sb.from("client_errors").insert({
      message: String(message || "Erro desconhecido").slice(0, 500),
      stack: stack ? String(stack).slice(0, 4000) : null,
      url: url ? String(url).slice(0, 500) : null,
      user_agent: navigator.userAgent.slice(0, 300),
    });
    if (error) throw error;
  },

  async getRecentClientErrors(limit = 50) {
    const { data, error } = await sb.rpc("get_recent_client_errors", { p_limit: limit });
    if (error) throw error;
    return data;
  },

  async getAdminStats() {
    const { data, error } = await sb.rpc("get_admin_stats");
    if (error) throw error;
    return data;
  },

  async getMyPushPreferences() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from("profiles").select("push_preferences").eq("id", user.id).single();
    if (error) throw error;
    return data.push_preferences;
  },

  async updatePushPreferences(userId, prefs) {
    const { data, error } = await sb.from("profiles").update({ push_preferences: prefs }).eq("id", userId).select("push_preferences").single();
    if (error) throw error;
    return data.push_preferences;
  },

  async getTopSupporters(limit = 20) {
    const { data, error } = await sb.rpc("get_top_supporters", { p_limit: limit });
    if (error) throw error;
    return data;
  },

  async getTopCreators(limit = 20) {
    const { data, error } = await sb.rpc("get_top_creators", { p_limit: limit });
    if (error) throw error;
    return data;
  },

  async searchPostsByHashtag(tag, limit = 40) {
    const { data, error } = await sb.rpc("search_posts_by_hashtag", { p_tag: tag.replace(/^#/, ""), p_limit: limit });
    if (error) throw error;
    if (data.length === 0) return [];

    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles, error: profErr } = await sb.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
    if (profErr) throw profErr;
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    return data.map(p => ({ ...p, author: profileMap.get(p.user_id) }));
  },

  async getMyCpfStatus() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from("user_identity").select("cpf").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return data ? data.cpf : null;
  },

  async setMyCpf(cpf) {
    const { data, error } = await sb.rpc("set_my_cpf", { p_cpf: cpf });
    if (error) throw error;
    return data;
  },

  async requestWithdrawal(coins, pixKey, pixKeyType) {
    const { data, error } = await sb.rpc("request_withdrawal", {
      p_coins: coins, p_pix_key: pixKey, p_pix_key_type: pixKeyType
    });
    if (error) throw error;
    return data;
  },

  async getMyWithdrawalRequests() {
    const { data, error } = await sb
      .from("withdrawal_requests")
      .select("*")
      .order("requested_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAllWithdrawalRequests() {
    const { data, error } = await sb
      .from("withdrawal_requests")
      .select("*, profiles!withdrawal_requests_user_id_fkey(username, display_name, avatar_url)")
      .order("requested_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async reviewWithdrawalRequest(requestId, newStatus, adminNotes) {
    const { data, error } = await sb.rpc("review_withdrawal_request", {
      p_request_id: requestId, p_new_status: newStatus, p_admin_notes: adminNotes || null
    });
    if (error) throw error;
    return data;
  },

  async acceptTermsVersion(version) {
    const { data, error } = await sb.rpc("accept_terms_version", { p_version: version });
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

    const profileRes = await sb.from("profiles").select("id, username, display_name, avatar_url, private_content_price, subscription_price_coins").eq("id", creatorId).single();
    if (profileRes.error) throw profileRes.error;

    let unlockedOneTime = isOwner;
    let subscription = null;
    if (!isOwner && user) {
      const unlockRes = await sb.from("private_content_unlocks").select("creator_id").eq("creator_id", creatorId).eq("unlocker_id", user.id).maybeSingle();
      if (unlockRes.error) throw unlockRes.error;
      unlockedOneTime = !!unlockRes.data;

      const subRes = await sb.from("creator_subscriptions").select("*").eq("creator_id", creatorId).eq("subscriber_id", user.id).maybeSingle();
      if (subRes.error) throw subRes.error;
      subscription = subRes.data;
    }

    const subscriptionActive = !!subscription && subscription.status === "active" && new Date(subscription.current_period_end) > new Date();
    const unlocked = isOwner || unlockedOneTime || subscriptionActive;

    let posts = [];
    if (unlocked) {
      const postsRes = await sb.from("posts").select("*").eq("user_id", creatorId).eq("is_private", true).order("created_at", { ascending: false });
      if (postsRes.error) throw postsRes.error;
      posts = postsRes.data;
    }

    return { profile: profileRes.data, isOwner, unlocked, unlockedOneTime, subscription, subscriptionActive, posts };
  },

  async subscribeToCreator(creatorId) {
    const { data, error } = await sb.rpc("subscribe_to_creator", { p_creator_id: creatorId });
    if (error) throw error;
    return data;
  },

  async cancelSubscription(creatorId) {
    const { data, error } = await sb.rpc("cancel_subscription", { p_creator_id: creatorId });
    if (error) throw error;
    return data;
  },

  async updatePost(postId, fields) {
    const { data, error } = await sb.from("posts").update(fields).eq("id", postId).select().single();
    if (error) throw error;
    return data;
  },

  async deletePost(postId, mediaUrl) {
    // Apaga o arquivo do Storage também, não só a linha — senão o bucket só
    // cresce com mídia órfã de posts já excluídos.
    const marker = "/storage/v1/object/public/posts/";
    const idx = mediaUrl ? mediaUrl.indexOf(marker) : -1;
    if (idx !== -1) {
      const path = decodeURIComponent(mediaUrl.slice(idx + marker.length));
      await sb.storage.from("posts").remove([path]).catch(() => {});
    }
    const { error } = await sb.from("posts").delete().eq("id", postId);
    if (error) throw error;
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
  subscribeToLiveRoom(broadcasterHandle, { onMessage, onViewerCountChange, onPollInsert, onPollUpdate, onPollVote }, myPresence = {}) {
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

    // Enquete usa canais separados: filtro por broadcaster_handle não dá
    // pra combinar com o filtro de live_chat_messages no mesmo channel.on(),
    // e o voto (live_poll_votes) não tem broadcaster_handle pra filtrar por
    // — o cliente decide se o poll_id do payload é o da enquete ativa dele.
    let pollChannel = null;
    if (onPollInsert || onPollUpdate || onPollVote) {
      pollChannel = sb.channel(`live_polls:${broadcasterHandle}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "live_polls",
          filter: `broadcaster_handle=eq.${broadcasterHandle}`
        }, (payload) => onPollInsert && onPollInsert(payload.new))
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "live_polls",
          filter: `broadcaster_handle=eq.${broadcasterHandle}`
        }, (payload) => onPollUpdate && onPollUpdate(payload.new))
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "live_poll_votes"
        }, (payload) => onPollVote && onPollVote(payload.new))
        .subscribe();
    }

    channel._pollChannel = pollChannel;
    return channel;
  },

  async createLivePoll(broadcasterHandle, question, options) {
    const { data, error } = await sb.rpc("create_live_poll", {
      p_broadcaster_handle: broadcasterHandle, p_question: question, p_options: options
    });
    if (error) throw error;
    return data;
  },

  async voteLivePoll(pollId, optionIndex) {
    const { error } = await sb.rpc("vote_live_poll", { p_poll_id: pollId, p_option_index: optionIndex });
    if (error) throw error;
  },

  async closeLivePoll(pollId) {
    const { error } = await sb.rpc("close_live_poll", { p_poll_id: pollId });
    if (error) throw error;
  },

  // Enquete ativa (se houver) + contagem de votos por opção + o que o
  // usuário atual já votou — usado ao entrar na sala com uma enquete já em
  // andamento (a realtime só avisa de mudanças NOVAS a partir de agora).
  async getActiveLivePoll(broadcasterHandle) {
    const { data: poll, error } = await sb
      .from("live_polls")
      .select("*")
      .eq("broadcaster_handle", broadcasterHandle)
      .is("closed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!poll) return null;

    const votes = await this.getPollVotes(poll.id);
    return { poll, votes };
  },

  async getPollVotes(pollId) {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("live_poll_votes").select("user_id, option_index").eq("poll_id", pollId);
    if (error) throw error;
    const counts = {};
    let myVote = null;
    data.forEach(v => {
      counts[v.option_index] = (counts[v.option_index] || 0) + 1;
      if (user && v.user_id === user.id) myVote = v.option_index;
    });
    return { counts, total: data.length, myVote };
  },

  async getMyActiveLiveSession() {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("live_sessions").select("*").eq("user_id", user.id).is("ended_at", null).maybeSingle();
    if (error) throw error;
    return data;
  },

  async inviteCohost(liveSessionId, invitedUserId) {
    const { data, error } = await sb.rpc("invite_cohost", { p_live_session_id: liveSessionId, p_invited_user_id: invitedUserId });
    if (error) throw error;
    return data;
  },

  async respondCohostInvite(inviteId, accept) {
    const { data, error } = await sb.rpc("respond_cohost_invite", { p_invite_id: inviteId, p_accept: accept });
    if (error) throw error;
    return data;
  },

  async endCohost(inviteId) {
    const { error } = await sb.rpc("end_cohost", { p_invite_id: inviteId });
    if (error) throw error;
  },

  // Chamado pelo anfitrião ao encerrar a própria live — sem isso o convite
  // ficaria "accepted" pra sempre, mesmo com a transmissão já parada.
  async endActiveCohostsForSession(liveSessionId) {
    const { data: invites, error } = await sb
      .from("live_cohost_invites")
      .select("id")
      .eq("live_session_id", liveSessionId)
      .eq("status", "accepted");
    if (error) throw error;
    await Promise.all((invites || []).map(i => sb.rpc("end_cohost", { p_invite_id: i.id })));
  },

  async getCohostInvite(inviteId) {
    const { data, error } = await sb.from("live_cohost_invites").select("*, live_session:live_sessions(room_name, user_id)").eq("id", inviteId).maybeSingle();
    if (error) throw error;
    return data;
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

  // Notificação push real (Web Push/VAPID) — guarda a inscrição do navegador
  // atual pra o servidor conseguir mandar notificação mesmo com o app fechado.
  async savePushSubscription(subscription) {
    const { data: { user } } = await sb.auth.getUser();
    const json = subscription.toJSON();
    const { error } = await sb.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }, { onConflict: "endpoint" });
    if (error) throw error;
  },

  async removePushSubscription(endpoint) {
    const { error } = await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
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
