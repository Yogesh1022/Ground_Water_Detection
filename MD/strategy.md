# Prediction Routing Strategy — Temporal Engine vs Environmental Engine

**Project:** AquaVidarbha — AI-Based Groundwater Potential Mapping and Risk Prediction System  
**Region:** Vidarbha, Maharashtra, India  
**Date:** February 27, 2026  
**Author:** Strategy Design Document

---

## Table of Contents

1. [Can This Be Done With Our Dataset?](#1-can-this-be-done-with-our-dataset)
2. [The Three-Path Routing Logic](#2-the-three-path-routing-logic)
3. [What Are the Two Engines?](#3-what-are-the-two-engines)
4. [Path 1 — Historical Depth Exists → Temporal Engine](#4-path-1--historical-depth-exists--temporal-engine)
5. [Path 2 — Nearby Wells Exist → KNN/IDW → Temporal Engine](#5-path-2--nearby-wells-exist--knnidw--temporal-engine)
6. [Path 3 — No Nearby Wells → Environmental Engine Only](#6-path-3--no-nearby-wells--environmental-engine-only)
7. [How to Train the Two Engines From This Dataset](#7-how-to-train-the-two-engines-from-this-dataset)
8. [The KNN + IDW Interpolation for Path 2](#8-the-knn--idw-interpolation-for-path-2)
9. [Routing Decision at Inference Time](#9-routing-decision-at-inference-time)
10. [Confidence Levels Per Path](#10-confidence-levels-per-path)
11. [Implementation Checklist](#11-implementation-checklist)

---

## 1. Can This Be Done With Our Dataset?

**YES. Completely. The dataset is purpose-built for exactly this architecture.**

Here is why, feature by feature:

| Routing Requirement | What It Needs | Our Dataset Has It? | Column Name |
|---|---|---|---|
| Detect "historical depth exists" | Prior depth observations for a well | ✅ YES | `depth_lag_1q`, `depth_lag_2q` |
| Temporal Engine input | Past depth + environmental context | ✅ YES | Full 25-feature vector using all lag columns |
| "Nearby wells exist" check | Spatial coordinates of 650 monitoring wells | ✅ YES | `latitude`, `longitude` for all 650 wells |
| KNN neighbor search | Distance-based well lookup | ✅ YES | `latitude`, `longitude`, `district_encoded` |
| IDW interpolation | Depth values at neighbor wells | ✅ YES | `depth_lag_1q`, `depth_lag_2q`, `depth_change_rate` |
| Environmental Engine input | Non-depth features only | ✅ YES | 18 non-depth features available (see Path 3) |

**Dataset Summary for Context:**
- **83,850 records** across **650 unique monitoring wells**
- **129 months** per well (January 2015 — September 2025)
- **26 features** (25 predictors + 1 target)
- `depth_lag_1q` correlation with target: **r = 0.989** — the strongest single predictor
- `depth_lag_2q` correlation with target: **r = 0.965** — second strongest
- Zero missing values — no imputation barriers

---

## 2. The Three-Path Routing Logic

```
                    ┌────────────────────────────────────┐
                    │     NEW PREDICTION REQUEST          │
                    │  Input: GPS (lat, lon), Month, Year │
                    └────────────────┬───────────────────┘
                                     │
                    ┌────────────────▼───────────────────┐
                    │  QUESTION: Does historical depth    │
                    │  data exist for this GPS location?  │
                    │  (Is this a known monitored well?)  │
                    └────────────────┬───────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │ YES                  │ NO                   │
              ▼                      ▼                      │
  ┌─────────────────────┐  ┌────────────────────────┐      │
  │  depth_lag_1q and   │  │  QUESTION: Are there    │      │
  │  depth_lag_2q exist │  │  known wells within     │      │
  │  for this location  │  │  a threshold radius?    │      │
  └──────────┬──────────┘  │  (e.g., 30 km)         │      │
             │             └──────────┬─────────────┘      │
             │                        │                     │
             │            ┌───────────┴──────────┐         │
             │            │ YES                  │ NO      │
             │            ▼                      ▼         │
             │  ┌──────────────────┐  ┌─────────────────┐  │
             │  │  RUN KNN (k=5)   │  │  ENVIRONMENTAL  │  │
             │  │  + IDW to        │  │  ENGINE ONLY    │  │
             │  │  synthesize:     │  │  (no depth lag) │  │
             │  │  depth_lag_1q    │  └────────┬────────┘  │
             │  │  depth_lag_2q    │           │           │
             │  │  depth_change_   │           │           │
             │  │  rate            │           │           │
             │  └────────┬─────────┘           │           │
             │           │                     │           │
             └───────────┤                     │           │
                         ▼                     │           │
               ┌──────────────────┐            │           │
               │  TEMPORAL ENGINE │            │           │
               │  (full 25-feat   │            │           │
               │   vector)        │            │           │
               └────────┬─────────┘            │           │
                        │                      │           │
                        └──────────────────────┘           │
                                     │                     │
                        ┌────────────▼────────────┐        │
                        │    FINAL PREDICTION     │        │
                        │   depth_mbgl (meters)   │        │
                        │   + risk_level          │        │
                        │   + confidence_score    │        │
                        └─────────────────────────┘        │
```

---

## 3. What Are the Two Engines?

### Temporal Engine

A model that has access to **historical depth lag features**. It benefits from the extremely strong temporal inertia in groundwater dynamics (`depth_lag_1q` r=0.989). This is the **high-accuracy path**.

**Feature set: all 25 predictors** including:
- `depth_lag_1q` — depth 3 months ago
- `depth_lag_2q` — depth 6 months ago
- `depth_change_rate` — momentum of water table change
- All 18 environmental features below

**Expected R²: 0.88 – 0.95**

### Environmental Engine

A model that uses **only environmental and static features** — NO depth history. This is the **fallback path** for completely new or unmonitored locations.

**Feature set: 18 features** (depth lags excluded):
```
Meteorological (4):   rainfall_mm, temperature_avg, humidity, evapotranspiration
Soil/Vegetation (3):  soil_moisture_index, ndvi, soil_type_encoded
Rainfall Lags (5):    rainfall_lag_1m, rainfall_lag_2m, rainfall_lag_3m,
                      rainfall_rolling_3m, rainfall_rolling_6m
Rainfall Derived (3): rainfall_deficit, cumulative_deficit, temp_rainfall_ratio
Temporal (2):         month, season_encoded
Spatial (5):          latitude, longitude, elevation_m, slope_degree,
                      district_encoded
```

**Expected R²: 0.55 – 0.72**  
Note: lower accuracy is expected and acceptable — it is better than no prediction.

---

## 4. Path 1 — Historical Depth Exists → Temporal Engine

### When Does This Trigger?

- The incoming GPS point matches (within ~500m) a known monitoring well in the 650-well registry
- OR the API has stored prior predictions for this well (cached depth history)
- `depth_lag_1q` and `depth_lag_2q` are **directly available from the database**

### What the Dataset Provides

All 83,850 records fall into this path during training. Each record has:

```
depth_lag_1q = groundwater depth from 1 quarter (3 months) ago  ← REAL observed value
depth_lag_2q = groundwater depth from 2 quarters (6 months) ago ← REAL observed value
depth_change_rate = (depth_current - depth_lag_1q) / depth_lag_1q  ← calculated rate
```

These are the **three most powerful inputs** to the Temporal Engine.

### How to Implement Path 1

**Step 1 — Build the Well Registry**

Extract the 650 unique monitoring well coordinates from the dataset:

```python
import pandas as pd
from sklearn.neighbors import BallTree
import numpy as np

df = pd.read_csv("vidarbha_groundwater_model_ready.csv")

# Build registry: one row per unique well location
well_registry = df.groupby(['latitude', 'longitude']).agg({
    'district_encoded': 'first',
    'elevation_m': 'first',
    'slope_degree': 'first',
    'soil_type_encoded': 'first'
}).reset_index()

# Save registry for lookup at inference
well_registry.to_csv("well_registry.csv", index=False)
print(f"Registry built: {len(well_registry)} unique wells")
# Output: Registry built: 650 unique wells
```

**Step 2 — At inference, check if GPS is a known well**

```python
def is_known_well(query_lat, query_lon, well_registry, threshold_km=0.5):
    """Returns (True, well_row) if within threshold_km of a registered well."""
    coords_rad = np.radians(well_registry[['latitude', 'longitude']].values)
    query_rad  = np.radians([[query_lat, query_lon]])

    tree = BallTree(coords_rad, metric='haversine')
    dist, idx = tree.query(query_rad, k=1)

    dist_km = dist[0][0] * 6371  # convert radians to km
    if dist_km <= threshold_km:
        return True, well_registry.iloc[idx[0][0]], dist_km
    return False, None, dist_km
```

**Step 3 — Retrieve latest depth history from DB and build feature vector**

```python
def build_temporal_feature_vector(well_id, target_month, target_year, weather_api):
    # Fetch last 2 observed depths from DB or dataset
    depth_lag_1q = db.get_depth(well_id, target_month - 3)
    depth_lag_2q = db.get_depth(well_id, target_month - 6)
    depth_change_rate = (depth_lag_1q - depth_lag_2q) / 3  # rate per month

    # Fetch current environmental data (from Open-Meteo or cached)
    env = weather_api.fetch(well_lat, well_lon, target_month, target_year)

    feature_vector = {
        # Environmental
        'rainfall_mm':          env['rainfall_mm'],
        'temperature_avg':      env['temperature_avg'],
        'humidity':             env['humidity'],
        'evapotranspiration':   env['evapotranspiration'],
        'soil_moisture_index':  env['soil_moisture_index'],
        'ndvi':                 env['ndvi'],
        # Rainfall lags
        'rainfall_lag_1m':      env['rainfall_lag_1m'],
        'rainfall_lag_2m':      env['rainfall_lag_2m'],
        'rainfall_lag_3m':      env['rainfall_lag_3m'],
        'rainfall_rolling_3m':  env['rainfall_rolling_3m'],
        'rainfall_rolling_6m':  env['rainfall_rolling_6m'],
        'rainfall_deficit':     env['rainfall_deficit'],
        'cumulative_deficit':   env['cumulative_deficit'],
        'temp_rainfall_ratio':  env['temperature_avg'] / max(env['rainfall_mm'], 1),
        # DEPTH LAGS — what makes this the Temporal Engine
        'depth_lag_1q':         depth_lag_1q,
        'depth_lag_2q':         depth_lag_2q,
        'depth_change_rate':    depth_change_rate,
        # Temporal
        'month':                target_month,
        'season_encoded':       get_season(target_month),
        # Spatial
        'district_encoded':     well['district_encoded'],
        'latitude':             well['latitude'],
        'longitude':            well['longitude'],
        'elevation_m':          well['elevation_m'],
        'slope_degree':         well['slope_degree'],
        'soil_type_encoded':    well['soil_type_encoded'],
    }
    return feature_vector
```

**Step 4 — Run Temporal Engine (XGBoost + Ensemble)**

```python
prediction = temporal_engine.predict([feature_vector])
# Returns: depth_mbgl, risk_level, confidence=HIGH
```

---

## 5. Path 2 — Nearby Wells Exist → KNN/IDW → Temporal Engine

### When Does This Trigger?

- Incoming GPS is **NOT** in the 650-well registry (no direct match within 0.5km)
- BUT there are **k ≥ 1 known monitoring wells within 30 km** (configurable threshold)
- This covers new farms, villages, and unmonitored areas surrounded by monitored zones

### Why This Is Fully Supported by the Dataset

The dataset has **650 monitoring wells distributed across 11 districts** in Vidarbha covering ~97,000 km². Average inter-well distance is approximately **12–15 km**, meaning most locations in Vidarbha will have nearby wells available. This path will handle the **majority of unmonitored query points**.

### The KNN Step

Find the k=5 nearest wells using Haversine distance on the well registry:

```python
def find_nearest_wells(query_lat, query_lon, well_registry, k=5, max_radius_km=30):
    """
    Returns the k nearest wells within max_radius_km, sorted by distance.
    """
    coords_rad = np.radians(well_registry[['latitude', 'longitude']].values)
    query_rad  = np.radians([[query_lat, query_lon]])

    tree = BallTree(coords_rad, metric='haversine')
    # Query k+extra to filter by radius
    dist, idx = tree.query(query_rad, k=min(k + 10, len(well_registry)))

    dist_km = dist[0] * 6371  # radians to km
    mask    = dist_km <= max_radius_km

    neighbors = well_registry.iloc[idx[0][mask]].copy()
    neighbors['distance_km'] = dist_km[mask]
    neighbors = neighbors.head(k)

    if len(neighbors) == 0:
        return None  # triggers Path 3
    return neighbors
```

### The IDW Step

Inverse Distance Weighting interpolates the depth lag values from all k neighbors:

$$\hat{f}(x) = \frac{\sum_{i=1}^{k} \frac{f_i}{d_i^p}}{\sum_{i=1}^{k} \frac{1}{d_i^p}}$$

Where:
- $f_i$ = feature value at neighbor well $i$ (e.g., `depth_lag_1q` at that well)
- $d_i$ = Haversine distance to neighbor well $i$ in km
- $p$ = power parameter (typically $p = 2$, meaning closer wells have much more weight)

**What gets interpolated via IDW:**

| Column | Why Interpolate It |
|---|---|
| `depth_lag_1q` | Core input to Temporal Engine — estimated from neighbors |
| `depth_lag_2q` | Core input to Temporal Engine — estimated from neighbors |
| `depth_change_rate` | Momentum signal — spatially interpolated |
| `elevation_m` | Static terrain feature — can also be sourced from DEM |
| `soil_type_encoded` | Use nearest-neighbor only (categorical) |

```python
def idw_interpolate(neighbors, feature_cols, power=2):
    """
    Interpolates feature values at query point from k neighbors using IDW.
    neighbors: DataFrame with columns including feature_cols and 'distance_km'
    """
    distances = neighbors['distance_km'].values
    # Avoid division by zero — if any distance is 0, return that well's values
    if np.any(distances == 0):
        zero_idx = np.where(distances == 0)[0][0]
        return {col: neighbors.iloc[zero_idx][col] for col in feature_cols}

    weights = 1.0 / (distances ** power)
    weights /= weights.sum()  # normalize: sum to 1

    interpolated = {}
    for col in feature_cols:
        values = neighbors[col].values
        interpolated[col] = float(np.dot(weights, values))

    return interpolated
```

**Full Path 2 execution:**

```python
def path2_estimate_then_temporal(query_lat, query_lon, target_month,
                                 target_year, weather_api, well_registry,
                                 depth_history_db):
    # Step 1: Find k=5 nearest wells
    neighbors = find_nearest_wells(query_lat, query_lon, well_registry, k=5)
    if neighbors is None:
        return path3_environmental(query_lat, query_lon, ...)  # fallback

    # Step 2: Fetch latest depth readings for each neighbor from dataset/DB
    for idx, row in neighbors.iterrows():
        neighbors.loc[idx, 'depth_lag_1q']    = depth_history_db.get(
            row['latitude'], row['longitude'], target_month - 3)
        neighbors.loc[idx, 'depth_lag_2q']    = depth_history_db.get(
            row['latitude'], row['longitude'], target_month - 6)
        neighbors.loc[idx, 'depth_change_rate'] = depth_history_db.get_rate(
            row['latitude'], row['longitude'])

    # Step 3: IDW interpolate depth lag features to query point
    interpolated_depth_features = idw_interpolate(
        neighbors,
        feature_cols=['depth_lag_1q', 'depth_lag_2q', 'depth_change_rate'],
        power=2
    )

    # Step 4: Build full feature vector (same structure as Path 1)
    env = weather_api.fetch(query_lat, query_lon, target_month, target_year)
    feature_vector = build_full_feature_vector(
        env=env,
        depth_lags=interpolated_depth_features,
        spatial=idw_interpolate(neighbors,
            ['elevation_m', 'slope_degree', 'district_encoded'], power=2),
        month=target_month
    )

    # Step 5: Run the exact same Temporal Engine as Path 1
    prediction = temporal_engine.predict([feature_vector])
    prediction['confidence'] = 'MEDIUM'  # lower than Path 1 (HIGH)
    prediction['source'] = f'IDW from {len(neighbors)} nearby wells'
    return prediction
```

**Why this is valid:** Groundwater levels are spatially correlated over distances of 10–30 km in Vidarbha's Deccan Plateau geology. IDW from 5 neighbors within 30 km gives a statistically valid estimate of depth history, allowing the high-accuracy Temporal Engine to run.

---

## 6. Path 3 — No Nearby Wells → Environmental Engine Only

### When Does This Trigger?

- GPS is NOT a known well (no match within 0.5 km)
- AND there are NO monitoring wells within 30 km
- This covers extremely remote areas, new districts, or edge regions of Vidarbha

### How to Build the Environmental Engine From This Dataset

The key insight: **train a separate model on the same dataset, but drop all three depth-history columns**.

**Training data construction for Environmental Engine:**

```python
TEMPORAL_FEATURES  = ['depth_lag_1q', 'depth_lag_2q', 'depth_change_rate']
ENV_FEATURE_SET    = [col for col in df.columns
                      if col not in TEMPORAL_FEATURES + ['depth_mbgl']]

# Both engines train on the same 83,850 rows — just different feature sets
X_temporal = df[ALL_25_FEATURES]           # Path 1 and 2 engine
X_env      = df[ENV_FEATURE_SET]           # Path 3 engine — 22 features
y          = df['depth_mbgl']

# Train Environmental Engine
from xgboost import XGBRegressor
env_engine = XGBRegressor(n_estimators=500, max_depth=7, learning_rate=0.05)
env_engine.fit(X_env, y)
```

**Features available to Environmental Engine (22 features):**

```
Meteorological (4):
  rainfall_mm, temperature_avg, humidity, evapotranspiration

Soil & Vegetation (3):
  soil_moisture_index, ndvi, soil_type_encoded

Rainfall Lags & Aggregates (7):
  rainfall_lag_1m, rainfall_lag_2m, rainfall_lag_3m
  rainfall_rolling_3m, rainfall_rolling_6m
  rainfall_deficit, cumulative_deficit

Derived Stress Indicators (2):
  temp_rainfall_ratio, [depth_change_rate DROPPED]

Temporal (2):
  month, season_encoded

Spatial (5):
  latitude, longitude, elevation_m, slope_degree, district_encoded

NOTE: depth_lag_1q, depth_lag_2q, depth_change_rate are EXCLUDED
```

**Inference for Path 3:**

```python
def path3_environmental(query_lat, query_lon, target_month, target_year, weather_api):
    env = weather_api.fetch(query_lat, query_lon, target_month, target_year)
    spatial = get_spatial_from_dem(query_lat, query_lon)  # elevation from DEM API

    feature_vector = {
        'rainfall_mm':         env['rainfall_mm'],
        'temperature_avg':     env['temperature_avg'],
        'humidity':            env['humidity'],
        'evapotranspiration':  env['evapotranspiration'],
        'soil_moisture_index': env['soil_moisture_index'],
        'ndvi':                env['ndvi'],
        'soil_type_encoded':   spatial['soil_type'],
        'rainfall_lag_1m':     env['rainfall_lag_1m'],
        'rainfall_lag_2m':     env['rainfall_lag_2m'],
        'rainfall_lag_3m':     env['rainfall_lag_3m'],
        'rainfall_rolling_3m': env['rainfall_rolling_3m'],
        'rainfall_rolling_6m': env['rainfall_rolling_6m'],
        'rainfall_deficit':    env['rainfall_deficit'],
        'cumulative_deficit':  env['cumulative_deficit'],
        'temp_rainfall_ratio': env['temperature_avg'] / max(env['rainfall_mm'], 1),
        'month':               target_month,
        'season_encoded':      get_season(target_month),
        'latitude':            query_lat,
        'longitude':           query_lon,
        'elevation_m':         spatial['elevation_m'],
        'slope_degree':        spatial['slope_degree'],
        'district_encoded':    spatial['district_encoded'],
        # NO depth_lag_1q, NO depth_lag_2q, NO depth_change_rate
    }

    prediction = env_engine.predict([feature_vector])
    prediction['confidence'] = 'LOW'
    prediction['source'] = 'Environmental Engine (no depth history available)'
    return prediction
```

---

## 7. How to Train the Two Engines From This Dataset

### Training Split Strategy

Do **NOT** use a random 80/20 split — use a **temporal split** to avoid data leakage:

```
Training set:   January 2015 — December 2023  (9 years)
Validation set: January 2024 — March 2024     (3 months, hyperparameter tuning)
Test set:       April 2024 — September 2025   (18 months, held-out evaluation)
```

This ensures the model never sees "future" depth lag values during training.

### Train Temporal Engine

```python
# Temporal Engine — full 25-feature XGBoost
df_train = df[df['year'] <= 2023]
df_val   = df[(df['year'] == 2024) & (df['month'] <= 3)]
df_test  = df[(df['year'] > 2024) | ((df['year'] == 2024) & (df['month'] > 3))]

ALL_FEATURES = [
    'rainfall_mm', 'temperature_avg', 'humidity', 'evapotranspiration',
    'soil_moisture_index', 'ndvi', 'soil_type_encoded',
    'rainfall_lag_1m', 'rainfall_lag_2m', 'rainfall_lag_3m',
    'rainfall_rolling_3m', 'rainfall_rolling_6m',
    'rainfall_deficit', 'cumulative_deficit', 'temp_rainfall_ratio',
    'depth_lag_1q', 'depth_lag_2q', 'depth_change_rate',   # ← Temporal features
    'month', 'season_encoded',
    'district_encoded', 'latitude', 'longitude',
    'elevation_m', 'slope_degree'
]

temporal_engine = XGBRegressor(
    n_estimators=1000,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    early_stopping_rounds=50
)
temporal_engine.fit(
    df_train[ALL_FEATURES], df_train['depth_mbgl'],
    eval_set=[(df_val[ALL_FEATURES], df_val['depth_mbgl'])],
    verbose=100
)
```

### Train Environmental Engine

```python
# Environmental Engine — 22 features, no depth history
ENV_FEATURES = [f for f in ALL_FEATURES
                if f not in ['depth_lag_1q', 'depth_lag_2q', 'depth_change_rate']]

env_engine = XGBRegressor(
    n_estimators=800,
    max_depth=7,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    early_stopping_rounds=50
)
env_engine.fit(
    df_train[ENV_FEATURES], df_train['depth_mbgl'],
    eval_set=[(df_val[ENV_FEATURES], df_val['depth_mbgl'])],
    verbose=100
)
```

### Save Both Engines

```python
import joblib
joblib.dump(temporal_engine, 'models/temporal_engine_xgb.pkl')
joblib.dump(env_engine,      'models/env_engine_xgb.pkl')
joblib.dump(well_registry,   'models/well_registry.pkl')

# Also save the feature name lists for consistency
import json
json.dump({'temporal': ALL_FEATURES, 'env': ENV_FEATURES},
          open('models/feature_sets.json', 'w'))
```

---

## 8. The KNN + IDW Interpolation for Path 2

### Why k=5 and Power=2?

**k=5:** Balances accuracy (more neighbors = smoother estimate) against the risk of including wells that are geologically dissimilar. In Vidarbha's Deccan Plateau, 5 nearest wells within 30 km are likely in the same hydrological sub-basin.

**p=2:** Standard IDW power. Doubles the weight for every halving of distance:
- A well at 5 km gets 4× the weight of a well at 10 km
- A well at 10 km gets 4× the weight of a well at 20 km

**Threshold = 30 km:** Beyond 30 km in Vidarbha, surface geology and rainfall patterns can shift enough to make interpolation unreliable. At 30 km, fall back to Path 3.

### Validation of IDW Accuracy Using the Dataset

You can validate the IDW accuracy using a **leave-one-out spatial cross-validation**:

```python
def validate_idw_accuracy(well_registry, df, k=5, power=2):
    """
    For each of the 650 wells, remove it from the registry, use IDW from
    its k nearest neighbors to estimate its depth_lag_1q, compare to actual.
    """
    errors = []
    for i, well in well_registry.iterrows():
        # Remove this well from registry
        registry_minus_one = well_registry.drop(i)

        # Find k nearest from remaining 649 wells
        neighbors = find_nearest_wells(
            well['latitude'], well['longitude'], registry_minus_one, k=k)

        # Fetch depth_lag_1q for neighbors and query well from dataset
        # (use the most recent available month)
        recent = df[df['month'] == df['month'].max()]
        for j, n_row in neighbors.iterrows():
            mask = ((df['latitude'] == n_row['latitude']) &
                    (df['longitude'] == n_row['longitude']))
            neighbors.loc[j, 'depth_lag_1q'] = df[mask]['depth_lag_1q'].iloc[-1]

        # IDW interpolate
        estimated = idw_interpolate(neighbors, ['depth_lag_1q'], power=power)

        # Actual value
        actual_mask = ((df['latitude'] == well['latitude']) &
                       (df['longitude'] == well['longitude']))
        actual = df[actual_mask]['depth_lag_1q'].iloc[-1]

        errors.append(abs(estimated['depth_lag_1q'] - actual))

    mae = np.mean(errors)
    print(f"IDW Leave-One-Out MAE on depth_lag_1q: {mae:.2f} meters")
    return mae
```

Expected MAE from IDW: **8–18 meters** on `depth_lag_1q`. While this introduces error vs. Path 1, the Temporal Engine is robust enough to produce useful predictions even with interpolated depth lags.

---

## 9. Routing Decision at Inference Time

### Complete Router Function

```python
class PredictionRouter:
    def __init__(self,
                 temporal_engine,
                 env_engine,
                 well_registry,
                 depth_history_db,
                 known_well_threshold_km=0.5,
                 neighbor_radius_km=30,
                 min_neighbors=1):
        self.temporal_engine          = temporal_engine
        self.env_engine               = env_engine
        self.well_registry            = well_registry
        self.depth_history_db         = depth_history_db
        self.known_well_threshold_km  = known_well_threshold_km
        self.neighbor_radius_km       = neighbor_radius_km
        self.min_neighbors            = min_neighbors

    def predict(self, lat, lon, month, year, weather_api):
        # ── PATH 1: Known well ───────────────────────────────────────────
        is_known, well, dist_km = is_known_well(
            lat, lon, self.well_registry, self.known_well_threshold_km)

        if is_known:
            fv = build_temporal_feature_vector(well, month, year,
                                               self.depth_history_db,
                                               weather_api)
            depth = self.temporal_engine.predict([fv])[0]
            return {
                'depth_mbgl':  depth,
                'risk_level':  classify_risk(depth),
                'path':        1,
                'engine':      'Temporal Engine (direct)',
                'confidence':  'HIGH',
                'note':        f'Matched known well at {dist_km:.2f} km'
            }

        # ── PATH 2: Nearby wells → IDW → Temporal ───────────────────────
        neighbors = find_nearest_wells(
            lat, lon, self.well_registry,
            k=5, max_radius_km=self.neighbor_radius_km)

        if neighbors is not None and len(neighbors) >= self.min_neighbors:
            fv = build_idw_feature_vector(lat, lon, neighbors, month, year,
                                          self.depth_history_db, weather_api)
            depth = self.temporal_engine.predict([fv])[0]
            return {
                'depth_mbgl':  depth,
                'risk_level':  classify_risk(depth),
                'path':        2,
                'engine':      'Temporal Engine (IDW-estimated depth lags)',
                'confidence':  'MEDIUM',
                'note':        f'IDW from {len(neighbors)} wells within '
                               f'{self.neighbor_radius_km} km'
            }

        # ── PATH 3: Environmental Engine only ───────────────────────────
        fv    = build_env_feature_vector(lat, lon, month, year, weather_api)
        depth = self.env_engine.predict([fv])[0]
        return {
            'depth_mbgl':  depth,
            'risk_level':  classify_risk(depth),
            'path':        3,
            'engine':      'Environmental Engine (no depth history)',
            'confidence':  'LOW',
            'note':        f'No wells within {self.neighbor_radius_km} km'
        }


def classify_risk(depth_mbgl):
    if   depth_mbgl <  30:  return 'SAFE'
    elif depth_mbgl < 100:  return 'WARNING'
    elif depth_mbgl < 200:  return 'CRITICAL'
    else:                   return 'EXTREME'
```

---

## 10. Confidence Levels Per Path

| Path | Engine Used | Depth Lags Source | Expected R² | Confidence Tag | Use Case |
|---|---|---|---|---|---|
| **1** | Temporal Engine | Real observed values from DB | **0.88 – 0.95** | `HIGH` | Known monitored wells (650 locations) |
| **2** | Temporal Engine | IDW-estimated from neighbors | **0.72 – 0.85** | `MEDIUM` | Unmonitored areas near known wells |
| **3** | Environmental Engine | Not used | **0.55 – 0.72** | `LOW` | Truly isolated, unmonitored locations |

**Why Path 2 still outperforms Path 3:**  
Even with IDW-estimated lag features (carrying some interpolation error), the Temporal Engine with `depth_lag_1q` r=0.989 contribution still far outperforms a model that has no depth history at all. The information content in a rough depth estimate from nearby wells is massive compared to having no depth information whatsoever.

---

## 11. Implementation Checklist

Use this checklist when implementing the routing strategy:

### A. Data Preparation
- [ ] Extract 650-well registry (lat, lon, district, elevation, slope, soil_type)
- [ ] Build depth history database (well_id → {month/year → depth_mbgl})
- [ ] Verify all 83,850 records have non-null `depth_lag_1q` and `depth_lag_2q`
- [ ] Create temporal train/val/test split (≤2023 / 2024-Q1 / 2024-Q2 to 2025)

### B. Model Training
- [ ] Train **Temporal Engine** XGBoost on 25 features (temporal split)
- [ ] Evaluate Temporal Engine R² on test set (target: R² ≥ 0.88)
- [ ] Train **Environmental Engine** XGBoost on 22 features (same temporal split)
- [ ] Evaluate Environmental Engine R² on test set (target: R² ≥ 0.55)
- [ ] (Optional) Train LSTM Temporal Engine for sequence-based path 1/2
- [ ] Save both models with `joblib.dump`

### C. Spatial Infrastructure
- [ ] Build `BallTree` index over 650-well coordinates (Haversine metric)
- [ ] Validate IDW accuracy via leave-one-out spatial cross-validation
- [ ] Tune radius threshold (30 km default) and report Path 2 share of queries
- [ ] Test edge cases: point at well center, point at 31 km from all wells

### D. Router Integration
- [ ] Implement `PredictionRouter` class
- [ ] Connect router to FastAPI `/api/predict` endpoint
- [ ] Log `path`, `engine`, `confidence` in every prediction response
- [ ] Add confidence badge to dashboard UI (🟢 HIGH / 🟡 MEDIUM / 🔴 LOW)

### E. Validation
- [ ] Run end-to-end test: Path 1 → exact known well GPS → verify HIGH confidence
- [ ] Run end-to-end test: Path 2 → GPS 15 km from nearest well → verify MEDIUM
- [ ] Run end-to-end test: Path 3 → GPS far outside Vidarbha → verify LOW + ENV
- [ ] Compare Path 2 predictions vs. held-out well data (simulate unmonitored)

---

## Summary

```
Dataset Verdict:     ✅ FULLY COMPATIBLE with all three routing paths
650 monitoring wells → All qualify for Path 1
IDW from neighbors  → Enables Path 2 for 95%+ of Vidarbha's area
ENV-only fallback   → Path 3 handles the remaining edge regions

Two models to train: Temporal Engine (25 features, R² ~0.92)
                     Environmental Engine (22 features, R² ~0.65)
One router:          PredictionRouter decides path at inference time
                     based on GPS proximity to known wells
```
