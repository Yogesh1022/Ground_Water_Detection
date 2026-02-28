# Final Dataset Column Specification

**Project:** ML & DL-Based Spatio-Temporal Groundwater Crisis Predictor — Vidarbha Region  
**Total Columns:** 25 Input Features + 1 Target Variable = **26 Columns**  
**Last Updated:** February 2026

---

## Quick Summary

| Category | Count | Type |
|:---------|:------|:-----|
| Target Variable | 1 | Raw (collected) |
| Meteorological Features | 5 | Raw (collected) |
| Rainfall Lag Features | 5 | Engineered (derived) |
| Stress / Deficit Features | 3 | Engineered (derived) |
| Historical Groundwater Context | 3 | Engineered (derived) |
| Temporal Features | 2 | Derived (from timestamp) |
| Geospatial Features | 3 | Raw + Encoded |
| Terrain & Vegetation Features | 4 | Raw + Derived |
| **Total** | **26** | **14 Raw + 12 Engineered** |

---

## 1. Complete Column List with Datatypes

### A. Target Variable (What the Model Predicts)

| # | Column Name | Python Dtype | Pandas Dtype | Unit | Valid Range | Source | Raw / Derived | Description |
|:--|:------------|:-------------|:-------------|:-----|:------------|:-------|:--------------|:------------|
| 1 | `depth_mbgl` | `float` | `float32` | Meters Below Ground Level | 0 – 457 m | India-WRIS / GSDA | Raw | Groundwater depth below the surface. The **label** for supervised learning. Display conversion: `feet = meters × 3.28084`. |

---

### B. Meteorological Features (5 Columns — Raw from APIs)

| # | Column Name | Python Dtype | Pandas Dtype | Unit | Valid Range | Source | Raw / Derived | Description |
|:--|:------------|:-------------|:-------------|:-----|:------------|:-------|:--------------|:------------|
| 2 | `rainfall_mm` | `float` | `float32` | Millimeters | 0 – 500 mm/month | CHIRPS / Open-Meteo | Raw | Current month's total precipitation. Primary aquifer recharge driver. |
| 3 | `temperature_avg` | `float` | `float32` | Celsius (°C) | 10 – 45 °C | Open-Meteo / NASA POWER | Raw | Average monthly temperature. Higher temps increase evaporation, reducing recharge. |
| 4 | `humidity` | `float` | `float32` | Percentage (%) | 0 – 100 % | Open-Meteo / NASA POWER | Raw | Relative humidity. Low humidity dries soil and blocks water percolation. |
| 5 | `evapotranspiration` | `float` | `float32` | Millimeters | 0 – 15 mm/day | NASA POWER | Raw | Rate of water loss from soil + plants (ET₀). Competes with groundwater recharge. |
| 6 | `soil_moisture_index` | `float` | `float32` | Index | 0.0 – 1.0 | NASA POWER | Raw | Root zone wetness. Value close to 1 = wet soil = faster percolation to aquifer. |

---

### C. Rainfall Lag Features (5 Columns — Engineered)

> **Why?** Monsoon rainfall (Jun–Sep) doesn't immediately recharge groundwater. In Vidarbha's basalt geology, the effect appears **2–3 months later**. These features model that delay.

