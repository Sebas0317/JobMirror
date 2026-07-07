import { scan } from './commands/scan.ts';
import { today } from './commands/today.ts';
import { analyze } from './commands/analyze.ts';
import { profileCmd } from './commands/profileCmd.ts';
import { sourcesCmd } from './commands/sourcesCmd.ts';
import { feedbackCmd } from './commands/feedbackCmd.ts';
import { stats } from './commands/statsCmd.ts';
import { feed } from './commands/feed.ts';
import { bold, cyan, dim, green, red, yellow } from './renderer.ts';

const USAGE = `
${bold('JOB MONITOR AI')} ${dim('v0.2.0 — Personal Job Intelligence')}

${bold('USO')}
  job-monitor ${dim('<comando>')} [${dim('args')}]

${bold('COMANDOS')}
  ${cyan('scan')}              ${dim('Ejecutar pipeline completo (scrape + score + store)')}
  ${cyan('today')}             ${dim('Mejores matches del día')}
  ${cyan('feed')}   [${dim('fuente')}]    ${dim('Últimas vacantes sin filtro de score')}
  ${cyan('analyze')} ${dim('<id>')}       ${dim('Análisis profundo de una vacante')}
  ${cyan('profile')}           ${dim('Gestión del perfil (show, upload)')}
  ${cyan('sources')}           ${dim('Listar y configurar fuentes')}
  ${cyan('feedback')} ${dim('<id> <status>')} ${dim('Dar feedback a una vacante')}
  ${cyan('stats')}             ${dim('Estadísticas del sistema')}
  ${cyan('help')}              ${dim('Mostrar esta ayuda')}

${bold('EJEMPLOS')}
  ${dim('job-monitor scan')}
  ${dim('job-monitor today')}
  ${dim('job-monitor feed')}
  ${dim('job-monitor feed computrabajo')}
  ${dim('job-monitor feed elempleo')}
  ${dim('job-monitor analyze 42')}
  ${dim('job-monitor profile upload ./cv.pdf')}
  ${dim('job-monitor sources enable linkedin')}
  ${dim('job-monitor feedback 42 APPLIED')}
`;

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === 'help') {
    console.log(USAGE);
    return;
  }

  try {
    switch (command) {
      case 'scan':
        await scan();
        break;
      case 'today':
        await today();
        break;
      case 'analyze':
        if (!args[0]) {
          console.log(red('Error:') + ' Especifica el ID de la vacante. Ej: ' + dim('job-monitor analyze 42'));
          return;
        }
        await analyze(args[0]);
        break;
      case 'profile':
        await profileCmd(args);
        break;
      case 'sources':
        await sourcesCmd(args);
        break;
      case 'feedback':
        if (!args[0] || !args[1]) {
          console.log(red('Error:') + ' Uso: job-monitor feedback <id> <INTERESTED|DISCARDED|APPLIED>');
          return;
        }
        await feedbackCmd(args[0], args[1]);
        break;
      case 'feed':
        await feed(args);
        break;
      case 'stats':
        await stats();
        break;
      default:
        console.log(red(`Comando desconocido: ${command}`));
        console.log(USAGE);
    }
  } catch (err: any) {
    console.error(red('Error:'), err.message ?? err);
    process.exit(1);
  }
}

main();
