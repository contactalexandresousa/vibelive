-- A policy original só deixava cada um ver os PRÓPRIOS follows (auth.uid() =
-- follower_id) — fazia sentido quando só dava pra seguir streamers mockados
-- (ninguém precisava consultar "quem segue esse streamer"). Agora que contas
-- reais podem ser seguidas, isso impedia calcular o contador real de
-- "Seguidores" de qualquer um (a própria pessoa não conseguia ver quem a
-- segue). Lista de seguidores é informação pública em qualquer rede social,
-- então abre a leitura pra todo mundo — igual profiles/posts.
drop policy "users read own follows" on public.follows;

create policy "anyone can read follows"
  on public.follows for select
  using (true);
