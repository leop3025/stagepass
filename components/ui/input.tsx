import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-cream placeholder:text-cream/35 outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
