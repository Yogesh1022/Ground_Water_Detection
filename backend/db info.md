# DB Info

## Database
- **Database name:** `aquavidarbha`
- **Engine:** PostgreSQL
- **Production schema:** `backend/migrations/schema.sql`
- **Local dev schema:** `backend/migrations/schema_local.sql`
- **Main difference:** production uses **PostGIS** and a `geom` column on `wells`; local schema removes PostGIS-specific parts.

## Top-Level Schema Map
- **Tables:** 12
- **Materialized views:** 1
- **Enums:** 8

## Enums
- `user_role`: `citizen`, `gov`, `admin`
- `complaint_status`: `open`, `in_review`, `in_progress`, `resolved`, `escalated`
- `complaint_severity`: `low`, `medium`, `high`, `critical`
- `alert_type`: `critical`, `warning`, `info`, `success`
- `risk_level`: `SAFE`, `MODERATE`, `WARNING`, `DANGER`
- `task_status`: `pending`, `in_progress`, `completed`, `cancelled`
- `task_priority`: `low`, `medium`, `high`, `urgent`
- `tanker_status`: `active`, `inactive`, `maintenance`
- `model_status`: `production`, `backup`, `testing`, `retired`

## Tables

### 1) `users`
Shared login/profile table for all roles.

**Fields**
- `id` BIGSERIAL, primary key
- `email` TEXT, unique, not null
- `password_hash` TEXT, not null
- `name` TEXT, not null
- `role` `user_role`, default `citizen`
- `district` TEXT, nullable
- `phone` TEXT, nullable
- `is_active` BOOLEAN, default `true`
- `created_at` TIMESTAMPTZ, default `now()`
- `updated_at` TIMESTAMPTZ, default `now()`

**Indexes**
- `idx_users_role`
- `idx_users_district`
- `idx_users_is_active`
- `idx_users_email`

---

### 2) `wells`
Master well registry.

**Fields**
- `id` BIGSERIAL, primary key
- `name` TEXT, not null
- `district` TEXT, not null
- `taluka` TEXT, nullable
- `village` TEXT, nullable
- `latitude` DOUBLE PRECISION, not null
- `longitude` DOUBLE PRECISION, not null
- `altitude_masl` DOUBLE PRECISION, nullable
- `well_type` TEXT, nullable
- `depth_total_m` DOUBLE PRECISION, nullable
- `aquifer_type` TEXT, nullable
- `soil_type` TEXT, nullable
- `affected_families` INTEGER, default `0`
- `is_active` BOOLEAN, default `true`
- `geom` GEOMETRY(Point, 4326), production only
- `created_at` TIMESTAMPTZ, default `now()`
- `updated_at` TIMESTAMPTZ, default `now()`

**Indexes**
- `idx_wells_district`
- `idx_wells_is_active`
- `idx_wells_geom` in production
- `idx_wells_lat_lon` in local schema

**Note**
- Production auto-fills `geom` from latitude/longitude using a trigger.

---

### 3) `well_readings`
Historical groundwater readings.

**Fields**
- `id` BIGSERIAL, primary key
- `well_id` BIGINT, foreign key to `wells(id)`, cascade delete
- `reading_date` DATE, not null
- `depth_mbgl` DOUBLE PRECISION, nullable
- `water_level_masl` DOUBLE PRECISION, nullable
- `depth_lag_1m` DOUBLE PRECISION, nullable
- `depth_lag_2m` DOUBLE PRECISION, nullable
- `depth_lag_3m` DOUBLE PRECISION, nullable
- `depth_lag_1q` DOUBLE PRECISION, nullable
- `depth_lag_2q` DOUBLE PRECISION, nullable
- `depth_lag_3q` DOUBLE PRECISION, nullable
- `rainfall_mm` DOUBLE PRECISION, nullable
- `rainfall_30d_mm` DOUBLE PRECISION, nullable
- `rainfall_90d_mm` DOUBLE PRECISION, nullable
- `rainfall_deficit_mm` DOUBLE PRECISION, nullable
- `spi_3` DOUBLE PRECISION, nullable
- `spi_6` DOUBLE PRECISION, nullable
- `temperature_c` DOUBLE PRECISION, nullable
- `temperature_max_c` DOUBLE PRECISION, nullable
- `temperature_min_c` DOUBLE PRECISION, nullable
- `humidity_pct` DOUBLE PRECISION, nullable
- `et0_mm` DOUBLE PRECISION, nullable
- `ndvi` DOUBLE PRECISION, nullable
- `soil_type_code` SMALLINT, nullable
- `month` SMALLINT, generated from `reading_date`
- `year` SMALLINT, generated from `reading_date`
- `season` TEXT, generated from `reading_date`
- `created_at` TIMESTAMPTZ, default `now()`

