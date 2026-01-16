/**
 * Server exports for openapi-generate MCP server
 *
 * This module re-exports the HTTP transport functions for convenience.
 * The HTTP transport now handles MCP JSON-RPC directly without
 * requiring the MCP SDK Server class.
 */

export { startHttpTransport, createHttpServer } from './transport/http.js';
