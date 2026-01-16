import type { ServerConfig } from './types.js';

/**
 * Default server configuration
 */
const DEFAULT_CONFIG: ServerConfig = {
  name: 'openapi-generate',
  version: '1.0.0',
  transport: 'http',
  port: 8080,
  host: '127.0.0.1',
};

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  const transport = (process.env.MCP_TRANSPORT as 'stdio' | 'http') || DEFAULT_CONFIG.transport;

  return {
    name: process.env.MCP_SERVER_NAME || DEFAULT_CONFIG.name,
    version: process.env.MCP_SERVER_VERSION || DEFAULT_CONFIG.version,
    transport,
    port: process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : DEFAULT_CONFIG.port,
    host: process.env.MCP_HOST || DEFAULT_CONFIG.host,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: ServerConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('Server name is required');
  }

  if (!config.version || config.version.trim() === '') {
    errors.push('Server version is required');
  }

  if (!['stdio', 'http'].includes(config.transport)) {
    errors.push('Transport must be either "stdio" or "http"');
  }

  if (config.transport === 'http') {
    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push('Port must be a valid number between 1 and 65535');
    }

    if (!config.host || config.host.trim() === '') {
      errors.push('Host is required for HTTP transport');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export { DEFAULT_CONFIG };
