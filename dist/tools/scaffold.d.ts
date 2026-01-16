import { type ParsedOpenAPISpec, type ScaffoldOptions, type GeneratedScaffold, type GeneratedFile, type ToolResponse } from '../types.js';
/**
 * Generate a complete MCP server scaffold from parsed OpenAPI spec
 */
export declare function generateServerScaffold(parsedSpec: ParsedOpenAPISpec, language: 'typescript' | 'python', options?: ScaffoldOptions): ToolResponse<GeneratedScaffold>;
interface ScaffoldConfig {
    serverName: string;
    serverVersion: string;
    author: string;
    baseUrl: string;
    includeTests: boolean;
}
/**
 * Generate TypeScript scaffold files
 */
declare function generateTypeScriptScaffold(spec: ParsedOpenAPISpec, tools: {
    name: string;
    description: string;
    inputSchema: object;
}[], config: ScaffoldConfig): GeneratedFile[];
/**
 * Generate Python scaffold files
 */
declare function generatePythonScaffold(spec: ParsedOpenAPISpec, tools: {
    name: string;
    description: string;
    inputSchema: object;
}[], config: ScaffoldConfig): GeneratedFile[];
export { generateTypeScriptScaffold, generatePythonScaffold };
//# sourceMappingURL=scaffold.d.ts.map