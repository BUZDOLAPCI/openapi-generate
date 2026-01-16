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
export declare function parseArgs(args: string[]): CliArgs;
/**
 * Print help message
 */
export declare function printHelp(): void;
/**
 * Print version information
 */
export declare function printVersion(version: string): void;
//# sourceMappingURL=cli.d.ts.map