import axios from 'axios';
import type { AxiosInstance } from 'axios';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
};

export function createHttpClient(baseHeaders?: Record<string, string>): AxiosInstance {
  return axios.create({
    headers: { ...DEFAULT_HEADERS, ...baseHeaders },
    timeout: 20000,
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
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
