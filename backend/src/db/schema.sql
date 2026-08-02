-- NatCA CMS — PostgreSQL Master Schema
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
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id          BIGSERIAL    PRIMARY KEY,
  phone       VARCHAR(30)  NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  purpose     VARCHAR(30)  NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Complaints ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_categories (
  category_id   SERIAL       PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  code          VARCHAR(50)  NOT NULL UNIQUE,
  sla_hours     INT          NOT NULL DEFAULT 72,
  is_financial  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sla_policies (
  policy_id     SERIAL  PRIMARY KEY,
  category_id   INT     REFERENCES complaint_categories ON DELETE CASCADE,
  operator_id   INT     REFERENCES operators ON DELETE CASCADE,
  priority      VARCHAR(20),
  severity      VARCHAR(20),
  sla_hours     INT     NOT NULL,
  warning_pct   INT     NOT NULL DEFAULT 80,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id          BIGSERIAL    PRIMARY KEY,
  complaint_ref         VARCHAR(40)  UNIQUE,
  ticket_number         VARCHAR(50)  UNIQUE,
  user_id               BIGINT       REFERENCES users ON DELETE SET NULL,
  citizen_id            BIGINT       REFERENCES users ON DELETE SET NULL,
  operator_id           INT          REFERENCES operators ON DELETE SET NULL,
  category_id           INT          REFERENCES complaint_categories ON DELETE SET NULL,
  issue_type            VARCHAR(80)  NOT NULL,
  severity              VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
  priority              VARCHAR(20)  NOT NULL DEFAULT 'NORMAL',
  district_id           INT          REFERENCES districts ON DELETE SET NULL,
  chiefdom_id           INT          REFERENCES chiefdoms ON DELETE SET NULL,
  area_detail           VARCHAR(250),
  latitude              DECIMAL(10,7),
  longitude             DECIMAL(10,7),
  description           TEXT,
  status                VARCHAR(30)  NOT NULL DEFAULT 'NEW',
  sla_hours             INT,
  sla_paused_at         TIMESTAMPTZ,
  sla_pause_minutes     INT          NOT NULL DEFAULT 0,
  sla_deadline          TIMESTAMPTZ,
  acknowledged_at       TIMESTAMPTZ,
  first_response_at     TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  reopened_at           TIMESTAMPTZ,
  assigned_officer_id   BIGINT       REFERENCES users ON DELETE SET NULL,
  assigned_to           BIGINT       REFERENCES users ON DELETE SET NULL,
  assigned_inspector_id BIGINT       REFERENCES users ON DELETE SET NULL,
  operator_assigned_at  TIMESTAMPTZ,
  resolution_note       TEXT,
  resolution_notes      TEXT,
  internal_note         TEXT,
  source                VARCHAR(40)  NOT NULL DEFAULT 'WEB',
  ip_address            VARCHAR(45),
  billing_sub_category  VARCHAR(80),
  transaction_ref       VARCHAR(100),
  disputed_amount       DECIMAL(14,2),
  transaction_date      DATE,
  refund_amount         DECIMAL(14,2),
  compensation_amount   DECIMAL(14,2),
  parent_complaint_id   BIGINT       REFERENCES complaints ON DELETE SET NULL,
  is_duplicate          BOOLEAN      NOT NULL DEFAULT FALSE,
  citizen_rating        SMALLINT     CHECK (citizen_rating BETWEEN 1 AND 5),
  citizen_feedback      TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_attachments (
  attachment_id   BIGSERIAL    PRIMARY KEY,
  complaint_id    BIGINT       REFERENCES complaints ON DELETE CASCADE,
  file_name       VARCHAR(255),
  file_path       VARCHAR(500),
  file_url        VARCHAR(500),
  mime_type       VARCHAR(100),
  file_type       VARCHAR(50),
  file_size       INT,
  uploaded_by     BIGINT       REFERENCES users ON DELETE SET NULL,
  uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_timeline (
  event_id        BIGSERIAL    PRIMARY KEY,
  complaint_id    BIGINT       NOT NULL REFERENCES complaints ON DELETE CASCADE,
  event_type      VARCHAR(60)  NOT NULL,
  old_value       TEXT,
  new_value       TEXT,
  note            TEXT,
  is_public       BOOLEAN      NOT NULL DEFAULT FALSE,
  actor_id        BIGINT       REFERENCES users ON DELETE SET NULL,
  actor_name      VARCHAR(150),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_history (
  history_id      BIGSERIAL   PRIMARY KEY,
  complaint_id    BIGINT      NOT NULL REFERENCES complaints ON DELETE CASCADE,
  actor_id        BIGINT      REFERENCES users ON DELETE SET NULL,
  action          VARCHAR(50) NOT NULL,
  old_status      VARCHAR(30),
  new_status      VARCHAR(30),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_messages (
  message_id      BIGSERIAL    PRIMARY KEY,
  complaint_id    BIGINT       NOT NULL REFERENCES complaints ON DELETE CASCADE,
  sender_id       BIGINT       REFERENCES users ON DELETE SET NULL,
  direction       VARCHAR(20)  NOT NULL,
  body            TEXT         NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── KYC ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_submissions (
  kyc_id                BIGSERIAL    PRIMARY KEY,
  kyc_reference         VARCHAR(40)  UNIQUE,
  user_id               BIGINT       REFERENCES users ON DELETE SET NULL,
  phone                 VARCHAR(30)  NOT NULL,
  operator_id           INT          REFERENCES operators ON DELETE SET NULL,
  iccid                 VARCHAR(25),
  nin                   VARCHAR(30),
  first_name            VARCHAR(100),
  last_name             VARCHAR(100),
  date_of_birth         DATE,
  sex                   VARCHAR(10),
  nationality           VARCHAR(60),
  address               TEXT,
  district_id           INT          REFERENCES districts ON DELETE SET NULL,
  chiefdom_id           INT          REFERENCES chiefdoms ON DELETE SET NULL,
  id_type               VARCHAR(30),
  id_number             VARCHAR(100),
  document_url          VARCHAR(500),
  selfie_url            VARCHAR(500),
  id_front_path         VARCHAR(500),
  id_back_path          VARCHAR(500),
  face_image_path       VARCHAR(500),
  face_match_score      DECIMAL(5,2),
  liveness_passed       BOOLEAN,
  liveness_score        DECIMAL(5,2),
  risk_score            DECIMAL(5,2),
  status                VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
  rejection_reason      TEXT,
  reviewed_by           BIGINT       REFERENCES users ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  verified_at           TIMESTAMPTZ,
  operator_confirmed_by BIGINT       REFERENCES users ON DELETE SET NULL,
  operator_confirmed_at TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim_registrations (
  sim_id              BIGSERIAL    PRIMARY KEY,
  user_id             BIGINT       NOT NULL REFERENCES users ON DELETE CASCADE,
  operator_id         INT          NOT NULL REFERENCES operators,
  msisdn              VARCHAR(30)  NOT NULL UNIQUE,
  iccid               VARCHAR(30),
  kyc_id              BIGINT       REFERENCES kyc_submissions(kyc_id),
  status              VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
  registered_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Speed tests ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS speed_tests (
  test_id         BIGSERIAL    PRIMARY KEY,
  user_id         BIGINT       REFERENCES users ON DELETE SET NULL,
  operator_id     INT          REFERENCES operators ON DELETE SET NULL,
  district_id     INT          REFERENCES districts ON DELETE SET NULL,
  latitude        DECIMAL(10,7),
  longitude       DECIMAL(10,7),
  network_type    VARCHAR(20),
  download_mbps   DECIMAL(10,3),
  upload_mbps     DECIMAL(10,3),
  ping_ms         NUMERIC(8,2),
  jitter_ms       DECIMAL(8,3),
  packet_loss_pct DECIMAL(5,2),
  cell_id         VARCHAR(50),
  device_info     TEXT,
  source          VARCHAR(20)  NOT NULL DEFAULT 'MOBILE',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Content & USSD ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ussd_codes (
  code_id          SERIAL       PRIMARY KEY,
  operator_id      INT          REFERENCES operators ON DELETE CASCADE,
  service_category VARCHAR(60)  NOT NULL,
  code             VARCHAR(30)  NOT NULL,
  description      TEXT         NOT NULL,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  last_verified    DATE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tariffs (
  tariff_id       SERIAL       PRIMARY KEY,
  operator_id     INT          REFERENCES operators ON DELETE CASCADE,
  tariff_type     VARCHAR(50)  NOT NULL,
  rate            DECIMAL(10,4) NOT NULL,
  unit            VARCHAR(30)  NOT NULL,
  valid_from      DATE,
  valid_to        DATE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_items (
  content_id      BIGSERIAL    PRIMARY KEY,
  content_type    VARCHAR(50)  NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT         NOT NULL,
  category        VARCHAR(80),
  media_type      VARCHAR(20)  DEFAULT 'NONE',
  media_url       TEXT,
  is_published    BOOLEAN      NOT NULL DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  author_id       BIGINT       REFERENCES users ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Incidents ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  incident_id          BIGSERIAL    PRIMARY KEY,
  operator_id          INT          REFERENCES operators ON DELETE CASCADE,
  district_id          INT          REFERENCES districts,
  title                VARCHAR(255) NOT NULL,
  description          TEXT,
  status               VARCHAR(40)  NOT NULL DEFAULT 'OPEN',
  severity             VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
  affected_subscribers INT,
  started_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at          TIMESTAMPTZ,
  created_by           BIGINT       REFERENCES users ON DELETE SET NULL,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Notifications & Audit ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGSERIAL    PRIMARY KEY,
  user_id         BIGINT       NOT NULL REFERENCES users ON DELETE CASCADE,
  type            VARCHAR(60)  NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT,
  data            JSONB,
  channel         VARCHAR(20)  NOT NULL DEFAULT 'IN_APP',
  is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id          BIGSERIAL    PRIMARY KEY,
  user_id         BIGINT       REFERENCES users ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(60),
  entity_id       BIGINT,
  changes         JSONB,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_complaints_status   ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_operator ON complaints(operator_id);
CREATE INDEX IF NOT EXISTS idx_complaints_district ON complaints(district_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created  ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_user     ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_phone           ON kyc_submissions(phone);
CREATE INDEX IF NOT EXISTS idx_kyc_status          ON kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_timeline_complaint  ON complaint_timeline(complaint_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user       ON sessions(user_id);
