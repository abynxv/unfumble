# Frontend Architecture — AI Profile Studio

> React + TypeScript + Vite + Supabase Auth

---

## Overview

The frontend is a **React 19** SPA (Single Page Application) built with **Vite** that:
- Authenticates users via **Supabase email OTP** (no passwords)
- Provides a **dashboard** for uploading photos and generating AI headshots
- Polls the backend for generation status updates
- Includes an **admin panel** for system monitoring
- Uses **vanilla CSS** with a custom design system (no Tailwind)

---

## Directory Structure

```
frontend/
├── public/
│   ├── favicon.svg                      # App favicon
│   └── icons.svg                        # SVG icon sprites
├── src/
│   ├── main.tsx                         # React root — mounts <App /> into DOM
│   ├── App.tsx                          # Router config (BrowserRouter + Routes)
│   ├── App.css                          # Empty (all styles in index.css)
│   ├── index.css                        # Full design system + all component styles
│   ├── components/
│   │   └── ProtectedRoute.tsx           # Auth guard — redirects to /login if no session
│   ├── hooks/
│   │   └── useAuth.ts                   # Auth state + OTP functions (sendOTP, verifyOTP, signOut)
│   ├── lib/
│   │   └── supabase.ts                  # Supabase client initialization
│   ├── pages/
│   │   ├── LoginPage.tsx                # Split-screen login (email → OTP flow)
│   │   ├── DashboardPage.tsx            # Main UI — upload, style picker, generate, history
│   │   └── AdminPage.tsx                # Admin panel — stats, health, generations table
│   ├── services/
│   │   └── api.ts                       # Axios client + typed API functions
│   └── assets/
│       ├── hero.png
│       ├── react.svg
│       └── vite.svg
├── index.html                           # HTML entry point
├── vite.config.ts                       # Vite config (React plugin)
├── tsconfig.json                        # TypeScript base config
├── tsconfig.app.json                    # App-specific TS config
├── tsconfig.node.json                   # Node/Vite TS config
├── package.json                         # Dependencies + scripts
├── .env                                 # Environment variables (not committed)
└── .env.example                         # Template for .env
```

---

## Routing

```
/login        → LoginPage        (public)
/dashboard    → DashboardPage    (protected — requires auth)
/admin        → AdminPage        (protected — requires auth, backend checks admin)
/*            → Redirects to /dashboard
```

- **ProtectedRoute** wraps `/dashboard` and `/admin` using React Router's `<Outlet>` pattern
- Checks Supabase session via `useAuth()` hook
- Redirects unauthenticated users to `/login`
- Shows a spinner while session is loading

---

## Authentication Flow

```
LoginPage.tsx                   useAuth.ts                    Supabase
     │                              │                             │
     │── handleSendOTP(email) ─────►│                             │
     │                              │── signInWithOtp(email) ────►│
     │                              │                             │── Sends email
     │                              │◄─── OK ─────────────────────│
     │◄─── setStep('otp') ─────────│                             │
     │                              │                             │
     │── handleVerifyOTP(code) ────►│                             │
     │                              │── verifyOtp(email, code) ──►│
     │                              │◄─── Session + JWT ──────────│
     │                              │── onAuthStateChange fires ──│
     │── navigate('/dashboard') ◄───│                             │
```

### useAuth Hook State
```typescript
interface AuthState {
  user: User | null;          // Supabase user object
  session: Session | null;    // Contains access_token (JWT)
  loading: boolean;           // True until initial session check completes
  isAdmin: boolean;           // Always false (admin checked server-side)
}
```

**Exposed functions:** `sendOTP(email)`, `verifyOTP(email, token)`, `signOut()`

---

## Pages

### LoginPage (`/login`)

**Split-screen layout:**
- **Left panel** — dark branded section with app name, tagline, subtle grid pattern
- **Right panel** — clean white form area

**Two-step flow:**
1. **Email step** — user enters email → "Continue" button → calls `sendOTP()`
2. **OTP step** — 6 individual digit inputs → auto-advance on input → "Verify" button → calls `verifyOTP()`

### DashboardPage (`/dashboard`)

**Two-panel layout:**
- **Left sidebar (320px):**
  - Photo upload zone (drag-click, supports JPG/PNG/WebP ≤ 10MB)
  - Style selector (radio buttons: Corporate, Startup, Developer, Formal)
  - "Generate" button
- **Right content area:**
  - Current result section (original vs. generated, side-by-side)
  - Processing states: queued → processing with spinner → completed/failed
  - History list with thumbnails, style, status badges, download/delete actions

**Key behaviors:**
- Polls `GET /generations/{id}` every 3 seconds while generating
- Clears polling interval on unmount
- Download link opens generated image in new tab

### AdminPage (`/admin`)

- **Stats grid** — users, total/completed/failed/pending/processing generations
- **HF health indicator** — green/red dot with model ID
- **Generations table** — ID, user, style, status, date, delete action
- **Status filter** dropdown
- Handles 403 gracefully with "Access denied" screen + link to dashboard

---

## API Service (`services/api.ts`)

### Axios Configuration
```typescript
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 120000,  // 2 minutes (AI generation can be slow)
});
```

### Request Interceptor
Automatically attaches the Supabase JWT to every request:
```
Authorization: Bearer <access_token>
```

### API Functions

