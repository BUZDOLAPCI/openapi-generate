import { describe, it, expect } from 'vitest';
import { createHttpServer, startHttpTransport } from '../../src/server.js';

describe('MCP Server E2E', () => {
  describe('Server Creation', () => {
    it('should create an HTTP server instance with config', () => {
      const server = createHttpServer({
        name: 'test-server',
        version: '1.0.0',
      });
      expect(server).toBeDefined();
      // Clean up - don't leave server listening
    });

    it('should create an HTTP server with custom name and version', () => {
      const server = createHttpServer({
        name: 'custom-server',
        version: '2.0.0',
      });
      expect(server).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    it('should export both createHttpServer and startHttpTransport', () => {
      // The server module should export both functions
      expect(createHttpServer).toBeDefined();
      expect(typeof createHttpServer).toBe('function');
      expect(startHttpTransport).toBeDefined();
      expect(typeof startHttpTransport).toBe('function');
    });
  });
});

describe('Tool Integration', () => {
  it('should be able to parse, generate schemas, and create scaffold in sequence', async () => {
    // This test validates the full workflow:
    // 1. Parse an OpenAPI spec
    // 2. Generate tool schemas from the parsed spec
    // 3. Generate a server scaffold

    const { openapiParse } = await import('../../src/tools/parse.js');
    const { generateToolSchemas } = await import('../../src/tools/schemas.js');
    const { generateServerScaffold } = await import('../../src/tools/scaffold.js');

    // Step 1: Parse
    const sampleSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            operationId: 'getTest',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };

    const parseResult = await openapiParse(JSON.stringify(sampleSpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    // Step 2: Generate tool schemas
    const schemasResult = generateToolSchemas(parseResult.data);
    expect(schemasResult.ok).toBe(true);
    if (!schemasResult.ok) return;

    expect(schemasResult.data.tools.length).toBe(1);
    expect(schemasResult.data.tools[0].name).toBe('gettest');

    // Step 3: Generate scaffold
    const scaffoldResult = generateServerScaffold(parseResult.data, 'typescript', {
      server_name: 'test-server',
    });
    expect(scaffoldResult.ok).toBe(true);
    if (!scaffoldResult.ok) return;

    expect(scaffoldResult.data.language).toBe('typescript');
    expect(scaffoldResult.data.tool_count).toBe(1);
    expect(scaffoldResult.data.files.length).toBeGreaterThan(0);

    // Verify key files exist
    const filePaths = scaffoldResult.data.files.map((f) => f.path);
    expect(filePaths).toContain('src/index.ts');
    expect(filePaths).toContain('src/server.ts');
    expect(filePaths).toContain('package.json');
  });
});

describe('Error Handling', () => {
  it('should handle invalid JSON gracefully', async () => {
    const { openapiParse } = await import('../../src/tools/parse.js');

    // JSON that starts with { but is invalid
    const result = await openapiParse('{invalid json}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PARSE_ERROR');
      expect(result.error.message).toBeDefined();
    }
  });

  it('should handle invalid URL gracefully', async () => {
    const { openapiParse } = await import('../../src/tools/parse.js');

    // Non-JSON string treated as URL
    const result = await openapiParse('not valid url');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_ERROR');
      expect(result.error.message).toBeDefined();
    }
  });

  it('should handle non-OpenAPI 3.x specs gracefully', async () => {
    const { openapiParse } = await import('../../src/tools/parse.js');

    const swagger2Spec = {
      swagger: '2.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    const result = await openapiParse(JSON.stringify(swagger2Spec));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  it('should handle empty parsed spec in schema generation', async () => {
    const { generateToolSchemas } = await import('../../src/tools/schemas.js');

    const result = generateToolSchemas({} as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  it('should handle invalid language in scaffold generation', async () => {
    const { openapiParse } = await import('../../src/tools/parse.js');
    const { generateServerScaffold } = await import('../../src/tools/scaffold.js');

    const sampleSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
    };

    const parseResult = await openapiParse(JSON.stringify(sampleSpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const result = generateServerScaffold(parseResult.data, 'invalid' as 'typescript');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });
});

describe('OpenAPI 3.1 Support', () => {
  it('should parse OpenAPI 3.1 specs', async () => {
    const { openapiParse } = await import('../../src/tools/parse.js');

    const spec31 = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/test': {
          get: {
            operationId: 'getTest',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };

    const result = await openapiParse(JSON.stringify(spec31));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.openapi_version).toBe('3.1.0');
    }
  });
});

describe('Complex Schema Handling', () => {
  it('should handle allOf, oneOf, and anyOf schemas', async () => {
    const { openapiParse } = await import('../../src/tools/parse.js');
    const { generateToolSchemas } = await import('../../src/tools/schemas.js');

    const complexSpec = {
      openapi: '3.0.0',
      info: { title: 'Complex API', version: '1.0.0' },
      paths: {
        '/complex': {
          post: {
            operationId: 'createComplex',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { type: 'object', properties: { id: { type: 'string' } } },
                      { type: 'object', properties: { name: { type: 'string' } } },
                    ],
                  },
                },
              },
            },
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };

    const parseResult = await openapiParse(JSON.stringify(complexSpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const schemasResult = generateToolSchemas(parseResult.data);
    expect(schemasResult.ok).toBe(true);
    if (schemasResult.ok) {
      expect(schemasResult.data.tools.length).toBe(1);
      const tool = schemasResult.data.tools[0];
      expect(tool.inputSchema.properties).toHaveProperty('id');
      expect(tool.inputSchema.properties).toHaveProperty('name');
    }
  });

  it('should handle $ref references', async () => {
    const { openapiParse } = await import('../../src/tools/parse.js');

    const specWithRefs = {
      openapi: '3.0.0',
      info: { title: 'Ref API', version: '1.0.0' },
      paths: {
        '/items': {
          get: {
            operationId: 'getItems',
            responses: {
              '200': {
                description: 'List of items',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Item' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Item: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    };

    const result = await openapiParse(JSON.stringify(specWithRefs));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schemas).toHaveProperty('Item');
      expect(result.data.schemas.Item.properties).toHaveProperty('id');
      expect(result.data.schemas.Item.properties).toHaveProperty('name');
    }
  });
});
