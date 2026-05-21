-- Seed groundwater wells + readings from the model-ready Vidarbha CSV.
-- The CSV contains 650 unique coordinates and 129 monthly rows per well.
-- We reconstruct the wells table from coordinates and synthesize reading dates
-- starting at 2015-04-01 so the temporal engine can use the historical series.

BEGIN;

CREATE TEMP TABLE stg_groundwater_csv (
    src_row BIGSERIAL,
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

\copy stg_groundwater_csv (depth_mbgl, rainfall_mm, temperature_avg, humidity, evapotranspiration, soil_moisture_index, rainfall_lag_1m, rainfall_lag_2m, rainfall_lag_3m, rainfall_rolling_3m, rainfall_rolling_6m, rainfall_deficit, cumulative_deficit, temp_rainfall_ratio, depth_lag_1q, depth_lag_2q, depth_change_rate, month, season_encoded, district_encoded, latitude, longitude, elevation_m, slope_degree, soil_type_encoded, ndvi) FROM '/tmp/vidarbha_groundwater_model_ready.csv' WITH (FORMAT csv, HEADER true)

WITH well_points AS (
    SELECT
        MIN(src_row) AS first_src_row,
        latitude::DOUBLE PRECISION AS latitude,
        longitude::DOUBLE PRECISION AS longitude,
        COALESCE(NULLIF(MIN(district_encoded), '')::INT, 0) AS district_code,
        NULLIF(MIN(elevation_m), '')::DOUBLE PRECISION AS elevation_m,
        NULLIF(MIN(soil_type_encoded), '')::SMALLINT AS soil_type_code
    FROM stg_groundwater_csv
    WHERE latitude IS NOT NULL AND latitude <> ''
      AND longitude IS NOT NULL AND longitude <> ''
    GROUP BY latitude, longitude
)
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
SELECT
    'VID_' || LPAD(ROW_NUMBER() OVER (ORDER BY first_src_row)::TEXT, 4, '0') AS name,
    'District_' || district_code::TEXT AS district,
    latitude,
    longitude,
    elevation_m,
    NULL::DOUBLE PRECISION,
    CASE
        WHEN soil_type_code IS NULL THEN NULL
        ELSE 'Soil_' || soil_type_code::TEXT
    END,
    TRUE
FROM well_points
WHERE NOT EXISTS (
    SELECT 1
    FROM wells w
    WHERE w.latitude = well_points.latitude
      AND w.longitude = well_points.longitude
);

WITH ordered_rows AS (
    SELECT
        s.*,
        ROW_NUMBER() OVER (PARTITION BY s.latitude, s.longitude ORDER BY s.src_row) AS reading_seq
    FROM stg_groundwater_csv s
    WHERE s.latitude IS NOT NULL AND s.latitude <> ''
      AND s.longitude IS NOT NULL AND s.longitude <> ''
)
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
    (DATE '2015-04-01' + ((o.reading_seq - 1) * INTERVAL '1 month'))::DATE,
    NULLIF(o.depth_mbgl, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULLIF(o.depth_lag_1q, '')::DOUBLE PRECISION,
    NULLIF(o.depth_lag_2q, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULLIF(o.rainfall_mm, '')::DOUBLE PRECISION,
    NULLIF(o.rainfall_lag_1m, '')::DOUBLE PRECISION,
    NULLIF(o.rainfall_rolling_3m, '')::DOUBLE PRECISION,
    NULLIF(o.rainfall_deficit, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULLIF(o.temperature_avg, '')::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULL::DOUBLE PRECISION,
    NULLIF(o.humidity, '')::DOUBLE PRECISION,
    NULLIF(o.evapotranspiration, '')::DOUBLE PRECISION,
    NULLIF(o.ndvi, '')::DOUBLE PRECISION,
    NULLIF(o.soil_type_encoded, '')::SMALLINT
FROM ordered_rows o
JOIN wells w
  ON w.latitude = o.latitude::DOUBLE PRECISION
 AND w.longitude = o.longitude::DOUBLE PRECISION
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

REFRESH MATERIALIZED VIEW district_stats;

-- Post-load checks:
-- SELECT COUNT(*) AS wells_count FROM wells WHERE name LIKE 'VID_%';
-- SELECT COUNT(*) AS readings_count FROM well_readings wr JOIN wells w ON w.id = wr.well_id WHERE w.name LIKE 'VID_%';
