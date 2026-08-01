/**
 * Build-time API-schema extractor.
 *
 * Parses the bundled SOMA source (read-only ground truth under soma_scripts/)
 * into src/data/api-schema.json, consumed by the app for typed property editors
 * and validation. Uses line/regex parsing (the declarations we need are regular);
 * every pattern is guarded by test/extract.test.ts so a SOMA update fails loudly.
 *
 * Run: npm run extract  (also wired as predev/prebuild)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { dirname } from "node:path";
import type {
  ApiSchema,
  EnumDef,
  FactoryDef,
  FieldCategory,
  PaletteColor,
  StructDef,
  StructField,
  WrapperFn,
  WrapperParam
} from "../src/core/schema/api-schema.types";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const p = (rel: string) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
void ROOT;

const SOURCES = {
  api: "soma_scripts/hps_api.hps",
  wrapper: "soma_scripts/script/helpers/helper_imgui.hps",
  station: "soma_scripts/script/custom_depth/helper_custom_depth_imgui/helper_imgui_station_basics.hps"
};

// Struct classes we surface for property editing.
const STRUCT_CLASSES = [
  "cImGuiButtonData",
  "cImGuiWindowData",
  "cImGuiTextFrameData",
  "cImGuiGaugeData",
  "cImGuiSliderData",
  "cImGuiLabelData",
  "cImGuiCheckBoxData",
  "cImGuiMultiSelectData",
  "cImGuiFrameData",
  "cImGuiFont",
  "cImGuiGfx"
];

// Enums the property editors need.
const ENUM_NAMES = [
  "eFontAlign",
  "eImGuiAlign",
  "eImGuiGfx",
  "eImGuiLayout",
  "eImGuiWindowHeader",
  "eImGuiGaugeOrientation",
  "eGuiMaterial",
  "eImGuiAction",
  "eEasing"
];

function categorize(type: string): { category: FieldCategory; enumType?: string } {
  switch (type) {
    case "cColor":
      return { category: "color" };
    case "float":
      return { category: "float" };
    case "int":
    case "uint":
    case "uint64":
      return { category: "int" };
    case "bool":
      return { category: "bool" };
    case "cVector2f":
      return { category: "vec2" };
    case "cVector3f":
      return { category: "vec3" };
    case "cImGuiFont":
      return { category: "font" };
    case "cImGuiGfx":
    case "cImGuiFrameGfx":
      return { category: "gfx" };
    default:
      if (/^e[A-Z]/.test(type)) return { category: "enum", enumType: type };
      return { category: "unknown" };
  }
}

/** Extract the body of `class <name> { ... }` as an array of trimmed lines. */
function classBody(src: string, name: string): string[] | null {
  const re = new RegExp(`class\\s+${name}\\s*\\{`, "m");
  const m = re.exec(src);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  const start = i;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  return src
    .slice(start, i)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseStruct(src: string, name: string): StructDef {
  const body = classBody(src, name);
  if (!body) throw new Error(`Struct not found: ${name}`);

  const fields: StructField[] = [];
  const methods: string[] = [];
  const fieldRe = /^([A-Za-z_][\w]*)\s+([A-Za-z_]\w*)\s*;$/;
  // Methods taking only float params (e.g. SetPadding(float, float, ...)).
  const methodRe = /^\s*(?:void\s+)?([A-Za-z_]\w*)\s*\(([^)]*)\)\s*;$/;

  for (const line of body) {
    const fm = fieldRe.exec(line);
    if (fm) {
      const [, type, fname] = fm;
      const { category, enumType } = categorize(type);
      fields.push({ name: fname, type, category, ...(enumType ? { enumType } : {}) });
      continue;
    }
    const mm = methodRe.exec(line);
    if (mm && line.includes("(")) {
      const params = mm[2].trim();
      // Only surface simple float-signature setters (SetPadding-style).
      if (params === "" || /float/.test(params)) {
        methods.push(mm[1]);
      }
    }
  }
  return { name, fields, methods };
}

