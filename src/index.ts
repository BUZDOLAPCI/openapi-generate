#!/usr/bin/env node
/**
 * openapi-generate MCP Server
 *
 * Parse OpenAPI specs and generate MCP tool schemas and scaffolds
 *
 * This server uses HTTP transport only (port 8080 by default).
 * Required for Dedalus platform deployment.
 *
 * Uses stateless JSON-RPC handling for MCP protocol compatibility.
 */
import { startHttpTransport } from './transport/http.js';

const SERVER_NAME = 'openapi-generate';
const SERVER_VERSION = '1.0.0';
const PORT = 8080;
const HOST = '0.0.0.0';

function main(): void {
  startHttpTransport({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    port: PORT,
    host: HOST,
  });
}

main();
