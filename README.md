<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/83772978-b06e-43b9-9f4c-44eef8e8df46

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `OPENAI_API_KEY` in [.env](.env) to your OpenAI API key
3. Optional: set `NEON_URL` to a Neon Postgres connection string. The server reads `country_intelligence_hub` first, then falls back to Firestore/local standby data.
4. Run the app:
   `npm run dev`

## Database Check

After starting the server, verify the Neon connection without exposing secrets:

`GET /api/advisor/database-status`
