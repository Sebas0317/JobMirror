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
  [key: string]: unknown;
}

export interface ListingItem {
  title: string;
  url: string;
  company?: string;
  location?: string;
  salary?: string;
  contractType?: string;
  datePosted?: string;
}

export interface AdapterInfo {
  name: string;
  displayName: string;
  baseUrl: string;
  enabled: boolean;
  note?: string;
}
