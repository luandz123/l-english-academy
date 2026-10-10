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
  iconBgColor = "bg-cyan-500/15",
  iconTextColor = "text-cyan-400",
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_24px_rgba(6,182,212,0.05)] relative overflow-hidden group flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className
      )}
    >
      <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div className="absolute -top-12 -right-12 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="space-y-1.5 min-w-0 relative z-10">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold border border-cyan-500/30 shadow-lg shadow-cyan-500/10",
                iconBgColor,
                iconTextColor
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-display">
            {title}
          </h1>
        </div>
        {description && (
          <p
            className={cn(
              "text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-2xl",
              Icon ? "sm:pl-13" : ""
            )}
          >
            {description}
          </p>
        )}
      </div>

      {(badge || actions) && (
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 relative z-10">
          {badge && (
            typeof badge === "string" ? (
              <span className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-extrabold text-xs shadow-xs">
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
