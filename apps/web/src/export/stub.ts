// A pdfkit stand-in for the first (dry) pass: it keeps page sizes and swallows every drawing call, so the layout code
// runs unchanged and the font set learns which glyphs the document needs.
import type PDFDocument from 'pdfkit';

export function createStubDoc(): PDFDocument {
  const pages: Array<[number, number]> = [];
  const base: Record<string | symbol, unknown> = {
    page: { width: 0, height: 0, margins: { top: 0, bottom: 0, left: 0, right: 0 } },
    outline: { addItem: () => undefined },
    bufferedPageRange: () => ({ start: 0, count: pages.length }),
  };
  const show = (n: number): void => {
    const p = base.page as { width: number; height: number };
    p.width = pages[n][0];
    p.height = pages[n][1];
  };
  const proxy: unknown = new Proxy(base, {
    get(target, key) {
      if (key === 'addPage') {
        return (o: { size: [number, number] }) => {
          pages.push([o.size[0], o.size[1]]);
          show(pages.length - 1);
          return proxy;
        };
      }
      if (key === 'switchToPage') {
        return (n: number) => {
          show(n);
          return proxy;
        };
      }
      if (key in target) return target[key];
      return () => proxy;
    },
  });
  return proxy as PDFDocument;
}