| # | Column Name | Python Dtype | Pandas Dtype | Unit | Valid Range | Derivation Formula | Raw / Derived | Description |
|:--|:------------|:-------------|:-------------|:-----|:------------|:-------------------|:--------------|:------------|
| 7 | `rainfall_lag_1m` | `float` | `float32` | mm | 0 – 500 | `df.groupby('well_id')['rainfall_mm'].shift(1)` | Derived | Rainfall exactly 1 month ago. |
| 8 | `rainfall_lag_2m` | `float` | `float32` | mm | 0 – 500 | `df.groupby('well_id')['rainfall_mm'].shift(2)` | Derived | Rainfall exactly 2 months ago. |
| 9 | `rainfall_lag_3m` | `float` | `float32` | mm | 0 – 500 | `df.groupby('well_id')['rainfall_mm'].shift(3)` | Derived | Rainfall 3 months ago — **primary lag for Vidarbha basalt aquifers**. |
| 10 | `rainfall_rolling_3m` | `float` | `float32` | mm | 0 – 500 | `df.groupby('well_id')['rainfall_mm'].transform(lambda x: x.rolling(3).mean())` | Derived | 3-month moving average. Reduces noise from single-month anomalies. |
| 11 | `rainfall_rolling_6m` | `float` | `float32` | mm | 0 – 500 | `df.groupby('well_id')['rainfall_mm'].transform(lambda x: x.rolling(6).mean())` | Derived | 6-month moving average. Captures seasonal rainfall trend. |

---

### D. Stress / Deficit Features (3 Columns — Engineered)

| # | Column Name | Python Dtype | Pandas Dtype | Unit | Valid Range | Derivation Formula | Raw / Derived | Description |
|:--|:------------|:-------------|:-------------|:-----|:------------|:-------------------|:--------------|:------------|
| 12 | `rainfall_deficit` | `float` | `float32` | mm | −500 to +500 | `rainfall_mm - long_term_monthly_avg` | Derived | Deviation from historical average. Negative = below-normal rainfall. |
| 13 | `cumulative_deficit` | `float` | `float32` | mm | Unbounded | `df.groupby('well_id')['rainfall_deficit'].cumsum()` | Derived | Accumulated deficit over time — indicates **multi-year drought** conditions. |
| 14 | `temp_rainfall_ratio` | `float` | `float32` | Ratio | 0 – 45+ | `temperature_avg / (rainfall_mm + 1)` | Derived | Stress index. High value = hot & dry = poor recharge potential. |

---

### E. Historical Groundwater Context (3 Columns — Engineered)

| # | Column Name | Python Dtype | Pandas Dtype | Unit | Valid Range | Derivation Formula | Raw / Derived | Description |
|:--|:------------|:-------------|:-------------|:-----|:------------|:-------------------|:--------------|:------------|
| 15 | `depth_lag_1q` | `float` | `float32` | m (mbgl) | 0 – 457 | `df.groupby('well_id')['depth_mbgl'].shift(1)` | Derived | Groundwater depth 1 quarter (3 months) ago. **#1 most important feature.** |
| 16 | `depth_lag_2q` | `float` | `float32` | m (mbgl) | 0 – 457 | `df.groupby('well_id')['depth_mbgl'].shift(2)` | Derived | Groundwater depth 2 quarters (6 months) ago. Captures longer trend. |
| 17 | `depth_change_rate` | `float` | `float32` | m/month | Unbounded | `current_depth - previous_depth` | Derived | Rate of rise or fall. Positive = water table dropping. Negative = recovery. |

---

### F. Temporal Features (2 Columns — Derived from timestamp)

| # | Column Name | Python Dtype | Pandas Dtype | Unit | Valid Range | Derivation | Raw / Derived | Description |
|:--|:------------|:-------------|:-------------|:-----|:------------|:-----------|:--------------|:------------|
| 18 | `month` | `int` | `int8` | — | 1 – 12 | `pd.to_datetime(date).dt.month` | Derived | Month of the year. Captures annual seasonality (monsoon Jun vs dry Apr–May). |
| 19 | `season_encoded` | `int` | `int8` | — | 0 – 3 | Label encode from month | Derived | **0** = Monsoon (Jun–Sep), **1** = Post-Monsoon (Oct–Nov), **2** = Winter (Dec–Feb), **3** = Summer (Mar–May). |

---

### G. Geospatial Features (3 Columns — Raw + Encoded)

