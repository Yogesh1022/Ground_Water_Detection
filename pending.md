# Pending Routes Report

This file is a fast route-by-route checklist for the project.

Legend:
- **Implemented + genuine** = route exists and response is driven by backend data
- **Implemented + partly hardcoded** = route exists but some fields/text are fixed, fallback, or placeholder values
- **Implemented + mostly hardcoded** = route exists but the UI is mostly demo or static text
- **Not implemented** = route is declared but no working handler/path was found

## Totals
- **Backend HTTP endpoints:** 53
- **Frontend router paths:** 7
- **Combined route entries:** 60

## Backend API Routes

### Shared
| Route | Method | State | Data source / notes |
|---|---:|---|---|
| `/health` | GET | Implemented + genuine | Static health response from backend |
| `/api/v1/auth/login` | POST | Implemented + genuine | Authenticates against `users` table and returns JWT + user profile |

### Common User Dashboard
These routes are public and do not require login.

| Route | Method | State | Data source / notes |
|---|---:|---|---|
| `/api/v1/common-user/me` | GET | Implemented + partly hardcoded | Returns `PublicProfile()` in code, not a real stored profile |
| `/api/v1/common-user/wells` | GET | Implemented + genuine | Reads from `wells` table |
| `/api/v1/common-user/wells/:id` | GET | Implemented + genuine | Reads a single well and latest reading from DB |
| `/api/v1/common-user/districts/summary` | GET | Implemented + genuine | Reads aggregated district stats |
| `/api/v1/common-user/alerts` | GET | Implemented + genuine | Reads active alerts from DB |
| `/api/v1/common-user/groundwater-readings` | GET | Implemented + genuine | Reads `well_readings` joined with `wells` |
| `/api/v1/common-user/predict` | POST | Implemented + genuine | Calls ML/prediction pipeline and stores result |
| `/api/v1/common-user/complaints` | POST | Implemented + genuine | Inserts complaint and generates tracking number |
| `/api/v1/common-user/complaints/track/:tracking` | GET | Implemented + genuine | Looks up complaint by tracking number |

### Admin Dashboard
These routes are protected by admin auth middleware.

| Route | Method | State | Data source / notes |
|---|---:|---|---|
| `/api/v1/admin/me` | GET | Implemented + genuine | Returns current admin from JWT context |
| `/api/v1/admin/overview` | GET | Implemented + genuine | Aggregates users, wells, predictions, complaints |
| `/api/v1/admin/users` | GET | Implemented + genuine | Lists users with filters/pagination |
| `/api/v1/admin/users/:id` | GET | Implemented + genuine | Reads user by id |
| `/api/v1/admin/users` | POST | Implemented + genuine | Creates user/officer |
| `/api/v1/admin/users/:id` | PUT | Implemented + genuine | Updates user |
| `/api/v1/admin/users/:id/suspend` | PUT | Implemented + genuine | Suspends user |
| `/api/v1/admin/users/:id/activate` | PUT | Implemented + genuine | Activates user |
| `/api/v1/admin/users/:id` | DELETE | Implemented + genuine | Deletes user |
| `/api/v1/admin/wells` | GET | Implemented + genuine | Lists wells |
| `/api/v1/admin/wells` | POST | Implemented + genuine | Creates well |
| `/api/v1/admin/settings` | GET | Implemented + genuine | Reads `system_settings` |
| `/api/v1/admin/settings` | PUT | Implemented + genuine | Updates settings and writes audit log |
| `/api/v1/admin/models` | GET | Implemented + genuine | Reads `ml_model_registry` |
| `/api/v1/admin/data-sources` | GET | Implemented + genuine | Reads `data_sources` |
| `/api/v1/admin/activity-log` | GET | Implemented + genuine | Reads audit log with pagination |

### Gov Dashboard
These routes are protected by gov auth middleware.

