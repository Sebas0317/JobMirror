import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
// Vacancy type not needed in this adapter

/**
 * Raw shape for Elempleo vacancies. Mirrors the fields expected by the normalizer.
 */
export interface RawVacancy {
  title: string;
  company: string;
  location?: string;
  url: string;
  description: string;
  requirements?: string;
  salary?: string;
  contractType?: string;
  experienceRequired?: string;
  datePosted?: string; // ISO string or any parseable value
  source?: string;
}

/**
 * Configuration object that matches `config/sources.json`.
 */
export interface AdapterConfig {
  enabled: boolean;
  city?: string;
  keywords?: string[];
  pages?: number;
}

/**
 * Fetch real vacancies from Elempleo (Chile) according to the supplied configuration.
 *
 * The scraper works with a very defensive approach:
 *   - adds a custom User‑Agent header,
 *   - respects a 1 s delay between pagination requests,
 *   - limits concurrent detail page fetches to 5 (p‑limit).
 * Errors on individual pages or details are logged and the pipeline continues.
 */
export async function fetchElempleoVacancies(
  cfg: AdapterConfig
): Promise<RawVacancy[]> {
  const results: RawVacancy[] = [];
  const seenUrls = new Set<string>();
  const city = cfg.city ?? 'bogota';
  const baseUrl = `https://www.elempleo.com/co/ofertas-empleo/${city}`;
  const maxPages = cfg.pages ?? 1;
  const limit = pLimit(5);

  const buildSearchUrl = (page: number) => {
    if (page > 1) return `${baseUrl}?pagina=${page}`;
    return baseUrl;
  };

  for (let page = 1; page <= maxPages; page++) {
    const url = buildSearchUrl(page);
    try {
      console.warn('Fetching URL:', url);
        const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareerRadarAI/1.0)' },
        timeout: 15000,
      });
      const $ = cheerio.load(data);

      const items = $('.area-bind.result-info-container-item');
      if (!items.length) break;

      const detailPromises = items.map((_i, el) => {
        const link = $(el).attr('data-url') || $(el).find('.js-offer-title').attr('href');
        const title = $(el).find('.js-offer-title').text().trim();
        const company = $(el).find('[class*=company], [class*=empresa]').first().text().trim();
        const location = $(el).find('[class*=location], [class*=ubicacion]').first().text().trim();
        const absoluteUrl = link?.startsWith('http') ? link : `https://www.elempleo.com${link}`;

        if (seenUrls.has(absoluteUrl)) { return; }
        seenUrls.add(absoluteUrl);
        const vacancy: RawVacancy = {
          title,
          company,
          location: location || undefined,
          url: absoluteUrl,
          description: '',
          source: 'elempleo',
        } as any;
        results.push(vacancy);
        return limit(async () => {
          try {
            const detailRes = await axios.get(absoluteUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CareerRadarAI/1.0)' },
              timeout: 15000,
            });
            const $$ = cheerio.load(detailRes.data);
            const bodyText = $$('body').text();

            // Extract date from detail page: "Publicado 7 Jul 2026"
            const pubEl = $$('.js-publish-date, .publish-date-info').first().text().trim();
            const pubMatch = pubEl.match(/publicado\s+(\d+\s+\w+\s+\d{4})/i);
            if (pubMatch) {
              const parsed = new Date(pubMatch[1]);
              if (!isNaN(parsed.getTime())) vacancy.datePosted = parsed.toISOString();
            }

            const descSelectors = [
              '[class*="description"]', '[class*="descripcion"]',
              '.description-text', '.job-description', '.offer-description',
              '[itemprop="description"]', '.detail-description', '.fs16.lh20',
              '#descripcion', '.descripcion', '.description',
            ];
            let desc = '';
            for (const sel of descSelectors) {
              const el = $$(sel);
              if (el.length) { desc = el.text().trim(); if (desc.length > 50) break; }
            }
            vacancy.description = desc || bodyText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\s+/g, ' ').trim().slice(0, 2000);

            // If company was empty on listing, try detail page
            if (!vacancy.company) {
              const coEl = $$('[class*=company], [class*=empresa]').first().text().trim();
              if (coEl) vacancy.company = coEl;
            }

            const salaryMatch = bodyText.match(/\$\s*[\d.,]+/);
            const contractMatch = bodyText.match(/(Contrato|Tiempo\s+(Completo|Parcial)|Indefinido|Temporal)/i);
            const expMatch = bodyText.match(/(\d+)\s*años?\s*(?:de\s+)?(?:experiencia|exp)/i);
            if (salaryMatch) vacancy.salary = salaryMatch[0];
            if (contractMatch) vacancy.contractType = contractMatch[0];
            if (expMatch) vacancy.experienceRequired = expMatch[0];
          } catch (e) {
            console.warn('Failed to fetch Elempleo detail', absoluteUrl, e);
          }
        });
      }).get();

      await Promise.all(detailPromises);
      await new Promise((r) => setTimeout(r, 1000)); // polite pause
    } catch (err) {
      console.warn('Error fetching Elempleo page', url, err);
    }
  }

  return results;
}
