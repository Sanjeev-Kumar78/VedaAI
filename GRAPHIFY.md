# Graphify Context Map

Use this file as a lightweight knowledge graph for agents and contextual search tools. Keep it updated as the project grows.

## Project Nodes

### `project:vedaai-assessment-creator`

- Type: Product
- Goal: AI-powered assessment creation for teachers.
- Primary workflows: create assignment, generate paper, view output, download PDF.
- Source instruction: `AGENT.md`

### `design:figma-canvas`

- Type: Design reference
- Files:
  - `design\image.png`
  - `design\figma.css`
- Use for: screen inventory, spacing, color, responsive layout, visual hierarchy.
- Keywords: assignment dashboard, create assignment, upload material, teacher sidebar, output paper, mobile layout.

### `frontend:next-app`

- Type: Application
- Target folder: `frontend\`
- Stack: Next.js App Router, TypeScript, Zustand or Redux Toolkit, WebSocket client.
- Owns: teacher UI, assignment form, progress UI, generated paper output page.
- Depends on: `backend:api`, `backend:websocket`, `design:figma-canvas`.

### `backend:api`

- Type: Service
- Target folder: `backend\`
- Stack: Express 5, TypeScript, MongoDB, Redis, BullMQ.
- Owns: assignment CRUD, generation requests, result retrieval, PDF endpoint.
- Depends on: `database:mongodb`, `queue:generation`, `cache:redis`.

### `backend:worker`

- Type: Worker
- Target folder: `backend\src\modules\generation`
- Stack: BullMQ, Redis, Gemini via `@google/genai`.
- Owns: prompt building, AI generation, result validation, MongoDB result persistence.
- Emits: generation progress and completion events.

### `backend:websocket`

- Type: Realtime service
- Target folder: `backend\src\modules\websocket`
- Owns: assignment-specific subscriptions and generation status events.
- Event names: `assignment:queued`, `assignment:active`, `assignment:progress`, `assignment:completed`, `assignment:failed`.

### `database:mongodb`

- Type: Persistence
- Stores: assignments, generated results, optional PDF metadata.
- Key collections: `assignments`, `generated_results`.

### `cache:redis`

- Type: Cache and queue backing store
- Stores: BullMQ job state, progress, temporary status data.
- Used by: BullMQ and optional polling fallback.

### `queue:generation`

- Type: BullMQ queue
- Jobs: AI question paper generation.
- Payload: assignment ID and normalized generation request.
- Worker output: structured generated paper.

### `ai:gemini`

- Type: AI provider
- Package: `@google/genai`
- Environment: `GEMINI_API_KEY`, `GEMINI_MODEL`
- Rule: responses must be parsed and validated before rendering or storing as public output.

### `output:question-paper`

- Type: Rendered document
- Fields: title, student info lines, subject, grade, time allowed, maximum marks, sections, questions, difficulty, marks.
- Must not contain: raw model response, unstructured text dump.

## Relationship Edges

- `frontend:next-app` reads `design:figma-canvas`.
- `frontend:next-app` calls `backend:api`.
- `frontend:next-app` subscribes to `backend:websocket`.
- `backend:api` writes `database:mongodb`.
- `backend:api` enqueues `queue:generation`.
- `queue:generation` uses `cache:redis`.
- `backend:worker` consumes `queue:generation`.
- `backend:worker` calls `ai:gemini`.
- `backend:worker` validates `ai:gemini` output.
- `backend:worker` writes `output:question-paper` to `database:mongodb`.
- `backend:websocket` notifies `frontend:next-app`.

## Search Phrases

Use these phrases when searching the repo after implementation starts:

- assignment form validation
- question type config
- generation queue
- prompt builder
- result parser
- generated paper schema
- WebSocket assignment progress
- BullMQ worker
- Gemini structured JSON
- PDF generation
- Figma design tokens
- mobile assignment layout

## Expected Future Files

Frontend:

```text
frontend\app\assignments\new\page.tsx
frontend\app\assignments\[assignmentId]\page.tsx
frontend\components\assignments\assignment-form.tsx
frontend\components\paper\question-paper.tsx
frontend\store\assignment-store.ts
frontend\lib\socket.ts
```

Backend:

```text
backend\src\modules\assignments\assignment.model.ts
backend\src\modules\assignments\assignment.routes.ts
backend\src\modules\generation\generation.queue.ts
backend\src\modules\generation\generation.worker.ts
backend\src\modules\generation\prompt-builder.ts
backend\src\modules\generation\result-schema.ts
backend\src\modules\websocket\socket-server.ts
backend\src\modules\pdf\pdf.service.ts
```

Docs:

```text
docs\architecture.md
docs\api-contract.md
docs\prompt-contract.md
docs\local-development.md
```

