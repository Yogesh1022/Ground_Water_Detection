# AquaVidarbha — Go Backend & Python ML Microservice Roadmap

> **Goal:** Replace the monolithic Python FastAPI backend with a production-grade **Go (Gin/Fiber) API Gateway + Python ML Microservice** architecture. The Go service owns routing, auth, caching, data access, and orchestration. The Python service owns ML inference only.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                       │
│   React Dashboard  ·  Farmer Mobile App  ·  Admin Panel  ·  3rd Party  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     GO API GATEWAY  (Port 8080)                         │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Auth &   │  │  Rate    │  │  Request  │  │  CORS /  │  │ Logging │ │
│  │  JWT MW   │  │  Limiter │  │ Validator │  │  Helmet  │  │ & Trace │ │
│  └──────────┘  └──────────┘  └───────────┘  └──────────┘  └─────────┘ │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        ROUTE HANDLERS                             │  │
│  │  /api/v1/predict   /api/v1/wells   /api/v1/districts             │  │
│  │  /api/v1/weather   /api/v1/models  /api/v1/auth                  │  │
│  │  /api/v1/admin     /api/v1/ws      /api/v1/health                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Well     │  │  Weather  │  │  Spatial     │  │  Prediction      │ │
│  │  Service  │  │  Service  │  │  Service     │  │  Orchestrator    │ │
│  │           │  │  (fetch)  │  │  (KNN+IDW)   │  │  (calls Python) │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘  └────────┬─────────┘ │
│        │              │               │                     │           │
│  ┌─────▼──────────────▼───────────────▼─────────────────────▼─────────┐ │
│  │              PostgreSQL + PostGIS  ·  Redis Cache                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────┬───────────────────────────┘
                                               │ gRPC (Port 50051)
                                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  PYTHON ML MICROSERVICE  (Port 50051)                    │
│                                                                          │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  gRPC Server  │  │  Model       │  │  Feature     │  │  SHAP      │ │
│  │  (grpcio)     │  │  Registry    │  │  Pipeline    │  │  Explainer │ │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│          │                 │                  │                │         │
│  ┌───────▼─────────────────▼──────────────────▼────────────────▼──────┐ │
│  │  XGBoost  ·  LSTM  ·  GRU  ·  1D-CNN  ·  CNN-LSTM  ·  RF        │ │
│  │  (loaded in memory at startup, warm inference)                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Communication Protocol

| Path | Protocol | Why |
|------|----------|-----|
| Client → Go Gateway | **REST (JSON) over HTTPS** | Browser-friendly, standard |
| Client → Go Gateway (live) | **WebSocket** | Real-time well alerts |
| Go Gateway → Python ML | **gRPC (Protobuf)** | ~10x faster than REST, typed contracts, streaming support |
| Go Gateway → PostgreSQL | **pgx driver** | Fastest Go Postgres driver |
| Go Gateway → Redis | **go-redis** | Caching predictions, rate limiting |
| Go Gateway → External APIs | **net/http client** | Open-Meteo, NASA POWER, CHIRPS |

---

## Directory Structure (Final Target)

```
aquavidarbha-backend/
├── cmd/
│   └── server/
│       └── main.go                  # Entry point
├── internal/
│   ├── config/
│   │   └── config.go                # Env/YAML config loader
│   ├── middleware/
│   │   ├── auth.go                  # JWT middleware
│   │   ├── cors.go                  # CORS config
│   │   ├── ratelimit.go             # Token bucket rate limiter
│   │   ├── logger.go                # Structured request logging
│   │   └── recovery.go              # Panic recovery
│   ├── handler/
│   │   ├── predict.go               # POST /api/v1/predict
│   │   ├── well.go                  # GET /api/v1/wells, /api/v1/wells/:id
│   │   ├── district.go              # GET /api/v1/districts/:name
│   │   ├── weather.go               # GET /api/v1/weather/:lat/:lon
│   │   ├── model_status.go          # GET /api/v1/models/status
│   │   ├── auth.go                  # POST /api/v1/auth/login, /register
│   │   ├── admin.go                 # Admin-only endpoints
│   │   ├── ws.go                    # WebSocket handler
│   │   └── health.go                # GET /health, /ready
│   ├── service/
│   │   ├── prediction.go            # Orchestrates KNN→IDW→gRPC→ensemble
│   │   ├── spatial.go               # KNN neighbor search + IDW interpolation
│   │   ├── weather.go               # Open-Meteo / NASA POWER fetcher
│   │   ├── well.go                  # Well CRUD logic
│   │   ├── district.go              # District aggregation logic
│   │   ├── auth.go                  # JWT token generation/validation
│   │   └── notifier.go              # WebSocket alert broadcaster
│   ├── repository/
│   │   ├── well_repo.go             # Well DB queries
│   │   ├── prediction_repo.go       # Prediction history storage
│   │   ├── user_repo.go             # User DB queries
│   │   └── district_repo.go         # District aggregate queries
│   ├── model/
│   │   ├── well.go                  # Well struct
│   │   ├── prediction.go            # Prediction request/response structs
│   │   ├── user.go                  # User struct
│   │   ├── district.go              # District struct
│   │   └── weather.go               # Weather data struct
│   ├── grpcclient/
│   │   └── ml_client.go             # gRPC client to Python ML service
│   ├── cache/
│   │   └── redis.go                 # Redis wrapper (prediction cache, rate limit)
│   └── spatial/
│       ├── knn.go                   # K-Nearest Neighbor well search
│       └── idw.go                   # Inverse Distance Weighting interpolation
├── proto/
│   └── prediction.proto             # gRPC service definition
├── migrations/
│   ├── 001_create_wells.up.sql
│   ├── 001_create_wells.down.sql
│   ├── 002_create_predictions.up.sql
│   ├── 003_create_users.up.sql
│   └── ...
├── pkg/
│   ├── validator/
│   │   └── validator.go             # Input validation helpers
│   └── response/
│       └── response.go              # Standard JSON response builder
├── scripts/
│   ├── seed_wells.go                # Import CSV well data into PostgreSQL
│   └── generate_proto.sh            # Protobuf code gen script
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── go.mod
├── go.sum
└── .env.example
```

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── server.py                    # gRPC server entry point
│   ├── service.py                   # Prediction logic (load models, run ensemble)
│   ├── feature_pipeline.py          # Build 25-feature vector from raw inputs
│   ├── model_registry.py            # Load/manage XGBoost, LSTM, GRU, CNN, RF
│   ├── explainer.py                 # SHAP explanations
│   └── config.py                    # Model paths, weights, thresholds
├── proto/
│   └── prediction.proto             # Same proto as Go side
├── models/                          # Symlink or copy of saved_models/
│   ├── xgboost_best.json
│   ├── lstm_best.keras
│   └── ...
├── requirements.txt
├── Dockerfile
└── tests/
    ├── test_feature_pipeline.py
    └── test_predictions.py
