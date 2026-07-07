import axios from 'axios';

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

/**
 * LinkedIn adapter — placeholder.
 *
 * LinkedIn has very aggressive anti-bot protection.
 * Real implementation would require:
 *   - Using a headless browser (Puppeteer/Playwright)
 *   - Handling login cookies
 *   - Managing rate limits and CAPTCHAs
 *
 * For now returns a mock vacancy when enabled.
 * Contributions welcome!
 */
export async function fetchLinkedInVacancies(
  cfg: AdapterConfig
): Promise<RawVacancy[]> {
  // For now, just return a placeholder mock
  return [
    {
      title: 'Data Analyst',
      company: 'MockCorp',
      location: cfg.city ?? 'Bogota',
      url: 'https://www.linkedin.com/jobs/mock',
      description: 'Mock LinkedIn vacancy. Real scraping needs Puppeteer/Playwright.',
      source: 'linkedin',
    },
  ];
}
