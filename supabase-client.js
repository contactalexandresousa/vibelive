/* ==========================================================================
   VibeLive - Cliente Supabase (Auth + Banco de Dados)
   Esta chave é pública por design — a segurança vem das políticas de Row
   Level Security no banco, não do sigilo desta chave.
   ========================================================================== */

const SUPABASE_URL = "https://mydudottsuvizwurrddz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vgVCQ6DxZV9D6NYL0Gz0SQ_3BM8BsDe";

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

  async sendQuickRose() {
    const { data, error } = await sb.rpc("send_quick_rose");
    if (error) throw error;
    return data;
  },

  async supportPk(side) {
    const { data, error } = await sb.rpc("support_pk", { p_side: side });
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

  async redeemDemoPix(packageCode) {
    const { data, error } = await sb.rpc("redeem_demo_pix", { p_package_code: packageCode });
    if (error) throw error;
    return data;
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
  }
};
