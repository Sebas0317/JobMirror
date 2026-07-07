export interface Vacancy {
  id: number;
  title: string;
  company: string;
  location?: string;
  source: string;
  url: string;
  description: string;
  requirements?: string;
  publishedAt?: string;
  salary?: string;
  contractType?: string;
  experienceRequired?: string;
  skillsExtracted?: string;
  score?: number;
  compatibility?: number;
  growth?: number;
  strategic?: number;
  createdAt?: string;
}