import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import type { JsonRpcRequest, JsonRpcResponse, ServerConfig, ParsedOpenAPISpec, ScaffoldOptions } from '../types.js';
import { openapiParse, generateToolSchemas, generateServerScaffold } from '../tools/index.js';

/**
 * Tool definitions for the openapi-generate MCP server
 */
const toolDefinitions = [
  {
    name: 'openapi_parse',
    description: 'Parse an OpenAPI spec from URL or JSON string. Returns structured representation of endpoints, parameters, schemas.',
    inputSchema: {
      type: 'object',
      properties: {
        spec_url_or_json: {
          type: 'string',
          description: 'URL to OpenAPI spec or raw JSON string of the spec',
        },
      },
      required: ['spec_url_or_json'],
    },
  },
  {
    name: 'generate_tool_schemas',
    description: 'Generate MCP tool definitions from parsed OpenAPI spec',
    inputSchema: {
      type: 'object',
      properties: {
        parsed_spec: {
          type: 'object',
          description: 'Parsed OpenAPI spec from openapi_parse tool',
        },
      },
      required: ['parsed_spec'],
    },
  },
  {
    name: 'generate_server_scaffold',
    description: 'Generate a complete MCP server scaffold following Dedalus conventions',
    inputSchema: {
      type: 'object',
      properties: {
        parsed_spec: {
          type: 'object',
          description: 'Parsed OpenAPI spec from openapi_parse tool',
        },
        language: {
          type: 'string',
          enum: ['typescript', 'python'],
          description: 'Target language for the generated server',
        },
        options: {
          type: 'object',
          description: 'Optional scaffold generation options',
          properties: {
            server_name: {
              type: 'string',
              description: 'Name for the generated server',
            },
            server_version: {
              type: 'string',
              description: 'Version for the generated server',
            },
            author: {
              type: 'string',
              description: 'Author name',
            },
            include_tests: {
              type: 'boolean',
              description: 'Whether to include test files',
            },
            base_url: {
              type: 'string',
              description: 'Base URL for API calls',
            },
          },
        },
      },
      required: ['parsed_spec', 'language'],
    },
  },
];

/**
 * Handle a single JSON-RPC request
 */
async function handleJsonRpcRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'openapi-generate',
              version: '1.0.0',
            },
          },
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: toolDefinitions,
          },
        };
      }

      case 'tools/call': {
        const toolName = params?.name as string;
        const args = params?.arguments as Record<string, unknown>;

        let result: unknown;

        switch (toolName) {
          case 'openapi_parse': {
            const specUrlOrJson = args?.spec_url_or_json as string;
            if (!specUrlOrJson) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        ok: false,
                        error: {
                          code: 'INVALID_INPUT',
                          message: 'spec_url_or_json is required',
                          details: {},
                        },
                        meta: { retrieved_at: new Date().toISOString() },
                      }, null, 2),
                    },
                  ],
                },
              };
            }
            result = await openapiParse(specUrlOrJson);
            break;
          }

          case 'generate_tool_schemas': {
            const parsedSpec = args?.parsed_spec as ParsedOpenAPISpec;
            if (!parsedSpec) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        ok: false,
                        error: {
                          code: 'INVALID_INPUT',
                          message: 'parsed_spec is required',
                          details: {},
                        },
                        meta: { retrieved_at: new Date().toISOString() },
                      }, null, 2),
                    },
                  ],
                },
              };
            }
            result = generateToolSchemas(parsedSpec);
            break;
          }

          case 'generate_server_scaffold': {
            const { parsed_spec: parsedSpec, language, options } = args as {
              parsed_spec: ParsedOpenAPISpec;
              language: 'typescript' | 'python';
              options?: ScaffoldOptions;
            };

            if (!parsedSpec) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        ok: false,
                        error: {
                          code: 'INVALID_INPUT',
                          message: 'parsed_spec is required',
                          details: {},
                        },
                        meta: { retrieved_at: new Date().toISOString() },
                      }, null, 2),
                    },
                  ],
                },
              };
            }

            if (!language || !['typescript', 'python'].includes(language)) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        ok: false,
                        error: {
                          code: 'INVALID_INPUT',
                          message: 'language must be "typescript" or "python"',
                          details: {},
                        },
                        meta: { retrieved_at: new Date().toISOString() },
                      }, null, 2),
                    },
                  ],
                },
              };
            }

            result = generateServerScaffold(parsedSpec, language, options);
            break;
          }

          default:
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Unknown tool: ${toolName}`,
              },
            };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Internal error: ${message}`,
      },
    };
  }
}

/**
 * Read the request body as a string
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/**
 * Send a JSON response
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Handle health check endpoint
 */
function handleHealthCheck(res: ServerResponse, config: ServerConfig): void {
  sendJson(res, 200, {
    status: 'ok',
    server: config.name,
    version: config.version,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle info endpoint
 */
function handleInfo(res: ServerResponse, config: ServerConfig): void {
  sendJson(res, 200, {
    name: config.name,
    version: config.version,
    capabilities: {
      tools: true,
    },
  });
}

/**
 * Handle not found
 */
function handleNotFound(res: ServerResponse): void {
  sendJson(res, 404, { error: 'Not found' });
}

/**
 * Handle method not allowed
 */
function handleMethodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { error: 'Method not allowed' });
}

/**
 * Handle MCP JSON-RPC endpoint
 */
async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readBody(req);
    const request: JsonRpcRequest = JSON.parse(body);

    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      sendJson(res, 400, {
        jsonrpc: '2.0',
        id: request.id || 0,
        error: {
          code: -32600,
          message: 'Invalid Request: missing or invalid jsonrpc version',
        },
      });
      return;
    }

    const response = await handleJsonRpcRequest(request);
    sendJson(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, 500, {
      ok: false,
      error: message,
    });
  }
}

/**
 * Create and configure the HTTP server
 */
export function createHttpServer(config: ServerConfig): Server {
  const httpServer = createServer();

  httpServer.on('request', async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url!, `http://${req.headers.host || 'localhost'}`);
    const method = req.method?.toUpperCase();

    try {
      switch (url.pathname) {
        case '/mcp':
          if (method === 'POST') {
            await handleMcpRequest(req, res);
          } else {
            handleMethodNotAllowed(res);
          }
          break;

        case '/health':
          if (method === 'GET') {
            handleHealthCheck(res, config);
          } else {
            handleMethodNotAllowed(res);
          }
          break;

        case '/info':
          if (method === 'GET') {
            handleInfo(res, config);
          } else {
            handleMethodNotAllowed(res);
          }
          break;

        default:
          handleNotFound(res);
      }
    } catch (error) {
      console.error('Server error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      sendJson(res, 500, { ok: false, error: message });
    }
  });

  return httpServer;
}

/**
 * Start the HTTP transport
 */
export function startHttpTransport(config: ServerConfig): Server {
  const port = config.port || 3000;
  const host = config.host || '127.0.0.1';

  const httpServer = createHttpServer(config);

  httpServer.listen(port, host, () => {
    console.error(`openapi-generate MCP server running on http://${host}:${port}`);
    console.error('Endpoints:');
    console.error(`  - POST /mcp - MCP protocol endpoint`);
    console.error(`  - GET /health - Health check`);
    console.error(`  - GET /info - Server info`);
  });

  return httpServer;
}
