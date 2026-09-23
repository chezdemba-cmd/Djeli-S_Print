function u16be(bytes: Uint8Array, offset: number) { return (bytes[offset]! << 8) | bytes[offset + 1]!; }
function u24le(bytes: Uint8Array, offset: number) { return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16); }
function u32be(bytes: Uint8Array, offset: number) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false); }

export function readImageDimensions(bytes: Uint8Array, mime: string): { width: number; height: number } | null {
  if (mime === "image/png" && bytes.length >= 24) return { width: u32be(bytes, 16), height: u32be(bytes, 20) };
  if (mime === "image/webp" && bytes.length >= 30) {
    const kind = String.fromCharCode(...bytes.slice(12, 16));
    if (kind === "VP8X") return { width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
    if (kind === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { width: u16be(Uint8Array.of(bytes[27]!, bytes[26]!), 0) & 0x3fff, height: u16be(Uint8Array.of(bytes[29]!, bytes[28]!), 0) & 0x3fff };
    }
    if (kind === "VP8L" && bytes[20] === 0x2f) {
      const bits = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
  }
  if (mime === "image/jpeg" && bytes.length >= 4) {
    let offset = 2;
    const sof = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1]!;
      if (sof.has(marker)) return { height: u16be(bytes, offset + 5), width: u16be(bytes, offset + 7) };
      const length = u16be(bytes, offset + 2);
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return null;
}
