# Project Features & Input-Output Specification

This document provides a complete specification of all features (inputs), target variables (outputs), and dataset parameters for the Groundwater Crisis Predictor project.

---

## 1. Project Input-Output Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT FEATURES                               │
│  • Historical groundwater levels (lag features)                      │
│  • Rainfall patterns (current + 3-month lags)                        │
│  • Soil moisture, temperature, humidity                              │
│  • Terrain: elevation, slope, soil type                              │
│  • Vegetation health: NDVI (satellite-derived)                       │
│  • Geospatial coordinates (lat, lon)                                 │
│  • Temporal features (month, season, year)                           │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
      ┌──────────────────────────────────────────────────┐
      │       ML/DL PREDICTION MODELS                    │
      │   XGBoost | LSTM | GRU | 1D-CNN | Ensemble      │
      └────────────────────────────┬─────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         OUTPUT PREDICTION                            │
│  • Groundwater depth (mbgl) — 1 to 3 months in advance              │
│  • Risk classification (Safe / Warning / Critical)                   │
│  • Village-level alert flags                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Target Variable (Output)

### What We Predict

| Variable Name | Description | Unit | Range | Type |
|---------------|-------------|------|-------|------|
| **`depth_mbgl`** | Groundwater depth below surface | Meters Below Ground Level (mbgl) | 0 - 457 m (1500 feet) | Continuous |
| **`depth_feet`** | Groundwater depth below surface (alternate unit) | Feet Below Ground Level | 0 - 1500 feet | Continuous |

**Note:** The model predicts in meters (mbgl), but can be converted to feet for display: `depth_feet = depth_mbgl × 3.28084`

### Depth Range Coverage

| Well Type | Typical Depth | Coverage |
|-----------|---------------|----------|
| **Shallow Dug Wells** | 0 - 50 m (0 - 164 feet) | ✅ Covered |
| **Medium Borewells** | 50 - 150 m (164 - 492 feet) | ✅ Covered |
| **Deep Borewells** | 150 - 457 m (492 - 1500 feet) | ✅ Covered |

### Derived Classification (Post-Prediction)

After predicting the continuous depth value, we classify into risk levels:

| Risk Level | Depth Range (mbgl) | Depth Range (feet) | Alert Color | Action Required |
|------------|--------------------|--------------------|-------------|------------------|
| **SAFE** | 0 - 30 m | 0 - 100 feet | 🟢 Green | Normal monitoring |
| **WARNING** | 30 - 100 m | 100 - 330 feet | 🟠 Orange | Prepare tanker routes |
| **CRITICAL** | 100 - 200 m | 330 - 656 feet | 🔴 Red | Deploy tankers, crop advisory |
| **EXTREME** | > 200 m | > 656 feet | 🟣 Purple | Aquifer depletion crisis |

---

## 3. Input Features (Predictors)

### 3.1 Meteorological Features (Time-Varying)

| Feature Name | Description | Unit | Source | Importance |
|--------------|-------------|------|--------|------------|
| **`rainfall_mm`** | Current month cumulative rainfall | Millimeters | CHIRPS / Open-Meteo | ⭐⭐⭐⭐⭐ |
| **`rainfall_lag_1m`** | Rainfall 1 month ago | Millimeters | Derived (lag feature) | ⭐⭐⭐⭐⭐ |
| **`rainfall_lag_2m`** | Rainfall 2 months ago | Millimeters | Derived (lag feature) | ⭐⭐⭐⭐⭐ |
| **`rainfall_lag_3m`** | Rainfall 3 months ago | Millimeters | Derived (lag feature) | ⭐⭐⭐⭐⭐ |
| **`rainfall_rolling_3m`** | 3-month moving average rainfall | Millimeters | Derived (rolling window) | ⭐⭐⭐⭐ |
| **`rainfall_rolling_6m`** | 6-month moving average rainfall | Millimeters | Derived (rolling window) | ⭐⭐⭐⭐ |
| **`rainfall_deficit`** | Deviation from long-term average | Millimeters | Derived | ⭐⭐⭐⭐ |
| **`cumulative_deficit`** | Cumulative rainfall deficit over time | Millimeters | Derived | ⭐⭐⭐ |
| **`temperature_avg`** | Average monthly temperature | Celsius (°C) | Open-Meteo / NASA POWER | ⭐⭐⭐ |
| **`humidity`** | Relative humidity | Percentage (%) | Open-Meteo / NASA POWER | ⭐⭐⭐ |
| **`evapotranspiration`** | Water loss from soil/plants | Millimeters | NASA POWER | ⭐⭐⭐ |
| **`soil_moisture_index`** | Root zone soil wetness | Index (0-1) | NASA POWER | ⭐⭐⭐ |
| **`temp_rainfall_ratio`** | Temperature / Rainfall (stress indicator) | Ratio | Derived | ⭐⭐ |

