export interface CanvasSize { x: number; y: number }
export type CanvasZoom = "fit" | number;
export const CANVAS_PADDING = 32;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function clampZoom(zoom: number): number {
  return Number.isFinite(zoom) ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) : 1;
}

/** Fit uses both available dimensions; a numeric zoom is a uniform pixel scale. */
export function canvasScale(size: CanvasSize, viewport: CanvasSize, zoom: CanvasZoom = "fit"): number {
  if (zoom !== "fit") return clampZoom(zoom);
  return Math.max(0.001, Math.min(1,
    Math.max(1, viewport.x - CANVAS_PADDING * 2) / Math.max(1, size.x),
    Math.max(1, viewport.y - CANVAS_PADDING * 2) / Math.max(1, size.y)));
}

export function canvasPlacement(size: CanvasSize, viewport: CanvasSize, scale: number) {
  const width = size.x * scale, height = size.y * scale;
  return {
    width, height,
    left: Math.max(CANVAS_PADDING, (viewport.x - width) / 2),
    top: Math.max(CANVAS_PADDING, (viewport.y - height) / 2),
    spaceWidth: Math.max(viewport.x, width + CANVAS_PADDING * 2),
    spaceHeight: Math.max(viewport.y, height + CANVAS_PADDING * 2)
  };
}
