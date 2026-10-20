import type { DecodedImage } from "./decodeTga";

/** Decode top mip of legacy DDS (A8, masked RGB/RGBA, BC1/2/3). No GPU extension required. */
export function decodeDds(bytes: Uint8Array): DecodedImage | null {
  if (bytes.length < 128) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getUint32(0, true) !== 0x20534444 || v.getUint32(4, true) !== 124 || v.getUint32(76, true) !== 32) return null;
  const height = v.getUint32(12, true), width = v.getUint32(16, true), flags = v.getUint32(80, true), bits = v.getUint32(88, true);
  if (!width || !height || width > 8192 || height > 8192 || width * height > 32e6) return null;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const fourCC = String.fromCharCode(...bytes.subarray(84, 88));
  if (flags & 4) {
    if (!["DXT1", "DXT3", "DXT5"].includes(fourCC)) return null;
    const blockSize = fourCC === "DXT1" ? 8 : 16;
    const bw = Math.ceil(width / 4), bh = Math.ceil(height / 4);
    if (128 + bw * bh * blockSize > bytes.length) return null;
    const rgb565 = (n: number): number[] => [Math.round(((n >> 11) & 31) * 255 / 31), Math.round(((n >> 5) & 63) * 255 / 63), Math.round((n & 31) * 255 / 31), 255];
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      const offset = 128 + (by * bw + bx) * blockSize, c = offset + (blockSize === 16 ? 8 : 0);
      const c0 = v.getUint16(c, true), c1 = v.getUint16(c + 2, true), colors = [rgb565(c0), rgb565(c1)];
      if (c0 > c1 || fourCC !== "DXT1") {
        colors.push(colors[0].map((n, k) => k === 3 ? 255 : Math.floor((2 * n + colors[1][k]) / 3)));
        colors.push(colors[0].map((n, k) => k === 3 ? 255 : Math.floor((n + 2 * colors[1][k]) / 3)));
      } else { colors.push(colors[0].map((n, k) => k === 3 ? 255 : Math.floor((n + colors[1][k]) / 2))); colors.push([0, 0, 0, 0]); }
      const indices = v.getUint32(c + 4, true), alpha = [bytes[offset], bytes[offset + 1]];
      if (fourCC === "DXT5") {
        if (alpha[0] > alpha[1]) for (let j = 1; j <= 6; j++) alpha.push(Math.floor(((7 - j) * alpha[0] + j * alpha[1]) / 7));
        else { for (let j = 1; j <= 4; j++) alpha.push(Math.floor(((5 - j) * alpha[0] + j * alpha[1]) / 5)); alpha.push(0, 255); }
      }
      for (let j = 0; j < 16; j++) {
        const x = bx * 4 + j % 4, y = by * 4 + (j >> 2); if (x >= width || y >= height) continue;
        const pixel = [...colors[(indices >>> (j * 2)) & 3]];
        if (fourCC === "DXT3") pixel[3] = ((bytes[offset + (j >> 1)] >> ((j & 1) * 4)) & 15) * 17;
        if (fourCC === "DXT5") {
          const bit = j * 3, byte = offset + 2 + (bit >> 3);
          pixel[3] = alpha[((bytes[byte] | ((bytes[byte + 1] ?? 0) << 8)) >> (bit & 7)) & 7];
        }
        rgba.set(pixel, (y * width + x) * 4);
      }
    }
  } else {
    if (![8, 16, 24, 32].includes(bits)) return null;
    const bpp = bits / 8, stride = (v.getUint32(8, true) & 8) ? v.getUint32(20, true) : width * bpp;
    if (stride < width * bpp || bytes.length < 128 + stride * height) return null;
    const masks = [92, 96, 100, 104].map(o => v.getUint32(o, true));
    const channel = (n: number, mask: number, fallback: number) => {
      if (!mask) return fallback;
      let shift = 0; while (((mask >>> shift) & 1) === 0 && shift < 32) shift++;
      return Math.round(((n & mask) >>> shift) * 255 / (mask >>> shift));
    };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const o = 128 + y * stride + x * bpp;
      if (flags === 2 || ((flags & 2) && !(flags & 64))) rgba.set([255, 255, 255, bytes[o]], (y * width + x) * 4);
      else {
        let n = 0; for (let k = 0; k < bpp; k++) n = (n | bytes[o + k] << (k * 8)) >>> 0;
        rgba.set(masks.map((m, k) => channel(n, m, k === 3 ? 255 : 0)), (y * width + x) * 4);
      }
    }
  }
  return { width, height, rgba };
}
