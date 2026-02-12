# 45-Day Project Plan — Groundwater Crisis Predictor

**Team:** Yogesh & Gaurav  
**Start Date:** February 13, 2026  
**End Date:** March 29, 2026  
**Project Type:** Industrial-Grade ML/DL + React Dashboard  
**Region:** Vidarbha, Maharashtra, India

---

## Work Distribution Philosophy

| Area | Yogesh (Y) | Gaurav (G) |
|------|-----------|-----------|
| **Data Collection** | Groundwater + Rainfall data | Weather + Soil + NASA data |
| **Feature Engineering** | Lag & Rolling features | Deficit & Stress features |
| **ML Models** | XGBoost + Random Forest | VAR + Ensemble logic |
| **DL Models** | LSTM + GRU | 1D-CNN + CNN-LSTM hybrid |
| **Backend API** | FastAPI setup + ML endpoints | GPS prediction + Live weather endpoints |
| **React Frontend** | Dashboard layout + Charts | Map integration + GPS feature |
| **Testing & Docs** | Model validation + Unit tests | Integration tests + Final documentation |

---

## Phase 1: Data Collection & Cleaning (Day 1–8)

### Day 1 — Project Setup (Both Together)

| Task | Yogesh | Gaurav |
|------|--------|--------|
| Morning | Create GitHub repo, set folder structure, initialize `README.md` | Set up Python virtual env, install all dependencies from `requirements.txt` |
| Afternoon | Create shared Google Drive for raw data files | Set up Google Colab notebook with GPU runtime for DL training later |
| Evening | Both jointly finalize the 22-column schema in a shared spreadsheet and agree on column names, data types, and file naming conventions |

**Folder Structure to Create:**
```
data/
├── raw/
│   ├── groundwater_vidarbha.csv
│   ├── weather_vidarbha.csv
│   ├── soil_nasa.csv
├── processed/
│   └── master_vidarbha.csv
├── final/
│   ├── train.csv
│   ├── val.csv
│   └── test.csv
saved_models/
├── xgboost_best.pkl
├── rf_best.pkl
├── lstm.h5
├── gru.h5
```

---

### Day 2–3 — Raw Data Download

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 2 Morning** | Register on India-WRIS portal, start downloading groundwater level data (CSV) for all 11 Vidarbha districts | Register on NASA POWER, write Python script to fetch `evapotranspiration`, `soil_moisture`, `humidity` via API for all 11 district centroids |
| **Day 2 Afternoon** | Write script to fetch CHIRPS rainfall data for Vidarbha region (2010–2025) | Write script to fetch Open-Meteo historical weather data (`temperature_avg`, `humidity`) for all 11 districts |
| **Day 3 Morning** | Clean groundwater CSV — standardize column names, parse dates, extract `well_id`, `lat`, `lon`, `depth_mbgl`, `district` | Clean NASA POWER + Open-Meteo API responses — parse JSON, convert to monthly CSV per district |
| **Day 3 Afternoon** | Save: `data/raw/groundwater_vidarbha.csv` | Save: `data/raw/weather_vidarbha.csv`, `data/raw/soil_nasa.csv` |

**Day 2–3 Deliverable:** 3–4 raw CSV files covering all data sources

---

### Day 4–5 — Data Merging & Cleaning

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 4** | Merge groundwater + rainfall data on `well_id` + `date` (or `lat/lon` + `month/year`) | Merge weather + soil data on `district` + `date` |
| **Day 5 Morning** | Handle missing values: forward-fill `depth_mbgl` within same well, interpolate rainfall gaps | Handle missing values: linear interpolation for temperature, drop rows with missing lat/lon |
| **Day 5 Afternoon** | Both jointly merge ALL datasets into single master CSV: `data/processed/master_vidarbha.csv`. Validate: check row count, null counts, date range coverage |

**Day 4–5 Deliverable:** Single merged clean CSV with columns: `date`, `well_id`, `district`, `latitude`, `longitude`, `depth_mbgl`, `rainfall_mm`, `temperature_avg`, `humidity`, `evapotranspiration`, `soil_moisture_index`

---

