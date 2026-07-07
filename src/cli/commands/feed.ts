import { PrismaClient } from '@prisma/client';
import { getRecommendation, classifyMatch, getCareerPath } from '../../core/recommendationEngine.ts';
import { bold, dim, green, red, yellow, cyan, table, divider, scoreColor, recommendationBadge, matchTypeBadge } from '../renderer.ts';

const prisma = new PrismaClient();

export async function feed(args: string[]) {
  const sourceFilter = args[0]?.toLowerCase();

  const profile = await prisma.profile.findFirst();
  if (!profile) {
    console.log(red('No hay perfil. Crea uno con: job-monitor profile upload <cv.pdf>'));
    return;
  }

  const profileSkills: { name: string; rating: number }[] = JSON.parse(profile.skills);
  const profileSeniority = profile.seniority;
  const avoidKeywords: string[] = JSON.parse(profile.avoidKeywords || '[]');
  const targetRoles: string[] = JSON.parse(profile.targetRoles || '[]');
  const searchMode = (profile as any).searchMode ?? 'busqueda_activa';

  const where = sourceFilter ? { source: sourceFilter } : {};
  const total = await prisma.vacancy.count({ where });

  const vacancies = await prisma.vacancy.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: 25,
  });

  if (vacancies.length === 0) {
    console.log(dim(sourceFilter
      ? `No hay vacantes de "${sourceFilter}". Corre job-monitor scan primero.`
      : 'No hay vacantes. Corre job-monitor scan primero.'));
    return;
  }

  const validSources = [...new Set(vacancies.map(v => v.source).filter(Boolean))];

  console.log(`\n${bold('JOB MONITOR — FEED')}`);
  console.log(divider());
  console.log(`${dim('Total en DB:')} ${total} vacantes`);
  if (sourceFilter) {
    console.log(`${dim('Filtro:')}     ${cyan(sourceFilter)}`);
  } else {
    console.log(`${dim('Fuentes:')}    ${validSources.map(s => cyan(s)).join(', ')}`);
  }
  console.log(`${dim('Mostrando:')}  ${vacancies.length} más recientes`);
  console.log();

  const headers = ['#', 'Vacante', 'Empresa', 'Fuente', 'Tipo', 'Score', 'Recom.'];
  const rows = vacancies.map((v, i) => {
    const rec = getRecommendation(v, profileSkills, profileSeniority, avoidKeywords, targetRoles, searchMode);
    const mtype = classifyMatch(v, targetRoles);
    return [
      (i + 1).toString().padStart(2),
      v.title.length > 30 ? v.title.slice(0, 28) + '..' : v.title.padEnd(30),
      (v.company || '').length > 16 ? v.company.slice(0, 14) + '..' : (v.company || '').padEnd(16),
      (v.source || '').padEnd(12),
      matchTypeBadge(mtype).padEnd(12),
      scoreColor(Math.round(v.score ?? 0)).padStart(4) + dim('/100'),
      recommendationBadge(rec),
    ];
  });

  console.log(table(headers, rows));
  console.log();
  console.log(dim('  Usa: job-monitor feed <fuente>   — filtrar por fuente'));
  console.log(dim('       job-monitor analyze <id>    — ver detalle'));
  console.log(divider());
  await prisma.$disconnect();
}
