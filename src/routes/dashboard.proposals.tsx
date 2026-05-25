import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  FileText,
  Send,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Pencil,
  Clock,
  Receipt,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AIInlineButton } from "@/components/ui/ai-inline-button";

export const Route = createFileRoute("/dashboard/proposals")({
  head: () => ({
    meta: [
      { title: "Proposals — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProposalsPage,
});

type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "declined";

interface ProposalLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Proposal {
  id: string;
  clientId: string;
  title: string;
  intro: string;
  scope: string;
  timeline: string;
  terms: string;
  lineItems: ProposalLineItem[];
  total: number;
  status: ProposalStatus;
  validUntil: any;
  publicToken: string;
  createdAt: any;
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: "#5C5F73",
  sent: "#5E6AD2",
  viewed: "#CC8A2A",
  accepted: "#00C896",
  declined: "#CC4444",
};

const STATUS_CLASSES: Record<ProposalStatus, { text: string; bg: string; border: string }> = {
  draft: { text: "text-[var(--text-muted)]", bg: "bg-[var(--bg-card)]", border: "border-[var(--border-subtle)]" },
  sent: { text: "text-[var(--violet)]", bg: "bg-[var(--violet)]/[0.08]", border: "border-[var(--violet)]/20" },
  viewed: { text: "text-[var(--amber)]", bg: "bg-[var(--amber)]/[0.08]", border: "border-[var(--amber)]/20" },
  accepted: { text: "text-[var(--emerald)]", bg: "bg-[var(--emerald)]/[0.08]", border: "border-[var(--emerald)]/20" },
  declined: { text: "text-[var(--coral)]", bg: "bg-[var(--coral)]/[0.08]", border: "border-[var(--coral)]/20" },
};

function fmtDate(ts: any) {
  if (!ts) return "—";
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProposalsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const defaultForm = {
    clientId: "",
    title: "",
    intro: "",
    scope: "",
    timeline: "",
    terms: "",
    lineItems: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }] as ProposalLineItem[],
    total: 0,
    validUntil: "",
  };
  const [form, setForm] = useState(defaultForm);

  // Queries
  const { data: proposalsData, isLoading } = useQuery<{ proposals: Proposal[] }>({
    queryKey: ["proposals"],
    queryFn: () => apiClient.get<{ proposals: Proposal[] }>("/api/proposals"),
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: clientsData } = useQuery<{ clients: Client[] }>({
    queryKey: ["clients"],
    queryFn: () => apiClient.get<{ clients: Client[] }>("/api/clients"),
    enabled: !!user,
  });

  const { data: profile } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get("/api/profile"),
    enabled: !!user,
    staleTime: 60_000,
  });
  const isPro = profile?.plan === "pro";

  const proposals = proposalsData?.proposals ?? [];
  const clients = clientsData?.clients ?? [];

  const filtered = filterStatus === "all"
    ? proposals
    : proposals.filter((p) => p.status === filterStatus);

  const getClientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "Unknown client";

  // Line item helpers
  function updateLineItem(i: number, field: keyof ProposalLineItem, value: string | number) {
    setForm((f) => {
      const items = [...f.lineItems];
      items[i] = { ...items[i], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        items[i].total = items[i].quantity * items[i].unitPrice;
      }
      const total = items.reduce((s, it) => s + (it.total ?? 0), 0);
      return { ...f, lineItems: items, total };
    });
  }

  function addLineItem() {
    setForm((f) => ({
      ...f,
      lineItems: [...f.lineItems, { description: "", quantity: 1, unitPrice: 0, total: 0 }],
    }));
  }

  function removeLineItem(i: number) {
    setForm((f) => {
      const items = f.lineItems.filter((_, idx) => idx !== i);
      const total = items.reduce((s, it) => s + (it.total ?? 0), 0);
      return { ...f, lineItems: items, total };
    });
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post<Proposal>("/api/proposals", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setShowCreate(false);
      setForm(defaultForm);
      toast.success("Proposal created");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't create proposal"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/proposals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setSelected(null);
      toast.success("Proposal deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/proposals/${id}/send`, {}),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposal sent to client!");
      // Update selected locally
      if (selected?.id === id) {
        setSelected((s) => s ? { ...s, status: "sent" } : null);
      }
    },
    onError: (err: any) => toast.error(err.message || "Couldn't send proposal"),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
    });
  }

  const stats = [
    { label: "Total", value: proposals.length, color: "text-[var(--violet)]", icon: Receipt, iconColor: "text-[var(--violet)]" },
    { label: "Accepted", value: proposals.filter((p) => p.status === "accepted").length, color: "text-[var(--emerald)]", icon: CheckCircle2, iconColor: "text-[var(--emerald)]" },
    { label: "Pending", value: proposals.filter((p) => ["sent", "viewed"].includes(p.status)).length, color: "text-[var(--amber)]", icon: Clock, iconColor: "text-[var(--amber)]" },
    { label: "Declined", value: proposals.filter((p) => p.status === "declined").length, color: "text-[var(--coral)]", icon: XCircle, iconColor: "text-[var(--coral)]" },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] page-enter">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[22px] font-medium text-[var(--text-primary)]">Proposals</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Send professional proposals and track client responses.
          </p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)} 
          className="bg-[var(--violet)] hover:bg-[var(--violet)]/90 text-white font-medium text-[13px] h-9.5 px-4 rounded-lg shadow-glow-sm transition-all duration-120 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />New proposal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-default)] p-4.5 transition-all duration-120 flex flex-col justify-between h-28 relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{s.label}</span>
                <Icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", s.iconColor)} />
              </div>
              <div>
                <p className={cn("stat-number font-semibold text-[26px] tracking-tight", s.color)}>
                  {s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {["all", "draft", "sent", "viewed", "accepted", "declined"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium capitalize border transition-all duration-120 cursor-pointer",
              filterStatus === status
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)]"
                : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] bg-transparent"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Proposals list */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-[1.8fr_1.2fr_90px_100px_100px_90px] gap-4 px-4.5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/50">
          {["Proposal", "Client", "Total", "Status", "Valid Until", ""].map((h, idx) => (
            <p 
              key={h || `empty-${idx}`} 
              className={cn(
                "text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider",
                h === "" ? "text-right" : ""
              )}
            >
              {h}
            </p>
          ))}
        </div>

        {isLoading ? (
          <div className="p-4.5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-[var(--bg-elevated)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center bg-[var(--bg-card)]">
            <div className="h-10 w-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] mb-3">
              <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">No proposals yet</h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1.5 max-w-[320px]">
              Create and send professional, interactive proposals to pitch your services to clients.
            </p>
            <Button 
              onClick={() => setShowCreate(true)} 
              className="mt-4.5 h-8.5 text-[12.5px] rounded-lg bg-[var(--violet)] hover:bg-[var(--violet)]/90 text-white font-medium shadow-glow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create first proposal
            </Button>
          </div>
        ) : (
          filtered.map((p, i) => {
            const clientName = getClientName(p.clientId);
            const initials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
            const colorIndex = clientName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5;
            const gradients = [
              "from-[var(--violet)]/20 to-[var(--blue)]/20 text-[var(--violet)]",
              "from-[var(--emerald)]/20 to-[var(--blue)]/20 text-[var(--emerald)]",
              "from-[var(--amber)]/20 to-[var(--coral)]/20 text-[var(--amber)]",
              "from-[var(--coral)]/20 to-[var(--violet)]/20 text-[var(--coral)]",
              "from-[var(--blue)]/20 to-[var(--emerald)]/20 text-[var(--blue)]"
            ];
            const gradient = gradients[colorIndex];
            
            const borderColors = {
              accepted: "border-l-[var(--emerald)]/60",
              sent: "border-l-[var(--violet)]/60",
              viewed: "border-l-[var(--amber)]/60",
              declined: "border-l-[var(--coral)]/60",
              draft: "border-l-transparent",
            };
            const borderClass = borderColors[p.status] || "border-l-transparent";

            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className={cn(
                  "grid grid-cols-[1.8fr_1.2fr_90px_100px_100px_90px] gap-4 items-center px-4.5 py-3 hover:bg-[var(--bg-elevated)] cursor-pointer transition-all duration-120 group border-l-2 relative",
                  borderClass,
                  i < filtered.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
                )}
              >
                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors truncate">
                    {p.title}
                  </p>
                  {p.intro && (
                    <p className="text-[11.5px] text-[var(--text-muted)] line-clamp-1 mt-0.5 max-w-[280px]">
                      {p.intro}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn("h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10.5px] font-medium shrink-0 border border-white/[0.03]", gradient)}>
                    {initials}
                  </div>
                  <span className="text-[13px] text-[var(--text-primary)] font-medium truncate">{clientName}</span>
                </div>

                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  ${(p.total ?? 0).toLocaleString()}
                </p>

                <div>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", STATUS_CLASSES[p.status].text, STATUS_CLASSES[p.status].bg, STATUS_CLASSES[p.status].border)}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>

                <p className="text-[12.5px] text-[var(--text-secondary)] font-mono">
                  {fmtDate(p.validUntil)}
                </p>

                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-120">
                  {p.status === "draft" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-[var(--text-secondary)] hover:text-[var(--violet)] hover:bg-[var(--bg-elevated)] rounded-md cursor-pointer shrink-0"
                      onClick={(e) => { e.stopPropagation(); sendMutation.mutate(p.id); }}
                      title="Send proposal"
                      loading={sendMutation.isPending && sendMutation.variables === p.id}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {p.publicToken && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-md cursor-pointer shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`${window.location.origin}/proposal/${p.publicToken}`, "_blank");
                      }}
                      title="Preview proposal"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-[var(--text-secondary)] hover:text-[var(--coral)] hover:bg-[var(--coral)]/[0.08] rounded-md cursor-pointer shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this proposal?")) {
                        deleteMutation.mutate(p.id);
                      }
                    }}
                    title="Delete proposal"
                    loading={deleteMutation.isPending && deleteMutation.variables === p.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Proposal Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-[520px] bg-[#111318] border-l border-white/8 overflow-y-auto">
          {selected && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SheetTitle className="text-[16px] font-semibold text-[#F0F0F5] leading-snug">
                      {selected.title}
                    </SheetTitle>
                    <p className="text-[12px] text-[#8B8FA8] mt-1">{getClientName(selected.clientId)}</p>
                  </div>
                  <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0", STATUS_CLASSES[selected.status].text, STATUS_CLASSES[selected.status].bg, STATUS_CLASSES[selected.status].border)}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>
              </SheetHeader>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {selected.status === "draft" && (
                  <Button
                    size="sm"
                    loading={sendMutation.isPending}
                    onClick={() => sendMutation.mutate(selected.id)}
                    className="bg-[var(--violet)] hover:bg-[var(--violet)]/90 text-white font-medium shadow-glow-sm cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> Send to client
                  </Button>
                )}
                {selected.publicToken && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--border-subtle)] bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    onClick={() =>
                      window.open(
                        `${window.location.origin}/proposal/${selected.publicToken}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Preview
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[var(--coral)] border-[var(--coral)]/30 hover:bg-[var(--coral)]/[0.05] cursor-pointer"
                  onClick={() => {
                    if (confirm("Delete this proposal?")) {
                      deleteMutation.mutate(selected.id);
                    }
                  }}
                  loading={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Details */}
              <div className="space-y-5 text-[13px]">
                {selected.intro && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Introduction</p>
                    <p className="text-[var(--text-secondary)] leading-relaxed">{selected.intro}</p>
                  </div>
                )}
                {selected.scope && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Scope of Work</p>
                    <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{selected.scope}</p>
                  </div>
                )}
                {selected.timeline && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Timeline</p>
                    <p className="text-[var(--text-secondary)] leading-relaxed">{selected.timeline}</p>
                  </div>
                )}

                {/* Line items */}
                {selected.lineItems?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Pricing</p>
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
                      {selected.lineItems.map((item, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between px-3.5 py-2.5 gap-4",
                            i < selected.lineItems.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
                          )}
                        >
                          <p className="text-[12.5px] text-[var(--text-primary)] font-medium flex-1 truncate">{item.description}</p>
                          <p className="text-[12px] text-[var(--text-secondary)] shrink-0">
                            {item.quantity} × ${item.unitPrice.toLocaleString()}
                          </p>
                          <p className="text-[12.5px] font-semibold text-[var(--text-primary)] shrink-0 w-20 text-right">
                            ${item.total.toLocaleString()}
                          </p>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3.5 py-3 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
                        <p className="text-[12.5px] font-semibold text-[var(--text-secondary)]">Total</p>
                        <p className="text-[14.5px] font-bold text-[var(--emerald)]">
                          ${(selected.total ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selected.terms && (
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Terms</p>
                    <p className="text-[var(--text-secondary)] leading-relaxed text-[12px] whitespace-pre-wrap">{selected.terms}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Valid until</p>
                  <p className="text-[12.5px] text-[var(--text-primary)] font-mono">{fmtDate(selected.validUntil)}</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Proposal Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-xl max-w-[600px] max-h-[90vh] overflow-y-auto text-[var(--text-primary)] p-6">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-[var(--text-primary)]">New Proposal</DialogTitle>
          </DialogHeader>
          <form className="space-y-4.5 mt-4" onSubmit={handleCreate}>

            {/* Client + Title */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Client</label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
                >
                  <SelectTrigger className="h-9.5 bg-[var(--bg-app)] border-[var(--border-subtle)] text-[13px] rounded-lg focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)] transition-colors">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]">
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-[13px] cursor-pointer focus:bg-[var(--bg-elevated)]">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Title</label>
                <Input
                  placeholder="e.g. Website Redesign Proposal"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  className="bg-[var(--bg-app)] border-[var(--border-subtle)] h-9.5 text-[13px] rounded-lg focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
            </div>

            {/* Introduction */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Introduction</label>
                <AIInlineButton
                  context="proposal_intro"
                  currentValue={form.intro}
                  onResult={(text) => setForm((f) => ({ ...f, intro: text }))}
                  placeholder="Write a compelling introduction"
                  isPro={isPro}
                />
              </div>
              <textarea
                placeholder="Briefly introduce yourself and why you're the right fit…"
                value={form.intro}
                onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))}
                rows={3}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[13px] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)] transition-colors"
              />
            </div>

            {/* Scope */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Scope of Work</label>
                <AIInlineButton
                  context="proposal_scope"
                  currentValue={form.scope}
                  onResult={(text) => setForm((f) => ({ ...f, scope: text }))}
                  placeholder="Expand scope into bullet points"
                  isPro={isPro}
                />
              </div>
              <textarea
                placeholder="Describe deliverables, milestones…"
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                rows={4}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[13px] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)] transition-colors"
              />
            </div>

            {/* Timeline + Valid Until */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Timeline</label>
                <Input
                  placeholder="e.g. 4 weeks"
                  value={form.timeline}
                  onChange={(e) => setForm((f) => ({ ...f, timeline: e.target.value }))}
                  className="bg-[var(--bg-app)] border-[var(--border-subtle)] h-9.5 text-[13px] rounded-lg focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Valid until</label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                  className="bg-[var(--bg-app)] border-[var(--border-subtle)] h-9.5 text-[13px] rounded-lg focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Pricing</label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-[11.5px] text-[var(--violet)] hover:text-[var(--violet)]/80 flex items-center gap-1 transition-colors font-medium cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add item
                </button>
              </div>
              <div className="space-y-2">
                {form.lineItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_90px_auto] gap-2 items-center">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                      className="bg-[var(--bg-app)] border-[var(--border-subtle)] h-8.5 text-[12.5px] rounded-lg focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)]"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", parseFloat(e.target.value) || 0)}
                      className="bg-[var(--bg-app)] border-[var(--border-subtle)] h-8.5 text-[12.5px] rounded-lg text-center focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)]"
                    />
                    <Input
                      type="number"
                      placeholder="Unit $"
                      value={item.unitPrice || ""}
                      onChange={(e) => updateLineItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="bg-[var(--bg-app)] border-[var(--border-subtle)] h-8.5 text-[12.5px] rounded-lg focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)]"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      className="text-[var(--text-muted)] hover:text-[var(--coral)] hover:bg-[var(--coral)]/[0.08] transition-colors p-1.5 rounded-md cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {form.total > 0 && (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)] mt-2">
                  <p className="text-[12.5px] font-semibold text-[var(--text-secondary)]">Total</p>
                  <p className="text-[14.5px] font-bold text-[var(--emerald)]">
                    ${form.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Terms & Conditions</label>
                <AIInlineButton
                  context="proposal_terms"
                  currentValue={form.terms}
                  onResult={(text) => setForm((f) => ({ ...f, terms: text }))}
                  placeholder="Write standard payment & IP terms"
                  isPro={isPro}
                />
              </div>
              <textarea
                placeholder="Payment terms, IP rights, revision policy…"
                value={form.terms}
                onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
                rows={3}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[13px] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] focus:border-[var(--border-focus)] transition-colors"
              />
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending} className="bg-[var(--violet)] hover:bg-[var(--violet)]/90 text-white shadow-glow-sm cursor-pointer">
                Create proposal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
