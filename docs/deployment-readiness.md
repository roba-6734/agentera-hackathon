# Deployment Readiness

Majlis AI includes a lightweight Express health endpoint for deployment checks:

```text
GET /health
```

The route returns HTTP 200 with a small JSON payload:

```json
{
  "status": "ok",
  "service": "majlis",
  "timestamp": "2026-06-11T00:00:00.000Z"
}
```

The endpoint is intentionally cheap. It does not call OpenAI, n8n, Neon, scraping jobs, migrations, vector indexing, PDF processing, or embedding generation.

## Render Cold Starts

Render free web services can spin down after periods of inactivity. When that happens, the next request may be slow while the service starts again. For judging or live demos, the best option is to temporarily use a paid Render instance so the service stays warm.

The keep-alive workflow is only a backup workaround. It periodically calls `/health` so the service is less likely to feel cold during demos, but it is not a substitute for paid always-on hosting.

## GitHub Actions Keep-Alive

The repository includes `.github/workflows/keep-alive.yml`. It runs every 10 minutes and can also be started manually from the GitHub Actions tab.

Create a repository secret named `RENDER_HEALTH_URL`:

```text
https://your-app.onrender.com/health
```

In GitHub:

1. Open the repository settings.
2. Go to `Secrets and variables` > `Actions`.
3. Create a new repository secret named `RENDER_HEALTH_URL`.
4. Set the value to your deployed Render health URL.

The workflow uses a short timeout and logs the HTTP status code. Temporary endpoint failures are reported as warnings instead of permanently failing the workflow.

## Manual Health Check

After deploying, test the endpoint directly:

```bash
curl -i --max-time 8 https://your-app.onrender.com/health
```

Expected result:

- HTTP status is `200`.
- Response body has `"status":"ok"` or equivalent formatted JSON.
- The `timestamp` updates on each request.

For local development:

```bash
npm run dev
curl -i --max-time 8 http://localhost:3000/health
```

## Pre-Demo Checklist

- Confirm Render is running the latest deployed commit.
- Confirm `/health` returns HTTP 200 on the deployed URL.
- Confirm `RENDER_HEALTH_URL` is configured in GitHub Actions.
- Trigger the keep-alive workflow manually once and check the logged HTTP status.
- For judging day, switch Render to a paid always-on instance when possible.
- Verify required runtime secrets are configured in Render, especially OpenAI, Neon, DeepL, and n8n values used by the demo.
- Avoid running migration previews, indexing jobs, or other expensive setup steps during the live demo window.
