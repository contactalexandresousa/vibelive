-- Perfis de usuário real, ligados a auth.users do Supabase.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text default 'Criador digital no VibeLive 🎬',
  avatar_url text default 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  coins int not null default 99,
  xp int not null default 0,
  level int not null default 1,
  is_vip boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Qualquer pessoa logada pode ler qualquer perfil (app social).
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

-- Cada usuário só edita campos não-econômicos do próprio perfil (nome, bio, avatar).
-- coins/xp/level/is_vip NUNCA são atualizáveis por UPDATE direto do cliente — só via RPC.
create policy "users update own profile display fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update (coins, xp, level, is_vip) on public.profiles from authenticated, anon;

-- Cria o profile automaticamente quando uma conta nova é criada (e-mail ou anônima).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'visitante_' || substr(new.id::text, 1, 8)),
    coalesce(split_part(new.email, '@', 1), 'Visitante')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
