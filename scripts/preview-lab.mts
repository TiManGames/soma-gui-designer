/** Local-only visual QA server; never part of the extension VSIX. */
import { createServer } from "vite";
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, extname, relative } from "node:path";
import { generateHps } from "../src/core/codegen/generateHps";
import { findResource } from "../src/core/preview/resourceIndex";
import { makeNode, WIDGETS } from "../src/core/model/defaults";
import type { WidgetType } from "../src/core/model/nodes";

const flag = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const game = resolve(flag("--game-root") ?? process.env.SOMA_ROOT ?? "soma_scripts");
if (!existsSync(join(game, "graphics")) || !existsSync(join(game, "fonts"))) throw new Error("Pass --game-root <SOMA directory> to load local game resources");
const docPath = resolve(flag("--document") ?? "test/fixtures/parity-document.json");
const files = new Map<string, string>();
function walk(root: string, directory: string, prefix = "") {
  for (const e of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, e.name);
    if (e.isDirectory()) walk(root, path, prefix);
    else files.set(prefix + relative(root, path).replace(/\\/g, "/").toLowerCase(), path);
  }
}
walk(join(game, "graphics"), join(game, "graphics")); walk(join(game, "fonts"), join(game, "fonts"), "@font/");
const output = resolve(".cache/preview-lab"); mkdirSync(output, { recursive: true });
const doc = JSON.parse(readFileSync(docPath, "utf8")); writeFileSync(join(output, "parity.hps"), generateHps(doc));
const catalog = { ...doc, functionName: "Catalog_OnGui", nodes: (Object.keys(WIDGETS) as WidgetType[]).filter(type => type !== "advanced-imgui").map(type => makeNode(type, type)) };
for (const node of catalog.nodes) if (node.type === "image") node.gfx = "default/imgui_checkbox.tga";
writeFileSync(join(output, "catalog.hps"), generateHps(catalog));
const server = await createServer({ server: { host: "127.0.0.1", port: 5197, strictPort: true }, appType: "custom" });
server.middlewares.use(async (req, res, next) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(await server.transformIndexHtml("/", '<!doctype html><html><body style="background:#20252c;color:white;font:14px sans-serif"><h1>SOMA GUI rendering lab</h1><p id="status">Loading…</p><canvas id="preview" style="border:1px solid #555"></canvas><pre id="results"></pre><script type="module" src="/scripts/preview-lab-client.ts"></script></body></html>')); return;
  }
  if (url.pathname === "/lab/document") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(doc)); return; }
  if (url.pathname === "/lab/resource") {
    const name = (url.searchParams.get("name") ?? "").toLowerCase();
    const entry = findResource([...files].map(([key, path]) => ({ key, path, isMod: false })), name)?.path;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(entry ? { extension: extname(entry), bytes: readFileSync(entry).toString("base64") } : { missing: name })); return;
  }
  if (url.pathname === "/lab/capture" && req.method === "POST") {
    const chunks: Buffer[] = []; let length = 0;
    for await (const chunk of req) { length += chunk.length; if (length > 32e6) { res.statusCode = 413; res.end(); return; } chunks.push(chunk); }
    const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    writeFileSync(join(output, "editor.png"), Buffer.from(result.png.split(",")[1], "base64"));
    writeFileSync(join(output, "results.json"), JSON.stringify(result.results, null, 2));
    res.end("saved"); return;
  }
  next();
});
await server.listen(); console.log(`Preview lab: http://127.0.0.1:5197 (${files.size} local resources)`);
