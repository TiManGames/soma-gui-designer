export interface ResourceName { key: string; isMod: boolean }
const extensions = [".png", ".jpg", ".jpeg", ".tga", ".dds", ".fnt"];
export function normalizeResourceName(name: string): string {
  return name.trim().replace(/^["']|["']$/g, "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^graphics\//i, "").replace(/^\/+/, "").toLowerCase();
}
/** Resolve within mod roots first, retaining extensions and namespace boundaries. */
export function findResource<T extends ResourceName>(entries: readonly T[], name: string): T | undefined {
  const normalized = normalizeResourceName(name);
  if (!normalized || normalized.split("/").includes("..")) return undefined;
  const font = normalized.startsWith("@font/"), extension = /\.[^/.]+$/.exec(normalized)?.[0];
  const candidates = extension ? [normalized] : extensions.map(ext => normalized + ext);
  for (const mod of [true, false]) {
    const source = entries.filter(e => e.isMod === mod && e.key.startsWith("@font/") === font);
    for (const candidate of candidates) {
      const exact = source.find(e => e.key === candidate); if (exact) return exact;
      const suffix = source.find(e => e.key.endsWith("/" + candidate)); if (suffix) return suffix;
    }
    for (const candidate of candidates) {
      const base = candidate.slice(candidate.lastIndexOf("/") + 1);
      const fallback = source.find(e => e.key.slice(e.key.lastIndexOf("/") + 1) === base); if (fallback) return fallback;
    }
  }
  return undefined;
}
