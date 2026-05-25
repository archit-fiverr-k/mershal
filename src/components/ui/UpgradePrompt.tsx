import { Lock, ArrowRight } from "lucide-react";
import { Button } from "./button";

interface UpgradePromptProps {
  feature: string;
  description: string;
  onUpgrade: () => void;
}

export function UpgradePrompt({ feature, description, onUpgrade }: UpgradePromptProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-[var(--violet)]/20 bg-[var(--violet)]/5 shadow-glow-sm">
      <div className="flex items-start gap-4">
        <div className="mt-1 h-10 w-10 shrink-0 rounded-lg bg-[var(--violet)]/10 flex items-center justify-center text-[var(--violet)]">
          <Lock className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Upgrade to unlock {feature}
          </h3>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Button
        onClick={onUpgrade}
        className="w-full md:w-auto bg-[#5E6AD2] hover:bg-[#4d59be] text-white font-medium text-[13px] px-4 py-2 h-9 rounded-lg flex items-center justify-center gap-1.5 shadow-glow-sm shrink-0 transition-colors duration-150 cursor-pointer"
      >
        Upgrade — $19/mo <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
