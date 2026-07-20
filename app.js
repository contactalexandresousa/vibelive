/* ==========================================================================
   VibeLive - Main Application Logic (Vanilla JS)
   ========================================================================== */

// 1. DADOS DE SIMULAÇÃO (MOCK DATA)

// Lista de Streamers e Canais de Vídeo
const MOCK_BROADCASTERS = [
  {
    id: 1,
    name: "MORANGUINHO 🍓",
    username: "moranguinho",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    diamonds: "469 mil",
    diamondsCount: 469000,
    viewers: 76,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lighting-12347-large.mp4",
    section: "popular",
    note: "Live ON! 🔥",
    bio: "Conversa e entretenimento. Seja bem-vindo! 💋"
  },
  {
    id: 2,
    name: "Luana Becker 👑",
    username: "luana.becker",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
    diamonds: "3,6 mi",
    diamondsCount: 3600000,
    viewers: 88,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-neon-makeup-in-dark-40011-large.mp4",
    section: "popular",
    note: "Tabela de valores nos stories 💸",
    bio: "VIP Bronze, Silver e Gold. Vem conversar!"
  },
  {
    id: 3,
    name: "Aline Santos ✨",
    username: "aline.santos",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    diamonds: "625 mil",
    diamondsCount: 625000,
    viewers: 112,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-looking-at-her-phone-in-the-dark-40019-large.mp4",
    section: "novata",
    note: "Alguém para call?",
    bio: "Apenas conversando e ouvindo música."
  },
  {
    id: 4,
    name: "Gabi Silva 🥱",
    username: "gabi.silva",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    diamonds: "539 mil",
    diamondsCount: 539000,
    viewers: 95,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-filming-herself-with-a-smartphone-41436-large.mp4",
    section: "novata",
    note: "Entediada em casa...",
    bio: "Conversando sobre tudo! Me manda um oi."
  },
  {
    id: 5,
    name: "Ponto por Ponto 🧶",
    username: "ponto.ponto",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    diamonds: "115 mil",
    diamondsCount: 115000,
    viewers: 115,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-selfies-with-her-smart-phone-41444-large.mp4",
    section: "proxima",
    distance: "1,2 km",
    note: "Crochê ao vivo 🧶",
    bio: "Sou artesã de crochê. Envio para todo o Brasil."
  },
  {
    id: 6,
    name: "zcitando 💭",
    username: "zcitando",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    diamonds: "12 mil",
    diamondsCount: 12000,
    viewers: 125,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-filming-herself-with-a-smartphone-41436-large.mp4",
    section: "proxima",
    distance: "800 m",
    note: "Zoar > Chorar 💔",
    bio: "Minha conta do Instagram é pra zoar triste..."
  },
  {
    id: 7,
    name: "Carol Dias 🌸",
    username: "carol.dias",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
    diamonds: "45 mil",
    diamondsCount: 45000,
    viewers: 42,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lighting-12347-large.mp4",
    section: "proxima",
    distance: "300 m",
    note: "Bora papear? 💬",
    bio: "Carol aqui! Passando o tempo nas lives."
  },
  {
    id: 8,
    name: "Julia Cruz ⚡",
    username: "julia.cruz",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    diamonds: "8 mil",
    diamondsCount: 8000,
    viewers: 18,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-neon-makeup-in-dark-40011-large.mp4",
    section: "novata",
    note: "Novidade na área! 😊",
    bio: "Criando conteúdo novo! Manda um oi no direct."
  },
  {
    id: 9,
    name: "Larissa Rocha 🦋",
    username: "larissa.rocha",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    diamonds: "780 mil",
    diamondsCount: 780000,
    viewers: 154,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-looking-at-her-phone-in-the-dark-40019-large.mp4",
    section: "popular",
    note: "Live da Lari 💖",
    bio: "Sejam bem-vindos! Vamos curtir a noite juntas."
  },
  {
    id: 10,
    name: "⚔️ BATALHA PK",
    username: "batalha.pk",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
    diamonds: "940 mil",
    diamondsCount: 940000,
    viewers: 840,
    videoUrl: "", // Trata na lógica de abertura
    section: "popular",
    note: "Simulador de PK ao vivo! ⚔️",
    bio: "Batalha disputada. Quem vence hoje?",
    isPk: true
  }
];

