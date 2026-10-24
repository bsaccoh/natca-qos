-- NatCA CMS — Phase 3 & 4 Database Migration
-- Phase 3: Drive Test & QoS Analytics
-- Phase 4: AI Anti-Spoofing, Multi-SIM Cap, Operator Webhooks

-- ── 1. Drive Tests & Samples ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drive_tests (
  drive_test_id   BIGSERIAL PRIMARY KEY,
  operator_id     INT REFERENCES operators(operator_id) ON DELETE SET NULL,
  test_name       VARCHAR(200) NOT NULL,
  test_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  district_id     INT REFERENCES districts(district_id) ON DELETE SET NULL,
  cluster_name    VARCHAR(100),
  technology      VARCHAR(10) NOT NULL DEFAULT '4G', -- '2G', '3G', '4G', '5G'
  device_model    VARCHAR(100),
  tester_name     VARCHAR(100),
  total_samples   INT DEFAULT 0,
  valid_samples   INT DEFAULT 0,
  distance_km     DECIMAL(8,2) DEFAULT 0.0,
  overall_score   DECIMAL(5,2) DEFAULT 0.0,
  pass_rate_pct   DECIMAL(5,2) DEFAULT 0.0,
  status          VARCHAR(30) DEFAULT 'COMPLETED',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drive_test_samples (
  sample_id      BIGSERIAL PRIMARY KEY,
  drive_test_id  BIGINT NOT NULL REFERENCES drive_tests(drive_test_id) ON DELETE CASCADE,
  ts             TIMESTAMPTZ,
  latitude       DECIMAL(10,7) NOT NULL,
  longitude      DECIMAL(10,7) NOT NULL,
  rsrp           DECIMAL(6,2),   -- RxLev (2G), RSCP (3G), RSRP (4G)
  rsrq           DECIMAL(6,2),   -- RxQual (2G), RSRQ (4G)
  sinr           DECIMAL(6,2),
  dl_throughput  DECIMAL(10,2),  -- in kbps
  ul_throughput  DECIMAL(10,2),
  pci            INT,
  earfcn         INT,
  call_status    VARCHAR(30)
);

CREATE INDEX IF NOT EXISTS idx_dts_test_coords ON drive_test_samples(drive_test_id, latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_dts_rsrp ON drive_test_samples(rsrp);

-- ── 2. Drive Test Grid (~100m spatial tiles for fast Heatmap) ────────────────
CREATE TABLE IF NOT EXISTS drive_test_grid (
  grid_id        BIGSERIAL PRIMARY KEY,
  operator_id    INT REFERENCES operators(operator_id) ON DELETE CASCADE,
  technology     VARCHAR(10) NOT NULL,
  grid_lat       DECIMAL(7,3) NOT NULL,
  grid_lon       DECIMAL(7,3) NOT NULL,
  sample_count   INT DEFAULT 1,
  avg_rsrp       DECIMAL(6,2),
  avg_sinr       DECIMAL(6,2),
  avg_dl_kbps    DECIMAL(10,2),
  is_dead_zone   BOOLEAN DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_grid_op_tech_coords UNIQUE(operator_id, technology, grid_lat, grid_lon)
);

CREATE INDEX IF NOT EXISTS idx_dt_grid_coords ON drive_test_grid(grid_lat, grid_lon);
CREATE INDEX IF NOT EXISTS idx_dt_grid_dead_zone ON drive_test_grid(is_dead_zone);

-- ── 3. Regulatory Signal Thresholds ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signal_thresholds (
  threshold_id   SERIAL PRIMARY KEY,
  technology     VARCHAR(10) NOT NULL, -- '2G', '3G', '4G', 'ALL'
  metric         VARCHAR(30) NOT NULL, -- 'rsrp', 'rsrq', 'sinr', 'dl_kbps', 'ul_kbps'
  label          VARCHAR(100) NOT NULL,
  unit           VARCHAR(20),
  pass_value     DECIMAL(10,2) NOT NULL,
  pass_direction VARCHAR(10) NOT NULL DEFAULT 'gte', -- 'gte' (>=) or 'lte' (<=)
  good_min       DECIMAL(10,2),
  fair_min       DECIMAL(10,2),
  poor_min       DECIMAL(10,2),
  weight         DECIMAL(4,3) NOT NULL DEFAULT 0.25,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(technology, metric)
);

-- Seed Sierra Leone Regulatory Thresholds
INSERT INTO signal_thresholds (technology, metric, label, unit, pass_value, pass_direction, good_min, fair_min, poor_min, weight)
VALUES
  ('4G', 'rsrp', '4G RSRP (Coverage)', 'dBm', -100.0, 'gte', -90.0, -100.0, -110.0, 0.35),
  ('4G', 'rsrq', '4G RSRQ (Signal Quality)', 'dB', -12.0, 'gte', -10.0, -12.0, -16.0, 0.20),
  ('4G', 'sinr', '4G SINR (Interference)', 'dB', 0.0, 'gte', 10.0, 5.0, 0.0, 0.20),
  ('4G', 'dl_kbps', '4G Downlink Throughput', 'kbps', 10000.0, 'gte', 25000.0, 10000.0, 3000.0, 0.25),
  ('3G', 'rsrp', '3G RSCP (Coverage)', 'dBm', -90.0, 'gte', -75.0, -90.0, -100.0, 0.50),
  ('3G', 'dl_kbps', '3G Downlink Throughput', 'kbps', 2000.0, 'gte', 5000.0, 2000.0, 500.0, 0.50),
  ('2G', 'rsrp', '2G RxLev (Coverage)', 'dBm', -85.0, 'gte', -70.0, -85.0, -95.0, 0.50),
  ('2G', 'rsrq', '2G RxQual (Voice Quality)', 'scale', 3.0, 'lte', 1.0, 3.0, 5.0, 0.50)
ON CONFLICT (technology, metric) DO NOTHING;

-- ── 4. Operator Webhooks & Ticket Synchronization ─────────────────────────────
CREATE TABLE IF NOT EXISTS operator_webhooks (
  webhook_id    SERIAL PRIMARY KEY,
  operator_id   INT NOT NULL REFERENCES operators(operator_id) ON DELETE CASCADE,
  target_url    VARCHAR(500) NOT NULL,
  secret_key    VARCHAR(255) NOT NULL,
  events        TEXT[] NOT NULL DEFAULT ARRAY['complaint.escalated', 'complaint.sla_warning'],
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  log_id        BIGSERIAL PRIMARY KEY,
  webhook_id    INT REFERENCES operator_webhooks(webhook_id) ON DELETE CASCADE,
  event_name    VARCHAR(80) NOT NULL,
  payload       JSONB NOT NULL,
  response_code INT,
  response_body TEXT,
  success       BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_wh ON webhook_delivery_logs(webhook_id);

-- ── 5. Multi-SIM Cap & Fraud Alerts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim_fraud_alerts (
  alert_id      BIGSERIAL PRIMARY KEY,
  nin           VARCHAR(50) NOT NULL,
  alert_type    VARCHAR(50) NOT NULL, -- 'EXCEEDS_REGULATORY_CAP', 'VELOCITY_ALERT', 'SUSPICIOUS_IDENTITY'
  severity      VARCHAR(20) NOT NULL DEFAULT 'HIGH',
  total_sims    INT NOT NULL,
  details       JSONB,
  status        VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'INVESTIGATING', 'CLEARED', 'BLOCKED'
  resolution_note TEXT,
  resolved_by   BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_fraud_nin ON sim_fraud_alerts(nin);
CREATE INDEX IF NOT EXISTS idx_sim_fraud_status ON sim_fraud_alerts(status);
