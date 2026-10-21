import { create } from "zustand";
import { canvasScale, clampZoom, type CanvasSize, type CanvasZoom } from "@core/model/canvasScale";

interface ViewportState {
  size: CanvasSize;
  available: CanvasSize;
  zoom: CanvasZoom;
  scale: number;
  setSize: (size: CanvasSize, available: CanvasSize) => void;
  setZoom: (zoom: CanvasZoom) => void;
}

/** Shared by rendering and drag math. Never saved into the document or its history. */
export const useViewport = create<ViewportState>((set) => ({
  size: { x: 1024, y: 768 }, available: { x: 1024, y: 768 }, zoom: "fit", scale: 1,
  setSize: (size, available) => set(s => {
    if (s.size.x === size.x && s.size.y === size.y && s.available.x === available.x && s.available.y === available.y) return s;
    return { size, available, scale: canvasScale(size, available, s.zoom) };
  }),
  setZoom: value => set(s => {
    const zoom = value === "fit" ? value : clampZoom(value);
    return { zoom, scale: canvasScale(s.size, s.available, zoom) };
  })
}));
