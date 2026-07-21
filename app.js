/* ==========================================================================
   VibeLive - Main Application Logic (Vanilla JS)
   ========================================================================== */

// 1. DADOS INICIAIS

// Avatar genérico (ícone + gradiente da marca) usado sempre que uma conta
// não tem foto de perfil própria — antes disso caía numa foto de estoque
// de uma pessoa real específica, o que não fazia sentido como padrão pra
// toda conta nova.
const DEFAULT_AVATAR_DATA_URI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNTAgMTUwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZjRkNmQiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmMGIyM2QiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0idXJsKCNnKSIvPjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTgiIHI9IjI4IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOTIpIi8+PHBhdGggZD0iTTIwIDE0NWMwLTMzIDI0LjYtNTYgNTUtNTZzNTUgMjMgNTUgNTYiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC45MikiLz48L3N2Zz4=";

const STATE = {
  isLoggedIn: false,
  authMode: "login",
  myCoins: 0,
  myAvatarUrl: null,
  isAdmin: false,
  adminReports: [],
  activeScreen: "splash",
  followedStreamers: [], // IDs dos streamers seguidos
  blockedUsers: [], // ids (uuid) de quem eu bloqueei
  optionsTargetUserId: null, // usado pelo modal de bloquear/denunciar
  optionsTargetUserName: null,
  currentLiveBroadcaster: null,
  liveChatChannel: null, // canal Supabase Realtime da sala de live atual
  liveKitRoom: null, // conexão LiveKit como espectador (assistindo vídeo real)
  myLiveKitRoom: null, // conexão LiveKit como transmissor (própria live)
  myLiveGiftsChannel: null, // canal Realtime que avisa quem transmite quando chega um presente de verdade
  facingMode: "user", // câmera frontal ("user") ou traseira ("environment")
  isMuted: false,
  livePrivacyMode: "public", // "public" | "password" | "invite"
  livePrivacyPassword: "",
  liveInviteeIds: [],
  mutualFollowersCache: null,
  realLiveSessions: [], // quem está transmitindo de verdade agora
  realLiveSessionsChannel: null,
  currentLiveIsReal: false,
  activeChatPartner: null, // id (uuid) da pessoa com quem a conversa privada está aberta
  dmsList: [], // conversas reais, carregadas de direct_messages
  dmInboxChannel: null, // canal Supabase Realtime único p/ toda mensagem recebida
  notifications: [], // notificações reais (novo seguidor, foi ao vivo)
  notificationsChannel: null,
  unreadNotificationCount: 0,

  // Postagens no Perfil — carregadas do banco (DB.getMyPosts) após o login;
  // toda conta real começa sem posts.
  currentPostType: "image",
  activeLightboxPostId: null,
  activeLightboxLikeState: null,
  myPosts: [],

  // Tela de Live (Assistindo)
  liveViewerCount: 128,
  
  // Presente selecionado na gaveta
  selectedGift: null,
  
  // Carteira/Pix
  pixTimerInterval: null,
  activePixPackage: null,
  activePixPayment: null,
  pixPaymentChannel: null,
  discoverFilter: "hot", // "hot" | "nova" | "privada" — filtro ativo do Discover

  // Transmissão Própria (Webcam)
  localStream: null,
  myLiveViewerCount: 0,
  currentVideoFilter: "none",
  xp: 150,
  level: 1,
  isVIP: false,
  claimedDays: [1]
};


// 3. SELEÇÃO DE ELEMENTOS DOM
const DOM = {
  // Telas
  screens: {
    splash: document.getElementById("screen-splash"),
    discover: document.getElementById("screen-discover"),
    "live-room": document.getElementById("screen-live-room"),
    messages: document.getElementById("screen-messages"),
    "private-chat": document.getElementById("screen-private-chat"),
    profile: document.getElementById("screen-profile"),
    "go-live": document.getElementById("screen-go-live"),
    auth: document.getElementById("screen-auth")
  },
  
  // Aliases de compatibilidade para corrigir bugs do código original
  get liveRoom() { return this.screens["live-room"]; },
  get goLive() { return this.screens["go-live"]; },
  
  // Widgets Compartilhados
  bottomNav: document.getElementById("global-bottom-nav"),
  userCoinsDisplay: document.getElementById("user-coins"),
  profileCoinsDisplay: document.getElementById("profile-coins-display"),
  drawerCoinsDisplay: document.getElementById("drawer-coins-count"),
  toast: document.getElementById("toast-message"),

  // Tela Discover
  livesGrid: document.getElementById("lives-grid-container"),
  categoryTabs: document.querySelectorAll(".category-tab"),
  
  // Tela Live Room (Assistindo)
  liveVideo: document.getElementById("live-player-video"),
  streamerAvatar: document.getElementById("streamer-avatar"),
  streamerName: document.getElementById("streamer-name"),
  streamerStats: document.getElementById("streamer-stats"),
  btnFollowStreamer: document.getElementById("btn-follow-streamer"),
  liveViewerCount: document.getElementById("live-viewer-count"),
  liveChatMessages: document.getElementById("live-chat-messages"),
  liveChatInput: document.getElementById("live-chat-input"),
  heartsContainer: document.getElementById("hearts-container"),
  giftDrawer: document.getElementById("gift-drawer"),
  btnSendGift: document.getElementById("btn-send-selected-gift"),
  giftAnnouncement: document.getElementById("gift-announcement"),
  giftAnnouncementEmoji: document.getElementById("announcement-emoji"),
  giftAnnouncementText: document.getElementById("announcement-text"),
  
  // Tela Inbox DMs
  inboxList: document.getElementById("inbox-list-container"),
  navChatBadge: document.getElementById("nav-chat-badge"),
  
  // Tela Chat Privado
  chatPartnerAvatar: document.getElementById("chat-partner-avatar"),
  chatPartnerName: document.getElementById("chat-partner-name"),
  privateChatHistory: document.getElementById("private-chat-history"),
  privateChatInput: document.getElementById("private-chat-input"),
  
  // Tela Perfil/Recarga & Pix
  pixModal: document.getElementById("pix-modal"),
  pixPackageName: document.getElementById("pix-package-name"),
  pixTotalPrice: document.getElementById("pix-total-price"),
  pixTimer: document.getElementById("pix-timer"),
  pixCopyCode: document.getElementById("pix-copy-code"),
  pixStatusBox: document.getElementById("pix-status-box"),
  pixQrImage: document.getElementById("pix-qr-image"),
  
  // Tela Transmitir ao Vivo
  goLiveVideo: document.getElementById("go-live-video"),
  goLiveSetup: document.getElementById("go-live-setup"),
  myLiveActiveOverlay: document.getElementById("my-live-active-overlay"),
  myLiveChatMessages: document.getElementById("my-live-chat-messages"),
  myLiveViewerCount: document.getElementById("my-live-viewer-count"),
  myLiveDiamonds: document.getElementById("my-live-diamonds"),
  myHeartsEmitter: document.getElementById("my-hearts-emitter")
};


// O Supabase detecta sozinho o token de recuperação de senha na URL (quem
// clicou no link do e-mail) e dispara esse evento — mostra o modal de nova
// senha por cima de qualquer tela, sem precisar de nenhuma rota especial.
sb.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    showNewPasswordModal();
  }
});

// 4. INICIALIZAÇÃO DO APP
document.addEventListener("DOMContentLoaded", () => {
  renderCoins();
  renderInboxList();
  initRealLiveSessionsFeed();

  // Temporizador para esconder a Splash Screen, então checa se já existe sessão real.
  setTimeout(async () => {
    let profile = null;
    try {
      const session = await Auth.getSession();
      if (session) {
        STATE.isLoggedIn = true;
        profile = await DB.getProfile(session.user.id);
        await applyProfileToUI(profile);
      } else {
        STATE.isLoggedIn = false;
      }
    } catch (err) {
      console.error("Falha ao checar sessão:", err);
      STATE.isLoggedIn = false;
    }
    // Navegação sem login continua permitida (dados mockados); ações que gravam
    // dado real checam STATE.isLoggedIn e pedem login na hora, via requireAuth().
    if (profile && !profile.onboarding_completed) {
      openOnboardingWizard();
    } else {
      navigateTo("discover");
    }
  }, 2500);
});

// Usado no início de qualquer ação que grava dado real no banco. Se não houver
// sessão, manda para a tela de login em vez de deixar a chamada ao Supabase falhar.
function requireAuth() {
  if (STATE.isLoggedIn) return true;
  showToast("Entre na sua conta para continuar.");
  navigateTo("auth");
  return false;
}


// 6. NAVEGAÇÃO E ROTAS (SPA)
function navigateTo(screenId) {
  // Ver o Discover sem conta continua liberado; a tela de Perfil não faz
  // sentido pra quem não tem perfil nenhum, então pede login/cadastro ali.
  if (screenId === "profile" && !STATE.isLoggedIn) {
    requireAuth();
    return;
  }

  // Guarda a tela anterior e já atualiza o estado antes da limpeza,
  // evitando recursão infinita quando closeLiveRoom chama navigateTo() de volta.
  const previousScreen = STATE.activeScreen;
  STATE.activeScreen = screenId;

  // Limpar recursos ativos se sairmos de determinadas telas
  if (previousScreen === "live-room" && screenId !== "live-room") {
    closeLiveRoom();
  }
  if (previousScreen === "go-live" && screenId !== "go-live") {
    stopOwnLiveStream();
  }

  // Ocultar todas as telas
  Object.keys(DOM.screens).forEach(key => {
    DOM.screens[key].classList.remove("active");
  });

  // Exibir a tela selecionada
  DOM.screens[screenId].classList.add("active");
  STATE.activeScreen = screenId;

  // Gerenciamento da navegação inferior
  const hideNavScreens = ["splash", "live-room", "private-chat", "auth", "go-live"];
  if (hideNavScreens.includes(screenId)) {
    DOM.bottomNav.style.display = "none";
  } else {
    DOM.bottomNav.style.display = "flex";

    // Atualizar item ativo na barra
    const navItems = DOM.bottomNav.querySelectorAll(".nav-item");
    navItems.forEach(item => {
      item.classList.remove("active");
      if (item.getAttribute("data-screen") === screenId) {
        item.classList.add("active");
      }
    });
  }

  // Ações de tela específicas ao entrar
  if (screenId === "discover") {
    renderCoins();
  } else if (screenId === "profile") {
    renderCoins();
    renderProfilePosts();
    if (STATE.isLoggedIn) {
      Auth.getUser()
        .then(user => user ? DB.getProfile(user.id) : null)
        .then(profile => { if (profile) refreshProfileStats(profile.id, profile.username); })
        .catch(() => {});
    }
  } else if (screenId === "go-live") {
    initiateCameraStream();
    const thumb = document.getElementById("setup-thumb-img");
    if (thumb) thumb.src = STATE.myAvatarUrl || DEFAULT_AVATAR_DATA_URI;
    const titleInput = document.getElementById("live-title-input");
    if (titleInput) titleInput.value = "";
    STATE.livePrivacyMode = "public";
    STATE.livePrivacyPassword = "";
    STATE.liveInviteeIds = [];
    STATE.mutualFollowersCache = null;
    const privacyIcon = document.getElementById("setup-privacy-icon");
    if (privacyIcon) privacyIcon.textContent = "🌐";
  }
}


// 7. COMPONENTE DE TOAST
function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.className = "toast-visible";
  
  // Limpa toast anterior se houver
  if (DOM.toast.timeoutId) {
    clearTimeout(DOM.toast.timeoutId);
  }
  
  DOM.toast.timeoutId = setTimeout(() => {
    DOM.toast.className = "toast-hidden";
  }, 2500);
}

function updateNotificationBadgeUI() {
  const badge = document.getElementById("notification-badge");
  if (!badge) return;
  badge.style.display = STATE.unreadNotificationCount > 0 ? "block" : "none";
}

async function refreshNotificationBadge() {
  try {
    STATE.unreadNotificationCount = await DB.getUnreadNotificationCount();
  } catch (err) {
    console.error("Falha ao carregar notificações não lidas:", err);
  }
  updateNotificationBadgeUI();
}

async function showNotificationPanel() {
  if (!requireAuth()) return;
  const modal = document.getElementById("modal-notifications");
  const container = document.getElementById("notifications-list-container");
  if (!modal || !container) return;

  container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--light-gray);font-size:0.8rem;">Carregando...</div>`;
  modal.style.display = "flex";

  try {
    STATE.notifications = await DB.getNotifications();
  } catch (err) {
    console.error("Falha ao carregar notificações:", err);
    STATE.notifications = [];
  }
  renderNotificationsList();

  try {
    await DB.markNotificationsRead();
    STATE.unreadNotificationCount = 0;
    updateNotificationBadgeUI();
  } catch (err) {
    console.error("Falha ao marcar notificações como lidas:", err);
  }
}

function closeNotificationPanel() {
  document.getElementById("modal-notifications").style.display = "none";
}

