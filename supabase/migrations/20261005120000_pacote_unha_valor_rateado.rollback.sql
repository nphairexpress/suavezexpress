-- Reversão de 20261005120000_pacote_unha_valor_rateado.sql:
-- consome_pacote_unha volta à definição VIVA de 05/10/2026 (item no preço lançado, desconto igual) e o
-- helper pacote_valor_servico sai. Itens já lançados com o valor rateado continuam como estão (não são dados
-- desta migration); a devolução ao apagar segue correta porque subtrai old.total_price.

CREATE OR REPLACE FUNCTION public.consome_pacote_unha()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- etapa 4 (F-04): marca a origem do pagamento
    update comandas set discount = coalesce(discount, 0) + new.total_price, paid_by = 'pacote' where id = new.comanda_id;
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
  -- etapa 4 (F-04): marca a origem do pagamento
  update comandas set discount = coalesce(discount, 0) + new.total_price, paid_by = 'pacote' where id = new.comanda_id;
  return new;
end
$function$;

DROP FUNCTION IF EXISTS public.pacote_valor_servico(uuid, uuid);
