// Whether an import specifier is a Node built-in module, from the running Node's own list (node:module builtinModules),
// not a hand-kept one: a list that omits a module (dns, readline, worker_threads, vm, ...) lets a Worker-breaking import
// through scripts/check-bundle.ts. The Worker runs without nodejs_compat, so none may reach the bundle.
import { builtinModules } from 'node:module';

const NAMES: ReadonlySet<string> = new Set(builtinModules);

/** node:anything, a built-in by name (fs, dns, worker_threads), or a subpath of one (fs/promises, stream/web). */
export function isNodeBuiltin(specifier: string): boolean {
  if (specifier.startsWith('node:')) return true;
  if (NAMES.has(specifier)) return true;
  const slash = specifier.indexOf('/');
  return slash > 0 && NAMES.has(specifier.slice(0, slash));
}
