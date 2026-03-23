# Admin Backend Phase 0-2 Easy Check Guide

This file is a simple checklist to verify:

1. Phase 0: wiring is correct
2. Phase 1: DTOs are correct
3. Phase 2: repositories are correct

Use PowerShell.

---

## Step 1: Go to Project

```powershell
Set-Location E:\Ground_Water_Detection
```

---

## Step 2: Check DB and Redis are Running

Run:

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen
Get-NetTCPConnection -LocalPort 6379 -State Listen
```

If not running and you use Docker:

```powershell
Set-Location backend
docker compose --env-file .env up -d postgres redis
```

Important:

- If running backend directly on host, keep `POSTGRES_PORT=5432` in `backend/.env`.

---

## Step 3: Verify Phase 0 (Wiring)

Check these files:

1. `backend/cmd/server/main.go`
2. `backend/internal/handler/router.go`
3. `backend/internal/dashboard/admin/handler/routes.go`

Run quick check:

```powershell
Set-Location E:\Ground_Water_Detection\backend
rg "RegisterRoutes\(" cmd/server/main.go internal/handler/router.go internal/dashboard/admin/handler/routes.go
rg "pgxpool|redis" internal/handler/router.go internal/dashboard/admin/handler/routes.go
```

You should see:

1. `main.go` passes dbPool and redisClient
2. `router.go` accepts db and redis in RegisterRoutes
3. admin RegisterRoutes receives db and redis

If all 3 are true, Phase 0 is done.

---

## Step 4: Verify Phase 1 (DTO)

Check file:

1. `backend/internal/dashboard/admin/dto/dto.go`

Run quick check:

```powershell
Set-Location E:\Ground_Water_Detection\backend
rg "type (PaginationQuery|ListUsersQuery|ListWellsQuery|OverviewResponse|AuditLogQuery|DataSourceResponse)" internal/dashboard/admin/dto/dto.go
rg "Normalize\(|AvgDepthMbgl" internal/dashboard/admin/dto/dto.go
```

You should confirm:

1. Pagination defaults are present (`DefaultPage`, `DefaultLimit`, `MaxLimit`)
2. `Normalize()` exists
3. All major DTOs exist (users, wells, overview, settings, model, audit, data source)
4. `AvgDepthMbgl` is float64

If all 4 are true, Phase 1 is done.

---

## Step 5: Verify Phase 2 (Repository)

Check folder:

1. `backend/internal/dashboard/admin/repository`

Required files:

1. `errors.go`
2. `user_repo.go`
3. `well_repo.go`
4. `audit_repo.go`
5. `settings_repo.go`
6. `model_repo.go`

Run quick check:

```powershell
Set-Location E:\Ground_Water_Detection\backend
rg "func \(r \*UserRepo\)" internal/dashboard/admin/repository/user_repo.go
rg "func \(r \*WellRepo\)|func \(r \*AuditRepo\)|func \(r \*SettingsRepo\)|func \(r \*ModelRepo\)" internal/dashboard/admin/repository/*.go
rg "ErrNotFound" internal/dashboard/admin/repository/*.go
```

You should see methods for:

1. UserRepo: list/get/create/update/setactive/delete/countbyrole
2. WellRepo: list/create/count
3. AuditRepo: writelog/list
4. SettingsRepo: getall/upsert
5. ModelRepo: listmodels/listdatasources/getoverviewstats

If all are present, Phase 2 is done.

---

## Step 6: Format and Build

Run:

```powershell
Set-Location E:\Ground_Water_Detection\backend
gofmt -w internal/handler/router.go internal/dashboard/admin/handler/routes.go internal/dashboard/admin/dto/dto.go internal/dashboard/admin/repository/*.go cmd/server/main.go
go build ./...
```

Optional:

```powershell
go test ./...
```

If build passes, code is technically correct for Phase 0-2.

---

## Step 7: Runtime Smoke Test

At this point, admin route is still mostly stub. Only `/api/v1/admin/me` is expected.

Start backend:

```powershell
Set-Location E:\Ground_Water_Detection\backend
air
```

In another terminal, login and call admin me:

```powershell
$body = @{ email = "admin@aquavidarbha.in"; password = "Admin@12345" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/auth/login" -ContentType "application/json" -Body $body
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/v1/admin/me" -Headers $headers
```

Expected response has:

1. id
2. name
3. email
4. role

---

## Final Pass Checklist

Mark complete only if all are true:

- [ ] DB and Redis are running
- [ ] Phase 0 wiring checks passed
- [ ] Phase 1 DTO checks passed
- [ ] Phase 2 repository checks passed
- [ ] `go build ./...` passed
- [ ] login + `/api/v1/admin/me` passed

---

## Common Problems

1. Error: `cannot find main module`
   - Run commands from `backend` folder.

2. Error: PostgreSQL connection refused
   - Make sure `POSTGRES_PORT=5432` in `backend/.env`.
   - Make sure PostgreSQL is actually listening on `5432`.

3. Login fails for admin user
   - Seeded admin user/password hash may not exist correctly in DB.

4. Terminal output looks old/repeated
   - Open a fresh terminal tab and run commands again.
