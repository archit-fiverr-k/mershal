import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import {
  Plus, ListTodo, Kanban, Search, Calendar, ChevronRight, ChevronDown,
  CheckSquare, Trash2, CalendarRange, Clock, ArrowRightLeft, User, X, PlusCircle,
  Tag, ListChecks, CheckCircle2, ClipboardList, Sparkles
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { getIdToken } from "@/lib/firebase/auth";
import { toast } from "sonner";
import type { Task, Project, Subtask, TaskStatus, Priority, UserProfile } from "@/lib/types";
import { z } from "zod";
import { AIInlineButton } from "@/components/ui/ai-inline-button";

const tasksSearchSchema = z.object({
  projectId: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/tasks")({
  validateSearch: tasksSearchSchema,
  head: () => ({
    meta: [
      { title: "Tasks — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TasksPage,
});

function parseDueDate(dueDate: any): Date | null {
  if (!dueDate) return null;
  if (typeof dueDate === "string") {
    const d = new Date(dueDate);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dueDate === "object") {
    const seconds = dueDate.seconds ?? dueDate._seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000);
    }
    if (dueDate instanceof Date) {
      return isNaN(dueDate.getTime()) ? null : dueDate;
    }
  }
  const fallback = new Date(dueDate);
  return isNaN(fallback.getTime()) ? null : fallback;
}

const STATUS_METADATA: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  todo: {
    label: "TO DO",
    color: "var(--text-secondary)",
    bg: "var(--bg-elevated)",
    border: "border-zinc-200 dark:border-zinc-900",
  },
  in_progress: {
    label: "IN PROGRESS",
    color: "var(--text-primary)",
    bg: "var(--bg-active)",
    border: "border-zinc-200 dark:border-zinc-900",
  },
  review: {
    label: "IN REVIEW",
    color: "var(--text-secondary)",
    bg: "var(--bg-elevated)",
    border: "border-zinc-200 dark:border-zinc-900",
  },
  done: {
    label: "COMPLETE",
    color: "var(--text-primary)",
    bg: "var(--bg-active)",
    border: "border-zinc-200 dark:border-white/20",
  },
};

const PRIORITY_METADATA: Record<Priority, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "var(--text-secondary)", bg: "bg-zinc-800/10 dark:bg-zinc-800/20" },
  medium: { label: "Medium", color: "var(--text-primary)", bg: "bg-zinc-700/10 dark:bg-zinc-700/20" },
  high: { label: "High", color: "var(--text-primary)", bg: "bg-zinc-400/20 dark:bg-white/10" },
};

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-zinc-950 dark:bg-white shadow-sm dark:shadow-[0_0_8px_rgba(255,255,255,0.6)]",
  medium: "bg-zinc-500 dark:bg-zinc-400",
  low:    "bg-zinc-300 dark:bg-zinc-700",
};

