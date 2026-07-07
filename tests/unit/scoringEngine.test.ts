import { scoreVacancy } from '../../src/core/scoringEngine';
import type { Vacancy } from '../../src/models/Vacancy';
import type { Profile } from '../../src/models/Profile';

test('scoreVacancy returns a score within 0-100 and proper breakdown', () => {
  const vacancy: Vacancy = {
    id: 1,
    title: 'Full-Stack Engineer',
    company: 'TechCo',
    source: 'computrabajo',
    url: 'https://example.com',
    description: 'We need JavaScript, Node.js and Python.',
    skillsExtracted: ['javascript', 'node.js', 'python'],
  } as any;

  const profile: Profile = {
    id: 1,
    name: 'John',
    skills: [{ name: 'javascript', rating: 7 }, { name: 'react', rating: 6 }],
    seniority: 'mid',
  } as any;

  const result = scoreVacancy(vacancy, profile);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
  expect(result.breakdown).toHaveProperty('compatibility');
  expect(result.breakdown).toHaveProperty('transfer');
  expect(result.breakdown).toHaveProperty('growth');
  expect(result.breakdown).toHaveProperty('riskPenalty');
});
