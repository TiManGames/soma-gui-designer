import esbuild from "esbuild";

// Bundles the VS Code extension host (Node) into dist/extension.js.
// The `vscode` module is provided by the runtime and must stay external.
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["src/extension/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode"],
  sourcemap: !production,
  minify: production,
  tsconfig: "tsconfig.extension.json",
  logLevel: "info"
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("esbuild: watching extension host...");
} else {
  await esbuild.build(options);
}
