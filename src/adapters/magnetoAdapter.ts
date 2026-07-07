import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

export interface RawVacancy {
  source?: string;
  title: string;
  company: string;
  location?: string;
  url: string;
  description: string;
  requirements?: string;
  salary?: string;
  contractType?: string;
  experienceRequired?: string;
  datePosted?: string;
}

export interface AdapterConfig {
  enabled: boolean;
  city?: string;
  keywords?: string[];
  pages?: number;
}

export async function fetchMagnetoVacancies(
  cfg: AdapterConfig
): Promise<RawVacancy[]> {
  const results: RawVacancy[] = [];
  const seenUrls = new Set<string>();
  const limit = pLimit(5);

  const baseUrl = 'https://www.magneto365.com/co/trabajos/buscar/loc-bogota-d.c.-co';

  for (let page = 1; page <= (cfg.pages ?? 1); page++) {
    const url = page > 1 ? `${baseUrl}?page=${page}` : baseUrl;
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
        timeout: 15000,
      });
      const $ = cheerio.load(data);

      const items = $('article').filter((_i, el) =>
        ($(el).html() || '').includes('mg_job_card')
      );
      if (!items.length) break;

      const detailPromises = items.map((_i, el) => {
        const card = $(el);
        const titleEl = card.find('h2 a').first();
        const title = titleEl.text().trim();
        const link = titleEl.attr('href') || '';
        const absoluteUrl = link.startsWith('http') ? link : `https://www.magneto365.com${link}`;

        const companyText = card.find('h3').first().text().trim();
        const company = companyText.split('|')[0]?.trim() || companyText;
        const contractType = companyText.split('|')[1]?.trim();

        const salary = card.find('p').first().text().trim();
        const location = card.find('p').eq(1).text().trim();

        if (seenUrls.has(absoluteUrl)) return Promise.resolve();
        seenUrls.add(absoluteUrl);
        const vacancy: RawVacancy = {
          title,
          company,
          location: location || undefined,
          url: absoluteUrl,
          description: '',
          salary: salary || undefined,
          contractType: contractType || undefined,
          source: 'magneto',
        };
        results.push(vacancy);
        return limit(async () => {
          try {
            const detailRes = await axios.get(absoluteUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
              timeout: 15000,
            });
            const $$ = cheerio.load(detailRes.data);
            const bodyText = $$('body').text();

            // Extract JSON-LD JobPosting
            const jsonldRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
            let jsonMatch;
            while ((jsonMatch = jsonldRegex.exec(detailRes.data)) !== null) {
              try {
                const parsed = JSON.parse(jsonMatch[1].trim());
                if (parsed['@type'] === 'JobPosting') {
                  if (parsed.description && !vacancy.description) {
                    vacancy.description = parsed.description;
                  }
                  if (parsed.datePosted && !vacancy.datePosted) {
                    vacancy.datePosted = parsed.datePosted;
                  }
                  if (parsed.hiringOrganization?.name && !vacancy.company) {
                    vacancy.company = parsed.hiringOrganization.name;
                  }
                  if (parsed.employmentType && !vacancy.contractType) {
                    vacancy.contractType = parsed.employmentType;
                  }
                  break;
                }
              } catch (_) {}
            }

            // Fallback description from HTML if JSON-LD didn't have it
            if (!vacancy.description) {
              const descSelectors = [
                '[class*="description"]', '[class*="descripcion"]',
                '.fs16', '.lh20', '[class*="body"]',
              ];
              for (const sel of descSelectors) {
                const el = $$(sel);
                if (el.length) {
                  const txt = el.text().trim();
                  if (txt.length > 50) {
                    vacancy.description = txt;
                    break;
                  }
                }
              }
              if (!vacancy.description) {
                vacancy.description = bodyText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\s+/g, ' ').trim().slice(0, 2000);
              }
            }

            // Fallback date from text
            if (!vacancy.datePosted) {
              const pubMatch = bodyText.match(/de publicación\s+(\d{4}-\d{2}-\d{2})/i);
              if (pubMatch) vacancy.datePosted = pubMatch[1];
            }

            // Salary/experience from body
            if (!vacancy.salary) {
              const salMatch = bodyText.match(/\$\s*[\d.,]+\s*(?:a\s*\$?\s*[\d.,]+)?/);
              if (salMatch) vacancy.salary = salMatch[0].trim();
            }
            const expMatch = bodyText.match(/(\d+)\s*(?:años?|meses?)\s*(?:de\s+)?(?:experiencia|exp)/i);
            if (expMatch) vacancy.experienceRequired = expMatch[0];
          } catch (e) {
            console.warn('Failed to fetch Magneto detail', absoluteUrl, e);
          }
        });
      }).get();

      await Promise.all(detailPromises);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn('Error fetching Magneto page', url, err);
    }
  }
  return results;
}
