-- Closed Clients + Revenue Tracking
-- Supports monthly retainers, one-time fees, and per-payment history.

-- Clients: the businesses we've closed. Optionally linked to the lead they
-- came from, but can also be added directly (e.g. referrals, warm intros).
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Optional link back to the lead this client came from
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Core business info (mirrored from lead for historical accuracy)
  business_name TEXT NOT NULL,
  owner_name TEXT,
  email TEXT,
  phone TEXT,
  website_url TEXT,
  city TEXT,
  state TEXT,
  niche TEXT,

  -- What we're doing for them (AI Website, Automation, Ads, etc.)
  service_type TEXT NOT NULL,
  service_description TEXT,

  -- Billing
  billing_type TEXT NOT NULL CHECK (billing_type IN ('one_time', 'monthly', 'retainer', 'project')),
  -- Either the MRR (if monthly/retainer) OR the one-time fee amount.
  -- We store it in cents to avoid floating point drift.
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'churned', 'completed')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,  -- NULL for active monthly clients, set when churned/completed

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_billing_type ON clients(billing_type);
CREATE INDEX IF NOT EXISTS idx_clients_lead_id ON clients(lead_id);

-- Payment history: every time money comes in. Lets us compute real revenue
-- separately from projected MRR.
CREATE TABLE IF NOT EXISTS client_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  -- What this payment was for: 'setup', 'monthly_2026_04', 'final_invoice', etc.
  description TEXT,
  -- Free-text method: 'stripe', 'wire', 'check', etc. Not an enum because we don't care.
  method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON client_payments(paid_at DESC);

-- Update `updated_at` automatically on row change
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_clients_updated_at();
