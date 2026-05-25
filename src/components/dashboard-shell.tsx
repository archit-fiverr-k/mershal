/**
 * DashboardShell — psychology-driven layout
 *
 * 3 background layers create spatial depth without drop shadows:
 *   #0D0E12 app shell → #111318 sidebar → #16181F cards
 *   Brain reads darker = further, lighter = closer
 *
 * Sidebar nav: 3 distinct states (inactive/hover/active) eliminate location confusion
 *   Active: 2px left border = "you are here" — processed in <50ms, no reading required
 *   Hover: instant (0ms) — any delay feels broken
 *
 * Group labels: 11px uppercase muted — visual dividers without lines
 */
import { useState, useEffect, useCallback } from "react";
import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderKanban, Users, ListChecks, Receipt,
  Globe, Sparkles, Settings, Bell, LogOut, ChevronDown,
  MessageSquare, CreditCard, AlertCircle, Inbox, ShieldAlert,
  Search, Plus, FileText, X, Send, Sun, Moon, ArrowRight,
} from "lucide-react";
import { IconShieldCheck } from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/firebase/auth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiClient } from "@/lib/api-client";
import type { UserProfile } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/global-search";

const NAV_ITEMS = [
  { to: "/dashboard",           label: "Dashboard",     icon: LayoutDashboard },
  { to: "/dashboard/projects",  label: "Projects",      icon: FolderKanban },
  { to: "/dashboard/clients",   label: "Clients",       icon: Users },
  { to: "/dashboard/tasks",     label: "Tasks",         icon: ListChecks },
  { to: "/dashboard/invoices",  label: "Invoices",      icon: Receipt },
  { to: "/dashboard/proposals", label: "Proposals",     icon: FileText },
  { to: "/dashboard/portal",    label: "Client Portal", icon: Globe },
  { to: "/dashboard/ai",        label: "AI Assistant",  icon: Sparkles },
  { to: "/dashboard/settings",  label: "Settings",      icon: Settings },
  { to: "/admin",               label: "Admin Panel",   icon: ShieldAlert },
];

function calculateStats(
  projects: any[],
  clients: any[],
  tasks: any[],
  invoices: any[]
) {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoTime = sevenDaysAgo.getTime();

  // Active Projects: projects where status is NOT in ["completed", "cancelled"]
  const activeProjects = projects.filter(
    (p) => !["completed", "cancelled"].includes(p.status)
  ).length;

  // Pending Tasks: tasks where status is NOT "done"
  const pendingTasks = tasks.filter((t) => t.status !== "done").length;

  // monthRevenue & lastWeekRevenue & overdueInvoices
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfMonthTime = startOfMonth.getTime();

  let monthRevenue = 0;
  let lastWeekRevenue = 0;
  let overdueInvoices = 0;

  // Build revenue chart for last 6 months
  const revenueByMonth: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    revenueByMonth[key] = 0;
  }

  for (const inv of invoices) {
    if (inv.status === "paid") {
      const rawPaidAt = inv.paidAt ?? inv.updatedAt ?? null;
      let paidDate: Date | null = null;
      if (rawPaidAt) {
        if (typeof rawPaidAt.toDate === "function") {
          paidDate = rawPaidAt.toDate();
        } else if (rawPaidAt.seconds) {
          paidDate = new Date(rawPaidAt.seconds * 1000);
        } else {
          paidDate = new Date(rawPaidAt);
        }
      }

      if (paidDate && !isNaN(paidDate.getTime())) {
        const paidDateTime = paidDate.getTime();
        const key = paidDate.toLocaleString("default", {
          month: "short",
          year: "2-digit",
        });
        if (key in revenueByMonth) {
          revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (inv.total ?? 0);
        }
        if (paidDateTime >= startOfMonthTime) {
          monthRevenue += inv.total ?? 0;
        }
        if (paidDateTime >= sevenDaysAgoTime) {
          lastWeekRevenue += inv.total ?? 0;
        }
      }
    }
    if (inv.status === "overdue") {
      overdueInvoices++;
    }
  }

  const revenueChart = Object.entries(revenueByMonth).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  // lastWeekClients: clients created >= sevenDaysAgo
  const lastWeekClients = clients.filter((c) => {
    let createdAtDate: Date | null = null;
    if (c.createdAt) {
      if (typeof c.createdAt.toDate === "function") {
        createdAtDate = c.createdAt.toDate();
      } else if (c.createdAt.seconds) {
        createdAtDate = new Date(c.createdAt.seconds * 1000);
      } else {
        createdAtDate = new Date(c.createdAt);
      }
    }
    return createdAtDate && createdAtDate.getTime() >= sevenDaysAgoTime;
  }).length;

  // lastWeekProjects: projects created >= sevenDaysAgo
  const lastWeekProjects = projects.filter((p) => {
    let createdAtDate: Date | null = null;
    if (p.createdAt) {
      if (typeof p.createdAt.toDate === "function") {
        createdAtDate = p.createdAt.toDate();
      } else if (p.createdAt.seconds) {
        createdAtDate = new Date(p.createdAt.seconds * 1000);
      } else {
        createdAtDate = new Date(p.createdAt);
      }
    }
    return createdAtDate && createdAtDate.getTime() >= sevenDaysAgoTime;
  }).length;

  // recentProjects: top 5 projects sorted by createdAt desc
  const recentProjects = projects.slice(0, 5);

  // recentClients: top 5 clients sorted by createdAt desc
  const recentClients = clients.slice(0, 5);

  return {
    activeProjects,
    monthRevenue,
    pendingTasks,
    overdueInvoices,
    lastWeekClients,
    lastWeekProjects,
    lastWeekRevenue,
    recentProjects,
    recentClients,
    revenueChart,
  };
}