| Function                  | Method   | Endpoint                         | Returns                  |
|---------------------------|----------|----------------------------------|--------------------------|
| `createGeneration(file, style)` | POST | `/generations`              | `Generation`             |
| `getGeneration(id)`       | GET      | `/generations/{id}`              | `Generation`             |
| `listGenerations(skip, limit)` | GET | `/generations`               | `GenerationListResponse` |
| `deleteGeneration(id)`    | DELETE   | `/generations/{id}`              | `void`                   |
| `getAdminStats()`         | GET      | `/admin/stats`                   | `AdminStats`             |
| `adminListGenerations(...)` | GET    | `/admin/generations`             | `GenerationListResponse` |
| `adminDeleteGeneration(id)` | DELETE | `/admin/generations/{id}`        | `void`                   |
| `checkHFHealth()`         | GET      | `/admin/health/huggingface`      | `{ huggingface_api, model_id }` |

### TypeScript Interfaces
```typescript
interface Generation {
  id: number;
  user_id: string;
  original_image_url: string | null;
  generated_image_url: string | null;
  style: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface AdminStats {
  total_users: number;
  total_generations: number;
  completed_generations: number;
  failed_generations: number;
  pending_generations: number;
  processing_generations: number;
}
```

---

## Design System (`index.css`)

### No CSS Framework
The project uses **vanilla CSS** with custom properties (CSS variables). Tailwind CSS was originally included but removed because its preflight styles conflicted with the custom design.

### CSS Variables (`:root`)

| Category    | Variables                                                    |
|-------------|--------------------------------------------------------------|
| Colors      | `--bg`, `--surface`, `--border`, `--border-soft`             |
| Text        | `--text-primary`, `--text-secondary`, `--text-tertiary`      |
| Accent      | `--accent` (#111), `--accent-hover` (#333)                   |
| Status      | `--danger`, `--success`, `--warning`, `--info`               |
| Spacing     | `--space-1` (4px) through `--space-16` (64px)                |
| Typography  | `--font` (Inter), `--font-mono` (JetBrains Mono)             |
| Radii       | `--radius-sm` (4px), `--radius` (8px), `--radius-lg` (12px) |
| Shadows     | `--shadow-sm`, `--shadow`                                    |
| Transitions | `--transition` (150ms ease)                                  |

### Component Classes

| Category     | Key Classes                                                           |
|--------------|-----------------------------------------------------------------------|
| Buttons      | `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-generate`, `.btn-download` |
| Forms        | `.form-group`, `.form-label`, `.form-input`                           |
| Login        | `.login-split`, `.login-brand`, `.login-form-panel`, `.otp-row`, `.otp-digit` |
| Dashboard    | `.dashboard-page`, `.dashboard-header`, `.dashboard-body`, `.panel-left`, `.panel-right` |
| Upload       | `.upload-zone`, `.upload-overlay`, `.upload-zone-label`               |
| Styles       | `.style-list`, `.style-option`, `.style-indicator`                    |
| Results      | `.result-section`, `.result-pane`, `.result-card`, `.result-image`    |
| History      | `.history-section`, `.history-list`, `.history-item`, `.history-thumb`|
| Badges       | `.badge`, `.badge-pending`, `.badge-processing`, `.badge-completed`, `.badge-failed` |
| Admin        | `.admin-page`, `.admin-main`, `.stats-row`, `.stat-box`, `.admin-table` |
| Utility      | `.spinner`, `.loading-screen`, `.alert`, `.divider`                   |

---

## Configuration

### Environment Variables (`frontend/.env`)

| Variable               | Required | Description                                |
|------------------------|----------|--------------------------------------------|
| `VITE_SUPABASE_URL`    | ✅       | Supabase project URL                       |
| `VITE_SUPABASE_ANON_KEY`| ✅      | Supabase public anon key (eyJ... format)   |
| `VITE_API_BASE_URL`    | ❌       | Backend URL (default: `http://localhost:8000`) |

> Vite only exposes variables prefixed with `VITE_` to the browser.

---

## Running

### Development
```bash
cd frontend
npm install
npm run dev           # Vite dev server → http://localhost:5173
```

Or from project root:
```bash
./dev.sh              # Starts both backend + frontend
./dev.sh --frontend   # Frontend only
```

### Build
```bash
npm run build         # TypeScript check + Vite production build → dist/
npm run preview       # Preview production build locally
npm run lint          # Run oxlint
```

---

## Dependencies

### Runtime
| Package              | Purpose                                 |
|----------------------|-----------------------------------------|
| `react` / `react-dom`| UI framework (v19)                     |
| `react-router-dom`  | Client-side routing (v7)                |
| `@supabase/supabase-js` | Supabase auth client                |
| `axios`              | HTTP client for backend API calls       |

### Dev
| Package              | Purpose                                 |
|----------------------|-----------------------------------------|
| `vite`               | Build tool + dev server (v8)            |
| `@vitejs/plugin-react` | React Fast Refresh for Vite           |
| `typescript`         | Type checking (v6)                      |
| `oxlint`             | Fast linter                             |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Vanilla CSS** over Tailwind | Full control over design. Tailwind v4 preflight was overriding custom styles. |
| **Supabase email OTP** | No passwords to manage. Supabase handles email delivery. Auto-creates users. |
| **Axios** over fetch | Request interceptors for auto-attaching JWT. Better error handling. |
| **Polling** over WebSockets | Simpler for a learning project. 3-second poll interval is acceptable UX. |
| **Split-screen login** | Premium feel. Dark branding panel + clean form panel. |
| **No global state** (Redux/Zustand) | Auth state via hook is sufficient. API calls in components. |
| **CSS class-based** components | No CSS modules or styled-components — keeps it simple and portable. |
