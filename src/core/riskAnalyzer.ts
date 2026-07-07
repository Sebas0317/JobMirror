import type { Vacancy } from '../models/Vacancy.ts';
import type { Profile } from '../models/Profile.ts';

export function analyseRisk(vacancy: Vacancy, profile: Profile) {
  let missingMandatory = 0;
  let seniorityMismatch = 0;

  // 1. Skills in requirements/description not in profile
  const textToCheck = ((vacancy.requirements ?? '') + ' ' + (vacancy.description ?? '')).toLowerCase();
  if (vacancy.skillsExtracted) {
    const extracted = Array.isArray(vacancy.skillsExtracted)
      ? vacancy.skillsExtracted
      : JSON.parse(vacancy.skillsExtracted as string);
    const profileSkillNames = profile.skills.map(s => s.name.toLowerCase());
    for (const skill of extracted) {
      if (textToCheck.includes(skill.toLowerCase()) && !profileSkillNames.includes(skill.toLowerCase())) {
        missingMandatory += 1;
      }
    }
  }

  // 2. Seniority mismatch
  const exp = vacancy.experienceRequired?.toLowerCase() ?? '';
  const vacSeniority = (vacancy as any).seniority?.toLowerCase() ?? '';
  const senioritySource = exp || vacSeniority;
  if (senioritySource.includes('senior') && profile.seniority === 'junior') {
    seniorityMismatch += 1;
  }
  if (senioritySource.includes('junior') && profile.seniority === 'senior') {
    seniorityMismatch += 1;
  }

  return { missingMandatory, seniorityMismatch };
}
