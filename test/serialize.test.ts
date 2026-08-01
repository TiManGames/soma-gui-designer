import { describe, it, expect } from "vitest";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { isSomaDocument, CURRENT_SCHEMA_VERSION } from "../src/core/model/document";
import { makeNode } from "../src/core/model/defaults";

// The host <-> webview contract serializes the document to JSON text and back.
// These guards protect that round-trip.
describe("document serialize round-trip", () => {
  it("survives JSON stringify/parse and passes the guard", () => {
    const doc = createDefaultDocument();
    const text = JSON.stringify(doc, null, 2) + "\n";
    const parsed = JSON.parse(text);
    expect(isSomaDocument(parsed)).toBe(true);
    expect(parsed).toEqual(doc);
  });

  it("preserves overrides and typed fields through the round-trip", () => {
    const doc = createDefaultDocument();
    const btn = doc.nodes.find((n) => n.id === "ConfirmButton")!;
    btn.overrides = [{ kind: "expr", path: "mColorBase", expr: "gStationGuiColor_Warning" }];
    doc.nodes.push(makeNode("image", "Pic", { parentId: "screen" }));

    const back = JSON.parse(JSON.stringify(doc));
    expect(isSomaDocument(back)).toBe(true);
    expect(back.nodes.find((n: { id: string }) => n.id === "ConfirmButton").overrides).toEqual(
      btn.overrides
    );
  });

  it("rejects malformed or wrong-version text via the guard", () => {
    expect(isSomaDocument(JSON.parse("{}"))).toBe(false);
    expect(isSomaDocument({ schemaVersion: CURRENT_SCHEMA_VERSION - 1, nodes: [] })).toBe(false);
    expect(isSomaDocument({ schemaVersion: CURRENT_SCHEMA_VERSION })).toBe(false);
  });
});
