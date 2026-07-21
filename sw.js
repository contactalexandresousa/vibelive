// Sem cache de propósito: o VibeLive depende de dados em tempo real (Supabase
// Realtime, LiveKit, PIX) — servir uma versão antiga do app a partir de cache
// seria pior do que não instalar nada. Esse service worker só existe pra
// satisfazer o critério de instalação (Add to Home Screen) dos navegadores.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
