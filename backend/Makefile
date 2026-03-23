.PHONY: help run build tidy clean install-air air docker-up docker-start docker-down docker-reset docker-logs docker-ps docker-db-only

# Run `make help` to see exact commands and their use.
help:
	@echo "Local development targets:"
	@echo "  make run         -> go run ./cmd/server             (start backend without hot reload)"
	@echo "  make build       -> go build -o ./bin/server ./cmd/server (build binary)"
	@echo "  make tidy        -> go mod tidy                      (sync dependencies)"
	@echo "  make clean       -> remove ./bin and ./tmp"
	@echo "  make install-air -> go install github.com/air-verse/air@latest (install hot reload tool)"
	@echo "  make air         -> air                              (start backend with hot reload)"
	@echo ""
	@echo "Docker targets (run from backend folder):"
	@echo "  make docker-up      -> docker compose up -d --build     (build and start all services)"
	@echo "  make docker-start   -> docker compose up -d             (start existing images)"
	@echo "  make docker-db-only -> docker compose up -d postgres redis (start only DB + Redis)"
	@echo "  make docker-down    -> docker compose down              (stop all services)"
	@echo "  make docker-reset   -> docker compose down -v && docker compose up -d --build (wipe volumes and recreate)"
	@echo "  make docker-logs    -> docker compose logs -f backend   (tail backend logs)"
	@echo "  make docker-ps      -> docker compose ps                (service status)"

# Local dev
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

# Live reload (Air)
install-air:
	go install github.com/air-verse/air@latest

air:
	air

# Docker
docker-up:
	docker compose up -d --build

docker-start:
	docker compose up -d

docker-db-only:
	docker compose up -d postgres redis

docker-down:
	docker compose down

docker-reset:
	docker compose down -v
	docker compose up -d --build

docker-logs:
	docker compose logs -f backend

docker-ps:
	docker compose ps