```

---

## Phase 0 — Foundation & Tooling Setup

**Duration: Day 1–2**

### Step 0.1: Install Go & Toolchain

```bash
# Install Go 1.22+ (latest stable)
# Verify
go version

# Install essential tools
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
go install github.com/air-verse/air@latest           # Hot reload
go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest  # DB migrations
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest  # Linter
```

### Step 0.2: Initialize Go Module

```bash
mkdir aquavidarbha-backend && cd aquavidarbha-backend
go mod init github.com/yourusername/aquavidarbha-backend
```

### Step 0.3: Install Core Dependencies

```bash
# Web framework (pick ONE)
go get github.com/gin-gonic/gin              # Option A — Most popular, battle-tested
# go get github.com/gofiber/fiber/v2          # Option B — Faster, Express-like

# Database
go get github.com/jackc/pgx/v5               # PostgreSQL driver (fastest)
go get github.com/jackc/pgx/v5/pgxpool        # Connection pool

# Redis
go get github.com/redis/go-redis/v9

# gRPC
go get google.golang.org/grpc
go get google.golang.org/protobuf

# Auth
go get github.com/golang-jwt/jwt/v5

# Config
go get github.com/spf13/viper                # YAML/env config
# OR
go get github.com/caarlos0/env/v11            # Struct-based env config

# Validation
go get github.com/go-playground/validator/v10

# Logging
go get go.uber.org/zap                        # Structured logger

# Migration
go get github.com/golang-migrate/migrate/v4

# Testing
go get github.com/stretchr/testify
```

### Step 0.4: Docker Infrastructure

```yaml
# docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: aquavidarbha
      POSTGRES_USER: aqua
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --requirepass ${REDIS_PASSWORD}

  ml-service:
    build: ../ml-service
    ports: ["50051:50051"]
    volumes: ["../saved_models:/app/models:ro"]
    deploy:
      resources:
        limits: { memory: 4G }

volumes:
  pgdata:
```

### Step 0.5: Makefile

```makefile
.PHONY: run build test lint migrate proto seed docker

run:
	air

build:
	go build -o bin/server ./cmd/server

test:
	go test ./... -v -race -cover

lint:
	golangci-lint run ./...

migrate-up:
	migrate -path migrations -database "postgres://aqua:$(DB_PASSWORD)@localhost:5432/aquavidarbha?sslmode=disable" up

migrate-down:
	migrate -path migrations -database "postgres://aqua:$(DB_PASSWORD)@localhost:5432/aquavidarbha?sslmode=disable" down 1

proto:
	protoc --go_out=. --go-grpc_out=. proto/prediction.proto

seed:
	go run scripts/seed_wells.go

docker:
	docker compose up -d
```

### Deliverable:
- [x] Go module initialized, all deps installed
- [x] PostgreSQL + PostGIS + Redis running via Docker
- [x] Hot-reload dev loop working (`air`)
- [x] Makefile with all common commands

---

## Phase 1 — Config, Logging & Server Skeleton

**Duration: Day 2–3**

### Step 1.1: Config Loader (`internal/config/config.go`)

```go
package config

import "github.com/caarlos0/env/v11"

type Config struct {
    Server   ServerConfig
    DB       DBConfig
    Redis    RedisConfig
    ML       MLConfig
    JWT      JWTConfig
}

type ServerConfig struct {
    Port         int    `env:"SERVER_PORT" envDefault:"8080"`
    Environment  string `env:"ENVIRONMENT" envDefault:"development"`
    ReadTimeout  int    `env:"READ_TIMEOUT" envDefault:"10"`
    WriteTimeout int    `env:"WRITE_TIMEOUT" envDefault:"10"`
}

type DBConfig struct {
    Host     string `env:"DB_HOST" envDefault:"localhost"`
    Port     int    `env:"DB_PORT" envDefault:"5432"`
    User     string `env:"DB_USER" envDefault:"aqua"`
    Password string `env:"DB_PASSWORD,required"`
    Name     string `env:"DB_NAME" envDefault:"aquavidarbha"`
    SSLMode  string `env:"DB_SSLMODE" envDefault:"disable"`
    MaxConns int    `env:"DB_MAX_CONNS" envDefault:"25"`
}

type RedisConfig struct {
    Addr     string `env:"REDIS_ADDR" envDefault:"localhost:6379"`
    Password string `env:"REDIS_PASSWORD"`
    DB       int    `env:"REDIS_DB" envDefault:"0"`
}

type MLConfig struct {
    GRPCAddr string `env:"ML_GRPC_ADDR" envDefault:"localhost:50051"`
}

type JWTConfig struct {
    Secret     string `env:"JWT_SECRET,required"`
    ExpiryHrs  int    `env:"JWT_EXPIRY_HRS" envDefault:"24"`
}

func Load() (*Config, error) {
    cfg := &Config{}
    return cfg, env.Parse(cfg)
}
```

### Step 1.2: Structured Logger (`internal/middleware/logger.go`)

```go
// Use zap for structured JSON logging
// Log: method, path, status, latency, client IP, request ID
// Redact sensitive fields (passwords, tokens)
```

### Step 1.3: Entry Point (`cmd/server/main.go`)

```go
package main

