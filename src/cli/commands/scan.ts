import { bold, cyan, dim, green, red, table, divider } from '../renderer.ts';
import { runPipeline } from '../../core/scheduler.ts';

export async function scan() {
  console.log(`\n${bold('JOB MONITOR — SCAN')}`);
  console.log(divider());
  console.log(dim('Scaneando fuentes habilitadas...\n'));

  const start = Date.now();
  const { total, bySource, errors } = await runPipeline();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(green(`\n✓ Pipeline completado en ${elapsed}s`));
  console.log(`  Total vacantes: ${bold(total.toString())}\n`);

  if (Object.keys(bySource).length > 0) {
    const rows = Object.entries(bySource).map(([src, count]) => [
      src.padEnd(20),
      count.toString().padStart(4),
      dim('vacantes'),
    ]);
    console.log(table(['Fuente', 'Count', ''], rows));
  }

  console.log(divider());
  console.log(dim('Corre job-monitor today para ver los mejores matches'));
}
