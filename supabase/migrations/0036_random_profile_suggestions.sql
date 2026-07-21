-- Antes de digitar algo, a busca de perfis só mostrava um texto de
-- instrução. Agora sugere gente real registrada na plataforma. RPC porque
-- o cliente do Supabase não expõe "order by random()" via .order() comum.
-- Retorna só as colunas já expostas publicamente em outras buscas (nunca
-- coins/is_admin/etc — profiles tem RLS de leitura ampla, então "select *"
-- vazaria saldo e outras colunas sensíveis de qualquer pessoa).
create or replace function public.get_random_profiles(p_limit int default 8)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  private_content_price int
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.private_content_price
  from public.profiles p
  order by random()
  limit p_limit;
$$;
