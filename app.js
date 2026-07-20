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

// Pool de Comentários para Simular o Chat da Live
const MOCK_COMMENTS = [
  "Olá linda! 😍",
  "De onde você é?",
  "Manda um beijo para São Paulo!",
  "Que vibe boa essa live",
  "Você é muito simpática! ❤️",
  "Entra na chamada comigo?",
  "O que você está fazendo?",
  "Uau, maravilhosa!",
  "Manda corações galera!",
  "Acabei de entrar, oi!",
  "Qual seu Instagram?",
  "Faz cara de bravo haha",
  "Top de verdade 🚀",
  "🔥 Live incrível!",
  "Seu cabelo é muito lindo!",
  "Qual sua música favorita?",
  "Quero te mandar presentes 🎁",
  "Simpatia pura!",
  "Lindíssima!",
  "Passando para deixar um oi."
];

const MOCK_SYSTEM_MESSAGES = [
  "⚠️ Evite compartilhar informações pessoais como senhas e números de telefone.",
  "✨ Apoie este streamer enviando presentes da carteira!",
  "💬 Mantenha o chat amigável e respeitoso. Denuncie comportamentos impróprios.",
  "🚀 Compartilhe esta live para trazer mais amigos!"
];

// Nomes de usuários fictícios que comentam no chat
const MOCK_USERNAMES = [
  "lucas_santos", "mari_oliveira", "thiago.lima", "carla_souza", "diego.costa", 
  "anabeatriz", "felipe_r", "juliana_m", "rodrigo_silva", "gabriel.p", 
  "bruna_lima", "pedro_s", "amanda_g", "matheus_c", "leticia_n", 
  "vitor_almeida", "camila_f", "andre_m", "patricia_s", "gustavo_h"
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
  activeChatPartner: null,
  dmsList: [...INITIAL_DMS],
  
  // Postagens no Perfil
  currentPostType: "image",
  activeLightboxPostId: null,
  myPosts: [
    {
      id: 1,
      type: "image",
      src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
      caption: "Curtindo a vibe do final de semana! ✨✌️",
      likes: 42,
      comments: [
        { author: "gabi.silva", text: "Maravilhosa! 😍" },
        { author: "moranguinho", text: "Que lugar lindo!" }
      ]
    },
    {
      id: 2,
      type: "video",
      src: "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-selfies-with-her-smart-phone-41444-large.mp4",
      caption: "Preparando a live de hoje à noite! Não percam! 🎥💖",
      likes: 128,
      comments: [
        { author: "aline.santos", text: "Já marquei presença!" },
        { author: "zcitando", text: "A melhor streamer!" }
      ]
    }
  ],
  
  // Variáveis para simulação de Live Ativa (Assistindo)
  liveChatInterval: null,
  liveViewerInterval: null,
  liveViewerCount: 128,
  
  // Presente selecionado na gaveta
  selectedGift: null,
  
  // Carteira/Pix
  pixTimerInterval: null,
  activePixPackage: null,
  
  // Transmissão Própria (Webcam)
  localStream: null,
  myLiveIntervals: [],
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
  statusClock: document.getElementById("status-clock"),
  
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
  setupClock();
  renderCoins();
  renderLivesGrid();
  scrollToSection("popular"); // Mostrar apenas populares por padrão no início
  renderInboxList();
  renderStories();

  // Temporizador para esconder a Splash Screen
  setTimeout(() => {
    navigateTo("discover");
  }, 2500);
});


// 5. SISTEMA DE RELÓGIO (STATUS BAR)
function setupClock() {
  const updateTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    DOM.statusClock.textContent = `${hours}:${minutes}`;
  };
  updateTime();
  setInterval(updateTime, 60000);
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


