/* ==========================================================================
   VibeLive - Main Application Logic (Vanilla JS)
   ========================================================================== */

// 1. DADOS INICIAIS


const STATE = {
  isLoggedIn: true,
  authMode: "login",
  myCoins: 99,
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
  
  // Transmissão Própria (Webcam)
  localStream: null,
  myLiveViewerCount: 0,
  currentVideoFilter: "none",
  // Sem stories fictícias de outras pessoas — só o placeholder do seu próprio status.
  stories: [
    { username: "Seu status", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", media: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500", caption: "Preparando a live de hoje! 🎬🍿", viewed: false, isSelf: true }
  ],
  activeStoryIndex: 0,
  storyInterval: null,
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
  chatPartnerStatus: document.getElementById("chat-partner-status"),
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
  renderStories();
  initRealLiveSessionsFeed();

  // Temporizador para esconder a Splash Screen, então checa se já existe sessão real.
  setTimeout(async () => {
    try {
      const session = await Auth.getSession();
      if (session) {
        STATE.isLoggedIn = true;
        const profile = await DB.getProfile(session.user.id);
        await applyProfileToUI(profile);
      }
    } catch (err) {
      console.error("Falha ao checar sessão:", err);
    }
    // Navegação sem login continua permitida (dados mockados); ações que gravam
    // dado real checam STATE.isLoggedIn e pedem login na hora, via requireAuth().
    navigateTo("discover");
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
        <p>Quando alguém te seguir ou uma pessoa que você segue for ao vivo, aparece aqui.</p>
      </div>
    `;
    return;
  }

  STATE.notifications.forEach((n, index) => {
    const actorName = n.actor ? (n.actor.display_name || n.actor.username) : "Alguém";
    const avatar = n.actor ? n.actor.avatar_url : "";
    const text = n.type === "new_follower"
      ? `${actorName} começou a seguir você`
      : `${actorName} está ao vivo agora!`;
    const icon = n.type === "new_follower" ? "👤" : "🔴";

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
  if (n.type === "went_live") {
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

function renderRealLiveSessions(allSessions) {
  // Não mostra quem eu bloqueei (nem quem me bloqueou não teria motivo de aparecer,
  // mas isso já é decidido do lado de quem bloqueou, não meu).
  const sessions = allSessions.filter(s => !STATE.blockedUsers.includes(s.user_id));
  STATE.realLiveSessions = sessions;
  const grid = document.getElementById("real-live-grid");
  const emptyState = document.getElementById("discover-empty-state");
  if (!grid) return;

  grid.innerHTML = "";
  if (sessions.length === 0) {
    grid.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }
  grid.style.display = "grid";
  if (emptyState) emptyState.style.display = "none";
  sessions.forEach(s => grid.appendChild(createRealLiveCardElement(s)));
}

function createRealLiveCardElement(session) {
  const profile = session.profiles || {};
  const name = profile.display_name || profile.username || "Ao vivo";
  const avatar = profile.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150";

  const card = document.createElement("div");
  card.className = "live-card";
  card.onclick = () => enterRealLiveRoom(session.user_id);

  card.innerHTML = `
    <img class="live-thumbnail" src="${avatar}" alt="${name}">
    <div class="card-overlay-gradient"></div>
    <div class="card-viewers">
      <span style="color: var(--primary); font-weight: 800;">🔴 AO VIVO</span>
    </div>
    <div class="card-details">
      <span class="card-name">${name}</span>
    </div>
    <button class="card-btn-call" onclick="event.stopPropagation(); enterRealLiveRoom('${session.user_id}');">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
    </button>
  `;
  return card;
}


// 9. TELA DE LIVE PLAYER (ASSISTINDO STREAM REAL)
// Entra numa transmissão de verdade (pessoa real, vídeo real via LiveKit) —
// hostUserId é o id da conta de quem está transmitindo.
async function enterRealLiveRoom(hostUserId) {
  let profile;
  try {
    profile = await DB.getProfile(hostUserId);
  } catch (err) {
    showToast("Não foi possível entrar nessa live.");
    return;
  }
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
    DOM.streamerStats.textContent = "ao vivo agora";
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
    onViewerCountChange: (count) => {
      STATE.liveViewerCount = count;
      DOM.liveViewerCount.textContent = count;
    }
  });
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
  msgEl.innerHTML = `<span class="msg-content">${text}</span>`;
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

  if (isGift) {
    msgEl.innerHTML = `
      ${vipPrefix}<span class="msg-author">${author}</span>
      <span class="msg-content">enviou ${content} ${emoji}</span>
    `;
  } else {
    msgEl.innerHTML = `
      ${vipPrefix}<span class="msg-author">${author}:</span>
      <span class="msg-content">${content}</span>
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

    item.innerHTML = `
      <div class="inbox-avatar">
        <img src="${chat.avatar}" alt="${chat.name}">
      </div>
      <div class="inbox-details">
        <span class="inbox-name">${chat.name}</span>
        <span class="inbox-message">${chat.lastMessage}</span>
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
    history.forEach(msg => appendPrivateChatBubble(msg, user.id));
    await DB.markConversationRead(partnerId);
  } catch (err) {
    console.error("Falha ao carregar conversa:", err);
  }
  renderInboxList();
}

function appendPrivateChatBubble(msg, myUserId) {
  const bubble = document.createElement("div");
  const isMine = msg.sender_id === myUserId;
  bubble.className = isMine ? "chat-bubble sent" : "chat-bubble received";

  let vipSuffix = "";
  if (isMine && STATE.isVIP) {
    vipSuffix = `<span style="font-size: 0.58rem; display: block; color: var(--secondary); font-weight: bold; margin-bottom: 2px;">👑 VIP Ouro</span>`;
  }

  bubble.innerHTML = `
    ${vipSuffix}
    <span>${msg.text}</span>
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
    const reporterName = r.reporter ? (r.reporter.display_name || r.reporter.username) : "Usuário removido";
    const reportedName = r.reported ? (r.reported.display_name || r.reported.username) : "Usuário removido";

    const item = document.createElement("div");
    item.className = r.reviewed_at ? "inbox-item" : "inbox-item unread";
    item.style.flexDirection = "column";
    item.style.alignItems = "stretch";
    item.style.padding = "12px 0";

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <span class="inbox-name" style="display:block;">${reporterName} denunciou ${reportedName}</span>
          <span class="inbox-message" style="display:block; margin-top:4px; white-space:normal;">${r.reason}</span>
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
  // Cobranças PIX reais do Mercado Pago expiram em 24h.
  let duration = 24 * 60 * 60;
  const updateTimer = () => {
    const hrs = String(Math.floor(duration / 3600)).padStart(2, '0');
    const mins = String(Math.floor((duration % 3600) / 60)).padStart(2, '0');
    const secs = String(duration % 60).padStart(2, '0');
    DOM.pixTimer.textContent = `${hrs}:${mins}:${secs}`;
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
  const constraints = { video: { facingMode: "user" }, audio: false };
  const fallback = DOM.goLive.querySelector(".camera-fallback-msg");

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      STATE.localStream = stream;
      DOM.goLiveVideo.srcObject = stream;
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

function applyFilter(btn, filterClass) {
  // Mudar classe ativa do botão
  const btns = DOM.goLiveSetup.querySelectorAll(".filter-btn");
  btns.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  
  // Remover filtros anteriores da tag video
  DOM.goLiveVideo.className = "";
  STATE.currentVideoFilter = filterClass;
  
  if (filterClass !== "none") {
    DOM.goLiveVideo.classList.add(`video-${filterClass}`);
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

    await DB.startLiveSession(roomName);
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

  // Desconectar do LiveKit e encerrar a sessão real (some da lista "Ao Vivo Agora" de todo mundo)
  if (STATE.myLiveKitRoom) {
    STATE.myLiveKitRoom.disconnect();
    STATE.myLiveKitRoom = null;
  }
  try {
    await DB.endLiveSession();
  } catch (err) {
    console.error("Falha ao encerrar sessão de live:", err);
  }

  // Reiniciar telas do go live
  DOM.goLiveSetup.style.display = "flex";
  DOM.myLiveActiveOverlay.style.display = "none";
  DOM.goLiveVideo.className = "";

  const fallback = DOM.goLive.querySelector(".camera-fallback-msg");
  fallback.style.display = "flex";

  showToast("Transmissão encerrada com sucesso!");
}

function addMyLiveComment(author, content, isSystem = false, isGift = false) {
  const msgEl = document.createElement("div");
  if (isSystem) {
    msgEl.className = "chat-msg system";
    msgEl.innerHTML = `<span class="msg-content">${content}</span>`;
  } else if (isGift) {
    msgEl.className = "chat-msg gift-ann";
    msgEl.innerHTML = `<span class="msg-author">${author}</span> <span class="msg-content">${content}</span>`;
  } else {
    msgEl.className = "chat-msg";
    msgEl.innerHTML = `<span class="msg-author">${author}:</span> <span class="msg-content">${content}</span>`;
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
    panePosts.style.display = "block";
    paneStats.style.display = "none";
  } else {
    btnPosts.classList.remove("active");
    btnStats.classList.add("active");
    panePosts.style.display = "none";
    paneStats.style.display = "block";
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
  const select = document.getElementById("post-media-preset");

  select.innerHTML = "";

  if (type === "image") {
    btnPhoto.classList.add("active");
    btnVideo.classList.remove("active");
    
    // Inserir presets de fotos
    select.innerHTML = `
      <option value="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500">Pôr do Sol na Praia 🌅</option>
      <option value="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500">Balada / Show 💃</option>
      <option value="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500">Viagens ✈️</option>
      <option value="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500">Selfie Estilo 🤳</option>
    `;
  } else {
    btnPhoto.classList.remove("active");
    btnVideo.classList.add("active");

    // Inserir presets de videos
    select.innerHTML = `
      <option value="https://assets.mixkit.co/videos/preview/mixkit-girl-taking-selfies-with-her-smart-phone-41444-large.mp4">Selfie Gravando Live 🎥</option>
      <option value="https://assets.mixkit.co/videos/preview/mixkit-woman-filming-herself-with-a-smartphone-41436-large.mp4">Conversando sorrindo 🤳</option>
    `;
  }
  previewSelectedMedia();
}

function previewSelectedMedia() {
  const select = document.getElementById("post-media-preset");
  const imgPreview = document.getElementById("post-preview-img");
  const videoPreview = document.getElementById("post-preview-video");
  const val = select.value;

  if (STATE.currentPostType === "image") {
    imgPreview.style.display = "block";
    videoPreview.style.display = "none";
    videoPreview.pause();
    imgPreview.src = val;
  } else {
    imgPreview.style.display = "none";
    videoPreview.style.display = "block";
    videoPreview.src = val;
    videoPreview.play().catch(e => console.log(e));
  }
}

async function publishNewPost() {
  if (!requireAuth()) return;
  const select = document.getElementById("post-media-preset");
  const caption = document.getElementById("post-caption-input").value.trim();
  const val = select.value;

  if (!val) return;

  try {
    await DB.createPost(val, STATE.currentPostType, caption || "Sem legenda.");
    await renderProfilePosts();
    closeNewPostModal();
    showToast("Publicação realizada com sucesso!");
  } catch (err) {
    showToast(err.message || "Não foi possível publicar. Tente novamente.");
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
    item.innerHTML = `<strong>${authorName}</strong> ${c.text}`;
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
  if (STATE.stories[0] && STATE.stories[0].isSelf) {
    STATE.stories[0].avatar = avatarUrl;
    renderStories();
  }
}

function closeProfileSettingsModal() {
  document.getElementById("modal-profile-settings").style.display = "none";
}

async function saveProfileChanges() {
  const newName = document.getElementById("edit-profile-name").value.trim();
  const newHandle = document.getElementById("edit-profile-handle").value.trim().replace(/^@/, "");
  const newBio = document.getElementById("edit-profile-bio").value.trim();

  if (!newName || !newHandle) {
    showToast("Nome e Username não podem ser vazios!");
    return;
  }
  if (!requireAuth()) return;

  try {
    const user = await Auth.getUser();
    const profile = await DB.updateProfile(user.id, { display_name: newName, username: newHandle, bio: newBio });

    // Refletir exatamente o que foi salvo no servidor (não o que foi digitado) —
    // o nome usado no chat ao vivo (STATE.profileName) também é atualizado aqui.
    STATE.profileName = profile.display_name || profile.username;
    const nameEl = document.querySelector(".profile-bio-info h3");
    const handleEl = document.querySelector(".profile-handle");
    const bioEl = document.querySelector(".profile-bio-text");
    if (nameEl) nameEl.innerHTML = `${STATE.profileName} <span class="premium-verified">✓</span>`;
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

let searchDebounceTimer = null;
function performProfileSearch() {
  const query = document.getElementById("search-profile-input").value.trim();
  const container = document.getElementById("search-results-container");
  if (!container) return;

  clearTimeout(searchDebounceTimer);

  if (!query) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--light-gray); font-size: 0.8rem;">
        Digite um nome ou @usuário para buscar pessoas reais no VibeLive.
      </div>
    `;
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
        <div style="text-align: center; padding: 30px; color: var(--light-gray); font-size: 0.8rem;">
          Não foi possível buscar agora. Tente de novo.
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    if (matches.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--light-gray); font-size: 0.8rem;">
          Nenhum perfil encontrado para "${query}".
        </div>
      `;
      return;
    }

    matches.forEach(p => {
      const name = p.display_name || p.username;
      const item = document.createElement("div");
      item.className = "inbox-item";
      item.style.padding = "10px 0";
      item.style.borderBottom = "1px solid var(--glass-border)";

      item.onclick = () => {
        closeSearchOverlay();
        openPrivateChat(p.id, name, p.avatar_url);
      };

      item.innerHTML = `
        <div class="inbox-avatar" style="width: 44px; height: 44px;">
          <img src="${p.avatar_url}" alt="${name}" style="border-radius: 50%;">
        </div>
        <div class="inbox-details" style="margin-left: 12px;">
          <span class="inbox-name" style="font-size: 0.8rem; font-weight: 700; color: #fff;">${name}</span>
          <span class="inbox-message" style="font-size: 0.65rem; color: var(--light-gray);">@${p.username}</span>
        </div>
        <div class="inbox-right" style="display: flex; align-items: center; justify-content: center;">
          <button class="btn-lightbox-like active" style="font-size: 0.65rem; background: var(--bg-input); padding: 4px 8px; border-radius: 8px; border: 1px solid var(--glass-border); color: #fff;">
            Mensagem
          </button>
        </div>
      `;
      container.appendChild(item);
    });
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

  if (mode === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    submitBtn.textContent = "Entrar";
    document.getElementById("auth-username").placeholder = "E-mail";
    if (forgotBtn) forgotBtn.style.display = "block";
  } else {
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
    submitBtn.textContent = "Criar Conta";
    document.getElementById("auth-username").placeholder = "E-mail";
    if (forgotBtn) forgotBtn.style.display = "none";
  }
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
    showToast(err.message || "Não foi possível enviar o link de recuperação.");
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
    showToast(err.message || "Não foi possível atualizar a senha.");
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
  STATE.myAvatarUrl = profile.avatar_url;
  STATE.isAdmin = !!profile.is_admin;

  const nameEl = document.querySelector(".profile-bio-info h3");
  const handleEl = document.querySelector(".profile-handle");
  if (nameEl) nameEl.innerHTML = `${STATE.profileName} <span class="premium-verified">✓</span>`;
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

  const btn = document.getElementById("btn-auth-submit");
  if (btn) btn.disabled = true;
  showToast("Autenticando...");

  try {
    const data = STATE.authMode === "login"
      ? await Auth.signIn(email, password)
      : await Auth.signUp(email, password);

    if (!data.session) {
      showToast("Conta criada! Verifique seu e-mail para confirmar o login.");
      return;
    }

    STATE.isLoggedIn = true;
    const profile = await DB.getProfile(data.user.id);
    await applyProfileToUI(profile);

    showToast(STATE.authMode === "login" ? "Login realizado com sucesso!" : "Conta criada com sucesso!");

    document.getElementById("auth-username").value = "";
    document.getElementById("auth-password").value = "";

    navigateTo("discover");
  } catch (err) {
    showToast(err.message || "Erro ao autenticar. Tente novamente.");
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
  let filters = ["none", "vintage", "neon", "bw"];
  let currentFilter = STATE.currentFilter || "none";
  let nextIdx = (filters.indexOf(currentFilter) + 1) % filters.length;
  let nextFilter = filters[nextIdx];
  STATE.currentFilter = nextFilter;
  
  const video = document.getElementById("go-live-video");
  if (video) {
    video.className = "";
    if (nextFilter !== "none") {
      video.classList.add(`filter-${nextFilter}`);
    }
  }
  showToast(`Atmosfera (Filtro): ${nextFilter.toUpperCase()}`);
}

async function loginAsGuest() {
  showToast("Entrando como visitante...");
  try {
    const data = await Auth.signInAnonymously();
    STATE.isLoggedIn = true;
    const profile = await DB.getProfile(data.user.id);
    await applyProfileToUI(profile);
    showToast("Bem-vindo(a), Visitante!");
    navigateTo("discover");
  } catch (err) {
    showToast(err.message || "Não foi possível entrar como visitante.");
  }
}

function renderStories() {
  const container = document.getElementById("stories-container");
  if (!container) return;
  
  container.innerHTML = "";

  STATE.stories.forEach((s, index) => {
    const item = document.createElement("div");
    item.className = s.viewed ? "story-item viewed" : "story-item";
    if (s.isSelf) item.classList.add("self-story");
    
    item.onclick = () => openStoryViewer(index);
    item.innerHTML = `
      <div class="story-avatar-ring">
        <img src="${s.avatar}" alt="${s.username}">
        ${s.isSelf ? '<div class="add-story-plus">+</div>' : ''}
      </div>
      <span class="story-username-label">${s.username}</span>
    `;
    container.appendChild(item);
  });
}

function openStoryViewer(index) {
  const s = STATE.stories[index];
  if (!s) return;

  STATE.activeStoryIndex = index;
  s.viewed = true;
  renderStories();

  const modal = document.getElementById("modal-stories-viewer");
  if (!modal) return;

  const avatar = document.getElementById("story-viewer-avatar");
  const name = document.getElementById("story-viewer-name");
  const img = document.getElementById("story-viewer-img");
  const caption = document.getElementById("story-viewer-caption");

  if (avatar) avatar.src = s.avatar;
  if (name) name.textContent = s.username;
  if (img) img.src = s.media;
  if (caption) caption.textContent = s.caption;

  modal.classList.add("active");

  const progressFill = document.getElementById("story-progress-fill");
  if (progressFill) progressFill.style.width = "0%";
  
  if (STATE.storyTimeout) clearTimeout(STATE.storyTimeout);
  if (STATE.storyInterval) clearInterval(STATE.storyInterval);

  let progress = 0;
  STATE.storyInterval = setInterval(() => {
    progress += 2;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(STATE.storyInterval);
      if (index < STATE.stories.length - 1) {
        openStoryViewer(index + 1);
      } else {
        closeStoryViewer();
      }
    }
  }, 100);
}

function closeStoryViewer() {
  const modal = document.getElementById("modal-stories-viewer");
  if (modal) modal.classList.remove("active");
  if (STATE.storyTimeout) clearTimeout(STATE.storyTimeout);
  if (STATE.storyInterval) clearInterval(STATE.storyInterval);
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

