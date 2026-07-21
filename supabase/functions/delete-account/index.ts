// Exclui a conta do usuário autenticado, de verdade — antes, "Excluir Conta"
// no cliente só encerrava a sessão, porque apagar uma conta de auth.users
// exige a Auth Admin API (service role key, nunca disponível no navegador).
//
// Sempre exclui o PRÓPRIO chamador (identidade tirada do JWT, nunca de um id
// no corpo da requisição) — ninguém consegue pedir a exclusão de outra conta.
// A cascata de FKs (profiles → wallet_transactions, posts, follows,
// direct_messages, blocked_users, live_sessions, pix_payments etc., todas
// "on delete cascade") apaga o resto dos dados automaticamente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const authHeader = req.headers.get("Authorization") ?? "";
  const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Falha ao excluir conta:", deleteError.message);
    return new Response(JSON.stringify({ error: "Não foi possível excluir a conta" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
