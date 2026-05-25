import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Send, Plus, Trash2, Compass, FileText, Mail, ListTodo, User } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { getIdToken } from "@/lib/firebase/auth";
import { toast } from "sonner";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";

export const Route = createFileRoute("/dashboard/ai")({
  validateSearch: (search: Record<string, unknown>): { message?: string } => {
    return {
      message: (search.message as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "AI Assistant — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AIPage,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  { text: "Generate a 4-week project plan", desc: "Create a structured milestone timeline", category: "Planning", icon: ListTodo },
  { text: "Write a client proposal", desc: "Craft a professional business proposal", category: "Proposals", icon: FileText },
  { text: "Draft a project kickoff email", desc: "Polished client introduction email", category: "Email", icon: Mail },
  { text: "Summarize my active tasks", desc: "Get a quick status digest of items", category: "Tasks", icon: Compass },
];

function AIPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialMessageSent = useRef(false);

  const { data: convsData, isLoading: convsLoading } = useQuery<{
    conversations: Conversation[];
  }>({
    queryKey: ["ai-conversations"],
    queryFn: () =>
      apiClient.get<{ conversations: Conversation[] }>("/api/ai/conversations"),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const conversations = convsData?.conversations ?? [];

  const { data: subscription } = useQuery<{
    plan: string;
    subscriptionStatus: string;
    trialEndsAt?: string | null;
  }>({
    queryKey: ["subscription"],
    queryFn: () => apiClient.get("/api/billing/subscription"),
    enabled: !!user,
  });

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getIdToken()}`
        },
        body: JSON.stringify({ 
          priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID 
        })
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (search.message && !initialMessageSent.current) {
      initialMessageSent.current = true;
      sendMessage(search.message);
      navigate({ to: "/dashboard/ai", search: {} });
    }
  }, [search.message]);

  async function loadConversation(convId: string) {
    try {
      const data = await apiClient.get<{
        conversation: Conversation;
        messages: ChatMessage[];
      }>(`/api/ai/conversations/${convId}`);
      setActiveConvId(convId);
      setMessages(data.messages);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch {
      toast.error("Couldn't load conversation. Try again.");
    }
  }

  async function deleteConversation(convId: string) {
    try {
      await apiClient.delete(`/api/ai/conversations/${convId}`);
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      if (activeConvId === convId) {
        setActiveConvId(undefined);
        setMessages([]);
      }
    } catch {
      toast.error("Couldn't delete conversation. Try again.");
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const token = await getIdToken();
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, conversationId: activeConvId }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const newConvId = response.headers.get("X-Conversation-Id");
      if (newConvId && !activeConvId) {
        setActiveConvId(newConvId);
        qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: full, streaming: true };
            return updated;
          });
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: full, streaming: false };
        return updated;
      });
    } catch {
      setMessages((prev) => prev.slice(0, -2));
      toast.error("Couldn't get a response. Try again.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const isPro = subscription?.plan === "pro";

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)] max-w-[1200px] page-enter">
      {/* Conversation sidebar */}
      {isPro && (
        <div className="hidden md:flex w-[240px] shrink-0 flex-col rounded-2xl border border-white/5 bg-[#0D0E12]/80 backdrop-blur-md relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(94,106,210,0.06),transparent)] pointer-events-none" />
          
          <div className="p-4 border-b border-white/5 relative z-10">
            <Button
              className="w-full bg-[#1C1E27] hover:bg-[#252834] text-white border border-white/10 rounded-xl h-10 flex items-center justify-center gap-2 text-[13px] font-semibold transition-all duration-200"
              onClick={() => {
                setActiveConvId(undefined);
                setMessages([]);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
            >
              <Plus className="h-4 w-4" />New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 relative z-10 space-y-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2.5">Recent Conversations</p>

            <div className="space-y-1">
              {convsLoading ? (
                <div className="space-y-2 px-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-lg bg-white/5" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-[12px] text-zinc-500 px-2.5 py-3 italic">
                  No recent chats
                </p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-center rounded-xl transition-all duration-200 pl-1 pr-2",
                      activeConvId === c.id
                        ? "bg-[#1C1E27]/90 border border-white/5 text-white"
                        : "hover:bg-[#1C1E27]/40 text-zinc-400 hover:text-white border border-transparent",
                    )}
                  >
                    <button
                      className="flex-1 text-left px-2.5 py-2.5 min-w-0"
                      onClick={() => loadConversation(c.id)}
                    >
                      <p className="text-[12.5px] font-medium truncate leading-tight">
                        {c.title}
                      </p>
                    </button>
                    <button
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-[#FF6B6B] transition-all shrink-0 rounded-md hover:bg-white/5"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(c.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat panel */}
      {!isPro ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#0D0E12]/80 border border-white/5 rounded-2xl min-w-0 shadow-lg backdrop-blur-md">
          <div className="max-w-[480px] w-full">
            <UpgradePrompt
              feature="AI Assistant"
              description="Draft proposals, generate project plans, and write emails with AI. Upgrade to Mershal Pro to unlock the AI Assistant."
              onUpgrade={handleUpgrade}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col rounded-2xl border border-white/5 bg-[#0D0E12]/80 shadow-2xl backdrop-blur-md min-w-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(94,106,210,0.04),transparent)] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0 relative z-10 bg-[#0F1015]/60 backdrop-blur-md">
            <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm shrink-0 border border-white/10">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-white tracking-tight">Mershal AI Assistant</p>
              <p className="text-[11px] text-zinc-500 font-medium">Context: custom-trained on your workspace & documents</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 relative z-10">
            {messages.length === 0 && (
              <div className="max-w-2xl mx-auto space-y-8 pt-8">
                {/* Welcome */}
                <div className="text-center space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mx-auto border border-white/10">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[18px] font-bold text-white tracking-tight">
                      How can I accelerate your workspace today?
                    </p>
                    <p className="text-[13px] text-zinc-400 max-w-[400px] mx-auto leading-relaxed">
                      Ask me anything about your active clients, projects, invoices, or write proposals and emails with inline context.
                    </p>
                  </div>
                </div>

                {/* Suggestion cards */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {SUGGESTIONS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.text}
                        onClick={() => sendMessage(s.text)}
                        className="text-left p-4 rounded-2xl border border-white/5 bg-[#121319]/80 hover:bg-[#1C1E27] hover:border-[#5E6AD2]/50 transition-all duration-300 group shadow-sm flex items-start gap-3.5 relative overflow-hidden cursor-pointer"
                      >
                        <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.03),transparent_70%)] pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                        <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-[#5E6AD2] group-hover:bg-[#5E6AD2]/10 group-hover:border-[#5E6AD2]/20 transition-all shrink-0">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <span className="text-[9px] font-bold text-[#5E6AD2] uppercase tracking-wider bg-[#5E6AD2]/10 px-2 py-0.5 rounded-md">
                            {s.category}
                          </span>
                          <p className="text-[12.5px] font-bold text-white leading-tight mt-1.5 group-hover:text-[#5E6AD2] transition-colors">{s.text}</p>
                          <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">{s.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex gap-3.5 max-w-3xl mx-auto w-full", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm shrink-0 mt-0.5 border border-white/10">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-sm relative overflow-hidden max-w-[75%]",
                    m.role === "user"
                      ? "bg-gradient-to-br from-[#5E6AD2] to-[#4B55C4] text-white border border-[#5E6AD2]/20 rounded-tr-sm"
                      : "bg-[#121319]/90 text-zinc-100 border border-white/5 rounded-tl-sm shadow-inner"
                  )}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.streaming && (
                    <span className="inline-block w-[2px] h-[14px] bg-current ml-0.5 align-middle animate-pulse" />
                  )}
                </div>
                {m.role === "user" && (
                  <div className="h-8 w-8 rounded-xl bg-[#1C1E27] border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-zinc-400">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input field */}
          <div className="p-4 border-t border-white/5 shrink-0 bg-[#0F1015]/60 backdrop-blur-md relative z-10">
            <form
              className="max-w-3xl mx-auto flex items-center gap-3 bg-[#121319] border border-white/8 hover:border-white/12 focus-within:border-[#5E6AD2]/80 focus-within:ring-2 focus-within:ring-[#5E6AD2]/15 focus-within:shadow-[0_0_20px_rgba(94,106,210,0.12)] rounded-xl px-4 py-2.5 transition-all duration-300"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <input
                ref={inputRef}
                placeholder="Ask anything about your workspace (e.g. project timelines, invoices)..."
                className="flex-1 bg-transparent text-[13.5px] text-[#F0F0F5] placeholder:text-zinc-500 outline-none border-none disabled:opacity-50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className="shrink-0 h-8 w-8 rounded-lg bg-[#5E6AD2] hover:bg-[#4D59C2] text-white shadow-glow hover:shadow-glow-md transition-all duration-300 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIPage;
