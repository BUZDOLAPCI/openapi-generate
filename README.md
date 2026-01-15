# openapi-generate

Parse OpenAPI specs and generate MCP tool schemas and scaffolds.

## Overview

This MCP server provides tools to:
1. Parse OpenAPI 3.0 and 3.1 specifications
2. Generate MCP tool definitions from the parsed spec
3. Generate complete MCP server scaffolds in TypeScript or Python

## Installation

```bash
npm install
npm run build
```

## Usage

### Running the Server

#### STDIO Transport (default)

```bash
npm start
```

#### HTTP Transport

```bash
MCP_TRANSPORT=http npm start
# or
npm start -- --transport http --port 8080
```

#### Development Mode

```bash
npm run dev
```

### CLI Options

```
-t, --transport <type>   Transport type: 'stdio' (default) or 'http'
-p, --port <number>      Port for HTTP transport (default: 3000)
-H, --host <host>        Host for HTTP transport (default: 127.0.0.1)
-h, --help               Show help message
-v, --version            Show version information
```

## Tools

### openapi_parse

Parse an OpenAPI spec from URL or JSON string.

**Input:**
- `spec_url_or_json` (string, required): URL to OpenAPI spec or raw JSON string

**Output:**
- Structured representation including:
  - `openapi_version`: The OpenAPI version (3.0.x or 3.1.x)
  - `info`: API title, version, description
  - `servers`: Server URLs and variables
  - `paths`: Parsed paths with operations
  - `schemas`: Component schemas
  - `security_schemes`: Security scheme definitions

**Example:**
```json
{
  "spec_url_or_json": "https://petstore3.swagger.io/api/v3/openapi.json"
}
```

### generate_tool_schemas

Generate MCP tool definitions from a parsed OpenAPI spec.

**Input:**
- `parsed_spec` (object, required): Output from `openapi_parse`

**Output:**
- `tools`: Array of MCP tool definitions
- `summary`: Statistics including total tools and count by tag

**Example:**
```json
{
  "parsed_spec": { /* output from openapi_parse */ }
}
```

### generate_server_scaffold

Generate a complete MCP server scaffold following Dedalus conventions.

**Input:**
- `parsed_spec` (object, required): Output from `openapi_parse`
- `language` (string, required): `"typescript"` or `"python"`
- `options` (object, optional):
  - `server_name`: Name for the generated server
  - `server_version`: Version string
  - `author`: Author name
  - `include_tests`: Whether to include test files (default: true)
  - `base_url`: Base URL for API calls

**Output:**
- `files`: Array of generated files with path and content
- `language`: The target language
- `tool_count`: Number of tools generated

**Example:**
```json
{
  "parsed_spec": { /* output from openapi_parse */ },
  "language": "typescript",
  "options": {
    "server_name": "my-api-server",
    "include_tests": true
  }
}
```

## Response Format

All tools follow the standard Dedalus response envelope:

### Success Response

```json
{
  "ok": true,
  "data": { /* tool-specific output */ },
  "meta": {
    "source": "optional source info",
    "retrieved_at": "2024-01-15T12:00:00.000Z",
    "pagination": { "next_cursor": null },
    "warnings": []
  }
}
```

### Error Response

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Human-readable error message",
    "details": {}
  },
  "meta": {
    "retrieved_at": "2024-01-15T12:00:00.000Z"
  }
}
```

### Error Codes

- `INVALID_INPUT`: Invalid parameters provided
- `UPSTREAM_ERROR`: Failed to fetch remote resource
- `RATE_LIMITED`: Rate limit exceeded
- `TIMEOUT`: Operation timed out
- `PARSE_ERROR`: Failed to parse input
- `INTERNAL_ERROR`: Unexpected internal error

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_TRANSPORT` | Transport type (stdio/http) | stdio |
| `MCP_PORT` | HTTP port | 3000 |
| `MCP_HOST` | HTTP host | 127.0.0.1 |
| `MCP_SERVER_NAME` | Server name | openapi-generate |
| `MCP_SERVER_VERSION` | Server version | 1.0.0 |

## Development

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Type Checking

```bash
npm run typecheck
```

### Building

```bash
npm run build
```

## Generated Scaffold Structure

### TypeScript

```
generated-server/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server setup
│   ├── config.ts         # Configuration
│   ├── types.ts          # Type definitions
│   ├── cli.ts            # CLI argument parsing
│   ├── tools/
│   │   ├── index.ts      # Tool exports
│   │   └── [tool].ts     # Individual tool files
│   └── transport/
│       ├── index.ts
│       ├── stdio.ts
│       └── http.ts
├── tests/
│   ├── unit/
│   │   └── tools.test.ts
│   └── e2e/
│       └── server.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
└── README.md
```

### Python

```
generated-server/
├── src/
│   ├── main.py           # Entry point
│   ├── server.py         # MCP server setup
│   ├── config.py         # Configuration
│   ├── types.py          # Type definitions
│   └── tools/
│       ├── __init__.py
│       └── [tool].py     # Individual tool files
├── tests/
│   ├── __init__.py
│   └── test_tools.py
├── pyproject.toml
├── .env.example
├── .gitignore
└── README.md
```

## License

MIT
