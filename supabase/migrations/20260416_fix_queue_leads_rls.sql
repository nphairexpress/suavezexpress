-- Fix: queue_leads_salon policy was FOR ALL which blocked anon inserts
-- Split into SELECT/UPDATE/DELETE (authenticated) + keep INSERT (anon)

DROP POLICY IF EXISTS queue_leads_salon ON queue_leads;

CREATE POLICY queue_leads_salon ON queue_leads
  FOR SELECT USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY queue_leads_update ON queue_leads
  FOR UPDATE USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY queue_leads_delete ON queue_leads
  FOR DELETE USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));
