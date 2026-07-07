import * as cheerio from 'cheerio';
import { BaseAdapter } from './BaseAdapter.ts';
import { extractJSONLD, parseRelativeDate } from './utils.ts';
import type { RawVacancy, AdapterConfig, ListingItem } from './types.ts';

interface JobPostingLD {
  '@type': 'JobPosting';
  title: string;
  datePosted: string;
  description: string;
  hiringOrganization?: { name: string };
  employmentType?: string;
}

export class MagnetoAdapter extends BaseAdapter {
  name = 'magneto';
  displayName = 'Magneto365';
  baseUrl = 'https://www.magneto365.com/co/trabajos/buscar/loc-bogota-d.c.-co';

  async fetchListings(page: number, _cfg: AdapterConfig): Promise<ListingItem[]> {
    const url = page > 1 ? `${this.baseUrl}?page=${page}` : this.baseUrl;

    const { data } = await this.http.get(url);
    const $ = cheerio.load(data);

    const items = $('article').filter((_i, el) =>
      ($(el).html() || '').includes('mg_job_card')
    );
    if (!items.length) return [];

    const listings: ListingItem[] = [];
    items.each((_i, el) => {
      const card = $(el);
      const titleEl = card.find('h2 a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href') || '';
      const absoluteUrl = link.startsWith('http') ? link : `https://www.magneto365.com${link}`;
      const companyText = card.find('h3').first().text().trim();
      const salary = card.find('p').first().text().trim();
      const location = card.find('p').eq(1).text().trim();
      // Try to extract date from a subsequent p element or a specific class
      let dateText = card.find('p').eq(2).text().trim();
      // If not found, try common date selectors
      if (!dateText) {
        dateText = card.find('.date, .time, [class*="date"], [class*="time"]').first().text().trim();
      }
      // Fallback: look for relative time like "hace 2 horas" in the card's text
      if (!dateText) {
        const fullText = card.text();
        const match = fullText.match(/hace\s+\d+\s+(minuto|hora|d[ií]a|semana)/i);
        if (match) {
          dateText = match[0];
        }
      }
      let datePosted: string | undefined;
      if (dateText) {
        const parsed = parseRelativeDate(dateText);
        if (parsed) datePosted = parsed;
        else {
          // fallback: try to extract ISO date like yyyy-mm-dd
          const m = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (m) {
            const [y, mth, d] = m.slice(1).map(Number);
            const date = new Date(y, mth - 1, d, 12, 0, 0);
            if (!isNaN(date.getTime())) datePosted = date.toISOString();
          }
        }
      }

      listings.push({
        title,
        url: absoluteUrl,
        company: companyText.split('|')[0]?.trim() || companyText || undefined,
        location: location || undefined,
        salary: salary || undefined,
        contractType: companyText.split('|')[1]?.trim() || undefined,
        datePosted,
      });
    });

    return listings;
  }

  async enrichItem(item: ListingItem, _cfg: AdapterConfig): Promise<Partial<RawVacancy>> {
    const data = await this.http.get(item.url).then(r => r.data).catch(() => null);
    if (!data) return {};

    const jsonld = extractJSONLD<JobPostingLD>(data, 'JobPosting');
    let description = '';
    let datePosted: string | undefined;

    if (jsonld) {
      description = jsonld.description || '';
      if (jsonld.datePosted) {
        const [y, m, d] = jsonld.datePosted.split('-').map(Number);
        const bogotaDate = new Date(y, m - 1, d, 12, 0, 0);
        if (!isNaN(bogotaDate.getTime())) datePosted = bogotaDate.toISOString();
      }
      if (!item.company && jsonld.hiringOrganization?.name) {
        return { description, datePosted, company: jsonld.hiringOrganization.name };
      }
    }

    if (!description) {
      const $ = cheerio.load(data);
      for (const sel of ['[class*="description"]', '[class*="descripcion"]', '[class*="body"]', '.fs16']) {
        const el = $(sel).first();
        if (el.length) {
          const txt = el.text().trim();
          if (txt.length > 50) { description = txt; break; }
        }
      }
      if (!description) {
        const bodyText = $('body').text();
        description = bodyText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\s+/g, ' ').trim().slice(0, 2000);
      }
    }

    if (!datePosted) {
      const $ = cheerio.load(data);
      const bodyText = $('body').text();
      const pubMatch = bodyText.match(/de publicación\s+(\d{4}-\d{2}-\d{2})/i);
      if (pubMatch) {
        const [y, m, d] = pubMatch[1].split('-').map(Number);
        const bogotaDate = new Date(y, m - 1, d, 12, 0, 0);
        if (!isNaN(bogotaDate.getTime())) datePosted = bogotaDate.toISOString();
      }
      // Fallback: try parsing relative date like "hace 2 horas"
      if (!datePosted) {
        // Try to find a visible date element first
        const dateEl = $('.date, .time, [class*="date"], [class*="time"]').first();
        const dateText = dateEl.text().trim() || bodyText.match(/hace\s+\d+\s+(minuto|hora|d[ií]a|semana)/i)?.[0];
        if (dateText) {
          const relative = parseRelativeDate(dateText);
          if (relative) datePosted = relative;
        }
      }
    }

    return { description, datePosted };
  }
}
