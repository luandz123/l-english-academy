import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack);

    // Xử lý tự động reload khi phát hiện lỗi chunk mới trên server (Stale Chunk / Deploy mới)
    const isChunkError =
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed") ||
      error?.message?.includes("dynamically imported module") ||
      error?.name === "ChunkLoadError";

    if (isChunkError && typeof window !== "undefined") {
      const lastReload = sessionStorage.getItem("error_boundary_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("error_boundary_chunk_reload", String(now));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes("Failed to fetch dynamically imported module") ||
        this.state.error?.message?.includes("Importing a module script failed") ||
        this.state.error?.message?.includes("dynamically imported module") ||
        this.state.error?.name === "ChunkLoadError";

      if (isChunkError) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-background text-foreground">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-2xl animate-pulse">
              ✨
            </div>
            <h2 className="text-xl font-bold">Hệ thống đã có bản cập nhật mới!</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Hệ thống đang tự động tải phiên bản mới nhất cho bạn. Nếu trang chưa tự tải lại, vui lòng bấm nút bên dưới.
            </p>
            <button
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-sm font-bold shadow-md cursor-pointer transition-all"
              onClick={() => {
                sessionStorage.removeItem("error_boundary_chunk_reload");
                sessionStorage.removeItem("chunk_force_refreshed");
                window.location.reload();
              }}
            >
              Cập nhật ngay
            </button>
          </div>
        );
      }

      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-background text-foreground">
            <h2 className="text-xl font-semibold text-destructive">Đã xảy ra lỗi</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              {this.state.error?.message ?? "Lỗi không xác định. Vui lòng tải lại trang."}
            </p>
            <button
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold cursor-pointer shadow-sm hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
