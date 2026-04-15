-- Queue entries: main queue table
CREATE TYPE queue_status AS ENUM ('waiting', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show');
CREATE TYPE queue_source AS ENUM ('online', 'walk_in');
CREATE TYPE queue_payment_status AS ENUM ('pending', 'confirmed', 'refunded', 'credit');

CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_id UUID NOT NULL,
  status queue_status NOT NULL DEFAULT 'waiting',
  source queue_source NOT NULL DEFAULT 'online',
  position INTEGER NOT NULL,
  payment_id TEXT,
  payment_status queue_payment_status DEFAULT 'pending',
  notify_minutes_before INTEGER DEFAULT 40,
  notify_sent BOOLEAN NOT NULL DEFAULT FALSE,
  notify_next_sent BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_time TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  assigned_professional_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE queue_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  max_queue_size INTEGER NOT NULL DEFAULT 3,
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  customer_id UUID,
  customer_phone TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  origin_queue_entry_id UUID REFERENCES queue_entries(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE queue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL UNIQUE,
  inflation_factor DECIMAL(3,2) NOT NULL DEFAULT 1.70,
  credit_validity_days INTEGER NOT NULL DEFAULT 30,
  notify_options JSONB NOT NULL DEFAULT '[20, 40, 60, 90]',
  reception_email TEXT,
  zapi_instance_id TEXT,
  zapi_token TEXT,
  asaas_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_queue_entries_salon_status ON queue_entries(salon_id, status);
CREATE INDEX idx_queue_entries_position ON queue_entries(salon_id, position);
CREATE INDEX idx_queue_leads_salon ON queue_leads(salon_id, notified);
CREATE INDEX idx_customer_credits_phone ON customer_credits(customer_phone, used, expires_at);

-- RLS Policies
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access to their salon
CREATE POLICY "queue_entries_salon" ON queue_entries
  FOR ALL USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "queue_leads_salon" ON queue_leads
  FOR ALL USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "customer_credits_salon" ON customer_credits
  FOR ALL USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "queue_settings_salon" ON queue_settings
  FOR ALL USING (salon_id IN (SELECT salon_id FROM profiles WHERE id = auth.uid()));

-- Anonymous users: read queue count only, insert entries and leads
CREATE POLICY "queue_entries_anon_read" ON queue_entries
  FOR SELECT USING (TRUE);

CREATE POLICY "queue_entries_anon_insert" ON queue_entries
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "queue_leads_anon_insert" ON queue_leads
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "queue_settings_anon_read" ON queue_settings
  FOR SELECT USING (TRUE);
