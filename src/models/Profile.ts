export interface SkillEntry {
  name: string;
  rating: number;
}

export type SearchMode = 'carrera_ideal' | 'busqueda_activa';

export interface Profile {
  id: number;
  name: string;
  seniority: 'junior' | 'mid' | 'senior';
  skills: SkillEntry[];
  experience: number;
  targetRoles: string[];
  preferredLocations: string[];
  avoidKeywords: string[];
  education?: string;
  cvPath?: string;
  searchMode: SearchMode;
  createdAt?: Date;
  updatedAt?: Date;
}
