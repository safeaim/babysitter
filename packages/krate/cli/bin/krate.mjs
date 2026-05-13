#!/usr/bin/env node
const command = process.argv[2];
if (command === 'serve' || !command) {
  const { createKrateHttpServer } = await import('../src/index.js');
  const server = createKrateHttpServer();
  const port = Number(process.env.PORT || 3080);
  server.listen(port, () => console.log(`Krate server listening on port ${port}`));
} else if (command === 'mcp') {
  const { createMcpServer } = await import('../src/mcp-server.js');
  const server = createMcpServer();
  server.start();
} else if (command === '--help' || command === 'help') {
  console.log('Usage: krate [command]\n\nCommands:\n  serve    Start HTTP server (default)\n  mcp      Start as MCP server (stdio)\n  help     Show this help');
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
