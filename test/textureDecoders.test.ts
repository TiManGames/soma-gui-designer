import { describe, expect, it } from "vitest";
import { decodeDds } from "../src/ui/gfx/decodeDds";
import { decodeTga } from "../src/ui/gfx/decodeTga";

function dds(width: number, height: number, flags: number, bits: number, payload: number[], format = ""): Uint8Array {
  const bytes = new Uint8Array(128 + payload.length), v = new DataView(bytes.buffer);
  v.setUint32(0, 0x20534444, true); v.setUint32(4, 124, true); v.setUint32(12, height, true); v.setUint32(16, width, true); v.setUint32(76, 32, true); v.setUint32(80, flags, true); v.setUint32(88, bits, true);
  [...format].forEach((c, i) => bytes[84 + i] = c.charCodeAt(0)); bytes.set(payload, 128); return bytes;
}
describe("DDS", () => {
  it("expands alpha-only font atlases to white RGB", () => expect(Array.from(decodeDds(dds(2, 1, 2, 8, [0, 191]))!.rgba)).toEqual([255, 255, 255, 0, 255, 255, 255, 191]));
  it("retains black semitransparent pixels in masked RGBA", () => {
    const b = dds(1, 1, 65, 32, [0, 0, 0, 191]), v = new DataView(b.buffer);
    [0xff0000, 0xff00, 0xff, 0xff000000].forEach((m, i) => v.setUint32(92 + i * 4, m, true));
    expect(Array.from(decodeDds(b)!.rgba)).toEqual([0, 0, 0, 191]);
  });
  it("decodes BC1 transparent indices and opaque endpoint colors", () => {
    const b = dds(4, 4, 4, 0, [0, 0, 255, 255, 3, 0, 0, 0], "DXT1");
    const rgba = decodeDds(b)!.rgba; expect(Array.from(rgba.slice(0, 4))).toEqual([0, 0, 0, 0]); expect(Array.from(rgba.slice(4, 8))).toEqual([0, 0, 0, 255]);
  });
  it("decodes BC2 explicit alpha and BC3 interpolated alpha", () => {
    const color = [255, 255, 0, 0, 0, 0, 0, 0];
    expect(decodeDds(dds(4, 4, 4, 0, [0x1f, ...Array(7).fill(0), ...color], "DXT3"))!.rgba[7]).toBe(17);
    expect(decodeDds(dds(4, 4, 4, 0, [255, 0, 2, 0, 0, 0, 0, 0, ...color], "DXT5"))!.rgba[3]).toBe(218);
  });
  it("rejects truncated, unsupported, and oversized data", () => {
    expect(decodeDds(new Uint8Array(127))).toBeNull();
    expect(decodeDds(dds(4, 4, 4, 0, [0], "DXT1"))).toBeNull();
    expect(decodeDds(dds(99999, 1, 2, 8, [0]))).toBeNull();
  });
});
describe("TGA", () => {
  it("honors both origin bits without changing alpha", () => {
    const b = new Uint8Array(18 + 16); b[2] = 2; b[12] = 2; b[14] = 2; b[16] = 32; b[17] = 0x38;
    b.set([0, 0, 1, 191, 0, 0, 2, 0, 0, 0, 3, 255, 0, 0, 4, 255], 18);
    expect(Array.from(decodeTga(b)!.rgba)).toEqual([2, 0, 0, 0, 1, 0, 0, 191, 4, 0, 0, 255, 3, 0, 0, 255]);
  });
  it("rejects RLE packets exceeding the declared image", () => {
    const b = new Uint8Array(23); b[2] = 10; b[12] = b[14] = 1; b[16] = 32; b[18] = 0x81;
    expect(decodeTga(b)).toBeNull();
  });
});
