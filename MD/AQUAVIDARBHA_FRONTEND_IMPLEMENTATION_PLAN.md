# 🌊 AquaVidarbha — Complete Frontend Implementation Plan
## Groundwater Crisis Predictor · HydroTech Defense-Grade UI

> **Version:** 2.0 · **Date:** February 2026
> **Stack:** Next.js 16 · React 19 · TypeScript · React Three Fiber · Framer Motion · GSAP · Tailwind CSS 4 · Shadcn UI · Mapbox GL · Deck.gl · Nivo Charts · Recharts · Zustand · Lenis Scroll
> **AI Workflow:** Claude 4.6 Sonnet + Gemini 3.1 Pro (see §12 for task delegation)

---

## Table of Contents

1. [Project Overview & Goals](#1-project-overview--goals)
2. [Complete File Structure](#2-complete-file-structure)
3. [Design System — "HydroTech" Theme](#3-design-system--hydrotech-theme)
4. [Dummy / Demo Data Layer](#4-dummy--demo-data-layer)
5. [Phase 1 — Project Scaffold & Configuration](#5-phase-1--project-scaffold--configuration)
6. [Phase 2 — Global Layout, Navbar & Router](#6-phase-2--global-layout-navbar--router)
7. [Phase 3 — Landing Page (7 Sections)](#7-phase-3--landing-page-7-sections)
8. [Phase 4 — Dashboard Page (6 Tabs)](#8-phase-4--dashboard-page-6-tabs)
9. [Phase 5 — Prediction Page](#9-phase-5--prediction-page)
10. [Phase 6 — About Page](#10-phase-6--about-page)
11. [Phase 7 — 3D Visuals (React Three Fiber)](#11-phase-7--3d-visuals-react-three-fiber)
12. [AI Task Delegation — Claude 4.6 vs Gemini 3.1](#12-ai-task-delegation--claude-46-vs-gemini-31)
13. [Week-by-Week Timeline](#13-week-by-week-timeline)
14. [Performance Targets](#14-performance-targets)
15. [Appendix: All Demo Data JSON](#15-appendix-all-demo-data-json)

---

## 1. Project Overview & Goals

### What We're Building
Transform the existing single-file `dashboard_preview.html` (1,800+ lines) into a production-grade, multi-page Next.js 16 application with:

- **4 Pages:** Landing, Dashboard (6 tabs), Prediction, About
- **3D Visuals:** Animated aquifer cross-section, water particles, hero background
- **Interactive Maps:** Mapbox GL + Deck.gl with heatmap, scatter, 3D tilt
- **8+ Charts:** Nivo/Recharts (depth trends, seasonal, rainfall scatter, feature importance, etc.)
- **Full Demo Data:** All 650 wells, 11 districts, 161,850 simulated records
- **Defense-Tech Aesthetic:** Glassmorphism, HUD grid, scan lines, neon glow, JetBrains Mono data fonts

### Design Pillars

| Pillar | Description | Tech |
|--------|-------------|------|
| **Glassmorphism** | Frosted-glass cards with `backdrop-filter: blur(24px)` | Tailwind + custom CSS |
| **HUD Grid** | Subtle animated grid background like a radar screen | CSS `background-image` + `@keyframes` |
| **Neon Glow** | Cyan/red/green glow on borders and status indicators | `box-shadow` with color glow |
| **3D Depth** | Parallax aquifer layers, water particles | React Three Fiber |
| **Cinematic Scroll** | Elements fly in as you scroll | GSAP ScrollTrigger |
| **Micro-Interactions** | Spring physics on hover, pulse on live indicators | Framer Motion |

---

## 2. Complete File Structure

```
aquavidarbha/
│
├── public/
│   ├── fonts/
│   │   └── JetBrainsMono-Variable.woff2
│   ├── images/
│   │   ├── og-image.png                  # Open Graph preview image
│   │   ├── favicon.ico
│   │   └── logo-drop.svg                 # 💧 logo as SVG
│   ├── models/                            # 3D assets (Phase 7)
│   │   ├── aquifer_layers.glb
│   │   └── terrain_vidarbha.glb
│   └── textures/
│       ├── basalt_normal.jpg
│       ├── water_caustics.png
│       └── grid_pattern.svg
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout — fonts, providers, navbar
│   │   ├── page.tsx                       # Landing page
│   │   ├── globals.css                    # Tailwind + HydroTech custom CSS
│   │   ├── loading.tsx                    # Global loading skeleton
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                 # Sidebar layout for dashboard
│   │   │   ├── page.tsx                   # Overview tab (default)
│   │   │   ├── map/
│   │   │   │   └── page.tsx               # Full interactive map tab
│   │   │   ├── districts/
│   │   │   │   └── page.tsx               # District deep-dive tab
│   │   │   ├── rainfall/
│   │   │   │   └── page.tsx               # Rainfall impact tab
│   │   │   ├── history/
│   │   │   │   └── page.tsx               # Depth history tab
│   │   │   └── model/
│   │   │       └── page.tsx               # ML model stats tab
│   │   │
│   │   ├── predict/
│   │   │   └── page.tsx                   # Prediction engine page
│   │   │
│   │   └── about/
│   │       └── page.tsx                   # About / methodology page
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                 # Fixed top navbar
│   │   │   ├── Footer.tsx                 # Site footer
│   │   │   ├── SmoothScroll.tsx           # Lenis scroll wrapper
│   │   │   └── PageTransition.tsx         # Framer Motion page animation
│   │   │
│   │   ├── landing/
│   │   │   ├── HeroSection.tsx            # Hero with 3D background
│   │   │   ├── StatsBar.tsx               # Animated counters strip
│   │   │   ├── CrisisSection.tsx          # Problem statement + aquifer viz
│   │   │   ├── AquiferViz.tsx             # CSS aquifer cross-section (2D fallback)
│   │   │   ├── CrisisCards.tsx            # 4 KPI crisis indicator cards
│   │   │   ├── FeaturesSection.tsx        # 3-card feature grid
│   │   │   ├── FeatureCard.tsx            # Individual feature card
│   │   │   ├── MapTeaser.tsx              # Map preview with CTA
│   │   │   └── HowItWorks.tsx            # 4-step pipeline visualization
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx                # Dashboard sidebar navigation
│   │   │   ├── SidebarButton.tsx          # Individual sidebar nav button
│   │   │   ├── TopBar.tsx                 # Dashboard top bar with filters
│   │   │   ├── KPICard.tsx                # Animated KPI metric card
│   │   │   ├── KPIRow.tsx                 # Row of 4 KPI cards
│   │   │   ├── DepthTrendChart.tsx        # Line chart: 2015–2026 depth trend
│   │   │   ├── SeasonalChart.tsx          # Bar chart: monthly seasonal variation
│   │   │   ├── RainfallScatterChart.tsx   # Scatter: rainfall vs depth
│   │   │   ├── ChangeRateChart.tsx        # Bar chart: monthly change rate
│   │   │   ├── FeatureImportanceChart.tsx # Horizontal bar: XGBoost features
│   │   │   ├── DistrictTable.tsx          # Sortable/searchable district table
│   │   │   ├── DistrictRow.tsx            # Individual table row
│   │   │   └── FilterBadge.tsx            # Clickable filter pill
│   │   │
│   │   ├── maps/
│   │   │   ├── WellMapDeckGL.tsx          # Deck.gl + Mapbox GL main map
│   │   │   ├── MiniMapLeaflet.tsx         # Leaflet mini-map (landing teaser)
│   │   │   ├── PredictMap.tsx             # Prediction page map with pin
│   │   │   ├── MapLegend.tsx              # Color legend overlay
│   │   │   └── WellPopup.tsx              # Rich popup on well click
│   │   │
│   │   ├── predict/
│   │   │   ├── InputPanel.tsx             # GPS + parameter input form
│   │   │   ├── GPSButton.tsx              # "Use My GPS" button
│   │   │   ├── ResultPanel.tsx            # Results container
│   │   │   ├── CurrentDepthCard.tsx       # Current depth result display
│   │   │   ├── ForecastCard.tsx           # 4-month seasonal forecast
│   │   │   ├── ForecastMonth.tsx          # Individual month in forecast
│   │   │   ├── ForecastChart.tsx          # Mini line chart for forecast
│   │   │   ├── DrillRecommendCard.tsx     # Drilling recommendation
│   │   │   ├── DrillInfoItem.tsx          # Individual drill stat
│   │   │   └── ModelStatsStrip.tsx        # Bottom model performance bars
│   │   │
│   │   ├── about/
│   │   │   ├── TeamSection.tsx
│   │   │   ├── MethodologySection.tsx
│   │   │   ├── DataSourcesGrid.tsx
│   │   │   └── TechStackGrid.tsx
│   │   │
│   │   ├── 3d/                            # React Three Fiber scenes
│   │   │   ├── HeroBackground.tsx         # Hero animated particles + ripples
│   │   │   ├── WaterRipples.tsx           # Expanding ring animation
│   │   │   ├── DataParticles.tsx          # Floating data point particles
│   │   │   ├── AquiferScene.tsx           # 3D aquifer cross-section
│   │   │   ├── GeoLayer.tsx               # Single geological layer mesh
│   │   │   ├── WaterTable.tsx             # Animated water plane
│   │   │   ├── WaterParticles.tsx         # Instanced particle system
│   │   │   └── DepthGauge3D.tsx           # 3D depth meter visualization
│   │   │
│   │   ├── animations/
│   │   │   ├── ScrollAnimations.tsx       # GSAP ScrollTrigger hooks
│   │   │   ├── CountUpAnimation.tsx       # Number counter animation
│   │   │   ├── FadeInView.tsx             # Framer Motion fade-in wrapper
│   │   │   ├── StaggerContainer.tsx       # Stagger children animation
│   │   │   └── ShimmerButton.tsx          # Button with shimmer hover effect
│   │   │
│   │   └── ui/                            # Shadcn UI primitives
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── table.tsx
│   │       ├── tooltip.tsx
│   │       ├── separator.tsx
│   │       ├── progress.tsx
│   │       ├── skeleton.tsx
│   │       └── scroll-area.tsx
│   │
│   ├── data/                              # All dummy/demo data
│   │   ├── wells.ts                       # 650 wells with full attributes
│   │   ├── districts.ts                   # 11 district summaries
│   │   ├── depthTrend.ts                  # Annual depth trend 2015–2026
│   │   ├── seasonalData.ts                # Monthly seasonal averages
│   │   ├── rainfallScatter.ts             # 120 rainfall vs depth points
│   │   ├── changeRateData.ts              # Monthly change rate values
│   │   ├── featureImportance.ts           # XGBoost feature weights
│   │   ├── forecastDemo.ts                # Demo forecast outputs
│   │   ├── modelMetrics.ts                # ML model performance metrics
│   │   └── datasetScores.ts               # 20 dataset quality parameters
│   │
│   ├── lib/
│   │   ├── theme.ts                       # Design tokens
│   │   ├── constants.ts                   # App-wide constants
│   │   ├── utils.ts                       # Utility functions (cn, etc.)
│   │   ├── spatial.ts                     # Haversine, kNN, distance
│   │   ├── colors.ts                      # Depth → color mapping
│   │   ├── prediction.ts                  # Client-side prediction simulation
│   │   └── types.ts                       # All TypeScript interfaces
│   │
│   ├── hooks/
│   │   ├── useAnimateNumber.ts            # Counting animation hook
│   │   ├── useGeolocation.ts              # GPS hook
│   │   ├── useMediaQuery.ts               # Responsive breakpoint hook
│   │   ├── useDashboardStore.ts           # Zustand dashboard state
│   │   └── usePredictionStore.ts          # Zustand prediction state
│   │
│   └── styles/
│       └── hydrotech.css                  # Extra custom CSS beyond Tailwind
│
├── .env.local                             # NEXT_PUBLIC_MAPBOX_TOKEN
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

**Total Files: ~95 source files**

---

## 3. Design System — "HydroTech" Theme

### 3.1 Color Tokens

```typescript
// src/lib/theme.ts

export const theme = {
  colors: {
    // ── Primary — Deep Ocean ──
    abyss:    '#0A1628',     // Darkest bg (hero, dashboard)
    deep:     '#0D2035',     // Primary dark panels
    marine:   '#1A3A52',     // Card backgrounds
    slate:    '#2A5270',     // Borders, secondary surfaces
    steel:    '#355872',     // Original --deep (sidebar)

    // ── Accent — Bioluminescent Cyan ──
    cyan: {
      50:   '#E0FAFF',
      100:  '#B0F0FF',
      200:  '#7AE4FF',
      300:  '#44D4FF',
      400:  '#00C2FF',       // ★ PRIMARY ACCENT
      500:  '#00A3E0',
      600:  '#0082B4',
      700:  '#006090',
      glow: 'rgba(0, 194, 255, 0.4)',
      pulse:'rgba(0, 194, 255, 0.15)',
    },

    // ── Status — Traffic Light ──
    crisis:  { base: '#FF4757', bg: 'rgba(255,71,87,0.1)',  glow: 'rgba(255,71,87,0.3)'  },
    warning: { base: '#FFA502', bg: 'rgba(255,165,2,0.1)',  glow: 'rgba(255,165,2,0.3)'  },
    safe:    { base: '#2ED573', bg: 'rgba(46,213,115,0.1)', glow: 'rgba(46,213,115,0.3)' },

    // ── Neutral ──
    text:    '#E8F0F8',
    muted:   '#6B8FA8',
    surface: '#F7F8F0',      // Light sections
    white:   '#FFFFFF',
  },

  fonts: {
    display: "'Playfair Display', serif",       // Headings (h1, h2)
    body:    "'Inter', sans-serif",             // Body text
    data:    "'JetBrains Mono', monospace",     // Numbers, data values
  },

  effects: {
    glass: {
      bg:         'rgba(13, 32, 53, 0.55)',
      blur:       'blur(24px) saturate(1.8)',
      border:     '1px solid rgba(0, 194, 255, 0.1)',
    },
    cardShadow:   '0 2px 14px rgba(53,88,114,0.10)',
    glowCyan:     '0 0 20px rgba(0,194,255,0.3), 0 0 60px rgba(0,194,255,0.1)',
    glowRed:      '0 0 20px rgba(255,71,87,0.3), 0 0 60px rgba(255,71,87,0.1)',
    glowGreen:    '0 0 20px rgba(46,213,115,0.3), 0 0 60px rgba(46,213,115,0.1)',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },

  breakpoints: {
    sm:  '640px',
    md:  '768px',
    lg:  '1024px',
    xl:  '1280px',
    xxl: '1536px',
  },
} as const;
```

### 3.2 Global CSS

```css
/* src/app/globals.css */

@import 'tailwindcss';

/* ── Font Faces ── */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

/* ── HydroTech Base Styles ── */

/* Animated grid background (HUD) */
.hydro-grid {
  background-image:
    linear-gradient(rgba(0, 194, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 194, 255, 0.035) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: gridScroll 25s linear infinite;
}

@keyframes gridScroll {
  0%   { background-position: 0 0; }
  100% { background-position: 60px 60px; }
}

/* Scan-line overlay (CRT / military HUD) */
.scanline::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 194, 255, 0.012) 2px,
    rgba(0, 194, 255, 0.012) 4px
  );
  pointer-events: none;
  z-index: 1;
}

/* Glassmorphism card */
.glass-card {
  background: rgba(13, 32, 53, 0.55);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(0, 194, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  border-color: rgba(0, 194, 255, 0.25);
  box-shadow:
    0 0 30px rgba(0, 194, 255, 0.08),
    0 8px 32px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

/* Light mode glass variant (for landing sections with light bg) */
.glass-card-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(53, 88, 114, 0.12);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card-light:hover {
  box-shadow: 0 8px 32px rgba(53, 88, 114, 0.12);
  transform: translateY(-3px);
}

/* Status glow borders */
.glow-safe    { box-shadow: inset 0 0 0 1.5px rgba(46,213,115,0.4), 0 0 16px rgba(46,213,115,0.1); }
.glow-warning { box-shadow: inset 0 0 0 1.5px rgba(255,165,2,0.4),  0 0 16px rgba(255,165,2,0.1);  }
.glow-crisis  { box-shadow: inset 0 0 0 1.5px rgba(255,71,87,0.4),  0 0 16px rgba(255,71,87,0.1);  }

/* Data value font (JetBrains Mono) */
.data-value {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

/* Smooth Lenis scroll */
html.lenis, html.lenis body {
  height: auto;
}
.lenis.lenis-smooth {
  scroll-behavior: auto !important;
}
.lenis.lenis-smooth [data-lenis-prevent] {
  overscroll-behavior: contain;
}

/* Custom scrollbar (dark) */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0D2035; }
::-webkit-scrollbar-thumb { background: #2A5270; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #00A3E0; }

/* Pulsing live indicator */
@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(1.4); }
}
.live-pulse {
  animation: livePulse 2s ease-in-out infinite;
}

/* Shimmer effect for CTAs */
.shimmer-btn {
  position: relative;
  overflow: hidden;
}
.shimmer-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255,255,255,0.25) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}
.shimmer-btn:hover::after {
  transform: translateX(100%);
}
```

### 3.3 Tailwind Configuration

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        abyss:  '#0A1628',
        deep:   '#0D2035',
        marine: '#1A3A52',
        slate:  '#2A5270',
        steel:  '#355872',
        cyan: {
          50:  '#E0FAFF',
          100: '#B0F0FF',
          200: '#7AE4FF',
          300: '#44D4FF',
          400: '#00C2FF',
          500: '#00A3E0',
          600: '#0082B4',
          700: '#006090',
        },
        crisis:  '#FF4757',
        warning: '#FFA502',
        safe:    '#2ED573',
        muted:   '#6B8FA8',
        surface: '#F7F8F0',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body:    ['Inter', 'sans-serif'],
        data:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl':  '16px',
        '2xl': '20px',
      },
      animation: {
        'grid-scroll': 'gridScroll 25s linear infinite',
        'live-pulse':  'livePulse 2s ease-in-out infinite',
        'ripple':      'ringExpand 6s linear infinite',
        'float':       'floatBounce 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 4. Dummy / Demo Data Layer

> All data lives in `src/data/` as typed TypeScript files. No API calls needed for the frontend demo.

### 4.1 TypeScript Interfaces

```typescript
// src/lib/types.ts

export interface Well {
  id: string;
  latitude: number;
  longitude: number;
  depth_m: number;
  district: string;
  well_type: 'dug' | 'bore' | 'tube';
  status: 'safe' | 'warning' | 'crisis';
  elevation_m: number;
  last_measured: string;         // ISO date
}

export interface District {
  name: string;
  lat: number;
  lon: number;
  avg_depth_m: number;
  well_count: number;
  status: 'safe' | 'warning' | 'crisis';
  trend: 'rising' | 'falling' | 'stable';
  rainfall_mm: number;
  population_k: number;
}

export interface DepthTrendPoint {
  year: number;
  avg_depth: number;
  min_depth: number;
  max_depth: number;
  crisis_threshold: number;
}

export interface SeasonalPoint {
  month: number;
  month_name: string;
  avg_depth: number;
  status: 'safe' | 'warning' | 'crisis';
}

export interface RainfallPoint {
  rainfall_mm: number;
  depth_m: number;
  district: string;
}

export interface ChangeRatePoint {
  month: string;
  change_m_per_month: number;
  direction: 'depletion' | 'recharge';
}

export interface FeatureWeight {
  feature: string;
  importance: number;
  category: 'temporal' | 'spatial' | 'climate' | 'vegetation';
}

export interface ForecastMonth {
  month_name: string;
  month_num: number;
  depth_m: number;
  trend: 'rising' | 'falling' | 'stable';
  change_m: number;
  is_peak: boolean;
}

export interface PredictionResult {
  current_depth_m: number;
  status: 'safe' | 'warning' | 'crisis';
  confidence: number;
  nearest_wells: number;
  avg_distance_km: number;
  district: string;
  forecast: ForecastMonth[];
  drill_recommendation: {
    min_depth: number;
    max_depth: number;
    success_probability: number;
    geology_layer: string;
    best_season: string;
    fracture_density: number;
  };
}

export interface ModelMetric {
  name: string;
  value: number | string;
  max_value?: number;
  unit?: string;
}

export interface DatasetScore {
  parameter: string;
  score: number;
  max_score: number;
}

export interface KPIData {
  label: string;
  value: number;
  suffix: string;
  change: string;
  changeType: 'up' | 'down' | 'neutral';
  status: 'default' | 'crisis' | 'warning' | 'safe';
  icon: string;
  decimals?: number;
}
```

### 4.2 Wells Data (650 wells)

```typescript
// src/data/wells.ts

import type { Well } from '@/lib/types';

// District seed data
const DISTRICT_SEEDS = [
  { name: 'Nagpur',     lat: 21.15, lon: 79.09, baseDepth: 39,  wells: 78  },
  { name: 'Amravati',   lat: 20.93, lon: 77.77, baseDepth: 84,  wells: 72  },
  { name: 'Akola',      lat: 20.71, lon: 77.00, baseDepth: 76,  wells: 65  },
  { name: 'Yavatmal',   lat: 20.38, lon: 78.12, baseDepth: 69,  wells: 70  },
  { name: 'Wardha',     lat: 20.75, lon: 78.60, baseDepth: 62,  wells: 58  },
  { name: 'Buldhana',   lat: 20.53, lon: 76.18, baseDepth: 67,  wells: 64  },
  { name: 'Washim',     lat: 20.10, lon: 77.13, baseDepth: 48,  wells: 52  },
  { name: 'Chandrapur', lat: 19.97, lon: 79.30, baseDepth: 32,  wells: 67  },
  { name: 'Gadchiroli', lat: 20.18, lon: 80.00, baseDepth: 24,  wells: 68  },
  { name: 'Gondia',     lat: 21.46, lon: 80.20, baseDepth: 25,  wells: 59  },
  { name: 'Bhandara',   lat: 21.17, lon: 79.65, baseDepth: 39,  wells: 57  },
] as const;

// Seeded random number generator for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getStatus(depth: number): 'safe' | 'warning' | 'crisis' {
  if (depth < 40) return 'safe';
  if (depth < 100) return 'warning';
  return 'crisis';
}

const rng = seededRandom(42);  // Reproducible data

export const wells: Well[] = [];

let wellId = 1;
for (const district of DISTRICT_SEEDS) {
  for (let i = 0; i < district.wells; i++) {
    const lat  = district.lat + (rng() - 0.5) * 1.2;
    const lon  = district.lon + (rng() - 0.5) * 1.5;
    const depth = Math.max(
      0.5,
      district.baseDepth + (rng() - 0.5) * 40 + rng() * 20
    );
    const roundedDepth = parseFloat(depth.toFixed(1));

    wells.push({
      id:            `CGWB-VID-${String(wellId).padStart(4, '0')}`,
      latitude:      parseFloat(lat.toFixed(4)),
      longitude:     parseFloat(lon.toFixed(4)),
      depth_m:       roundedDepth,
      district:      district.name,
      well_type:     roundedDepth < 30 ? 'dug' : roundedDepth < 80 ? 'bore' : 'tube',
      status:        getStatus(roundedDepth),
      elevation_m:   parseFloat((200 + rng() * 400).toFixed(0)),
      last_measured: `2026-02-${String(Math.floor(rng() * 28) + 1).padStart(2, '0')}`,
    });

    wellId++;
  }
}

// Summary stats
export const wellStats = {
  total:         wells.length,
  safe:          wells.filter(w => w.status === 'safe').length,
  warning:       wells.filter(w => w.status === 'warning').length,
  crisis:        wells.filter(w => w.status === 'crisis').length,
  avgDepth:      parseFloat((wells.reduce((s, w) => s + w.depth_m, 0) / wells.length).toFixed(2)),
  deepest:       parseFloat(Math.max(...wells.map(w => w.depth_m)).toFixed(1)),
  shallowest:    parseFloat(Math.min(...wells.map(w => w.depth_m)).toFixed(1)),
};
```

### 4.3 District Data

```typescript
// src/data/districts.ts

import type { District } from '@/lib/types';

export const districts: District[] = [
  {
    name: 'Nagpur',     lat: 21.15, lon: 79.09,
    avg_depth_m: 39,  well_count: 78,  status: 'safe',
    trend: 'stable',  rainfall_mm: 1120, population_k: 4653,
  },
  {
    name: 'Amravati',   lat: 20.93, lon: 77.77,
    avg_depth_m: 84,  well_count: 72,  status: 'warning',
    trend: 'rising',  rainfall_mm: 820,  population_k: 2888,
  },
  {
    name: 'Akola',      lat: 20.71, lon: 77.00,
    avg_depth_m: 76,  well_count: 65,  status: 'warning',
    trend: 'rising',  rainfall_mm: 790,  population_k: 1814,
  },
  {
    name: 'Yavatmal',   lat: 20.38, lon: 78.12,
    avg_depth_m: 69,  well_count: 70,  status: 'warning',
    trend: 'rising',  rainfall_mm: 950,  population_k: 2772,
  },
  {
    name: 'Wardha',     lat: 20.75, lon: 78.60,
    avg_depth_m: 62,  well_count: 58,  status: 'warning',
    trend: 'rising',  rainfall_mm: 1080, population_k: 1301,
  },
  {
    name: 'Buldhana',   lat: 20.53, lon: 76.18,
    avg_depth_m: 67,  well_count: 64,  status: 'warning',
    trend: 'rising',  rainfall_mm: 780,  population_k: 2586,
  },
  {
    name: 'Washim',     lat: 20.10, lon: 77.13,
    avg_depth_m: 48,  well_count: 52,  status: 'warning',
    trend: 'stable',  rainfall_mm: 810,  population_k: 1197,
  },
  {
    name: 'Chandrapur', lat: 19.97, lon: 79.30,
    avg_depth_m: 32,  well_count: 67,  status: 'safe',
    trend: 'falling', rainfall_mm: 1340, population_k: 2204,
  },
  {
    name: 'Gadchiroli', lat: 20.18, lon: 80.00,
    avg_depth_m: 24,  well_count: 68,  status: 'safe',
    trend: 'falling', rainfall_mm: 1580, population_k: 1072,
  },
  {
    name: 'Gondia',     lat: 21.46, lon: 80.20,
    avg_depth_m: 25,  well_count: 59,  status: 'safe',
    trend: 'stable',  rainfall_mm: 1420, population_k: 1322,
  },
  {
    name: 'Bhandara',   lat: 21.17, lon: 79.65,
    avg_depth_m: 39,  well_count: 57,  status: 'safe',
    trend: 'stable',  rainfall_mm: 1280, population_k: 1200,
  },
];
```

### 4.4 Chart Data

```typescript
// src/data/depthTrend.ts

import type { DepthTrendPoint } from '@/lib/types';

export const depthTrendData: DepthTrendPoint[] = [
  { year: 2015, avg_depth: 44.2, min_depth: 12.1, max_depth: 118.3, crisis_threshold: 100 },
  { year: 2016, avg_depth: 45.8, min_depth: 13.5, max_depth: 122.6, crisis_threshold: 100 },
  { year: 2017, avg_depth: 47.1, min_depth: 11.8, max_depth: 126.1, crisis_threshold: 100 },
  { year: 2018, avg_depth: 49.5, min_depth: 14.2, max_depth: 131.4, crisis_threshold: 100 },
  { year: 2019, avg_depth: 52.3, min_depth: 15.0, max_depth: 138.7, crisis_threshold: 100 },
  { year: 2020, avg_depth: 50.1, min_depth: 12.6, max_depth: 133.2, crisis_threshold: 100 },
  { year: 2021, avg_depth: 53.8, min_depth: 16.1, max_depth: 142.5, crisis_threshold: 100 },
  { year: 2022, avg_depth: 51.6, min_depth: 13.8, max_depth: 137.8, crisis_threshold: 100 },
  { year: 2023, avg_depth: 55.2, min_depth: 17.3, max_depth: 148.1, crisis_threshold: 100 },
  { year: 2024, avg_depth: 58.4, min_depth: 18.9, max_depth: 155.6, crisis_threshold: 100 },
  { year: 2025, avg_depth: 56.9, min_depth: 16.5, max_depth: 151.2, crisis_threshold: 100 },
  { year: 2026, avg_depth: 50.95,min_depth: 14.1, max_depth: 146.3, crisis_threshold: 100 },
];
```

```typescript
// src/data/seasonalData.ts

import type { SeasonalPoint } from '@/lib/types';

export const seasonalData: SeasonalPoint[] = [
  { month: 1,  month_name: 'Jan', avg_depth: 40.4, status: 'warning' },
  { month: 2,  month_name: 'Feb', avg_depth: 43.2, status: 'warning' },
  { month: 3,  month_name: 'Mar', avg_depth: 54.6, status: 'warning' },
  { month: 4,  month_name: 'Apr', avg_depth: 65.3, status: 'warning' },
  { month: 5,  month_name: 'May', avg_depth: 77.1, status: 'crisis'  },
  { month: 6,  month_name: 'Jun', avg_depth: 63.2, status: 'warning' },
  { month: 7,  month_name: 'Jul', avg_depth: 54.8, status: 'warning' },
  { month: 8,  month_name: 'Aug', avg_depth: 52.5, status: 'safe'    },
  { month: 9,  month_name: 'Sep', avg_depth: 53.4, status: 'safe'    },
  { month: 10, month_name: 'Oct', avg_depth: 38.2, status: 'safe'    },
  { month: 11, month_name: 'Nov', avg_depth: 32.5, status: 'safe'    },
  { month: 12, month_name: 'Dec', avg_depth: 38.6, status: 'safe'    },
];

// Seasonal swing: 77.1 - 32.5 = 44.6m (summer vs post-monsoon)
export const seasonalSwing = {
  max_month: 'May',
  max_depth: 77.1,
  min_month: 'November',
  min_depth: 32.5,
  swing_m: 44.6,
};
```

```typescript
// src/data/rainfallScatter.ts

import type { RainfallPoint } from '@/lib/types';

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const rng = seededRandom(99);
const districtNames = [
  'Nagpur','Amravati','Akola','Yavatmal','Wardha',
  'Buldhana','Washim','Chandrapur','Gadchiroli','Gondia','Bhandara'
];

export const rainfallScatterData: RainfallPoint[] = Array.from({ length: 120 }, () => {
  const rain = rng() * 400;
  const depth = Math.max(1, 80 - rain * 0.06 + (rng() - 0.5) * 60);
  return {
    rainfall_mm: parseFloat(rain.toFixed(1)),
    depth_m:     parseFloat(depth.toFixed(1)),
    district:    districtNames[Math.floor(rng() * 11)],
  };
});

export const rainfallCorrelation = -0.063;
```

```typescript
// src/data/changeRateData.ts

import type { ChangeRatePoint } from '@/lib/types';

export const changeRateData: ChangeRatePoint[] = [
  { month: 'Jan', change_m_per_month: 0.8,  direction: 'depletion' },
  { month: 'Feb', change_m_per_month: 1.2,  direction: 'depletion' },
  { month: 'Mar', change_m_per_month: 2.3,  direction: 'depletion' },
  { month: 'Apr', change_m_per_month: 4.1,  direction: 'depletion' },
  { month: 'May', change_m_per_month: 5.6,  direction: 'depletion' },
  { month: 'Jun', change_m_per_month: -3.8, direction: 'recharge'  },
  { month: 'Jul', change_m_per_month: -8.2, direction: 'recharge'  },
  { month: 'Aug', change_m_per_month: -6.1, direction: 'recharge'  },
  { month: 'Sep', change_m_per_month: -4.2, direction: 'recharge'  },
  { month: 'Oct', change_m_per_month: -1.8, direction: 'recharge'  },
  { month: 'Nov', change_m_per_month: 0.6,  direction: 'depletion' },
  { month: 'Dec', change_m_per_month: 0.9,  direction: 'depletion' },
];
```

```typescript
// src/data/featureImportance.ts

import type { FeatureWeight } from '@/lib/types';

export const featureImportanceData: FeatureWeight[] = [
  { feature: 'depth_lag_1q',     importance: 0.965, category: 'temporal'   },
  { feature: 'depth_lag_2q',     importance: 0.899, category: 'temporal'   },
  { feature: 'longitude',        importance: 0.403, category: 'spatial'    },
  { feature: 'elevation',        importance: 0.315, category: 'spatial'    },
  { feature: 'temperature',      importance: 0.263, category: 'climate'    },
  { feature: 'ET (evapotrans.)', importance: 0.241, category: 'climate'    },
  { feature: 'cumul_deficit',    importance: 0.202, category: 'climate'    },
  { feature: 'rainfall_6m_avg',  importance: 0.178, category: 'climate'    },
  { feature: 'NDVI',             importance: 0.139, category: 'vegetation' },
  { feature: 'season_encoded',   importance: 0.095, category: 'temporal'   },
];
```

```typescript
// src/data/forecastDemo.ts

import type { ForecastMonth } from '@/lib/types';

export const defaultForecast: ForecastMonth[] = [
  { month_name: 'MAR', month_num: 3,  depth_m: 68.2, trend: 'rising',  change_m: 3.4,  is_peak: false },
  { month_name: 'APR', month_num: 4,  depth_m: 71.4, trend: 'rising',  change_m: 3.2,  is_peak: false },
  { month_name: 'MAY', month_num: 5,  depth_m: 74.1, trend: 'rising',  change_m: 2.7,  is_peak: true  },
  { month_name: 'JUN', month_num: 6,  depth_m: 70.3, trend: 'falling', change_m: -3.8, is_peak: false },
];
```

```typescript
// src/data/modelMetrics.ts

import type { ModelMetric } from '@/lib/types';

export const modelMetrics: ModelMetric[] = [
  { name: 'XGBoost R²',         value: 0.97,   max_value: 1.0,  unit: '' },
  { name: 'XGBoost RMSE',       value: 6.2,    max_value: 50,   unit: 'm' },
  { name: 'Lag-1q Correlation', value: 0.965,  max_value: 1.0,  unit: '' },
  { name: 'Lag-2q Correlation', value: 0.899,  max_value: 1.0,  unit: '' },
  { name: 'LSTM MAE',           value: 4.8,    max_value: 30,   unit: 'm' },
  { name: 'Spatial Coverage',   value: '650',  unit: 'wells' },
  { name: 'Temporal Coverage',  value: '12',   unit: 'months/year' },
];
```

```typescript
// src/data/datasetScores.ts

import type { DatasetScore } from '@/lib/types';

export const datasetScores: DatasetScore[] = [
  { parameter: 'Spatial bounds (Vidarbha)',    score: 10, max_score: 10 },
  { parameter: 'Rainfall (IMD patterns)',      score: 10, max_score: 10 },
  { parameter: 'Temperature range',            score: 10, max_score: 10 },
  { parameter: 'Seasonal depth variation',     score: 9,  max_score: 10 },
  { parameter: 'Lag autocorrelation',          score: 9,  max_score: 10 },
  { parameter: 'NDVI / Land use',              score: 9,  max_score: 10 },
  { parameter: 'Geology encoding',             score: 9,  max_score: 10 },
  { parameter: 'Elevation realism',            score: 10, max_score: 10 },
  { parameter: 'Well type distribution',       score: 10, max_score: 10 },
  { parameter: 'Temporal continuity',          score: 10, max_score: 10 },
  { parameter: 'Outlier distribution',         score: 9,  max_score: 10 },
  { parameter: 'Cross-district variance',      score: 10, max_score: 10 },
  { parameter: 'Drought year patterns',        score: 9,  max_score: 10 },
  { parameter: 'Monsoon recovery signal',      score: 10, max_score: 10 },
  { parameter: 'Long-term trend (decline)',    score: 9,  max_score: 10 },
  { parameter: 'Pump extraction modeling',     score: 9,  max_score: 10 },
  { parameter: 'Feature engineering depth',    score: 10, max_score: 10 },
  { parameter: 'Train/test temporal split',    score: 10, max_score: 10 },
  { parameter: 'No data leakage',             score: 10, max_score: 10 },
  { parameter: 'Statistical distribution',     score: 8,  max_score: 10 },
];

export const totalScore = {
  earned: 189,
  possible: 200,
  percentage: 94.5,
  all_pass: true,
  pass_count: 20,
  total_checks: 20,
};
```

### 4.5 KPI Dashboard Data

```typescript
// src/data/kpiData.ts

import type { KPIData } from '@/lib/types';

export const dashboardKPIs: KPIData[] = [
  {
    label: 'Average Well Depth',
    value: 50.95,
    suffix: 'm',
    change: '▲ +2.3m vs last season',
    changeType: 'up',
    status: 'default',
    icon: '💧',
    decimals: 2,
  },
  {
    label: 'Crisis Wells (>100m)',
    value: 2847,
    suffix: '',
    change: '17.6% of all wells',
    changeType: 'neutral',
    status: 'crisis',
    icon: '⚠️',
  },
  {
    label: 'Monsoon Recharge',
    value: -8.2,
    suffix: 'm',
    change: '▼ Level rose (good)',
    changeType: 'down',
    status: 'warning',
    icon: '🌧️',
    decimals: 1,
  },
  {
    label: 'Dataset Realism',
    value: 94.5,
    suffix: '%',
    change: '189/200 · All 20 PASS',
    changeType: 'neutral',
    status: 'safe',
    icon: '📊',
    decimals: 1,
  },
];
```

---

## 5. Phase 1 — Project Scaffold & Configuration

### 5.1 Initialize Project

```bash
# Create Next.js 16 project with TypeScript
npx create-next-app@latest aquavidarbha \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --turbopack \
  --import-alias "@/*"

cd aquavidarbha
```

### 5.2 Install All Dependencies

```bash
# ── 3D Engine ──
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing

# ── Animation ──
npm install framer-motion gsap @studio-freight/lenis

# ── Maps ──
npm install react-map-gl mapbox-gl @deck.gl/react @deck.gl/layers @deck.gl/core
npm install leaflet react-leaflet    # Fallback mini-map for landing page

# ── Charts ──
npm install @nivo/line @nivo/bar @nivo/scatterplot recharts

# ── State Management ──
npm install zustand

# ── UI Components ──
npx shadcn@latest init
npx shadcn@latest add button card badge input select table tooltip separator progress skeleton scroll-area

# ── Utilities ──
npm install clsx tailwind-merge class-variance-authority

# ── Dev Dependencies ──
npm install -D @types/three @types/leaflet
```

### 5.3 Environment Variables

```env
# .env.local
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
NEXT_PUBLIC_SITE_URL=https://aquavidarbha.vercel.app
```

### 5.4 Next.js Config

```typescript
// next.config.ts

import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    // Enable Partial Prerendering for instant static shell
    ppr: true,
  },
  // Transpile Three.js packages
  transpilePackages: [
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    '@react-three/postprocessing',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.basemaps.cartocdn.com' },
      { protocol: 'https', hostname: 'api.mapbox.com' },
    ],
  },
};

export default config;
```

---

## 6. Phase 2 — Global Layout, Navbar & Router

### 6.1 Root Layout

```typescript
// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { Navbar } from '@/components/layout/Navbar';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['700', '900'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AquaVidarbha — Groundwater Crisis Predictor',
  description:
    'AI-powered groundwater depth prediction for 650+ wells across 11 Vidarbha districts. XGBoost + LSTM + kNN spatial models.',
  openGraph: {
    title: 'AquaVidarbha — Groundwater Crisis Predictor',
    description: 'ML-based groundwater monitoring for Vidarbha, Maharashtra',
    images: ['/images/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
    >
      <body className="font-body bg-surface text-deep antialiased overflow-x-hidden">
        <SmoothScroll>
          <Navbar />
          <main>{children}</main>
        </SmoothScroll>
      </body>
    </html>
  );
}
```

### 6.2 Navbar Component

```typescript
// src/components/layout/Navbar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Home',      href: '/'          },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Predict',   href: '/predict'   },
  { label: 'About',     href: '/about'     },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed top-0 left-0 right-0 z-[1000] h-16
                 bg-abyss/90 backdrop-blur-xl border-b border-cyan-400/10
                 flex items-center justify-between px-8
                 shadow-[0_2px_20px_rgba(0,0,0,0.3)]"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <span className="text-3xl group-hover:scale-110 transition-transform">💧</span>
        <div>
          <span className="text-lg font-bold text-surface tracking-tight">
            AquaVidarbha
          </span>
          <span className="block text-[11px] text-cyan-400/60 font-normal">
            Groundwater Crisis Predictor
          </span>
        </div>
      </Link>

      {/* Nav Links */}
      <div className="flex gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
                          (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-cyan-400 text-abyss font-semibold'
                  : 'text-surface/70 hover:text-surface hover:bg-cyan-400/10'}
              `}
            >
              {item.label}
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-cyan-400 rounded-lg -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* CTA */}
      <Link
        href="/predict"
        className="shimmer-btn bg-cyan-400 text-abyss px-5 py-2.5 rounded-lg
                   text-sm font-bold hover:bg-white transition-colors duration-200
                   hover:shadow-[0_0_24px_rgba(0,194,255,0.4)]"
      >
        🔍 Check Location
      </Link>
    </motion.nav>
  );
}
```

### 6.3 Smooth Scroll Provider

```typescript
// src/components/layout/SmoothScroll.tsx

'use client';

import { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
```

### 6.4 Page Transition Wrapper

```typescript
// src/components/layout/PageTransition.tsx

'use client';

import { motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {