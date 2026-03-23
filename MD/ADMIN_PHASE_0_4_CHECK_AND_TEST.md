# Admin Backend Phase 0-4 Check and Endpoint Test Guide

This guide helps you validate:

1. Phase 0: dependency wiring (db + redis + route registration)
2. Phase 1: DTO and pagination contracts
3. Phase 2: repository methods
4. Phase 3: service business rules and audit behavior
5. Phase 4: full admin API endpoints

Use Windows PowerShell.

---

## Step 1: Go to workspace root

```powershell
Set-Location E:\Ground_Water_Detection
```

---

## Step 2: Ensure Postgres and Redis are available

Check listeners:

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen
Get-NetTCPConnection -LocalPort 6379 -State Listen
```

If needed, start with Docker:

```powershell
Set-Location backend
docker compose --env-file .env up -d postgres redis
Set-Location ..
```

---

## Step 3: Verify Phase 0 (wiring)

```powershell
Set-Location backend
Select-String -Path cmd/server/main.go, internal/handler/router.go, internal/dashboard/admin/handler/routes.go -Pattern "RegisterRoutes\("
Select-String -Path cmd/server/main.go, internal/handler/router.go, internal/dashboard/admin/handler/routes.go -Pattern "pgxpool|redis"
Set-Location ..
```

Expected:

1. cmd/server/main.go passes dbPool and redisClient into shared RegisterRoutes.
2. internal/handler/router.go accepts db + redis and passes them into admin RegisterRoutes.
3. admin RegisterRoutes signature accepts db + redis.

---

## Step 4: Verify Phase 1 (DTO contracts)

```powershell
Set-Location backend
Select-String -Path internal/dashboard/admin/dto/dto.go -Pattern "type PaginationQuery|type ListUsersQuery|type ListWellsQuery|type OverviewResponse|type AuditLogQuery|type DataSourceResponse"
Select-String -Path internal/dashboard/admin/dto/dto.go -Pattern "DefaultPage|DefaultLimit|MaxLimit|Normalize\(|AvgDepthMbgl"
Set-Location ..
```

Expected:

1. Pagination constants and Normalize method exist.
2. Core DTOs exist for users, wells, overview, settings, models, audit.
3. AvgDepthMbgl is float64.

---

## Step 5: Verify Phase 2 (repository layer)

```powershell
Set-Location backend
Select-String -Path internal/dashboard/admin/repository/user_repo.go -Pattern "func \(r \*UserRepo\)"
Select-String -Path internal/dashboard/admin/repository/*.go -Pattern "func \(r \*(WellRepo|AuditRepo|SettingsRepo|ModelRepo)\)"
Select-String -Path internal/dashboard/admin/repository/*.go -Pattern "ErrNotFound|UpsertBatch|WriteLog|GetOverviewStats"
Set-Location ..
```

Expected:

1. UserRepo has list/get/create/update/setactive/delete/count methods.
2. WellRepo has list/create/count.
3. AuditRepo has writelog/list.
4. SettingsRepo has getall/upsert/upsertbatch.
5. ModelRepo has listmodels/listdatasources/getoverviewstats.

---

## Step 6: Verify Phase 3 and 4 code presence

```powershell
Set-Location backend
Get-ChildItem internal/dashboard/admin/service/*.go | Select-Object Name
Select-String -Path internal/dashboard/admin/handler/routes.go -Pattern 'GET\("/overview"|GET\("/users"|POST\("/users"|PUT\("/users/:id"|DELETE\("/users/:id"|GET\("/wells"|POST\("/wells"|GET\("/settings"|PUT\("/settings"|GET\("/models"|GET\("/data-sources"|GET\("/activity-log"'
Set-Location ..
```

Expected:

1. Service files include user, well, overview, settings, model, audit.
2. Admin handler includes all Phase 4 endpoints.

---

## Step 7: Build validation

```powershell
Set-Location backend
go build ./...
go test ./...
Set-Location ..
```

Notes:

1. go test may show no test files, that is okay for now.
2. Build must pass before runtime endpoint testing.

---

## Step 8: Start backend

Run this in terminal window A:

```powershell
Set-Location E:\Ground_Water_Detection\backend
air
```

---

## Step 9: Login and token setup

Run this in terminal window B:

```powershell
$baseUrl = "http://localhost:8080"

$loginBody = @{
  email = "admin@aquavidarbha.in"
  password = "Admin@12345"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

$headers
```

Expected:

1. Token is returned.
2. No 401/403 for admin routes with this token.

---

## Step 10: Test all admin Phase 4 endpoints (PowerShell)

### 10.1 Identity

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/me" -Headers $headers
```

### 10.2 Overview

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/overview" -Headers $headers
```

### 10.3 Users list + filter

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/users?page=1&limit=10" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/users?role=gov&district=Nagpur&search=priya&active=true&page=1&limit=10" -Headers $headers
```

### 10.4 Create user (gov)

```powershell
$newUser = @{
  email = "phase4_gov_test@aq.in"
  password = "Gov@12345"
  name = "Phase4 Gov Test"
  role = "gov"
  district = "Nagpur"
  phone = "9999999999"
} | ConvertTo-Json

$created = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/admin/users" -Headers $headers -ContentType "application/json" -Body $newUser
$created
$testUserId = $created.id
```

### 10.5 Get user by id

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/users/$testUserId" -Headers $headers
```

### 10.6 Update user

```powershell
$updateUser = @{
  name = "Phase4 Gov Updated"
  district = "Wardha"
  phone = "8888888888"
} | ConvertTo-Json

Invoke-RestMethod -Method Put -Uri "$baseUrl/api/v1/admin/users/$testUserId" -Headers $headers -ContentType "application/json" -Body $updateUser
```

### 10.7 Suspend and activate user

```powershell
Invoke-RestMethod -Method Put -Uri "$baseUrl/api/v1/admin/users/$testUserId/suspend" -Headers $headers
Invoke-RestMethod -Method Put -Uri "$baseUrl/api/v1/admin/users/$testUserId/activate" -Headers $headers
```

### 10.8 Self-protection checks (must fail with 400)

```powershell
$me = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/me" -Headers $headers
$myId = $me.id

try { Invoke-RestMethod -Method Put -Uri "$baseUrl/api/v1/admin/users/$myId/suspend" -Headers $headers } catch { $_.Exception.Response.StatusCode.value__ }
try { Invoke-RestMethod -Method Delete -Uri "$baseUrl/api/v1/admin/users/$myId" -Headers $headers } catch { $_.Exception.Response.StatusCode.value__ }
```

### 10.9 Wells list and create

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/wells?page=1&limit=10" -Headers $headers

$newWell = @{
  name = "Phase4 Test Well"
  district = "Nagpur"
  taluka = "Nagpur Urban"
  village = "Test Village"
  latitude = 21.1458
  longitude = 79.0882
  well_type = "borewell"
  depth_total_m = 120.5
  aquifer_type = "basalt"
  affected_families = 42
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/admin/wells" -Headers $headers -ContentType "application/json" -Body $newWell
```

### 10.10 Settings read and update

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/settings" -Headers $headers

$settingsUpdate = @{
  settings = @{
    overview_cache_ttl_sec = 300
    admin_users_page_limit_default = 20
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Put -Uri "$baseUrl/api/v1/admin/settings" -Headers $headers -ContentType "application/json" -Body $settingsUpdate
```

### 10.11 Models and data sources

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/models" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/data-sources" -Headers $headers
```

### 10.12 Activity log

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/activity-log?page=1&limit=20" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/admin/activity-log?action=CREATE_USER&page=1&limit=20" -Headers $headers
```

### 10.13 Delete test user cleanup

```powershell
Invoke-RestMethod -Method Delete -Uri "$baseUrl/api/v1/admin/users/$testUserId" -Headers $headers
```

---

## Step 11: Postman testing flow

Your current Postman collection already includes:

1. Health
2. Admin/Gov/Citizen login
3. Admin/Gov/Citizen me
4. Admin me unauthorized and role mismatch checks

Files are under postman/collections/Ground Water Detection.

### 11.1 Open Postman local workspace

1. Open Postman app.
2. Open folder E:\Ground_Water_Detection\postman as local workspace source.
3. Select environment from postman/environments/local.environment.yaml.

### 11.2 Run existing request sequence

Run in this order:

1. Health
2. Admin Login
3. Admin Me
4. Admin Me No Token
5. Gov Login
6. Gov Me
7. Admin Me With Gov Token
8. Citizen Login
9. Citizen Me
10. Admin Me With Citizen Token

All tests should pass.

### 11.3 Run generated Phase 4 requests (already added)

The following request files are already generated in your collection:

1. Admin Overview
2. Admin Users List
3. Admin User Create
4. Admin User Get By Id
5. Admin User Update
6. Admin User Suspend
7. Admin User Activate
8. Admin Self Suspend Negative
9. Admin Self Delete Negative
10. Admin Wells List
11. Admin Well Create
12. Admin Settings Get
13. Admin Settings Update
14. Admin Models List
15. Admin Data Sources List
16. Admin Activity Log
17. Admin User Delete

Run those requests in this order after Admin Login.

Notes:

1. Authorization header is already set to Bearer {{adminToken}} in these requests.
2. Admin Me stores {{adminUserId}} automatically.
3. Admin User Create stores {{testUserId}} automatically.
4. Admin User Delete clears {{testUserId}} after cleanup.

For self-protection checks, add two negative tests expecting 400 using current admin id.

---

## Step 12: Final pass checklist

- [ ] Phase 0 wiring checks pass
- [ ] Phase 1 DTO checks pass
- [ ] Phase 2 repository checks pass
- [ ] Service layer files present and compiling
- [ ] Full admin route map present
- [ ] go build ./... passes
- [ ] Login returns token
- [ ] All Phase 4 endpoints respond with expected status
- [ ] Self-suspend and self-delete return 400
- [ ] Activity log shows write operations
- [ ] Test user cleanup done

---

## Common issues and quick fixes

1. 401 Unauthorized:
   - Token missing or expired.
   - Re-run admin login and verify Authorization header uses Bearer token.

2. 403 Forbidden:
   - Non-admin token used on admin routes.

3. 500 on create/update:
   - Database schema mismatch or seed data missing.
   - Check backend logs in air terminal.

4. Login fails:
   - Verify seeded admin email/password hash in schema and database.

5. Path errors while running commands:
   - Run go commands from E:\Ground_Water_Detection\backend.
