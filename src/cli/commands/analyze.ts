import { PrismaClient } from '@prisma/client';
import { getRecommendation, classifyMatch, getCareerPath } from '../../core/recommendationEngine.ts';
import { bold, dim, green, red, yellow, cyan, divider, scoreColor, recommendationBadge, matchTypeBadge } from '../renderer.ts';

const prisma = new PrismaClient();

export async function analyze(id: string) {
  const vacancy = await prisma.vacancy.findUnique({
    where: { id: parseInt(id) },
    include: { feedbacks: true },
  });

  if (!vacancy) {
    console.log(red(`Vacante ${id} no encontrada`));
    return;
  }

  const profile = await prisma.profile.findFirst();
  const profileSkills: { name: string; rating: number }[] = profile
    ? JSON.parse(profile.skills) : [];
  const profileSeniority = profile?.seniority ?? 'junior';
  const avoidKeywords: string[] = profile
    ? JSON.parse(profile.avoidKeywords || '[]') : [];
  const targetRoles: string[] = profile
    ? JSON.parse(profile.targetRoles || '[]') : [];
  const searchMode = (profile as any)?.searchMode ?? 'busqueda_activa';

  const rec = getRecommendation(vacancy, profileSkills, profileSeniority, avoidKeywords, targetRoles, searchMode);
  const mtype = classifyMatch(vacancy, targetRoles);
  const careerPath = getCareerPath(targetRoles, mtype);
  const skillsExtracted: string[] = vacancy.skillsExtracted
    ? JSON.parse(vacancy.skillsExtracted) : [];
  const feedback = vacancy.feedbacks?.[0];

  console.log(`\n${bold('JOB MONITOR — ANÁLISIS')} ${dim('#' + id)}`);
  console.log(divider());

  console.log(`  ${bold(vacancy.title)}`);
  console.log(`  ${dim('Empresa:')}   ${vacancy.company}`);
  console.log(`  ${dim('Fuente:')}    ${vacancy.source}`);
  console.log(`  ${dim('Ubicación:')} ${vacancy.location ?? '—'}`);
  console.log(`  ${dim('Tipo:')}      ${matchTypeBadge(mtype)}`);
  const pubDate = vacancy.publishedAt ?? vacancy.createdAt;
  if (pubDate) {
    const diff = Date.now() - new Date(pubDate).getTime();
    const min = Math.floor(diff / 60000);
    const hrs = Math.floor(min / 60);
    const days = Math.floor(hrs / 24);
    const ago = days > 0 ? `${days}d` : hrs > 0 ? `${hrs}h` : `${min}min`;
    console.log(`  ${dim('Publicado:')} Hace ${ago}`);
  }
  console.log();

  console.log(`  ${bold('COMPATIBILIDAD')} ${scoreColor(Math.round(vacancy.score ?? 0))}${dim('/100')}`);
  console.log(`  ${bold('RECOMENDACIÓN')}  ${recommendationBadge(rec)}`);
  console.log();

  console.log(`  ${bold('CAMINO DE CARRERA')}`);
  console.log(`    ${cyan('→')} ${careerPath.join(` ${cyan('→')} `)}`);
  console.log();

  if (vacancy.compatibility != null) {
    console.log(`  ${dim('Skills Match:')}     ${vacancy.compatibility.toFixed(1)}%`);
  }
  if (vacancy.growth != null) {
    console.log(`  ${dim('Crecimiento:')}      ${vacancy.growth}/100`);
  }
  if (vacancy.strategic != null) {
    console.log(`  ${dim('Valor Estrat.:')}    ${vacancy.strategic}/100`);
  }
  console.log(`  ${dim('Modo:')}             ${searchMode === 'busqueda_activa' ? cyan('Búsqueda Activa') : yellow('Carrera Ideal')}`);
  console.log();

  if (skillsExtracted.length > 0) {
    const profileSkillNames = profileSkills.map(s => s.name.toLowerCase());
    const matched = skillsExtracted.filter(s => profileSkillNames.includes(s.toLowerCase()));
    const missing = skillsExtracted.filter(s => !profileSkillNames.includes(s.toLowerCase()));

    console.log(`  ${bold('FORTALEZAS')} ${green('✓')}`);
    for (const s of matched) {
      const entry = profileSkills.find(ps => ps.name.toLowerCase() === s.toLowerCase());
      const rating = entry ? entry.rating : '?';
      console.log(`    ${green('✓')} ${s} ${dim('(rating: ' + rating + '/10)')}`);
    }
    console.log();

    if (missing.length > 0) {
      console.log(`  ${bold('BRECHAS')} ${yellow('⚠')}`);
      for (const s of missing) {
        console.log(`    ${yellow('⚠')} ${s}`);
      }
      console.log();
    }
  }

  if (vacancy.description) {
    console.log(`  ${bold('DESCRIPCIÓN')}`);
    console.log(`  ${dim(vacancy.description.slice(0, 500))}${vacancy.description.length > 500 ? '...' : ''}`);
    console.log();
  }

  if (vacancy.requirements) {
    console.log(`  ${bold('REQUISITOS')}`);
    console.log(`  ${dim(vacancy.requirements.slice(0, 300))}${vacancy.requirements.length > 300 ? '...' : ''}`);
    console.log();
  }

  if (feedback) {
    console.log(`  ${bold('FEEDBACK')}`);
    console.log(`  Estado: ${feedback.status}`);
    if (feedback.notes) console.log(`  Notas: ${feedback.notes}`);
  }
  console.log(divider());
  console.log(dim('job-monitor feedback ' + id + ' INTERESTED|DISCARDED|APPLIED'));

  await prisma.$disconnect();
}
