-- Mesma lacuna já resolvida pra posts (0047): dono do comentário não tinha
-- controle nenhum sobre ele depois de publicado. Diferente de add_post_comment
-- (que concede XP e por isso precisa ser SECURITY DEFINER), editar/apagar não
-- mexe em economia — RLS simples por dono da linha já basta, mesmo raciocínio
-- usado em "users update their own posts" (0047).
create policy "users delete their own comments"
  on public.post_comments for delete
  using (auth.uid() = user_id);

create policy "users update their own comments"
  on public.post_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
