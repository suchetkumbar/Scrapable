# Scrapable

Scrapable is now organized as a Phase 0 local-first workspace with:

- `frontend/`: Vite + React application
- `backend/`: FastAPI service with CORS, env handling, and Playwright runtime checks
- `shared/`: reserved for cross-stack contracts and shared logic

## Prerequisites

- Node.js 22+
- npm 10+
- Python 3.12+
- PowerShell

## First-Time Setup

Run everything from the repository root:

```powershell
cd d:\github_d\Scrapable
```

1. Create your local environment file.

```powershell
Copy-Item .env.example .env
```

2. Install the root workspace dependencies.

```powershell
npm install
```

3. Create the backend virtual environment and install Python packages.

```powershell
npm run setup:backend
```

4. Install the Playwright Chromium browser used by the backend.

```powershell
npm run setup:playwright
```

If the Playwright install is interrupted, run the same command again until it finishes successfully.

## Run The Project

Start both frontend and backend from one command:

```powershell
npm run dev
```

This starts:

- frontend at `http://127.0.0.1:5173`
- backend at `http://127.0.0.1:8000`
- backend health endpoint at `http://127.0.0.1:8000/api/system/health`

## Run Services Separately

Frontend only:

```powershell
npm run dev:frontend
```

Backend only:

```powershell
npm run dev:backend
```

## Validation Commands

Frontend build:

```powershell
npm run build
```

Frontend tests:

```powershell
npm run test
```

Frontend lint:

```powershell
npm run lint
```