func main() {
    // 1. Load config
    // 2. Init logger (zap)
    // 3. Connect PostgreSQL pool
    // 4. Connect Redis
    // 5. Connect gRPC ML client
    // 6. Init repositories → services → handlers
    // 7. Setup Gin router + middleware
    // 8. Register routes
    // 9. Graceful shutdown (os.Signal)
    // 10. ListenAndServe
}
```

### Step 1.4: Graceful Shutdown Pattern

```go
// Listen for SIGINT/SIGTERM
// Give 10s for in-flight requests to complete
// Close DB pool, Redis, gRPC connections
// Flush logger
```

### Deliverable:
- [x] Server starts, loads config from `.env`
- [x] Structured JSON logging on every request
- [x] Graceful shutdown with connection cleanup
- [x] Health check endpoint returns `200 OK`

---

## Phase 2 — Database Schema & Migrations

**Duration: Day 3–4**

### Step 2.1: Wells Table

```sql
-- migrations/001_create_wells.up.sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE wells (
    id           BIGSERIAL PRIMARY KEY,
    well_id      VARCHAR(50) UNIQUE NOT NULL,
    district     VARCHAR(100) NOT NULL,
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    elevation_m  DOUBLE PRECISION,
    slope_degree DOUBLE PRECISION,
    soil_type    VARCHAR(50),
    geom         GEOMETRY(Point, 4326),  -- PostGIS spatial index
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for KNN queries
CREATE INDEX idx_wells_geom ON wells USING GIST(geom);
CREATE INDEX idx_wells_district ON wells(district);

-- Auto-populate geom from lat/lon
CREATE OR REPLACE FUNCTION update_well_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_well_geom
    BEFORE INSERT OR UPDATE ON wells
    FOR EACH ROW EXECUTE FUNCTION update_well_geom();
```

### Step 2.2: Well Readings Table

```sql
-- migrations/002_create_well_readings.up.sql
CREATE TABLE well_readings (
    id                   BIGSERIAL PRIMARY KEY,
    well_id              VARCHAR(50) NOT NULL REFERENCES wells(well_id),
    date                 DATE NOT NULL,
    year                 INT NOT NULL,
    month                INT NOT NULL,
    depth_mbgl           DOUBLE PRECISION NOT NULL,
    rainfall_mm          DOUBLE PRECISION,
    temperature_avg      DOUBLE PRECISION,
    humidity             DOUBLE PRECISION,
    evapotranspiration   DOUBLE PRECISION,
    soil_moisture_index  DOUBLE PRECISION,
    ndvi                 DOUBLE PRECISION,
    rainfall_lag_1m      DOUBLE PRECISION,
    rainfall_lag_2m      DOUBLE PRECISION,
    rainfall_lag_3m      DOUBLE PRECISION,
    rainfall_rolling_3m  DOUBLE PRECISION,
    rainfall_rolling_6m  DOUBLE PRECISION,
    rainfall_deficit     DOUBLE PRECISION,
    cumulative_deficit   DOUBLE PRECISION,
    temp_rainfall_ratio  DOUBLE PRECISION,
    depth_lag_1q         DOUBLE PRECISION,
    depth_lag_2q         DOUBLE PRECISION,
    depth_change_rate    DOUBLE PRECISION,
    season_encoded       INT,
    district_encoded     INT,
    soil_type_encoded    INT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(well_id, date)
);

CREATE INDEX idx_readings_well_date ON well_readings(well_id, date DESC);
CREATE INDEX idx_readings_date ON well_readings(date);
CREATE INDEX idx_readings_district ON well_readings(well_id, year, month);
```

### Step 2.3: Predictions History Table

```sql
-- migrations/003_create_predictions.up.sql
CREATE TABLE predictions (
    id              BIGSERIAL PRIMARY KEY,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    target_month    INT NOT NULL,
    target_year     INT NOT NULL,
    depth_mbgl      DOUBLE PRECISION NOT NULL,
    depth_feet      DOUBLE PRECISION NOT NULL,
    risk_level      VARCHAR(20) NOT NULL,
    confidence      DOUBLE PRECISION,
    model_source    TEXT,           -- "Ensemble (XGB 0.30 + LSTM 0.25 + ...)"
    explanation     TEXT,
    recommendation  TEXT,
    nearest_wells   JSONB,         -- [{well_id, distance_km, weight}]
    user_id         BIGINT REFERENCES users(id),
    latency_ms      INT
);

CREATE INDEX idx_predictions_location ON predictions(latitude, longitude);
CREATE INDEX idx_predictions_risk ON predictions(risk_level);
CREATE INDEX idx_predictions_date ON predictions(requested_at DESC);
```

### Step 2.4: Users Table

```sql
-- migrations/004_create_users.up.sql
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'user',  -- user, admin, official
    district      VARCHAR(100),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### Step 2.5: Seed Script

```go
// scripts/seed_wells.go
// Read data/vidarbha_groundwater_extended_v2.csv
// Extract unique wells → INSERT INTO wells
// Insert all readings → COPY INTO well_readings (bulk)
// Use pgx CopyFrom for high-speed bulk insert (~84K rows in <5s)
```

### Deliverable:
- [x] All migrations created and applied
- [x] PostGIS extension + spatial index active
- [x] CSV data seeded into PostgreSQL
- [x] Can run `SELECT * FROM wells WHERE ST_DWithin(geom, ST_MakePoint(79.09, 21.15)::geography, 50000)` and get nearby wells

---

## Phase 3 — Domain Models & Repository Layer

**Duration: Day 4–6**

### Step 3.1: Domain Models (`internal/model/`)

```go
// well.go
type Well struct {
    ID          int64    `json:"id" db:"id"`
    WellID      string   `json:"well_id" db:"well_id"`
    District    string   `json:"district" db:"district"`
    Latitude    float64  `json:"latitude" db:"latitude"`
    Longitude   float64  `json:"longitude" db:"longitude"`
    ElevationM  float64  `json:"elevation_m" db:"elevation_m"`
    SlopeDegree float64  `json:"slope_degree" db:"slope_degree"`
    DistanceKm  float64  `json:"distance_km,omitempty"` // populated in KNN results
}

// prediction.go
type PredictRequest struct {
    Latitude  float64 `json:"latitude" validate:"required,min=-90,max=90"`
    Longitude float64 `json:"longitude" validate:"required,min=-180,max=180"`
    Month     int     `json:"month" validate:"required,min=1,max=12"`
    Year      int     `json:"year" validate:"required,min=2010,max=2030"`
}

type PredictResponse struct {
    DepthMBGL      float64          `json:"depth_mbgl"`
    DepthFeet      float64          `json:"depth_feet"`
    RiskLevel      string           `json:"risk_level"`
    Confidence     float64          `json:"confidence"`
    ModelSource    string           `json:"model_source"`
    Explanation    string           `json:"explanation"`
    Recommendation string           `json:"recommendation"`
    NearestWells   []NearestWell    `json:"nearest_wells"`
    LatencyMs      int              `json:"latency_ms"`
}

type NearestWell struct {
    WellID     string  `json:"well_id"`
    District   string  `json:"district"`
    DistanceKm float64 `json:"distance_km"`
    Weight     float64 `json:"weight"` // IDW weight
    DepthMBGL  float64 `json:"depth_mbgl"` // latest reading
}
```

### Step 3.2: Repository Interfaces

```go
// repository/well_repo.go
type WellRepository interface {
    GetAll(ctx context.Context) ([]model.Well, error)
    GetByID(ctx context.Context, wellID string) (*model.Well, error)
    GetByDistrict(ctx context.Context, district string) ([]model.Well, error)
    FindKNearest(ctx context.Context, lat, lon float64, k int, radiusKm float64) ([]model.Well, error)
    GetLatestReading(ctx context.Context, wellID string) (*model.WellReading, error)
    GetReadings(ctx context.Context, wellID string, limit int) ([]model.WellReading, error)
}
```

### Step 3.3: PostGIS KNN Query (this is the key spatial query)

```go
func (r *wellRepo) FindKNearest(ctx context.Context, lat, lon float64, k int, radiusKm float64) ([]model.Well, error) {
    query := `
        SELECT well_id, district, latitude, longitude, elevation_m, slope_degree,
               ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) / 1000.0 AS distance_km
        FROM wells
        WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
        ORDER BY geom <-> ST_MakePoint($1, $2)::geometry
        LIMIT $4
    `
    // $1=lon, $2=lat, $3=radiusKm*1000 (meters), $4=k
    // The <-> operator uses the GIST index for fast KNN
}
```

