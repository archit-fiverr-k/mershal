/**
 * Button — psychology-driven design
 *
 * Primary (filled violet): signals importance, scale animation = tactile press feedback
 * Ghost (outlined): signals "optional/reversible" — less anxiety for non-critical actions
 * Danger (outlined red, NOT filled): warns without commanding — filled red causes accidental clicks
 * Loading: opacity 0.5 + "Processing…" — NEVER hide/replace, disappearing = abandonment anxiety
 * Size minimum 36px: below 36px causes hesitation clicks
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base: 36px min height, 8px radius (consistent everywhere = trust), 13px/500
  // scale(1.01) hover + scale(0.98) active = physical sensation of pressing
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-[13px] font-medium leading-none",
    "rounded-[8px] cursor-pointer select-none",
    "transition-[background,border-color,color,transform,box-shadow]",
    "duration-100 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0E12]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-[14px] [&_svg]:shrink-0",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary: violet — creativity + trust. Scale hover = alive, responsive.
        default:
          "bg-[#5E6AD2] text-white border border-[#5E6AD2] hover:bg-[#4D59C2] hover:scale-[1.01]",

        // Destructive: filled red — only for the most critical irreversible actions
        destructive:
          "bg-[#FF6B6B] text-white border border-[#FF6B6B] hover:bg-[#E85555] hover:scale-[1.01]",

        // Danger outlined: warns without commanding — transparent bg prevents accidental clicks
        "danger-outline":
          "bg-transparent text-[#FF6B6B] border border-[#FF6B6B]/60 hover:bg-[#FF6B6B]/8 hover:border-[#FF6B6B]",

        // Outline/ghost: signals "optional, reversible" — less anxiety
        outline:
          "bg-transparent text-[#8B8FA8] border border-white/10 hover:bg-[#1C1E27] hover:text-[#F0F0F5] hover:border-white/16",

        // Secondary: slightly elevated surface
        secondary:
          "bg-[#1C1E27] text-[#F0F0F5] border border-white/8 hover:bg-[#22253A] hover:scale-[1.01]",

        // Ghost: no border — for icon buttons and inline actions
        ghost:
          "bg-transparent text-[#8B8FA8] border border-transparent hover:bg-[#1C1E27] hover:text-[#F0F0F5]",

        // Link: text only
        link: "bg-transparent text-[#5E6AD2] border-transparent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        // 36px minimum — below this causes hesitation clicks
        default: "h-9 px-4",
        sm:      "h-8 px-3 text-[12px]",
        lg:      "h-10 px-6 text-[14px]",
        icon:    "h-9 w-9 p-0",
        "icon-sm":"h-7 w-7 p-0 text-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            {/* Spinner inside button — NEVER hide the button during loading */}
            <svg
              className="animate-spin size-[14px] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing…
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
