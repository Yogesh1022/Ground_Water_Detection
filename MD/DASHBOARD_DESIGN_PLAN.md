# 💧 Groundwater Crisis Predictor — Complete Dashboard Design Plan
> Vidarbha Region, Maharashtra, India  
> Color Palette: `#355872` · `#7AAACE` · `#9CD5FF` · `#F7F8F0`

---

## 1. ARCHITECTURE DECISION

### Multi-Page SPA (Recommended ✅)
**Why NOT Power BI / Tableau:**
- Power BI is for internal enterprise BI tools, not public-facing web apps
- Cannot embed ML predictions (XGBoost/LSTM) live
- No custom groundwater UI/UX control
- Cannot do GPS-based real-time lookup

**Chosen Architecture: React SPA with React Router (3 Pages)**

```
/ ──────────────── Landing Page        (public, beautiful, scroll-based)
/dashboard ─────── Main Dashboard      (data + analysis hub)
/predict ───────── Prediction Tool     (GPS input → output depth/forecast)
```

---

## 2. COMPLETE TECH STACK

### Frontend
| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | **React 18 + Vite** | Fast, component-based, SPA routing |
| Styling | **Tailwind CSS + custom CSS vars** | Rapid theming with the 4 brand colors |
| UI Components | **shadcn/ui** | Accessible, beautiful, customizable |
| Charts | **Recharts** | React-native, lightweight, responsive |
| Maps | **Leaflet.js + React-Leaflet** | Free, OpenStreetMap tiles, well markers |
| 3D Earth/Aquifer | **Three.js** (hero section only) | Animated groundwater depth visual |
| Animations | **Framer Motion** | Scroll animations, page transitions |
| Icons | **Lucide React** | Consistent, clean icons |
| Fonts | **Inter** (UI) + **Playfair Display** (hero) | Professional + editorial |

### Backend
| Layer | Technology | Reason |
|-------|-----------|--------|
| API Framework | **FastAPI (Python)** | Already Python, async, auto-docs |
| ML Serving | **Joblib + XGBoost** | Load trained model, predict on request |
| Spatial Query | **scikit-learn kNN** | Find nearest wells to GPS input |
| LSTM Forecast | **TensorFlow Lite** | Lightweight serving of time-series model |
| Data Layer | **Pandas + CSV** | Dataset already in CSV format |
| CORS | **FastAPI middleware** | React ↔ FastAPI communication |

### Deployment
| Component | Option |
|-----------|--------|
| Frontend | **Vercel** (free tier) |
| Backend | **Railway.app** or **Render.com** (free tier) |
| Model files | Stored in backend `/models/` directory |

### NOT USED (and why)
| Rejected | Why |
|----------|-----|
| Power BI | Enterprise tool, no ML integration, no custom UI |
| Tableau | Same as above, expensive, iframe-only embed |
| Streamlit | Too plain/data-science-y, no landing page, no brand control |
| Next.js | Overkill for this project (SSR not needed) |
| Django | Slower than FastAPI for ML API serving |

---

## 3. COLOR SYSTEM

```css
:root {
  --deep-water:    #355872;   /* Primary dark — nav, headers, footer */
  --mid-water:     #7AAACE;   /* Secondary — buttons, borders, icons */
  --light-water:   #9CD5FF;   /* Accent — highlights, active states, charts */
  --surface:       #F7F8F0;   /* Background — page bg, cards */

  /* Extended palette derived from above */
  --deep-water-10: #35587210; /* Ghost backgrounds */
  --crisis-red:    #C0392B;   /* Crisis depth alerts */
  --warning-amber: #E67E22;   /* Warning depth level */
  --safe-green:    #27AE60;   /* Safe/Normal depth */
  --text-primary:  #1A2E3B;   /* Dark text */
  --text-muted:    #6B8FA8;   /* Muted labels */
}
```

---

## 4. PAGE-BY-PAGE DESIGN

---

### PAGE 1 — LANDING PAGE (`/`)

**Objective:** Emotionally hook the viewer — show Vidarbha's crisis, build trust, lead to dashboard.