**Constraints / indexes**
- Unique constraint on `(well_id, reading_date)`
- `idx_well_readings_well_id`
- `idx_well_readings_date`
- `idx_well_readings_well_date`

---

### 4) `predictions`
Stores prediction requests and outputs.

**Fields**
- `id` BIGSERIAL, primary key
- `user_id` BIGINT, nullable, FK to `users(id)`
- `request_lat` DOUBLE PRECISION, not null
- `request_lon` DOUBLE PRECISION, not null
- `depth_mbgl` DOUBLE PRECISION, not null
- `risk_level` `risk_level`, not null
- `confidence_pct` DOUBLE PRECISION, not null
- `prediction_path` TEXT, not null
- `rainfall_mm` DOUBLE PRECISION, nullable
- `temperature_c` DOUBLE PRECISION, nullable
- `ndvi` DOUBLE PRECISION, nullable
- `soil_type` TEXT, nullable
- `xgboost_depth` DOUBLE PRECISION, nullable
- `lstm_depth` DOUBLE PRECISION, nullable
- `random_forest_depth` DOUBLE PRECISION, nullable
- `nearest_wells` JSONB, nullable
- `shap_features` JSONB, nullable
- `multi_month_forecast` JSONB, nullable
- `recommendation` TEXT, nullable
- `actionable_advice` JSONB, nullable
- `created_at` TIMESTAMPTZ, default `now()`

**Indexes**
- `idx_predictions_user_id`
- `idx_predictions_created_at`
- `idx_predictions_risk`
- `idx_predictions_location`

---

### 5) `complaints`
Citizen complaints and tracking.

**Fields**
- `id` BIGSERIAL, primary key
- `tracking_number` TEXT, unique, not null
- `user_id` BIGINT, nullable, FK to `users(id)`
- `type` TEXT, not null
- `district` TEXT, not null
- `taluka` TEXT, nullable
- `village` TEXT, nullable
- `severity` `complaint_severity`, default `medium`
- `description` TEXT, not null
- `status` `complaint_status`, default `open`
- `assigned_officer_id` BIGINT, nullable, FK to `users(id)`
- `escalation_note` TEXT, nullable
- `resolved_at` TIMESTAMPTZ, nullable
- `created_at` TIMESTAMPTZ, default `now()`
- `updated_at` TIMESTAMPTZ, default `now()`

**Indexes**
- `idx_complaints_user_id`
- `idx_complaints_tracking`
- `idx_complaints_status`
- `idx_complaints_district`
- `idx_complaints_severity`
- `idx_complaints_officer`
- `idx_complaints_created_at`
- `idx_complaints_status_district`

---

### 6) `alerts`
System and manual alerts.

**Fields**
- `id` BIGSERIAL, primary key
- `type` `alert_type`, default `info`
- `district` TEXT, nullable
- `title` TEXT, not null
- `message` TEXT, not null
- `confidence_pct` DOUBLE PRECISION, nullable
- `source` TEXT, nullable
- `is_active` BOOLEAN, default `true`
- `prediction_id` BIGINT, nullable, FK to `predictions(id)`
- `created_by_id` BIGINT, nullable, FK to `users(id)`
- `created_at` TIMESTAMPTZ, default `now()`

**Indexes**
- `idx_alerts_district`
- `idx_alerts_type`
- `idx_alerts_is_active`
- `idx_alerts_created_at`

---

### 7) `tanker_routes`
Gov tanker route planning.

**Fields**
- `id` BIGSERIAL, primary key
- `route_name` TEXT, not null
- `district` TEXT, not null
- `villages` JSONB, default `[]`
- `schedule` TEXT, nullable
- `capacity_liters` INTEGER, nullable
- `status` `tanker_status`, default `active`
- `assigned_driver` TEXT, nullable
- `contact_number` TEXT, nullable
- `created_by_id` BIGINT, nullable, FK to `users(id)`
- `created_at` TIMESTAMPTZ, default `now()`
- `updated_at` TIMESTAMPTZ, default `now()`

**Indexes**
- `idx_tanker_routes_district`
- `idx_tanker_routes_status`

---

### 8) `task_assignments`
Tasks linked to complaints.

**Fields**
- `id` BIGSERIAL, primary key
- `complaint_id` BIGINT, not null, FK to `complaints(id)`
- `assignee_officer_id` BIGINT, not null, FK to `users(id)`
- `assigned_by_id` BIGINT, nullable, FK to `users(id)`
- `due_date` DATE, nullable
- `priority` `task_priority`, default `medium`
- `status` `task_status`, default `pending`
- `notes` TEXT, nullable
- `completed_at` TIMESTAMPTZ, nullable
- `created_at` TIMESTAMPTZ, default `now()`
- `updated_at` TIMESTAMPTZ, default `now()`

