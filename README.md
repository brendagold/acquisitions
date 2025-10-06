# Acquisitions: Docker + Neon Database (Dev & Prod)

This project is dockerized to support two environments:

- Development: Uses Neon Local (via Docker) and creates ephemeral branches automatically.
- Production: Uses your managed Neon Cloud Database URL; no Neon Local proxy is run.

Your app uses the Neon serverless driver (`@neondatabase/serverless`) and Drizzle ORM.

## Prerequisites

- Docker and Docker Compose
- A Neon account and project
- Your Neon credentials:
  - NEON_API_KEY
  - NEON_PROJECT_ID
  - PARENT_BRANCH_ID (optional but recommended in dev to enable ephemeral branches)

## Files added

- `Dockerfile` – multi-stage build: `dev` (hot reload) and `prod` (lean)
- `docker-compose.dev.yml` – runs both the app and Neon Local proxy
- `docker-compose.prod.yml` – runs only the app (connects to Neon Cloud)
- `.env.development` – local development env vars (includes Neon Local connection string)
- `.env.production` – production env template (use real Neon Cloud URL)

## How it works

- Development: Neon Local runs as a sidecar container and exposes Postgres on `neon-local:5432` inside the compose network. It can automatically create ephemeral branches cloned from `PARENT_BRANCH_ID` when the container starts and delete them when it stops.
- Production: The app connects directly to your Neon Cloud Database URL. No Neon Local container runs in production.

Your Node app reads `process.env.DATABASE_URL` in `src/config/database.js` and uses the Neon serverless driver over HTTP(S).

## Development (Neon Local with ephemeral branches)

1. Configure `.env.development` with your Neon details:

- `NEON_API_KEY`
- `NEON_PROJECT_ID`
- `PARENT_BRANCH_ID` (set to an existing branch ID to enable ephemeral branches, e.g., your main branch ID)
- `DATABASE_URL` should already be `postgres://neon:npg@neon-local:5432/neondb?sslmode=require`

2. Start the stack:

```
# Uses dev target with file watching and Neon Local sidecar
docker compose -f docker-compose.dev.yml up --build
```

- App: http://localhost:3000
- Postgres (via Neon Local): `postgres://neon:npg@localhost:5432/neondb?sslmode=require`

Notes:

- Neon Local supports both the Postgres driver and the Neon serverless driver via a single connection string.
- With `PARENT_BRANCH_ID` set, Neon Local creates an ephemeral branch on start and deletes it on stop.

## Production (Neon Cloud)

1. Set the Neon Cloud `DATABASE_URL` in `.env.production` (or inject it via your platform’s secret manager). Example:

```
DATABASE_URL=postgresql://USER:PASSWORD@<your-endpoint>-pooler.<region>.aws.neon.tech/DBNAME?sslmode=require
```

2. Build and run the production container locally (for validation):

```
docker compose -f docker-compose.prod.yml up --build -d
```

This runs only the app and connects to the external Neon Cloud DB.

## Switching environments

- Development: `.env.development` is used by both the app and the Neon Local service in `docker-compose.dev.yml`. It sets `DATABASE_URL` to the Neon Local proxy.
- Production: `.env.production` is used by `docker-compose.prod.yml` and sets `DATABASE_URL` to your Neon Cloud URL.

No secrets are hardcoded in code—everything comes from environment variables.

## Common operations

- Stop dev stack: `docker compose -f docker-compose.dev.yml down`
- Rebuild after changes: `docker compose -f docker-compose.dev.yml up --build`
- Tail logs: `docker compose -f docker-compose.dev.yml logs -f`

## Notes for JavaScript Neon driver

- This project uses `@neondatabase/serverless` (HTTP-based). Neon Local supports HTTP with the serverless driver; no WebSocket config is required.
- If you switch to a Postgres client like `pg`, ensure SSL is configured appropriately. Neon Local uses a self-signed certificate; pg-based clients may need `ssl: { rejectUnauthorized: false }` when connecting through the proxy.

## Troubleshooting

- Ephemeral branch not created: Ensure `PARENT_BRANCH_ID` is set and valid, and that `NEON_API_KEY` + `NEON_PROJECT_ID` are correct.
- App cannot connect: Verify `DATABASE_URL` matches the service name `neon-local` and includes `sslmode=require`.
- Port conflicts: Adjust `ports` mappings in the compose files.
