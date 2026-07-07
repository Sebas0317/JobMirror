import type { Vacancy } from '../models/Vacancy.ts';
import type { Profile } from '../models/Profile.ts';
import { extractSkills } from './skillExtractor.ts';
import { analyseRisk } from './riskAnalyzer.ts';

function parseSkills(skills: string | string[] | undefined | null): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  try { return JSON.parse(skills); } catch { return []; }
}

export function scoreVacancy(v: Vacancy, p: Profile) {
  const profileSkillNames = p.skills.map(s => s.name.toLowerCase());
  const vacancySkills = parseSkills(v.skillsExtracted);

  const matched = vacancySkills.filter(s => profileSkillNames.includes(s.toLowerCase()));
  const compatibility = vacancySkills.length
    ? (matched.length / vacancySkills.length) * 100
    : 0;

  const transfer = vacancySkills.length
    ? ((vacancySkills.length - matched.length) / vacancySkills.length) * 80
    : 0;

  const seniorityMap: Record<string, number> = { junior: 1, mid: 2, senior: 3 };
  const profileLevel = seniorityMap[p.seniority] ?? 1;
  const growth = profileLevel === 1 ? 90 : profileLevel === 2 ? 70 : 50;

  const { missingMandatory, seniorityMismatch } = analyseRisk(v, p);
  const riskPenalty = (missingMandatory * 15) + (seniorityMismatch * 10);

  const isActiveSearch = p.searchMode === 'busqueda_activa';
  const compatWeight = isActiveSearch ? 0.35 : 0.50;
  const transferWeight = isActiveSearch ? 0.40 : 0.30;
  const growthWeight = isActiveSearch ? 0.20 : 0.15;

  const rawScore = compatibility * compatWeight + transfer * transferWeight + growth * growthWeight;
  const finalScore = Math.max(0, rawScore - riskPenalty);

  const strategic = v.company.toLowerCase().includes('tech') ? 80 : 50;

  return {
    score: Number(finalScore.toFixed(2)),
    breakdown: {
      compatibility: Number(compatibility.toFixed(2)),
      transfer: Number(transfer.toFixed(2)),
      growth,
      strategic,
      riskPenalty,
      matchedSkills: matched,
      missingSkills: vacancySkills.filter(s => !matched.includes(s)),
    },
  };
}