### Day 6–8 — EDA (Exploratory Data Analysis)

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 6** | District-wise average depth bar chart + Year-over-year depletion trend line chart | Seasonal boxplot (Monsoon vs Summer depth) + Monthly trend overlay (all years) |
| **Day 7** | Correlation heatmap (all raw features vs `depth_mbgl`) + Scatter plots (rainfall vs depth) | Time-series decomposition (trend, seasonal, residual) for top 5 wells + Rainfall distribution by district |
| **Day 8** | Outlier detection: flag `depth_mbgl < 0` or `> 500m`, `temperature < 10` or `> 50` — remove/cap | Missing data pattern visualization (heatmap of nulls per column per year). Both finalize clean dataset after removing outliers |

**Day 6–8 Deliverable:** EDA notebook with 10+ plots saved to `outputs/eda/`, cleaned dataset ready for feature engineering

---

## Phase 2: Feature Engineering (Day 9–14)

### Day 9–11 — Create All 22 Features

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 9** | Create **lag features**: `rainfall_lag_1m`, `rainfall_lag_2m`, `rainfall_lag_3m` using `shift()` per `well_id` | Create **rolling features**: `rainfall_rolling_3m`, `rainfall_rolling_6m` using `rolling().mean()` per `well_id` |
| **Day 10** | Create **groundwater lag features**: `depth_lag_1q`, `depth_lag_2q`, `depth_change_rate` using `shift()` and `diff()` | Create **stress features**: `rainfall_deficit` (deviation from long-term avg), `cumulative_deficit` (cumsum), `temp_rainfall_ratio` |
| **Day 11** | Create **temporal features**: `month` from date, `season_encoded` (0=Monsoon, 1=Post, 2=Winter, 3=Summer) | Create **geospatial features**: `district_encoded` via LabelEncoder, validate `latitude`/`longitude` ranges |

---

### Day 12–13 — Data Validation & Final Dataset

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 12** | Drop NaN rows created by lag/rolling operations. Verify final column count = 22 | Verify data types: float32 for continuous, int8 for encoded, float64 for lat/lon |
| **Day 13** | Perform time-based train-test split: Train (2010–2023), Validation (late 2023), Test (2024–2025) | Save splits: `data/final/train.csv`, `data/final/val.csv`, `data/final/test.csv`. Log row counts and date ranges |

---

### Day 14 — DL Data Preparation

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 14** | Create 3D sequences for DL: `(samples, 12 timesteps, 21 features)` using sliding window per well | Apply MinMaxScaler (0–1) normalization. Save scaler object with `joblib` for inverse transform during prediction |

**Phase 2 Deliverable:** Final 22-column dataset split into train/val/test + DL-ready 3D arrays + saved scaler

---

## Phase 3: ML Model Training (Day 15–21)

### Day 15–17 — Individual ML Models

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 15** | Train **XGBoost Regressor** with hyperparameter tuning (GridSearchCV: `n_estimators`, `max_depth`, `learning_rate`, `subsample`) | Train **VAR (Vector Auto-Regression)** as baseline time-series model using `statsmodels` |
| **Day 16** | Train **Random Forest Regressor** with tuning (`n_estimators`, `max_depth`, `min_samples_split`) | Build **ensemble logic** — weighted average function that combines any N model predictions |
| **Day 17** | Evaluate XGBoost + RF on test set: calculate R², RMSE, MAE, MAPE. Generate prediction vs actual plots | Evaluate VAR on test set. Create comparison table of all 3 ML models side by side |

---

### Day 18–19 — SHAP & Model Explainability

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 18** | Run SHAP analysis on XGBoost: generate summary plot, feature importance bar chart, dependence plots for top 5 features | Run SHAP on Random Forest. Compare feature rankings between XGBoost and RF |
| **Day 19** | Save best ML model with `joblib`: `saved_models/xgboost_best.pkl`, `saved_models/rf_best.pkl` | Save encoders (`LabelEncoder` for district, season) and feature column list as JSON config |

---