### 3.2 Lagged Groundwater Features (Time-Varying)

| Feature Name | Description | Unit | Source | Importance |
|--------------|-------------|------|--------|------------|
| **`depth_lag_1q`** | Groundwater depth 1 quarter ago | Meters (mbgl) | Derived (lag feature) | ⭐⭐⭐⭐⭐ |
| **`depth_lag_2q`** | Groundwater depth 2 quarters ago | Meters (mbgl) | Derived (lag feature) | ⭐⭐⭐⭐ |
| **`depth_change_rate`** | Rate of depth change (slope) | Meters/month | Derived (diff) | ⭐⭐⭐⭐ |

### 3.3 Temporal Features (Cyclical)

| Feature Name | Description | Range | Source | Importance |
|--------------|-------------|-------|--------|------------|
| **`month`** | Month of the year | 1 - 12 | Timestamp | ⭐⭐⭐⭐ |
| **`quarter`** | Quarter of the year | 1 - 4 | Derived | ⭐⭐⭐ |
| **`season_encoded`** | Season (Monsoon=0, Post-Monsoon=1, Winter=2, Summer=3) | 0 - 3 | Label Encoding | ⭐⭐⭐⭐ |

### 3.4 Geospatial Features (Static)

| Feature Name | Description | Unit | Source | Importance |
|--------------|-------------|------|--------|------------|
| **`latitude`** | Well/Village latitude | Decimal Degrees | India-WRIS | ⭐⭐⭐ |
| **`longitude`** | Well/Village longitude | Decimal Degrees | India-WRIS | ⭐⭐⭐ |
| **`district_encoded`** | District ID (Label Encoded) | 0 - 10 | Label Encoding | ⭐⭐⭐ |

### 3.5 Terrain & Vegetation Features (Geophysical)

| Feature Name | Description | Unit | Source | Importance |
|--------------|-------------|------|--------|------------|
| **`elevation_m`** | Elevation above sea level | Meters | SRTM 30m DEM | ⭐⭐⭐⭐ |
| **`slope_degree`** | Terrain slope | Degrees | Derived from SRTM DEM | ⭐⭐⭐ |
| **`soil_type_encoded`** | Soil classification (label encoded) | 0–4 | FAO Soil Map / ISRO NBSS | ⭐⭐⭐⭐ |
| **`ndvi`** | Normalized Difference Vegetation Index | −1 to +1 | MODIS MOD13Q1 (250m) | ⭐⭐⭐ |

### 3.6 Total Feature Count

**For ML Models (Tabular):** 23 features  
**For DL Models (Sequential):** Same 23 features, but reshaped as sequences (12 timesteps × 23 features)

---

## 4. Feature Engineering Details

### Lag Features (Critical for Capturing Rainfall-to-Groundwater Delay)

```python
# Example: Creating 3-month rainfall lag
df['rainfall_lag_1m'] = df.groupby('well_id')['rainfall_mm'].shift(1)
df['rainfall_lag_2m'] = df.groupby('well_id')['rainfall_mm'].shift(2)
df['rainfall_lag_3m'] = df.groupby('well_id')['rainfall_mm'].shift(3)
```

