# ML & DL-Based Spatio-Temporal Groundwater Crisis Predictor

## Complete Project Guide — Step by Step

> **Project Type:** Machine Learning + Deep Learning (Supervised Regression + Time-Series Forecasting)  
> **Domain:** Hydrology / Water Resource Management  
> **Region:** Vidarbha, Maharashtra, India  
> **Duration:** 16 Weeks  
> **Cost:** ₹0 (Fully Open-Source Stack, Google Colab GPU)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [ML vs DL — Why Both?](#4-ml-vs-dl--why-both)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Data Sources & Collection](#7-data-sources--collection)
8. [Step-by-Step Implementation](#8-step-by-step-implementation)
   - [Phase 1: Data Collection & EDA (Weeks 1–3)](#phase-1-data-collection--eda-weeks-13)
   - [Phase 2: Feature Engineering (Weeks 4–6)](#phase-2-feature-engineering-weeks-46)
   - [Phase 3: ML Model Training (Weeks 7–8)](#phase-3-ml-model-training-weeks-78)
   - [Phase 4: DL Model Training (Weeks 9–11)](#phase-4-dl-model-training-weeks-911)
   - [Phase 5: Dashboard & Visualization (Weeks 12–14)](#phase-5-dashboard--visualization-weeks-1214)
   - [Phase 6: Testing & Validation (Weeks 15–16)](#phase-6-testing--validation-weeks-1516)
9. [All Models Used (ML + DL)](#9-all-models-used-ml--dl)
10. [Evaluation Metrics](#10-evaluation-metrics)
11. [Folder Structure](#11-folder-structure)
12. [How to Run](#12-how-to-run)
13. [Expected Outcomes](#13-expected-outcomes)
14. [Limitations & Future Scope](#14-limitations--future-scope)
15. [References](#15-references)

---

## 1. Project Overview

This project builds a **hybrid ML + DL system** that predicts groundwater level depletion **60–90 days in advance** for villages in the Vidarbha region of Maharashtra. Unlike existing government systems (MRSAC/GSDA) that only provide *descriptive* reports about current water levels, this system uses **classical ML models for tabular features** and **Deep Learning models for sequential time-series patterns** to forecast future crises.

### Dual Approach: ML + DL Working Together

| Aspect | ML Models | DL Models |
|--------|-----------|-----------|
| **Models Used** | XGBoost, Random Forest, VAR | LSTM, GRU, 1D-CNN |
| **Best For** | Tabular feature-based prediction | Sequential temporal pattern learning |
| **Input** | Engineered features (lag, rolling avg) | Raw time-series sequences |
| **Interpretability** | High (SHAP, feature importance) | Moderate (Attention weights, Grad-CAM) |
| **Training Speed** | Fast (minutes) | Slower (needs GPU, ~1 hour) |
| **Data Requirement** | Works with 10K+ rows | Benefits from 50K+ rows |
| **Compute** | Google Colab CPU | Google Colab free GPU (T4) |
| **Role in Project** | Primary predictor + explainability | Sequence modeling + ensemble boost |

---

## 2. Problem Statement

> **"Can we predict which villages in Vidarbha will face groundwater crisis 3 months before it happens, using publicly available rainfall, soil, and well data?"**

### Why This Matters

- **8 out of 11** Vidarbha districts face chronic groundwater depletion
- **₹25 Crore+** spent annually on emergency water tankers (reactive approach)
- **2.5 Lakh+ farmers** affected by delayed water availability warnings
- Current systems tell you the problem *after* it happens; ML can warn *before*

### The "Lag Effect" Problem

Rainfall deficit in Monsoon (June–Sept) doesn't immediately drop groundwater levels. The effect manifests **3–4 months later** (Dec–Mar). This lag is the key ML feature this project exploits.

---

## 3. Objectives

1. **Collect & clean** 15 years of multi-source data (2010–2025) for Vidarbha
2. **Engineer lag-based features** that capture rainfall-to-groundwater delay
3. **Train ML models** (XGBoost, Random Forest, VAR) for tabular feature-based prediction
4. **Train DL models** (LSTM, GRU, 1D-CNN) for sequential time-series forecasting
5. **Build an ensemble** that combines ML + DL predictions for maximum accuracy
6. **Build a Streamlit dashboard** with village-level alert maps and model comparison
7. **Achieve >88% R² accuracy** and **RMSE < 0.45 meters** on test data
8. **Generate actionable alerts** for Tehsildar offices 60–90 days in advance

---

## 4. ML vs DL — Why Both?

### The Case for Using Both Approaches

```
ML Models (XGBoost, RF)          DL Models (LSTM, GRU)
┌──────────────────────┐         ┌──────────────────────┐
│ ✅ Feature importance │         │ ✅ Learns sequences   │
│ ✅ Fast training      │         │ ✅ Auto feature learn │
│ ✅ Small data OK      │         │ ✅ Complex patterns   │
│ ✅ Highly explainable │         │ ✅ Multi-step forecast│
│ ❌ Manual features    │         │ ❌ Needs more data    │
│ ❌ No sequence memory │         │ ❌ GPU compute needed │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └──────────┬─────────────────────┘
                      ▼
          ┌────────────────────┐
          │  ENSEMBLE MODEL    │
          │  (Weighted Average │
          │   or Stacking)     │
          │  Best of both!     │
          └────────────────────┘
```

### When Each Model Wins

| Scenario | Best Model | Why |
|----------|-----------|-----|
| Short-term (1 month ahead) | XGBoost | Lag features capture immediate effects |
| Long-term (3 months ahead) | LSTM/GRU | Learns long-range temporal dependencies |
| Explaining to officials | Random Forest | Feature importance is intuitive |
| Detecting unusual patterns | 1D-CNN | Convolutional filters spot anomalies |
| Final production prediction | Ensemble (ML+DL) | Combines strengths of all models |

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                             │
│  India-WRIS │ CHIRPS │ NASA POWER │ Open-Meteo │ GSDA       │
└──────┬──────┴────┬───┴─────┬──────┴─────┬──────┴──────┬─────┘
       │           │         │            │             │
       ▼           ▼         ▼            ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA INGESTION LAYER (Python Scripts)           │
│  API fetching │ CSV parsing │ Web scraping │ Data merging    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PREPROCESSING & FEATURE ENGINEERING             │
│  Missing value handling │ Lag features (t-1, t-2, t-3)      │
│  Rolling averages │ Spatial interpolation │ Normalization    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                ML MODEL TRAINING (Tabular)                    │
│  ┌───────────┐  ┌──────────────┐  ┌────────────────┐       │
│  │  XGBoost   │  │ Random Forest│  │ VAR (Baseline)  │       │
│  │ Regressor  │  │  Regressor   │  │ Time-Series     │       │
│  └─────┬─────┘  └──────┬───────┘  └───────┬────────┘       │
│        └───────────┬────┘──────────────────┘                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DL MODEL TRAINING (Sequential)                  │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐        │
│  │  LSTM     │  │   GRU        │  │  1D-CNN         │        │
│  │ (2 layer) │  │  (2 layer)   │  │  (Conv+Dense)   │        │
│  └─────┬────┘  └──────┬───────┘  └───────┬────────┘        │
│        └───────────┬───┘─────────────────┘                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ENSEMBLE LAYER (ML + DL)                        │
│       Weighted Average / Stacking Meta-Learner               │
│            Best Model Selection per horizon                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                PREDICTION & OUTPUT LAYER                      │
│  Streamlit Dashboard │ Folium Maps │ Village-Level Alerts    │
│  CSV Export │ Tanker Route Suggestions │ Monthly Reports     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Technology Stack

### ML Stack

| Category | Tool | Purpose |
|----------|------|---------|
| **Language** | Python 3.10+ | Core programming language |
| **Data** | Pandas, NumPy | Data manipulation & numerical computing |
| **ML Framework** | Scikit-learn | Model training, evaluation, pipelines |
| **Gradient Boosting** | XGBoost | Primary ML regression model |
| **Time-Series** | Statsmodels (VAR) | Vector Auto-Regression baseline |
| **Model Persistence** | Joblib, Pickle | Save/load trained ML models |

### DL Stack

| Category | Tool | Purpose |
|----------|------|---------|
| **DL Framework** | TensorFlow 2.x / Keras | LSTM, GRU, 1D-CNN model building |
| **GPU Compute** | Google Colab (Free T4 GPU) | Training deep learning models |
| **Sequence Processing** | tf.keras.layers (LSTM, GRU, Conv1D) | Time-series sequence modeling |
| **Callbacks** | EarlyStopping, ModelCheckpoint | Prevent overfitting, save best weights |
| **DL Explainability** | tf-keras-vis, Captum | Gradient-based feature attribution |

### Shared Stack

| Category | Tool | Purpose |
|----------|------|---------|
| **Visualization** | Matplotlib, Seaborn, Plotly | Charts and statistical plots |
| **Geospatial** | Folium, GeoPandas | Interactive map rendering |
| **Dashboard** | Streamlit | Web-based user interface |
| **API Calls** | Requests, urllib | Data fetching from portals |
| **Notebook** | Google Colab / Jupyter | Development & experimentation |
| **Version Control** | Git + GitHub | Source code management |

### Installation

```bash
# ML dependencies
pip install pandas numpy scikit-learn xgboost statsmodels joblib openpyxl

# DL dependencies
pip install tensorflow keras

# Visualization & Dashboard
pip install matplotlib seaborn plotly folium geopandas streamlit streamlit-folium

# Data fetching
pip install requests

# Explainability
pip install shap
```

---

## 7. Data Sources & Collection

### Primary Sources

| # | Source | Data Type | URL | Format |
|---|--------|-----------|-----|--------|
| 1 | **India-WRIS** | Groundwater well levels (quarterly, mbgl) | https://indiawris.gov.in/wris/#/groundWater | CSV/API |
| 2 | **CHIRPS** | Daily gridded rainfall data (0.05° resolution) | https://www.chc.ucsb.edu/data/chirps | NetCDF/TIFF |
| 3 | **NASA POWER** | Solar radiation, temperature, humidity, ET | https://power.larc.nasa.gov/ | JSON API |
| 4 | **Open-Meteo** | Historical weather (temp, humidity, wind) | https://open-meteo.com/ | JSON API |
| 5 | **GSDA Maharashtra** | State-level well monitoring reports | https://gsda.maharashtra.gov.in/ | PDF/CSV |
| 6 | **Census India** | Village population, irrigation area | https://censusindia.gov.in/ | CSV |

### Data Variables Needed

```
Target Variable:
  - groundwater_depth_mbgl (meters below ground level)

Features:
  - rainfall_mm (monthly cumulative)
  - rainfall_lag_1m, rainfall_lag_2m, rainfall_lag_3m
  - temperature_avg_celsius
  - humidity_percent
  - soil_moisture_index
  - evapotranspiration_mm
  - latitude, longitude
  - district_code, taluka_code
  - month, season (Kharif/Rabi/Summer)
  - well_type (dug_well / borewell)
  - previous_quarter_depth
```

---

## 8. Step-by-Step Implementation

### Phase 1: Data Collection & EDA (Weeks 1–3)

#### Week 1: Data Acquisition

```python
# Step 1.1: Fetch Groundwater Data from India-WRIS
import pandas as pd
import requests

# Download well data for Vidarbha districts
vidarbha_districts = [
    'Nagpur', 'Wardha', 'Chandrapur', 'Gadchiroli', 'Gondia',
    'Bhandara', 'Amravati', 'Akola', 'Yavatmal', 'Buldhana', 'Washim'
]

# Manual download from India-WRIS portal or use API
# Save as: data/raw/groundwater_vidarbha_2010_2025.csv

# Step 1.2: Fetch Rainfall Data from Open-Meteo (Free API)
def fetch_rainfall(lat, lon, start_date, end_date):
    url = f"https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "precipitation_sum,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean",
        "timezone": "Asia/Kolkata"
    }
    response = requests.get(url, params=params)
    return pd.DataFrame(response.json()['daily'])

# Example: Fetch for Yavatmal
rainfall_df = fetch_rainfall(20.3888, 78.1307, "2010-01-01", "2025-12-31")
rainfall_df.to_csv("data/raw/rainfall_yavatmal.csv", index=False)

# Step 1.3: Fetch NASA POWER data
def fetch_nasa_power(lat, lon, start_year, end_year):
    url = f"https://power.larc.nasa.gov/api/temporal/monthly/point"
    params = {
        "parameters": "T2M,RH2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": f"{start_year}01",
        "end": f"{end_year}12",
        "format": "JSON"
    }
    response = requests.get(url, params=params)
    return response.json()
```

#### Week 2: Data Cleaning

```python
# Step 1.4: Clean and merge datasets
import numpy as np

def clean_groundwater_data(filepath):
    df = pd.read_csv(filepath)
    
    # Standardize column names
    df.columns = df.columns.str.lower().str.replace(' ', '_')
    
    # Handle missing values
    # For groundwater depth: Use forward-fill within same well
    df['depth_mbgl'] = df.groupby('well_id')['depth_mbgl'].transform(
        lambda x: x.fillna(method='ffill').fillna(method='bfill')
    )
    
    # Remove outliers (depth > 50m or negative)
    df = df[(df['depth_mbgl'] > 0) & (df['depth_mbgl'] < 50)]
    
    # Parse dates
    df['date'] = pd.to_datetime(df['date'])
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    df['quarter'] = df['date'].dt.quarter
    
    # Add season
    df['season'] = df['month'].map({
        1: 'Winter', 2: 'Winter', 3: 'Summer',
        4: 'Summer', 5: 'Summer', 6: 'Monsoon',
        7: 'Monsoon', 8: 'Monsoon', 9: 'Monsoon',
        10: 'Post-Monsoon', 11: 'Post-Monsoon', 12: 'Winter'
    })
    
    return df

gw_clean = clean_groundwater_data("data/raw/groundwater_vidarbha_2010_2025.csv")
gw_clean.to_csv("data/processed/groundwater_clean.csv", index=False)
print(f"Records: {len(gw_clean)}, Wells: {gw_clean['well_id'].nunique()}")
```

#### Week 3: Exploratory Data Analysis (EDA)

```python
# Step 1.5: EDA Visualizations
import matplotlib.pyplot as plt
import seaborn as sns

# 1. District-wise average depth
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Plot 1: Average depth by district
district_avg = gw_clean.groupby('district')['depth_mbgl'].mean().sort_values()
district_avg.plot(kind='barh', ax=axes[0,0], color='steelblue')
axes[0,0].set_title('Avg. Groundwater Depth by District')
axes[0,0].set_xlabel('Depth (mbgl)')

# Plot 2: Monthly trend across years
monthly_trend = gw_clean.groupby(['year', 'month'])['depth_mbgl'].mean().reset_index()
pivot = monthly_trend.pivot(index='month', columns='year', values='depth_mbgl')
pivot.plot(ax=axes[0,1], legend=False, alpha=0.5)
axes[0,1].set_title('Monthly Depth Trend (All Years Overlaid)')

# Plot 3: Seasonal distribution
sns.boxplot(data=gw_clean, x='season', y='depth_mbgl', ax=axes[1,0], 
            order=['Monsoon', 'Post-Monsoon', 'Winter', 'Summer'])
axes[1,0].set_title('Seasonal Groundwater Depth Distribution')

# Plot 4: Year-over-year decline
yearly_avg = gw_clean.groupby('year')['depth_mbgl'].mean()
yearly_avg.plot(kind='line', marker='o', ax=axes[1,1], color='crimson')
axes[1,1].set_title('Year-over-Year Depletion Trend')
axes[1,1].set_ylabel('Avg Depth (mbgl)')

plt.tight_layout()
plt.savefig("outputs/eda_summary.png", dpi=150)
plt.show()

# 2. Correlation heatmap
corr_cols = ['depth_mbgl', 'rainfall_mm', 'temperature_avg', 'humidity', 'soil_moisture']
sns.heatmap(gw_clean[corr_cols].corr(), annot=True, cmap='RdYlBu_r', center=0)
plt.title('Feature Correlation Matrix')
plt.savefig("outputs/correlation_matrix.png", dpi=150)
plt.show()
```

---

### Phase 2: Feature Engineering (Weeks 4–6)

```python
# Step 2.1: Create Lag Features (THE KEY INNOVATION)
def create_lag_features(df, target_col='depth_mbgl', group_col='well_id'):
    """
    Creates temporal lag features to capture the delayed effect
    of rainfall on groundwater recharge.
    """
    df = df.sort_values([group_col, 'date'])
    
    # Rainfall lag features (1, 2, 3 month lags)
    for lag in [1, 2, 3]:
        df[f'rainfall_lag_{lag}m'] = df.groupby(group_col)['rainfall_mm'].shift(lag)
    
    # Rolling average rainfall (3-month and 6-month windows)
    df['rainfall_rolling_3m'] = df.groupby(group_col)['rainfall_mm'].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )
    df['rainfall_rolling_6m'] = df.groupby(group_col)['rainfall_mm'].transform(
        lambda x: x.rolling(6, min_periods=1).mean()
    )
    
    # Previous quarter groundwater depth
    df['depth_lag_1q'] = df.groupby(group_col)[target_col].shift(1)
    df['depth_lag_2q'] = df.groupby(group_col)[target_col].shift(2)
    
    # Rate of change (how fast is depth changing)
    df['depth_change_rate'] = df.groupby(group_col)[target_col].diff()
    
    # Cumulative rainfall deficit from long-term average
    long_term_avg = df.groupby([group_col, 'month'])['rainfall_mm'].transform('mean')
    df['rainfall_deficit'] = df['rainfall_mm'] - long_term_avg
    df['cumulative_deficit'] = df.groupby(group_col)['rainfall_deficit'].cumsum()
    
    # Temperature-based features
    df['temp_rainfall_ratio'] = df['temperature_avg'] / (df['rainfall_mm'] + 1)
    
    return df

# Step 2.2: Apply feature engineering
df_features = create_lag_features(gw_clean)

# Step 2.3: Encode categorical variables
from sklearn.preprocessing import LabelEncoder

le_district = LabelEncoder()
le_season = LabelEncoder()
df_features['district_encoded'] = le_district.fit_transform(df_features['district'])
df_features['season_encoded'] = le_season.fit_transform(df_features['season'])

# Step 2.4: Drop NaN rows created by lag features
df_features = df_features.dropna()

# Step 2.5: Define feature columns and target
FEATURE_COLS = [
    'rainfall_mm', 'rainfall_lag_1m', 'rainfall_lag_2m', 'rainfall_lag_3m',
    'rainfall_rolling_3m', 'rainfall_rolling_6m',
    'depth_lag_1q', 'depth_lag_2q', 'depth_change_rate',
    'rainfall_deficit', 'cumulative_deficit',
    'temperature_avg', 'humidity', 'temp_rainfall_ratio',
    'month', 'season_encoded', 'district_encoded',
    'latitude', 'longitude'
]
TARGET_COL = 'depth_mbgl'

print(f"Final dataset: {df_features.shape[0]} rows, {len(FEATURE_COLS)} features")
df_features.to_csv("data/processed/features_final.csv", index=False)
```

---

### Phase 3: ML Model Training (Weeks 7–8)

```python
# Step 3.1: Train-Test Split (Time-based, NOT random)
from sklearn.model_selection import TimeSeriesSplit

# Time-based split: Train on 2010-2023, Test on 2024-2025
train = df_features[df_features['year'] <= 2023]
test = df_features[df_features['year'] >= 2024]

X_train = train[FEATURE_COLS]
y_train = train[TARGET_COL]
X_test = test[FEATURE_COLS]
y_test = test[TARGET_COL]

print(f"Train: {X_train.shape}, Test: {X_test.shape}")

# Step 3.2: Model 1 — XGBoost Regressor (Primary Model)
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

xgb_model = XGBRegressor(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=1.0,
    random_state=42,
    n_jobs=-1
)

xgb_model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=50
)

y_pred_xgb = xgb_model.predict(X_test)
print(f"\nXGBoost Results:")
print(f"  R² Score:  {r2_score(y_test, y_pred_xgb):.4f}")
print(f"  RMSE:      {np.sqrt(mean_squared_error(y_test, y_pred_xgb)):.4f} m")
print(f"  MAE:       {mean_absolute_error(y_test, y_pred_xgb):.4f} m")

# Step 3.3: Model 2 — Random Forest Regressor (Ensemble Validation)
from sklearn.ensemble import RandomForestRegressor

rf_model = RandomForestRegressor(
    n_estimators=300,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

rf_model.fit(X_train, y_train)
y_pred_rf = rf_model.predict(X_test)
print(f"\nRandom Forest Results:")
print(f"  R² Score:  {r2_score(y_test, y_pred_rf):.4f}")
print(f"  RMSE:      {np.sqrt(mean_squared_error(y_test, y_pred_rf)):.4f} m")
print(f"  MAE:       {mean_absolute_error(y_test, y_pred_rf):.4f} m")

# Step 3.4: Model 3 — VAR (Baseline Time-Series Model)
from statsmodels.tsa.api import VAR

# Prepare multivariate time-series for VAR
# Use district-level aggregated monthly data
var_data = df_features.groupby(['year', 'month']).agg({
    'depth_mbgl': 'mean',
    'rainfall_mm': 'mean',
    'temperature_avg': 'mean'
}).reset_index()

var_model = VAR(var_data[['depth_mbgl', 'rainfall_mm', 'temperature_avg']])
var_results = var_model.fit(maxlags=6, ic='aic')
print(f"\nVAR Model Summary:")
print(f"  Optimal Lags: {var_results.k_ar}")
print(f"  AIC: {var_results.aic:.4f}")

# Step 3.5: Feature Importance Analysis
import matplotlib.pyplot as plt

feature_imp = pd.Series(
    xgb_model.feature_importances_, index=FEATURE_COLS
).sort_values(ascending=True)

plt.figure(figsize=(10, 8))
feature_imp.plot(kind='barh', color='teal')
plt.title('XGBoost Feature Importance')
plt.xlabel('Importance Score')
plt.tight_layout()
plt.savefig("outputs/feature_importance.png", dpi=150)
plt.show()

# Step 3.6: Hyperparameter Tuning with Cross-Validation
from sklearn.model_selection import GridSearchCV

param_grid = {
    'n_estimators': [300, 500, 700],
    'max_depth': [4, 6, 8],
    'learning_rate': [0.01, 0.05, 0.1],
    'subsample': [0.7, 0.8, 0.9]
}

tscv = TimeSeriesSplit(n_splits=5)

grid_search = GridSearchCV(
    XGBRegressor(random_state=42),
    param_grid,
    cv=tscv,
    scoring='r2',
    n_jobs=-1,
    verbose=1
)

grid_search.fit(X_train, y_train)
print(f"\nBest Parameters: {grid_search.best_params_}")
print(f"Best R² Score: {grid_search.best_score_:.4f}")

# Step 3.7: Save Best ML Model
import joblib
best_ml_model = grid_search.best_estimator_
joblib.dump(best_ml_model, "models/xgb_groundwater_predictor.pkl")
joblib.dump(rf_model, "models/rf_groundwater_predictor.pkl")
print("ML Models saved successfully!")
```

---

### Phase 4: DL Model Training (Weeks 9–11)

> **Note:** This phase requires Google Colab with GPU runtime (Runtime → Change runtime type → T4 GPU). All DL models are built with TensorFlow/Keras.

```python
# ============================================
# DEEP LEARNING MODELS FOR GROUNDWATER PREDICTION
# ============================================

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import (
    LSTM, GRU, Dense, Dropout, Conv1D, MaxPooling1D,
    Flatten, Input, Bidirectional, BatchNormalization,
    Attention, concatenate
)
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler
import numpy as np
import pandas as pd

print(f"TensorFlow version: {tf.__version__}")
print(f"GPU Available: {tf.config.list_physical_devices('GPU')}")
```

#### Step 4.1: Prepare Sequences for DL

```python
# DL models need data in 3D shape: (samples, timesteps, features)
# We create sliding window sequences from the time-series

def create_sequences(data, target, seq_length=12):
    """
    Creates sliding window sequences for LSTM/GRU/CNN input.
    
    Args:
        data: Feature DataFrame (scaled)
        target: Target array (scaled)
        seq_length: Number of past timesteps to use (12 = 12 months lookback)
    
    Returns:
        X: shape (n_samples, seq_length, n_features)
        y: shape (n_samples,)
    """
    X, y = [], []
    for i in range(seq_length, len(data)):
        X.append(data[i - seq_length:i])  # Past 12 months of features
        y.append(target[i])                # Predict next month depth
    return np.array(X), np.array(y)

# Scale features for DL (neural networks need normalized input)
feature_scaler = MinMaxScaler(feature_range=(0, 1))
target_scaler = MinMaxScaler(feature_range=(0, 1))

# Use same features as ML models
DL_FEATURES = FEATURE_COLS.copy()

# Scale training data
train_features_scaled = feature_scaler.fit_transform(train[DL_FEATURES])
train_target_scaled = target_scaler.fit_transform(train[[TARGET_COL]])

# Scale test data (using train scaler — no data leakage!)
test_features_scaled = feature_scaler.transform(test[DL_FEATURES])
test_target_scaled = target_scaler.transform(test[[TARGET_COL]])

# Create sequences (12-month lookback window)
SEQ_LENGTH = 12  # Use 12 months of history to predict next month

X_train_seq, y_train_seq = create_sequences(
    train_features_scaled, train_target_scaled.flatten(), SEQ_LENGTH
)
X_test_seq, y_test_seq = create_sequences(
    test_features_scaled, test_target_scaled.flatten(), SEQ_LENGTH
)

print(f"DL Training shape: X={X_train_seq.shape}, y={y_train_seq.shape}")
print(f"DL Testing shape:  X={X_test_seq.shape}, y={y_test_seq.shape}")
print(f"Sequence: {SEQ_LENGTH} months lookback → 1 month prediction")
```

#### Step 4.2: Model 4 — LSTM (Long Short-Term Memory)

```python
# LSTM excels at learning long-range temporal dependencies
# Perfect for capturing the 3-month rainfall-to-groundwater lag

def build_lstm_model(seq_length, n_features):
    model = Sequential([
        # First LSTM layer with return sequences for stacking
        LSTM(128, return_sequences=True, 
             input_shape=(seq_length, n_features)),
        Dropout(0.3),
        BatchNormalization(),
        
        # Second LSTM layer
        LSTM(64, return_sequences=False),
        Dropout(0.3),
        BatchNormalization(),
        
        # Dense layers for regression
        Dense(32, activation='relu'),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1, activation='linear')  # Regression output
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    return model

# Build and train LSTM
lstm_model = build_lstm_model(SEQ_LENGTH, len(DL_FEATURES))
lstm_model.summary()

# Callbacks to prevent overfitting
callbacks = [
    EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6),
    ModelCheckpoint('models/lstm_best.keras', monitor='val_loss', save_best_only=True)
]

# Train LSTM
lstm_history = lstm_model.fit(
    X_train_seq, y_train_seq,
    epochs=100,
    batch_size=32,
    validation_split=0.15,
    callbacks=callbacks,
    verbose=1
)

# Evaluate LSTM
y_pred_lstm_scaled = lstm_model.predict(X_test_seq)
y_pred_lstm = target_scaler.inverse_transform(y_pred_lstm_scaled).flatten()
y_test_actual = target_scaler.inverse_transform(y_test_seq.reshape(-1, 1)).flatten()

from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
print(f"\nLSTM Results:")
print(f"  R² Score:  {r2_score(y_test_actual, y_pred_lstm):.4f}")
print(f"  RMSE:      {np.sqrt(mean_squared_error(y_test_actual, y_pred_lstm)):.4f} m")
print(f"  MAE:       {mean_absolute_error(y_test_actual, y_pred_lstm):.4f} m")
```

#### Step 4.3: Model 5 — GRU (Gated Recurrent Unit)

```python
# GRU is a lighter alternative to LSTM — fewer parameters, faster training
# Often performs comparably to LSTM on smaller datasets

def build_gru_model(seq_length, n_features):
    model = Sequential([
        # Bidirectional GRU — reads sequence forward AND backward
        Bidirectional(GRU(96, return_sequences=True), 
                      input_shape=(seq_length, n_features)),
        Dropout(0.3),
        BatchNormalization(),
        
        GRU(48, return_sequences=False),
        Dropout(0.3),
        BatchNormalization(),
        
        Dense(32, activation='relu'),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1, activation='linear')
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    return model

# Build and train GRU
gru_model = build_gru_model(SEQ_LENGTH, len(DL_FEATURES))
gru_model.summary()

gru_callbacks = [
    EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6),
    ModelCheckpoint('models/gru_best.keras', monitor='val_loss', save_best_only=True)
]

gru_history = gru_model.fit(
    X_train_seq, y_train_seq,
    epochs=100,
    batch_size=32,
    validation_split=0.15,
    callbacks=gru_callbacks,
    verbose=1
)

# Evaluate GRU
y_pred_gru_scaled = gru_model.predict(X_test_seq)
y_pred_gru = target_scaler.inverse_transform(y_pred_gru_scaled).flatten()

print(f"\nGRU Results:")
print(f"  R² Score:  {r2_score(y_test_actual, y_pred_gru):.4f}")
print(f"  RMSE:      {np.sqrt(mean_squared_error(y_test_actual, y_pred_gru)):.4f} m")
print(f"  MAE:       {mean_absolute_error(y_test_actual, y_pred_gru):.4f} m")
```

#### Step 4.4: Model 6 — 1D-CNN (Temporal Convolution)

```python
# 1D-CNN treats the time-series as a "signal" and uses convolution filters
# to detect local temporal patterns (like sudden rainfall drops)

def build_cnn_model(seq_length, n_features):
    model = Sequential([
        # First Conv block — detects short-range patterns
        Conv1D(filters=128, kernel_size=3, activation='relu',
               input_shape=(seq_length, n_features), padding='same'),
        BatchNormalization(),
        MaxPooling1D(pool_size=2),
        Dropout(0.3),
        
        # Second Conv block — detects medium-range patterns
        Conv1D(filters=64, kernel_size=3, activation='relu', padding='same'),
        BatchNormalization(),
        MaxPooling1D(pool_size=2),
        Dropout(0.3),
        
        # Flatten and Dense layers
        Flatten(),
        Dense(64, activation='relu'),
        Dropout(0.3),
        Dense(32, activation='relu'),
        Dense(1, activation='linear')
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    return model

# Build and train 1D-CNN
cnn_model = build_cnn_model(SEQ_LENGTH, len(DL_FEATURES))
cnn_model.summary()

cnn_callbacks = [
    EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6),
    ModelCheckpoint('models/cnn_best.keras', monitor='val_loss', save_best_only=True)
]

cnn_history = cnn_model.fit(
    X_train_seq, y_train_seq,
    epochs=100,
    batch_size=32,
    validation_split=0.15,
    callbacks=cnn_callbacks,
    verbose=1
)

# Evaluate 1D-CNN
y_pred_cnn_scaled = cnn_model.predict(X_test_seq)
y_pred_cnn = target_scaler.inverse_transform(y_pred_cnn_scaled).flatten()

print(f"\n1D-CNN Results:")
print(f"  R² Score:  {r2_score(y_test_actual, y_pred_cnn):.4f}")
print(f"  RMSE:      {np.sqrt(mean_squared_error(y_test_actual, y_pred_cnn)):.4f} m")
print(f"  MAE:       {mean_absolute_error(y_test_actual, y_pred_cnn):.4f} m")
```

#### Step 4.5: Hybrid CNN-LSTM Model (Advanced)

```python
# Combines CNN's pattern detection with LSTM's memory
# CNN extracts local features → LSTM learns temporal dependencies

def build_cnn_lstm_model(seq_length, n_features):
    inputs = Input(shape=(seq_length, n_features))
    
    # CNN feature extraction
    x = Conv1D(64, kernel_size=3, activation='relu', padding='same')(inputs)
    x = BatchNormalization()(x)
    x = MaxPooling1D(pool_size=2)(x)
    x = Dropout(0.2)(x)
    
    # LSTM temporal learning
    x = LSTM(64, return_sequences=False)(x)
    x = Dropout(0.3)(x)
    x = BatchNormalization()(x)
    
    # Dense output
    x = Dense(32, activation='relu')(x)
    x = Dense(16, activation='relu')(x)
    outputs = Dense(1, activation='linear')(x)
    
    model = Model(inputs=inputs, outputs=outputs)
    model.compile(optimizer=Adam(learning_rate=0.001), loss='mse', metrics=['mae'])
    return model

cnn_lstm_model = build_cnn_lstm_model(SEQ_LENGTH, len(DL_FEATURES))
cnn_lstm_model.summary()

cnn_lstm_history = cnn_lstm_model.fit(
    X_train_seq, y_train_seq,
    epochs=100,
    batch_size=32,
    validation_split=0.15,
    callbacks=[
        EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True),
        ModelCheckpoint('models/cnn_lstm_best.keras', monitor='val_loss', save_best_only=True)
    ],
    verbose=1
)

y_pred_hybrid_scaled = cnn_lstm_model.predict(X_test_seq)
y_pred_hybrid = target_scaler.inverse_transform(y_pred_hybrid_scaled).flatten()

print(f"\nCNN-LSTM Hybrid Results:")
print(f"  R² Score:  {r2_score(y_test_actual, y_pred_hybrid):.4f}")
print(f"  RMSE:      {np.sqrt(mean_squared_error(y_test_actual, y_pred_hybrid)):.4f} m")
print(f"  MAE:       {mean_absolute_error(y_test_actual, y_pred_hybrid):.4f} m")
```

#### Step 4.6: DL Training Visualization

```python
# Plot training curves for all DL models
import matplotlib.pyplot as plt

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

models_history = {
    'LSTM': lstm_history,
    'GRU': gru_history, 
    '1D-CNN': cnn_history,
    'CNN-LSTM': cnn_lstm_history
}

for ax, (name, history) in zip(axes.flatten(), models_history.items()):
    ax.plot(history.history['loss'], label='Train Loss', color='blue')
    ax.plot(history.history['val_loss'], label='Val Loss', color='red')
    ax.set_title(f'{name} — Training vs Validation Loss')
    ax.set_xlabel('Epoch')
    ax.set_ylabel('MSE Loss')
    ax.legend()
    ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig("outputs/dl_training_curves.png", dpi=150)
plt.show()
```

#### Step 4.7: ML + DL Ensemble (Final Model)

```python
# Combine ML and DL predictions using weighted average
# Weights can be tuned based on individual model performance

def ensemble_predict(ml_pred, lstm_pred, gru_pred, cnn_pred, hybrid_pred,
                     weights=None):
    """
    Weighted ensemble of ML + DL predictions.
    Default weights based on typical performance ordering.
    """
    if weights is None:
        # Default weights: XGBoost=0.30, LSTM=0.25, Hybrid=0.20, GRU=0.15, CNN=0.10
        weights = [0.30, 0.25, 0.15, 0.10, 0.20]
    
    preds = np.column_stack([ml_pred, lstm_pred, gru_pred, cnn_pred, hybrid_pred])
    ensemble = np.average(preds, axis=1, weights=weights)
    return ensemble

# Note: ML predictions need to be aligned with DL predictions (shorter due to seq_length)
y_pred_ml_aligned = y_pred_xgb[-len(y_pred_lstm):]  # Align lengths
y_test_aligned = y_test.values[-len(y_pred_lstm):]   # Align test set

y_pred_ensemble = ensemble_predict(
    y_pred_ml_aligned, y_pred_lstm, y_pred_gru, y_pred_cnn, y_pred_hybrid
)

print(f"\n{'='*50}")
print(f"ENSEMBLE (ML + DL) Results:")
print(f"  R² Score:  {r2_score(y_test_aligned, y_pred_ensemble):.4f}")
print(f"  RMSE:      {np.sqrt(mean_squared_error(y_test_aligned, y_pred_ensemble)):.4f} m")
print(f"  MAE:       {mean_absolute_error(y_test_aligned, y_pred_ensemble):.4f} m")
print(f"{'='*50}")

# Save ensemble weights
import json
ensemble_config = {
    'weights': {'xgboost': 0.30, 'lstm': 0.25, 'gru': 0.15, 'cnn': 0.10, 'cnn_lstm': 0.20},
    'seq_length': SEQ_LENGTH,
    'features': DL_FEATURES
}
with open('models/ensemble_config.json', 'w') as f:
    json.dump(ensemble_config, f, indent=2)

print("Ensemble config saved!")
```

#### Step 4.8: Complete Model Comparison

```python
# Compare ALL models side by side
results = pd.DataFrame({
    'Model': ['XGBoost (ML)', 'Random Forest (ML)', 'VAR (ML)',
              'LSTM (DL)', 'GRU (DL)', '1D-CNN (DL)', 'CNN-LSTM (DL)',
              'Ensemble (ML+DL)'],
    'Type': ['ML', 'ML', 'ML', 'DL', 'DL', 'DL', 'DL', 'Hybrid'],
    'R²': [
        r2_score(y_test, y_pred_xgb),
        r2_score(y_test, y_pred_rf),
        None,  # VAR evaluated separately
        r2_score(y_test_actual, y_pred_lstm),
        r2_score(y_test_actual, y_pred_gru),
        r2_score(y_test_actual, y_pred_cnn),
        r2_score(y_test_actual, y_pred_hybrid),
        r2_score(y_test_aligned, y_pred_ensemble)
    ],
    'RMSE': [
        np.sqrt(mean_squared_error(y_test, y_pred_xgb)),
        np.sqrt(mean_squared_error(y_test, y_pred_rf)),
        None,
        np.sqrt(mean_squared_error(y_test_actual, y_pred_lstm)),
        np.sqrt(mean_squared_error(y_test_actual, y_pred_gru)),
        np.sqrt(mean_squared_error(y_test_actual, y_pred_cnn)),
        np.sqrt(mean_squared_error(y_test_actual, y_pred_hybrid)),
        np.sqrt(mean_squared_error(y_test_aligned, y_pred_ensemble))
    ]
})

print("\n" + "="*60)
print("        COMPLETE MODEL COMPARISON (ML + DL)")
print("="*60)
print(results.to_string(index=False))
results.to_csv("outputs/model_comparison.csv", index=False)

# Visualization
fig, axes = plt.subplots(1, 2, figsize=(14, 6))
colors = ['#2196F3', '#2196F3', '#2196F3', '#FF5722', '#FF5722', '#FF5722', '#FF5722', '#4CAF50']

results_clean = results.dropna()
results_clean.plot(x='Model', y='R²', kind='barh', ax=axes[0], color=colors[:len(results_clean)], legend=False)
axes[0].set_title('R² Score Comparison (Higher = Better)')
axes[0].set_xlabel('R² Score')

results_clean.plot(x='Model', y='RMSE', kind='barh', ax=axes[1], color=colors[:len(results_clean)], legend=False)
axes[1].set_title('RMSE Comparison (Lower = Better)')
axes[1].set_xlabel('RMSE (meters)')

plt.tight_layout()
plt.savefig("outputs/ml_vs_dl_comparison.png", dpi=150)
plt.show()
```

---

### Phase 5: Dashboard & Visualization (Weeks 12–14)

```python
# Step 4.1: Streamlit Dashboard (app.py)
# Save this as: app.py

import streamlit as st
import pandas as pd
import numpy as np
import joblib
import folium
from streamlit_folium import st_folium
import plotly.express as px
import plotly.graph_objects as go

# --- Page Config ---
st.set_page_config(
    page_title="Groundwater Crisis Predictor",
    page_icon="💧",
    layout="wide"
)

st.title("💧 ML + DL Groundwater Crisis Predictor")
st.markdown("**Vidarbha Region | 60-90 Day Advance Warning System | ML & Deep Learning Ensemble**")

# --- Load Models & Data ---
@st.cache_resource
def load_models():
    ml_model = joblib.load("models/xgb_groundwater_predictor.pkl")
    lstm_model = keras.models.load_model("models/lstm_best.keras")
    return ml_model, lstm_model

@st.cache_data
def load_data():
    return pd.read_csv("data/processed/features_final.csv")

ml_model, lstm_model = load_models()
data = load_data()

# --- Sidebar Filters ---
st.sidebar.header("🔧 Filters")
selected_district = st.sidebar.selectbox("Select District", data['district'].unique())
prediction_months = st.sidebar.slider("Forecast Horizon (Months)", 1, 3, 3)

# --- District Overview ---
col1, col2, col3, col4 = st.columns(4)
district_data = data[data['district'] == selected_district]

with col1:
    st.metric("Current Avg Depth", f"{district_data['depth_mbgl'].iloc[-1]:.1f} m")
with col2:
    change = district_data['depth_change_rate'].iloc[-1]
    st.metric("Monthly Change", f"{change:+.2f} m", delta_color="inverse")
with col3:
    st.metric("Wells Monitored", f"{district_data['well_id'].nunique()}")
with col4:
    risk = "🔴 CRITICAL" if district_data['depth_mbgl'].iloc[-1] > 12 else "🟢 SAFE"
    st.metric("Status", risk)

# --- Prediction Map ---
st.subheader("🗺️ Village-Level Risk Map")
m = folium.Map(location=[20.5, 78.5], zoom_start=8)

# --- Model Selector ---
model_choice = st.sidebar.radio("Select Model", ["XGBoost (ML)", "LSTM (DL)", "Ensemble (ML+DL)"])

for _, row in district_data.iterrows():
    # Predict future depth using selected model
    features = row[FEATURE_COLS].values.reshape(1, -1)
    if model_choice == "XGBoost (ML)":
        predicted_depth = ml_model.predict(features)[0]
    elif model_choice == "LSTM (DL)":
        # LSTM needs sequence input — use last 12 months
        predicted_depth = ml_model.predict(features)[0]  # Fallback for single row
    else:
        # Ensemble: weighted average
        ml_pred = ml_model.predict(features)[0]
        predicted_depth = ml_pred  # Simplified for dashboard
    
    # Color by risk level
    if predicted_depth > 15:
        color = 'red'
        risk_label = 'Critical'
    elif predicted_depth > 10:
        color = 'orange'
        risk_label = 'Warning'
    else:
        color = 'green'
        risk_label = 'Safe'
    
    folium.CircleMarker(
        location=[row['latitude'], row['longitude']],
        radius=6,
        color=color,
        fill=True,
        popup=f"Predicted: {predicted_depth:.1f}m | Risk: {risk_label}"
    ).add_to(m)

st_folium(m, width=700, height=500)

# --- Time Series Chart ---
st.subheader("📈 Historical Trend & Forecast")
fig = go.Figure()
fig.add_trace(go.Scatter(
    x=district_data['date'], y=district_data['depth_mbgl'],
    mode='lines', name='Actual Depth', line=dict(color='blue')
))
fig.update_layout(yaxis_title="Depth (mbgl)", yaxis_autorange='reversed')
st.plotly_chart(fig, use_container_width=True)
```

#### Run the Dashboard

```bash
streamlit run app.py
```

---

### Phase 6: Testing & Validation (Weeks 15–16)

```python
# Step 5.1: Walk-Forward Validation (Time-Series Specific)
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5)
r2_scores = []
rmse_scores = []

for fold, (train_idx, test_idx) in enumerate(tscv.split(X_train)):
    X_fold_train, X_fold_test = X_train.iloc[train_idx], X_train.iloc[test_idx]
    y_fold_train, y_fold_test = y_train.iloc[train_idx], y_train.iloc[test_idx]
    
    model_fold = XGBRegressor(**grid_search.best_params_, random_state=42)
    model_fold.fit(X_fold_train, y_fold_train)
    y_fold_pred = model_fold.predict(X_fold_test)
    
    r2 = r2_score(y_fold_test, y_fold_pred)
    rmse = np.sqrt(mean_squared_error(y_fold_test, y_fold_pred))
    
    r2_scores.append(r2)
    rmse_scores.append(rmse)
    print(f"Fold {fold+1}: R²={r2:.4f}, RMSE={rmse:.4f}m")

print(f"\nAverage R²: {np.mean(r2_scores):.4f} ± {np.std(r2_scores):.4f}")
print(f"Average RMSE: {np.mean(rmse_scores):.4f} ± {np.std(rmse_scores):.4f}m")

# Step 5.2: SHAP Explainability (Why does the model predict this?)
import shap

explainer = shap.TreeExplainer(best_model)
shap_values = explainer.shap_values(X_test.sample(500, random_state=42))

plt.figure(figsize=(12, 8))
shap.summary_plot(shap_values, X_test.sample(500, random_state=42), 
                  feature_names=FEATURE_COLS, show=False)
plt.title("SHAP Feature Impact on Groundwater Prediction")
plt.tight_layout()
plt.savefig("outputs/shap_analysis.png", dpi=150)
plt.show()

# Step 5.3: Residual Analysis
residuals = y_test - y_pred_xgb

fig, axes = plt.subplots(1, 3, figsize=(15, 5))

# Residual distribution
axes[0].hist(residuals, bins=30, color='teal', edgecolor='white')
axes[0].set_title('Residual Distribution')
axes[0].set_xlabel('Residual (m)')

# Predicted vs Actual
axes[1].scatter(y_test, y_pred_xgb, alpha=0.3, s=10, color='navy')
axes[1].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
             'r--', lw=2, label='Perfect Prediction')
axes[1].set_xlabel('Actual Depth')
axes[1].set_ylabel('Predicted Depth')
axes[1].set_title('Actual vs Predicted')
axes[1].legend()

# Residuals vs Predicted
axes[2].scatter(y_pred_xgb, residuals, alpha=0.3, s=10, color='crimson')
axes[2].axhline(y=0, color='black', linestyle='--')
axes[2].set_xlabel('Predicted Depth')
axes[2].set_ylabel('Residual')
axes[2].set_title('Residuals vs Predicted')

plt.tight_layout()
plt.savefig("outputs/residual_analysis.png", dpi=150)
plt.show()

# Step 5.4: Generate Alert Report
def generate_alert_report(model, current_data, threshold_critical=15, threshold_warning=10):
    """Generate village-level alerts for next 3 months"""
    predictions = model.predict(current_data[FEATURE_COLS])
    current_data['predicted_depth'] = predictions
    
    current_data['alert_level'] = pd.cut(
        current_data['predicted_depth'],
        bins=[0, threshold_warning, threshold_critical, 50],
        labels=['SAFE', 'WARNING', 'CRITICAL']
    )
    
    critical = current_data[current_data['alert_level'] == 'CRITICAL']
    warning = current_data[current_data['alert_level'] == 'WARNING']
    
    print(f"=== GROUNDWATER ALERT REPORT ===")
    print(f"Critical Villages: {len(critical)}")
    print(f"Warning Villages:  {len(warning)}")
    print(f"Safe Villages:     {len(current_data) - len(critical) - len(warning)}")
    
    critical.to_csv("outputs/alert_critical_villages.csv", index=False)
    warning.to_csv("outputs/alert_warning_villages.csv", index=False)
    
    return current_data

report = generate_alert_report(best_model, test)
```

---

## 9. All Models Used (ML + DL)

### ML Models

| Model | Type | Strengths | Role in Project |
|-------|------|-----------|------------------|
| **XGBoost Regressor** | Gradient Boosted Trees | Handles non-linear relationships, missing values, feature importance | **Primary ML predictor** |
| **Random Forest** | Bagging Ensemble | Robust to overfitting, stable predictions | **ML ensemble validation** |
| **VAR (Vector Auto-Regression)** | Statistical Time-Series | Captures multivariate temporal dependencies | **Statistical baseline** |

### DL Models

| Model | Type | Strengths | Role in Project |
|-------|------|-----------|------------------|
| **LSTM** (2-layer) | Recurrent Neural Network | Learns long-range temporal dependencies (3-month lag) | **Primary DL predictor** |
| **Bidirectional GRU** | Recurrent Neural Network | Lighter than LSTM, reads sequences both directions | **Fast DL alternative** |
| **1D-CNN** | Convolutional Network | Detects local temporal patterns (sudden drops) | **Pattern detector** |
| **CNN-LSTM Hybrid** | Hybrid Architecture | CNN extracts features → LSTM learns sequence | **Advanced DL model** |

### Ensemble (Final)

| Component | Weight | Rationale |
|-----------|--------|-----------|
| XGBoost | 0.30 | Best on tabular features, highly interpretable |
| LSTM | 0.25 | Best at capturing 3-month lag sequence |
| CNN-LSTM | 0.20 | Best at detecting unusual patterns in sequence |
| GRU | 0.15 | Good generalization, fast inference |
| 1D-CNN | 0.10 | Catches short-term anomalies |

### ML vs DL Performance Characteristics

| Factor | ML Models | DL Models |
|--------|-----------|----------|
| Dataset Size | Works well with 10K–50K rows | Benefits from 50K+ rows |
| Feature Engineering | Required (manual lag features) | Can auto-learn features |
| Interpretability | SHAP values, feature importance | Attention weights, Grad-CAM |
| Compute | CPU only (Google Colab free) | GPU recommended (Colab T4 free) |
| Training Time | 1–5 minutes | 15–60 minutes |
| Overfitting Risk | Low (tree-based regularization) | Moderate (handled by Dropout + EarlyStopping) |
| Multi-step Forecast | Needs recursive prediction | Native sequence-to-sequence |

---

## 10. Evaluation Metrics

| Metric | ML Target | DL Target | Ensemble Target | Description |
|--------|-----------|-----------|-----------------|-------------|
| **R² Score** | > 0.85 | > 0.83 | > 0.88 | Proportion of variance explained |
| **RMSE** | < 0.5 m | < 0.55 m | < 0.45 m | Root Mean Square Error |
| **MAE** | < 0.4 m | < 0.45 m | < 0.35 m | Mean Absolute Error |
| **MAPE** | < 10% | < 12% | < 8% | Mean Absolute Percentage Error |

### Validation Strategy

- **Time-Series Split** (NOT random K-Fold): Train on past, test on future
- **Walk-Forward Validation**: 5-fold expanding window
- **Out-of-Sample Test**: Model trained on 2010–2023, tested on 2024–2025
- **DL Validation Split**: 15% of training data held out during training
- **EarlyStopping**: Prevents overfitting in DL models (patience=15 epochs)
- **Learning Rate Scheduling**: ReduceLROnPlateau for DL convergence

---

## 11. Folder Structure

```
Ground_Water_Detection/
│
├── data/
│   ├── raw/                          # Original downloaded data
│   │   ├── groundwater_vidarbha_2010_2025.csv
│   │   ├── rainfall_yavatmal.csv
│   │   └── nasa_power_data.json
│   │
│   └── processed/                    # Cleaned & engineered features
│       ├── groundwater_clean.csv
│       ├── features_final.csv
│       ├── train_sequences.npy       # DL training sequences
│       └── test_sequences.npy        # DL test sequences
│
├── notebooks/
│   ├── 01_data_collection.ipynb      # Data fetching scripts
│   ├── 02_eda.ipynb                  # Exploratory Data Analysis
│   ├── 03_feature_engineering.ipynb   # Lag features, encoding
│   ├── 04_ml_model_training.ipynb    # XGBoost, RF, VAR (ML)
│   ├── 05_dl_model_training.ipynb    # LSTM, GRU, 1D-CNN (DL)
│   ├── 06_ensemble.ipynb             # ML+DL ensemble combination
│   └── 07_evaluation.ipynb           # Metrics, SHAP, comparison
│
├── models/
│   ├── xgb_groundwater_predictor.pkl # Trained XGBoost (ML)
│   ├── rf_groundwater_predictor.pkl  # Trained Random Forest (ML)
│   ├── lstm_best.keras               # Trained LSTM (DL)
│   ├── gru_best.keras                # Trained GRU (DL)
│   ├── cnn_best.keras                # Trained 1D-CNN (DL)
│   ├── cnn_lstm_best.keras           # Trained CNN-LSTM Hybrid (DL)
│   ├── ensemble_config.json          # Ensemble weights config
│   ├── feature_scaler.pkl            # MinMaxScaler for DL features
│   └── target_scaler.pkl             # MinMaxScaler for DL target
│
├── outputs/
│   ├── eda_summary.png               # EDA charts
│   ├── feature_importance.png        # XGBoost feature importance
│   ├── shap_analysis.png             # SHAP explainability (ML)
│   ├── dl_training_curves.png        # LSTM/GRU/CNN loss plots
│   ├── ml_vs_dl_comparison.png       # Side-by-side model comparison
│   ├── residual_analysis.png         # Model diagnostics
│   ├── model_comparison.csv          # All model metrics table
│   ├── alert_critical_villages.csv   # Critical alert list
│   └── alert_warning_villages.csv    # Warning alert list
│
├── app.py                            # Streamlit dashboard (ML+DL)
├── v.html                            # Project proposal (visual)
├── PROJECT_GUIDE.md                  # This file
├── requirements.txt                  # Python dependencies
└── README.md                         # Quick start guide
```

---

## 12. How to Run

### Prerequisites

```bash
# Python 3.10+ required
python --version

# Clone / navigate to project
cd Ground_Water_Detection

# Install dependencies
pip install -r requirements.txt
```

### Step-by-Step Execution

```bash
# 1. Data Collection (run notebooks in order)
jupyter notebook notebooks/01_data_collection.ipynb

# 2. EDA
jupyter notebook notebooks/02_eda.ipynb

# 3. Feature Engineering
jupyter notebook notebooks/03_feature_engineering.ipynb

# 4. ML Model Training (CPU — runs on any machine)
jupyter notebook notebooks/04_ml_model_training.ipynb

# 5. DL Model Training (GPU recommended — use Colab)
jupyter notebook notebooks/05_dl_model_training.ipynb

# 6. Ensemble Combination
jupyter notebook notebooks/06_ensemble.ipynb

# 7. Evaluation & Comparison
jupyter notebook notebooks/07_evaluation.ipynb

# 8. Launch Dashboard
streamlit run app.py
```

### Using Google Colab (Zero Cost)

1. Upload notebooks to Google Drive
2. Open with Google Colab
3. **For DL notebooks**: Runtime → Change runtime type → **T4 GPU**
4. Mount Drive: `from google.colab import drive; drive.mount('/content/drive')`
5. Run cells sequentially
6. Download trained models (.pkl for ML, .keras for DL)

---

## 13. Expected Outcomes

### Deliverables

| # | Deliverable | Type | Format |
|---|------------|------|--------|
| 1 | Cleaned multi-source dataset (2010–2025) | Data | CSV |
| 2 | Trained ML models (XGBoost + RF) | ML | .pkl files |
| 3 | Trained DL models (LSTM + GRU + CNN + Hybrid) | DL | .keras files |
| 4 | ML+DL Ensemble configuration | Hybrid | JSON |
| 5 | Feature importance & SHAP analysis | ML Explainability | PNG charts |
| 6 | DL training curves & convergence plots | DL Analysis | PNG charts |
| 7 | ML vs DL comparison report | Analysis | CSV + PNG |
| 8 | Interactive Streamlit dashboard (model selector) | App | Web App |
| 9 | Village-level risk map (Folium) | Visualization | Interactive HTML |
| 10 | Alert report (Critical/Warning villages) | Output | CSV |
| 11 | Research paper / project report | Documentation | PDF |

### Impact Metrics

- **60–90 day** advance warning before groundwater crisis
- **>88% R²** ensemble prediction accuracy on test data
- **<0.45m RMSE** error margin (ensemble)
- **7 models compared** (3 ML + 4 DL) with full analysis
- Covers **11 districts**, **~2.5 lakh farmers**
- **₹0 cost** — fully reproducible on free tools (Colab GPU)

---

## 14. Limitations & Future Scope

### Current Limitations

1. **Data Granularity**: India-WRIS provides quarterly data; monthly would improve DL model accuracy
2. **Spatial Resolution**: Village-level predictions depend on well density in that area
3. **Regional Scope**: Trained only for Vidarbha; needs retraining/transfer learning for other regions
4. **Deep Aquifer Data**: Currently focuses on shallow-medium wells (0-150m); extending to 457m (1500 feet) requires additional deep borewell data from CGWB
5. **DL Data Volume**: DL models would benefit from more data points (currently limited by data source frequency)
6. **Sequence Limitation**: DL models use 12-month lookback; longer sequences could capture multi-year cycles
7. **GPS Interpolation Accuracy**: Predictions at locations >20km from training wells have lower accuracy

### Future Improvements

| Enhancement | Technology | Impact |
|-------------|-----------|--------|
| Real-time IoT sensors | Arduino + ESP32 | Live data feed for DL models |
| Satellite imagery integration | Sentinel-2 + CNN (2D) | Crop stress detection via image classification |
| Transformer model | TensorFlow Transformer | Attention-based long-range forecasting |
| Seq2Seq multi-step | LSTM Encoder-Decoder | Predict 3 months in single forward pass |
| Transfer Learning | Fine-tuning pretrained DL | Expand to other states without full retraining |
| **GPS-Based Mobile App** | **Flutter/React Native + GPS API** | **Users get predictions at their exact phone location** |
| **Deep Aquifer Monitoring (1500 ft)** | **CGWB deep well data integration** | **Extend predictions to deep borewells (457m depth)** |
| Government API integration | REST APIs | Automated tanker scheduling |
| Attention Visualization | Attention weights heatmap | Explain DL model decisions to officials |
| Kriging Interpolation | Geostatistics (PyKrige) | Better spatial predictions between wells |

---

## 15. References

1. **India-WRIS** — Water Resource Information System of India  
   https://indiawris.gov.in/wris/#/groundWater

2. **CHIRPS** — Climate Hazards Group InfraRed Precipitation with Station data  
   https://www.chc.ucsb.edu/data/chirps

3. **NASA POWER** — Prediction of Worldwide Energy Resources  
   https://power.larc.nasa.gov/

4. **GSDA Maharashtra** — Groundwater Surveys and Development Agency  
   https://gsda.maharashtra.gov.in/

5. **XGBoost Documentation**  
   https://xgboost.readthedocs.io/

6. **Scikit-learn Documentation**  
   https://scikit-learn.org/stable/

7. **Streamlit Documentation**  
   https://docs.streamlit.io/

8. **SHAP (SHapley Additive exPlanations)**  
   https://shap.readthedocs.io/

9. **Central Ground Water Board (CGWB) Reports**  
   http://cgwb.gov.in/

10. **Open-Meteo Free Weather API**  
    https://open-meteo.com/

11. **TensorFlow / Keras Documentation**  
    https://www.tensorflow.org/api_docs

12. **LSTM for Time Series (Hochreiter & Schmidhuber, 1997)**  
    https://www.bioinf.jku.at/publications/older/2604.pdf

13. **GRU (Cho et al., 2014)**  
    https://arxiv.org/abs/1406.1078

14. **1D-CNNs for Time Series Classification (Kiranyaz et al., 2021)**  
    https://arxiv.org/abs/1905.03554

---

> **Note:** This project uses **both Machine Learning and Deep Learning**.
> - **ML Models** (XGBoost, Random Forest, VAR): Classical supervised algorithms on engineered tabular features. Highly interpretable via SHAP.
> - **DL Models** (LSTM, GRU, 1D-CNN, CNN-LSTM): Neural networks that learn directly from time-series sequences. Trained on Google Colab free GPU.
> - **Ensemble**: Weighted combination of ML + DL for maximum accuracy.
> - This is NOT generative AI — no LLMs, no GPT, no image generation. All models are regression-based predictors.

---

*Last Updated: February 2026*  
*Project Duration: 16 Weeks*  
*Total Cost: ₹0 (Open Source + Google Colab Free GPU)*
