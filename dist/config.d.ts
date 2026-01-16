import type { ServerConfig } from './types.js';
/**
 * Default server configuration
 */
declare const DEFAULT_CONFIG: ServerConfig;
/**
 * Load configuration from environment variables
 */
export declare function loadConfig(): ServerConfig;
/**
 * Validate configuration
 */
export declare function validateConfig(config: ServerConfig): {
    valid: boolean;
    errors: string[];
};
export { DEFAULT_CONFIG };
//# sourceMappingURL=config.d.ts.map