### Day 20–21 — Backend API Setup (FastAPI)

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 20** | Set up **FastAPI** project structure. Create `/predict` endpoint that loads saved XGBoost model and accepts 21 features as JSON input | Create `/health` endpoint + `/model-info` endpoint. Write utility functions for input validation and feature preprocessing |
| **Day 21** | Create `/predict/batch` endpoint for multiple predictions at once. Add error handling and input validation | Create `/api/districts` endpoint (returns list of 11 Vidarbha districts) + `/api/wells` endpoint (returns well locations for map). Test all endpoints with Postman/Thunder Client |

**Phase 3 Deliverable:** 3 trained ML models saved to disk + SHAP plots + working FastAPI with `/predict` endpoint

---

## Phase 4: DL Model Training (Day 22–28)

### Day 22–25 — Individual DL Models

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 22** | Build **LSTM model** (2-layer, 64→32 units, Dropout=0.2, Dense output). Compile with Adam optimizer, MSE loss | Build **1D-CNN model** (Conv1D 64 filters → Conv1D 32 → Flatten → Dense). Compile similarly |
| **Day 23** | Train LSTM on Colab GPU with EarlyStopping (patience=10) + ModelCheckpoint. Monitor val_loss | Train 1D-CNN on Colab GPU with same callbacks. Monitor val_loss |
| **Day 24** | Build **GRU model** (2-layer, 64→32 units). Train on Colab GPU | Build **CNN-LSTM hybrid** (Conv1D → LSTM → Dense). Train on Colab GPU |
| **Day 25** | Evaluate all DL models on test set: R², RMSE, MAE. Plot predictions vs actual for each model | Generate training history plots (loss curves) for all DL models. Compare convergence speed |

---

### Day 26–27 — Ensemble Model

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 26** | Both jointly build **ensemble model**: combine XGBoost + LSTM + GRU + 1D-CNN + CNN-LSTM predictions using weighted average. Initial weights: XGBoost=0.30, LSTM=0.25, CNN-LSTM=0.20, GRU=0.15, 1D-CNN=0.10 |
| **Day 27** | Optimize ensemble weights using validation set (try grid search over weight combinations). Calculate final ensemble metrics | Create **master comparison table** of ALL models (ML + DL + Ensemble). Pick best individual + confirm ensemble beats all |

---

### Day 28 — Save & Integrate DL Models

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 28** | Save all DL models: `saved_models/lstm.h5`, `gru.h5`. Convert to TFLite if needed for faster inference | Add `/predict/dl` endpoint to FastAPI (loads LSTM, runs prediction). Add `/predict/ensemble` endpoint. Update API docs |

**Phase 4 Deliverable:** 4 trained DL models + ensemble logic + all models accessible via FastAPI endpoints

---

## Phase 5: React Frontend Dashboard (Day 29–38)

### Day 29–30 — React Project Setup

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 29** | Initialize React app (Vite + React). Install: `react-router-dom`, `axios`, `recharts`, `tailwindcss` or Material UI | Install map libs: `react-leaflet`, `leaflet`, `react-toastify`. Set up folder structure: `components/`, `pages/`, `services/`, `hooks/` |
| **Day 30** | Create app layout: Navbar, Sidebar, Footer. Set up React Router with pages: Home, Dashboard, Predict, Map, About | Create `apiService.js` — Axios instance configured to hit FastAPI backend. Create all API call functions |

---

### Day 31–33 — Dashboard Page (Charts & Analytics)

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 31** | Build **Dashboard page** layout with grid cards: Total Wells, Average Depth, Critical Count, Safe Count (summary stats) | Build **District-wise bar chart** (avg depth per district) + **Year-over-year trend line chart** using `recharts` |
| **Day 32** | Build **Seasonal comparison chart** (boxplot or grouped bar: Monsoon vs Summer vs Winter depth) | Build **Model comparison chart** (R², RMSE of all 6 models displayed as grouped bar chart) |
| **Day 33** | Build **Feature importance chart** (horizontal bar chart from SHAP values) + **Prediction vs Actual scatter plot** | Build **Risk distribution pie chart** (% Safe / Warning / Critical / Extreme) + **Monthly heatmap** |

---

### Day 34–35 — Prediction Page

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 34** | Build **Manual Prediction Form**: input fields for district (dropdown), month, rainfall, temperature, humidity. Submit calls `/predict` API | Build **Result Display Card**: shows predicted depth (meters + feet), risk level with color badge (Green/Orange/Red/Purple), actionable advice text |
| **Day 35** | Add **model selector** dropdown (XGBoost / LSTM / Ensemble). Show prediction from selected model | Add **prediction history** table — stores past predictions in localStorage. Add CSV export button |

