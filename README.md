# 🌍 AI-Based Groundwater Depth Prediction System

## A Hybrid Spatio-Temporal Multi-Engine Framework

------------------------------------------------------------------------

## 1️⃣ Project Overview

This project builds a hybrid groundwater depth prediction system
designed for:

-   Research publication
-   Real-world deployment
-   Intelligent decision routing
-   Location-based groundwater depth estimation

The system dynamically selects prediction strategies based on data
availability:

-   Historical data available → Temporal Engine
-   Nearby wells available → Spatial Reconstruction + Temporal Engine
-   No history available → Environmental Engine

------------------------------------------------------------------------

## 2️⃣ System Architecture Overview

User Input (Latitude, Longitude, Time) │ ▼ Decision Routing Layer │ ├──
Case A: Historical depth exists │ → Temporal Engine │ ├── Case B: Nearby
wells exist │ → KNN + IDW (Spatial Reconstruction) │ → Temporal Engine │
└── Case C: No history available → Environmental Engine

------------------------------------------------------------------------

## 3️⃣ Dataset Summary

-   Total rows: 83,850\
-   Target variable: depth_mbgl\
-   Total features: 25\
-   Monthly observations\
-   Spatial coordinates included

### Feature Groups

### A) Environmental Features

rainfall_mm, temperature_avg, humidity, evapotranspiration,
soil_moisture_index, rainfall_lag_1m, rainfall_lag_2m, rainfall_lag_3m,
rainfall_rolling_3m, rainfall_rolling_6m, rainfall_deficit,
cumulative_deficit, temp_rainfall_ratio, ndvi

### B) Spatial Features

latitude, longitude, elevation_m, slope_degree, soil_type_encoded,
district_encoded, season_encoded

### C) Temporal Depth Features

depth_lag_1q, depth_lag_2q, depth_change_rate

------------------------------------------------------------------------

## 4️⃣ Engine Details

### 🔵 Case A --- Temporal Engine

Feature Set: All 25 features (including lag features)

Models: - XGBoost (Primary) - Random Forest (Stability) - LSTM / GRU
(Deep temporal comparison)

Expected R²: 0.88 -- 0.95

------------------------------------------------------------------------

### 🔵 Case B --- Spatial Reconstruction + Temporal Engine

Step 1: KNN (BallTree) to find nearest wells\
Step 2: IDW interpolation to reconstruct lag features\
Step 3: Pass reconstructed features into Temporal Engine

Expected R²: 0.80 -- 0.88

------------------------------------------------------------------------

### 🔵 Case C --- Environmental Engine

Feature Set: Environmental + Spatial features (lag features removed)

Models: - XGBoost - Random Forest - LightGBM (Optional comparison)

Expected R²: 0.55 -- 0.72

------------------------------------------------------------------------

## 5️⃣ Ensemble Strategy

Final Prediction (Temporal Engine):

0.7 × XGBoost + 0.3 × Random Forest

------------------------------------------------------------------------

## 6️⃣ Training Workflow

1.  Load and preprocess dataset\
2.  Sort by latitude, longitude, month\
3.  Create lag features\
4.  Train Temporal Engine\
5.  Train Environmental Engine\
6.  Build Spatial Layer (KNN + IDW)\
7.  Integrate routing logic

------------------------------------------------------------------------

## 7️⃣ Deployment Flow

1.  User enters location and environmental variables\
2.  System checks data availability\
3.  Route to appropriate engine\
4.  Return predicted groundwater depth

------------------------------------------------------------------------

## 8️⃣ Research Contribution

-   Dynamic multi-engine routing framework\
-   Spatial reconstruction of temporal groundwater signals\
-   Comparative evaluation of tree-based and deep learning models\
-   Deployment-ready architecture

------------------------------------------------------------------------

## 9️⃣ Future Work

-   Graph Neural Networks for spatial modeling\
-   Satellite raster integration\
-   Uncertainty quantification\
-   Seasonal regime-specific modeling

------------------------------------------------------------------------

## 🔟 Status

✔ Dataset Prepared\
✔ Feature Engineering Completed\
⬜ Temporal Engine Training\
⬜ Environmental Engine Training\
⬜ Spatial Layer Integration\
⬜ API Deployment

------------------------------------------------------------------------

End of Document
