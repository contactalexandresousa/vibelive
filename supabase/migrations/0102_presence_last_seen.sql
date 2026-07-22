-- As conversas já mostram "visto" (confirmação de leitura, 0062) e
-- "digitando…" (Realtime Broadcast, sem tabela), mas nada indica se a outra
-- pessoa está online agora ou quando foi vista por último. last_seen_at é
-- de leitura pública, igual o resto de profiles (RLS "profiles are publicly
-- readable" já cobre) — só a coluna nova, sem policy nova. Escrita usa a
-- policy de UPDATE que já existe ("users update own profile display
-- fields", 0001) — coluna não está na lista de revoke (coins/xp/level/is_vip),
-- então o cliente já pode atualizar direto, sem precisar de RPC.
alter table public.profiles add column last_seen_at timestamptz;