**Why critical?** Monsoon rainfall in June doesn't immediately recharge groundwater. The effect appears 2-3 months later. These lag features explicitly model this delay.

### Rolling Window Features (Smoothing)

```python
# Example: 3-month rolling average
df['rainfall_rolling_3m'] = df.groupby('well_id')['rainfall_mm'].transform(
    lambda x: x.rolling(3, min_periods=1).mean()
)
```

**Why useful?** Reduces noise from single-month anomalies, captures sustained rainfall patterns.

### Deficit Features (Anomaly Detection)

```python
# Example: Deviation from historical average
long_term_avg = df.groupby(['well_id', 'month'])['rainfall_mm'].transform('mean')
df['rainfall_deficit'] = df['rainfall_mm'] - long_term_avg
df['cumulative_deficit'] = df.groupby('well_id')['rainfall_deficit'].cumsum()
```

**Why important?** A single month's deficit may not matter, but cumulative multi-year deficits indicate severe drought conditions.

---

## 5. Dataset Parameters & Specifications

### 5.1 Raw Dataset Dimensions

| Parameter | Value |
|-----------|-------|
| **Time Range** | 2010-01-01 to 2025-12-31 (15 years) |
| **Temporal Resolution** | Quarterly (4 records/year/well) OR Monthly (12 records/year/well) |
| **Number of Wells** | ~500 - 1,500 (across 11 Vidarbha districts) |
| **Estimated Total Rows** | 30,000 - 90,000 (before feature engineering) |
| **After Feature Engineering** | ~25,000 - 80,000 (due to lag window dropping initial rows) |

### 5.2 Processed Dataset Shape (For ML)

```
Shape: (n_samples, n_features)
Example: (45,000 samples, 23 features)

Columns:
  - rainfall_mm, rainfall_lag_1m, rainfall_lag_2m, rainfall_lag_3m,
  - rainfall_rolling_3m, rainfall_rolling_6m,
  - rainfall_deficit, cumulative_deficit,
  - temperature_avg, humidity, evapotranspiration, soil_moisture_index,
  - temp_rainfall_ratio,
  - depth_lag_1q, depth_lag_2q, depth_change_rate,
  - month, season_encoded, district_encoded,
  - latitude, longitude,
  - elevation_m, slope_degree, soil_type_encoded, ndvi

Target:
  - depth_mbgl
```

### 5.3 Processed Dataset Shape (For DL)

```
Shape: (n_samples, timesteps, n_features)
Example: (44,988 samples, 12 timesteps, 23 features)

Explanation:
  - Each sample contains the PREVIOUS 12 months of data
  - Used to predict the NEXT month's groundwater depth
  - Timesteps = 12 (lookback window)
  - Features = Same 23 features as ML

Target:
  - depth_mbgl (single value for next month)
```

### 5.4 Train-Test Split (Time-Based)

| Split | Time Period | Samples | Purpose |
|-------|-------------|---------|---------|
| **Training Set** | 2010 - 2023 | ~85% (~38,000) | Model training & hyperparameter tuning |
| **Validation Set** | 2023 (last quarter) | ~5% (~2,000) | DL early stopping, model selection |
| **Test Set** | 2024 - 2025 | ~10% (~4,500) | Final evaluation (unseen future data) |

**Critical:** We NEVER use random train-test split. Time-series data must respect temporal order to avoid data leakage.

---

## 6. Input-Output Format per Model Type

### 6.1 ML Models (XGBoost, Random Forest)

**Input:**
```python
X_train.shape: (38000, 23)  # 38K samples, 23 features (tabular)
y_train.shape: (38000,)      # 38K target values
```

**Output:**
```python
predictions.shape: (4500,)   # Single depth value per sample
Example: [8.2, 12.5, 15.8, 9.1, ...]  # Predicted depth in meters
```

### 6.2 DL Models (LSTM, GRU, 1D-CNN)

