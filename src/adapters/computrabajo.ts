import * as cheerio from 'cheerio';
import { BaseAdapter } from './BaseAdapter.ts';
import { parseRelativeDate } from './utils.ts';
import type { RawVacancy, AdapterConfig, ListingItem } from './types.ts';

// Base headers for Computrabajo (without User-Agent, which will be added randomly by BaseAdapter)
const COMPUTRABOJO_BASE_HEADERS = {
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

export class ComputrabajoAdapter extends BaseAdapter {
  name = 'computrabajo';
  displayName = 'Computrabajo';
  baseUrl = 'https://co.computrabajo.com/empleos-en-bogota-dc';

  protected getBaseHeaders(): Record<string, string> {
    return COMPUTRABOJO_BASE_HEADERS;
  }

  async fetchListings(page: number, cfg: AdapterConfig): Promise<ListingItem[]> {
    const city = cfg.city?.toLowerCase() ?? 'bogota-dc';
    const url = page > 1
      ? `https://co.computrabajo.com/empleos-en-${city}?by=publicationtime&page=${page}`
      : `https://co.computrabajo.com/empleos-en-${city}?by=publicationtime`;

    const { data } = await this.http.get(url);
    const $ = cheerio.load(data);

    const items = $('.js-o-link, a[class*="title"], .t_offer_list .offer_title a, article a[href*="empleos"]');
    if (!items.length) return [];

    const listings: ListingItem[] = [];
    items.each((_i, el) => {
      const link = $(el).attr('href') || '';
      const title = $(el).text().trim();
      const article = $(el).closest('article, .box, .offer, [class*="offer"], li');
      const company = article.find('a[offer-grid-article-company-url], a.fc_base.t_ellipsis, a[href*="empresa"]').first().text().trim();
      const location = article.find('[class*="location"], [class*="ubicacion"], .fc_base, [class*="city"]').first().text().trim();
      let dateText = article.find('.fs13.fc_aux').first().text().trim();
      // fallback: look for common time selectors
      if (!dateText) {
        dateText = article.find('.time, [class*="time"], [class*="date"], .fc_aux').first().text().trim();
      }
      const absoluteUrl = link.startsWith('http') ? link : `https://co.computrabajo.com${link}`;

      listings.push({
        title,
        url: absoluteUrl,
        company: company || undefined,
        location: location || undefined,
        datePosted: parseRelativeDate(dateText),
      });
    });

    return listings;
  }

  async enrichItem(item: ListingItem, _cfg: AdapterConfig): Promise<Partial<RawVacancy>> {
    const data = await this.http.get(item.url.split('#')[0]).then(r => r.data).catch(() => null);
    if (!data) return {};

    const $ = cheerio.load(data);
    const bodyText = $('body').text();

    const descSelectors = [
      '[class*="description"]', '[class*="descripcion"]',
      'div.mb40.pb40.bb1', '.fs16.lh20.mt15', '.offer_description',
      '#offer_description', '[itemprop="description"]', 'main',
    ];
    let description = '';
    for (const sel of descSelectors) {
      const el = $(sel);
      if (el.length) { description = el.text().trim(); if (description.length > 50) break; }
    }
    if (!description) {
      description = bodyText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\s+/g, ' ').trim().slice(0, 2000);
    }

    const salary = bodyText.match(/\$\s*[\d.,]+/)?.[0];
    const contract = bodyText.match(/(Contrato|Tiempo\s+(Completo|Parcial)|Indefinido|Temporal)/i)?.[0];
    const experience = bodyText.match(/(\d+)\s*años?\s*(?:de\s+)?(?:experiencia|exp)/i)?.[0];

    return {
      description,
      salary: salary || undefined,
      contractType: contract || undefined,
      experienceRequired: experience || undefined,
    };
  }
}