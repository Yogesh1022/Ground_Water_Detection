-- Seed groundwater wells + readings from extended Vidarbha CSV.
-- Usage (from workspace root):
--   psql -h localhost -p 5432 -U postgres -d aquavidarbha \
--     -f backend/migrations/seed_groundwater_from_csv.sql

BEGIN;

CREATE TEMP TABLE stg_groundwater_csv (
    well_id TEXT,
    date TEXT,
    year TEXT,
    district TEXT,
    depth_mbgl TEXT,
    rainfall_mm TEXT,
    temperature_avg TEXT,
    humidity TEXT,
    evapotranspiration TEXT,
    soil_moisture_index TEXT,
    rainfall_lag_1m TEXT,
    rainfall_lag_2m TEXT,
    rainfall_lag_3m TEXT,
    rainfall_rolling_3m TEXT,
    rainfall_rolling_6m TEXT,
    rainfall_deficit TEXT,
    cumulative_deficit TEXT,
    temp_rainfall_ratio TEXT,
    depth_lag_1q TEXT,
    depth_lag_2q TEXT,
    depth_change_rate TEXT,
    month TEXT,
    season_encoded TEXT,
    district_encoded TEXT,
    latitude TEXT,
    longitude TEXT,
    elevation_m TEXT,
    slope_degree TEXT,
    soil_type_encoded TEXT,
    ndvi TEXT
);

\copy stg_groundwater_csv FROM 'data/vidarbha_groundwater_extended_v2.csv' WITH (FORMAT csv, HEADER true)

-- Create one well row per CSV well_id if it does not already exist.
INSERT INTO wells (
    name,
    district,
    latitude,
    longitude,
    altitude_masl,
    depth_total_m,
    soil_type,
    is_active
)
SELECT DISTINCT
    s.well_id,
    s.district,
    s.latitude::DOUBLE PRECISION,
    s.longitude::DOUBLE PRECISION,
    NULLIF(s.elevation_m, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::TEXT,
    TRUE
FROM stg_groundwater_csv s
WHERE s.well_id IS NOT NULL
  AND s.well_id <> ''
  AND s.latitude IS NOT NULL
  AND s.latitude <> ''
  AND s.longitude IS NOT NULL
  AND s.longitude <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM wells w
      WHERE w.name = s.well_id
  );

-- Map CSV features into existing well_readings schema.
INSERT INTO well_readings (
    well_id,
    reading_date,
    depth_mbgl,
    water_level_masl,
    depth_lag_1m,
    depth_lag_2m,
    depth_lag_3m,
    depth_lag_1q,
    depth_lag_2q,
    depth_lag_3q,
    rainfall_mm,
    rainfall_30d_mm,
    rainfall_90d_mm,
    rainfall_deficit_mm,
    spi_3,
    spi_6,
    temperature_c,
    temperature_max_c,
    temperature_min_c,
    humidity_pct,
    et0_mm,
    ndvi,
    soil_type_code
)
SELECT
    w.id,
    s.date::DATE,
    NULLIF(s.depth_mbgl, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULLIF(s.depth_lag_1q, '')::DOUBLE PRECISION,
    NULLIF(s.depth_lag_2q, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULLIF(s.rainfall_mm, '')::DOUBLE PRECISION,
    NULLIF(s.rainfall_lag_1m, '')::DOUBLE PRECISION,
    NULLIF(s.rainfall_rolling_3m, '')::DOUBLE PRECISION,
    NULLIF(s.rainfall_deficit, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULLIF(s.temperature_avg, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULLIF(s.humidity, '')::DOUBLE PRECISION,
    NULLIF(s.evapotranspiration, '')::DOUBLE PRECISION,
    NULLIF(s.ndvi, '')::DOUBLE PRECISION,
    NULLIF(s.soil_type_encoded, '')::SMALLINT
FROM stg_groundwater_csv s
JOIN wells w
  ON w.name = s.well_id
WHERE s.date IS NOT NULL
  AND s.date <> ''
ON CONFLICT (well_id, reading_date) DO UPDATE
SET
    depth_mbgl = EXCLUDED.depth_mbgl,
    depth_lag_1q = EXCLUDED.depth_lag_1q,
    depth_lag_2q = EXCLUDED.depth_lag_2q,
    rainfall_mm = EXCLUDED.rainfall_mm,
    rainfall_30d_mm = EXCLUDED.rainfall_30d_mm,
    rainfall_90d_mm = EXCLUDED.rainfall_90d_mm,
    rainfall_deficit_mm = EXCLUDED.rainfall_deficit_mm,
    temperature_c = EXCLUDED.temperature_c,
    humidity_pct = EXCLUDED.humidity_pct,
    et0_mm = EXCLUDED.et0_mm,
    ndvi = EXCLUDED.ndvi,
    soil_type_code = EXCLUDED.soil_type_code;

COMMIT;

-- Post-load checks:
-- SELECT COUNT(*) AS wells_count FROM wells WHERE name LIKE 'VID_%';
-- SELECT COUNT(*) AS readings_count FROM well_readings wr JOIN wells w ON w.id = wr.well_id WHERE w.name LIKE 'VID_%';