```
┌───────────────────────────────────────────────────────────┐
│  NAVBAR                                                    │
│  💧 AquaVidarbha   [Home] [Dashboard] [Predict] [About]   │
│  bg: #355872  text: #F7F8F0                               │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  HERO SECTION  (full-screen, animated)                    │
│                                                           │
│  Background: animated water ripple / Vidarbha map tiles   │
│  (Three.js sphere rotating slowly showing India)          │
│                                                           │
│  H1: "Vidarbha is Running Out of Water"                   │
│      font: Playfair Display, 72px, color: #F7F8F0         │
│                                                           │
│  Sub: "AI-powered groundwater depth prediction and       │
│        seasonal forecast for 650+ monitoring wells"       │
│      font: Inter, color: #9CD5FF                          │
│                                                           │
│  [  🔍 Check Your Location  ]  [  View Dashboard  ]       │
│  btn: bg #9CD5FF, text #355872 | btn: outline #F7F8F0     │
│                                                           │
│  ↓ Scroll indicator (animated droplet bouncing)          │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  CRISIS STATS BAR  (sticky marquee / counter animation)  │
│  bg: #355872  text: #F7F8F0                               │
│                                                           │
│  [ 650 Wells Monitored ] [ 11 Districts ] [ 10 Yrs Data ] │
│  [ Avg Depth 51m ] [ 2,856 Farmers Affected (est.) ]     │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  PROBLEM SECTION  (scroll-triggered, split layout)        │
│  bg: #F7F8F0                                              │
│                                                           │
│  LEFT:  Illustrated cross-section of Deccan basalt        │
│         aquifer (like the geological drilling image       │
│         you uploaded — SVG animation showing water        │
│         table dropping over years)                        │
│                                                           │
│  RIGHT: Text cards:                                       │
│  ┌──────────────────────────────────────┐                │
│  │ 🌡️  Avg summer depth: 68.5m           │                │
│  │ 📉  Declining 2-5m/decade             │                │
│  │ ⚠️  200+ crisis wells (>100m depth)   │                │
│  │ 🌧️  Monsoon recharge only 3 months   │                │
│  └──────────────────────────────────────┘                │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  SOLUTION SECTION  (3-card feature grid)                  │
│  bg: white gradient → #F7F8F0                             │
│                                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ 📍           │ │ 📊           │ │ 🔩           │      │
│  │ Current      │ │ 3-Month      │ │ Well Depth   │      │
│  │ Water Level  │ │ Forecast     │ │ Recommender  │      │
│  │ at your GPS  │ │ Seasonal AI  │ │ Where to dig │      │
│  │ location     │ │ prediction   │ │ and how deep │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│  card bg: white  border-top: 4px solid #7AAACE           │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  LIVE MINI-MAP TEASER  (Leaflet preview, non-interactive) │
│  bg: #355872                                              │
│                                                           │
│  Full-width map of Vidarbha showing 650 well points as    │
│  colored circles (green=safe, amber=warning, red=crisis)  │
│  Overlay text: "650 wells tracked across 11 districts"   │
│                                                           │
│  [ Open Full Dashboard → ]  btn: #9CD5FF                 │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  HOW IT WORKS  (timeline / stepper)                       │
│  bg: #F7F8F0                                             │
│                                                           │
│  1. Enter GPS coords ──→ 2. kNN finds nearest wells       │
│  ──→ 3. XGBoost predicts depth ──→ 4. LSTM forecasts 4mo │
│                                                           │
│  Each step: icon + description + mini illustration        │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  FOOTER                                                   │
│  bg: #1A2E3B  text: #9CD5FF / #F7F8F0                    │
│  Links │ Dataset info │ CGWB Reference │ GitHub           │
└───────────────────────────────────────────────────────────┘
```

---

### PAGE 2 — MAIN DASHBOARD (`/dashboard`)

**Layout:** Left sidebar nav + right content area (like the sales dashboard image you uploaded)

