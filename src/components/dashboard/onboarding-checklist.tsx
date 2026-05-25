/**
 * OnboardingChecklist — activation-driving setup wizard
 *
 * Psychology: completion loops + progress bars drive 4x retention
 * Users who complete 3+ setup actions stay for 30+ days
 *
 * Dismissal persists to Firestore (not localStorage) — syncs across devices
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Check, X, ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepCounts {
  clients: number;
  projects: number;
  tasks: number;
  invoices: number;
  portalTokens: number;
}

interface Step {
  key: keyof StepCounts;
  title: string;
  actionLabel: string;
  href: string;
}

const STEPS: Step[] = [
  {
    key: "clients",
    title: "Add your first client",
    actionLabel: "Add client",
    href: "/dashboard/clients?action=new",
  },
  {
    key: "projects",
    title: "Create your first project",
    actionLabel: "Create project",
    href: "/dashboard/projects?action=new",
  },
  {
    key: "tasks",
    title: "Add a task to your project",
    actionLabel: "Add task",
    href: "/dashboard/tasks?action=new",
  },
  {
    key: "invoices",
    title: "Send your first invoice",
    actionLabel: "Create invoice",
    href: "/dashboard/invoices?action=new",
  },
  {
    key: "portalTokens",
    title: "Invite a client to their portal",
    actionLabel: "Generate portal link",
    href: "/dashboard/portal",
  },
];

// ─── Confetti burst ────────────────────────────────────────────────────────────

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[12px]" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => {
        const colors = ["#5E6AD2", "#00C896", "#FFB347", "#FF6B6B", "#8F99E8"];
        const color = colors[i % colors.length];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 0.4}s`;
        const size = `${6 + Math.random() * 6}px`;
        return (
          <div
            key={i}
            className="absolute top-1/2 confetti-particle"
            style={{
              left,
              animationDelay: delay,
              width: size,
              height: size,
              background: color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-120px) rotate(360deg); opacity: 0; }
        }
        .confetti-particle {
          animation: confettiFall 0.9s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingChecklist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [visible, setVisible] = useState(true);
  const [allDoneShown, setAllDoneShown] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  // ── Fetch profile to check dismissed state ────────────────────────────────
  const { data: profile } = useQuery<{ onboardingDismissed?: boolean; confettiShown?: boolean }>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get("/api/profile"),
    enabled: !!user,
    staleTime: 60_000,
  });

  // ── Fetch step counts in parallel ─────────────────────────────────────────
  const { data: counts, isLoading } = useQuery<StepCounts>({
    queryKey: ["onboarding-counts"],
    queryFn: () => apiClient.get<StepCounts>("/api/onboarding/counts"),
    enabled: !!user && !profile?.onboardingDismissed,
    staleTime: 30_000,
  });

  // ── Dismiss mutation ───────────────────────────────────────────────────────
  const dismissMutation = useMutation({
    mutationFn: () =>
      apiClient.patch("/api/profile", { onboardingDismissed: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setVisible(false);
    },
  });

  // ── Confetti mutation ──────────────────────────────────────────────────────
  const confettiMutation = useMutation({
    mutationFn: () => apiClient.patch("/api/profile", { confettiShown: true }),
  });

  // ── Completed steps ────────────────────────────────────────────────────────
  const completed: Record<keyof StepCounts, boolean> = {
    clients:      (counts?.clients ?? 0) > 0,
    projects:     (counts?.projects ?? 0) > 0,
    tasks:        (counts?.tasks ?? 0) > 0,
    invoices:     (counts?.invoices ?? 0) > 0,
    portalTokens: (counts?.portalTokens ?? 0) > 0,
  };

  const completedCount = Object.values(completed).filter(Boolean).length;
  const allDone = completedCount === STEPS.length;

  // ── Trigger confetti when all done ────────────────────────────────────────
  useEffect(() => {
    if (allDone && !profile?.confettiShown && !allDoneShown) {
      setAllDoneShown(true);
      setConfettiActive(true);
      confettiMutation.mutate();
      // Auto-dismiss after 3s
      setTimeout(() => {
        dismissMutation.mutate();
      }, 3000);
    }
  }, [allDone, profile?.confettiShown]);

  // ── Don't render if dismissed / no user / all done state handled ──────────
  if (!user || !visible || profile?.onboardingDismissed || isLoading) return null;

  const progressPct = (completedCount / STEPS.length) * 100;

  return (
    <div
      className="relative rounded-[12px] p-5 overflow-hidden"
      style={{
        background: "rgba(94,106,210,0.06)",
        border: "1px solid rgba(94,106,210,0.2)",
      }}
    >
      <ConfettiBurst active={confettiActive} />

      {/* All done banner */}
      {allDoneShown ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="h-12 w-12 rounded-full bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center mb-3">
            <Check className="h-6 w-6 text-[#00C896]" />
          </div>
          <p className="text-[16px] font-semibold text-[#F0F0F5]">You're all set! 🎉</p>
          <p className="text-[12px] text-[#8B8FA8] mt-1">Redirecting to your workspace in a moment...</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[15px] font-medium text-[#F0F0F5]">🚀 Get started with Mershal</p>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#8B8FA8]">
                {completedCount} of {STEPS.length} completed
              </span>
              <button
                onClick={() => dismissMutation.mutate()}
                disabled={dismissMutation.isPending}
                className="h-5 w-5 rounded flex items-center justify-center text-[#5C5F73] hover:text-[#F0F0F5] transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full mb-4" style={{ background: "rgba(94,106,210,0.15)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%`, background: "#5E6AD2" }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-1">
            {STEPS.map((step) => {
              const done = completed[step.key];
              return (
                <div
                  key={step.key}
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-[8px] transition-colors",
                    done ? "opacity-60" : "hover:bg-white/[0.02]"
                  )}
                >
                  {/* Completion circle */}
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full shrink-0 flex items-center justify-center transition-all duration-200",
                      done
                        ? "bg-[#5E6AD2]"
                        : "border-[1.5px] border-[#2A2D3A]"
                    )}
                  >
                    {done && <Check className="h-3 w-3 text-white" />}
                  </div>

                  {/* Title */}
                  <span
                    className={cn(
                      "flex-1 text-[13px]",
                      done ? "line-through text-[#5C5F73]" : "text-[#F0F0F5]"
                    )}
                  >
                    {step.title}
                  </span>

                  {/* Action button (only on incomplete) */}
                  {!done && (
                    <Link
                      to={step.href as any}
                      className="h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-[rgba(94,106,210,0.12)] rounded-[6px] transition-colors border border-white/6 shrink-0"
                    >
                      {step.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dismiss link */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => dismissMutation.mutate()}
              disabled={dismissMutation.isPending}
              className="text-[11px] text-[#5C5F73] hover:text-[#8B8FA8] transition-colors cursor-pointer"
            >
              Dismiss checklist
            </button>
          </div>
        </>
      )}
    </div>
  );
}
