import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ServerConfig } from '../types.js';
/**
 * Create a standalone MCP server for use with HTTP transport
 * This is exported so external code can create servers independently
 */
export declare function createStandaloneServer(mcpServer: Server, _config: ServerConfig): {
    transport: StreamableHTTPServerTransport;
    sessionId: string;
};
/**
 * Start the MCP server with HTTP transport using raw Node.js HTTP
 */
export declare function startHttpTransport(server: Server, config: ServerConfig): Promise<void>;
//# sourceMappingURL=http.d.ts.map