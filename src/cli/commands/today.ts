import { PrismaClient } from '@prisma/client';
import { getRecommendation, classifyMatch } from '../../core/recommendationEngine.ts';
import { bold, dim, green, red, yellow, cyan, table, divider, scoreColor, recommendationBadge, matchTypeBadge } from '../renderer.ts';

const prisma = new PrismaClient();

export async function today() {
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    console.log(red('No hay perfil. Crea uno con: job-monitor profile upload <cv.pdf>'));
    return;
  }

  const vacancies = await prisma.vacancy.findMany({
    orderBy: { score: 'desc' },
    take: 20,
  });

  if (vacancies.length === 0) {
    console.log(dim('No hay vacantes. Corre job-monitor scan primero.'));
    return;
  }

  const profileSkills: { name: string; rating: number }[] = JSON.parse(profile.skills);
  const profileSeniority = profile.seniority;
  const avoidKeywords: string[] = JSON.parse(profile.avoidKeywords || '[]');
  const targetRoles: string[] = JSON.parse(profile.targetRoles || '[]');
  const searchMode = (profile as any).searchMode ?? 'busqueda_activa';

  console.log(`\n${bold('JOB MONITOR — TODAY')}`);
  console.log(divider());
  console.log(`${dim('Última actualización:')} ${new Date().toLocaleString()}`);
  console.log(`${dim('Vacantes analizadas:')} ${vacancies.length}`);
  console.log(`${dim('Modo:')} ${searchMode === 'busqueda_activa' ? cyan('Búsqueda Activa') : yellow('Carrera Ideal')}`);
  console.log();

  const headers = ['#', 'Vacante', 'Empresa', 'Tipo', 'Match', 'Recomendación'];
  const rows = vacancies.slice(0, 10).map((v, i) => {
    const rec = getRecommendation(v, profileSkills, profileSeniority, avoidKeywords, targetRoles, searchMode);
    const mtype = classifyMatch(v, targetRoles);
    return [
      (i + 1).toString().padStart(2),
      v.title.length > 30 ? v.title.slice(0, 28) + '..' : v.title.padEnd(30),
      (v.company || '').length > 18 ? v.company.slice(0, 16) + '..' : (v.company || '').padEnd(18),
      matchTypeBadge(mtype).padEnd(13),
      scoreColor(Math.round(v.score ?? 0)).padStart(4) + dim('/100'),
      recommendationBadge(rec),
    ];
  });

  console.log(table(headers, rows));
  console.log(divider());
  console.log(dim('job-monitor analyze <id> — para ver análisis detallado'));
  console.log(dim('job-monitor feedback <id> <status> — para dar feedback'));
  await prisma.$disconnect();
}
