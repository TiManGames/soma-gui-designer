import type { SomaDocument } from "./document";
import { makeNode } from "./defaults";

/** Deep clone via structured JSON (documents are JSON-serializable). */
export function cloneDoc(doc: SomaDocument): SomaDocument {
  return JSON.parse(JSON.stringify(doc));
}

/**
 * Starter document. Mirrors the prototype's DEFAULT_DOC (legacy/app.js:210-260):
 * a MainWindow with three children (InfoImage, BodyText, ConfirmButton).
 */
export function createDefaultDocument(): SomaDocument {
  return {
    schemaVersion: 4,
    target: "terminal-on-gui",
    functionName: "DrawGeneratedCustomScreen",
    translationCategory: "GeneratedTerminal",
    previewResolution: { x: 1280, y: 800 },
    resolutionPreset: "1280x800",
    gridSize: 10,
    snapToGrid: true,
    nodes: [
      makeNode("station-window", "MainWindow", {
        caption: "MyWindowCaption",
        parentId: "screen",
        xN: 0.1,
        yN: 0.1,
        wN: 0.8,
        hN: 0.72,
        z: 1
      }),
      makeNode("image", "InfoImage", {
        caption: "Info image",
        gfx: "my_image",
        parentId: "MainWindow",
        xN: 0.05,
        yN: 0.1,
        wN: 0.35,
        hN: 0.45,
        z: 1
      }),
      makeNode("text-frame", "BodyText", {
        caption: "Body text",
        text: "MyTextEntry",
        parentId: "MainWindow",
        xN: 0.45,
        yN: 0.1,
        wN: 0.5,
        hN: 0.55,
        z: 1
      }),
      makeNode("station-button", "ConfirmButton", {
        caption: "Confirm",
        parentId: "MainWindow",
        xN: 0.7,
        yN: 0.85,
        wN: 0.25,
        hN: 0.1,
        z: 1
      })
    ]
  };
}