| Route | Method | State | Data source / notes |
|---|---:|---|---|
| `/api/v1/govn-user/me` | GET | Implemented + genuine | Queries `users` by JWT user id |
| `/api/v1/govn-user/overview` | GET | Implemented + genuine | Aggregates district metrics |
| `/api/v1/govn-user/requests` | GET | Implemented + genuine | Lists district complaints |
| `/api/v1/govn-user/requests/:id` | GET | Implemented + genuine | Reads complaint detail |
| `/api/v1/govn-user/requests/:id/history` | GET | Implemented + genuine | Reads complaint history from audit log |
| `/api/v1/govn-user/requests/export` | GET | Implemented + genuine | Exports complaint data; CSV path returns generated file |
| `/api/v1/govn-user/requests/:id/assign` | PUT | Implemented + genuine | Assigns complaint and writes audit log |
| `/api/v1/govn-user/requests/:id/resolve` | PUT | Implemented + genuine | Resolves complaint and writes audit log |
| `/api/v1/govn-user/requests/:id/escalate` | PUT | Implemented + genuine | Escalates complaint and writes audit log |
| `/api/v1/govn-user/districts/analytics` | GET | Implemented + genuine | Reads aggregated analytics for district |
| `/api/v1/govn-user/districts/rainfall-depth` | GET | Implemented + genuine | Reads rainfall-depth series |
| `/api/v1/govn-user/districts/summary` | GET | Implemented + genuine | Reads district summary rows |
| `/api/v1/govn-user/forecast` | GET | Implemented + genuine | Reads short forecast response |
| `/api/v1/govn-user/forecast/long` | GET | Implemented + genuine | Reads 90-day forecast series |
| `/api/v1/govn-user/forecast/shap` | GET | Implemented + genuine | Reads SHAP feature importance |
| `/api/v1/govn-user/crisis-zones` | GET | Implemented + genuine | Reads crisis zones |
| `/api/v1/govn-user/tankers` | GET | Implemented + genuine | Reads tanker routes for district |
| `/api/v1/govn-user/tankers` | POST | Implemented + genuine | Creates tanker route and writes audit log |
| `/api/v1/govn-user/tankers/:id` | PATCH | Implemented + genuine | Updates tanker route |
| `/api/v1/govn-user/tasks` | POST | Implemented + genuine | Creates task assignment and writes audit log |
| `/api/v1/govn-user/tasks/:id` | PATCH | Implemented + genuine | Updates task status |
| `/api/v1/govn-user/tasks/:id/reassign` | PATCH | Implemented + genuine | Reassigns task and writes audit log |
| `/api/v1/govn-user/tasks` | GET | Implemented + genuine | Lists district tasks with pagination |
| `/api/v1/govn-user/teams/workload` | GET | Implemented + genuine | Reads team workload summary |
| `/api/v1/govn-user/activity-log` | GET | Implemented + genuine | Reads district-filtered audit log |
| `/api/v1/govn-user/reports/generate` | POST | Implemented + genuine | Generates a report job response |

## Frontend Router Paths

| Route | State | Data source / notes |
|---|---|---|
| `/` | Implemented + mostly hardcoded | Landing page with static marketing copy and Three.js animation |
| `/login` | Implemented + partly hardcoded | Real login request, but role tab labels, demo credential copy, and UX text are static |
| `/dashboard-user` | Implemented + genuine | User dashboard shell; content fetches live API data |
| `/dashboard-user/*` | Implemented + genuine | Nested user dashboard pages |
| `/dashboard-admin` | Implemented + genuine | Admin dashboard wrapper; pages use live admin APIs |
| `/dashboard-gov` | Implemented + genuine | Gov dashboard wrapper; pages use live gov APIs |
| `*` | Implemented + genuine | 404 fallback |

## Route Status Summary

### Fully implemented and data-driven
- Most backend endpoints in all three dashboards
- Admin dashboard route
- Gov dashboard route
- User dashboard data routes like wells, alerts, groundwater readings, complaints, and predict

### Implemented but with hardcoded or placeholder values
- `/api/v1/common-user/me` returns `Public User`
- Landing page copy and hero content are static
- Login page instructional text and role labels are static
- User map popup text includes `Apr: N/A\nMay: N/A`
- User sidebar shows `Public User`
- Admin overview has `TotalDistricts: 11` hardcoded in backend service
- Some dashboard UIs use `N/A`, `No Data`, or default fallback labels when backend fields are missing

### Not implemented
- No route was found in the codebase that is declared but completely missing a handler in the current project snapshot

## Notes
- The backend schema and route handlers are present, but some UI fields still show fallback text because the backend does not yet return a matching field.
- For a real data display, the field must exist in the response and the frontend must map it directly instead of using a fixed string.
- The most important hardcoded data gap in the current code is the common-user profile endpoint, which still returns a public placeholder instead of a real user record.
