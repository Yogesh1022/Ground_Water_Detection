.PHONY: run build tidy air install-air docker-up docker-down docker-logs docker-rebuild clean phase6-gate

# ── Local dev ──────────────────────────────────────────────────────────────────
run:
	go run ./cmd/server

build:
	go build -o ./bin/server ./cmd/server

build-all:
	go build ./...

tidy:
	go mod tidy

clean:
	rm -rf ./bin ./tmp

# ── Live reload (Air) ──────────────────────────────────────────────────────────
install-air:
	go install github.com/air-verse/air@latest

air:
	air

# ── Docker ─────────────────────────────────────────────────────────────────────
docker-up:
	docker compose -f docker-compose.yml --env-file .env up -d --build

docker-down:
	docker compose -f docker-compose.yml --env-file .env down

docker-reset:
	docker compose -f docker-compose.yml --env-file .env down -v
	docker compose -f docker-compose.yml --env-file .env up -d --build

docker-logs:
	docker compose -f docker-compose.yml --env-file .env logs -f backend

docker-ps:
	docker compose -f docker-compose.yml --env-file .env ps

# ── Verification gate (Phase 6) ───────────────────────────────────────────────
phase6-gate:
	go build ./...
	powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test-api.ps1