**Input:**
```python
X_train.shape: (37988, 12, 23)  # (samples, 12-month lookback, 23 features)
y_train.shape: (37988,)         # Target for next month

Example for 1 sample:
  - Shape: (12, 23)
  - Represents: Past 12 months of all 23 features
  - Predicts: Depth for month 13
```

**Output:**
```python
predictions.shape: (4488,)   # Single depth value per sample
Example: [8.1, 12.7, 15.6, 9.3, ...]  # Predicted depth in meters
```

### 6.3 Ensemble Model (ML + DL)

**Input:**
```python
# Takes predictions from ALL models
ml_predictions.shape: (4500,)
lstm_predictions.shape: (4488,)  # Shorter due to sequence window
gru_predictions.shape: (4488,)
cnn_predictions.shape: (4488,)
```

**Output:**
```python
# Weighted average of aligned predictions
ensemble_predictions.shape: (4488,)

Weights:
  XGBoost = 0.30
  LSTM    = 0.25
  CNN-LSTM= 0.20
  GRU     = 0.15
  1D-CNN  = 0.10
```

---

## 7. Data Types & Memory Requirements

### 7.1 Feature Data Types

| Feature Type | Data Type | Memory (per value) |
|--------------|-----------|-------------------|
| Rainfall, Temperature, Depth, Elevation, Slope, NDVI | `float32` | 4 bytes |
| Month, District, Season, Soil Type | `int8` | 1 byte |
| Latitude, Longitude | `float64` | 8 bytes |

### 7.2 Estimated Dataset Size

```
ML Dataset (Tabular):
  45,000 samples × 23 features × 4 bytes ≈ 4.1 MB

DL Dataset (Sequential):
  45,000 samples × 12 timesteps × 23 features × 4 bytes ≈ 50 MB

Total (with train/test/validation): ~60-120 MB
```

**Conclusion:** Entire dataset fits easily in RAM. No need for batch loading or disk-based storage during training.

---

## 8. Feature Importance Rankings (From XGBoost)

Based on typical groundwater prediction models, expected importance ranking:

| Rank | Feature | Why Important |
|------|---------|---------------|
| 1️⃣ | `depth_lag_1q` | Most recent depth is strongest predictor of next depth |
| 2️⃣ | `rainfall_lag_3m` | Captures the 3-month lag effect |
| 3️⃣ | `rainfall_lag_2m` | Medium-term lag effect |
| 4️⃣ | `cumulative_deficit` | Multi-year drought indicator |
| 5️⃣ | `depth_lag_2q` | Secondary historical depth |
| 6️⃣ | `rainfall_lag_1m` | Short-term lag |
| 7️⃣ | `season_encoded` | Monsoon vs Summer vs Winter patterns |
| 8️⃣ | `rainfall_rolling_3m` | Smoothed rainfall trend |
| 9️⃣ | `month` | Monthly cyclical patterns |
| 🔟 | `temperature_avg` | Evaporation/recharge balance |

**Note:** Actual importance will be calculated via SHAP analysis after model training.

---

## 9. Data Quality Requirements

### 9.1 Missing Value Handling

| Feature | Strategy |
|---------|----------|
| Rainfall | Forward-fill within same location, then interpolate |
| Temperature | Linear interpolation across time |
| Groundwater Depth | Forward-fill within same well, drop if >3 months missing |
| Latitude/Longitude | Drop rows (cannot impute geospatial coordinates) |

### 9.2 Outlier Detection

| Feature | Valid Range | Outlier Threshold |
|---------|-------------|-------------------|
| `depth_mbgl` | 0 - 457 m (1500 feet) | Drop if < 0 or > 500 m (sensor error / physically unreliable) |
| `rainfall_mm` | 0 - 500 mm/month | Cap at 500 (extreme but possible) |
| `temperature_avg` | 10 - 45 °C | Drop if outside range (sensor error) |

### 9.3 Normalization (For DL Only)

