# AquaVidarbha — AI-Based Groundwater Depth Prediction System

> A hybrid spatio-temporal multi-engine framework for groundwater depth prediction across Vidarbha, Maharashtra.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Prerequisites](#3-prerequisites)
4. [Quick Start — Full Stack with Docker](#4-quick-start--full-stack-with-docker)
5. [Backend — Local Development with Air](#5-backend--local-development-with-air)
6. [Python / ML Setup](#6-python--ml-setup)
7. [Default Credentials](#7-default-credentials)
8. [API Reference](#8-api-reference)
9. [Makefile Commands](#9-makefile-commands)
10. [ML System Architecture](#10-ml-system-architecture)
11. [Project Status](#11-project-status)

---

## 1. Project Overview

The system dynamically routes groundwater depth predictions based on data availability:

| Case | Condition | Strategy |
|------|-----------|----------|
| A | Historical data exists | Temporal Engine (XGBoost + RF + LSTM) |
| B | Nearby wells exist, no history | KNN + IDW spatial reconstruction → Temporal Engine |
| C | No history, no nearby wells | Environmental Engine |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Go 1.23, Gin, pgx/v5, go-redis, zap |
| Database | PostgreSQL 16 + PostGIS |
| Cache | Redis 7 |
| ML Models | Python, XGBoost, Random Forest, LSTM (TensorFlow) |
| Containerization | Docker, Docker Compose |
| Dev tooling | Air (live reload), Makefile |

---

## 3. Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Git | any | https://git-scm.com |
| Docker Desktop | 4.x+ | https://docs.docker.com/get-docker |
| Go | 1.23+ | https://go.dev/dl (only for local dev) |
| Python | 3.10+ | https://python.org (only for ML notebooks) |

> **Windows note:** If you have a local PostgreSQL installation already running on port 5432, the Docker Postgres is mapped to **port 5433** to avoid conflicts. The `.env.example` already reflects this.

---

## 4. Quick Start — Full Stack with Docker

This is the recommended path. No Go or Python install needed.

```bash
# 1. Clone the repo
git clone https://github.com/Yogesh1022/Ground_Water_Detection.git
cd Ground_Water_Detection/backend

# 2. Copy and review the environment file (values are already correct for Docker)
cp .env.example .env

# 3. Start everything (Postgres + Redis + Go backend)
docker compose -f docker-compose.yml --env-file .env up -d --build

# 4. Verify all containers are healthy
docker compose -f docker-compose.yml --env-file .env ps
```

Expected output:
```
NAME                    STATUS
aquavidarbha-postgres   Up (healthy)
aquavidarbha-redis      Up (healthy)
aquavidarbha-backend    Up
```

The API is now available at **http://localhost:8080**

```bash
# 5. Check the health endpoint
curl http://localhost:8080/health
# → {"status":"ok"}
```

### Stop & clean up

```bash
# Stop containers (keeps data volumes)
docker compose -f docker-compose.yml --env-file .env down

# Stop and wipe all data (full reset)
docker compose -f docker-compose.yml --env-file .env down -v
```

---

## 5. Backend — Local Development with Air

Use this for hot-reload during development. Requires Go 1.23+ installed.

```bash
cd Ground_Water_Detection/backend

# 1. Copy env file
cp .env.example .env

# 2. Start only the infrastructure (Postgres + Redis) in Docker
docker compose -f docker-compose.yml --env-file .env up -d postgres redis

# 3. Wait ~10 seconds for Postgres to be healthy, then:
docker compose -f docker-compose.yml --env-file .env ps

# 4. Install Air (one-time)
go install github.com/air-verse/air@latest

# 5. Run with live reload
air
```

> **Windows PATH:** If `air` is not found after install, add `%USERPROFILE%\go\bin` to your system PATH, then open a new terminal.

The server starts on **http://localhost:8080** and rebuilds automatically on any `.go` file change.

---

## 6. Python / ML Setup

Required only to run the Jupyter notebooks for model training.

```bash
cd Ground_Water_Detection

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux / macOS)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch Jupyter
jupyter notebook
```

Notebooks in order:

| Notebook | Purpose |
|----------|---------|
| `notebooks/01_Data_Analysis.ipynb` | EDA and feature analysis |
| `notebooks/02_Model_Training.ipynb` | Full training pipeline |
| `notebooks/03_XGBoost_Deep_Dive.ipynb` | XGBoost tuning |
| `notebooks/04_LSTM_Deep_Dive.ipynb` | LSTM / GRU experiments |
| `notebooks/05_RandomForest_No_Lag.ipynb` | Environmental engine (no lag) |

---

## 7. Default Credentials

> **Change the JWT secret and admin password before any public deployment.**

| Service | Credential |
|---------|-----------|
| Admin login | `admin@aquavidarbha.in` / `Admin@12345` |
| Postgres (local Docker) | `postgres` / see `.env` |
| Redis | no password (dev only) |

---

## 8. API Reference

### Authentication

```bash
# Login — returns JWT token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aquavidarbha.in","password":"Admin@12345"}'

# Response
# { "token": "<jwt>", "user": { "id": 1, "email": "...", "role": "admin" } }
```

Use the token in all subsequent requests:

```bash
export TOKEN="<jwt from above>"
```

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/api/v1/auth/login` | — | Login, returns JWT |
| GET | `/api/v1/common-user/me` | Bearer (citizen) | Current citizen profile |
| GET | `/api/v1/admin/me` | Bearer (admin) | Current admin profile |
| GET | `/api/v1/govn-user/me` | Bearer (gov) | Current gov user profile |

```bash
# Example: get your profile as admin
curl http://localhost:8080/api/v1/admin/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 9. Makefile Commands

Run these from the `backend/` directory:

```bash
make run           # go run ./cmd/server (no hot reload)
make air           # live reload with Air
make build         # compile to ./bin/server
make tidy          # go mod tidy
make clean         # remove ./bin and ./tmp

make docker-up     # start all containers (build if needed)
make docker-down   # stop containers
make docker-reset  # wipe volumes and restart fresh
make docker-logs   # tail backend container logs
make docker-ps     # show container status
```

---

## 10. ML System Architecture

```
User Input (Latitude, Longitude, Date)
           │
           ▼
    Decision Router
           │
    ┌──────┴──────┐──────────────────┐
    │             │                  │
Case A        Case B            Case C
History       Nearby wells      No history
exists        (no history)      no nearby wells
    │             │                  │
    ▼             ▼                  ▼
Temporal      KNN + IDW         Environmental
Engine        ──────►           Engine
(XGBoost      Temporal          (XGBoost + RF)
+ RF + LSTM)  Engine
```

### Dataset

- **83,850** monthly well readings across **11 Vidarbha districts**
- Target: `depth_mbgl` (depth to groundwater in metres below ground level)
- 25 features: environmental, spatial, and temporal lag features
- Saved models: `saved_models/` (XGBoost, LSTM)

### Model Performance

| Engine | Expected R² |
|--------|------------|
| Temporal (Case A) | 0.88 – 0.95 |
| Spatial + Temporal (Case B) | 0.80 – 0.88 |
| Environmental (Case C) | 0.55 – 0.72 |

---

## 11. Project Status

| Component | Status |
|-----------|--------|
| Dataset preparation | ✅ Done |
| Feature engineering | ✅ Done |
| XGBoost model | ✅ Trained & saved |
| LSTM model | ✅ Trained & saved |
| Random Forest (no-lag) | ✅ Trained & saved |
| Go backend (auth + routing) | ✅ Done |
| Docker setup | ✅ Done |
| Dashboard API (user/gov/admin) | 🚧 In progress |
| Frontend | 🚧 In progress |

---

*For questions or contributions, open an issue on [GitHub](https://github.com/Yogesh1022/Ground_Water_Detection).*
