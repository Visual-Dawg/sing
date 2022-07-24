import { node } from "../../.electron-vendors.cache.json"
import { join } from "path"
import { builtinModules } from "module"

const PACKAGE_ROOT = __dirname

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: process.cwd(),
  resolve: {
    alias: {
      "@": join(PACKAGE_ROOT, "src") + "/",
      "@sing-backend": join(PACKAGE_ROOT, "../backend/src") + "/",
      "@tests": join(PACKAGE_ROOT, "tests") + "/",
      "@sing-types": join(PACKAGE_ROOT, "..", "..", "types") + "/",
    },
  },
  build: {
    sourcemap: "inline",
    target: `node${node}`,
    outDir: "dist",
    assetsDir: ".",
    minify: process.env.MODE !== "development",
    lib: {
      entry: "src/index.ts",
      formats: ["cjs"],
    },
    rollupOptions: {
      external: [
        "electron",
        "electron-devtools-installer",
        "@prisma/client",
        "electron-store",
        "ololog",
        ...builtinModules.flatMap((p) => [p, `node:${p}`]),
      ],
      output: {
        entryFileNames: "[name].cjs",
      },
    },
    emptyOutDir: true,
    brotliSize: false,
  },
  define: {
    "import.meta.vitest": "undefined",
  },
  test: {
    includeSource: ["src/**/*.ts"],
  },
}

export default config
