import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Search, Mail, Building2, Phone, Globe, Trash2, Users, Bell, Sparkles, MessageSquare, Calendar, ChevronRight, Download, FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Client, UserProfile, Project, Invoice } from "@/lib/types";
import { AIInlineButton } from "@/components/ui/ai-inline-button";
import { Whiteboard } from "@/components/whiteboard";

export const Route = createFileRoute("/dashboard/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientsPage,
});

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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

function ClientCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
      <Skeleton className="h-12 w-full" />
      <div className="p-4 relative">
        <div className="-mt-8 mb-3">
          <Skeleton className="h-12 w-12 rounded-full border-2 border-[var(--bg-card)]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="h-px bg-[var(--border-subtle)]/60 my-3" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-6 w-full rounded" />
          <Skeleton className="h-6 w-full rounded" />
          <Skeleton className="h-6 w-full rounded" />
        </div>
      </div>
    </div>
  );
}

function ClientsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Client | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", company: "", phone: "", website: "", notes: "",
  });

  const { data: subscription } = useQuery<{
    plan: string;
    subscriptionStatus: string;
  }>({
    queryKey: ["subscription"],
    queryFn: () => apiClient.get("/api/billing/subscription"),
    enabled: !!user,
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const { getIdToken } = await import("@/lib/firebase/auth");
      const token = await getIdToken();
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID 
        })
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<"details" | "chat" | "timeline" | "whiteboard">("details");
  const [chatInput, setChatInput] = useState("");
  const sheetMessagesEndRef = useRef<HTMLDivElement>(null);

  const [clientOnline, setClientOnline] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        new Notification("Notifications Enabled!", {
          body: "You'll be notified when you receive new messages from your clients.",
        });
      }
    } catch (err) {
      console.error("Error requesting notifications:", err);
    }
  };

  const { data: portalData } = useQuery<{
    client?: any;
    messages: any[];
  }>({
    queryKey: ["portal-messages", active?.id],
    queryFn: () => apiClient.get<any>(`/api/portal/${active!.id}`),
    enabled: !!active,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const messagesList = portalData?.messages ?? [];

  // Timeline query — fetches client activity timeline events
  const { data: timelineData } = useQuery<{ events: any[] }>({
    queryKey: ["client-timeline", active?.id],
    queryFn: () => apiClient.get<{ events: any[] }>(`/api/clients/${active!.id}/timeline`),
    enabled: !!active && activeTab === "timeline",
    staleTime: 30_000,
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/profile"),
    enabled: !!user,
    staleTime: 60_000,
  });
  const isPro = profile?.plan === "pro";

  // Fetch projects and invoices to build quick metric summaries for client cards
  const { data: projectsData } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => apiClient.get<{ projects: Project[] }>("/api/projects"),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const { data: invoicesData } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["invoices"],
    queryFn: () => apiClient.get<{ invoices: Invoice[] }>("/api/invoices"),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const projects = projectsData?.projects ?? [];
  const invoices = invoicesData?.invoices ?? [];

  // Report presence as agency & get client presence status
  useEffect(() => {
    if (!active) return;
    const activeId = active.id;
    let activePresence = true;
    async function reportPresence() {
      try {
        const res = await apiClient.post<{
          success: boolean;
          lastClientActiveAt?: { seconds: number };
          lastAgencyActiveAt?: { seconds: number };
        }>(`/api/portal/${activeId}/presence`, { role: "agency" });
        
        if (activePresence && res.lastClientActiveAt) {
          const clientLastActive = res.lastClientActiveAt.seconds * 1000;
          const now = Date.now();
          setClientOnline(now - clientLastActive < 20000);
        }
      } catch (err) {
        console.error(err);
      }
    }

    reportPresence();
    const interval = setInterval(reportPresence, 8000);
    return () => {
      activePresence = false;
      clearInterval(interval);
    };
  }, [active?.id]);

  // Track message count to show notifications
  const prevMessagesLength = useRef(messagesList.length);
  useEffect(() => {
    if (messagesList.length > prevMessagesLength.current) {
      const lastMsg = messagesList[messagesList.length - 1];
      if (lastMsg && lastMsg.fromClient && notificationPermission === "granted") {
        new Notification(`New message from ${lastMsg.senderName || "Client"}`, {
          body: lastMsg.content,
        });
      }
    }
    prevMessagesLength.current = messagesList.length;
  }, [messagesList, notificationPermission]);

  useEffect(() => {
    if (activeTab === "chat") {
      sheetMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesList, activeTab]);

  const sendMsgMutation = useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/api/portal/${active!.id}/message`, {
        content,
        senderName: user?.displayName || "Agency",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-messages", active?.id] });
      setChatInput("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Couldn't send message.");
    },
  });

  const { data, isLoading } = useQuery<{ clients: Client[] }>({
    queryKey: ["clients"],
    queryFn: () =>
      apiClient.get<{ clients: Client[] }>("/api/clients"),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      apiClient.post<Client & { emailStatus: "sent" | "failed" | "skipped"; emailError: string | null }>("/api/clients", { ...body, status: "active" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setShowCreate(false);
      setForm({ name: "", email: "", company: "", phone: "", website: "", notes: "" });
      
      if (data.emailStatus === "sent") {
        toast.success("Client added and welcome email sent");
      } else if (data.emailStatus === "failed") {
        toast.warning(`Client added, but welcome email failed: ${data.emailError || "Unknown error"}`);
      } else {
        toast.success("Client added (welcome email skipped)");
      }
    },
    onError: (err: any) => toast.error(err.message || "Couldn't add client. Try again."),
  });

  const sendWelcomeMutation = useMutation({
    mutationFn: (clientId: string) =>
      apiClient.post(`/api/clients/${clientId}/send-welcome`),
    onSuccess: () => {
      toast.success("Welcome email sent to client");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-timeline", active?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send welcome email");
    },
  });

  const regeneratePortalMutation = useMutation({
    mutationFn: (clientId: string) =>
      apiClient.post<{ portalToken: string; portalPassword: string }>((`/api/clients/${clientId}/regenerate-portal`)),
    onSuccess: (data) => {
      toast.success("Portal link regenerated and copied to clipboard!");
      if (active) {
        setActive({ ...active, portalToken: data.portalToken, portalPassword: data.portalPassword });
      }
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-timeline", active?.id] });
      const appUrl = window.location.origin;
      const portalUrl = `${appUrl}/portal/${data.portalToken}`;
      navigator.clipboard.writeText(portalUrl);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to regenerate portal link");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setActive(null);
      toast.success("Client deleted");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't delete client. Try again."),
  });

  const rawClients = data?.clients ?? [];
  const clients = rawClients.filter((c) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(searchLower) ||
      c.company?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower)
    );
  });

  // Keep active client state synced with updates in the query clients list
  useEffect(() => {
    if (active) {
      const fresh = clients.find((c) => c.id === active.id);
      if (fresh && (fresh.portalToken !== active.portalToken || fresh.portalPassword !== active.portalPassword || fresh.status !== active.status)) {
        setActive(fresh);
      }
    }
  }, [clients, active]);

  return (
    <div className="space-y-6 max-w-[1200px] page-enter">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page-title">Clients</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            {isLoading ? "Loading…" : `${clients.length} client${clients.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => {
          if (subscription?.plan !== "pro" && clients.length >= 1) {
            setShowUpgradeModal(true);
          } else {
            setShowCreate(true);
          }
        }} className="btn-primary shadow-glow-sm">
          <Plus className="h-3.5 w-3.5" />Add client
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-[320px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
        <Input
          placeholder="Search clients…"
          className="pl-9 bg-zinc-950 border-zinc-900 text-white focus-visible:ring-zinc-800 placeholder:text-zinc-650"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <ClientCardSkeleton key={i} />)}
        </div>
      ) : clients.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]/50 max-w-lg mx-auto my-12 space-y-4">
          <div className="h-12 w-12 rounded-xl bg-[var(--violet)]/10 flex items-center justify-center border border-[var(--violet)]/20 animate-pulse">
            <Users className="h-6 w-6 text-[var(--violet)]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[15px] font-medium text-[var(--text-primary)]">No clients yet</h3>
            <p className="text-[13px] text-[var(--text-muted)] max-w-sm">
              Add your clients to collaborate, send secure portals, share invoices, and track work progress.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Button onClick={() => {
              if (subscription?.plan !== "pro" && clients.length >= 1) {
                setShowUpgradeModal(true);
              } else {
                setShowCreate(true);
              }
            }} size="sm" className="btn-primary shadow-glow-sm">
              <Plus className="h-3.5 w-3.5" />Add your first client
            </Button>
            <Button asChild variant="outline" size="sm" className="btn-ghost">
              <Link
                to="/dashboard/ai"
                search={{ message: "Help me write a professional client welcome email draft" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--violet)]" />
                Draft with AI
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const gradientClass = getGradientForName(c.name);
            const cProjects = projects.filter((p) => p.clientId === c.id);
            const cProjectsCount = cProjects.filter((p) => p.status !== "completed" && p.status !== "cancelled").length;
            const cInvoices = invoices.filter((i) => i.clientId === c.id);
            const cInvoicesCount = cInvoices.length;
            const cRevenue = cInvoices.filter((i) => i.status === "paid").reduce((sum, inv) => sum + (inv.total ?? 0), 0);

            return (
              <div
                key={c.id}
                className="rounded-xl border border-zinc-900 bg-zinc-950 overflow-hidden relative group hover:border-zinc-800 hover:bg-zinc-900/20 transition-all duration-200 hover:-translate-y-0.5 shadow-sm cursor-pointer"
                onClick={() => setActive(c)}
              >
                {/* Modern metallic banner */}
                <div className="h-12 w-full bg-gradient-to-r from-zinc-800/80 to-zinc-950/90 border-b border-zinc-900/60 relative shrink-0">
                  <div className="absolute right-3 top-2.5">
                    <StatusBadge status={c.status} />
                  </div>
                </div>

                <div className="p-4 relative flex flex-col flex-1">
                  {/* Overlapping Initials Avatar */}
                  <div className="-mt-9 mb-2.5 flex items-end justify-between">
                    <Avatar className="h-12 w-12 border-2 border-zinc-950 group-hover:border-zinc-900 shadow-md shrink-0 transition-colors duration-150">
                      <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 text-white text-[13px] font-semibold uppercase">
                        {getInitials(c.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Action buttons (only visible on card hover) */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                      {c.portalToken && (
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/portal/${c.portalToken}`;
                            window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          className="h-7 w-7 rounded-md border border-zinc-900 bg-zinc-950 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-800 transition-colors duration-150 cursor-pointer"
                          title="Open Client Portal"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActive(c);
                          setActiveTab("chat");
                        }}
                        className="h-7 w-7 rounded-md border border-zinc-900 bg-zinc-950 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-800 transition-colors duration-150 cursor-pointer"
                        title="Send Message"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${c.name}? This cannot be undone.`)) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        className="h-7 w-7 rounded-md border border-red-950/20 bg-red-950/10 hover:bg-red-900/20 flex items-center justify-center text-red-400 hover:text-red-300 hover:border-red-900/30 transition-colors duration-150 cursor-pointer"
                        title="Delete Client"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="space-y-1 mt-1">
                    <h3 className="text-[14px] font-semibold text-white group-hover:text-zinc-200 transition-colors duration-150 truncate">
                      {c.name}
                    </h3>
                    <p className="text-[12px] text-zinc-400 truncate">
                      {c.company || "Independent"}
                    </p>
                    {c.email && (
                      <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5 mt-1">
                        <Mail className="h-3.5 w-3.5 text-zinc-650" /> {c.email}
                      </p>
                    )}
                  </div>

                  {/* Visual Divider */}
                  <div className="h-px bg-zinc-900/60 my-3.5" />

                  {/* Quick metric summaries */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div>
                      <p className="text-zinc-500 font-medium">Projects</p>
                      <p className="text-[13px] font-semibold text-white mt-0.5">
                        {cProjectsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 font-medium">Invoices</p>
                      <p className="text-[13px] font-semibold text-white mt-0.5">
                        {cInvoicesCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 font-medium">Paid</p>
                      <p className="text-[13px] font-semibold text-zinc-200 mt-0.5 truncate">
                        {cRevenue > 0 ? `$${cRevenue.toLocaleString()}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client detail sheet */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-[440px] bg-zinc-950 border-l border-zinc-900 p-0 flex flex-col h-full text-white">
          {active && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-6 py-5 border-b border-zinc-900/60 flex items-center justify-between shrink-0 bg-zinc-900/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0 shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-900 text-white text-[12px] font-semibold uppercase">
                      {getInitials(active.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="text-[15px] font-semibold text-white truncate">
                      {active.name}
                    </SheetTitle>
                    <SheetDescription className="text-[12px] text-zinc-400 truncate">
                      {active.company || "Independent"}
                    </SheetDescription>
                  </div>
                </div>
                <StatusBadge status={active.status} />
              </div>

              {/* Tab Switcher */}
              <div className="flex px-6 py-2.5 border-b border-zinc-900/65 bg-zinc-900/10 gap-1.5">
                {(["details", "timeline", "chat", "whiteboard"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-1.5 text-[12px] font-medium rounded-md transition-all text-center cursor-pointer capitalize",
                      activeTab === tab
                        ? "bg-zinc-900 text-white border border-zinc-800 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    )}
                  >
                    {tab === "chat" ? (
                      <span className="flex items-center justify-center gap-1.5">
                        Chat
                        {messagesList.length > 0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)] animate-pulse" />
                        )}
                      </span>
                    ) : tab}
                  </button>
                ))}
              </div>

              {/* Timeline Tab */}
              {activeTab === "timeline" && (
                <div className="flex-1 overflow-y-auto p-6">
                  {!timelineData ? (
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="h-7 w-7 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] shrink-0" />
                          <div className="flex-1 pt-1 space-y-1.5">
                            <div className="h-3 w-28 bg-[var(--bg-card)] rounded" />
                            <div className="h-2.5 w-40 bg-[var(--bg-card)] rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : timelineData.events.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
                      <p className="text-[13px] text-[var(--text-muted)] font-medium">No activity yet</p>
                      <p className="text-[11px] text-[var(--text-muted)]/70">Events will appear as you work with this client</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Vertical connector line */}
                      <div className="absolute left-[13px] top-7 bottom-0 w-px bg-[var(--border-subtle)]/80" />
                      <div className="space-y-5">
                        {timelineData.events.map((event: any, i: number) => {
                          const iconColors: Record<string, string> = {
                            client_created:   "#5E6AD2",
                            project_created:  "#CC8A2A",
                            invoice_sent:     "#8B8FA8",
                            invoice_paid:     "#00C896",
                            portal_accessed:  "#5E6AD2",
                            client_message:   "#8F99E8",
                            project_completed:"#00C896",
                            proposal_sent:    "#CC8A2A",
                            proposal_accepted:"#00C896",
                            proposal_declined:"#CC4444",
                            portal_link_shared:"#5E6AD2",
                          };
                          const color = iconColors[event.type] ?? "#5C5F73";
                          const ts = event.createdAt?.seconds
                            ? new Date(event.createdAt.seconds * 1000)
                            : event.createdAt ? new Date(event.createdAt) : null;
                          const relativeTime = ts ? (() => {
                            const diff = Date.now() - ts.getTime();
                            if (diff < 60000) return "just now";
                            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                            if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
                            return ts.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          })() : "";
                          return (
                            <div key={event.id ?? i} className="flex gap-3 relative z-10 animate-fade-in">
                              <div
                                className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center border-2 bg-[var(--bg-card)]"
                                style={{ borderColor: `${color}40` }}
                              >
                                <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: color }} />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{event.title}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] shrink-0">{relativeTime}</p>
                                </div>
                                {event.description && (
                                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{event.description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === "chat" && (
                <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-card)]/10">
                  {/* Client Presence Indicator */}
                  <div className="flex items-center justify-between px-6 py-2.5 bg-[var(--bg-card)]/40 border-b border-[var(--border-subtle)]/60 shrink-0">
                    <span className="text-[11px] text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full transition-all duration-300", clientOnline ? "bg-[var(--emerald)] animate-pulse" : "bg-[#5C5F73]")} />
                      {clientOnline ? `${active.name} is online` : `${active.name} is offline`}
                    </span>
                  </div>

                  {notificationPermission === "default" && (
                    <div className="mx-6 mt-3 bg-[var(--violet)]/10 border border-[var(--violet)]/20 p-2.5 rounded-lg flex items-center justify-between gap-3 text-[11px] shrink-0">
                      <div className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-[var(--violet)] shrink-0" />
                        <span className="text-[var(--text-secondary)]">Enable alerts for new client messages?</span>
                      </div>
                      <Button size="sm" className="h-6 text-[10px] px-2 py-0 btn-primary shadow-glow-sm" onClick={requestNotificationPermission}>
                        Allow
                      </Button>
                    </div>
                  )}

                  {/* Messages list */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messagesList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Secure Thread</p>
                        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed max-w-[220px]">No messages exchanged yet. Send a message to start the conversation!</p>
                      </div>
                    ) : (
                      messagesList.map((m: any) => {
                        const isOwner = !m.fromClient;
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "flex flex-col max-w-[80%] rounded-xl p-3 text-[13px] leading-relaxed shadow-sm animate-fade-in",
                              isOwner
                                ? "bg-white text-black ml-auto rounded-tr-none font-medium"
                                : "bg-zinc-900 text-zinc-100 rounded-tl-none border border-zinc-800"
                            )}
                          >
                            <p className="text-[9px] font-bold opacity-75 uppercase mb-0.5 tracking-wider">
                              {m.senderName}
                            </p>
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>
                        );
                      })
                    )}
                    <div ref={sheetMessagesEndRef} />
                  </div>

                  {/* Input panel */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatInput.trim()) return;
                      sendMsgMutation.mutate(chatInput.trim());
                    }}
                    className="p-3 border-t border-[var(--border-subtle)]/60 bg-[var(--bg-card)]"
                  >
                    <div className="flex gap-2">
                      <Input
                        placeholder="Reply to client..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={sendMsgMutation.isPending}
                        className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[12px] h-9 text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]/50"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        loading={sendMsgMutation.isPending}
                        className="btn-primary h-9 px-4 shadow-glow-sm"
                      >
                        Send
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Whiteboard Tab */}
              {activeTab === "whiteboard" && (
                <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-4 overflow-y-auto">
                  <Whiteboard clientId={active.id} />
                </div>
              )}

              {/* Details Tab */}
              {activeTab === "details" && (
                <>
                  <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    {[
                      { icon: Mail, value: active.email, label: "Email Address" },
                      { icon: Building2, value: active.company, label: "Company / Org" },
                      { icon: Phone, value: active.phone, label: "Phone Number" },
                      { icon: Globe, value: active.website, label: "Website Link" },
                    ].filter((r) => r.value).map(({ icon: Icon, value, label }) => (
                      <div
                        key={value}
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm hover:border-[var(--border-default)] transition-colors duration-120"
                      >
                        <Icon className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{label}</p>
                          <p className="text-[13px] text-[var(--text-primary)] font-medium truncate mt-0.5">{value}</p>
                        </div>
                      </div>
                    ))}

                    {active.notes && (
                      <div className="px-3.5 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm">
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">Internal Notes</p>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{active.notes}</p>
                      </div>
                    )}

                    {/* Shared Files Section */}
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3 mt-2 shadow-sm">
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/40 pb-2">
                        <h4 className="text-[11px] font-bold text-[var(--text-primary)] tracking-wider uppercase">Shared Files</h4>
                        <span className="text-[9px] font-semibold text-[var(--violet)] bg-[var(--violet)]/10 px-2 py-0.5 rounded-full border border-[var(--violet)]/20 shadow-sm">
                          Client Uploads
                        </span>
                      </div>

                      <div className="space-y-2">
                        {portalData?.client?.files && portalData.client.files.length > 0 ? (
                          portalData.client.files.map((file: any, idx: number) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between bg-[var(--bg-elevated)]/60 p-2.5 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-all duration-100"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-7 w-7 rounded bg-[var(--violet)]/10 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-[var(--violet)]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12.5px] font-medium text-[var(--text-primary)] truncate max-w-[150px] sm:max-w-[200px]">{file.name}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{file.size} · {file.date}</p>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 p-0 text-[var(--text-secondary)] hover:text-[var(--violet)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-md cursor-pointer"
                                onClick={() => toast.success(`Downloading "${file.name}"...`)}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="border border-dashed border-[var(--border-subtle)] rounded-lg p-6 text-center">
                            <FileText className="h-7 w-7 text-[var(--text-muted)] mx-auto mb-2" />
                            <p className="text-xs text-[var(--text-muted)]">No shared files yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Portal Access Card */}
                    <div className="rounded-xl border border-[var(--border-subtle)]/80 bg-[var(--bg-card)] p-4 space-y-3 mt-2 shadow-sm">
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/40 pb-2">
                        <h4 className="text-[11px] font-bold text-[var(--text-primary)] tracking-wider uppercase">Portal Access</h4>
                        <span className="text-[9px] font-semibold text-[var(--violet)] bg-[var(--violet)]/10 px-2 py-0.5 rounded-full border border-[var(--violet)]/20 shadow-sm">
                          Private Space
                        </span>
                      </div>
                      
                      {active.portalToken ? (
                        <div className="space-y-2.5">
                          <div className="flex gap-1.5">
                            <Input
                              readOnly
                              value={`${window.location.origin}/portal/${active.portalToken}`}
                              className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[11px] h-8 font-mono select-all flex-1 text-[var(--text-primary)] focus-visible:ring-0"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[11px] px-2.5 border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] cursor-pointer"
                              onClick={() => {
                                const url = `${window.location.origin}/portal/${active.portalToken}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Copied to clipboard!");
                              }}
                            >
                              Copy
                            </Button>
                          </div>

                          <div className="flex items-center justify-between text-[11.5px] px-2 py-1.5 bg-[var(--bg-elevated)]/40 rounded-lg border border-[var(--border-subtle)]/60">
                            <span className="text-[var(--text-secondary)] font-medium">Portal Password</span>
                            <span className="font-mono font-bold text-[var(--violet)] bg-[var(--violet)]/15 px-2.5 py-0.5 rounded border border-[var(--violet)]/25 select-all">
                              {active.portalPassword || "Not generated"}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-[11px] h-8 border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                              asChild
                            >
                              <a
                                href={`/portal/${active.portalToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Preview
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              loading={sendWelcomeMutation.isPending}
                              onClick={() => sendWelcomeMutation.mutate(active.id)}
                              className="flex-1 text-[11px] h-8 text-[var(--violet)] border-[var(--violet)]/20 hover:bg-[var(--violet)]/5 cursor-pointer"
                            >
                              Resend Welcome
                            </Button>
                          </div>

                          <div className="border-t border-[var(--border-subtle)]/40 pt-2 flex items-center justify-between">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Secure access token active
                            </span>
                            <button
                              disabled={regeneratePortalMutation.isPending}
                              onClick={() => {
                                if (confirm("Regenerate portal link? The client's old link will stop working immediately.")) {
                                  regeneratePortalMutation.mutate(active.id);
                                }
                              }}
                              className="text-[10px] font-semibold text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                            >
                              {regeneratePortalMutation.isPending ? "Regenerating..." : "Regenerate Link"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 py-1">
                          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                            No portal link has been generated yet for this client.
                          </p>
                          <Button
                            size="sm"
                            loading={sendWelcomeMutation.isPending}
                            onClick={() => sendWelcomeMutation.mutate(active.id)}
                            className="w-full text-[11px] h-8 btn-primary shadow-glow-sm cursor-pointer"
                          >
                            Generate Link &amp; Send Welcome Email
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 border-t border-[var(--border-subtle)]/60 flex gap-2 bg-[var(--bg-card)]/50 shrink-0">
                    <Button 
                      asChild
                      className="flex-1 btn-primary shadow-glow-sm justify-center cursor-pointer"
                    >
                      {active.portalToken ? (
                        <a href={`/portal/${active.portalToken}`} target="_blank" rel="noopener noreferrer">
                          Open Client Portal
                        </a>
                      ) : (
                        <Link to="/portal/$clientId" params={{ clientId: active.id }}>
                          Open Client Portal
                        </Link>
                      )}
                    </Button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${active.name}? This cannot be undone.`)) {
                          deleteMutation.mutate(active.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-9 w-9 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors duration-120 cursor-pointer"
                      title="Delete Client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-xl max-w-[440px] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text-primary)]">
              Add client
            </DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the form below to add a new client to your workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "name", label: "Full name", placeholder: "Jane Doe", required: true },
                { key: "email", label: "Email", placeholder: "jane@studio.com", required: true, type: "email" },
                { key: "company", label: "Company", placeholder: "Studio Inc." },
                { key: "phone", label: "Phone", placeholder: "+1 555 000 0000" },
              ].map(({ key, label, placeholder, required, type }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</label>
                  <Input
                    type={type ?? "text"}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]/50"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Notes</label>
                <AIInlineButton
                  context="client_notes"
                  currentValue={form.notes}
                  onResult={(text) => setForm((f) => ({ ...f, notes: text }))}
                  placeholder="Summarize client notes"
                  isPro={isPro}
                />
              </div>
              <Input
                placeholder="Any notes about this client…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]/50"
              />
            </div>
            <DialogFooter className="gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="btn-ghost">
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending} className="btn-primary shadow-glow-sm">
                Add client
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Upgrade Limit Dialog */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-xl max-w-[420px] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text-primary)]">
              You have reached the free plan limit
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[var(--text-secondary)] mt-2">
              Upgrade to Pro for unlimited clients.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              loading={isUpgrading}
              className="w-full sm:w-auto bg-[#5E6AD2] hover:bg-[#4d59be] text-white font-medium shadow-glow-sm"
            >
              Upgrade now — $19/month
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
