import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconTextColor?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  iconBgColor = "bg-primary/10",
  iconTextColor = "text-primary",
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-card border border-border/60 rounded-2xl p-6 sm:p-7 shadow-soft-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className
      )}
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold shadow-soft-xs",
                iconBgColor,
                iconTextColor
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {title}
          </h1>
        </div>
        {description && (
          <p
            className={cn(
              "text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed",
              Icon ? "sm:pl-13" : ""
            )}
          >
            {description}
          </p>
        )}
      </div>

      {(badge || actions) && (
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          {badge && (
            typeof badge === "string" ? (
              <span className="px-3.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
                {badge}
              </span>
            ) : (
              badge
            )
          )}
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
