/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Builds the React UI as the VS Code webview bundle: a single JS + single CSS
// with fixed names (no hashing) so the extension host can reference them by
// path, and relative asset URLs (base: "") for the vscode-webview:// origin.
export default defineConfig({
  plugins: [react()],
  base: "",
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("./src/core", import.meta.url)),
      "@ui": fileURLToPath(new URL("./src/ui", import.meta.url)),
      "@data": fileURLToPath(new URL("./src/data", import.meta.url))
    }
  },
  build: {
    outDir: "dist/webview",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: fileURLToPath(new URL("./src/ui/main.tsx", import.meta.url)),
      output: {
        entryFileNames: "index.js",
        assetFileNames: "index.[ext]"
      }
    }
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"]
  }
});
