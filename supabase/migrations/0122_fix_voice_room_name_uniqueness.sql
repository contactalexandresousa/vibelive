-- Bug real encontrado em teste: room_name é sempre voice-<hostId>, igual
-- pra toda sala que a mesma pessoa já criou (encerrada ou não) — a unique
-- constraint em cima da coluna inteira (0121) barrava qualquer anfitrião de
-- criar uma SEGUNDA sala pra sempre, já na primeira reutilização. A garantia
-- que de fato importa (não ter duas salas ATIVAS com o mesmo nome ao mesmo
-- tempo) já é feita pelo índice parcial em host_id — mesmo padrão já usado
-- em live_sessions (0020), que nunca teve unique em room_name por esse
-- motivo exato.
alter table public.voice_rooms drop constraint voice_rooms_room_name_key;
