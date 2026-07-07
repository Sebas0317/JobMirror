import type { Vacancy } from '../models/Vacancy.ts';

/**
 * Normalizer that converts raw data from adapters into the canonical Vacancy
 * shape used throughout the application.
 *
 * For the MVP the adapters already return objects that match the `Vacancy`
 * interface, so this function simply copies the fields and performs a few
 * sanity checks. When real scrapers are added this is the place to map the
 * heterogeneous structures.
 */
export function normalize(raw: any): Vacancy {
  return {
    title: raw.title ?? '',
    company: raw.company ?? '',
    location: raw.location,
    description: raw.description ?? '',
      requirements: raw.requirements ?? undefined,
    url: raw.url ?? '',
      source: raw.source ?? 'mock',
    publishedAt: raw.datePosted ? new Date(raw.datePosted) : undefined,
  } as Vacancy;
}
