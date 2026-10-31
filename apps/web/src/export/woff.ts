// WOFF (zlib) to a plain sfnt font. fontkit can read WOFF itself, but it inflates each table with a pure JavaScript
// inflater, which took about a second for the Chinese slices. The browser and Node both inflate natively through
// DecompressionStream, so the tables are inflated here and fontkit gets an uncompressed TrueType font to parse.

const u32 = (b: Uint8Array, o: number): number => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u16 = (b: Uint8Array, o: number): number => (b[o] << 8) | b[o + 1];

async function inflate(src: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([src as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** True for a WOFF 1 file ('wOFF'). */
export const isWoff = (b: Uint8Array): boolean => b.length > 44 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x46;

/** The font as an sfnt; the input unchanged when it is not WOFF 1 or DecompressionStream is missing. */
export async function woffToSfnt(woff: Uint8Array): Promise<Uint8Array> {
  if (!isWoff(woff) || typeof DecompressionStream === 'undefined') return woff;
  const flavor = u32(woff, 4);
  const n = u16(woff, 12);
  interface T {
    tag: number;
    checksum: number;
    data: Uint8Array;
  }
  const tables: T[] = await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      const e = 44 + i * 20;
      const offset = u32(woff, e + 4);
      const comp = u32(woff, e + 8);
      const orig = u32(woff, e + 12);
      const raw = woff.subarray(offset, offset + comp);
      return { tag: u32(woff, e), checksum: u32(woff, e + 16), data: comp < orig ? await inflate(raw) : raw };
    }),
  );
  tables.sort((a, b) => a.tag - b.tag);
  const dirEnd = 12 + 16 * n;
  let size = dirEnd;
  for (const t of tables) size += (t.data.length + 3) & ~3;
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, flavor);
  dv.setUint16(4, n);
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log++;
  }
  dv.setUint16(6, pow * 16);
  dv.setUint16(8, log);
  dv.setUint16(10, n * 16 - pow * 16);
  let at = dirEnd;
  tables.forEach((t, i) => {
    const e = 12 + i * 16;
    dv.setUint32(e, t.tag);
    dv.setUint32(e + 4, t.checksum);
    dv.setUint32(e + 8, at);
    dv.setUint32(e + 12, t.data.length);
    out.set(t.data, at);
    at += (t.data.length + 3) & ~3;
  });
  return out;
}
