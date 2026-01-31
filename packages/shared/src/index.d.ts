/**
 * Shared utilities and paths for Elio OS
 */
export { createLogger, logger, setLevel, setJsonOutput, setFileLogging, type Logger, type LogLevel, } from './logger.js';
export { createStore, type Store } from './store.js';
/**
 * Root directory for Elio OS
 */
export declare const ELIO_ROOT: string;
/**
 * Standard paths in Elio OS
 */
export declare const paths: {
    /** Root directory */
    readonly root: string;
    /** Base directory (alias for root) */
    readonly base: string;
    /** Skills directory */
    readonly skills: string;
    /** Workflows directory */
    readonly workflows: string;
    /** Agents directory */
    readonly agents: string;
    /** Context directory */
    readonly context: string;
    /** Secrets directory */
    readonly secrets: string;
    /** Credentials paths */
    readonly credentials: {
        /** Base credentials directory */
        readonly dir: string;
        /** Google OAuth credentials */
        readonly google: string;
        /** Google OAuth token */
        readonly googleToken: string;
        /** Perplexity API key file */
        readonly perplexity: string;
        /** Supabase credentials */
        readonly supabase: string;
    };
    /** Data paths */
    readonly data: {
        /** Base data directory */
        readonly dir: string;
        /** NotebookLM sources */
        readonly notebooklmSources: string;
        /** Scheduler data */
        readonly scheduler: string;
        /** GTD data */
        readonly gtd: string;
        /** Headless data */
        readonly headless: string;
        /** Context graph data */
        readonly contextGraph: string;
        /** Self improvement data */
        readonly selfImprovement: string;
    };
    /** Log paths */
    readonly logs: {
        /** Base logs directory */
        readonly dir: string;
        /** Scheduler logs */
        readonly scheduler: string;
        /** Daily logs */
        readonly daily: string;
        /** Team logs */
        readonly team: string;
    };
    /** MCP server directory */
    readonly mcpServer: string;
    /** Packages directory */
    readonly packages: string;
    /** Apps directory */
    readonly apps: string;
    /** Config directory */
    readonly config: string;
    /** Core directory */
    readonly core: string;
    /** CLAUDE.md file */
    readonly claudeMd: string;
    /** Team directory */
    readonly team: string;
};
/**
 * Get path relative to Elio root
 */
export declare function elioPath(...segments: string[]): string;
/**
 * Environment helpers
 */
export declare const env: {
    isDev: boolean;
    isProd: boolean;
    isTest: boolean;
    nodeEnv: string;
};
//# sourceMappingURL=index.d.ts.map