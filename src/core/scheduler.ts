import { loadSources } from '../config/configLoader.ts';
import { getAdapter, getAllAdapters } from '../adapters/index.ts';
import { normalize } from './normalizer.ts';
import { scoreVacancy } from './scoringEngine.ts';
import { PrismaClient } from '@prisma/client';
import { extractSkills } from './skillExtractor.ts';
import type { Profile } from '../models/Profile.ts';

const prisma = new PrismaClient();

async function loadProfile(): Promise<Profile> {
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    throw new Error('No profile found. Create one with: job-monitor profile upload <cv.pdf>');
  }
  return {
    id: profile.id,
    name: profile.name,
    seniority: profile.seniority as any,
    skills: JSON.parse(profile.skills),
    experience: profile.experience,
    targetRoles: JSON.parse(profile.targetRoles || '[]'),
    preferredLocations: JSON.parse(profile.preferredLocations || '[]'),
    avoidKeywords: JSON.parse(profile.avoidKeywords || '[]'),
    education: profile.education ?? undefined,
    cvPath: profile.cvPath ?? undefined,
    searchMode: (profile.searchMode ?? 'busqueda_activa') as any,
  } as Profile;
}

export async function runPipeline(): Promise<{
  total: number;
  bySource: Record<string, number>;
  errors: number;
}> {
  const bySource: Record<string, number> = {};
  let errors = 0;

  try {
    const profile = await loadProfile();
    const sources = await loadSources();
    const rawVacancies: any[] = [];

    for (const adapter of getAllAdapters()) {
      const cfg = sources[adapter.name];
      if (cfg?.enabled) {
        try {
          const results = await adapter.run(cfg);
          rawVacancies.push(...results);
          bySource[adapter.name] = results.length;
          console.log(`  ${adapter.name}: ${results.length} vacantes`);
        } catch (e) {
          console.warn(`  ${adapter.name}: error — ${e}`);
          errors++;
        }
      }
    }

    let stored = 0;
    for (const raw of rawVacancies) {
      try {
        const vacancy = normalize(raw);
        const skillText = `${vacancy.description ?? ''} ${vacancy.requirements ?? ''}`;
        const extracted = extractSkills(skillText);
        vacancy.skillsExtracted = JSON.stringify(extracted);

        const { score, breakdown } = scoreVacancy(vacancy, profile);
        // Remove previous entry with same URL to avoid duplicates across scans
        if (vacancy.url) await prisma.vacancy.deleteMany({ where: { url: vacancy.url } });
        await prisma.vacancy.create({
          data: {
            title: vacancy.title,
            company: vacancy.company,
            location: vacancy.location,
            description: vacancy.description,
            requirements: vacancy.requirements,
            url: vacancy.url,
            publishedAt: vacancy.publishedAt,
            source: vacancy.source,
            salary: vacancy.salary,
            contractType: vacancy.contractType,
            experienceRequired: vacancy.experienceRequired,
            skillsExtracted: vacancy.skillsExtracted,
            score,
            compatibility: breakdown.compatibility,
            growth: breakdown.growth,
            strategic: breakdown.strategic ?? 50,
          },
        });
        stored++;
      } catch (e) {
        console.warn('Error storing vacancy:', e);
        errors++;
      }
    }

    console.log(`\n  Almacenadas: ${stored} vacantes`);
    return { total: stored, bySource, errors };
  } catch (err) {
    console.error('Error in pipeline:', err);
    return { total: 0, bySource: {}, errors: 1 };
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1]?.includes('scheduler');
if (isDirectRun) {
  runPipeline().then(({ total }) => {
    console.log(`\nPipeline completado — ${total} vacantes almacenadas`);
    process.exit(0);
  });
}
