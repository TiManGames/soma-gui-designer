// Types for the API schema extracted from the bundled SOMA source at build time
// (scripts/extract-api-schema.ts -> src/data/api-schema.json).

/** UI editor category derived from an AngelScript field type. */
export type FieldCategory =
  | "color" // cColor
  | "float" // float
  | "int" // int / uint
  | "bool" // bool
  | "vec2" // cVector2f
  | "vec3" // cVector3f
  | "font" // cImGuiFont
  | "gfx" // cImGuiGfx / cImGuiFrameGfx
  | "enum" // e*
  | "unknown";

export interface StructField {
  name: string; // e.g. "mColorBase"
  type: string; // raw AngelScript type, e.g. "cColor"
  category: FieldCategory;
  /** For category "enum", the enum type name so the UI can list members. */
  enumType?: string;
}

export interface StructDef {
  name: string; // e.g. "cImGuiButtonData"
  fields: StructField[];
  /** Method names taking only floats (e.g. SetPadding) surfaced as method overrides. */
  methods: string[];
}

export interface EnumDef {
  name: string; // e.g. "eFontAlign"
  members: string[]; // fully-qualified, e.g. "eFontAlign_Left" (LastEnum stripped)
}

export interface FactoryDef {
  name: string; // e.g. "StationGui_CreateDefaultButtonData"
  returns: string; // e.g. "cImGuiButtonData"
}

export interface WrapperParam {
  type: string;
  name: string;
  default?: string;
}

export interface WrapperFn {
  name: string; // e.g. "ImGui_DoButtonExt"
  returnType: string;
  params: WrapperParam[];
}

export interface PaletteColor {
  name: string; // e.g. "gStationGuiColor_Warning"
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ApiSchema {
  generatedFrom: string[]; // source file basenames
  structs: Record<string, StructDef>;
  enums: Record<string, EnumDef>;
  factories: Record<string, FactoryDef>;
  wrappers: Record<string, WrapperFn>;
  paletteColors: PaletteColor[];
}
