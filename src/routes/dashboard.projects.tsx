import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Kanban, List, FolderKanban, Trash2, Calendar, DollarSign, Tag, ArrowRight, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Project, Client, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AIInlineButton } from "@/components/ui/ai-inline-button";

export const Route = createFileRoute("/dashboard/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Projects,
});

type KanbanStatus = "planning" | "in_progress" | "review" | "completed";

const COLUMNS: { key: KanbanStatus; label: string }[] = [
  { key: "planning",    label: "Planning" },
  { key: "in_progress", label: "In progress" },
  { key: "review",      label: "Review" },
  { key: "completed",   label: "Completed" },
];

// Priority dot colors — visual hierarchy without text
const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-zinc-950 dark:bg-white shadow-sm dark:shadow-[0_0_8px_rgba(255,255,255,0.6)]",
  medium: "bg-zinc-500 dark:bg-zinc-400",
  low:    "bg-zinc-300 dark:bg-zinc-700",
};

// Hash-generated avatar gradient backgrounds using name character codes
function getGradientForName(name: string) {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    "from-zinc-700 to-zinc-900",
    "from-neutral-800 to-neutral-950",
    "from-zinc-800 to-zinc-950",
    "from-neutral-700 to-neutral-900",
  ];
  return gradients[hash % gradients.length];
}

