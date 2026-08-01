import schemaJson from "@data/api-schema.json";
import type { ApiSchema, EnumDef, StructDef } from "./api-schema.types";

export const apiSchema = schemaJson as unknown as ApiSchema;

export function getStruct(name: string | undefined): StructDef | null {
  if (!name) return null;
  return apiSchema.structs[name] ?? null;
}

export function getEnum(name: string | undefined): EnumDef | null {
  if (!name) return null;
  return apiSchema.enums[name] ?? null;
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