**Indexes**
- `idx_tasks_complaint_id`
- `idx_tasks_assignee_officer_id`
- `idx_tasks_status`
- `idx_tasks_due_date`
- `idx_tasks_officer_status`

---

### 9) `audit_log`
Write-once activity log for all dashboards.

**Fields**
- `id` BIGSERIAL, primary key
- `actor_id` BIGINT, nullable, FK to `users(id)`
- `actor_role` `user_role`, nullable
- `action` TEXT, not null
- `target_table` TEXT, nullable
- `target_id` BIGINT, nullable
- `details` JSONB, nullable
- `ip_address` INET, nullable
- `request_id` TEXT, nullable
- `created_at` TIMESTAMPTZ, default `now()`

**Indexes**
- `idx_audit_actor_id`
- `idx_audit_actor_role`
- `idx_audit_action`
- `idx_audit_target`
- `idx_audit_created_at`
- `idx_audit_role_created`

---

### 10) `system_settings`
Key-value runtime settings.

**Fields**
- `id` BIGSERIAL, primary key
- `key` TEXT, unique, not null
- `value` JSONB, not null
- `description` TEXT, nullable
- `updated_by_id` BIGINT, nullable, FK to `users(id)`
- `updated_at` TIMESTAMPTZ, default `now()`

**Seed keys**
- `alert_threshold_critical_depth`
- `alert_threshold_warning_depth`
- `alert_threshold_moderate_depth`
- `forecast_horizon_months`
- `retrain_frequency_days`
- `prediction_cache_ttl_seconds`
- `district_cache_ttl_seconds`
- `max_complaint_assignments`

---

### 11) `ml_model_registry`
Tracks ML model versions and metrics.

**Fields**
- `id` BIGSERIAL, primary key
- `model_name` TEXT, not null
- `version` TEXT, not null
- `status` `model_status`, default `testing`
- `r2_score` DOUBLE PRECISION, nullable
- `rmse` DOUBLE PRECISION, nullable
- `mae` DOUBLE PRECISION, nullable
- `training_rows` INTEGER, nullable
- `feature_count` SMALLINT, nullable
- `model_file_path` TEXT, nullable
- `config_path` TEXT, nullable
- `notes` TEXT, nullable
- `trained_at` TIMESTAMPTZ, nullable
- `registered_at` TIMESTAMPTZ, default `now()`
- `registered_by` BIGINT, nullable, FK to `users(id)`

**Constraints / indexes**
- Unique constraint on `(model_name, version)`
- `idx_mlmodel_name`
- `idx_mlmodel_status`

---

### 12) `data_sources`
External data source catalog.

**Fields**
- `id` BIGSERIAL, primary key
- `source_name` TEXT, unique, not null
- `source_type` TEXT, not null
- `description` TEXT, nullable
- `record_count` BIGINT, default `0`
- `update_frequency` TEXT, nullable
- `coverage` TEXT, nullable
- `quality_score` DOUBLE PRECISION, nullable
- `last_synced_at` TIMESTAMPTZ, nullable
- `is_active` BOOLEAN, default `true`
- `created_at` TIMESTAMPTZ, default `now()`

**Seed rows**
- Vidarbha Groundwater CSV
- Open-Meteo Weather API
- ISRO NDVI Satellite
- NBSS Soil Map

## Materialized View

### `district_stats`
Pre-aggregated district-level groundwater stats.

**Columns**
- `district`
- `well_count`
- `avg_depth_mbgl`
- `max_depth_mbgl`
- `min_depth_mbgl`
- `depth_change_qoq`
- `risk_status`
- `crisis_index`
- `last_reading_date`
- `refreshed_at`

## Quick Search Tips
- Search `users` for role/profile data.
- Search `wells` and `well_readings` for map and groundwater data.
- Search `complaints` and `task_assignments` for gov workflow.
- Search `predictions` for AI output history.
- Search `ml_model_registry` for model training records.
- Search `data_sources` for data provenance.
- Search `audit_log` for activity/history.
- Search `system_settings` for thresholds and runtime config.

## Important Notes
- `backend/migrations/schema.sql` is the production schema.
- `backend/migrations/schema_local.sql` is the local schema without PostGIS.
- `users.password_hash` stores bcrypt hashes, not plain passwords.
- `complaints.tracking_number` is auto-generated if empty.
- `district_stats` is a materialized view, not a normal table.