### Step 3.4: Repository Implementation Pattern

```
For each repository:
1. Define interface in repository/ package
2. Implement with pgxpool.Pool
3. Use context.Context for cancellation
4. Return domain model types (not DB rows)
5. Handle pgx.ErrNoRows → custom NotFoundError
6. Write table-driven tests with testcontainers-go (real PostgreSQL)
```

### Deliverable:
- [x] All domain models defined with JSON + validation tags
- [x] Repository interfaces defined
- [x] PostgreSQL implementations with PostGIS KNN
- [x] Unit tests passing with real DB (testcontainers)

---

## Phase 4 — gRPC Proto & Python ML Microservice

**Duration: Day 6–9**

### Step 4.1: Define Protobuf Contract (`proto/prediction.proto`)

```protobuf
syntax = "proto3";
package aquavidarbha.ml;
option go_package = "github.com/yourusername/aquavidarbha-backend/proto/ml";

service MLPredictionService {
    // Single prediction with all 6 models
    rpc Predict(PredictionRequest) returns (PredictionResponse);

    // Health check
    rpc ModelStatus(Empty) returns (ModelStatusResponse);
}

message Empty {}

message PredictionRequest {
    // Meteorological
    double rainfall_mm = 1;
    double temperature_avg = 2;
    double humidity = 3;
    double evapotranspiration = 4;

    // Lag features (interpolated by Go from nearest wells)
    double rainfall_lag_1m = 5;
    double rainfall_lag_2m = 6;
    double rainfall_lag_3m = 7;
    double depth_lag_1q = 8;
    double depth_lag_2q = 9;

    // Rolling aggregates
    double rainfall_rolling_3m = 10;
    double rainfall_rolling_6m = 11;

    // Stress indicators
    double rainfall_deficit = 12;
    double cumulative_deficit = 13;
    double temp_rainfall_ratio = 14;

    // Temporal
    int32 month = 15;
    int32 season_encoded = 16;

    // Geospatial
    double latitude = 17;
    double longitude = 18;
    double elevation_m = 19;
    double slope_degree = 20;
    int32 district_encoded = 21;

    // Vegetation & Soil
    double soil_moisture_index = 22;
    double ndvi = 23;
    int32 soil_type_encoded = 24;

    // Interaction
    double rainfall_x_soilmoist = 25;

    // Routing hint
    string prediction_path = 26; // "EXACT_WELL", "IDW_INTERPOLATED", "ENVIRONMENTAL_ONLY"
}

message ModelPrediction {
    string model_name = 1;   // "xgboost", "lstm", "gru", "cnn", "cnn_lstm", "random_forest"
    double depth_mbgl = 2;
    double confidence = 3;
    double weight = 4;       // Ensemble weight
    int32 latency_ms = 5;
}

message PredictionResponse {
    double ensemble_depth_mbgl = 1;
    string risk_level = 2;            // SAFE, WARNING, CRITICAL, EXTREME
    double confidence = 3;
    repeated ModelPrediction model_results = 4;
    map<string, double> feature_importance = 5;  // SHAP top-10
    string explanation = 6;
    string recommendation = 7;
    int32 total_latency_ms = 8;
}

message ModelStatusResponse {
    message ModelInfo {
        string name = 1;
        bool ready = 2;
        string version = 3;
        double r_squared = 4;
    }
    repeated ModelInfo models = 1;
    bool ensemble_ready = 2;
}
```

### Step 4.2: Generate Code

```bash
# Go side
protoc --go_out=. --go-grpc_out=. proto/prediction.proto

# Python side
python -m grpc_tools.protoc -Iproto --python_out=ml-service/proto --grpc_python_out=ml-service/proto proto/prediction.proto
```

### Step 4.3: Python ML Service — Server (`ml-service/app/server.py`)

```python
"""
gRPC server that loads all 6 models at startup and serves predictions.
Key design decisions:
  - Models loaded ONCE at startup into GPU/CPU memory
  - Thread pool executor for concurrent requests
  - Feature pipeline builds numpy arrays from proto fields
  - Ensemble weights: XGB(0.30) + LSTM(0.25) + CNN-LSTM(0.20) + GRU(0.15) + 1D-CNN(0.10)
"""
import grpc
from concurrent import futures
# ... setup gRPC server on port 50051
```

### Step 4.4: Python ML Service — Model Registry (`ml-service/app/model_registry.py`)

```
Responsibilities:
  1. Load xgboost_best.json → XGBoost Booster
  2. Load lstm_best.keras → TensorFlow model (with custom AttnSoftmax, AttnContext)
  3. Load random_forest model
  4. (Future: GRU, 1D-CNN, CNN-LSTM)
  5. Expose predict(model_name, features) → float
  6. Expose predict_ensemble(features) → (depth, confidence, per_model_results)
  7. Handle model versioning (reload on SIGHUP)
```

### Step 4.5: Python ML Service — Feature Pipeline (`ml-service/app/feature_pipeline.py`)

