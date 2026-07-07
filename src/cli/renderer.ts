export function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}

export function green(text: string): string {
  return `\x1b[32m${text}\x1b[0m`;
}

export function yellow(text: string): string {
  return `\x1b[33m${text}\x1b[0m`;
}

export function red(text: string): string {
  return `\x1b[31m${text}\x1b[0m`;
}

export function cyan(text: string): string {
  return `\x1b[36m${text}\x1b[0m`;
}

export function dim(text: string): string {
  return `\x1b[2m${text}\x1b[0m`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return green(score.toString());
  if (score >= 60) return yellow(score.toString());
  return red(score.toString());
}

export function statusBadge(status: string): string {
  switch (status) {
    case 'INTERESTED': return green('● INTERESTED');
    case 'APPLIED': return cyan('● APPLIED');
    case 'DISCARDED': return red('● DISCARDED');
    default: return dim('○ PENDING');
  }
}

export function recommendationBadge(rec: string): string {
  switch (rec) {
    case 'APLICAR': return green('APLICAR');
    case 'PREPARAR': return yellow('PREPARAR');
    case 'REVISAR': return dim('REVISAR');
    case 'IGNORAR': return red('IGNORAR');
    default: return dim(rec);
  }
}

export function matchTypeBadge(type: string): string {
  switch (type) {
    case 'directa': return green('Directa');
    case 'transferible': return cyan('Transferible');
    case 'baja_relacion': return dim('Baja rel.');
    default: return dim(type);
  }
}

export function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return dim('  (empty)');
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );
  const sep = '  ' + headers.map((h, i) => '─'.repeat(colWidths[i])).join('─┬─') + '─';
  let out = `  ${headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ')}\n`;
  out += sep + '\n';
  for (const row of rows) {
    out += `  ${row.map((c, i) => (c || '').padEnd(colWidths[i])).join(' │ ')}\n`;
  }
  return out;
}

export function divider(): string {
  return dim('─'.repeat(50));
}