| # | Column Name | Python Dtype | Pandas Dtype | Unit | Valid Range | Source | Raw / Derived | Description |
|:--|:------------|:-------------|:-------------|:-----|:------------|:-------|:--------------|:------------|
| 20 | `district_encoded` | `int` | `int8` | — | 0 – 10 | LabelEncoder on district name | Derived (encoded) | ID for 11 Vidarbha districts. Handles regional soil/geology variation. |
| 21 | `latitude` | `float` | `float64` | Decimal Degrees | 19.5 – 21.5 | India-WRIS | Raw | GPS latitude of well/village. Required for KNN spatial interpolation. |
| 22 | `longitude` | `float` | `float64` | Decimal Degrees | 76.0 – 80.5 | India-WRIS | Raw | GPS longitude of well/village. Required for KNN spatial interpolation. |

---

### H. Terrain & Vegetation Features (4 Columns — Geophysical)

| # | Column Name | Python Dtype | Pandas Dtype | Unit | Valid Range | Source | Raw / Derived | Description |
|:--|:------------|:-------------|:-------------|:-----|:------------|:-------|:--------------|:------------|
| 23 | `elevation_m` | `float` | `float32` | Meters | 100 – 1200 m | SRTM 30m DEM (NASA Earthdata) | Raw | Elevation above sea level. Higher elevation = deeper water table generally. |
| 24 | `slope_degree` | `float` | `float32` | Degrees | 0 – 45° | Derived from SRTM DEM (`numpy.gradient`) | Derived | Terrain slope. Steep slopes increase runoff and reduce infiltration to aquifer. |
| 25 | `soil_type_encoded` | `int` | `int8` | — | 0 – 4 | FAO Soil Map / ISRO NBSS&LUP | Raw (encoded) | **0**=Alluvial, **1**=Black Cotton, **2**=Laterite, **3**=Red, **4**=Sandy. Controls percolation rate. |
| 26 | `ndvi` | `float` | `float32` | Index | −1.0 to +1.0 | MODIS MOD13Q1 (250m, 16-day) | Raw | Normalized Difference Vegetation Index. Higher NDVI = denser vegetation = higher transpiration water loss. |

---

## 2. Raw vs Engineered Columns Breakdown

### 14 Raw Columns (Collected from External Sources)

| # | Column | Source | How to Collect |
|:--|:-------|:-------|:---------------|
| 1 | `depth_mbgl` | India-WRIS / GSDA | Download CSV from portal |
| 2 | `rainfall_mm` | CHIRPS / Open-Meteo | API call with lat/lon |
| 3 | `temperature_avg` | Open-Meteo / NASA POWER | API call with lat/lon |
| 4 | `humidity` | Open-Meteo / NASA POWER | API call with lat/lon |
| 5 | `evapotranspiration` | NASA POWER | API call with lat/lon |
| 6 | `soil_moisture_index` | NASA POWER | API call with lat/lon |
| 7 | `latitude` | India-WRIS (per well) | Comes with well data |
| 8 | `longitude` | India-WRIS (per well) | Comes with well data |
| 9 | `district` (→ encoded) | India-WRIS (per well) | Comes with well data |
| 10 | `date` (→ month, season) | Timestamp column | Comes with all records |
| 11 | `elevation_m` | SRTM 30m DEM | Extract value at lat/lon using `rasterio` |
| 12 | `soil_type` (→ encoded) | FAO Soil Map / ISRO NBSS | Spatial join with well coordinates |
| 13 | `ndvi` | MODIS MOD13Q1 (GEE) | GEE script or API extract at lat/lon |
| 14 | `slope_source_dem` | SRTM 30m DEM | Same DEM file — slope derived in preprocessing |

### 12 Engineered Columns (Derived in Python)

