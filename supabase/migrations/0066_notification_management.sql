-- Notificação hoje é só marcada como lida (automaticamente, ao abrir o
-- painel) — não existe nenhuma forma de apagar uma notificação específica
-- nem limpar a lista toda. RLS simples por dono, mesmo raciocínio já usado
-- em post/comentário (0047/0063): dono da linha decide, sem precisar de RPC.
create policy "users delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);
