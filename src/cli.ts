/**
 * Command-line argument parsing
 */
export interface CliArgs {
  transport: 'stdio' | 'http';
  port?: number;
  host?: string;
  help?: boolean;
  version?: boolean;
}

/**
 * Parse command-line arguments
 */
export function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    transport: 'http',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--transport':
      case '-t': {
        const value = args[++i];
        if (value === 'stdio' || value === 'http') {
          result.transport = value;
        } else {
          console.error(`Invalid transport: ${value}. Must be 'stdio' or 'http'.`);
        }
        break;
      }

      case '--stdio': {
        result.transport = 'stdio';
        break;
      }

      case '--port':
      case '-p': {
        const value = parseInt(args[++i], 10);
        if (!isNaN(value) && value > 0 && value < 65536) {
          result.port = value;
        } else {
          console.error('Invalid port number');
        }
        break;
      }

      case '--host':
      case '-H': {
        result.host = args[++i];
        break;
      }

      case '--help':
      case '-h': {
        result.help = true;
        break;
      }

      case '--version':
      case '-v': {
        result.version = true;
        break;
      }

      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
        }
    }
  }

  return result;
}

/**
 * Print help message
 */
export function printHelp(): void {
  console.log(`
openapi-generate - Parse OpenAPI specs and generate MCP tool schemas and scaffolds

USAGE:
  openapi-generate [OPTIONS]

OPTIONS:
  -t, --transport <type>   Transport type: 'http' (default) or 'stdio'
  --stdio                  Use STDIO transport (shorthand for --transport stdio)
  -p, --port <number>      Port for HTTP transport (default: 8080)
  -H, --host <host>        Host for HTTP transport (default: 127.0.0.1)
  -h, --help               Show this help message
  -v, --version            Show version information

ENVIRONMENT VARIABLES:
  MCP_TRANSPORT           Transport type override
  MCP_PORT                Port override
  MCP_HOST                Host override
  MCP_SERVER_NAME         Server name override
  MCP_SERVER_VERSION      Server version override

EXAMPLES:
  # Run with HTTP transport (default)
  openapi-generate

  # Run with HTTP transport on custom port
  openapi-generate --port 3000

  # Run with STDIO transport
  openapi-generate --stdio

  # Using environment variables
  MCP_TRANSPORT=stdio openapi-generate
`);
}

/**
 * Print version information
 */
export function printVersion(version: string): void {
  console.log(`openapi-generate v${version}`);
}
