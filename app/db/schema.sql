-- CJVenture Full Schema
-- Run in Supabase SQL Editor (all at once)

-- ================================================
-- CORE TABLES
-- ================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  tier INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id),
  slug TEXT UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  description TEXT,
  theme JSONB DEFAULT '{}',
  logo_url TEXT,
  banner_url TEXT,
  is_published BOOLEAN DEFAULT false,
  tier INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cj_product_id TEXT NOT NULL,
  cj_variant_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  cj_cost NUMERIC(10,2) NOT NULL,
  margin_percent NUMERIC(5,2),
  images TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  order_number TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  line_items JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id),
  cj_product_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, cj_product_id)
);

CREATE TABLE IF NOT EXISTS scenario_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id),
  scenario_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  score INTEGER,
  evaluation_json JSONB,
  UNIQUE(user_id, scenario_id)
);

CREATE TABLE IF NOT EXISTS tier_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id),
  tier INTEGER NOT NULL,
  completed_scenarios INTEGER DEFAULT 0,
  total_scenarios INTEGER DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  UNIQUE(user_id, tier)
);

CREATE TABLE IF NOT EXISTS cj_product_cache (
  cj_product_id TEXT PRIMARY KEY,
  data JSONB,
  images JSONB,
  variants JSONB,
  category_path TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ================================================
-- GAMIFICATION TABLES
-- ================================================

CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id),
  event_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_xp (
  user_id TEXT PRIMARY KEY REFERENCES user_profiles(id),
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  xp_to_next_level INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- COHORT TABLES (before challenges for FK)
-- ================================================

CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id TEXT NOT NULL REFERENCES user_profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  max_members INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cohort_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_profiles(id),
  role TEXT DEFAULT 'student',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cohort_id, user_id)
);

-- ================================================
-- CHALLENGE TABLES
-- ================================================

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by TEXT REFERENCES user_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  scope TEXT DEFAULT 'global',
  cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- ================================================
-- PORTFOLIO
-- ================================================

CREATE TABLE IF NOT EXISTS portfolio_settings (
  user_id TEXT PRIMARY KEY REFERENCES user_profiles(id),
  is_public BOOLEAN DEFAULT false,
  show_scores BOOLEAN DEFAULT true,
  show_store_stats BOOLEAN DEFAULT true,
  bio TEXT,
  headline TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created ON xp_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_total ON user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_user ON cohort_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_invite ON cohorts(invite_code);
CREATE INDEX IF NOT EXISTS idx_scenario_progress_user ON scenario_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_store ON store_orders(store_id);
