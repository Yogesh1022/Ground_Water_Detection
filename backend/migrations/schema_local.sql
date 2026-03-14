-- =============================================================================
-- AquaVidarbha — Local Dev Schema (NO PostGIS required)
-- Identical to schema.sql except:
--   • postgis extension removed
--   • wells.geom column removed
--   • GIST spatial index removed
--   • wells_set_geom trigger/function removed
--   • district_stats materialized view uses only lat/lon (no ST_* calls)
-- Use this for local development. Use schema.sql in production (requires PostGIS).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('citizen', 'gov', 'admin');

CREATE TYPE complaint_status AS ENUM (
    'open',
    'in_review',
    'in_progress',
    'resolved',
    'escalated'
);

CREATE TYPE complaint_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE alert_type AS ENUM ('critical', 'warning', 'info', 'success');

CREATE TYPE risk_level AS ENUM ('SAFE', 'MODERATE', 'WARNING', 'DANGER');

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE tanker_status AS ENUM ('active', 'inactive', 'maintenance');

CREATE TYPE model_status AS ENUM ('production', 'backup', 'testing', 'retired');

-- ---------------------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id              BIGSERIAL        PRIMARY KEY,
    email           TEXT             NOT NULL UNIQUE,
    password_hash   TEXT             NOT NULL,
    name            TEXT             NOT NULL,
    role            user_role        NOT NULL DEFAULT 'citizen',
    district        TEXT,
    phone           TEXT,
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role        ON users (role);
CREATE INDEX idx_users_district    ON users (district);
CREATE INDEX idx_users_is_active   ON users (is_active);
CREATE INDEX idx_users_email       ON users (email);

-- ---------------------------------------------------------------------------
-- 2. WELLS  (no PostGIS geom column)
-- ---------------------------------------------------------------------------

