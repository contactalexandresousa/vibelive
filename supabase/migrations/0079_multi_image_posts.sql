-- Publicação hoje aceita só uma foto ou vídeo. media_urls guarda o conjunto
-- completo quando o post é um carrossel de várias fotos (só imagem — vídeo
-- continua sempre um arquivo só, sem mudança nenhuma pra posts existentes:
-- media_url/media_type continuam a "capa" igual sempre foram, então toda
-- grade/thumbnail que já lê esses dois campos não precisa mudar nada).
alter table public.posts add column media_urls text[];
