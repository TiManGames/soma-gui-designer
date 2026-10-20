import schemaJson from "@data/api-schema.json";
import type { ApiSchema, EnumDef, StructDef, StructField } from "./api-schema.types";

export const apiSchema = schemaJson as unknown as ApiSchema;

export function getStruct(name: string | undefined): StructDef | null {
  if (!name) return null;
  return apiSchema.structs[name] ?? null;
}

export function getEnum(name: string | undefined): EnumDef | null {
  if (!name) return null;
  return apiSchema.enums[name] ?? null;
}

/** Resolve existing nested overrides without treating known scalar fields as raw text. */
export function getStructField(structName: string, path: string): StructField | null {
  let struct = getStruct(structName);
  const segments = path.split(".");
  for (let i = 0; i < segments.length; i++) {
    const field: StructField | undefined = struct?.fields.find(f => f.name === segments[i]);
    if (!field) return null;
    if (i === segments.length - 1) return { ...field, name: path };
    struct = getStruct(field.type);
  }
  return null;
}

export function hasFactory(name: string): boolean {
  // factory name is stored without the trailing "()"
  const clean = name.replace(/\(\s*\)\s*$/, "");
  return !!apiSchema.factories[clean];
}

export function hasStruct(name: string): boolean {
  return !!apiSchema.structs[name];
}

export const paletteColors = apiSchema.paletteColors;
