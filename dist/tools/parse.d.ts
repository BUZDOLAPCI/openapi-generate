import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { type ParsedOpenAPISpec, type ParsedSchema, type ToolResponse } from '../types.js';
type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject;
/**
 * Parse an OpenAPI specification from URL or JSON string
 */
export declare function openapiParse(specUrlOrJson: string): Promise<ToolResponse<ParsedOpenAPISpec>>;
/**
 * Generate an operation ID from method and path
 */
declare function generateOperationId(method: string, path: string): string;
/**
 * Parse a single schema
 */
declare function parseSchema(schema: SchemaObject | ReferenceObject): ParsedSchema;
export { generateOperationId, parseSchema };
//# sourceMappingURL=parse.d.ts.map