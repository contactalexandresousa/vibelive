-- DM hoje só aceita texto (a coluna nem existia pra imagem) — enviar foto
-- numa conversa privada é expectativa básica de qualquer app de mensagem.
-- Mesmo padrão de bucket do avatar/post media (0026/0028): bucket público,
-- mas só o dono escreve no próprio caminho "<user_id>/<arquivo>". Sendo
-- público, a URL não é protegida pela RLS de direct_messages (só quem sabe o
-- link exato consegue abrir) — mesmo modelo já aceito pra post media aqui,
-- não uma garantia de privacidade forte, mas suficiente pro estágio atual.
insert into storage.buckets (id, name, public, file_size_limit)
values ('dm-media', 'dm-media', true, 15728640) -- 15MB
on conflict (id) do nothing;

create policy "dm media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'dm-media');

create policy "users can upload their own dm media"
  on storage.objects for insert
  with check (bucket_id = 'dm-media' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.direct_messages alter column text drop not null;
alter table public.direct_messages drop constraint direct_messages_text_check;
alter table public.direct_messages add column image_url text;
alter table public.direct_messages add constraint direct_messages_text_check
  check (
    (text is not null and char_length(text) between 1 and 1000) or image_url is not null
  );
