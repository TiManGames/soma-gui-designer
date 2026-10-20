import { useEffect, useRef } from "react";
import { buildScene } from "@core/preview/scene";
import { GuiRenderer } from "../../gfx/GuiRenderer";
import { useGfx } from "../../state/gfxStore";
import { usePreview } from "../../state/previewStore";
import { useStore } from "../../state/store";
import { postToHost } from "../../vscodeApi";

export function WysiwygCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null), renderer = useRef<GuiRenderer | null>(null);
  const doc = useStore(s => s.doc), hidden = useStore(s => s.hidden), states = usePreview(s => s.states), cache = useGfx(s => s.cache);
  useEffect(() => {
    const el = canvas.current!;
    const lost = (event: Event) => { event.preventDefault(); renderer.current = null; usePreview.setState({ error: "Graphics context lost. Toggle Preview to rebuild it, or continue in wireframe mode." }); };
    el.addEventListener("webglcontextlost", lost);
    return () => { el.removeEventListener("webglcontextlost", lost); renderer.current?.dispose(); renderer.current = null; };
  }, []);
  useEffect(() => {
    const missing = new Set<string>(), requests = new Set<string>();
    const lookup = (name: string) => {
      const e = cache.get(name);
      if (!e) requests.add(name);
      else if (e.status === "missing") missing.add(`Missing or unsupported resource: ${name}`);
      return e;
    };
    const scene = buildScene(doc, {
      texture: name => { const e = lookup(name); return e?.w && e.h ? { width: e.w, height: e.h } : undefined; },
      font: name => lookup(name)?.font
    }, states, hidden);
    let error = "";
    try { renderer.current ??= new GuiRenderer(canvas.current!); renderer.current.render(scene, doc.previewResolution.x, doc.previewResolution.y, name => cache.get(name)); }
    catch (err) { error = String(err instanceof Error ? err.message : err); }
    const diagnostics = [...scene.diagnostics, ...missing, ...(requests.size || [...cache.values()].some(e => e.status === "pending") ? ["Loading preview resources…"] : [])];
    usePreview.getState().publish(doc, scene, diagnostics, error);
    postToHost({ type: "previewStatus", diagnostics, error, quads: scene.quads.length, readyResources: [...cache.values()].filter(e => e.status === "ready").length });
    requests.forEach(name => useGfx.getState().request(name));
  }, [doc, hidden, states, cache]);
  return <canvas ref={canvas} className="gui-render-surface" aria-label="SOMA GUI preview" />;
}
