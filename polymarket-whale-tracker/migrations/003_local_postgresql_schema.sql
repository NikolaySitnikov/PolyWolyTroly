-- Local PostgreSQL Schema for PolyWoly
-- Migrated from Supabase

-- CTF Transfers (stores only suspicious/flagged transfers, not all)
CREATE TABLE IF NOT EXISTS ctf_transfers (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  token_id VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  condition_id VARCHAR(66),
  outcome VARCHAR(10),
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMPTZ,
  log_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deposits
CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  amount NUMERIC NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Depth Snapshots (should be minimal - only for markets being actively monitored)
CREATE TABLE IF NOT EXISTS depth_snapshots (
  id SERIAL PRIMARY KEY,
  condition_id VARCHAR(66) NOT NULL,
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  depth_2tick JSONB,
  depth_5tick JSONB,
  depth_10tick JSONB,
  bid_liquidity_2tick NUMERIC,
  ask_liquidity_2tick NUMERIC,
  bid_liquidity_5tick NUMERIC,
  ask_liquidity_5tick NUMERIC,
  mid_price NUMERIC,
  spread NUMERIC,
  median_liquidity_30d NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detection Alerts
CREATE TABLE IF NOT EXISTS detection_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  confidence_score NUMERIC,
  wallet_address VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66),
  detection_rule VARCHAR(100) NOT NULL,
  trigger_values JSONB,
  threshold_values JSONB,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  related_tx_hashes TEXT[],
  related_wallets TEXT[],
  status VARCHAR(20),
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(100),
  notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detection Config
CREATE TABLE IF NOT EXISTS detection_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Detection Rule Config
CREATE TABLE IF NOT EXISTS detection_rule_config (
  rule_name VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  thresholds JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Markets
CREATE TABLE IF NOT EXISTS markets (
  condition_id VARCHAR(66) PRIMARY KEY,
  question TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  outcome_yes_token_id VARCHAR(100),
  outcome_no_token_id VARCHAR(100),
  resolution_time TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_outcome VARCHAR(10),
  volume_24h NUMERIC DEFAULT 0,
  volume_total NUMERIC DEFAULT 0,
  liquidity NUMERIC DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  deposit_id INTEGER,
  notification_type VARCHAR(50) NOT NULL,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

-- Pending MTM Evaluations
CREATE TABLE IF NOT EXISTS pending_mtm_evaluations (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL,
  trade_timestamp TIMESTAMPTZ NOT NULL,
  entry_price NUMERIC NOT NULL,
  trade_size_usd NUMERIC NOT NULL,
  tx_hash VARCHAR(66),
  evaluate_at TIMESTAMPTZ NOT NULL,
  evaluated BOOLEAN DEFAULT FALSE,
  evaluation_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price History (should be minimal - only for active markets)
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  condition_id VARCHAR(66) NOT NULL,
  token_id VARCHAR(100) NOT NULL,
  price NUMERIC NOT NULL,
  source VARCHAR(50),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Activity
CREATE TABLE IF NOT EXISTS wallet_activity (
  wallet_address VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL,
  first_trade_at TIMESTAMPTZ,
  last_trade_at TIMESTAMPTZ,
  total_volume NUMERIC DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  net_position NUMERIC DEFAULT 0,
  avg_entry_price NUMERIC,
  realized_pnl NUMERIC DEFAULT 0,
  volume_share_of_wallet NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (wallet_address, condition_id)
);

-- Wallet Clusters
CREATE TABLE IF NOT EXISTS wallet_clusters (
  id SERIAL PRIMARY KEY,
  cluster_id UUID NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  related_wallet VARCHAR(42),
  evidence JSONB,
  strength NUMERIC DEFAULT 1.0,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Funding Sources
CREATE TABLE IF NOT EXISTS wallet_funding_sources (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  source_address VARCHAR(42) NOT NULL,
  source_type VARCHAR(50),
  source_label VARCHAR(255),
  tx_hash VARCHAR(66) NOT NULL,
  amount NUMERIC NOT NULL,
  token_address VARCHAR(42),
  block_number BIGINT,
  funded_at TIMESTAMPTZ,
  is_first_funding BOOLEAN DEFAULT FALSE,
  hours_before_first_trade INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  address VARCHAR(42) PRIMARY KEY,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  first_deposit_amount NUMERIC,
  first_deposit_tx VARCHAR(66),
  total_deposited NUMERIC DEFAULT 0,
  deposit_count INTEGER DEFAULT 0,
  is_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_market_maker BOOLEAN DEFAULT FALSE,
  pnl NUMERIC,
  pnl_7d NUMERIC,
  pnl_30d NUMERIC,
  win_rate NUMERIC,
  portfolio_value NUMERIC,
  total_trades INTEGER,
  last_activity_at TIMESTAMPTZ,
  is_live BOOLEAN DEFAULT FALSE,
  trading_data_updated_at TIMESTAMPTZ,
  source VARCHAR(50)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ctf_transfers_wallet ON ctf_transfers(from_address, to_address);
CREATE INDEX IF NOT EXISTS idx_ctf_transfers_condition ON ctf_transfers(condition_id);
CREATE INDEX IF NOT EXISTS idx_ctf_transfers_timestamp ON ctf_transfers(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_depth_snapshots_condition ON depth_snapshots(condition_id);
CREATE INDEX IF NOT EXISTS idx_depth_snapshots_time ON depth_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_condition ON price_history(condition_id);
CREATE INDEX IF NOT EXISTS idx_price_history_time ON price_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_token_yes ON markets(outcome_yes_token_id);
CREATE INDEX IF NOT EXISTS idx_markets_token_no ON markets(outcome_no_token_id);
CREATE INDEX IF NOT EXISTS idx_wallets_source ON wallets(source);
CREATE INDEX IF NOT EXISTS idx_detection_alerts_wallet ON detection_alerts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_detection_alerts_status ON detection_alerts(status);

-- Insert default detection rule configs
INSERT INTO detection_rule_config (rule_name, enabled, thresholds, description) VALUES
  ('rule1_fresh_wallet_concentrated_depth', true, '{"min_trade_size_usd": 5000, "max_wallet_age_hours": 168, "min_depth_concentration": 0.25}', 'Rule #1: Fresh wallet + Concentrated depth eating'),
  ('rule2_wallet_cluster_insider', true, '{"min_cluster_size": 2, "max_hours_before_resolution": 48}', 'Rule #2: Wallet cluster trading same market'),
  ('rule3_mtm_winner', true, '{"min_unrealized_pnl": 5000, "evaluation_delay_hours": 1}', 'Rule #3: Mark-to-market winner detection')
ON CONFLICT (rule_name) DO NOTHING;

-- Insert default detection config
INSERT INTO detection_config (config_key, config_value, description) VALUES
  ('detection_enabled', 'true', 'Master switch for detection system'),
  ('alert_throttle_minutes', '5', 'Minimum minutes between alerts for same wallet')
ON CONFLICT (config_key) DO NOTHING;
