import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer as createHttpServer, Server as HttpServer, IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { createServer } from '../../src/server.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/**
 * Test suite for HTTP transport and /mcp endpoint
 *
 * These tests verify that the MCP server correctly handles
 * JSON-RPC requests over HTTP on the /mcp endpoint.
 */

// Session storage for test server
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: Server }>();

// Create a test HTTP server
function createTestServer(port: number): Promise<HttpServer> {
  return new Promise((resolve) => {
    const httpServer = createHttpServer();

    httpServer.on('request', async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/mcp' && req.method === 'POST') {
        // Get or create session
        let sessionId = req.headers['mcp-session-id'] as string | undefined;
        let session = sessionId ? sessions.get(sessionId) : undefined;

        if (!session) {
          sessionId = randomUUID();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionId!,
          });
          const mcpServer = createServer('test-server', '1.0.0');
          session = { transport, server: mcpServer };
          sessions.set(sessionId, session);

          await mcpServer.connect(session.transport);
        }

        await session.transport.handleRequest(req, res);
      } else if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    httpServer.listen(port, '127.0.0.1', () => {
      resolve(httpServer);
    });
  });
}

// Helper to make HTTP requests
async function httpRequest(
  port: number,
  method: string,
  path: string,
  body?: object,
  headers?: Record<string, string>
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const url = `http://127.0.0.1:${port}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const responseBody = await response.text();

  return {
    status: response.status,
    headers: responseHeaders,
    body: responseBody,
  };
}

// Helper to send MCP request with proper initialization
async function sendMcpRequest(
  port: number,
  method: string,
  params: Record<string, unknown> = {},
  sessionId?: string
): Promise<{ status: number; body: string; sessionId?: string }> {
  const jsonRpcRequest = {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 10000),
    method,
    params,
  };

  const response = await httpRequest(port, 'POST', '/mcp', jsonRpcRequest, sessionId ? { 'mcp-session-id': sessionId } : {});
  return {
    status: response.status,
    body: response.body,
    sessionId: response.headers['mcp-session-id'],
  };
}

describe('HTTP Transport - /mcp endpoint', () => {
  let server: HttpServer;
  const TEST_PORT = 18765;

  beforeAll(async () => {
    server = await createTestServer(TEST_PORT);
  });

  afterAll(async () => {
    sessions.clear();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should return 404 for non-POST requests to /mcp', async () => {
    const response = await httpRequest(TEST_PORT, 'GET', '/mcp');
    expect(response.status).toBe(404);
  });

  it('should accept POST requests to /mcp endpoint', async () => {
    // First need to initialize per MCP protocol
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

    const response = await httpRequest(TEST_PORT, 'POST', '/mcp', initRequest);
    // Should get a response (200 for SSE, or other valid status)
    expect([200, 202]).toContain(response.status);
  });

  it('should handle initialization and tools/list request', async () => {
    // Initialize first
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

    const initResponse = await httpRequest(TEST_PORT, 'POST', '/mcp', initRequest);
    const sessionId = initResponse.headers['mcp-session-id'];

    // Now request tools list with session
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    const response = await httpRequest(TEST_PORT, 'POST', '/mcp', toolsRequest, sessionId ? { 'mcp-session-id': sessionId } : {});

    expect(response.status).toBe(200);

    // Parse SSE response - look for the data line
    const lines = response.body.split('\n');
    const dataLine = lines.find((line) => line.startsWith('data:'));

    expect(dataLine).toBeDefined();

    if (dataLine) {
      const jsonData = JSON.parse(dataLine.replace('data:', '').trim());

      expect(jsonData.jsonrpc).toBe('2.0');
      expect(jsonData.result).toBeDefined();
      expect(jsonData.result.tools).toBeDefined();
      expect(Array.isArray(jsonData.result.tools)).toBe(true);

      // Verify expected tools are present
      const toolNames = jsonData.result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('openapi_parse');
      expect(toolNames).toContain('generate_tool_schemas');
      expect(toolNames).toContain('generate_server_scaffold');
    }
  });

  it('should return proper tool schema for openapi_parse', async () => {
    // Initialize first
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

    const initResponse = await httpRequest(TEST_PORT, 'POST', '/mcp', initRequest);
    const sessionId = initResponse.headers['mcp-session-id'];

    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    const response = await httpRequest(TEST_PORT, 'POST', '/mcp', toolsRequest, sessionId ? { 'mcp-session-id': sessionId } : {});

    expect(response.status).toBe(200);

    const lines = response.body.split('\n');
    const dataLine = lines.find((line) => line.startsWith('data:'));

    if (dataLine) {
      const jsonData = JSON.parse(dataLine.replace('data:', '').trim());
      const openapiParseTool = jsonData.result.tools.find(
        (t: { name: string }) => t.name === 'openapi_parse'
      );

      expect(openapiParseTool).toBeDefined();
      expect(openapiParseTool.description).toContain('Parse an OpenAPI spec');
      expect(openapiParseTool.inputSchema).toBeDefined();
      expect(openapiParseTool.inputSchema.type).toBe('object');
      expect(openapiParseTool.inputSchema.properties).toHaveProperty('spec_url_or_json');
      expect(openapiParseTool.inputSchema.required).toContain('spec_url_or_json');
    }
  });

  it('should handle health check endpoint', async () => {
    const response = await httpRequest(TEST_PORT, 'GET', '/health');

    expect(response.status).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  it('should return 404 for unknown endpoints', async () => {
    const response = await httpRequest(TEST_PORT, 'GET', '/unknown');

    expect(response.status).toBe(404);

    const body = JSON.parse(response.body);
    expect(body.error).toBe('Not found');
  });
});

describe('HTTP Transport - Server Creation', () => {
  it('should create server without stdio transport', () => {
    const server = createServer('test', '1.0.0');
    expect(server).toBeDefined();
  });

  it('should export only HTTP-related functions from transport', async () => {
    const transport = await import('../../src/transport/index.js');

    expect(transport.startHttpTransport).toBeDefined();
    expect(transport.createStandaloneServer).toBeDefined();

    // stdio should NOT be exported
    expect((transport as Record<string, unknown>).startStdioTransport).toBeUndefined();
  });
});
