# Master Data & Feature Specification
**Project:** Groundwater Crisis Predictor (Vidarbha Region)  
**Version:** 2.0  
**Scope:** Data Parameters, User Outputs, and GPS Logic

---

## 1. The 26-Parameter Dataset (Backend Input)

To train the machine learning models (XGBoost/LSTM), the system requires exactly **26 data columns**. These parameters capture the hydrological cycle, terrain characteristics, vegetation health, and rainfall-to-percolation delay.

### A. Target Variable (Output Label)
| # | Parameter Name | Data Type | Unit | Description |
|:--|:---------------|:----------|:-----|:------------|
| 1 | **`depth_mbgl`** | Float | Meters | **Target:** Groundwater level below ground level. Used for training and validation. |

### B. Meteorological Features (Weather Inputs)
| # | Parameter Name | Data Type | Source | Description |
|:--|:---------------|:----------|:-------|:------------|
| 2 | **`rainfall_mm`** | Float | CHIRPS / Open-Meteo | Current month's total rainfall. |
| 3 | **`temperature_avg`** | Float | Open-Meteo | Average monthly temperature (°C). Higher temps increase evaporation. |
| 4 | **`humidity`** | Float | Open-Meteo | Relative humidity (%). Low humidity dries soil, preventing recharge. |
| 5 | **`evapotranspiration`** | Float | NASA POWER | Rate of water loss from soil/plants (ET0). |
| 6 | **`soil_moisture_index`** | Float | NASA POWER | Root zone wetness (0-1). Wet soil allows faster percolation. |

### C. Lag Features (Time-Series Delays)
*Crucial for capturing the 3-month delay between rainfall and aquifer recharge.*

| # | Parameter Name | Data Type | Description |
|:--|:---------------|:----------|:------------|
| 7 | **`rainfall_lag_1m`** | Float | Rainfall 1 month ago. |
| 8 | **`rainfall_lag_2m`** | Float | Rainfall 2 months ago. |
| 9 | **`rainfall_lag_3m`** | Float | Rainfall 3 months ago (Primary lag for Vidarbha basalt). |
| 10 | **`rainfall_rolling_3m`** | Float | Average rainfall of the last 3 months (Noise reduction). |
| 11 | **`rainfall_rolling_6m`** | Float | Average rainfall of the last 6 months (Seasonal trend). |

### D. Derived Stress Features
| # | Parameter Name | Data Type | Description |
|:--|:---------------|:----------|:------------|
| 12 | **`rainfall_deficit`** | Float | Deviation from long-term average (e.g., -50mm). |
| 13 | **`cumulative_deficit`** | Float | Sum of deficits over time. Indicates multi-year drought. |
| 14 | **`temp_rainfall_ratio`** | Float | Stress Index: `Temperature / (Rainfall + 1)`. |

### E. Historical Groundwater Context
| # | Parameter Name | Data Type | Description |
|:--|:---------------|:----------|:------------|
| 15 | **`depth_lag_1q`** | Float | Groundwater level 3 months ago (Last quarter). |
| 16 | **`depth_lag_2q`** | Float | Groundwater level 6 months ago. |
| 17 | **`depth_change_rate`** | Float | Rate of rise/fall (`current - previous`). |

### F. Geospatial & Temporal Features
| # | Parameter Name | Data Type | Description |
|:--|:---------------|:----------|:------------|
| 18 | **`month`** | Integer | 1–12. Captures annual cycles (Summer vs Monsoon). |
| 19 | **`season_encoded`** | Integer | 0=Monsoon, 1=Post-Monsoon, 2=Winter, 3=Summer. |
| 20 | **`district_encoded`** | Integer | ID for the district (Handles regional soil variation). |
| 21 | **`latitude`** | Float | GPS Latitude (Required for spatial interpolation). |
| 22 | **`longitude`** | Float | GPS Longitude (Required for spatial interpolation). |

