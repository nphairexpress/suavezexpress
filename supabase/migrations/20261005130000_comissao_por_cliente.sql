-- Comissão por par (profissional, cliente). Pedido do Cleiton em 05/10/2026: "Tem uma lista de clientes da
-- Marcilene que será pago 70 por cento de comissão", valendo já em setembro/2026.
--
-- Regra (aplicada no front por src/lib/commissionPercent.ts): quando o item de SERVIÇO é feito pela profissional X
-- (comanda_items.professional_id, ou o da comanda se vazio) para a cliente Y (comandas.client_id), o percentual do
-- par (X, Y) vale ACIMA do par (profissional, serviço). Não vale quando outra profissional atende a mesma cliente.
-- Item de venda de pacote (item_type = 'package') segue no ramo próprio, sem regra por cliente.
-- Sem data de vigência: a tela recalcula ao vivo, então vale para qualquer período consultado.
--
-- RLS no padrão vivo de professional_service_commissions (05/10/2026): lê quem é a própria profissional ou quem
-- tem comissao.ver_todas; grava só quem tem comissao.editar; tudo dentro do salão do usuário.

CREATE TABLE IF NOT EXISTS public.professional_client_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  commission_percent numeric(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  CONSTRAINT professional_client_commissions_prof_client_key UNIQUE (professional_id, client_id)
);

COMMENT ON TABLE public.professional_client_commissions IS
  'Percentual de comissão por par (profissional, cliente); vale acima do par (profissional, serviço). Pedido do Cleiton 05/10/2026.';

CREATE INDEX IF NOT EXISTS idx_pcc_salon ON public.professional_client_commissions (salon_id);
CREATE INDEX IF NOT EXISTS idx_pcc_client ON public.professional_client_commissions (client_id);

ALTER TABLE public.professional_client_commissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.professional_client_commissions FROM anon;
REVOKE ALL ON public.professional_client_commissions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_client_commissions TO authenticated;
GRANT ALL ON public.professional_client_commissions TO service_role;

CREATE POLICY pcc_select ON public.professional_client_commissions
  FOR SELECT TO authenticated
  USING (
    salon_id = get_user_salon_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM professionals p
       WHERE p.id = professional_client_commissions.professional_id
         AND p.salon_id = get_user_salon_id(auth.uid())
         AND (p.user_id = auth.uid() OR fn_pode(auth.uid(), 'comissao.ver_todas'))
    )
  );

CREATE POLICY pcc_insert_financeiro ON public.professional_client_commissions
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_pode(auth.uid(), 'comissao.editar')
    AND salon_id = get_user_salon_id(auth.uid())
    AND EXISTS (SELECT 1 FROM professionals p
                 WHERE p.id = professional_client_commissions.professional_id
                   AND p.salon_id = professional_client_commissions.salon_id)
    AND EXISTS (SELECT 1 FROM clients c
                 WHERE c.id = professional_client_commissions.client_id
                   AND c.salon_id = professional_client_commissions.salon_id)
  );

CREATE POLICY pcc_update_financeiro ON public.professional_client_commissions
  FOR UPDATE TO authenticated
  USING (
    fn_pode(auth.uid(), 'comissao.editar')
    AND salon_id = get_user_salon_id(auth.uid())
  )
  WITH CHECK (
    fn_pode(auth.uid(), 'comissao.editar')
    AND salon_id = get_user_salon_id(auth.uid())
    AND EXISTS (SELECT 1 FROM professionals p
                 WHERE p.id = professional_client_commissions.professional_id
                   AND p.salon_id = professional_client_commissions.salon_id)
    AND EXISTS (SELECT 1 FROM clients c
                 WHERE c.id = professional_client_commissions.client_id
                   AND c.salon_id = professional_client_commissions.salon_id)
  );

CREATE POLICY pcc_delete_financeiro ON public.professional_client_commissions
  FOR DELETE TO authenticated
  USING (
    fn_pode(auth.uid(), 'comissao.editar')
    AND salon_id = get_user_salon_id(auth.uid())
  );

-- Seed: as 5 clientes confirmadas da lista (ids completos resolvidos por SELECT em 05/10/2026).
-- Falha a migration inteira se a profissional ou qualquer cliente não existir no mesmo salão.
DO $seed$
DECLARE
  v_prof constant uuid := '5b606ddb-12db-45fa-aaf6-3fe7222de8a9'; -- Marcilene Zanette
  v_clientes constant uuid[] := ARRAY[
    '09b87b5d-438f-45d0-a760-c13245ac7d68', -- Denise Vieira
    'b6c51b33-bf93-46dc-acb2-04ddda23264e', -- Maria Renata Carol Minelli
    '351ca4a7-6f49-4948-8263-43811a107be8', -- Rosely Ferreira Barbosa
    '83dbae0f-6c87-4ead-a119-a429e07f63cf', -- Giovanna de Paula Feitera
    '3d63d636-9939-401d-b7b0-95776b61671d'  -- Taina Martins Stefano
  ]::uuid[];
  v_achadas int;
  v_total int;
BEGIN
  SELECT count(*) INTO v_achadas
    FROM professionals p
    JOIN clients c ON c.salon_id = p.salon_id
   WHERE p.id = v_prof AND c.id = ANY (v_clientes);
  IF v_achadas <> array_length(v_clientes, 1) THEN
    RAISE EXCEPTION 'seed comissao por cliente: esperava % clientes da Marcilene no mesmo salão, achou %',
      array_length(v_clientes, 1), v_achadas;
  END IF;

  INSERT INTO public.professional_client_commissions (salon_id, professional_id, client_id, commission_percent, observacao, created_by)
  SELECT p.salon_id, p.id, c.id, 70, 'Lista do Cleiton de 05/10/2026', NULL
    FROM professionals p
    JOIN clients c ON c.salon_id = p.salon_id
   WHERE p.id = v_prof AND c.id = ANY (v_clientes)
  ON CONFLICT (professional_id, client_id) DO NOTHING;

  SELECT count(*) INTO v_total
    FROM public.professional_client_commissions
   WHERE professional_id = v_prof AND client_id = ANY (v_clientes);
  IF v_total <> array_length(v_clientes, 1) THEN
    RAISE EXCEPTION 'seed comissao por cliente: esperava % linhas, ficaram %', array_length(v_clientes, 1), v_total;
  END IF;
END
$seed$;
