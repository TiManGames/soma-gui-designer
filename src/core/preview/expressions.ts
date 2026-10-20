import type { Override } from "../model/nodes";
import { paletteColors } from "../schema/loadSchema";
import type { Color } from "./types";

export type Value = number | boolean | string | number[] | { kind: "gfx" | "font"; file: string; size?: number[] };
export interface EvalContext { width: number; height: number; groupWidth: number; groupHeight: number }
const names: Record<string, Value> = {
  cColor_White: [1, 1, 1, 1], cColor_Black: [0, 0, 0, 1], cColor_Red: [1, 0, 0, 1],
  cColor_Green: [0, 1, 0, 1], cColor_Blue: [0, 0, 1, 1],
  cVector2f_Zero: [0, 0], cVector2f_One: [1, 1], cVector2f_MinusOne: [-1, -1],
  ...Object.fromEntries(paletteColors.map(c => [c.name, [c.r, c.g, c.b, c.a]]))
};

/** Small, non-executing expression evaluator. Unknown HPS is never eval()'d. */
export function evaluate(source: string, ctx: EvalContext): Value | undefined {
  const tokens = source.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fF]?|[A-Za-z_]\w*|[()+*/,.-]/g) ?? [];
  if (tokens.join("") !== source.replace(/\s+(?=(?:[^"']*["'][^"']*["'])*[^"']*$)/g, "")) {
    // Token gaps are rejected below too; keep quoted whitespace intact.
    const stripped = source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
    if (/[^\s\w()+*/,.'"-]/.test(stripped)) return undefined;
  }
  let i = 0;
  function arithmetic(a: Value | undefined, b: Value | undefined, op: string): Value | undefined {
    const calc = (x: number, y: number) => op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : x / y;
    if (typeof a === "number" && typeof b === "number") return calc(a, b);
    if (Array.isArray(a) && (Array.isArray(b) || typeof b === "number")) return a.map((x, j) => calc(x, typeof b === "number" ? b : b[j]));
    if (typeof a === "number" && Array.isArray(b)) return b.map(y => calc(a, y));
    return undefined;
  }
  function atom(): Value | undefined {
    const t = tokens[i++];
    if (!t) return undefined;
    if (t === "-" || t === "+") return arithmetic(t === "-" ? -1 : 1, atom(), "*");
    if (t === "(") { const v = sum(); if (tokens[i++] !== ")") return undefined; return v; }
    if (/^[\d.]/.test(t)) return Number(t.replace(/[fF]$/, ""));
    if (/^["']/.test(t)) return t.slice(1, -1).replace(/\\(["'\\])/g, "$1");
    if (t === "true" || t === "false") return t === "true";
    if (tokens[i] !== "(") return names[t] ?? (/^e[A-Z]\w+$/.test(t) ? t : undefined);
    i++;
    const args: Value[] = [];
    while (tokens[i] !== ")" && i < tokens.length) {
      const a = sum(); if (a === undefined) return undefined;
      args.push(a); if (tokens[i] !== ",") break; i++;
    }
    if (tokens[i++] !== ")") return undefined;
    if (t === "cColor" && args.every(v => typeof v === "number")) {
      const a = args as number[];
      return a.length <= 2 ? [a[0], a[0], a[0], a[1] ?? 1] : [a[0], a[1], a[2], a[3] ?? 1];
    }
    if (/^cVector[23]f$/.test(t) && args.every(v => typeof v === "number")) {
      const n = t === "cVector2f" ? 2 : 3;
      return args.length === 1 ? Array(n).fill(args[0]) : args as number[];
    }
    if (t === "cImGuiGfx" || t === "cImGuiFont") {
      if (args.length && typeof args[0] !== "string") return undefined;
      const size = Array.isArray(args[1]) ? args[1] : typeof args[1] === "number" ? [args[1], args[1]] : [16, 16];
      return { kind: t === "cImGuiFont" ? "font" : "gfx", file: args[0] as string ?? "", ...(t === "cImGuiFont" ? { size } : {}) };
    }
    if (t === "Helper_Font_GetFontName" && typeof args[0] === "string") return args[0].replace("eLuxFontType_", "").toLowerCase() + ".fnt";
    if (/^ImGui_NrmSize(?:Group)?(?:KeepRatio)?$/.test(t)) {
      const v = Array.isArray(args[0]) ? args[0] : args.length === 1 ? [args[0], args[0]] : args;
      if (!v.every(x => typeof x === "number")) return undefined;
      const h = t.includes("Group") ? ctx.groupHeight : ctx.height;
      const w = t.includes("KeepRatio") ? h : t.includes("Group") ? ctx.groupWidth : ctx.width;
      return [(v[0] as number) * w, (v[1] as number) * h];
    }
    return undefined;
  }
  function product(): Value | undefined { let a = atom(); while (tokens[i] === "*" || tokens[i] === "/") { const op = tokens[i++]; a = arithmetic(a, atom(), op); } return a; }
  function sum(): Value | undefined { let a = product(); while (tokens[i] === "+" || tokens[i] === "-") { const op = tokens[i++]; a = arithmetic(a, product(), op); } return a; }
  const v = sum();
  if (i !== tokens.length || v === undefined || (typeof v === "number" && !Number.isFinite(v)) || (Array.isArray(v) && v.some(n => !Number.isFinite(n))) || (typeof v === "object" && !Array.isArray(v) && v.size?.some(n => !Number.isFinite(n)))) return undefined;
  return v;
}

export class Properties {
  readonly values = new Map<string, Value>();
  private assign(path: string, value: Value): void {
    const component = /^(.*)\.([rgbaxyz])$/.exec(path);
    if (component && typeof value === "number") {
      const base = this.values.get(component[1]);
      if (Array.isArray(base)) {
        const index = ({ r: 0, g: 1, b: 2, a: 3, x: 0, y: 1, z: 2 } as Record<string, number>)[component[2]];
        const next = [...base]; next[index] = value; this.values.set(component[1], next); return;
      }
    }
    for (const key of this.values.keys()) if (key.startsWith(path + ".")) this.values.delete(key);
    this.values.set(path, value);
  }
  constructor(defaults: Record<string, Value>, overrides: Override[], ctx: EvalContext, warn: (message: string) => void, private readonly observe: (path: string) => void = () => {}) {
    Object.entries(defaults).forEach(([k, v]) => this.values.set(k, v));
    for (const o of overrides) {
      if (o.kind === "expr") {
        const value = evaluate(o.expr, ctx);
        if (value === undefined) { warn(`Cannot preview ${o.path}: ${o.expr}`); continue; }
        if (typeof value === "object" && !Array.isArray(value)) {
          for (const key of this.values.keys()) if (key.startsWith(o.path + ".")) this.values.delete(key);
          this.values.set(`${o.path}.file`, value.file);
          if (value.size) this.values.set(`${o.path}.mvSize`, value.size);
        } else this.assign(o.path, value);
      } else {
        const call = /^\s*([\w.]+)\s*\((.*)\)\s*;?\s*$/.exec(o.call);
        if (!call) { warn(`Cannot preview call: ${o.call}`); continue; }
        if (call[1].endsWith(".SetFile")) {
          const value = evaluate(call[2], ctx);
          if (typeof value === "string") this.values.set(call[1].replace(/\.SetFile$/, ".file"), value);
          else warn(`Cannot preview call: ${o.call}`);
        } else if (/(?:^|\.)(?:SetPadding|SetLabelPadding)$/.test(call[1])) {
          const parts = call[2].split(",").map(v => evaluate(v, ctx));
          if (parts.length === 4 && parts.every(v => typeof v === "number")) {
            const prefix = call[1].replace(/Set(Label)?Padding$/, (_, label: string) => label ? "mfLabelPadding" : "mfPadding");
            ["Top", "Right", "Bottom", "Left"].forEach((s, j) => this.values.set(prefix + s, parts[j]));
          } else warn(`Cannot preview call: ${o.call}`);
        } else warn(`Cannot preview call: ${o.call}`);
      }
    }
  }
  num(k: string, fallback = 0): number { this.observe(k); const v = this.values.get(k); return typeof v === "number" ? v : fallback; }
  bool(k: string, fallback = true): boolean { this.observe(k); const v = this.values.get(k); return typeof v === "boolean" ? v : fallback; }
  str(k: string, fallback = ""): string { this.observe(k); const v = this.values.get(k); return typeof v === "string" ? v : fallback; }
  vec(k: string, fallback: number[]): number[] { this.observe(k); const v = this.values.get(k); return Array.isArray(v) ? v : typeof v === "number" ? fallback.map(() => v) : fallback; }
  color(k: string, fallback: Color = [1, 1, 1, 1]): Color { const v = this.vec(k, fallback); return ["r", "g", "b", "a"].map((c, i) => this.num(k + "." + c, v[i] ?? fallback[i])) as Color; }
}
