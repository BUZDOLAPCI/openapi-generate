import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
/**
 * Start the MCP server with STDIO transport
 */
export async function startStdioTransport(server) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('openapi-generate MCP server running on stdio');
}
//# sourceMappingURL=stdio.js.map