---

### Day 36–38 — Map Page & GPS Feature

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 36** | Build **Map page** with `react-leaflet`: render Vidarbha map centered at `[20.5, 78.5]`. Plot all well locations as circle markers colored by risk level | Build **GPS capture feature**: "Use My Location" button that calls `navigator.geolocation.getCurrentPosition()`. Display user's pin on map |
| **Day 37** | Add **well popup** on marker click: shows well ID, district, last known depth, risk status | Build **GPS prediction flow**: on capturing location → call `/predict/gps` API → display result card overlay on map with depth, risk, confidence, nearest well distance |
| **Day 38** | Add **district boundary overlay** on map using GeoJSON (from DataMeet). Color districts by average risk level | Add **click-to-predict**: user clicks anywhere on map → capture lat/lon → run prediction for that spot. Add **search bar** for village/district name |

**GPS Location Flow in React:**
```
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position;
    // Use the captured position for prediction
  },
  (error) => {
    console.error("Error getting GPS location:", error);
  }
);
```

---

## Phase 5 Deliverable:** Fully functional React dashboard with 4 pages (Home, Dashboard, Predict, Map) + GPS-based prediction + interactive charts

---

## Phase 6: Integration, Testing & Deployment (Day 39–45)

### Day 39–40 — Full Integration

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 39** | Connect all React pages to FastAPI backend. Test every API call end-to-end | Set up CORS in FastAPI. Handle loading states, error states, and empty states in all React components |
| **Day 40** | Add **responsive design** — test on mobile viewport (cards stack, map fullscreen) | Add **error boundaries** in React. Add **toast notifications** for success/failure |

---

### Day 41–42 — Testing & Validation

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 41** | Write **model validation tests**: verify R² > 0.85, RMSE < 0.5 on test set. Test ensemble outperforms individuals | Write **API integration tests**: test all endpoints with valid/invalid inputs. Test GPS prediction with known coordinates |
| **Day 42** | Test **edge cases**: prediction at boundary of Vidarbha, location with no wells within 50km, extreme values | Test **UI/UX**: GPS denied flow, slow network, form validation (empty fields, out-of-range values) |

---

### Day 43 — Documentation

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 43** | Write **model documentation**: architecture, hyperparams, training curves, final metrics, SHAP summary | Write **API documentation**: all endpoints with request/response examples. Write **user guide** for dashboard |

---

### Day 44 — Deployment

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 44** | Deploy **FastAPI backend** on Render / Railway / AWS EC2. Upload saved models, set env vars | Deploy **React frontend** on Vercel / Netlify. Point API base URL to deployed backend. Test live |

---

### Day 45 — Final Review & Presentation

| Task | Yogesh | Gaurav |
|------|--------|--------|
| **Day 45 Morning** | Both: Final end-to-end testing on deployed app — every feature, every page, GPS on real phone |
| **Day 45 Afternoon** | Both: Prepare project presentation slides — problem, architecture, results, live demo |
| **Day 45 Evening** | Both: Record demo video — full app walkthrough: dashboard → charts → predict → GPS on map |

**Phase 6 Deliverable:** Deployed app (live URLs) + docs + demo video

---

## Daily Summary Calendar

