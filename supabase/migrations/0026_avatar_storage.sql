-- Upload real de foto de perfil. Até aqui todo avatar era uma foto fixa do
-- Unsplash — não dava pra trocar por uma imagem de verdade. Bucket público
-- (avatares já são informação pública, igual o resto do perfil), mas só o
-- dono pode escrever no próprio arquivo — o caminho é sempre
-- "<user_id>/avatar.<ext>", reforçado via storage.foldername(name).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
