-- Função pública para verificar se o setup inicial foi realizado
-- SECURITY DEFINER = executa como owner, ignorando RLS
CREATE OR REPLACE FUNCTION public.is_setup_done()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.salons LIMIT 1);
$$;

-- Permite chamada por usuários anônimos
GRANT EXECUTE ON FUNCTION public.is_setup_done() TO anon;
GRANT EXECUTE ON FUNCTION public.is_setup_done() TO authenticated;
