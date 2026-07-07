import { ComputrabajoAdapter } from '../../src/adapters/computrabajo.ts';
import nock from 'nock';

test('ComputrabajoAdapter returns empty array on no results', async () => {
  nock('https://co.computrabajo.com')
    .get('/empleos-en-bogota-dc')
    .query({ by: 'publicationtime' })
    .reply(200, '<html><body>No jobs found</body></html>');

  const adapter = new ComputrabajoAdapter();
  const result = await adapter.run({ enabled: true, city: 'bogota-dc', keywords: [], pages: 1 });
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(0);
});
