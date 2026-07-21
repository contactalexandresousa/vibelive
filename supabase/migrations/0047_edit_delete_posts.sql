-- Até aqui quem publicava um post não tinha nenhum controle sobre ele depois
-- — sem editar legenda/privacidade, sem excluir. Lacuna básica de qualquer
-- rede social. Dono do post decide; RLS trava por linha (user_id = auth.uid()),
-- mesma base já usada em profiles/bio.
create policy "users delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

create policy "users update their own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
