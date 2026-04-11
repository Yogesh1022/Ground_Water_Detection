-- Seed ML model registry from real training artifacts in saved_models/ and outputs/random_forest/
-- Safe to run multiple times; uses upsert on (model_name, version).

INSERT INTO ml_model_registry (
    model_name,
    version,
    status,
    r2_score,
    rmse,
    mae,
    training_rows,
    feature_count,
    model_file_path,
    config_path,
    notes,
    trained_at,
    registered_by
)
VALUES
(
    'xgboost',
    '20260228_163212_7fc532bf',
    'production',
    0.9983912769230782,
    2.856550415449094,
    1.5624880132184884,
    68250,
    25,
    'saved_models/xgboost_best.pkl',
    'saved_models/xgboost_config.json',
    'Real metrics from saved_models/xgboost_metrics.json (TimeSeriesSplit, leakage-fixed feature set).',
    '2026-02-28 16:32:12+05:30',
    (SELECT id FROM users WHERE email = 'admin@aquavidarbha.in' LIMIT 1)
),
(
    'lstm',
    '20260228_154555_ed323f01',
    'backup',
    0.9963934360370869,
    4.277086828669252,
    2.519820842314011,
    60450,
    27,
    'saved_models/lstm_best.keras',
    'saved_models/lstm_config.json',
    'Real metrics from saved_models/lstm_metrics.json (BiLSTM + attention, sequence_length=12).',
    '2026-02-28 15:45:56+05:30',
    (SELECT id FROM users WHERE email = 'admin@aquavidarbha.in' LIMIT 1)
),
(
    'random_forest',
    '20260310_061926_env_engine_path3',
    'testing',
    0.9116,
    20.8907,
    15.2522,
    68250,
    28,
    'outputs/random_forest/env_engine_rf.pkl',
    'outputs/random_forest/env_engine_rf_features.json',
    'Real metrics from outputs/random_forest/env_engine_rf_metrics.json (Environmental Engine Path 3).',
    '2026-03-10 06:19:26+05:30',
    (SELECT id FROM users WHERE email = 'admin@aquavidarbha.in' LIMIT 1)
)
ON CONFLICT (model_name, version)
DO UPDATE SET
    status = EXCLUDED.status,
    r2_score = EXCLUDED.r2_score,
    rmse = EXCLUDED.rmse,
    mae = EXCLUDED.mae,
    training_rows = EXCLUDED.training_rows,
    feature_count = EXCLUDED.feature_count,
    model_file_path = EXCLUDED.model_file_path,
    config_path = EXCLUDED.config_path,
    notes = EXCLUDED.notes,
    trained_at = EXCLUDED.trained_at,
    registered_by = EXCLUDED.registered_by,
    registered_at = NOW();
