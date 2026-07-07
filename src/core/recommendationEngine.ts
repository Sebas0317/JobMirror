import type { Vacancy } from '../models/Vacancy.ts';

export type Recommendation = 'APLICAR' | 'PREPARAR' | 'REVISAR' | 'IGNORAR';

export type MatchType = 'directa' | 'transferible' | 'baja_relacion';

const DIRECTA_KEYWORDS = [
  'data analyst', 'analista de datos', 'bi analyst', 'analista bi',
  'reporting analyst', 'analista reporting', 'business intelligence',
  'data specialist', 'analytics', 'inteligencia de negocios',
  'analista de inteligencia', 'analista de informacion',
  'analisis de datos', 'análisis de datos',
  'data engineer', 'ingeniero de datos', 'data scientist',
  'power bi', 'tableau', 'etl', 'data warehouse',
  'big data', 'datos masivos', 'data analytics',
  'dashboard', 'data viz', 'visualizacion datos',
  'data management', 'gestión de datos', 'data governance',
  'calidad de datos', 'data quality', 'data lake',
  'data mining', 'mineria de datos', 'minería de datos',
  'científico de datos',
];

const TRANSFERIBLE_KEYWORDS = [
  'analista de sistemas', 'analista de procesos', 'analista funcional',
  'analista de reportes', 'analista reporting', 'soporte ti',
  'analista tecnologia', 'analista informacion', 'auditor ti',
  'analista datos', 'analista bi', 'cloud', 'desarrollador',
  'ingeniero datos', 'analista inventarios', 'analista planeacion',
  'analista administrativo', 'auxiliar administrativo',
  'analista de marketing', 'analista comercial',
  'analista financiero', 'coordinador financiero',
  'analista contable', 'auxiliar contable',
  'analista de logistica', 'analista logistico', 'auxiliar de logistica',
  'analista de gestion', 'gestion documental',
  'analista de negocio', 'business analyst',
  'analista de calidad', 'analista calidad',
  'analista compras', 'analista de compras',
  'asistente administrativo', 'asistente contable',
  'analista nomina', 'analista de nómina', 'asistente rh',
  'analista de cartera', 'responsable de cartera',
  'auxiliar de almacen', 'auxiliar almacen',
  'coordinador de operaciones', 'coordinador operaciones',
  'analista de planeacion', 'planeación',
  'auxiliar de novedades', 'auxiliar novedades',
  'practicante administrativo', 'practicante contable',
  'practicante datos', 'practicante data',
  'practicante sistemas',
];

export function classifyMatch(vacancy: Vacancy, targetRoles: string[]): MatchType {
  const title = (vacancy.title ?? '').toLowerCase();

  const targetMatch = targetRoles.some(r => title.includes(r.toLowerCase()));
  if (targetMatch) return 'directa';

  const directaHit = DIRECTA_KEYWORDS.some(kw => title.includes(kw));
  if (directaHit) return 'directa';

  const transferibleHit = TRANSFERIBLE_KEYWORDS.some(kw => title.includes(kw));
  if (transferibleHit) return 'transferible';

  return 'baja_relacion';
}

export function getCareerPath(profileTargetRoles: string[], matchType: MatchType): string[] {
  if (matchType === 'directa') return profileTargetRoles;
  if (matchType === 'transferible') {
    return [`${profileTargetRoles[0] ?? 'Analista'}`, ...profileTargetRoles];
  }
  return ['Entrada', ...profileTargetRoles];
}

export function getRecommendation(
  vacancy: Vacancy,
  profileSkills: { name: string; rating: number }[],
  profileSeniority: string,
  avoidKeywords: string[],
  targetRoles: string[] = [],
  searchMode: string = 'busqueda_activa',
): Recommendation {
  const titleLower = (vacancy.title ?? '').toLowerCase();
  for (const kw of avoidKeywords) {
    if (titleLower.includes(kw.toLowerCase())) {
      return 'IGNORAR';
    }
  }

  const score = vacancy.score ?? 0;
  const matchType = classifyMatch(vacancy, targetRoles);

  const extractedSkills: string[] = vacancy.skillsExtracted
    ? (Array.isArray(vacancy.skillsExtracted)
      ? vacancy.skillsExtracted
      : JSON.parse(vacancy.skillsExtracted as string))
    : [];
  const profileSkillNames = profileSkills.map(s => s.name.toLowerCase());
  const missingCritical = extractedSkills.filter(
    s => !profileSkillNames.includes(s.toLowerCase())
  );

  if (searchMode === 'carrera_ideal') {
    if (matchType === 'baja_relacion') return 'IGNORAR';
    if (score >= 80 && missingCritical.length <= 1 && matchType === 'directa') return 'APLICAR';
    if (score >= 60 && missingCritical.length <= 2) return 'PREPARAR';
    if (score >= 40 && missingCritical.length <= 4) return 'REVISAR';
    return 'IGNORAR';
  }

  if (matchType === 'baja_relacion' && score < 50) return 'IGNORAR';
  if (score >= 75 && missingCritical.length <= 1) return 'APLICAR';
  if (score >= 55 && missingCritical.length <= 2) return 'PREPARAR';
  if (score >= 35 && missingCritical.length <= 4) return 'REVISAR';
  return 'IGNORAR';
}
