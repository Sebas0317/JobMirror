import { extractSkills } from '../../src/core/skillExtractor';

// Mock the skillSynonyms.json content by mocking the internal loader
jest.mock('../../src/core/skillExtractor', () => {
  const original = jest.requireActual('../../src/core/skillExtractor');
  const mockSynonyms = {
    sql: ['sql', 'structured query language'],
    python: ['python', 'py'],
    'power bi': ['power bi', 'business intelligence', 'bi'],
  };
  // Overwrite the loadSynonyms function (if it exists) to return our mock
  return {
    ...original,
    loadSynonyms: jest.fn().mockReturnValue(mockSynonyms),
  };
});

test('extracts canonical skills from free text', () => {
  const text = `We need experience with SQL and Python. Familiarity with Business Intelligence tools like Power BI is a plus.`;
  const result = extractSkills(text);
  expect(result).toContain('sql');
  expect(result).toContain('python');
  expect(result).toContain('power bi');
});
