import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { openapiParse, generateToolSchemas, generateServerScaffold } from './tools/index.js';
// Re-export createStandaloneServer from transport for convenience
export { createStandaloneServer } from './transport/http.js';
/**
 * Create the MCP server with all tools registered
 */
export function createServer(name = 'openapi-generate', version = '1.0.0') {
    const server = new Server({ name, version }, { capabilities: { tools: {} } });
    // Register tool listing handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
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
            ],
        };
    });
    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        switch (name) {
            case 'openapi_parse': {
                const specUrlOrJson = args.spec_url_or_json;
                if (!specUrlOrJson) {
                    return {
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
                    };
                }
                const result = await openapiParse(specUrlOrJson);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            }
            case 'generate_tool_schemas': {
                const parsedSpec = args.parsed_spec;
                if (!parsedSpec) {
                    return {
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
                    };
                }
                const result = generateToolSchemas(parsedSpec);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            }
            case 'generate_server_scaffold': {
                const { parsed_spec: parsedSpec, language, options } = args;
                if (!parsedSpec) {
                    return {
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
                    };
                }
                if (!language || !['typescript', 'python'].includes(language)) {
                    return {
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
                    };
                }
                const result = generateServerScaffold(parsedSpec, language, options);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            }
            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                ok: false,
                                error: {
                                    code: 'INVALID_INPUT',
                                    message: `Unknown tool: ${name}`,
                                    details: { available_tools: ['openapi_parse', 'generate_tool_schemas', 'generate_server_scaffold'] },
                                },
                                meta: { retrieved_at: new Date().toISOString() },
                            }, null, 2),
                        },
                    ],
                };
        }
    });
    return server;
}
//# sourceMappingURL=server.js.map