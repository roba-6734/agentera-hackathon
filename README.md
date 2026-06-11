# Majlis AI

<p align="center">
  <img src="assets/images/majlis-ai-logo.png" width="96" alt="Majlis AI logo" />
</p>

Majlis AI is an AI-assisted strategic advisory workspace for UAE Ministry of Energy and Infrastructure leadership and staff. The application helps users prepare for bilateral meetings with country intelligence, strategic briefings, sovereign comparisons, predictive signals, meeting debriefs, and a grounded AI policy chat assistant.

The app is built as a React/Vite frontend served by an Express backend. It can run entirely with local standby data for development, then progressively connect to OpenAI, Neon Postgres, DeepL, and n8n when those integrations are configured.

## Key Capabilities

- Role-gated entry paths for staff, executives, and developers.
- Bilingual English and Arabic interface support.
- Country intelligence profiles with government, leadership, sector, and strategic context.
- Executive briefing generation for selected countries and meeting objectives.
- UAE-to-country comparison views for economic, infrastructure, energy, and sustainability indicators.
- AI policy chat with optional n8n workflow orchestration and local grounded fallback responses.
- Voice input transcription through OpenAI or a mock development provider.
- Post-meeting debrief analysis, action item extraction, and local meeting memory storage.
- Developer dashboard for Neon database status, country profile inspection, migration preview, diagnostics, and security checks.
- Export-oriented briefing views, including one-pager, talking points, slides, printable output, offline HTML, and PPTX generation.

## Tech Stack

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Express
- OpenAI Node SDK
- Neon serverless Postgres client
- pptxgenjs
- lucide-react
- motion

## Project Structure

```text
.
|-- assets/                         # Brand and generated visual assets
|-- data/
|   `-- meeting-memory.json         # Local meeting memory persistence
|-- src/
|   |-- components/                 # React feature modules
|   |-- data/                       # Local strategic signal data
|   |-- api.ts                      # Client API resolver and fallback logic
|   |-- App.tsx                     # Main application shell and role routing
|   |-- index.css                   # Global Tailwind and app styling
|   `-- types.ts                    # Shared TypeScript contracts
|-- server.ts                       # Express API, integrations, fallbacks, and Vite middleware
|-- vite.config.ts                  # Vite and Tailwind configuration
|-- package.json                    # npm scripts and dependencies
`-- .env.example                    # Environment variable template
```

## Prerequisites

- Node.js 20 or newer is recommended.
- npm.
- Optional: OpenAI API key for live AI generation and transcription.
- Optional: Neon Postgres database containing `country_intelligence_profiles`.
- Optional: DeepL API key for production translation.
- Optional: n8n webhook for external advisor chat orchestration.

## Local Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Set at least the values you need in `.env`. For basic UI development, the app can start without live OpenAI or Neon credentials and will use local fallback behavior where available.

Start the development server:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

The Express server runs on port `3000` by default and mounts Vite middleware in development, so the frontend and API are served from the same origin.

## Environment Variables

The following variables are supported by the current codebase.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Optional for local development | Enables live OpenAI text generation and voice transcription. Without it, several routes return structured local fallback responses. |
| `OPENAI_MODEL` | No | Primary OpenAI model name used by the backend. |
| `OPENAI_FALLBACK_MODELS` | No | Comma-separated fallback model list. |
| `OPENAI_TRANSCRIPTION_MODEL` | No | Model used for voice transcription. Defaults in code to `gpt-4o-mini-transcribe`. |
| `OPENAI_CACHE_TTL_MS` | No | Cache duration for generated OpenAI responses. |
| `OPENAI_RATE_LIMIT_COOLDOWN_MS` | No | Cooldown duration after rate-limit or quota responses. |
| `VOICE_TRANSCRIPTION_PROVIDER` | No | Set to `openai` or `mock`. If omitted, the server uses OpenAI when configured, otherwise mock transcription. |
| `VOICE_TRANSCRIPTION_MIN_DURATION_MS` | No | Minimum accepted voice recording duration. |
| `VOICE_TRANSCRIPTION_MIN_BYTES` | No | Minimum accepted voice recording size. |
| `VOICE_TRANSCRIPTION_MAX_BYTES` | No | Maximum accepted voice recording size. |
| `NEON_URL` | No | Neon Postgres connection string. `DATABASE_URL` and `POSTGRES_URL` are also supported by the server. |
| `NEON_COUNTRY_LIMIT` | No | Maximum number of Neon country records loaded into the app. |
| `VECTOR_CONTEXT_LIMIT` | No | Maximum JSONB context sections used for grounded briefing and chat responses. |
| `MEETING_MEMORY_DIR` | No | Directory for local meeting memory storage. Defaults to `data`. |
| `MEETING_MEMORY_PATH` | No | Full path for meeting memory JSON storage. Defaults to `data/meeting-memory.json`. |
| `MEETING_MEMORY_LIMIT` | No | Maximum recent meeting records used as context. |
| `N8N_CHAT_WEBHOOK_URL` | No | Optional server-side webhook for advisor chat orchestration. |
| `N8N_CHAT_WEBHOOK_SECRET` | No | Optional shared secret sent to the n8n workflow as a bearer token. |
| `N8N_CHAT_TIMEOUT_MS` | No | Timeout for n8n chat workflow calls. |
| `N8N_CHAT_HISTORY_LIMIT` | No | Maximum chat history messages sent to n8n. |
| `DEEPL_API_KEY` | No | Enables DeepL translation for localized country profile fields. |
| `DEEPL_API_URL` | No | Overrides the DeepL endpoint. Free API keys ending in `:fx` use the free endpoint automatically. |
| `DEEPL_CACHE_TTL_MS` | No | Cache duration for translated fields. |
| `DEEPL_BATCH_SIZE` | No | Maximum fields sent per translation batch. |
| `APP_URL` | No | Public application URL used for CORS allowlisting and deployed runtime context. |
| `PORT` | No | Express server port. Defaults to `3000`. |
| `VITE_API_BASE_URL` | No | Optional frontend API base URL when the frontend is served separately from the backend. |
| `DISABLE_HMR` | No | Disables Vite HMR and file watching when set to `true`. |

## Available Scripts

```bash
npm run dev
```

Runs `server.ts` with `tsx`. In non-production mode, Express attaches Vite middleware and serves the full application on `http://localhost:3000`.

