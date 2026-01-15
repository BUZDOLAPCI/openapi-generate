import express from 'express';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ServerConfig } from '../types.js';

/**
 * Start the MCP server with HTTP transport
 */
export async function startHttpTransport(server: Server, config: ServerConfig): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      server: config.name,
      version: config.version,
      timestamp: new Date().toISOString(),
    });
  });

  // Server info endpoint
  app.get('/info', (_req, res) => {
    res.json({
      name: config.name,
      version: config.version,
      transport: 'http',
      capabilities: {
        tools: true,
      },
    });
  });

  // Note: Full HTTP/SSE transport for MCP would require additional implementation
  // This is a basic HTTP wrapper for health checks and info
  // For production use, consider using the official MCP HTTP transport when available

  const port = config.port || 3000;
  const host = config.host || '127.0.0.1';

  app.listen(port, host, () => {
    console.error(`openapi-generate MCP server running on http://${host}:${port}`);
    console.error('Note: HTTP transport provides basic endpoints. For full MCP support, use STDIO transport.');
  });

  // Keep reference to server for potential future use
  void server;
}
