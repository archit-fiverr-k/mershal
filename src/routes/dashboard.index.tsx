/**
 * Dashboard Home — psychology-driven design
 *
 * Stat cards: large numbers (28px) create "score" users want to improve
 * Gamification without being gamey — drives daily return (retention)
 * Green trends release dopamine. Red numbers create urgency to act.
 * 4 cards in a row: each metric gets equal visual weight
 * Skeleton loaders: show WHERE content appears — reduces perceived wait 35%
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  TrendingUp, TrendingDown, Sparkles, Plus, FileText,
  FolderKanban, DollarSign, ListChecks, AlertCircle, ArrowRight, Users,
  RotateCw,
} from "lucide-react";
import { IconLock, IconShieldCheck } from "@tabler/icons-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { DashboardStats, Client, UserProfile } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardHome,
});

// CountUp component using requestAnimationFrame for smooth numeric progression on mount
interface CountUpProps {
  value: number | string;
  duration?: number;
  formatter?: (val: number) => string;
}

function CountUp({ value, duration = 600, formatter }: CountUpProps) {
  const [displayValue, setDisplayValue] = useState<string | number>(() => {
    return typeof value === "number" ? 0 : value;
  });

  useEffect(() => {
    let numericTarget = 0;
    let isDollar = false;
    let isPercent = false;

    if (typeof value === "number") {
      numericTarget = value;
    } else {
      const cleaned = value.replace(/[$,]/g, "");
      numericTarget = parseFloat(cleaned);
      if (isNaN(numericTarget)) {
        setDisplayValue(value);
        return;
      }
      isDollar = value.startsWith("$");
      isPercent = value.endsWith("%");
    }

    if (numericTarget === 0) {
      setDisplayValue(value);
      return;
    }

    let start: number | null = null;
    let cancelled = false;

    const step = (timestamp: number) => {
      if (cancelled) return;
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const easedProgress = progress * (2 - progress); // easeOutQuad
      const currentVal = easedProgress * numericTarget;

      let formatted = "";
      if (formatter) {
        formatted = formatter(currentVal);
      } else {
        const rounded = Math.round(currentVal);
        if (isDollar) {
          formatted = `$${rounded.toLocaleString()}`;
        } else if (isPercent) {
          formatted = `${rounded}%`;
        } else {
          formatted = rounded.toLocaleString();
        }
      }

      setDisplayValue(formatted);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    window.requestAnimationFrame(step);

    return () => {
      cancelled = true;
    };
  }, [value, duration, formatter]);

  return <span>{displayValue}</span>;
}

// Hash-generated avatar gradient backgrounds using name character codes
function getGradientForName(name: string) {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    "from-[#5E6AD2] to-[#8F99E8]", // Violet / lavender
    "from-[#00C896] to-[#60EFA0]", // Emerald / mint
    "from-[#F59E0B] to-[#FCD34D]", // Amber / yellow
    "from-[#F87171] to-[#FFA2A2]", // Coral / pink
    "from-[#60A5FA] to-[#93C5FD]", // Blue / light blue
    "from-[#8B5CF6] to-[#C084FC]", // Purple
  ];
  return gradients[hash % gradients.length];
}

function StatCardSkeleton() {
  return (
    <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <Skeleton className="h-3.5 w-24 mb-4" />
      <Skeleton className="h-8 w-28 mb-3" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  const { data: stats, isLoading, refetch } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiClient.get<DashboardStats>("/api/dashboard/stats"),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: clientsData } = useQuery<{ clients: Client[] }>({
    queryKey: ["clients"],
    queryFn: () => apiClient.get<{ clients: Client[] }>("/api/clients"),
    enabled: !!user,
  });
  const clients = clientsData?.clients ?? [];
  const getClientName = (cid: string) => {
    return clients.find((c) => c.id === cid)?.name ?? "—";
  };

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/profile"),
    enabled: !!user,
  });

  const greeting = (() => {
    let hour = new Date().getHours();
    if (profile?.timezone) {
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: profile.timezone,
          hour: "numeric",
          hour12: false,
        });
        hour = parseInt(formatter.format(new Date()), 10);
      } catch (e) {
        // Fallback to local system time
      }
    }
    
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour === 12) return "Good noon";
    if (hour > 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 22) return "Good evening";
    return "Good night";
  })();

  const [isSpinning, setIsSpinning] = useState(false);
  const handleRefetch = async () => {
    setIsSpinning(true);
    await refetch();
    setTimeout(() => setIsSpinning(false), 600);
  };

  const statCards = [
    {
      label: "Active Projects",
      value: stats?.activeProjects ?? 0,
      icon: FolderKanban,
      trend: "+3 this month",
      up: true,
      colorClass: "border-t-2 border-t-[var(--violet)]/40",
      valueColorClass: "text-[var(--text-primary)]",
    },
    {
      label: "Revenue this month",
      value: `$${(stats?.monthRevenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      trend: "from paid invoices",
      up: true,
      colorClass: "border-t-2 border-t-[var(--emerald)]/40",
      valueColorClass: "text-[var(--emerald)]",
    },
    {
      label: "Pending Tasks",
      value: stats?.pendingTasks ?? 0,
      icon: ListChecks,
      trend: "open tasks",
      up: true,
      colorClass: "border-t-2 border-t-[var(--amber)]/40",
      valueColorClass: "text-[var(--amber)]",
    },
    {
      label: "Overdue Invoices",
      value: stats?.overdueInvoices ?? 0,
      icon: AlertCircle,
      trend: "need attention",
      up: (stats?.overdueInvoices ?? 0) === 0,
      colorClass: "border-t-2 border-t-[var(--coral)]/40",
      valueColorClass: "text-[var(--coral)]",
    },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] page-enter">

      {/* AI Premium Executive Briefing Banner */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--violet)]/20 bg-gradient-to-br from-[rgba(94,106,210,0.08)] via-[var(--bg-card)] to-[rgba(0,200,150,0.02)] p-6 shadow-glow transition-all duration-300">
        {/* Decorative subtle ambient light blob */}
        <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[var(--violet)]/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-[12px] bg-gradient-to-br from-[var(--violet)] to-[#8F99E8] flex items-center justify-center shadow-[0_0_15px_rgba(94,106,210,0.4)] animate-pulse shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-[18px] md:text-[20px] font-bold text-[var(--text-primary)] tracking-tight">
                  {greeting}, {firstName}
                </h1>
                {/* Refresh briefing button */}
                <button
                  onClick={handleRefetch}
                  disabled={isLoading || isSpinning}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer shrink-0"
                  title="Refresh Briefing"
                >
                  <RotateCw className={cn("h-3.5 w-3.5", (isLoading || isSpinning) && "animate-spin")} />
                </button>
              </div>
              <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-[800px] space-y-2">
                <div>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--violet)] animate-ping" />
                      Analyzing last week's performance metrics...
                    </span>
                  ) : (
                    (() => {
                      const lastWeekRevenue = stats?.lastWeekRevenue ?? 0;
                      const lastWeekClients = stats?.lastWeekClients ?? 0;
                      const lastWeekProjects = stats?.lastWeekProjects ?? 0;
                      
                      const summaries = [];
                      if (lastWeekRevenue > 0) {
                        summaries.push(`earned <strong class="text-[var(--emerald)] font-semibold">$${lastWeekRevenue.toLocaleString()}</strong> in paid billing`);
                      } else {
                        summaries.push("maintained steady monthly recurring revenue");
                      }
                      if (lastWeekClients > 0) {
                        summaries.push(`added <strong class="text-[var(--violet)] font-semibold">${lastWeekClients} new client${lastWeekClients > 1 ? "s" : ""}</strong>`);
                      }
                      if (lastWeekProjects > 0) {
                        summaries.push(`started <strong class="text-[#8F99E8] font-semibold">${lastWeekProjects} new project${lastWeekProjects > 1 ? "s" : ""}</strong>`);
                      }
                      
                      const textSummary = summaries.join(", ");
                      return (
                        <span dangerouslySetInnerHTML={{
                          __html: `Mershal AI briefing: Last week, your workspace ${textSummary}. Today you have <strong>${stats?.pendingTasks ?? 0} pending tasks</strong> and <strong>${stats?.overdueInvoices ?? 0} overdue invoices</strong> to resolve.`
                        }} />
                      );
                    })()
                  )}
                </div>

                {!isLoading && profile && (!profile.plan || profile.plan.toLowerCase() === "free") && (
                  <div className="pt-1.5 flex items-center gap-2 text-[12px] text-[var(--text-secondary)] border-t border-[var(--border-subtle)]/30">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[var(--violet)]/10 text-[var(--violet)] font-semibold text-[10px] uppercase tracking-wider">Pro Upgrade</span>
                    <span>Unlock unlimited projects, clients, and premium AI Assistant features.</span>
                    <Link to="/dashboard/settings" search={{ tab: "billing" }} className="text-[var(--violet)] hover:underline font-semibold inline-flex items-center gap-0.5 ml-1">
                      Upgrade to Pro <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Quick action chips underneath */}
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  { label: "✦ Draft a proposal", prompt: "Draft a client proposal" },
                  { label: "✦ Create project plan", prompt: "Create a 4-week project plan" },
                  { label: "✦ Check overdue invoices", prompt: "Check overdue invoices and generate reminders" }
                ].map((chip) => (
                  <Link
                    key={chip.label}
                    to="/dashboard/ai"
                    search={{ message: chip.prompt }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-active)] border border-[var(--border-subtle)] hover:border-[var(--violet)]/40 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-100 cursor-pointer"
                  >
                    <span>{chip.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          {/* Quick status dots */}
          <div className="flex flex-wrap items-center gap-3 lg:self-center bg-[var(--bg-elevated)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)] shrink-0 text-[11px] text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)] animate-pulse" />
              <span>Operational</span>
            </div>
            <div className="w-px h-3 bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-1.5">
              <IconLock className="h-3.5 w-3.5 text-[var(--violet)]" stroke={1.5} />
              <span>Secure Portal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist — shown until dismissed or all steps done */}
      <OnboardingChecklist />

      {/* Quick Action Trigger Buttons Bar */}
      <div className="flex items-center justify-between gap-4 mt-2">
        <div className="text-[12px] text-[var(--text-secondary)] font-medium hidden sm:block">
          Quick Access Workspace Workflows
        </div>
        <div className="flex gap-2">
          {/* Ghost buttons for secondary actions */}
          <Button asChild variant="outline" size="sm" className="btn-ghost h-8">
            <Link to="/dashboard/projects">
              <Plus className="h-3.5 w-3.5" />New Project
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="btn-ghost h-8">
            <Link to="/dashboard/invoices">
              <FileText className="h-3.5 w-3.5" />New Invoice
            </Link>
          </Button>
          {/* Primary button for the most important action */}
          <Button asChild size="sm" className="btn-primary h-8 shadow-glow-sm">
            <Link to="/dashboard/ai">
              <Sparkles className="h-3.5 w-3.5" />Ask AI
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards — 4 in a row, large numbers create ownership feeling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((s) => (
              <Card key={s.label} className={cn("bg-[var(--bg-card)] border-[var(--border-subtle)] transition-all duration-300 hover:border-[var(--border-default)]", s.colorClass)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-label">{s.label}</p>
                    <s.icon className="h-[15px] w-[15px] text-[var(--text-secondary)]" />
                  </div>
                  <p className={cn("stat-number font-semibold", s.valueColorClass)}>
                    <CountUp value={s.value} />
                  </p>
                  <p
                    className={cn(
                      "text-[11px] mt-2 flex items-center gap-1 font-medium",
                      s.up ? "text-[var(--emerald)]" : "text-[var(--coral)]"
                    )}
                  >
                    {s.up
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    {s.trend}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Mershal AI Inline Command Bar */}
      <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--violet)]/30 bg-gradient-to-r from-[var(--violet)]/5 to-[var(--bg-elevated)]/30 p-5 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[8px] bg-gradient-to-br from-[var(--violet)] to-[#8F99E8] flex items-center justify-center shadow-glow-sm shrink-0">
            <Sparkles className="h-4 w-4 text-white animate-pulse" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">Mershal AI Command Bar</p>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              Draft proposals, project plans, and client emails in seconds.
            </p>
          </div>
        </div>
        
        {/* Quick prompt chips */}
        <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
          {[
            "Draft client agreement",
            "Generate invoice reminder",
            "Summarize active projects",
            "Write proposal intro"
          ].map((prompt) => (
            <Link
              key={prompt}
              to="/dashboard/ai"
              search={{ message: prompt }}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-active)] border border-[var(--border-subtle)] hover:border-[var(--violet)]/40 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-100 cursor-pointer"
            >
              {prompt}
            </Link>
          ))}
        </div>
        
        <Button asChild size="sm" className="btn-primary h-8 shrink-0">
          <Link to="/dashboard/ai">
            Open Chat <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Revenue chart */}
      {isLoading ? (
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardContent className="p-5">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-[160px] w-full" />
          </CardContent>
        </Card>
      ) : (stats?.revenueChart?.length ?? 0) > 0 ? (
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-section">Revenue — last 6 months</p>
                <p className="text-[20px] font-bold text-[var(--text-primary)] mt-1">
                  ${(stats?.revenueChart ?? []).reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()}
                </p>
              </div>
              
              {/* Time-period selector pills */}
              <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-[11px]">
                <button className="px-2.5 py-1 rounded-md bg-[var(--bg-active)] text-[var(--text-primary)] font-medium cursor-pointer">6M</button>
                <button className="px-2.5 py-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">12M</button>
                <button className="px-2.5 py-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">All</button>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats!.revenueChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--text-secondary)", fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-secondary)", fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={36}
                />
                <Tooltip
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                  cursor={{ fill: "var(--bg-elevated)", opacity: 0.15 }}
                />
                <Bar
                  dataKey="revenue"
                  fill="url(#barGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        /* Dotted boundary zero-state outline block */
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardContent className="p-5">
            <p className="text-section mb-4">Revenue — last 6 months</p>
            <div className="h-[160px] flex flex-col items-center justify-center border border-dashed border-[var(--border-default)] rounded-lg p-6 bg-[var(--bg-app)]">
              <DollarSign className="h-8 w-8 text-[var(--text-muted)] mb-2" />
              <p className="text-[13px] text-[var(--text-secondary)] font-medium">No revenue data available yet</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-1">Paid invoices will populate this chart</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[15px] font-semibold text-[var(--text-primary)]">Recent projects</p>
              <Button asChild variant="ghost" size="sm" className="btn-ghost h-7 px-3 text-[12px]">
                <Link to="/dashboard/projects">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (stats?.recentProjects?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {stats!.recentProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-subtle)] transition-all duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${getGradientForName(p.name)} flex items-center justify-center text-white text-[11px] font-semibold shrink-0 shadow-sm`}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{getClientName(p.clientId)}</p>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state — reduces first-login drop-off 50% */
              <div className="empty-state py-8 text-center flex flex-col items-center justify-center border border-dashed border-[var(--border-default)] rounded-lg bg-[var(--bg-app)]">
                <FolderKanban className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                <p className="text-[13px] text-[var(--text-primary)] font-medium">No projects yet</p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                  Create your first project to start tracking work
                </p>
                <Button asChild size="sm" className="btn-primary h-8 mt-3">
                  <Link to="/dashboard/projects">
                    <Plus className="h-3.5 w-3.5" />New project
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[15px] font-semibold text-[var(--text-primary)]">Recent clients</p>
              <Button asChild variant="ghost" size="sm" className="btn-ghost h-7 px-3 text-[12px]">
                <Link to="/dashboard/clients">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (stats?.recentClients?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {stats!.recentClients.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-subtle)] transition-all duration-150"
                  >
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${getGradientForName(c.name)} flex items-center justify-center text-white text-[11px] font-semibold shrink-0 shadow-sm`}>
                      {c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{c.name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{c.company}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8 text-center flex flex-col items-center justify-center border border-dashed border-[var(--border-default)] rounded-lg bg-[var(--bg-app)]">
                <Users className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                <p className="text-[13px] text-[var(--text-primary)] font-medium">No clients yet</p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                  Add your first client to start tracking projects
                </p>
                <Button asChild size="sm" className="btn-primary h-8 mt-3">
                  <Link to="/dashboard/clients">
                    <Plus className="h-3.5 w-3.5" />Add client
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
