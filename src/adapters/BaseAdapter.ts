import pLimit from 'p-limit';
import { createHttpClient, sleep, getRandomHeaders, DEFAULT_HEADERS } from './utils.ts';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { RawVacancy, AdapterConfig, ListingItem, AdapterInfo } from './types.ts';

export abstract class BaseAdapter {
  abstract name: string;
  abstract displayName: string;
  abstract baseUrl: string;

  protected http!: AxiosInstance; // will be initialized in constructor
  protected limit = pLimit(5);
  protected seenUrls = new Set<string>();

  /** Return the default headers specific to this adapter (without User-Agent). */
  protected getBaseHeaders(): Record<string, string> {
    return DEFAULT_HEADERS;
  }

  constructor() {
    // No super() since BaseAdapter does not extend another class
    // Merge base headers with a random User-Agent
    const baseHeaders = this.getBaseHeaders();
    const randHeaders = getRandomHeaders();
    this.http = createHttpClient({ ...baseHeaders, ...randHeaders });

    // Add response interceptor for retry logic
    this.http.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { config, response } = error;
        if (!config) {
          return Promise.reject(error);
        }
        if (response && (response.status === 429 || response.status >= 500)) {
          const retryCount = (config as any).__retryCount ?? 0;
          if (retryCount < 3) {
            (config as any).__retryCount = retryCount + 1;
            const retryAfter = response.headers['retry-after'];
            if (retryAfter) {
              const delaySec = parseInt(retryAfter, 10);
              if (!isNaN(delaySec) && delaySec > 0) {
                const delayMs = Math.min(delaySec * 1000, 30000);
                await new Promise(res => setTimeout(res, delayMs));
                return this.http.request(config);
              }
            }
            const delay = Math.min(2 ** (retryCount + 1), 30) * 1000;
            await new Promise(res => setTimeout(res, delay));
            return this.http.request(config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

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
        await sleep(3000);
      } catch (err) {
        console.warn(`  ${this.name}: error en página ${page} —`, (err as Error).message);
      }
    }

    return results;
  }
}