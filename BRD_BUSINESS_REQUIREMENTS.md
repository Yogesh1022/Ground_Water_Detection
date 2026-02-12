# Business Requirements Document (BRD)

## ML & DL-Based Spatio-Temporal Groundwater Crisis Predictor — Vidarbha Region

| Field | Detail |
|-------|--------|
| **Document Version** | 1.0 |
| **Date** | February 12, 2026 |
| **Project Name** | Groundwater Crisis Predictor |
| **Domain** | Hydrology / Water Resource Management |
| **Region** | Vidarbha, Maharashtra, India |
| **Team** | Yogesh & Gaurav |
| **Type** | Industrial-Grade ML/DL + React Web Application |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Problem Statement](#2-business-problem-statement)
3. [Current Situation (As-Is)](#3-current-situation-as-is)
4. [Proposed Solution (To-Be)](#4-proposed-solution-to-be)
5. [Business Objectives & Goals](#5-business-objectives--goals)
6. [Project Scope](#6-project-scope)
7. [Stakeholders](#7-stakeholders)
8. [Functional Requirements](#8-functional-requirements)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Use Case Specifications](#10-use-case-specifications)
11. [Use Case Diagram](#11-use-case-diagram)
12. [System Workflow](#12-system-workflow)
13. [Data Requirements](#13-data-requirements)
14. [Technology Requirements](#14-technology-requirements)
15. [Risk Analysis](#15-risk-analysis)
16. [Success Criteria & KPIs](#16-success-criteria--kpis)
17. [Assumptions & Constraints](#17-assumptions--constraints)
18. [Dependencies](#18-dependencies)
19. [Glossary](#19-glossary)

---

## 1. Executive Summary

This project builds an **AI-powered early warning system** that predicts groundwater level depletion **60–90 days in advance** for villages in the Vidarbha region of Maharashtra. It combines classical Machine Learning (XGBoost, Random Forest) with Deep Learning (LSTM, GRU, 1D-CNN) to forecast when and where groundwater crises will occur, enabling government officials and farmers to take **proactive** action instead of reacting after wells run dry.

The system is delivered as a **React web dashboard** backed by a **FastAPI server**, supporting GPS-based predictions, interactive risk maps, and actionable village-level alerts.

---

## 2. Business Problem Statement

### 2.1 The Core Problem

> **"Vidarbha's groundwater crisis is managed reactively — officials learn about dry wells only AFTER villages run out of water, costing crores in emergency tanker deployments and devastating farmer livelihoods."**

### 2.2 Problem Breakdown

| Problem Area | Description | Impact |
|-------------|-------------|--------|
| **No Early Warning** | Current government systems (MRSAC, GSDA) provide only **descriptive reports** of current water levels. They tell what happened, not what will happen. | Villages face sudden water unavailability with no preparation time |
| **Reactive Response** | Emergency water tankers are dispatched only AFTER wells fail. No advance planning is possible. | Maharashtra spends **₹25+ Crore/year** on emergency tanker operations in Vidarbha alone |
| **Invisible Lag Effect** | Monsoon rainfall deficit in June–September doesn't impact groundwater immediately. The crisis manifests **3–4 months later** (December–March). This delay is invisible to manual monitoring. | Officials cannot connect current rainfall shortfalls to future water crises |
| **No Location-Specific Data** | Existing reports are district-level aggregates. A farmer cannot check the groundwater status at their specific village or farm. | Individual farmers have zero visibility into their local water table |
| **Data Silos** | Groundwater data (India-WRIS), rainfall data (CHIRPS), weather data (NASA/Open-Meteo) exist in separate portals with no unified view. | Decision-makers cannot see the complete picture |
| **Manual Analysis** | Government engineers manually compile Excel reports quarterly. No automation, no predictions. | Reports are outdated by the time they reach officials. Months of delay. |
| **Farmer Distress** | 2.5 Lakh+ farmers affected annually. Crop failure due to unexpected water shortage leads to debt, migration, and in extreme cases, farmer suicides. | Human cost is immeasurable. Financial loss runs into hundreds of crores. |

### 2.3 The "Lag Effect" — The Hidden Technical Problem

```
MONSOON SEASON                    DRY SEASON
(June–September)                  (December–March)

  Rainfall deficit                  Groundwater crisis
  happens HERE                     appears HERE
       │                                │
       │         3-4 MONTH GAP          │
       │◄──────────────────────────────►│
       │                                │
  Officials see                    Officials see
  "low rainfall"                   "dry wells"
  but take no action               but it's TOO LATE

  ┌─────────────┐                  ┌─────────────┐
  │ WINDOW OF   │                  │ CRISIS HAS  │
  │ OPPORTUNITY │  ← ML PREDICTS   │ ALREADY HIT │
  │ (can act)   │     HERE         │ (too late)  │
  └─────────────┘                  └─────────────┘
```

**This 3–4 month lag between cause (rainfall deficit) and effect (dry wells) is the exact gap that Machine Learning can exploit.** By learning the historical relationship between rainfall patterns and groundwater levels, the model predicts crises 60–90 days before they happen — turning the "too late" scenario into an "early warning" scenario.

### 2.4 Scale of the Problem

| Metric | Value |
|--------|-------|
| Affected Region | 11 districts in Vidarbha |
| Population Affected | ~2.5 Crore people |
| Farmers Affected Annually | ~2.5 Lakh+ |
| Annual Tanker Expenditure | ₹25+ Crore (Vidarbha alone) |
| Water-Stressed Districts | 8 out of 11 districts face chronic depletion |
| Data Available But Unused | 15 years (2010–2025) of groundwater + rainfall data sitting in government portals |
| Current Prediction Capability | **ZERO** — No forecasting system exists |

---

## 3. Current Situation (As-Is)

### 3.1 Current Process Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     CURRENT SYSTEM (As-Is)                        │
│                                                                    │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────────┐       │
│   │ GSDA     │    │ Manual well  │    │ Compile Excel    │       │
│   │ Engineer │───►│ measurement  │───►│ report           │       │
│   │ visits   │    │ (quarterly)  │    │ (takes weeks)    │       │
│   └──────────┘    └──────────────┘    └────────┬─────────┘       │
│                                                 │                  │
│                                                 ▼                  │
│                                        ┌──────────────────┐       │
│                                        │ Report reaches   │       │
│                                        │ Tehsildar office │       │
│                                        │ (1–2 months late)│       │
│                                        └────────┬─────────┘       │
│                                                 │                  │
│                                                 ▼                  │
│                                        ┌──────────────────┐       │
│                                        │ CRISIS ALREADY   │       │
│                                        │ HAPPENING        │       │
│                                        │ Wells are dry    │       │
│                                        └────────┬─────────┘       │
│                                                 │                  │
│                                                 ▼                  │
│                                        ┌──────────────────┐       │
│                                        │ REACTIVE:        │       │
│                                        │ Deploy tankers   │       │
│                                        │ Emergency mode   │       │
│                                        │ Cost: ₹₹₹        │       │
│                                        └──────────────────┘       │
└──────────────────────────────────────────────────────────────────┘

PROBLEMS:
  ✗ No prediction — only describes past
  ✗ Quarterly measurements — too infrequent
  ✗ Manual Excel — slow, error-prone
  ✗ District-level only — no village granularity
  ✗ No farmer access — data stays in government offices
  ✗ Reactive response — tankers after crisis hits
```

### 3.2 Pain Points by Stakeholder

| Stakeholder | Current Pain |
|-------------|-------------|
| **Farmer** | "I don't know if my borewell will have water next month. I invest in crops blindly." |
| **Tehsildar / Block Official** | "By the time I get the GSDA report, 10 villages have already run out of water. I'm always firefighting." |
| **District Collector** | "I need data to justify budget allocation for tankers. Currently I rely on complaint calls." |
| **GSDA Engineer** | "I manually visit 50+ wells per quarter. The data is 3 months old by the time it's compiled." |
| **NGO / Water Activist** | "There's no public dashboard. We can't track which villages are at risk." |

---

## 4. Proposed Solution (To-Be)

### 4.1 Solution Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PROPOSED SYSTEM (To-Be)                         │
│                                                                    │
│   ┌──────────────────────────────────────────────────────┐       │
│   │              AUTOMATED DATA PIPELINE                  │       │
│   │  India-WRIS │ CHIRPS │ NASA POWER │ Open-Meteo        │       │
│   │  (Auto-fetch monthly via APIs — NO manual work)       │       │
│   └───────────────────────┬──────────────────────────────┘       │
│                           │                                        │
│                           ▼                                        │
│   ┌──────────────────────────────────────────────────────┐       │
│   │           FEATURE ENGINEERING + ML/DL ENGINE          │       │
│   │  22 features │ XGBoost │ LSTM │ GRU │ Ensemble        │       │
│   │  Predicts groundwater depth 60–90 DAYS in advance     │       │
│   └───────────────────────┬──────────────────────────────┘       │
│                           │                                        │
│                           ▼                                        │
│   ┌──────────────────────────────────────────────────────┐       │
│   │              REACT WEB DASHBOARD                      │       │
│   │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐ │       │
│   │  │Dashboard│ │ Predict  │ │   Map   │ │ GPS Check  │ │       │
│   │  │ Charts │ │  Form    │ │ + Wells │ │ My Location│ │       │
│   │  └────────┘ └──────────┘ └─────────┘ └────────────┘ │       │
│   └───────────────────────┬──────────────────────────────┘       │
│                           │                                        │
│                           ▼                                        │
│   ┌──────────────────────────────────────────────────────┐       │
│   │                  EARLY WARNING                        │       │
│   │  🟢 SAFE │ 🟠 WARNING │ 🔴 CRITICAL │ 🟣 EXTREME      │       │
│   │  60–90 days advance notice                            │       │
│   │  Actionable advice per village                        │       │
│   │  Tanker route pre-planning                            │       │
│   └──────────────────────────────────────────────────────┘       │
│                                                                    │
│  BENEFITS:                                                         │
│   ✓ PREDICTIVE — forecasts 3 months ahead                         │
│   ✓ AUTOMATED — no manual data compilation                        │
│   ✓ VILLAGE-LEVEL — granular, not just district averages          │
│   ✓ REAL-TIME — live weather + GPS location support               │
│   ✓ ACCESSIBLE — any stakeholder can access via browser           │
│   ✓ PROACTIVE — pre-position tankers, change crop plans           │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 How Each Problem Is Solved

| Current Problem | How Our Solution Solves It |
|----------------|---------------------------|
| No early warning | ML/DL models predict depth **60–90 days ahead** using lag features |
| Reactive tanker deployment | Dashboard shows risk maps **3 months early** — tankers pre-positioned |
| Invisible lag effect | Lag features (rainfall_lag_1m/2m/3m) explicitly model the 3-month delay |
| No location-specific data | GPS-based prediction gives depth estimate at **any lat/lon** |
| Data silos | Automated pipeline merges India-WRIS + CHIRPS + NASA + Open-Meteo into **single dataset** |
| Manual Excel reports | Fully automated — data fetch → feature engineering → prediction → dashboard |
| Farmer has no access | Public web dashboard accessible on **any mobile phone browser** |
| Quarterly (outdated) data | **Monthly** predictions + real-time weather integration |

### 4.3 Business Value Delivered

| Value | Estimated Impact |
|-------|-----------------|
| **Tanker cost reduction** | 30–40% savings (₹7–10 Crore/year) through pre-planning routes |
| **Crop loss prevention** | Farmers switch to drought-resistant crops 2 months early — saves ₹100+ Crore in lost harvest |
| **Water conservation** | Villages activate rainwater harvesting before crisis — 15–20% less water wastage |
| **Faster government response** | Response time reduced from weeks to hours |
| **Data transparency** | Public dashboard eliminates information asymmetry |

---

## 5. Business Objectives & Goals

### 5.1 Primary Objectives

| # | Objective | Measurable Target |
|---|-----------|-------------------|
| O1 | Predict groundwater depth accurately | R² > 0.85, RMSE < 0.5 meters |
| O2 | Provide early warning | 60–90 days advance prediction |
| O3 | Cover all Vidarbha | 11 districts, 500+ wells |
| O4 | Enable GPS-based checking | Prediction at any lat/lon within Vidarbha |
| O5 | Deliver user-friendly dashboard | Non-technical users (farmers, officials) can use without training |
| O6 | Fully automated pipeline | Zero manual intervention from data fetch to prediction |

### 5.2 Secondary Objectives

| # | Objective |
|---|-----------|
| S1 | Compare ML vs DL model performance — publish findings |
| S2 | Provide model explainability via SHAP — build trust with officials |
| S3 | Make system extensible — add new districts/states in future |
| S4 | Support offline-first mobile experience (future scope) |

---

## 6. Project Scope

### 6.1 In Scope

| # | Item | Description |
|---|------|-------------|
| 1 | Data collection pipeline | Automated scripts to fetch data from India-WRIS, CHIRPS, NASA POWER, Open-Meteo |
| 2 | Feature engineering | 22-column dataset with lag, rolling, stress, temporal, and geospatial features |
| 3 | ML model training | XGBoost, Random Forest, VAR (3 models) |
| 4 | DL model training | LSTM, GRU, 1D-CNN, CNN-LSTM hybrid (4 models) |
| 5 | Ensemble model | Weighted combination of ML + DL predictions |
| 6 | SHAP explainability | Feature importance analysis for model transparency |
| 7 | FastAPI backend | REST API for predictions, well data, district info |
| 8 | React frontend | Dashboard with charts, prediction form, interactive map |
| 9 | GPS prediction | Browser geolocation → KNN → IDW interpolation → live prediction |
| 10 | Risk classification | 4-level alert system (Safe / Warning / Critical / Extreme) |
| 11 | Deployment | Cloud deployment (backend + frontend) |
| 12 | Documentation | BRD, technical docs, API docs, user guide |

### 6.2 Out of Scope (Future Phases)

| # | Item | Reason |
|---|------|--------|
| 1 | Mobile native app (Android/iOS) | Phase 2 — current MVP is web-only (works on mobile browsers) |
| 2 | SMS/WhatsApp alerts | Phase 2 — requires Twilio/WhatsApp Business API integration |
| 3 | Borewell drilling recommendation | Requires geological survey data not currently available |
| 4 | Regions outside Vidarbha | Phase 2 — data collection needed for other regions |
| 5 | Water quality prediction | Different problem domain — requires chemical testing data |
| 6 | Tanker route optimization | Phase 2 — requires road network data + vehicle tracking |
| 7 | Multi-language support (Marathi) | Phase 2 — i18n localization to be added later |
| 8 | User authentication & roles | Phase 2 — MVP is public access |

---

## 7. Stakeholders

### 7.1 Stakeholder Register

| # | Stakeholder | Role | Interest | Interaction with System |
|---|-------------|------|----------|------------------------|
| 1 | **Farmer** | End User (Primary) | Check if their village/farm will have water next season | Uses GPS prediction, views risk status on mobile browser |
| 2 | **Tehsildar / Block Development Officer** | End User (Decision Maker) | Plan tanker deployment, issue crop advisories 2–3 months early | Views dashboard, checks district-level risk map, downloads prediction reports |
| 3 | **District Collector** | Executive Sponsor | Allocate budget for water tankers, approve crisis declarations | Views summary dashboard, reviews risk distribution across districts |
| 4 | **GSDA / CGWB Engineer** | Domain Expert | Validate predictions against field measurements, provide ground truth data | Reviews model accuracy, provides feedback on predictions, cross-references with manual readings |
| 5 | **Gram Panchayat (Village Council)** | Local Authority | Activate village water budget, organize rainwater harvesting | Receives alerts, takes preventive action based on risk level |
| 6 | **NGO / Water Activist** | Advocate | Track which villages are at risk, lobby for government action | Uses public dashboard to monitor situation, generate reports |
| 7 | **Academic Researcher** | Analyst | Study groundwater depletion patterns, validate model methodology | Reviews model architecture, evaluation metrics, SHAP analysis |

### 7.2 Stakeholder Needs Matrix

| Stakeholder | Needs From System | Priority |
|-------------|------------------|----------|
| Farmer | Simple risk color (Green/Orange/Red/Purple) + depth in feet + advice in plain language | HIGH |
| Tehsildar | District map with village-level risk dots + downloadable prediction list + 3-month forecast | HIGH |
| Collector | Summary dashboard: how many villages Safe/Warning/Critical/Extreme + trend comparison vs last year | HIGH |
| GSDA Engineer | Raw prediction values in meters + model confidence score + comparison with actual measurements | MEDIUM |
| NGO | Public data access + historical trend charts + ability to filter by district/taluka | MEDIUM |

---

## 8. Functional Requirements

### 8.1 Data Management

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-D01 | Automated data ingestion | HIGH | System shall automatically fetch groundwater, rainfall, weather, and soil data from external APIs monthly |
| FR-D02 | Data cleaning pipeline | HIGH | System shall handle missing values (forward-fill for depth, interpolation for weather), remove outliers (depth < 0 or > 500m), and standardize formats |
| FR-D03 | Feature engineering | HIGH | System shall compute 12 derived features (lag, rolling, deficit, stress, temporal, geospatial) from 10 raw inputs |
| FR-D04 | Data validation | HIGH | System shall validate that processed dataset has exactly 22 columns with correct data types before model input |
| FR-D05 | Data storage | MEDIUM | System shall store raw, processed, and prediction data in organized directory structure |

### 8.2 ML/DL Prediction Engine

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-M01 | ML model training | HIGH | System shall train XGBoost, Random Forest, and VAR models on tabular 22-feature dataset |
| FR-M02 | DL model training | HIGH | System shall train LSTM, GRU, 1D-CNN, and CNN-LSTM models on 3D sequential data (12 timesteps × 21 features) |
| FR-M03 | Ensemble prediction | HIGH | System shall combine ML + DL predictions using optimized weighted average for final output |
| FR-M04 | Model selection | MEDIUM | System shall allow user to choose which model to use for prediction (XGBoost, LSTM, Ensemble, etc.) |
| FR-M05 | Model explainability | MEDIUM | System shall generate SHAP-based feature importance rankings for XGBoost and Random Forest |
| FR-M06 | Model performance tracking | MEDIUM | System shall display R², RMSE, MAE metrics for all models on a comparison chart |
| FR-M07 | Time-based validation | HIGH | System shall use temporal train-test split (train: 2010–2023, test: 2024–2025) — never random split |

### 8.3 Prediction API (Backend)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-A01 | Single prediction endpoint | HIGH | `/predict` — accepts 21 features as JSON, returns predicted depth (m + ft), risk level, advice |
| FR-A02 | GPS prediction endpoint | HIGH | `/predict/gps` — accepts lat/lon, finds nearest wells via KNN, interpolates features via IDW, fetches live weather, returns prediction |
| FR-A03 | Batch prediction endpoint | MEDIUM | `/predict/batch` — accepts array of feature sets, returns array of predictions |
| FR-A04 | Well data endpoint | MEDIUM | `/api/wells` — returns all monitored well locations with latest depth and risk status |
| FR-A05 | District data endpoint | LOW | `/api/districts` — returns list of 11 Vidarbha districts with aggregate statistics |
| FR-A06 | Model info endpoint | LOW | `/model-info` — returns active model name, version, training date, metrics |
| FR-A07 | Health check endpoint | LOW | `/health` — returns API status for monitoring |

### 8.4 React Web Dashboard (Frontend)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-U01 | Dashboard page | HIGH | Display summary cards (Total Wells, Avg Depth, Critical Count, Safe Count) + district bar chart + trend line chart + risk pie chart |
| FR-U02 | Prediction page | HIGH | Form with inputs (district, month, rainfall, temperature, humidity, model selector) → submit → display result card with depth (m + ft) + risk color + advice |
| FR-U03 | Map page | HIGH | Interactive Leaflet map showing all well locations as colored markers (Green/Orange/Red/Purple by risk). Click marker for popup details |
| FR-U04 | GPS location capture | HIGH | "Use My Location" button → browser geolocation → capture lat/lon → send to GPS prediction API → display result on map |
| FR-U05 | Click-to-predict on map | MEDIUM | User clicks any point on map → capture coordinates → run prediction → show result popup at clicked location |
| FR-U06 | District boundary overlay | MEDIUM | GeoJSON polygons of Vidarbha districts rendered on map, colored by average risk level |
| FR-U07 | Model comparison chart | MEDIUM | Grouped bar chart comparing R², RMSE of all 6+ models |
| FR-U08 | Feature importance chart | MEDIUM | Horizontal bar chart showing SHAP-based feature rankings |
| FR-U09 | Prediction history | LOW | Store past predictions in localStorage, display as table, allow CSV export |
| FR-U10 | Responsive design | HIGH | Dashboard must work on mobile phones (viewport ≥ 320px), tablets, and desktops |

### 8.5 Risk Classification & Alerts

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-R01 | 4-level risk classification | HIGH | Classify predicted depth into SAFE (0–30m), WARNING (30–100m), CRITICAL (100–200m), EXTREME (>200m) |
| FR-R02 | Color-coded display | HIGH | Green, Orange, Red, Purple badges/labels for each risk level |
| FR-R03 | Actionable advice | HIGH | Display dynamic text advice based on risk level (e.g., "Avoid water-intensive crops" for WARNING) |
| FR-R04 | Depth unit conversion | HIGH | Display depth in both Meters and Feet: `feet = meters × 3.28084` |

---

## 9. Non-Functional Requirements

### 9.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P01 | Single prediction response time | < 2 seconds |
| NFR-P02 | GPS prediction response time | < 5 seconds (includes API calls to Open-Meteo) |
| NFR-P03 | Dashboard page load time | < 3 seconds on 4G mobile network |
| NFR-P04 | Map rendering with 500+ markers | < 4 seconds |
| NFR-P05 | Concurrent users supported | At least 50 simultaneous users |

### 9.2 Accuracy

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A01 | Model R² score on test set | > 0.85 (85% variance explained) |
| NFR-A02 | RMSE on test set | < 0.5 meters |
| NFR-A03 | Risk classification accuracy | > 90% correct risk level assignment |
| NFR-A04 | GPS prediction confidence | > 75% when nearest well is within 15 km |

### 9.3 Reliability & Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R01 | System uptime | 99% (allows ~7 hours downtime/month) |
| NFR-R02 | API error rate | < 1% of requests |
| NFR-R03 | Graceful degradation | If external API (Open-Meteo) is down, use cached weather data |

### 9.4 Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-U01 | Learning curve | New user can make a prediction within 2 minutes without training |
| NFR-U02 | Language | English (Marathi in Phase 2) |
| NFR-U03 | Accessibility | Color-blind friendly palette + text labels alongside color indicators |
| NFR-U04 | Mobile-first design | Primary use case is farmers on mobile phones |

### 9.5 Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S01 | No PII collection | System does not store user GPS coordinates or personal data |
| NFR-S02 | HTTPS | All API calls over HTTPS in production |
| NFR-S03 | Input validation | All API inputs sanitized and validated against expected ranges |

### 9.6 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SC01 | Data scalability | Support up to 100,000 prediction records without performance degradation |
| NFR-SC02 | Region scalability | Architecture supports adding new regions (districts/states) by adding training data |
| NFR-SC03 | Model scalability | Support swapping models without frontend changes (model-agnostic API) |

---

## 10. Use Case Specifications

### UC-01: Manual Prediction (Form-Based)

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-01 |
| **Name** | Make Manual Groundwater Prediction |
| **Actor** | Farmer / Government Official |
| **Precondition** | User has access to dashboard, knows district and approximate weather data |
| **Trigger** | User navigates to Prediction page |
| **Main Flow** | 1. User selects district from dropdown<br>2. User selects target month<br>3. User enters rainfall (mm), temperature (°C), humidity (%)<br>4. User selects model (XGBoost / LSTM / Ensemble)<br>5. User clicks "Predict"<br>6. System computes 22-feature vector (lag features from historical database)<br>7. System runs selected model<br>8. System returns: depth (m + ft), risk level + color, actionable advice |
| **Postcondition** | Prediction displayed on screen, saved to prediction history |
| **Alternate Flow** | A1: If required fields are empty → show validation error<br>A2: If API is unreachable → show cached prediction warning |
| **Exception** | E1: Model file not found → return HTTP 500 with descriptive error |

---

### UC-02: GPS-Based Prediction (Location Check)

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-02 |
| **Name** | Check Groundwater at My Location |
| **Actor** | Farmer (on mobile phone) |
| **Precondition** | User is physically located in or near Vidarbha region |
| **Trigger** | User clicks "Use My Location" button on Map page |
| **Main Flow** | 1. Browser requests GPS permission<br>2. User grants permission<br>3. System captures latitude, longitude, accuracy<br>4. System sends coordinates to `/predict/gps` API<br>5. Backend finds 5 nearest monitored wells (KNN + Haversine distance)<br>6. Backend interpolates lag features using IDW from neighbor wells<br>7. Backend fetches live weather from Open-Meteo API for user's coordinates<br>8. Backend assembles 21-feature vector<br>9. Backend runs ensemble model<br>10. System returns: depth (m + ft), risk level, confidence %, nearest well distance<br>11. Frontend displays result card on map at user's location |
| **Postcondition** | User sees prediction pinned to their location on map |
| **Alternate Flow** | A1: GPS permission denied → prompt manual lat/lon entry<br>A2: No wells within 50 km → show "Outside coverage area" message<br>A3: Open-Meteo API down → use last available weather data with warning |
| **Exception** | E1: GPS accuracy > 5 km → show warning about low accuracy |

---

### UC-03: View Dashboard Analytics

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-03 |
| **Name** | View Groundwater Analytics Dashboard |
| **Actor** | Government Official / District Collector |
| **Precondition** | Backend API is running, prediction data is available |
| **Trigger** | User navigates to Dashboard page |
| **Main Flow** | 1. System loads summary statistics (total wells, avg depth, risk counts)<br>2. System renders district-wise depth bar chart<br>3. System renders year-over-year trend line chart<br>4. System renders risk distribution pie chart<br>5. System renders seasonal comparison chart<br>6. User can filter by district using dropdown<br>7. User can change time range using date picker |
| **Postcondition** | All charts rendered with current data |
| **Alternate Flow** | A1: No data for selected filter → show "No data available" placeholder |

---

### UC-04: View Risk Map

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-04 |
| **Name** | View Interactive Risk Map |
| **Actor** | Any User (Farmer, Official, NGO) |
| **Precondition** | Well location data is available |
| **Trigger** | User navigates to Map page |
| **Main Flow** | 1. System renders Vidarbha region map (React-Leaflet)<br>2. System plots all well locations as color-coded markers:<br>   - 🟢 Green = Safe (0–30m)<br>   - 🟠 Orange = Warning (30–100m)<br>   - 🔴 Red = Critical (100–200m)<br>   - 🟣 Purple = Extreme (>200m)<br>3. User clicks a marker → popup shows well ID, district, depth, risk, last updated<br>4. District boundary polygons overlaid on map, shaded by average risk<br>5. User can zoom, pan, and search by location name |
| **Postcondition** | Interactive map displayed with all wells and risk levels |

---

### UC-05: Click-to-Predict on Map

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-05 |
| **Name** | Predict at Clicked Map Location |
| **Actor** | Any User |
| **Precondition** | Map page is loaded |
| **Trigger** | User clicks any point on the map |
| **Main Flow** | 1. System captures clicked lat/lon from map event<br>2. System sends coordinates to `/predict/gps` API<br>3. Prediction is computed (same as UC-02 Steps 5–10)<br>4. Result popup appears at clicked location showing depth + risk + confidence |
| **Postcondition** | Temporary prediction marker shown at clicked point |

---

### UC-06: Compare Model Performance

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-06 |
| **Name** | Compare ML vs DL Model Accuracy |
| **Actor** | Researcher / GSDA Engineer |
| **Precondition** | All models are trained and metrics are stored |
| **Trigger** | User views model comparison section on Dashboard |
| **Main Flow** | 1. System displays grouped bar chart: R², RMSE, MAE for each model<br>2. System highlights best-performing model<br>3. User can view SHAP feature importance chart for selected model<br>4. User can view prediction vs actual scatter plot |
| **Postcondition** | User understands relative model performance |

---

### UC-07: Export Prediction Data

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-07 |
| **Name** | Export Predictions as CSV |
| **Actor** | Government Official |
| **Precondition** | At least one prediction exists in history |
| **Trigger** | User clicks "Export CSV" button on Prediction page |
| **Main Flow** | 1. System collects all predictions from localStorage<br>2. System generates CSV file with columns: date, lat, lon, district, predicted_depth_m, predicted_depth_ft, risk_level, model_used<br>3. Browser downloads the CSV file |
| **Postcondition** | CSV file downloaded to user's device |

---

## 11. Use Case Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GROUNDWATER CRISIS PREDICTOR — USE CASES                 │
│                                                                               │
│                                                                               │
│   ┌──────────┐                                                               │
│   │  Farmer  │───────┐                                                       │
│   │ (Mobile) │       │                                                       │
│   └──────────┘       │                                                       │
│                      │      ┌──────────────────────────────────────┐         │
│                      ├─────►│ UC-01: Manual Prediction (Form)      │         │
│                      │      │ Select district, enter weather data, │         │
│                      │      │ choose model → get depth + risk      │         │
│                      │      └──────────────────────────────────────┘         │
│                      │                                                       │
│                      │      ┌──────────────────────────────────────┐         │
│                      ├─────►│ UC-02: GPS Prediction (My Location)  │         │
│                      │      │ Grant GPS → auto-find wells → fetch  │         │
│   ┌──────────┐       │      │ weather → predict at exact location  │         │
│   │Government│───────┤      └──────────────────┬───────────────────┘         │
│   │ Official │       │                         │ «includes»                   │
│   └──────────┘       │                         ▼                              │
│                      │      ┌──────────────────────────────────────┐         │
│                      │      │ UC-02a: KNN Nearest Well Search      │         │
│                      │      │ (Haversine distance, K=5, 50km)      │         │
│                      │      └──────────────────────────────────────┘         │
│                      │      ┌──────────────────────────────────────┐         │
│                      │      │ UC-02b: IDW Spatial Interpolation    │         │
│                      │      │ (Inverse Distance Weighting of lags) │         │
│                      │      └──────────────────────────────────────┘         │
│                      │      ┌──────────────────────────────────────┐         │
│                      │      │ UC-02c: Live Weather Fetch           │         │
│                      │      │ (Open-Meteo API at user's lat/lon)   │         │
│                      │      └──────────────────────────────────────┘         │
│                      │                                                       │
│                      │      ┌──────────────────────────────────────┐         │
│                      ├─────►│ UC-03: View Dashboard Analytics      │         │
│                      │      │ Summary cards, charts, trends,       │         │
│   ┌──────────┐       │      │ risk distribution, filter by district│         │
│   │ District │───────┤      └──────────────────────────────────────┘         │
│   │Collector │       │                                                       │
│   └──────────┘       │      ┌──────────────────────────────────────┐         │
│                      ├─────►│ UC-04: View Interactive Risk Map     │         │
│                      │      │ Color-coded well markers, district   │         │
│                      │      │ boundaries, click for well details   │         │
│   ┌──────────┐       │      └──────────────────────────────────────┘         │
│   │   NGO /  │───────┤                                                       │
│   │ Activist │       │      ┌──────────────────────────────────────┐         │
│   └──────────┘       ├─────►│ UC-05: Click-to-Predict on Map      │         │
│                      │      │ Click any point → predict depth at   │         │
│                      │      │ that location → show result popup    │         │
│   ┌──────────┐       │      └──────────────────────────────────────┘         │
│   │   GSDA   │───────┤                                                       │
│   │ Engineer │       │      ┌──────────────────────────────────────┐         │
│   └──────────┘       ├─────►│ UC-06: Compare Model Performance    │         │
│                      │      │ R², RMSE, MAE charts for all models  │         │
│   ┌──────────┐       │      │ SHAP feature importance, scatter plot│         │
│   │Researcher│───────┤      └──────────────────────────────────────┘         │
│   └──────────┘       │                                                       │
│                      │      ┌──────────────────────────────────────┐         │
│                      └─────►│ UC-07: Export Predictions as CSV     │         │
│                             │ Download prediction history as file  │         │
│                             └──────────────────────────────────────┘         │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐      │
│  │                     EXTERNAL SYSTEMS (Actors)                      │      │
│  │                                                                    │      │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌────────────┐  │      │
│  │  │India-WRIS │   │  CHIRPS   │   │NASA POWER │   │ Open-Meteo │  │      │
│  │  │(GW Data)  │   │(Rainfall) │   │(Soil/ET)  │   │ (Weather)  │  │      │
│  │  └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └──────┬─────┘  │      │
│  │        │               │               │                │         │      │
│  │        └───────────────┴───────────────┴────────────────┘         │      │
│  │                              │                                     │      │
│  │                              ▼                                     │      │
│  │              ┌──────────────────────────────┐                     │      │
│  │              │ UC-SYS: Automated Data Fetch  │                     │      │
│  │              │ Monthly pipeline — no manual   │                     │      │
│  │              │ intervention required           │                     │      │
│  │              └──────────────────────────────┘                     │      │
│  └────────────────────────────────────────────────────────────────────┘      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Use Case — Actor Mapping Table

| Use Case | Farmer | Govt Official | Collector | NGO | GSDA Engineer | Researcher |
|----------|--------|---------------|-----------|-----|---------------|------------|
| UC-01: Manual Prediction | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| UC-02: GPS Prediction | ✅ | ✅ | — | ✅ | ✅ | — |
| UC-03: Dashboard Analytics | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| UC-04: Risk Map | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| UC-05: Click-to-Predict | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| UC-06: Model Comparison | — | — | — | — | ✅ | ✅ |
| UC-07: Export CSV | — | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 12. System Workflow

### 12.1 End-to-End Processing Pipeline

```
DATA SOURCES                    PROCESSING                      USER OUTPUT
─────────────                   ──────────                      ───────────

India-WRIS ──►┐
              │
CHIRPS ──────►┤                 ┌─────────────┐
              ├──► Data Merge ──► Feature Eng. │
NASA POWER ──►┤    & Clean      │ (22 columns) │
              │                 └──────┬──────┘
Open-Meteo ──►┘                        │
                                       ▼
                              ┌─────────────────┐
                              │   TRAIN MODELS   │
                              │                   │
                              │ ML: XGBoost, RF,  │
                              │     VAR           │
                              │                   │
                              │ DL: LSTM, GRU,    │
                              │     CNN, CNN-LSTM  │
                              │                   │
                              │ Ensemble:         │
                              │   Weighted Avg    │
                              └────────┬──────────┘
                                       │
                                       ▼
                              ┌─────────────────┐         ┌──────────────┐
                              │   FastAPI        │         │ React        │
                              │   Backend        │◄───────►│ Frontend     │
                              │   /predict       │  JSON   │              │
                              │   /predict/gps   │  API    │ Dashboard    │
                              │   /api/wells     │         │ Predict Page │
                              │   /api/districts │         │ Map Page     │
                              └─────────────────┘         └──────┬───────┘
                                                                  │
                                                                  ▼
                                                          ┌──────────────┐
                                                          │ USER SEES:   │
                                                          │ • Depth: 145 │
                                                          │   feet (44m) │
                                                          │ • Risk: 🟠   │
                                                          │   WARNING    │
                                                          │ • Advice:    │
                                                          │   "Avoid     │
                                                          │   water-heavy│
                                                          │   crops"     │
                                                          └──────────────┘
```

### 12.2 GPS Prediction Sequence

```
FARMER'S PHONE          REACT APP              FastAPI BACKEND         EXTERNAL APIs
──────────────          ─────────              ──────────────         ─────────────

Click "My Location"
        │
        ├──► GPS Permission
        │    Dialog
        │
Grant Permission
        │
        ├──► Capture lat/lon ──────► POST /predict/gps ──────┐
                                    { lat: 20.59,            │
                                      lon: 78.96 }          │
                                                             │
                                         KNN: Find 5 ◄──────┘
                                         nearest wells
                                              │
                                         IDW: Interpolate
                                         lag features
                                              │
                                         Fetch live ────────► Open-Meteo API
                                         weather                    │
                                              │◄────────────────────┘
                                              │            { temp: 32°C,
                                         Assemble           rain: 15mm,
                                         21 features        humidity: 65% }
                                              │
                                         Run Ensemble
                                         Model
                                              │
                                         Return result
                                              │
        ◄──────────────────────── JSON Response:
                                    { depth_m: 44.2,
                                      depth_ft: 145,
                                      risk: "WARNING",
                                      color: "orange",
                                      confidence: 85,
                                      nearest_well_km: 8.2,
                                      advice: "Plan for
                                        shortage..." }
        │
Show result card
on map at user's
location
```

---

## 13. Data Requirements

### 13.1 Complete Dataset Schema (22 Columns)

| # | Column | Type | Source | Raw/Derived |
|---|--------|------|--------|-------------|
| 1 | `depth_mbgl` | float32 | India-WRIS | Raw (TARGET) |
| 2 | `rainfall_mm` | float32 | CHIRPS / Open-Meteo | Raw |
| 3 | `temperature_avg` | float32 | Open-Meteo / NASA | Raw |
| 4 | `humidity` | float32 | Open-Meteo / NASA | Raw |
| 5 | `evapotranspiration` | float32 | NASA POWER | Raw |
| 6 | `soil_moisture_index` | float32 | NASA POWER | Raw |
| 7 | `rainfall_lag_1m` | float32 | Derived | shift(1) |
| 8 | `rainfall_lag_2m` | float32 | Derived | shift(2) |
| 9 | `rainfall_lag_3m` | float32 | Derived | shift(3) |
| 10 | `rainfall_rolling_3m` | float32 | Derived | rolling(3).mean() |
| 11 | `rainfall_rolling_6m` | float32 | Derived | rolling(6).mean() |
| 12 | `rainfall_deficit` | float32 | Derived | current - long_term_avg |
| 13 | `cumulative_deficit` | float32 | Derived | cumsum(deficit) |
| 14 | `temp_rainfall_ratio` | float32 | Derived | temp / (rain + 1) |
| 15 | `depth_lag_1q` | float32 | Derived | shift(1) on depth |
| 16 | `depth_lag_2q` | float32 | Derived | shift(2) on depth |
| 17 | `depth_change_rate` | float32 | Derived | diff() on depth |
| 18 | `month` | int8 | Derived | from date |
| 19 | `season_encoded` | int8 | Derived | label encoding |
| 20 | `district_encoded` | int8 | Derived | label encoding |
| 21 | `latitude` | float64 | India-WRIS | Raw |
| 22 | `longitude` | float64 | India-WRIS | Raw |

### 13.2 Data Volume

| Metric | Value |
|--------|-------|
| Time Range | 2010–2025 (15 years) |
| Wells | ~500–1,500 |
| Total Rows | ~30,000–90,000 |
| Dataset Size | ~50–100 MB |

---

## 14. Technology Requirements

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Language | Python | 3.10+ | ML/DL, Backend |
| Language | JavaScript (JSX) | ES6+ | React Frontend |
| ML | Scikit-learn | ≥ 1.3 | Preprocessing, KNN, metrics |
| ML | XGBoost | ≥ 2.0 | Primary ML model |
| ML | Statsmodels | ≥ 0.14 | VAR baseline |
| DL | TensorFlow / Keras | ≥ 2.15 | LSTM, GRU, 1D-CNN |
| Backend | FastAPI | ≥ 0.104 | REST API server |
| Backend | Uvicorn | ≥ 0.24 | ASGI server for FastAPI |
| Frontend | React | ≥ 18 | SPA dashboard |
| Frontend | Vite | ≥ 5 | Build tool |
| Frontend | React-Leaflet | ≥ 4 | Interactive maps |
| Frontend | Recharts | ≥ 2 | Charts and graphs |
| Frontend | Axios | ≥ 1.6 | HTTP client |
| Frontend | Tailwind CSS | ≥ 3 | Styling framework |
| Data | Pandas | ≥ 2.0 | Data manipulation |
| Data | NumPy | ≥ 1.24 | Numerical computing |
| Viz | Matplotlib, Seaborn | ≥ 3.7 / ≥ 0.12 | EDA plots |
| Explain | SHAP | ≥ 0.42 | Model explainability |
| Maps | Folium / GeoPandas | ≥ 0.14 / ≥ 0.13 | Backend geospatial ops |
| Deploy | Render / Vercel | — | Cloud hosting |
| VCS | Git + GitHub | — | Source control |

---

## 15. Risk Analysis

| # | Risk | Probability | Impact | Severity | Mitigation |
|---|------|------------|--------|----------|------------|
| R1 | India-WRIS data not downloadable (portal issues) | Medium | High | **HIGH** | Use Kaggle alternative datasets + GSDA reports as backup |
| R2 | Insufficient historical data (< 10 years) | Low | High | **MEDIUM** | Augment with synthetic data generation or use shorter training window |
| R3 | Model accuracy below 85% R² | Medium | High | **HIGH** | Add more features, try different architectures, increase ensemble diversity |
| R4 | Open-Meteo API rate limit hit | Low | Medium | **LOW** | Implement caching, batch requests, use NASA POWER as fallback |
| R5 | GPS inaccuracy on user's phone | Medium | Medium | **MEDIUM** | Show confidence score based on GPS accuracy + nearest well distance |
| R6 | No monitored wells within 50km of user | Low | High | **MEDIUM** | Display clear "Outside coverage area" message, suggest nearest covered region |
| R7 | React-Leaflet map performance with 1000+ markers | Medium | Medium | **MEDIUM** | Use marker clustering (react-leaflet-markercluster) to group nearby markers |
| R8 | DL model too slow for real-time prediction | Low | Medium | **LOW** | Convert to TFLite, use XGBoost as primary model (faster), DL only for ensemble |
| R9 | Data drift over time (model becomes stale) | High | High | **HIGH** | Schedule quarterly model retraining with latest data |
| R10 | Team member unavailable during critical phase | Low | High | **MEDIUM** | Both members share knowledge of all components, documented code |

---

## 16. Success Criteria & KPIs

### 16.1 Model Performance KPIs

| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| R² Score (Ensemble) | > 0.85 | `sklearn.metrics.r2_score` on test set (2024–2025 data) |
| RMSE (Ensemble) | < 0.5 meters | `sklearn.metrics.mean_squared_error` |
| MAE (Ensemble) | < 0.4 meters | `sklearn.metrics.mean_absolute_error` |
| Risk Classification Accuracy | > 90% | Correct risk level vs actual depth on test set |
| Ensemble beats best individual | Yes | Ensemble R² > max(XGBoost R², LSTM R², ...) |

### 16.2 System Performance KPIs

| KPI | Target | How to Measure |
|-----|--------|----------------|
| Prediction Response Time | < 2 sec | Time from API call to response |
| GPS Prediction Time | < 5 sec | Includes KNN + weather fetch + model |
| Dashboard Load Time | < 3 sec | Lighthouse performance audit |
| API Uptime | > 99% | Uptime monitoring (UptimeRobot) |
| Mobile Usability Score | > 90 | Google Lighthouse mobile audit |

### 16.3 Business Impact KPIs

| KPI | Target | How to Validate |
|-----|--------|-----------------|
| Prediction Advance Time | 60–90 days | Compare prediction date vs actual crisis date |
| Village Coverage | 500+ wells across 11 districts | Count unique wells in training data |
| User Adoption | 100+ predictions in first month post-launch | API request logs |

---

## 17. Assumptions & Constraints

### 17.1 Assumptions

| # | Assumption |
|---|-----------|
| A1 | India-WRIS portal will remain publicly accessible and provide quarterly groundwater data |
| A2 | Open-Meteo and NASA POWER APIs will remain free and available |
| A3 | The 3-month lag between rainfall and groundwater recharge is consistent across Vidarbha's basalt geology |
| A4 | Users (farmers) have access to smartphones with internet connectivity and GPS |
| A5 | Historical data from 2010–2025 is representative of future patterns (climate change may alter this) |
| A6 | Google Colab free GPU tier will be sufficient for DL model training |
| A7 | Both team members have equal availability throughout the 45-day project period |

### 17.2 Constraints

| # | Constraint |
|---|-----------|
| C1 | **Budget:** ₹0 — fully open-source stack, free cloud tiers only |
| C2 | **Timeline:** 45 days (Feb 13 – Mar 29, 2026) — hard deadline |
| C3 | **Team:** 2 developers only (Yogesh + Gaurav) |
| C4 | **Compute:** Google Colab free tier (T4 GPU, limited session time) |
| C5 | **Data:** Only publicly available data — no paid subscriptions or proprietary databases |
| C6 | **Region:** Vidarbha only (11 districts) — not all of Maharashtra |
| C7 | **Language:** English only in MVP (Marathi localization is Phase 2) |
| C8 | **No authentication:** Public dashboard — no login system in MVP |

---

## 18. Dependencies

### 18.1 External Dependencies

| # | Dependency | Type | Risk if Unavailable |
|---|-----------|------|---------------------|
| D1 | India-WRIS Portal | Data Source | Cannot get groundwater historical data → use Kaggle alternatives |
| D2 | Open-Meteo API | Weather API | Cannot fetch live weather for GPS predictions → cache last known data |
| D3 | NASA POWER API | Soil/ET API | Cannot get evapotranspiration, soil moisture → drop features or use estimates |
| D4 | CHIRPS Dataset | Rainfall Data | Cannot get gridded rainfall → use Open-Meteo historical as replacement |
| D5 | Google Colab GPU | Compute | Cannot train DL models in reasonable time → use lighter architectures or reduce data |
| D6 | Render / Vercel | Hosting | Cannot deploy → use alternative (Railway, Netlify, Heroku) |
| D7 | DataMeet GeoJSON | Map Boundaries | Cannot render district boundaries → use simple markers only |

### 18.2 Internal Dependencies

| # | Dependency | Depends On | Impact if Delayed |
|---|-----------|-----------|-------------------|
| D8 | Feature Engineering | Clean merged dataset | Cannot create 22-column dataset → all model training blocked |
| D9 | DL Model Training | Feature-engineered + normalized data | Cannot train LSTM/GRU → ensemble incomplete |
| D10 | FastAPI Endpoints | Saved ML/DL models | Cannot serve predictions → React frontend has no backend |
| D11 | React Map Page | FastAPI `/api/wells` endpoint | Cannot plot wells on map → map page non-functional |
| D12 | GPS Prediction | KNN search + Open-Meteo + model | All 3 sub-components must work → most complex feature |

---

## 19. Glossary

| Term | Definition |
|------|-----------|
| **mbgl** | Meters Below Ground Level — how deep below the surface the groundwater sits |
| **WRIS** | Water Resources Information System — government portal for water data |
| **CHIRPS** | Climate Hazards Group InfraRed Precipitation with Station data — satellite rainfall dataset |
| **GSDA** | Groundwater Surveys and Development Agency — Maharashtra state agency |
| **CGWB** | Central Ground Water Board — national-level groundwater authority |
| **ET / ET₀** | Evapotranspiration — rate of water loss from soil and plant surfaces |
| **KNN** | K-Nearest Neighbors — algorithm to find closest data points by distance |
| **IDW** | Inverse Distance Weighting — spatial interpolation method where closer points have more influence |
| **Haversine** | Formula to calculate distance between two GPS coordinates accounting for Earth's curvature |
| **SHAP** | SHapley Additive exPlanations — method to explain individual ML predictions |
| **XGBoost** | Extreme Gradient Boosting — fast, accurate tree-based ML algorithm |
| **LSTM** | Long Short-Term Memory — deep learning architecture for sequence/time-series data |
| **GRU** | Gated Recurrent Unit — lighter alternative to LSTM for time-series |
| **1D-CNN** | 1-Dimensional Convolutional Neural Network — applies filters to detect patterns in sequences |
| **Ensemble** | Combining predictions from multiple models to improve accuracy |
| **VAR** | Vector Auto-Regression — statistical time-series forecasting model |
| **FastAPI** | Modern Python web framework for building APIs |
| **R²** | Coefficient of Determination — measures how well model explains variance (1.0 = perfect) |
| **RMSE** | Root Mean Square Error — average prediction error in same unit as target |
| **MAE** | Mean Absolute Error — average absolute difference between predicted and actual |
| **Lag Feature** | A feature derived by shifting a variable back in time (e.g., rainfall from 3 months ago) |
| **Rolling Average** | Mean value over a sliding time window (e.g., 3-month moving average) |
| **MinMaxScaler** | Normalizes numerical values to [0, 1] range — required for neural networks |
| **Vidarbha** | Eastern region of Maharashtra comprising 11 districts, known for agrarian distress |

---

> **Document Status:** APPROVED FOR DEVELOPMENT  
> **Next Step:** Begin Phase 1 — Data Collection (Day 1, February 13, 2026)
