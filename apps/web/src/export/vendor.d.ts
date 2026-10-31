// Minimal types for the three untyped PDF libraries, covering only what src/export uses.
declare module 'fontkit' {
  export interface Glyph {
    id: number;
  }
  export interface GlyphRun {
    advanceWidth: number;
    glyphs: Glyph[];
  }
  export interface Font {
    unitsPerEm: number;
    ascent: number;
    descent: number;
    capHeight: number;
    xHeight: number;
    layout(text: string, features?: Record<string, boolean>): GlyphRun;
    hasGlyphForCodePoint(cp: number): boolean;
  }
  export function create(data: Uint8Array, postscriptName?: string): Font;
}

declare module 'pdfkit' {
  import type { Font } from 'fontkit';
  export interface PDFOptions {
    size?: string | [number, number];
    layout?: 'portrait' | 'landscape';
    margin?: number;
    margins?: { top: number; bottom: number; left: number; right: number };
    bufferPages?: boolean;
    autoFirstPage?: boolean;
    compress?: boolean;
    font?: string | null;
    lang?: string;
    displayTitle?: boolean;
    info?: Record<string, string | Date>;
    pdfVersion?: string;
  }
  export default class PDFDocument {
    constructor(options?: PDFOptions);
    page: { width: number; height: number; margins: { top: number; bottom: number; left: number; right: number } };
    readonly bufferedPageRange: () => { start: number; count: number };
    on(event: 'data', cb: (chunk: Uint8Array) => void): this;
    on(event: 'end', cb: () => void): this;
    on(event: 'error', cb: (e: Error) => void): this;
    addPage(options?: PDFOptions): this;
    switchToPage(n: number): this;
    flushPages(): void;
    end(): void;
    registerFont(name: string, src: Uint8Array | ArrayBuffer | Font, family?: string): this;
    font(name: string, size?: number): this;
    fontSize(n: number): this;
    fillColor(c: string, opacity?: number): this;
    strokeColor(c: string, opacity?: number): this;
    fillOpacity(n: number): this;
    lineWidth(n: number): this;
    dash(length: number, opts?: { space?: number }): this;
    undash(): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    rect(x: number, y: number, w: number, h: number): this;
    circle(x: number, y: number, r: number): this;
    roundedRect(x: number, y: number, w: number, h: number, r: number): this;
    fill(color?: string): this;
    stroke(color?: string): this;
    fillAndStroke(fill?: string, stroke?: string): this;
    save(): this;
    restore(): this;
    translate(x: number, y: number): this;
    scale(x: number, y?: number): this;
    text(text: string, x: number, y: number, options?: { baseline?: string; lineBreak?: boolean; width?: number; underline?: boolean; link?: string; continued?: boolean; characterSpacing?: number }): this;
    widthOfString(text: string): number;
    link(x: number, y: number, w: number, h: number, url: string): this;
    image(src: Uint8Array | ArrayBuffer | string, x?: number, y?: number, options?: { width?: number; height?: number; fit?: [number, number] }): this;
    outline: { addItem(title: string, options?: { expanded?: boolean }): unknown };
  }
}

declare module 'svg-to-pdfkit' {
  import type PDFDocument from 'pdfkit';
  export interface SvgToPdfOptions {
    width?: number;
    height?: number;
    preserveAspectRatio?: string;
    assumePt?: boolean;
    fontCallback?: (family: string, bold: boolean, italic: boolean, fontOptions: unknown) => string | undefined;
    warningCallback?: (message: string) => void;
    precision?: number;
  }
  export default function SVGtoPDF(doc: PDFDocument, svg: string, x: number, y: number, options?: SvgToPdfOptions): void;
}