function renderNotificationsList() {
  const container = document.getElementById("notifications-list-container");
  if (!container) return;
  container.innerHTML = "";

  if (STATE.notifications.length === 0) {
    container.innerHTML = `
      <div class="discover-empty-state" style="display: flex;">
        <div class="discover-empty-icon">🔔</div>
        <h3>Nenhuma notificação ainda</h3>
        <p>Quando alguém te seguir, for ao vivo, ou te convidar pra uma live restrita, aparece aqui.</p>
      </div>
    `;
    return;
  }

  STATE.notifications.forEach((n, index) => {
    const actorName = escapeHtml(n.actor ? (n.actor.display_name || n.actor.username) : "Alguém");
    const avatar = n.actor ? n.actor.avatar_url : "";
    const text = n.type === "new_follower"
      ? `${actorName} começou a seguir você`
      : n.type === "live_invite"
        ? `${actorName} te convidou pra uma live restrita`
        : `${actorName} está ao vivo agora!`;
    const icon = n.type === "new_follower" ? "👤" : n.type === "live_invite" ? "🔒" : "🔴";

    const item = document.createElement("div");
    item.className = n.read_at ? "inbox-item" : "inbox-item unread";
    item.onclick = () => handleNotificationClick(index);
    item.innerHTML = `
      <div class="inbox-avatar">
        <img src="${avatar}" alt="${actorName}">
      </div>
      <div class="inbox-details">
        <span class="inbox-name">${icon} ${text}</span>
        <span class="inbox-message">${formatMessageTime(n.created_at)}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function handleNotificationClick(index) {
  const n = STATE.notifications[index];
  if (!n || !n.actor) return;
  closeNotificationPanel();
  if (n.type === "went_live" || n.type === "live_invite") {
    enterRealLiveRoom(n.actor_id);
  } else if (n.type === "new_follower") {
    openPrivateChat(n.actor_id, n.actor.display_name || n.actor.username, n.actor.avatar_url);
  }
}


// 8. TELA DISCOVER - LIVES REAIS ACONTECENDO AGORA
// Lives reais acontecendo agora (pessoas de verdade transmitindo via LiveKit) —
// carrega o estado inicial e mantém atualizado via Realtime, pra qualquer um
// que estiver no app (logado ou não) ver quem está ao vivo de verdade.
async function initRealLiveSessionsFeed() {
  try {
    const sessions = await DB.getActiveLiveSessions();
    renderRealLiveSessions(sessions);
  } catch (err) {
    console.error("Falha ao carregar lives reais:", err);
  }

  if (STATE.realLiveSessionsChannel) sb.removeChannel(STATE.realLiveSessionsChannel);
  STATE.realLiveSessionsChannel = DB.subscribeToLiveSessionsChanges(async () => {
    try {
      const sessions = await DB.getActiveLiveSessions();
      renderRealLiveSessions(sessions);
    } catch (err) {
      console.error("Falha ao atualizar lives reais:", err);
    }
  });
}

// Categorias do Discover — cada uma filtra/ordena a mesma lista já carregada
// em memória (STATE.realLiveSessions), então trocar de card atualiza a
// grade na hora, sem precisar esperar nenhuma consulta nova.
const DISCOVER_CATEGORIES = {
  hot: { icon: "🔥", label: "Vibe Hot", emptyIcon: "🔥", emptyTitle: "Nenhuma live agora", emptyText: "Quando alguém começar uma live de verdade, ela aparece aqui." },
  nova: { icon: "✨", label: "Vibe Nova", emptyIcon: "✨", emptyTitle: "Nenhuma conta nova ao vivo", emptyText: "Lives de contas criadas há menos de 1 semana aparecem aqui." },
  privada: { icon: "🔒", label: "Vibe Privada", emptyIcon: "🔒", emptyTitle: "Nenhuma live privada agora", emptyText: "Lives com senha ou só para convidados aparecem aqui." },
};

function setDiscoverFilter(mode) {
  STATE.discoverFilter = mode;
  document.querySelectorAll(".vibe-category-card").forEach(el => {
    el.classList.toggle("active", el.dataset.filter === mode);
  });
  renderRealLiveSessions(STATE.realLiveSessions);
}

function applyDiscoverFilter(sessions, mode) {
  if (mode === "nova") {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sessions.filter(s => s.profiles && s.profiles.created_at && new Date(s.profiles.created_at).getTime() > weekAgo);
  }
  if (mode === "privada") {
    return sessions.filter(s => s.invite_only || s.has_password);
  }
  return [...sessions].sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
}

function renderRealLiveSessions(allSessions) {
  // Não mostra quem eu bloqueei (nem quem me bloqueou não teria motivo de aparecer,
  // mas isso já é decidido do lado de quem bloqueou, não meu).
  const sessions = allSessions.filter(s => !STATE.blockedUsers.includes(s.user_id));
  STATE.realLiveSessions = sessions;

  const mode = STATE.discoverFilter || "hot";
  const category = DISCOVER_CATEGORIES[mode];
  const filtered = applyDiscoverFilter(sessions, mode);

  const grid = document.getElementById("real-live-grid");
  const emptyState = document.getElementById("discover-empty-state");
  if (!grid) return;

  const titleEl = document.getElementById("discover-section-title");
  if (titleEl) titleEl.textContent = `${category.icon} ${category.label}`;

  grid.innerHTML = "";
  if (filtered.length === 0) {
    grid.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    document.getElementById("discover-empty-icon").textContent = category.emptyIcon;
    document.getElementById("discover-empty-title").textContent = category.emptyTitle;
    document.getElementById("discover-empty-text").textContent = category.emptyText;
    return;
  }
  grid.style.display = "grid";
  if (emptyState) emptyState.style.display = "none";
  filtered.forEach(s => grid.appendChild(createRealLiveCardElement(s)));
}

function createRealLiveCardElement(session) {
  const profile = session.profiles || {};
  const name = escapeHtml(profile.display_name || profile.username || "Ao vivo");
  const avatar = profile.avatar_url || DEFAULT_AVATAR_DATA_URI;
  const titleHtml = session.title ? `<span class="card-live-title">${escapeHtml(session.title)}</span>` : "";
  const restrictedBadge = session.invite_only
    ? `<span class="card-restricted-badge">👥 Convidados</span>`
    : session.has_password
      ? `<span class="card-restricted-badge">🔒 Com senha</span>`
      : "";
  const viewerCount = session.viewer_count || 0;

  const card = document.createElement("div");
  card.className = "live-card";
  card.onclick = () => enterRealLiveRoom(session.user_id);

  card.innerHTML = `
    <img class="live-thumbnail" src="${avatar}" alt="${name}">
    <div class="card-overlay-gradient"></div>
    <div class="card-viewers">
      <span style="color: var(--primary); font-weight: 800;">🔴 AO VIVO</span>
      ${viewerCount > 0 ? `<span>· 👁 ${viewerCount}</span>` : ""}
    </div>
    ${restrictedBadge}
    <div class="card-details">
      <span class="card-name">${name}</span>
      ${titleHtml}
    </div>
    <button class="card-btn-call" onclick="event.stopPropagation(); enterRealLiveRoom('${session.user_id}');">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
    </button>
  `;
  return card;
}


// 9. TELA DE LIVE PLAYER (ASSISTINDO STREAM REAL)
// Entra numa transmissão de verdade (pessoa real, vídeo real via LiveKit) —
// hostUserId é o id da conta de quem está transmitindo. Antes de conectar,
// checa se a live é restrita (senha ou só convidados) — quem transmite
// sempre entra livre na própria live.
async function enterRealLiveRoom(hostUserId) {
  // Ver quem está ao vivo no Discover continua aberto pra visitante sem
  // conta; entrar de fato numa live já exige login/cadastro.
  if (!requireAuth()) return;

  let profile;
  try {
    profile = await DB.getProfile(hostUserId);
  } catch (err) {
    showToast("Não foi possível entrar nessa live.");
    return;
  }

  const session = STATE.realLiveSessions.find(s => s.user_id === hostUserId)
    || (await DB.getActiveLiveSessions()).find(s => s.user_id === hostUserId);
  if (!session) {
    showToast("Essa live não está mais ao ar.");
    return;
  }

  const me = await Auth.getUser();
  const isHost = me && me.id === hostUserId;

  if (!isHost && session.invite_only) {
    let invited = false;
    try {
      invited = await DB.isInvitedToLiveSession(session.id, me.id);
    } catch (err) {
      console.error("Falha ao checar convite:", err);
    }
    if (!invited) {
      showToast("Essa live é só para convidados.");
      return;
    }
  }

  if (!isHost && session.has_password) {
    openLivePasswordGate(hostUserId);
    return;
  }

  await enterRealLiveRoomUnlocked(hostUserId, profile);
}

function openLivePasswordGate(hostUserId) {
  STATE.pendingLiveEntryHostId = hostUserId;
  document.getElementById("live-password-gate-input").value = "";
  document.getElementById("live-password-gate-error").textContent = "";
  document.getElementById("modal-live-password-gate").style.display = "flex";
}

function closeLivePasswordGate() {
  document.getElementById("modal-live-password-gate").style.display = "none";
  STATE.pendingLiveEntryHostId = null;
}

async function submitLivePasswordGate() {
  const hostUserId = STATE.pendingLiveEntryHostId;
  if (!hostUserId) return;
  const password = document.getElementById("live-password-gate-input").value;
  const errorEl = document.getElementById("live-password-gate-error");

  try {
    const ok = await DB.checkLiveSessionPassword(`live-${hostUserId}`, password);
    if (!ok) {
      errorEl.textContent = "Senha incorreta.";
      return;
    }
  } catch (err) {
    errorEl.textContent = "Não foi possível checar agora. Tente de novo.";
    return;
  }

  document.getElementById("modal-live-password-gate").style.display = "none";
  STATE.pendingLiveEntryHostId = null;

  let profile;
  try {
    profile = await DB.getProfile(hostUserId);
  } catch (err) {
    showToast("Não foi possível entrar nessa live.");
    return;
  }
  await enterRealLiveRoomUnlocked(hostUserId, profile);
}

async function enterRealLiveRoomUnlocked(hostUserId, profile) {
  const b = {
    id: hostUserId,
    name: profile.display_name || profile.username,
    username: profile.username,
    avatar: profile.avatar_url
  };

  // Sai de qualquer sala/conexão anterior antes de entrar nesta.
  if (STATE.liveChatChannel) {
    sb.removeChannel(STATE.liveChatChannel);
    STATE.liveChatChannel = null;
  }
  if (STATE.liveKitRoom) {
    STATE.liveKitRoom.disconnect();
    STATE.liveKitRoom = null;
  }

  STATE.currentLiveBroadcaster = b;
  STATE.currentLiveIsReal = true;

  // Atualizar dados da UI
  DOM.streamerAvatar.src = b.avatar;
  DOM.streamerName.textContent = b.name;
  if (DOM.streamerStats) {
    const activeSession = STATE.realLiveSessions.find(s => s.user_id === hostUserId);
    DOM.streamerStats.textContent = (activeSession && activeSession.title) || "ao vivo agora";
  }
  // Contagem real de espectadores (Presence) substitui o número mockado assim
  // que a inscrição na sala conectar — até lá, mostra você mesmo entrando.
  DOM.liveViewerCount.textContent = "1";
  STATE.liveViewerCount = 1;

  // Atualizar botão de seguir
  if (STATE.followedStreamers.includes(b.username)) {
    DOM.btnFollowStreamer.textContent = "Seguindo";
    DOM.btnFollowStreamer.classList.add("followed");
  } else {
    DOM.btnFollowStreamer.textContent = "+ Seguir";
    DOM.btnFollowStreamer.classList.remove("followed");
  }

  // Limpar chat anterior
  DOM.liveChatMessages.innerHTML = "";

  // Navegar
  navigateTo("live-room");

  // Iniciar vídeo
  const loader = DOM.liveRoom.querySelector(".video-loading-placeholder");
  loader.style.opacity = "1";
  loader.style.display = "flex";

  DOM.liveVideo.poster = b.avatar.replace("w=150", "w=500");

  await connectToRealLiveVideo(hostUserId, loader);

  // Mensagem de entrada e regras (aviso estático local, não é bot nem persistido)
  addSystemComment("Regras do chat: Seja gentil e siga as diretrizes.");

  // Chat real: carrega histórico de verdade e sincroniza novas mensagens de
  // todo mundo assistindo esta sala via Supabase Realtime.
  try {
    const history = await DB.getLiveChatHistory(b.username);
    history.forEach(renderIncomingLiveChatRow);
  } catch (err) {
    console.log("Não foi possível carregar o histórico do chat", err);
  }

  STATE.liveChatChannel = DB.subscribeToLiveRoom(b.username, {
    onMessage: renderIncomingLiveChatRow,
    onViewerCountChange: (count, avatars) => {
      STATE.liveViewerCount = count;
      DOM.liveViewerCount.textContent = count;
      const list = document.getElementById("header-viewers-list");
      if (list) {
        list.innerHTML = avatars.slice(0, 3)
          .map(url => `<img src="${url}" class="viewer-mini-avatar" alt="">`)
          .join("");
      }
    }
  }, { avatar_url: STATE.myAvatarUrl || "" });
}

// Conecta como espectador numa sala LiveKit real e anexa o vídeo/áudio
// recebido de quem está transmitindo ao player da tela.
async function connectToRealLiveVideo(hostUserId, loader) {
  const roomName = `live-${hostUserId}`;
  DOM.liveVideo.srcObject = null;
  try {
    const token = await DB.createLivekitToken(roomName);
    const room = new LivekitClient.Room();
    STATE.liveKitRoom = room;

    room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "video") {
        track.attach(DOM.liveVideo);
        loader.style.opacity = "0";
        setTimeout(() => { loader.style.display = "none"; }, 500);
        DOM.liveVideo.play().catch(err => console.log("Autoplay bloqueado, aguardando clique", err));
      } else if (track.kind === "audio") {
        track.attach(DOM.liveVideo);
      }
    });

    await room.connect(LIVEKIT_URL, token);
  } catch (err) {
    console.error("Falha ao conectar na live real:", err);
    showToast("Não foi possível conectar à transmissão.");
    loader.style.display = "none";
  }
}

function renderIncomingLiveChatRow(row) {
  // Mensagem pública da sala, mas eu escolhi não ver essa pessoa.
  if (row.user_id && STATE.blockedUsers.includes(row.user_id)) return;
  if (row.type === "gift") {
    addLiveComment(row.username, row.text.replace(/^enviou /, ""), true, "");
  } else {
    addLiveComment(row.username, row.text);
  }
}

function closeLiveRoom() {
  DOM.liveVideo.pause();
  DOM.liveVideo.src = "";
  DOM.liveVideo.srcObject = null;

  if (STATE.liveChatChannel) {
    sb.removeChannel(STATE.liveChatChannel);
    STATE.liveChatChannel = null;
  }
  if (STATE.liveKitRoom) {
    STATE.liveKitRoom.disconnect();
    STATE.liveKitRoom = null;
  }

  STATE.currentLiveBroadcaster = null;
  STATE.currentLiveIsReal = false;
}

async function toggleFollowStreamer() {
  const b = STATE.currentLiveBroadcaster;
  if (!b) return;
  if (!requireAuth()) return;

  const alreadyFollowing = STATE.followedStreamers.includes(b.username);

  try {
    if (alreadyFollowing) {
      await DB.unfollow(b.username);
      STATE.followedStreamers = STATE.followedStreamers.filter(h => h !== b.username);
      DOM.btnFollowStreamer.textContent = "+ Seguir";
      DOM.btnFollowStreamer.classList.remove("followed");
      showToast(`Deixou de seguir ${b.name}`);
    } else {
      await DB.follow(b.username);
      STATE.followedStreamers.push(b.username);
      DOM.btnFollowStreamer.textContent = "Seguindo";
      DOM.btnFollowStreamer.classList.add("followed");
      showToast(`Seguindo ${b.name}!`);
      addSystemComment(`Você seguiu ${b.name}`);
    }
  } catch (err) {
    showToast(err.message || "Não foi possível atualizar. Tente novamente.");
  }
}

// Lógica de Comentários do Chat da Live
function addSystemComment(text) {
  const msgEl = document.createElement("div");
  msgEl.className = "chat-msg system";
  msgEl.innerHTML = `<span class="msg-content">${escapeHtml(text)}</span>`;
  DOM.liveChatMessages.appendChild(msgEl);
  scrollLiveChatToBottom();
}

function addLiveComment(author, content, isGift = false, emoji = "") {
  const msgEl = document.createElement("div");
  msgEl.className = isGift ? "chat-msg gift-ann" : "chat-msg";

  let vipPrefix = "";
  if ((author === "Você" || author === STATE.profileName) && STATE.isVIP) {
    vipPrefix = `<span style="color:var(--secondary); font-weight:900; margin-right:4px; font-size:0.58rem; background:rgba(240,178,61,0.15); padding:1px 4px; border-radius:4px; border:1px solid rgba(240,178,61,0.4);">VIP</span>`;
  }

  const safeAuthor = escapeHtml(author);
  const safeContent = escapeHtml(content);

  if (isGift) {
    msgEl.innerHTML = `
      ${vipPrefix}<span class="msg-author">${safeAuthor}</span>
      <span class="msg-content">enviou ${safeContent} ${emoji}</span>
    `;
  } else {
    msgEl.innerHTML = `
      ${vipPrefix}<span class="msg-author">${safeAuthor}:</span>
      <span class="msg-content">${safeContent}</span>
    `;
  }

  DOM.liveChatMessages.appendChild(msgEl);
  scrollLiveChatToBottom();
}

function scrollLiveChatToBottom() {
  DOM.liveChatMessages.scrollTop = DOM.liveChatMessages.scrollHeight;
}

function handleChatInputKey(event) {
  if (event.key === "Enter") {
    sendUserComment();
  }
}

async function sendUserComment() {
  const text = DOM.liveChatInput.value.trim();
  if (text === "") return;
  if (!requireAuth()) return;
  const b = STATE.currentLiveBroadcaster;
  if (!b) return;

  DOM.liveChatInput.value = "";
  try {
    // Não faz eco local otimista — a mensagem aparece pra todo mundo (inclusive
    // quem enviou) quando o Realtime confirma a escrita real no banco.
    await DB.sendLiveChatMessage(b.username, STATE.profileName || "Você", text);
  } catch (err) {
    showToast(err.message || "Não foi possível enviar a mensagem.");
  }
}


// 10. EMISSOR DE CORAÇÕES FLUTUANTES (INTERATIVO)
function triggerFloatingHeart(x, y) {
  const heart = document.createElement("div");
  heart.className = "floating-heart";

  // Cores de corações aleatórias
  const colors = ["#ff4d6d", "#ff8ba0", "#f0b23d", "#ffffff"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  heart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${randomColor}">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;

  // Variação no movimento horizontal (efeito zigue-zague via JS inline css)
  const drift = (Math.random() * 80 - 40); // Desvio de até 40px p/ esquerda ou direita
  heart.style.left = `${x - 10}px`;
  heart.style.top = `${y - 20}px`;
  
  // Aplicar variáveis customizadas CSS para a animação
  heart.style.setProperty("--drift", `${drift}px`);
  
  DOM.heartsContainer.appendChild(heart);
  
  // Remover após término da animação
  setTimeout(() => {
    heart.remove();
  }, 2200);
}


// 11. SISTEMA DE GAVETA E ENVIO DE PRESENTES
function openGiftDrawer() {
  DOM.giftDrawer.classList.add("active");
  // Atualizar carteira do drawer
  DOM.drawerCoinsDisplay.textContent = STATE.myCoins;
}

function closeGiftDrawer() {
  DOM.giftDrawer.classList.remove("active");
  // Resetar seleção
  const items = DOM.giftDrawer.querySelectorAll(".gift-item");
  items.forEach(it => it.classList.remove("selected"));
  STATE.selectedGift = null;
  DOM.btnSendGift.className = "btn-send-gift-disabled";
  DOM.btnSendGift.disabled = true;
  DOM.btnSendGift.textContent = "Selecione um presente";
}

function selectGift(element, name, price, icon) {
  const items = DOM.giftDrawer.querySelectorAll(".gift-item");
  items.forEach(it => it.classList.remove("selected"));
  
  element.classList.add("selected");
  
  STATE.selectedGift = { name, price, icon };
  
  DOM.btnSendGift.className = "btn-send-gift-active";
  DOM.btnSendGift.disabled = false;
  DOM.btnSendGift.textContent = `Enviar ${name} (${price} Moeda${price > 1 ? 's' : ''})`;
}

// Mapeia o nome exibido do presente (usado nos onclick do HTML) para o código
// que a função RPC send_gift reconhece internamente.
const GIFT_CODES = {
  "Rosa": "rosa",
  "Chocolate": "chocolate",
  "Diamante": "diamante",
  "Coroa VIP": "coroa_vip",
  "Super Carro": "super_carro",
  "Castelo": "castelo"
};

async function sendSelectedGift() {
  if (!STATE.selectedGift) return;
  if (!requireAuth()) return;
  const gift = STATE.selectedGift;

  try {
    const profile = await DB.sendGift(GIFT_CODES[gift.name], STATE.currentLiveBroadcaster ? STATE.currentLiveBroadcaster.username : null);
    await applyProfileToUI(profile);
    DOM.drawerCoinsDisplay.textContent = STATE.myCoins;

    // Adicionar diamantes/pontos ao streamer da live (cosmético — streamer é dado mockado)
    if (STATE.currentLiveBroadcaster) {
      STATE.currentLiveBroadcaster.diamondsCount += gift.price;
      // Formatar de volta
      let display = "";
      const count = STATE.currentLiveBroadcaster.diamondsCount;
      if (count >= 1000000) {
        display = (count / 1000000).toFixed(1) + " mi";
      } else if (count >= 1000) {
        display = (count / 1000).toFixed(0) + " mil";
      } else {
        display = count.toString();
      }
      STATE.currentLiveBroadcaster.diamonds = display;
      DOM.streamerStats.textContent = `${display} acumulados`;
    }

    // Fechar gaveta
    closeGiftDrawer();

    // Mostrar anúncio gráfico animado no centro
    triggerGiftAnnouncement(gift.icon, `Você enviou um(a) ${gift.name}!`);

    // Mensagem do presente no chat chega via Realtime (visível pra todo mundo na sala, não só localmente)
  } catch (err) {
    showToast(err.message || "Não foi possível enviar o presente.");
  }
}

function triggerGiftAnnouncement(emoji, text) {
  DOM.giftAnnouncementEmoji.textContent = emoji;
  DOM.giftAnnouncementText.textContent = text;
  DOM.giftAnnouncement.classList.add("active");
  
  // Desativa após 2.5 segundos
  setTimeout(() => {
    DOM.giftAnnouncement.classList.remove("active");
  }, 2500);
}

function renderCoins() {
  DOM.userCoinsDisplay.textContent = STATE.myCoins;
  DOM.profileCoinsDisplay.textContent = STATE.myCoins;
  if (typeof updateXPProgressUI === "function") {
    updateXPProgressUI();
  }
}


// Escapa texto vindo de outros usuários (nome, bio, mensagens, comentários,
// motivo de denúncia) antes de jogar em innerHTML — sem isso, qualquer pessoa
// podia colocar HTML/script no próprio nome de perfil ou numa mensagem de chat
// e ele rodava no navegador de quem lesse, inclusive um admin abrindo denúncias.
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// Traduz os códigos de erro reais que o Supabase Auth devolve (em inglês)
// pra mensagens em português. Usa err.code — mais confiável do que casar
// pelo texto em inglês, que pode mudar de versão pra versão.
const AUTH_ERROR_MESSAGES_PT = {
  weak_password: "A senha precisa ter pelo menos 6 caracteres.",
  user_already_exists: "Esse e-mail já tem uma conta. Tente entrar em vez de cadastrar.",
  invalid_credentials: "E-mail ou senha incorretos.",
  email_address_invalid: "Esse e-mail não é válido.",
  email_address_not_authorized: "Esse e-mail não pode ser usado.",
  email_exists: "Esse e-mail já tem uma conta. Tente entrar em vez de cadastrar.",
  over_email_send_rate_limit: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.",
  signup_disabled: "Cadastro temporariamente desativado.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada, inclusive spam).",
  same_password: "A nova senha precisa ser diferente da atual.",
};

function translateAuthError(err) {
  const code = err && err.code;
  if (code && AUTH_ERROR_MESSAGES_PT[code]) return AUTH_ERROR_MESSAGES_PT[code];
  return (err && err.message) || "Erro ao autenticar. Tente novamente.";
}

// 12. TELA DE MENSAGENS E DIRECT MESSAGES (INBOX)
function formatMessageTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

async function renderInboxList() {
  let conversations = [];
  if (STATE.isLoggedIn) {
    try {
      conversations = await DB.getConversations();
    } catch (err) {
      console.error("Falha ao carregar conversas:", err);
    }
  }

  STATE.dmsList = conversations
    .filter(c => !STATE.blockedUsers.includes(c.partnerId))
    .map(c => ({
      partnerId: c.partnerId,
      name: c.profile ? (c.profile.display_name || c.profile.username) : "Usuário",
      avatar: c.profile ? c.profile.avatar_url : "",
      lastMessage: c.lastMessage,
      time: formatMessageTime(c.lastAt),
      unread: c.unread
    }));

  DOM.inboxList.innerHTML = "";

  if (STATE.dmsList.length === 0) {
    DOM.inboxList.innerHTML = `
      <div class="discover-empty-state" style="display: flex;">
        <div class="discover-empty-icon">💬</div>
        <h3>Nenhuma conversa ainda</h3>
        <p>Busque um perfil real e mande uma mensagem pra começar.</p>
        <button class="btn-follow-primary" onclick="openSearchOverlay()">Buscar Perfis</button>
      </div>
    `;
    DOM.navChatBadge.style.display = "none";
    return;
  }

  let unreadCount = 0;

  STATE.dmsList.forEach(chat => {
    if (chat.unread) unreadCount++;

    const item = document.createElement("div");
    item.className = chat.unread ? "inbox-item unread" : "inbox-item";

    item.onclick = () => openPrivateChat(chat.partnerId, chat.name, chat.avatar);

    const safeName = escapeHtml(chat.name);
    item.innerHTML = `
      <div class="inbox-avatar">
        <img src="${chat.avatar}" alt="${safeName}">
      </div>
      <div class="inbox-details">
        <span class="inbox-name">${safeName}</span>
        <span class="inbox-message">${escapeHtml(chat.lastMessage)}</span>
      </div>
      <div class="inbox-right">
        <span class="inbox-time">${chat.time}</span>
        ${chat.unread ? '<div class="unread-dot"></div>' : ''}
      </div>
    `;

    DOM.inboxList.appendChild(item);
  });

  // Atualizar badge do chat na bottom nav
  if (unreadCount > 0) {
    DOM.navChatBadge.style.display = "flex";
    DOM.navChatBadge.textContent = unreadCount;
  } else {
    DOM.navChatBadge.style.display = "none";
  }
}

async function openPrivateChat(partnerId, name, avatar) {
  if (!requireAuth()) return;

  STATE.activeChatPartner = partnerId;
  DOM.chatPartnerAvatar.src = avatar;
  DOM.chatPartnerName.textContent = name;
  DOM.privateChatHistory.innerHTML = "";

  navigateTo("private-chat");

  try {
    const user = await Auth.getUser();
    const history = await DB.getConversationHistory(partnerId);
    if (history.length === 0) {
      DOM.privateChatHistory.innerHTML = `
        <div class="discover-empty-state" style="display: flex;">
          <div class="discover-empty-icon">👋</div>
          <h3>Comece a conversa</h3>
          <p>Envie a primeira mensagem para ${escapeHtml(name)}.</p>
        </div>
      `;
    } else {
      history.forEach(msg => appendPrivateChatBubble(msg, user.id));
    }
    await DB.markConversationRead(partnerId);
  } catch (err) {
    console.error("Falha ao carregar conversa:", err);
  }
  renderInboxList();
}

function appendPrivateChatBubble(msg, myUserId) {
  const emptyHint = DOM.privateChatHistory.querySelector(".discover-empty-state");
  if (emptyHint) emptyHint.remove();

  const bubble = document.createElement("div");
  const isMine = msg.sender_id === myUserId;
  bubble.className = isMine ? "chat-bubble sent" : "chat-bubble received";

  let vipSuffix = "";
  if (isMine && STATE.isVIP) {
    vipSuffix = `<span style="font-size: 0.58rem; display: block; color: var(--secondary); font-weight: bold; margin-bottom: 2px;">👑 VIP Ouro</span>`;
  }

  bubble.innerHTML = `
    ${vipSuffix}
    <span>${escapeHtml(msg.text)}</span>
    <span class="chat-bubble-time">${formatMessageTime(msg.created_at)}</span>
  `;
  DOM.privateChatHistory.appendChild(bubble);
  DOM.privateChatHistory.scrollTop = DOM.privateChatHistory.scrollHeight;
}

function handlePrivateChatKey(event) {
  if (event.key === "Enter") {
    sendPrivateChatMessage();
  }
}

async function sendPrivateChatMessage() {
  const text = DOM.privateChatInput.value.trim();
  if (text === "") return;
  if (!requireAuth()) return;

  const partnerId = STATE.activeChatPartner;
  if (!partnerId) return;

  DOM.privateChatInput.value = "";
  try {
    const user = await Auth.getUser();
    const sent = await DB.sendDirectMessage(partnerId, text);
    appendPrivateChatBubble(sent, user.id);
    renderInboxList();
  } catch (err) {
    showToast(err.message || "Não foi possível enviar a mensagem.");
  }
}

function simulatePrivateVideoCall() {
  showToast("Chamada de vídeo ainda não disponível nesta versão.");
}


// 12.1 BLOQUEAR E DENUNCIAR USUÁRIOS
function openChatPartnerOptions() {
  if (!STATE.activeChatPartner) return;
  openUserOptionsMenu(STATE.activeChatPartner, DOM.chatPartnerName.textContent);
}

function openLiveStreamerOptions() {
  if (!STATE.currentLiveBroadcaster || !STATE.currentLiveBroadcaster.id) return;
  openUserOptionsMenu(STATE.currentLiveBroadcaster.id, STATE.currentLiveBroadcaster.name);
}

function openUserOptionsMenu(userId, userName) {
  if (!requireAuth()) return;
  STATE.optionsTargetUserId = userId;
  STATE.optionsTargetUserName = userName;
  document.getElementById("user-options-title").textContent = userName;
  const isBlocked = STATE.blockedUsers.includes(userId);
  document.getElementById("btn-toggle-block").textContent = isBlocked ? "Desbloquear" : "Bloquear";
  document.getElementById("modal-user-options").style.display = "flex";
}

function closeUserOptionsMenu() {
  document.getElementById("modal-user-options").style.display = "none";
}

async function handleToggleBlock() {
  const userId = STATE.optionsTargetUserId;
  if (!userId) return;
  const wasBlocked = STATE.blockedUsers.includes(userId);

  try {
    if (wasBlocked) {
      await DB.unblockUser(userId);
      STATE.blockedUsers = STATE.blockedUsers.filter(id => id !== userId);
      showToast("Usuário desbloqueado.");
    } else {
      await DB.blockUser(userId);
      STATE.blockedUsers.push(userId);
      showToast(`Você bloqueou ${STATE.optionsTargetUserName}.`);
    }
  } catch (err) {
    showToast(err.message || "Não foi possível concluir a ação.");
    return;
  }

  closeUserOptionsMenu();
  renderInboxList();

  // Se acabou de bloquear a pessoa cuja conversa/live você está vendo agora, sai da tela.
  if (!wasBlocked) {
    if (STATE.activeScreen === "private-chat" && STATE.activeChatPartner === userId) {
      navigateTo("messages");
    }
    if (STATE.activeScreen === "live-room" && STATE.currentLiveBroadcaster && STATE.currentLiveBroadcaster.id === userId) {
      closeLiveRoom();
      navigateTo("discover");
    }
  }
}

function openReportPrompt() {
  closeUserOptionsMenu();
  document.getElementById("report-reason-input").value = "";
  document.getElementById("modal-report-user").style.display = "flex";
}

function closeReportModal() {
  document.getElementById("modal-report-user").style.display = "none";
}

async function submitReport() {
  const reason = document.getElementById("report-reason-input").value.trim();
  if (!reason) {
    showToast("Descreva o motivo da denúncia.");
    return;
  }
  try {
    await DB.reportUser(STATE.optionsTargetUserId, reason);
    showToast("Denúncia enviada. Obrigado por ajudar a manter o VibeLive seguro.");
    closeReportModal();
  } catch (err) {
    showToast(err.message || "Não foi possível enviar a denúncia.");
  }
}

// Painel de moderação — só quem tem is_admin=true no banco vê algo aqui;
// pra qualquer outra conta o RLS simplesmente devolve zero denúncias.
async function openAdminReportsPanel() {
  if (!STATE.isAdmin) return;
  const modal = document.getElementById("modal-admin-reports");
  const container = document.getElementById("admin-reports-list-container");
  if (!modal || !container) return;

  container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--light-gray);font-size:0.8rem;">Carregando...</div>`;
  modal.style.display = "flex";

  try {
    STATE.adminReports = await DB.getAllReports();
  } catch (err) {
    console.error("Falha ao carregar denúncias:", err);
    STATE.adminReports = [];
  }
  renderAdminReportsList();
}

function closeAdminReportsPanel() {
  document.getElementById("modal-admin-reports").style.display = "none";
}

function renderAdminReportsList() {
  const container = document.getElementById("admin-reports-list-container");
  if (!container) return;
  container.innerHTML = "";

  if (STATE.adminReports.length === 0) {
    container.innerHTML = `
      <div class="discover-empty-state" style="display: flex;">
        <div class="discover-empty-icon">🛡️</div>
        <h3>Nenhuma denúncia recebida</h3>
        <p>Quando alguém denunciar um usuário, aparece aqui.</p>
      </div>
    `;
    return;
  }

  STATE.adminReports.forEach((r, index) => {
    const reporterName = escapeHtml(r.reporter ? (r.reporter.display_name || r.reporter.username) : "Usuário removido");
    const reportedName = escapeHtml(r.reported ? (r.reported.display_name || r.reported.username) : "Usuário removido");

    const item = document.createElement("div");
    item.className = r.reviewed_at ? "inbox-item" : "inbox-item unread";
    item.style.flexDirection = "column";
    item.style.alignItems = "stretch";
    item.style.padding = "12px 0";

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <span class="inbox-name" style="display:block;">${reporterName} denunciou ${reportedName}</span>
          <span class="inbox-message" style="display:block; margin-top:4px; white-space:normal;">${escapeHtml(r.reason)}</span>
          <span class="inbox-time" style="display:block; margin-top:4px;">${formatMessageTime(r.created_at)}</span>
        </div>
        ${r.reviewed_at
          ? '<span style="font-size:0.6rem; color:var(--light-gray); white-space:nowrap; margin-left:8px;">✓ revisada</span>'
          : `<button class="btn-follow-primary" style="height:22px; font-size:0.6rem; padding:0 8px; white-space:nowrap; margin-left:8px;" onclick="handleMarkReportReviewed(${index})">Marcar revisada</button>`
        }
      </div>
    `;
    container.appendChild(item);
  });
}

async function handleMarkReportReviewed(index) {
  const report = STATE.adminReports[index];
  if (!report) return;
  try {
    await DB.markReportReviewed(report.id);
    report.reviewed_at = new Date().toISOString();
    renderAdminReportsList();
  } catch (err) {
    showToast(err.message || "Não foi possível atualizar a denúncia.");
  }
}


// 13. LOJA DE MOEDAS E PAGAMENTO PIX REAL (MERCADO PAGO)
// Catálogo só para exibição (nome/preço na tela) — o valor que realmente
// conta é decidido no servidor (Edge Function create-pix-payment), a partir
// só do código do pacote, nunca de um número vindo do cliente.
const PIX_PACKAGES_DISPLAY = {
  p50: { coins: 50, price: 4.99 },
  p150: { coins: 150, price: 12.99 },
  p500: { coins: 500, price: 39.99 },
  p1200: { coins: 1200, price: 79.99 }
};

async function openPixModal(packageCode) {
  if (!requireAuth()) return;
  const display = PIX_PACKAGES_DISPLAY[packageCode];
  if (!display) return;

  STATE.activePixPackage = { code: packageCode, ...display };

  DOM.pixPackageName.textContent = `${display.coins} Moedas`;
  DOM.pixTotalPrice.textContent = `R$ ${display.price.toFixed(2).replace('.', ',')}`;
  DOM.pixQrImage.src = "";
  DOM.pixCopyCode.value = "";
  DOM.pixStatusBox.style.background = "";
  DOM.pixStatusBox.innerHTML = `
    <div class="spinner-small"></div>
    <span>Gerando cobrança PIX...</span>
  `;
  DOM.pixModal.classList.add("active");

  try {
    const payment = await DB.createPixPayment(packageCode);
    STATE.activePixPayment = payment;

    DOM.pixQrImage.src = `data:image/png;base64,${payment.qr_code_base64}`;
    DOM.pixCopyCode.value = payment.qr_code;
    DOM.pixStatusBox.innerHTML = `
      <div class="spinner-small"></div>
      <span>Aguardando confirmação do pagamento...</span>
    `;

    startPixCountdown();

    if (STATE.pixPaymentChannel) sb.removeChannel(STATE.pixPaymentChannel);
    STATE.pixPaymentChannel = DB.subscribeToPixPayment(payment.id, handlePixPaymentUpdate);
  } catch (err) {
    DOM.pixStatusBox.innerHTML = `<span>⚠️ ${err.message || "Não foi possível gerar o pagamento PIX."}</span>`;
  }
}

function startPixCountdown() {
  // Precisa bater com date_of_expiration definido em create-pix-payment/index.ts.
  let duration = 5 * 60;
  const updateTimer = () => {
    const mins = String(Math.floor(duration / 60)).padStart(2, '0');
    const secs = String(duration % 60).padStart(2, '0');
    DOM.pixTimer.textContent = `${mins}:${secs}`;
    if (duration <= 0) {
      clearInterval(STATE.pixTimerInterval);
      closePixModal();
      showToast("Pagamento expirado");
    }
    duration--;
  };
  updateTimer();
  if (STATE.pixTimerInterval) clearInterval(STATE.pixTimerInterval);
  STATE.pixTimerInterval = setInterval(updateTimer, 1000);
}

// Chamado pelo Realtime quando o webhook do Mercado Pago (via mp-webhook)
// confirma o pagamento — nunca por um botão de "simular".
async function handlePixPaymentUpdate(row) {
  STATE.activePixPayment = row;

  if (row.status === "approved") {
    if (STATE.pixTimerInterval) clearInterval(STATE.pixTimerInterval);
    DOM.pixStatusBox.style.background = "rgba(52, 211, 153, 0.15)";
    DOM.pixStatusBox.innerHTML = `
      <span style="font-size: 1.1rem;">✅</span>
      <strong>Pagamento Recebido com Sucesso!</strong>
    `;
    try {
      const user = await Auth.getUser();
      const profile = await DB.getProfile(user.id);
      await applyProfileToUI(profile);
    } catch (err) {
      console.error("Falha ao atualizar saldo após PIX aprovado:", err);
    }
    setTimeout(() => {
      closePixModal();
      showToast(`Moedas creditadas! +${row.coins_amount} Moedas adicionadas.`);
    }, 1500);
  } else if (row.status === "rejected" || row.status === "expired") {
    if (STATE.pixTimerInterval) clearInterval(STATE.pixTimerInterval);
    DOM.pixStatusBox.style.background = "rgba(241, 85, 76, 0.15)";
    DOM.pixStatusBox.innerHTML = `<strong>Pagamento não concluído. Tente novamente.</strong>`;
  }
}

function closePixModal() {
  DOM.pixModal.classList.remove("active");
  if (STATE.pixTimerInterval) clearInterval(STATE.pixTimerInterval);
  if (STATE.pixPaymentChannel) {
    sb.removeChannel(STATE.pixPaymentChannel);
    STATE.pixPaymentChannel = null;
  }
  STATE.activePixPackage = null;
  STATE.activePixPayment = null;
}

function copyPixCode() {
  DOM.pixCopyCode.select();
  DOM.pixCopyCode.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(DOM.pixCopyCode.value);
  showToast("Código Copia e Cola copiado!");
}


// 14. TRANSMITIR AO VIVO (GO LIVE)
function initiateCameraStream() {
  const constraints = { video: { facingMode: STATE.facingMode }, audio: true };
  const fallback = DOM.goLive.querySelector(".camera-fallback-msg");

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      STATE.localStream = stream;
      DOM.goLiveVideo.srcObject = stream;
      STATE.isMuted = false;
      updateMuteButtonUI();
      if (fallback) fallback.style.display = "none";
    })
    .catch(err => {
      console.log("Erro ao acessar câmera:", err);
      STATE.localStream = null;
      // Sem câmera real, não dá pra transmitir — mantém a mensagem de permissão
      // visível em vez de fingir uma transmissão com vídeo de estoque.
      if (fallback) fallback.style.display = "flex";
    });
}

// Muta/desmuta o microfone. Como o mesmo MediaStreamTrack é o que já foi
// publicado no LiveKit (quando ao vivo), desativar .enabled já corta o áudio
// pra quem está assistindo, sem precisar tocar na publicação.
function toggleMute() {
  if (!STATE.localStream) return;
  const audioTrack = STATE.localStream.getAudioTracks()[0];
  if (!audioTrack) return;
  audioTrack.enabled = !audioTrack.enabled;
  STATE.isMuted = !audioTrack.enabled;
  updateMuteButtonUI();
  showToast(STATE.isMuted ? "Microfone mudo" : "Microfone ativado");
}

const MUTE_ICON_ON_SVG = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg>`;
const MUTE_ICON_OFF_SVG = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12h-2zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

// Atualiza os dois botões de mudo que existem — o do preview (antes de ir ao
// vivo) e o do overlay ativo (já transmitindo) — mantendo os dois em sincronia.
function updateMuteButtonUI() {
  const icon = STATE.isMuted ? MUTE_ICON_OFF_SVG : MUTE_ICON_ON_SVG;

  const liveBtn = document.getElementById("btn-toggle-mute");
  if (liveBtn) {
    liveBtn.classList.toggle("muted", STATE.isMuted);
    liveBtn.innerHTML = icon;
  }

  const setupBtn = document.getElementById("setup-btn-mute");
  if (setupBtn) {
    setupBtn.classList.toggle("muted", STATE.isMuted);
    const iconWrap = setupBtn.querySelector(".setup-action-icon-svg");
    if (iconWrap) iconWrap.innerHTML = icon;
    const label = setupBtn.querySelector("span");
    if (label) label.textContent = STATE.isMuted ? "Ativar" : "Mudo";
  }
}

// Troca entre câmera frontal e traseira. Se já estiver ao vivo, troca também
// a track publicada no LiveKit na hora, sem cortar a transmissão pra quem assiste.
async function toggleCameraFacing() {
  STATE.facingMode = STATE.facingMode === "user" ? "environment" : "user";
  showToast(`Trocando para câmera ${STATE.facingMode === "user" ? "frontal" : "traseira"}...`);

  const wasMuted = STATE.isMuted;
  if (STATE.localStream) {
    STATE.localStream.getTracks().forEach(track => track.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: STATE.facingMode }, audio: true });
    STATE.localStream = stream;
    DOM.goLiveVideo.srcObject = stream;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = !wasMuted;
    STATE.isMuted = wasMuted;
    updateMuteButtonUI();

    if (STATE.myLiveKitRoom) {
      const room = STATE.myLiveKitRoom;
      for (const pub of Array.from(room.localParticipant.videoTrackPublications.values())) {
        if (pub.track) await room.localParticipant.unpublishTrack(pub.track);
      }
      for (const pub of Array.from(room.localParticipant.audioTrackPublications.values())) {
        if (pub.track) await room.localParticipant.unpublishTrack(pub.track);
      }
      const newVideoTrack = stream.getVideoTracks()[0];
      if (newVideoTrack) await room.localParticipant.publishTrack(newVideoTrack);
      if (audioTrack) await room.localParticipant.publishTrack(audioTrack);
    }
  } catch (err) {
    console.error("Falha ao trocar de câmera:", err);
    showToast("Não foi possível trocar de câmera.");
  }
}

// ==========================================================================
// PRIVACIDADE DA LIVE (pública / com senha / só convidados)
// ==========================================================================
async function openLivePrivacyModal() {
  const radios = document.querySelectorAll('input[name="live-privacy"]');
  radios.forEach(r => { r.checked = r.value === STATE.livePrivacyMode; });
  document.getElementById("live-privacy-password-input").value = STATE.livePrivacyPassword;
  updateLivePrivacyUI();

  if (STATE.livePrivacyMode === "invite") {
    await renderInviteList();
  }

  document.getElementById("modal-live-privacy").style.display = "flex";
}

function closeLivePrivacyModal() {
  const selected = document.querySelector('input[name="live-privacy"]:checked');
  STATE.livePrivacyMode = selected ? selected.value : "public";
  STATE.livePrivacyPassword = document.getElementById("live-privacy-password-input").value.trim();

  const icon = document.getElementById("setup-privacy-icon");
  if (icon) {
    icon.textContent = STATE.livePrivacyMode === "password" ? "🔒" : STATE.livePrivacyMode === "invite" ? "👥" : "🌐";
  }
  document.getElementById("modal-live-privacy").style.display = "none";
}

async function updateLivePrivacyUI() {
  const mode = document.querySelector('input[name="live-privacy"]:checked')?.value || "public";
  document.getElementById("live-privacy-password-group").style.display = mode === "password" ? "block" : "none";
  document.getElementById("live-privacy-invite-group").style.display = mode === "invite" ? "block" : "none";
  if (mode === "invite" && !STATE.mutualFollowersCache) {
    await renderInviteList();
  }
}

async function renderInviteList() {
  const container = document.getElementById("live-privacy-invite-list");
  container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--light-gray);font-size:0.72rem;">Carregando...</div>`;
  try {
    if (!STATE.mutualFollowersCache) {
      STATE.mutualFollowersCache = await DB.getMutualFollowers();
    }
    const mutuals = STATE.mutualFollowersCache;
    if (mutuals.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--light-gray);font-size:0.72rem;">Ninguém que te segue e você segue de volta ainda.</div>`;
      return;
    }
    container.innerHTML = "";
    mutuals.forEach(p => {
      const name = escapeHtml(p.display_name || p.username);
      const item = document.createElement("label");
      item.className = "invite-checkbox-item";
      item.innerHTML = `
        <input type="checkbox" value="${p.id}" ${STATE.liveInviteeIds.includes(p.id) ? "checked" : ""} onchange="toggleInvitee('${p.id}', this.checked)">
        <img src="${p.avatar_url || ""}" alt="${name}">
        <span>${name}</span>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--light-gray);font-size:0.72rem;">Não foi possível carregar. Tente de novo.</div>`;
  }
}

function toggleInvitee(userId, checked) {
  if (checked) {
    if (!STATE.liveInviteeIds.includes(userId)) STATE.liveInviteeIds.push(userId);
  } else {
    STATE.liveInviteeIds = STATE.liveInviteeIds.filter(id => id !== userId);
  }
}

// ==========================================================================
// CONTEÚDO PAGO DE QUEM VOCÊ SEGUE (Discover)
// ==========================================================================
async function openFollowingPaidContent() {
  if (!requireAuth()) return;
  const modal = document.getElementById("modal-following-paid-content");
  const container = document.getElementById("following-paid-content-list");
  modal.style.display = "flex";
  container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--light-gray);font-size:0.78rem;">Carregando...</div>`;

  try {
    const creators = await DB.getFollowedPaidCreators();
    if (creators.length === 0) {
      container.innerHTML = `
        <div class="discover-empty-state" style="display: flex;">
          <div class="discover-empty-icon">💎</div>
          <h3>Nada por aqui ainda</h3>
          <p>Quando alguém que você segue começar a vender conteúdo privado, aparece aqui.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    creators.forEach(p => {
      const name = escapeHtml(p.display_name || p.username);
      const item = document.createElement("div");
      item.className = "inbox-item";
      item.onclick = () => { closeFollowingPaidContent(); openPrivateContentModal(p.id); };
      item.innerHTML = `
        <div class="inbox-avatar">
          <img src="${p.avatar_url || DEFAULT_AVATAR_DATA_URI}" alt="${name}">
        </div>
        <div class="inbox-details">
          <span class="inbox-name">${name}</span>
          <span class="inbox-message">@${escapeHtml(p.username)}</span>
        </div>
        <div class="inbox-right">
          <button class="btn-lightbox-like active" style="font-size: 0.65rem;">🪙 ${p.private_content_price}</button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--light-gray);font-size:0.78rem;">Não foi possível carregar agora. Tente de novo.</div>`;
  }
}

function closeFollowingPaidContent() {
  document.getElementById("modal-following-paid-content").style.display = "none";
}

// ==========================================================================
// CONTEÚDO PRIVADO (desbloqueio único pago com moedas, preço do criador)
// ==========================================================================
async function openPrivateContentModal(creatorId) {
  if (!requireAuth()) return;
  STATE.viewingPrivateContentCreatorId = creatorId;
  document.getElementById("modal-private-content").style.display = "flex";
  document.getElementById("private-content-locked-view").style.display = "none";
  document.getElementById("private-content-grid").style.display = "none";
  document.getElementById("private-content-empty").style.display = "none";

  try {
    const info = await DB.getPrivateContentInfo(creatorId);
    const name = info.profile.display_name || info.profile.username;
    document.getElementById("private-content-title").textContent = `Conteúdo de ${name}`;

    if (!info.unlocked) {
      document.getElementById("private-content-avatar").src = info.profile.avatar_url || "";
      document.getElementById("private-content-creator-name").textContent = name;
      document.getElementById("private-content-price-label").textContent = info.profile.private_content_price;
      document.getElementById("private-content-locked-view").style.display = "block";
      return;
    }

    if (info.posts.length === 0) {
      document.getElementById("private-content-empty").style.display = "flex";
      return;
    }

    const grid = document.getElementById("private-content-grid");
    grid.style.display = "grid";
    grid.innerHTML = "";
    info.posts.forEach(post => {
      const item = document.createElement("div");
      item.className = "post-grid-item";
      item.innerHTML = post.media_type === "image"
        ? `<img src="${post.media_url}" alt="Post privado">`
        : `<video src="${post.media_url}" muted playsinline></video><div class="post-video-indicator">▶ Video</div>`;
      grid.appendChild(item);
    });
  } catch (err) {
    showToast(err.message || "Não foi possível carregar esse conteúdo.");
    closePrivateContentModal();
  }
}

function closePrivateContentModal() {
  document.getElementById("modal-private-content").style.display = "none";
  STATE.viewingPrivateContentCreatorId = null;
}

async function unlockPrivateContentNow() {
  const creatorId = STATE.viewingPrivateContentCreatorId;
  if (!creatorId) return;
  const btn = document.getElementById("btn-unlock-private-content");
  if (btn) { btn.disabled = true; btn.textContent = "Desbloqueando..."; }
  try {
    const profile = await DB.unlockPrivateContent(creatorId);
    STATE.myCoins = profile.coins;
    renderCoins();
    showToast("Conteúdo desbloqueado!");
    await openPrivateContentModal(creatorId);
  } catch (err) {
    showToast(err.message || "Não foi possível desbloquear agora. Confira seu saldo de moedas.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = `Desbloquear por 🪙 ${document.getElementById("private-content-price-label").textContent}`; }
  }
}

function startOwnLiveStream() {
  if (!requireAuth()) return;

  // Sem câmera real conectada, não deixa a live entrar no ar — antes disso
  // a sessão era criada mesmo assim e ficava listada pra todo mundo sem
  // nenhum vídeo de verdade publicado.
  if (!STATE.localStream) {
    showToast("Permita o acesso à câmera para transmitir ao vivo.");
    return;
  }

  // Fechar painel de setup
  DOM.goLiveSetup.style.display = "none";
  
  // Exibir contagem regressiva visual
  const countdownOverlay = document.getElementById("go-live-countdown");
  const countdownNumber = document.getElementById("countdown-number");
  
  if (countdownOverlay && countdownNumber) {
    countdownOverlay.style.display = "flex";
    countdownNumber.textContent = "3";
    
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownNumber.textContent = count;
      } else if (count === 0) {
        countdownNumber.textContent = "LIVE!";
      } else {
        clearInterval(interval);
        countdownOverlay.style.display = "none";
        launchBroadcastingSession();
      }
    }, 850);
  } else {
    launchBroadcastingSession();
  }
}

