-- Contagem real de espectadores por live, pra ranquear "Vibe Hot" no
-- Discover (antes só existia enquanto alguém estava dentro da própria sala —
-- não dava pra saber de fora quem tinha mais gente assistindo agora).
-- Atualizado pelo próprio transmissor via Presence (mesmo mecanismo já
-- usado do lado de quem assiste).
alter table public.live_sessions add column viewer_count int not null default 0;
