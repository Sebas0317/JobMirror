import { existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { parseCV } from '../../core/profileParser.ts';
import { bold, dim, green, red, yellow, cyan, table, divider } from '../renderer.ts';
import type { SkillEntry } from '../../models/Profile.ts';

const prisma = new PrismaClient();

export async function profileCmd(args: string[]) {
  const sub = args[0];

  if (!sub || sub === 'show') {
    await showProfile();
    return;
  }

  if (sub === 'upload') {
    const filePath = args[1];
    if (!filePath) {
      console.log(red('Error:') + ' Especifica la ruta del CV. Ej: ' + dim('job-monitor profile upload ./cv.pdf'));
      return;
    }
    if (!existsSync(filePath)) {
      console.log(red('Error:') + ` Archivo no encontrado: ${filePath}`);
      return;
    }
    await uploadCV(filePath);
    return;
  }

  console.log(red(`Subcomando desconocido: ${sub}`));
  console.log(dim('Uso: job-monitor profile show | upload <path>'));
}

async function showProfile() {
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    console.log(yellow('No hay perfil. Crea uno con: job-monitor profile upload <cv.pdf>'));
    return;
  }

  const skills: SkillEntry[] = JSON.parse(profile.skills);
  const targetRoles: string[] = JSON.parse(profile.targetRoles || '[]');
  const locations: string[] = JSON.parse(profile.preferredLocations || '[]');
  const avoid: string[] = JSON.parse(profile.avoidKeywords || '[]');

  console.log(`\n${bold('JOB MONITOR — PROFILE')}`);
  console.log(divider());
  console.log(`  ${dim('Nombre:')}     ${profile.name}`);
  console.log(`  ${dim('Seniority:')}  ${profile.seniority}`);
  console.log(`  ${dim('Exp (años):')} ${profile.experience}`);
  if (profile.education) console.log(`  ${dim('Educación:')}  ${profile.education}`);
  console.log();

  if (skills.length > 0) {
    console.log(`  ${bold('SKILLS')}`);
    const rows = skills
      .sort((a, b) => b.rating - a.rating)
      .map(s => [s.name, '█'.repeat(Math.round(s.rating / 2)) + dim('░'.repeat(5 - Math.round(s.rating / 2))), `${s.rating}/10`]);
    console.log(table(['Skill', 'Nivel', 'Rating'], rows));
    console.log();
  }

  if (targetRoles.length > 0) {
    console.log(`  ${bold('ROLES OBJETIVO')}`);
    targetRoles.forEach(r => console.log(`    • ${r}`));
    console.log();
  }

  if (locations.length > 0) {
    console.log(`  ${bold('UBICACIONES')}`);
    locations.forEach(l => console.log(`    • ${l}`));
    console.log();
  }

  if (avoid.length > 0) {
    console.log(`  ${bold('EVITAR')}`);
    avoid.forEach(k => console.log(`    ✗ ${k}`));
    console.log();
  }

  console.log(`  ${bold('MODO BÚSQUEDA')}`);
  const searchMode = (profile as any).searchMode ?? 'busqueda_activa';
  console.log(`    ${searchMode === 'busqueda_activa' ? cyan('Búsqueda Activa') : yellow('Carrera Ideal')}`);
  console.log();

  console.log(divider());
  console.log(dim('Para actualizar: job-monitor profile upload <nuevo-cv.pdf>'));
  await prisma.$disconnect();
}

async function uploadCV(filePath: string) {
  console.log(`\n${bold('JOB MONITOR — PROFILE UPLOAD')}`);
  console.log(divider());
  console.log(`  ${dim('Leyendo CV:')} ${filePath}`);

  try {
    const parsed = await parseCV(filePath);

    console.log(`  ${dim('Nombre:')}     ${parsed.name ?? '?'}`);
    console.log(`  ${dim('Seniority:')}  ${parsed.seniority ?? '?'}`);
    console.log(`  ${dim('Exp (años):')} ${parsed.experience ?? 0}`);
    if (parsed.education) {
      console.log(`  ${dim('Educación:')}  ${parsed.education.slice(0, 100)}`);
    }
    console.log();

    if (parsed.skills && parsed.skills.length > 0) {
      console.log(`  ${bold('SKILLS DETECTADOS')} ${green(parsed.skills.length.toString())}`);
      const rows = parsed.skills.map(s => [s.name, `${s.rating}/10`]);
      console.log(table(['Skill', 'Rating'], rows));
    }
    console.log(`  ${dim('Modo:')} ${(parsed as any).searchMode === 'carrera_ideal' ? yellow('Carrera Ideal') : cyan('Búsqueda Activa')}`);
    console.log();

    const existing = await prisma.profile.findFirst();
    const data = {
      name: parsed.name ?? existing?.name ?? 'Unknown',
      seniority: parsed.seniority ?? existing?.seniority ?? 'junior',
      skills: JSON.stringify(parsed.skills ?? []),
      experience: parsed.experience ?? existing?.experience ?? 0,
      targetRoles: JSON.stringify(parsed.targetRoles ?? []),
      preferredLocations: JSON.stringify(parsed.preferredLocations ?? []),
      avoidKeywords: JSON.stringify(parsed.avoidKeywords ?? []),
      education: parsed.education ?? existing?.education ?? null,
      cvPath: filePath,
      searchMode: (parsed as any).searchMode ?? existing?.searchMode ?? 'busqueda_activa',
    };

    if (existing) {
      await prisma.profile.update({ where: { id: existing.id }, data });
      console.log(green('✓ Perfil actualizado'));
    } else {
      await prisma.profile.create({ data });
      console.log(green('✓ Perfil creado'));
    }

    console.log(divider());
    console.log(dim('Corre job-monitor profile show para ver el perfil completo'));
  } catch (err: any) {
    console.log(red('Error al procesar CV:'), err.message);
  }
  await prisma.$disconnect();
}
