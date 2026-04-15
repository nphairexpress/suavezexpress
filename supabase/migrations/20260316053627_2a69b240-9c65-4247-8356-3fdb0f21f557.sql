-- Fix user_roles: drop existing policies first
DROP POLICY IF EXISTS "No direct role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their salon" ON public.user_roles;
DROP POLICY IF EXISTS "No direct role inserts allowed" ON public.user_roles;

-- Block all direct inserts - roles managed via edge functions only
CREATE POLICY "No direct role inserts allowed"
ON public.user_roles FOR INSERT TO authenticated WITH CHECK (false);

-- Authenticated users can view roles in their salon
CREATE POLICY "Users can view roles in their salon"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR salon_id = get_user_salon_id(auth.uid()));

-- Fix system_config
DROP POLICY IF EXISTS "Anyone can read system config" ON public.system_config;
DROP POLICY IF EXISTS "Authenticated users can read system config" ON public.system_config;
CREATE POLICY "Authenticated users can read system config"
ON public.system_config FOR SELECT TO authenticated USING (true);

-- Fix remaining public-scoped policies

-- bank_accounts
DROP POLICY IF EXISTS "Users can delete bank accounts in their salon" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert bank accounts in their salon" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update bank accounts in their salon" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can view bank accounts in their salon" ON public.bank_accounts;
CREATE POLICY "Users can delete bank accounts in their salon" ON public.bank_accounts FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can insert bank accounts in their salon" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can update bank accounts in their salon" ON public.bank_accounts FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can view bank accounts in their salon" ON public.bank_accounts FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- card_brands
DROP POLICY IF EXISTS "Users can delete card brands in their salon" ON public.card_brands;
DROP POLICY IF EXISTS "Users can insert card brands in their salon" ON public.card_brands;
DROP POLICY IF EXISTS "Users can update card brands in their salon" ON public.card_brands;
DROP POLICY IF EXISTS "Users can view card brands in their salon" ON public.card_brands;
CREATE POLICY "Users can delete card brands in their salon" ON public.card_brands FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can insert card brands in their salon" ON public.card_brands FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can update card brands in their salon" ON public.card_brands FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can view card brands in their salon" ON public.card_brands FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- suppliers
DROP POLICY IF EXISTS "Users can delete suppliers in their salon" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers in their salon" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update suppliers in their salon" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers in their salon" ON public.suppliers;
CREATE POLICY "Users can delete suppliers in their salon" ON public.suppliers FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can insert suppliers in their salon" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can update suppliers in their salon" ON public.suppliers FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can view suppliers in their salon" ON public.suppliers FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- caixas
DROP POLICY IF EXISTS "Users can insert caixas in their salon" ON public.caixas;
DROP POLICY IF EXISTS "Users can update caixas in their salon" ON public.caixas;
DROP POLICY IF EXISTS "Users can view caixas in their salon" ON public.caixas;
CREATE POLICY "Users can insert caixas in their salon" ON public.caixas FOR INSERT TO authenticated WITH CHECK ((salon_id = get_user_salon_id(auth.uid())) AND (user_id = auth.uid()));
CREATE POLICY "Users can update caixas in their salon" ON public.caixas FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can view caixas in their salon" ON public.caixas FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- service_products
DROP POLICY IF EXISTS "Users can delete service products in their salon" ON public.service_products;
DROP POLICY IF EXISTS "Users can insert service products in their salon" ON public.service_products;
DROP POLICY IF EXISTS "Users can update service products in their salon" ON public.service_products;
DROP POLICY IF EXISTS "Users can view service products in their salon" ON public.service_products;
CREATE POLICY "Users can delete service products in their salon" ON public.service_products FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM services s WHERE s.id = service_products.service_id AND s.salon_id = get_user_salon_id(auth.uid())));
CREATE POLICY "Users can insert service products in their salon" ON public.service_products FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM services s WHERE s.id = service_products.service_id AND s.salon_id = get_user_salon_id(auth.uid())));
CREATE POLICY "Users can update service products in their salon" ON public.service_products FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM services s WHERE s.id = service_products.service_id AND s.salon_id = get_user_salon_id(auth.uid())));
CREATE POLICY "Users can view service products in their salon" ON public.service_products FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM services s WHERE s.id = service_products.service_id AND s.salon_id = get_user_salon_id(auth.uid())));

