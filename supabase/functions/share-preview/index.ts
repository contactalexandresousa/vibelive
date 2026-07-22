// Compartilhar um link de perfil/post hoje sempre mostrava a MESMA prévia
// genérica do app (og:title/og:image fixos no index.html — GitHub Pages é
// puramente estático, não tem como servir meta tag diferente por URL). Essa
// função resolve isso sem precisar de servidor próprio nem domínio novo:
// o link compartilhado aponta pra CÁ, e:
//   - bot de rede social (que só lê o HTML, não executa JS) recebe uma
//     página mínima com <meta og:*> corretos pro perfil/post específico;
//   - navegador de gente de verdade é redirecionado (JS + meta refresh) pro
//     link real do app, que abre o perfil/post via handleSharedDeepLink (app.js).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = "sb_publishable_vgVCQ6DxZV9D6NYL0Gz0SQ_3BM8BsDe"; // mesma chave pública do supabase-client.js
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://contactalexandresousa.github.io/vibelive/";
const DEFAULT_IMAGE = `${SITE_URL}og-image.png`;

const CRAWLER_UA_PATTERN = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|Discordbot|LinkedInBot|TelegramBot|Googlebot|bingbot|Pinterest|redditbot|SkypeUriPreview|Applebot/i;

// Quem não tem foto própria tem avatar_url guardado como um data: URI (SVG
// gerado, ver DEFAULT_AVATAR_DATA_URI em app.js) — rede social não aceita
// isso como og:image (precisa ser uma URL http(s) de verdade que ela
// consegue baixar), então cai pra imagem estática padrão nesse caso.
function resolveImage(candidate: string | null | undefined): string {
  if (candidate && candidate.startsWith("http")) return candidate;
  return DEFAULT_IMAGE;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderHtml(opts: { title: string; description: string; image: string; canonicalUrl: string; redirectTo: string | null }) {
  const { title, description, image, canonicalUrl, redirectTo } = opts;
  const redirectTags = redirectTo
    ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectTo)}">
    <script>location.replace(${JSON.stringify(redirectTo)});</script>`
    : "";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
${redirectTags}
</head>
<body>${escapeHtml(title)}</body>
</html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let title = "VibeLive";
  let description = "App de lives ao vivo com contas, carteira, vídeo e pagamento reais.";
  let image = DEFAULT_IMAGE;
  let redirectTo = SITE_URL;

  try {
    if (type === "profile") {
      const username = url.searchParams.get("username") ?? "";
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("username", username)
        .maybeSingle();
      if (profile) {
        title = `${profile.display_name || profile.username} (@${profile.username}) no VibeLive`;
        description = profile.bio || "Confira esse perfil no VibeLive.";
        image = resolveImage(profile.avatar_url);
        redirectTo = `${SITE_URL}?profile=${encodeURIComponent(profile.username)}`;
      }
    } else if (type === "post") {
      const id = url.searchParams.get("id") ?? "";
      const { data: post } = await supabase
        .from("posts")
        .select("id, caption, media_url, media_type, user_id")
        .eq("id", id)
        .maybeSingle();
      if (post) {
        const { data: author } = await supabase.from("profiles").select("username, display_name").eq("id", post.user_id).maybeSingle();
        const authorLabel = author ? (author.display_name || author.username) : "alguém";
        title = `Post de ${authorLabel} no VibeLive`;
        description = post.caption || "Confira esse post no VibeLive.";
        image = post.media_type === "image" ? resolveImage(post.media_url) : DEFAULT_IMAGE;
        redirectTo = `${SITE_URL}?post=${encodeURIComponent(post.id)}`;
      }
    }
  } catch (err) {
    console.error("Erro ao buscar dados pro preview:", err);
  }

  const userAgent = req.headers.get("User-Agent") ?? "";
  const isCrawler = CRAWLER_UA_PATTERN.test(userAgent);

  const html = renderHtml({
    title,
    description,
    image,
    canonicalUrl: redirectTo,
    redirectTo: isCrawler ? null : redirectTo,
  });

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});
