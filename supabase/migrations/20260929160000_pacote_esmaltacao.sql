-- 29/09/2026 — Pacote de ESMALTAÇÃO (R$148/mês = 4 esmaltações, 6 meses, só crédito) e correção do Pacote de Unha.
-- Unha (unha_4m2p) cobre SÓ manicure/pedicure: MÃO = MANICURE · PÉ = PEDICURE · combo EXPRESS = 1 + 1.
-- Esmaltação (mãos ou pés) consome do ciclo de origem 'pacote_esmaltacao' (creditos_total/creditos_usados)
-- da assinante que casa pelo telefone da cliente da comanda — o ciclo fica na mesma linha de clube_assinantes
-- (unique asaas_customer_id, usado pelo upsert do webhook), a origem do ciclo é que diz o que ele cobre.
-- Mesmo mecanismo: item no preço cheio (comissão normal) + desconto igual na comanda; sem saldo → cobra normal.
-- Aplicada via Management API em 29/09/2026 (este arquivo versiona).

alter table clube_creditos drop constraint clube_creditos_origem_chk;
alter table clube_creditos add constraint clube_creditos_origem_chk check (origem = any (array[
  'asaas_pagamento','asaas_assinatura_backfill','legado_manual','legado_manual_bloqueado','legado','pacote_unha','pacote_esmaltacao']));

-- comanda 1264: a esmaltação (Neide) era da FILHA e vai pelo pacote de esmaltação, não pelo de unha
delete from clube_consumos where comanda_item_id = '02e3594a-e90a-4041-a378-deebed48ec5c';
update clube_creditos set maos_usadas = 1, creditos_usados = 1
 where origem = 'pacote_unha' and asaas_payment_id = 'pay_8c9y1xxnii2hsn6h';
update comanda_items set description = 'ESMALTAÇÃO - MÃOS (PACOTE ESMALTAÇÃO)'
 where id = '02e3594a-e90a-4041-a378-deebed48ec5c';

create or replace function consome_pacote_unha() returns trigger language plpgsql
security definer set search_path = public as $fn$
declare
  v_srv text; v_m int := 0; v_p int := 0; v_e int := 0; v_fone text; v_ass uuid;
  v_cred clube_creditos%rowtype;
begin
  select upper(name) into v_srv from services where id = new.service_id;
  if v_srv = 'MANICURE' then v_m := 1;
  elsif v_srv = 'PEDICURE' then v_p := 1;
  elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then v_m := 1; v_p := 1;
  elsif v_srv in ('ESMALTAÇÃO - MÃOS', 'ESMALTAÇÃO - PÉS') then v_e := 1;
  else return new;
  end if;
  v_m := v_m * coalesce(new.quantity, 1);
  v_p := v_p * coalesce(new.quantity, 1);
  v_e := v_e * coalesce(new.quantity, 1);

  select regexp_replace(coalesce(cl.phone, ''), '[^0-9]', '', 'g') into v_fone
    from comandas c join clients cl on cl.id = c.client_id where c.id = new.comanda_id;
  if coalesce(v_fone, '') = '' then return new; end if;

  if v_e > 0 then
    select k.* into v_cred from clube_creditos k join clube_assinantes a on a.id = k.assinante_id
     where a.status = 'ativo'
       and right(regexp_replace(coalesce(a.celular, ''), '[^0-9]', '', 'g'), 8) = right(v_fone, 8)
       and k.origem = 'pacote_esmaltacao' and not k.bloqueado
       and k.inicio <= now() and now() < k.fim
       and k.creditos_usados + v_e <= k.creditos_total
     order by k.fim asc limit 1 for update of k;
    if not found then return new; end if;
    update clube_creditos set creditos_usados = creditos_usados + v_e where id = v_cred.id;
    insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem)
    values (v_cred.id, v_cred.assinante_id, new.id, 'comanda');
    new.description := coalesce(new.description, v_srv) || ' (PACOTE ESMALTAÇÃO)';
    update comandas set discount = coalesce(discount, 0) + new.total_price where id = new.comanda_id;
    return new;
  end if;

  select id into v_ass from clube_assinantes
   where status = 'ativo' and plano = 'unha_4m2p'
     and right(regexp_replace(coalesce(celular, ''), '[^0-9]', '', 'g'), 8) = right(v_fone, 8)
   limit 1;
  if v_ass is null then return new; end if;

  select * into v_cred from clube_creditos
   where assinante_id = v_ass and origem = 'pacote_unha' and not bloqueado
     and inicio <= now() and now() < fim
     and maos_usadas + v_m <= 4 and pes_usados + v_p <= 2
   order by fim asc limit 1 for update;
  if not found then return new; end if;  -- sem ciclo pago ou sem saldo: cobra normal

  update clube_creditos
     set maos_usadas = maos_usadas + v_m, pes_usados = pes_usados + v_p,
         creditos_usados = creditos_usados + v_m + v_p
   where id = v_cred.id;
  insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem)
  values (v_cred.id, v_ass, new.id, 'comanda');
  new.description := coalesce(new.description, v_srv) || ' (PACOTE UNHA)';
  update comandas set discount = coalesce(discount, 0) + new.total_price where id = new.comanda_id;
  return new;
end
$fn$;

create or replace function devolve_pacote_unha() returns trigger language plpgsql
security definer set search_path = public as $fn$
declare
  v_srv text; v_m int := 0; v_p int := 0; v_q int := coalesce(old.quantity, 1); r record;
begin
  select upper(name) into v_srv from services where id = old.service_id;
  if v_srv = 'MANICURE' then v_m := 1;
  elsif v_srv = 'PEDICURE' then v_p := 1;
  elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then v_m := 1; v_p := 1;
  end if;
  for r in
    select cs.id, cs.ciclo_id, k.origem from clube_consumos cs join clube_creditos k on k.id = cs.ciclo_id
     where cs.comanda_item_id = old.id and k.origem in ('pacote_unha', 'pacote_esmaltacao')
  loop
    if r.origem = 'pacote_unha' then
      update clube_creditos
         set maos_usadas = greatest(0, maos_usadas - v_m * v_q), pes_usados = greatest(0, pes_usados - v_p * v_q),
             creditos_usados = greatest(0, creditos_usados - (v_m + v_p) * v_q)
       where id = r.ciclo_id;
    else
      update clube_creditos set creditos_usados = greatest(0, creditos_usados - v_q) where id = r.ciclo_id;
    end if;
    delete from clube_consumos where id = r.id;
    update comandas set discount = greatest(0, coalesce(discount, 0) - old.total_price) where id = old.comanda_id;
  end loop;
  return old;
end
$fn$;
