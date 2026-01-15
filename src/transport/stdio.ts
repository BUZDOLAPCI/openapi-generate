import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Start the MCP server with STDIO transport
 */
export async function startStdioTransport(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('openapi-generate MCP server running on stdio');
}