```
Responsibilities:
  1. Receive raw proto fields → build ordered numpy array (25 features)
  2. Apply MinMaxScaler (loaded from training artifacts) for LSTM/DL models
  3. Apply log1p transform on target for LSTM
  4. Reshape to (1, 12, 27) for sequence models (pad with historical data)
  5. Keep flat (1, 25) for XGBoost/RF
```

### Step 4.6: Go gRPC Client (`internal/grpcclient/ml_client.go`)

```go
type MLClient struct {
    conn   *grpc.ClientConn
    client ml.MLPredictionServiceClient
}

func NewMLClient(addr string) (*MLClient, error) {
    conn, err := grpc.Dial(addr,
        grpc.WithTransportCredentials(insecure.NewCredentials()), // Use TLS in prod
        grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(10<<20)),
        grpc.WithKeepaliveParams(keepalive.ClientParameters{
            Time:                10 * time.Second,
            Timeout:             3 * time.Second,
            PermitWithoutStream: true,
        }),
    )
    // ...
}

func (c *MLClient) Predict(ctx context.Context, req *ml.PredictionRequest) (*ml.PredictionResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    return c.client.Predict(ctx, req)
}
```

### Deliverable:
- [x] Proto contract defined and code generated for both Go and Python
- [x] Python gRPC server loads all models, serves predictions
- [x] Go gRPC client can call Python service
- [x] `grpcurl` or test confirms end-to-end gRPC call works

---

## Phase 5 — Service Layer (Business Logic)

**Duration: Day 9–13**

### Step 5.1: Spatial Service (`internal/service/spatial.go`)

```
The spatial service is the CORE of the prediction pipeline.

Algorithm:
1. Input: (lat, lon)
2. Query PostGIS: Find K=5 nearest wells within 50km radius
3. For each well: fetch latest reading (depth_lag_1q, depth_lag_2q, etc.)
4. Apply IDW interpolation:
   - weight_i = 1 / distance_i^2
   - interpolated_value = Σ(weight_i × value_i) / Σ(weight_i)
5. Determine prediction path:
   - Distance < 1km to a known well → EXACT_WELL (use that well's readings directly)
   - Found 3+ wells within 50km → IDW_INTERPOLATED
   - Found < 3 wells → ENVIRONMENTAL_ONLY (no depth lags)
6. Return: interpolated features + prediction path + neighbor metadata
```

### Step 5.2: Weather Service (`internal/service/weather.go`)

```
Responsibilities:
1. Fetch LIVE weather from Open-Meteo API (free, no key needed):
   GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=...
2. Fetch historical monthly averages from stored data or NASA POWER API
3. Compute derived features:
   - rainfall_rolling_3m = avg(last 3 months rainfall)
   - rainfall_rolling_6m = avg(last 6 months rainfall)
   - rainfall_deficit = long_term_avg - current_rainfall
   - cumulative_deficit = sum of deficits over last 6 months
   - temp_rainfall_ratio = temperature / max(rainfall, 0.1)
4. Cache responses in Redis (TTL: 6 hours for live, 30 days for historical)
```

### Step 5.3: Prediction Orchestrator (`internal/service/prediction.go`)

```
This is the main pipeline that ties everything together:

func (s *PredictionService) Predict(ctx context.Context, req model.PredictRequest) (*model.PredictResponse, error) {
    start := time.Now()

    // 1. Find nearest wells (spatial service)
    neighbors, path := s.spatial.FindNeighbors(ctx, req.Latitude, req.Longitude)

    // 2. Get latest readings for nearest wells
    readings := s.spatial.InterpolateFeatures(ctx, neighbors)

    // 3. Fetch weather data
    weather := s.weather.GetFeatures(ctx, req.Latitude, req.Longitude, req.Month, req.Year)

    // 4. Build 25-feature gRPC request
    grpcReq := buildGRPCRequest(readings, weather, req, path)

    // 5. Check Redis cache
    cacheKey := fmt.Sprintf("pred:%f:%f:%d:%d", req.Latitude, req.Longitude, req.Month, req.Year)
    if cached := s.cache.Get(ctx, cacheKey); cached != nil {
        return cached, nil
    }

    // 6. Call Python ML service via gRPC
    mlResp := s.mlClient.Predict(ctx, grpcReq)

    // 7. Build response
    resp := &model.PredictResponse{
        DepthMBGL:      mlResp.EnsembleDepthMbgl,
        DepthFeet:      mlResp.EnsembleDepthMbgl * 3.28084,
        RiskLevel:      mlResp.RiskLevel,
        Confidence:     mlResp.Confidence,
        ModelSource:    formatModelSource(mlResp.ModelResults),
        Explanation:    mlResp.Explanation,
        Recommendation: generateRecommendation(mlResp.RiskLevel, req.Month),
        NearestWells:   formatNeighbors(neighbors),
        LatencyMs:      int(time.Since(start).Milliseconds()),
    }

    // 8. Cache result (TTL: 1 hour)
    s.cache.Set(ctx, cacheKey, resp, 1*time.Hour)

    // 9. Store in predictions history (async)
    go s.predRepo.Store(context.Background(), resp)

    return resp, nil
}
```

### Step 5.4: Auth Service (`internal/service/auth.go`)

```
Responsibilities:
1. Register: validate email + hash password (bcrypt, cost 12) + store user
2. Login: verify credentials → generate JWT (HS256, 24hr expiry)
3. JWT contains: {user_id, email, role, exp}
4. Role-based access: user, official, admin
```

### Step 5.5: District Service (`internal/service/district.go`)

```
Responsibilities:
1. Aggregate latest readings per district
2. Return: avg depth, well count, risk distribution, trend (last 6 months)
3. Cache per-district metrics (TTL: 15 minutes)
```

### Deliverable:
- [x] Spatial service does PostGIS KNN + IDW interpolation
- [x] Weather service fetches Open-Meteo + computes derived features
- [x] Prediction orchestrator chains spatial → weather → gRPC → response
- [x] Auth service issues/validates JWT
- [x] All services tested with mocks

---

## Phase 6 — HTTP Handlers & Routing

**Duration: Day 13–16**

### Step 6.1: Router Setup

