export interface Glyph { id: number; x: number; y: number; width: number; height: number; xoffset: number; yoffset: number; xadvance: number; page: number }
export interface BitmapFont { size: number; lineHeight: number; base: number; width: number; height: number; pages: Map<number, string>; glyphs: Map<number, Glyph> }
const attributes = (tag: string): Record<string, string> => Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
export function parseBitmapFont(xml: string): BitmapFont | null {
  const common = attributes(xml.match(/<common\b[^>]*>/)?.[0] ?? "");
  const info = attributes(xml.match(/<info\b[^>]*>/)?.[0] ?? "");
  const outline = Number(info.outline ?? 0);
  // HPL normalizes glyphs by common.lineHeight plus both outline margins,
  // rather than the BMFont info.size (which may differ from lineHeight).
  const font: BitmapFont = { size: Number(common.lineHeight) + 2 * outline, lineHeight: Number(common.lineHeight), base: Number(common.base), width: Number(common.scaleW), height: Number(common.scaleH), pages: new Map(), glyphs: new Map() };
  if (![font.size, font.lineHeight, font.width, font.height].every(n => n > 0 && Number.isFinite(n))) return null;
  for (const m of xml.matchAll(/<page\b[^>]*>/g)) { const a = attributes(m[0]); if (a.file && !a.file.includes("..") && !/^[\\/]|:/.test(a.file)) font.pages.set(Number(a.id), a.file); }
  for (const m of xml.matchAll(/<char\b[^>]*>/g)) {
    const a = attributes(m[0]), g = Object.fromEntries(["id", "x", "y", "width", "height", "xoffset", "yoffset", "xadvance", "page"].map(k => [k, Number(a[k])])) as unknown as Glyph;
    if (Object.values(g).every(Number.isFinite)) font.glyphs.set(g.id, { ...g, xadvance: g.xadvance + outline });
  }
  return font.pages.size && font.glyphs.size ? font : null;
}
// HPL GetFontLength sums advances. It does not apply BMFont kerning pairs.
export function fontLength(font: BitmapFont, text: string, sizeX: number): number {
  return [...text].reduce((n, c) => n + (font.glyphs.get(c.codePointAt(0)!)?.xadvance ?? 0) * sizeX / font.size, 0);
}
export function wrapText(font: BitmapFont, text: string, sizeX: number, width: number): string[] {
  const rows: string[] = [];
  for (const paragraph of text.replace(/\[br\]/g, "\n").split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/(\s+)/)) {
      if (line && fontLength(font, line + word, sizeX) > width && word.trim()) { rows.push(line.trimEnd()); line = word.trimStart(); }
      else line += word;
    }
    rows.push(line.trimEnd());
  }
  return rows;
}
