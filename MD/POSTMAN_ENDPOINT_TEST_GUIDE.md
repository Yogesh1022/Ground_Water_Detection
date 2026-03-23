# Postman Endpoint Testing Guide (Step-by-Step)

This guide helps you test all API endpoints in your Postman collection in the correct order.

## 1) Prerequisites

1. Start backend services.
   - Option A (Docker):
     - `cd backend`
     - `make docker-up`
   - Option B (Local Go run):
     - `cd backend`
     - `make run`
2. Confirm API health from browser or Postman:
   - `GET http://localhost:8080/health`
3. Open Postman and ensure these are imported:
   - Collection folder: `postman/collections/Ground Water Detection`
   - Environment file: `postman/environments/local.environment.yaml`

## 2) Environment Setup (Important)

Select environment: **local**

Verify variables:
- `baseUrl = http://localhost:8080`
- `adminEmail = admin@aquavidarbha.in`
- `adminPassword = Admin@12345`
- `govEmail = gov@aquavidarbha.in`
- `govPassword = Gov@12345`
- `citizenEmail = citizen@aquavidarbha.in`
- `citizenPassword = Citizen@12345`

Token/user variables should start empty (Postman scripts will fill them):
- `adminToken`, `govToken`, `citizenToken`, `token`, `adminUserId`, `testUserId`

If you get `getaddrinfo ENOTFOUND health`, your `baseUrl` is not resolved correctly. Re-select environment `local` and save it.

## 3) Run Order (Manual Step-by-Step)

Run requests in this exact sequence.

### A. Basic Health

1. `Health` -> expected `200`
   - URL: `{{baseUrl}}/health`

### B. Admin Authentication + Auth Validation

2. `Admin Login` -> expected `200`
   - saves `adminToken`
3. `Admin Me` -> expected `200`
   - saves `adminUserId`
4. `Admin Me No Token` -> expected `401`
5. `Gov Login` -> expected `200`
   - saves `govToken`
6. `Admin Me With Gov Token` -> expected `403`
7. `Citizen Login` -> expected `200`
   - saves `citizenToken`
8. `Admin Me With Citizen Token` -> expected `403`

### C. Gov and Citizen Self Endpoints

9. `Gov Me` -> expected `200`
10. `Citizen Me` -> expected `200`

### D. Admin Dashboard + Configuration Endpoints

11. `Admin Overview` -> expected `200`
12. `Admin Users List` -> expected `200`
13. `Admin User Create` -> expected `201`
   - should save/use `testUserId` in script/body flow
14. `Admin User Get By Id` -> expected `200`
15. `Admin User Update` -> expected `200`
16. `Admin User Suspend` -> expected `200`
17. `Admin User Activate` -> expected `200`
18. `Admin User Delete` -> expected `200`
19. `Admin Self Suspend Negative` -> expected `400`
20. `Admin Self Delete Negative` -> expected `400`

### E. Domain Admin Endpoints

21. `Admin Wells List` -> expected `200`
22. `Admin Well Create` -> expected `201`
23. `Admin Models List` -> expected `200`
24. `Admin Data Sources List` -> expected `200`
25. `Admin Settings Get` -> expected `200`
26. `Admin Settings Update` -> expected `200`
27. `Admin Activity Log` -> expected `200`

## 4) Full Checklist (Mark Pass/Fail)

- [ ] Health (200)
- [ ] Admin Login (200)
- [ ] Admin Me (200)
- [ ] Admin Me No Token (401)
- [ ] Gov Login (200)
- [ ] Admin Me With Gov Token (403)
- [ ] Citizen Login (200)
- [ ] Admin Me With Citizen Token (403)
- [ ] Gov Me (200)
- [ ] Citizen Me (200)
- [ ] Admin Overview (200)
- [ ] Admin Users List (200)
- [ ] Admin User Create (201)
- [ ] Admin User Get By Id (200)
- [ ] Admin User Update (200)
- [ ] Admin User Suspend (200)
- [ ] Admin User Activate (200)
- [ ] Admin User Delete (200)
- [ ] Admin Self Suspend Negative (400)
- [ ] Admin Self Delete Negative (400)
- [ ] Admin Wells List (200)
- [ ] Admin Well Create (201)
- [ ] Admin Models List (200)
- [ ] Admin Data Sources List (200)
- [ ] Admin Settings Get (200)
- [ ] Admin Settings Update (200)
- [ ] Admin Activity Log (200)

## 5) Runner Mode (Fast Validation)

To test quickly:
1. Open Collection Runner.
2. Choose collection: `Ground Water Detection`.
3. Choose environment: `local`.
4. Run all requests in order.
5. Check failed tests and fix environment/token variables first.

## 6) Common Failures and Fixes

1. `ENOTFOUND health`
   - Cause: `{{baseUrl}}` not resolved.
   - Fix: Select `local` environment and verify `baseUrl = http://localhost:8080`.

2. `401 Unauthorized`
   - Cause: token missing/expired.
   - Fix: re-run login requests first.

3. `403 Forbidden`
   - Cause: wrong role token used.
   - Fix: make sure endpoint uses correct token variable (`adminToken`, `govToken`, `citizenToken`).

4. `404 Not Found`
   - Cause: backend route not loaded or bad URL.
   - Fix: verify backend is running and check request URL/path.

## 7) Optional CLI Smoke Test (from repo)

You can also run the API smoke test from terminal:

- `powershell -ExecutionPolicy Bypass -File .\backend\scripts\smoke-test-api.ps1`

This is useful for quick automated verification outside Postman.
