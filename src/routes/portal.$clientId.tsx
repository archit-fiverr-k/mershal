import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, Download, Upload, Send, FileText, Shield, Sparkles, Copy, X, Bell, 
  Trash2, Lock, Eye, EyeOff, ShieldAlert, Pencil, Paperclip, MessageSquare, CreditCard 
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Whiteboard } from "@/components/whiteboard";

export const Route = createFileRoute("/portal/$clientId")({
  head: () => ({
    meta: [
      { title: "Client Portal — Mershal" },
      { name: "description", content: "Access your project deliverables, invoices, files, and chat with your agency." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalPage,
});

function fmtDate(ts: unknown): string {
  if (!ts) return "—";
  try {
    const d =
      typeof ts === "object" && ts !== null && "seconds" in ts
        ? new Date((ts as { seconds: number }).seconds * 1000)
        : new Date(ts as string);
    return format(d, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function calculateDaysRemaining(dateVal: any): number {
  if (!dateVal) return 0;
  try {
    const d = typeof dateVal === "object" && dateVal !== null && "seconds" in dateVal
      ? new Date(dateVal.seconds * 1000)
      : new Date(dateVal);
    const diff = d.getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  } catch {
    return 0;
  }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PortalPage() {
  const { clientId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Section Refs for tab scrolling
  const overviewRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const invoicesRef = useRef<HTMLDivElement>(null);

  // State
  const [inputPassword, setInputPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [localError, setLocalError] = useState("");

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) return;
    setPassword(inputPassword.trim());
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`portal_password_${clientId}`, inputPassword.trim());
    }
  };

  const [activeTab, setActiveTab] = useState<"overview" | "files" | "messages" | "invoices" | "whiteboard">("overview");
  const [msgInput, setMsgInput] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  
  // Revision Modal State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [selectedMilestone, setSelectedMilestone] = useState<{ id: string; name: string } | null>(null);

  // Offline Payment Proof State
  const [submittingProofInvoice, setSubmittingProofInvoice] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileName, setProofFileName] = useState("");
  const [proofFileSize, setProofFileSize] = useState("");

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment states
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [stripeCard, setStripeCard] = useState<any>(null);

  const [agencyOnline, setAgencyOnline] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  // Dynamic Greeting Based on Time of Day
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs >= 12 && hrs < 17) {
      setGreeting("Good afternoon");
    } else if (hrs >= 17) {
      setGreeting("Good evening");
    } else {
      setGreeting("Good morning");
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        new Notification("Alerts Enabled!", {
          body: "You will be notified here when you receive replies or milestones update.",
        });
      }
    } catch (err) {
      console.error("Error requesting notifications:", err);
    }
  };

  // Load/save password from sessionStorage
  const [password, setPassword] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`portal_password_${clientId}`) || "";
    }
    return "";
  });

  // Fetch Portal Data with 2-second real-time sync polling
  const { data, isLoading, error } = useQuery<{
    client: any;
    projects: any[];
    invoices: any[];
    messages: any[];
    tasks: any[];
  }>({
    queryKey: ["portal", clientId, password],
    queryFn: () =>
      apiClient.get<any>(`/api/portal/${clientId}`, {
        headers: password ? { "x-portal-password": password } : undefined,
      }),
    refetchInterval: (query) => {
      if (query.state.error) {
        const err = query.state.error as any;
        if (err?.status === 401) return false;
      }
      return 2000;
    },
    staleTime: 0,
    retry: (failureCount, error: any) => {
      if (error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (error && (error as any).status === 401) {
      const apiErr = (error as any).data?.error || (error as any).message;
      if (apiErr === "Incorrect password") {
        setLocalError("Incorrect password. Please verify and try again.");
      } else {
        setLocalError("");
      }
    } else {
      setLocalError("");
    }
  }, [error]);

  const client = data?.client;
  const projectsList = data?.projects ?? [];
  const invoicesList = data?.invoices ?? [];
  const messagesList = data?.messages ?? [];
  const tasksList = data?.tasks ?? [];

  const activeGateway = data?.paymentGateway?.activeGateway;
  useEffect(() => {
    if (activeGateway === "stripe") {
      loadScript("https://js.stripe.com/v3/");
    } else if (activeGateway === "razorpay") {
      loadScript("https://checkout.razorpay.com/v1/checkout.js");
    }
  }, [activeGateway]);

  useEffect(() => {
    if (!selectedInvoice || data?.paymentGateway?.activeGateway !== "stripe") {
      setStripeCard(null);
      return;
    }

    let active = true;
    let cardInstance: any = null;

    const timer = setTimeout(() => {
      if (!active) return;
      try {
        const stripePub = data.paymentGateway.stripePublishableKey;
        if (!stripePub) {
          toast.error("Stripe configuration is missing.");
          return;
        }

        const stripeObj = (window as any).Stripe(stripePub);
        const elements = stripeObj.elements();
        const card = elements.create("card", {
          style: {
            base: {
              color: "#F0F0F5",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "14px",
              "::placeholder": {
                color: "#5C5F73",
              },
            },
            invalid: {
              color: "#FF6B6B",
              iconColor: "#FF6B6B",
            },
          },
        });

        card.mount("#stripe-card-element");
        cardInstance = card;
        setStripeCard(card);
        
        card.on("change", (event: any) => {
          if (event.error) {
            setStripeError(event.error.message);
          } else {
            setStripeError("");
          }
        });
      } catch (err: any) {
        console.error("Error mounting Stripe Element:", err);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
      if (cardInstance) {
        try {
          cardInstance.destroy();
        } catch (e) {}
      }
    };
  }, [selectedInvoice, data]);

  const handleStripePaymentSubmit = async () => {
    if (!selectedInvoice || !stripeCard) return;
    setIsProcessingPayment(true);
    setStripeError("");

    try {
      const res = await apiClient.post<{ clientSecret: string }>(
        `/api/portal/${clientId}/pay`,
        { invoiceId: selectedInvoice.id }
      );

      const stripePub = data?.paymentGateway?.stripePublishableKey;
      const stripeObj = (window as any).Stripe(stripePub);

      const { paymentIntent, error } = await stripeObj.confirmCardPayment(
        res.clientSecret,
        {
          payment_method: {
            card: stripeCard,
            billing_details: {
              email: client.email,
              name: client.name,
            },
          },
        }
      );

      if (error) {
        setStripeError(error.message || "Failed to confirm payment.");
        setIsProcessingPayment(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        await apiClient.post(`/api/portal/${clientId}/confirm`, {
          invoiceId: selectedInvoice.id,
          paymentMethod: "stripe",
          stripePaymentIntentId: paymentIntent.id,
        });

        toast.success("Payment processed successfully!");
        setSelectedInvoice(null);
        qc.invalidateQueries({ queryKey: ["portal", clientId] });
      }
    } catch (err: any) {
      setStripeError(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRazorpayPayment = async (invoice: any) => {
    setIsProcessingPayment(true);
    try {
      const res = await apiClient.post<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }>(`/api/portal/${clientId}/pay`, { invoiceId: invoice.id });

      const options = {
        key: res.keyId,
        amount: res.amount,
        currency: res.currency,
        name: client.company || "Mershal Workspace",
        description: `Invoice ${invoice.invoiceNumber} Payment`,
        order_id: res.orderId,
        handler: async function (response: any) {
          try {
            await apiClient.post(`/api/portal/${clientId}/confirm`, {
              invoiceId: invoice.id,
              paymentMethod: "razorpay",
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success("Payment succeeded!");
            qc.invalidateQueries({ queryKey: ["portal", clientId] });
          } catch (confirmErr: any) {
            toast.error(confirmErr.message || "Failed to confirm payment signature.");
          }
        },
        prefill: {
          name: client.name,
          email: client.email,
        },
        theme: {
          color: "#5E6AD2",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate Razorpay checkout.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayClick = (invoice: any) => {
    const gateway = data?.paymentGateway?.activeGateway;
    if (gateway === "stripe") {
      setSelectedInvoice(invoice);
    } else if (gateway === "razorpay") {
      handleRazorpayPayment(invoice);
    } else {
      toast.error("Payments are currently disabled.");
    }
  };

  const mainProject = projectsList[0] || null;

  // Map milestones checklist dynamically from project tasks
  const milestones = tasksList.map((t: any) => {
    let status = "pending";
    let badge: string | null = null;
    if (t.status === "done") {
      status = "done";
      badge = "Done";
    } else if (t.status === "review" || t.status === "in_progress") {
      status = "active";
      badge = t.status === "review" ? "In review" : "In progress";
    }

    return {
      id: t.id,
      name: t.title,
      status,
      date: t.dueDate ? fmtDate(t.dueDate) : "Scheduled",
      badge,
      originalStatus: t.status,
    };
  });

  const reviewMilestone = milestones.find((m) => m.originalStatus === "review");

  const uploadedFiles = client?.files ?? [];

  // File mutations
  const uploadFileMutation = useMutation({
    mutationFn: (fileObj: { name: string; size: string }) =>
      apiClient.post(`/api/portal/${clientId}/file`, fileObj),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", clientId] });
      toast.success("File uploaded successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload file.");
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileObj: { name: string; size: string; date: string }) =>
      apiClient.post(`/api/portal/${clientId}/file-delete`, fileObj),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", clientId] });
      toast.success("File deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete file.");
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sizeKB = (file.size / 1024).toFixed(1);
      const sizeStr = parseFloat(sizeKB) > 1024 
        ? `${(parseFloat(sizeKB) / 1024).toFixed(1)} MB` 
        : `${sizeKB} KB`;
      
      await uploadFileMutation.mutateAsync({
        name: file.name,
        size: sizeStr,
      });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileDelete = (idx: number) => {
    const file = uploadedFiles[idx];
    if (!file) return;
    deleteFileMutation.mutate({
      name: file.name,
      size: file.size,
      date: file.date,
    });
  };

  // Actions
  const approveMutation = useMutation({
    mutationFn: (milestoneId: string) =>
      apiClient.post(`/api/portal/${clientId}/approve`, { milestoneId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", clientId] });
      toast.success("Milestone approved!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Approval failed.");
    }
  });

  const revisionMutation = useMutation({
    mutationFn: (payload: { milestoneId: string; note: string }) =>
      apiClient.post(`/api/portal/${clientId}/revision`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", clientId] });
      toast.success("Revision request submitted!");
      setIsRevisionModalOpen(false);
      setRevisionNote("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Revision submission failed.");
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/api/portal/${clientId}/message`, {
        content,
        senderName: user ? (user.displayName || "Agency") : (client?.name ?? "Client"),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", clientId] });
      setMsgInput("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Couldn't send message.");
    },
  });

  const submitProofMutation = useMutation({
    mutationFn: (payload: { invoiceId: string; fileName: string; fileSize: string }) =>
      apiClient.post(`/api/portal/${clientId}/pay-proof`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", clientId] });
      toast.success("Payment proof submitted successfully!");
      setSubmittingProofInvoice(null);
      setProofFile(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit payment proof.");
    }
  });

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKB = (file.size / 1024).toFixed(1);
    const sizeStr = parseFloat(sizeKB) > 1024 
      ? `${(parseFloat(sizeKB) / 1024).toFixed(1)} MB` 
      : `${sizeKB} KB`;
    
    setProofFile(file);
    setProofFileName(file.name);
    setProofFileSize(sizeStr);
  };

  const handleProofSubmit = () => {
    if (!submittingProofInvoice || !proofFileName) return;
    submitProofMutation.mutate({
      invoiceId: submittingProofInvoice.id,
      fileName: proofFileName,
      fileSize: proofFileSize,
    });
  };

  // Client Presence Polling
  useEffect(() => {
    let active = true;
    async function reportPresence() {
      try {
        const res = await apiClient.post<{
          success: boolean;
          lastAgencyActiveAt?: { seconds: number };
        }>(`/api/portal/${clientId}/presence`, { role: "client" });
        
        if (active && res.lastAgencyActiveAt) {
          const agencyLastActive = res.lastAgencyActiveAt.seconds * 1000;
          const now = Date.now();
          setAgencyOnline(now - agencyLastActive < 20000);
        }
      } catch (err) {
        console.error(err);
      }
    }

    reportPresence();
    const interval = setInterval(reportPresence, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [clientId]);

  // Message notifications
  const prevMessagesLength = useRef(messagesList.length);
  useEffect(() => {
    if (messagesList.length > prevMessagesLength.current) {
      const lastMsg = messagesList[messagesList.length - 1];
      if (lastMsg && !lastMsg.fromClient && notificationPermission === "granted") {
        new Notification(`New message from ${lastMsg.senderName || "Agency"}`, {
          body: lastMsg.content,
        });
      }
    }
    prevMessagesLength.current = messagesList.length;
  }, [messagesList, notificationPermission]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList]);

  const handleSendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    sendMessageMutation.mutate(msgInput);
  };

  const handleTabScroll = (tabName: "overview" | "files" | "messages" | "invoices", ref: React.RefObject<HTMLDivElement | null>) => {
    setActiveTab(tabName);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleGenerateShareableLink = async () => {
    try {
      setIsGeneratingLink(true);
      const res = await apiClient.post<{ portalUrl: string }>(`/api/portal/${clientId}`);
      await navigator.clipboard.writeText(res.portalUrl);
      toast.success("Secure link copied!");
    } catch (err: any) {
      toast.error("Failed to generate Secure portal link.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0E12] animate-pulse flex flex-col justify-between">
        <div>
          <header className="border-b border-white/5 h-[52px] bg-[#111318] flex items-center justify-between px-6">
            <Skeleton className="h-5 w-24 bg-white/5" />
            <Skeleton className="h-5 w-32 bg-white/5" />
          </header>
          <div className="max-w-[1000px] mx-auto px-5 py-8 space-y-6">
            <Skeleton className="h-20 w-2/3 bg-white/5" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-24 bg-white/5 rounded-xl" />
              <Skeleton className="h-24 bg-white/5 rounded-xl" />
              <Skeleton className="h-24 bg-white/5 rounded-xl" />
            </div>
            <div className="grid md:grid-cols-12 gap-6">
              <div className="md:col-span-7"><Skeleton className="h-[400px] bg-white/5 rounded-xl" /></div>
              <div className="md:col-span-5"><Skeleton className="h-[400px] bg-white/5 rounded-xl" /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isUnauthorized = error && (error as any).status === 401;

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-[#0D0E12] flex flex-col justify-between selection:bg-[#5E6AD2]/30 selection:text-[#F0F0F5]">
        {/* Top trust bar */}
        <div className="w-full bg-[rgba(0,200,150,0.05)] border-b border-[rgba(0,200,150,0.12)] h-9 flex items-center justify-center px-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[#00C896] font-medium">
            <Shield className="h-3.5 w-3.5" fill="rgba(0,200,150,0.15)" strokeWidth={2} />
            <span>Secure 256-bit SSL Connection</span>
          </div>
        </div>

        {/* Center Card */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative w-full max-w-[420px] rounded-2xl border border-[#2A2D3A] bg-[#16181F]/40 backdrop-blur-[12px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Ambient light glow */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-[#5E6AD2]/10 blur-[50px] pointer-events-none" />

            <div className="relative space-y-6 text-center">
              <div className="h-16 w-16 rounded-[22px] bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="h-7 w-7 text-[#8F99E8]" />
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Secure Portal Access</h1>
                <p className="text-xs text-[#8B8FA8] leading-relaxed max-w-[320px] mx-auto">
                  This collaborative project workspace is private. Please enter the unique password shared in your welcome email to enter.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-[#8B8FA8] block font-bold">
                    Portal Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordText ? "text" : "password"}
                      value={inputPassword}
                      onChange={(e) => {
                        setInputPassword(e.target.value);
                        if (localError) setLocalError("");
                      }}
                      placeholder="Enter access password"
                      autoFocus
                      className="w-full h-10 rounded-lg bg-[#0D0E12] border border-[#2A2D3A] pl-3 pr-10 text-xs text-white placeholder-[#5C5F73] focus:border-[#5E6AD2]/60 focus:outline-none transition-all duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-3 top-3 text-[#5C5F73] hover:text-[#8B8FA8] transition-colors cursor-pointer"
                    >
                      {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {localError && (
                  <p className="text-[11px] text-[#FF6B6B] font-medium flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    {localError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={!inputPassword.trim()}
                  className="w-full bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-xs h-10 font-semibold rounded-lg shadow-[0_0_15px_rgba(94,106,210,0.2)] transition-all duration-150 cursor-pointer"
                >
                  Verify Access Password
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full bg-[rgba(0,200,150,0.05)] border-t border-[rgba(0,200,150,0.12)] py-[10px] px-5 text-center shrink-0">
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#8B8FA8]">
            <span className="text-[#00C896] font-medium">Secured by Mershal</span>
            <span className="w-1 h-1 rounded-full bg-[#2A2D3A]" />
            <span>256-bit SSL SSL Link</span>
          </div>
        </footer>
      </div>
    );
  }

  // Fallback / Expired view
  if (error || !client) {
    return (
      <div className="min-h-screen bg-[#0D0E12] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-[20px] bg-[#5E6AD2]/10 flex items-center justify-center mb-6 border border-[#5E6AD2]/20">
          <Lock className="h-8 w-8 text-[#5E6AD2]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#F0F0F5] mb-2">This link has expired</h1>
        <p className="text-sm text-[#8B8FA8] max-w-sm mb-6 leading-relaxed">
          Please contact your agency representative to request a new secure client portal link.
        </p>
        {client?.email && (
          <div className="text-xs text-[#5C5F73] mt-2 font-medium">
            Agency Contact: <a href={`mailto:${client.email}`} className="text-[#5E6AD2] hover:underline">{client.email}</a>
          </div>
        )}
      </div>
    );
  }

  const clientInitials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0D0E12] text-[#F0F0F5] font-sans flex flex-col justify-between selection:bg-[#5E6AD2]/30 selection:text-[#F0F0F5]">
      <div>
        {/* Owner Preview Mode Ribbon */}
        {user && (
          <div className="bg-[#5E6AD2]/10 border-b border-[#5E6AD2]/25 py-2.5 px-6 sticky top-0 z-50 backdrop-blur-md">
            <div className="max-w-[1000px] mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#5E6AD2] animate-pulse" />
                <span className="text-[12px] font-medium text-[#8F99E8]">Owner Preview Mode — Client: {client.name}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-[#5E6AD2]/30 text-[#8F99E8] hover:bg-[#5E6AD2]/15 gap-1.5 transition-all duration-150"
                onClick={handleGenerateShareableLink}
                disabled={isGeneratingLink}
              >
                {isGeneratingLink ? (
                  "Generating..."
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy Client Access Link
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 1. Trust Bar */}
        <div className="w-full bg-[rgba(0,200,150,0.07)] border-b border-[rgba(0,200,150,0.12)] h-9 flex items-center justify-center px-4">
          <div className="max-w-[1000px] w-full flex flex-wrap items-center justify-center gap-x-6 gap-y-1 sm:gap-x-8">
            <div className="flex items-center gap-1.5 text-[11px] text-[#00C896] font-medium">
              <Shield className="h-3.5 w-3.5" fill="rgba(0,200,150,0.15)" strokeWidth={2} />
              <span>End-to-end encrypted</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B8FA8]">
              <Lock className="h-3 w-3 text-[#8B8FA8]" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B8FA8]">
              <Check className="h-3.5 w-3.5 text-[#8B8FA8]" />
              <span>GDPR compliant</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B8FA8]">
              <EyeOff className="h-3.5 w-3.5 text-[#8B8FA8]" />
              <span>Data never shared</span>
            </div>
          </div>
        </div>

        {/* 2. Navbar */}
        <header className="sticky top-0 sm:top-[37px] z-40 bg-[#111318] border-b border-[#2A2D3A] h-[52px]">
          <div className="max-w-[1000px] mx-auto px-5 h-full flex items-center justify-between gap-4">
            
            {/* Left: Mershal logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-[26px] w-[26px] rounded-[7px] bg-[#5E6AD2] flex items-center justify-center text-white text-[11px] font-black shadow-[0_0_12px_rgba(94,106,210,0.4)]">
                Me
              </div>
              <span className="font-bold tracking-tight text-sm text-white">
                Mer<span className="text-[#5E6AD2]">shal</span>
              </span>
            </div>

            {/* Center: Tab Navigation */}
            <nav className="flex items-center h-full overflow-x-auto whitespace-nowrap scrollbar-none gap-6 px-1">
              {[
                { id: "overview", label: "Overview" },
                { id: "messages", label: "Discussion" },
                { id: "files", label: "Files" },
                { id: "invoices", label: "Invoices" },
                { id: "whiteboard", label: "Whiteboard" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "text-[13px] font-medium h-full border-b-2 flex items-center px-1 transition-all duration-150 cursor-pointer relative",
                    activeTab === tab.id
                      ? "border-[#5E6AD2] text-white"
                      : "border-transparent text-[#8B8FA8] hover:text-[#F0F0F5]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Right: Client info */}
            <div className="flex items-center gap-2 shrink-0 max-w-[150px] sm:max-w-none">
              <div className="text-right hidden sm:block">
                <p className="text-[12px] font-semibold text-white leading-3">{client.name}</p>
                <span className="text-[10px] text-[#8B8FA8] mt-0.5 block">{client.company}</span>
              </div>
              <div className="h-7 w-7 rounded-full bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#8F99E8] text-[11px] font-bold shrink-0">
                {clientInitials}
              </div>
            </div>

          </div>
        </header>

        <div className="max-w-[1000px] mx-auto px-5 py-6 space-y-6">

          {/* 3. Welcome Header */}
          <div ref={overviewRef} className="pt-2">
            <h2 className="text-[18px] font-medium text-white tracking-tight">
              {greeting}, {client.name.split(" ")[0]} 👋
            </h2>
            <p className="text-[13px] text-[#8B8FA8] mt-1 font-normal leading-relaxed">
              {mainProject ? (
                <>Here's the latest on your <span className="text-white font-medium">{mainProject.name}</span> project.</>
              ) : (
                <>Welcome to your secure client portal.</>
              )}
            </p>
          </div>

          {/* 4. Stats Row */}
          {mainProject && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Card 1 — Project status */}
              <div className="bg-[#16181F] border border-[#2A2D3A] rounded-[10px] p-[14px] px-4 flex flex-col justify-between min-h-[72px]">
                <span className="text-[11.5px] uppercase tracking-wider text-[#8B8FA8] font-bold">Project status</span>
                <span className="text-[16px] font-semibold text-[#8F99E8] mt-1 capitalize">
                  {mainProject.status.replace("_", " ")}
                </span>
              </div>

              {/* Card 2 — Overall progress */}
              <div className="bg-[#16181F] border border-[#2A2D3A] rounded-[10px] p-[14px] px-4 flex flex-col justify-between min-h-[72px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] uppercase tracking-wider text-[#8B8FA8] font-bold">Overall progress</span>
                  <span className="text-[15px] font-bold text-white">{mainProject.progress}%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1">
                  <div 
                    className="bg-[#5E6AD2] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${mainProject.progress}%` }} 
                  />
                </div>
              </div>

              {/* Card 3 — Due date */}
              <div className="bg-[#16181F] border border-[#2A2D3A] rounded-[10px] p-[14px] px-4 flex flex-col justify-between min-h-[72px]">
                <span className="text-[11.5px] uppercase tracking-wider text-[#8B8FA8] font-bold">Due date</span>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-1.5">
                  <span className="text-[15px] font-semibold text-white">{fmtDate(mainProject.dueDate)}</span>
                  <span className="text-[10px] text-[#8F99E8] font-medium bg-[#5E6AD2]/10 px-2 py-0.5 rounded-full border border-[#5E6AD2]/20">
                    {calculateDaysRemaining(mainProject.dueDate)} days remaining
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* 5. Main Body Tab Panels */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4"
                >
                  {/* LEFT COLUMN: Milestones */}
                  <div className="md:col-span-8 space-y-4">
                    <Card className="border-[#2A2D3A] bg-[#16181F]/40 backdrop-blur-[6px] rounded-[12px]">
                      <CardContent className="p-5">
                        <h3 className="text-[14px] font-semibold text-white tracking-tight mb-5">Project Milestones</h3>
                        
                        {milestones.length > 0 ? (
                          <div className="relative pl-6 space-y-6">
                            {/* Vertical line connector */}
                            <div className="absolute left-[13px] top-[14px] bottom-[14px] w-[0.5px] bg-[#2A2D3A]" />

                            {milestones.map((m) => {
                              const isDone = m.status === "done";
                              const isActive = m.status === "active";
                              const isPending = m.status === "pending";

                              return (
                                <div key={m.id} className="relative flex items-start gap-4">
                                  {/* Circle Dot wrapper */}
                                  <div 
                                    className={cn(
                                      "absolute -left-[26px] h-[26px] w-[26px] rounded-full flex items-center justify-center text-xs z-10 transition-all duration-300",
                                      isDone 
                                        ? "bg-[#00C896] text-white shadow-[0_0_8px_rgba(0,200,150,0.4)]" 
                                        : isActive 
                                          ? "bg-[#0D0E12] border-2 border-[#5E6AD2] text-[#8F99E8] shadow-[0_0_12px_rgba(94,106,210,0.3)] animate-pulse" 
                                          : "bg-[#111318] border border-[#2A2D3A] text-[#5C5F73]"
                                    )}
                                  >
                                    {isDone ? (
                                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                                    ) : isActive ? (
                                      <Pencil className="h-3 w-3 text-[#8F99E8]" strokeWidth={2.5} />
                                    ) : (
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#3D4158]" />
                                    )}
                                  </div>

                                  {/* Details */}
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <h4 className={cn(
                                        "text-[13px] font-semibold tracking-tight",
                                        isPending ? "text-[#5C5F73]" : "text-white"
                                      )}>
                                        {m.name}
                                      </h4>
                                      {m.badge && (
                                        <span className={cn(
                                          "text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                          isDone 
                                            ? "bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20" 
                                            : "bg-[#5E6AD2]/10 text-[#8F99E8] border border-[#5E6AD2]/20"
                                        )}>
                                          {m.badge}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-[#5C5F73] mt-0.5 block">{m.date}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <ShieldAlert className="h-8 w-8 text-[#5C5F73] mx-auto mb-2" />
                            <p className="text-xs text-[#8B8FA8]">No milestones added yet</p>
                            <p className="text-[10px] text-[#5C5F73] mt-0.5">Check back soon</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* RIGHT COLUMN: Info Panel */}
                  <div className="md:col-span-4 space-y-4">
                    {reviewMilestone && (
                      <div className="bg-[rgba(94,106,210,0.07)] border border-[rgba(94,106,210,0.2)] rounded-[10px] p-[14px] px-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4.5 w-4.5 text-[#8F99E8] shrink-0" />
                          <span className="text-[13px] font-semibold text-[#8F99E8]">Your approval needed</span>
                        </div>
                        <p className="text-xs text-[#8B8FA8] leading-relaxed">
                          The milestone <span className="text-white font-medium">"{reviewMilestone.name}"</span> is ready for review. Take a look at the details and mockups.
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <Button 
                            size="sm" 
                            onClick={() => approveMutation.mutate(reviewMilestone.id)}
                            loading={approveMutation.isPending}
                            className="bg-[#00C896] hover:bg-[#00B083] text-white text-[11.5px] px-3.5 h-8 font-semibold shadow-[0_0_12px_rgba(0,200,150,0.25)] transition-all duration-150"
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            disabled={approveMutation.isPending}
                            onClick={() => {
                              setSelectedMilestone(reviewMilestone);
                              setIsRevisionModalOpen(true);
                            }}
                            className="text-[#8B8FA8] hover:text-white hover:bg-white/5 text-[11.5px] px-3 h-8 font-medium transition-all duration-150"
                          >
                            Request revision
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {mainProject && (
                      <Card className="border-[#2A2D3A] bg-[#16181F]/40 backdrop-blur-[6px] rounded-[12px]">
                        <CardContent className="p-5 space-y-4">
                          <h3 className="text-[14px] font-semibold text-white tracking-tight">Project Summary</h3>
                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-[#8B8FA8]">Priority</span>
                              <span className="text-white font-medium capitalize">{mainProject.priority}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-[#8B8FA8]">Budget</span>
                              <span className="text-white font-semibold">${mainProject.budget.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-[#8B8FA8]">Timeline</span>
                              <span className="text-white font-medium">{fmtDate(mainProject.startDate)} – {fmtDate(mainProject.dueDate)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "files" && (
                <motion.div
                  key="files"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <Card className="border-[#2A2D3A] bg-[#16181F]/40 backdrop-blur-[6px] rounded-[12px]">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[14px] font-semibold text-white tracking-tight">Project Deliverables & Shared Files</h3>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          multiple
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs border-white/10 text-[#8B8FA8] hover:bg-white/5 hover:text-white"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-1.5" /> Upload File
                        </Button>
                      </div>

                      {uploadedFiles.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {uploadedFiles.map((file: any, idx: number) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between bg-[#111318] p-3 rounded-lg border border-white/5 hover:border-white/10 hover:bg-[#111318]/80 transition-all duration-100"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded bg-[#5E6AD2]/10 flex items-center justify-center shrink-0">
                                  <FileText className="h-5 w-5 text-[#8F99E8]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12.5px] font-medium text-white truncate max-w-[200px] sm:max-w-[280px]">{file.name}</p>
                                  <p className="text-[10px] text-[#5C5F73] mt-0.5">{file.size} · {file.date}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-[#8B8FA8] hover:text-[#5E6AD2] hover:bg-white/5 border border-white/5 rounded-md"
                                  onClick={() => toast.success(`Downloading "${file.name}"...`)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-[#8B8FA8] hover:text-[#CC4444] hover:bg-white/5 rounded-md"
                                  onClick={() => handleFileDelete(idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-white/10 rounded-lg p-12 text-center">
                          <FileText className="h-9 w-9 text-[#3D4158] mx-auto mb-3" />
                          <p className="text-sm text-[#8B8FA8]">No files shared yet</p>
                          <p className="text-xs text-[#5C5F73] mt-1">Upload reference designs, assets, or reports here.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === "messages" && (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <Card className="border-[#2A2D3A] bg-[#16181F]/40 backdrop-blur-[6px] rounded-[12px]">
                    <CardContent className="p-5 flex flex-col h-[520px]">
                      
                      <div className="flex items-center justify-between shrink-0 mb-3 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4.5 w-4.5 text-[#8F99E8]" />
                          <h3 className="text-[14px] font-semibold text-white tracking-tight">Project Discussion</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-1.5 w-1.5 rounded-full", agencyOnline ? "bg-[#00C896] animate-pulse" : "bg-[#5C5F73]")} />
                          <span className="text-[10px] text-[#8B8FA8] font-medium">
                            {agencyOnline ? "Agency Online" : "Agency Offline"}
                          </span>
                        </div>
                      </div>

                      {notificationPermission === "default" && (
                        <div className="bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 px-3 py-2 rounded-lg mb-3 flex items-center justify-between gap-3 text-[11px] shrink-0">
                          <span className="text-[#8B8FA8]">Enable sound alerts for replies?</span>
                          <Button size="sm" className="h-6 text-[10px] px-2 py-0 bg-[#5E6AD2] hover:bg-[#4D59C2]" onClick={requestNotificationPermission}>
                            Allow
                          </Button>
                        </div>
                      )}

                      {/* Messages Feed */}
                      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mb-4 scrollbar-thin">
                        {messagesList.map((m) => {
                          const isClientMessage = m.fromClient;
                          return (
                            <div key={m.id} className={cn("flex gap-2.5 items-end", isClientMessage ? "justify-end" : "justify-start")}>
                              {!isClientMessage && (
                                <div className="h-6.5 w-6.5 rounded-full bg-[#5E6AD2]/15 border border-[#5E6AD2]/20 flex items-center justify-center text-[#8F99E8] text-[9.5px] font-bold shrink-0 mb-4">
                                  AG
                                </div>
                              )}
                              <div className="max-w-[75%] space-y-1">
                                <div 
                                  className={cn(
                                    "p-3 text-xs leading-relaxed transition-all duration-100",
                                    isClientMessage 
                                      ? "bg-[rgba(94,106,210,0.15)] text-[#E2DCFF] rounded-[10px_0_10px_10px]" 
                                      : "bg-[#1C1E27] text-white rounded-[0_10px_10px_10px] border border-white/5"
                                  )}
                                >
                                  <p className="whitespace-pre-wrap">{m.content}</p>
                                </div>
                                <span className="text-[9.5px] text-[#5C5F73] block text-right">
                                  {fmtDate(m.createdAt)}
                                </span>
                              </div>
                              {isClientMessage && (
                                <div className="h-6.5 w-6.5 rounded-full bg-[#00C896]/15 border border-[#00C896]/20 flex items-center justify-center text-[#00C896] text-[9.5px] font-bold shrink-0 mb-4">
                                  {clientInitials}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {messagesList.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <MessageSquare className="h-6 w-6 text-[#2A2D3A] mb-2" />
                            <p className="text-xs text-[#8B8FA8]">No messages yet</p>
                            <p className="text-[10px] text-[#5C5F73] mt-0.5">Send a message to get started</p>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message Form */}
                      <form onSubmit={handleSendMsg} className="flex gap-2 shrink-0">
                        <div className="relative flex-1">
                          <input
                            className="w-full h-9 rounded-lg bg-[#111318] border border-[#2A2D3A] px-3 pr-8 text-xs text-white placeholder-[#5C5F73] focus:border-[#5E6AD2]/60 focus:outline-none transition-all duration-150"
                            placeholder="Type a message..."
                            value={msgInput}
                            onChange={(e) => setMsgInput(e.target.value)}
                            disabled={sendMessageMutation.isPending}
                          />
                          <button 
                            type="button" 
                            className="absolute right-2.5 top-2.5 text-[#5C5F73] hover:text-[#8B8FA8] transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4" />
                          </button>
                        </div>
                        <Button 
                          type="submit" 
                          size="sm" 
                          className="bg-[#5E6AD2] hover:bg-[#4D59C2] text-white h-9 px-3.5 rounded-lg shrink-0 transition-colors"
                          disabled={sendMessageMutation.isPending || !msgInput.trim()}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </form>

                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === "invoices" && (
                <motion.div
                  key="invoices"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <Card className="border-[#2A2D3A] bg-[#16181F]/40 backdrop-blur-[6px] rounded-[12px]">
                    <CardContent className="p-5">
                      <h3 className="text-[14px] font-semibold text-white tracking-tight mb-5">Billing & Invoices</h3>
                      
                      <div className="space-y-3">
                        {invoicesList.map((inv) => {
                          const isPaid = inv.status === "paid";
                          const isOverdue = inv.status === "overdue";
                          const isPendingVerification = inv.status === "pending_verification";

                          return (
                            <div 
                              key={inv.id} 
                              className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#111318] p-4 rounded-lg border border-white/5 gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[14px] font-semibold text-white">{inv.invoiceNumber}</p>
                                  {isPaid ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20">
                                      Paid
                                    </span>
                                  ) : isPendingVerification ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                      Pending Verification
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20">
                                      Overdue
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#5E6AD2]/10 text-[#8F99E8] border border-[#5E6AD2]/20">
                                      Sent
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[#5C5F73] block">
                                  Due: {fmtDate(inv.dueDate)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 flex-wrap">
                                <span className="text-[15px] font-bold text-white">${inv.total.toLocaleString()}</span>
                                
                                <div className="flex items-center gap-2">
                                  {!isPaid && !isPendingVerification && (
                                    <>
                                      {/* Online card gateway */}
                                      {data?.paymentGateway?.activeGateway && data.paymentGateway.activeGateway !== "none" && (
                                        !data.paymentGateway.isPro ? (
                                          <Button
                                            size="sm"
                                            disabled
                                            title="Upgrade to Pro to collect payments online"
                                            className="h-8 text-[11px] bg-zinc-800 text-zinc-500 flex items-center gap-1.5 px-3 rounded-md cursor-not-allowed opacity-60"
                                          >
                                            <Lock className="h-3.5 w-3.5" />
                                            Online Payments (Pro Only)
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            disabled={isProcessingPayment}
                                            onClick={() => handlePayClick(inv)}
                                            className="h-8 text-xs bg-[#5E6AD2] hover:bg-[#4D59C2] text-white flex items-center gap-1.5 px-3.5 rounded-md transition-all shadow-sm cursor-pointer"
                                          >
                                            <CreditCard className="h-3.5 w-3.5" />
                                            Pay Online
                                          </Button>
                                        )
                                      )}

                                      {/* Offline payment button */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSubmittingProofInvoice(inv)}
                                        className="h-8 text-xs border-white/10 hover:bg-white/5 text-[#8B8FA8] hover:text-white"
                                      >
                                        <Upload className="h-3.5 w-3.5 mr-1" />
                                        Submit Receipt Proof
                                      </Button>
                                    </>
                                  )}

                                  {isPendingVerification && (
                                    <span className="text-xs text-[#8B8FA8] italic bg-white/5 px-2.5 py-1 rounded-[6px] border border-white/5">
                                      Awaiting freelancer verification
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {invoicesList.length === 0 && (
                          <div className="text-center py-12">
                            <CreditCard className="h-9 w-9 text-[#3D4158] mx-auto mb-3" />
                            <p className="text-sm text-[#8B8FA8]">No invoices issued yet</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === "whiteboard" && (
                <motion.div
                  key="whiteboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <Whiteboard token={clientId} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* 6. Encrypted Footer */}
      <footer className="w-full bg-[rgba(0,200,150,0.05)] border-t border-[rgba(0,200,150,0.12)] py-[10px] px-5 mt-8 text-center">
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-[11px] text-[#8B8FA8]">
          <span className="text-[#00C896] font-medium">Secured by Mershal</span>
          <span className="hidden sm:inline w-1 h-1 rounded-full bg-[#2A2D3A]" />
          <span>Private link — only you can see this</span>
        </div>
      </footer>

      {/* Revision Modal Dialog */}
      <AnimatePresence>
        {isRevisionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Modal Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsRevisionModalOpen(false)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-[440px] rounded-xl border border-[#2A2D3A] bg-[#16181F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {/* Radial background ambient light */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-[#5E6AD2]/10 blur-[40px] pointer-events-none" />

              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Request revision for "{selectedMilestone?.name}"</h3>
                  <button 
                    onClick={() => setIsRevisionModalOpen(false)}
                    className="text-[#5C5F73] hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-[#8B8FA8] block font-bold">
                    Revision Notes
                  </label>
                  <textarea
                    rows={4}
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="Describe what changes or adjustments you need..."
                    className="w-full rounded-lg bg-[#0D0E12] border border-[#2A2D3A] p-3 text-xs text-white placeholder-[#5C5F73] focus:border-[#5E6AD2]/60 focus:outline-none transition-all duration-150 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-xs h-9 font-semibold"
                    disabled={!revisionNote.trim() || revisionMutation.isPending || !selectedMilestone}
                    onClick={() => revisionMutation.mutate({ milestoneId: selectedMilestone?.id ?? "", note: revisionNote })}
                  >
                    {revisionMutation.isPending ? "Submitting..." : "Submit Revision Request"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/5 text-[#8B8FA8] hover:bg-white/5 h-9"
                    onClick={() => setIsRevisionModalOpen(false)}
                    disabled={revisionMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stripe Payment Modal */}
      <AnimatePresence>
        {selectedInvoice && data?.paymentGateway?.activeGateway === "stripe" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (!isProcessingPayment) setSelectedInvoice(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-[440px] rounded-xl border border-[#2A2D3A] bg-[#16181F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-[#5E6AD2]/10 blur-[40px] pointer-events-none" />
              
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Pay Invoice {selectedInvoice.invoiceNumber}</h3>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    disabled={isProcessingPayment}
                    className="text-[#5C5F73] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="bg-[#111318] p-3 rounded-lg border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-[#8B8FA8]">Amount Due</span>
                  <span className="text-sm font-bold text-white">${selectedInvoice.total.toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-[#8B8FA8] block font-bold">
                    Card Details
                  </label>
                  <div className="p-3.5 bg-[#0D0E12] border border-[#2A2D3A] rounded-lg min-h-[44px]">
                    <div id="stripe-card-element" className="w-full" />
                  </div>
                  {stripeError && (
                    <p className="text-[11px] text-[#FF6B6B] font-medium animate-pulse">{stripeError}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-xs h-10 font-semibold"
                    disabled={isProcessingPayment || !stripeCard}
                    onClick={handleStripePaymentSubmit}
                  >
                    {isProcessingPayment ? "Processing..." : `Pay $${selectedInvoice.total.toLocaleString()}`}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/5 text-[#8B8FA8] hover:bg-white/5 h-10"
                    onClick={() => setSelectedInvoice(null)}
                    disabled={isProcessingPayment}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Payment Proof Modal Dialog */}
      <AnimatePresence>
        {submittingProofInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Modal Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (!submitProofMutation.isPending) {
                  setSubmittingProofInvoice(null);
                  setProofFile(null);
                }
              }}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-[440px] rounded-xl border border-[#2A2D3A] bg-[#16181F] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {/* Radial background ambient light */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-[#5E6AD2]/10 blur-[40px] pointer-events-none" />

              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Submit Payment Proof</h3>
                  <button 
                    onClick={() => {
                      setSubmittingProofInvoice(null);
                      setProofFile(null);
                    }}
                    disabled={submitProofMutation.isPending}
                    className="text-[#5C5F73] hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="bg-[#0D0E12] p-3 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[#8B8FA8]">Invoice Number</span>
                  <span className="text-white font-medium">{submittingProofInvoice.invoiceNumber}</span>
                </div>
                <div className="bg-[#0D0E12] p-3 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[#8B8FA8]">Amount Due</span>
                  <span className="text-white font-bold">${submittingProofInvoice.total.toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-[#8B8FA8] block font-bold">
                    Upload Bank Transfer / Receipt Proof
                  </label>
                  
                  <div 
                    onClick={() => document.getElementById("proof-file-input")?.click()}
                    className={cn(
                      "border border-dashed border-[#2A2D3A] bg-[#0D0E12] rounded-lg p-5 text-center cursor-pointer transition-all duration-150",
                      proofFile ? "border-[#5E6AD2] bg-[#5E6AD2]/5" : "hover:border-[#5E6AD2]/50 hover:bg-[#16181F]/20"
                    )}
                  >
                    <input
                      type="file"
                      id="proof-file-input"
                      className="hidden"
                      onChange={handleProofFileChange}
                    />
                    
                    {proofFile ? (
                      <div className="space-y-2">
                        <FileText className="h-7 w-7 text-[#8F99E8] mx-auto" />
                        <div>
                          <p className="text-xs font-semibold text-white truncate max-w-[280px] mx-auto">{proofFileName}</p>
                          <p className="text-[10px] text-[#8B8FA8] mt-0.5">{proofFileSize}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-7 w-7 text-[#3D4158] mx-auto mb-1" />
                        <p className="text-xs text-[#8B8FA8] font-medium">Click to select receipt or screenshot</p>
                        <p className="text-[10px] text-[#5C5F73]">PDF, PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-xs h-10 font-semibold"
                    disabled={!proofFile || submitProofMutation.isPending}
                    onClick={handleProofSubmit}
                  >
                    {submitProofMutation.isPending ? "Submitting..." : "Submit Proof of Payment"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/5 text-[#8B8FA8] hover:bg-white/5 h-10"
                    onClick={() => {
                      setSubmittingProofInvoice(null);
                      setProofFile(null);
                    }}
                    disabled={submitProofMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