async function launchBroadcastingSession() {
  // Exibir overlay de live ativa
  DOM.myLiveActiveOverlay.style.display = "flex";

  // Limpar mensagens e resetar contadores
  DOM.myLiveChatMessages.innerHTML = "";
  STATE.myLiveViewerCount = 0;
  STATE.myLiveDiamonds = 0;
  DOM.myLiveViewerCount.textContent = "0";
  DOM.myLiveDiamonds.textContent = "💎 0 acumulados";

  // Aviso de sistema (estático, não é bot)
  addMyLiveComment("Sistema", "Transmissão iniciada. Seus seguidores foram notificados! 📡", true);

  // Publica a câmera de verdade no LiveKit — é isso que permite outra pessoa
  // real entrar e assistir com vídeo de verdade, não só a prévia local.
  try {
    const user = await Auth.getUser();
    const roomName = `live-${user.id}`;
    const token = await DB.createLivekitToken(roomName);
    const room = new LivekitClient.Room();
    STATE.myLiveKitRoom = room;
    await room.connect(LIVEKIT_URL, token);

    if (STATE.localStream) {
      const videoTrack = STATE.localStream.getVideoTracks()[0];
      if (videoTrack) await room.localParticipant.publishTrack(videoTrack);
      const audioTrack = STATE.localStream.getAudioTracks()[0];
      if (audioTrack) await room.localParticipant.publishTrack(audioTrack);
    }

    const titleInput = document.getElementById("live-title-input");
    const title = titleInput ? titleInput.value.trim().slice(0, 80) : "";
    await DB.startLiveSession(roomName, title);

    // Aplica a privacidade escolhida (pública por padrão) — feito depois de
    // criar a sessão porque as funções de senha/convite trabalham em cima da
    // sessão ativa já existente pelo room_name.
    try {
      if (STATE.livePrivacyMode === "password" && STATE.livePrivacyPassword) {
        await DB.setLiveSessionPassword(roomName, STATE.livePrivacyPassword);
      } else {
        await DB.setLiveSessionPassword(roomName, null);
      }

      if (STATE.livePrivacyMode === "invite") {
        await DB.setLiveSessionInviteOnly(roomName, true);
        const session = (await DB.getActiveLiveSessions()).find(s => s.room_name === roomName);
        if (session) {
          await Promise.all(STATE.liveInviteeIds.map(id =>
            DB.inviteToLiveSession(session.id, id).catch(err => console.error("Falha ao convidar:", err))
          ));
        }
      } else {
        await DB.setLiveSessionInviteOnly(roomName, false);
      }
    } catch (err) {
      console.error("Falha ao aplicar privacidade da live:", err);
      showToast("Live no ar, mas houve um problema ao aplicar a privacidade escolhida.");
    }

    // Avisa em tempo real quando um presente de verdade chega — o servidor já
    // creditou a carteira (RPC send_gift/send_quick_rose); aqui só reflete
    // isso na tela de quem está transmitindo. O mesmo canal também traz a
    // contagem real de espectadores (Presence), que grava em live_sessions
    // pra alimentar o ranking "Vibe Hot" no Discover.
    if (STATE.myLiveGiftsChannel) sb.removeChannel(STATE.myLiveGiftsChannel);
    if (STATE.myUsername) {
      STATE.myLiveGiftsChannel = DB.subscribeToLiveRoom(STATE.myUsername, {
        onMessage: async (msg) => {
          if (msg.type !== "gift") return;
          addMyLiveComment(msg.username, msg.text.replace(/^enviou /, ""), false, true);
          try {
            const profile = await DB.getProfile(user.id);
            const delta = profile.coins - STATE.myCoins;
            if (delta > 0) {
              STATE.myLiveDiamonds += delta;
              DOM.myLiveDiamonds.textContent = `💎 ${STATE.myLiveDiamonds} acumulados`;
            }
            STATE.myCoins = profile.coins;
            renderCoins();
          } catch (err) {
            console.error("Falha ao atualizar saldo após presente recebido:", err);
          }
        },
        onViewerCountChange: (count) => {
          // Desconta a própria presença de quem transmite (não é espectador de si mesmo).
          const realCount = Math.max(0, count - 1);
          STATE.myLiveViewerCount = realCount;
          if (DOM.myLiveViewerCount) DOM.myLiveViewerCount.textContent = String(realCount);
          DB.updateLiveViewerCount(roomName, realCount).catch(err => console.error("Falha ao gravar contagem de espectadores:", err));
        }
      }, { avatar_url: STATE.myAvatarUrl || "" });
    }
  } catch (err) {
    console.error("Falha ao publicar transmissão real:", err);
    showToast("Sua câmera está ativa, mas outras pessoas podem não conseguir assistir agora.");
  }
}

