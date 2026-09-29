-- 20260929260000 — R-07 (fecha CPF/RG/nascimento na tabela) + paid_by limpo ao devolver pacote
--
-- Contexto (auditoria 29/09, pendências pós-etapa 6):
--   (a) R-07: a view clients_staff já entregava cpf/rg/birth_date só com fn_pode('cliente.ver_cpf'),
--       mas a tabela clients continuava legível por inteiro via PostgREST para qualquer staff.
--       O front (commit desta rodada) passou a LER só pela view e a ESCREVER na tabela sem pedir PII de volta.
--       Aqui: a view deixa de ser security_invoker (senão a restrição de coluna da tabela a alcançaria),
--       ganha o filtro de salão explícito (o dono postgres não passa por RLS) e a tabela perde o SELECT
--       nas três colunas para authenticated. INSERT/UPDATE/DELETE na tabela ficam como estavam.
--   (b) devolve_pacote_unha (BEFORE DELETE em comanda_items) devolvia o crédito e o desconto, mas deixava
--       comandas.paid_by preenchido; agora limpa quando a comanda fica sem nenhum consumo vinculado.
-- Reversão: 20260929260000_r07_pii_clientes_e_paid_by.rollback.sql

-- ── (a) view clients_staff: dona postgres, filtro de salão, barreira ─────────────────────────────
create or replace view public.clients_staff
with (security_invoker = false, security_barrier = true) as
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
  from public.clients
 where salon_id = get_user_salon_id(auth.uid());

alter view public.clients_staff owner to postgres;
revoke all on public.clients_staff from public, anon;
grant select on public.clients_staff to authenticated, service_role;

-- ── (a) tabela clients: authenticated lê tudo MENOS cpf, rg, birth_date ─────────────────────────
revoke select on public.clients from authenticated;
grant select (id, salon_id, name, email, phone, phone_landline, notes, tags, gender,
              cep, state, city, neighborhood, address, address_number, address_complement,
              how_met, profession, avatar_url,
              allow_email_campaigns, allow_sms_campaigns, allow_online_booking, allow_whatsapp_campaigns,
              add_cpf_invoice, allow_ai_service, created_at, updated_at)
   on public.clients to authenticated;

-- ── (b) devolve_pacote_unha: limpa paid_by quando não sobra consumo na comanda ───────────────────
-- Corpo = definição viva de 29/09 (md5 43ec782e0c448fee5bb0c7a62e12fe97); só o bloco final muda.
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
    -- paid_by só faz sentido enquanto algum item da comanda ainda tem consumo de Clube/pacote
    if not exists (
      select 1 from clube_consumos cs
        join comanda_items ci on ci.id = cs.comanda_item_id
       where ci.comanda_id = old.comanda_id and ci.id <> old.id
    ) then
      update comandas set paid_by = null where id = old.comanda_id and paid_by is not null;
    end if;
  end if;
  return old;
end
$function$;
