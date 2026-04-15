CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  calls_made INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_api_usage_unique ON api_usage(api_name, endpoint, date);
CREATE INDEX idx_api_usage_date ON api_usage(date DESC);
CREATE INDEX idx_api_usage_api_name ON api_usage(api_name);
