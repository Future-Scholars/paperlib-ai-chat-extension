import path from "node:path";
import commonjs from "@rollup/plugin-commonjs";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    minify: false,
    reportCompressedSize: true,
    rollupOptions: {
      input: {
        worker: path.resolve(
          __dirname,
          "src",
          "utils",
          "transformers",
          "worker.ts",
        ),
      },
      output: {
        entryFileNames: `assets/[name].js`,
      },
    },
    outDir: "./dist",
    target: "es2022",
    emptyOutDir: false,
  },

  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
      tsconfig: "tsconfig.json",
      keepNames: false,
    },
  },

  esbuild: {
    target: "es2022",
    keepNames: false,
  },

  resolve: {},

  plugins: [commonjs()],
});
