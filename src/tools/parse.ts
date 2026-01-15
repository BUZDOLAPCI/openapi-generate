import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import {
  type ParsedOpenAPISpec,
  type ParsedPath,
  type ParsedOperation,
  type ParsedParameter,
  type ParsedRequestBody,
  type ParsedResponse,
  type ParsedSchema,
  type ParsedSecurityScheme,
  type ParsedServer,
  type ToolResponse,
  successResponse,
  errorResponse,
  isOpenAPIV3,
} from '../types.js';

type OpenAPISpec = OpenAPIV3.Document | OpenAPIV3_1.Document;
type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject;
type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
type RequestBodyObject = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;
type ResponseObject = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;
type SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject | OpenAPIV3_1.SecuritySchemeObject;
type OperationObject = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
type PathItemObject = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject;

/**
 * Parse an OpenAPI specification from URL or JSON string
 */
export async function openapiParse(
  specUrlOrJson: string
): Promise<ToolResponse<ParsedOpenAPISpec>> {
  try {
    let spec: OpenAPISpec;

    // Determine if input is URL or JSON
    if (specUrlOrJson.trim().startsWith('{')) {
      // Parse as JSON
      try {
        const parsed = JSON.parse(specUrlOrJson);
        spec = await SwaggerParser.dereference(parsed) as OpenAPISpec;
      } catch (parseError) {
        return errorResponse('PARSE_ERROR', 'Invalid JSON provided', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
      }
    } else {
      // Parse as URL
      try {
        spec = await SwaggerParser.dereference(specUrlOrJson) as OpenAPISpec;
      } catch (fetchError) {
        return errorResponse('UPSTREAM_ERROR', 'Failed to fetch or parse OpenAPI spec from URL', {
          url: specUrlOrJson,
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        });
      }
    }

    // Validate it's OpenAPI 3.x
    if (!isOpenAPIV3(spec)) {
      return errorResponse('INVALID_INPUT', 'Only OpenAPI 3.0 and 3.1 specifications are supported', {
        provided_version: (spec as Record<string, unknown>).openapi || (spec as Record<string, unknown>).swagger || 'unknown',
      });
    }

    const parsedSpec = parseSpec(spec);

    return successResponse(parsedSpec, {
      source: specUrlOrJson.startsWith('{') ? 'json_input' : specUrlOrJson,
    });
  } catch (error) {
    return errorResponse('INTERNAL_ERROR', 'Unexpected error while parsing OpenAPI spec', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Parse the OpenAPI spec into our internal representation
 */
function parseSpec(spec: OpenAPISpec): ParsedOpenAPISpec {
  return {
    openapi_version: spec.openapi,
    info: {
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
    },
    servers: parseServers(spec.servers),
    paths: parsePaths(spec.paths || {}),
    schemas: parseSchemas(spec.components?.schemas || {}),
    security_schemes: parseSecuritySchemes(spec.components?.securitySchemes || {}),
  };
}

/**
 * Parse servers array
 */
function parseServers(servers?: OpenAPISpec['servers']): ParsedServer[] {
  if (!servers) return [];

  return servers.map((server) => ({
    url: server.url,
    description: server.description,
    variables: server.variables
      ? Object.fromEntries(
          Object.entries(server.variables).map(([key, value]) => [
            key,
            {
              default: value.default,
              enum: value.enum,
              description: value.description,
            },
          ])
        )
      : undefined,
  }));
}

/**
 * Parse paths object
 */
function parsePaths(paths: OpenAPISpec['paths']): ParsedPath[] {
  if (!paths) return [];

  return Object.entries(paths).map(([path, pathItem]) => ({
    path,
    operations: parsePathOperations(path, pathItem as PathItemObject),
  }));
}

/**
 * Parse operations for a path
 */
function parsePathOperations(path: string, pathItem: PathItemObject): ParsedOperation[] {
  const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;
  const operations: ParsedOperation[] = [];

  // Get path-level parameters
  const pathParameters = pathItem.parameters || [];

  for (const method of methods) {
    const operation = pathItem[method] as OperationObject | undefined;
    if (operation) {
      operations.push(parseOperation(method, path, operation, pathParameters as (ParameterObject | ReferenceObject)[]));
    }
  }

  return operations;
}

/**
 * Parse a single operation
 */
function parseOperation(
  method: string,
  path: string,
  operation: OperationObject,
  pathParameters: (ParameterObject | ReferenceObject)[]
): ParsedOperation {
  // Generate operation ID if not provided
  const operationId = operation.operationId || generateOperationId(method, path);

  // Merge path-level and operation-level parameters
  const allParameters = [...pathParameters, ...(operation.parameters || [])];

  return {
    method: method.toUpperCase(),
    operation_id: operationId,
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags,
    parameters: parseParameters(allParameters as (ParameterObject | ReferenceObject)[]),
    request_body: operation.requestBody
      ? parseRequestBody(operation.requestBody as RequestBodyObject | ReferenceObject)
      : undefined,
    responses: parseResponses(operation.responses || {}),
    security: operation.security?.map((sec) => sec as Record<string, string[]>),
    deprecated: operation.deprecated,
  };
}

/**
 * Generate an operation ID from method and path
 */
function generateOperationId(method: string, path: string): string {
  // Convert /users/{id}/posts to users_id_posts
  const pathPart = path
    .replace(/^\//, '')
    .replace(/\{([^}]+)\}/g, '$1')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `${method}_${pathPart}`.toLowerCase();
}

/**
 * Parse parameters array
 */
function parseParameters(parameters: (ParameterObject | ReferenceObject)[]): ParsedParameter[] {
  return parameters
    .filter((param): param is ParameterObject => !isRef(param))
    .map((param) => ({
      name: param.name,
      in: param.in as 'query' | 'header' | 'path' | 'cookie',
      description: param.description,
      required: param.required || param.in === 'path',
      deprecated: param.deprecated,
      schema: parseSchema((param.schema as SchemaObject | ReferenceObject) || { type: 'string' }),
    }));
}

/**
 * Parse request body
 */
function parseRequestBody(requestBody: RequestBodyObject | ReferenceObject): ParsedRequestBody | undefined {
  if (isRef(requestBody)) return undefined;

  return {
    description: requestBody.description,
    required: requestBody.required || false,
    content: Object.fromEntries(
      Object.entries(requestBody.content || {}).map(([mediaType, content]) => [
        mediaType,
        {
          schema: parseSchema((content.schema as SchemaObject | ReferenceObject) || {}),
        },
      ])
    ),
  };
}

/**
 * Parse responses object
 */
function parseResponses(responses: Record<string, ResponseObject | ReferenceObject>): ParsedResponse[] {
  return Object.entries(responses)
    .filter((entry): entry is [string, ResponseObject] => !isRef(entry[1]))
    .map(([statusCode, response]) => ({
      status_code: statusCode,
      description: response.description || '',
      content: response.content
        ? Object.fromEntries(
            Object.entries(response.content || {}).map(([mediaType, content]) => [
              mediaType,
              {
                schema: parseSchema((content.schema as SchemaObject | ReferenceObject) || {}),
              },
            ])
          )
        : undefined,
    }));
}

/**
 * Parse schemas from components
 */
function parseSchemas(schemas: Record<string, SchemaObject | ReferenceObject>): Record<string, ParsedSchema> {
  return Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [name, parseSchema(schema)])
  );
}

/**
 * Parse a single schema
 */
function parseSchema(schema: SchemaObject | ReferenceObject): ParsedSchema {
  if (isRef(schema)) {
    return { $ref: schema.$ref };
  }

  const parsed: ParsedSchema = {};

  if (schema.type) {
    parsed.type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  }
  if (schema.format) parsed.format = schema.format;
  if (schema.description) parsed.description = schema.description;
  if (schema.title) parsed.title = schema.title;
  if (schema.enum) parsed.enum = schema.enum as (string | number | boolean)[];
  if (schema.default !== undefined) parsed.default = schema.default;
  if (schema.example !== undefined) parsed.example = schema.example;
  if ('nullable' in schema && schema.nullable) parsed.nullable = schema.nullable;
  if (schema.minimum !== undefined) parsed.minimum = schema.minimum;
  if (schema.maximum !== undefined) parsed.maximum = schema.maximum;
  if (schema.minLength !== undefined) parsed.minLength = schema.minLength;
  if (schema.maxLength !== undefined) parsed.maxLength = schema.maxLength;
  if (schema.pattern) parsed.pattern = schema.pattern;
  if (schema.required) parsed.required = schema.required;

  if (schema.properties) {
    parsed.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        parseSchema(value as SchemaObject | ReferenceObject),
      ])
    );
  }

  if ('items' in schema && schema.items) {
    parsed.items = parseSchema(schema.items as SchemaObject | ReferenceObject);
  }

  if (schema.oneOf) {
    parsed.oneOf = schema.oneOf.map((s) => parseSchema(s as SchemaObject | ReferenceObject));
  }

  if (schema.anyOf) {
    parsed.anyOf = schema.anyOf.map((s) => parseSchema(s as SchemaObject | ReferenceObject));
  }

  if (schema.allOf) {
    parsed.allOf = schema.allOf.map((s) => parseSchema(s as SchemaObject | ReferenceObject));
  }

  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === 'boolean') {
      parsed.additionalProperties = schema.additionalProperties;
    } else {
      parsed.additionalProperties = parseSchema(schema.additionalProperties as SchemaObject | ReferenceObject);
    }
  }

  return parsed;
}

