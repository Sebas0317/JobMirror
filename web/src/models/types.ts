export type MatchType = 'directa' | 'transferible' | 'baja_relacion';
export type Recommendation = 'APLICAR' | 'PREPARAR' | 'REVISAR' | 'IGNORAR';

export function timeAgo(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `Hace ${sec} seg`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days} d`;
  return new Date(dateStr).toLocaleDateString();
}

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

export function classifyMatch(title: string, _description: string, targetRoles: string[]): MatchType {
  const t = title.toLowerCase();

  const targetMatch = targetRoles.some(r => t.includes(r.toLowerCase()));
  if (targetMatch) return 'directa';

  const directaHit = DIRECTA_KEYWORDS.some(kw => t.includes(kw));
  if (directaHit) return 'directa';

  const transferibleHit = TRANSFERIBLE_KEYWORDS.some(kw => t.includes(kw));
  if (transferibleHit) return 'transferible';

  return 'baja_relacion';
}

export function getCareerPath(targetRoles: string[], matchType: MatchType): string[] {
  if (matchType === 'directa') return targetRoles;
  if (matchType === 'transferible') {
    return [`${targetRoles[0] ?? 'Analista'}`, ...targetRoles];
  }
  return ['Entrada', ...targetRoles];
}