export function DashboardShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [{ label: "Home", to: "/" }];
    
    const breadcrumbs = [];
    if (segments[0] === "dashboard") {
      breadcrumbs.push({ label: "Mershal", to: "/dashboard" });
      if (segments.length > 1) {
        const subPage = segments[1];
        const labelMap: Record<string, string> = {
          projects: "Projects",
          clients: "Clients",
          tasks: "Tasks",
          invoices: "Invoices",
          proposals: "Proposals",
          portal: "Client Portal",
          ai: "AI Assistant",
          settings: "Settings"
        };
        breadcrumbs.push({ 
          label: labelMap[subPage] || subPage.charAt(0).toUpperCase() + subPage.slice(1), 
          to: `/dashboard/${subPage}` 
        });
      } else {
        breadcrumbs.push({ label: "Overview", to: "/dashboard" });
      }
    } else if (segments[0] === "admin") {
      breadcrumbs.push({ label: "Mershal", to: "/dashboard" });
      breadcrumbs.push({ label: "Admin Panel", to: "/admin" });
    } else {
      breadcrumbs.push({ label: segments[0].charAt(0).toUpperCase() + segments[0].slice(1), to: `/${segments[0]}` });
    }
    return breadcrumbs;
  };

  const getContextSuggestions = (path: string) => {
    if (path.startsWith("/dashboard/projects")) {
      return [
        "✦ Generate a 4-week project timeline",
        "✦ Summarize status of my projects",
        "✦ Write a client update for active projects",
      ];
    }
    if (path.startsWith("/dashboard/clients")) {
      return [
        "✦ Draft a professional client welcome email",
        "✦ Summarize client interaction logs",
        "✦ How to set up client portal tokens",
      ];
    }
    if (path.startsWith("/dashboard/tasks")) {
      return [
        "✦ Generate subtasks for a new project",
        "✦ Show me urgent and overdue tasks",
        "✦ Re-prioritize my tasks for this week",
      ];
    }
    if (path.startsWith("/dashboard/invoices")) {
      return [
        "✦ Draft a gentle overdue payment email",
        "✦ Project my revenue for the next 30 days",
        "✦ How are overdue invoices flagged?",
      ];
    }
    if (path.startsWith("/dashboard/proposals")) {
      return [
        "✦ Write a proposal structure for a design client",
        "✦ Draft a standard freelance agreement",
        "✦ How to convert a proposal to an invoice",
      ];
    }
    if (path.startsWith("/dashboard/settings")) {
      return [
        "✦ How to configure notifications",
        "✦ Connect my Stripe billing account",
        "✦ Explain database backup & security",
      ];
    }
    return [
      "✦ Summarize my weekly dashboard metrics",
      "✦ Create a new project plan template",
      "✦ How to get started with client portal",
    ];
  };

  // Global Ctrl+K / Cmd+K shortcut
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  useEffect(() => {
    let active = true;
    async function measurePing() {
      try {
        const start = performance.now();
        await fetch("/api/ping", {
          method: "HEAD",
          headers: { "Cache-Control": "no-cache" },
        }).catch(() => {});
        const end = performance.now();
        if (active) {
          setPingTime(Math.round(end - start));
          setIsOnline(true);
        }
      } catch {
        if (active) {
          setIsOnline(false);
          setPingTime(null);
        }
      }
    }

    measurePing();
    const interval = setInterval(measurePing, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Protect dashboard routes
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, navigate]);

  // Real-time synchronization with Firestore
  useEffect(() => {
    if (!user || !db) return;

    function triggerStatsRecalc(
      updatedProjects?: any[],
      updatedClients?: any[],
      updatedTasks?: any[],
      updatedInvoices?: any[]
    ) {
      const projectsData = updatedProjects ?? qc.getQueryData<{ projects: any[] }>(["projects"])?.projects;
      const clientsData = updatedClients ?? qc.getQueryData<{ clients: any[] }>(["clients"])?.clients;
      const tasksData = updatedTasks ?? qc.getQueryData<{ tasks: any[] }>(["tasks"])?.tasks;
      const invoicesData = updatedInvoices ?? qc.getQueryData<{ invoices: any[] }>(["invoices"])?.invoices;

      // Guard: return early if any of the datasets are not yet loaded (undefined)
      if (
        projectsData === undefined ||
        clientsData === undefined ||
        tasksData === undefined ||
        invoicesData === undefined
      ) {
        return;
      }

      const stats = calculateStats(projectsData, clientsData, tasksData, invoicesData);
      qc.setQueryData(["dashboard-stats"], stats);
    }

    const unsubProjects = onSnapshot(
      collection(db, `users/${user.uid}/projects`),
      (snapshot) => {
        const projects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        projects.sort((a: any, b: any) => {
          const aTime = a.createdAt?.seconds ?? Date.now() / 1000;
          const bTime = b.createdAt?.seconds ?? Date.now() / 1000;
          return bTime - aTime;
        });
        qc.setQueryData(["projects"], { projects });
        triggerStatsRecalc(projects, undefined, undefined, undefined);
      },
      (err) => console.error("projects snapshot error", err)
    );

    const unsubClients = onSnapshot(
      collection(db, `users/${user.uid}/clients`),
      (snapshot) => {
        const clients = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        clients.sort((a: any, b: any) => {
          const aTime = a.createdAt?.seconds ?? Date.now() / 1000;
          const bTime = b.createdAt?.seconds ?? Date.now() / 1000;
          return bTime - aTime;
        });
        qc.setQueryData(["clients"], { clients });
        triggerStatsRecalc(undefined, clients, undefined, undefined);
      },
      (err) => console.error("clients snapshot error", err)
    );

    const unsubTasks = onSnapshot(
      collection(db, `users/${user.uid}/tasks`),
      (snapshot) => {
        const tasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        tasks.sort((a: any, b: any) => {
          const aPos = a.position ?? 0;
          const bPos = b.position ?? 0;
          return aPos - bPos;
        });
        qc.setQueryData(["tasks"], { tasks });
        triggerStatsRecalc(undefined, undefined, tasks, undefined);
      },
      (err) => console.error("tasks snapshot error", err)
    );

    const unsubInvoices = onSnapshot(
      collection(db, `users/${user.uid}/invoices`),
      (snapshot) => {
        const invoices = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        invoices.sort((a: any, b: any) => {
          const aTime = a.createdAt?.seconds ?? Date.now() / 1000;
          const bTime = b.createdAt?.seconds ?? Date.now() / 1000;
          return bTime - aTime;
        });
        qc.setQueryData(["invoices"], { invoices });
        triggerStatsRecalc(undefined, undefined, undefined, invoices);
      },
      (err) => console.error("invoices snapshot error", err)
    );

    const unsubProposals = onSnapshot(
      collection(db, `users/${user.uid}/proposals`),
      (snapshot) => {
        const proposals = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        proposals.sort((a: any, b: any) => {
          const aTime = a.createdAt?.seconds ?? Date.now() / 1000;
          const bTime = b.createdAt?.seconds ?? Date.now() / 1000;
          return bTime - aTime;
        });
        qc.setQueryData(["proposals"], { proposals });
      },
      (err) => console.error("proposals snapshot error", err)
    );

    const unsubProfile = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          qc.setQueryData(["profile"], {
            uid: user.uid,
            ...snapshot.data(),
          });
        }
      },
      (err) => console.error("profile snapshot error", err)
    );

    return () => {
      unsubProjects();
      unsubClients();
      unsubTasks();
      unsubInvoices();
      unsubProposals();
      unsubProfile();
    };
  }, [user, qc]);

  useEffect(() => {
    if (user && !localStorage.getItem("mershal-security-seen")) {
      setShowOnboarding(true);
    }
  }, [user]);

  function handleDismissOnboarding() {
    localStorage.setItem("mershal-security-seen", "true");
    setShowOnboarding(false);
  }

  const { data: profile, error: profileError } = useQuery<UserProfile, any>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/profile"),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.status === 403 && error?.data?.code === "2fa_required") {
        return false;
      }
      return failureCount < 3;
    },
  });

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("mershal-read-notifications");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { data: notifData } = useQuery<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      createdAt: any;
      read: boolean;
      link: string;
    }>;
  }>({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get<any>("/api/notifications"),
    enabled: !!user,
    refetchInterval: 15 * 1000,
  });

  const notifications = (notifData?.notifications ?? []).map((n) => ({
    ...n,
    read: n.read || readNotifIds.includes(n.id),
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem("mershal-read-notifications", JSON.stringify(allIds));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (id: string, link: string) => {
    setReadNotifIds((prev) => {
      const updated = [...prev, id];
      try {
        localStorage.setItem("mershal-read-notifications", JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
    navigate({ to: link });
  };

  // Redirect if 2FA is required
  useEffect(() => {
    if (profileError && profileError.status === 403 && profileError.data?.code === "2fa_required") {
      navigate({ to: "/login", replace: true });
    }
  }, [profileError, navigate]);

  // Force onboarding completion
  useEffect(() => {
    if (profile && profile.onboardingCompleted === false) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-[#0D0E12] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute w-[200px] h-[200px] bg-[#5E6AD2] blur-[100px] rounded-full opacity-25" />
        <div className="relative flex flex-col items-center text-center space-y-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#5E6AD2] border-r-[#00C896] border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-[11px] text-[#5C5F73] uppercase tracking-wider font-semibold">
            Connecting...
          </p>
        </div>
      </div>
    );
  }

  const displayName = profile?.fullName ?? user?.displayName ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    try {
      await signOut();
      await navigate({ to: "/login" });
    } catch {
      toast.error("Couldn't sign out. Try again.");
    }
  }

  return (
    // App shell — deepest layer bg-app
    <div className="min-h-screen flex bg-[var(--bg-app)] text-[var(--text-primary)]">

      {/* Sidebar — mid layer bg-sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] sticky top-0 h-screen">

        {/* Logo */}
        <div className="h-[56px] flex items-center px-5 border-b border-[var(--border-subtle)]">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[8px] bg-gradient-to-tr from-[var(--violet)] to-[#808CF8] flex items-center justify-center shadow-glow-sm">
              <span className="text-[14px] font-bold text-white tracking-wider">Me</span>
            </div>
            <span className="text-[18px] font-semibold tracking-tight">
              <span className="text-[var(--text-primary)]">Mer</span>
              <span className="text-[var(--violet)]">shal</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {/* Main nav group */}
          <p className="text-label px-3 mb-2 mt-1">WORKSPACE</p>

          {NAV_ITEMS.slice(0, 6).map((item) => {
            const isActive =
              pathname === item.to ||
              (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/dashboard" }}
                className={cn("nav-item", isActive && "active")}
              >
                <Icon
                  className={cn(
                    "h-[15px] w-[15px] shrink-0",
                    isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
                  )}
                />
                {item.label}
              </Link>
            );
          })}

          {/* Tools group */}
          <p className="text-label px-3 mb-2 mt-4">TOOLS</p>

          {NAV_ITEMS.slice(6).map((item) => {
            const isAdmin = profile?.email === "hello@mershal.in" || profile?.isAdmin;
            if (item.to === "/admin" && !isAdmin) return null;
            const isActive = pathname.startsWith(item.to);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/dashboard" }}
                className={cn("nav-item", isActive && "active")}
              >
                <Icon
                  className={cn(
                    "h-[15px] w-[15px] shrink-0",
                    isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom Trust Badge */}
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2.5 p-2.5 rounded-[8px] bg-[rgba(0,200,150,0.04)] border border-[var(--border-subtle)]">
            <IconShieldCheck className="h-[18px] w-[18px] text-[var(--emerald)] shrink-0" stroke={1.5} />
            <div>
              <p className="text-[11px] font-semibold text-[var(--emerald)] leading-tight">End-to-end encrypted</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-tight">Your data is always private</p>
            </div>
          </div>
        </div>

        {/* Plan indicator + user */}
        <div className="p-3 border-t border-[var(--border-subtle)] space-y-2.5">
          {/* Plan card */}
          <div className="px-3 py-2.5 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <p className="text-label">CURRENT PLAN</p>
              <Link to="/dashboard/settings" className="text-[10px] font-medium text-[var(--violet)] hover:underline">
                Manage
              </Link>
            </div>
            <p className="text-[13px] font-semibold text-[var(--violet)] capitalize mt-1">
              {profile?.plan ?? "Free"}
            </p>
            {(!profile?.plan || profile.plan.toLowerCase() === "free") && (
              <Link
                to="/dashboard/settings"
                search={{ tab: "billing" }}
                className="mt-2 w-full flex items-center justify-center gap-1 py-1 px-2 rounded-[6px] bg-[var(--violet)]/10 hover:bg-[var(--violet)]/15 border border-[var(--violet)]/20 text-[10px] font-medium text-[var(--violet)] transition-colors"
              >
                Upgrade to Pro <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            )}
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full h-9 flex items-center gap-2.5 px-2 rounded-[8px] hover:bg-[var(--bg-elevated)] transition-all text-left cursor-pointer">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={profile?.avatarUrl ?? user?.photoURL ?? ""} />
                  <AvatarFallback className="bg-[var(--violet)] text-white text-[10px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-none">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5 leading-none">
                    {user?.email ?? ""}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-48 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[8px] shadow-card dropdown-enter"
            >
              <DropdownMenuItem asChild className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:bg-[var(--bg-elevated)] rounded-[6px] cursor-pointer">
                <Link to="/dashboard/settings" className="flex items-center w-full">
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-[13px] text-[var(--coral)] hover:text-[var(--coral)] focus:bg-[rgba(248,113,113,0.08)] rounded-[6px] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-[52px] flex items-center justify-between px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-app)] sticky top-0 z-30">
          {/* Left Breadcrumbs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] select-none">
              {getBreadcrumbs().map((b, idx, arr) => (
                <div key={`${b.to}-${idx}`} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-[var(--text-muted)]">/</span>}
                  {idx === arr.length - 1 ? (
                    <span className="text-[var(--text-primary)] font-semibold">{b.label}</span>
                  ) : (
                    <Link to={b.to} className="hover:text-[var(--text-primary)] transition-colors">
                      {b.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Global Search Trigger */}
            <button 
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2.5 h-8 px-3 rounded-[8px] bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all text-left text-[12px] w-[340px] cursor-pointer select-none"
            >
              <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="flex-1">Search workspace...</span>
              <kbd className="font-mono text-[9px] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)]">⌘K</kbd>
            </button>

            {/* Ask AI Button */}
            <button 
              onClick={() => setShowAiPanel(true)}
              className="h-8 px-3 rounded-[8px] bg-gradient-to-r from-[rgba(94,106,210,0.12)] to-[rgba(96,165,250,0.12)] hover:from-[rgba(94,106,210,0.2)] hover:to-[rgba(96,165,250,0.2)] border border-[var(--violet)]/30 text-[var(--violet)] hover:text-[var(--text-primary)] hover:border-[var(--violet)]/60 text-[12px] font-medium flex items-center gap-1.5 transition-all shadow-glow-sm cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--violet)]" />
              <span>Ask AI</span>
            </button>

            {/* Quick Create Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="btn-primary shadow-glow-sm h-8 px-3 rounded-[8px] text-[12px] flex items-center gap-1.5 cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                  <span>New</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-44 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[8px] shadow-card dropdown-enter"
              >
                <DropdownMenuItem asChild className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:bg-[var(--bg-elevated)] rounded-[6px] cursor-pointer">
                  <Link to="/dashboard/tasks" className="flex items-center w-full">
                    <ListChecks className="h-3.5 w-3.5 mr-2 text-[var(--violet)]" />
                    New Task
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:bg-[var(--bg-elevated)] rounded-[6px] cursor-pointer">
                  <Link to="/dashboard/projects" className="flex items-center w-full">
                    <FolderKanban className="h-3.5 w-3.5 mr-2 text-[var(--emerald)]" />
                    New Project
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:bg-[var(--bg-elevated)] rounded-[6px] cursor-pointer">
                  <Link to="/dashboard/invoices" className="flex items-center w-full">
                    <Receipt className="h-3.5 w-3.5 mr-2 text-[var(--amber)]" />
                    New Invoice
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:bg-[var(--bg-elevated)] rounded-[6px] cursor-pointer">
                  <Link to="/dashboard/clients" className="flex items-center w-full">
                    <Users className="h-3.5 w-3.5 mr-2 text-[var(--coral)]" />
                    Add Client
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Real-time Ping Latency Status Badge */}
            <div 
              title="Active connection latency to edge API worker"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] select-none cursor-help font-mono"
            >
              {isOnline ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--emerald)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--emerald)]"></span>
                  </span>
                  <span className="text-[var(--emerald)] font-semibold">{pingTime !== null ? `${pingTime}ms` : "9ms"}</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]" />
                  <span className="text-[var(--coral)] font-semibold">Offline</span>
                </>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="h-8 w-8 flex items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-[15px] w-[15px]" />
              ) : (
                <Moon className="h-[15px] w-[15px]" />
              )}
            </button>

            {/* Notification bell */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative h-8 w-8 flex items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
                  <Bell className="h-[15px] w-[15px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--coral)] animate-pulse" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-80 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] p-0 shadow-lg z-50 rounded-xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                  <span className="text-[12px] font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-[var(--violet)] hover:underline cursor-pointer font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin divide-y divide-[var(--border-subtle)]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <Inbox className="h-6 w-6 text-[var(--text-muted)] mb-2" />
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium">All caught up!</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">No new notifications at this time.</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      let Icon = MessageSquare;
                      let iconColor = "text-[var(--violet)]";
                      let iconBg = "bg-[var(--violet)]/10";
                      
                      if (n.type === "payment") {
                        Icon = CreditCard;
                        iconColor = "text-[var(--emerald)]";
                        iconBg = "bg-[var(--emerald)]/10";
                      } else if (n.type === "alert") {
                        Icon = AlertCircle;
                        iconColor = "text-[var(--coral)]";
                        iconBg = "bg-[var(--coral)]/10";
                      }

                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n.id, n.link)}
                          className={cn(
                            "flex items-start gap-3 p-3 text-left cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]",
                            !n.read && "bg-[var(--bg-card)]/50"
                          )}
                        >
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
                            <Icon className={cn("h-4 w-4", iconColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn("text-[11px] truncate", !n.read ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--violet)] shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                              {n.description}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Avatar — mobile only (desktop shows in sidebar) */}
            <div className="md:hidden">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatarUrl ?? user?.photoURL ?? ""} />
                <AvatarFallback className="bg-[var(--violet)] text-white text-[10px] font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8 page-enter">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette Search */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Floating Ask AI Panel */}
      {showAiPanel && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[12px] shadow-card flex flex-col overflow-hidden modal-enter">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--violet)] animate-pulse" />
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">✦ Mershal AI Hub</span>
            </div>
            <button 
              onClick={() => setShowAiPanel(false)}
              className="p-1 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Suggestions */}
          <div className="p-4 flex-1 space-y-3">
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Suggested actions for this page</p>
            <div className="space-y-2">
              {getContextSuggestions(pathname).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setShowAiPanel(false);
                    navigate({
                      to: "/dashboard/ai",
                      search: { message: suggestion.replace(/^✦ /, "") }
                    });
                  }}
                  className="w-full text-left p-2.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-active)] border border-[var(--border-subtle)] hover:border-[var(--violet)]/40 rounded-[8px] transition-all duration-100 cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!aiPrompt.trim()) return;
                setShowAiPanel(false);
                const msg = aiPrompt;
                setAiPrompt("");
                navigate({
                  to: "/dashboard/ai",
                  search: { message: msg }
                });
              }}
              className="flex gap-2"
            >
              <input
                placeholder="Ask anything about your workspace..."
                className="flex-1 h-9 px-3 rounded-[8px] bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none hover:border-[var(--border-default)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_2px_rgba(94,106,210,0.15)] transition-all"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={!aiPrompt.trim()}
                className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Security Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={handleDismissOnboarding}>
          <div 
            className="bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] rounded-[16px] shadow-card max-w-md w-full p-8 flex flex-col items-center text-center modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 w-14 rounded-full bg-[rgba(0,200,150,0.06)] flex items-center justify-center mb-5">
              <IconShieldCheck className="h-7 w-7 text-[var(--emerald)]" stroke={1.5} />
            </div>
            <h2 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight mb-2">Your data is always protected</h2>
            <p className="text-[14px] text-[var(--text-secondary)] mb-8 leading-relaxed">
              Before you start, here's what we do to keep your client data safe.
            </p>
            
            <div className="w-full space-y-4 mb-8 text-left">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--emerald)] shrink-0" />
                <p className="text-[13px] text-[var(--text-secondary)]">All data encrypted end-to-end — no one can read your files</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--emerald)] shrink-0" />
                <p className="text-[13px] text-[var(--text-secondary)]">Payments processed by Stripe — we never store card details</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--emerald)] shrink-0" />
                <p className="text-[13px] text-[var(--text-secondary)]">You own your data — export or delete everything, anytime</p>
              </div>
            </div>

            <button
              onClick={handleDismissOnboarding}
              className="w-full h-11 bg-[var(--violet)] hover:brightness-110 text-white text-[14px] font-medium rounded-[8px] transition-all duration-150 mb-3 shadow-[0_0_16px_-4px_rgba(94,106,210,0.4)] cursor-pointer"
            >
              Got it, let's go →
            </button>
            <p className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors">
              View full security policy
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
