#!/usr/bin/env node
/**
 * openapi-generate MCP Server
 *
 * Parse OpenAPI specs and generate MCP tool schemas and scaffolds
 *
 * This server uses HTTP transport only (port 8080 by default).
 * Required for Dedalus platform deployment.
 */
import { createServer } from './server.js';
import { startHttpTransport } from './transport/http.js';
const SERVER_NAME = 'openapi-generate';
const SERVER_VERSION = '1.0.0';
const PORT = 8080;
const HOST = '0.0.0.0';
async function main() {
    const server = createServer(SERVER_NAME, SERVER_VERSION);
    await startHttpTransport(server, {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        port: PORT,
        host: HOST,
    });
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map