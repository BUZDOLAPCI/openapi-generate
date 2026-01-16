import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
/**
 * Session storage for HTTP transport
 */
const sessions = new Map();
/**
 * Create a standalone MCP server for use with HTTP transport
 * This is exported so external code can create servers independently
 */
export function createStandaloneServer(mcpServer, _config) {
    const sessionId = randomUUID();
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
    });
    sessions.set(sessionId, { transport, server: mcpServer });
    return { transport, sessionId };
}
/**
 * Handle MCP requests on /mcp endpoint
 */
async function handleMcpRequest(req, res, mcpServer, _config) {
    // Only allow POST requests for MCP
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json', 'Allow': 'POST' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }
    // Get or create session
    let sessionId = req.headers['mcp-session-id'];
    let session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) {
        // Create new session
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
        });
        sessionId = randomUUID();
        session = { transport, server: mcpServer };
        sessions.set(sessionId, session);
        // Connect the server to the transport
        await mcpServer.connect(session.transport);
    }
    // Handle the request with raw Node.js request/response objects
    await session.transport.handleRequest(req, res);
}
/**
 * Handle health check endpoint
 */
function handleHealthCheck(res, config) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        server: config.name,
        version: config.version,
        timestamp: new Date().toISOString(),
    }));
}
/**
 * Handle info endpoint
 */
function handleInfo(res, config) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        name: config.name,
        version: config.version,
        capabilities: {
            tools: true,
        },
    }));
}
/**
 * Handle 404 not found
 */
function handleNotFound(res) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
}
/**
 * Start the MCP server with HTTP transport using raw Node.js HTTP
 */
export async function startHttpTransport(server, config) {
    const port = config.port || 3000;
    const host = config.host || '127.0.0.1';
    const httpServer = createServer();
    httpServer.on('request', async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
        try {
            switch (url.pathname) {
                case '/mcp':
                    await handleMcpRequest(req, res, server, config);
                    break;
                case '/health':
                    handleHealthCheck(res, config);
                    break;
                case '/info':
                    handleInfo(res, config);
                    break;
                default:
                    handleNotFound(res);
            }
        }
        catch (error) {
            console.error('Error handling request:', error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        }
    });
    httpServer.listen(port, host, () => {
        console.error(`openapi-generate MCP server running on http://${host}:${port}`);
        console.error('Endpoints:');
        console.error(`  - POST /mcp - MCP protocol endpoint`);
        console.error(`  - GET /health - Health check`);
        console.error(`  - GET /info - Server info`);
    });
}
//# sourceMappingURL=http.js.map