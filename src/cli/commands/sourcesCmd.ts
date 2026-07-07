import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { bold, dim, green, red, cyan, table, divider } from '../renderer.ts';

interface Sources {
  [key: string]: {
    enabled: boolean;
    city?: string;
    keywords?: string[];
    pages?: number;
  };
}

const configPath = join(process.cwd(), 'config', 'sources.json');

async function loadSources(): Promise<Sources> {
  return JSON.parse(await readFile(configPath, 'utf-8'));
}

async function saveSources(sources: Sources): Promise<void> {
  await writeFile(configPath, JSON.stringify(sources, null, 2) + '\n');
}

export async function sourcesCmd(args: string[]) {
  const sub = args[0];

  if (!sub || sub === 'list') {
    await listSources();
    return;
  }

  if (sub === 'enable' || sub === 'disable') {
    const name = args[1];
    if (!name) {
      console.log(red('Error:') + ' Especifica la fuente. Ej: ' + dim('job-monitor sources enable indeed'));
      return;
    }
    await toggleSource(name, sub === 'enable');
    return;
  }

  console.log(red(`Subcomando desconocido: ${sub}`));
  console.log(dim('Uso: job-monitor sources list | enable <name> | disable <name>'));
}

async function listSources() {
  const sources = await loadSources();
  console.log(`\n${bold('JOB MONITOR — SOURCES')}`);
  console.log(divider());
  console.log(`  ${dim('Config:')} config/sources.json\n`);

  const rows = Object.entries(sources).map(([name, cfg]) => [
    name.padEnd(16),
    cfg.enabled ? green('✓ enabled') : red('✗ disabled'),
    (cfg.city ?? '—').padEnd(14),
    (cfg.keywords?.join(', ') || '—'),
  ]);

  console.log(table(['Fuente', 'Estado', 'Ciudad', 'Keywords'], rows));
  console.log(divider());
  console.log(dim('job-monitor sources enable <name> — para activar'));
  console.log(dim('job-monitor sources disable <name> — para desactivar'));
}

async function toggleSource(name: string, enable: boolean) {
  const sources = await loadSources();
  if (!(name in sources)) {
    console.log(red(`Fuente desconocida: ${name}`));
    console.log(dim('Disponibles: ' + Object.keys(sources).join(', ')));
    return;
  }
  sources[name].enabled = enable;
  await saveSources(sources);
  console.log(enable ? green(`✓ ${name} habilitado`) : red(`✗ ${name} deshabilitado`));
}
