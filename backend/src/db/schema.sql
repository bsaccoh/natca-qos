-- NatCA CMS — PostgreSQL Schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Reference tables ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operators (
  operator_id     SERIAL PRIMARY KEY,
  operator_name   VARCHAR(100) NOT NULL UNIQUE,
  code            VARCHAR(10)  NOT NULL UNIQUE,
  logo_url        VARCHAR(500),
  hotline         VARCHAR(30),
  status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS districts (
  district_id     SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL UNIQUE,
  province        VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS chiefdoms (
  chiefdom_id     SERIAL PRIMARY KEY,
  district_id     INT REFERENCES districts ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL
);

-- ── Auth ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  role_id     SERIAL PRIMARY KEY,
  role_key    VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id         BIGSERIAL    PRIMARY KEY,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(200) UNIQUE,
  phone           VARCHAR(30)  UNIQUE,
  password_hash   VARCHAR(255),
  role_id         INT          REFERENCES roles,
  operator_id     INT          REFERENCES operators ON DELETE SET NULL,
  district_id     INT          REFERENCES districts ON DELETE SET NULL,
  otp_verified    BOOLEAN      NOT NULL DEFAULT FALSE,
  phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  biometric_key   TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         BIGINT       NOT NULL REFERENCES users ON DELETE CASCADE,
  refresh_hash    VARCHAR(255) NOT NULL,
  user_agent      TEXT,
  ip_address      VARCHAR(45),
  expires_at      TIMESTAMPTZ  NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Complaints ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_categories (
  category_id     SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL UNIQUE,
  code            VARCHAR(50)  NOT NULL UNIQUE,
  sla_hours       INT          NOT NULL DEFAULT 48,
  is_financial    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id         BIGSERIAL     PRIMARY KEY,
  ticket_number        VARCHAR(50)   NOT NULL UNIQUE,
  citizen_id           BIGINT        REFERENCES users(user_id) ON DELETE SET NULL,
  operator_id          INT           NOT NULL REFERENCES operators,
  category_id          INT           REFERENCES complaint_categories,
  issue_type           VARCHAR(50)   NOT NULL,
  severity             VARCHAR(20)   NOT NULL DEFAULT 'MEDIUM',
  district_id          INT           REFERENCES districts,
  chiefdom_id          INT           REFERENCES chiefdoms,
  area_detail          VARCHAR(255),
  latitude             NUMERIC(10, 7),
  longitude            NUMERIC(10, 7),
  description          TEXT          NOT NULL,
  billing_sub_category VARCHAR(100),
  transaction_ref      VARCHAR(100),
  disputed_amount      NUMERIC(12, 2),
  transaction_date     DATE,
  status               VARCHAR(30)   NOT NULL DEFAULT 'SUBMITTED',
  priority             VARCHAR(20)   NOT NULL DEFAULT 'NORMAL',
  assigned_to          BIGINT        REFERENCES users(user_id) ON DELETE SET NULL,
  resolution_notes     TEXT,
  resolved_at          TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_history (
  history_id      BIGSERIAL   PRIMARY KEY,
  complaint_id    BIGINT      NOT NULL REFERENCES complaints ON DELETE CASCADE,
  actor_id        BIGINT      REFERENCES users(user_id),
  action          VARCHAR(50) NOT NULL,
  old_status      VARCHAR(30),
  new_status      VARCHAR(30),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_attachments (
  attachment_id   BIGSERIAL    PRIMARY KEY,
  complaint_id    BIGINT       NOT NULL REFERENCES complaints ON DELETE CASCADE,
  file_name       VARCHAR(255) NOT NULL,
  file_url        VARCHAR(500) NOT NULL,
  file_type       VARCHAR(50),
  file_size       INT,
  uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Incidents & Outages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS network_incidents (
  incident_id         BIGSERIAL    PRIMARY KEY,
  operator_id         INT          NOT NULL REFERENCES operators,
  district_id         INT          REFERENCES districts,
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  severity            VARCHAR(20)  NOT NULL DEFAULT 'MAJOR',
  status              VARCHAR(30)  NOT NULL DEFAULT 'OPEN',
  affected_subscribers INT,
  started_at          TIMESTAMPTZ  NOT NULL,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── QoS & Speed Tests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS speed_test_results (
  test_id             BIGSERIAL     PRIMARY KEY,
  user_id             BIGINT        REFERENCES users(user_id) ON DELETE SET NULL,
  operator_id         INT           REFERENCES operators,
  district_id         INT           REFERENCES districts,
  download_mbps       NUMERIC(8, 2) NOT NULL,
  upload_mbps         NUMERIC(8, 2) NOT NULL,
  ping_ms             NUMERIC(8, 2) NOT NULL,
  jitter_ms           NUMERIC(8, 2),
  packet_loss_pct     NUMERIC(5, 2),
  network_type        VARCHAR(20),
  device_info         TEXT,
  latitude            NUMERIC(10, 7),
  longitude           NUMERIC(10, 7),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── KYC & SIM ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_verifications (
  kyc_id              BIGSERIAL    PRIMARY KEY,
  user_id             BIGINT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  id_type             VARCHAR(50)  NOT NULL,
  id_number           VARCHAR(100) NOT NULL,
  document_url        VARCHAR(500),
  selfie_url          VARCHAR(500),
  liveness_score      NUMERIC(5, 2),
  status              VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
  verified_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim_registrations (
  sim_id              BIGSERIAL    PRIMARY KEY,
  user_id             BIGINT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  operator_id         INT          NOT NULL REFERENCES operators,
  msisdn              VARCHAR(30)  NOT NULL UNIQUE,
  iccid               VARCHAR(30),
  kyc_id              BIGINT       REFERENCES kyc_verifications(kyc_id),
  status              VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
  registered_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── CMS & Content ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_items (
  content_id          BIGSERIAL    PRIMARY KEY,
  content_type        VARCHAR(50)  NOT NULL,
  title               VARCHAR(250) NOT NULL,
  body                TEXT         NOT NULL,
  media_type          VARCHAR(20),
  media_url           VARCHAR(500),
  is_published        BOOLEAN      NOT NULL DEFAULT FALSE,
  published_at        TIMESTAMPTZ,
  author_id           BIGINT       REFERENCES users(user_id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ussd_codes (
  code_id             SERIAL       PRIMARY KEY,
  operator_id         INT          REFERENCES operators ON DELETE CASCADE,
  service_category    VARCHAR(100) NOT NULL,
  code                VARCHAR(50)  NOT NULL,
  description         TEXT         NOT NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tariffs (
  tariff_id           SERIAL        PRIMARY KEY,
  operator_id         INT           NOT NULL REFERENCES operators ON DELETE CASCADE,
  tariff_type         VARCHAR(50)   NOT NULL,
  rate                NUMERIC(10, 4) NOT NULL,
  unit                VARCHAR(20)   NOT NULL,
  effective_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