CREATE TABLE wells (
    id                  BIGSERIAL       PRIMARY KEY,
    name                TEXT            NOT NULL,
    district            TEXT            NOT NULL,
    taluka              TEXT,
    village             TEXT,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    altitude_masl       DOUBLE PRECISION,
    well_type           TEXT,
    depth_total_m       DOUBLE PRECISION,
    aquifer_type        TEXT,
    soil_type           TEXT,
    affected_families   INTEGER          DEFAULT 0,
    is_active           BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wells_district    ON wells (district);
CREATE INDEX idx_wells_is_active   ON wells (is_active);
CREATE INDEX idx_wells_lat_lon     ON wells (latitude, longitude);

-- ---------------------------------------------------------------------------
-- 3. WELL_READINGS
-- ---------------------------------------------------------------------------

CREATE TABLE well_readings (
    id                      BIGSERIAL       PRIMARY KEY,
    well_id                 BIGINT          NOT NULL REFERENCES wells (id) ON DELETE CASCADE,
    reading_date            DATE            NOT NULL,

    depth_mbgl              DOUBLE PRECISION,
    water_level_masl        DOUBLE PRECISION,

    depth_lag_1m            DOUBLE PRECISION,
    depth_lag_2m            DOUBLE PRECISION,
    depth_lag_3m            DOUBLE PRECISION,
    depth_lag_1q            DOUBLE PRECISION,
    depth_lag_2q            DOUBLE PRECISION,
    depth_lag_3q            DOUBLE PRECISION,

    rainfall_mm             DOUBLE PRECISION,
    rainfall_30d_mm         DOUBLE PRECISION,
    rainfall_90d_mm         DOUBLE PRECISION,
    rainfall_deficit_mm     DOUBLE PRECISION,
    spi_3                   DOUBLE PRECISION,
    spi_6                   DOUBLE PRECISION,

    temperature_c           DOUBLE PRECISION,
    temperature_max_c       DOUBLE PRECISION,
    temperature_min_c       DOUBLE PRECISION,
    humidity_pct            DOUBLE PRECISION,
    et0_mm                  DOUBLE PRECISION,

    ndvi                    DOUBLE PRECISION,
    soil_type_code          SMALLINT,

    month                   SMALLINT    GENERATED ALWAYS AS (EXTRACT(MONTH  FROM reading_date)::SMALLINT) STORED,
    year                    SMALLINT    GENERATED ALWAYS AS (EXTRACT(YEAR   FROM reading_date)::SMALLINT) STORED,
    season                  TEXT        GENERATED ALWAYS AS (
                                CASE
                                    WHEN EXTRACT(MONTH FROM reading_date) IN (6,7,8,9)  THEN 'kharif'
                                    WHEN EXTRACT(MONTH FROM reading_date) IN (10,11,12) THEN 'rabi'
                                    ELSE 'summer'
                                END
                            ) STORED,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_well_reading UNIQUE (well_id, reading_date)
);

CREATE INDEX idx_well_readings_well_id      ON well_readings (well_id);
CREATE INDEX idx_well_readings_date         ON well_readings (reading_date DESC);
CREATE INDEX idx_well_readings_well_date    ON well_readings (well_id, reading_date DESC);

-- ---------------------------------------------------------------------------
-- 4. PREDICTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE predictions (
    id                      BIGSERIAL       PRIMARY KEY,
    user_id                 BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    request_lat             DOUBLE PRECISION NOT NULL,
    request_lon             DOUBLE PRECISION NOT NULL,
    depth_mbgl              DOUBLE PRECISION NOT NULL,
    risk_level              risk_level      NOT NULL,
    confidence_pct          DOUBLE PRECISION NOT NULL,
    prediction_path         TEXT            NOT NULL,

    rainfall_mm             DOUBLE PRECISION,
    temperature_c           DOUBLE PRECISION,
    ndvi                    DOUBLE PRECISION,
    soil_type               TEXT,

    xgboost_depth           DOUBLE PRECISION,
    lstm_depth              DOUBLE PRECISION,
    random_forest_depth     DOUBLE PRECISION,

    nearest_wells           JSONB,
    shap_features           JSONB,
    multi_month_forecast    JSONB,

    recommendation          TEXT,
    actionable_advice       JSONB,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictions_user_id    ON predictions (user_id);
CREATE INDEX idx_predictions_created_at ON predictions (created_at DESC);
CREATE INDEX idx_predictions_risk       ON predictions (risk_level);
CREATE INDEX idx_predictions_location   ON predictions (request_lat, request_lon);

-- ---------------------------------------------------------------------------
-- 5. COMPLAINTS
-- ---------------------------------------------------------------------------

CREATE TABLE complaints (
    id                  BIGSERIAL           PRIMARY KEY,
    tracking_number     TEXT                NOT NULL UNIQUE,
    user_id             BIGINT              REFERENCES users (id) ON DELETE SET NULL,
    type                TEXT                NOT NULL,
    district            TEXT                NOT NULL,
    taluka              TEXT,
    village             TEXT,
    severity            complaint_severity  NOT NULL DEFAULT 'medium',
    description         TEXT                NOT NULL,
    status              complaint_status    NOT NULL DEFAULT 'open',
    assigned_officer_id BIGINT              REFERENCES users (id) ON DELETE SET NULL,
    escalation_note     TEXT,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_user_id         ON complaints (user_id);
CREATE INDEX idx_complaints_tracking        ON complaints (tracking_number);
CREATE INDEX idx_complaints_status          ON complaints (status);
CREATE INDEX idx_complaints_district        ON complaints (district);
CREATE INDEX idx_complaints_severity        ON complaints (severity);
CREATE INDEX idx_complaints_officer         ON complaints (assigned_officer_id);
CREATE INDEX idx_complaints_created_at      ON complaints (created_at DESC);
CREATE INDEX idx_complaints_status_district ON complaints (status, district);

CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
        NEW.tracking_number = 'R-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_complaints_tracking
BEFORE INSERT ON complaints
FOR EACH ROW EXECUTE FUNCTION generate_tracking_number();

-- ---------------------------------------------------------------------------
-- 6. ALERTS
-- ---------------------------------------------------------------------------

CREATE TABLE alerts (
    id              BIGSERIAL       PRIMARY KEY,
    type            alert_type      NOT NULL DEFAULT 'info',
    district        TEXT,
    title           TEXT            NOT NULL,
    message         TEXT            NOT NULL,
    confidence_pct  DOUBLE PRECISION,
    source          TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    prediction_id   BIGINT          REFERENCES predictions (id) ON DELETE SET NULL,
    created_by_id   BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_district    ON alerts (district);
CREATE INDEX idx_alerts_type        ON alerts (type);
CREATE INDEX idx_alerts_is_active   ON alerts (is_active);
CREATE INDEX idx_alerts_created_at  ON alerts (created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. TANKER_ROUTES
-- ---------------------------------------------------------------------------

CREATE TABLE tanker_routes (
    id                  BIGSERIAL       PRIMARY KEY,
    route_name          TEXT            NOT NULL,
    district            TEXT            NOT NULL,
    villages            JSONB           NOT NULL DEFAULT '[]',
    schedule            TEXT,
    capacity_liters     INTEGER,
    status              tanker_status   NOT NULL DEFAULT 'active',
    assigned_driver     TEXT,
    contact_number      TEXT,
    created_by_id       BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tanker_routes_district ON tanker_routes (district);
CREATE INDEX idx_tanker_routes_status   ON tanker_routes (status);

-- ---------------------------------------------------------------------------
-- 8. TASK_ASSIGNMENTS
-- ---------------------------------------------------------------------------

CREATE TABLE task_assignments (
    id                  BIGSERIAL       PRIMARY KEY,
    complaint_id        BIGINT          NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
    assignee_officer_id BIGINT          NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    assigned_by_id      BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    due_date            DATE,
    priority            task_priority   NOT NULL DEFAULT 'medium',
    status              task_status     NOT NULL DEFAULT 'pending',
    notes               TEXT,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_complaint_id        ON task_assignments (complaint_id);
CREATE INDEX idx_tasks_assignee_officer_id ON task_assignments (assignee_officer_id);
CREATE INDEX idx_tasks_status              ON task_assignments (status);
CREATE INDEX idx_tasks_due_date            ON task_assignments (due_date);
CREATE INDEX idx_tasks_officer_status      ON task_assignments (assignee_officer_id, status);

-- ---------------------------------------------------------------------------
-- 9. AUDIT_LOG
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
    id              BIGSERIAL       PRIMARY KEY,
    actor_id        BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    actor_role      user_role,
    action          TEXT            NOT NULL,
    target_table    TEXT,
    target_id       BIGINT,
    details         JSONB,
    ip_address      INET,
    request_id      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor_id     ON audit_log (actor_id);
CREATE INDEX idx_audit_actor_role   ON audit_log (actor_role);
CREATE INDEX idx_audit_action       ON audit_log (action);
CREATE INDEX idx_audit_target       ON audit_log (target_table, target_id);
CREATE INDEX idx_audit_created_at   ON audit_log (created_at DESC);
CREATE INDEX idx_audit_role_created ON audit_log (actor_role, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. SYSTEM_SETTINGS
-- ---------------------------------------------------------------------------

CREATE TABLE system_settings (
    id              BIGSERIAL       PRIMARY KEY,
    key             TEXT            NOT NULL UNIQUE,
    value           JSONB           NOT NULL,
    description     TEXT,
    updated_by_id   BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description) VALUES
    ('alert_threshold_critical_depth',  '65',   'Depth (mbgl) above which risk is classified DANGER'),
    ('alert_threshold_warning_depth',   '50',   'Depth (mbgl) above which risk is classified WARNING'),
    ('alert_threshold_moderate_depth',  '35',   'Depth (mbgl) above which risk is classified MODERATE'),
    ('forecast_horizon_months',         '3',    'Number of months ahead for multi-month forecast'),
    ('retrain_frequency_days',          '30',   'How often the ML model retraining job is triggered (days)'),
    ('prediction_cache_ttl_seconds',    '3600', 'Redis TTL for prediction cache entries'),
    ('district_cache_ttl_seconds',      '900',  'Redis TTL for district stats cache'),
    ('max_complaint_assignments',       '5',    'Max number of tasks one officer can be assigned simultaneously')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. ML_MODEL_REGISTRY
-- ---------------------------------------------------------------------------

CREATE TABLE ml_model_registry (
    id              BIGSERIAL       PRIMARY KEY,
    model_name      TEXT            NOT NULL,
    version         TEXT            NOT NULL,
    status          model_status    NOT NULL DEFAULT 'testing',
    r2_score        DOUBLE PRECISION,
    rmse            DOUBLE PRECISION,
    mae             DOUBLE PRECISION,
    training_rows   INTEGER,
    feature_count   SMALLINT,
    model_file_path TEXT,
    config_path     TEXT,
    notes           TEXT,
    trained_at      TIMESTAMPTZ,
    registered_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    registered_by   BIGINT          REFERENCES users (id) ON DELETE SET NULL,

    CONSTRAINT uq_model_version UNIQUE (model_name, version)
);

CREATE INDEX idx_mlmodel_name   ON ml_model_registry (model_name);
CREATE INDEX idx_mlmodel_status ON ml_model_registry (status);

-- ---------------------------------------------------------------------------
-- 12. DATA_SOURCES
-- ---------------------------------------------------------------------------

CREATE TABLE data_sources (
    id                  BIGSERIAL       PRIMARY KEY,
    source_name         TEXT            NOT NULL UNIQUE,
    source_type         TEXT            NOT NULL,
    description         TEXT,
    record_count        BIGINT          DEFAULT 0,
    update_frequency    TEXT,
    coverage            TEXT,
    quality_score       DOUBLE PRECISION,
    last_synced_at      TIMESTAMPTZ,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

INSERT INTO data_sources (source_name, source_type, description, record_count, update_frequency, coverage, quality_score) VALUES
    ('Vidarbha Groundwater CSV',    'CSV',      'Historical groundwater depth readings from CGWB',  84000, 'Monthly',   '11 Districts, 624 wells', 96.0),
    ('Open-Meteo Weather API',      'API',      'Real-time weather: temp, humidity, rainfall',      0,     'Real-time', '11 Districts',            98.0),
    ('ISRO NDVI Satellite',         'Satellite','Normalized Difference Vegetation Index rasters',   0,     'Monthly',   'Vidarbha Region',         94.0),
    ('NBSS Soil Map',               'CSV',      'National Bureau of Soil Survey soil type data',    624,   'Yearly',    '11 Districts',            99.0)
ON CONFLICT (source_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. DISTRICT_STATS  (Materialized View — no PostGIS, pure SQL aggregation)
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW district_stats AS
SELECT
    w.district,
    COUNT(DISTINCT w.id)                                        AS well_count,
    ROUND(AVG(wr.depth_mbgl)::NUMERIC, 2)                      AS avg_depth_mbgl,
    ROUND(MAX(wr.depth_mbgl)::NUMERIC, 2)                      AS max_depth_mbgl,
    ROUND(MIN(wr.depth_mbgl)::NUMERIC, 2)                      AS min_depth_mbgl,

    ROUND((
        AVG(wr.depth_mbgl) FILTER (
            WHERE wr.reading_date >= DATE_TRUNC('quarter', NOW())
        ) -
        AVG(wr.depth_mbgl) FILTER (
            WHERE wr.reading_date >= DATE_TRUNC('quarter', NOW()) - INTERVAL '3 months'
            AND   wr.reading_date <  DATE_TRUNC('quarter', NOW())
        )
    )::NUMERIC, 2)                                             AS depth_change_qoq,

    CASE
        WHEN AVG(wr.depth_mbgl) > 65 THEN 'DANGER'
        WHEN AVG(wr.depth_mbgl) > 50 THEN 'WARNING'
        WHEN AVG(wr.depth_mbgl) > 35 THEN 'MODERATE'
        ELSE 'SAFE'
    END                                                        AS risk_status,

    LEAST(100, ROUND(AVG(wr.depth_mbgl)::NUMERIC, 0))         AS crisis_index,
    MAX(wr.reading_date)                                       AS last_reading_date,
    NOW()                                                      AS refreshed_at

FROM wells w
JOIN well_readings wr ON wr.well_id = w.id
    AND wr.reading_date >= NOW() - INTERVAL '12 months'
WHERE w.is_active = TRUE
GROUP BY w.district
WITH DATA;

CREATE UNIQUE INDEX idx_district_stats_district ON district_stats (district);

CREATE OR REPLACE FUNCTION refresh_district_stats()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY district_stats;
END;
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_wells_updated_at
BEFORE UPDATE ON wells FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_complaints_updated_at
BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tanker_routes_updated_at
BEFORE UPDATE ON tanker_routes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_task_assignments_updated_at
BEFORE UPDATE ON task_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: default admin user  (password: Admin@12345 → bcrypt cost 12)
-- IMPORTANT: Change this password before exposing to any network.
-- ---------------------------------------------------------------------------

INSERT INTO users (email, password_hash, name, role, is_active)
VALUES (
    'admin@aquavidarbha.in',
    '$2a$12$placeholderHashReplaceBeforeDeployment000000000000000000000',
    'System Administrator',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;