// 9. TELA DE LIVE PLAYER (ASSISTINDO STREAM)
function enterLiveRoom(broadcasterId) {
  const b = MOCK_BROADCASTERS.find(x => x.id === broadcasterId);
  if (!b) return;
  
  STATE.currentLiveBroadcaster = b;
  
  // Atualizar dados da UI
  DOM.streamerAvatar.src = b.avatar;
  DOM.streamerName.textContent = b.name;
  if (DOM.streamerStats) {
    DOM.streamerStats.textContent = `${b.diamonds} acumulados`;
  }
  DOM.liveViewerCount.textContent = b.viewers;
  STATE.liveViewerCount = b.viewers;
  
  // Atualizar botão de seguir
  if (STATE.followedStreamers.includes(b.id)) {
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
  
  // Iniciar chat simulado
  addSystemComment("zcitando entrou na live");
  addSystemComment("Regras do chat: Seja gentil e siga as diretrizes.");
  
  STATE.liveChatInterval = setInterval(simulateIncomingLiveChat, 2000);
  STATE.liveViewerInterval = setInterval(() => {
    // Variar telespectadores em +- 3
    const diff = Math.floor(Math.random() * 7) - 3;
    STATE.liveViewerCount = Math.max(10, STATE.liveViewerCount + diff);
    DOM.liveViewerCount.textContent = STATE.liveViewerCount;
  }, 5000);
}

function closeLiveRoom() {
  DOM.liveVideo.pause();
  DOM.liveVideo.src = "";

  if (STATE.liveChatInterval) clearInterval(STATE.liveChatInterval);
  if (STATE.liveViewerInterval) clearInterval(STATE.liveViewerInterval);

  STATE.currentLiveBroadcaster = null;
}

function toggleFollowStreamer() {
  const b = STATE.currentLiveBroadcaster;
  if (!b) return;
  
  const index = STATE.followedStreamers.indexOf(b.id);
  if (index > -1) {
    STATE.followedStreamers.splice(index, 1);
    DOM.btnFollowStreamer.textContent = "+ Seguir";
    DOM.btnFollowStreamer.classList.remove("followed");
    showToast(`Deixou de seguir ${b.name}`);
  } else {
    STATE.followedStreamers.push(b.id);
    DOM.btnFollowStreamer.textContent = "Seguindo";
    DOM.btnFollowStreamer.classList.add("followed");
    showToast(`Seguindo ${b.name}!`);
    addSystemComment(`Você seguiu ${b.name}`);
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

function simulateIncomingLiveChat() {
  // 15% de chance de mensagem do sistema, senão usuário normal
  if (Math.random() < 0.15) {
    const sysMsg = MOCK_SYSTEM_MESSAGES[Math.floor(Math.random() * MOCK_SYSTEM_MESSAGES.length)];
    addSystemComment(sysMsg);
  } else {
    const user = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
    const text = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
    addLiveComment(user, text);
  }
}

function handleChatInputKey(event) {
  if (event.key === "Enter") {
    sendUserComment();
  }
}

function sendUserComment() {
  const text = DOM.liveChatInput.value.trim();
  if (text === "") return;
  
  addLiveComment("Você", text);
  DOM.liveChatInput.value = "";
  
  // Chance de a streamer responder à mensagem do usuário no chat após 2 segundos!
  setTimeout(() => {
    if (STATE.currentLiveBroadcaster && STATE.activeScreen === "live-room") {
      const answers = [
        `Obrigada pelo carinho, Você! 😍`,
        `Oi Você, tudo bem lindo?`,
        `Você! Fofo demais.`,
        `Valeu pelo comentário Você! Manda um presentinho? 🙈`
      ];
      const res = answers[Math.floor(Math.random() * answers.length)];
      addLiveComment(STATE.currentLiveBroadcaster.name, res);
    }
  }, 2200);
}


// 10. EMISSOR DE CORAÇÕES FLUTUANTES (INTERATIVO)
function triggerFloatingHeart(event) {
  // Descobrir a posição inicial do botão
  const rect = event.currentTarget.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top;
  
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
  heart.style.left = `${event.clientX - 10}px`;
  heart.style.top = `${event.clientY - 20}px`;
  
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

function sendSelectedGift() {
  if (!STATE.selectedGift) return;
  const gift = STATE.selectedGift;
  
  if (STATE.myCoins < gift.price) {
    showToast("Saldo de moedas insuficiente. Compre mais!");
    return;
  }
  
  // Deduzir moedas
  STATE.myCoins -= gift.price;
  renderCoins();
  DOM.drawerCoinsDisplay.textContent = STATE.myCoins;
  
  // Adicionar diamantes/pontos ao streamer da live
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
  
  // Adicionar mensagem especial no chat
  addLiveComment("Você", gift.name, true, gift.icon);
  
  // Simular resposta alegre do streamer
  setTimeout(() => {
    if (STATE.currentLiveBroadcaster && STATE.activeScreen === "live-room") {
      const audioAnswers = [
        `Nossa!!! Obrigada pelo(a) ${gift.name}! Você é incrível! 💖`,
        `👑 Omg, muito obrigada Você pelo presente! Beijo grande!`,
        `Que lindo!!! Amei o presente ${gift.icon}. Valeu Você!`,
        `Arrasou Você! Muito obrigada pelo suporte! 😍`
      ];
      const response = audioAnswers[Math.floor(Math.random() * audioAnswers.length)];
      addLiveComment(STATE.currentLiveBroadcaster.name, response);
    }
  }, 1800);
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
  
  // Simular resposta automática inteligente do parceiro após 1.5s
  setTimeout(() => {
    if (STATE.activeChatPartner === username && STATE.activeScreen === "private-chat") {
      let replyText = "Obrigada por mandar mensagem! 🥰";
      if (username === "moranguinho") {
        replyText = "Oii! Estou online na minha live agora, entra lá para conversarmos por vídeo! Beijos 💋";
      } else if (username === "zcitando") {
        replyText = "Kkkk rindo de nervoso do seu direct! Passa na minha live mais tarde mano ✌️";
      } else if (username === "gabi.silva") {
        replyText = "Ei Alexandre, estou meio ocupada agora. Me chama na videochamada privada lá no app!";
      }
      
      const replyMsg = { sender: "them", text: replyText, time: timeStr };
      chat.history.push(replyMsg);
      chat.lastMessage = replyText;
      
      renderPrivateChatHistory(username);
      renderInboxList();
    }
  }, 1500);
}

function simulatePrivateVideoCall() {
  showToast("Iniciando videochamada... Conectando...");
  setTimeout(() => {
    const localChat = STATE.dmsList.find(x => x.username === STATE.activeChatPartner);
    if (localChat) {
      showToast(`${localChat.name} está ocupada e não pôde atender.`);
    }
  }, 3000);
}


// 13. LOJA DE MOEDAS E MODAL PIX SIMULADO
function openPixModal(coinsAmount, price) {
  STATE.activePixPackage = { coins: coinsAmount, price: price };
  
  DOM.pixPackageName.textContent = `${coinsAmount} Moedas`;
  DOM.pixTotalPrice.textContent = `R$ ${price.toFixed(2).replace('.', ',')}`;
  
  DOM.pixStatusBox.innerHTML = `
    <div class="spinner-small"></div>
    <span>Aguardando confirmação do pagamento...</span>
  `;
  
  // Abrir modal
  DOM.pixModal.classList.add("active");
  
  // Inicializar temporizador de 5 minutos
  let duration = 300; // 5 minutos
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
  STATE.pixTimerInterval = setInterval(updateTimer, 1000);
}

function closePixModal() {
  DOM.pixModal.classList.remove("active");
  if (STATE.pixTimerInterval) clearInterval(STATE.pixTimerInterval);
  STATE.activePixPackage = null;
}

function copyPixCode() {
  DOM.pixCopyCode.select();
  DOM.pixCopyCode.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(DOM.pixCopyCode.value);
  showToast("Código Copia e Cola copiado!");
}

function simulatePixSuccess() {
  if (!STATE.activePixPackage) return;
  const p = STATE.activePixPackage;
  
  // Alterar status
  DOM.pixStatusBox.style.background = "rgba(52, 211, 153, 0.15)";
  DOM.pixStatusBox.innerHTML = `
    <span style="font-size: 1.1rem;">✅</span>
    <strong>Pagamento Recebido com Sucesso!</strong>
  `;
  
  setTimeout(() => {
    // Adicionar moedas
    STATE.myCoins += p.coins;
    renderCoins();
    
    // Fechar modal
    closePixModal();
    
    // Toast com efeito sonoro visual
    showToast(`Moedas Creditadas! +${p.coins} Moedas adicionadas.`);
  }, 1500);
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

function launchBroadcastingSession() {
  // Exibir overlay de live ativa
  DOM.myLiveActiveOverlay.style.display = "flex";
  
  // Limpar mensagens e resetar contadores
  DOM.myLiveChatMessages.innerHTML = "";
  STATE.myLiveViewerCount = 0;
  STATE.myLiveDiamonds = 0;
  DOM.myLiveViewerCount.textContent = "0";
  DOM.myLiveDiamonds.textContent = "💎 0 acumulados";
  
  // Simular conexão estável
  addMyLiveComment("Sistema", "Transmissão iniciada. Seus seguidores foram notificados! 📡", true);
  
  // 1. Simular espectadores chegando e aumentando gradualmente
  const viewerInt = setInterval(() => {
    const incoming = Math.floor(Math.random() * 8) + 1;
    STATE.myLiveViewerCount += incoming;
    DOM.myLiveViewerCount.textContent = STATE.myLiveViewerCount;
    
    // Simular mensagem de entrada "fulano entrou"
    if (Math.random() < 0.7) {
      const user = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
      addMyLiveComment("Entrou", `${user} entrou na transmissão`, true);
    }
  }, 2500);
  STATE.myLiveIntervals.push(viewerInt);
  
  // 2. Simular chat dinâmico dos espectadores mandando mensagem
  const chatInt = setInterval(() => {
    if (STATE.myLiveViewerCount > 0) {
      const user = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
      
      const phrases = [
        "Olá, boa live!", "Adorei a câmera!", "Qual o seu setup?", "Legal demais",
        "Manda beijo!", "Oi, fala comigo!", "Bela live amigo", "Tamo junto!",
        "De onde você fala?", "Te dou nota 10!", "Gostei do filtro da live!"
      ];
      const comment = phrases[Math.floor(Math.random() * phrases.length)];
      addMyLiveComment(user, comment);
    }
  }, 3500);
  STATE.myLiveIntervals.push(chatInt);
  
  // 3. Simular presentes enviados para o usuário
  const giftInt = setInterval(() => {
    if (STATE.myLiveViewerCount > 5) {
      const user = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
      const gifts = [
        { name: "Rosa", coins: 1, icon: "🌹" },
        { name: "Chocolate", coins: 5, icon: "🍫" },
        { name: "Diamante", coins: 25, icon: "💎" },
        { name: "Coroa VIP", coins: 100, icon: "👑" }
      ];
      const g = gifts[Math.floor(Math.random() * gifts.length)];
      
      // Somente manda de maior valor se tiver mais audiência
      if (g.coins > 20 && Math.random() > 0.4) return;
      
      // Incrementar moedas/diamantes
      STATE.myLiveDiamonds += g.coins;
      DOM.myLiveDiamonds.textContent = `💎 ${STATE.myLiveDiamonds} acumulados`;
      
      // Exibir no chat
      addMyLiveComment(user, `enviou um(a) ${g.name} ${g.icon}`, false, true);
      
      // Emitir coração flutuante automático da esquerda
      emitAutoHeart();
    }
  }, 8000);
  STATE.myLiveIntervals.push(giftInt);
  
  // 4. Simular curtidas (corações flutuantes)
  const heartsInt = setInterval(() => {
    if (STATE.myLiveViewerCount > 2) {
      const loops = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < loops; i++) {
        setTimeout(emitAutoHeart, i * 400);
      }
    }
  }, 4000);
  STATE.myLiveIntervals.push(heartsInt);
}

function stopOwnLiveStream() {
  // Limpar loops de simulação
  STATE.myLiveIntervals.forEach(clearInterval);
  STATE.myLiveIntervals = [];
  
  // Parar webcam
  if (STATE.localStream) {
    STATE.localStream.getTracks().forEach(track => track.stop());
    STATE.localStream = null;
    DOM.goLiveVideo.srcObject = null;
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

// Emissão automática de corações flutuantes na live própria
function emitAutoHeart() {
  if (STATE.activeScreen !== "go-live") return;
  
  const heart = document.createElement("div");
  heart.className = "floating-heart";
  
  const colors = ["#ff4d6d", "#ff8ba0", "#f0b23d", "#ffffff"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  heart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${randomColor}">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;
  
  // Posicionar aleatoriamente perto do canto inferior direito
  const randomX = Math.floor(Math.random() * 60) + 260; // Entre 260px e 320px
  const randomY = Math.floor(Math.random() * 40) + 700; // Perto do rodapé
  const drift = (Math.random() * 80 - 40);
  
  heart.style.left = `${randomX}px`;
  heart.style.top = `${randomY}px`;
  heart.style.setProperty("--drift", `${drift}px`);
  
  // Adiciona ao container de tela do Go Live
  DOM.goLive.appendChild(heart);
  
  setTimeout(() => {
    heart.remove();
  }, 2200);
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

function renderProfilePosts() {
  const container = document.getElementById("profile-posts-grid-container");
  if (!container) return;

  container.innerHTML = "";

  STATE.myPosts.forEach(post => {
    const item = document.createElement("div");
    item.className = "post-grid-item";
    item.onclick = () => openPostLightbox(post.id);

    let mediaHtml = "";
    let indicatorHtml = "";

    if (post.type === "image") {
      mediaHtml = `<img src="${post.src}" alt="Post">`;
    } else {
      mediaHtml = `<video src="${post.src}" muted playsinline></video>`;
      indicatorHtml = `<div class="post-video-indicator">▶ Video</div>`;
    }

    item.innerHTML = `
      ${mediaHtml}
      ${indicatorHtml}
      <div class="post-grid-overlay">
        <span>❤️ ${post.likes}</span>
        <span>💬 ${post.comments.length}</span>
      </div>
    `;
    container.appendChild(item);
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

function publishNewPost() {
  const select = document.getElementById("post-media-preset");
  const caption = document.getElementById("post-caption-input").value.trim();
  const val = select.value;

  if (!val) return;

  const newPost = {
    id: STATE.myPosts.length + 1,
    type: STATE.currentPostType,
    src: val,
    caption: caption || "Sem legenda.",
    likes: 0,
    comments: []
  };

  STATE.myPosts.unshift(newPost); // Adicionar no topo
  renderProfilePosts();
  closeNewPostModal();
  showToast("Publicação realizada com sucesso!");
}

// Lightbox
function openPostLightbox(postId) {
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
  likes.textContent = `${post.likes} curtidas`;

  // Like button active status
  likeBtn.classList.remove("active");

  if (post.type === "image") {
    img.style.display = "block";
    video.style.display = "none";
    video.pause();
    img.src = post.src;
  } else {
    img.style.display = "none";
    video.style.display = "block";
    video.src = post.src;
    video.play().catch(e => console.log(e));
  }

  renderLightboxComments(post);
}

function closePostLightbox() {
  document.getElementById("modal-post-lightbox").style.display = "none";
  document.getElementById("lightbox-video").pause();
  STATE.activeLightboxPostId = null;
}

function renderLightboxComments(post) {
  const list = document.getElementById("lightbox-comments-list");
  list.innerHTML = "";

  if (post.comments.length === 0) {
    list.innerHTML = `<div style="font-size: 0.65rem; color: var(--light-gray); padding: 4px 0;">Nenhum comentário. Seja o primeiro!</div>`;
    return;
  }

  post.comments.forEach(c => {
    const item = document.createElement("div");
    item.className = "lightbox-comment-item";
    
    let vipPrefix = "";
    if ((c.author === "Você" || c.author === STATE.profileName) && STATE.isVIP) {
      vipPrefix = `<span style="color:var(--secondary); font-weight:900; margin-right:4px; font-size:0.55rem; background:rgba(240,178,61,0.15); padding:1px 3px; border-radius:3px; border:1px solid rgba(240,178,61,0.3);">VIP</span>`;
    }

    item.innerHTML = `${vipPrefix}<strong>${c.author}</strong> ${c.text}`;
    list.appendChild(item);
  });
}

function likeLightboxPost() {
  const post = STATE.myPosts.find(p => p.id === STATE.activeLightboxPostId);
  if (!post) return;

  const btn = document.querySelector("#modal-post-lightbox .btn-lightbox-like");
  
  if (btn.classList.contains("active")) {
    btn.classList.remove("active");
    post.likes--;
  } else {
    btn.classList.add("active");
    post.likes++;
  }

  document.getElementById("lightbox-likes-count").textContent = `${post.likes} curtidas`;
  renderProfilePosts(); // Atualizar contagem no grid
}

function addLightboxComment() {
  const input = document.getElementById("lightbox-new-comment");
  const text = input.value.trim();

  if (!text) return;

  const post = STATE.myPosts.find(p => p.id === STATE.activeLightboxPostId);
  if (!post) return;

  post.comments.push({
    author: "Você",
    text: text
  });

  input.value = "";
  renderLightboxComments(post);
  renderProfilePosts(); // Atualizar contador no grid
  
  if (typeof addXP === "function") {
    addXP(15);
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

function saveProfileChanges() {
  const newName = document.getElementById("edit-profile-name").value.trim();
  const newHandle = document.getElementById("edit-profile-handle").value.trim();
  const newBio = document.getElementById("edit-profile-bio").value.trim();

  if (!newName || !newHandle) {
    showToast("Nome e Username não podem ser vazios!");
    return;
  }

  // Atualizar na UI
  const nameEl = document.querySelector(".profile-bio-info h3");
  const handleEl = document.querySelector(".profile-handle");
  const bioEl = document.querySelector(".profile-bio-text");

  if (nameEl) nameEl.innerHTML = `${newName} <span class="premium-verified">✓</span>`;
  if (handleEl) handleEl.textContent = newHandle.startsWith("@") ? newHandle : "@" + newHandle;
  if (bioEl) bioEl.textContent = newBio;

  showToast("Alterações salvas com sucesso!");
  closeProfileSettingsModal();
}

function deleteAccount() {
  const confirmDelete = confirm("⚠️ ATENÇÃO: Tem certeza de que deseja EXCLUIR permanentemente a sua conta? Esta ação não poderá ser desfeita.");
  
  if (confirmDelete) {
    closeProfileSettingsModal();
    showToast("Excluindo conta...");
    
    setTimeout(() => {
      // Reiniciar dados de perfil para o padrão
      const nameEl = document.querySelector(".profile-bio-info h3");
      const handleEl = document.querySelector(".profile-handle");
      const bioEl = document.querySelector(".profile-bio-text");
      
      if (nameEl) nameEl.innerHTML = `Novo Usuário <span class="premium-verified">✓</span>`;
      if (handleEl) handleEl.textContent = "@novousuario";
      if (bioEl) bioEl.textContent = "Olá! Acabei de me juntar ao VibeLive.";

      STATE.myPosts = []; // Limpar postagens
      renderProfilePosts();

      // Deslogar
      STATE.isLoggedIn = false;
      navigateTo("auth");
      showToast("Sua conta foi excluída com sucesso.");
    }, 1200);
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

function initiatePkSimulator() {
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

  // Resetar pontuações no estado
  STATE.pkScoreA = 12500;
  STATE.pkScoreB = 10200;
  STATE.pkIntervals = [];

  // Atualizar pontuação gráfica na tela
  updatePkBars();

  // Limpar chat anterior do PK
  chatMessages.innerHTML = "";
  addPkSystemMessage("Batalha PK iniciada! Apoie sua streamer enviando presentes! ⚔️");

  // 1. Simular chat dinâmico da batalha
  const chatInt = setInterval(() => {
    const user = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
    const pkComments = [
      "VAI MORANGUINHO!! 🍓🔥", "Luana Becker rainha! 👑", "Mandei presentes!",
      "Nossa, batalha disputada!", "Moranguinho vai vencer com certeza!",
      "Luana linda de mais", "Duas perfeitas!", "Manda corações galera!",
      "Rosa nela!! 🌹🌹", "Diamante pra Luana! 💎💎"
    ];
    const text = pkComments[Math.floor(Math.random() * pkComments.length)];
    
    // Adiciona comentário de usuário no chat
    const msgEl = document.createElement("div");
    msgEl.className = "chat-msg";
    msgEl.innerHTML = `<span class="msg-author">${user}:</span> <span class="msg-content">${text}</span>`;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 1800);
  STATE.pkIntervals.push(chatInt);

  // 2. Simular pequenas flutuações de pontos da audiência automática
  const pointsInt = setInterval(() => {
    // Adiciona pontos aleatórios a ambos os lados
    STATE.pkScoreA += Math.floor(Math.random() * 50) + 10;
    STATE.pkScoreB += Math.floor(Math.random() * 55) + 10;
    updatePkBars();

    // 15% de chance de emitir corações automáticos de apoio
    if (Math.random() < 0.25) {
      const side = Math.random() < 0.5 ? "A" : "B";
      emitPkAutoHeart(side);
    }
  }, 1500);
  STATE.pkIntervals.push(pointsInt);
}

function closePkSimulator() {
  const videoA = document.getElementById("pk-video-a");
  const videoB = document.getElementById("pk-video-b");

  if (videoA) videoA.pause();
  if (videoB) videoB.pause();

  // Limpar intervalos
  if (STATE.pkIntervals) STATE.pkIntervals.forEach(clearInterval);
  STATE.pkIntervals = [];

  // Resetar Badges de Vencedor
  document.getElementById("pk-win-a").style.display = "none";
  document.getElementById("pk-win-b").style.display = "none";
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

function supportStreamer(side, event) {
  const cost = side === "A" ? 1 : 25;
  const giftName = side === "A" ? "Rosa 🌹" : "Diamante 💎";
  const points = side === "A" ? 100 : 250;
  const streamerName = side === "A" ? "MORANGUINHO 🍓" : "Luana Becker 👑";

  if (STATE.myCoins < cost) {
    showToast("Saldo de moedas insuficiente. Recarregue no Perfil!");
    return;
  }

  // Deduzir moedas
  STATE.myCoins -= cost;
  renderCoins();

  // Somar pontos
  if (side === "A") {
    STATE.pkScoreA += points;
  } else {
    STATE.pkScoreB += points;
  }

  updatePkBars();

  // Mostrar aviso de presente na tela
  showToast(`Você enviou um(a) ${giftName} para apoiar ${streamerName}!`);

  // Adicionar aviso de presente no chat
  const chatMessages = document.getElementById("pk-chat-messages");
  const msgEl = document.createElement("div");
  msgEl.className = "chat-msg gift-ann";
  msgEl.innerHTML = `<span class="msg-author">Você</span> <span class="msg-content">enviou um(a) ${giftName} (+${points} pts)</span>`;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Emitir corações flutuantes baseados nas coordenadas do clique
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      emitPkHeartFromClick(side, event);
    }, i * 200);
  }

  // Simular agradecimento do streamer apoiado
  setTimeout(() => {
    const thanks = [
      `Aee! Obrigada pelo apoio no PK, você é demais! ❤️`,
      `Obrigada pelo presente! Batalha garantida com você! 😍`,
      `Nossa, salvou meu PK! Valeu pelo carinho! ✨`
    ];
    const text = thanks[Math.floor(Math.random() * thanks.length)];
    const replyEl = document.createElement("div");
    replyEl.className = "chat-msg system";
    replyEl.innerHTML = `<span class="msg-content"><strong>${streamerName}</strong>: ${text}</span>`;
    chatMessages.appendChild(replyEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 1200);

  // Verificar se venceu
  checkPkWinner();
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

// Coração flutuante gerado automaticamente pela audiência virtual
function emitPkAutoHeart(side) {
  const container = document.getElementById("pk-hearts-container");
  if (!container || STATE.activeScreen !== "pk-simulator") return;

  const heart = document.createElement("div");
  heart.className = "floating-heart";

  const color = side === "A" ? "#ff8ba0" : "#8cc4ff";
  
  heart.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${color}">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;

  const randomX = side === "A" 
    ? Math.floor(Math.random() * 60) + 30 
    : Math.floor(Math.random() * 60) + 230;
    
  const drift = (Math.random() * 80 - 40);
  
  heart.style.left = `${randomX}px`;
  heart.style.top = `450px`;
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
    document.getElementById("auth-username").placeholder = "E-mail ou Celular";
  } else {
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
    submitBtn.textContent = "Criar Conta";
    document.getElementById("auth-username").placeholder = "Nome, E-mail ou Celular";
  }
}

function handleAuthSubmit() {
  const userField = document.getElementById("auth-username").value.trim();
  const passwordField = document.getElementById("auth-password").value.trim();

  if (!userField || !passwordField) {
    showToast("Por favor, preencha as credenciais!");
    return;
  }

  showToast("Autenticando...");
  
  setTimeout(() => {
    STATE.isLoggedIn = true;
    
    // Atualizar dados do perfil com o nome digitado no formulário
    const nameEl = document.querySelector(".profile-bio-info h3");
    const handleEl = document.querySelector(".profile-handle");
    
    if (nameEl) nameEl.innerHTML = `${userField} <span class="premium-verified">✓</span>`;
    if (handleEl) {
      let handle = userField.toLowerCase().replace(/\s+/g, '.');
      handleEl.textContent = `@${handle}`;
    }

    showToast(STATE.authMode === "login" ? "Login realizado com sucesso!" : "Conta criada com sucesso!");
    
    // Limpar campos
    document.getElementById("auth-username").value = "";
    document.getElementById("auth-password").value = "";
    
    navigateTo("discover");
  }, 1000);
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

function handleLogout() {
  showToast("Saindo...");
  
  setTimeout(() => {
    STATE.isLoggedIn = false;
    navigateTo("auth");
    showToast("Sessão encerrada!");
  }, 800);
}

function sendQuickRose(event) {
  if (STATE.myCoins < 1) {
    showToast("Saldo de moedas insuficiente. Recarregue no Perfil!");
    return;
  }

  // Deduzir 1 moeda
  STATE.myCoins -= 1;
  renderCoins();

  // Acionar aviso visual do presente na tela
  triggerGiftAnnouncement("🌹", "Você enviou uma Rosa");

  // Adicionar comentário especial no chat
  if (STATE.currentLiveBroadcaster) {
    addLiveComment("Você", "enviou uma Rosa 🌹", false, true);

    // Emitir corações flutuantes baseados nas coordenadas do clique
    triggerFloatingHeart(event);

    // Simular agradecimento da streamer
    setTimeout(() => {
      if (STATE.currentLiveBroadcaster && STATE.activeScreen === "live-room") {
        const streamerName = STATE.currentLiveBroadcaster.name;
        const thanks = [
          `Nossa, obrigada pela rosa! 🌹❤️`,
          `Que linda! Amei a rosa! 😍`,
          `Obrigada pelo presente! Beijos! 💋`
        ];
        const text = thanks[Math.floor(Math.random() * thanks.length)];
        addLiveComment(streamerName, text);
      }
    }, 1200);
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

const PRESET_PROFILES = [
  {
    name: "Alexandre Silva",
    handle: "zcitando",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    bio: "Criador digital • Focado em lives interativas 🎬🍿",
    following: "12",
    followers: "145",
    likes: "3,2k"
  },
  {
    name: "Luana Becker",
    handle: "luana.becker",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    bio: "👑 Streamer Premium • Batalhas diárias às 21h ⚔️",
    following: "420",
    followers: "12,5k",
    likes: "84k"
  },
  {
    name: "Gabi Silva",
    handle: "gabi.silva",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    bio: "Entediada o dia todo. Vamos conversar no Direct? 🥱✨",
    following: "85",
    followers: "1,2k",
    likes: "5,4k"
  }
];

function selectPresetProfile(idx) {
  const p = PRESET_PROFILES[idx];
  if (!p) return;

  STATE.isLoggedIn = true;

  // Atualizar DOM do perfil
  const nameEl = document.querySelector(".profile-bio-info h3");
  const handleEl = document.querySelector(".profile-handle");
  const bioEl = document.querySelector(".profile-bio-text");
  const avatarEl = document.querySelector(".profile-main-avatar");
  
  const statsElements = document.querySelectorAll(".quick-stat-box .stat-number");

  if (nameEl) nameEl.innerHTML = `${p.name} <span class="premium-verified">✓</span>`;
  if (handleEl) handleEl.textContent = `@${p.handle}`;
  if (bioEl) bioEl.textContent = p.bio;
  if (avatarEl) avatarEl.src = p.avatar;

  if (statsElements && statsElements.length >= 3) {
    statsElements[0].textContent = p.following;
    statsElements[1].textContent = p.followers;
    statsElements[2].textContent = p.likes;
  }

  showToast(`Logado como ${p.name}!`);
  navigateTo("discover");
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

function spinRoulette() {
  if (STATE.myCoins < 10) {
    showToast("Moedas insuficientes! Recarregue na carteira. 🪙");
    return;
  }

  // Descontar moedas e atualizar displays
  STATE.myCoins -= 10;
  renderCoins();
  if (typeof addXP === "function") {
    addXP(30); // Ganhar 30 XP por interagir com minijogos!
  }

  const btn = document.getElementById("btn-spin-roulette");
  if (btn) btn.disabled = true;

  const wheel = document.getElementById("roulette-wheel-inner");
  if (!wheel) return;

  // Resetar rotação anterior antes de girar de verdade
  wheel.style.transition = "none";
  wheel.style.transform = "rotate(0deg)";

  // Permitir que o browser processe a rotação resetada
  setTimeout(() => {
    wheel.style.transition = "transform 4s cubic-bezier(0.17, 0.67, 0.1, 1)";
    const spins = 5;
    const degrees = spins * 360 + Math.floor(Math.random() * 360);
    wheel.style.transform = `rotate(${degrees}deg)`;

    const sector = 360 - (degrees % 360);
    let prize = "";
    if (sector >= 0 && sector < 72) prize = "Super Beijo 💖";
    else if (sector >= 72 && sector < 144) prize = "Abraço Virtual 🤗";
    else if (sector >= 144 && sector < 216) prize = "Dueto VIP 👑";
    else if (sector >= 216 && sector < 288) prize = "Parabéns Especial 🎉";
    else prize = "Mentoria Exclusiva ⭐";

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

function addXP(amount) {
  STATE.xp += amount;
  
  const xpNeeded = STATE.level * 500;
  if (STATE.xp >= xpNeeded) {
    STATE.xp -= xpNeeded;
    STATE.level += 1;
    showToast(`Parabéns! Você subiu para o Nível ${STATE.level}! 🎉`);
  }
  
  updateXPProgressUI();
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

function claimDailyCheckIn() {
  const currentClaimCount = STATE.claimedDays.length;
  if (currentClaimCount >= 7) {
    showToast("Você já completou todo o calendário semanal! 🗓️");
    return;
  }

  const nextDay = currentClaimCount + 1;
  STATE.claimedDays.push(nextDay);

  let coinsReward = nextDay * 5;
  
  if (nextDay === 7) {
    coinsReward = 50;
    STATE.isVIP = true;
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

  STATE.myCoins += coinsReward;
  renderCoins();
  addXP(100);

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

function purchaseVIPBadge() {
  if (STATE.isVIP) {
    showToast("Você já possui o Passe VIP Ouro ativo! 👑");
    return;
  }

  if (STATE.myCoins < 100) {
    showToast("Moedas insuficientes! VIP Ouro custa 100 moedas. 🪙");
    return;
  }

  STATE.myCoins -= 100;
  STATE.isVIP = true;
  renderCoins();
  addXP(250);
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

