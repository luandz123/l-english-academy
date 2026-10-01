import React from "react";
import { FolderOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={cn(
        "p-10 text-center bg-card rounded-2xl border border-border/60 shadow-soft-sm flex flex-col items-center justify-center space-y-5 max-w-md mx-auto my-6 animate-fade-in-up",
        className
      )}
    >
      {/* 1. Minh họa trực quan tối giản (Prägnanz) */}
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-soft-sm">
        {icon || <FolderOpen className="w-8 h-8 stroke-[1.75]" />}
      </div>

      {/* 2. Giải thích nguyên nhân bằng văn phong tích cực hướng tới hành động */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-foreground leading-snug tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed reading-measure">
          {description}
        </p>
      </div>

      {/* 3. Một nút kêu gọi hành động duy nhất (Single Primary CTA) */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="btn-3d-primary font-bold px-6 py-2.5 rounded-xl shadow-soft-sm flex items-center gap-2"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4 stroke-[2]" />
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