function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const searchParams = Route.useSearch();

  // Navigation and Filter States
  const [activeView, setActiveView] = useState<"list" | "board">("list");
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState(searchParams.projectId ?? "all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (searchParams.projectId) {
      setFilterProject(searchParams.projectId);
    }
  }, [searchParams.projectId]);

  // Create Modal & Details Drawer States
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Expanded status groups in list view
  const [expandedGroups, setExpandedGroups] = useState<Record<TaskStatus, boolean>>({
    todo: true,
    in_progress: true,
    review: true,
    done: true,
  });

  // Fast inline task creation per status
  const [inlineAddStatus, setInlineAddStatus] = useState<TaskStatus | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");

  const [form, setForm] = useState({
    title: "", projectId: "", priority: "medium" as Priority, dueDate: "",
  });

  // Backend Queries
  const { data: tasksData, isLoading } = useQuery<{ tasks: Task[] }>({
    queryKey: ["tasks"],
    queryFn: () => apiClient.get<{ tasks: Task[] }>("/api/tasks"),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const { data: projectsData } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => apiClient.get<{ projects: Project[] }>("/api/projects"),
    enabled: !!user,
  });

  const tasks = tasksData?.tasks ?? [];
  const projects = projectsData?.projects ?? [];

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/profile"),
    enabled: !!user,
    staleTime: 60_000,
  });
  const isPro = profile?.plan === "pro";

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Task>) =>
      apiClient.patch(`/api/tasks/${id}`, body),
    onMutate: async (updated) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = qc.getQueryData<{ tasks: Task[] }>(["tasks"]);
      if (previous) {
        qc.setQueryData<{ tasks: Task[] }>(["tasks"], {
          tasks: previous.tasks.map((t) =>
            t.id === updated.id ? { ...t, ...updated } : t
          ),
        });
        // If drawer is open, keep selectedTask updated in real time
        if (selectedTask?.id === updated.id) {
          setSelectedTask((curr) => curr ? { ...curr, ...updated } : null);
        }
      }
      return { previous };
    },
    onError: (err: any, __, context) => {
      if (context?.previous) {
        qc.setQueryData(["tasks"], context.previous);
      }
      toast.error(err.message || "Couldn't update task.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post<Task>("/api/tasks", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowCreate(false);
      setForm({ title: "", projectId: "", priority: "medium", dueDate: "" });
      toast.success("Task created successfully");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't create task. Try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedTask(null);
      toast.success("Task deleted");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't delete task."),
  });

  // Quick Action Toggles
  const handleStatusChange = (id: string, status: TaskStatus) => {
    updateMutation.mutate({ id, status });
  };

  const handlePriorityChange = (id: string, priority: Priority) => {
    updateMutation.mutate({ id, priority });
  };

  const handleProjectChange = (id: string, projectId: string) => {
    updateMutation.mutate({ id, projectId });
  };

  const handleDateChange = (id: string, dateString: string) => {
    updateMutation.mutate({
      id,
      dueDate: dateString ? new Date(dateString).toISOString() : (null as any),
    });
  };

  // Subtask Management (Mutates entire subtasks array)
  const handleToggleSubtask = (task: Task, subtaskId: string) => {
    const subtasks = (task.subtasks ?? []).map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    updateMutation.mutate({ id: task.id, subtasks });
  };

  const handleAddSubtask = (task: Task, title: string) => {
    if (!title.trim()) return;
    const newSubtask: Subtask = {
      id: Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      done: false,
    };
    const subtasks = [...(task.subtasks ?? []), newSubtask];
    updateMutation.mutate({ id: task.id, subtasks });
  };

  const handleRenameSubtask = (task: Task, subtaskId: string, title: string) => {
    if (!title.trim()) return;
    const subtasks = (task.subtasks ?? []).map((st) =>
      st.id === subtaskId ? { ...st, title: title.trim() } : st
    );
    updateMutation.mutate({ id: task.id, subtasks });
  };

  const handleDeleteSubtask = (task: Task, subtaskId: string) => {
    const subtasks = (task.subtasks ?? []).filter((st) => st.id !== subtaskId);
    updateMutation.mutate({ id: task.id, subtasks });
  };

  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatingTaskId, setGeneratingTaskId] = useState<string | null>(null);

  const handleAiGenerateSubtasks = async (task: Task) => {
    if (generatingTaskId) return;
    setGeneratingTaskId(task.id);
    setIsAiGenerating(true);
    try {
      const token = await getIdToken();
      const prompt = `Act as an expert agency project manager. For a task titled "${task.title}" (description: "${task.description ?? ""}"), generate 3-5 high-quality, actionable, highly relevant subtasks. 
Return ONLY a valid JSON array of strings, without any markdown formatting, backticks, or wrapping. Example: ["Subtask 1", "Subtask 2"].`;
      
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
        }
      }

      let cleaned = full.trim();
      const jsonStart = cleaned.indexOf("[");
      const jsonEnd = cleaned.lastIndexOf("]");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }

      const titles = JSON.parse(cleaned) as string[];
      if (Array.isArray(titles)) {
        const newSubtasks: Subtask[] = titles.map((title) => ({
          id: Math.random().toString(36).substring(2, 9),
          title: title.trim(),
          done: false,
        }));
        
        const mergedSubtasks = [...(task.subtasks ?? []), ...newSubtasks];
        updateMutation.mutate({ id: task.id, subtasks: mergedSubtasks });
        
        setSelectedTask((prev) => {
          if (prev && prev.id === task.id) {
            return { ...prev, subtasks: mergedSubtasks };
          }
          return prev;
        });

        toast.success(`Successfully generated ${newSubtasks.length} subtasks using Mershal AI!`);
      } else {
        throw new Error("Invalid format returned");
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate subtasks. Please write them manually or try again.");
    } finally {
      setIsAiGenerating(false);
      setGeneratingTaskId(null);
    }
  };

  // Fast inline task create triggers
  const handleInlineCreate = (status: TaskStatus) => {
    if (!inlineTitle.trim()) return;
    createMutation.mutate({
      title: inlineTitle.trim(),
      projectId: projects[0]?.id ?? "",
      status,
      priority: "medium",
      dueDate: null,
      description: "",
      subtasks: [],
    });
    setInlineTitle("");
    setInlineAddStatus(null);
  };

  // Helper selectors
  const getProjectName = (id: string) => {
    return projects.find((p) => p.id === id)?.name ?? "No Project";
  };

  // Stats computation
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchesProject = filterProject === "all" || t.projectId === filterProject;
      const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
      const matchesStatus = filterStatus === "all" || t.status === filterStatus;
      return matchesSearch && matchesProject && matchesPriority && matchesStatus;
    });
  }, [tasks, search, filterProject, filterPriority, filterStatus]);

  // Group tasks by status for List and Board view
  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    filteredTasks.forEach((t) => {
      if (groups[t.status]) {
        groups[t.status].push(t);
      }
    });
    return groups;
  }, [filteredTasks]);

  // Drag and Drop (Board View)
  const [draggedOverColumn, setDraggedOverColumn] = useState<TaskStatus | null>(null);

  return (
    <div className="space-y-6 max-w-[1200px] page-enter px-2 md:px-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title tracking-tight font-semibold text-[var(--text-primary)]">Tasks</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            {isLoading ? (
              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 animate-spin text-[var(--violet)]" /> Loading tasks...</span>
            ) : (
              `Manage and track work across ${projects.length} workspace projects`
            )}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="shadow-glow-sm h-9 px-4 text-xs btn-primary">
          <Plus className="h-4 w-4 mr-1.5" /> New Task
        </Button>
      </div>

      {/* Psychology Quick Stats Cards Bar (Click to filter status) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 select-none">
        <div 
          onClick={() => setFilterStatus("all")}
          className={cn(
            "bg-zinc-950 border rounded-xl p-3.5 cursor-pointer transition-all duration-150 hover:border-zinc-750",
            filterStatus === "all" ? "border-white shadow-sm bg-zinc-900/60" : "border-zinc-900"
          )}
        >
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">All Tasks</p>
          <p className="text-xl font-semibold text-white mt-1">{stats.total}</p>
        </div>
        <div 
          onClick={() => setFilterStatus("todo")}
          className={cn(
            "bg-zinc-950 border rounded-xl p-3.5 cursor-pointer transition-all duration-150 hover:border-zinc-750",
            filterStatus === "todo" ? "border-white shadow-sm bg-zinc-900/60" : "border-zinc-900"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">To Do</p>
          </div>
          <p className="text-xl font-semibold text-white mt-1">{stats.todo}</p>
        </div>
        <div 
          onClick={() => setFilterStatus("in_progress")}
          className={cn(
            "bg-zinc-950 border rounded-xl p-3.5 cursor-pointer transition-all duration-150 hover:border-zinc-750",
            filterStatus === "in_progress" ? "border-white shadow-sm bg-zinc-900/60" : "border-zinc-900"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">In Progress</p>
          </div>
          <p className="text-xl font-semibold text-white mt-1">{stats.inProgress}</p>
        </div>
        <div 
          onClick={() => setFilterStatus("review")}
          className={cn(
            "bg-zinc-950 border rounded-xl p-3.5 cursor-pointer transition-all duration-150 hover:border-zinc-750",
            filterStatus === "review" ? "border-white shadow-sm bg-zinc-900/60" : "border-zinc-900"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">In Review</p>
          </div>
          <p className="text-xl font-semibold text-white mt-1">{stats.review}</p>
        </div>
        <div 
          onClick={() => setFilterStatus("done")}
          className={cn(
            "bg-zinc-950 border rounded-xl p-3.5 cursor-pointer transition-all duration-150 hover:border-zinc-750",
            filterStatus === "done" ? "border-white shadow-sm bg-zinc-900/60" : "border-zinc-900"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Completed</p>
          </div>
          <p className="text-xl font-semibold text-white mt-1">{stats.done}</p>
        </div>
      </div>

      {/* Control Bar & Views Toggles */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-zinc-950 p-3 rounded-xl border border-zinc-900">
        
        {/* Toggle tabs */}
        <div className="flex items-center bg-black p-1 rounded-lg border border-zinc-900 w-max">
          <button
            onClick={() => setActiveView("list")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer",
              activeView === "list"
                ? "bg-zinc-900 text-white shadow-sm font-semibold"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <ListTodo className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => setActiveView("board")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer",
              activeView === "board"
                ? "bg-zinc-900 text-white shadow-sm font-semibold"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Kanban className="h-3.5 w-3.5" />
            Board
          </button>
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-full lg:max-w-2xl lg:justify-end">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search task title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 h-8.5 text-[12.5px] bg-zinc-900 border-zinc-800 rounded-lg w-full focus-visible:ring-1 focus-visible:ring-zinc-800 text-white placeholder-zinc-600"
            />
          </div>

          {/* Project Filter */}
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-8.5 bg-zinc-900 border-zinc-800 text-[12px] rounded-lg w-[140px] focus:ring-0 text-white hover:border-zinc-750 transition-colors duration-150">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-900 rounded-lg text-white">
              <SelectItem value="all" className="text-[12.5px] focus:bg-zinc-900">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-[12.5px] focus:bg-zinc-900">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8.5 bg-zinc-900 border-zinc-800 text-[12px] rounded-lg w-[120px] focus:ring-0 text-white hover:border-zinc-750 transition-colors duration-150">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-900 rounded-lg text-white">
              <SelectItem value="all" className="text-[12.5px] focus:bg-zinc-900">All Priorities</SelectItem>
              <SelectItem value="high" className="text-[12.5px] focus:bg-zinc-900">High</SelectItem>
              <SelectItem value="medium" className="text-[12.5px] focus:bg-zinc-900">Medium</SelectItem>
              <SelectItem value="low" className="text-[12.5px] focus:bg-zinc-900">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Layout Area */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="space-y-2.5">
              <Skeleton className="h-8 w-40 bg-[var(--bg-card)] rounded-lg" />
              <Skeleton className="h-16 w-full bg-[var(--bg-card)]/60 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-center">
          <div className="h-12 w-12 rounded-xl bg-[var(--violet)]/10 flex items-center justify-center border border-[var(--violet)]/20 shadow-sm mb-4">
            <ClipboardList className="h-6 w-6 text-[var(--violet)]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">No tasks found</h3>
          <p className="text-[12.5px] text-[var(--text-secondary)] max-w-sm mt-1 mb-5">
            Add new tasks to get started, or let Mershal AI assist you in drafting a task checklist for your projects.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Button onClick={() => setShowCreate(true)} size="sm" className="btn-primary shadow-glow-sm h-8.5 text-[12.5px]">
              <Plus className="h-3.5 w-3.5 mr-1" /> New Task
            </Button>
            <Button asChild variant="outline" size="sm" className="btn-ghost h-8.5 text-[12.5px] border-[var(--border-subtle)]">
              <Link
                to="/dashboard/ai"
                search={{ message: "Help me write a task checklist for my current projects" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--violet)] mr-1" />
                Generate with AI
              </Link>
            </Button>
          </div>
        </div>
      ) : activeView === "list" ? (
        
        /* ── LIST VIEW (ClickUp Style Status Groups) ── */
        <div className="space-y-4 select-none">
          {(Object.keys(STATUS_METADATA) as TaskStatus[]).map((status) => {
            const meta = STATUS_METADATA[status];
            const groupTasks = tasksByStatus[status];
            const isExpanded = expandedGroups[status];

            if (groupTasks.length === 0 && inlineAddStatus !== status) {
              return null; // Don't render empty status groups unless we are adding inline
            }

            return (
              <div key={status} className="border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden shadow-sm">
                
                {/* Status Group Header */}
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-[var(--bg-card)]/90 cursor-pointer"
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [status]: !prev[status] }))}
                >
                  <div className="flex items-center gap-2">
                    <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] mr-1 transition-colors cursor-pointer">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <span 
                      className="px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wider" 
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[12px] text-[var(--text-muted)] font-medium ml-1">
                      {groupTasks.length} {groupTasks.length === 1 ? "task" : "tasks"}
                    </span>
                  </div>

                  <div className="hidden md:flex items-center gap-8 text-[11px] text-[var(--text-muted)] font-semibold tracking-wider">
                    <span className="w-32 text-left">PROJECT</span>
                    <span className="w-20 text-left">PRIORITY</span>
                    <span className="w-24 text-left">DUE DATE</span>
                    <span className="w-24 text-right">SUBTASKS</span>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)]/60">
                    
                    {/* Rows */}
                    {groupTasks.map((t, idx) => {
                      const completedSubtasks = (t.subtasks ?? []).filter((s) => s.done).length;
                      const totalSubtasks = (t.subtasks ?? []).length;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className={cn(
                            "group flex flex-col md:flex-row md:items-center justify-between px-4 py-3 hover:bg-zinc-900/30 cursor-pointer transition-colors border-l-4",
                            idx < groupTasks.length - 1 ? "border-b border-zinc-900/40" : ""
                          )}
                          style={{ borderLeftColor: meta.color }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox
                              checked={t.status === "done"}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={(checked) =>
                                handleStatusChange(t.id, checked ? "done" : "todo")
                              }
                              className="border-[var(--border-subtle)] data-[state=checked]:bg-[var(--violet)] data-[state=checked]:border-[var(--violet)] shrink-0"
                            />
                            <div className="min-w-0 pr-4">
                              <p className={cn(
                                "text-[13px] font-medium leading-normal",
                                t.status === "done" ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"
                              )}>
                                {t.title}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center md:items-center justify-between md:justify-start gap-4 md:gap-8 mt-2.5 md:mt-0 pt-2.5 md:pt-0 border-t border-[var(--border-subtle)]/60 md:border-t-0 text-[12px]">
                            
                            {/* Project Column */}
                            <span className="w-32 text-left text-[var(--text-secondary)] font-medium truncate md:block">
                              {getProjectName(t.projectId)}
                            </span>

                            {/* Priority Column (Simplified priority indicators to colored dots matching PRIORITY_DOT values) */}
                            <span className="w-20 text-left flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
                              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[t.priority] ?? "bg-[#5C5F73]")} />
                              <span className="capitalize">{t.priority}</span>
                            </span>

                            {/* Due Date Column */}
                            {(() => {
                              const parsedDate = parseDueDate(t.dueDate);
                              const isOverdue = parsedDate && parsedDate < new Date() && t.status !== "done";
                              return (
                                <span className={cn(
                                  "w-24 text-left font-medium flex items-center gap-1.5",
                                  isOverdue ? "text-[var(--coral)]" : "text-[var(--text-secondary)]"
                                )}>
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  {parsedDate
                                    ? parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                    : "No due date"}
                                </span>
                              );
                            })()}

                            {/* Subtask Stats Column */}
                            <span className="w-24 text-right flex items-center justify-end gap-1.5 text-[var(--text-muted)] font-medium">
                              <CheckSquare className="h-3 w-3 shrink-0" />
                              {totalSubtasks > 0 ? (
                                <span className={completedSubtasks === totalSubtasks ? "text-[var(--emerald)]" : "text-[var(--text-secondary)]"}>
                                  {completedSubtasks}/{totalSubtasks}
                                </span>
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Inline Task Adder Box */}
                    {inlineAddStatus === status ? (
                      <div className="p-3 bg-[var(--bg-card)] flex items-center gap-2 border-t border-[var(--border-subtle)]/60 border-l-4" style={{ borderLeftColor: meta.color }}>
                        <Input
                          type="text"
                          placeholder="What needs to be done? Press Enter to save..."
                          value={inlineTitle}
                          onChange={(e) => setInlineTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleInlineCreate(status);
                          }}
                          className="h-8.5 text-[12.5px] bg-[var(--bg-app)] border-[var(--border-subtle)] flex-1 focus-visible:ring-1 focus-visible:ring-[var(--violet)] text-[var(--text-primary)]"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleInlineCreate(status)} 
                          className="h-8.5 text-[12px] btn-primary"
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => { setInlineAddStatus(null); setInlineTitle(""); }} 
                          className="h-8.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="py-2.5 px-4 hover:bg-[var(--bg-elevated)]/30 flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors border-l-4"
                        style={{ borderLeftColor: meta.color }}
                        onClick={() => setInlineAddStatus(status)}
                      >
                        <PlusCircle className="h-3.5 w-3.5 text-[var(--violet)]" />
                        <span className="text-[12px] font-medium">Add task</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        
        /* ── BOARD VIEW (Kanban Board) ── */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start select-none">
          {(Object.keys(STATUS_METADATA) as TaskStatus[]).map((columnStatus) => {
            const meta = STATUS_METADATA[columnStatus];
            const columnTasks = tasksByStatus[columnStatus];
            const isDraggingOver = draggedOverColumn === columnStatus;

            return (
              <div 
                key={columnStatus}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggedOverColumn(columnStatus);
                }}
                onDragLeave={() => setDraggedOverColumn(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggedOverColumn(null);
                  const taskId = e.dataTransfer.getData("text/plain");
                  if (taskId) {
                    handleStatusChange(taskId, columnStatus);
                  }
                }}
                className={cn(
                  "bg-black/5 dark:bg-black/25 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden flex flex-col max-h-[75vh] transition-all duration-150 border-l-4 border-zinc-300/70 dark:border-zinc-900/70",
                  isDraggingOver ? "bg-zinc-200/40 dark:bg-zinc-900/40 shadow-sm" : ""
                )}
                style={{ borderLeftColor: meta.color }}
              >
                
                {/* Column Header */}
                <div 
                  className="flex items-center justify-between p-3 border-b border-[var(--border-subtle)]/60 bg-[var(--bg-card)]/50"
                >
                  <span className="text-[11.5px] font-bold tracking-wider" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[150px]">
                  {columnTasks.map((t) => {
                    const completedSubtasks = (t.subtasks ?? []).filter((s) => s.done).length;
                    const totalSubtasks = (t.subtasks ?? []).length;
                    const subtaskPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", t.id);
                        }}
                        onClick={() => setSelectedTask(t)}
                        className="group bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 relative overflow-hidden"
                      >
                        {/* Title and project chip row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-medium text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 truncate">
                            {getProjectName(t.projectId)}
                          </span>
                          
                          {/* Priority dot matching PRIORITY_DOT values */}
                          <span className="flex items-center gap-1 shrink-0">
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[t.priority] ?? "bg-zinc-700")} />
                            <span className="text-[10px] font-medium text-zinc-400 capitalize">{t.priority}</span>
                          </span>
                        </div>
                        
                        <h4 className="text-[13px] font-medium text-white leading-normal line-clamp-2">
                          {t.title}
                        </h4>

                        {/* Progress Bar (Subtasks) */}
                        {totalSubtasks > 0 && (
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center justify-between text-[9.5px] text-[var(--text-secondary)] font-medium">
                              <span>Subtasks progress</span>
                              <span>{completedSubtasks}/{totalSubtasks}</span>
                            </div>
                            <Progress value={subtaskPercentage} className="h-1 bg-[var(--bg-app)] [&>div]:bg-[var(--violet)]" />
                          </div>
                        )}

                        {/* Footer Due date and hover AI action */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border-subtle)]/60 h-7">
                          {(() => {
                            const parsedDate = parseDueDate(t.dueDate);
                            const isOverdue = parsedDate && parsedDate < new Date() && t.status !== "done";
                            return (
                              <span className={cn(
                                "text-[10.5px] font-medium flex items-center gap-1",
                                isOverdue ? "text-[var(--coral)]" : "text-[var(--text-secondary)]"
                              )}>
                                <Calendar className="h-3 w-3 text-[var(--text-muted)]" />
                                {parsedDate
                                  ? parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                  : "—"}
                              </span>
                            );
                          })()}

                          {/* Hover AI "Generate subtasks" Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAiGenerateSubtasks(t);
                            }}
                            disabled={!!generatingTaskId}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-150 inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-black hover:bg-zinc-200 border border-white/20 text-[10.5px] font-semibold shadow-sm cursor-pointer shrink-0"
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {generatingTaskId === t.id ? "Generating..." : "✦ Generate subtasks"}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="py-8 flex flex-col items-center justify-center border border-dashed border-[var(--border-subtle)]/60 rounded-xl text-center">
                      <span className="text-[11.5px] text-[var(--text-muted)] font-medium">Drag tasks here</span>
                    </div>
                  )}
                </div>

                {/* Inline adder triggered from Board view */}
                <div className="p-2 border-t border-[var(--border-subtle)]/60 bg-[var(--bg-card)]/30">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setInlineAddStatus(columnStatus);
                      setInlineTitle("");
                      setActiveView("list"); // Auto switch to focus input
                    }} 
                    className="w-full text-left justify-start h-8 text-[11.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CLICKUP STYLE TASK DETAILS DRAWER ── */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="bg-[var(--bg-sidebar)] border-l border-[var(--border-subtle)] text-[var(--text-primary)] sm:max-w-[550px] w-full p-0 flex flex-col h-full">
          {selectedTask && (
            <div className="flex flex-col h-full">
              
              {/* Drawer Top Toolbar Controls */}
              <div className="h-14 border-b border-zinc-900/60 px-6 flex items-center justify-between bg-zinc-900/20">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] tracking-widest mr-1">STATUS:</span>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(v) => handleStatusChange(selectedTask.id, v as TaskStatus)}
                  >
                    <SelectTrigger className="h-7.5 bg-zinc-900 border-zinc-800 text-[12px] font-medium rounded px-2.5 gap-1 focus:ring-0 hover:border-zinc-700 transition-colors duration-120">
                      <span style={{ color: STATUS_METADATA[selectedTask.status].color }}>
                        {STATUS_METADATA[selectedTask.status].label}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-900 rounded-lg text-white">
                      {(Object.keys(STATUS_METADATA) as TaskStatus[]).map((status) => (
                        <SelectItem key={status} value={status} className="text-[12.5px] focus:bg-zinc-900">
                          <span style={{ color: STATUS_METADATA[status].color }}>
                            {STATUS_METADATA[status].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 mr-8">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] tracking-widest">PRIORITY:</span>
                  <Select
                    value={selectedTask.priority}
                    onValueChange={(v) => handlePriorityChange(selectedTask.id, v as Priority)}
                  >
                    <SelectTrigger className="h-7.5 bg-zinc-900 border-zinc-800 text-[12px] font-medium rounded px-2.5 gap-1 focus:ring-0 hover:border-zinc-700 transition-colors duration-120">
                      <span style={{ color: PRIORITY_METADATA[selectedTask.priority].color }}>
                        {PRIORITY_METADATA[selectedTask.priority].label}
                      </span>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-900 rounded-lg text-white">
                      {(Object.keys(PRIORITY_METADATA) as Priority[]).map((priority) => (
                        <SelectItem key={priority} value={priority} className="text-[12.5px] focus:bg-zinc-900">
                          <span style={{ color: PRIORITY_METADATA[priority].color }}>
                            {PRIORITY_METADATA[priority].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                
                {/* Title */}
                <div className="space-y-1">
                  <input
                    type="text"
                    defaultValue={selectedTask.title}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value.trim() !== selectedTask.title) {
                        updateMutation.mutate({ id: selectedTask.id, title: e.target.value.trim() });
                      }
                    }}
                    className="w-full bg-transparent border-0 font-semibold text-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:ring-0 focus:outline-none py-1 border-b border-transparent hover:border-[var(--border-subtle)] focus:border-[var(--violet)] transition-colors duration-120"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide px-1">TASK TITLE (CLICK TO EDIT)</p>
                </div>

                {/* Metadata Grid */}
                <div className="bg-black/35 border border-zinc-900 rounded-xl p-4 space-y-4 shadow-sm">
                  
                  {/* Project Selector */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Project
                    </span>
                    <Select
                      value={selectedTask.projectId}
                      onValueChange={(v) => handleProjectChange(selectedTask.id, v)}
                    >
                      <SelectTrigger className="h-8 bg-zinc-950 border-zinc-900 text-[12.5px] rounded-lg focus:ring-0 text-white hover:border-zinc-800 transition-colors duration-150">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-900 rounded-lg text-white">
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-[12.5px] focus:bg-zinc-900">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due Date Picker */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Due date
                    </span>
                    <div className="relative">
                      <Input
                        type="date"
                        defaultValue={
                          (() => {
                            const parsed = parseDueDate(selectedTask.dueDate);
                            return parsed ? parsed.toISOString().split("T")[0] : "";
                          })()
                        }
                        onChange={(e) => handleDateChange(selectedTask.id, e.target.value)}
                        className="h-8 bg-zinc-950 border-zinc-900 text-[12.5px] rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-800 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">Description</label>
                  <textarea
                    placeholder="Add details, notes, or descriptions about this task..."
                    defaultValue={selectedTask.description || ""}
                    onBlur={(e) => {
                      if (e.target.value !== selectedTask.description) {
                        updateMutation.mutate({ id: selectedTask.id, description: e.target.value });
                      }
                    }}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-3.5 text-[13px] leading-relaxed text-[var(--text-primary)] placeholder-zinc-500 focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-800 min-h-[110px] resize-y transition-colors duration-150"
                  />
                </div>

                {/* Subtasks Section */}
                <div className="space-y-3.5 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] tracking-wider uppercase block">
                        Subtasks
                      </label>
                      <Button
                        onClick={() => handleAiGenerateSubtasks(selectedTask)}
                        disabled={!!generatingTaskId}
                        variant="ghost"
                        size="icon-sm"
                        className="h-5 px-1.5 text-[10.5px] text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded-md flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {generatingTaskId === selectedTask.id ? "Generating..." : "AI Generate"}
                      </Button>
                    </div>
                    <span className="text-[11.5px] font-medium text-[var(--text-muted)]">
                      {(selectedTask.subtasks ?? []).filter((s) => s.done).length} of {(selectedTask.subtasks ?? []).length} completed
                    </span>
                  </div>

                  {/* Subtask Progress Bar */}
                  {(selectedTask.subtasks ?? []).length > 0 && (
                    <Progress 
                      value={
                        ((selectedTask.subtasks ?? []).filter((s) => s.done).length / (selectedTask.subtasks ?? []).length) * 100
                      } 
                      className="h-1.5 bg-black/40 [&>div]:bg-white shadow-sm" 
                    />
                  )}

                  {/* Checklist rows */}
                  <div className="space-y-2 bg-black/5 dark:bg-black/20 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-900/60">
                    {(selectedTask.subtasks ?? []).map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2.5 group/row">
                        <Checkbox
                          checked={subtask.done}
                          onCheckedChange={() => handleToggleSubtask(selectedTask, subtask.id)}
                          className="border-zinc-800 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black shrink-0"
                        />
                        <input
                          type="text"
                          defaultValue={subtask.title}
                          onBlur={(e) => {
                            if (e.target.value.trim() && e.target.value.trim() !== subtask.title) {
                              handleRenameSubtask(selectedTask, subtask.id, e.target.value.trim());
                            }
                          }}
                          className={cn(
                            "bg-transparent border-0 p-0 text-[12.5px] focus:ring-0 focus:outline-none flex-1 leading-normal text-[var(--text-primary)]",
                            subtask.done ? "line-through text-zinc-500" : "text-[var(--text-primary)]"
                          )}
                        />
                        <button
                          onClick={() => handleDeleteSubtask(selectedTask, subtask.id)}
                          className="h-7 w-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-950/10 opacity-0 group-hover/row:opacity-100 transition-all duration-120 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Quick Subtask Adder */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-900/60">
                      <PlusCircle className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                      <input
                        type="text"
                        placeholder="Add subtask... Press Enter to create"
                        className="bg-transparent border-0 p-0 text-[12px] focus:ring-0 focus:outline-none flex-1 placeholder-zinc-400 dark:placeholder-zinc-600 text-[var(--text-primary)]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value;
                            if (val.trim()) {
                              handleAddSubtask(selectedTask, val);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="h-16 border-t border-zinc-900/60 px-6 flex items-center justify-between bg-zinc-900/20">
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      deleteMutation.mutate(selectedTask.id);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-950/20 text-[12px] font-medium text-red-500 dark:text-red-450 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-300 dark:hover:border-red-900/30 transition-all duration-120 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Task
                </button>

                <Button 
                  onClick={() => setSelectedTask(null)}
                  className="h-8.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-850 text-[var(--text-primary)] border border-zinc-200 dark:border-zinc-800 text-[12px] rounded-lg cursor-pointer"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── CREATE NEW TASK MODAL DIALOG ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-950 border border-zinc-900 rounded-xl max-w-[420px] text-white">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-medium text-white">
              New task
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4.5 mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                ...form,
                status: "todo",
                description: "",
                subtasks: [],
                dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
              });
            }}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11.5px] font-semibold text-zinc-400 uppercase tracking-wider">Task title</label>
                <AIInlineButton
                  context="task_title"
                  currentValue={form.title}
                  onResult={(text) => setForm((f) => ({ ...f, title: text }))}
                  placeholder="Improve task title"
                  isPro={isPro}
                />
              </div>
              <Input
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                className="bg-zinc-900 border-zinc-800 h-10 text-[13px] rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-700 text-white focus:ring-0 placeholder-zinc-600"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-semibold text-zinc-400 uppercase tracking-wider">Project</label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                >
                  <SelectTrigger className="h-9.5 bg-zinc-900 border-zinc-800 text-[13px] rounded-lg focus:ring-0 text-white hover:border-zinc-700 transition-colors duration-120">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-900 rounded-lg text-white">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-[13px] focus:bg-zinc-900 focus:text-white">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11.5px] font-semibold text-zinc-400 uppercase tracking-wider">Priority</label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Priority }))}
                >
                  <SelectTrigger className="h-9.5 bg-zinc-900 border-zinc-800 text-[13px] rounded-lg focus:ring-0 text-white hover:border-zinc-700 transition-colors duration-120">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-900 rounded-lg text-white">
                    <SelectItem value="high" className="text-[13px] focus:bg-zinc-900 focus:text-white">High</SelectItem>
                    <SelectItem value="medium" className="text-[13px] focus:bg-zinc-900 focus:text-white">Medium</SelectItem>
                    <SelectItem value="low" className="text-[13px] focus:bg-zinc-900 focus:text-white">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11.5px] font-semibold text-zinc-400 uppercase tracking-wider">Due date</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="bg-zinc-900 border-zinc-800 h-10 text-[13px] rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-700 text-white placeholder-zinc-600 focus:ring-0"
              />
            </div>

            <DialogFooter className="gap-2.5 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="h-9.5 text-[13px] rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-white cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending} className="h-9.5 text-[13px] rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold cursor-pointer border-0 shadow-sm">
                Create task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

