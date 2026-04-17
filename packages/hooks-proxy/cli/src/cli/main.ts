#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { invokeCommand } from './commands/invoke';
import { execCommand } from './commands/exec';
import { bootstrapCommand } from './commands/bootstrap';
import { showSessionCommand } from './commands/show-session';
import { clearSessionCommand } from './commands/clear-session';
import { doctorCommand } from './commands/doctor';

export async function main(argv: string[] = process.argv): Promise<void> {
  await yargs(hideBin(argv))
    .scriptName('a5c-hooks-proxy')
    .usage('$0 <command> [options]')
    .command(invokeCommand)
    .command(execCommand)
    .command(bootstrapCommand)
    .command(showSessionCommand)
    .command(clearSessionCommand)
    .command(doctorCommand)
    .demandCommand(1, 'You must provide a command')
    .strict()
    .help()
    .parseAsync();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
