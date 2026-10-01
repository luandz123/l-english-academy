import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-background px-4 py-2.5 text-base text-foreground ring-offset-background transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
