-- Reversão de 20260929260000_r07_pii_clientes_e_paid_by.sql
-- Restaura: view clients_staff como estava (security_invoker, sem filtro), SELECT total em clients
-- para authenticated e devolve_pacote_unha sem a limpeza de paid_by (definição viva de 29/09).

-- ── (a) view como na etapa 6 ────────────────────────────────────────────────────────────────────
drop view if exists public.clients_staff;
create view public.clients_staff
with (security_invoker = true) as
select id,
       salon_id,
       name,
       email,
       phone,
       phone_landline,
       notes,
       tags,
       gender,
       case when fn_pode(auth.uid(), 'cliente.ver_cpf') then cpf        else null::text end as cpf,
       case when fn_pode(auth.uid(), 'cliente.ver_cpf') then rg         else null::text end as rg,
       case when fn_pode(auth.uid(), 'cliente.ver_cpf') then birth_date else null::date end as birth_date,
       cep,
       state,
       city,
       neighborhood,
       address,
       address_number,
       address_complement,
       how_met,
       profession,
       avatar_url,
       allow_email_campaigns,
       allow_sms_campaigns,
       allow_online_booking,
       allow_whatsapp_campaigns,
       add_cpf_invoice,
       allow_ai_service,
       created_at,
       updated_at
  from public.clients;
revoke all on public.clients_staff from public, anon;
grant select on public.clients_staff to authenticated, service_role;

-- ── (a) tabela clients: SELECT total de volta ───────────────────────────────────────────────────
revoke select on public.clients from authenticated;   -- limpa os grants por coluna
grant select on public.clients to authenticated;

-- ── (b) devolve_pacote_unha (definição viva de 29/09, md5 43ec782e0c448fee5bb0c7a62e12fe97) ─────
CREATE OR REPLACE FUNCTION public.devolve_pacote_unha()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_srv text; v_m int := 0; v_p int := 0; v_q int := coalesce(old.quantity, 1); r record; v_teve boolean := false;
begin
  select upper(name) into v_srv from services where id = old.service_id;
  if v_srv = 'MANICURE' then v_m := 1;
  elsif v_srv = 'PEDICURE' then v_p := 1;
  elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then v_m := 1; v_p := 1;
  end if;
  for r in
    select cs.id, cs.ciclo_id, k.origem from clube_consumos cs join clube_creditos k on k.id = cs.ciclo_id
     where cs.comanda_item_id = old.id
  loop
    v_teve := true;
    if r.origem = 'pacote_unha' then
      update clube_creditos
         set maos_usadas = greatest(0, maos_usadas - v_m * v_q), pes_usados = greatest(0, pes_usados - v_p * v_q),
             creditos_usados = greatest(0, creditos_usados - (v_m + v_p) * v_q)
       where id = r.ciclo_id;
    else
      -- esmaltação (pacote_esmaltacao) e ESCOVA DO CLUBE (asaas_pagamento / backfill / legado_manual): 1 crédito por consumo
      update clube_creditos set creditos_usados = greatest(0, creditos_usados - 1) where id = r.ciclo_id;
    end if;
    delete from clube_consumos where id = r.id;
  end loop;
  if v_teve then
    update comandas set discount = greatest(0, coalesce(discount, 0) - old.total_price) where id = old.comanda_id;
  end if;
  return old;
end
$function$;
