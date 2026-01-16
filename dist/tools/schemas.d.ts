import { type ParsedOpenAPISpec, type ParsedOperation, type ParsedSchema, type MCPToolSchema, type JSONSchema, type ToolResponse } from '../types.js';
/**
 * Generate MCP tool definitions from parsed OpenAPI spec
 */
export declare function generateToolSchemas(parsedSpec: ParsedOpenAPISpec): ToolResponse<{
    tools: MCPToolSchema[];
    summary: {
        total_tools: number;
        by_tag: Record<string, number>;
    };
}>;
/**
 * Convert an OpenAPI operation to an MCP tool definition
 */
declare function operationToTool(operation: ParsedOperation, schemas: Record<string, ParsedSchema>): MCPToolSchema;
/**
 * Convert ParsedSchema to JSONSchema
 */
declare function convertSchemaToJSONSchema(schema: ParsedSchema, allSchemas: Record<string, ParsedSchema>): JSONSchema;
/**
 * Sanitize tool name to be valid
 */
declare function sanitizeToolName(name: string): string;
export { operationToTool, convertSchemaToJSONSchema, sanitizeToolName };
//# sourceMappingURL=schemas.d.ts.map