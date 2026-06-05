import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve("electron/main.ts")
        },
        external: ["@prisma/client", ".prisma/client"]
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve("electron/preload.ts")
        }
      }
    }
  },
  renderer: {
    root: ".",
    resolve: {
      alias: {
        "@": resolve("src")
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve("index.html")
        }
      }
    },
    plugins: [react()]
  }
});
