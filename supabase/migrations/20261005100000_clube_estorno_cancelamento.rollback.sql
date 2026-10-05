-- Reversão de 20261005100000_clube_estorno_cancelamento.sql
--
-- ANTES de rodar: tirar do ar a edge clube-estorno (ou deixar sem uso) e voltar o asaas-webhook para o
-- commit anterior; o front que lê clube_assinantes.cancelada_em precisa voltar antes desta reversão
-- (senão /clube-admin erra ao buscar a coluna).
--
-- O que NÃO é desfeito (de propósito): estornos e cancelamentos já feitos no Asaas, as despesas
-- "Estorno Clube da Escova … [estorno pay_…]" lançadas em financial_transactions e o bloqueio dos ciclos
-- estornados (bloqueado = true continua; só a coluna estornado_em sai). O registro clube_estornos é
-- apagado junto com a tabela: exporte antes se quiser guardar
--   (select * from clube_estornos order by criado_em).

drop function if exists public.clube_aplicar_estorno(text, text, text, uuid);
drop function if exists public.clube_aplicar_cancelamento(text, text, integer, text, uuid);

drop table if exists public.clube_estornos;

-- cadastro cancelado com ciclo ainda ativo voltaria a parecer "ativo" sem a coluna: deixa explícito
update public.clube_assinantes set status = 'cancelado', updated_at = now()
 where cancelada_em is not null and status <> 'cancelado'
   and not exists (select 1 from public.clube_creditos k
                    where k.assinante_id = clube_assinantes.id and not k.bloqueado and k.inicio <= now() and now() < k.fim);
alter table public.clube_assinantes drop column if exists cancelada_em;
alter table public.clube_creditos drop column if exists estornado_em;

alter table public.salon_secrets
  drop column if exists senha_estorno_hash,
  drop column if exists senha_estorno_atualizada_em;

delete from public.salon_permissions where permission_key = 'clube.estornar_cancelar';
