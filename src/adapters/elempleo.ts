import * as cheerio from 'cheerio';
import { BaseAdapter } from './BaseAdapter.ts';
import { parseRelativeDate } from './utils.ts';
import type { RawVacancy, AdapterConfig, ListingItem } from './types.ts';

export class ElempleoAdapter extends BaseAdapter {
  name = 'elempleo';
  displayName = 'Elempleo';
  baseUrl = 'https://www.elempleo.com/co/ofertas-empleo/bogota';

  async fetchListings(page: number, cfg: AdapterConfig): Promise<ListingItem[]> {
    const city = cfg.city ?? 'bogota';
    const url = page > 1
      ? `https://www.elempleo.com/co/ofertas-empleo/${city}?pagina=${page}`
      : `https://www.elempleo.com/co/ofertas-empleo/${city}`;

    const { data } = await this.http.get(url);
    const $ = cheerio.load(data);

    const items = $('.area-bind.result-info-container-item');
    if (!items.length) return [];

    const listings: ListingItem[] = [];
    items.each((_i, el) => {
      const link = $(el).attr('data-url') || $(el).find('.js-offer-title').attr('href') || '';
      const title = $(el).find('.js-offer-title').text().trim();
      const company = $(el).find('[class*=company], [class*=empresa]').first().text().trim();
      const location = $(el).find('[class*=location], [class*=ubicacion]').first().text().trim();
      const absoluteUrl = link.startsWith('http') ? link : `https://www.elempleo.com${link}`;

      listings.push({
        title,
        url: absoluteUrl,
        company: company || undefined,
        location: location || undefined,
      });
    });

    return listings;
  }

  async enrichItem(item: ListingItem, _cfg: AdapterConfig): Promise<Partial<RawVacancy>> {
    const data = await this.http.get(item.url).then(r => r.data).catch(() => null);
    if (!data) return {};

    const $ = cheerio.load(data);
    const bodyText = $('body').text();

    const pubEl = $('.js-publish-date').first().text().trim();
    const pubMatch = pubEl.match(/publicado\s+(\d+\s+\w+\s+\d{4})/i);
    let datePosted: string | undefined;
    if (pubMatch) {
      const parsed = new Date(pubMatch[1]);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(12, 0, 0, 0);
        datePosted = parsed.toISOString();
      }
    }
    // Fallback: try parsing relative date like "hace 2 horas"
    if (!datePosted && pubEl) {
      const relative = parseRelativeDate(pubEl);
      if (relative) datePosted = relative;
    }

    const descSelectors = [
      '[class*="description"]', '[class*="descripcion"]',
      '.description-text', '.job-description', '.offer-description',
      '[itemprop="description"]', '.detail-description', '.fs16.lh20',
      '#descripcion', '.descripcion', '.description',
    ];
    let description = '';
    for (const sel of descSelectors) {
      const el = $(sel);
      if (el.length) { description = el.text().trim(); if (description.length > 50) break; }
    }
    if (!description) {
      description = bodyText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\s+/g, ' ').trim().slice(0, 2000);
    }

    const company = !item.company
      ? $('[class*=company], [class*=empresa]').first().text().trim() || undefined
      : undefined;
    const salary = bodyText.match(/\$\s*[\d.,]+/)?.[0];
    const contract = bodyText.match(/(Contrato|Tiempo\s+(Completo|Parcial)|Indefinido|Temporal)/i)?.[0];
    const experience = bodyText.match(/(\d+)\s*años?\s*(?:de\s+)?(?:experiencia|exp)/i)?.[0];

    return {
      description,
      company,
      datePosted,
      salary: salary || undefined,
      contractType: contract || undefined,
      experienceRequired: experience || undefined,
    };
  }
}
