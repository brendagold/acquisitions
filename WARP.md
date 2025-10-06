# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Node.js (ESM, Node 20) Express API with Drizzle ORM targeting Postgres (Neon). Security and rate limiting via Arcjet. Logging via Winston. Dockerized for dev (with Neon Local sidecar) and prod.

Common commands
- Install dependencies
  - npm ci
- Run locally (no Docker)
  - npm run dev
  - npm start
- Run with Docker Compose (development)
  - docker compose -f docker-compose.dev.yml up --build
  - docker compose -f docker-compose.dev.yml down
  - docker compose -f docker-compose.dev.yml logs -f
- Run with Docker Compose (production, local validation)
  - docker compose -f docker-compose.prod.yml up --build -d
  - docker compose -f docker-compose.prod.yml down
- Lint and format
  - npm run lint
  - npm run lint:fix
  - npm run format
  - npm run format:check
- Database (Drizzle)
  - npm run db:generate    # generate migrations from models
  - npm run db:migrate     # apply migrations to the database in DATABASE_URL
  - npm run db:studio      # browse the schema/data
- Helper scripts
  - npm run dev:docker     # wraps development compose flow (checks env, runs migrate, brings up services)
  - npm run prod:docker    # wraps production compose flow (checks env, builds, runs migrate)
- Tests
  - A test runner is not configured in package.json; add one (e.g., Jest/Vitest) before test commands are available.

High-level architecture and flow
- Runtime and module resolution
  - ESM modules; package.json defines import aliases (e.g., #config/*, #routes/*) used throughout the codebase.
- Entry points
  - src/index.js loads environment and bootstraps the server.
  - src/server.js starts the HTTP server on PORT (default 3000).
  - src/app.js constructs the Express app (middleware, logging, routes).
- HTTP layer
  - Middleware: helmet, cors, express.json/urlencoded, cookie-parser, and a security middleware that integrates Arcjet.
  - Request logging: morgan streams to a Winston logger (logs/error.log, logs/combined.log; console in non-production).
  - Routes
    - /         → simple hello endpoint
    - /health   → health/status JSON
    - /api      → service status JSON
    - /api/auth → auth.routes.js (signup, signin, signout)
    - /api/users→ users.routes.js (list users, and placeholders for id-based operations)
- Security with Arcjet
  - src/config/arcject.js configures Arcjet (shield, bot detection; additional rate-limiting via slidingWindow in middleware).
  - src/middleware/security.middleware.js enforces per-role rate limits (guest/user/admin) and denies on bot/shield/too many requests with structured logging.
- Persistence with Drizzle + Neon
  - src/config/database.js selects neon-local config in development (HTTP endpoint via Neon Local), and uses DATABASE_URL for Drizzle (neon-http driver).
  - drizzle.config.js: schema = src/models/*.js; migrations output to drizzle/.
  - Schema example: src/models/user.model.js defines users table (id, name, email unique, password, role, timestamps). Initial migration lives under drizzle/.
- Domain and application layers
  - Validation: zod schemas in src/validations/.
  - Controllers: src/controllers/*.js accept/validate input, invoke services, manage cookies/JWT, and shape responses.
  - Services: src/services/*.js contain business logic and data access via Drizzle (e.g., auth, users).
  - Utilities: src/utils/*.js (JWT helpers, cookie helpers, formatting).
  - Configuration: src/config/*.js (logger, database, Arcjet).

Environment and runtime notes (from README)
- Development uses Neon Local as a sidecar (docker-compose.dev.yml). DATABASE_URL should point at the neon-local service inside the compose network and include sslmode=require.
- Production uses an external Neon Cloud DATABASE_URL (see .env.production). No Neon Local container runs in production.
- Common Docker compose operations:
  - Dev up: docker compose -f docker-compose.dev.yml up --build
  - Dev down: docker compose -f docker-compose.dev.yml down
  - Tail dev logs: docker compose -f docker-compose.dev.yml logs -f

Conventions and tooling
- Linting: ESLint (eslint.config.js) with recommended rules and Prettier integration; node/globals tuned; tests section in ESLint config is present but a test runner is not installed.
- Formatting: Prettier (.prettierrc) with .prettierignore.
- Logs: Winston writes to logs/error.log and logs/combined.log; console logging enabled outside production.

Assumptions and gaps
- Tests are not configured in package.json; add a test framework to enable test commands (including single-test execution).
- Ensure DATABASE_URL and, if using Arcjet, ARCJET_KEY, are provided via environment files (e.g., .env.development, .env.production) or your platform’s secret manager.