async function stopOwnLiveStream() {
  // Parar webcam
  if (STATE.localStream) {
    STATE.localStream.getTracks().forEach(track => track.stop());
    STATE.localStream = null;
    DOM.goLiveVideo.srcObject = null;
  }

  // Desconectar do LiveKit e encerrar a sessão real (some da lista "Ao Vivo Agora" de todo mundo).
  // wasBroadcasting é o sinal de que existia mesmo uma transmissão ativa —
  // sem isso, só entrar na tela "Ir Ao Vivo" e sair (sem nunca transmitir)
  // tentava encerrar uma sessão que nunca existiu.
  const wasBroadcasting = !!STATE.myLiveKitRoom;
  if (STATE.myLiveKitRoom) {
    STATE.myLiveKitRoom.disconnect();
    STATE.myLiveKitRoom = null;
  }
  if (STATE.myLiveGiftsChannel) {
    sb.removeChannel(STATE.myLiveGiftsChannel);
    STATE.myLiveGiftsChannel = null;
  }
  if (wasBroadcasting) {
    try {
      await DB.endLiveSession();
    } catch (err) {
      console.error("Falha ao encerrar sessão de live:", err);
    }
  }

  // Reiniciar telas do go live
  DOM.goLiveSetup.style.display = "flex";
  DOM.myLiveActiveOverlay.style.display = "none";
  DOM.goLiveVideo.className = "";

  const fallback = DOM.goLive.querySelector(".camera-fallback-msg");
  fallback.style.display = "flex";

  if (wasBroadcasting) {
    showToast("Transmissão encerrada com sucesso!");
  }
}

