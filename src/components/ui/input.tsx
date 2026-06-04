"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[4px]",
          "bg-surface/80 text-foreground",
          "border-2 border-solid border-primary",
          "px-3 py-2",
          "font-[family-name:var(--font-space-mono)] text-[12px]",
          "placeholder:text-muted/60 placeholder:uppercase placeholder:text-[10px]",
          "transition-all duration-150 ease-in-out",
          "focus:outline-none focus:border-secondary focus:shadow-[0_0_8px_2px_rgba(42,63,229,0.5),inset_0_0_4px_rgba(42,63,229,0.1)]",
          "focus:animate-[blink-caret_1s_step-end_infinite] focus:border-r-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:border-dotted disabled:border-muted",
          "file:border-0 file:bg-transparent file:text-[12px] file:font-[family-name:var(--font-space-mono)] file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
