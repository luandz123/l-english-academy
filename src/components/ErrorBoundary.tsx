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
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-xl font-semibold text-destructive">Đã xảy ra lỗi</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              {this.state.error?.message ?? "Lỗi không xác định. Vui lòng tải lại trang."}
            </p>
            <button
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
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
