import type { SVGProps } from "react";
import type { WidgetType } from "@core/model/nodes";

const paths = {
  undo: "M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12",
  redo: "m15 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12",
  plus: "M12 5v14M5 12h14", minus: "M5 12h14", close: "m6 6 12 12M18 6 6 18",
  down: "m6 9 6 6 6-6", right: "m9 6 6 6-6 6",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  settings: "m9 3 6 0 1 3 3 1 2 5-2 2-1 3-5 2-2-2-3-1-2-5 2-2 1-3 3-1Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  focus: "M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6",
  left: "M3 4h18v16H3ZM9 4v16", rightPanel: "M3 4h18v16H3ZM15 4v16",
  copy: "M9 9h12v12H9ZM5 15H3V3h12v2", trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
  star: "m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  eyeOff: "m3 3 18 18M9 5a14 14 0 0 1 3 0c6 0 10 7 10 7a21 21 0 0 1-4 4M6 6a23 23 0 0 0-4 6s4 7 10 7a15 15 0 0 0 5-1",
  lock: "M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8 0v3m-4 5v2",
  unlock: "M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8 0m-4 8v2",
  window: "M3 4h18v16H3ZM3 8h18M6 6h1", group: "M3 8V3h5m8 0h5v5m0 8v5h-5M8 21H3v-5",
  text: "M4 5h16M12 5v15M8 20h8", image: "M3 3h18v18H3Zm0 14 6-6 4 4 3-3 5 5M8 7h.01",
  gauge: "M3 8h18v8H3ZM6 11h9v2H6Z", button: "M5 6h14l3 3v6l-3 3H5l-3-3V9Z",
  toggle: "M7 6h10a6 6 0 0 1 0 12H7A6 6 0 0 1 7 6Zm3 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  slider: "M2 12h7m6 0h7M9 8h6v8H9Z", code: "m8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18",
  grid: "M3 3h18v18H3ZM9 3v18m6-18v18M3 9h18M3 15h18",
  snap: "M5 3v10a7 7 0 0 0 14 0V3h-5v10a2 2 0 0 1-4 0V3ZM5 7h5m4 0h5",
  alert: "m12 3 10 18H2Zm0 5v6m0 3h.01", check: "m5 12 4 4L19 6",
  folder: "M3 5h7l2 3h9v12H3Z", layers: "m12 3 10 6-10 6L2 9Zm-9 11 9 6 9-6",
  screen: "M3 3h18v14H3ZM8 21h8m-4-4v4"
};
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
export function widgetIcon(type: WidgetType): IconName {
  if (type.includes("button")) return "button";
  if (type.includes("toggle") || type === "checkbox") return "toggle";
  if (type.includes("slider")) return "slider";
  if (type === "image" || type.startsWith("bg-")) return "image";
  if (type === "gauge" || type === "fill") return "gauge";
  if (type === "group" || type === "layout") return "group";
  if (type === "station-window" || type === "frame") return "window";
  if (type === "advanced-imgui") return "code";
  return "text";
}
