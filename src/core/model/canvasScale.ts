export const MAX_CANVAS_WIDTH = 980;

/** The preview always uses one uniform, non-upscaling transform. */
export function canvasScale(size: { x: number; y: number }): number {
  return Math.min(1, MAX_CANVAS_WIDTH / Math.max(1, size.x));
}

export function scaledCanvasSize(size: { x: number; y: number }): { x: number; y: number } {
  const scale = canvasScale(size);
  return { x: size.x * scale, y: size.y * scale };
}
