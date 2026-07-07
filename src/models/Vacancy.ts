export interface Vacancy {
  id?: number;
  title: string;
  company: string;
  location?: string | null;
  source: string;
  url: string;
  description: string;
  requirements?: string | null;
  salary?: string | null;
  contractType?: string | null;
  experienceRequired?: string | null;
  publishedAt?: Date | null;
  skillsExtracted?: string | null;
  score?: number | null;
  compatibility?: number | null;
  growth?: number | null;
  strategic?: number | null;
  createdAt?: Date;
}