-- access_levels
DROP POLICY IF EXISTS "Admins can delete custom access levels" ON public.access_levels;
DROP POLICY IF EXISTS "Admins can insert access levels in their salon" ON public.access_levels;
DROP POLICY IF EXISTS "Admins can update access levels in their salon" ON public.access_levels;
DROP POLICY IF EXISTS "Users can view access levels in their salon" ON public.access_levels;
CREATE POLICY "Admins can delete custom access levels" ON public.access_levels FOR DELETE TO authenticated USING ((salon_id = get_user_salon_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role) AND (is_system = false));
CREATE POLICY "Admins can insert access levels in their salon" ON public.access_levels FOR INSERT TO authenticated WITH CHECK ((salon_id = get_user_salon_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update access levels in their salon" ON public.access_levels FOR UPDATE TO authenticated USING ((salon_id = get_user_salon_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view access levels in their salon" ON public.access_levels FOR SELECT TO authenticated USING ((salon_id = get_user_salon_id(auth.uid())) OR (salon_id IS NULL));

-- access_level_permissions
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.access_level_permissions;
DROP POLICY IF EXISTS "Users can view permissions" ON public.access_level_permissions;
CREATE POLICY "Admins can manage permissions" ON public.access_level_permissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM access_levels al WHERE al.id = access_level_permissions.access_level_id AND al.salon_id = get_user_salon_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can view permissions" ON public.access_level_permissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM access_levels al WHERE al.id = access_level_permissions.access_level_id AND ((al.salon_id = get_user_salon_id(auth.uid())) OR (al.salon_id IS NULL))));

-- comanda_deletions
DROP POLICY IF EXISTS "Admins can view comanda deletions" ON public.comanda_deletions;
DROP POLICY IF EXISTS "Users can insert comanda deletions" ON public.comanda_deletions;
CREATE POLICY "Users can view comanda deletions in their salon" ON public.comanda_deletions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.salon_id = (SELECT pr.salon_id FROM profiles pr WHERE pr.user_id = comanda_deletions.deleted_by LIMIT 1)));
CREATE POLICY "Users can insert comanda deletions" ON public.comanda_deletions FOR INSERT TO authenticated WITH CHECK (deleted_by = auth.uid());

-- client_history
DROP POLICY IF EXISTS "Users can insert client history in their salon" ON public.client_history;
DROP POLICY IF EXISTS "Users can view client history in their salon" ON public.client_history;
CREATE POLICY "Users can insert client history in their salon" ON public.client_history FOR INSERT TO authenticated WITH CHECK (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can view client history in their salon" ON public.client_history FOR SELECT TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- comandas DELETE
DROP POLICY IF EXISTS "Users can delete comandas in their salon" ON public.comandas;
CREATE POLICY "Users can delete comandas in their salon" ON public.comandas FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- payments DELETE and UPDATE
DROP POLICY IF EXISTS "Users can delete payments in their salon" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments in their salon" ON public.payments;
CREATE POLICY "Users can delete payments in their salon" ON public.payments FOR DELETE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));
CREATE POLICY "Users can update payments in their salon" ON public.payments FOR UPDATE TO authenticated USING (salon_id = get_user_salon_id(auth.uid()));

-- professionals DELETE
DROP POLICY IF EXISTS "Admins can delete professionals in their salon" ON public.professionals;
CREATE POLICY "Admins can delete professionals in their salon" ON public.professionals FOR DELETE TO authenticated USING ((salon_id = get_user_salon_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));