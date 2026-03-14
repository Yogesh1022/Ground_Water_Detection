-- =============================================================================
-- AquaVidarbha — Complete PostgreSQL Schema
-- Covers: User Dashboard · Gov Officer Dashboard · Admin Dashboard
-- Run order: execute this file once against a clean database.
-- Requires: PostgreSQL 14+ with PostGIS extension
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
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
--    Shared across all three dashboards.
--    citizen → User Dashboard (self-register)
--    gov     → Gov Officer Dashboard (admin-created)
--    admin   → Admin Dashboard (seeded / admin-created)
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id              BIGSERIAL        PRIMARY KEY,
    email           TEXT             NOT NULL UNIQUE,
    password_hash   TEXT             NOT NULL,
    name            TEXT             NOT NULL,
    role            user_role        NOT NULL DEFAULT 'citizen',
    district        TEXT,                           -- Vidarbha district (citizen/gov)
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
-- 2. WELLS
--    624+ monitored groundwater wells across 11 Vidarbha districts.
--    PostGIS geometry column for KNN spatial queries (IDW interpolation).
-- ---------------------------------------------------------------------------

CREATE TABLE wells (
    id                  BIGSERIAL       PRIMARY KEY,
    name                TEXT            NOT NULL,
    district            TEXT            NOT NULL,
    taluka              TEXT,
    village             TEXT,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    altitude_masl       DOUBLE PRECISION,           -- metres above sea level
    well_type           TEXT,                       -- dug-well, bore-well, etc.
    depth_total_m       DOUBLE PRECISION,           -- total drilled depth
    aquifer_type        TEXT,
    soil_type           TEXT,
    affected_families   INTEGER          DEFAULT 0,
    is_active           BOOLEAN          NOT NULL DEFAULT TRUE,
    geom                GEOMETRY(Point, 4326),      -- PostGIS point (lon, lat WGS84)
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wells_district    ON wells (district);
CREATE INDEX idx_wells_is_active   ON wells (is_active);
CREATE INDEX idx_wells_geom        ON wells USING GIST (geom);  -- spatial index

-- Trigger: auto-populate geom from lat/lon on insert or update
CREATE OR REPLACE FUNCTION wells_set_geom()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wells_set_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON wells
FOR EACH ROW EXECUTE FUNCTION wells_set_geom();

-- ---------------------------------------------------------------------------
-- 3. WELL_READINGS
--    Monthly groundwater measurement records (~84K rows from CSV seed).
--    Contains the 25 ML feature columns used by the ensemble model.
-- ---------------------------------------------------------------------------

CREATE TABLE well_readings (
    id                      BIGSERIAL       PRIMARY KEY,
    well_id                 BIGINT          NOT NULL REFERENCES wells (id) ON DELETE CASCADE,
    reading_date            DATE            NOT NULL,

    -- Core measurement
    depth_mbgl              DOUBLE PRECISION,       -- depth to water level (metres below ground)
    water_level_masl        DOUBLE PRECISION,       -- water level above mean sea level

    -- Lag features (ML inputs)
    depth_lag_1m            DOUBLE PRECISION,       -- depth 1 month ago
    depth_lag_2m            DOUBLE PRECISION,
    depth_lag_3m            DOUBLE PRECISION,
    depth_lag_1q            DOUBLE PRECISION,       -- depth 1 quarter ago (3 months)
    depth_lag_2q            DOUBLE PRECISION,       -- depth 2 quarters ago
    depth_lag_3q            DOUBLE PRECISION,       -- depth 3 quarters ago

    -- Rainfall features
    rainfall_mm             DOUBLE PRECISION,       -- current month rainfall
    rainfall_30d_mm         DOUBLE PRECISION,       -- 30-day rolling total
    rainfall_90d_mm         DOUBLE PRECISION,       -- 90-day rolling total
    rainfall_deficit_mm     DOUBLE PRECISION,       -- deficit vs historical average
    spi_3                   DOUBLE PRECISION,       -- Standardized Precipitation Index (3-month)
    spi_6                   DOUBLE PRECISION,       -- Standardized Precipitation Index (6-month)

    -- Climate features
    temperature_c           DOUBLE PRECISION,       -- mean monthly temperature
    temperature_max_c       DOUBLE PRECISION,
    temperature_min_c       DOUBLE PRECISION,
    humidity_pct            DOUBLE PRECISION,       -- relative humidity %
    et0_mm                  DOUBLE PRECISION,       -- reference evapotranspiration

    -- Vegetation / soil
    ndvi                    DOUBLE PRECISION,       -- Normalized Difference Vegetation Index (-1 to 1)
    soil_type_code          SMALLINT,               -- encoded soil type (for ML)

    -- Temporal features (derived from reading_date)
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
--    Every prediction request result stored for audit + analytics.
--    multi_month_forecast: [{month, depth_mbgl, risk_level, confidence}]
--    nearest_wells:        [{well_id, distance_km, depth_mbgl}]
--    shap_features:        [{feature, importance, value}]
-- ---------------------------------------------------------------------------

CREATE TABLE predictions (
    id                      BIGSERIAL       PRIMARY KEY,
    user_id                 BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    request_lat             DOUBLE PRECISION NOT NULL,
    request_lon             DOUBLE PRECISION NOT NULL,
    depth_mbgl              DOUBLE PRECISION NOT NULL,
    risk_level              risk_level      NOT NULL,
    confidence_pct          DOUBLE PRECISION NOT NULL,  -- 0–100
    prediction_path         TEXT            NOT NULL,   -- 'EXACT_WELL' | 'IDW_INTERPOLATED' | 'ENVIRONMENTAL_ONLY'

    -- Feature snapshot
    rainfall_mm             DOUBLE PRECISION,
    temperature_c           DOUBLE PRECISION,
    ndvi                    DOUBLE PRECISION,
    soil_type               TEXT,

    -- Per-model outputs (stored for admin ML comparison)
    xgboost_depth           DOUBLE PRECISION,
    lstm_depth              DOUBLE PRECISION,
    random_forest_depth     DOUBLE PRECISION,

    -- JSON payloads
    nearest_wells           JSONB,          -- [{well_id, name, distance_km, depth_mbgl}]
    shap_features           JSONB,          -- [{feature, label, importance, value}]
    multi_month_forecast    JSONB,          -- [{month_offset, label, depth_mbgl, risk_level, confidence}]

    recommendation          TEXT,           -- generated advice text
    actionable_advice       JSONB,          -- ["Store extra water", "Use drip irrigation"]

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictions_user_id    ON predictions (user_id);
CREATE INDEX idx_predictions_created_at ON predictions (created_at DESC);
CREATE INDEX idx_predictions_risk       ON predictions (risk_level);

-- Bounding box index for spatial filtering
CREATE INDEX idx_predictions_location   ON predictions (request_lat, request_lon);

-- ---------------------------------------------------------------------------
-- 5. COMPLAINTS
--    Filed by citizens (User Dashboard). Managed by gov officers (Gov Dashboard).
--    Admin views aggregate stats (Admin Dashboard).
-- ---------------------------------------------------------------------------

CREATE TABLE complaints (
    id                  BIGSERIAL           PRIMARY KEY,
    tracking_number     TEXT                NOT NULL UNIQUE,    -- format: R-XXXXXX
    user_id             BIGINT              REFERENCES users (id) ON DELETE SET NULL,
    type                TEXT                NOT NULL,           -- 'water_shortage' | 'contamination' | 'infrastructure' | 'other'
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

CREATE INDEX idx_complaints_user_id     ON complaints (user_id);
CREATE INDEX idx_complaints_tracking    ON complaints (tracking_number);
CREATE INDEX idx_complaints_status      ON complaints (status);
CREATE INDEX idx_complaints_district    ON complaints (district);
CREATE INDEX idx_complaints_severity    ON complaints (severity);
CREATE INDEX idx_complaints_officer     ON complaints (assigned_officer_id);
CREATE INDEX idx_complaints_created_at  ON complaints (created_at DESC);
-- Composite for gov dashboard "open complaints by district"
CREATE INDEX idx_complaints_status_district ON complaints (status, district);

-- Auto-generate tracking number if not provided
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
--    System-generated (from DANGER predictions) and manual alerts.
--    Shown on User Dashboard alert feed and Gov Dashboard.
-- ---------------------------------------------------------------------------

CREATE TABLE alerts (
    id              BIGSERIAL       PRIMARY KEY,
    type            alert_type      NOT NULL DEFAULT 'info',
    district        TEXT,                           -- NULL = all-Vidarbha alert
    title           TEXT            NOT NULL,
    message         TEXT            NOT NULL,
    confidence_pct  DOUBLE PRECISION,               -- from ML prediction (if auto-generated)
    source          TEXT,                           -- 'ML_ENGINE' | 'MANUAL' | 'WEATHER_API'
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
--    Managed by gov officers. Shown in Gov Dashboard "Tanker Schedule" table.
--    villages: ["Pulgaon","Hinganghat","Wardha"]
-- ---------------------------------------------------------------------------

CREATE TABLE tanker_routes (
    id                  BIGSERIAL       PRIMARY KEY,
    route_name          TEXT            NOT NULL,
    district            TEXT            NOT NULL,
    villages            JSONB           NOT NULL DEFAULT '[]',  -- array of village names
    schedule            TEXT,                                   -- e.g. "Mon/Wed/Fri 08:00"
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
--    Gov officers assign field tasks linked to complaints.
--    Gov Dashboard "Task Assignment" form + Team Workload chart.
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

CREATE INDEX idx_tasks_complaint_id           ON task_assignments (complaint_id);
CREATE INDEX idx_tasks_assignee_officer_id    ON task_assignments (assignee_officer_id);
CREATE INDEX idx_tasks_status                 ON task_assignments (status);
CREATE INDEX idx_tasks_due_date               ON task_assignments (due_date);
-- Composite for workload query
CREATE INDEX idx_tasks_officer_status         ON task_assignments (assignee_officer_id, status);

-- ---------------------------------------------------------------------------
-- 9. AUDIT_LOG
--    Write-once append log. Every write operation across all three dashboards
--    writes a row here. Admin Dashboard "Activity Logs" (full view).
--    Gov Dashboard "Activity Log" (gov-role filtered view).
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
    id              BIGSERIAL       PRIMARY KEY,
    actor_id        BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    actor_role      user_role,
    action          TEXT            NOT NULL,   -- e.g. 'ASSIGN_COMPLAINT', 'SUSPEND_USER', 'UPDATE_SETTINGS'
    target_table    TEXT,                       -- e.g. 'complaints', 'users', 'tanker_routes'
    target_id       BIGINT,                     -- PK of the affected row
    details         JSONB,                      -- diff or context (old/new values, reason)
    ip_address      INET,
    request_id      TEXT,                       -- from X-Request-ID header
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor_id     ON audit_log (actor_id);
CREATE INDEX idx_audit_actor_role   ON audit_log (actor_role);
CREATE INDEX idx_audit_action       ON audit_log (action);
CREATE INDEX idx_audit_target       ON audit_log (target_table, target_id);
CREATE INDEX idx_audit_created_at   ON audit_log (created_at DESC);
-- For gov activity log (filter by gov role)
CREATE INDEX idx_audit_role_created ON audit_log (actor_role, created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. SYSTEM_SETTINGS
--     Key-value store for runtime-configurable thresholds.
--     Admin Dashboard "Settings" form reads/writes here.
--     Default values seeded below.
-- ---------------------------------------------------------------------------

CREATE TABLE system_settings (
    id              BIGSERIAL       PRIMARY KEY,
    key             TEXT            NOT NULL UNIQUE,
    value           JSONB           NOT NULL,
    description     TEXT,
    updated_by_id   BIGINT          REFERENCES users (id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Default settings seed
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
--     Tracks model versions, metrics, and status.
--     Admin Dashboard "ML Model Stats" table + radar chart.
-- ---------------------------------------------------------------------------

CREATE TABLE ml_model_registry (
    id              BIGSERIAL       PRIMARY KEY,
    model_name      TEXT            NOT NULL,   -- 'xgboost' | 'lstm' | 'random_forest' | 'cnn_lstm' | 'gru' | '1d_cnn'
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
--     Metadata catalog of external data sources used by the ML pipeline.
--     Admin Dashboard "Data Overview" table.
-- ---------------------------------------------------------------------------

CREATE TABLE data_sources (
    id                  BIGSERIAL       PRIMARY KEY,
    source_name         TEXT            NOT NULL UNIQUE,
    source_type         TEXT            NOT NULL,   -- 'CSV' | 'API' | 'Satellite' | 'Sensor'
    description         TEXT,
    record_count        BIGINT          DEFAULT 0,
    update_frequency    TEXT,                       -- 'Daily' | 'Monthly' | 'Real-time'
    coverage            TEXT,                       -- e.g. '11 Vidarbha Districts'
    quality_score       DOUBLE PRECISION,           -- 0–100
    last_synced_at      TIMESTAMPTZ,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Seed known data sources
INSERT INTO data_sources (source_name, source_type, description, record_count, update_frequency, coverage, quality_score) VALUES
    ('Vidarbha Groundwater CSV',    'CSV',      'Historical groundwater depth readings from CGWB',  84000, 'Monthly',   '11 Districts, 624 wells', 96.0),
    ('Open-Meteo Weather API',      'API',      'Real-time weather: temp, humidity, rainfall',      0,     'Real-time', '11 Districts',            98.0),
    ('ISRO NDVI Satellite',         'Satellite','Normalized Difference Vegetation Index rasters',   0,     'Monthly',   'Vidarbha Region',         94.0),
    ('NBSS Soil Map',               'CSV',      'National Bureau of Soil Survey soil type data',    624,   'Yearly',    '11 Districts',            99.0)
ON CONFLICT (source_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 13. DISTRICT_STATS  (Materialized View)
--     Pre-aggregated per-district groundwater stats.
--     Refreshed on schedule or after bulk well_readings import.
--     Used by: User Dashboard district table, Gov District Analytics, Admin KPIs.
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW district_stats AS
SELECT
    w.district,
    COUNT(DISTINCT w.id)                                        AS well_count,
    ROUND(AVG(wr.depth_mbgl)::NUMERIC, 2)                      AS avg_depth_mbgl,
    ROUND(MAX(wr.depth_mbgl)::NUMERIC, 2)                      AS max_depth_mbgl,
    ROUND(MIN(wr.depth_mbgl)::NUMERIC, 2)                      AS min_depth_mbgl,

    -- Trend: compare current quarter avg vs previous quarter avg
    ROUND((
        AVG(wr.depth_mbgl) FILTER (
            WHERE wr.reading_date >= DATE_TRUNC('quarter', NOW())
        ) -
        AVG(wr.depth_mbgl) FILTER (
            WHERE wr.reading_date >= DATE_TRUNC('quarter', NOW()) - INTERVAL '3 months'
            AND   wr.reading_date <  DATE_TRUNC('quarter', NOW())
        )
    )::NUMERIC, 2)                                             AS depth_change_qoq,

    -- Risk status based on latest average depth
    CASE
        WHEN AVG(wr.depth_mbgl) > 65 THEN 'DANGER'
        WHEN AVG(wr.depth_mbgl) > 50 THEN 'WARNING'
        WHEN AVG(wr.depth_mbgl) > 35 THEN 'MODERATE'
        ELSE 'SAFE'
    END                                                        AS risk_status,

    -- Crisis index 0–100 (linear scale: 0 = 0m depth, 100 = 100m depth)
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

-- Function to refresh the materialized view (call via cron or after CSV import)
CREATE OR REPLACE FUNCTION refresh_district_stats()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY district_stats;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: updated_at auto-update trigger (reusable for all tables)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_wells_updated_at
BEFORE UPDATE ON wells
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_complaints_updated_at
BEFORE UPDATE ON complaints
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tanker_routes_updated_at
BEFORE UPDATE ON tanker_routes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_task_assignments_updated_at
BEFORE UPDATE ON task_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: default admin user  (password: Admin@12345  → bcrypt cost 12)
-- IMPORTANT: Change this password immediately in production.
-- Generate fresh hash with: htpasswd -bnBC 12 "" Admin@12345 | tr -d ':'
-- ---------------------------------------------------------------------------

INSERT INTO users (email, password_hash, name, role, is_active)
VALUES (
    'admin@aquavidarbha.in',
    '$2a$12$placeholderHashReplaceBeforeDeployment000000000000000000000',
    'System Administrator',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Schema summary
-- ---------------------------------------------------------------------------
-- Tables (12):
--   users, wells, well_readings, predictions,
--   complaints, alerts, tanker_routes, task_assignments,
--   audit_log, system_settings, ml_model_registry, data_sources
--
-- Materialized View (1):
--   district_stats
--
-- Enums (8):
--   user_role, complaint_status, complaint_severity,
--   alert_type, risk_level, task_status, task_priority,
--   tanker_status, model_status
--
-- Dashboard coverage:
--   User Dashboard   → wells, well_readings, predictions, complaints, alerts, district_stats
--   Gov Dashboard    → complaints, task_assignments, tanker_routes, alerts, audit_log (gov-filtered), district_stats
--   Admin Dashboard  → users, ml_model_registry, data_sources, audit_log (full), system_settings, predictions (stats)
-- ---------------------------------------------------------------------------
