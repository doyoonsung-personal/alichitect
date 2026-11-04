// Bundle the same browser-safe PDF engine for the Worker. Reuse fonts already emitted by the web build.
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const path = relative => fileURLToPath(new URL(relative, import.meta.url));
const fonts = {};
for (const file of await readdir(path('../../dist/assets/'))) {
  const name = /^(noto-sans-(?:kr|sc)-.+-normal)-[\w-]+\.woff$/.exec(file);
  if (name) fonts[name[1]] = '/assets/' + file;
}
if (!fonts['noto-sans-kr-latin-400-normal'] || !fonts['noto-sans-sc-latin-700-normal']) throw Error('Build the web fonts first');
await build({
  configFile: false, publicDir: false,
  // PDFKit resolves an inlined ICC data URL against import.meta.url. workerd's module name is not a URL.
  plugins: [{ name: 'worker-module-url', renderChunk(code) {
    return code.replaceAll('import.meta.url', '"https://pdf.invalid/"');
  } }],
  resolve: { alias: { '@ali/core': path('../../../../packages/core/src'), '@ali/catalog': path('../../../../packages/core/catalog') } },
  define: { __AB_TOOLS__: false, __PDF_FONT_PATHS__: JSON.stringify(fonts), 'process.env.NODE_ENV': '"production"' },
  build: { target: 'es2022', minify: true, outDir: path('../../../worker/build/pdf'), emptyOutDir: true,
    lib: { entry: path('../../src/export/worker.ts'), formats: ['es'], fileName: () => 'renderer.js' } },
});
