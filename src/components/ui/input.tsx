/**
 * Input — psychology-driven design
 *
 * 32px height: not 28px (too small = hesitation) not 40px (too form-like)
 * Focus glow: tells user "system is listening, you are here"
 * Without visual focus, users feel lost in long forms
 * Soft glow (not harsh box) feels safe and welcoming
 * Label always above (never inside): labels inside disappear when typing
 * Error border + message: gentle fade, never jumpy layout shifts
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // 32px height, 8px radius (consistent = trust), darker bg than card (inputs recede)
          "flex h-8 w-full rounded-[8px]",
          "bg-[#13151B] border border-white/10",
          "px-3 py-0",
          "text-[13px] font-normal text-[#F0F0F5]",
          "placeholder:text-[#5C5F73]",
          // Hover: slightly more visible border
          "hover:border-white/18",
          // Focus: violet border + soft glow — "system is listening"
          "focus-visible:outline-none focus-visible:border-[#5E6AD2] focus-visible:shadow-[0_0_0_3px_rgba(94,106,210,0.15)]",
          "transition-[border-color,box-shadow] duration-100 ease-out",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // File input styling
          "file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-[#F0F0F5]",
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
