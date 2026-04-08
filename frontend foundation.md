# Frontend Foundation (AquaVidarbha / Ground_Water_Detection)

This document explains the frontend setup in this repo **from scratch** — what every important piece is, why it exists, and how it fits together.

It is written specifically for your current structure:

- `frontend/` = npm workspace root (monorepo-style “container”)
- `frontend/web/` = the actual React + Vite application that runs in the browser

---

## 0) The 30-second mental model

Think of your frontend as **one app** (currently `frontend/web`) managed by **one package manager** (`npm`).

- `npm` reads `package.json` files to know:
  - what libraries to install
  - what scripts to run (`npm start`, `npm run build`, etc.)
- `npm install` downloads dependencies into `node_modules/`
- `Vite` is the tool that:
  - runs the dev server (fast local development)
  - builds optimized production files (HTML/CSS/JS)

In your repo, `frontend/` is set up as a **workspace root**, so you can run commands from the root while the real app is in `frontend/web/`.

---

## 1) Your frontend folder structure (what each folder is)

At a high level:

```
frontend/
  package.json
  package-lock.json
  web/
    package.json
    package-lock.json
    index.html
    vite.config.ts
    src/
    public/
    ...
  legacy/
  common-user-react/
```

### 1.1 `frontend/` (workspace root)

`frontend/` is the **npm workspace root**. It exists mainly to:

- define workspaces (which “sub-packages” exist)
- offer convenience scripts that forward to a workspace
- hold the *root lock file* (often you keep only one lock file here)

In your repo, this file is the key:

- `frontend/package.json`

It contains:

- `workspaces: ["web"]`

Meaning: npm should treat `frontend/web` as a managed package.

### 1.2 `frontend/web/` (the real application)

`frontend/web/` is the **actual frontend app**:

- React UI
- React Router navigation
- CSS/Tailwind
- Charts (Chart.js)
- Maps (Leaflet)
- API calls to your backend

This is the package that runs the dev server and produces the production build.

Key files:

- `frontend/web/package.json` (scripts + dependencies)
- `frontend/web/index.html` (HTML entry)
- `frontend/web/src/` (your TypeScript/React source)
- `frontend/web/vite.config.ts` (Vite configuration)

### 1.3 `frontend/legacy/`

This folder looks like older frontend experiments / previous versions:

- `legacy/css/`
- `legacy/js/`
- `legacy/v2/`

It is **not part of the npm workspace build** right now (no workspace entry, not imported by Vite). That’s fine, but it can confuse people because it’s “frontend code” that doesn’t run when you do `npm start`.

### 1.4 `frontend/common-user-react/`

This exists but is **not a workspace package** (there’s no `package.json` at `frontend/common-user-react/package.json`).

So it is not something npm will build/run as an app.

If it’s meant to be an app, it should become its own workspace (e.g., `workspaces: ["web", "common-user-react"]`) and have its own `package.json`.

---

## 2) What is `package.json`?

A `package.json` is the **manifest** of a Node.js package/app.

It answers:

1) **What is this package?** (name, version, private)
2) **How to run it?** (`scripts`)
3) **What does it depend on?** (`dependencies` and `devDependencies`)

### 2.1 `frontend/package.json` (workspace root)

This one does not represent the UI itself. It’s mainly:

- a list of workspaces (`web`)
- scripts that forward into `web`

Example idea (your root scripts behave like this):

- `npm run dev` at `frontend/` → runs `npm run dev --workspace=web`

So you don’t have to `cd web` every time.

### 2.2 `frontend/web/package.json` (the app)

This file is what the error was about earlier.

- Scripts like `dev`, `build`, `preview`, `start`
- Dependencies like `react`, `react-dom`, `react-router-dom`, `leaflet`, etc.

**Important:**

- `dependencies`: libraries needed at runtime in production.
  - Example: `react`, `react-router-dom`
- `devDependencies`: tools you need for development/build.
  - Example: `vite`, `@vitejs/plugin-react`, `tailwindcss`

---

## 3) What is `package-lock.json`?

`package-lock.json` is npm’s **exact dependency lock**.

Why it exists:

- `package.json` uses version ranges like `^5.4.2`.
- That means “install 5.4.2 or any compatible newer 5.x version”.
- Over time, installs could drift.

`package-lock.json` pins the **exact** versions (and exact dependency tree) so installs are reproducible.

### 3.1 Why lock files matter

Lock files help ensure:

- your machine, teammates’ machines, and CI install the same versions
- fewer “works on my machine” problems

### 3.2 Workspace nuance (root vs nested lock)

In workspaces, teams often prefer **one lock file at the workspace root**.

Right now you have:

- `frontend/package-lock.json`
- `frontend/web/package-lock.json`

That *can* work, but it’s more complex and sometimes causes confusion.

If everything installs and runs fine, it’s not an emergency — but long-term, choosing **one** strategy is cleaner.

---

## 4) What is `npm`?

`npm` is the tool you use to:

- install dependencies (`npm install`)
- run scripts (`npm run dev`, `npm start`)
- manage workspaces

### 4.1 Common commands in this repo

From `frontend/` (workspace root):

- Install deps:
  - `npm install`
- Run dev server:
  - `npm run dev`
- Build production bundle:
  - `npm run build`

From `frontend/web/` (the app itself):

- Install deps (usually you do it at root when using workspaces):
  - `npm install`
- Run dev:
  - `npm run dev`
- Start:
  - `npm start`

### 4.2 What are “scripts”?