```bash
npm run build
```

Builds the Vite frontend into `dist` and bundles the backend into `dist/server.cjs`.

```bash
npm start
```

Runs the production server from `dist/server.cjs`.

```bash
npm run lint
```

Runs TypeScript checking with `tsc --noEmit`.

```bash
npm run clean
```

Removes generated build output.

## API Reference

All API routes are served by `server.ts`.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/advisor/brief` | Loads a country profile, applies JSONB context and meeting memory, then returns a briefing payload. |
| `POST` | `/api/advisor/chat` | Handles advisor chat. Uses n8n when configured, otherwise returns a local grounded response. |
| `POST` | `/api/advisor/transcribe` | Transcribes voice input through OpenAI or returns a mock transcript for development. |
| `GET` | `/api/advisor/compare` | Returns UAE comparison indicators and available country profiles. |
| `GET` | `/api/advisor/database-status` | Reports Neon configuration, reachability, table name, and country row count. |
| `GET` | `/api/advisor/country-intelligence/:country` | Reads and normalizes a direct Neon `country_intelligence_profiles` row. |
| `POST` | `/api/advisor/migrate-data` | Previews migration of raw SQL, CSV, or JSON into app country and meeting schemas. |
| `POST` | `/api/meetings/analyze` | Produces structured post-meeting analysis from transcript text. |
| `POST` | `/api/meetings` | Saves a staff meeting record and flattened action items to local meeting memory. |
| `GET` | `/api/meetings` | Lists saved meeting records with optional country, sector, date, query, and limit filters. |

## Data Sources and Fallbacks

Majlis AI is designed to remain usable during partial integration setup.

- Country intelligence first attempts to load from Neon `country_intelligence_profiles`.
- If Neon is unavailable, the server falls back to built-in standby country profiles.
- Briefings combine country profile data, JSONB context sections, and recent meeting memory when available.
- Chat can be routed through n8n. If the webhook is not configured or fails, the server returns a local grounded answer.
- OpenAI-powered features fall back to structured local responses when `OPENAI_API_KEY` is not configured.
- Meeting debrief records are persisted locally to `data/meeting-memory.json` unless a custom memory path is configured.

## Production Build

Build the application:

```bash
npm run build
```

Start the bundled server:

```bash
NODE_ENV=production npm start
```

In production mode, Express serves static assets from `dist` and falls back to `dist/index.html` for client-side routes.

## Development Notes

- The current authentication flow is a client-side role selection and session placeholder. Replace it with real identity, server-issued role claims, and persistent user records before production use.
- Keep secrets in `.env` or your deployment secret manager. Do not expose `NEON_URL`, OpenAI keys, DeepL keys, or n8n secrets to the browser.
- The developer dashboard is intended for trusted users. Treat migration preview, database inspection, and diagnostics as privileged workflows.
- API requests from the browser must target `/api/*`. If the frontend and backend are separated, configure `VITE_API_BASE_URL`.
- The app expects the Neon table `country_intelligence_profiles` when database-backed intelligence is enabled.

## Troubleshooting

If the app loads but API calls fail, make sure it was opened through `npm run dev` on port `3000`, or set `VITE_API_BASE_URL` to the running backend.

If Neon status is unavailable, confirm `NEON_URL` is set and points to a database containing `country_intelligence_profiles`.

If AI output uses fallback content, confirm `OPENAI_API_KEY` is set and the configured model names are available to your OpenAI project.

If voice input returns a mock transcript, set `VOICE_TRANSCRIPTION_PROVIDER=openai` and configure `OPENAI_API_KEY`.

## License

No license file is currently included in this repository. Add one before distributing or open-sourcing the project.