| Day | Date | Yogesh | Gaurav | Milestone |
|-----|------|--------|--------|-----------|
| 1 | Feb 13 | Repo + folder structure | Env setup + Colab | **Repo created** |
| 2 | Feb 14 | India-WRIS + CHIRPS download | NASA POWER + Open-Meteo scripts | — |
| 3 | Feb 15 | Clean GW + rainfall CSVs | Clean weather + soil CSVs | **Raw data ready** |
| 4 | Feb 16 | Merge GW + rainfall | Merge weather + soil | — |
| 5 | Feb 17 | Joint → master CSV | Joint → master CSV | **Master CSV ready** |
| 6 | Feb 18 | EDA: depth charts | EDA: seasonal, trends | — |
| 7 | Feb 19 | EDA: correlations | EDA: decomposition | — |
| 8 | Feb 20 | Outlier removal | Missing data patterns | **EDA complete** |
| 9 | Feb 21 | Rainfall lag features | Rainfall rolling features | — |
| 10 | Feb 22 | Depth lag features | Stress features | — |
| 11 | Feb 23 | Temporal encoding | Geospatial encoding | — |
| 12 | Feb 24 | Drop NaNs, validate | Verify data types | — |
| 13 | Feb 25 | Train/test split | Save final CSVs | — |
| 14 | Feb 26 | 3D sequences for DL | Normalize + save scaler | **Features ready** |
| 15 | Feb 27 | Train XGBoost | Train VAR | — |
| 16 | Feb 28 | Train Random Forest | Ensemble logic | — |
| 17 | Mar 1 | Evaluate XGBoost + RF | Evaluate VAR + table | — |
| 18 | Mar 2 | SHAP on XGBoost | SHAP on RF | — |
| 19 | Mar 3 | Save ML models | Save encoders + config | **ML done** |
| 20 | Mar 4 | FastAPI + /predict | /health + validation | — |
| 21 | Mar 5 | /predict/batch | /districts + /wells | **API v1 ready** |
| 22 | Mar 6 | Build LSTM | Build 1D-CNN | — |
| 23 | Mar 7 | Train LSTM (GPU) | Train CNN (GPU) | — |
| 24 | Mar 8 | Build + train GRU | Build + train CNN-LSTM | — |
| 25 | Mar 9 | Evaluate DL models | Loss curves + plots | — |
| 26 | Mar 10 | Joint: Ensemble build | Joint: Ensemble build | — |
| 27 | Mar 11 | Optimize weights | Master comparison | — |
| 28 | Mar 12 | Save DL models | DL API endpoints | **DL done** |
| 29 | Mar 13 | React init + deps | Map libs + structure | — |
| 30 | Mar 14 | Layout + routing | API service layer | **React scaffold** |
| 31 | Mar 15 | Dashboard cards | Charts (bar + line) | — |
| 32 | Mar 16 | Seasonal + model charts | Risk pie + heatmap | — |
| 33 | Mar 17 | Feature imp + scatter | Chart polish | **Dashboard done** |
| 34 | Mar 18 | Prediction form | Result card + colors | — |
| 35 | Mar 19 | Model selector | History + CSV export | **Predict done** |
| 36 | Mar 20 | Map + well markers | GPS button | — |
| 37 | Mar 21 | Well popups | GPS → predict → card | — |
| 38 | Mar 22 | District overlay | Click-predict + search | **Map done** |
| 39 | Mar 23 | Frontend ↔ backend | CORS + states | — |
| 40 | Mar 24 | Responsive design | Error boundaries | **Integrated** |
| 41 | Mar 25 | Model validation tests | API tests | — |
| 42 | Mar 26 | Edge case tests | UI/UX tests | **Tested** |
| 43 | Mar 27 | Model docs | API + user docs | **Docs done** |
| 44 | Mar 28 | Deploy backend | Deploy frontend | **Deployed** |
| 45 | Mar 29 | Final test + presentation + demo | Final test + presentation + demo | **COMPLETE** |

---

## Tech Stack (Industrial Grade)

| Layer | Technology |
|-------|-----------|
| **ML** | Scikit-learn, XGBoost, Statsmodels |
| **DL** | TensorFlow / Keras (Colab GPU) |
| **Backend** | FastAPI (Python) — async, auto Swagger docs |
| **Frontend** | React.js + Vite + Tailwind CSS |
| **Charts** | Recharts |
| **Maps** | React-Leaflet + Leaflet.js |
| **HTTP** | Axios |
| **Database** | SQLite (dev) → PostgreSQL (prod) |
| **Deploy** | Render/AWS (backend) + Vercel (frontend) |
| **VCS** | Git + GitHub |

---

## Git Workflow
````
This is the code block that represents the suggested code change:
```markdown
**Rules:** Feature branch → PR to dev → other person reviews → merge. Merge dev → main at milestones. Commit daily.

---

## Daily Standup (5 min — WhatsApp / Call at 10 PM)
```