function addMyLiveComment(author, content, isSystem = false, isGift = false) {
  const msgEl = document.createElement("div");
  const safeAuthor = escapeHtml(author);
  const safeContent = escapeHtml(content);
  if (isSystem) {
    msgEl.className = "chat-msg system";
    msgEl.innerHTML = `<span class="msg-content">${safeContent}</span>`;
  } else if (isGift) {
    msgEl.className = "chat-msg gift-ann";
    msgEl.innerHTML = `<span class="msg-author">${safeAuthor}</span> <span class="msg-content">${safeContent}</span>`;
  } else {
    msgEl.className = "chat-msg";
    msgEl.innerHTML = `<span class="msg-author">${safeAuthor}:</span> <span class="msg-content">${safeContent}</span>`;
  }
  DOM.myLiveChatMessages.appendChild(msgEl);
  DOM.myLiveChatMessages.scrollTop = DOM.myLiveChatMessages.scrollHeight;
}

// ==========================================================================
// 22. COMPONENTE DE POSTS DO PERFIL E LIGHTBOX (PERFIL PREMIUM)
// ==========================================================================

function toggleCoinShop() {
  const shop = document.getElementById("profile-coin-shop");
  if (shop.style.display === "none") {
    shop.style.display = "block";
  } else {
    shop.style.display = "none";
  }
}

