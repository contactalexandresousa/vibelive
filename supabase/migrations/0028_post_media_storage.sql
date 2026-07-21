-- Upload real de mídia em publicações. Até aqui, "Nova Publicação" só deixava
-- escolher entre fotos/vídeos de estoque fixos (rotulado "MÍDIA DEMO" na tela)
-- — não existia upload de verdade. Mesmo padrão do bucket de avatares (0026):
-- bucket público (posts já são conteúdo público), mas só o dono escreve no
-- próprio caminho "<user_id>/<arquivo>", reforçado via storage.foldername(name).
insert into storage.buckets (id, name, public, file_size_limit)
values ('posts', 'posts', true, 26214400) -- 25MB
on conflict (id) do nothing;

create policy "post media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'posts');

create policy "users can upload their own post media"
  on storage.objects for insert
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own post media"
  on storage.objects for delete
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
