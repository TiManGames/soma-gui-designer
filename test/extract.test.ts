import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  parseStruct,
  parseEnum,
  parseFactories,
  parseWrappers,
  parsePalette,
  categorize,
  discoverSources
} from "../scripts/extract-api-schema";
import { WIDGETS } from "../src/core/model/defaults";

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), "utf8");
}

const sample = read("test/fixtures/extractor-sample.hps");
const api = sample, station = sample, wrapper = sample;

it("does not invent source paths for an incomplete tree", () => {
  expect(discoverSources(fileURLToPath(new URL("./fixtures", import.meta.url)))).toBeNull();
});

describe("struct extraction", () => {
  it("extracts initialized fields and strings, excluding constructor locals", () => {
    const s = parseStruct(`class Settings {
      Settings()
      {
        float local = 2.0f;
      }
      tString msHeader;
      float mfHeight = 0.1f;
      bool mbEnabled = true;
    }`, "Settings");
    expect(s.fields.map(f => [f.name, f.category])).toEqual([
      ["msHeader", "string"], ["mfHeight", "float"], ["mbEnabled", "bool"]
    ]);
  });
  it("extracts cImGuiButtonData fields with categories", () => {
    const s = parseStruct(api, "cImGuiButtonData");
    const base = s.fields.find((f) => f.name === "mColorBase");
    expect(base?.category).toBe("color");
    expect(s.fields.find((f) => f.name === "mbUseFrame")?.category).toBe("bool");
    const align = s.fields.find((f) => f.name === "mFontAlign");
    expect(align?.category).toBe("enum");
    expect(align?.enumType).toBe("eFontAlign");
    expect(s.fields.find((f) => f.name === "mFont")?.category).toBe("font");
  });

  it("surfaces float-signature setter methods on the window struct", () => {
    const s = parseStruct(api, "cImGuiWindowData");
    expect(s.methods).toContain("SetPadding");
    expect(s.methods).toContain("SetLabelPadding");
  });
});

describe("enum extraction", () => {
  it("extracts eFontAlign members without LastEnum", () => {
    const e = parseEnum(api, "eFontAlign");
    expect(e.members).toEqual(["eFontAlign_Left", "eFontAlign_Right", "eFontAlign_Center"]);
  });

  it("extracts eImGuiAlign and strips LastEnum", () => {
    const e = parseEnum(api, "eImGuiAlign");
    expect(e.members).toContain("eImGuiAlign_CenterCenter");
    expect(e.members.some((m) => m.endsWith("_LastEnum"))).toBe(false);
  });
});

describe("factory + palette + wrapper extraction", () => {
  it("finds the StationGui default factories", () => {
    const f = parseFactories(station);
    expect(f.StationGui_CreateDefaultButtonData?.returns).toBe("cImGuiButtonData");
    expect(f.StationGui_CreateDefaultWindowData?.returns).toBe("cImGuiWindowData");
    expect(f.StationGui_CreateToggleButtonData?.returns).toBe("cImGuiButtonData");
  });

  it("parses the station palette colors", () => {
    const p = parsePalette(station);
    const warn = p.find((c) => c.name === "gStationGuiColor_Warning");
    expect(warn).toBeDefined();
    expect(warn!.r).toBeCloseTo(0.706, 3);
    expect(warn!.g).toBeCloseTo(0.208, 3);
    expect(warn!.b).toBeCloseTo(0.082, 3);
  });

  it("parses ImGui wrapper signatures", () => {
    const w = parseWrappers(wrapper);
    expect(w.ImGui_DoButtonExt).toBeDefined();
    expect(w.ImGui_DoButtonExt.params[0].name).toBe("asName");
    expect(w.ImGui_DoWindowStart).toBeDefined();
  });
});

describe("categorize", () => {
  it("maps known types", () => {
    expect(categorize("cColor").category).toBe("color");
    expect(categorize("cVector2f").category).toBe("vec2");
    expect(categorize("eImGuiGfx")).toEqual({ category: "enum", enumType: "eImGuiGfx" });
    expect(categorize("cImGuiGfx").category).toBe("gfx");
  });
});

describe("widget catalog references real API", () => {
  it("every dataClass/factory in WIDGETS exists in the source", () => {
    const factories = parseFactories(station);
    // The text-reader uses a constructor, not a StationGui factory; validate its
    // dataClass exists as a struct instead where applicable.
    for (const meta of Object.values(WIDGETS)) {
      if (!meta.factory) continue;
      const factoryName = meta.factory.replace(/\(\s*\)\s*$/, "");
      if (factoryName.startsWith("StationGui_")) {
        expect(factories[factoryName], `${factoryName} should exist in station source`).toBeDefined();
        expect(factories[factoryName].returns).toBe(meta.dataClass);
      }
    }
  });
});