| # | Column | Derived From | Method |
|:--|:-------|:-------------|:-------|
| 1 | `rainfall_lag_1m` | `rainfall_mm` | `shift(1)` per well |
| 2 | `rainfall_lag_2m` | `rainfall_mm` | `shift(2)` per well |
| 3 | `rainfall_lag_3m` | `rainfall_mm` | `shift(3)` per well |
| 4 | `rainfall_rolling_3m` | `rainfall_mm` | `rolling(3).mean()` per well |
| 5 | `rainfall_rolling_6m` | `rainfall_mm` | `rolling(6).mean()` per well |
| 6 | `rainfall_deficit` | `rainfall_mm` | Subtract long-term monthly average |
| 7 | `cumulative_deficit` | `rainfall_deficit` | `cumsum()` per well |
| 8 | `temp_rainfall_ratio` | `temperature_avg`, `rainfall_mm` | `temp / (rain + 1)` |
| 9 | `depth_lag_1q` | `depth_mbgl` | `shift(1)` per well |
| 10 | `depth_lag_2q` | `depth_mbgl` | `shift(2)` per well |
| 11 | `depth_change_rate` | `depth_mbgl` | `diff()` per well |
| 12 | `season_encoded` | `month` | Label encoding by season mapping |

---

## 3. Data Types by Category

| Data Type Category | Pandas Dtype | Memory/Value | Columns | Count |
|:-------------------|:-------------|:-------------|:--------|:------|
| Numerical – Continuous | `float32` | 4 bytes | `depth_mbgl`, `rainfall_mm`, `temperature_avg`, `humidity`, `evapotranspiration`, `soil_moisture_index`, all lags, rolling, deficit, ratio, `depth_lag_1q`, `depth_lag_2q`, `depth_change_rate`, `elevation_m`, `slope_degree`, `ndvi` | 20 |
| Numerical – Continuous (Spatial) | `float64` | 8 bytes | `latitude`, `longitude` | 2 |
| Numerical – Discrete (Ordinal) | `int8` | 1 byte | `month` | 1 |
| Categorical – Label Encoded | `int8` | 1 byte | `season_encoded`, `district_encoded`, `soil_type_encoded` | 3 |

---

## 4. Feature Importance Ranking (Expected from XGBoost SHAP)

| Rank | Column Name | Category | Why It Matters |
|:-----|:------------|:---------|:---------------|
| 1 | `depth_lag_1q` | Groundwater History | Most recent depth is strongest predictor of next depth |
| 2 | `rainfall_lag_3m` | Lag Feature | Captures the critical 3-month delay in basalt geology |
| 3 | `rainfall_lag_2m` | Lag Feature | Medium-term rainfall effect |
| 4 | `cumulative_deficit` | Stress Feature | Multi-year drought indicator |
| 5 | `depth_lag_2q` | Groundwater History | 6-month-ago depth context |
| 6 | `rainfall_lag_1m` | Lag Feature | Short-term lag |
| 7 | `season_encoded` | Temporal | Monsoon vs Summer cycle |
| 8 | `rainfall_rolling_3m` | Lag Feature | Smoothed trend |
| 9 | `month` | Temporal | Monthly cyclical pattern |
| 10 | `temperature_avg` | Meteorological | Evaporation/recharge balance |

---

## 5. Model Input Shape

| Model Type | Shape | Example | Approx Size |
|:-----------|:------|:--------|:------------|
| ML (XGBoost, Random Forest) | `(n_samples, 25)` | `(45000, 25)` | ~4.3 MB |
| DL (LSTM, GRU, 1D-CNN) | `(n_samples, 12, 25)` | `(45000, 12, 25)` | ~51 MB |

- **ML Input:** 2D tabular — each row = 1 well at 1 timestamp with 25 features.
- **DL Input:** 3D sequential — each sample = past 12 months of 25 features → predicts next month's `depth_mbgl`.

---

## 6. Data Quality & Validation Rules

