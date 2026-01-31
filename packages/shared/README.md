# @elio/shared

Shared utilities for Elio OS packages.

## Features

- **Paths**: Standard paths for Elio OS directories
- **Logger**: Structured logging with multiple outputs
- **Store**: Simple JSON file-based key-value store
- **Result**: Type-safe error handling (Result pattern)
- **Env**: Environment helpers

## Usage

```typescript
import {
  paths,
  createLogger,
  createStore,
  ok, err, isOk, match,
  env
} from '@elio/shared';

// Paths
console.log(paths.secrets.google); // /root/.claude/secrets/google-credentials.json
console.log(paths.data.scheduler); // /root/.claude/data/scheduler

// Logger
const logger = createLogger('my-module');
logger.info('Starting...');
logger.error('Failed', { error: 'details' });

// Store
const store = createStore<{ key: string }>('/path/to/store.json');
store.set('key', 'value');
const value = store.get('key');

// Result pattern
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err('Division by zero');
  return ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
  console.log(result.data); // 5
}

// Environment
console.log(env.isDev);  // true/false
console.log(env.isProd); // true/false
```

## API

### Paths

```typescript
paths.root          // /root/.claude
paths.secrets       // Credentials directory
paths.data.dir      // Data directory
paths.logs.dir      // Logs directory
paths.mcpServer     // MCP server directory
```

### Logger

```typescript
createLogger(name: string): Logger
setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void
setJsonOutput(enabled: boolean): void
setFileLogging(enabled: boolean): void
```

### Result

```typescript
ok<T>(data: T): Ok<T>
err<E>(error: E, options?): Err<E>
isOk<T, E>(result: Result<T, E>): result is Ok<T>
isErr<T, E>(result: Result<T, E>): result is Err<E>
match<T, E, R>(result, { ok, err }): R
unwrap<T, E>(result: Result<T, E>): T
unwrapOr<T, E>(result: Result<T, E>, default: T): T
map<T, E, U>(result, fn): Result<U, E>
andThen<T, E, U>(result, fn): Result<U, E>
tryCatch<T, E>(fn, mapError?): Result<T, E>
tryCatchAsync<T, E>(fn, mapError?): Promise<Result<T, E>>
all<T, E>(results: Result<T, E>[]): Result<T[], E>
```