```python
from sklearn.preprocessing import MinMaxScaler

# Scale features to [0, 1] range for neural networks
scaler = MinMaxScaler(feature_range=(0, 1))
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

**Note:** ML models (XGBoost, Random Forest) do NOT require normalization. Only DL models need scaled input.

---

## 10. Summary Table: Complete Feature List

| # | Feature Name | Category | Data Type | ML Input | DL Input | Importance |
|---|--------------|----------|-----------|----------|----------|------------|
| 1 | `rainfall_mm` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| 2 | `rainfall_lag_1m` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| 3 | `rainfall_lag_2m` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| 4 | `rainfall_lag_3m` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| 5 | `rainfall_rolling_3m` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 6 | `rainfall_rolling_6m` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 7 | `rainfall_deficit` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 8 | `cumulative_deficit` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐ |
| 9 | `temperature_avg` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐ |
| 10 | `humidity` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐ |
| 11 | `evapotranspiration` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐ |
| 12 | `soil_moisture_index` | Meteorological | float32 | ✅ | ✅ | ⭐⭐⭐ |
| 13 | `temp_rainfall_ratio` | Derived | float32 | ✅ | ✅ | ⭐⭐ |
| 14 | `depth_lag_1q` | Groundwater | float32 | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| 15 | `depth_lag_2q` | Groundwater | float32 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 16 | `depth_change_rate` | Groundwater | float32 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 17 | `month` | Temporal | int8 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 18 | `season_encoded` | Temporal | int8 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 19 | `district_encoded` | Geospatial | int8 | ✅ | ✅ | ⭐⭐⭐ |
| 20 | `latitude` | Geospatial | float64 | ✅ | ✅ | ⭐⭐⭐ |
| 21 | `longitude` | Geospatial | float64 | ✅ | ✅ | ⭐⭐⭐ |
| 22 | `elevation_m` | Terrain | float32 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 23 | `slope_degree` | Terrain | float32 | ✅ | ✅ | ⭐⭐⭐ |
| 24 | `soil_type_encoded` | Terrain | int8 | ✅ | ✅ | ⭐⭐⭐⭐ |
| 25 | `ndvi` | Vegetation | float32 | ✅ | ✅ | ⭐⭐⭐ |

**Total:** 25 input features + 1 target variable = 26 columns in final dataset

---

## 11. Example: Single Data Point

### Raw Format (What we collect)

```csv
date,well_id,latitude,longitude,district,depth_mbgl,rainfall_mm,temperature_avg,humidity,soil_moisture
2024-06-01,WELL_001,20.5937,78.9629,Nagpur,8.2,245.3,32.1,78,0.45
```

### Processed Format (After feature engineering - ML input)

```python
{
  'rainfall_mm': 245.3,
  'rainfall_lag_1m': 180.5,    # May 2024 rainfall
  'rainfall_lag_2m': 120.8,    # April 2024 rainfall
  'rainfall_lag_3m': 95.2,     # March 2024 rainfall
  'rainfall_rolling_3m': 147.2,
  'rainfall_rolling_6m': 165.8,
  'rainfall_deficit': -15.7,
  'cumulative_deficit': -42.3,
  'temperature_avg': 32.1,
  'humidity': 78.0,
  'evapotranspiration': 5.2,
  'soil_moisture_index': 0.45,
  'temp_rainfall_ratio': 0.131,
  'depth_lag_1q': 7.8,         # Mar 2024 depth
  'depth_lag_2q': 7.2,         # Dec 2023 depth
  'depth_change_rate': 0.2,
  'month': 6,
  'season_encoded': 2,         # Monsoon
  'district_encoded': 0,       # Nagpur
  'latitude': 20.5937,
  'longitude': 78.9629,
  'elevation_m': 310.5,
  'slope_degree': 2.8,
  'soil_type_encoded': 1,      # Black Cotton soil
  'ndvi': 0.45
}

Target (What we predict):
  'depth_mbgl': 7.5  # Predicted depth for July 2024
