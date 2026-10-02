import React from "react";
import { cn } from "@/lib/utils";

export interface PageCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "muted" | "dashed";
  padding?: "none" | "sm" | "default" | "lg";
}

export const PageCard = React.forwardRef<HTMLDivElement, PageCardProps>(
  ({ children, className, variant = "default", padding = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-card border-border/70 text-card-foreground shadow-soft-sm",
      muted: "bg-muted/30 border-border/60 text-foreground",
      dashed: "bg-muted/10 border-dashed border-border/70 text-muted-foreground",
    };

    const paddingStyles = {
      none: "p-0",
      sm: "p-3 sm:p-4",
      default: "p-4 sm:p-6",
      lg: "p-6 sm:p-8",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border transition-all duration-150",
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageCard.displayName = "PageCard";

export default PageCard;
