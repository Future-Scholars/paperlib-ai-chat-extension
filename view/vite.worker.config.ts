import path from "node:path";
import commonjs from "@rollup/plugin-commonjs";
import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

function copyMupdfFiles() {
  return {
    name: "copy-mupdf-files",
    writeBundle() {
      const srcDir = resolve("node_modules/mupdf/dist");
      const destDir = resolve("dist/assets");
      const filesToCopy = [
        "mupdf-wasm.js",
        "mupdf-wasm.wasm",
        "mupdf.js",
        "tasks.js",
      ];

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      filesToCopy.forEach((file) => {
        const src = path.join(srcDir, file);
        const dest = path.join(destDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied ${file} to ${destDir}`);
        } else {
          console.warn(`Warning: ${file} not found in ${srcDir}`);
        }
      });
    },
  };
}

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
        mupdfWorker: path.resolve(
          __dirname,
          "src",
          "utils",
          "pdfParser",
          "mupdf",
          "mupdf.worker.ts",
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

  plugins: [commonjs(), copyMupdfFiles()],
});
