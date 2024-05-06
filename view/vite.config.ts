import renderer from "@future-scholars/vite-plugin-electron-renderer";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import modify from "rollup-plugin-modify";
import commonjs from "@rollup/plugin-commonjs";
import { defineConfig } from "vite";
import copy from "rollup-plugin-copy";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    minify: false,
    reportCompressedSize: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
      },
    },
    outDir: "./dist/",
    target: "es2022",
    emptyOutDir: false,
  },
  publicDir: "./view/public/",

  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
      tsconfig: "tsconfig.json",
    },
  },

  esbuild: {
    target: "es2022",
    keepNames: true,
  },

  resolve: {
    alias: {
      "@": path.join(__dirname, "src") + "/",
    },
  },

  plugins: [
    copy({
      targets: [],
    }),
    vue(),
    renderer(),
    modify({
      find: /import\s*{\s*[\s\S]*}\s*from\s*"paperlib-api?/,
      // find: /import { PLAPI } from "paperlib";/,
      replace: (match, path) => {
        const m = match
          .replace(/PLAPI\s*,?\s*/g, "")
          .replace(/PLExtAPI\s*,?\s*/g, "")
          .replace(/PLMainAPI\s*,?\s*/g, "");
        return m;
      },
    }),
    commonjs(),
  ],
});
