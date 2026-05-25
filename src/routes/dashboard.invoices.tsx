import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Send, Receipt, Clock, CheckCircle2, AlertCircle, Trash2, Eye, ShieldAlert, FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Invoice, Client, UserProfile } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AIInlineButton } from "@/components/ui/ai-inline-button";

export const Route = createFileRoute("/dashboard/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InvoicesPage,
});

function fmtDate(ts: unknown): string {
  if (!ts) return "—";
  try {
    const d =
      typeof ts === "object" && ts !== null && "seconds" in ts
        ? new Date((ts as { seconds: number }).seconds * 1000)
        : new Date(ts as string);
    return format(d, "MMM d");
  } catch {
    return "—";
  }
}

function InvoicesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    clientId: "", description: "", quantity: "1",
    unitPrice: "", taxRate: "0", notes: "", dueDate: "",
    // Recurring fields
    isRecurring: false,
    recurringInterval: "monthly" as "weekly" | "monthly" | "quarterly",
    recurringNextDate: "",
    recurringEndDate: "",
  });

  const { data: invoicesData, isLoading } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["invoices"],
    queryFn: () => apiClient.get<{ invoices: Invoice[] }>("/api/invoices"),
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
      apiClient.post<Invoice>("/api/invoices", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setShowCreate(false);
      setForm({ clientId: "", description: "", quantity: "1", unitPrice: "", taxRate: "0", notes: "", dueDate: "", isRecurring: false, recurringInterval: "monthly", recurringNextDate: "", recurringEndDate: "" });
      toast.success("Invoice created");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't create invoice. Try again."),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/invoices/${id}/send`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice sent to client");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't send invoice. Try again."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiClient.patch(`/api/invoices/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice status updated");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't update invoice."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't delete invoice."),
  });

  const invoices = invoicesData?.invoices ?? [];
  const clients = clientsData?.clients ?? [];

  const [verifyingInvoice, setVerifyingInvoice] = useState<Invoice | null>(null);

  const verifyMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/invoices/${id}/verify`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setVerifyingInvoice(null);
      toast.success("Payment verified! Invoice marked as paid.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to verify payment."),
  });

  const getClientName = (cid: string) => {
    return clients.find((c) => c.id === cid)?.name ?? cid;
  };

  const totalBilled = invoices.reduce((s, i) => s + (i.total ?? 0), 0);
  const totalPaid   = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total ?? 0), 0);
  const totalSent   = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + (i.total ?? 0), 0);
  const totalOverdue= invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.total ?? 0), 0);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.unitPrice);
    const subtotal = qty * price;
    const taxRate = parseFloat(form.taxRate);
    const taxAmount = subtotal * (taxRate / 100);
    createMutation.mutate({
      clientId: form.clientId,
      status: "draft",
      items: [{ description: form.description, quantity: qty, unitPrice: price, total: subtotal }],
      subtotal,
      taxRate,
      taxAmount,
      total: subtotal + taxAmount,
      notes: form.notes,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      issueDate: new Date().toISOString(),
      // Recurring
      isRecurring: form.isRecurring,
      recurringInterval: form.isRecurring ? form.recurringInterval : null,
      recurringNextDate: form.isRecurring && form.recurringNextDate
        ? new Date(form.recurringNextDate).toISOString()
        : null,
      recurringEndDate: form.isRecurring && form.recurringEndDate
        ? new Date(form.recurringEndDate).toISOString()
        : null,
      recurringParentId: null,
    });
  }

  return (
    <div className="space-y-6 max-w-[1200px] page-enter">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-[22px] font-medium text-[var(--text-primary)]">Invoices</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Track billing and get paid via Stripe.
          </p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)} 
          className="bg-[var(--violet)] hover:bg-[var(--violet)]/90 text-white font-medium text-[13px] h-9.5 px-4 rounded-lg shadow-glow-sm transition-all duration-120 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />New invoice
        </Button>
      </div>

      {/* Stat cards — emerald for paid, amber for outstanding, coral for overdue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: "Total billed",  value: totalBilled,  color: "text-[var(--text-primary)]", icon: Receipt, iconColor: "text-[var(--violet)]" },
          { label: "Paid",          value: totalPaid,    color: "text-[var(--emerald)]", icon: CheckCircle2, iconColor: "text-[var(--emerald)]" },
          { label: "Outstanding",   value: totalSent,    color: "text-[var(--amber)]", icon: Clock, iconColor: "text-[var(--amber)]" },
          { label: "Overdue",       value: totalOverdue, color: "text-[var(--coral)]", icon: AlertCircle, iconColor: "text-[var(--coral)]" },
        ].map((s) => {
          const Icon = s.icon;
          const isOverdueAlert = s.label === "Overdue" && totalOverdue > 0;
          return (
            <div
              key={s.label}
              className={cn(
                "rounded-xl border p-4.5 transition-all duration-120 flex flex-col justify-between h-28 relative overflow-hidden group",
                isOverdueAlert 
                  ? "border-[var(--coral)]/30 bg-[var(--coral)]/[0.03] shadow-[inset_0_0_12px_rgba(248,113,113,0.02)]" 
                  : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-default)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{s.label}</span>
                <Icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", s.iconColor)} />
              </div>
              <div>
                <p className={cn("stat-number font-semibold text-[26px] tracking-tight", s.color)}>
                  ${s.value.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1.2fr_100px_110px_90px_100px] gap-4 px-4.5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/50">
          {["Invoice", "Client", "Amount", "Status", "Due", ""].map((h, idx) => (
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
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full bg-[var(--bg-elevated)]" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center bg-[var(--bg-card)]">
            <div className="h-10 w-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] mb-3">
              <Receipt className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">No invoices yet</h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1.5 max-w-[320px]">
              Create your first invoice to get paid, track billing, or configure recurring subscriptions.
            </p>
            <Button 
              onClick={() => setShowCreate(true)} 
              className="mt-4.5 h-8.5 text-[12.5px] rounded-lg bg-[var(--violet)] hover:bg-[var(--violet)]/90 text-white font-medium shadow-glow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create first invoice
            </Button>
          </div>
        ) : (
          invoices.map((inv, i) => {
            const clientName = getClientName(inv.clientId);
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
            const isPaid = inv.status === "paid";
            const isOverdue = inv.status === "overdue";

            return (
              <div
                key={inv.id}
                className={cn(
                  "grid grid-cols-[1fr_1.2fr_100px_110px_90px_100px] gap-4 items-center px-4.5 py-3 hover:bg-[var(--bg-elevated)] transition-all duration-120 group border-l-2 relative",
                  isPaid ? "border-l-[var(--emerald)]/60" : isOverdue ? "border-l-[var(--coral)]/60" : "border-l-transparent",
                  i < invoices.length - 1 ? "border-b border-[var(--border-subtle)]" : "",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-mono text-[var(--text-secondary)] tracking-tight truncate">
                    {inv.invoiceNumber}
                  </span>
                  {(inv as any).isRecurring && (
                    <span title="Recurring invoice" className="text-[10px] text-[var(--violet)] bg-[var(--violet)]/[0.08] border border-[var(--violet)]/25 rounded px-1.5 py-0.5 font-medium shrink-0">
                      ↻
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn("h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[10.5px] font-medium shrink-0 border border-white/[0.03]", gradient)}>
                    {initials}
                  </div>
                  <span className="text-[13px] text-[var(--text-primary)] font-medium truncate">{clientName}</span>
                </div>

                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  ${(inv.total ?? 0).toLocaleString()}
                </p>

                <div className="flex items-center gap-1.5">
                  <StatusBadge status={inv.status} />
                  {inv.status === "pending_verification" && (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Proof submitted" />
                  )}
                </div>

                <p className="text-[12px] text-[var(--text-secondary)] font-medium">{fmtDate(inv.dueDate)}</p>

                <div className="flex justify-end items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-120">
                  {inv.status === "pending_verification" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setVerifyingInvoice(inv)}
                      className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-[var(--bg-active)] rounded-md transition-colors"
                      title="Verify payment proof"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {inv.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => sendMutation.mutate(inv.id)}
                      loading={sendMutation.isPending}
                      className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)] rounded-md transition-colors"
                      title="Send to client"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {inv.status !== "paid" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => updateMutation.mutate({ id: inv.id, body: { status: "paid" } })}
                      loading={updateMutation.isPending}
                      className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--emerald)] hover:bg-[var(--bg-active)] rounded-md transition-colors"
                      title="Mark as paid"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      toast.success("Downloading PDF...");
                      // Mock pdf download
                      const element = document.createElement("a");
                      const file = new Blob([JSON.stringify(inv, null, 2)], {type: 'application/json'});
                      element.href = URL.createObjectURL(file);
                      element.download = `Invoice-${inv.invoiceNumber}.json`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)] rounded-md transition-colors"
                    title="Download"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this invoice?")) {
                        deleteMutation.mutate(inv.id);
                      }
                    }}
                    loading={deleteMutation.isPending}
                    className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--coral)] hover:bg-[var(--bg-active)] rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Verify Payment Proof Dialog */}
      <Dialog open={!!verifyingInvoice} onOpenChange={(open) => !open && setVerifyingInvoice(null)}>
        <DialogContent className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl max-w-[440px] text-[var(--text-primary)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
              Verify payment proof
            </DialogTitle>
          </DialogHeader>
          {verifyingInvoice && (
            <div className="space-y-4 mt-2">
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
                Review the offline payment proof submitted by the client for invoice <span className="font-medium text-[var(--text-primary)]">{verifyingInvoice.invoiceNumber}</span>.
              </p>
              
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg p-3.5 space-y-2.5 text-[12.5px]">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[var(--text-secondary)]">Client</span>
                  <span className="text-[var(--text-primary)] font-medium">{getClientName(verifyingInvoice.clientId)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[var(--text-secondary)]">Total Amount</span>
                  <span className="text-[var(--emerald)] font-semibold">${(verifyingInvoice.total ?? 0).toLocaleString()}</span>
                </div>
                {verifyingInvoice.paymentProof && (
                  <>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[var(--text-secondary)]">File Name</span>
                      <span className="text-[var(--text-primary)] font-medium truncate max-w-[200px] flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-[var(--violet)] shrink-0" />
                        {verifyingInvoice.paymentProof.name}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[var(--text-secondary)]">File Size</span>
                      <span className="text-[var(--text-primary)]">{verifyingInvoice.paymentProof.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Submitted At</span>
                      <span className="text-[var(--text-primary)]">{verifyingInvoice.paymentProof.date}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setVerifyingInvoice(null)}
                  className="h-9 rounded-lg border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => verifyMutation.mutate(verifyingInvoice.id)}
                  loading={verifyMutation.isPending}
                  className="h-9 rounded-lg bg-[var(--violet)] hover:bg-[var(--violet)]/90 text-white font-medium shadow-glow-sm cursor-pointer"
                >
                  Approve Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl max-w-[480px] text-[var(--text-primary)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
              New invoice
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4 mt-2" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Client</label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
              >
                <SelectTrigger className="h-9.5 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] rounded-lg focus:ring-0 text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors duration-120">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-[13px] focus:bg-[var(--bg-elevated)]">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Description</label>
              <Input
                placeholder="Web design — May 2025"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] h-10 text-[13px] rounded-lg focus-visible:ring-1 focus-visible:ring-[var(--violet)] text-[var(--text-primary)] focus:ring-0 placeholder-[var(--text-muted)]/50"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "quantity",  label: "Quantity",      type: "number", min: "0", step: "0.01" },
                { key: "unitPrice", label: "Unit price ($)", type: "number", min: "0", step: "0.01" },
                { key: "taxRate",   label: "Tax rate (%)",   type: "number", min: "0", max: "100", step: "0.1" },
                { key: "dueDate",   label: "Due date",       type: "date" },
              ].map(({ key, label, ...rest }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</label>
                  <Input
                    {...rest}
                    value={String(form[key as keyof typeof form] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] h-10 text-[13px] rounded-lg focus-visible:ring-1 focus-visible:ring-[var(--violet)] text-[var(--text-primary)] focus:ring-0 placeholder-[var(--text-muted)]/50"
                  />
                </div>
              ))}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Notes</label>
                <AIInlineButton
                  context="invoice_notes"
                  currentValue={form.notes}
                  onResult={(text) => setForm((f) => ({ ...f, notes: text }))}
                  placeholder="Write professional payment note"
                  isPro={isPro}
                />
              </div>
              <Input
                placeholder="Payment terms, notes…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] h-10 text-[13px] rounded-lg focus-visible:ring-1 focus-visible:ring-[var(--violet)] text-[var(--text-primary)] focus:ring-0 placeholder-[var(--text-muted)]/50"
              />
            </div>

            {/* Recurring invoice toggle */}
            <div
              className="rounded-xl border p-3.5 space-y-3.5 transition-all duration-120"
              style={{
                borderColor: form.isRecurring ? "rgba(94,106,210,0.3)" : "var(--border-subtle)",
                background: form.isRecurring ? "rgba(94,106,210,0.03)" : "transparent",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[var(--text-primary)]">Recurring invoice</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Auto-create this invoice on a schedule</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isRecurring: !f.isRecurring }))}
                  className="relative h-5 w-9 rounded-full transition-all duration-120 p-0.5 border border-white/10 cursor-pointer shrink-0"
                  style={{ background: form.isRecurring ? "var(--violet)" : "var(--bg-elevated)" }}
                >
                  <div
                    className="h-4 w-4 rounded-full bg-white transition-transform duration-120 shadow"
                    style={{ transform: form.isRecurring ? "translateX(16px)" : "translateX(0px)" }}
                  />
                </button>
              </div>

              {form.isRecurring && (
                <div className="space-y-3.5 pt-1.5">
                  {/* Interval pills */}
                  <div>
                    <p className="text-[11.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Repeats</p>
                    <div className="flex gap-1.5">
                      {(["weekly", "monthly", "quarterly"] as const).map((interval) => (
                        <button
                          key={interval}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, recurringInterval: interval }))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-all duration-120 cursor-pointer border",
                            form.recurringInterval === interval
                              ? "bg-[var(--violet)]/10 border-[var(--violet)]/40 text-[var(--violet)]"
                              : "bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          {interval}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[var(--text-secondary)]">Next invoice date</label>
                      <Input
                        type="date"
                        value={form.recurringNextDate}
                        onChange={(e) => setForm((f) => ({ ...f, recurringNextDate: e.target.value }))}
                        className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] h-9 text-[12.5px] rounded-lg text-[var(--text-primary)] focus-visible:ring-1 focus-visible:ring-[var(--violet)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[var(--text-secondary)]">Stop after (optional)</label>
                      <Input
                        type="date"
                        placeholder="Never"
                        value={form.recurringEndDate}
                        onChange={(e) => setForm((f) => ({ ...f, recurringEndDate: e.target.value }))}
                        className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] h-9 text-[12.5px] rounded-lg text-[var(--text-primary)] focus-visible:ring-1 focus-visible:ring-[var(--violet)]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview total */}
            {form.unitPrice && (
              <div className="px-3.5 py-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Calculated Total</p>
                <p className="text-[15px] font-bold text-[var(--emerald)]">
                  ${(
                    parseFloat(form.quantity || "1") *
                    parseFloat(form.unitPrice || "0") *
                    (1 + parseFloat(form.taxRate || "0") / 100)
                  ).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
            
            <DialogFooter className="gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreate(false)}
                className="h-9.5 text-[13px] rounded-lg border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={createMutation.isPending} 
                className="h-9.5 text-[13px] rounded-lg bg-[var(--violet)] hover:bg-[var(--violet)]/90 text-white font-medium shadow-glow-sm transition-all duration-120 cursor-pointer"
              >
                Create invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


