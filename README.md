# JobMirror

**JobMirror** is a personal, local‑first job intelligence system. It scrapes public job boards, scores each vacancy against your CV profile, and helps you decide where to apply — all running on your machine.

---

## Features

- **Multi‑source scraping** — Computrabajo, Elempleo, Magneto365 (more can be added)
- **CV‑based scoring** — Upload your PDF CV and get a 0–100 score per vacancy based on skill match, career growth, and risk
- **Intelligent classification** — `Directa` (direct match), `Transferible` (transferable skills), `Baja Relación` (low relevance)
- **Web UI + CLI** — Full React dashboard or terminal commands (`/scan`, `/today`, `/feed`, `/analyze`)
- **Local‑first** — SQLite database via Prisma; no cloud dependencies
- **Extensible adapter system** — Add new job boards by extending `BaseAdapter`

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install

```bash
git clone https://github.com/Sebas0317/JobMirror.git
cd JobMirror

# Install backend dependencies
npm install

# Install frontend dependencies
cd web && npm install && cd ..

# Initialize database
npx prisma generate
npx prisma db push
```

### Configure

Edit `config/sources.json` to enable/disable job boards and set pages per source:

```json
{
  "computrabajo": { "enabled": true,  "city": "bogota-dc", "pages": 3 },
  "elempleo":     { "enabled": true,  "city": "bogota",    "pages": 3 },
  "magneto":      { "enabled": true,  "city": "Bogota",    "pages": 2 },
  "indeed":       { "enabled": false, "city": "Bogota",    "pages": 1 },
  "linkedin":     { "enabled": false, "city": "Bogota",    "pages": 1 }
}
```

### Upload your CV

```bash
npx ts-node src/cli/index.ts profile upload "C:\path\to\your-cv.pdf"
```

Or use the Web UI at `http://localhost:5173/profile/upload` after starting the server.

### Run

Open **two terminals**:

```bash
# Terminal 1 — API server
npm run server
```

```bash
# Terminal 2 — Web UI
cd web && npm run dev
```

Open `http://localhost:5173` and click **Escanear** to fetch vacancies.

### CLI Commands

| Command | Description |
|---------|-------------|
| `npx ts-node src/cli/index.ts scan` | Fetch & score vacancies from all enabled sources |
| `npx ts-node src/cli/index.ts today` | Show today's new vacancies |
| `npx ts-node src/cli/index.ts feed` | Tabular feed with scores & match types |
| `npx ts-node src/cli/index.ts analyze <id>` | Deep analysis of a single vacancy |
| `npx ts-node src/cli/index.ts profile` | Show current CV profile |
| `npx ts-node src/cli/index.ts stats` | Dashboard statistics |

---

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│  Adapters   │───▶│  Scheduler   │───▶│  Prisma / SQLite│
│ (scrapers)  │    │ (orchestrate)│    │  (persistence)  │
└─────────────┘    └──────────────┘    └────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Scoring    │
                    │  Engine     │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │  Express API (:3000)    │
              │  /api/vacancies         │
              │  /api/profile           │
              │  /api/scan              │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │  React UI   │
                    │  (Vite:5173)│
                    └─────────────┘
```

### Project Structure

```
JobMirror/
├── config/
│   ├── sources.json          # Enable/disable job boards
│   └── search-profile.json   # (optional) manual profile overrides
├── src/
│   ├── adapters/             # Scraper modules (pluggable)
│   │   ├── types.ts          # Shared interfaces
│   │   ├── utils.ts          # HTTP client, date parsing
│   │   ├── BaseAdapter.ts    # Abstract base class
│   │   ├── index.ts          # Adapter registry
│   │   ├── computrabajo.ts
│   │   ├── elempleo.ts
│   │   └── magneto.ts
│   ├── cli/                  # Terminal interface
│   │   ├── index.ts          # Entry point
│   │   └── commands/         # scan, today, feed, analyze, profile, stats
│   ├── core/
│   │   ├── scheduler.ts      # Pipeline orchestrator
│   │   ├── profileParser.ts  # PDF CV parser
│   │   ├── scoringEngine.ts  # 0-100 scoring
│   │   ├── recommendationEngine.ts  # Match classification
│   │   ├── skillExtractor.ts # Skill extraction from text
│   │   ├── riskAnalyzer.ts   # Risk penalty calculation
│   │   └── normalizer.ts     # Data normalizer
│   ├── server.ts             # Express API server
│   ├── db/schema.prisma      # Database schema
│   └── models/               # TypeScript interfaces
├── web/                      # React frontend
│   └── src/
│       ├── components/
│       │   ├── Dashboard.tsx
│       │   ├── Profile.tsx
│       │   ├── ProfileUpload.tsx
│       │   └── VacancyDetail.tsx
│       └── App.tsx
├── tests/unit/               # Jest test suites
├── resources/                # Skill synonyms & lookup tables
├── .env.example              # Environment template
└── README.md
```

---

## Scoring System

Each vacancy gets a **0–100 score** based on:

| Dimension | Weight (active search) | Weight (ideal career) |
|-----------|----------------------|----------------------|
| Compatibility (skills match) | 35% | 50% |
| Transferability (adjacent skills) | 40% | 30% |
| Growth potential (seniority leap) | 20% | 15% |
| Strategic value (tech company) | +80 if tech | +80 if tech |
| Risk penalty | -15 per missing mandatory skill | -15 per missing mandatory skill |

### Match Types

- **Directa** — Title matches your target roles. Score ≥ 75 → `APLICAR`
- **Transferible** — Adjacent roles (sistemas, procesos, soporte, logística). Score ≥ 55 → `PREPARAR`
- **Baja Relación** — Low relevance. Score ≥ 35 → `REVISAR`, else `IGNORAR`

---

## Adding a New Job Board

1. Create `src/adapters/<source>.ts` extending `BaseAdapter`
2. Implement `fetchListings()` and `enrichItem()`
3. Add config entry in `config/sources.json`
4. Done — the registry auto-loads it

See existing adapters (`computrabajo.ts`, `elempleo.ts`, `magneto.ts`) for reference.

---

## Testing

```bash
npm test
```

5 test suites covering: skill extraction, risk analysis, scoring engine, Computrabajo adapter, Elempleo adapter.

---

## Tech Stack

- **TypeScript** — Full-stack
- **Express** — API server
- **Prisma + SQLite** — Database
- **React + Vite** — Frontend
- **Cheerio** — HTML parsing
- **pdf-parse** — CV extraction
- **Jest + nock** — Testing

---

## License

MIT
