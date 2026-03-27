# Frontend Migration Map: Complete File Path Reference

## Overview
This document maps every source file from the old structure (common-user-react + static files) to its new location in the restructured frontend/web folder.

---

## Static Assets Migration

### Old → New Locations

| Old Path | New Path | Notes |
|----------|----------|-------|
| `frontend/v2/` | `frontend/legacy/v2/` | Entire static v2 folder archived |
| `frontend/css/` | `frontend/legacy/css/` | Legacy CSS archived |
| `frontend/js/` | `frontend/legacy/js/` | Legacy JavaScript archived |

---

## React Application Structure: common-user-react → frontend/web

### Application Root & Entry

| Old | New | Purpose |
|-----|-----|---------|
| `common-user-react/index.html` | `web/index.html` | HTML entry point |
| `common-user-react/package.json` | `web/package.json` | Dependencies & scripts |
| `common-user-react/package-lock.json` | `web/package-lock.json` | Lock file |
| `common-user-react/vite.config.js` | `web/vite.config.ts` | Vite configuration (now TypeScript) |
| `common-user-react/.env.example` | `web/.env.example` | Environment variables template |
| `common-user-react/.gitignore` | `web/.gitignore` | Git ignore rules |
| **NEW** | `web/tsconfig.json` | TypeScript configuration (strict mode enabled) |
| **NEW** | `web/eslint.config.js` | ESLint configuration |
| **NEW** | `web/prettier.config.js` | Prettier configuration |

### Application Bootstrap (App Layer)

| Old | New | Purpose |
|-----|-----|---------|
| `common-user-react/src/main.jsx` | `web/src/app/main.tsx` | React entry point |
| `common-user-react/src/App.jsx` | `web/src/app/App.tsx` | Root app component (now routes-aware) |
| `common-user-react/src/chartSetup.js` | `web/src/app/chartSetup.ts` | Chart.js configuration |
| **NEW** | `web/src/app/router/index.tsx` | Router wrapper component |
| **NEW** | `web/src/app/router/routes.public.tsx` | Public route definitions |
| **NEW** | `web/src/app/router/routes.protected.tsx` | Protected route definitions |
| **NEW** | `web/src/app/providers/QueryProvider.tsx` | Query provider setup |
| **NEW** | `web/src/app/providers/ThemeProvider.tsx` | Theme provider setup |
| **NEW** | `web/src/app/store/index.ts` | Global store/state management |

### Components

#### Layout & Shared Components

| Old | New | Purpose |
|-----|-----|---------|
| `common-user-react/src/components/Sidebar.jsx` | `web/src/features/dashboard-user/components/Sidebar.tsx` | Sidebar navigation (now typed) |
| `common-user-react/src/components/Topbar.jsx` | `web/src/features/dashboard-user/components/Topbar.tsx` | Top navigation bar (now typed) |
| **NEW** | `web/src/components/ui/` | Design system components (empty - ready for reusable UI) |
| **NEW** | `web/src/components/layout/` | Layout wrapper components (empty) |
| **NEW** | `web/src/components/feedback/` | Loading/error/empty states (empty) |

### Features (Domain Modules)

#### Dashboard User Feature

| Old | New | Purpose |
|-----|-----|---------|
| `common-user-react/src/pages/HomePage.jsx` | `web/src/features/dashboard-user/pages/HomePage.tsx` | Home page (now typed) |
| `common-user-react/src/pages/DetectPage.jsx` | `web/src/features/dashboard-user/pages/DetectPage.tsx` | Water level detection (now typed) |
| `common-user-react/src/pages/MapPage.jsx` | `web/src/features/dashboard-user/pages/MapPage.tsx` | Water map visualization (now typed) |
| `common-user-react/src/pages/ComplaintPage.jsx` | `web/src/features/dashboard-user/pages/ComplaintPage.tsx` | Complaint filing (now typed) |
| `common-user-react/src/pages/TrackPage.jsx` | `web/src/features/dashboard-user/pages/TrackPage.tsx` | Complaint tracking (now typed) |
| `common-user-react/src/pages/AlertsPage.jsx` | `web/src/features/dashboard-user/pages/AlertsPage.tsx` | Alerts view (now typed) |
| `common-user-react/src/api/commonUserApi.js` | `web/src/features/dashboard-user/api/commonUserApi.ts` | API calls (now typed with interfaces) |
| `common-user-react/src/data/dashboardData.js` | `web/src/features/dashboard-user/api/dashboardData.ts` | Mock data (now exported from api folder) |

#### Other Features (Scaffolded)

