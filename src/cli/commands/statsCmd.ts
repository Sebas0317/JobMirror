import { PrismaClient } from '@prisma/client';
import { bold, dim, green, yellow, red, cyan, table, divider } from '../renderer.ts';

const prisma = new PrismaClient();

export async function stats() {
  const totalVacancies = await prisma.vacancy.count();
  const totalFeedbacks = await prisma.feedback.count();
  const feedbacksByStatus = await prisma.feedback.groupBy({
    by: ['status'],
    _count: true,
  });
  const bySource = await prisma.vacancy.groupBy({
    by: ['source'],
    _count: true,
  });
  const avgScore = await prisma.vacancy.aggregate({ _avg: { score: true } });
  const profile = await prisma.profile.findFirst();

  console.log(`\n${bold('JOB MONITOR — STATS')}`);
  console.log(divider());

  console.log(`  ${dim('Perfil:')}       ${profile ? green(profile.name) : red('Sin perfil')}`);
  console.log(`  ${dim('Vacantes total:')} ${totalVacancies}`);
  console.log(`  ${dim('Score promedio:')} ${avgScore._avg.score?.toFixed(1) ?? '—'}${dim('/100')}`);
  console.log(`  ${dim('Feedbacks:')}     ${totalFeedbacks}`);
  console.log();

  if (bySource.length > 0) {
    console.log(`  ${bold('VACANTES POR FUENTE')}`);
    const rows = bySource.map(s => [s.source.padEnd(16), s._count.toString().padStart(4)]);
    console.log(table(['Fuente', 'Count'], rows));
    console.log();
  }

  if (feedbacksByStatus.length > 0) {
    console.log(`  ${bold('FEEDBACKS POR ESTADO')}`);
    const rows = feedbacksByStatus.map(f => [f.status.padEnd(16), f._count.toString().padStart(4)]);
    console.log(table(['Estado', 'Count'], rows));
  }

  console.log(divider());
  await prisma.$disconnect();
}