function switchProfileTab(tabName) {
  const btnPosts = document.getElementById("profile-tab-posts-btn");
  const btnStats = document.getElementById("profile-tab-stats-btn");
  const panePosts = document.getElementById("profile-tab-posts");
  const paneStats = document.getElementById("profile-tab-stats");

  if (tabName === "posts") {
    btnPosts.classList.add("active");
    btnStats.classList.remove("active");
    panePosts.style.display = "flex";
    paneStats.style.display = "none";
  } else {
    btnPosts.classList.remove("active");
    btnStats.classList.add("active");
    panePosts.style.display = "none";
    paneStats.style.display = "block";
    refreshProfileMetrics();
  }
}

async function refreshProfileMetrics() {
  const timeEl = document.getElementById("metric-time-live");
  const livesEl = document.getElementById("metric-total-lives");
  if (!timeEl || !livesEl || !STATE.isLoggedIn) return;

  try {
    const user = await Auth.getUser();
    const { totalLives, totalMinutes } = await DB.getLiveMetrics(user.id);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    timeEl.textContent = totalMinutes === 0 ? "0min" : (h > 0 ? `${h}h ${m}min` : `${m}min`);
    livesEl.textContent = String(totalLives);
  } catch (err) {
    console.error("Falha ao carregar métricas:", err);
  }
}

function formatCompactCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".", ",") + "mi";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "k";
  return String(n);
}

async function refreshProfileStats(userId, username) {
  const followingEl = document.getElementById("profile-stat-following");
  const followersEl = document.getElementById("profile-stat-followers");
  const likesEl = document.getElementById("profile-stat-likes");
  if (!followingEl || !followersEl || !likesEl) return;

  try {
    const stats = await DB.getProfileStats(userId, username);
    followingEl.textContent = formatCompactCount(stats.followingCount);
    followersEl.textContent = formatCompactCount(stats.followersCount);
    likesEl.textContent = formatCompactCount(stats.likesCount);
  } catch (err) {
    console.error("Falha ao carregar estatísticas do perfil:", err);
  }
}

async function renderProfilePosts() {
  const container = document.getElementById("profile-posts-grid-container");
  const emptyState = document.getElementById("profile-posts-empty-state");
  if (!container) return;

  if (!STATE.isLoggedIn) {
    container.innerHTML = "";
    STATE.myPosts = [];
    return;
  }

  let posts;
  try {
    posts = await DB.getMyPosts();
  } catch (err) {
    console.error("Falha ao carregar publicações:", err);
    return;
  }
  STATE.myPosts = posts;

  container.innerHTML = "";

  if (posts.length === 0) {
    container.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }
  container.style.display = "grid";
  if (emptyState) emptyState.style.display = "none";

  posts.forEach(post => {
    const item = document.createElement("div");
    item.className = "post-grid-item";
    item.onclick = () => openPostLightbox(post.id);

    let mediaHtml = "";
    let indicatorHtml = "";

    if (post.media_type === "image") {
      mediaHtml = `<img src="${post.media_url}" alt="Post">`;
    } else {
      mediaHtml = `<video src="${post.media_url}" muted playsinline></video>`;
      indicatorHtml = `<div class="post-video-indicator">▶ Video</div>`;
    }

    item.innerHTML = `
      ${mediaHtml}
      ${indicatorHtml}
      ${post.is_private ? '<div class="post-private-badge">🔒</div>' : ""}
      <div class="post-grid-overlay">
        <span>❤️ <span class="post-likes-count" data-post="${post.id}">…</span></span>
        <span>💬 <span class="post-comments-count" data-post="${post.id}">…</span></span>
      </div>
    `;
    container.appendChild(item);

    // Contadores são preenchidos à parte para não travar a renderização da grade.
    DB.getPostLikeState(post.id).then(state => {
      const el = item.querySelector(".post-likes-count");
      if (el) el.textContent = state.likesCount;
    }).catch(() => {});
    DB.getComments(post.id).then(comments => {
      const el = item.querySelector(".post-comments-count");
      if (el) el.textContent = comments.length;
    }).catch(() => {});
  });
}

function openNewPostModal() {
  document.getElementById("modal-new-post").style.display = "flex";
  // Reset fields
  document.getElementById("post-caption-input").value = "";
  document.getElementById("post-file-input").value = "";
  document.getElementById("post-media-preview-container").style.display = "none";
  document.getElementById("post-is-private-input").checked = false;
  STATE.selectedPostFile = null;
  setPostType("image");
}

function closeNewPostModal() {
  document.getElementById("modal-new-post").style.display = "none";
  document.getElementById("post-preview-video").pause();
}

function setPostType(type) {
  STATE.currentPostType = type;
  const btnPhoto = document.getElementById("post-type-photo");
  const btnVideo = document.getElementById("post-type-video");
  const fileInput = document.getElementById("post-file-input");

  btnPhoto.classList.toggle("active", type === "image");
  btnVideo.classList.toggle("active", type === "video");
  fileInput.accept = type === "image" ? "image/*" : "video/*";

  // Trocar o tipo depois de já ter escolhido um arquivo descarta a escolha
  // anterior — evita publicar um vídeo marcado como foto (ou vice-versa).
  STATE.selectedPostFile = null;
  fileInput.value = "";
  document.getElementById("post-media-preview-container").style.display = "none";
}

function handlePostFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const isImage = STATE.currentPostType === "image";
  if (isImage && !file.type.startsWith("image/")) {
    showToast("Escolha um arquivo de imagem.");
    return;
  }
  if (!isImage && !file.type.startsWith("video/")) {
    showToast("Escolha um arquivo de vídeo.");
    return;
  }
  const maxSize = isImage ? 8 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast(`Arquivo muito grande (máximo ${isImage ? "8MB" : "25MB"}).`);
    return;
  }

  STATE.selectedPostFile = file;
  const url = URL.createObjectURL(file);
  const imgPreview = document.getElementById("post-preview-img");
  const videoPreview = document.getElementById("post-preview-video");
  document.getElementById("post-media-preview-container").style.display = "block";

  if (isImage) {
    imgPreview.style.display = "block";
    videoPreview.style.display = "none";
    videoPreview.pause();
    imgPreview.src = url;
  } else {
    imgPreview.style.display = "none";
    videoPreview.style.display = "block";
    videoPreview.src = url;
    videoPreview.play().catch(e => console.log(e));
  }
}

async function publishNewPost() {
  if (!requireAuth()) return;
  const caption = document.getElementById("post-caption-input").value.trim();
  const file = STATE.selectedPostFile;
  const isPrivate = document.getElementById("post-is-private-input").checked;

  if (!file) {
    showToast("Escolha uma foto ou vídeo para publicar.");
    return;
  }
  if (isPrivate && !STATE.myPrivateContentPrice) {
    showToast("Defina um preço pro seu conteúdo privado nas Configurações do Perfil antes de publicar.");
    return;
  }

  const btn = document.querySelector(".btn-publish-post");
  if (btn) { btn.disabled = true; btn.textContent = "Publicando..."; }

  try {
    const user = await Auth.getUser();
    const mediaUrl = await DB.uploadPostMedia(user.id, file);
    await DB.createPost(mediaUrl, STATE.currentPostType, caption || "Sem legenda.", isPrivate);
    await renderProfilePosts();
    closeNewPostModal();
    showToast("Publicação realizada com sucesso!");
  } catch (err) {
    showToast(err.message || "Não foi possível publicar. Tente novamente.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Publicar no Perfil"; }
  }
}

// Lightbox
async function openPostLightbox(postId) {
  const post = STATE.myPosts.find(p => p.id === postId);
  if (!post) return;

  STATE.activeLightboxPostId = postId;

  const modal = document.getElementById("modal-post-lightbox");
  const img = document.getElementById("lightbox-img");
  const video = document.getElementById("lightbox-video");
  const caption = document.getElementById("lightbox-caption");
  const likes = document.getElementById("lightbox-likes-count");
  const likeBtn = modal.querySelector(".btn-lightbox-like");

  modal.style.display = "flex";
  caption.textContent = post.caption;
  likes.textContent = "carregando…";
  likeBtn.classList.remove("active");

  const authorAvatar = document.getElementById("lightbox-author-avatar");
  const authorName = document.getElementById("lightbox-author-name");
  const authorHandle = document.getElementById("lightbox-author-handle");
  if (authorAvatar) authorAvatar.src = STATE.myAvatarUrl || "";
  if (authorName) authorName.textContent = STATE.profileName || "";
  if (authorHandle) authorHandle.textContent = "@" + (STATE.myUsername || "");

  if (post.media_type === "image") {
    img.style.display = "block";
    video.style.display = "none";
    video.pause();
    img.src = post.media_url;
  } else {
    img.style.display = "none";
    video.style.display = "block";
    video.src = post.media_url;
    video.play().catch(e => console.log(e));
  }

  try {
    const [likeState, comments] = await Promise.all([
      DB.getPostLikeState(postId),
      DB.getComments(postId)
    ]);
    STATE.activeLightboxLikeState = likeState;
    likes.textContent = `${likeState.likesCount} curtidas`;
    if (likeState.likedByMe) likeBtn.classList.add("active");
    renderLightboxComments(comments);
  } catch (err) {
    console.error("Falha ao carregar curtidas/comentários:", err);
  }
}

function closePostLightbox() {
  document.getElementById("modal-post-lightbox").style.display = "none";
  document.getElementById("lightbox-video").pause();
  STATE.activeLightboxPostId = null;
}

function renderLightboxComments(comments) {
  const list = document.getElementById("lightbox-comments-list");
  list.innerHTML = "";

  if (comments.length === 0) {
    list.innerHTML = `<div style="font-size: 0.65rem; color: var(--light-gray); padding: 4px 0;">Nenhum comentário. Seja o primeiro!</div>`;
    return;
  }

  comments.forEach(c => {
    const item = document.createElement("div");
    item.className = "lightbox-comment-item";
    const authorName = c.profiles ? (c.profiles.display_name || c.profiles.username) : "Usuário";
    item.innerHTML = `<strong>${escapeHtml(authorName)}</strong> ${escapeHtml(c.text)}`;
    list.appendChild(item);
  });
}

async function likeLightboxPost() {
  if (!requireAuth()) return;
  const postId = STATE.activeLightboxPostId;
  if (!postId) return;

  const currentlyLiked = STATE.activeLightboxLikeState ? STATE.activeLightboxLikeState.likedByMe : false;
  const btn = document.querySelector("#modal-post-lightbox .btn-lightbox-like");

  try {
    const newState = await DB.toggleLike(postId, currentlyLiked);
    STATE.activeLightboxLikeState = newState;
    btn.classList.toggle("active", newState.likedByMe);
    document.getElementById("lightbox-likes-count").textContent = `${newState.likesCount} curtidas`;

    const gridCounter = document.querySelector(`.post-likes-count[data-post="${postId}"]`);
    if (gridCounter) gridCounter.textContent = newState.likesCount;
  } catch (err) {
    showToast(err.message || "Não foi possível curtir agora.");
  }
}

async function addLightboxComment() {
  if (!requireAuth()) return;
  const input = document.getElementById("lightbox-new-comment");
  const text = input.value.trim();
  if (!text) return;

  const postId = STATE.activeLightboxPostId;
  if (!postId) return;

  try {
    await DB.addComment(postId, text); // xp é concedido atomicamente pela RPC
    input.value = "";

    const comments = await DB.getComments(postId);
    renderLightboxComments(comments);

    const gridCounter = document.querySelector(`.post-comments-count[data-post="${postId}"]`);
    if (gridCounter) gridCounter.textContent = comments.length;

    const user = await Auth.getUser();
    const profile = await DB.getProfile(user.id);
    await applyProfileToUI(profile);
  } catch (err) {
    showToast(err.message || "Não foi possível comentar agora.");
  }
}

// ==========================================================================
// 23. EDICÃO DE PERFIL E EXCLUSÃO DE CONTA (SETTINGS)
// ==========================================================================

function openProfileSettingsModal() {
  document.getElementById("modal-profile-settings").style.display = "flex";

  // Preencher inputs com valores atuais da UI
  const nameEl = document.querySelector(".profile-bio-info h3");
  const handleEl = document.querySelector(".profile-handle");
  const bioEl = document.querySelector(".profile-bio-text");

  // Remove checkmark do nome antes de colar no input
  let rawName = nameEl ? nameEl.textContent : "Alexandre Silva";
  rawName = rawName.replace("✓", "").trim();

  document.getElementById("edit-profile-name").value = rawName;
  document.getElementById("edit-profile-handle").value = handleEl ? handleEl.textContent : "@zcitando";
  document.getElementById("edit-profile-bio").value = bioEl ? bioEl.textContent : "Criador digital • Focado em lives interativas 🎬🍿";
  document.getElementById("edit-profile-avatar-preview").src = STATE.myAvatarUrl || "";
  document.getElementById("edit-profile-private-price").value = STATE.myPrivateContentPrice || "";
}

