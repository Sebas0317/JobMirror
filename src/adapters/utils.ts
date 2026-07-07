import axios from 'axios';
import type { AxiosInstance } from 'axios';

export const DEFAULT_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://co.computrabajo.com/',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0',
];

export function getRandomHeaders(): Record<string, string> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return {
    'User-Agent': ua,
    // Keep Accept-Language from DEFAULT_HEADERS (no need to override)
  };
}

export function createHttpClient(baseHeaders?: Record<string, string>): AxiosInstance {
  const headers = { ...DEFAULT_HEADERS, ...baseHeaders };
  return axios.create({
    headers,
    timeout: 20000,
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function fetchWithRetry(url: string, http: AxiosInstance): Promise<string> {
  let attempt = 0;
  while (true) {
    try {
      const response = await http.get(url);
      if (response.status === 429) {
        const retryAfter = response.headers['retry-after'] ?? 5;
        await sleep(Number(retryAfter) * 1000);
        continue;
      }
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 429 || err.response?.status >= 500) {
        attempt++;
        if (attempt > 3) throw err;
        const backoff = Math.min(2 ** attempt, 30) * 1000; // exponential backoff max 30s
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

export function parseRelativeDate(text: string): string | undefined {
  const match = text.match(/hace\s+(\d+)\s+(minuto|hora|d[ií]a|semana)/i);
  if (!match) return;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const now = new Date();
  if (unit.startsWith('minuto')) now.setMinutes(now.getMinutes() - num);
  else if (unit.startsWith('hora')) now.setHours(now.getHours() - num);
  else if (unit.startsWith('d')) now.setDate(now.getDate() - num);
  else if (unit.startsWith('semana')) now.setDate(now.getDate() - num * 7);
  return now.toISOString();
}

export function parseAbsoluteDate(text: string): string | undefined {
  const cleaned = text.replace(/^publicado\s+/i, '').trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
}

export function extractJSONLD<T = Record<string, unknown>>(html: string, type: string): T | null {
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed['@type'] === type) return parsed as T;
    } catch { /* skip invalid JSON */ }
  }
  return null;
}

export async function tryFetch(url: string, http: AxiosInstance): Promise<string | null> {
  try {
    const { data } = await http.get(url.split('#')[0]);
    return data;
  } catch {
    return null;
  }
}