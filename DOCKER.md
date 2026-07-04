# Markety Docker Setup

This setup runs Markety with Docker Compose:

- `frontend`: React production build served by Nginx.
- `backend`: ASP.NET Core API on port `8080` inside the container.
- `sqlserver`: SQL Server 2022 Developer for local Docker data.

The public local entry point is:

```powershell
http://localhost:8080
```

Nginx serves the frontend and proxies:

- `/api/` to the backend API
- `/swagger/` to backend Swagger
- `/images/` to backend static product/catalog images

## First Run

1. Copy the Docker env template:

```powershell
Copy-Item .env.docker.example .env
```

2. Edit `.env` and set real local values for:

- `SQLSERVER_SA_PASSWORD`
- `JWT_KEY`
- `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` for the first Docker admin login
- `AI_ASSISTANT_API_KEY` if using Gemini/OpenAI
- `STRIPE_SECRET_KEY`, `RECAPTCHA_*`, and email settings if testing those flows

3. Build and start containers:

```powershell
docker compose up --build
```

The normal startup path does not run migrations, so repeated starts are faster.
Run migrations manually only after pulling code with new EF migrations or after
creating a fresh database:

```powershell
docker compose --profile migrate run --rm db-migrate
docker compose up -d
```

Docker uses its own SQL Server volume, so users from your old local database are
not available there. On startup, the backend can seed roles plus one admin user
from `.env`:

```powershell
ADMIN_SEED_ENABLED=true
ADMIN_SEED_EMAIL=admin@gmail.com
ADMIN_SEED_PASSWORD=Change_This_Admin_Password_123!
ADMIN_SEED_FULL_NAME=Markety Admin
```

If you do not create a `.env` file, Docker Compose uses local defaults:
`admin@gmail.com` / `Admin@123456`.

## Useful Commands

```powershell
docker compose up --build
docker compose up -d
docker compose build backend
docker compose build db-migrate
docker compose logs -f backend
docker compose logs -f frontend
docker compose --profile migrate run --rm db-migrate
docker compose down
docker compose down -v   # deletes Docker database/images/log volumes
```

If the frontend image still reuses the old failed layer, rebuild it without
cache:

```powershell
docker compose build --no-cache frontend
docker compose up
```

## Notes

- Docker SQL Server data is separate from your existing local `SQLEXPRESS` data.
- Uploaded product images are persisted in the `backend-product-images` volume.
- Backend logs are persisted in the `backend-logs` volume.
- ASP.NET data-protection keys are persisted in the `backend-data-protection`
  volume so reset/email/change-token flows survive container recreation.
- Docker disables ASP.NET HTTPS redirection because local Nginx is serving plain
  HTTP on `localhost:8080`. Put HTTPS on the reverse proxy for production.
- The frontend Docker build uses `npm ci --legacy-peer-deps` because this app
  uses React 19 while `react-scripts` still has older peer dependency ranges.
- The migration service is behind the `migrate` profile, so it does not slow
  normal `docker compose up -d` runs.
- `ASPNETCORE_ENVIRONMENT=Development` is the default here so Swagger stays
  available locally. Use `Production` for real deployment and configure HTTPS.

## Load Balancing Later

Do not scale the backend until single-container Docker is stable. Before adding
multiple backend replicas, make sure:

- every backend uses the same `JWT_KEY`
- uploaded images use shared storage
- logs go to centralized logging
- database migrations are handled once, not by every replica
- health checks exist for the API
