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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
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

export async function fetchComputrabajoVacancies(
  cfg: AdapterConfig
): Promise<RawVacancy[]> {
  const results: RawVacancy[] = [];
  const seenUrls = new Set<string>();
  const city = cfg.city?.toLowerCase() ?? 'bogota-dc';
  const query = cfg.keywords?.join(' ') ?? '';
  const maxPages = cfg.pages ?? 1;
  const limit = pLimit(3);
  const baseUrl = `https://co.computrabajo.com/empleos-en-${city}`;

  const buildSearchUrl = (page: number) => {
    const params = new URLSearchParams();
    params.append('by', 'publicationtime');
    if (page > 1) params.append('page', page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  for (let page = 1; page <= maxPages; page++) {
    const url = buildSearchUrl(page);
    try {
      const { data } = await axios.get(url, { headers: HEADERS, timeout: 20000 });
      const $ = cheerio.load(data);

      // Try multiple listing selectors (site changes frequently)
      const items = $('.js-o-link, a[class*="title"], .t_offer_list .offer_title a, article a[href*="empleos"]');
      if (!items.length) {
        console.warn('Computrabajo: no listing items found, may be blocked');
        break;
      }

      const detailPromises = items.map((_i, el) => {
        const link = $(el).attr('href');
        const title = $(el).text().trim();
        const article = $(el).closest('article, .box, .offer, [class*="offer"], li');
        const company = article.find('a[offer-grid-article-company-url], a.fc_base.t_ellipsis, a[href*="empresa"]').first().text().trim();
        const location = article.find('[class*="location"], [class*="ubicacion"], .fc_base, [class*="city"]').first().text().trim();
        const absoluteUrl = link?.startsWith('http')
          ? link
          : `https://co.computrabajo.com${link}`;

        const dateText = article.find('.fs13.fc_aux').first().text().trim();
        let datePosted: string | undefined;
        if (dateText) {
          const relativeMatch = dateText.match(/hace\s+(\d+)\s+(minuto|hora|d[ií]a|semana)/i);
          if (relativeMatch) {
            const num = parseInt(relativeMatch[1], 10);
            const unit = relativeMatch[2].toLowerCase();
            const now = new Date();
            if (unit.startsWith('minuto')) now.setMinutes(now.getMinutes() - num);
            else if (unit.startsWith('hora')) now.setHours(now.getHours() - num);
            else if (unit.startsWith('d')) now.setDate(now.getDate() - num);
            else if (unit.startsWith('semana')) now.setDate(now.getDate() - num * 7);
            datePosted = now.toISOString();
          }
        }

        return limit(async () => {
          try {
            const detailRes = await axios.get(absoluteUrl, { headers: HEADERS, timeout: 20000 });
            const $$ = cheerio.load(detailRes.data);
            const bodyText = $$('body').text();

            const descSelectors = [
              '[class*="description"]', '[class*="descripcion"]',
              'div.mb40.pb40.bb1', '.fs16.lh20.mt15', '.offer_description',
              '#offer_description', '[itemprop="description"]', 'main',
            ];
            let description = '';
            for (const sel of descSelectors) {
              const el = $$(sel);
              if (el.length) { description = el.text().trim(); if (description.length > 50) break; }
            }
            if (!description) description = bodyText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\s+/g, ' ').trim().slice(0, 2000);

            const salaryMatch = bodyText.match(/\$\s*[\d.,]+/);
            const contractMatch = bodyText.match(/(Contrato|Tiempo\s+(Completo|Parcial)|Indefinido|Temporal)/i);
            const expMatch = bodyText.match(/(\d+)\s*años?\s*(?:de\s+)?(?:experiencia|exp)/i);

            if (seenUrls.has(absoluteUrl)) return;
            seenUrls.add(absoluteUrl);
            results.push({
              title,
              company,
              location: location || undefined,
              url: absoluteUrl,
              description,
              salary: salaryMatch?.[0],
              contractType: contractMatch?.[0],
              experienceRequired: expMatch ? expMatch[0] : undefined,
              datePosted,
            });
          } catch (e) {
            console.warn('Computrabajo detail error:', absoluteUrl.slice(0, 80));
          }
        });
      }).get();

      await Promise.all(detailPromises);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.warn('Computrabajo page error:', url.slice(0, 80));
    }
  }

  return results;
}
