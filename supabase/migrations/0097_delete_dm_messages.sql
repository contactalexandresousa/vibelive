-- Não existe nenhuma forma de apagar uma DM enviada por engano — hoje fica
-- na conversa pra sempre. "Apagar para mim" some só do MEU lado (a outra
-- pessoa nunca sabe); "apagar para todos" (só quem enviou, até 15min depois,
-- igual WhatsApp) apaga o conteúdo de verdade nas duas pontas — is_deleted
-- vira a marca visível ("Mensagem apagada"), text/image_url somem do banco
-- de propósito (não é só esconder na UI).
alter table public.direct_messages add column deleted_by_sender boolean not null default false;
alter table public.direct_messages add column deleted_by_recipient boolean not null default false;
alter table public.direct_messages add column is_deleted boolean not null default false;

alter table public.direct_messages drop constraint direct_messages_text_check;
alter table public.direct_messages add constraint direct_messages_text_check
  check (
    is_deleted or (text is not null and char_length(text) between 1 and 1000) or image_url is not null
  );

-- Já existia policy de UPDATE só pro destinatário (marcar como lida) — apagar
-- precisa valer pros dois lados com regras diferentes por caso (só o
-- remetente apaga "pra todos", qualquer um dos dois apaga "pra mim"), então
-- roda como RPC (mesmo motivo de toda ação sensível nesse app: regra de
-- negócio no servidor, não policy solta). SECURITY DEFINER dispensa policy
-- de UPDATE nova pro remetente.
create function public.delete_my_message(p_message_id uuid, p_for_everyone boolean default false)
returns public.direct_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.direct_messages;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_msg from public.direct_messages where id = p_message_id;
  if v_msg.id is null then
    raise exception 'Mensagem não encontrada.';
  end if;
  if v_msg.sender_id <> v_uid and v_msg.recipient_id <> v_uid then
    raise exception 'Você não participa dessa conversa.';
  end if;

  if p_for_everyone then
    if v_msg.sender_id <> v_uid then
      raise exception 'Só quem enviou pode apagar para todos.';
    end if;
    if v_msg.created_at < now() - interval '15 minutes' then
      raise exception 'Só é possível apagar para todos até 15 minutos após o envio.';
    end if;
    update public.direct_messages
      set text = null, image_url = null, is_deleted = true
      where id = p_message_id
      returning * into v_msg;
  else
    if v_msg.sender_id = v_uid then
      update public.direct_messages set deleted_by_sender = true where id = p_message_id returning * into v_msg;
    else
      update public.direct_messages set deleted_by_recipient = true where id = p_message_id returning * into v_msg;
    end if;
  end if;

  return v_msg;
end;
$$;

-- Owner podia enviar mídia de DM (0062) mas nunca apagar o arquivo do
-- Storage — nem no "apagar para todos" (que precisa remover a foto de
-- verdade, não só desvincular a linha). Mesmo padrão de posts (0028).
create policy "users can delete their own dm media"
  on storage.objects for delete
  using (bucket_id = 'dm-media' and (storage.foldername(name))[1] = auth.uid()::text);