| Path | Purpose |
|------|---------|
| `web/src/features/landing/` | Landing page feature (components, hooks, sections) |
| `web/src/features/landing/types.ts` | Landing page types |
| `web/src/features/landing/index.ts` | Feature barrel export |
| `web/src/features/auth/` | Authentication feature |
| `web/src/features/auth/validation.ts` | Email validation utilities |
| `web/src/features/dashboard-gov/` | Government dashboard (scaffolded) |
| `web/src/features/dashboard-admin/` | Admin dashboard (scaffolded) |

### Services (Shared Infrastructure)

| Old | New | Purpose |
|-----|-----|---------|
| `common-user-react/src/api/httpClient.js` | `web/src/services/api/client.ts` | HTTP client with axios/fetch (now typed) |
| **NEW** | `web/src/services/api/endpoints.ts` | API endpoint constants |
| **NEW** | `web/src/services/storage/` | Storage service (scaffolded) |
| **NEW** | `web/src/services/telemetry/` | Telemetry service (scaffolded) |

### Pages (Route-Level Shells)

| New | Purpose |
|---|---------|
| `web/src/pages/HomePage.tsx` | Re-exports dashboard home for routing |
| `web/src/pages/LoginPage.tsx` | Login page (stub) |
| `web/src/pages/NotFoundPage.tsx` | 404 not found page |

### Hooks (Reusable Logic)

| Path | Purpose |
|------|---------|
| `web/src/hooks/useAuth.ts` | Authentication hook (stub) |
| `web/src/hooks/useDebounce.ts` | Debounce hook |

### Utilities

| Path | Purpose |
|------|---------|
| `web/src/utils/date.ts` | Date formatting utilities |
| `web/src/utils/number.ts` | Number formatting utilities |
| `web/src/utils/geo.ts` | Geolocation utilities |

### Types (TypeScript Interfaces)

| Path | Purpose |
|------|---------|
| `web/src/types/index.ts` | Barrel export for all types |
| `web/src/types/alert.ts` | Alert data interfaces |
| `web/src/types/district.ts` | District/region interfaces |
| `web/src/types/well.ts` | Well/water point interfaces |
| `web/src/types/complaint.ts` | Complaint data interfaces |

### Styles

| Old | New | Purpose |
|-----|-----|---------|
| `common-user-react/src/styles.css` | `web/src/styles/globals.css` | Global styles |
| **NEW** | `web/src/styles/tokens.css` | Design tokens (colors, spacing) |
| **NEW** | `web/src/styles/animations.css` | Animation definitions |

### Constants

| Path | Purpose |
|------|---------|
| `web/src/constants/` | Feature flags, limits, etc. (scaffolded) |

### Testing

| Path | Purpose |
|------|---------|
| `web/src/test/setup.ts` | Test setup & mocks |
| `web/src/test/mocks/` | Mock data for tests |

### Assets (Public)

| New | Purpose |
|---|---------|
| `web/public/favicon.ico` | Favicon |
| `web/public/robots.txt` | SEO robots file |
| `web/public/images/` | Image assets |
| `web/public/icons/` | Icon assets |

---

## Summary of Organizational Changes

### Key Improvements

1. **Module Organization**
   - Features now grouped by domain (landing, auth, dashboard-user, etc.)
   - Each feature has components, pages, api, and types co-located
   - Shared code moved to services/ and hooks/

2. **Type Safety**
   - New `src/types/` folder with interface definitions
   - All API functions now fully typed
   - tsconfig strict mode enabled

3. **Routing**
   - Router layer now integrated (app/router/)
   - Public and protected route definitions separate
   - App.tsx wired to use react-router-dom

4. **Configuration**
   - TypeScript config with strict mode enabled
   - ESLint and Prettier configs added
   - Vite config set to TypeScript

5. **Static Assets**
   - Old static files preserved in `legacy/` folder
   - Clean separation between SPA and legacy pages

---

## Dependency Changes

**Added:**
- `react-router-dom: ^6.20.0` - Client-side routing

**Kept:**
- axios, chart.js, leaflet, lucide-react, react, react-chartjs-2, react-dom, react-leaflet

---

## Build Status

✅ TypeScript strict mode enabled  
✅ React Router integrated and wired  
✅ All interfaces defined  
✅ npm build completes successfully  

---

## Next Steps

1. **Environment Setup**
   - Copy `.env.example` to `.env` and fill in API endpoints

2. **Development**
   - Run `npm install` in `frontend/web`
   - Run `npm run dev` to start dev server

3. **Feature Expansion**
   - Fill in `dashboard-gov` and `dashboard-admin` features
   - Add auth implementation in `features/auth`
   - Build out landing page feature

4. **Type Coverage**
   - Add prop interfaces for components as needed
   - Use `useAuth()` hook for protected routes