```

---

---

## 12. GPS-Based Prediction (Phone Location Feature)

### Real-Time Prediction from User Location

The system supports **location-based groundwater prediction** where users can get predictions for their exact GPS coordinates without needing to select a pre-defined well.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  USER PHONE                                                      │
│  GPS: lat=20.5937, lon=78.9629                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  SPATIAL INTERPOLATION                                           │
│  Find 3-5 nearest wells within 50 km radius                     │
│  Method: KNN / Inverse Distance Weighting (IDW)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  FEATURE EXTRACTION                                              │
│  • Fetch rainfall from NASA/Open-Meteo for user's coordinates   │
│  • Use nearest well's lag features as proxy                     │
│  • Interpolate depth_lag features from neighbors                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  ML/DL MODEL PREDICTION                                          │
│  Input: [user_lat, user_lon, interpolated_features]            │
│  Output: Predicted depth at user's location                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTPUT TO USER                                                  │
│  "At your location: Expected depth = 145 ft (44 m)"             │
│  Risk Level: WARNING                                             │
│  Nearest monitored well: 8.2 km away                            │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### Step 1: Capture User Location

```python
# Mobile App / Web App with GPS access
import streamlit as st
from streamlit_js_eval import get_geolocation

# Get user's phone GPS coordinates
location = get_geolocation()
user_lat = location['coords']['latitude']
user_lon = location['coords']['longitude']

print(f"User location: {user_lat}, {user_lon}")
```

#### Step 2: Find Nearest Wells (KNN)

```python
from sklearn.neighbors import NearestNeighbors
from scipy.spatial.distance import cdist
import numpy as np

# Load all well coordinates from training data
well_coords = trained_data[['latitude', 'longitude']].values
well_depths = trained_data['depth_mbgl'].values

# Find 5 nearest wells
knn = NearestNeighbors(n_neighbors=5, metric='haversine')
knn.fit(np.radians(well_coords))  # Haversine needs radians

user_coords = np.radians([[user_lat, user_lon]])
distances, indices = knn.kneighbors(user_coords)

# Convert distances from radians to km
distances_km = distances * 6371  # Earth radius in km

nearest_wells = trained_data.iloc[indices[0]]
print(f"Nearest well: {distances_km[0][0]:.2f} km away")
```

#### Step 3: Inverse Distance Weighting (IDW) Interpolation

```python
def idw_interpolation(nearest_wells, distances_km, power=2):
    """
    Interpolates groundwater depth using Inverse Distance Weighting.
    Closer wells have more influence on the prediction.
    """
    # Avoid division by zero (if user is exactly at a well)
    distances_km[distances_km == 0] = 0.0001
    
    # Calculate weights: closer wells have higher weights
    weights = 1 / (distances_km ** power)
    weights = weights / weights.sum()  # Normalize to sum=1
    
    # Weighted average of depths
    predicted_depth = np.sum(nearest_wells['depth_mbgl'].values * weights.flatten())
    
    return predicted_depth, weights

predicted_depth, weights = idw_interpolation(nearest_wells, distances_km)
print(f"Interpolated depth at user location: {predicted_depth:.2f} m")
```

#### Step 4: Fetch Live Features for User Location

```python
import requests
from datetime import datetime, timedelta

def fetch_features_for_location(lat, lon):
    """
    Fetches current and historical weather data for user's GPS coordinates.
    """
    # Open-Meteo API call
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
    
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "precipitation_sum,temperature_2m_mean,relative_humidity_2m_mean"
    }
    
    response = requests.get(url, params=params)
    data = response.json()['daily']
    
    # Calculate lag features
    rainfall = data['precipitation_sum']
    features = {
        'rainfall_mm': sum(rainfall[-30:]),  # Last month
        'rainfall_lag_1m': sum(rainfall[-60:-30]),  # 1 month ago
        'rainfall_lag_2m': sum(rainfall[-90:-60]),  # 2 months ago
        'temperature_avg': np.mean(data['temperature_2m_mean'][-30:]),
        'humidity': np.mean(data['relative_humidity_2m_mean'][-30:]),
        # ... other features
    }
    
    return features

user_features = fetch_features_for_location(user_lat, user_lon)
```

#### Step 5: Predict Using ML Model

```python
import joblib

