/**
 * Badge — psychology-driven design
 *
 * Pill shape: softer, less aggressive than rectangles
 * Muted backgrounds: don't compete with content — color is recognized before text is read
 * Saturated text on muted bg: high contrast for the status word itself
 * Sentence case (not UPPERCASE): uppercase in dense UIs creates anxiety
 * Brain processes color 60,000x faster than text — status is known before reading
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Pill shape, 11px text, no border by default — clean and unobtrusive
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default:     "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800",
        paid:        "bg-black dark:bg-white text-white dark:text-black font-semibold border border-black dark:border-white",
        active:      "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/60",
        pending:     "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60",
        overdue:     "bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800",
        draft:       "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-900",
        planning:    "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-900",
        review:      "bg-zinc-100/50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800/80",
        completed:   "bg-black dark:bg-white text-white dark:text-black font-semibold border border-black dark:border-white",
        cancelled:   "bg-zinc-100 dark:bg-zinc-950 text-zinc-450 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-900 line-through decoration-zinc-300 dark:decoration-zinc-800",
        "in-progress":"bg-zinc-100 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800",
        lead:        "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800",
        inactive:    "bg-zinc-100 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-900",
        high:        "bg-black/10 dark:bg-white/10 text-black dark:text-white border border-black/20 dark:border-white/20",
        medium:      "bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 border border-black/10 dark:border-white/10",
        low:         "bg-transparent text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-900",
        outline:     "border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