// Conversas Direct Messages (DMs) Iniciais
const INITIAL_DMS = [
  {
    username: "moranguinho",
    name: "MORANGUINHO 🍓",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    lastMessage: "Obrigada pelo carinho! Vem me ver na live... 💋",
    time: "10:14",
    unread: true,
    history: [
      { sender: "them", text: "Oi Alexandre, tudo bem?", time: "09:30" },
      { sender: "me", text: "Oi! Tudo bem e com você? Adorei sua live ontem.", time: "09:32" },
      { sender: "them", text: "Que fofo! Obrigada por assistir. 🥰", time: "09:35" },
      { sender: "them", text: "Vou entrar em live daqui a pouco, fica de olho!", time: "09:36" },
      { sender: "me", text: "Pode deixar, vou entrar sim!", time: "09:40" },
      { sender: "them", text: "Obrigada pelo carinho! Vem me ver na live... 💋", time: "10:14" }
    ]
  },
  {
    username: "zcitando",
    name: "zcitando 💭",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    lastMessage: "Minha conta é pra rir pra não chorar",
    time: "Ontem",
    unread: false,
    history: [
      { sender: "me", text: "Mano, seus posts são muito engraçados, me identifico", time: "Ontem 18:20" },
      { sender: "them", text: "Valeu cara! Tamo junto", time: "Ontem 18:22" },
      { sender: "them", text: "Minha conta é pra rir pra não chorar", time: "Ontem 18:23" }
    ]
  },
  {
    username: "gabi.silva",
    name: "Gabi Silva 🥱",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    lastMessage: "Te respondo na chamada de vídeo",
    time: "2 dias atrás",
    unread: false,
    history: [
      { sender: "me", text: "Como funciona a chamada de vídeo privada?", time: "17 Jul" },
      { sender: "them", text: "Oi! É só mandar 100 moedas que liberamos a call de 10 min", time: "17 Jul" },
      { sender: "them", text: "Te respondo na chamada de vídeo", time: "17 Jul" }
    ]
  }
];