In `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

When you run:

- `npm run dev`

npm simply runs the command string:

- `vite`

So scripts are just **short names** for longer commands.

---

## 5) What is `node_modules/`?

`node_modules/` is the folder where npm installs packages.

When you run:

- `npm install`

npm downloads all libraries from the registry and places them under:

- `frontend/node_modules/` (workspace root install)

This is why earlier you saw:

- `'vite' is not recognized`

Because there was no `node_modules` yet, so there was no local `node_modules/.bin/vite` executable available.

### 5.1 Should you commit `node_modules`?

No.

- It’s huge
- It’s machine-specific
- `package-lock.json` is what you commit so others can recreate it

---

## 6) What is Vite?

Vite is a modern frontend toolchain. In your project it does two primary jobs:

1) **Dev server** (fast local development)
2) **Build** (creates optimized production assets)

### 6.1 Dev server: what happens on `vite` / `npm start`

When you run `vite`:

- it starts a local HTTP server
- it serves `index.html`
- it compiles/transforms TypeScript/JSX on demand
- it supports hot reload (HMR) so changes appear instantly

### 6.2 Which port does it use?

In your current setup, Vite is using the default port:

- `5173`

So the frontend runs at:

- `http://localhost:5173/`

If you don’t configure the port, Vite chooses `5173` by default.

You can configure it in `frontend/web/vite.config.ts` (example):

```ts
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});
```

### 6.3 Production build: what happens on `vite build`

When you run:

- `npm run build`

Vite generates optimized static files (JS/CSS/assets) under:

- `frontend/web/dist/`

Those `dist/` files are what you deploy to a static host/CDN, or serve via a web server.

### 6.4 `vite preview`

`npm run preview` starts a local server that serves the **built output** (`dist/`).

This is useful to verify the production build locally.

---

## 7) How the app starts (from HTML to React)

### 7.1 `index.html`

`frontend/web/index.html` is the HTML entry page.

It contains a `div` like:

- `<div id="root"></div>`

and a script tag that loads your TypeScript entry:

- `/src/app/main.tsx`

### 7.2 The React entry file

`frontend/web/src/app/main.tsx`:

- imports global CSS
- creates the React root
- renders the router (`AppRouter`)

### 7.3 Routing (pages and dashboards)

`frontend/web/src/app/router/index.tsx` mounts routes from:

- `routes.public.tsx` (like `/`, `/login`)
- `routes.dashboard.tsx` (dashboards)

Your dashboard routes include:

- `/dashboard-user` (common user dashboard)
- `/dashboard-admin` (admin dashboard)
- `/dashboard-gov` (government officer dashboard)

### 7.4 Role-based access

`RoleGuard` checks:

- `sessionStorage.getItem("aqua_token")`
- `sessionStorage.getItem("aqua_role")`

If missing/wrong, it redirects to `/login`.

---

## 8) How frontend talks to backend (in this repo)

Your frontend calls backend APIs using a mix of `fetch`/`axios`.

### 8.1 Base URLs

The code uses environment variables like:

- `VITE_AUTH_BASE_URL`
- `VITE_ADMIN_BASE_URL`
- `VITE_GOV_BASE_URL`
- `VITE_API_BASE_URL`

If not set, it defaults to `http://localhost:8080/...` paths.

### 8.2 Where API clients live

- Common-user API helper:
  - `frontend/web/src/services/api/client.ts`
- Admin API:
  - `frontend/web/src/features/admin/api/adminApi.ts`
- Gov API:
  - `frontend/web/src/features/gov/api/govApi.ts`

---

## 9) Is this structure “good” for adding the Gov dashboard?

You already have:

- `/dashboard-gov` route
- `GovDashboardPage` implementation
- `features/gov/api/` starting point

So you do **not** need a new deployable package just to add gov dashboard.

### 9.1 What could be improved (optional cleanup)

For consistency, you may eventually want to:

- move `GovDashboardPage` from `src/pages/` into `src/features/gov/pages/`
- move `AdminDashboardPage` from `src/pages/` into `src/features/admin/pages/`

This keeps “feature code” inside feature folders.

This is a **refactor**, not required for functionality.

---

## 10) Step-by-step: how you run this frontend from scratch

### Step 1 — Install dependencies

Open terminal in:

- `frontend/`

Run:

- `npm install`

This creates:

- `frontend/node_modules/`

### Step 2 — Start the dev server

From `frontend/`:

- `npm run dev`

Or from `frontend/web/`:

- `npm start`

Then open:

- `http://localhost:5173/`

### Step 3 — Build production files

From `frontend/`:

- `npm run build`

Outputs are in:

- `frontend/web/dist/`

### Step 4 — Preview the production build locally

- `npm run preview`

---

## 11) Common problems (and what they mean)

### “Missing script: start”

It means your `package.json` has no:

- `scripts.start`

Fix: add it.

### “vite is not recognized” (Windows)

It usually means dependencies are not installed (`node_modules` missing).

Fix:

- run `npm install` at the workspace root (`frontend/`).

### Lock file / install confusion

If installs behave strangely, it’s often due to:

- conflicting lock files
- switching between running installs in root vs subfolder

Best practice: pick one install location (workspaces usually = root).

---

## 12) Next steps (if you want 100% mastery)

If you want, I can add a second doc that walks through:

- how React Router is used in *this* app
- how role login sets `sessionStorage`
- where the user/admin/gov dashboards live and how to add new pages cleanly
- how to connect gov dashboard UI to real backend endpoints
