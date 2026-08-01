import type { WidgetNode } from "./nodes";

export type Target = "terminal-on-gui" | "map-on-gui" | "helper-function";

export interface SomaDocument {
  schemaVersion: 4;
  target: Target;
  functionName: string;
  translationCategory: string;
  previewResolution: { x: number; y: number };
  resolutionPreset: string;
  gridSize: number;
  snapToGrid: boolean;
  nodes: WidgetNode[];
}

export interface ResolutionPreset {
  id: string;
  label: string;
  x: number;
  y: number;
}

// Ported verbatim from legacy/app.js:1-18.
export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { id: "1280x720", label: "1280×720 (16:9 HD)", x: 1280, y: 720 },
  { id: "1600x900", label: "1600×900 (16:9)", x: 1600, y: 900 },
  { id: "1920x1080", label: "1920×1080 (16:9 Full HD)", x: 1920, y: 1080 },
  { id: "2560x1440", label: "2560×1440 (16:9 QHD)", x: 2560, y: 1440 },
  { id: "3840x2160", label: "3840×2160 (16:9 4K)", x: 3840, y: 2160 },
  { id: "1280x800", label: "1280×800 (16:10 Steam Deck)", x: 1280, y: 800 },
  { id: "1440x900", label: "1440×900 (16:10)", x: 1440, y: 900 },
  { id: "1680x1050", label: "1680×1050 (16:10)", x: 1680, y: 1050 },
  { id: "1920x1200", label: "1920×1200 (16:10)", x: 1920, y: 1200 },
  { id: "2560x1600", label: "2560×1600 (16:10)", x: 2560, y: 1600 },
  { id: "2560x1080", label: "2560×1080 (21:9 ultrawide)", x: 2560, y: 1080 },
  { id: "3440x1440", label: "3440×1440 (21:9 ultrawide)", x: 3440, y: 1440 },
  { id: "3840x1600", label: "3840×1600 (24:10 ultrawide)", x: 3840, y: 1600 },
  { id: "1024x768", label: "1024×768 (4:3 test)", x: 1024, y: 768 },
  { id: "1280x1024", label: "1280×1024 (5:4 test)", x: 1280, y: 1024 },
  { id: "custom", label: "Custom", x: 0, y: 0 }
];

export function detectPreset(x: number, y: number): string {
  const preset = RESOLUTION_PRESETS.find((c) => c.x === x && c.y === y);
  return preset?.id ?? "custom";
}
