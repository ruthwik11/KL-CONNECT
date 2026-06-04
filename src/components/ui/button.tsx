"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center",
    "font-[family-name:var(--font-press-start)] uppercase",
    "border-2 cursor-pointer select-none",
    "transition-all duration-100 ease-in-out",
    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-white border-primary",
          "shadow-[4px_4px_0px_0px_rgba(42,63,229,0.5)]",
          "hover:bg-primary/90",
        ],
        secondary: [
          "bg-secondary text-surface border-secondary",
          "shadow-[4px_4px_0px_0px_rgba(244,185,176,0.5)]",
          "hover:bg-secondary/90",
        ],
        danger: [
          "bg-danger text-white border-danger",
          "shadow-[4px_4px_0px_0px_rgba(220,38,38,0.5)]",
          "hover:bg-danger/90",
        ],
        ghost: [
          "bg-transparent text-foreground border-dotted border-foreground/40",
          "shadow-none",
          "hover:bg-foreground/10 hover:text-primary hover:shadow-none",
        ],
        outline: [
          "bg-transparent text-primary border-solid border-primary",
          "shadow-[4px_4px_0px_0px_rgba(42,63,229,0.3)]",
          "hover:bg-primary/10",
        ],
      },
      size: {
        sm: "h-8 px-3 text-[8px] gap-1 rounded-[4px]",
        md: "h-10 px-4 text-[10px] gap-2 rounded-[4px]",
        lg: "h-12 px-6 text-[12px] gap-2 rounded-[8px]",
        icon: "h-10 w-10 rounded-[4px] text-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