function parseEnum(src: string, name: string): EnumDef {
  const re = new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`, "m");
  const m = re.exec(src);
  if (!m) throw new Error(`Enum not found: ${name}`);
  const members = m[1]
    .split(/[,\n]/)
    .map((s) => s.trim().replace(/\s*=.*$/, ""))
    .filter(Boolean)
    .filter((s) => !s.endsWith("_LastEnum"));
  return { name, members };
}

function parseFactories(src: string): Record<string, FactoryDef> {
  const out: Record<string, FactoryDef> = {};
  const re = /^(cImGui\w*Data)\s+(StationGui_Create\w+)\s*\(\s*\)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out[m[2]] = { name: m[2], returns: m[1] };
  }
  return out;
}

function parseWrappers(src: string): Record<string, WrapperFn> {
  const out: Record<string, WrapperFn> = {};
  // Single-line free-function declarations: <ret> ImGui_Name(params)
  const re = /^([A-Za-z_][\w<>&\s]*?)\s+(ImGui_\w+)\s*\(([^;{]*)\)\s*(?:\{|$)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const returnType = m[1].trim();
    const name = m[2];
    const params = parseParams(m[3]);
    // First declaration wins (skip duplicate overloads for schema simplicity).
    if (!out[name]) out[name] = { name, returnType, params };
  }
  return out;
}

function parseParams(raw: string): WrapperParam[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return trimmed.split(",").map((seg) => {
    const [decl, def] = seg.split("=");
    const parts = decl.trim().replace(/&in\b|&out\b|&/g, " ").replace(/\bconst\b/g, "").trim().split(/\s+/);
    const name = parts.pop() ?? "";
    const type = parts.join(" ").trim();
    return { type, name, ...(def ? { default: def.trim() } : {}) };
  });
}

function parsePalette(src: string): PaletteColor[] {
  const out: PaletteColor[] = [];
  const re = /cColor\s+(gStationGuiColor_\w+)\s*=\s*cColor\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const nums = m[2].split(",").map((s) => parseFloat(s.replace(/f/g, "").trim()));
    out.push({
      name: m[1],
      r: nums[0] ?? 1,
      g: nums[1] ?? 1,
      b: nums[2] ?? 1,
      a: nums[3] ?? 1
    });
  }
  return out;
}

function main() {
  const api = readFileSync(p(SOURCES.api), "utf8");
  const wrapper = readFileSync(p(SOURCES.wrapper), "utf8");
  const station = readFileSync(p(SOURCES.station), "utf8");

  const structs: Record<string, StructDef> = {};
  for (const name of STRUCT_CLASSES) structs[name] = parseStruct(api, name);

  const enums: Record<string, EnumDef> = {};
  for (const name of ENUM_NAMES) enums[name] = parseEnum(api, name);

  const schema: ApiSchema = {
    generatedFrom: Object.values(SOURCES),
    structs,
    enums,
    factories: parseFactories(station),
    wrappers: parseWrappers(wrapper),
    paletteColors: parsePalette(station)
  };

  const outPath = p("src/data/api-schema.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(schema, null, 2) + "\n", "utf8");

  console.log(
    `Extracted API schema: ${Object.keys(structs).length} structs, ${Object.keys(enums).length} enums, ` +
      `${Object.keys(schema.factories).length} factories, ${Object.keys(schema.wrappers).length} wrappers, ` +
      `${schema.paletteColors.length} palette colors -> ${outPath}`
  );
}

// Run only when invoked directly (not when imported by tests).
const invokedPath = process.argv[1] ? process.argv[1].replace(/\\/g, "/") : "";
if (invokedPath.endsWith("extract-api-schema.ts")) {
  main();
}

// Exported for tests to exercise the parsers directly.
export {
  parseStruct,
  parseEnum,
  parseFactories,
  parseWrappers,
  parsePalette,
  categorize,
  SOURCES
};
