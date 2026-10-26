import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8082,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/v1": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    {
      name: "tts-proxy-middleware",
      configureServer(server) {
        server.middlewares.use("/api/tts", async (req, res) => {
          try {
            const url = new URL(req.url || "", "http://localhost");
            const q = url.searchParams.get("q") || "";
            if (!q) {
              res.statusCode = 400;
              res.end("Missing text query");
              return;
            }
            const cleanText = q.slice(0, 200);
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(cleanText)}`;
            const response = await fetch(ttsUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            });
            if (!response.ok) {
              res.statusCode = response.status;
              res.end("TTS upstream error");
              return;
            }
            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader("Cache-Control", "public, max-age=86400");
            const buffer = await response.arrayBuffer();
            res.end(Buffer.from(buffer));
          } catch (err) {
            res.statusCode = 500;
            res.end("Server error");
          }
        });
      },
    },
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query", "@supabase/supabase-js"],
          "vendor-ui": ["lucide-react", "clsx", "tailwind-merge"],
          "vendor-charts": ["recharts"],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
}));
