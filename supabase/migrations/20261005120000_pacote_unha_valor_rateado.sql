-- 05/10/2026 — Pacote de unha e pacote de esmaltação: o serviço feito dentro do pacote vale o valor RATEADO do pacote.
--
-- Regra do dono (Cleiton, 05/10/2026, literal): "O pacote de unha não é pra gerar comissão; o que é pra gerar
-- comissão é o serviço do pacote de unha pro profissional, e com o valor do pacote, não o valor integral."
-- Antes: consome_pacote_unha mantinha o item no preço lançado (cheio do catálogo, R$47) e somava esse valor no
-- desconto, então a tela de Comissões pagava % sobre R$47.
-- Agora: o item recebe o valor do serviço dentro do pacote = valor pago pelo pacote rateado pelo preço cheio vivo
-- de cada serviço a que ele dá direito (pacote_valor_servico, abaixo). Ex.: unha R$237 / (4x47 + 2x47) x 47 = 39,50;
-- esmaltação R$148 / 4 = 37,00. O desconto da comanda soma esse MESMO valor: a cliente segue pagando 0.
--
-- O que NÃO muda: nome do item "(PACOTE UNHA)"/"(PACOTE ESMALTAÇÃO)", consumo em clube_consumos, contadores do
-- ciclo, bloqueios (sem ciclo ativo ou sem saldo = cobra normal, sem erro), SECURITY DEFINER, search_path, owner e
-- grants de consome_pacote_unha. consome_credito_clube (ESCOVA DO CLUBE) e devolve_pacote_unha NÃO são tocados:
-- a devolução já subtrai old.total_price, que agora é o valor rateado que foi somado no desconto.
-- consome_pacote_unha abaixo = pg_get_functiondef VIVO de 05/10/2026 + 2 blocos (diff no commit).
--
-- Aplicar pela Management API em transação única. Reversão:
--   20261005120000_pacote_unha_valor_rateado.rollback.sql

CREATE OR REPLACE FUNCTION public.pacote_valor_servico(p_ciclo_id uuid, p_service_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
-- Valor de UM serviço dentro de um ciclo de pacote (regra do Cleiton, 05/10/2026: "o que é pra gerar comissão
-- é o serviço do pacote de unha pro profissional, e com o valor do pacote, não o valor integral").
-- valor do pacote = receita do pagamento do ciclo em financial_transactions (o asaas-webhook lança
-- "… (pay_x)"; mesma busca de clube_aplicar_estorno); sem receita, o preço do plano: 237 (pacote_unha) e
-- 148 (pacote_esmaltacao), os mesmos valores que identificam o plano no CLUBE_PLANOS do asaas-webhook.
-- Rateio proporcional ao preço cheio VIVO do catálogo (services do mesmo salão), truncado (para baixo)
-- em centavos, de modo que os serviços de um ciclo cheio nunca somem mais que o valor do pacote:
--   pacote_unha: direito = 4 MANICURE + 2 PEDICURE; combo MANICURE E PEDICURE EXPRESS = 1 mão + 1 pé.
--   pacote_esmaltacao: direito = 4 esmaltações (mãos ou pés); base = 4 x o maior preço entre as duas.
-- Devolve NULL quando não sabe calcular (ciclo de outra origem, serviço fora do pacote, preço ausente);
-- o gatilho então mantém o preço lançado, como antes.
declare
  v_origem text; v_pay text; v_valor numeric;
  v_srv text; v_salon uuid;
  v_pm numeric; v_pp numeric; v_em numeric; v_ep numeric; v_base numeric;
begin
  select origem, asaas_payment_id into v_origem, v_pay from clube_creditos where id = p_ciclo_id;
  if v_origem is null or v_origem not in ('pacote_unha', 'pacote_esmaltacao') then return null; end if;

  select upper(name), salon_id into v_srv, v_salon from services where id = p_service_id;
  if v_srv is null then return null; end if;

  if coalesce(v_pay, '') <> '' then
    select amount into v_valor from financial_transactions
     where transaction_type = 'income' and strpos(description, '(' || v_pay || ')') > 0
     order by created_at limit 1;
  end if;
  if coalesce(v_valor, 0) <= 0 then
    v_valor := case v_origem when 'pacote_unha' then 237 when 'pacote_esmaltacao' then 148 end;
  end if;

  select max(price) filter (where upper(name) = 'MANICURE'),
         max(price) filter (where upper(name) = 'PEDICURE'),
         max(price) filter (where upper(name) = 'ESMALTAÇÃO - MÃOS'),
         max(price) filter (where upper(name) = 'ESMALTAÇÃO - PÉS')
    into v_pm, v_pp, v_em, v_ep
    from services
   where salon_id is not distinct from v_salon
     and upper(name) in ('MANICURE', 'PEDICURE', 'ESMALTAÇÃO - MÃOS', 'ESMALTAÇÃO - PÉS');

  if v_origem = 'pacote_unha' then
    if coalesce(v_pm, 0) <= 0 or coalesce(v_pp, 0) <= 0 then return null; end if;
    v_base := 4 * v_pm + 2 * v_pp;
    if v_srv = 'MANICURE' then return trunc(v_valor * v_pm / v_base, 2);
    elsif v_srv = 'PEDICURE' then return trunc(v_valor * v_pp / v_base, 2);
    elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then
      return trunc(v_valor * v_pm / v_base, 2) + trunc(v_valor * v_pp / v_base, 2);
    end if;
    return null;
  end if;

  -- pacote_esmaltacao
  if coalesce(v_em, 0) <= 0 or coalesce(v_ep, 0) <= 0 then return null; end if;
  v_base := 4 * greatest(v_em, v_ep);
  if v_srv = 'ESMALTAÇÃO - MÃOS' then return trunc(v_valor * v_em / v_base, 2);
  elsif v_srv = 'ESMALTAÇÃO - PÉS' then return trunc(v_valor * v_ep / v_base, 2);
  end if;
  return null;
end
$function$;

REVOKE ALL ON FUNCTION public.pacote_valor_servico(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pacote_valor_servico(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.consome_pacote_unha()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_srv text; v_m int := 0; v_p int := 0; v_e int := 0; v_fone text; v_ass uuid;
  v_cred clube_creditos%rowtype;
  v_unit numeric;
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
    -- 05/10/2026 (regra do Cleiton): o serviço do pacote vale o valor pago pelo pacote rateado pelo preço cheio
    -- (pacote_valor_servico); cliente segue pagando 0 porque o desconto soma esse mesmo valor
    v_unit := pacote_valor_servico(v_cred.id, new.service_id);
    if v_unit is not null then
      new.unit_price := v_unit;
      new.total_price := v_unit * coalesce(new.quantity, 1);
    end if;
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
  -- 05/10/2026 (regra do Cleiton): o serviço do pacote vale o valor pago pelo pacote rateado pelo preço cheio
  -- (pacote_valor_servico); cliente segue pagando 0 porque o desconto soma esse mesmo valor
  v_unit := pacote_valor_servico(v_cred.id, new.service_id);
  if v_unit is not null then
    new.unit_price := v_unit;
    new.total_price := v_unit * coalesce(new.quantity, 1);
  end if;
  -- etapa 4 (F-04): marca a origem do pagamento
  update comandas set discount = coalesce(discount, 0) + new.total_price, paid_by = 'pacote' where id = new.comanda_id;
  return new;
end
$function$;
