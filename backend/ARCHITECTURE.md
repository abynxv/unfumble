# Backend Architecture — AI Profile Studio

> FastAPI + SQLAlchemy + Supabase + Hugging Face

---

## Overview

The backend is a **FastAPI** application that:
- Authenticates users via **Supabase JWT** tokens
- Accepts portrait uploads and stores them in **Supabase Storage**
- Runs AI inference via the **Hugging Face Inference API**
- Tracks generation lifecycle in **PostgreSQL** (via Supabase)
- Exposes admin endpoints for monitoring and management

---

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app entrypoint, CORS, routers
│   ├── api/
│   │   └── v1/
│   │       ├── generations.py           # User-facing CRUD endpoints
│   │       └── admin.py                 # Admin-only endpoints (stats, HF health)
│   ├── core/
│   │   ├── config.py                    # Pydantic settings (env vars)
│   │   ├── database.py                  # SQLAlchemy async engine + session
│   │   └── security.py                  # JWT validation + auth dependencies
│   ├── models/
│   │   └── generation.py                # SQLAlchemy ORM model (generations table)
│   ├── schemas/
│   │   └── generation.py                # Pydantic request/response schemas
│   └── services/
│       ├── generation_service.py        # Business logic orchestrator
│       ├── huggingface_service.py       # AI inference via HF API
│       └── storage_service.py           # Supabase Storage upload/delete
├── alembic/
│   ├── env.py                           # Alembic migration environment
│   ├── script.py.mako                   # Migration template
│   └── versions/                        # Migration files (auto-generated)
├── tests/
│   └── test_generations.py              # API endpoint tests
├── alembic.ini                          # Alembic configuration
├── requirements.txt                     # Python dependencies
├── Dockerfile                           # Container image
├── .env                                 # Environment variables (not committed)
└── .env.example                         # Template for .env
```

---

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│                  HTTP Request                    │
└─────────────┬───────────────────────────────────┘
              ▼
┌─────────────────────────────────────────────────┐
│         FastAPI Router (api/v1/)                 │
│  • Parses request, validates input               │
│  • Injects dependencies (auth, db, service)      │
│  • Returns HTTP response                         │
└─────────────┬───────────────────────────────────┘
              ▼
┌─────────────────────────────────────────────────┐
│         Security Layer (core/security.py)        │
│  • Extracts Bearer token                         │
│  • Validates JWT with Supabase secret            │
│  • Returns AuthenticatedUser(id, email)          │
└─────────────┬───────────────────────────────────┘
              ▼
┌─────────────────────────────────────────────────┐
│        Service Layer (services/)                 │
│  • GenerationService: orchestrates workflow      │
│  • StorageService: upload/delete in Supabase     │
│  • HuggingFaceService: AI inference              │
└─────────────┬───────────────────────────────────┘
              ▼
┌─────────────────────────────────────────────────┐
│        Data Layer (models/ + database.py)        │
│  • SQLAlchemy ORM models                         │
│  • Async PostgreSQL via asyncpg                  │
│  • Alembic migrations                            │
└─────────────────────────────────────────────────┘
```

---

## API Endpoints

### User Endpoints (`/api/v1/generations`)

| Method   | Path                           | Auth     | Description                          |
|----------|--------------------------------|----------|--------------------------------------|
| `POST`   | `/api/v1/generations`          | Required | Upload image + style → start gen     |
| `GET`    | `/api/v1/generations`          | Required | List user's generations (paginated)  |
| `GET`    | `/api/v1/generations/{id}`     | Required | Get a specific generation by ID      |
| `DELETE` | `/api/v1/generations/{id}`     | Required | Delete a generation + its files      |

### Admin Endpoints (`/api/v1/admin`)

| Method   | Path                              | Auth  | Description                          |
|----------|-----------------------------------|-------|--------------------------------------|
| `GET`    | `/api/v1/admin/stats`             | Admin | System-wide usage statistics         |
| `GET`    | `/api/v1/admin/generations`       | Admin | List all generations (all users)     |
| `DELETE` | `/api/v1/admin/generations/{id}`  | Admin | Delete any generation                |
| `GET`    | `/api/v1/admin/health/huggingface`| Admin | Check HF model availability          |

### Health Endpoints

| Method | Path      | Auth | Description              |
|--------|-----------|------|--------------------------|
| `GET`  | `/`       | None | App info + docs link     |
| `GET`  | `/health` | None | Liveness probe           |

> **Interactive API docs:** `http://localhost:8000/docs` (Swagger UI)

---

## Authentication Flow

```
Frontend (React)                    Supabase                      Backend (FastAPI)
     │                                │                                │
     │── signInWithOtp(email) ───────►│                                │
     │                                │── Sends OTP email ────►        │
     │◄─── OK ────────────────────────│                                │
     │                                │                                │
     │── verifyOtp(email, code) ─────►│                                │
     │◄─── JWT (access_token) ────────│                                │
     │                                │                                │
     │── API request + Bearer JWT ───────────────────────────────────►│
     │                                │     Validates JWT with         │
     │                                │     SUPABASE_JWT_SECRET        │
     │◄─── Response ──────────────────────────────────────────────────│
```

- JWT algorithm: **HS256** (HMAC with SHA-256)
- JWT audience: `authenticated`
- Admin check: email ∈ `ADMIN_EMAILS` env var (comma-separated)

---

## Generation Lifecycle

