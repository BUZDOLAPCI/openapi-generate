import { describe, it, expect } from 'vitest';
import { openapiParse, generateOperationId } from '../../src/tools/parse.js';
import { generateToolSchemas, sanitizeToolName } from '../../src/tools/schemas.js';
import { generateServerScaffold } from '../../src/tools/scaffold.js';
import type { ParsedOpenAPISpec } from '../../src/types.js';

// Sample OpenAPI spec for testing
const sampleOpenAPISpec = {
  openapi: '3.0.3',
  info: {
    title: 'Pet Store API',
    version: '1.0.0',
    description: 'A sample pet store API',
  },
  servers: [
    {
      url: 'https://api.petstore.example.com/v1',
      description: 'Production server',
    },
  ],
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        summary: 'List all pets',
        description: 'Returns a list of all pets in the store',
        tags: ['pets'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of pets to return',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
        ],
        responses: {
          '200': {
            description: 'A list of pets',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Pet',
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createPet',
        summary: 'Create a pet',
        tags: ['pets'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreatePetRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Pet created',
          },
        },
      },
    },
    '/pets/{petId}': {
      get: {
        operationId: 'getPet',
        summary: 'Get a pet by ID',
        tags: ['pets'],
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'A pet',
          },
          '404': {
            description: 'Pet not found',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          species: {
            type: 'string',
            enum: ['dog', 'cat', 'bird', 'fish'],
          },
        },
      },
      CreatePetRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
          },
          species: {
            type: 'string',
          },
        },
      },
    },
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
    },
  },
};

describe('openapi_parse', () => {
  it('should parse a valid OpenAPI spec from JSON string', async () => {
    const result = await openapiParse(JSON.stringify(sampleOpenAPISpec));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.openapi_version).toBe('3.0.3');
      expect(result.data.info.title).toBe('Pet Store API');
      expect(result.data.paths.length).toBe(2);
      expect(result.data.schemas).toHaveProperty('Pet');
      expect(result.data.security_schemes).toHaveProperty('apiKey');
    }
  });

  it('should return error for invalid JSON', async () => {
    const result = await openapiParse('{invalid json}');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PARSE_ERROR');
    }
  });

  it('should extract all operations from paths', async () => {
    const result = await openapiParse(JSON.stringify(sampleOpenAPISpec));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const allOperations = result.data.paths.flatMap((p) => p.operations);
      expect(allOperations.length).toBe(3);

      const operationIds = allOperations.map((op) => op.operation_id);
      expect(operationIds).toContain('listPets');
      expect(operationIds).toContain('createPet');
      expect(operationIds).toContain('getPet');
    }
  });

  it('should parse parameters correctly', async () => {
    const result = await openapiParse(JSON.stringify(sampleOpenAPISpec));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const listPets = result.data.paths
        .find((p) => p.path === '/pets')
        ?.operations.find((op) => op.operation_id === 'listPets');

      expect(listPets?.parameters.length).toBe(1);
      expect(listPets?.parameters[0].name).toBe('limit');
      expect(listPets?.parameters[0].in).toBe('query');
      expect(listPets?.parameters[0].required).toBe(false);
    }
  });

  it('should parse request body correctly', async () => {
    const result = await openapiParse(JSON.stringify(sampleOpenAPISpec));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const createPet = result.data.paths
        .find((p) => p.path === '/pets')
        ?.operations.find((op) => op.operation_id === 'createPet');

      expect(createPet?.request_body).toBeDefined();
      expect(createPet?.request_body?.required).toBe(true);
      expect(createPet?.request_body?.content['application/json']).toBeDefined();
    }
  });
});

describe('generateOperationId', () => {
  it('should generate operation ID from method and path', () => {
    expect(generateOperationId('get', '/users')).toBe('get_users');
    expect(generateOperationId('post', '/users/{id}')).toBe('post_users_id');
    expect(generateOperationId('delete', '/users/{userId}/posts/{postId}')).toBe(
      'delete_users_userid_posts_postid'
    );
  });
});