```go
func SetupRouter(h *handler.Handlers, mw *middleware.Middleware) *gin.Engine {
    r := gin.New()

    // Global middleware
    r.Use(mw.Recovery())
    r.Use(mw.Logger())
    r.Use(mw.CORS())
    r.Use(mw.RateLimiter(100, time.Minute))  // 100 req/min

    // Health
    r.GET("/health", h.Health.Liveness)
    r.GET("/ready", h.Health.Readiness)

    // API v1
    v1 := r.Group("/api/v1")
    {
        // Public
        auth := v1.Group("/auth")
        {
            auth.POST("/register", h.Auth.Register)
            auth.POST("/login", h.Auth.Login)
        }

        // Authenticated
        api := v1.Group("")
        api.Use(mw.Auth())
        {
            api.POST("/predict", h.Predict.Create)
            api.GET("/predict/history", h.Predict.History)

            api.GET("/wells", h.Well.List)
            api.GET("/wells/:id", h.Well.Get)
            api.GET("/wells/:id/readings", h.Well.Readings)

            api.GET("/districts", h.District.List)
            api.GET("/districts/:name", h.District.Get)

            api.GET("/weather/:lat/:lon", h.Weather.Get)

            api.GET("/models/status", h.ModelStatus.Get)

            api.GET("/ws", h.WS.Connect)  // WebSocket
        }

        // Admin only
        admin := v1.Group("/admin")
        admin.Use(mw.Auth(), mw.RequireRole("admin"))
        {
            admin.POST("/wells", h.Well.Create)
            admin.PUT("/wells/:id", h.Well.Update)
            admin.POST("/wells/import", h.Well.BulkImport)
            admin.GET("/predictions/stats", h.Predict.Stats)
            admin.GET("/users", h.Auth.ListUsers)
        }
    }

    return r
}
```

### Step 6.2: Predict Handler (`internal/handler/predict.go`)

```go
func (h *PredictHandler) Create(c *gin.Context) {
    var req model.PredictRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        // Return 400 with validation errors
    }

    // Validate coordinates are within Vidarbha bounding box
    // Lat: 19.5 - 22.0, Lon: 75.5 - 81.0
    if !isWithinVidarbha(req.Latitude, req.Longitude) {
        // Return 422 "Coordinates outside Vidarbha region"
    }

    resp, err := h.predictionService.Predict(c.Request.Context(), req)
    if err != nil {
        // Handle timeout, ML service down, etc.
    }

    c.JSON(200, resp)
}
```

### Step 6.3: Standard Response Format

```go
// pkg/response/response.go
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *APIError   `json:"error,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

type Meta struct {
    Page       int `json:"page,omitempty"`
    PerPage    int `json:"per_page,omitempty"`
    Total      int `json:"total,omitempty"`
    LatencyMs  int `json:"latency_ms,omitempty"`
}
```

### Step 6.4: Middleware Stack

| Middleware | Purpose |
|-----------|---------|
| `Recovery` | Catch panics, log stack trace, return 500 |
| `Logger` | Log every request with structured fields |
| `CORS` | Allow frontend origins |
| `RateLimiter` | Token bucket per IP (Redis-backed) |
| `Auth` | Validate JWT, inject user into context |
| `RequireRole` | Check `role` claim in JWT |
| `RequestID` | Generate UUID per request for tracing |
| `Timeout` | Cancel context after 30s |

### Deliverable:
- [x] All REST endpoints implemented and responding
- [x] Input validation on all endpoints
- [x] Consistent JSON response format
- [x] Middleware chain working (auth, rate limit, logging)
- [x] Can call `POST /api/v1/predict` end-to-end

---

## Phase 7 — Caching & Performance

**Duration: Day 16–18**

### Step 7.1: Redis Caching Strategy

| Key Pattern | TTL | Purpose |
|------------|-----|---------|
| `pred:{lat}:{lon}:{month}:{year}` | 1 hour | Prediction result cache |
| `weather:{lat}:{lon}:{date}` | 6 hours | Weather API response |
| `weather:hist:{lat}:{lon}:{month}` | 30 days | Historical monthly averages |
| `district:{name}:stats` | 15 min | District aggregate metrics |
| `wells:all` | 5 min | Full well list |
| `ratelimit:{ip}` | 1 min | Rate limiter counter |
| `model:status` | 30 sec | ML model health check |

### Step 7.2: Connection Pooling

```go
// PostgreSQL: pgxpool with 25 max connections
// Redis: go-redis with pool size = 10
// gRPC: Single persistent connection with keepalive
```

### Step 7.3: Query Optimization

```
1. PostGIS KNN: Uses GIST index, sub-millisecond for K=5
2. Latest readings: Partial index on (well_id, date DESC)
3. District aggregates: Materialized view refreshed every 15 min
4. Prediction history: Partitioned by month for fast range queries
```

### Step 7.4: Materialized View for District Stats

```sql
CREATE MATERIALIZED VIEW district_stats AS
SELECT
    w.district,
    COUNT(DISTINCT w.well_id) AS well_count,
    AVG(wr.depth_mbgl) AS avg_depth,
    COUNT(*) FILTER (WHERE wr.depth_mbgl < 30) AS safe_count,
    COUNT(*) FILTER (WHERE wr.depth_mbgl BETWEEN 30 AND 100) AS warning_count,
    COUNT(*) FILTER (WHERE wr.depth_mbgl BETWEEN 100 AND 200) AS critical_count,
    COUNT(*) FILTER (WHERE wr.depth_mbgl > 200) AS extreme_count
FROM wells w
JOIN LATERAL (
    SELECT depth_mbgl FROM well_readings
    WHERE well_id = w.well_id ORDER BY date DESC LIMIT 1
) wr ON true
GROUP BY w.district;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY district_stats;
```

### Deliverable:
- [x] Redis caching on all hot paths
- [x] Prediction latency < 400ms (with cache miss), < 5ms (cache hit)
- [x] Connection pools tuned
- [x] Materialized views for district/aggregate queries

---

## Phase 8 — WebSocket Real-Time Alerts

**Duration: Day 18–19**

### Step 8.1: WebSocket Hub

```go
// internal/handler/ws.go
// Gorilla WebSocket or nhooyr.io/websocket
//
// Hub pattern:
// - Hub manages all active connections
// - Clients subscribe to: all | district:{name}
// - When prediction triggers CRITICAL/EXTREME alert → broadcast to subscribers
// - Message format: {"type": "alert", "data": {...prediction with risk_level...}}
```

### Step 8.2: Alert Conditions

```
When a prediction returns:
  - CRITICAL (100-200m): Send WARNING alert to district subscribers
  - EXTREME (>200m): Send EMERGENCY alert to ALL subscribers + admin
  - Depth increased >10m from last month: Send TREND_ALERT