```
┌──────┬──────────────────────────────────────────────────┐
│      │  TOP BAR                                          │
│  S   │  "Vidarbha Groundwater Dashboard"   [🔔][Filter] │
│  I   │  bg: white   border-bottom: #9CD5FF              │
│  D   ├──────────────────────────────────────────────────┤
│  E   │                                                   │
│  B   │  [ROW 1 — KPI CARDS]                              │
│  A   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  R   │  │ Avg Depth│ │ Crisis   │ │ Monsoon  │ │ Last │ │
│      │  │  50.95m  │ │  Wells   │ │Recharge  │ │Update│ │
│  bg  │  │  ▲2.3m   │ │  2,847   │ │  +8.2m  │ │Feb'26│ │
│ #355 │  │ vs last  │ │ (>100m)  │ │avg depth │ │ ✅   │ │
│  872 │  └──────────┘ └──────────┘ └──────────┘ └──────┘ │
│      │  card bg: white  top-border: 3px #7AAACE          │
│  Nav │                                                   │
│  ─── │  [ROW 2 — MAIN CHARTS, side by side]              │
│  🏠  │  ┌────────────────────────┐ ┌──────────────────┐  │
│  Home│  │  DEPTH TREND (line)    │ │  SEASONAL DEPTH  │  │
│      │  │  2015→2026 all wells   │ │  VARIATION (bar) │  │
│  📊  │  │  color: #7AAACE lines  │ │  Jan-Dec month   │  │
│  Dash│  │  crisis threshold red  │ │  avg depths      │  │
│      │  │  drought years shaded  │ │  overlay rain    │  │
│  📍  │  └────────────────────────┘ └──────────────────┘  │
│  Map │                                                   │
│      │  [ROW 3 — MAP + DISTRICT BREAKDOWN]               │
│  🔮  │  ┌──────────────────────────┐ ┌────────────────┐  │
│  Pred│  │  INTERACTIVE WELL MAP    │ │ DISTRICT TABLE │  │
│      │  │  Leaflet.js              │ │ ┌───────┬────┐  │  │
│  📈  │  │  • Green = <40m (safe)   │ │ │Nagpur │51m │  │  │
│  Anal│  │  • Amber = 40-100m (warn)│ │ │Amrav. │68m │  │  │
│      │  │  • Red = >100m (crisis)  │ │ │Akola  │76m │  │  │
│  ⚙️  │  │  Click well → popup      │ │ │...    │... │  │  │
│  Sett│  │  with depth history      │ │ └───────┴────┘  │  │
│      │  └──────────────────────────┘ └────────────────┘  │
│      │                                                   │
│      │  [ROW 4 — ANALYSIS CHARTS]                        │
│      │  ┌──────────────┐ ┌──────────────┐ ┌──────────┐  │
│      │  │ Rainfall vs  │ │ Depth Change │ │ District │  │
│      │  │ Depth Scatter│ │ Rate Heatmap │ │ Choropleh│  │
│      │  │ (correlation)│ │ (month×dist) │ │  (color) │  │
│      │  └──────────────┘ └──────────────┘ └──────────┘  │
└──────┴──────────────────────────────────────────────────┘
```

**Dashboard Sub-sections (tabs within /dashboard):**

| Tab | Content |
|-----|---------|
| **Overview** | KPI cards + trend + seasonal chart |
| **Map View** | Full-screen Leaflet map + well filter |
| **District Analysis** | Per-district depth table + bar chart |
| **Rainfall Impact** | Rainfall vs depth scatter + lag analysis |
| **Depth History** | Time-series for any selected well |
| **Model Stats** | Dataset info, score (94.5%), feature importance |

---

### PAGE 3 — PREDICTION TOOL (`/predict`)

**Objective:** User enters GPS → gets real-time ML prediction

```
┌───────────────────────────────────────────────────────────┐
│  HEADER                                                   │
│  bg: #355872  "💧 Groundwater Predictor"  text: #F7F8F0  │
└───────────────────────────────────────────────────────────┘

┌──────────────────────┬────────────────────────────────────┐
│  INPUT PANEL (left)  │  RESULT PANEL (right)              │
│  bg: white           │  bg: #F7F8F0                       │
│                      │                                    │
│  📍 Your Location    │  ┌────────────────────────────┐   │
│  ┌─────────────────┐ │  │  CURRENT DEPTH PREDICTION  │   │
│  │ 20.6523 (lat)   │ │  │                            │   │
│  └─────────────────┘ │  │   ⬇ 64.8 meters            │   │
│  ┌─────────────────┐ │  │   below ground level        │   │
│  │ 78.3914 (lon)   │ │  │   Status: ⚠️ Warning        │   │
│  └─────────────────┘ │  │   (40m – 100m range)        │   │
│                      │  └────────────────────────────┘   │
│  [📍 Use My GPS]     │                                    │
│                      │  ┌────────────────────────────┐   │
│  🗓 Target Month     │  │  4-MONTH SEASONAL FORECAST │   │
│  [ Month selector ]  │  │                            │   │
│                      │  │  Mar: 68.2m ▲ (↑rising)   │   │
│  🏗 Well Use         │  │  Apr: 71.4m ▲              │   │
│  ○ Domestic          │  │  May: 74.1m ▲ peak summer  │   │
│  ○ Agricultural      │  │  Jun: 70.3m ▼ (monsoon)   │   │
│  ○ Industrial        │  │  [line sparkline chart]    │   │
│                      │  └────────────────────────────┘   │
│  [ 🔍 PREDICT ]      │                                    │
│  btn: #355872        │  ┌────────────────────────────┐   │
│                      │  │  DRILL DEPTH RECOMMENDER   │   │
│  Mini-map showing    │  │                            │   │
│  your location pin   │  │  Recommended depth: 90m    │   │
│  + nearest 5 wells   │  │  Geological layer: Basalt  │   │
│                      │  │  Success probability: 78%  │   │
│                      │  └────────────────────────────┘   │
└──────────────────────┴────────────────────────────────────┘
```

