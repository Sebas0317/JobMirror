# Architecture Overview

Career Radar AI follows a **modular, pipeline‑driven** architecture that cleanly separates data acquisition, transformation, scoring and presentation.

```
+-------------------+      +-------------------+      +-------------------+
|   Adapters (API) | -->  |   Normaliser      | -->  |   Scoring Engine  |
+-------------------+      +-------------------+      +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+      +-------------------+      +-------------------+
|   Prisma (SQLite) | <--  |   Scheduler       | <--  |   Express API     |
+-------------------+      +-------------------+      +-------------------+
                                            |
                                            v
                                    +-------------------+
                                    |   React Frontend |
                                    +-------------------+
```

### 1. Adapters
Each job board (Computrabajo, Elempleo, …) lives in its own module under `src/adapters/`.  An adapter implements a single function `fetch<Source>Vacancies(): Promise<RawVacancy[]>`.  The adapter is **stateless** and can be toggled via `config/sources.json`.

### 2. Normaliser
`src/core/normalizer.ts` maps the raw fields returned by an adapter to the unified `Vacancy` interface (see `src/models/Vacancy.ts`).  It also injects the `source` identifier and converts dates to ISO strings.

### 3. Skill Extraction & Risk Analysis
`skillExtractor.ts` loads `resources/skillSynonyms.json` and extracts canonical skills from free text.  `riskAnalyzer.ts` checks for mandatory‑skill gaps and seniority mismatches.

### 4. Scoring Engine
`scoringEngine.ts` computes four sub‑scores (compatibility, transfer, growth, risk) and combines them into a final 0‑100 score with a detailed breakdown that is returned to the UI.

### 5. Scheduler
`src/core/scheduler.ts` orchestrates the whole pipeline:
1. Load enabled sources from `config/sources.json`.
2. Call each adapter (concurrently with `Promise.all`).
3. Normalise, extract skills, analyse risk and score.
4. Persist the enriched vacancy records via Prisma.

### 6. Persistence
Prisma ORM with a **SQLite** database (`dev.db`) stores the `Vacancy` and `Feedback` tables.  The schema lives in `src/db/schema.prisma`.

### 7. API Layer
Express server (`src/server.ts`) exposes REST endpoints:
- `GET /api/vacancies` – list all vacancies (sorted by score).
- `GET /api/vacancies/:id` – vacancy details + feedback array.
- `GET /api/feedback/:vacancyId` – current feedback (or default PENDING).
- `PATCH /api/feedback/:vacancyId` – update status / optional notes.

### 8. Frontend
React + Vite (`web/` directory) provides two main views:
- **Dashboard** – sortable, paginated table of vacancies.
- **VacancyDetail** – detailed view with description, extracted skills and feedback buttons.

All layers communicate via plain JSON over HTTP, keeping the system **local‑first** and easily replaceable.
