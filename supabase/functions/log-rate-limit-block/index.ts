// Recebe {user_id, action} de um gatilho do Postgres via pg_net (mesmo
// padrão do send-push, 0039) e grava em rate_limit_blocks. Existe só por
// causa de uma armadilha real do Postgres: RAISE EXCEPTION desfaz TUDO que
// aconteceu na transação atual, inclusive um INSERT feito no mesmo bloco
// logo antes de levantar a exceção — não dá pra "logar o bloqueio e depois
// bloquear a ação" numa única transação sem sair dela, e pg_net é assíncrono
// (roda fora da transação que disparou), então sobrevive ao rollback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const { user_id, action } = await req.json();
    if (!user_id || !action) {
      return new Response("missing user_id/action", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.from("rate_limit_blocks").insert({ user_id, action });
    if (error) console.error("Falha ao gravar bloqueio de rate limit:", error.message);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Erro no log-rate-limit-block:", err);
    return new Response("error", { status: 200 });
  }
});
