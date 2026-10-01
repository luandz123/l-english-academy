import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors select-none tracking-normal focus-visible:outline-2 focus-visible:outline-primary",
  {
    variants: {
      variant: {
        default: "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200",
        hot: "border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold",
        free: "border-emerald-300 dark:border-emerald-700/70 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold",
        new: "border-blue-300 dark:border-blue-700/70 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-bold",
        ets: "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold",
        success: "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 font-bold",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
