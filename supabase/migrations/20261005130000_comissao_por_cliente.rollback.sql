-- Reversão de 20261005130000_comissao_por_cliente.sql.
-- ORDEM: publique antes o front anterior (ou mantenha o novo, que tolera a tabela ausente e volta à regra
-- profissional/serviço). Apagar a tabela apaga as regras cadastradas: faça o backup abaixo antes.
--   select * from public.professional_client_commissions;  -- guardar o resultado
DROP TABLE IF EXISTS public.professional_client_commissions;
