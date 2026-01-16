#!/usr/bin/env node
/**
 * openapi-generate MCP Server
 *
 * Parse OpenAPI specs and generate MCP tool schemas and scaffolds
 */
import { createServer } from './server.js';
import { loadConfig } from './config.js';
import { parseArgs, printHelp, printVersion } from './cli.js';
import { startStdioTransport, startHttpTransport } from './transport/index.js';
async function main() {
    const config = loadConfig();
    const cliArgs = parseArgs(process.argv.slice(2));
    // Handle help and version flags
    if (cliArgs.help) {
        printHelp();
        process.exit(0);
    }
    if (cliArgs.version) {
        printVersion(config.version);
        process.exit(0);
    }
    // CLI args override config
    const transport = cliArgs.transport || config.transport;
    const port = cliArgs.port || config.port;
    const host = cliArgs.host || config.host;
    // Create the server
    const server = createServer(config.name, config.version);
    // Start with appropriate transport
    if (transport === 'http') {
        await startHttpTransport(server, { ...config, port, host });
    }
    else {
        await startStdioTransport(server);
    }
}
// Run the main function
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map