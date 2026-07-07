import { readFile } from 'fs/promises';
import { extractSkills } from './skillExtractor.ts';
import type { Profile, SkillEntry } from '../models/Profile.ts';

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december',
  'enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

async function extractTextFromPDF(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const uint8 = new Uint8Array(buffer);
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: uint8 });
  const result = await parser.getText();
  return result?.pages?.map((p: any) => p.text).join('\n') ?? '';
}

function extractName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}$/.test(line) && line.length < 50) {
      return line;
    }
  }
  return 'Unknown';
}

function extractEmail(text: string): string | undefined {
  const m = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return m?.[0];
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
  return m?.[0];
}

function extractSeniority(text: string): 'junior' | 'mid' | 'senior' {
  const lower = text.toLowerCase();
  if (/\b(junior|jr\.?|trainee|practicante)\b/.test(lower)) return 'junior';
  if (/\b(senior|sr\.?|lead|principal|architect)\b/.test(lower)) return 'senior';
  if (/\b(mid|semi-senior|intermediate|middle)\b/.test(lower)) return 'mid';
  return 'junior';
}

function parseDateRange(text: string): number {
  const monthsPat = MONTHS.join('|');
  const datePattern = new RegExp(
    `(?:${monthsPat})\\s+(\\d{4})\\s*[-–]\\s*(?:(?:${monthsPat})\\s+(\\d{4})|present|actualidad|now|current)`,
    'gi'
  );
  let totalMonths = 0;
  let m: RegExpExecArray | null;
  while ((m = datePattern.exec(text)) !== null) {
    const full = m[0];
    const startYear = parseInt(m[1]);
    const isPresent = /present|actualidad|now|current/i.test(full);
    let endMonth: number, endYear: number;
    if (isPresent) {
      const now = new Date();
      endMonth = now.getMonth();
      endYear = now.getFullYear();
    } else if (m[2]) {
      endYear = parseInt(m[2]);
      const endMonthStr = full.match(new RegExp(`(${monthsPat})\\s+${endYear}`, 'i'));
      if (!endMonthStr) continue;
      endMonth = MONTHS.indexOf(endMonthStr[1].toLowerCase());
    } else continue;
    const startMonthStr = full.match(new RegExp(`(${monthsPat})\\s+${startYear}`, 'i'));
    if (!startMonthStr) continue;
    const startMonth = MONTHS.indexOf(startMonthStr[1].toLowerCase());
    totalMonths += (endYear - startYear) * 12 + (endMonth - startMonth);
  }
  return Math.round(totalMonths / 12);
}

function extractSkillsFromSection(text: string): SkillEntry[] {
  const lower = text.toLowerCase();

  const knownSkills: { name: string; category: string; keywords: string[] }[] = [
    { name: 'SQL', category: 'databases', keywords: ['sql', 'mysql', 'postgresql', 'sql server'] },
    { name: 'Python', category: 'programming', keywords: ['python'] },
    { name: 'Power BI', category: 'viz', keywords: ['power bi', 'powerbi', 'dax', 'power query'] },
    { name: 'Tableau', category: 'viz', keywords: ['tableau'] },
    { name: 'Excel', category: 'tools', keywords: ['excel', 'power pivot'] },
    { name: 'Data Cleaning', category: 'data', keywords: ['data cleaning', 'limpieza de datos'] },
    { name: 'Data Transformation', category: 'data', keywords: ['data transformation', 'transformación de datos'] },
    { name: 'EDA', category: 'data', keywords: ['exploratory data analysis', 'eda', 'análisis exploratorio'] },
    { name: 'Data Visualization', category: 'viz', keywords: ['data visualization', 'visualización', 'dashboard'] },
    { name: 'KPIs', category: 'analytics', keywords: ['kpis', 'kpi', 'indicadores'] },
    { name: 'Reporting', category: 'analytics', keywords: ['reporting', 'reportes', 'reporte', 'informes'] },
    { name: 'ETL', category: 'data', keywords: ['etl'] },
    { name: 'Git', category: 'tools', keywords: ['git'] },
    { name: 'Azure DevOps', category: 'tools', keywords: ['azure devops'] },
    { name: 'Scrum', category: 'methodologies', keywords: ['scrum', 'agile'] },
    { name: 'DAX', category: 'viz', keywords: ['dax'] },
    { name: 'Power Query', category: 'data', keywords: ['power query'] },
    { name: 'Data Analysis', category: 'analytics', keywords: ['data analysis', 'análisis de datos', 'analisis de datos'] },
    { name: 'Automation', category: 'data', keywords: ['automation', 'automatización', 'automated reporting'] },
    { name: 'MySQL', category: 'databases', keywords: ['mysql'] },
  ];

  const found: SkillEntry[] = [];
  const seen = new Set<string>();

  const habIndex = lower.indexOf('habilidades');
  const skillsText = habIndex >= 0 ? lower.slice(habIndex) : lower;

  for (const sk of knownSkills) {
    if (sk.keywords.some(kw => skillsText.includes(kw))) {
      const key = sk.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        found.push({ name: sk.name, rating: 7 });
      }
    }
  }

  const generic = extractSkills(text);
  for (const s of generic) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      found.push({ name: s, rating: 5 });
    }
  }

  return found;
}

