# Complete Project Reference — Groundwater Crisis Predictor

**Project:** ML & DL-Based Spatio-Temporal Groundwater Crisis Predictor  
**Region:** Vidarbha, Maharashtra, India  
**Last Updated:** February 2026

---

## Table of Contents

1. [Dataset Columns & Parameters (22 Total)](#1-dataset-columns--parameters-22-total)
2. [Raw Data vs Engineered Features](#2-raw-data-vs-engineered-features)
3. [Dataset Types Classification](#3-dataset-types-classification)
4. [Feature Importance Ranking](#4-feature-importance-ranking)
5. [Model Output & Risk Classification](#5-model-output--risk-classification)
6. [Tech Stack & Skills Required](#6-tech-stack--skills-required)
7. [GPS Location-Based Prediction Workflow](#7-gps-location-based-prediction-workflow)
8. [Dataset Dimensions & Specifications](#8-dataset-dimensions--specifications)
9. [All Dataset Links & Sources](#9-all-dataset-links--sources)

---

## 1. Dataset Columns & Parameters (22 Total)

The final processed dataset requires **21 input features + 1 target variable = 22 columns**.

---

### 1.1 Target Variable (What the Model Predicts)

| # | Column Name | Data Type | Unit | Valid Range | Source | Description |
|---|-------------|-----------|------|-------------|--------|-------------|
| 1 | **`depth_mbgl`** | float32 | Meters Below Ground Level | 0 – 457 m (0 – 1500 ft) | India-WRIS / GSDA | Groundwater depth below the surface. The **label** for supervised learning. Converted to feet for user display: `feet = meters × 3.28084` |

---

### 1.2 Meteorological Features (5 Raw Inputs — From External APIs)

| # | Column Name | Data Type | Unit | Valid Range | Source | Category | Description |
|---|-------------|-----------|------|-------------|--------|----------|-------------|
| 2 | **`rainfall_mm`** | float32 | Millimeters | 0 – 500 mm/month | CHIRPS / Open-Meteo | Numerical–Continuous | Current month's total precipitation. **Primary recharge driver** for aquifers. |
| 3 | **`temperature_avg`** | float32 | Celsius (°C) | 10 – 45 °C | Open-Meteo / NASA POWER | Numerical–Continuous | Average monthly temperature. Higher temps increase evaporation, reducing recharge. |
| 4 | **`humidity`** | float32 | Percentage (%) | 0 – 100 % | Open-Meteo / NASA POWER | Numerical–Continuous | Relative humidity. Low humidity dries soil and blocks water percolation. |
| 5 | **`evapotranspiration`** | float32 | Millimeters | 0 – 15 mm/day | NASA POWER | Numerical–Continuous | Rate of water loss from soil + plants (ET₀). Competes directly with groundwater recharge. |
| 6 | **`soil_moisture_index`** | float32 | Index | 0.0 – 1.0 | NASA POWER | Numerical–Continuous | Root zone wetness. Value close to 1 = wet soil = faster percolation to aquifer. |

---

### 1.3 Lag Features (5 Derived — Engineered from Rainfall History)

> **Why lag features?** Monsoon rainfall in June–September doesn't immediately recharge groundwater. In Vidarbha's basalt geology, the effect appears **2–3 months later** (December–March). These features explicitly model that delay.

| # | Column Name | Data Type | Unit | Derivation Formula | Category | Description |
|---|-------------|-----------|------|-------------------|----------|-------------|
| 7 | **`rainfall_lag_1m`** | float32 | mm | `df.groupby('well_id')['rainfall_mm'].shift(1)` | Numerical–Derived | Rainfall exactly 1 month ago. |
| 8 | **`rainfall_lag_2m`** | float32 | mm | `df.groupby('well_id')['rainfall_mm'].shift(2)` | Numerical–Derived | Rainfall exactly 2 months ago. |
| 9 | **`rainfall_lag_3m`** | float32 | mm | `df.groupby('well_id')['rainfall_mm'].shift(3)` | Numerical–Derived | Rainfall 3 months ago — **primary lag for Vidarbha basalt aquifers**. |
| 10 | **`rainfall_rolling_3m`** | float32 | mm | `rolling(3).mean()` | Numerical–Derived | 3-month moving average. Reduces noise from single-month anomalies. |
| 11 | **`rainfall_rolling_6m`** | float32 | mm | `rolling(6).mean()` | Numerical–Derived | 6-month moving average. Captures seasonal rainfall trend. |

---

### 1.4 Derived Stress Features (3 Engineered — Drought & Anomaly Indicators)

| # | Column Name | Data Type | Unit | Derivation Formula | Category | Description |
|---|-------------|-----------|------|-------------------|----------|-------------|
| 12 | **`rainfall_deficit`** | float32 | mm | `rainfall_mm - long_term_monthly_avg` | Numerical–Derived | Deviation from historical average. Negative value = below-normal rainfall. |
| 13 | **`cumulative_deficit`** | float32 | mm | `cumsum(rainfall_deficit)` | Numerical–Derived | Accumulated deficit over time — indicates **multi-year drought** conditions. |
| 14 | **`temp_rainfall_ratio`** | float32 | Ratio | `temperature_avg / (rainfall_mm + 1)` | Numerical–Derived | Stress index. High value = hot and dry environment with poor recharge potential. |

---

### 1.5 Historical Groundwater Context (3 Derived — From Past Depth Readings)

| # | Column Name | Data Type | Unit | Derivation Formula | Category | Description |
|---|-------------|-----------|------|-------------------|----------|-------------|
| 15 | **`depth_lag_1q`** | float32 | m (mbgl) | `df.groupby('well_id')['depth_mbgl'].shift(1)` | Numerical–Derived | Groundwater depth 1 quarter (3 months) ago. **Rank #1 most important feature** — recent depth strongly predicts next depth. |
| 16 | **`depth_lag_2q`** | float32 | m (mbgl) | `df.groupby('well_id')['depth_mbgl'].shift(2)` | Numerical–Derived | Groundwater depth 2 quarters (6 months) ago. Captures longer trend. |
| 17 | **`depth_change_rate`** | float32 | m/month | `current_depth - previous_depth` | Numerical–Derived | Rate of rise or fall. Positive = water table dropping. Negative = recovery. |

---

### 1.6 Temporal Features (2 — Time-Cycle Encoding)

| # | Column Name | Data Type | Unit | Valid Range | Category | Description |
|---|-------------|-----------|------|-------------|----------|-------------|
| 18 | **`month`** | int8 | — | 1 – 12 | Numerical–Discrete (Ordinal) | Month of the year. Captures annual seasonality (monsoon onset in June vs dry peak in April–May). |
| 19 | **`season_encoded`** | int8 | — | 0 – 3 | Categorical–Encoded (Label) | Season code: **0** = Monsoon (Jun–Sep), **1** = Post-Monsoon (Oct–Nov), **2** = Winter (Dec–Feb), **3** = Summer (Mar–May). |

---

### 1.7 Geospatial Features (3 — Location Encoding)

| # | Column Name | Data Type | Unit | Valid Range | Source | Category | Description |
|---|-------------|-----------|------|-------------|--------|----------|-------------|
| 20 | **`district_encoded`** | int8 | — | 0 – 10 | LabelEncoder on district name | Categorical–Encoded (Label) | ID for 11 Vidarbha districts. Handles regional soil/geology variation. |
| 21 | **`latitude`** | float64 | Decimal Degrees | 19.5 – 21.5 (Vidarbha) | India-WRIS | Numerical–Continuous (Spatial) | GPS latitude of well/village. Required for KNN spatial interpolation. |
| 22 | **`longitude`** | float64 | Decimal Degrees | 76.0 – 80.5 (Vidarbha) | India-WRIS | Numerical–Continuous (Spatial) | GPS longitude of well/village. Required for KNN spatial interpolation. |

---

## 2. Raw Data vs Engineered Features

You only need to **collect 10 raw columns** from external data sources. The remaining **12 columns are derived** through feature engineering in Python.

### 2.1 What You Collect (10 Raw Columns)

| # | Raw Column | Source | How to Get |
|---|------------|--------|------------|
| 1 | `depth_mbgl` | India-WRIS / GSDA Portal | Download CSV from portal or scrape |
| 2 | `rainfall_mm` | CHIRPS / Open-Meteo API | API call with lat/lon |
| 3 | `temperature_avg` | Open-Meteo / NASA POWER API | API call with lat/lon |
| 4 | `humidity` | Open-Meteo / NASA POWER API | API call with lat/lon |
| 5 | `evapotranspiration` | NASA POWER API | API call with lat/lon |
| 6 | `soil_moisture_index` | NASA POWER API | API call with lat/lon |
| 7 | `latitude` | India-WRIS (per well) | Comes with well data |
| 8 | `longitude` | India-WRIS (per well) | Comes with well data |
| 9 | `district` | India-WRIS (per well) | Comes with well data |
| 10 | `date` | Timestamp column | Comes with all records |

### 2.2 What You Engineer (12 Derived Columns)

| # | Engineered Column | Derived From | Method |
|---|-------------------|--------------|--------|
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
| 12 | `season_encoded` | `month` | Label encoding season |

---

## 3. Dataset Types Classification

### 3.1 By Data Nature

| Data Type | Columns | Count | Description |
|-----------|---------|-------|-------------|
| **Numerical – Continuous** | `depth_mbgl`, `rainfall_mm`, `temperature_avg`, `humidity`, `evapotranspiration`, `soil_moisture_index`, all lag/rolling/deficit features, `latitude`, `longitude` | 17 | Real-valued numbers with infinite possible values within range |
| **Numerical – Discrete (Ordinal)** | `month` | 1 | Integer values that follow a meaningful order |
| **Categorical – Encoded (Label)** | `season_encoded`, `district_encoded` | 2 | Text categories converted to integers via `LabelEncoder` |
| **Numerical – Derived (Ratio)** | `temp_rainfall_ratio`, `depth_change_rate` | 2 | Calculated from combining two or more base features |

### 3.2 By Data Format

| Format | Usage | Description |
|--------|-------|-------------|
| **Tabular (CSV/Excel)** | ML models (XGBoost, Random Forest) | Standard rows × columns structure. Each row = one well at one timestamp. |
| **Time-Series Sequences** | DL models (LSTM, GRU, 1D-CNN) | Same tabular data reshaped into 3D: `(samples, 12 timesteps, 19 features)`. Each sample = past 12 months. |
| **Geospatial (GeoJSON/Shapefile)** | Map visualization (Folium) | District/taluka boundaries for Maharashtra. Used for map overlays, NOT for model training. |
| **Raster/Image (NetCDF/TIFF)** | CHIRPS rainfall grids | Gridded satellite rainfall data. Extracted to numerical values per lat/lon — **images are NOT used directly by the model**. |
| **JSON (API Response)** | Open-Meteo, NASA POWER | Raw API response format. Parsed into tabular numerical data. |

### 3.3 Important Note: No Image Data in Model

> This project is **NOT** an image classification problem. All model inputs are **numerical/tabular**. Satellite imagery (CHIRPS, NASA) is used only as a **data source** — pixel values are extracted at specific coordinates and converted to numerical features. The ML/DL models never process raw images.

---

## 4. Feature Importance Ranking

Expected ranking after XGBoost SHAP analysis:

| Rank | Feature | Category | Why It Matters |
|------|---------|----------|----------------|
| 🥇 1 | `depth_lag_1q` | Groundwater History | Most recent depth is the strongest predictor of next depth |
| 🥈 2 | `rainfall_lag_3m` | Lag Feature | Captures the critical 3-month delay in basalt geology |
| 🥉 3 | `rainfall_lag_2m` | Lag Feature | Medium-term rainfall effect |
| 4 | `cumulative_deficit` | Stress Feature | Multi-year drought indicator |
| 5 | `depth_lag_2q` | Groundwater History | 6-month-ago depth context |
| 6 | `rainfall_lag_1m` | Lag Feature | Short-term lag |
| 7 | `season_encoded` | Temporal | Monsoon vs Summer cycle |
| 8 | `rainfall_rolling_3m` | Lag Feature | Smoothed trend |
| 9 | `month` | Temporal | Monthly cyclical pattern |
| 10 | `temperature_avg` | Meteorological | Evaporation/recharge balance |

---

## 5. Model Output & Risk Classification

The predicted `depth_mbgl` value is classified into 4 risk levels:

| Risk Level | Depth (Meters) | Depth (Feet) | Color | Action for User |
|------------|----------------|--------------|-------|-----------------|
| **SAFE** | 0 – 30 m | 0 – 100 ft | 🟢 Green | "Monitor levels monthly. Normal irrigation allowed." |
| **WARNING** | 30 – 100 m | 100 – 330 ft | 🟠 Orange | "Plan for potential shortage. Avoid water-intensive crops." |
| **CRITICAL** | 100 – 200 m | 330 – 650 ft | 🔴 Red | "Arrange tanker supply. Activate village water budget." |
| **EXTREME** | > 200 m | > 650 ft | 🟣 Purple | "Aquifer depletion. Immediate crisis intervention needed." |

**Display to User:** `"Estimated Water Level: 145 Feet (44 Meters)"`

---

## 6. Tech Stack & Skills Required

### 6.1 Programming Skills

| Skill | Level Required | Purpose |
|-------|----------------|---------|
| **Python 3.10+** | Intermediate–Advanced | Core language for everything |
| **Pandas / NumPy** | Intermediate | Data loading, cleaning, manipulation, feature engineering |
| **Matplotlib / Seaborn / Plotly** | Intermediate | EDA charts, model comparison plots, interactive graphs |
| **Scikit-learn** | Intermediate | Train-test split, preprocessing, metrics, KNN, pipelines |
| **XGBoost** | Intermediate | Primary ML gradient boosting model |
| **Statsmodels** | Basic | VAR (Vector Auto-Regression) baseline model |
| **TensorFlow / Keras** | Intermediate | LSTM, GRU, 1D-CNN deep learning models |
| **Streamlit** | Basic–Intermediate | Web dashboard for user interface |
| **Folium / GeoPandas** | Basic | Interactive map rendering with well locations and risk overlays |
| **SHAP** | Basic | Model explainability — feature importance visualization |
| **Requests** | Basic | Fetching data from REST APIs (Open-Meteo, NASA POWER) |
| **Joblib / Pickle** | Basic | Saving and loading trained models |
| **Git / GitHub** | Basic | Version control |

### 6.2 Domain Knowledge Skills

| Skill | Why Needed |
|-------|------------|
| **Hydrology basics** | Understanding water cycle: rainfall → soil infiltration → aquifer recharge → well depth |
| **Time-series analysis** | Lag features, rolling windows, seasonal decomposition, temporal train-test split |
| **Geospatial concepts** | Haversine distance, KNN on coordinates, IDW interpolation, coordinate systems |
| **Feature engineering** | Creating lag, rolling, deficit, and ratio features from raw time-series data |
| **API data fetching** | Calling REST APIs (Open-Meteo, NASA POWER) and parsing JSON responses |

### 6.3 Tools & Platforms

| Tool | Purpose | Cost |
|------|---------|------|
| **Google Colab** | GPU training for DL models (free T4 GPU) | Free |
| **VS Code / Jupyter** | Local development and experimentation | Free |
| **Streamlit Cloud** | Deploy web dashboard online | Free tier |
| **GitHub** | Host code repository | Free |
| **India-WRIS Portal** | Download groundwater data (requires free registration) | Free |

### 6.4 Complete Installation Command

```bash
# ML Stack
pip install pandas numpy scikit-learn xgboost statsmodels joblib openpyxl

# DL Stack
pip install tensorflow keras

# Visualization & Dashboard
pip install matplotlib seaborn plotly folium geopandas streamlit streamlit-folium

# Data Fetching & Explainability
pip install requests shap

# GPS Feature (for Streamlit mobile location)
pip install streamlit-js-eval
```

---

## 7. GPS Location-Based Prediction Workflow

This section explains **how a user's phone GPS location is captured and used to predict groundwater depth at their exact spot**.

### 7.1 Complete Flow Diagram

```
  USER OPENS APP ON PHONE
  ────────────────────────
           │
           │ Step 1: Browser requests GPS permission
           ▼
  ┌─────────────────────────────────────────┐
  │  CAPTURE GPS COORDINATES                │
  │  latitude:  20.5937                     │
  │  longitude: 78.9629                     │
  │  accuracy:  ±10 meters                  │
  │  Method: Browser Geolocation API        │
  └──────────────────┬──────────────────────┘
                     │
                     │ Step 2: Send lat/lon to backend
                     ▼
  ┌─────────────────────────────────────────┐
  │  FIND NEAREST MONITORED WELLS (KNN)     │
  │  Algorithm: K-Nearest Neighbors         │
  │  Distance: Haversine (Earth curvature)  │
  │  K = 5 wells within 50 km radius        │
  │  Result: 5 closest wells + distances    │
  └──────────────────┬──────────────────────┘
                     │
                     │ Step 3: Interpolate historical features
                     ▼
  ┌─────────────────────────────────────────┐
  │  SPATIAL INTERPOLATION (IDW)            │
  │  Algorithm: Inverse Distance Weighting  │
  │  Closer wells get MORE weight           │
  │  Interpolates: depth_lag_1q, depth_lag  │
  │  _2q, depth_change_rate from neighbors  │
  │  Formula: value = Σ(wi × vi)            │
  │           where wi = 1 / distance^2     │
  └──────────────────┬──────────────────────┘
                     │
                     │ Step 4: Fetch live weather data
                     ▼
  ┌─────────────────────────────────────────┐
  │  LIVE DATA FROM APIs                    │
  │  API: Open-Meteo + NASA POWER           │
  │  Input: User's exact lat/lon            │
  │  Fetches:                               │
  │    • rainfall_mm (current)              │
  │    • temperature_avg                    │
  │    • humidity                           │
  │    • evapotranspiration                 │
  │    • soil_moisture_index                │
  └──────────────────┬──────────────────────┘
                     │
                     │ Step 5: Build prediction vector
                     ▼
  ┌─────────────────────────────────────────┐
  │  ASSEMBLE 21-FEATURE INPUT VECTOR       │
  │  [Interpolated lags from Step 3]        │
  │  + [Live weather from Step 4]           │
  │  + [User's GPS lat/lon]                 │
  │  + [Current month & season]             │
  │  + [Nearest district code]              │
  └──────────────────┬──────────────────────┘
                     │
                     │ Step 6: Run ML/DL model
                     ▼
  ┌─────────────────────────────────────────┐
  │  PREDICTION ENGINE                      │
  │  XGBoost prediction → value_1           │
  │  LSTM prediction    → value_2           │
  │  Ensemble weighted avg → final_depth    │
  │  Output: depth_mbgl = 44.2 meters       │
  └──────────────────┬──────────────────────┘
                     │
                     │ Step 7: Display result
                     ▼
  ┌─────────────────────────────────────────┐
  │  RESULT ON PHONE SCREEN                 │
  │  "Water Level: 145 Feet (44 Meters)"    │
  │  Status: ⚠️ WARNING                     │
  │  Confidence: 85%                        │
  │  Nearest well: 8.2 km away              │
  │  Map: pin at user + nearby wells        │
  └─────────────────────────────────────────┘
```

### 7.2 How to Get User Location (3 Methods)

#### Method A: Streamlit Web App (Mobile Browser)

```python
import streamlit as st
from streamlit_js_eval import get_geolocation

st.title("Groundwater Depth Checker")

if st.button("Use My Location"):
    location = get_geolocation()
    if location:
        user_lat = location['coords']['latitude']
        user_lon = location['coords']['longitude']
        accuracy = location['coords']['accuracy']
        st.success(f"Location: {user_lat:.4f}, {user_lon:.4f}")
        st.info(f"GPS Accuracy: ±{accuracy:.0f} meters")
```

> **How it works:** The `streamlit-js-eval` package injects JavaScript into the Streamlit page that calls the browser's `navigator.geolocation.getCurrentPosition()` API. When the user clicks "Use My Location", the browser asks for permission and returns GPS coordinates.

#### Method B: Manual Coordinate Entry

```python
user_lat = st.number_input("Enter Latitude", value=20.5937, format="%.4f")
user_lon = st.number_input("Enter Longitude", value=78.9629, format="%.4f")
```

> **When to use:** Fallback option if GPS is unavailable (desktop users, denied permission).

#### Method C: Click on Map

```python
import folium
from streamlit_folium import st_folium

m = folium.Map(location=[20.5, 78.5], zoom_start=8)
m.add_child(folium.LatLngPopup())  # Click to get coordinates
map_data = st_folium(m, width=700, height=500)

if map_data['last_clicked']:
    user_lat = map_data['last_clicked']['lat']
    user_lon = map_data['last_clicked']['lng']
```

> **How it works:** A Folium map is embedded in Streamlit. When the user clicks anywhere on the map, the click coordinates are captured and used for prediction.

### 7.3 KNN Well Search (Finding Nearest Monitored Wells)

```python
from sklearn.neighbors import NearestNeighbors
import numpy as np

def find_nearest_wells(user_lat, user_lon, well_data, k=5, max_km=50):
    well_coords = well_data[['latitude', 'longitude']].values
    knn = NearestNeighbors(n_neighbors=k, metric='haversine')
    knn.fit(np.radians(well_coords))

    user_point = np.radians([[user_lat, user_lon]])
    distances_rad, indices = knn.kneighbors(user_point)

    EARTH_RADIUS = 6371  # km
    distances_km = distances_rad[0] * EARTH_RADIUS

    valid = distances_km <= max_km
    return well_data.iloc[indices[0][valid]], distances_km[valid]
```

### 7.4 IDW Interpolation (Estimating Features at User's Location)

```python
def idw_interpolation(well_values, distances_km, power=2):
    weights = 1.0 / (distances_km ** power)
    weights /= weights.sum()
    return np.dot(weights, well_values)

# Example: Estimate depth_lag_1q at user's location
depth_lag_estimate = idw_interpolation(
    nearest_wells['depth_lag_1q'].values,
    distances_km
)
```

### 7.5 Live Weather Fetch for User's Coordinates

```python
import requests

def fetch_live_weather(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat, "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,precipitation",
        "timezone": "Asia/Kolkata"
    }
    response = requests.get(url, params=params)
    data = response.json()['current']
    return {
        'rainfall_mm': data['precipitation'],
        'temperature_avg': data['temperature_2m'],
        'humidity': data['relative_humidity_2m']
    }
```

### 7.6 Confidence Score

The prediction confidence depends on **how close** the nearest monitored well is:

| Nearest Well Distance | Confidence Level | Reliability |
|-----------------------|------------------|-------------|
| < 5 km | 90–95% | Very High — dense monitoring area |
| 5 – 15 km | 80–90% | High — reasonable interpolation |
| 15 – 30 km | 65–80% | Moderate — some uncertainty |
| 30 – 50 km | 50–65% | Low — limited data coverage |
| > 50 km | < 50% | Very Low — outside reliable range |

---

## 8. Dataset Dimensions & Specifications

### 8.1 Scale

| Parameter | Value |
|-----------|-------|
| **Time range** | 2010 – 2025 (15 years) |
| **Temporal resolution** | Monthly (12 records/year/well) or Quarterly (4/year/well) |
| **Number of wells** | ~500 – 1,500 across 11 Vidarbha districts |
| **Total raw rows** | ~30,000 – 90,000 |
| **After feature engineering** | ~25,000 – 80,000 (lag drops first few rows) |

### 8.2 Model Input Shapes

| Model Type | Shape | Example | Memory |
|------------|-------|---------|--------|
| **ML (XGBoost, RF)** | `(n_samples, 21)` | `(45000, 21)` | ~3.4 MB |
| **DL (LSTM, GRU, CNN)** | `(n_samples, 12, 21)` | `(45000, 12, 21)` | ~41 MB |

### 8.3 Train-Test Split (Time-Based — NOT Random)

| Split | Period | % of Data | Purpose |
|-------|--------|-----------|---------|
| **Training** | 2010 – 2023 | ~85% | Model training + hyperparameter tuning |
| **Validation** | Late 2023 | ~5% | DL early stopping, model selection |
| **Test** | 2024 – 2025 | ~10% | Final evaluation on unseen future data |

> **Critical Rule:** NEVER use random train-test split on time-series data. It causes **data leakage** — the model would "see" future data during training.

### 8.4 Data Quality Rules

| Feature | Valid Range | Outlier Handling |
|---------|-------------|-----------------|
| `depth_mbgl` | 0 – 457 m | Drop if < 0 or > 500 m (sensor error) |
| `rainfall_mm` | 0 – 500 mm/month | Cap at 500 (extreme but possible) |
| `temperature_avg` | 10 – 45 °C | Drop if outside range (sensor error) |
| `latitude` / `longitude` | Vidarbha bounds | Drop (cannot impute GPS coords) |

---

## 9. All Dataset Links & Sources

### 9.1 Primary Government & Satellite Sources (FREE)

| # | Dataset Name | What It Provides | Format | Link |
|---|--------------|------------------|--------|------|
| 1 | **India-WRIS** (Water Resources Information System) | Historical quarterly groundwater levels (mbgl), well IDs, lat/lon, district | CSV / Excel | [https://indiawris.gov.in/wris/#/groundWater](https://indiawris.gov.in/wris/#/groundWater) |
| 2 | **CHIRPS** (Climate Hazards Group) | High-resolution (0.05°) daily gridded rainfall data | NetCDF / TIFF | [https://www.chc.ucsb.edu/data/chirps](https://www.chc.ucsb.edu/data/chirps) |
| 3 | **NASA POWER** (Worldwide Energy Resources) | Soil moisture, evapotranspiration, humidity, temperature (satellite-derived) | JSON API | [https://power.larc.nasa.gov/](https://power.larc.nasa.gov/) |
| 4 | **Open-Meteo** | Historical + real-time weather: temp, humidity, precipitation, wind | JSON API | [https://open-meteo.com/en/docs/historical-weather-api](https://open-meteo.com/en/docs/historical-weather-api) |
| 5 | **GSDA Maharashtra** (Groundwater Surveys & Development Agency) | State-specific well monitoring reports for Maharashtra villages | PDF / Excel | [https://gsda.maharashtra.gov.in/](https://gsda.maharashtra.gov.in/) |
| 6 | **Census of India** (2011/2021) | Village-level population, irrigation area, cropping patterns | CSV | [https://censusindia.gov.in/](https://censusindia.gov.in/) |

### 9.2 Kaggle Datasets (FREE — Pre-Cleaned, Ready to Use)

| # | Dataset Title | Description | Link |
|---|---------------|-------------|------|
| 1 | **Rainfall in India (1901–2015)** | Subdivision-wise monthly, seasonal, and annual rainfall. Great for long-term trend analysis. | [https://www.kaggle.com/datasets/rajanand/rainfall-in-india](https://www.kaggle.com/datasets/rajanand/rainfall-in-india) |
| 2 | **India Weather Data (IMD)** | Historical weather: temp, rainfall, humidity for multiple stations across India. | [https://www.kaggle.com/datasets/rajanand/rainfall-in-india](https://www.kaggle.com/datasets/rajanand/rainfall-in-india) |
| 3 | **India Groundwater & Irrigation** | Aggregated state-level groundwater statistics and irrigation data. | [https://www.kaggle.com/search?q=india+groundwater](https://www.kaggle.com/search?q=india+groundwater) |
| 4 | **Maharashtra District-Level Data** | Socio-economic & agricultural data including water resource indicators. | [https://www.kaggle.com/datasets/danofer/india-village-directory](https://www.kaggle.com/datasets/danofer/india-village-directory) |
| 5 | **India Climate Data (1980–2020)** | Temperature, humidity, wind speed from various sources. | [https://www.kaggle.com/search?q=india+climate+data](https://www.kaggle.com/search?q=india+climate+data) |

### 9.3 GitHub Repositories (FREE — Scripts & Shapefiles)

| # | Repository / Topic | Description | Link |
|---|--------------------|-------------|------|
| 1 | **India-WRIS Scrapers** | Python scripts to bulk-download groundwater data from India-WRIS portal. | [https://github.com/search?q=india+wris+groundwater](https://github.com/search?q=india+wris+groundwater) |
| 2 | **CHIRPS Data Downloader** | Automated scripts to download CHIRPS rainfall for specific regions. | [https://github.com/topics/chirps](https://github.com/topics/chirps) |
| 3 | **NASA POWER API Python** | Python wrapper for NASA POWER API with fetching examples. | [https://github.com/search?q=nasa+power+api+python](https://github.com/search?q=nasa+power+api+python) |
| 4 | **Open-Meteo Python Client** | Community Python client for Open-Meteo API with batch downloads. | [https://github.com/open-meteo/python-requests](https://github.com/open-meteo/python-requests) |
| 5 | **DataMeet India Maps** | Official district/taluka GeoJSON boundaries for Maharashtra. | [https://github.com/datameet/maps](https://github.com/datameet/maps) |
| 6 | **Groundwater ML India** | Pre-built ML models and datasets for groundwater prediction (benchmark). | [https://github.com/search?q=groundwater+prediction+india](https://github.com/search?q=groundwater+prediction+india) |

### 9.4 API Endpoints for Live Data Fetching

#### Open-Meteo — Historical Weather

```
GET https://archive-api.open-meteo.com/v1/archive
    ?latitude=20.5937
    &longitude=78.9629
    &start_date=2010-01-01
    &end_date=2025-12-31
    &daily=precipitation_sum,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean
    &timezone=Asia/Kolkata
```

#### Open-Meteo — Real-Time (for GPS predictions)

```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=20.5937
    &longitude=78.9629
    &current=temperature_2m,relative_humidity_2m,precipitation
    &timezone=Asia/Kolkata
```

#### NASA POWER — Monthly Agro-Climatology

```
GET https://power.larc.nasa.gov/api/temporal/monthly/point
    ?parameters=T2M,RH2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,GWETROOT
    &community=AG
    &longitude=78.9629
    &latitude=20.5937
    &start=201001
    &end=202512
    &format=JSON
```

### 9.5 Access Notes

| Source | Registration | API Key | Rate Limit |
|--------|-------------|---------|------------|
| India-WRIS | Free account required | No | Manual download |
| CHIRPS | None | No | Large files — use Python/GEE to extract region |
| NASA POWER | Simple registration | No | ~30 requests/minute |
| Open-Meteo | None | No | 10,000 requests/day (free tier) |
| GSDA | None | No | Manual download |
| Kaggle | Free account required | Yes (for CLI) | Unlimited downloads |

---

> **Summary:** This project uses **22 numerical/categorical columns** (no images), requires **Python + ML/DL skills**, collects data from **6 free sources**, and supports **GPS-based predictions** through KNN spatial interpolation + live API weather fetching.
