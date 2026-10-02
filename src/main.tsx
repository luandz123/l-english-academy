import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

// Tự động làm mới trang khi phát hiện bản deploy mới khiến các dynamic chunks cũ bị 404
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("Vite preloadError detected (new deployment on server), reloading page...", event);
    const lastReload = window.sessionStorage.getItem("vite_preload_reload");
    const now = Date.now();
    // Chặn loop reload liên tục: chỉ reload tối đa 1 lần mỗi 10 giây
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      window.sessionStorage.setItem("vite_preload_reload", String(now));
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