function extractEducation(text: string): string | undefined {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const eduKeywords = ['universidad', 'university', 'college', 'instituto', 'institute', 'tecnólogo', 'tecnológico', 'bachiller', 'bachelor', 'master', 'maestría', 'phd', 'doctorado', 'ingeniería', 'ingenieria', 'carrera', 'educación', 'education', 'educacion'];
  let capture = false;
  const eduLines: string[] = [];
  let sectionCount = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('educación') || lower.includes('education') || lower.includes('educacion')) {
      capture = true;
      continue;
    }
    if (capture) {
      if (lower.includes('certificaciones') || lower.includes('certifications') || lower.includes('habilidades') || lower.includes('skills')) {
        break;
      }
      if (lower.includes('proyectos') || lower.includes('projects')) break;
      if (lower.includes('experiencia') || lower.includes('experience')) break;
      if (lower.includes('idiomas') || lower.includes('languages')) break;
      eduLines.push(line);
    }
  }

  return eduLines.length > 0
    ? eduLines.join('\n').replace(/\n{2,}/g, '\n').trim()
    : undefined;
}

function extractCertifications(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const certs: string[] = [];
  let capture = false;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('certificaciones') || lower.includes('certifications')) {
      capture = true;
      continue;
    }
    if (capture) {
      if (lower.includes('habilidades') || lower.includes('skills') || lower.includes('idiomas') || lower.includes('languages')) break;
      if (lower.includes('proyectos') || lower.includes('projects')) break;
      if (lower.includes('educación') || lower.includes('education')) break;
      if (line.length > 5 && line.length < 100) certs.push(line);
    }
  }
  return certs;
}

function extractProjects(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const projects: string[] = [];
  let capture = false;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('proyectos') || lower.includes('projects')) {
      capture = true;
      continue;
    }
    if (capture) {
      if (lower.includes('educación') || lower.includes('education') || lower.includes('educacion')) break;
      if (lower.includes('certificaciones') || lower.includes('certifications')) break;
      if (lower.includes('habilidades') || lower.includes('skills')) break;
      if (lower.includes('experiencia') || lower.includes('experience')) break;
      if (line.length > 3) projects.push(line);
    }
  }
  return projects;
}

function extractTargetRoles(text: string): string[] {
  const lower = text.toLowerCase();
  const roles = new Set<string>();

  // Check the RESUMEN/professional summary
  if (lower.includes('data analyst') || lower.includes('junior data analyst')) {
    roles.add('Data Analyst');
    roles.add('Junior Data Analyst');
  }

  const rolePatterns = [
    /\b(?:data|business|bi|reporting|analytics)\s*(?:analyst|engineer|scientist|developer|specialist|manager|consultant)\b/gi,
    /\b(?:analista|ingeniero|científico|consultor)\s*(?:de\s+)?(?:datos|negocios|bi|reporting|inteligencia)\b/gi,
  ];
  for (const pattern of rolePatterns) {
    for (const match of text.matchAll(pattern)) {
      roles.add(match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase());
    }
  }

  const targetRoles = ['Data Analyst', 'Analista de datos', 'BI Analyst', 'Analista BI', 'Power BI Analyst', 'Junior Data Analyst'];
  const result = targetRoles.filter(r => lower.includes(r.toLowerCase()));
  if (result.length === 0) result.push('Data Analyst', 'Analista de datos');
  return [...new Set(result)];
}

function extractLocations(text: string): string[] {
  const lower = text.toLowerCase();
  const knownLocations = ['bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla', 'cartagena', 'remoto', 'remote', 'hibrido', 'hybrid'];
  const found = knownLocations.filter(l => lower.includes(l));
  return found.map(l => l.charAt(0).toUpperCase() + l.slice(1));
}

function extractAvoidKeywords(text: string): string[] {
  return ['senior', 'lead', 'manager', 'director', 'architect', 'principal', 'staff'];
}

export async function parseCV(filePath: string): Promise<Partial<Profile>> {
  const text = await extractTextFromPDF(filePath);
  const skills = extractSkillsFromSection(text);
  return {
    name: extractName(text),
    seniority: extractSeniority(text),
    experience: parseDateRange(text),
    skills,
    targetRoles: extractTargetRoles(text),
    preferredLocations: extractLocations(text),
    avoidKeywords: extractAvoidKeywords(text),
    education: extractEducation(text),
    cvPath: filePath,
    searchMode: 'busqueda_activa',
  };
}

export async function parseCVFromText(text: string): Promise<Partial<Profile>> {
  return {
    name: extractName(text),
    seniority: extractSeniority(text),
    experience: parseDateRange(text),
    skills: extractSkillsFromSection(text),
    targetRoles: extractTargetRoles(text),
    preferredLocations: extractLocations(text),
    avoidKeywords: extractAvoidKeywords(text),
    education: extractEducation(text),
    searchMode: 'busqueda_activa',
  };
}
