-- Reversão de 20260929190000_audit_log_e_devolve_credito_escova.sql
do $$
declare t text;
begin
  foreach t in array array['payments','caixas','caixa_movements','comandas','commission_adjustments',
                           'commission_payments','professional_bank_details','professionals','system_config',
                           'client_credits','client_debts','customer_credits','user_roles','salon_secrets']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_audit_log on public.%I', t);
    end if;
  end loop;
end $$;
drop function if exists public.fn_audit_log();
drop table if exists public.audit_log;
-- devolve_pacote_unha: versão anterior em 20260929160000_pacote_esmaltacao.sql (só pacote_unha/pacote_esmaltacao, desconto por consumo).