---

## 5. MAP — SHOULD YOU USE IT?

**YES, absolutely. Here's why:**

| Without Map | With Map |
|-------------|----------|
| User can't spatially understand data | User sees Vidarbha geography instantly |
| Districts feel abstract | Districts are clickable, visual |
| No sense of well density | See clusters of crisis vs safe zones |
| Cannot verify GPS input | User sees their pin + nearest wells |

**Map layers to build:**
1. **Well markers** — colored by depth (green/amber/red)
2. **District boundaries** — GeoJSON choropleth colored by avg depth
3. **River overlays** — Wardha, Wainganga (blue lines)
4. **User location pin** — GPS input marker with radius circle

**Tile layer:** OpenStreetMap (free) or CartoDB Positron (cleaner, free)

---

## 6. SHOULD ALL ANALYSIS SHOW IN DASHBOARD?

**No — use progressive disclosure:**

| Show Immediately | Show on Demand |
|-----------------|----------------|
| KPI cards (4 numbers) | Full correlation matrix |
| Seasonal depth chart | District-level scatter plots |
| Interactive map | Feature importance chart |
| Recent trend line | Raw dataset stats |
| District table | Model accuracy metrics |

**Principle:** Hero metrics first → drill-down on click → advanced analysis in a separate "Model Stats" tab.

---

## 7. UI COMPONENT SPECIFICATIONS

### Color Token Usage
```
Page background:     #F7F8F0
Navbar/Footer:       #355872
Primary buttons:     #355872  (hover: darken 10%)
Secondary buttons:   #7AAACE  (outline style)
Accent / highlights: #9CD5FF
Chart line 1:        #7AAACE
Chart line 2:        #355872
Chart fill (area):   #9CD5FF + 20% opacity
Crisis alert:        #C0392B
Warning:             #E67E22
Safe:                #27AE60
Card background:     #FFFFFF
Card border:         #9CD5FF  (subtle)
Text primary:        #1A2E3B
Text muted:          #6B8FA8
```

### Typography Scale
```
Hero title:      Playfair Display, 72px, #F7F8F0
Section title:   Inter 700, 32px, #355872
Card title:      Inter 600, 18px, #1A2E3B
Body text:       Inter 400, 14px, #1A2E3B
Muted label:     Inter 400, 12px, #6B8FA8
KPI number:      Inter 800, 40px, #355872
```

### Card Design System
```
┌──────────────────────────────────┐
│  ▌  Card Title       [icon] [⋮] │  ← left accent border: 3px #7AAACE
│     ----------                  │
│     content area                │
│                                 │  bg: white
│                       [action]  │  shadow: 0 2px 12px rgba(53,88,114,0.08)
└──────────────────────────────────┘  border-radius: 12px
```

---

## 8. CHARTS SPECIFICATION (Recharts)

| Chart | Type | X-axis | Y-axis | Color |
|-------|------|--------|--------|-------|
| Depth Trend | AreaChart | Year (2015–2026) | depth_mbgl (m) | `#7AAACE` fill |
| Seasonal Depth | BarChart | Month | avg depth | gradient `#9CD5FF`→`#355872` |
| Rainfall vs Depth | ScatterChart | rainfall_mm | depth_mbgl | `#7AAACE` dots |
| District Depths | HorizontalBar | District name | avg depth | Crisis-colored |
| Forecast | LineChart | Month (next 4) | predicted depth | dashed `#355872` |
| Depth Change Rate | RadialBar or Heatmap | Month | District | heat colors |
| Lag Correlation | LineChart | depth_lag_1q | depth_mbgl | `#355872` |

---

## 9. RESPONSIVE DESIGN BREAKPOINTS

```
Mobile  (< 768px):   Single column, map collapsible, charts scrollable
Tablet  (768-1024px): 2-column grid, sidebar collapses to bottom nav
Desktop (> 1024px):  Full sidebar + 3-column grid layout (as designed above)
```

---

## 10. IMAGES & ILLUSTRATIONS TO USE

| Section | Visual |
|---------|--------|
| Hero background | Vidarbha satellite/terrain map (Mapbox static or ISRO Bhuvan) |
| Problem section | SVG animated cross-section of Deccan basalt aquifer layers |
| How it works | Step icons (GPS pin → brain → water drop → calendar) |
| Drilling illustration | Like the geologisk image you uploaded — use as SVG in landing page |
| Well map watercolor | Like the Balmorhea springs map — use as background texture in hero |
| Crisis card | Photo of dried Vidarbha well or cracked earth (royalty-free Unsplash) |
| Loading state | Animated water filling progress bar |
| Empty state | "No wells found nearby" with a sad water droplet illustration |

