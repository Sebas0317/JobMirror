import { analyseRisk } from '../../src/core/riskAnalyzer';
import type { Vacancy } from '../../src/models/Vacancy';
import type { Profile } from '../../src/models/Profile';

test('detects missing mandatory skill and seniority mismatch', () => {
  const vacancy: Vacancy = {
    id: 1,
    title: 'SAP Analyst',
    company: 'Acme Corp',
    source: 'computrabajo',
    url: 'https://example.com',
    description: 'We require SAP experience.',
    requirements: 'SAP experience required.',
    skillsExtracted: ['sap'],
    seniority: 'senior',
  } as any;

  const profile: Profile = {
    id: 1,
    name: 'John Doe',
    skills: [{ name: 'javascript', rating: 5 }],
    seniority: 'junior',
  } as any;

  const { missingMandatory, seniorityMismatch } = analyseRisk(vacancy, profile);
  expect(missingMandatory).toBeGreaterThan(0);
  expect(seniorityMismatch).toBe(1);
});
