-- Painel de moderação de denúncias. Até aqui as denúncias eram salvas
-- (user_reports, migration 0023) mas ninguém conseguia vê-las — a RLS só
-- deixava cada denunciante ver a PRÓPRIA denúncia enviada, não uma visão
-- geral. Adiciona uma flag de administrador (marcada manualmente via SQL,
-- não existe fluxo de auto-promoção — seria um furo de segurança óbvio) e
-- políticas extras que dão acesso de leitura/revisão só pra quem tem a flag.
alter table public.profiles add column is_admin boolean not null default false;

-- CRÍTICO: sem proteção, qualquer pessoa logada poderia se auto-promover a
-- admin com um simples sb.from('profiles').update({is_admin: true}) na
-- própria linha (a policy de update de profiles só verifica "é o dono da
-- linha", não quais colunas). REVOKE de coluna NÃO resolve isso — já foi
-- tentado com coins/xp/level/is_vip (migration 0001) e confirmado que a
-- plataforma Supabase reaplica grants amplos, desfazendo o REVOKE manual
-- (migration 0010). A defesa que realmente funciona é o trigger
-- _protect_profile_economy (0010/0011), que já reverte updates dessas
-- colunas quando não vêm de uma função SECURITY DEFINER dona de "postgres" —
-- estende ele pra proteger is_admin também, em vez de duplicar a lógica.
create or replace function public._protect_profile_economy()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    new.coins := old.coins;
    new.xp := old.xp;
    new.level := old.level;
    new.is_vip := old.is_vip;
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

alter table public.user_reports add column reviewed_at timestamptz;

-- Política adicional (soma com "users view their own submitted reports" de
-- 0023 — políticas permissivas da mesma operação se combinam com OR).
create policy "admins can read all reports"
  on public.user_reports for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "admins can mark reports reviewed"
  on public.user_reports for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
