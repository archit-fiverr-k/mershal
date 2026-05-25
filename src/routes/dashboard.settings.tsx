import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconShieldCheck } from "@tabler/icons-react";
import { Gift, Copy, Check, Eye, EyeOff, CheckCircle, AlertTriangle, ArrowRight, Lock, ExternalLink, ShieldCheck, HelpCircle, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

const TABS = ["Profile", "Workspace", "Billing", "Integrations", "Notifications", "Security", "Referrals"] as const;
type Tab = typeof TABS[number];

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const defaultTab = (typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("tab")
    : null) ?? "profile";

  const [tab, setTab] = useState<Tab>(
    (TABS.find((t) => t.toLowerCase() === defaultTab) ?? "Profile") as Tab,
  );

  useEffect(() => {
    if (defaultTab) {
      const foundTab = TABS.find((t) => t.toLowerCase() === defaultTab);
      if (foundTab) {
        setTab(foundTab as Tab);
      }
    }
  }, [defaultTab]);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/profile"),
    enabled: !!user,
  });

  const { data: subscription } = useQuery<{
    plan: string;
    subscriptionStatus: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscription: {
      id: string;
      status: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
      cancelAt: string | null;
    } | null;
    trialEndsAt?: string | null;
  }>({
    queryKey: ["subscription"],
    queryFn: () => apiClient.get("/api/billing/subscription"),
    enabled: !!user,
  });

  const { data: invoicesData } = useQuery<{
    invoices: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      date: string;
      pdfUrl: string;
      description: string;
    }>;
  }>({
    queryKey: ["billing-invoices"],
    queryFn: () => apiClient.get("/api/billing/invoices"),
    enabled: !!user && tab === "Billing",
  });

  const [successBanner, setSuccessBanner] = useState(false);
  const [cancelledBanner, setCancelledBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        setSuccessBanner(true);
        const timer = setTimeout(() => setSuccessBanner(false), 5000);
        window.history.replaceState({}, document.title, window.location.origin + "/dashboard/settings?tab=billing");
        return () => clearTimeout(timer);
      }
      if (params.get("cancelled") === "true") {
        setCancelledBanner(true);
        const timer = setTimeout(() => setCancelledBanner(false), 3000);
        window.history.replaceState({}, document.title, window.location.origin + "/dashboard/settings?tab=billing");
        return () => clearTimeout(timer);
      }
    }
  }, [tab]);

  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [showSaved, setShowSaved] = useState(false);

  // Payment Integration States
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [activePaymentGateway, setActivePaymentGateway] = useState<"stripe" | "razorpay" | "none">("none");
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);

  // 2FA state
  const [isEnable2FAOpen, setIsEnable2FAOpen] = useState(false);
  const [isDisable2FAOpen, setIsDisable2FAOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const handleOpenEnable2FA = async () => {
    try {
      setIsVerifying2FA(true);
      const res = await apiClient.post<{ secret: string; qrCodeUrl: string }>("/api/auth/2fa/setup");
      setSetupData(res);
      setOtpCode("");
      setIsEnable2FAOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize 2FA setup");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleVerifyEnable2FA = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    try {
      setIsVerifying2FA(true);
      const res = await apiClient.post<{ success: boolean; token: string }>("/api/auth/2fa/verify", { code: otpCode });
      if (res.token) {
        localStorage.setItem("mershal_2fa_token", res.token);
      }
      if (user) {
        await user.getIdToken(true);
      }
      toast.success("Two-factor authentication enabled successfully");
      setIsEnable2FAOpen(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message || "Invalid code. Please try again.");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    try {
      setIsVerifying2FA(true);
      await apiClient.post("/api/auth/2fa/disable", { code: otpCode });
      localStorage.removeItem("mershal_2fa_token");
      if (user) {
        await user.getIdToken(true);
      }
      toast.success("Two-factor authentication disabled successfully");
      setIsDisable2FAOpen(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message || "Invalid code. Please try again.");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setWorkspaceName(profile.workspaceName ?? "");
      setMobileNumber(profile.mobileNumber ?? "");
      setTimezone(profile.timezone ?? "UTC");
      setStripePublishableKey(profile.stripePublishableKey ?? "");
      setStripeSecretKey(profile.stripeSecretKey ?? "");
      setRazorpayKeyId(profile.razorpayKeyId ?? "");
      setRazorpayKeySecret(profile.razorpayKeySecret ?? "");
      setActivePaymentGateway(profile.activePaymentGateway ?? "none");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: {
      fullName?: string;
      workspaceName?: string;
      mobileNumber?: string;
      timezone?: string;
      autoWelcomeEmail?: boolean;
      stripePublishableKey?: string;
      stripeSecretKey?: string;
      razorpayKeyId?: string;
      razorpayKeySecret?: string;
      activePaymentGateway?: "stripe" | "razorpay" | "none";
    }) => apiClient.patch("/api/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Saved");
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    },
    onError: (err: any) => toast.error(err.message || "Couldn't save changes. Try again."),
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) =>
      apiClient.post<{ url: string }>("/api/billing/create-checkout", {
        priceId,
        successUrl: `${window.location.origin}/dashboard/settings?tab=billing`,
        cancelUrl: `${window.location.origin}/dashboard/settings?tab=billing`,
      }),
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (err: any) => toast.error(err.message || "Couldn't open checkout. Try again."),
  });

  const portalMutation = useMutation({
    mutationFn: () => apiClient.post<{ url: string }>("/api/billing/create-portal"),
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (err: any) => toast.error(err.message || "Couldn't open billing portal. Try again."),
  });

  const initials = (profile?.fullName ?? user?.displayName ?? "U")
    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const PRO_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_PRICE_ID ?? "";

  // ── Referral system ────────────────────────────────────────────────────────
  const { data: referralData } = useQuery<{
    referralCode: string;
    referralLink: string;
    referredCount: number;
    creditsGranted: number;
  }>({
    queryKey: ["referrals"],
    queryFn: () => apiClient.get("/api/referrals"),
    enabled: !!user && tab === "Referrals",
    staleTime: 60_000,
  });

  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    if (!referralData?.referralLink) return;
    navigator.clipboard.writeText(referralData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }



  return (
    <>
      <div className={cn("space-y-6 page-enter", tab === "Billing" ? "max-w-[1000px]" : "max-w-[720px]")}>
      <div>
        <h1 className="text-page-title">Settings</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          Manage your account and workspace settings.
        </p>
      </div>

      {/* Tab bar — consistent 8px radius, instant transitions */}
      <div className="flex gap-0.5 p-1 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-120",
              tab === t
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/30 border border-transparent",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === "Profile" && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-6 shadow-sm hover:border-[var(--border-default)] transition-colors duration-200">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-[var(--border-subtle)] shadow-inner">
                  <AvatarImage src={profile?.avatarUrl ?? user?.photoURL ?? ""} />
                  <AvatarFallback className="bg-[var(--violet)] text-white text-[16px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-[14px] font-medium text-[var(--text-primary)]">Profile Picture</h3>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 mb-2">Upload a photo to personalize your client portal.</p>
                  <Button variant="outline" size="sm" className="h-8 text-[12px] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">
                    Upload photo
                  </Button>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)]/40 my-2" />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-secondary)]">Full name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-secondary)]">Email</label>
                  <Input 
                    value={user?.email ?? ""} 
                    disabled 
                    className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] text-[var(--text-secondary)] opacity-60 cursor-not-allowed" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-secondary)]">Mobile number</label>
                  <Input
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-secondary)]">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[13px] rounded-lg px-3 py-2 h-9 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] transition-all cursor-pointer hover:border-[var(--border-default)]"
                  >
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Europe/Paris">Paris (CET/CEST)</option>
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="Asia/Tokyo">Japan (JST)</option>
                    <option value="Asia/Shanghai">China (CST)</option>
                    <option value="Australia/Sydney">Sydney (AET)</option>
                  </select>
                </div>
              </div>
              <Button
                onClick={() => updateMutation.mutate({ fullName, mobileNumber, timezone })}
                loading={updateMutation.isPending}
                className="shadow-glow-sm btn-primary flex items-center gap-1.5"
              >
                {showSaved ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--emerald)] animate-in fade-in zoom-in duration-200" />
                    <span>Saved!</span>
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Workspace */}
      {tab === "Workspace" && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5 shadow-sm hover:border-[var(--border-default)] transition-colors duration-200">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--text-secondary)]">Workspace name</label>
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="My Studio"
              className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <Button
            onClick={() => updateMutation.mutate({ workspaceName })}
            loading={updateMutation.isPending}
            className="shadow-glow-sm btn-primary flex items-center gap-1.5"
          >
            {showSaved ? (
              <>
                <Check className="h-4 w-4 text-[var(--emerald)] animate-in fade-in zoom-in duration-200" />
                <span>Saved!</span>
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      )}

      {/* Billing */}
      {tab === "Billing" && (() => {
        const getTrialDaysRemaining = () => {
          if (!subscription?.trialEndsAt) return 0;
          const diffTime = new Date(subscription.trialEndsAt).getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return Math.max(0, diffDays);
        };
        const trialDaysRemaining = getTrialDaysRemaining();
        const isTrialActive = subscription?.trialEndsAt && new Date(subscription.trialEndsAt) > new Date();
        const progressPercent = Math.min(100, Math.max(0, ((15 - trialDaysRemaining) / 15) * 100));

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Success Banner */}
            {successBanner && (
              <div className="flex items-center gap-3 bg-[rgba(0,200,150,0.08)] border border-[rgba(0,200,150,0.2)] rounded-xl p-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
                <CheckCircle className="h-5 w-5 text-[var(--emerald)] shrink-0" />
                <p className="text-[13.5px] font-medium text-[var(--emerald)]">
                  You are now on Mershal Pro! Welcome to the premium tier.
                </p>
              </div>
            )}

            {/* Cancelled Banner */}
            {cancelledBanner && (
              <div className="flex items-center gap-3 bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)] rounded-xl p-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-[var(--amber)] shrink-0" />
                <p className="text-[13.5px] font-medium text-[var(--amber)]">
                  No worries — you can upgrade anytime.
                </p>
              </div>
            )}

            {/* Trial Timeline Progress Widget */}
            {isTrialActive && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--violet)]/8 to-[var(--bg-card)] border border-[rgba(94,106,210,0.25)] p-6 shadow-xl backdrop-blur-md">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.12),transparent_70%)] pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                  <div className="space-y-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[rgba(94,106,210,0.12)] border border-[rgba(94,106,210,0.2)] text-[10px] font-bold text-[var(--violet)] uppercase tracking-wider">
                      Mershal Pro Trial
                    </span>
                    <h3 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight">
                      {trialDaysRemaining} days remaining in your free trial
                    </h3>
                    <p className="text-[13px] text-[var(--text-secondary)] max-w-[480px] leading-relaxed">
                      You currently have unrestricted access to all Pro features (AI workspace, client portals, invoice tracking). Upgrade to a subscription anytime to secure continuous access.
                    </p>
                  </div>
                  <Button 
                    onClick={() => checkoutMutation.mutate(PRO_PRICE_ID)} 
                    loading={checkoutMutation.isPending}
                    className="bg-[var(--violet)] hover:bg-[#4D59C2] text-white font-semibold text-[13.5px] px-5 py-3 h-11 rounded-xl shadow-glow transition-all duration-300 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    Upgrade to Pro <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Timeline visual bar */}
                <div className="mt-6 space-y-2">
                  <div className="h-2.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)] relative">
                    <div 
                      style={{ width: `${progressPercent}%` }}
                      className="h-full bg-gradient-to-r from-[var(--violet)] to-[var(--emerald)] rounded-full shadow-glow-sm transition-all duration-800"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    <span>Day 1</span>
                    <span>{15 - trialDaysRemaining} Days Passed</span>
                    <span>Day 15</span>
                  </div>
                </div>
              </div>
            )}

            {/* Current plan card (Non-trial) */}
            {!isTrialActive && (
              <div className={cn(
                "rounded-2xl p-6 border shadow-card relative overflow-hidden bg-[var(--bg-card)] backdrop-blur-md",
                subscription?.plan === 'pro' 
                  ? 'border-[rgba(94,106,210,0.3)] shadow-glow-sm'
                  : 'border-[var(--border-subtle)]'
              )}>
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.06),transparent_70%)] pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                  <div className="space-y-1">
                    <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
                      Current Plan
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
                        {subscription?.plan === 'pro' ? 'Mershal Pro' : 'Mershal Free'}
                      </span>
                      {subscription?.plan === 'pro' ? (
                        <span className="bg-[rgba(94,106,210,0.12)] text-[var(--violet)] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border border-[rgba(94,106,210,0.2)]">
                          Active
                        </span>
                      ) : (
                        <span className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                          Free Account
                        </span>
                      )}
                    </div>
                    {subscription?.plan === 'pro' && (
                      <div className="text-[13px] text-[var(--text-secondary)] mt-1">
                        $19/month · Next billing: {subscription?.subscription?.currentPeriodEnd ? new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </div>
                    )}
                    {(!subscription?.plan || subscription.plan === 'free') && (
                      <div className="text-[13px] text-[var(--text-secondary)] mt-1">
                        Free forever · Upgrade to unlock advanced features
                      </div>
                    )}
                  </div>
                  <div className="text-right sm:self-center">
                    <span className="text-[28px] font-bold text-[var(--violet)]">
                      {subscription?.plan === 'pro' ? '$19' : '$0'}
                    </span>
                    <span className="text-[13px] text-[var(--text-muted)] font-medium">/mo</span>
                  </div>
                </div>

                {subscription?.plan === 'pro' && subscription?.subscription?.cancelAtPeriodEnd && (
                  <div className="mt-4 p-4 rounded-xl bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)] text-[13px] text-[var(--amber)] flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      Your subscription will cancel on{' '}
                      {subscription.subscription.cancelAt ? new Date(subscription.subscription.cancelAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}.
                      Manage in the billing portal to reactivate.
                    </div>
                  </div>
                )}

                <div className="mt-5 flex gap-2.5 relative z-10">
                  {subscription?.plan === 'pro' ? (
                    <Button 
                      onClick={() => portalMutation.mutate()} 
                      loading={portalMutation.isPending}
                      className="bg-[var(--bg-elevated)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] font-medium text-[13px] px-4 py-2 h-9 rounded-lg flex items-center justify-center gap-1 cursor-pointer border border-[var(--border-subtle)]"
                    >
                      Manage billing <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => checkoutMutation.mutate(PRO_PRICE_ID)} 
                      loading={checkoutMutation.isPending}
                      className="bg-[var(--violet)] hover:bg-[#4D59C2] text-white font-semibold text-[13.5px] px-5 py-3 h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-glow cursor-pointer"
                    >
                      Upgrade to Pro — $19/month
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Trust Badges Container */}
            <div className="grid md:grid-cols-3 gap-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-card">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--violet)] shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[12.5px] font-bold text-[var(--text-primary)] leading-tight">Secure Checkouts</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                    All payment transactions are encrypted and processed securely via Stripe.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--emerald)] shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[12.5px] font-bold text-[var(--text-primary)] leading-tight">SSL Protection</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                    We maintain secure network connections to safeguard your client & proposal data.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--amber)] shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[12.5px] font-bold text-[var(--text-primary)] leading-tight">14-Day Guarantee</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                    If you change your mind within 14 days, contact support for a full, hassle-free refund.
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Comparison Side by Side */}
            <div className="space-y-4 pt-2">
              <h3 className="text-[14.5px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Available Plans</h3>
              <div className="grid md:grid-cols-2 gap-5">
                {/* Free Plan Card */}
                <div className={cn(
                  "rounded-2xl p-6 border flex flex-col justify-between transition-all duration-300 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]/40",
                  subscription?.plan !== 'pro'
                    ? "border-[rgba(94,106,210,0.25)] ring-1 ring-[rgba(94,106,210,0.08)]"
                    : "border-[var(--border-subtle)]"
                )}>
                  <div className="space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">Free Starter</h4>
                        <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">Core setup for starting out</p>
                      </div>
                      {subscription?.plan !== 'pro' && (
                        <span className="text-[9.5px] font-bold text-[var(--violet)] uppercase tracking-wider bg-[rgba(94,106,210,0.12)] px-2.5 py-0.5 rounded-full border border-[rgba(94,106,210,0.15)]">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[26px] font-bold text-[var(--text-primary)]">$0</span>
                      <span className="text-[12.5px] text-[var(--text-muted)] font-medium">/month</span>
                    </div>
                    <hr className="border-[var(--border-subtle)]" />
                    <ul className="space-y-3">
                      {[
                        { text: "Up to 1 client profile", included: true },
                        { text: "Up to 1 active project workspace", included: true },
                        { text: "Up to 5 invoices total", included: true },
                        { text: "AI assistant workspace", included: false },
                        { text: "Premium Client portal links", included: false },
                        { text: "Online Card payments", included: false },
                      ].map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 text-[12.5px]">
                          {feat.included ? (
                            <Check className="h-4 w-4 text-[var(--emerald)] shrink-0" />
                          ) : (
                            <span className="text-[var(--text-muted)] font-bold shrink-0 w-4 text-center">✗</span>
                          )}
                          <span className={feat.included ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"}>{feat.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Pro Plan Card */}
                <div className={cn(
                  "rounded-2xl p-6 border flex flex-col justify-between transition-all duration-300 relative overflow-hidden bg-[var(--bg-card)]",
                  subscription?.plan === 'pro'
                    ? "border-[rgba(94,106,210,0.4)] shadow-glow-sm"
                    : "border-[rgba(94,106,210,0.25)] hover:border-[rgba(94,106,210,0.45)]"
                )}>
                  <div className="absolute top-4 right-4 z-10">
                    <span className="text-[9px] font-bold text-white uppercase tracking-widest bg-[var(--violet)] px-3 py-1 rounded-full shadow-glow-sm">
                      Recommended
                    </span>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">Mershal Pro</h4>
                        <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">Accelerate and automate your agency</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[26px] font-bold text-[var(--text-primary)]">$19</span>
                        <span className="text-[12.5px] text-[var(--text-muted)] font-medium">/month</span>
                      </div>
                      <p className="text-[11.5px] text-[var(--violet)] font-semibold tracking-wide uppercase mt-1">Saves hours of work every week</p>
                    </div>
                    <hr className="border-[var(--border-subtle)]" />
                    <ul className="space-y-3">
                      {[
                        { text: "Unlimited clients", included: true },
                        { text: "Unlimited active projects", included: true },
                        { text: "Unlimited secure invoices", included: true },
                        { text: "Mershal AI assistant", included: true },
                        { text: "Custom branded client portals", included: true },
                        { text: "Online Card payments (Stripe/Razorpay)", included: true },
                        { text: "Priority developer support", included: true },
                      ].map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 text-[12.5px]">
                          <Check className="h-4 w-4 text-[var(--emerald)] shrink-0" />
                          <span className="text-[var(--text-primary)] font-medium">{feat.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {subscription?.plan !== 'pro' && (
                    <div className="mt-6">
                      <Button 
                        onClick={() => checkoutMutation.mutate(PRO_PRICE_ID)} 
                        loading={checkoutMutation.isPending}
                        className="w-full bg-[var(--violet)] hover:bg-[#4D59C2] text-white font-semibold text-[13.5px] py-3.5 h-11 rounded-xl flex items-center justify-center gap-1.5 shadow-glow cursor-pointer"
                      >
                        Upgrade to Pro <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Feature Comparison Grid */}
            <div className="space-y-4 pt-4">
              <h3 className="text-[14.5px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Complete Feature Breakdown</h3>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        <th className="px-5 py-4 w-[50%]">Feature Name</th>
                        <th className="px-5 py-4">Free Starter</th>
                        <th className="px-5 py-4 text-[var(--violet)]">Mershal Pro</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12.5px] text-[var(--text-secondary)] divide-y divide-[var(--border-subtle)]/60">
                      {[
                        { name: "Active Client Profiles", free: "Up to 1 Client", pro: "Unlimited Clients" },
                        { name: "Active Project Workspaces", free: "Up to 1 Project", pro: "Unlimited Projects" },
                        { name: "Total Invoice Tracking", free: "Up to 5 Invoices", pro: "Unlimited Invoices" },
                        { name: "Mershal AI Assistant", free: "✗ Not Included", pro: "✓ Full AI Workspace Access" },
                        { name: "Client Collaboration Portals", free: "✗ Not Included", pro: "✓ Custom Subdomains & Branding" },
                        { name: "Online Payments Gateway", free: "✗ Not Included", pro: "✓ Stripe & Razorpay Integrations" },
                        { name: "Automatic Reminders & Chats", free: "✗ Not Included", pro: "✓ Real-time Polling & Timeline Logs" },
                        { name: "Whiteboard Discussions", free: "✗ Not Included", pro: "✓ Co-drawing Visual Board Syncing" },
                        { name: "Customer Support Tier", free: "Standard Support", pro: "Priority Developer Response" },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-[var(--text-primary)]">{row.name}</td>
                          <td className="px-5 py-3.5 text-[var(--text-secondary)]">{row.free}</td>
                          <td className="px-5 py-3.5 text-[var(--text-primary)] font-medium">{row.pro}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Frequently Asked Questions (Trust) */}
            <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
              <h3 className="text-[14.5px] font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-[var(--violet)]" /> Billing Questions & Answers
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-1.5 hover:border-[var(--border-default)] transition-colors">
                  <h4 className="text-[13px] font-bold text-[var(--text-primary)]">How long is the trial and what features do I get?</h4>
                  <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                    The free trial runs for 15 days from your signup date. It provides full, unrestricted access to Mershal Pro so you can test drive the entire system. No credit card is required to sign up.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-1.5 hover:border-[var(--border-default)] transition-colors">
                  <h4 className="text-[13px] font-bold text-[var(--text-primary)]">What happens when my free trial expires?</h4>
                  <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                    When your trial ends, your account will default back to the Free Starter plan. Your existing projects and client portals are safely archived but will stay locked until you subscribe to Pro.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-1.5 hover:border-[var(--border-default)] transition-colors">
                  <h4 className="text-[13px] font-bold text-[var(--text-primary)]">Can I cancel my subscription at any time?</h4>
                  <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                    Yes. There are no contracts, commitments, or cancellation fees. You can pause or cancel your subscription with one click directly in your billing setting tab.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-1.5 hover:border-[var(--border-default)] transition-colors">
                  <h4 className="text-[13px] font-bold text-[var(--text-primary)]">Does Mershal take cuts from client payments?</h4>
                  <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                    No, Mershal does not charge transaction fees or take commissions on your invoices. Standard payment processing fees from Stripe or Razorpay still apply.
                  </p>
                </div>
              </div>
            </div>

            {/* Billing History (Pro or active trial history if any) */}
            {subscription?.plan === 'pro' && (
              <div className="space-y-4 mt-8">
                <h3 className="text-[14.5px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Billing History</h3>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4">Description</th>
                          <th className="px-5 py-4 text-right">Amount</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4 text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="text-[12.5px] text-[var(--text-secondary)] divide-y divide-[var(--border-subtle)]/60">
                        {!invoicesData?.invoices || invoicesData.invoices.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-10 text-center text-[var(--text-muted)] font-medium">
                              No recent invoices found.
                            </td>
                          </tr>
                        ) : (
                          invoicesData.invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                              <td className="px-5 py-4 text-[var(--text-secondary)]">
                                {new Date(inv.date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">
                                {inv.description}
                              </td>
                              <td className="px-5 py-4 text-right font-bold text-[var(--text-primary)]">
                                ${inv.amount.toFixed(2)}
                              </td>
                              <td className="px-5 py-4">
                                <span className={cn(
                                  "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                  inv.status === 'paid' 
                                    ? "bg-[rgba(0,200,150,0.08)] text-[var(--emerald)] border-[rgba(0,200,150,0.15)]" 
                                    : "bg-[rgba(245,158,11,0.08)] text-[var(--amber)] border-[rgba(245,158,11,0.2)]"
                                )}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                {inv.pdfUrl ? (
                                  <a
                                    href={inv.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--violet)] hover:text-[#4d59be] font-bold inline-flex items-center gap-1.5 transition-colors"
                                  >
                                    Download <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Integrations */}
      {tab === "Integrations" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Active Payment Gateway Selector */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4 shadow-sm hover:border-[var(--border-default)] transition-colors duration-200">
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Active Payment Gateway</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                Choose the gateway clients will use to pay invoices in their client portal.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {(["none", "stripe", "razorpay"] as const).map((gw) => {
                const isSelected = activePaymentGateway === gw;
                return (
                  <button
                    key={gw}
                    type="button"
                    onClick={() => {
                      setActivePaymentGateway(gw);
                      updateMutation.mutate({ activePaymentGateway: gw });
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-150 cursor-pointer text-center",
                      isSelected
                        ? "border-[var(--violet)] bg-[var(--violet)]/5 text-[var(--text-primary)] shadow-sm"
                        : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 hover:bg-[var(--bg-elevated)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span className="text-[13px] font-semibold capitalize">{gw === "none" ? "Disable Payments" : gw}</span>
                    {isSelected && (
                      <span className="text-[9px] font-medium text-[var(--violet)] mt-1 bg-[var(--violet)]/10 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stripe Configuration */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4 shadow-sm hover:border-[var(--border-default)] transition-colors duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]/40">
              <div>
                <h3 className="text-[14px] font-medium text-[var(--text-primary)]">Stripe Integration</h3>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Collect client card payments directly to your Stripe account.</p>
              </div>
              {activePaymentGateway === "stripe" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--emerald)]/10 text-[var(--emerald)] border border-[var(--emerald)]/20 animate-pulse">
                  Active
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Stripe Publishable Key</label>
                <Input
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                  placeholder="pk_live_..."
                  className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Stripe Secret Key</label>
                <div className="relative">
                  <Input
                    type={showStripeSecret ? "text" : "password"}
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStripeSecret(!showStripeSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {showStripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={() => updateMutation.mutate({ stripePublishableKey, stripeSecretKey })}
                loading={updateMutation.isPending}
                className="shadow-glow-sm btn-primary flex items-center gap-1.5 text-[12px] h-9"
              >
                Save Stripe Settings
              </Button>
            </div>
          </div>

          {/* Razorpay Configuration */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4 shadow-sm hover:border-[var(--border-default)] transition-colors duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]/40">
              <div>
                <h3 className="text-[14px] font-medium text-[var(--text-primary)]">Razorpay Integration</h3>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Collect client payments via Razorpay checkout (Cards, UPI, Netbanking).</p>
              </div>
              {activePaymentGateway === "razorpay" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--emerald)]/10 text-[var(--emerald)] border border-[var(--emerald)]/20 animate-pulse">
                  Active
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Razorpay Key ID</label>
                <Input
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_live_..."
                  className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Razorpay Key Secret</label>
                <div className="relative">
                  <Input
                    type={showRazorpaySecret ? "text" : "password"}
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    placeholder="Key Secret"
                    className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] focus-visible:ring-[var(--border-focus)] placeholder:text-[var(--text-muted)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={() => updateMutation.mutate({ razorpayKeyId, razorpayKeySecret })}
                loading={updateMutation.isPending}
                className="shadow-glow-sm btn-primary flex items-center gap-1.5 text-[12px] h-9"
              >
                Save Razorpay Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === "Notifications" && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-6 shadow-sm hover:border-[var(--border-default)] transition-colors duration-200">
          <div className="flex items-start justify-between border-b border-[var(--border-subtle)]/60 pb-5 mb-1">
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Auto-send welcome email</p>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed max-w-[480px]">
                Send a portal link welcome email automatically to newly added clients. Zero extra manual steps.
              </p>
            </div>
            <Switch
              checked={profile?.autoWelcomeEmail !== false}
              onCheckedChange={(checked) => {
                updateMutation.mutate({ autoWelcomeEmail: checked });
              }}
              disabled={updateMutation.isPending}
              className="data-[state=checked]:bg-[var(--violet)] border-[var(--border-subtle)]"
            />
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">System Alerts</p>
            {[
              { label: "Email when an invoice is paid", desc: "Get notified as soon as client payment succeeds.", defaultOn: true },
              { label: "Email on overdue invoices", desc: "Automated reminders sent to clients for unpaid invoices.", defaultOn: true },
              { label: "Weekly AI summary digest", desc: "Workspace highlights, tasks completed, and income insights.", defaultOn: false },
            ].map((n) => (
              <div key={n.label} className="flex items-start justify-between py-2">
                <div className="space-y-0.5">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">{n.label}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{n.desc}</p>
                </div>
                <Switch
                  defaultChecked={n.defaultOn}
                  className="data-[state=checked]:bg-[var(--violet)] border-[var(--border-subtle)]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security */}
      {tab === "Security" && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-6 shadow-sm hover:border-[var(--border-default)] transition-colors duration-200">
          <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-subtle)]/60">
            <div className="h-10 w-10 rounded-[8px] bg-[var(--emerald)]/10 border border-[var(--emerald)]/20 flex items-center justify-center">
              <IconShieldCheck className="h-5 w-5 text-[var(--emerald)]" stroke={1.5} />
            </div>
            <div>
              <p className="text-[15px] font-medium text-[var(--text-primary)]">Security & Compliance</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Manage your account security and data privacy.</p>
            </div>
          </div>

          <div className="space-y-5">
            {[
              {
                label: "End-to-end encryption",
                desc: "All your client data, projects, and invoices are encrypted in transit and at rest using AES-256.",
                active: true,
                isToggleable: false,
              },
              {
                label: "Two-factor authentication",
                desc: "Add an extra layer of security to your account.",
                active: !!profile?.twoFactorEnabled,
                action: profile?.twoFactorEnabled ? "Disable" : "Enable",
                isToggleable: true,
              },
              {
                label: "SSL / TLS secured",
                desc: "All connections to Mershal use HTTPS with 256-bit SSL encryption.",
                active: true,
                isToggleable: false,
              },
              {
                label: "GDPR compliant",
                desc: "Your data is stored and processed in compliance with GDPR. You can export or delete all data at any time.",
                active: true,
                isToggleable: false,
              },
            ].map((s) => (
              <div key={s.label} className="flex gap-4 items-start p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20">
                <Check className="h-4 w-4 text-[var(--emerald)] shrink-0 mt-0.5" strokeWidth={2.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] mb-0.5">{s.label}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
                </div>
                <div className="shrink-0">
                  {!s.isToggleable ? (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--emerald)]/10 text-[var(--emerald)] border border-[var(--emerald)]/20">
                      Active
                    </span>
                  ) : s.active ? (
                    <button
                      onClick={() => {
                        setOtpCode("");
                        setIsDisable2FAOpen(true);
                      }}
                      className="text-[10px] font-semibold px-3 py-1 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenEnable2FA}
                      disabled={isVerifying2FA}
                      className="text-[10px] font-semibold px-3 py-1 rounded-full border border-[var(--amber)]/30 text-[var(--amber)] hover:bg-[var(--amber)]/10 transition-colors disabled:opacity-50"
                    >
                      {isVerifying2FA ? "Loading..." : "Enable"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]/60">
            <a href="#" className="text-[13px] font-medium text-[var(--violet)] hover:text-[var(--violet)]/80 transition-colors">
              Read our full security documentation →
            </a>
          </div>
        </div>
      )}

      {/* Referrals */}
      {tab === "Referrals" && (
        <div className="space-y-4">
          {/* Hero card */}
          <div className="rounded-xl p-6 shadow-sm border border-[var(--violet)]/20 bg-[var(--violet)]/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center bg-[var(--violet)]/15 border border-[var(--violet)]/30 shrink-0">
                <Gift className="h-5 w-5 text-[var(--violet)]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">Give 1 month free, get 1 month free</p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Share your link — earn a free month for every friend who signs up.</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { label: "Friends referred", value: referralData?.referredCount ?? 0 },
                { label: "Free months earned", value: referralData?.creditsGranted ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 text-center">
                  <p className="text-[26px] font-semibold text-[var(--text-primary)]">{s.value}</p>
                  <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Referral link */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Your referral link</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5 flex items-center justify-between min-w-0">
                  <p className="text-[12px] text-[var(--text-secondary)] truncate font-mono select-all">
                    {referralData?.referralLink ?? "Loading…"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={copied ? "outline" : "default"}
                  onClick={handleCopyLink}
                  className="shrink-0 h-[42px] px-4 shadow-glow-sm"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>
          </div>

          {/* Redeem Code Section (Removed to prevent misuse) */}
          {profile?.referralCodeUsed ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm flex items-center justify-between text-[13px] text-[var(--text-secondary)]">
              <span>Referral code applied:</span>
              <span className="font-semibold text-[var(--violet)] bg-[var(--violet)]/10 px-2.5 py-1 rounded-md border border-[var(--violet)]/20 font-mono uppercase">
                {profile.referralCodeUsed}
              </span>
            </div>
          ) : null}

          {/* Share buttons */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-sm hover:border-[var(--border-default)] transition-colors duration-200">
            <p className="text-[12px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3.5">Share on</p>
            <div className="flex gap-2 flex-wrap">
              {referralData?.referralLink && [
                {
                  label: "Twitter / X",
                  href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I use Mershal to manage my freelance business. Get 1 month free with my link: ${referralData.referralLink}`)}&via=MershalApp`,
                },
                {
                  label: "WhatsApp",
                  href: `https://wa.me/?text=${encodeURIComponent(`Try Mershal — the best OS for freelancers. Get 1 month free: ${referralData.referralLink}`)}`,
                },
                {
                  label: "LinkedIn",
                  href: `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralData.referralLink)}`,
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg text-[12px] font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-default)] transition-all duration-150"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[var(--text-muted)] text-center mt-2">
            Credits applied manually within 3 business days of your friend's first payment.
          </p>
        </div>
      )}
    </div>

    {/* Enable 2FA Dialog */}
    <Dialog open={isEnable2FAOpen} onOpenChange={setIsEnable2FAOpen}>
      <DialogContent className="max-w-md bg-[var(--bg-card)]/90 backdrop-blur-md border-[var(--border-subtle)] shadow-glow-lg">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--text-primary)]">
            Setup Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[var(--text-secondary)]">
            Scan the QR code below using your authenticator app (Google Authenticator, Authy, etc.) to set up 2FA.
          </DialogDescription>
        </DialogHeader>

        {setupData && (
          <div className="space-y-5 py-4">
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-lg shadow-inner border border-gray-100 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.qrCodeUrl)}`}
                  alt="2FA QR Code"
                  className="w-[180px] h-[180px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Or enter key manually
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3.5 py-2 flex items-center justify-between min-w-0">
                  <p className="text-[12px] font-mono text-[var(--text-secondary)] select-all truncate">
                    {setupData.secret}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(setupData.secret);
                    setSecretCopied(true);
                    setTimeout(() => setSecretCopied(false), 2000);
                  }}
                  className="h-9 px-3 border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                >
                  {secretCopied ? (
                    <Check className="h-4 w-4 text-[var(--emerald)]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 flex flex-col items-center justify-center pt-2">
              <label className="text-[12px] font-medium text-[var(--text-secondary)] self-start">
                Enter 6-digit verification code
              </label>
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                containerClassName="justify-center"
              >
                <InputOTPGroup className="gap-1.5">
                  <InputOTPSlot index={0} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
                  <InputOTPSlot index={1} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
                  <InputOTPSlot index={2} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
                  <InputOTPSlot index={3} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
                  <InputOTPSlot index={4} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
                  <InputOTPSlot index={5} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsEnable2FAOpen(false)}
            className="border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerifyEnable2FA}
            loading={isVerifying2FA}
            disabled={otpCode.length !== 6}
            className="btn-primary shadow-glow-sm"
          >
            Verify & Activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Disable 2FA Dialog */}
    <Dialog open={isDisable2FAOpen} onOpenChange={setIsDisable2FAOpen}>
      <DialogContent className="max-w-md bg-[var(--bg-card)]/90 backdrop-blur-md border-[var(--border-subtle)] shadow-glow-lg">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[var(--text-primary)]">
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-[12px] text-[var(--text-secondary)]">
            Please enter your 6-digit authenticator code to confirm disabling 2FA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex flex-col items-center justify-center">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            containerClassName="justify-center"
          >
            <InputOTPGroup className="gap-1.5">
              <InputOTPSlot index={0} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
              <InputOTPSlot index={1} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
              <InputOTPSlot index={2} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
              <InputOTPSlot index={3} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
              <InputOTPSlot index={4} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
              <InputOTPSlot index={5} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-10 h-10 text-[16px] rounded-md" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsDisable2FAOpen(false)}
            className="border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDisable2FA}
            loading={isVerifying2FA}
            disabled={otpCode.length !== 6}
            className="bg-red-600 hover:bg-red-700 text-white shadow-sm border-none"
          >
            Deactivate 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
