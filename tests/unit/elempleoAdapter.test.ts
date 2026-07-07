import { ElempleoAdapter } from '../../src/adapters/elempleo.ts';
import nock from 'nock';

test('ElempleoAdapter returns empty array on no results', async () => {
  nock('https://www.elempleo.com')
    .get('/co/ofertas-empleo/bogota')
    .reply(200, '<html><body>No jobs found</body></html>');

  const adapter = new ElempleoAdapter();
  const result = await adapter.run({ enabled: true, city: 'bogota', keywords: [], pages: 1 });
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(0);
});
