/**
 * GlobalSearch — Command palette / spotlight search for the dashboard.
 *
 * Opens on: click on search bar, Ctrl+K / Cmd+K shortcut
 * Searches across: Tasks, Projects, Clients, Invoices (client-side, fuzzy)
 * Design: dark glass modal, instant results, keyboard navigation
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  Search,
  ListChecks,
  FolderKanban,
  Users,
  Receipt,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultCategory = "task" | "project" | "client" | "invoice";

interface SearchResult {
  id: string;
  category: ResultCategory;
  title: string;
  subtitle: string;
  route: string;
}

// ─── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  ResultCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  task:    { label: "Task",    icon: ListChecks,   color: "text-[#5E6AD2]" },
  project: { label: "Project", icon: FolderKanban, color: "text-[#00C896]" },
  client:  { label: "Client",  icon: Users,        color: "text-[#FF6B6B]" },
  invoice: { label: "Invoice", icon: Receipt,      color: "text-[#FFB347]" },
};

// ─── Fuzzy matcher ─────────────────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  return lower.includes(q);
}

// ─── GlobalSearch Component ────────────────────────────────────────────────────

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Data queries (only when user authenticated) ───────────────────────────
  const enabled = !!user && open;

  const { data: tasksData, isLoading: tasksLoading } = useQuery<{ tasks: any[] }>({
    queryKey: ["search-tasks"],
    queryFn: () => apiClient.get("/api/tasks"),
    enabled,
    staleTime: 60_000,
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery<{ projects: any[] }>({
    queryKey: ["search-projects"],
    queryFn: () => apiClient.get("/api/projects"),
    enabled,
    staleTime: 60_000,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery<{ clients: any[] }>({
    queryKey: ["search-clients"],
    queryFn: () => apiClient.get("/api/clients"),
    enabled,
    staleTime: 60_000,
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ invoices: any[] }>({
    queryKey: ["search-invoices"],
    queryFn: () => apiClient.get("/api/invoices"),
    enabled,
    staleTime: 60_000,
  });

  const isLoading = tasksLoading || projectsLoading || clientsLoading || invoicesLoading;

  // ── Build combined search results ─────────────────────────────────────────
  const results: SearchResult[] = [];

  if (tasksData?.tasks) {
    for (const t of tasksData.tasks) {
      if (fuzzyMatch(t.title ?? "", query) || fuzzyMatch(t.description ?? "", query)) {
        results.push({
          id: t.id,
          category: "task",
          title: t.title ?? "Untitled Task",
          subtitle: t.status ? `Status: ${t.status}` : "Task",
          route: "/dashboard/tasks",
        });
      }
    }
  }

  if (projectsData?.projects) {
    for (const p of projectsData.projects) {
      if (fuzzyMatch(p.name ?? "", query) || fuzzyMatch(p.description ?? "", query)) {
        results.push({
          id: p.id,
          category: "project",
          title: p.name ?? "Untitled Project",
          subtitle: p.status ? `Status: ${p.status}` : "Project",
          route: "/dashboard/projects",
        });
      }
    }
  }

  if (clientsData?.clients) {
    for (const c of clientsData.clients) {
      if (fuzzyMatch(c.name ?? "", query) || fuzzyMatch(c.email ?? "", query) || fuzzyMatch(c.company ?? "", query)) {
        results.push({
          id: c.id,
          category: "client",
          title: c.name ?? "Unnamed Client",
          subtitle: c.company ?? c.email ?? "Client",
          route: "/dashboard/clients",
        });
      }
    }
  }

  if (invoicesData?.invoices) {
    for (const inv of invoicesData.invoices) {
      if (fuzzyMatch(inv.invoiceNumber ?? "", query) || fuzzyMatch(inv.clientName ?? "", query)) {
        results.push({
          id: inv.id,
          category: "invoice",
          title: inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : "Invoice",
          subtitle: inv.clientName
            ? `${inv.clientName}${inv.total ? ` — $${inv.total.toLocaleString()}` : ""}`
            : `$${inv.total?.toLocaleString() ?? "0"}`,
          route: "/dashboard/invoices",
        });
      }
    }
  }

  // Cap results to 12
  const capped = results.slice(0, 12);

  // ── Focus input when opened ───────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // ── Reset selection when results change ───────────────────────────────────
  useEffect(() => {
    setSelected(0);
  }, [query]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, capped.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = capped[selected];
        if (item) {
          navigate({ to: item.route });
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [capped, selected, navigate, onClose]
  );

  // ── Scroll selected item into view ────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  const showEmptyState = !isLoading && query.length >= 1 && capped.length === 0;
  const showDefaultState = !isLoading && query.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 top-[12vh] z-[201] flex items-start justify-center px-4 pointer-events-none">
        <div
          className="w-full max-w-[580px] bg-[#111318] border border-white/8 rounded-[14px] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto"
          style={{ animation: "modalEnter 0.15s ease-out" }}
        >
          {/* Search Input Row */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/6">
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-[#5E6AD2] shrink-0 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-[#5C5F73] shrink-0" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, projects, clients, invoices..."
              className="flex-1 bg-transparent text-[14px] text-[#F0F0F5] placeholder-[#5C5F73] outline-none caret-[#5E6AD2]"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="h-5 w-5 rounded flex items-center justify-center text-[#5C5F73] hover:text-[#F0F0F5] transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex font-mono text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-[#5C5F73] select-none">
              ESC
            </kbd>
          </div>

          {/* Results list */}
          <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2 scrollbar-thin">

            {/* Default state: quick navigation links */}
            {showDefaultState && (
              <div className="px-2 pb-1">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5C5F73]">
                  Quick Navigation
                </p>
                {(
                  [
                    { label: "Tasks",    icon: ListChecks,   route: "/dashboard/tasks",    color: "text-[#5E6AD2]", bg: "bg-[#5E6AD2]/8"  },
                    { label: "Projects", icon: FolderKanban, route: "/dashboard/projects", color: "text-[#00C896]", bg: "bg-[#00C896]/8"  },
                    { label: "Clients",  icon: Users,        route: "/dashboard/clients",  color: "text-[#FF6B6B]", bg: "bg-[#FF6B6B]/8"  },
                    { label: "Invoices", icon: Receipt,      route: "/dashboard/invoices", color: "text-[#FFB347]", bg: "bg-[#FFB347]/8"  },
                  ] as const
                ).map(({ label, icon: Icon, route, color, bg }) => (
                  <button
                    key={route}
                    onClick={() => { navigate({ to: route }); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
                  >
                    <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", bg)}>
                      <Icon className={cn("h-3.5 w-3.5", color)} />
                    </span>
                    <span className="text-[13px] text-[#8B8FA8] group-hover:text-[#F0F0F5] transition-colors font-medium">{label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#5C5F73] group-hover:text-[#8B8FA8] ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {capped.length > 0 && (
              <div className="px-2">
                {capped.map((result, idx) => {
                  const meta = CATEGORY_META[result.category];
                  const Icon = meta.icon;
                  const isActive = idx === selected;

                  return (
                    <button
                      key={`${result.category}-${result.id}`}
                      data-idx={idx}
                      onClick={() => { navigate({ to: result.route }); onClose(); }}
                      onMouseEnter={() => setSelected(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-colors text-left cursor-pointer",
                        isActive ? "bg-[#5E6AD2]/10 border border-[#5E6AD2]/15" : "hover:bg-white/[0.03] border border-transparent"
                      )}
                    >
                      <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.03]")}>
                        <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[13px] font-medium truncate", isActive ? "text-[#F0F0F5]" : "text-[#C8CADE]")}>
                          {result.title}
                        </p>
                        <p className="text-[11px] text-[#5C5F73] truncate mt-0.5">{result.subtitle}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0",
                        "bg-white/[0.03] border border-white/5",
                        meta.color
                      )}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {showEmptyState && (
              <div className="flex flex-col items-center py-10 px-6 text-center">
                <Search className="h-8 w-8 text-[#5C5F73] mb-3" />
                <p className="text-[14px] font-medium text-[#8B8FA8]">No results for "{query}"</p>
                <p className="text-[12px] text-[#5C5F73] mt-1">Try searching by a task name, client, project, or invoice number.</p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-white/6 flex items-center gap-4 text-[10px] text-[#5C5F73] font-mono select-none">
            <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/8">↑↓</kbd> navigate</span>
            <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/8">↵</kbd> open</span>
            <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/8">ESC</kbd> close</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.97) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
