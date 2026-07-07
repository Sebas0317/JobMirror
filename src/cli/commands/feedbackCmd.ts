import { PrismaClient } from '@prisma/client';
import { bold, dim, green, red, cyan, divider } from '../renderer.ts';

const prisma = new PrismaClient();

const VALID_STATUSES = ['INTERESTED', 'DISCARDED', 'APPLIED'];

export async function feedbackCmd(id: string, status: string) {
  const upper = status.toUpperCase();
  if (!VALID_STATUSES.includes(upper)) {
    console.log(red('Error:') + ` Estado inválido: ${status}. Usa: INTERESTED, DISCARDED o APPLIED`);
    return;
  }

  const vacancyId = parseInt(id);
  const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy) {
    console.log(red(`Vacante ${id} no encontrada`));
    return;
  }

  const existing = await prisma.feedback.findFirst({ where: { vacancyId } });
  if (existing) {
    await prisma.feedback.update({ where: { id: existing.id }, data: { status: upper } });
  } else {
    await prisma.feedback.create({ data: { vacancyId, status: upper } });
  }

  console.log(green(`✓ Feedback guardado: ${vacancy.title} → ${upper}`));
  await prisma.$disconnect();
}
