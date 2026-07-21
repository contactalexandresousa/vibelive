# VibeLive

App de lives ao vivo (estilo TikTok Live / Bigo) com backend real: contas, carteira, vídeo, chat, pagamento e moderação de verdade — não é um protótipo com dados simulados.

**Demo:** https://contactalexandresousa.github.io/vibelive/

![VibeLive preview](og-image.png)

## O que é real

- **Contas de verdade** — cadastro por e-mail/senha ou acesso como visitante (conta anônima real, própria e privada). Recuperação de senha por e-mail e exclusão de conta permanente (apaga tudo: saldo, posts, seguidores, mensagens).
- **Carteira com proteção real** — moedas, XP e nível só mudam através de funções no servidor que decidem o valor internamente; o cliente nunca envia uma quantia. Reforçado por um trigger no banco que reverte qualquer tentativa de alterar essas colunas direto pela API.
- **Vídeo ao vivo real** — quem clica em "Transmitir" publica a própria câmera via WebRTC (LiveKit); qualquer pessoa pode entrar e assistir o vídeo de verdade, sem gravação nem replay.
- **Chat e presentes sincronizados** — mensagens da sala de live, presentes e contagem de espectadores (via Presence) chegam em tempo real pra todo mundo assistindo, via Supabase Realtime.
- **Mensagens diretas reais** — conversas privadas persistidas e sincronizadas entre contas reais.
- **PIX real** — recarga de moedas via Mercado Pago: QR code genuíno, crédito de moedas só acontece quando o webhook do Mercado Pago confirma o pagamento (nunca por um botão no cliente).
- **Bloqueio e denúncia** — bloquear alguém esconde a pessoa da busca, do chat e da lista de "ao vivo agora"; reforçado no banco (um trigger impede envio de DM entre contas bloqueadas, nos dois sentidos). Denúncias ficam registradas e visíveis num painel de moderação restrito a administradores.
- **Notificações reais** — novo seguidor e "pessoa que você segue foi ao vivo" chegam via Realtime, geradas por triggers no banco.
- **Perfil real** — foto de perfil enviada de verdade (Supabase Storage), contadores de seguidores/seguindo/curtidas calculados a partir dos dados reais.

Não existem bots, respostas automáticas ou números fixos escondidos na interface — qualquer contagem ou atividade que aparece na tela reflete o banco de dados.

## O que ainda é ilustrativo

Os perfis de streamers exibidos como conteúdo de descoberta foram removidos — a tela "Ao Vivo Agora" só mostra transmissões reais, e fica vazia quando ninguém está transmitindo. A roleta e o sistema de níveis usam prêmios/recompensas com valores fixos definidos no servidor (não é simulação insegura, só não tem variação dinâmica de mercado).

## Stack

Frontend: `index.html` + `styles.css` + `app.js`, vanilla JS — sem build, sem framework, sem dependência de bundler.

Backend: [Supabase](https://supabase.com) (Postgres + Auth + Realtime + Storage) com Row Level Security em todas as tabelas, funções `SECURITY DEFINER` para qualquer operação que mexe em saldo, e Edge Functions (Deno) para as poucas ações que exigem um segredo do lado do servidor (Mercado Pago, LiveKit, exclusão de conta). Vídeo ao vivo via [LiveKit Cloud](https://livekit.io). Pagamento via [Mercado Pago](https://www.mercadopago.com.br).

A chave pública do Supabase (`sb_publishable_...`) e a URL do WebSocket do LiveKit ficam expostas em `supabase-client.js` de propósito — são seguras por design, a segurança vem das políticas de RLS no banco, não do sigilo dessas strings. Nenhum segredo de verdade (Access Token do Mercado Pago, API Secret do LiveKit, Service Role Key do Supabase) aparece em nenhum arquivo do repositório; eles só existem como variáveis de ambiente das Edge Functions.

## Rodar localmente

Não precisa de build. Basta servir os arquivos estáticos:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`. Como o app fala direto com o projeto Supabase de produção (a chave pública já vem embutida), rodar localmente já dá acesso a todas as funcionalidades reais — não é preciso configurar nada a mais para navegar, criar conta e testar.

## Schema do banco

As migrations em `supabase/migrations/` são a fonte da verdade do schema — cada arquivo documenta, no próprio comentário, o motivo da mudança (inclusive correções de bugs reais encontrados durante o desenvolvimento, como problemas de sintaxe do Postgres, sobrecarga de funções e RLS incompleta).