```
                    ┌──────────┐
   POST /generations│  PENDING │  ← DB record created, original uploaded
                    └────┬─────┘
                         │ (BackgroundTask starts)
                    ┌────▼─────┐
                    │PROCESSING│  ← Image sent to HuggingFace API
                    └────┬─────┘
                    ┌────▼─────┐       ┌────────┐
                    │COMPLETED │  or   │ FAILED │  ← error_message stored
                    └──────────┘       └────────┘
```

1. **POST /generations** — validates image, uploads original to storage, creates DB record (`PENDING`), returns immediately
2. **BackgroundTask** — runs `process_generation()` in the same process:
   - Updates status → `PROCESSING`
   - Calls HuggingFace Inference API with style-specific prompt
   - Uploads generated image to storage
   - Updates status → `COMPLETED` (or `FAILED` with error)
3. **Frontend polling** — polls `GET /generations/{id}` every 3 seconds until terminal state

---

## Database Schema

### `generations` table

| Column               | Type                        | Notes                              |
|----------------------|-----------------------------|------------------------------------|
| `id`                 | `INTEGER` (PK, autoincrement)| Primary key                       |
| `user_id`            | `VARCHAR(255)` (indexed)    | Supabase user UUID                 |
| `original_image_url` | `VARCHAR(500)`, nullable    | Public URL from Supabase Storage   |
| `generated_image_url`| `VARCHAR(500)`, nullable    | Public URL of AI result            |
| `style`              | `VARCHAR(50)`               | corporate / startup / developer / formal |
| `status`             | `ENUM`                      | pending / processing / completed / failed |
| `error_message`      | `TEXT`, nullable             | Failure details                    |
| `created_at`         | `TIMESTAMP WITH TZ`         | `server_default=now()`             |
| `completed_at`       | `TIMESTAMP WITH TZ`, nullable| Set when terminal state reached   |

---

## Services

### GenerationService (`services/generation_service.py`)
- **Orchestrator** — coordinates validation, storage, DB, and AI inference
- `validate_image()` — checks extension, size (≤10MB), Pillow verify
- `create_generation()` — validates + uploads original + creates DB record
- `process_generation()` — runs AI inference (called by BackgroundTask)
- `list_generations()` / `get_generation()` — user-scoped queries
- `delete_generation()` — deletes DB record + storage files
- Admin methods: `get_admin_stats()`, `list_all_generations()`, `admin_delete_generation()`

### HuggingFaceService (`services/huggingface_service.py`)
- Calls `https://api-inference.huggingface.co/models/{model_id}`
- Sends image bytes with style-specific prompt as query param
- Default model: `timbrooks/instruct-pix2pix` (image-to-image)
- Timeout: 120s (cold start can be slow)
- Handles 503 (model loading) with informative error

### StorageService (`services/storage_service.py`)
- Uses **Supabase Storage** with **service role key** (bypasses RLS)
- Bucket: `generations`
- Path format: `{original|generated}/{user_id}/{uuid}.{ext}`
- Public URLs for simplicity (signed URLs recommended for production)

---

## Configuration

### Environment Variables (`backend/.env`)

| Variable                  | Required | Description                                |
|---------------------------|----------|--------------------------------------------|
| `SUPABASE_URL`            | ✅       | Supabase project URL                       |
| `SUPABASE_ANON_KEY`       | ✅       | Public anon key (eyJ... format)            |
| `SUPABASE_JWT_SECRET`     | ✅       | JWT secret for token validation            |
| `SUPABASE_SERVICE_ROLE_KEY`| ✅      | Service role key for backend operations    |
| `SUPABASE_STORAGE_BUCKET` | ❌       | Storage bucket name (default: `generations`)|
| `DATABASE_URL`            | ✅       | Async PostgreSQL URL (asyncpg driver)      |
| `HUGGINGFACE_API_KEY`     | ✅       | HuggingFace API token                      |
| `HUGGINGFACE_MODEL_ID`    | ❌       | Model to use (default: `stabilityai/stable-diffusion-xl-refiner-1.0`) |
| `ADMIN_EMAILS`            | ❌       | Comma-separated admin email list           |
| `APP_ENV`                 | ❌       | `development` or `production`              |
| `LOG_LEVEL`               | ❌       | Python logging level (default: `INFO`)     |
| `MAX_UPLOAD_SIZE_MB`      | ❌       | Max image upload size (default: `10`)      |

---

## Running

### Development
```bash
# From project root
./dev.sh              # Start backend + frontend
./dev.sh --backend    # Start backend only
```

### Database Migrations
```bash
./migrate.sh generate "describe change"   # Generate migration
./migrate.sh upgrade                       # Apply migrations
./migrate.sh status                        # Show current revision
./migrate.sh downgrade                     # Roll back one step
```

### Dependencies
```bash
pip install -r backend/requirements.txt
```

Key packages: `fastapi`, `uvicorn`, `sqlalchemy`, `asyncpg`, `alembic`, `python-jose`, `supabase`, `httpx`, `Pillow`, `pydantic-settings`

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **BackgroundTasks** over Celery | Simpler setup, no Redis/RabbitMQ needed. Sufficient for learning project. |
| **Service layer** pattern | Separates HTTP handling from business logic. Easier to test and refactor. |
| **User scoping via JWT** | Every query filters by `user_id` from JWT. Prevents cross-user data access. |
| **404 instead of 403** | Prevents information leakage — attacker can't probe for valid IDs. |
| **Singletons** for services | Avoid re-creating Supabase/HF clients per request. Thread-safe in async. |
| **Public storage URLs** | Simplicity. Production should use signed URLs with expiry. |
| **CORS allow all** | Development convenience. Must restrict to frontend domain in production. |
