-- Toda live cai no mesmo grid hoje, sem nenhuma forma de descobrir por tipo
-- de conteúdo — só dá pra filtrar por "Vibe Hot/Nova/Privada" (0020+), que
-- são critérios de engajamento/conta, não de assunto. category é opcional
-- (quem não escolher continua aparecendo em "Todos", só não entra nos
-- filtros específicos) — lista fixa, mesmo padrão de enum-via-check já usado
-- em media_type/notification type/etc. nesse projeto.
alter table public.live_sessions add column category text
  check (category is null or category in ('chat', 'musica', 'games', 'culinaria', 'esporte', 'arte', 'outros'));
