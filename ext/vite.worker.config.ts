import commonjs from "@rollup/plugin-commonjs";
import { builtinModules } from "module";
import path from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    minify: false,
    reportCompressedSize: true,
    rollupOptions: {
      external: [...builtinModules, "@xenova/transformers"],
      input: {
        worker: path.resolve(__dirname, "src", "transformers", "worker.ts"),
      },
      output: {
        entryFileNames: `assets/[name].js`,
      },
    },
    outDir: "./dist",
    target: "node12",
    emptyOutDir: false,
  },

  optimizeDeps: {
    esbuildOptions: {
      target: "node12",
      tsconfig: "tsconfig.json",
      keepNames: false,
    },
  },

  esbuild: {
    target: "node12",
    keepNames: false,
  },

  resolve: {},

  plugins: [commonjs()],
});
