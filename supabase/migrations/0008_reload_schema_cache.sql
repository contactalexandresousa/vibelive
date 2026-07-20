-- Força o PostgREST a recarregar o cache de schema. Necessário depois de trocar o
-- tipo de retorno de uma função via DROP + CREATE (migration 0007) — sem isso, o
-- PostgREST pode continuar servindo a assinatura antiga por um tempo.
notify pgrst, 'reload schema';