describe('generate_tool_schemas', () => {
  it('should generate tool schemas from parsed spec', async () => {
    const parseResult = await openapiParse(JSON.stringify(sampleOpenAPISpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const result = generateToolSchemas(parseResult.data);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tools.length).toBe(3);
      expect(result.data.summary.total_tools).toBe(3);
      expect(result.data.summary.by_tag.pets).toBe(3);
    }
  });

  it('should create valid MCP tool schema structure', async () => {
    const parseResult = await openapiParse(JSON.stringify(sampleOpenAPISpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const result = generateToolSchemas(parseResult.data);

    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const tool of result.data.tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('required');
      }
    }
  });

  it('should include parameters in input schema', async () => {
    const parseResult = await openapiParse(JSON.stringify(sampleOpenAPISpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const result = generateToolSchemas(parseResult.data);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const listPetsTool = result.data.tools.find((t) => t.name === 'listpets');
      expect(listPetsTool?.inputSchema.properties).toHaveProperty('limit');
    }
  });

  it('should return error for invalid input', () => {
    const result = generateToolSchemas(null as unknown as ParsedOpenAPISpec);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });
});

describe('sanitizeToolName', () => {
  it('should sanitize tool names correctly', () => {
    expect(sanitizeToolName('listPets')).toBe('listpets');
    expect(sanitizeToolName('get-user-by-id')).toBe('get-user-by-id');
    expect(sanitizeToolName('create_new_pet')).toBe('create_new_pet');
    expect(sanitizeToolName('Tool With Spaces')).toBe('tool_with_spaces');
    expect(sanitizeToolName('tool@#$special')).toBe('tool_special');
  });
});

describe('generate_server_scaffold', () => {
  it('should generate TypeScript scaffold', async () => {
    const parseResult = await openapiParse(JSON.stringify(sampleOpenAPISpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const result = generateServerScaffold(parseResult.data, 'typescript', {
      server_name: 'petstore-server',
      include_tests: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.language).toBe('typescript');
      expect(result.data.tool_count).toBe(3);

      const filePaths = result.data.files.map((f) => f.path);
      expect(filePaths).toContain('package.json');
      expect(filePaths).toContain('tsconfig.json');
      expect(filePaths).toContain('src/index.ts');
      expect(filePaths).toContain('src/server.ts');
      expect(filePaths).toContain('src/types.ts');
      expect(filePaths).toContain('src/config.ts');
      expect(filePaths).toContain('src/tools/index.ts');
      expect(filePaths).toContain('src/transport/http.ts');
      expect(filePaths).not.toContain('src/transport/stdio.ts');
      expect(filePaths).toContain('tests/unit/tools.test.ts');
    }
  });

  it('should generate Python scaffold', async () => {
    const parseResult = await openapiParse(JSON.stringify(sampleOpenAPISpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const result = generateServerScaffold(parseResult.data, 'python', {
      server_name: 'petstore-server',
      include_tests: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.language).toBe('python');
      expect(result.data.tool_count).toBe(3);

      const filePaths = result.data.files.map((f) => f.path);
      expect(filePaths).toContain('pyproject.toml');
      expect(filePaths).toContain('src/main.py');
      expect(filePaths).toContain('src/server.py');
      expect(filePaths).toContain('src/types.py');
      expect(filePaths).toContain('src/config.py');
      expect(filePaths).toContain('src/tools/__init__.py');
      expect(filePaths).toContain('tests/test_tools.py');
    }
  });

  it('should return error for invalid language', async () => {
    const parseResult = await openapiParse(JSON.stringify(sampleOpenAPISpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const result = generateServerScaffold(
      parseResult.data,
      'ruby' as 'typescript',
      {}
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }
  });

  it('should include standard response envelope in generated types', async () => {
    const parseResult = await openapiParse(JSON.stringify(sampleOpenAPISpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const result = generateServerScaffold(parseResult.data, 'typescript');

    expect(result.ok).toBe(true);
    if (result.ok) {
      const typesFile = result.data.files.find((f) => f.path === 'src/types.ts');
      expect(typesFile?.content).toContain('SuccessResponse');
      expect(typesFile?.content).toContain('ErrorResponse');
      expect(typesFile?.content).toContain('successResponse');
      expect(typesFile?.content).toContain('errorResponse');
    }
  });

  it('should follow Dedalus entry point conventions', async () => {
    const parseResult = await openapiParse(JSON.stringify(sampleOpenAPISpec));
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    // TypeScript entry point
    const tsResult = generateServerScaffold(parseResult.data, 'typescript');
    expect(tsResult.ok).toBe(true);
    if (tsResult.ok) {
      const indexFile = tsResult.data.files.find((f) => f.path === 'src/index.ts');
      expect(indexFile).toBeDefined();
      expect(indexFile?.content).toContain('#!/usr/bin/env node');
    }

    // Python entry point
    const pyResult = generateServerScaffold(parseResult.data, 'python');
    expect(pyResult.ok).toBe(true);
    if (pyResult.ok) {
      const mainFile = pyResult.data.files.find((f) => f.path === 'src/main.py');
      expect(mainFile).toBeDefined();
      expect(mainFile?.content).toContain('#!/usr/bin/env python3');
    }
  });
});

describe('response envelope format', () => {
  it('should include proper meta fields in success response', async () => {
    const result = await openapiParse(JSON.stringify(sampleOpenAPISpec));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meta).toHaveProperty('retrieved_at');
      expect(result.meta).toHaveProperty('warnings');
      expect(Array.isArray(result.meta.warnings)).toBe(true);
      expect(new Date(result.meta.retrieved_at).toISOString()).toBe(result.meta.retrieved_at);
    }
  });

  it('should include proper meta fields in error response', async () => {
    const result = await openapiParse('{invalid}');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
      expect(result.error).toHaveProperty('details');
      expect(result.meta).toHaveProperty('retrieved_at');
    }
  });
});