const STATE = {
  isLoggedIn: true,
  authMode: "login",
  myCoins: 99,
  activeScreen: "splash",
  followedStreamers: [], // IDs dos streamers seguidos
  currentLiveBroadcaster: null,
  liveChatChannel: null, // canal Supabase Realtime da sala de live atual
  pkChannel: null, // canal Supabase Realtime da batalha PK atual
  liveKitRoom: null, // conexão LiveKit como espectador (assistindo vídeo real)
  myLiveKitRoom: null, // conexão LiveKit como transmissor (própria live)
  realLiveSessions: [], // quem está transmitindo de verdade agora
  realLiveSessionsChannel: null,
  currentLiveIsReal: false,
  activeChatPartner: null,
  dmsList: [...INITIAL_DMS],
  
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
  stories: [
    { username: "Seu status", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", media: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500", caption: "Preparando a live de hoje! 🎬🍿", viewed: false, isSelf: true },
    { username: "moranguinho", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", media: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500", caption: "Show ao vivo mais tarde! Quem vem? 💋🌹", viewed: false },
    { username: "gabi.silva", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150", media: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500", caption: "Cantando umas músicas no violão 🎸🎙️", viewed: false },
    { username: "luana.becker", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", media: "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=500", caption: "Batalha PK pesada hoje à noite! 🏆🔥", viewed: false }
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
    "pk-simulator": document.getElementById("screen-pk-simulator"),
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


// 4. INICIALIZAÇÃO DO APP
document.addEventListener("DOMContentLoaded", () => {
  renderCoins();
  renderLivesGrid();
  scrollToSection("popular"); // Mostrar apenas populares por padrão no início
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
  // evitando recursão infinita quando closeLiveRoom/closePkSimulator
  // chamam navigateTo() de volta.
  const previousScreen = STATE.activeScreen;
  STATE.activeScreen = screenId;

  // Limpar recursos ativos se sairmos de determinadas telas
  if (previousScreen === "live-room" && screenId !== "live-room") {
    closeLiveRoom();
  }
  if (previousScreen === "go-live" && screenId !== "go-live") {
    stopOwnLiveStream();
  }
  if (previousScreen === "pk-simulator" && screenId !== "pk-simulator") {
    closePkSimulator();
  }

  // Ocultar todas as telas
  Object.keys(DOM.screens).forEach(key => {
    DOM.screens[key].classList.remove("active");
  });
  
  // Exibir a tela selecionada
  DOM.screens[screenId].classList.add("active");
  STATE.activeScreen = screenId;
  
  // Gerenciamento da navegação inferior
  const hideNavScreens = ["splash", "live-room", "private-chat", "auth", "go-live", "pk-simulator"];
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
  } else if (screenId === "pk-simulator") {
    initiatePkSimulator();
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

function showNotificationPanel() {
  showToast("Você não possui novas notificações.");
}


// 8. TELA DISCOVER - GRADE E SEÇÕES DE LIVES
function renderLivesGrid() {
  const popularContainer = document.getElementById("popular-lives-grid");
  const newContainer = document.getElementById("new-lives-list");
  const nearbyContainer = document.getElementById("nearby-lives-list");

  if (!popularContainer || !newContainer || !nearbyContainer) return;

  popularContainer.innerHTML = "";
  newContainer.innerHTML = "";
  nearbyContainer.innerHTML = "";

  // 1. POPULARES (Grid de duas colunas)
  const popularLives = MOCK_BROADCASTERS.filter(b => b.section === "popular");
  popularLives.forEach(b => {
    popularContainer.appendChild(createLiveCardElement(b));
  });

  // 2. NOVATAS (Scroll Horizontal com badge 'Novo')
  const newLives = MOCK_BROADCASTERS.filter(b => b.section === "novata");
  newLives.forEach(b => {
    newContainer.appendChild(createLiveCardElement(b, "new"));
  });

  // 3. PRÓXIMAS (Scroll Horizontal com badge de Distância)
  const nearbyLives = MOCK_BROADCASTERS.filter(b => b.section === "proxima");
  nearbyLives.forEach(b => {
    nearbyContainer.appendChild(createLiveCardElement(b, "nearby"));
  });
}

// Auxiliar para criar elementos de card de live dinamicamente
function createLiveCardElement(b, badgeType = null) {
  const card = document.createElement("div");
  card.className = "live-card";
  card.onclick = () => {
    if (b.isPk) {
      navigateTo("pk-simulator");
    } else {
      enterLiveRoom(b.id);
    }
  };

  let badgeHtml = "";
  if (badgeType === "new") {
    badgeHtml = `<div class="card-badge-right new">Novo</div>`;
  } else if (badgeType === "nearby") {
    badgeHtml = `<div class="card-badge-right nearby">📍 ${b.distance || '1.0 km'}</div>`;
  }

  card.innerHTML = `
    <img class="live-thumbnail" src="${b.avatar}" alt="${b.name}">
    <div class="card-overlay-gradient"></div>
    <div class="card-viewers">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
      <span>👁️ ${b.viewers}</span>
    </div>
    ${badgeHtml}
    <div class="card-details">
      <span class="card-name">${b.name} <span style="color: var(--primary); font-size: 0.65rem;">●</span></span>
      <span class="card-coins">
        <svg class="icon-coin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
        ${b.diamonds}
      </span>
    </div>
    <button class="card-btn-call" onclick="event.stopPropagation(); if (${b.isPk}) { navigateTo('pk-simulator'); } else { enterLiveRoom(${b.id}); }">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
    </button>
  `;
  return card;
}

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

function renderRealLiveSessions(sessions) {
  STATE.realLiveSessions = sessions;
  const section = document.getElementById("real-live-section");
  const grid = document.getElementById("real-live-grid");
  if (!section || !grid) return;

  grid.innerHTML = "";
  if (sessions.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
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


// 9. TELA DE LIVE PLAYER (ASSISTINDO STREAM)
async function enterLiveRoom(broadcasterId) {
  const b = MOCK_BROADCASTERS.find(x => x.id === broadcasterId);
  if (!b) return;
  await enterLiveRoomCore(b, false);
}

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
  const descriptor = {
    id: `real-${hostUserId}`,
    name: profile.display_name || profile.username,
    username: profile.username,
    avatar: profile.avatar_url,
    diamonds: "0",
    diamondsCount: 0,
    videoUrl: null
  };
  await enterLiveRoomCore(descriptor, true, hostUserId);
}

async function enterLiveRoomCore(b, isReal, hostUserId) {
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
  STATE.currentLiveIsReal = isReal;

  // Atualizar dados da UI
  DOM.streamerAvatar.src = b.avatar;
  DOM.streamerName.textContent = b.name;
  if (DOM.streamerStats) {
    DOM.streamerStats.textContent = `${b.diamonds} acumulados`;
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

  if (isReal) {
    await connectToRealLiveVideo(hostUserId, loader);
  } else {
    if (!b.videoUrl) {
      DOM.liveVideo.src = "https://assets.mixkit.co/videos/preview/mixkit-woman-looking-at-her-phone-in-the-dark-40019-large.mp4";
      showToast("Canal offline. Carregando transmissão modelo 📡");
    } else {
      DOM.liveVideo.src = b.videoUrl;
    }

    // Simular conexão de streaming com fail-safe
    let hasLoaded = false;
    const hideLoader = () => {
      if (hasLoaded) return;
      hasLoaded = true;
      loader.style.opacity = "0";
      setTimeout(() => { loader.style.display = "none"; }, 500);
      DOM.liveVideo.play().catch(err => console.log("Autoplay bloqueado, aguardando clique", err));
    };

    DOM.liveVideo.oncanplay = hideLoader;
    DOM.liveVideo.onloadedmetadata = hideLoader;
    DOM.liveVideo.onplay = hideLoader;

    // Fail-safe de 800ms
    setTimeout(hideLoader, 800);
  }

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
function renderInboxList() {
  DOM.inboxList.innerHTML = "";
  
  let unreadCount = 0;
  
  STATE.dmsList.forEach(chat => {
    if (chat.unread) unreadCount++;
    
    const item = document.createElement("div");
    // Se o streamer correspondente for moranguinho ou zcitando, destaca com borda de live
    const isStreaming = ["moranguinho", "zcitando"].includes(chat.username);
    item.className = chat.unread ? "inbox-item unread" : "inbox-item";
    if (isStreaming) item.classList.add("live");
    
    item.onclick = () => openPrivateChat(chat.name, chat.avatar, chat.lastMessage, chat.username);
    
    item.innerHTML = `
      <div class="inbox-avatar">
        <img src="${chat.avatar}" alt="${chat.name}">
        ${isStreaming ? '<span class="live-badge-small">LIVE</span>' : ''}
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

function openPrivateChat(name, avatar, note, username) {
  STATE.activeChatPartner = username;
  
  // Atualizar UI
  DOM.chatPartnerAvatar.src = avatar;
  DOM.chatPartnerName.textContent = name;
  
  // Marcar como lido
  const localChat = STATE.dmsList.find(x => x.username === username);
  if (localChat) {
    localChat.unread = false;
    renderInboxList();
  }
  
  renderPrivateChatHistory(username);
  navigateTo("private-chat");
}

function renderPrivateChatHistory(username) {
  DOM.privateChatHistory.innerHTML = "";
  const chat = STATE.dmsList.find(x => x.username === username);
  if (!chat) return;
  
  chat.history.forEach(msg => {
    const bubble = document.createElement("div");
    bubble.className = msg.sender === "me" ? "chat-bubble sent" : "chat-bubble received";
    
    let vipSuffix = "";
    if (msg.sender === "me" && STATE.isVIP) {
      vipSuffix = `<span style="font-size: 0.58rem; display: block; color: var(--secondary); font-weight: bold; margin-bottom: 2px;">👑 VIP Ouro</span>`;
    }
    
    bubble.innerHTML = `
      ${vipSuffix}
      <span>${msg.text}</span>
      <span class="chat-bubble-time">${msg.time}</span>
    `;
    DOM.privateChatHistory.appendChild(bubble);
  });
  
  setTimeout(() => {
    DOM.privateChatHistory.scrollTop = DOM.privateChatHistory.scrollHeight;
  }, 100);
}

function handlePrivateChatKey(event) {
  if (event.key === "Enter") {
    sendPrivateChatMessage();
  }
}

function sendPrivateChatMessage() {
  const text = DOM.privateChatInput.value.trim();
  if (text === "") return;
  
  const username = STATE.activeChatPartner;
  const chat = STATE.dmsList.find(x => x.username === username);
  if (!chat) return;
  
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // Adicionar ao histórico local
  const newMsg = { sender: "me", text: text, time: timeStr };
  chat.history.push(newMsg);
  chat.lastMessage = text;
  chat.time = timeStr;
  
  renderPrivateChatHistory(username);
  DOM.privateChatInput.value = "";
  renderInboxList();
}

function simulatePrivateVideoCall() {
  showToast("Chamada de vídeo ainda não disponível nesta versão.");
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


// 14. TRANSMITIR AO VIVO (GO LIVE - WEBCAM SIMULATOR)
function initiateCameraStream() {
  const constraints = { video: { facingMode: "user" }, audio: false };
  const fallback = DOM.goLive.querySelector(".camera-fallback-msg");

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      STATE.localStream = stream;
      DOM.goLiveVideo.srcObject = stream;
      DOM.goLiveVideo.src = "";
      if (fallback) fallback.style.display = "none";
    })
    .catch(err => {
      console.log("Erro ao acessar câmera física, usando simulada: ", err);
      showToast("Câmera simulada ativa (Demo) 🎥");
      
      DOM.goLiveVideo.srcObject = null;
      DOM.goLiveVideo.src = "https://assets.mixkit.co/videos/preview/mixkit-woman-filming-herself-with-a-smartphone-41436-large.mp4";
      DOM.goLiveVideo.loop = true;
      DOM.goLiveVideo.play().catch(e => console.log(e));
      
      if (fallback) fallback.style.display = "none";
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

function scrollToSection(sectionName) {
  // Atualizar classe ativa das cápsulas
  const capsules = document.querySelectorAll(".transmission-types-card .type-capsule");
  capsules.forEach(cap => {
    cap.classList.remove("active");
    const h4 = cap.querySelector("h4");
    if (h4 && h4.textContent.toLowerCase().includes(sectionName === "popular" ? "populares" : sectionName === "novata" ? "novatas" : "próximas")) {
      cap.classList.add("active");
    }
  });

  // Mostrar SOMANTE a seção selecionada, ocultando as outras
  const sections = document.querySelectorAll(".discover-section");
  if (sections.length >= 3) {
    sections.forEach(sec => {
      sec.style.display = "none";
    });

    if (sectionName === "popular") {
      sections[0].style.display = "block";
    } else if (sectionName === "novata") {
      sections[1].style.display = "block";
    } else if (sectionName === "proxima") {
      sections[2].style.display = "block";
    }
  }

  // Rolar suavemente para o topo do scroll Discover
  const scrollArea = document.querySelector(".discover-scroll-area");
  if (scrollArea) {
    scrollArea.scrollTo({
      top: 0,
      behavior: "smooth"
    });
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
  // Excluir a conta de verdade exige privilégio de administrador (não disponível no
  // cliente com a chave pública) — por ora, essa ação encerra a sessão com segurança.
  const confirmDelete = confirm("Deseja encerrar a sessão desta conta? A exclusão definitiva de conta ainda não está disponível nesta versão.");

  if (confirmDelete) {
    closeProfileSettingsModal();
    await handleLogout();
  }
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

function performProfileSearch() {
  const query = document.getElementById("search-profile-input").value.trim().toLowerCase();
  const container = document.getElementById("search-results-container");

  if (!container) return;
  container.innerHTML = "";

  // Filtrar streamers pelo nome ou username
  const matches = MOCK_BROADCASTERS.filter(b => {
    return b.name.toLowerCase().includes(query) || b.username.toLowerCase().includes(query);
  });

  if (matches.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--light-gray); font-size: 0.8rem;">
        Nenhum perfil encontrado para "${query}".
      </div>
    `;
    return;
  }

  matches.forEach(b => {
    const item = document.createElement("div");
    item.className = "inbox-item";
    item.style.padding = "10px 0";
    item.style.borderBottom = "1px solid var(--glass-border)";
    
    item.onclick = () => {
      closeSearchOverlay();
      if (b.isPk) {
        navigateTo("pk-simulator");
      } else {
        enterLiveRoom(b.id);
      }
    };

    item.innerHTML = `
      <div class="inbox-avatar" style="width: 44px; height: 44px;">
        <img src="${b.avatar}" alt="${b.name}" style="border-radius: 50%;">
      </div>
      <div class="inbox-details" style="margin-left: 12px;">
        <span class="inbox-name" style="font-size: 0.8rem; font-weight: 700; color: #fff;">${b.name}</span>
        <span class="inbox-message" style="font-size: 0.65rem; color: var(--light-gray);">${b.note || '@' + b.username}</span>
      </div>
      <div class="inbox-right" style="display: flex; align-items: center; justify-content: center;">
        <button class="btn-lightbox-like active" style="font-size: 0.65rem; background: var(--bg-input); padding: 4px 8px; border-radius: 8px; border: 1px solid var(--glass-border); color: #fff;">
          ${b.isPk ? 'Ver PK' : 'Assistir'}
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

// ==========================================================================
// 20. SIMULADOR DE BATALHA PK (FUNÇÕES)
// ==========================================================================

const PK_BATTLE_KEY = "moranguinho_vs_luana";

async function initiatePkSimulator() {
  // Configurar elementos de vídeo
  const videoA = document.getElementById("pk-video-a");
  const videoB = document.getElementById("pk-video-b");
  const chatMessages = document.getElementById("pk-chat-messages");

  if (!videoA || !videoB) return;

  // Carregar vídeos reais em loop (usando perfis de Moranguinho e Luana Becker)
  videoA.src = "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lighting-12347-large.mp4";
  videoB.src = "https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-neon-makeup-in-dark-40011-large.mp4";

  videoA.play().catch(e => console.log(e));
  videoB.play().catch(e => console.log(e));

  // Limpar chat anterior do PK
  chatMessages.innerHTML = "";
  addPkSystemMessage("Batalha PK iniciada! Apoie sua streamer enviando presentes! ⚔️");
  document.getElementById("pk-win-a").style.display = "none";
  document.getElementById("pk-win-b").style.display = "none";

  // Placar real: soma de todo apoio já recebido por todo mundo, compartilhado
  // de verdade entre quem estiver assistindo (não é mais um número inicial falso).
  try {
    const scores = await DB.getPkScores(PK_BATTLE_KEY);
    STATE.pkScoreA = scores.A;
    STATE.pkScoreB = scores.B;
    updatePkBars();
    checkPkWinner();

    const events = await DB.getPkRecentEvents(PK_BATTLE_KEY);
    events.forEach(renderPkEvent);
  } catch (err) {
    console.log("Não foi possível carregar o placar do PK", err);
  }

  if (STATE.pkChannel) {
    sb.removeChannel(STATE.pkChannel);
  }
  STATE.pkChannel = DB.subscribeToPkBattle(PK_BATTLE_KEY, handleIncomingPkEvent);
}

function renderPkEvent(row) {
  const chatMessages = document.getElementById("pk-chat-messages");
  const msgEl = document.createElement("div");
  msgEl.className = "chat-msg gift-ann";
  msgEl.innerHTML = `<span class="msg-author">${row.username}</span> <span class="msg-content">enviou um(a) ${row.gift_label} (+${row.points} pts)</span>`;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleIncomingPkEvent(row) {
  if (row.side === "A") {
    STATE.pkScoreA += row.points;
  } else {
    STATE.pkScoreB += row.points;
  }
  updatePkBars();
  renderPkEvent(row);
  checkPkWinner();
}

function closePkSimulator() {
  const videoA = document.getElementById("pk-video-a");
  const videoB = document.getElementById("pk-video-b");

  if (videoA) videoA.pause();
  if (videoB) videoB.pause();

  if (STATE.pkChannel) {
    sb.removeChannel(STATE.pkChannel);
    STATE.pkChannel = null;
  }
}

function updatePkBars() {
  const scoreA = STATE.pkScoreA;
  const scoreB = STATE.pkScoreB;
  const total = scoreA + scoreB;

  const pctA = Math.round((scoreA / total) * 100);
  const pctB = 100 - pctA;

  document.getElementById("pk-score-a").textContent = scoreA.toLocaleString('pt-BR');
  document.getElementById("pk-score-b").textContent = scoreB.toLocaleString('pt-BR');
  
  document.getElementById("pk-bar-red").style.width = `${pctA}%`;
  document.getElementById("pk-bar-blue").style.width = `${pctB}%`;
}

async function supportStreamer(side, event) {
  if (!requireAuth()) return;
  const giftName = side === "A" ? "Rosa 🌹" : "Diamante 💎";
  const streamerName = side === "A" ? "MORANGUINHO 🍓" : "Luana Becker 👑";

  let profile;
  try {
    profile = await DB.supportPk(side);
  } catch (err) {
    showToast(err.message || "Saldo de moedas insuficiente. Recarregue no Perfil!");
    return;
  }
  await applyProfileToUI(profile);

  // Mostrar aviso de presente na tela
  showToast(`Você enviou um(a) ${giftName} para apoiar ${streamerName}!`);

  // Placar e mensagem no chat do PK chegam via Realtime (compartilhados de
  // verdade com todo mundo assistindo, não só localmente).

  // Emitir corações flutuantes baseados nas coordenadas do clique
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      emitPkHeartFromClick(side, event);
    }, i * 200);
  }
}

function checkPkWinner() {
  // Declara vitória se atingir diferença significativa
  if (STATE.pkScoreA > 15000 && STATE.pkScoreA - STATE.pkScoreB > 4000) {
    document.getElementById("pk-win-a").style.display = "block";
    document.getElementById("pk-win-b").style.display = "none";
  } else if (STATE.pkScoreB > 15000 && STATE.pkScoreB - STATE.pkScoreA > 4000) {
    document.getElementById("pk-win-b").style.display = "block";
    document.getElementById("pk-win-a").style.display = "none";
  }
}

function addPkSystemMessage(text) {
  const chatMessages = document.getElementById("pk-chat-messages");
  const msgEl = document.createElement("div");
  msgEl.className = "chat-msg system";
  msgEl.innerHTML = `<span class="msg-content">${text}</span>`;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Coração flutuante a partir de cliques em botões
function emitPkHeartFromClick(side, event) {
  const container = document.getElementById("pk-hearts-container");
  if (!container) return;

  const heart = document.createElement("div");
  heart.className = "floating-heart";

  // Determinar cor do coração baseado na streamer apoiada
  const color = side === "A" ? "#ff4d6d" : "#4e9eff";
  
  heart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${color}">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;

  // Ponto de início: lado esquerdo ou direito do container correspondente
  const randomX = side === "A" 
    ? Math.floor(Math.random() * 50) + 40   // Esquerda (Moranguinho)
    : Math.floor(Math.random() * 50) + 240; // Direita (Luana Becker)
    
  const drift = (Math.random() * 60 - 30);
  
  heart.style.left = `${randomX}px`;
  heart.style.top = `400px`; // Sobe a partir da metade da tela
  heart.style.setProperty("--drift", `${drift}px`);

  container.appendChild(heart);

  setTimeout(() => {
    heart.remove();
  }, 2200);
}

// ==========================================================================
// 25. FLUXO DE LOGIN, CADASTRO E LOGOUT (AUTENTICAÇÃO RESTAURADA)
// ==========================================================================

function toggleAuthTab(mode) {
  STATE.authMode = mode;
  const tabLogin = document.getElementById("btn-tab-login");
  const tabRegister = document.getElementById("btn-tab-register");
  const submitBtn = document.getElementById("btn-auth-submit");

  if (mode === "login") {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    submitBtn.textContent = "Entrar";
    document.getElementById("auth-username").placeholder = "E-mail";
  } else {
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
    submitBtn.textContent = "Criar Conta";
    document.getElementById("auth-username").placeholder = "E-mail";
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

  STATE.myCoins = profile.coins;
  STATE.xp = profile.xp;
  STATE.level = profile.level;
  STATE.isVIP = profile.is_vip;
  STATE.profileName = profile.display_name || profile.username;

  const nameEl = document.querySelector(".profile-bio-info h3");
  const handleEl = document.querySelector(".profile-handle");
  if (nameEl) nameEl.innerHTML = `${STATE.profileName} <span class="premium-verified">✓</span>`;
  if (handleEl) handleEl.textContent = `@${profile.username}`;

  renderCoins();
  updateXPProgressUI();

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

function openSocialAuthModal(platform) {
  const modal = document.getElementById("social-auth-modal");
  const content = document.getElementById("social-auth-content");
  
  modal.classList.add("active");

  if (platform === "whatsapp") {
    content.innerHTML = `
      <div class="social-auth-header">
        <div class="social-logo-wrapper whatsapp">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c-5.506 0-9.97 4.463-9.97 9.969 0 1.937.554 3.743 1.517 5.275L2 22l4.912-1.286c1.468.802 3.149 1.258 4.937 1.258 5.506 0 9.969-4.462 9.969-9.968 0-5.506-4.463-9.969-9.969-9.969zm4.838 13.916c-.214.607-1.031 1.096-1.524 1.16-.363.047-.83.08-2.42-.572-2.032-.835-3.328-2.883-3.429-3.017-.1-.134-.8-1.055-.8-2.017s.5-1.428.679-1.61c.179-.18.39-.228.52-.228.13 0 .26 0 .373.007.117.007.274-.047.43.328.162.39.554 1.348.602 1.448.049.1.08.214.015.342-.065.13-.098.214-.196.328-.098.114-.205.255-.293.35-.098.1-.202.21-.087.41.114.195.507.834.996 1.272.63.565 1.16.74 1.323.824.162.085.257.07.35-.04.095-.11.41-.482.52-.647.11-.164.22-.138.373-.08.153.058.97.458 1.137.542.167.085.277.127.318.197.042.07.042.408-.172 1.015z"/></svg>
        </div>
        <h3>Conectar WhatsApp</h3>
        <p>Insira abaixo o código de 4 dígitos enviado por mensagem para o seu celular.</p>
      </div>

      <div class="otp-container">
        <input type="text" class="otp-input" maxlength="1" oninput="moveOtpFocus(this, 1)" placeholder="•">
        <input type="text" class="otp-input" maxlength="1" oninput="moveOtpFocus(this, 2)" placeholder="•">
        <input type="text" class="otp-input" maxlength="1" oninput="moveOtpFocus(this, 3)" placeholder="•">
        <input type="text" class="otp-input" maxlength="1" oninput="moveOtpFocus(this, 4)" placeholder="•">
      </div>

      <button class="btn-social-auth-action whatsapp" onclick="handleSocialVerification('whatsapp')">
        Confirmar Código
      </button>
    `;
  } else if (platform === "instagram") {
    content.innerHTML = `
      <div class="social-auth-header">
        <div class="social-logo-wrapper instagram">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
        </div>
        <h3>Conectar Instagram</h3>
        <p>VibeLive solicita permissão para acessar suas informações de perfil público do Instagram.</p>
      </div>

      <div class="instagram-profile-preview">
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" class="insta-avatar" alt="User Profile">
        <div class="insta-details">
          <span class="insta-name">Alexandre Silva</span>
          <span class="insta-username">@zcitando</span>
        </div>
      </div>

      <button class="btn-social-auth-action instagram" onclick="handleSocialVerification('instagram')">
        Autorizar e Conectar
      </button>
    `;
  }
}

function closeSocialAuthModal() {
  const modal = document.getElementById("social-auth-modal");
  modal.classList.remove("active");
}

function moveOtpFocus(input, index) {
  if (input.value.length === 1 && index < 4) {
    const inputs = document.querySelectorAll(".otp-input");
    inputs[index].focus();
  }
}

function handleSocialVerification(platform) {
  closeSocialAuthModal();
  showToast(`Autenticando via ${platform === "whatsapp" ? "WhatsApp" : "Instagram"}...`);

  setTimeout(() => {
    STATE.isLoggedIn = true;
    showToast("Conexão social realizada com sucesso!");
    navigateTo("discover");
  }, 1200);
}

async function handleLogout() {
  showToast("Saindo...");
  try {
    await Auth.signOut();
  } catch (err) {
    console.error(err);
  }
  STATE.isLoggedIn = false;
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
// 27. VISITANTES DO PERFIL & SELEÇÃO DE ATMOSFERA (LIVES)
// ==========================================================================

STATE.profileVisitors = [
  { name: "Larissa Rocha", username: "larissa.rocha", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", time: "Há 2 horas", note: "Visitou através de Populares" },
  { name: "Gabi Silva", username: "gabi.silva", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150", time: "Há 4 horas", note: "Visitou através de DMs" },
  { name: "Luana Becker", username: "luana.becker", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", time: "Há 12 horas", note: "Assistiu a sua última live" },
  { name: "Aline Santos", username: "aline.santos", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150", time: "Há 18 horas", note: "Visitou através da Busca" },
  { name: "Zcitando", username: "zcitando", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", time: "Há 23 horas", note: "Curtiu sua publicação" }
];

function openProfileVisitorsModal() {
  const modal = document.getElementById("modal-profile-visitors");
  const container = document.getElementById("visitors-list-container");
  if (!modal || !container) return;

  container.innerHTML = "";
  
  STATE.profileVisitors.forEach((v, index) => {
    const item = document.createElement("div");
    item.className = "inbox-item";
    item.style.background = "rgba(255, 255, 255, 0.02)";
    item.style.marginBottom = "8px";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <div class="inbox-avatar" onclick="openVisitorProfile(${index})">
        <img src="${v.avatar}" alt="${v.name}">
      </div>
      <div class="inbox-details" style="margin-left: 12px;" onclick="openVisitorProfile(${index})">
        <span class="inbox-name" style="font-size: 0.78rem; font-weight: 700; color: #fff; display: block;">${v.name}</span>
        <span class="inbox-message" style="font-size: 0.65rem; color: var(--light-gray);">${v.note}</span>
      </div>
      <div class="inbox-right" style="align-items: flex-end;">
        <span class="inbox-time" style="font-size: 0.62rem; color: rgba(255,255,255,0.4);">${v.time}</span>
        <button class="btn-follow-primary" style="height: 20px; font-size: 0.58rem; margin-top: 4px; padding: 0 6px;" onclick="showToast('Seguindo ${v.name}!')">Seguir</button>
      </div>
    `;
    container.appendChild(item);
  });

  modal.style.display = "flex";
}

function closeProfileVisitorsModal() {
  const modal = document.getElementById("modal-profile-visitors");
  if (modal) modal.style.display = "none";
}

function openVisitorProfile(index) {
  const v = STATE.profileVisitors[index];
  if (!v) return;

  // Fechar o modal de lista de visitantes
  closeProfileVisitorsModal();

  // Preencher os dados do perfil do visitante
  document.getElementById("visitor-p-avatar").src = v.avatar;
  document.getElementById("visitor-p-name").textContent = v.name;
  document.getElementById("visitor-p-handle").textContent = `@${v.username}`;
  document.getElementById("visitor-p-bio").textContent = `${v.name} é membro ativo da comunidade VibeLive e adora apoiar criadores. 😊✨`;
  
  // Ação de enviar mensagem direto pelo perfil do visitante
  const msgBtn = document.getElementById("btn-visitor-message");
  msgBtn.onclick = () => {
    closeVisitorProfile();
    openPrivateChat(v.name, v.avatar, "Oii!", v.username);
  };

  // Exibir o modal de perfil de visitante
  document.getElementById("modal-visitor-profile").style.display = "flex";
}

function closeVisitorProfile() {
  document.getElementById("modal-visitor-profile").style.display = "none";
}

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

