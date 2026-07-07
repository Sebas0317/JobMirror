# Adding a New Job‑Board Adapter

Career Radar AI is built to **plug in** new data sources with minimal friction.  Follow these steps to add a brand‑new adapter.

## 1. Define the Adapter Skeleton
Create a file under `src/adapters/` named `<Source>Adapter.ts`.  Export a single async function:

```ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { RawVacancy } from '../models/RawVacancy';

/**
 * Fetch vacancies from <Source>.
 * Return an array of `RawVacancy` objects that match the expected shape.
 */
export async function fetch<Source>Vacancies(): Promise<RawVacancy[]> {
  // 1️⃣  Request the listings page (handle pagination if needed)
  // 2️⃣  Parse each listing to extract a minimal set of fields:
  //      id, title, company, location, url, description, publishedAt, source
  // 3️⃣  (Optional) Call a detail page for richer data.
  // 4️⃣  Return the array; on any error, return a mock vacancy so the pipeline stays alive.
}
```

### Required Fields in `RawVacancy`
| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier (local auto‑increment is fine). |
| `title` | string | Job title. |
| `company` | string | Employer name. |
| `location`? | string | Optional location string. |
| `url` | string | Link to the original posting. |
| `description` | string | Full job description (HTML or plain text). |
| `publishedAt`? | string | ISO‑8601 date string (or leave undefined). |
| `source` | string | Must match the key used in `config/sources.json` (e.g., `"computrabajo"`). |

## 2. Add Configuration
Edit `config/sources.json` and insert an entry for the new source:

```json
{
  "name": "newsource",
  "enabled": true,
  "params": {
    "baseUrl": "https://www.newsource.com/jobs",
    "maxPages": 5
  }
}
```
The `params` object is passed verbatim to the adapter (you can read it via `configLoader`).

## 3. Wire the Adapter into the Scheduler
Open `src/core/scheduler.ts` and import the new function:

```ts
import { fetchNewsourceVacancies } from '../adapters/newsourceAdapter.ts';
```
Add it to the `sourceFetchers` map (or similar structure) so the scheduler will invoke it when the source is enabled.

## 4. Write Unit Tests
Create a test file under `tests/unit/`:

```ts
import { fetchNewsourceVacancies } from '../../src/adapters/newsourceAdapter';
import nock from 'nock';

test('fetches and parses a simple listing', async () => {
  nock('https://www.newsource.com')
    .get('/jobs?page=1')
    .reply(200, `<html>…mock markup…</html>`);

  const result = await fetchNewsourceVacancies();
  expect(result).toHaveLength(1);
  expect(result[0].title).toBe('Senior Engineer');
});
```
Use `nock` (or any HTTP mock) to avoid real network calls.

## 5. Verify End‑to‑End
Run the scheduler:
```bash
npm run scheduler
```
Check that the new vacancies appear in the Dashboard and that the scoring engine processes them without errors.

---

**Tips & Gotchas**
- Keep the scraper **stateless**; store no global mutable data.
- Respect robots.txt / terms of service for the target site.
- If the site uses heavy JavaScript, consider using a headless browser (Puppeteer) but note the increased runtime cost.
- Always fallback to a mock vacancy on error so the rest of the pipeline stays healthy.
