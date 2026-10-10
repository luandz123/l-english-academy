import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Không tải được dữ liệu",
  message = "Đã xảy ra lỗi trong quá trình kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
  onRetry,
  className = "",
}) => {
  return (
    <div
      className={`p-8 text-center bg-[#070e1c]/90 rounded-3xl border border-rose-500/25 shadow-sm flex flex-col items-center justify-center space-y-4 max-w-md mx-auto backdrop-blur-xl ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-inner">
        <AlertCircle className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-black text-foreground">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="btn-3d btn-3d-primary text-xs font-bold rounded-xl px-5 py-2.5 flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Thử lại</span>
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