| Column | Valid Range | Outlier Handling |
|:-------|:-----------|:-----------------|
| `depth_mbgl` | 0 – 457 m | Drop if < 0 or > 500 m (sensor error) |
| `rainfall_mm` | 0 – 500 mm/month | Cap at 500 (extreme but possible) |
| `temperature_avg` | 10 – 45 °C | Drop if outside range (sensor error) |
| `humidity` | 0 – 100 % | Clip to [0, 100] |
| `evapotranspiration` | 0 – 15 mm/day | Cap at 15 |
| `soil_moisture_index` | 0.0 – 1.0 | Clip to [0, 1] |
| `latitude` | 19.5 – 21.5 | Drop row (cannot impute GPS) |
| `longitude` | 76.0 – 80.5 | Drop row (cannot impute GPS) |
| `elevation_m` | 100 – 1200 m | Drop if outside Vidarbha range |
| `slope_degree` | 0 – 45° | Cap at 45° |
| `ndvi` | −1.0 to +1.0 | Drop if outside range (invalid pixel) |

---

## 7. Output Classification (Post-Prediction)

After predicting the continuous `depth_mbgl`, classify into risk levels:

| Risk Level | Depth (Meters) | Depth (Feet) | Color | Action |
|:-----------|:---------------|:-------------|:------|:-------|
| **SAFE** | 0 – 30 m | 0 – 100 ft | 🟢 Green | Monitor monthly. Normal irrigation. |
| **WARNING** | 30 – 100 m | 100 – 330 ft | 🟠 Orange | Plan for shortage. Avoid water-intensive crops. |
| **CRITICAL** | 100 – 200 m | 330 – 650 ft | 🔴 Red | Deploy tankers. Activate village water budget. |
| **EXTREME** | > 200 m | > 650 ft | 🟣 Purple | Aquifer depletion. Immediate crisis intervention. |

---

## 8. Flat Column Reference (Copy-Paste Ready)

### All 26 Column Names (Ordered)

```
depth_mbgl, rainfall_mm, temperature_avg, humidity, evapotranspiration,
soil_moisture_index, rainfall_lag_1m, rainfall_lag_2m, rainfall_lag_3m,
rainfall_rolling_3m, rainfall_rolling_6m, rainfall_deficit, cumulative_deficit,
temp_rainfall_ratio, depth_lag_1q, depth_lag_2q, depth_change_rate,
month, season_encoded, district_encoded, latitude, longitude,
elevation_m, slope_degree, soil_type_encoded, ndvi
```

### Pandas DataFrame Definition

```python
import numpy as np

COLUMN_DTYPES = {
    # Target
    'depth_mbgl':          np.float32,
    # Meteorological (Raw)
    'rainfall_mm':         np.float32,
    'temperature_avg':     np.float32,
    'humidity':            np.float32,
    'evapotranspiration':  np.float32,
    'soil_moisture_index': np.float32,
    # Rainfall Lags (Derived)
    'rainfall_lag_1m':     np.float32,
    'rainfall_lag_2m':     np.float32,
    'rainfall_lag_3m':     np.float32,
    'rainfall_rolling_3m': np.float32,
    'rainfall_rolling_6m': np.float32,
    # Stress Features (Derived)
    'rainfall_deficit':    np.float32,
    'cumulative_deficit':  np.float32,
    'temp_rainfall_ratio': np.float32,
    # Groundwater History (Derived)
    'depth_lag_1q':        np.float32,
    'depth_lag_2q':        np.float32,
    'depth_change_rate':   np.float32,
    # Temporal (Derived)
    'month':               np.int8,
    'season_encoded':      np.int8,
    # Geospatial
    'district_encoded':    np.int8,
    'latitude':            np.float64,
    'longitude':           np.float64,
    # Terrain & Vegetation
    'elevation_m':         np.float32,
    'slope_degree':        np.float32,
    'soil_type_encoded':   np.int8,
    'ndvi':                np.float32,
}

FEATURE_COLS = [col for col in COLUMN_DTYPES if col != 'depth_mbgl']  # 25 inputs
TARGET_COL = 'depth_mbgl'
```