# Load trained model
model = joblib.load('models/xgb_groundwater_predictor.pkl')

# Combine interpolated depth with live features
full_features = {
    **user_features,
    'depth_lag_1q': predicted_depth,  # Use interpolated depth as lag
    'latitude': user_lat,
    'longitude': user_lon,
    'month': datetime.now().month,
    'season_encoded': get_season_code(datetime.now().month),
    # ... other required features
}

# Convert to DataFrame in correct order
feature_vector = pd.DataFrame([full_features])[FEATURE_COLS]

# Predict
final_prediction = model.predict(feature_vector)[0]

print(f"Final prediction at GPS location: {final_prediction:.2f} m ({final_prediction * 3.28:.2f} feet)")
```

### Mobile App Integration

**Streamlit Web App (Works on Mobile Browsers):**

```python
import streamlit as st
import folium
from streamlit_folium import st_folium

st.title("📍 Check Groundwater at Your Location")

if st.button("Use My Current Location"):
    # Get GPS from browser
    location = st.experimental_get_query_params()
    
    if 'lat' in location and 'lon' in location:
        user_lat = float(location['lat'][0])
        user_lon = float(location['lon'][0])
        
        # Run prediction
        prediction = predict_at_location(user_lat, user_lon)
        
        # Display result
        st.success(f"🌊 Predicted Groundwater Depth at Your Location:")
        col1, col2 = st.columns(2)
        col1.metric("Depth (Meters)", f"{prediction:.1f} m")
        col2.metric("Depth (Feet)", f"{prediction * 3.28:.0f} ft")
        
        # Risk classification
        if prediction < 30:
            st.info("🟢 Status: SAFE — Water available at shallow depth")
        elif prediction < 100:
            st.warning("🟠 Status: WARNING — Moderate borewell depth needed")
        else:
            st.error("🔴 Status: CRITICAL — Deep aquifer depletion")
        
        # Show map
        m = folium.Map(location=[user_lat, user_lon], zoom_start=12)
        folium.Marker([user_lat, user_lon], 
                      popup=f"Your Location\n{prediction:.1f}m depth",
                      icon=folium.Icon(color='red')).add_to(m)
        st_folium(m, width=700, height=500)
```

### Accuracy Considerations

| Factor | Impact on Accuracy | Mitigation |
|--------|-------------------|------------|
| **Distance to nearest well** | ⬇️ Accuracy decreases if >20 km | Use IDW with more neighbors (5-10) |
| **Terrain variation** | ⬇️ Hills/valleys may have different aquifer depths | Factor in elevation data |
| **Well type mismatch** | ⬇️ User may drill deeper than training wells | Train on mixed shallow+deep well data |
| **Temporal lag** | ⬇️ Real-time data may not have full lag features | Use nearest well's lag features as proxy |

**Recommended Approach:**
- For locations **within 5 km** of training wells: High confidence (±10% error)
- For locations **5-20 km** from wells: Moderate confidence (±20% error)
- For locations **>20 km** from wells: Display warning "Limited data, estimate may vary"

### Data Requirements for Deep Well Support (1500 feet)

| Data Type | Source | Status |
|-----------|--------|--------|
| **Shallow Well Data (0-50m)** | India-WRIS | ✅ Available |
| **Medium Borewell Data (50-150m)** | GSDA Maharashtra, private borewells | ⚠️ Limited availability |
| **Deep Borewell Data (150-457m)** | CGWB deep aquifer studies | ⚠️ Requires special access |

**Action Items:**
1. Request CGWB deep well monitoring data for Vidarbha
2. Partner with private borewell drilling companies for depth records
3. Use satellite-based aquifer mapping (GRACE) to supplement deep aquifer estimates

---

**Document Purpose:** This specification serves as the complete reference for data scientists, ML engineers, and developers implementing the groundwater prediction system. All feature names, types, and transformations are standardized based on this document.

**Last Updated:** February 2026  
**Version:** 2.0 (Added: 1500 feet depth range + GPS-based prediction)
