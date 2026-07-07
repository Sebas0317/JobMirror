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

export async function fetchIndeedVacancies(
  cfg: AdapterConfig
): Promise<RawVacancy[]> {
  const results: RawVacancy[] = [];
  const seenUrls = new Set<string>();
  const baseUrl = 'https://co.indeed.com/jobs';
  const city = cfg.city ?? '';
  const query = cfg.keywords?.join(' ') ?? '';
  const maxPages = cfg.pages ?? 1;
  const limit = pLimit(5);

  const buildSearchUrl = (page: number) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (city) params.append('l', city);
    if (page > 1) params.append('start', ((page - 1) * 10).toString());
    const paramString = params.toString();
    return paramString ? `${baseUrl}?${paramString}` : baseUrl;
  };

  for (let page = 1; page <= maxPages; page++) {
    const url = buildSearchUrl(page);
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
        timeout: 15000,
      });
      const $ = cheerio.load(data);

      const items = $('.job_seen_beacon, .job-card-container, .result, .cardOutline');
      if (!items.length) break;

      const detailPromises = items.map((_i, el) => {
        const link = $(el).find('a[href*="/viewjob"], a[href*="/rc/clk"]').attr('href') || $(el).find('a').first().attr('href') || '';
        const title = $(el).find('.jobTitle, .job-title, h2, .title').text().trim();
        const company = $(el).find('.companyName, .company, .employer, .company-name').text().trim();
        const location = $(el).find('.companyLocation, .location, .company-location').text().trim();
        const absoluteUrl = link?.startsWith('http')
          ? link
          : `https://co.indeed.com${link}`;

        if (seenUrls.has(absoluteUrl)) return Promise.resolve();
        seenUrls.add(absoluteUrl);

        return limit(async () => {
          try {
            const detailRes = await axios.get(absoluteUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
              timeout: 15000,
            });
            const $$ = cheerio.load(detailRes.data);
            const description = $$('#jobDescriptionText, .jobsearch-jobDescriptionText, .job-description, [class*="description"]').text().trim();
            const salary = $$('.salary-snippet, .salary-text, .salary, [class*="salary"]').text().trim();
            const dateText = $$('[data-testid="jobsearch-detail"], .date, [class*="date"], time').first().text().trim();

            results.push({
              source: 'indeed',
              title,
              company,
              location: location || undefined,
              url: absoluteUrl,
              description: description || 'Sin descripción',
              salary: salary || undefined,
              datePosted: dateText || undefined,
            });
          } catch (e) {
            console.warn('Failed to fetch Indeed detail', absoluteUrl);
          }
        });
      }).get();

      await Promise.all(detailPromises);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn('Error fetching Indeed page', url);
    }
  }

  return results;
}
