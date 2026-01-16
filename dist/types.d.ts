import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
/**
 * Standard response envelope for all tools
 */
export interface SuccessResponse<T> {
    ok: true;
    data: T;
    meta: ResponseMeta;
}
export interface ErrorResponse {
    ok: false;
    error: {
        code: ErrorCode;
        message: string;
        details: Record<string, unknown>;
    };
    meta: {
        retrieved_at: string;
    };
}
export type ToolResponse<T> = SuccessResponse<T> | ErrorResponse;
export interface ResponseMeta {
    source?: string;
    retrieved_at: string;
    pagination?: {
        next_cursor: string | null;
    };
    warnings: string[];
}
export type ErrorCode = 'INVALID_INPUT' | 'UPSTREAM_ERROR' | 'RATE_LIMITED' | 'TIMEOUT' | 'PARSE_ERROR' | 'INTERNAL_ERROR';
/**
 * Parsed OpenAPI specification
 */
export interface ParsedOpenAPISpec {
    openapi_version: string;
    info: {
        title: string;
        version: string;
        description?: string;
    };
    servers: ParsedServer[];
    paths: ParsedPath[];
    schemas: Record<string, ParsedSchema>;
    security_schemes: Record<string, ParsedSecurityScheme>;
}
export interface ParsedServer {
    url: string;
    description?: string;
    variables?: Record<string, {
        default: string;
        enum?: string[];
        description?: string;
    }>;
}
export interface ParsedPath {
    path: string;
    operations: ParsedOperation[];
}
export interface ParsedOperation {
    method: string;
    operation_id: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters: ParsedParameter[];
    request_body?: ParsedRequestBody;
    responses: ParsedResponse[];
    security?: ParsedSecurityRequirement[];
    deprecated?: boolean;
}
export interface ParsedParameter {
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    description?: string;
    required: boolean;
    deprecated?: boolean;
    schema: ParsedSchema;
}
export interface ParsedRequestBody {
    description?: string;
    required: boolean;
    content: Record<string, {
        schema: ParsedSchema;
    }>;
}
export interface ParsedResponse {
    status_code: string;
    description: string;
    content?: Record<string, {
        schema: ParsedSchema;
    }>;
    headers?: Record<string, ParsedParameter>;
}
export interface ParsedSchema {
    type?: string;
    format?: string;
    description?: string;
    properties?: Record<string, ParsedSchema>;
    items?: ParsedSchema;
    required?: string[];
    enum?: (string | number | boolean)[];
    default?: unknown;
    nullable?: boolean;
    oneOf?: ParsedSchema[];
    anyOf?: ParsedSchema[];
    allOf?: ParsedSchema[];
    additionalProperties?: boolean | ParsedSchema;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    example?: unknown;
    $ref?: string;
    title?: string;
}
export interface ParsedSecurityScheme {
    type: string;
    description?: string;
    name?: string;
    in?: string;
    scheme?: string;
    bearer_format?: string;
    flows?: Record<string, {
        authorization_url?: string;
        token_url?: string;
        refresh_url?: string;
        scopes: Record<string, string>;
    }>;
    open_id_connect_url?: string;
}
export interface ParsedSecurityRequirement {
    [name: string]: string[];
}
/**
 * MCP Tool Schema
 */
export interface MCPToolSchema {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, JSONSchema>;
        required: string[];
    };
}
export interface JSONSchema {
    type?: string;
    description?: string;
    properties?: Record<string, JSONSchema>;
    items?: JSONSchema;
    required?: string[];
    enum?: (string | number | boolean)[];
    default?: unknown;
    format?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    oneOf?: JSONSchema[];
    anyOf?: JSONSchema[];
    allOf?: JSONSchema[];
    additionalProperties?: boolean | JSONSchema;
}
/**
 * Scaffold generation options
 */
export interface ScaffoldOptions {
    server_name?: string;
    server_version?: string;
    author?: string;
    include_tests?: boolean;
    base_url?: string;
}
export interface GeneratedScaffold {
    files: GeneratedFile[];
    language: 'typescript' | 'python';
    tool_count: number;
}
export interface GeneratedFile {
    path: string;
    content: string;
}
/**
 * Server configuration (HTTP transport only)
 */
export interface ServerConfig {
    name: string;
    version: string;
    port?: number;
    host?: string;
}
/**
 * Type guards
 */
export declare function isOpenAPIV3(spec: unknown): spec is OpenAPIV3.Document;
export declare function isOpenAPIV3_1(spec: unknown): spec is OpenAPIV3_1.Document;
/**
 * Helper to create success response
 */
export declare function successResponse<T>(data: T, meta?: Partial<ResponseMeta>): SuccessResponse<T>;
/**
 * Helper to create error response
 */
export declare function errorResponse(code: ErrorCode, message: string, details?: Record<string, unknown>): ErrorResponse;
/**
 * MCP JSON-RPC request
 */
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: Record<string, unknown>;
}
/**
 * MCP JSON-RPC response
 */
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
//# sourceMappingURL=types.d.ts.map