# Model Training Guide — Which Models to Train and How

**Project:** AquaVidarbha — AI-Based Groundwater Potential Mapping and Risk Prediction System  
**Region:** Vidarbha, Maharashtra, India  
**Date:** February 27, 2026

---

## Table of Contents

1. [Models to Train — Short Answer](#1-models-to-train--short-answer)
2. [Training Order](#2-training-order)
3. [Model 1 — XGBoost Temporal Engine](#3-model-1--xgboost-temporal-engine)
4. [Model 2 — LSTM Temporal Engine](#4-model-2--lstm-temporal-engine)
5. [Model 3 — XGBoost Environmental Engine](#5-model-3--xgboost-environmental-engine)
6. [What NOT to Train and Why](#6-what-not-to-train-and-why)

---

## 1. Models to Train — Short Answer

You need **3 trained models**. Everything else in `Algo_analysis.md` is valid for a competition
setting but overkill for this 3-path routing architecture. Here is the exact map:

| Model | Serves Path | Features | Why |
|---|---|---|---|
| **XGBoost Temporal** | Path 1 + Path 2 | All 25 (with depth lags) | Primary high-accuracy engine |
| **LSTM Temporal** | Path 1 + Path 2 | All 25 (sequence of 6 months) | Captures trend/momentum over time |
| **XGBoost Environmental** | Path 3 only | 22 (no depth lags) | Fallback when no depth history |

> **KNN and IDW are NOT trained models.** They are spatial lookup utilities run at inference
> time using the well registry extracted from your dataset.

---

## 2. Training Order

```
Step 1 → Train XGBoost Temporal      (~5 min on CPU)
Step 2 → Train XGBoost Environmental (~4 min on CPU)
Step 3 → Train LSTM Temporal         (~30–60 min on CPU, ~10 min GPU)
Step 4 → Extract well registry       (no training — just groupby on dataset)
```

Steps 1 and 2 first — they are fast and validate the feature split works
before you invest time in LSTM.

---

## 3. Model 1 — XGBoost Temporal Engine

**Input:** 25 features per row including `depth_lag_1q`, `depth_lag_2q`, `depth_change_rate`  
**Output:** `depth_mbgl` (regression)  
**Data split:** temporal — train on rows where `year <= 2023`, test on `year >= 2024`

```python
import pandas as pd
import numpy as np
import joblib
from xgboost import XGBRegressor
from sklearn.metrics import r2_score, mean_absolute_error

df = pd.read_csv("Dataset/training_ready_data/vidarbha_groundwater_model_ready.csv")

# Reconstruct 'year' from the sequential month index
# Dataset: 650 wells × 129 months starting Jan 2015
df = df.sort_index()
df['row_index']  = df.index
df['time_step']  = df.groupby(['latitude', 'longitude']).cumcount()
df['year']       = 2015 + (df['time_step'] // 12)
df['abs_month']  = df['time_step'] % 12 + 1

TEMPORAL_FEATURES = [
    'rainfall_mm', 'temperature_avg', 'humidity', 'evapotranspiration',
    'soil_moisture_index', 'ndvi', 'soil_type_encoded',
    'rainfall_lag_1m', 'rainfall_lag_2m', 'rainfall_lag_3m',
    'rainfall_rolling_3m', 'rainfall_rolling_6m',
    'rainfall_deficit', 'cumulative_deficit', 'temp_rainfall_ratio',
    'depth_lag_1q', 'depth_lag_2q', 'depth_change_rate',   # ← THE temporal features
    'month', 'season_encoded',
    'district_encoded', 'latitude', 'longitude',
    'elevation_m', 'slope_degree'
]

train = df[df['year'] <= 2023]
val   = df[(df['year'] == 2024) & (df['abs_month'] <= 3)]
test  = df[(df['year'] > 2024) | ((df['year'] == 2024) & (df['abs_month'] > 3))]

X_train, y_train = train[TEMPORAL_FEATURES], train['depth_mbgl']
X_val,   y_val   = val[TEMPORAL_FEATURES],   val['depth_mbgl']
X_test,  y_test  = test[TEMPORAL_FEATURES],  test['depth_mbgl']

xgb_temporal = XGBRegressor(
    n_estimators          = 1000,
    max_depth             = 8,
    learning_rate         = 0.05,
    subsample             = 0.8,
    colsample_bytree      = 0.8,
    reg_alpha             = 0.1,
    reg_lambda            = 1.0,
    early_stopping_rounds = 50,
    eval_metric           = 'rmse',
    random_state          = 42,
    n_jobs                = -1
)

xgb_temporal.fit(
    X_train, y_train,
    eval_set=[(X_val, y_val)],
    verbose=100
)

preds = xgb_temporal.predict(X_test)
print(f"Temporal XGB  R²:  {r2_score(y_test, preds):.4f}")
print(f"Temporal XGB  MAE: {mean_absolute_error(y_test, preds):.2f} m")

joblib.dump(xgb_temporal, 'Models/temporal_engine_xgb.pkl')
```

**Target: R² ≥ 0.88**

---

## 4. Model 2 — LSTM Temporal Engine

**Why add LSTM on top of XGBoost:**  
XGBoost treats each row independently. LSTM sees a **sequence of 6 consecutive months per well** —
it learns *trend direction* (is depth getting worse month-over-month?), not just the current snapshot.
This matters for early-warning predictions.

**Input shape:** `(samples, 6 timesteps, 25 features)`  
**Output:** `depth_mbgl` at timestep 7 (next month prediction)

```python
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from sklearn.preprocessing import MinMaxScaler

# ── Build sequences per well ─────────────────────────────────────────────
SEQ_LEN = 6  # 6 months of history → predict month 7

def build_sequences(df, feature_cols, target_col, seq_len=6):
    X_list, y_list = [], []
    for (lat, lon), well_df in df.groupby(['latitude', 'longitude']):
        well_df = well_df.sort_values('time_step')
        X_vals  = well_df[feature_cols].values
        y_vals  = well_df[target_col].values
        for i in range(seq_len, len(X_vals)):
            X_list.append(X_vals[i - seq_len:i])   # shape: (6, 25)
            y_list.append(y_vals[i])
    return np.array(X_list), np.array(y_list)

# Scale features (LSTM requires normalization, XGBoost does not)
scaler = MinMaxScaler()
df[TEMPORAL_FEATURES] = scaler.fit_transform(df[TEMPORAL_FEATURES])
joblib.dump(scaler, 'Models/temporal_scaler.pkl')

train_df = df[df['year'] <= 2023]
test_df  = df[df['year'] > 2023]

X_train_seq, y_train_seq = build_sequences(train_df, TEMPORAL_FEATURES,
                                            'depth_mbgl', SEQ_LEN)
X_test_seq,  y_test_seq  = build_sequences(test_df,  TEMPORAL_FEATURES,
                                            'depth_mbgl', SEQ_LEN)

print(f"LSTM train shape: {X_train_seq.shape}")   # e.g. (55000, 6, 25)
print(f"LSTM test  shape: {X_test_seq.shape}")

# ── Build model ──────────────────────────────────────────────────────────
lstm_model = Sequential([
    LSTM(128, return_sequences=True,
         input_shape=(SEQ_LEN, len(TEMPORAL_FEATURES))),
    Dropout(0.2),
    BatchNormalization(),
    LSTM(64, return_sequences=False),
    Dropout(0.2),
    BatchNormalization(),
    Dense(32, activation='relu'),
    Dense(1)    # regression output
])

lstm_model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

callbacks = [
    tf.keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True),
    tf.keras.callbacks.ReduceLROnPlateau(patience=7, factor=0.5),
    tf.keras.callbacks.ModelCheckpoint('Models/temporal_engine_lstm.keras',
                                        save_best_only=True)
]

lstm_model.fit(
    X_train_seq, y_train_seq,
    validation_split = 0.1,
    epochs           = 100,
    batch_size       = 512,
    callbacks        = callbacks,
    verbose          = 1
)

# Evaluate
preds_lstm = lstm_model.predict(X_test_seq).flatten()
print(f"LSTM R²:  {r2_score(y_test_seq, preds_lstm):.4f}")
print(f"LSTM MAE: {mean_absolute_error(y_test_seq, preds_lstm):.2f} m")
```

**Target: R² ≥ 0.86**

---

## 5. Model 3 — XGBoost Environmental Engine

Same structure as Model 1 — just drop the 3 depth-lag columns. Train on the same rows, same split.

```python
ENV_FEATURES = [f for f in TEMPORAL_FEATURES
                if f not in ['depth_lag_1q', 'depth_lag_2q', 'depth_change_rate']]
# 22 features remain

xgb_env = XGBRegressor(
    n_estimators          = 800,
    max_depth             = 7,
    learning_rate         = 0.05,
    subsample             = 0.8,
    colsample_bytree      = 0.8,
    reg_alpha             = 0.1,
    reg_lambda            = 1.0,
    early_stopping_rounds = 50,
    eval_metric           = 'rmse',
    random_state          = 42,
    n_jobs                = -1
)

xgb_env.fit(
    train[ENV_FEATURES], train['depth_mbgl'],
    eval_set=[(val[ENV_FEATURES], val['depth_mbgl'])],
    verbose=100
)

preds_env = xgb_env.predict(test[ENV_FEATURES])
print(f"Env XGB  R²:  {r2_score(y_test, preds_env):.4f}")
print(f"Env XGB  MAE: {mean_absolute_error(y_test, preds_env):.2f} m")

joblib.dump(xgb_env, 'Models/env_engine_xgb.pkl')
```

**Target: R² ≥ 0.55** (acceptable — this is the last-resort fallback for Path 3)

---

## 6. What NOT to Train and Why

| Algorithm (from Algo_analysis.md) | Decision | Reason |
|---|---|---|
| **Random Forest** | Skip for now | XGBoost outperforms it on this data; add only if building a full ensemble later |
| **GRU** | Skip | Same role as LSTM; add only if LSTM is too slow at inference |
| **1D-CNN** | Skip | Not needed — sequences are short (6 months); CNN excels on longer patterns (50+ steps) |
| **CNN-LSTM Hybrid** | Skip | Overkill; only meaningful with 12+ month input sequences |
| **VAR** | Skip | Statistical baseline only, never used in production |
| **Weighted Ensemble** | Later | Build after all 3 models above are trained; simply weight XGBoost 0.6 + LSTM 0.4 for Path 1/2 — no separate training job needed |

---

## Saved Artefacts After All Training

```
Models/
├── temporal_engine_xgb.pkl      ← Model 1  (Path 1 + Path 2)
├── temporal_engine_lstm.keras   ← Model 2  (Path 1 + Path 2)
├── temporal_scaler.pkl          ← MinMaxScaler used for LSTM input
├── env_engine_xgb.pkl           ← Model 3  (Path 3 only)
├── well_registry.csv            ← 650-well lookup table for KNN
└── feature_sets.json            ← Lists of TEMPORAL_FEATURES and ENV_FEATURES
```

> **Ensemble at inference (no extra training):**  
> `final_depth = 0.6 × xgb_temporal.predict(fv) + 0.4 × lstm_model.predict(seq)`  
> Apply this only for Path 1 and Path 2. Path 3 uses `xgb_env` alone.