/**
 * Parse security schemes
 */
function parseSecuritySchemes(
  schemes: Record<string, SecuritySchemeObject | ReferenceObject>
): Record<string, ParsedSecurityScheme> {
  return Object.fromEntries(
    Object.entries(schemes)
      .filter((entry): entry is [string, SecuritySchemeObject] => !isRef(entry[1]))
      .map(([name, scheme]) => [name, parseSecurityScheme(scheme)])
  );
}

/**
 * Parse a single security scheme
 */
function parseSecurityScheme(scheme: SecuritySchemeObject): ParsedSecurityScheme {
  const parsed: ParsedSecurityScheme = {
    type: scheme.type,
    description: scheme.description,
  };

  if (scheme.type === 'apiKey') {
    parsed.name = scheme.name;
    parsed.in = scheme.in;
  } else if (scheme.type === 'http') {
    parsed.scheme = scheme.scheme;
    if ('bearerFormat' in scheme) {
      parsed.bearer_format = scheme.bearerFormat;
    }
  } else if (scheme.type === 'oauth2' && 'flows' in scheme) {
    parsed.flows = {};
    const flows = scheme.flows;
    if (flows.implicit) {
      parsed.flows.implicit = {
        authorization_url: flows.implicit.authorizationUrl,
        scopes: flows.implicit.scopes,
      };
    }
    if (flows.password) {
      parsed.flows.password = {
        token_url: flows.password.tokenUrl,
        scopes: flows.password.scopes,
      };
    }
    if (flows.clientCredentials) {
      parsed.flows.clientCredentials = {
        token_url: flows.clientCredentials.tokenUrl,
        scopes: flows.clientCredentials.scopes,
      };
    }
    if (flows.authorizationCode) {
      parsed.flows.authorizationCode = {
        authorization_url: flows.authorizationCode.authorizationUrl,
        token_url: flows.authorizationCode.tokenUrl,
        scopes: flows.authorizationCode.scopes,
      };
    }
  } else if (scheme.type === 'openIdConnect' && 'openIdConnectUrl' in scheme) {
    parsed.open_id_connect_url = scheme.openIdConnectUrl;
  }

  return parsed;
}

/**
 * Check if object is a reference
 */
function isRef(obj: unknown): obj is ReferenceObject {
  return typeof obj === 'object' && obj !== null && '$ref' in obj;
}

export { generateOperationId, parseSchema };
