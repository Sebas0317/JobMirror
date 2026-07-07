import pLimit from 'p-limit';
import { createHttpClient, sleep } from './utils.ts';
import type { AxiosInstance } from 'axios';
import type { RawVacancy, AdapterConfig, ListingItem, AdapterInfo } from './types.ts';

export abstract class BaseAdapter {
  abstract name: string;
  abstract displayName: string;
  abstract baseUrl: string;

  protected http: AxiosInstance = createHttpClient();
  protected limit = pLimit(5);
  protected seenUrls = new Set<string>();

  get info(): AdapterInfo {
    return {
      name: this.name,
      displayName: this.displayName,
      baseUrl: this.baseUrl,
      enabled: true,
    };
  }

  abstract fetchListings(page: number, cfg: AdapterConfig): Promise<ListingItem[]>;

  enrichItem(_item: ListingItem, _cfg: AdapterConfig): Promise<Partial<RawVacancy>> {
    return Promise.resolve({});
  }

  async run(cfg: AdapterConfig): Promise<RawVacancy[]> {
    const results: RawVacancy[] = [];
    this.seenUrls.clear();
    const pages = cfg.pages ?? 1;

    for (let page = 1; page <= pages; page++) {
      try {
        const items = await this.fetchListings(page, cfg);
        if (!items.length) break;

        const enriched = await Promise.all(
          items.map(item => {
            if (this.seenUrls.has(item.url)) return Promise.resolve(null);
            this.seenUrls.add(item.url);

            return this.limit(async () => {
              const extra = await this.enrichItem(item, cfg);
              const vacancy: RawVacancy = {
                title: item.title,
                company: item.company || '',
                location: item.location,
                url: item.url,
                description: '',
                salary: item.salary,
                contractType: item.contractType,
                datePosted: item.datePosted || extra.datePosted,
                source: this.name,
                ...extra,
              };
              return vacancy;
            });
          })
        );

        results.push(...enriched.filter((v): v is RawVacancy => v !== null));
        await sleep(1000);
      } catch (err) {
        console.warn(`  ${this.name}: error en página ${page} —`, (err as Error).message);
      }
    }

    return results;
  }
}
