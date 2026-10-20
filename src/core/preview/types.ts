import type { Rect } from "../model/geometry";

export type Color = [number, number, number, number];
export const WHITE: Color = [1, 1, 1, 1];
export const CLEAR: Color = [0, 0, 0, 0];
export type Material = "Alpha" | "Additive" | "Diffuse" | "FontNormal" | "Modulative" | "PremulAlpha";
export interface TextureInfo { width: number; height: number }
export interface Quad {
  rect: Rect;
  z: number;
  texture: string;
  color: Color;
  corners: [Color, Color, Color, Color]; // TL, TR, BR, BL
  uv: [number, number, number, number];
  material: Material;
  wrap: "Repeat" | "Mirror" | "Clamp";
  clip?: Rect;
  nodeId: string;
}
export interface PreviewState {
  focused?: boolean;
  pressed?: boolean;
  checked?: boolean;
  disabled?: boolean;
  value?: number;
  selectedItem?: number;
  scroll?: number;
  time?: number;
  input?: string;
}
export interface Scene {
  quads: Quad[];
  rects: Map<string, Rect>;
  frames: Map<string, Rect>;
  diagnostics: string[];
}
export const mul = (a: Color, b: Color): Color => a.map((v, i) => v * b[i]) as Color;
export function intersect(a: Rect, b?: Rect): Rect {
  if (!b) return a;
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) };
}