async function handleAvatarFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!requireAuth()) return;

  if (!file.type.startsWith("image/")) {
    showToast("Escolha um arquivo de imagem.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Imagem muito grande (máximo 5MB).");
    return;
  }

  const preview = document.getElementById("edit-profile-avatar-preview");
  const previousSrc = preview.src;
  preview.style.opacity = "0.5";

  try {
    const user = await Auth.getUser();
    const newUrl = await DB.uploadAvatar(user.id, file);
    await DB.updateProfile(user.id, { avatar_url: newUrl });

    STATE.myAvatarUrl = newUrl;
    preview.src = newUrl;
    syncMyAvatarEverywhere(newUrl);
    showToast("Foto de perfil atualizada!");
  } catch (err) {
    preview.src = previousSrc;
    showToast(err.message || "Não foi possível enviar a foto.");
  } finally {
    preview.style.opacity = "1";
    event.target.value = "";
  }
}

function syncMyAvatarEverywhere(avatarUrl) {
  if (!avatarUrl) return;
  const mainAvatar = document.getElementById("profile-main-avatar-img");
  const headerAvatar = document.getElementById("header-my-avatar-img");
  if (mainAvatar) mainAvatar.src = avatarUrl;
  if (headerAvatar) headerAvatar.src = avatarUrl;
}

function closeProfileSettingsModal() {
  document.getElementById("modal-profile-settings").style.display = "none";
}

async function saveProfileChanges() {
  const newName = document.getElementById("edit-profile-name").value.trim();
  const newHandle = document.getElementById("edit-profile-handle").value.trim().replace(/^@/, "");
  const newBio = document.getElementById("edit-profile-bio").value.trim();
  const priceRaw = document.getElementById("edit-profile-private-price").value.trim();
  const newPrice = priceRaw ? Math.max(1, Math.round(Number(priceRaw))) : null;

  if (!newName || !newHandle) {
    showToast("Nome e Username não podem ser vazios!");
    return;
  }
  if (!requireAuth()) return;

  try {
    const user = await Auth.getUser();
    const profile = await DB.updateProfile(user.id, { display_name: newName, username: newHandle, bio: newBio, private_content_price: newPrice });

    // Refletir exatamente o que foi salvo no servidor (não o que foi digitado) —
    // o nome usado no chat ao vivo (STATE.profileName) também é atualizado aqui.
    STATE.profileName = profile.display_name || profile.username;
    STATE.myPrivateContentPrice = profile.private_content_price;
    const nameEl = document.querySelector(".profile-bio-info h3");
    const handleEl = document.querySelector(".profile-handle");
    const bioEl = document.querySelector(".profile-bio-text");
    if (nameEl) nameEl.innerHTML = `${escapeHtml(STATE.profileName)} <span class="premium-verified">✓</span>`;
    if (handleEl) handleEl.textContent = `@${profile.username}`;
    if (bioEl) bioEl.textContent = profile.bio;

    showToast("Alterações salvas com sucesso!");
    closeProfileSettingsModal();
  } catch (err) {
    if (err.code === "23505" || /duplicate key|already exists/i.test(err.message || "")) {
      showToast("Esse nome de usuário já está em uso. Escolha outro.");
    } else {
      showToast(err.message || "Não foi possível salvar as alterações.");
    }
  }
}

async function deleteAccount() {
  const confirmDelete = confirm(
    "Tem certeza que deseja excluir sua conta? Essa ação é PERMANENTE: seu saldo, posts, seguidores, mensagens e todo o histórico serão apagados para sempre e não podem ser recuperados."
  );
  if (!confirmDelete) return;

  try {
    await DB.deleteAccountForever();
  } catch (err) {
    showToast(err.message || "Não foi possível excluir a conta.");
    return;
  }

  // A conta já foi apagada no servidor — isso só limpa a sessão local.
  try {
    await Auth.signOut();
  } catch (err) {
    console.error(err);
  }

  closeProfileSettingsModal();
  STATE.isLoggedIn = false;
  navigateTo("auth");
  showToast("Conta excluída permanentemente.");
}

// ==========================================================================
// 24. BUSCA DE STREAMERS (PESQUISA DE PERFIS)
// ==========================================================================

function openSearchOverlay() {
  document.getElementById("modal-search-overlay").style.display = "flex";
  document.getElementById("search-profile-input").value = "";
  performProfileSearch(); // Mostrar todos inicialmente
  document.getElementById("search-profile-input").focus();
}

function closeSearchOverlay() {
  document.getElementById("modal-search-overlay").style.display = "none";
}

function renderProfileSearchResults(container, profiles) {
  container.innerHTML = "";
  profiles.forEach(p => {
    const name = p.display_name || p.username;
    const item = document.createElement("div");
    item.className = "inbox-item";
    item.style.padding = "10px 0";
    item.style.borderBottom = "1px solid var(--glass-border)";

    item.onclick = () => {
      closeSearchOverlay();
      openPrivateChat(p.id, name, p.avatar_url);
    };

    const safeName = escapeHtml(name);
    const privateBtnHtml = p.private_content_price
      ? `<button class="btn-lightbox-like" style="font-size: 0.65rem; background: var(--bg-input); padding: 4px 8px; border-radius: 8px; border: 1px solid var(--glass-border); color: #fff; margin-left: 6px;" onclick="event.stopPropagation(); closeSearchOverlay(); openPrivateContentModal('${p.id}');">🔒</button>`
      : "";
    item.innerHTML = `
      <div class="inbox-avatar" style="width: 44px; height: 44px;">
        <img src="${p.avatar_url}" alt="${safeName}" style="border-radius: 50%;">
      </div>
      <div class="inbox-details" style="margin-left: 12px;">
        <span class="inbox-name" style="font-size: 0.8rem; font-weight: 700; color: #fff;">${safeName}</span>
        <span class="inbox-message" style="font-size: 0.65rem; color: var(--light-gray);">@${escapeHtml(p.username)}</span>
      </div>
      <div class="inbox-right" style="display: flex; align-items: center; justify-content: center;">
        <button class="btn-lightbox-like active" style="font-size: 0.65rem; background: var(--bg-input); padding: 4px 8px; border-radius: 8px; border: 1px solid var(--glass-border); color: #fff;">
          Mensagem
        </button>
        ${privateBtnHtml}
      </div>
    `;
    container.appendChild(item);
  });
}

let searchDebounceTimer = null;
function performProfileSearch() {
  const query = document.getElementById("search-profile-input").value.trim();
  const container = document.getElementById("search-results-container");
  if (!container) return;

  clearTimeout(searchDebounceTimer);

  if (!query) {
    // Sem nada digitado ainda: sugere gente real registrada na plataforma,
    // em vez de só um texto pedindo pra digitar algo.
    container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--light-gray);font-size:0.72rem;">Carregando sugestões...</div>`;
    DB.getRandomProfiles(8)
      .then(profiles => {
        // A busca pode ter mudado enquanto a promise resolvia.
        if (document.getElementById("search-profile-input").value.trim()) return;
        const suggestions = profiles.filter(p => !STATE.blockedUsers.includes(p.id));
        if (suggestions.length === 0) {
          container.innerHTML = `
            <div class="discover-empty-state" style="display: flex;">
              <div class="discover-empty-icon">🔍</div>
              <h3>Buscar perfis reais</h3>
              <p>Digite um nome ou @usuário para buscar pessoas reais no VibeLive.</p>
            </div>
          `;
          return;
        }
        renderProfileSearchResults(container, suggestions);
        const label = document.createElement("p");
        label.textContent = "Sugestões pra você";
        label.style.cssText = "font-size:0.65rem;color:var(--light-gray);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px;";
        container.insertBefore(label, container.firstChild);
      })
      .catch(() => {
        container.innerHTML = `
          <div class="discover-empty-state" style="display: flex;">
            <div class="discover-empty-icon">🔍</div>
            <h3>Buscar perfis reais</h3>
            <p>Digite um nome ou @usuário para buscar pessoas reais no VibeLive.</p>
          </div>
        `;
      });
    return;
  }

  // Busca real na tabela profiles (com um pequeno atraso pra não bater no
  // banco a cada tecla digitada).
  searchDebounceTimer = setTimeout(async () => {
    let matches;
    try {
      matches = (await DB.searchProfiles(query)).filter(p => !STATE.blockedUsers.includes(p.id));
    } catch (err) {
      container.innerHTML = `
        <div class="discover-empty-state" style="display: flex;">
          <div class="discover-empty-icon">⚠️</div>
          <h3>Não foi possível buscar agora</h3>
          <p>Tente de novo em instantes.</p>
        </div>
      `;
      return;
    }

    if (matches.length === 0) {
      container.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "discover-empty-state";
      empty.style.display = "flex";
      empty.innerHTML = `<div class="discover-empty-icon">🔍</div><h3>Nenhum perfil encontrado</h3>`;
      const p = document.createElement("p");
      p.textContent = `Não encontramos ninguém para "${query}".`;
      empty.appendChild(p);
      container.appendChild(empty);
      return;
    }

    renderProfileSearchResults(container, matches);
  }, 300);
}

// ==========================================================================
// 25. FLUXO DE LOGIN, CADASTRO E LOGOUT (AUTENTICAÇÃO RESTAURADA)
// ==========================================================================

function toggleAuthTab(mode) {
  STATE.authMode = mode;
  const tabLogin = document.getElementById("btn-tab-login");
  const tabRegister = document.getElementById("btn-tab-register");
  const submitBtn = document.getElementById("btn-auth-submit");
  const forgotBtn = document.getElementById("btn-forgot-password");
  const confirmGroup = document.getElementById("auth-confirm-password-group");

  if (mode === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    submitBtn.textContent = "Entrar";
    document.getElementById("auth-username").placeholder = "E-mail";
    if (forgotBtn) forgotBtn.style.display = "block";
    if (confirmGroup) confirmGroup.style.display = "none";
  } else {
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
    submitBtn.textContent = "Criar Conta";
    document.getElementById("auth-username").placeholder = "E-mail";
    if (forgotBtn) forgotBtn.style.display = "none";
    if (confirmGroup) confirmGroup.style.display = "block";
  }
}

// Volta do card "confirme seu e-mail" pro formulário normal de login/cadastro.
function backToAuthForm() {
  document.getElementById("auth-card-confirm-email").style.display = "none";
  document.getElementById("auth-card-form").style.display = "block";
  document.getElementById("auth-social-divider").style.display = "flex";
  document.getElementById("auth-social-row").style.display = "flex";
  toggleAuthTab("login");
}

function openForgotPasswordModal() {
  document.getElementById("forgot-password-email").value = document.getElementById("auth-username").value.trim();
  document.getElementById("modal-forgot-password").style.display = "flex";
}

function closeForgotPasswordModal() {
  document.getElementById("modal-forgot-password").style.display = "none";
}

async function submitForgotPassword() {
  const email = document.getElementById("forgot-password-email").value.trim();
  if (!email) {
    showToast("Digite seu e-mail.");
    return;
  }
  try {
    await Auth.resetPasswordForEmail(email);
    showToast("Link enviado! Verifique seu e-mail (inclusive spam).");
    closeForgotPasswordModal();
  } catch (err) {
    showToast(translateAuthError(err));
  }
}

// Chamado quando a pessoa volta pro app pelo link de recuperação do e-mail
// (Supabase dispara o evento PASSWORD_RECOVERY automaticamente ao detectar o
// token na URL) — sem fechar/cancelar: precisa definir a nova senha pra continuar.
function showNewPasswordModal() {
  document.getElementById("modal-new-password").style.display = "flex";
}

