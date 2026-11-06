// Makes the Vite alias "@ali/core/..." (packages/core/src) work under plain Node, so node:test can run the same
// source files the app bundles. Loaded with: node --import ./scripts/alias.mjs --test ...
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const aliases = [
  ['@ali/core/', pathToFileURL(root + 'packages/core/src/').href],
  ['@ali/catalog/', pathToFileURL(root + 'packages/core/catalog/').href],
  ['@ali/bd-brief/', pathToFileURL(root + 'packages/bd-brief/src/').href],
];

registerHooks({
  resolve(specifier, context, nextResolve) {
    for (const [prefix, target] of aliases) {
      if (specifier.startsWith(prefix)) return nextResolve(target + specifier.slice(prefix.length), context);
    }
    return nextResolve(specifier, context);
  },
});
