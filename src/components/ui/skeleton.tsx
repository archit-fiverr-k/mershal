/**
 * Skeleton — psychology-driven design
 *
 * Reduces perceived wait time by 35% vs spinners.
 * Spinners offer no spatial information.
 * Skeletons show WHERE content will appear — brain builds expectations,
 * the wait feels shorter because the layout is already understood.
 *
 * Shimmer direction: left-to-right (matches reading direction)
 * Duration: 1.4s — fast enough to feel alive, slow enough to not be distracting
 * Border radius: matches the content that will appear (critical for spatial accuracy)
 */
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[6px] bg-[#1C1E27]",
        "after:absolute after:inset-0",
        "after:bg-gradient-to-r after:from-transparent after:via-[#2A2D3A] after:to-transparent",
        "after:animate-[shimmer_1.4s_linear_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
