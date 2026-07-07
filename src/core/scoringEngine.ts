import type { Vacancy } from '../models/Vacancy.ts';
import type { Profile } from '../models/Profile.ts';
import { extractSkills } from './skillExtractor.ts';
import { analyseRisk } from './riskAnalyzer.ts';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load scoring configuration from config/scoring.json, fallback to defaults if missing
const configPath = resolve(process.cwd(), 'config', 'scoring.json');
let scoringConfig: any;
try {
  const raw = readFileSync(configPath, 'utf-8');
  scoringConfig = JSON.parse(raw);
} catch (e) {
  // Default values matching original hardcoded logic
  scoringConfig = {
    activeSearch: {
      compatibility: 0.35,
      transferability: 0.40,
      growth: 0.20,
      strategicBonus: 80,
      riskPenaltyPerMissing: 15,
      seniorityMismatchPenalty: 10,
    },
    idealCareer: {
      compatibility: 0.50,
      transferability: 0.30,
      growth: 0.15,
      strategicBonus: 80,
      riskPenaltyPerMissing: 15,
      seniorityMismatchPenalty: 10,
    },
  };
}

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
  const mode = p.searchMode === 'busqueda_activa' ? 'activeSearch' : 'idealCareer';
  const cfg = scoringConfig[mode];
  const riskPenalty =
    missingMandatory * cfg.riskPenaltyPerMissing +
    (seniorityMismatch * cfg.seniorityMismatchPenalty);

  const compatWeight = cfg.compatibility;
  const transferWeight = cfg.transferability;
  const growthWeight = cfg.growth;
  const strategicBonus = cfg.strategicBonus;

  const rawScore =
    compatibility * compatWeight +
    transfer * transferWeight +
    growth * growthWeight;

  const strategic = v.company.toLowerCase().includes('tech') ? strategicBonus : 0;

  const finalScore = Math.max(0, Math.min(100, rawScore + strategic - riskPenalty));

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