---

## 11. API ENDPOINTS (FastAPI Backend)

```python
GET  /api/health                          # Health check
GET  /api/wells                           # All 650 well locations + current depth
GET  /api/wells/{lat}/{lon}               # Nearest 5 wells to GPS point
POST /api/predict                         # { lat, lon, month } → predicted depth
POST /api/forecast                        # { lat, lon } → 4-month forecast array
GET  /api/districts                       # District-level aggregates
GET  /api/seasonal                        # Monthly avg depths (all wells)
GET  /api/trend                           # Yearly avg depth trend 2015–2026
GET  /api/dataset/stats                   # Dataset statistics for Model Stats tab
```

---

## 12. FOLDER STRUCTURE

```
groundwater-app/
├── frontend/                        # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Predictor.jsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Footer.jsx
│   │   │   ├── charts/
│   │   │   │   ├── DepthTrendChart.jsx
│   │   │   │   ├── SeasonalBarChart.jsx
│   │   │   │   ├── RainfallScatter.jsx
│   │   │   │   └── ForecastLineChart.jsx
│   │   │   ├── map/
│   │   │   │   ├── WellMap.jsx
│   │   │   │   └── DistrictChoropleth.jsx
│   │   │   ├── cards/
│   │   │   │   ├── KPICard.jsx
│   │   │   │   ├── PredictionCard.jsx
│   │   │   │   └── DrillRecommCard.jsx
│   │   │   └── ui/                  # shadcn components
│   │   ├── hooks/
│   │   │   ├── usePredict.js
│   │   │   └── useWells.js
│   │   ├── styles/
│   │   │   └── tokens.css           # CSS variables for color system
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/                         # FastAPI
│   ├── main.py
│   ├── routers/
│   │   ├── predict.py
│   │   ├── wells.py
│   │   └── analytics.py
│   ├── models/
│   │   ├── xgboost_model.joblib
│   │   └── lstm_forecast.h5
│   ├── data/
│   │   └── (CSV files symlinked from project)
│   └── requirements.txt
│
└── DASHBOARD_DESIGN_PLAN.md
```

---

## 13. DEVELOPMENT PHASES (45-Day Plan Alignment)

| Week | Frontend | Backend |
|------|----------|---------|
| 1 | Landing page + color system + Navbar | FastAPI setup + `/api/wells` endpoint |
| 2 | Dashboard layout + KPI cards + Sidebar | `/api/seasonal` + `/api/trend` |
| 3 | Leaflet map + well markers + district table | `/api/predict` + XGBoost integration |
| 4 | Prediction page + all charts (Recharts) | `/api/forecast` + LSTM integration |
| 5 | Responsive design + animations + polish | CORS + deployment + performance |
| 6 | Testing + Vercel deploy + Railway deploy | API rate limiting + caching |

---

## 14. WHY NOT POWER BI / STREAMLIT / TABLEAU?

| Tool | Good for | Bad for this project |
|------|----------|---------------------|
| **Power BI** | Corporate internal dashboards | No custom ML API, no public web deploy, no GPS input, costs ₹ |
| **Streamlit** | Quick data science demos | No landing page, no custom brand, no map interactivity, ugly |
| **Tableau** | Static BI reporting | Expensive, iframe-only embed, no real-time ML |
| **Grafana** | Infrastructure monitoring | Not designed for geo/prediction UI |
| **Custom React** ✅ | Production web apps | This is the right tool |

---

## 15. FINAL RECOMMENDATION SUMMARY

| Decision | Choice | Reason |
|----------|--------|--------|
| Multi-page or single? | **Multi-page SPA (3 pages)** | Landing + Dashboard + Predictor — best UX |
| Use map? | **YES — Leaflet.js** | Essential for spatial groundwater data |
| Show all analysis? | **Progressive disclosure** | Hero metrics first, drill-down on demand |
| BI tool? | **NO Power BI** — custom React | Full control, ML integration, free deploy |
| Charts? | **Recharts** | React-native, matches color system easily |
| Backend? | **FastAPI Python** | Already Python, ML-native |
| Deploy? | **Vercel + Railway** | Free tier, fast, CI/CD from GitHub |

---

*Design inspired by: geological cross-section illustrated maps, modern SaaS analytics dashboards, water-themed UI with the Deccan basalt aquifer visual language.*
