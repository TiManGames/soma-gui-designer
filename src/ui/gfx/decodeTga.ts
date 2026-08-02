// Minimal pure-JS TGA decoder → RGBA. Browsers can't render TGA natively, so we
// decode the bytes the host sends and paint them onto a <canvas> to obtain a
// data URL usable in an <img>. Supports the formats SOMA ships: uncompressed and
// RLE-compressed true-color (24/32-bit) and grayscale (8-bit), honoring the
// image-origin (top/bottom) bit in the descriptor.

export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major, top-left origin. */
  rgba: Uint8ClampedArray;
}

/** Decode raw TGA bytes to top-left-origin RGBA. Returns null on unsupported input. */
export function decodeTga(bytes: Uint8Array): DecodedImage | null {
  if (bytes.length < 18) return null;

  const idLength = bytes[0];
  const colorMapType = bytes[1];
  const imageType = bytes[2];

  const width = bytes[12] | (bytes[13] << 8);
  const height = bytes[14] | (bytes[15] << 8);
  const pixelDepth = bytes[16];
  const descriptor = bytes[17];

  if (width <= 0 || height <= 0) return null;
  if (colorMapType !== 0) return null; // color-mapped images not needed for SOMA gfx

  const bytesPerPixel = pixelDepth >> 3;
  if (![1, 3, 4].includes(bytesPerPixel)) return null;

  // Supported image types: 2 = uncompressed true-color, 3 = uncompressed grayscale,
  // 10 = RLE true-color, 11 = RLE grayscale.
  const isRle = imageType === 10 || imageType === 11;
  const isTrueColor = imageType === 2 || imageType === 10;
  const isGray = imageType === 3 || imageType === 11;
  if (!isTrueColor && !isGray) return null;

  let offset = 18 + idLength; // skip header + image ID (color map absent)
  const pixelCount = width * height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  // Read source pixels (in TGA BGRA order) into a flat RGBA buffer, bottom-origin
  // ordering handled afterward.
  const src = new Uint8ClampedArray(pixelCount * 4);

  const readPixel = (i: number, p: number): void => {
    // p = source byte offset of this pixel's channels.
    if (bytesPerPixel === 1) {
      const g = bytes[p];
      src[i] = g;
      src[i + 1] = g;
      src[i + 2] = g;
      src[i + 3] = 255;
    } else {
      // BGR(A)
      src[i] = bytes[p + 2];
      src[i + 1] = bytes[p + 1];
      src[i + 2] = bytes[p];
      src[i + 3] = bytesPerPixel === 4 ? bytes[p + 3] : 255;
    }
  };

  if (!isRle) {
    for (let i = 0; i < pixelCount; i++) {
      if (offset + bytesPerPixel > bytes.length) return null;
      readPixel(i * 4, offset);
      offset += bytesPerPixel;
    }
  } else {
    let i = 0;
    while (i < pixelCount) {
      if (offset >= bytes.length) return null;
      const packet = bytes[offset++];
      const count = (packet & 0x7f) + 1;
      if (packet & 0x80) {
        // RLE packet: one pixel repeated `count` times.
        if (offset + bytesPerPixel > bytes.length) return null;
        for (let c = 0; c < count && i < pixelCount; c++, i++) {
          readPixel(i * 4, offset);
        }
        offset += bytesPerPixel;
      } else {
        // Raw packet: `count` literal pixels.
        for (let c = 0; c < count && i < pixelCount; c++, i++) {
          if (offset + bytesPerPixel > bytes.length) return null;
          readPixel(i * 4, offset);
          offset += bytesPerPixel;
        }
      }
    }
  }

  // Bit 5 of the descriptor: 0 = origin bottom-left (flip rows), 1 = top-left.
  const topOrigin = (descriptor & 0x20) !== 0;
  if (topOrigin) {
    rgba.set(src);
  } else {
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * rowBytes;
      rgba.set(src.subarray(srcRow, srcRow + rowBytes), y * rowBytes);
    }
  }

  return { width, height, rgba };
}

/** Decode TGA bytes and rasterize to a PNG data URL via an offscreen canvas. */
export function tgaToDataUrl(bytes: Uint8Array): { url: string; w: number; h: number } | null {
  const img = decodeTga(bytes);
  if (!img) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const imageData = ctx.createImageData(img.width, img.height);
  imageData.data.set(img.rgba);
  ctx.putImageData(imageData, 0, 0);
  return { url: canvas.toDataURL("image/png"), w: img.width, h: img.height };
}
