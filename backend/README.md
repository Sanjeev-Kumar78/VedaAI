# VedaAI Backend

Express 5 TypeScript backend for assignment creation, BullMQ generation jobs, MongoDB persistence, Redis state, WebSocket updates, and Gemini-powered question generation.

## Commands

```bash
npm run dev
npm run dev:worker
npm run build
npm run typecheck
npm run test
npm audit
```

## Local Services

Use the root Docker Compose file for MongoDB and Redis:

```bash
docker compose up --build
```

Copy `.env.example` to `.env` before running the backend directly.