### G. Terrain & Vegetation Features (Geophysical)
| # | Parameter Name | Data Type | Source | Description |
|:--|:---------------|:----------|:-------|:------------|
| 23 | **`elevation_m`** | Float | SRTM (30m DEM) | Elevation above sea level in meters. Higher elevation = deeper water table. |
| 24 | **`slope_degree`** | Float | Derived from SRTM DEM | Terrain slope in degrees. Steep slopes = higher runoff, less infiltration. |
| 25 | **`soil_type_encoded`** | Integer | FAO Soil Map / ISRO NBSS | Encoded soil classification (0=Alluvial, 1=Black Cotton, 2=Laterite, 3=Red, 4=Sandy). Controls percolation rate. |
| 26 | **`ndvi`** | Float | MODIS (MOD13Q1, 250m) | Normalized Difference Vegetation Index (−1 to +1). Higher NDVI = more vegetation = higher transpiration water loss. |

---

## 2. User-Facing Output Specification (Frontend)

While the backend processes 26 parameters, the user (farmer/official) sees only **3 simplified outputs**.

### Output 1: Visual Status (Risk Color)
*Logic based on predicted depth `d` (in meters).*

| Status | Color | Range (Meters) | Range (Feet) | Meaning |
|:-------|:------|:---------------|:-------------|:--------|
| **SAFE** | 🟢 Green | 0 – 30 m | 0 – 100 ft | Water available at shallow depth. |
| **WARNING** | 🟠 Orange | 30 – 100 m | 100 – 330 ft | Groundwater is falling. Moderate scarcity. |
| **CRITICAL** | 🔴 Red | 100 – 200 m | 330 – 650 ft | Deep borewell required. Urgent conservation. |
| **EXTREME** | 🟣 Purple | > 200 m | > 650 ft | Aquifer depletion. Immediate crisis. |

### Output 2: Estimated Depth
The exact prediction converted to user-friendly units.
* **Display Format:** "Estimated Water Level: **145 Feet** (44 Meters)"
* **Calculation:** `Feet = Meters * 3.28084`

### Output 3: Actionable Insight
Dynamic advice based on the risk level.
* **Safe:** "Monitor levels monthly. Normal irrigation allowed."
* **Warning:** "Plan for potential water shortage. Avoid water-intensive crops."
* **Critical:** "Arrange for tanker supply. Activate village water budget."

---

## 3. GPS-Based Prediction Workflow

This logic enables the "Check My Location" feature without requiring the user to select a specific well.

### Step 1: Capture Location
* **Input:** User grants GPS permission.
* **Data:** `User_Lat`, `User_Lon`.

### Step 2: Find Nearest Neighbors (KNN)
* **Algorithm:** K-Nearest Neighbors (KNN).
* **Action:** Search the training database for the **5 closest monitored wells** within a 50km radius.
* **Metric:** Haversine Distance (accounts for Earth's curvature).

### Step 3: Spatial Interpolation (IDW)
* **Algorithm:** Inverse Distance Weighting.
* **Logic:** Calculate the "Lag Features" (historical depth) for the user's location by averaging the 5 neighbors.
* **Formula:** Wells closer to the user get higher weight in the average.
    > *If User is 2km from Well A and 10km from Well B, Well A contributes 5x more to the calculation.*

### Step 4: Live Data Fetching
* **Action:** The backend API calls **Open-Meteo** using `User_Lat` and `User_Lon`.
* **Retrieves:** Real-time `rainfall_mm`, `temperature`, and `humidity` for that specific spot.

### Step 5: Final Prediction
* **Input Vector:** Combines [Interpolated Lags] + [Live Weather Data] + [GPS Coords].
* **Model:** Passes this vector into the trained XGBoost/LSTM model.
* **Output:** Returns the predicted `depth_mbgl` for the user's exact location.

---

## 4. Summary of Data Sources

| Parameter Type | Recommended Source | Cost |
|:---------------|:-------------------|:-----|
| **Groundwater Levels** | India-WRIS (Government Portal) | Free |
| **Rainfall & Weather** | Open-Meteo API / CHIRPS | Free |
| **Soil & Moisture** | NASA POWER API | Free |
| **Elevation & Slope** | SRTM 30m DEM (NASA Earthdata) | Free |
| **Vegetation Index (NDVI)** | MODIS MOD13Q1 (Google Earth Engine) | Free |
| **Soil Type** | FAO Digital Soil Map / ISRO NBSS&LUP | Free |
| **Map Boundaries** | DataMeet (GitHub) | Free |