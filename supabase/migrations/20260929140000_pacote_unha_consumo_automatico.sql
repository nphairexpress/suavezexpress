-- 29/09/2026 — Pacote de Unha (plano unha_4m2p, R$237 = 4 mãos + 2 pés por ciclo de 30 dias).
-- Ao lançar serviço de unha na comanda de assinante ativa do pacote, com ciclo pago válido e saldo:
--   item fica no preço CHEIO (comissão normal da profissional) e o mesmo valor entra como desconto
--   da comanda → a cliente não paga. Sem assinatura / sem ciclo / sem saldo → cobra normal.
--   MÃO: MANICURE, ESMALTAÇÃO - MÃOS · PÉ: PEDICURE, ESMALTAÇÃO - PÉS · combo MANICURE E PEDICURE EXPRESS = 1 mão + 1 pé.
-- Excluir o item devolve o crédito e tira o desconto.
-- Aplicada via Management API em 29/09/2026 (este arquivo versiona).

alter table clube_creditos
  add column if not exists maos_usadas int not null default 0,
  add column if not exists pes_usados int not null default 0;

-- ciclo da Gabriela (26/09→26/10): as 2 unidades já usadas na comanda 1264 foram mãos
update clube_creditos set maos_usadas = 2
 where origem = 'pacote_unha' and asaas_payment_id = 'pay_8c9y1xxnii2hsn6h';

create or replace function consome_pacote_unha() returns trigger language plpgsql
security definer set search_path = public as $fn$
declare
  v_srv text; v_m int := 0; v_p int := 0; v_fone text; v_ass uuid;
  v_cred clube_creditos%rowtype;
begin
  select upper(name) into v_srv from services where id = new.service_id;
  if v_srv in ('MANICURE', 'ESMALTAÇÃO - MÃOS') then v_m := 1;
  elsif v_srv in ('PEDICURE', 'ESMALTAÇÃO - PÉS') then v_p := 1;
  elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then v_m := 1; v_p := 1;
  else return new;
  end if;
  v_m := v_m * coalesce(new.quantity, 1);
  v_p := v_p * coalesce(new.quantity, 1);

  select regexp_replace(coalesce(cl.phone, ''), '[^0-9]', '', 'g') into v_fone
    from comandas c join clients cl on cl.id = c.client_id where c.id = new.comanda_id;
  if coalesce(v_fone, '') = '' then return new; end if;

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

drop trigger if exists trg_consome_pacote_unha on comanda_items;
create trigger trg_consome_pacote_unha before insert on comanda_items
  for each row execute function consome_pacote_unha();

-- BEFORE DELETE: roda antes do "on delete set null" de clube_consumos
create or replace function devolve_pacote_unha() returns trigger language plpgsql
security definer set search_path = public as $fn$
declare
  v_srv text; v_m int := 0; v_p int := 0; r record;
begin
  for r in
    select cs.id, cs.ciclo_id from clube_consumos cs join clube_creditos k on k.id = cs.ciclo_id
     where cs.comanda_item_id = old.id and k.origem = 'pacote_unha'
  loop
    select upper(name) into v_srv from services where id = old.service_id;
    if v_srv in ('MANICURE', 'ESMALTAÇÃO - MÃOS') then v_m := 1;
    elsif v_srv in ('PEDICURE', 'ESMALTAÇÃO - PÉS') then v_p := 1;
    elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then v_m := 1; v_p := 1;
    end if;
    v_m := v_m * coalesce(old.quantity, 1);
    v_p := v_p * coalesce(old.quantity, 1);
    update clube_creditos
       set maos_usadas = greatest(0, maos_usadas - v_m), pes_usados = greatest(0, pes_usados - v_p),
           creditos_usados = greatest(0, creditos_usados - v_m - v_p)
     where id = r.ciclo_id;
    delete from clube_consumos where id = r.id;
    update comandas set discount = greatest(0, coalesce(discount, 0) - old.total_price) where id = old.comanda_id;
  end loop;
  return old;
end
$fn$;

drop trigger if exists trg_devolve_pacote_unha on comanda_items;
create trigger trg_devolve_pacote_unha before delete on comanda_items
  for each row execute function devolve_pacote_unha();
