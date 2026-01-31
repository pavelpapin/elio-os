/**
 * Architecture utilities — helper functions for dependency analysis
 */

export function normalize(filePath: string): string {
  return filePath.replace(/\.ts$/, '').replace(/\/index$/, '');
}

export function resolveImport(fromFile: string, importPath: string): string {
  const dir = fromFile.replace(/\/[^/]+$/, '');
  const parts = [...dir.split('/'), ...importPath.split('/')];
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === '.') continue;
    if (p === '..') { resolved.pop(); continue; }
    resolved.push(p);
  }
  return normalize(resolved.join('/').replace(/\.js$/, ''));
}

export function detectCycle(
  node: string,
  graph: Map<string, string[]>,
  visited: Set<string>,
  path: string[],
  cycles: Array<{ cycle: string[] }>,
) {
  if (path.includes(node)) {
    const cycleStart = path.indexOf(node);
    cycles.push({ cycle: [...path.slice(cycleStart), node] });
    return;
  }
  if (visited.has(node)) return;

  path.push(node);
  for (const dep of graph.get(node) ?? []) {
    detectCycle(dep, graph, visited, path, cycles);
  }
  path.pop();
  visited.add(node);
}
