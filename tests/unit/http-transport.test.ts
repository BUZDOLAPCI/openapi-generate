import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server as HttpServer } from 'http';
import { createHttpServer } from '../../src/transport/http.js';

/**
 * Test suite for HTTP transport and /mcp endpoint
 *
 * These tests verify that the MCP server correctly handles
 * stateless JSON-RPC requests over HTTP on the /mcp endpoint.
 */

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
      Accept: 'application/json',
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

// Helper to send MCP JSON-RPC request
async function sendMcpRequest(
  port: number,
  method: string,
  params: Record<string, unknown> = {}
): Promise<{ status: number; body: unknown }> {
  const jsonRpcRequest = {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 10000),
    method,
    params,
  };

  const response = await httpRequest(port, 'POST', '/mcp', jsonRpcRequest);
  return {
    status: response.status,
    body: JSON.parse(response.body),
  };
}

describe('HTTP Transport - /mcp endpoint (stateless)', () => {
  let server: HttpServer;
  const TEST_PORT = 18765;

  beforeAll(async () => {
    server = createHttpServer({
      name: 'test-server',
      version: '1.0.0',
      port: TEST_PORT,
      host: '127.0.0.1',
    });

    await new Promise<void>((resolve) => {
      server.listen(TEST_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should return 405 for non-POST requests to /mcp', async () => {
    const response = await httpRequest(TEST_PORT, 'GET', '/mcp');
    expect(response.status).toBe(405);
  });

  it('should handle initialize request (stateless)', async () => {
    const response = await sendMcpRequest(TEST_PORT, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    });

    expect(response.status).toBe(200);
    const body = response.body as { jsonrpc: string; id: number; result: { protocolVersion: string; capabilities: object; serverInfo: { name: string; version: string } } };
    expect(body.jsonrpc).toBe('2.0');
    expect(body.result).toBeDefined();
    expect(body.result.protocolVersion).toBe('2024-11-05');
    expect(body.result.serverInfo.name).toBe('openapi-generate');
  });

  it('should handle tools/list request without session', async () => {
    const response = await sendMcpRequest(TEST_PORT, 'tools/list', {});

    expect(response.status).toBe(200);
    const body = response.body as { jsonrpc: string; id: number; result: { tools: Array<{ name: string }> } };
    expect(body.jsonrpc).toBe('2.0');
    expect(body.result).toBeDefined();
    expect(body.result.tools).toBeDefined();
    expect(Array.isArray(body.result.tools)).toBe(true);

    // Verify expected tools are present
    const toolNames = body.result.tools.map((t) => t.name);
    expect(toolNames).toContain('openapi_parse');
    expect(toolNames).toContain('generate_tool_schemas');
    expect(toolNames).toContain('generate_server_scaffold');
  });

  it('should return proper tool schema for openapi_parse', async () => {
    const response = await sendMcpRequest(TEST_PORT, 'tools/list', {});

    expect(response.status).toBe(200);
    const body = response.body as { result: { tools: Array<{ name: string; description: string; inputSchema: { type: string; properties: Record<string, unknown>; required: string[] } }> } };
    const openapiParseTool = body.result.tools.find((t) => t.name === 'openapi_parse');

    expect(openapiParseTool).toBeDefined();
    expect(openapiParseTool!.description).toContain('Parse an OpenAPI spec');
    expect(openapiParseTool!.inputSchema).toBeDefined();
    expect(openapiParseTool!.inputSchema.type).toBe('object');
    expect(openapiParseTool!.inputSchema.properties).toHaveProperty('spec_url_or_json');
    expect(openapiParseTool!.inputSchema.required).toContain('spec_url_or_json');
  });

  it('should handle unknown method gracefully', async () => {
    const response = await sendMcpRequest(TEST_PORT, 'unknown/method', {});

    expect(response.status).toBe(200);
    const body = response.body as { jsonrpc: string; error: { code: number; message: string } };
    expect(body.jsonrpc).toBe('2.0');
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe(-32601);
    expect(body.error.message).toContain('Method not found');
  });

  it('should handle health check endpoint', async () => {
    const response = await httpRequest(TEST_PORT, 'GET', '/health');

    expect(response.status).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.server).toBe('test-server');
  });

  it('should handle info endpoint', async () => {
    const response = await httpRequest(TEST_PORT, 'GET', '/info');

    expect(response.status).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.name).toBe('test-server');
    expect(body.version).toBe('1.0.0');
    expect(body.capabilities).toHaveProperty('tools');
  });

  it('should return 404 for unknown endpoints', async () => {
    const response = await httpRequest(TEST_PORT, 'GET', '/unknown');

    expect(response.status).toBe(404);

    const body = JSON.parse(response.body);
    expect(body.error).toBe('Not found');
  });

  it('should reject invalid JSON-RPC version', async () => {
    const response = await httpRequest(TEST_PORT, 'POST', '/mcp', {
      jsonrpc: '1.0',
      id: 1,
      method: 'tools/list',
    });

    expect(response.status).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe(-32600);
    expect(body.error.message).toContain('invalid jsonrpc version');
  });
});

describe('HTTP Transport - Server Creation', () => {
  it('should export HTTP-related functions from transport', async () => {
    const transport = await import('../../src/transport/index.js');

    expect(transport.startHttpTransport).toBeDefined();
    expect(transport.createHttpServer).toBeDefined();

    // createStandaloneServer should NOT be exported (removed in stateless refactor)
    expect((transport as Record<string, unknown>).createStandaloneServer).toBeUndefined();

    // stdio should NOT be exported
    expect((transport as Record<string, unknown>).startStdioTransport).toBeUndefined();
  });
});