function Projects() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
  const [form, setForm] = useState({
    name: "", clientId: "", description: "", priority: "medium", dueDate: "",
  });

  const { data: projectsData, isLoading } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => apiClient.get<{ projects: Project[] }>("/api/projects"),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const { data: clientsData } = useQuery<{ clients: Client[] }>({
    queryKey: ["clients"],
    queryFn: () => apiClient.get<{ clients: Client[] }>("/api/clients"),
    enabled: !!user,
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/profile"),
    enabled: !!user,
    staleTime: 60_000,
  });
  const isPro = profile?.plan === "pro";

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post<Project>("/api/projects", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowCreate(false);
      setForm({ name: "", clientId: "", description: "", priority: "medium", dueDate: "" });
      toast.success("Project created");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't create project. Try again."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/api/projects/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (err: any) => toast.error(err.message || "Couldn't update project. Try again."),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: any }) =>
      apiClient.patch(`/api/projects/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => toast.error(err.message || "Couldn't update project. Try again."),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProject(null);
      toast.success("Project deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't delete project. Try again."),
  });

  const projects = projectsData?.projects ?? [];
  const clients = clientsData?.clients ?? [];

  function getClientName(clientId: string) {
    return clients.find((c) => c.id === clientId)?.name ?? "—";
  }

  return (
    <div className="space-y-6 max-w-[1400px] page-enter">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page-title">Projects</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            {isLoading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* View toggle — ghost style signals "optional" */}
          <div className="flex rounded-lg border border-zinc-900 bg-zinc-950 p-0.5 shadow-sm">
            {(["kanban", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer",
                  view === v
                    ? "bg-zinc-900 text-white shadow-sm font-semibold"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {v === "kanban" ? <Kanban className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                {v === "kanban" ? "Kanban" : "List"}
              </button>
            ))}
          </div>
          <Button onClick={() => {
            if (subscription?.plan !== "pro" && projects.length >= 1) {
              setShowUpgradeModal(true);
            } else {
              setShowCreate(true);
            }
          }} className="btn-primary shadow-glow-sm">
            <Plus className="h-3.5 w-3.5" />New project
          </Button>
        </div>
      </div>

      {/* Loading skeletons — match the layout that will appear */}
      {isLoading ? (
        view === "kanban" ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => (
              <div key={col.key} className="space-y-3 bg-[var(--bg-sidebar)]/35 p-3 rounded-xl border border-[var(--border-subtle)]/50">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-28 w-full rounded-[12px]" />
                <Skeleton className="h-28 w-full rounded-[12px]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-[12px]" />
            ))}
          </div>
        )
      ) : projects.length === 0 ? (
        /* Empty state — CTA reduces first-login drop-off 50% */
        <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]/50 max-w-lg mx-auto my-12 space-y-4">
          <div className="h-12 w-12 rounded-xl bg-[var(--violet)]/10 flex items-center justify-center border border-[var(--violet)]/20">
            <FolderKanban className="h-6 w-6 text-[var(--violet)]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[15px] font-medium text-[var(--text-primary)]">No projects yet</h3>
            <p className="text-[13px] text-[var(--text-muted)] max-w-sm">
              Create your first project manually, or let Mershal AI assist you in drafting a tailored project plan.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Button onClick={() => {
              if (subscription?.plan !== "pro" && projects.length >= 1) {
                setShowUpgradeModal(true);
              } else {
                setShowCreate(true);
              }
            }} size="sm" className="btn-primary shadow-glow-sm">
              <Plus className="h-3.5 w-3.5" />Create first project
            </Button>
            <Button asChild variant="outline" size="sm" className="btn-ghost">
              <Link
                to="/dashboard/ai"
                search={{ message: "Help me create and map out a new freelance project project roadmap" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--violet)]" />
                Generate with AI
              </Link>
            </Button>
          </div>
        </div>
      ) : view === "kanban" ? (
        /* Kanban board */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = projects.filter((p) => p.status === col.key);
            return (
              <div key={col.key} className="bg-black/5 dark:bg-black/20 border border-zinc-200 dark:border-zinc-900/60 rounded-xl p-3 flex flex-col min-h-[450px]">
                {/* Column header */}
                <div className="flex items-center justify-between px-1 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={col.key} />
                    <span className="flex items-center justify-center text-[10px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 h-5 w-5 rounded-full shrink-0">
                      {items.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (subscription?.plan !== "pro" && projects.length >= 1) {
                        setShowUpgradeModal(true);
                      } else {
                        setShowCreate(true);
                      }
                    }}
                    className="text-zinc-500 hover:text-white transition-colors duration-150"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Cards — min height so empty columns have presence */}
                <div className="space-y-2.5 flex-1 overflow-y-auto min-h-[120px]">
                  {items.map((p) => {
                    const clientName = getClientName(p.clientId);
                    const clientInitials = clientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                    const gradientClass = getGradientForName(clientName);
                    return (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest("button") || target.closest("[role='combobox']")) {
                            return;
                          }
                          setSelectedProject(p);
                        }}
                        className="group rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug group-hover:text-zinc-650 dark:group-hover:text-zinc-300 transition-colors duration-150">
                            {p.name}
                          </p>
                          {/* Priority dot */}
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ring-2 ring-transparent group-hover:ring-white/10 transition-all duration-150",
                              PRIORITY_DOT[p.priority] ?? "bg-zinc-700",
                            )}
                          />
                        </div>
                        
                        {/* Client details with initials avatar */}
                        <div className="flex items-center gap-2 mb-3.5">
                          <div className={cn("h-5 w-5 rounded-full bg-gradient-to-br flex items-center justify-center text-[8px] font-semibold text-white shrink-0 shadow-sm", gradientClass)}>
                            {clientInitials}
                          </div>
                          <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                            {clientName}
                          </span>
                        </div>

                        {/* Inline status change */}
                        <Select
                          value={p.status}
                          onValueChange={(v) =>
                            updateStatusMutation.mutate({ id: p.id, status: v })
                          }
                        >
                          <SelectTrigger className="h-7 text-[11px] bg-zinc-100 dark:bg-zinc-900 border-zinc-250 dark:border-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-lg px-2 w-full hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors duration-150 focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-lg">
                            {COLUMNS.map((c) => (
                              <SelectItem key={c.key} value={c.key} className="text-[12px] focus:bg-[var(--bg-elevated)]">
                                {c.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="cancelled" className="text-[12px] focus:bg-[var(--bg-elevated)]">
                              Cancelled
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view - True Table Layout */
        <div className="rounded-xl border border-zinc-900 bg-zinc-950 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
             <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/80 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase sticky top-0 backdrop-blur-md z-10">
                   <th className="px-4 py-3 w-8 text-center">Priority</th>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {projects.map((p) => {
                  const clientName = getClientName(p.clientId);
                  const clientInitials = clientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                  const gradientClass = getGradientForName(clientName);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProject(p)}
                      className="group/row hover:bg-zinc-900/35 border-b border-zinc-900/40 transition-colors duration-150 cursor-pointer text-[13px] text-white"
                    >
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex justify-center">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full ring-2 ring-transparent group-hover/row:ring-[var(--border-default)]/20 transition-all duration-120",
                              PRIORITY_DOT[p.priority] ?? "bg-[#5C5F73]",
                            )}
                            title={`Priority: ${p.priority}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle font-medium truncate max-w-[240px]">
                        {p.name}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-5 w-5 rounded-full bg-gradient-to-br flex items-center justify-center text-[8px] font-semibold text-white shrink-0 shadow-sm", gradientClass)}>
                            {clientInitials}
                          </div>
                          <span className="truncate max-w-[150px]">{clientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right">
                        {/* Hover action buttons */}
                        <div className="inline-flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedProject(p)}
                            className="h-7 w-7 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors duration-120 cursor-pointer"
                            title="View Details"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this project? This will delete all tasks inside this project!")) {
                                deleteProjectMutation.mutate(p.id);
                              }
                            }}
                            className="h-7 w-7 rounded-md border border-red-500/10 bg-red-500/5 hover:bg-red-500/15 flex items-center justify-center text-red-400 hover:text-red-300 hover:border-red-500/20 transition-colors duration-120 cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-xl max-w-[440px] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text-primary)]">
              New project
            </DialogTitle>
            <DialogDescription className="sr-only">
              Fill in the form below to create a new project.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                ...form,
                status: "planning",
                budget: 0,
                dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
              });
            }}
          >
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">Project name</label>
              <Input
                placeholder="Brand identity refresh"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">Client</label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
              >
                <SelectTrigger className="h-9 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] rounded-lg focus:ring-0 text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors duration-120">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-lg">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-[13px] focus:bg-[var(--bg-elevated)]">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Priority</label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger className="h-9 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] rounded-lg focus:ring-0 text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors duration-120">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-lg">
                    <SelectItem value="high" className="text-[13px] focus:bg-[var(--bg-elevated)]">High</SelectItem>
                    <SelectItem value="medium" className="text-[13px] focus:bg-[var(--bg-elevated)]">Medium</SelectItem>
                    <SelectItem value="low" className="text-[13px] focus:bg-[var(--bg-elevated)]">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Due date</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="h-9 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Description</label>
                <AIInlineButton
                  context="project_description"
                  currentValue={form.description}
                  onResult={(text) => setForm((f) => ({ ...f, description: text }))}
                  placeholder="Generate project description"
                  isPro={isPro}
                />
              </div>
              <Input
                placeholder="Optional description…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]/50"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="btn-ghost">
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending} className="btn-primary shadow-glow-sm">
                Create project
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
              Upgrade to Pro for unlimited projects.
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

      {/* Project Details Drawer */}
      <Sheet open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <SheetContent className="w-full sm:max-w-[480px] bg-[var(--bg-sidebar)] border-l border-[var(--border-subtle)] p-0 flex flex-col h-full text-[var(--text-primary)]">
          {selectedProject && (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-[8px] bg-[var(--violet)]/10 flex items-center justify-center border border-[var(--violet)]/20 shadow-sm">
                    <FolderKanban className="h-4 w-4 text-[var(--violet)]" />
                  </div>
                  <span className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Project Details
                  </span>
                </div>
                
                {/* Inline Status Badge */}
                <Select
                  value={selectedProject.status}
                  onValueChange={(v) => {
                    updateProjectMutation.mutate({ id: selectedProject.id, status: v });
                    setSelectedProject((prev) => prev ? { ...prev, status: v as any } : null);
                  }}
                >
                  <SelectTrigger className="h-7 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[11px] font-medium rounded px-2.5 gap-1 focus:ring-0 w-28 hover:border-[var(--border-default)] transition-colors duration-120">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-lg">
                    {COLUMNS.map((col) => (
                      <SelectItem key={col.key} value={col.key} className="text-[12px] focus:bg-[var(--bg-elevated)]">
                        {col.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="cancelled" className="text-[12px] focus:bg-[var(--bg-elevated)]">
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Title */}
                <div className="space-y-1">
                  <input
                    type="text"
                    defaultValue={selectedProject.name}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && val !== selectedProject.name) {
                        updateProjectMutation.mutate({ id: selectedProject.id, name: val });
                        setSelectedProject((prev) => prev ? { ...prev, name: val } : null);
                      }
                    }}
                    className="w-full bg-transparent border-0 font-semibold text-lg text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:ring-0 focus:outline-none py-1 border-b border-transparent hover:border-[var(--border-subtle)] focus:border-[var(--violet)] transition-colors duration-120"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide px-1">
                    Project Title (Click to edit)
                  </p>
                      {/* Metadata Grid */}
                <div className="bg-black/35 border border-zinc-900 rounded-xl p-4 space-y-4 shadow-sm">
                  {/* Client Selector */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Client
                    </span>
                    <Select
                      value={selectedProject.clientId}
                      onValueChange={(v) => {
                        updateProjectMutation.mutate({ id: selectedProject.id, clientId: v });
                        setSelectedProject((prev) => prev ? { ...prev, clientId: v } : null);
                      }}
                    >
                      <SelectTrigger className="h-8 bg-zinc-950 border-zinc-900 text-[12.5px] rounded-lg focus:ring-0 text-white hover:border-zinc-800 transition-colors duration-150">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-lg">
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-[12.5px] focus:bg-[var(--bg-elevated)]">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority Selector */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Priority
                    </span>
                    <Select
                      value={selectedProject.priority}
                      onValueChange={(v) => {
                        updateProjectMutation.mutate({ id: selectedProject.id, priority: v });
                        setSelectedProject((prev) => prev ? { ...prev, priority: v as any } : null);
                      }}
                    >
                      <SelectTrigger className="h-8 bg-zinc-950 border-zinc-900 text-[12.5px] rounded-lg focus:ring-0 text-white hover:border-zinc-800 transition-colors duration-150">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-lg">
                        <SelectItem value="low" className="text-[12.5px] focus:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">Low</SelectItem>
                        <SelectItem value="medium" className="text-[12.5px] focus:bg-[var(--bg-elevated)] text-zinc-300">Medium</SelectItem>
                        <SelectItem value="high" className="text-[12.5px] focus:bg-[var(--bg-elevated)] text-white">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Date */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Start date
                    </span>
                    <Input
                      type="date"
                      defaultValue={
                        selectedProject.startDate 
                          ? new Date(
                              selectedProject.startDate.seconds 
                                ? selectedProject.startDate.seconds * 1000 
                                : (selectedProject.startDate as any)
                            ).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        const dateIso = val ? new Date(val).toISOString() : null;
                        updateProjectMutation.mutate({ id: selectedProject.id, startDate: dateIso });
                      }}
                      className="h-8 bg-zinc-950 border-zinc-900 text-[12.5px] rounded-lg text-white focus-visible:ring-1 focus-visible:ring-zinc-800 hover:border-zinc-800 transition-colors duration-150"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Due date
                    </span>
                    <Input
                      type="date"
                      defaultValue={
                        selectedProject.dueDate 
                          ? new Date(
                              selectedProject.dueDate.seconds 
                                ? selectedProject.dueDate.seconds * 1000 
                                : (selectedProject.dueDate as any)
                            ).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        const dateIso = val ? new Date(val).toISOString() : null;
                        updateProjectMutation.mutate({ id: selectedProject.id, dueDate: dateIso });
                      }}
                      className="h-8 bg-zinc-950 border-zinc-900 text-[12.5px] rounded-lg text-white focus-visible:ring-1 focus-visible:ring-zinc-800 hover:border-zinc-800 transition-colors duration-150"
                    />
                  </div>

                  {/* Budget */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Budget
                    </span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[12px] text-[var(--text-muted)]">$</span>
                      <Input
                        type="number"
                        defaultValue={selectedProject.budget || 0}
                        onBlur={(e) => {
                          const val = Number(e.target.value) || 0;
                          if (val !== selectedProject.budget) {
                            updateProjectMutation.mutate({ id: selectedProject.id, budget: val });
                            setSelectedProject((prev) => prev ? { ...prev, budget: val } : null);
                          }
                        }}
                        className="h-8 pl-6 bg-zinc-950 border-zinc-900 text-[12.5px] rounded-lg text-white focus-visible:ring-1 focus-visible:ring-zinc-800 hover:border-zinc-800 transition-colors duration-150"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider uppercase block">Description</label>
                  <textarea
                    placeholder="Add details, objective, or notes about this project..."
                    defaultValue={selectedProject.description || ""}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val !== selectedProject.description) {
                        updateProjectMutation.mutate({ id: selectedProject.id, description: val });
                        setSelectedProject((prev) => prev ? { ...prev, description: val } : null);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 text-[13px] leading-relaxed text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-800 hover:border-zinc-800 transition-colors duration-150 min-h-[120px] resize-y"
                  />
                </div>            </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="h-16 border-t border-[var(--border-subtle)]/60 px-6 flex items-center justify-between bg-[var(--bg-card)] shrink-0 animate-fade-in">
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this project? This will delete all tasks inside this project!")) {
                      deleteProjectMutation.mutate(selectedProject.id);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/10 text-[12px] font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-150 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Project
                </button>

                <Button asChild size="sm" className="btn-primary flex items-center gap-1.5 shadow-glow-sm">
                  <Link to={`/dashboard/tasks`} search={{ projectId: selectedProject.id }}>
                    Go to Project Tasks
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
