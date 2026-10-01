import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@design-system": path.resolve(__dirname, "./design-system"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vendors estáveis em chunks próprios: o hash deles só muda quando a
        // dependência muda, então o navegador reaproveita o cache entre deploys.
        manualChunks(id) {
          // Helper interno do Rollup (getDefaultExportFromCjs etc.): se ficar
          // solto ele cai no primeiro vendor que o usa e todos os chunks passam
          // a importar esse vendor (na prática, vendor-charts entrava no 1º paint).
          if (id.includes("commonjsHelpers")) return "vendor-react";
          if (!id.includes("/node_modules/")) return;
          // clsx entra junto: a função manualChunks arrasta as dependências do
          // recharts pro vendor-charts, e o clsx (usado pelo cn() do app) iria
          // junto, forçando o vendor-charts no 1º paint.
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|@remix-run\/router|scheduler|clsx)\//.test(id)) {
            return "vendor-react";
          }
          if (id.includes("/node_modules/@tanstack/")) return "vendor-query";
          if (id.includes("/node_modules/@radix-ui/")) return "vendor-radix";
          if (id.includes("/node_modules/recharts/")) return "vendor-charts";
          if (id.includes("/node_modules/@supabase/")) return "vendor-supabase";
        },
      },
    },
  },
}));