async function submitNewPassword() {
  const newPassword = document.getElementById("new-password-input").value;
  if (!newPassword || newPassword.length < 6) {
    showToast("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }
  try {
    await Auth.updatePassword(newPassword);
    document.getElementById("modal-new-password").style.display = "none";
    document.getElementById("new-password-input").value = "";
    showToast("Senha atualizada! Você já está conectado.");

    STATE.isLoggedIn = true;
    const user = await Auth.getUser();
    const profile = await DB.getProfile(user.id);
    await applyProfileToUI(profile);
    navigateTo("discover");
  } catch (err) {
    showToast(translateAuthError(err));
  }
}

// Aplica um profile carregado do banco ao STATE e à UI (usado no login e na checagem de sessão).
async function applyProfileToUI(profile) {
  const previousLevel = STATE.level;

  try {
    STATE.followedStreamers = await DB.getFollows();
  } catch (err) {
    console.error("Falha ao carregar quem você segue:", err);
  }

  try {
    STATE.blockedUsers = await DB.getBlockedUsers();
  } catch (err) {
    console.error("Falha ao carregar lista de bloqueios:", err);
  }

  STATE.myCoins = profile.coins;
  STATE.xp = profile.xp;
  STATE.level = profile.level;
  STATE.isVIP = profile.is_vip;
  STATE.profileName = profile.display_name || profile.username;
  STATE.myUsername = profile.username;
  STATE.myAvatarUrl = profile.avatar_url;
  STATE.myPrivateContentPrice = profile.private_content_price;
  STATE.isAdmin = !!profile.is_admin;

  const nameEl = document.querySelector(".profile-bio-info h3");
  const handleEl = document.querySelector(".profile-handle");
  if (nameEl) nameEl.innerHTML = `${escapeHtml(STATE.profileName)} <span class="premium-verified">✓</span>`;
  if (handleEl) handleEl.textContent = `@${profile.username}`;
  syncMyAvatarEverywhere(profile.avatar_url);

  const adminBtn = document.getElementById("btn-admin-reports");
  if (adminBtn) adminBtn.style.display = STATE.isAdmin ? "flex" : "none";

  renderCoins();
  updateXPProgressUI();
  refreshProfileStats(profile.id, profile.username);

  // Inscreve no canal global de DMs recebidas (uma vez por sessão, não a cada
  // chamada — applyProfileToUI roda depois de toda ação de carteira) e carrega
  // as conversas reais.
  if (!STATE.dmInboxChannel) {
    STATE.dmInboxChannel = DB.subscribeToDirectMessages(profile.id, (row) => {
      if (STATE.activeScreen === "private-chat" && STATE.activeChatPartner === row.sender_id) {
        appendPrivateChatBubble(row, profile.id);
        DB.markConversationRead(row.sender_id).catch(() => {});
      }
      renderInboxList();
    });
    renderInboxList();
  }

  // Idem para notificações reais (novo seguidor, alguém que você segue foi ao vivo).
  if (!STATE.notificationsChannel) {
    STATE.notificationsChannel = DB.subscribeToNotifications(profile.id, () => {
      refreshNotificationBadge();
    });
    refreshNotificationBadge();
  }

  // O servidor decide o XP/nível (nunca o cliente) — anuncia o level-up comparando
  // com o nível anterior, já que a RPC só devolve o estado final.
  if (previousLevel && profile.level > previousLevel) {
    showToast(`Parabéns! Você subiu para o Nível ${profile.level}! 🎉`);
  }
}

async function handleAuthSubmit() {
  const email = document.getElementById("auth-username").value.trim();
  const password = document.getElementById("auth-password").value.trim();

  if (!email || !password) {
    showToast("Por favor, preencha as credenciais!");
    return;
  }

  if (STATE.authMode === "register") {
    const confirmPassword = document.getElementById("auth-confirm-password").value.trim();
    if (password !== confirmPassword) {
      showToast("As senhas não coincidem.");
      return;
    }
  }

  const btn = document.getElementById("btn-auth-submit");
  if (btn) btn.disabled = true;
  showToast("Autenticando...");

  try {
    const data = STATE.authMode === "login"
      ? await Auth.signIn(email, password)
      : await Auth.signUp(email, password);

    document.getElementById("auth-username").value = "";
    document.getElementById("auth-password").value = "";
    document.getElementById("auth-confirm-password").value = "";

    if (!data.session) {
      // Cadastro exige confirmação por e-mail — sem sessão ainda até clicar no link.
      document.getElementById("confirm-email-address").textContent = email;
      document.getElementById("auth-card-form").style.display = "none";
      document.getElementById("auth-card-confirm-email").style.display = "block";
      document.getElementById("auth-social-divider").style.display = "none";
      document.getElementById("auth-social-row").style.display = "none";
      return;
    }

    STATE.isLoggedIn = true;
    const profile = await DB.getProfile(data.user.id);
    await applyProfileToUI(profile);

    showToast(STATE.authMode === "login" ? "Login realizado com sucesso!" : "Conta criada com sucesso!");

    if (!profile.onboarding_completed) {
      openOnboardingWizard();
    } else {
      navigateTo("discover");
    }
  } catch (err) {
    showToast(translateAuthError(err));
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Redireciona pro consentimento real do Google via Supabase Auth (OAuth).
// O Supabase detecta sozinho o token na URL quando o Google manda de volta
// pro app (igual já acontece com o link de recuperação de senha) e dispara
// SIGNED_IN — o próprio fluxo de checagem de sessão do DOMContentLoaded pega isso.
async function loginWithGoogle() {
  try {
    await Auth.signInWithOAuth("google");
  } catch (err) {
    showToast(err.message || "Não foi possível conectar com o Google.");
  }
}

async function handleLogout() {
  showToast("Saindo...");
  try {
    await Auth.signOut();
  } catch (err) {
    console.error(err);
  }
  STATE.isLoggedIn = false;
  if (STATE.dmInboxChannel) {
    sb.removeChannel(STATE.dmInboxChannel);
    STATE.dmInboxChannel = null;
  }
  if (STATE.notificationsChannel) {
    sb.removeChannel(STATE.notificationsChannel);
    STATE.notificationsChannel = null;
  }
  STATE.dmsList = [];
  STATE.notifications = [];
  STATE.unreadNotificationCount = 0;
  renderInboxList();
  updateNotificationBadgeUI();
  navigateTo("auth");
  showToast("Sessão encerrada!");
}

// ==========================================================================
// 25.1 ASSISTENTE DE PERFIL (ONBOARDING PÓS-CADASTRO)
// ==========================================================================
function openOnboardingWizard() {
  STATE.onboardingStep = 1;
  STATE.onboardingAvatarFile = null;
  document.getElementById("onboarding-name-input").value = "";
  document.getElementById("onboarding-username-input").value = "";
  document.getElementById("onboarding-bio-input").value = "";
  document.getElementById("onboarding-username-error").textContent = "";
  document.getElementById("onboarding-avatar-preview").src = STATE.myAvatarUrl || "";
  showOnboardingStep(1);
  document.getElementById("modal-onboarding").style.display = "flex";
}

function showOnboardingStep(step) {
  for (let i = 1; i <= 4; i++) {
    const pane = document.getElementById(`onboarding-step-${i}`);
    const dot = document.getElementById(`onboarding-dot-${i}`);
    if (pane) pane.style.display = i === step ? "flex" : "none";
    if (dot) dot.classList.toggle("active", i <= step);
  }
}

function handleOnboardingAvatarSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Escolha um arquivo de imagem.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Imagem muito grande (máximo 5MB).");
    return;
  }
  STATE.onboardingAvatarFile = file;
  document.getElementById("onboarding-avatar-preview").src = URL.createObjectURL(file);
}

async function onboardingNext() {
  const step = STATE.onboardingStep;

  if (step === 3) {
    const errorEl = document.getElementById("onboarding-username-error");
    const raw = document.getElementById("onboarding-username-input").value.trim().toLowerCase();
    if (raw) {
      if (!/^[a-z0-9_.]{3,24}$/.test(raw)) {
        errorEl.textContent = "Use só letras minúsculas, números, ponto ou underline (3 a 24 caracteres).";
        return;
      }
      try {
        const available = await DB.isUsernameAvailable(raw);
        if (!available) {
          errorEl.textContent = "Esse @ já está em uso.";
          return;
        }
      } catch (err) {
        errorEl.textContent = "Não foi possível checar agora. Tente de novo.";
        return;
      }
    }
    errorEl.textContent = "";
  }

  STATE.onboardingStep = step + 1;
  showOnboardingStep(STATE.onboardingStep);
}

async function finishOnboarding() {
  try {
    const user = await Auth.getUser();
    const updates = { onboarding_completed: true };

    const name = document.getElementById("onboarding-name-input").value.trim();
    const username = document.getElementById("onboarding-username-input").value.trim().toLowerCase();
    const bio = document.getElementById("onboarding-bio-input").value.trim();
    if (name) updates.display_name = name;
    if (username) updates.username = username;
    if (bio) updates.bio = bio;

    if (STATE.onboardingAvatarFile) {
      updates.avatar_url = await DB.uploadAvatar(user.id, STATE.onboardingAvatarFile);
    }

    const profile = await DB.updateProfile(user.id, updates);
    await applyProfileToUI(profile);

    document.getElementById("modal-onboarding").style.display = "none";
    showToast("Perfil pronto!");
    navigateTo("discover");
  } catch (err) {
    showToast(err.message || "Não foi possível salvar o perfil. Tente novamente.");
  }
}

async function sendQuickRose(event) {
  if (!requireAuth()) return;
  // Captura as coordenadas AGORA — o objeto do evento nativo fica inválido
  // depois que o navegador termina de despachar o evento, o que já vai ter
  // acontecido quando o await abaixo (rede) resolver.
  const clickX = event.clientX;
  const clickY = event.clientY;
  const broadcasterHandle = STATE.currentLiveBroadcaster ? STATE.currentLiveBroadcaster.username : null;
  let profile;
  try {
    profile = await DB.sendQuickRose(broadcasterHandle);
  } catch (err) {
    showToast(err.message || "Saldo de moedas insuficiente. Recarregue no Perfil!");
    return;
  }
  await applyProfileToUI(profile);

  // Acionar aviso visual do presente na tela
  triggerGiftAnnouncement("🌹", "Você enviou uma Rosa");

  // Mensagem da rosa no chat chega via Realtime (visível pra todo mundo na sala).
  if (STATE.currentLiveBroadcaster) {
    // Emitir corações flutuantes baseados nas coordenadas do clique
    triggerFloatingHeart(clickX, clickY);
  }
}

// ==========================================================================
// 27. SELEÇÃO DE ATMOSFERA (LIVES)
// ==========================================================================

function openAtmosferaSelector() {
  const filters = ["none", "vintage", "neon", "bw"];
  const currentFilter = STATE.currentVideoFilter || "none";
  const nextFilter = filters[(filters.indexOf(currentFilter) + 1) % filters.length];
  STATE.currentVideoFilter = nextFilter;

  DOM.goLiveVideo.className = "";
  if (nextFilter !== "none") {
    DOM.goLiveVideo.classList.add(`video-${nextFilter}`);
  }
  showToast(`Atmosfera (Filtro): ${nextFilter.toUpperCase()}`);
}

function openRouletteModal() {
  const modal = document.getElementById("modal-live-wheel");
  if (modal) modal.style.display = "flex";
}

function closeRouletteModal() {
  const modal = document.getElementById("modal-live-wheel");
  if (modal) modal.style.display = "none";
}

async function spinRoulette() {
  if (!requireAuth()) return;

  const btn = document.getElementById("btn-spin-roulette");
  if (btn) btn.disabled = true;

  let result;
  try {
    result = await DB.spinRoulette(); // { profile, prize } — servidor decide o prêmio, nunca o cliente
  } catch (err) {
    showToast(err.message || "Moedas insuficientes! Recarregue na carteira. 🪙");
    if (btn) btn.disabled = false;
    return;
  }
  await applyProfileToUI(result.profile);
  const prize = result.prize;

  const wheel = document.getElementById("roulette-wheel-inner");
  if (!wheel) { if (btn) btn.disabled = false; return; }

  // Resetar rotação anterior antes de girar de verdade
  wheel.style.transition = "none";
  wheel.style.transform = "rotate(0deg)";

  // A rotação é só decoração visual — o prêmio já veio decidido do servidor acima.
  setTimeout(() => {
    wheel.style.transition = "transform 4s cubic-bezier(0.17, 0.67, 0.1, 1)";
    const spins = 5;
    const degrees = spins * 360 + Math.floor(Math.random() * 360);
    wheel.style.transform = `rotate(${degrees}deg)`;

    setTimeout(() => {
      if (btn) btn.disabled = false;
      showToast(`Você ganhou: ${prize}! 🎉`);

      // Inserir anúncio no chat da live
      const chatContainer = document.getElementById("live-chat-messages");
      if (chatContainer) {
        const msg = document.createElement("div");
        msg.className = "chat-item-tk system";
        msg.innerHTML = `
          <span class="user-name-tk system-name">🎡 Roleta da Fortuna</span>
          <span class="chat-text-tk" style="color: var(--secondary); font-weight: 700;">Você girou a roleta e ganhou: ${prize}!</span>
        `;
        chatContainer.appendChild(msg);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 4000);
  }, 50);
}

function triggerMyLiveSfx(emoji, toastMsg) {
  showToast(`Efeito: ${toastMsg}`);
  
  const emitter = document.getElementById("my-hearts-emitter");
  if (!emitter) return;

  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      const floatEl = document.createElement("span");
      floatEl.textContent = emoji;
      floatEl.style.position = "absolute";
      floatEl.style.left = `${50 + (Math.random() * 40 - 20)}%`;
      floatEl.style.bottom = "20px";
      floatEl.style.fontSize = `${1.2 + Math.random() * 0.8}rem`;
      floatEl.style.pointerEvents = "none";
      floatEl.style.zIndex = "100";
      floatEl.style.animation = "float-heart-bubble 2.5s ease-out forwards";
      
      emitter.appendChild(floatEl);
      setTimeout(() => floatEl.remove(), 2500);
    }, i * 200);
  }
}

function updateXPProgressUI() {
  const levelBadge = document.getElementById("profile-level-badge");
  const fill = document.getElementById("xp-progress-fill");
  const text = document.getElementById("xp-progress-text");
  const nextLabel = document.getElementById("xp-progress-next-label");

  const xpNeeded = STATE.level * 500;
  const pct = Math.min(100, (STATE.xp / xpNeeded) * 100);

  if (levelBadge) levelBadge.textContent = `Nível ${STATE.level}`;
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${STATE.xp} / ${xpNeeded} XP`;
  if (nextLabel) nextLabel.textContent = `Próximo nível: +${xpNeeded - STATE.xp} XP`;
}

async function claimDailyCheckIn() {
  if (!requireAuth()) return;

  let result;
  try {
    result = await DB.claimDailyCheckin(); // { profile, day, reward } — servidor decide tudo
  } catch (err) {
    showToast(err.message || "Você já completou todo o calendário semanal! 🗓️");
    return;
  }

  await applyProfileToUI(result.profile);
  const nextDay = result.day;
  const coinsReward = result.reward;

  if (nextDay === 7) {
    showToast("Parabéns! Check-in concluído! Ganhou 50 moedas e Passe VIP Ouro! 👑");

    // Atualizar botões de VIP se houver
    const vipBtn = document.getElementById("btn-buy-vip");
    if (vipBtn) {
      vipBtn.disabled = true;
      vipBtn.textContent = "Ativo ✓";
      vipBtn.style.background = "rgba(52, 211, 153, 0.15)";
      vipBtn.style.color = "var(--success)";
      vipBtn.style.borderColor = "var(--success)";
    }
  } else {
    showToast(`Check-in de hoje feito! Ganhou 🪙 ${coinsReward} moedas e +100 XP!`);
  }

  const box = document.getElementById(`chk-day-${nextDay}`);
  if (box) {
    box.style.background = "rgba(52, 211, 153, 0.12)";
    box.style.border = "1.5px solid var(--success)";
    box.style.color = "#fff";
    box.style.position = "relative";
    
    if (!box.querySelector(".chk-check")) {
      const chk = document.createElement("div");
      chk.className = "chk-check";
      chk.style.position = "absolute";
      chk.style.top = "-3px";
      chk.style.right = "-3px";
      chk.style.background = "var(--success)";
      chk.style.width = "10px";
      chk.style.height = "10px";
      chk.style.borderRadius = "50%";
      chk.style.fontSize = "0.45rem";
      chk.style.display = "flex";
      chk.style.alignItems = "center";
      chk.style.justifyContent = "center";
      chk.style.color = "#000";
      chk.style.fontWeight = "900";
      chk.textContent = "✓";
      box.appendChild(chk);
    }
  }

  const btn = document.getElementById("btn-claim-daily");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Resgatado";
    btn.style.opacity = "0.6";
  }
}

async function purchaseVIPBadge() {
  if (!requireAuth()) return;

  if (STATE.isVIP) {
    showToast("Você já possui o Passe VIP Ouro ativo! 👑");
    return;
  }

  let profile;
  try {
    profile = await DB.purchaseVip();
  } catch (err) {
    showToast(err.message || "Moedas insuficientes! VIP Ouro custa 100 moedas. 🪙");
    return;
  }
  await applyProfileToUI(profile);
  showToast("Você adquiriu o Passe VIP Ouro! 👑 Selo ativo nos chats!");

  const btn = document.getElementById("btn-buy-vip");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Ativo ✓";
    btn.style.background = "rgba(52, 211, 153, 0.15)";
    btn.style.color = "var(--success)";
    btn.style.borderColor = "var(--success)";
  }
}

