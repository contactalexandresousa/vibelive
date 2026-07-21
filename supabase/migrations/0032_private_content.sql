-- Conteúdo privado com preço definido por cada criador. Reaproveita o
-- sistema de moedas já existente (elas mesmas só entram via PIX real do
-- Mercado Pago ou ações gratuitas) em vez de criar um segundo fluxo de
-- pagamento direto — mesmo padrão já usado pra presentes/VIP: desbloqueio é
-- uma transferência atômica de moedas de quem compra pra quem criou.
-- É um desbloqueio permanente (pagamento único), não assinatura recorrente
-- — PIX não suporta cobrança recorrente, só cartão faria isso no Mercado Pago.

alter table public.profiles add column private_content_price int;

alter table public.posts add column is_private boolean not null default false;

create table public.private_content_unlocks (
  unlocker_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (unlocker_id, creator_id)
);

alter table public.private_content_unlocks enable row level security;

-- Cada um vê os próprios desbloqueios (o que já comprou) e cada criador vê
-- quem desbloqueou o próprio conteúdo.
create policy "unlocker or creator can read unlock"
  on public.private_content_unlocks for select
  using (auth.uid() = unlocker_id or auth.uid() = creator_id);
-- Sem policy de insert: só a função unlock_private_content (abaixo) escreve,
-- porque precisa ser atômico com o débito/crédito de moedas.

-- Substitui a policy antiga (tudo público) por uma que esconde posts
-- privados de quem não pagou. Dono sempre vê os próprios.
drop policy "posts are publicly readable" on public.posts;

create policy "public posts are readable by anyone, private posts only by unlockers"
  on public.posts for select
  using (
    not is_private
    or auth.uid() = user_id
    or exists (
      select 1 from public.private_content_unlocks u
      where u.creator_id = posts.user_id and u.unlocker_id = auth.uid()
    )
  );

alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'gift', 'gift_received', 'quick_rose', 'quick_rose_received',
    'pk_support', 'vip_purchase', 'roulette_spin', 'daily_checkin', 'pix_recharge',
    'private_content_unlock', 'private_content_sale'
  ));

create or replace function public.unlock_private_content(p_creator_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_price int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if v_uid = p_creator_id then
    raise exception 'Você já tem acesso ao próprio conteúdo';
  end if;

  select private_content_price into v_price from public.profiles where id = p_creator_id;
  if v_price is null or v_price <= 0 then
    raise exception 'Esse criador não vende conteúdo privado';
  end if;

  perform public._spend_coins(v_price, 'private_content_unlock', jsonb_build_object('creator_id', p_creator_id));
  perform public._credit_coins_to(p_creator_id, v_price, 'private_content_sale', jsonb_build_object('buyer', v_uid));

  insert into public.private_content_unlocks (unlocker_id, creator_id)
    values (v_uid, p_creator_id)
    on conflict (unlocker_id, creator_id) do nothing;

  return (select p from public.profiles p where id = v_uid);
end;
$$;