```

### Deliverable:
- [x] WebSocket endpoint at `/api/v1/ws`
- [x] Real-time alerts for critical/extreme predictions
- [x] Dashboard can subscribe and receive live updates

---

## Phase 9 — Testing Strategy

**Duration: Ongoing (parallel with each phase)**

### Test Pyramid

```
                  ╱╲
                 ╱  ╲         E2E Tests (5%)
                ╱────╲        Full API → DB → ML round-trip
               ╱      ╲
              ╱  Integ  ╲     Integration Tests (25%)
             ╱   Tests   ╲    DB queries, gRPC calls, Redis
            ╱──────────────╲
           ╱                ╲  Unit Tests (70%)
          ╱   Unit Tests     ╲ Services, spatial math, IDW, validators
         ╱────────────────────╲
```

### Key Tests to Write

| Test | Type | What it validates |
|------|------|-------------------|
| `TestIDWInterpolation` | Unit | IDW math: weights sum to 1, closer wells get higher weight |
| `TestKNNNearest5` | Integration | PostGIS returns exactly K nearest wells in distance order |
| `TestPredictEndToEnd` | E2E | POST /predict → Go → gRPC → Python → response with valid risk_level |
| `TestJWTAuth` | Unit | Expired tokens rejected, invalid signatures rejected, role claims work |
| `TestRateLimiter` | Integration | 101st request in 1 min returns 429 |
| `TestPredictionCache` | Integration | Second identical request hits Redis, not ML service |
| `TestVidarbhaBoundary` | Unit | Coordinates outside 19.5-22.0N, 75.5-81.0E rejected |
| `TestGracefulShutdown` | Integration | In-flight requests complete before server stops |

### Testing Tools

```bash
# Run all tests
go test ./... -v -race -cover

# Run with real DB (testcontainers)
go test ./internal/repository/... -v -tags=integration

# Benchmark spatial queries
go test ./internal/spatial/... -bench=. -benchmem
```

### Deliverable:
- [x] >80% code coverage on service layer
- [x] Integration tests for DB + Redis + gRPC
- [x] CI pipeline runs tests on every push

---

## Phase 10 — Containerization & Deployment

**Duration: Day 19–22**

### Step 10.1: Go Dockerfile (Multi-stage)

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# Run stage
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
COPY migrations ./migrations
EXPOSE 8080
USER nobody:nobody
ENTRYPOINT ["./server"]
```

### Step 10.2: Python ML Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY models/ ./models/
EXPOSE 50051
CMD ["python", "-m", "app.server"]
```

### Step 10.3: Full Docker Compose (Production)

```yaml
version: "3.9"
services:
  gateway:
    build: ./aquavidarbha-backend
    ports: ["8080:8080"]
    environment:
      - DB_HOST=postgres
      - REDIS_ADDR=redis:6379
      - ML_GRPC_ADDR=ml-service:50051
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
      ml-service: { condition: service_started }
    restart: unless-stopped

  ml-service:
    build: ./ml-service
    ports: ["50051:50051"]
    volumes: ["./saved_models:/app/models:ro"]
    deploy:
      resources:
        limits: { memory: 4G, cpus: "2" }
    restart: unless-stopped

  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: aquavidarbha
      POSTGRES_USER: aqua
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aqua"]
      interval: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5
    restart: unless-stopped

  nginx:
    image: nginx:1.25-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend:/usr/share/nginx/html:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on: [gateway]
    restart: unless-stopped

volumes:
  pgdata:
```

### Step 10.4: NGINX Reverse Proxy

```nginx
# Route /api/* → Go gateway:8080
# Route /     → Serve frontend static files
# WebSocket upgrade for /api/v1/ws
# TLS termination
# Gzip compression
```

### Deliverable:
- [x] `docker compose up` starts entire stack
- [x] Go binary is ~15MB, starts in <1s
- [x] Python ML service loads models in ~10s, serves in <100ms
- [x] NGINX serves frontend + proxies API
- [x] Health checks ensure startup order

---

## Phase 11 — CI/CD Pipeline

**Duration: Day 22–23**

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: "1.22" }
      - run: golangci-lint run ./...

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: "1.22" }
      - run: go test ./... -v -race -coverprofile=coverage.out
      - run: go tool cover -func=coverage.out

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t aquavidarbha-gateway .
      - run: docker build -t aquavidarbha-ml ./ml-service
```

---

## Phase 12 — Observability & Monitoring

**Duration: Day 23–25**

### Step 12.1: Structured Logging

```
Every log line includes:
  - request_id (UUID)
  - method, path, status, latency
  - user_id (if authenticated)
  - error details (if any)
Format: JSON → ship to ELK/Loki
```

### Step 12.2: Prometheus Metrics

```go
// Expose /metrics endpoint
// Key metrics:
//   - http_requests_total{method, path, status}
//   - http_request_duration_seconds{method, path}
//   - prediction_latency_seconds{model, path_type}
//   - grpc_call_duration_seconds{method}
//   - cache_hits_total / cache_misses_total
//   - db_pool_active_connections
//   - active_websocket_connections
```

### Step 12.3: Grafana Dashboard

```
Panels:
  - Request rate (req/s)
  - P50/P95/P99 latency
  - Error rate %
  - Prediction accuracy over time
  - Model inference latency breakdown
  - Cache hit ratio
  - DB connection pool utilization
  - Alert: latency > 1s for 5 min
  - Alert: error rate > 5%
```

### Deliverable:
- [x] Prometheus metrics exposed
- [x] Grafana dashboard with key panels
- [x] Alerting for latency/error spikes

---

## Complete API Reference

### Public Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/auth/register` | Register new user | No |
| `POST` | `/api/v1/auth/login` | Login, get JWT | No |
| `GET` | `/health` | Liveness check | No |
| `GET` | `/ready` | Readiness check (DB + Redis + ML) | No |

