import {
  type ParsedOpenAPISpec,
  type ParsedOperation,
  type ParsedSchema,
  type MCPToolSchema,
  type JSONSchema,
  type ToolResponse,
  successResponse,
  errorResponse,
} from '../types.js';

/**
 * Generate MCP tool definitions from parsed OpenAPI spec
 */
export function generateToolSchemas(
  parsedSpec: ParsedOpenAPISpec
): ToolResponse<{ tools: MCPToolSchema[]; summary: { total_tools: number; by_tag: Record<string, number> } }> {
  try {
    if (!parsedSpec || typeof parsedSpec !== 'object') {
      return errorResponse('INVALID_INPUT', 'Invalid parsed spec provided', {});
    }

    if (!parsedSpec.paths || !Array.isArray(parsedSpec.paths)) {
      return errorResponse('INVALID_INPUT', 'Parsed spec must contain paths array', {});
    }

    const tools: MCPToolSchema[] = [];
    const byTag: Record<string, number> = {};

    for (const path of parsedSpec.paths) {
      for (const operation of path.operations) {
        const tool = operationToTool(operation, parsedSpec.schemas || {});
        tools.push(tool);

        // Count by tag
        const tags = operation.tags || ['untagged'];
        for (const tag of tags) {
          byTag[tag] = (byTag[tag] || 0) + 1;
        }
      }
    }

    return successResponse({
      tools,
      summary: {
        total_tools: tools.length,
        by_tag: byTag,
      },
    });
  } catch (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to generate tool schemas', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Convert an OpenAPI operation to an MCP tool definition
 */
function operationToTool(
  operation: ParsedOperation,
  schemas: Record<string, ParsedSchema>
): MCPToolSchema {
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  // Add parameters to input schema
  for (const param of operation.parameters) {
    properties[param.name] = convertSchemaToJSONSchema(param.schema, schemas);

    // Add description if available
    if (param.description) {
      properties[param.name].description = param.description;
    }

    if (param.required) {
      required.push(param.name);
    }
  }

  // Add request body to input schema
  if (operation.request_body) {
    // Prefer JSON content type
    const contentType =
      operation.request_body.content['application/json'] ||
      operation.request_body.content['application/x-www-form-urlencoded'] ||
      Object.values(operation.request_body.content)[0];

    if (contentType?.schema) {
      const bodySchema = convertSchemaToJSONSchema(contentType.schema, schemas);

      // If body is an object, merge its properties
      if (bodySchema.type === 'object' && bodySchema.properties) {
        for (const [key, value] of Object.entries(bodySchema.properties)) {
          // Prefix with body_ if there's a conflict
          const propName = properties[key] ? `body_${key}` : key;
          properties[propName] = value;
        }

        // Add required fields from body
        if (bodySchema.required && operation.request_body.required) {
          for (const reqField of bodySchema.required) {
            const propName = properties[reqField] ? reqField : `body_${reqField}`;
            if (!required.includes(propName)) {
              required.push(propName);
            }
          }
        }
      } else {
        // Add entire body as 'body' parameter
        properties['body'] = bodySchema;
        if (operation.request_body.description) {
          properties['body'].description = operation.request_body.description;
        }
        if (operation.request_body.required) {
          required.push('body');
        }
      }
    }
  }

  // Generate description
  const description = buildToolDescription(operation);

  return {
    name: sanitizeToolName(operation.operation_id),
    description,
    inputSchema: {
      type: 'object',
      properties,
      required,
    },
  };
}

/**
 * Convert ParsedSchema to JSONSchema
 */
function convertSchemaToJSONSchema(
  schema: ParsedSchema,
  allSchemas: Record<string, ParsedSchema>
): JSONSchema {
  // Handle $ref
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    const refSchema = allSchemas[refName];
    if (refSchema) {
      return convertSchemaToJSONSchema(refSchema, allSchemas);
    }
    // If reference not found, return generic object
    return { type: 'object' };
  }

  const jsonSchema: JSONSchema = {};

  if (schema.type) jsonSchema.type = schema.type;
  if (schema.description) jsonSchema.description = schema.description;
  if (schema.format) jsonSchema.format = schema.format;
  if (schema.enum) jsonSchema.enum = schema.enum;
  if (schema.default !== undefined) jsonSchema.default = schema.default;
  if (schema.minimum !== undefined) jsonSchema.minimum = schema.minimum;
  if (schema.maximum !== undefined) jsonSchema.maximum = schema.maximum;
  if (schema.minLength !== undefined) jsonSchema.minLength = schema.minLength;
  if (schema.maxLength !== undefined) jsonSchema.maxLength = schema.maxLength;
  if (schema.pattern) jsonSchema.pattern = schema.pattern;
  if (schema.required) jsonSchema.required = schema.required;

  if (schema.properties) {
    jsonSchema.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      jsonSchema.properties[key] = convertSchemaToJSONSchema(value, allSchemas);
    }
  }

  if (schema.items) {
    jsonSchema.items = convertSchemaToJSONSchema(schema.items, allSchemas);
  }

  if (schema.oneOf) {
    jsonSchema.oneOf = schema.oneOf.map((s) => convertSchemaToJSONSchema(s, allSchemas));
  }

  if (schema.anyOf) {
    jsonSchema.anyOf = schema.anyOf.map((s) => convertSchemaToJSONSchema(s, allSchemas));
  }

  if (schema.allOf) {
    // Merge allOf schemas
    const merged: JSONSchema = { type: 'object', properties: {}, required: [] };
    for (const subSchema of schema.allOf) {
      const converted = convertSchemaToJSONSchema(subSchema, allSchemas);
      if (converted.properties) {
        merged.properties = { ...merged.properties, ...converted.properties };
      }
      if (converted.required) {
        merged.required = [...(merged.required || []), ...converted.required];
      }
    }
    return merged;
  }

  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === 'boolean') {
      jsonSchema.additionalProperties = schema.additionalProperties;
    } else {
      jsonSchema.additionalProperties = convertSchemaToJSONSchema(schema.additionalProperties, allSchemas);
    }
  }

  return jsonSchema;
}

/**
 * Build a description for the tool
 */
function buildToolDescription(operation: ParsedOperation): string {
  const parts: string[] = [];

  if (operation.summary) {
    parts.push(operation.summary);
  }

  if (operation.description && operation.description !== operation.summary) {
    parts.push(operation.description);
  }

  if (operation.deprecated) {
    parts.push('[DEPRECATED]');
  }

  // Add HTTP method info
  parts.push(`[${operation.method}]`);

  return parts.join(' ').trim() || `Execute ${operation.operation_id}`;
}

/**
 * Sanitize tool name to be valid
 */
function sanitizeToolName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 64); // MCP tool names should be reasonably short
}

export { operationToTool, convertSchemaToJSONSchema, sanitizeToolName };
