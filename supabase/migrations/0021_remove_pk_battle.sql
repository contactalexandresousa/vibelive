-- A Batalha PK era uma tela específica entre dois personagens fictícios
-- (Moranguinho vs Luana Becker). Com a remoção de todos os perfis fictícios,
-- a tela não faz mais sentido e foi removida do cliente — esta migration
-- remove a RPC e a tabela que só existiam para sustentá-la, evitando deixar
-- infraestrutura órfã no banco.
drop function if exists public.support_pk(text, text);
drop table if exists public.pk_battle_events;