### Authenticated Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/predict` | GPS-based prediction | JWT |
| `GET` | `/api/v1/predict/history` | User's prediction history | JWT |
| `GET` | `/api/v1/wells` | List all wells (paginated) | JWT |
| `GET` | `/api/v1/wells/:id` | Single well detail | JWT |
| `GET` | `/api/v1/wells/:id/readings` | Well reading history | JWT |
| `GET` | `/api/v1/districts` | List all 11 districts | JWT |
| `GET` | `/api/v1/districts/:name` | District detail + risk stats | JWT |
| `GET` | `/api/v1/weather/:lat/:lon` | Live weather for coordinates | JWT |
| `GET` | `/api/v1/models/status` | ML model health & metrics | JWT |
| `GET` | `/api/v1/ws` | WebSocket for real-time alerts | JWT |

### Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/admin/wells` | Add new well | Admin |
| `PUT` | `/api/v1/admin/wells/:id` | Update well metadata | Admin |
| `POST` | `/api/v1/admin/wells/import` | Bulk CSV import | Admin |
| `GET` | `/api/v1/admin/predictions/stats` | System-wide prediction analytics | Admin |
| `GET` | `/api/v1/admin/users` | List all users | Admin |

---

## Go Packages & Versions (go.mod)

| Package | Version | Purpose |
|---------|---------|---------|
| `github.com/gin-gonic/gin` | v1.10+ | HTTP framework |
| `github.com/jackc/pgx/v5` | v5.6+ | PostgreSQL driver |
| `github.com/redis/go-redis/v9` | v9.5+ | Redis client |
| `google.golang.org/grpc` | v1.64+ | gRPC framework |
| `google.golang.org/protobuf` | v1.34+ | Protobuf runtime |
| `github.com/golang-jwt/jwt/v5` | v5.2+ | JWT auth |
| `github.com/spf13/viper` | v1.19+ | Config management |
| `github.com/go-playground/validator/v10` | v10.20+ | Input validation |
| `go.uber.org/zap` | v1.27+ | Structured logging |
| `github.com/golang-migrate/migrate/v4` | v4.17+ | DB migrations |
| `github.com/stretchr/testify` | v1.9+ | Testing assertions |
| `github.com/prometheus/client_golang` | v1.19+ | Prometheus metrics |
| `golang.org/x/crypto` | latest | bcrypt password hashing |
| `nhooyr.io/websocket` | v1.8+ | WebSocket |

---

## Python ML Service Packages (requirements.txt)

```
grpcio==1.64.0
grpcio-tools==1.64.0
protobuf==5.27.0
xgboost==2.1.0
tensorflow==2.16.0
scikit-learn==1.5.0
numpy==1.26.4
pandas==2.2.2
shap==0.45.0
joblib==1.4.0
```

---

## Risk Thresholds (shared constant)

| Level | Depth Range (mbgl) | Color | Action |
|-------|-------------------|-------|--------|
| `SAFE` | 0 – 30m | 🟢 Green | Normal monitoring |
| `WARNING` | 30 – 100m | 🟠 Orange | Prepare tanker routes |
| `CRITICAL` | 100 – 200m | 🔴 Red | Deploy tankers, crop advisory |
| `EXTREME` | > 200m | 🟣 Purple | Aquifer depletion crisis |

---

## Day-by-Day Execution Summary

| Day | Phase | What You Build |
|-----|-------|----------------|
| 1–2 | **Phase 0** | Go toolchain, Docker infra, project skeleton |
| 2–3 | **Phase 1** | Config loader, logger, server entry point, graceful shutdown |
| 3–4 | **Phase 2** | PostgreSQL schema, PostGIS, migrations, CSV seed script |
| 4–6 | **Phase 3** | Domain models, repository layer, PostGIS KNN queries |
| 6–9 | **Phase 4** | Protobuf contract, Python gRPC ML server, Go gRPC client |
| 9–13 | **Phase 5** | Spatial service (KNN+IDW), weather fetcher, prediction orchestrator, auth |
| 13–16 | **Phase 6** | All HTTP handlers, routing, middleware chain, input validation |
| 16–18 | **Phase 7** | Redis caching, connection pools, materialized views, <400ms latency |
| 18–19 | **Phase 8** | WebSocket hub, real-time alerts for critical/extreme predictions |
| 19–22 | **Phase 10** | Docker multi-stage builds, docker-compose full stack, NGINX |
| 22–23 | **Phase 11** | CI/CD pipeline (lint → test → build → deploy) |
| 23–25 | **Phase 12** | Prometheus metrics, Grafana dashboards, alerting |

> **Testing (Phase 9)** runs in parallel with every phase — write tests as you build.

---

## Key Design Decisions & Why

| Decision | Why |
|----------|-----|
| **Go for API gateway, Python for ML only** | Go: 10x faster HTTP/gRPC, lower memory, goroutines for concurrency. Python: TensorFlow/XGBoost/SHAP don't exist in Go. |
| **gRPC over REST for Go↔Python** | Protobuf is ~10x faster to serialize than JSON. Typed contracts prevent drift. |
| **PostGIS for spatial queries** | Native KNN index (`<->` operator), sub-ms for K=5 nearest. No need for custom spatial library. |
| **Redis for prediction cache** | Same GPS + month + year = same prediction. Avoid hitting Python ML service repeatedly. |
| **JWT (not sessions)** | Stateless auth scales horizontally. Mobile app friendly. |
| **Separate prediction history table** | Audit trail, analytics on usage patterns, model drift detection. |
| **Materialized views for aggregates** | District stats queried on every dashboard load. 15-min refresh is acceptable. |
| **Docker multi-stage build** | Go binary: 15MB. No Go toolchain in production image. Minimal attack surface. |
| **Three-path prediction routing** | Handles GPS on known well, nearby wells, and remote areas differently — each with appropriate confidence level. |

---

## Getting Started (First Code to Write)

After completing Phase 0 setup, start with this exact sequence:

```
1. cmd/server/main.go          → Empty main that prints "AquaVidarbha starting..."
2. internal/config/config.go   → Load .env file
3. cmd/server/main.go          → Add DB connection pool
4. migrations/001_*.sql        → Create wells table with PostGIS
5. scripts/seed_wells.go       → Load CSV into DB
6. internal/model/well.go      → Well struct
7. internal/repository/well.go → GetAll + FindKNearest
8. internal/handler/well.go    → GET /api/v1/wells
9. internal/handler/health.go  → GET /health
10. Test: curl http://localhost:8080/api/v1/wells → returns JSON
```

Once wells are queryable via REST, you have a running Go server. Then layer on each phase incrementally.

---

*This roadmap covers the complete backend architecture for AquaVidarbha. Each phase builds on the previous one. Skip nothing — the order matters because each phase depends on the deliverables of the one before it.*
