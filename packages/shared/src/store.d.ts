/**
 * Simple file-based JSON store
 * Thread-safe writes with atomic operations
 */
export interface Store<T> {
    load(): T;
    save(data: T): void;
    update(fn: (current: T) => T): T;
}
/**
 * Create a file-based JSON store
 * @param filePath - Path to the JSON file
 * @param defaultValue - Default value if file doesn't exist
 */
export declare function createStore<T>(filePath: string, defaultValue: T): Store<T>;
//# sourceMappingURL=store.d.ts.map