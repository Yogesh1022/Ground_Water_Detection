# AquaVidarbha - 10-Day Completion Task Plan (Converted From All 3 Implementation Guides)

This plan converts the following implementation guides into a single executable 10-day schedule:

- MD/IMPL_ADMIN_BACKEND.md
- MD/IMPL_USER_BACKEND.md
- MD/IMPL_GOV_BACKEND.md

Target by Day 10:

- Admin dashboard APIs complete and tested
- Common User dashboard APIs complete and tested
- Gov Officer dashboard APIs complete and tested
- Router wiring, auth, district scoping, and smoke tests complete

Total planned API coverage:

- Admin: 16 routes
- Common User: 10 routes
- Gov Officer: 15 routes

---

## Execution Rules

1. Build must pass at end of every day: go build ./...
2. Every write endpoint must create audit logs where defined in guides
3. Do not start Gov before Admin and User dependencies are done
4. Keep implementation exactly aligned with guide file structure
5. Do not change route prefixes

---

## Day 1 - Admin DTO + Repository Foundation

Source guide: MD/IMPL_ADMIN_BACKEND.md

Tasks:

- Create admin DTOs in backend/internal/dashboard/admin/dto/dto.go
- Create repositories:
	- backend/internal/dashboard/admin/repository/user_repo.go
	- backend/internal/dashboard/admin/repository/well_repo.go
	- backend/internal/dashboard/admin/repository/audit_repo.go
	- backend/internal/dashboard/admin/repository/settings_repo.go
	- backend/internal/dashboard/admin/repository/model_repo.go
- Compile check

Done when:

- All admin repository files compile and return typed DTO responses

---

## Day 2 - Admin Service + Routes (Core Delivery)

Source guide: MD/IMPL_ADMIN_BACKEND.md

Tasks:

- Create services:
	- backend/internal/dashboard/admin/service/user_service.go
	- backend/internal/dashboard/admin/service/well_service.go
	- backend/internal/dashboard/admin/service/overview_service.go
	- backend/internal/dashboard/admin/service/settings_service.go
	- backend/internal/dashboard/admin/service/model_service.go
- Replace backend/internal/dashboard/admin/handler/routes.go with full guide implementation
- Update backend/internal/handler/router.go to pass db into admin RegisterRoutes
- Run smoke tests from guide for admin login and user/well operations

Done when:

- Admin route set is fully reachable and returns valid JSON for basic flows

---

## Day 3 - Common User DTO + Repository

Source guide: MD/IMPL_USER_BACKEND.md

Tasks:

- Create common user DTOs in backend/internal/dashboard/common_user/dto/dto.go
- Create repositories:
	- backend/internal/dashboard/common_user/repository/well_repo.go
	- backend/internal/dashboard/common_user/repository/complaint_repo.go
	- backend/internal/dashboard/common_user/repository/alert_repo.go
	- backend/internal/dashboard/common_user/repository/prediction_repo.go
- Compile check

Done when:

- Citizen data-access layer compiles and complaint/prediction queries run

---

## Day 4 - Common User Services + Routes

Source guide: MD/IMPL_USER_BACKEND.md

Tasks:

- Create services:
	- backend/internal/dashboard/common_user/service/profile_service.go
	- backend/internal/dashboard/common_user/service/well_service.go
	- backend/internal/dashboard/common_user/service/complaint_service.go
	- backend/internal/dashboard/common_user/service/alert_service.go
	- backend/internal/dashboard/common_user/service/district_service.go
	- backend/internal/dashboard/common_user/service/predict_service.go
- Replace backend/internal/dashboard/common_user/handler/routes.go
- Update backend/internal/handler/router.go to pass db into common user RegisterRoutes

Done when:

- All 10 common user routes are active
- Complaint create and list works

---

## Day 5 - Prediction Integration + Config Hardening

Source guide: MD/IMPL_USER_BACKEND.md

Tasks:

- Add ML_SERVICE_URL in backend/internal/config/config.go
- Wire prediction service to use stub or ML endpoint as per guide
- Ensure prediction persistence into predictions table
- Verify district summary and wells list endpoints

Done when:

- Predict endpoint returns stable response with fallback behavior

---

## Day 6 - Gov DTO + Repository

Source guide: MD/IMPL_GOV_BACKEND.md

Tasks:

- Create gov DTOs in backend/internal/dashboard/govn_user/dto/dto.go
- Create repositories:
	- backend/internal/dashboard/govn_user/repository/complaint_repo.go
	- backend/internal/dashboard/govn_user/repository/district_repo.go
	- backend/internal/dashboard/govn_user/repository/tanker_repo.go
	- backend/internal/dashboard/govn_user/repository/task_repo.go
	- backend/internal/dashboard/govn_user/repository/audit_repo.go
- Compile check

Done when:

- Gov repository layer compiles with district-filtered queries

---

## Day 7 - Gov Services + Routes

Source guide: MD/IMPL_GOV_BACKEND.md

Tasks:

- Create services:
	- backend/internal/dashboard/govn_user/service/overview_service.go
	- backend/internal/dashboard/govn_user/service/complaint_service.go
	- backend/internal/dashboard/govn_user/service/analytics_service.go
	- backend/internal/dashboard/govn_user/service/tanker_service.go
	- backend/internal/dashboard/govn_user/service/task_service.go
- Replace backend/internal/dashboard/govn_user/handler/routes.go
- Update backend/internal/handler/router.go to pass db into gov RegisterRoutes

Done when:

- All gov endpoints are registered and protected by gov role middleware

---

## Day 8 - Gov Workflow Validation + District Scoping

Source guide: MD/IMPL_GOV_BACKEND.md

Tasks:

- Validate complaint state transitions:
	- open -> in_review
	- in_review -> in_progress
	- in_progress -> resolved
	- any -> escalated
- Validate district scoping in requests, tankers, analytics, workload
- Seed gov user and execute smoke test suite in guide

Done when:

- Gov users only access their district data
- assign/resolve/escalate all work end-to-end

---

## Day 9 - Integration Day (All Dashboards Together)

Tasks:

- Run full login flow for:
	- admin
	- citizen
	- gov
- Verify cross-dashboard dependencies:
	- Admin creates gov users
	- Citizen creates complaints
	- Gov handles complaints
- Verify audit logs for write operations
- Verify CORS and middleware behavior in unified run

Done when:

- Full lifecycle works with no manual DB patching

---

## Day 10 - Stabilization, Tests, and Release Readiness

Tasks:

- Run:
	- go build ./...
	- go test ./...
- Fix failing handlers or SQL mapping issues
- Update README backend endpoint coverage summary
- Final docker compose validation
- Tag release candidate

Done when:

- Build and tests pass
- All 41 routes are functional
- Documentation and run steps are accurate

---

## Daily Deliverable Format

At end of each day, publish:

1. Completed files list
2. Compile status
3. Smoke test status
4. Blockers and next-day carryover

---

## Final Definition of Completion

Project is complete when all are true:

- Admin guide implementation done
- User guide implementation done
- Gov guide implementation done
- Router and config updates done
- End-to-end role flows verified
- Build and tests green
