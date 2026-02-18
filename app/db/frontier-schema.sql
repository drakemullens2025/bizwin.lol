-- CJVenture Frontier Schema (4.2-4.6)
-- Run in Supabase SQL Editor after base schema

-- Generated scenarios for adaptive curriculum (4.3)
CREATE TABLE IF NOT EXISTS generated_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id),
  tier INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2,
  title TEXT NOT NULL,
  context TEXT NOT NULL,
  challenge TEXT NOT NULL,
  optimal_approach TEXT NOT NULL,
  key_insights JSONB DEFAULT '[]',
  common_mistakes JSONB DEFAULT '[]',
  next_level JSONB DEFAULT '[]',
  source TEXT DEFAULT 'ai_generated',
  based_on JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gen_scenarios_user ON generated_scenarios(user_id, tier);

-- Product events for supply chain intelligence (4.4)
CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  cj_product_id TEXT,
  search_query TEXT,
  category TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_events_created ON product_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_product ON product_events(cj_product_id, event_type);

-- Store templates (4.5)
CREATE TABLE IF NOT EXISTS store_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  theme JSONB NOT NULL,
  layout_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Multi-store support (4.5)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS template_id TEXT;

-- Cohort curriculum config (4.2)
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS curriculum_config JSONB DEFAULT '{}';

-- Analytics snapshots (4.6)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  snapshot_date DATE NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  avg_margin NUMERIC DEFAULT 0,
  UNIQUE(store_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_analytics_store_date ON analytics_snapshots(store_id, snapshot_date);

-- Key-value store for shared serverless state (CJ token, etc.)
CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
