-- Hoje o dono do post só pode denunciar um comentário abusivo na própria
-- publicação (0096) e esperar revisão do admin — não consegue removê-lo
-- direto, diferente de qualquer rede social. Amplia a policy de delete
-- (0063, só o autor do comentário) pra também aceitar o dono do post.
alter policy "users delete their own comments"
  on public.post_comments
  using (
    auth.uid() = user_id
    or auth.uid() = (select p.user_id from public.posts p where p.id = post_comments.post_id)
  );
