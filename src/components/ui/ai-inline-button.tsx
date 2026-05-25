/**
 * AIInlineButton — sparkle button for AI-assisted text generation
 *
 * Appears beside text inputs/textareas throughout the app.
 * Pro plan only — Free users see a grayed-out upgrade prompt.
 */
import { useState, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export type AIInlineContext =
  | "invoice_notes"
  | "project_description"
  | "task_title"
  | "task_description"
  | "client_notes"
  | "proposal_intro"
  | "proposal_scope"
  | "proposal_timeline"
  | "proposal_terms";

interface AIInlineButtonProps {
  context: AIInlineContext;
  currentValue: string;
  onResult: (text: string) => void;
  placeholder?: string;
  isPro?: boolean;
  className?: string;
}

export function AIInlineButton({
  context,
  currentValue,
  onResult,
  placeholder = "Generate with AI",
  isPro = true,
  className,
}: AIInlineButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 500);
  };
  const handleMouseLeave = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowTooltip(false);
  };

  const handleClick = async () => {
    if (!isPro) {
      // Show upgrade tooltip
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }
    if (status === "loading") return;

    setStatus("loading");
    try {
      const result = await apiClient.post<{ text: string }>("/api/ai/inline", {
        context,
        currentValue,
      });
      onResult(result.text);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={isPro ? placeholder : "AI features require Pro plan"}
        className={cn(
          "h-[26px] w-[26px] rounded-[6px] flex items-center justify-center transition-all duration-150 cursor-pointer",
          "border",
          isPro
            ? [
                "border-[rgba(94,106,210,0.3)] text-[#5E6AD2]",
                "hover:bg-[rgba(94,106,210,0.1)] hover:border-[rgba(94,106,210,0.6)]",
                status === "done" && "border-[#00C896] text-[#00C896]",
              ]
            : "opacity-40 border-white/10 text-[#5C5F73] cursor-default"
        )}
      >
        {status === "loading" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : status === "done" ? (
          <span className="text-[9px] font-bold">✓</span>
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-1.5 z-50 pointer-events-none">
          <div className="whitespace-nowrap bg-[#1C1E27] border border-white/10 rounded-[6px] px-2.5 py-1.5 text-[11px] text-[#F0F0F5] shadow-lg">
            {isPro ? (
              placeholder
            ) : (
              <span>
                AI requires{" "}
                <a
                  href="/dashboard/settings?tab=billing"
                  className="text-[#5E6AD2] font-semibold pointer-events-auto hover:underline"
                >
                  Pro plan →
                </a>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
