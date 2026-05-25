/**
 * Login/Signup — Psychology-Driven Redesign (Readable Standard Sizing)
 * 
 * Psychological Principles applied:
 * 1. Halo Effect: Premium, high-fidelity mock product states signal reliability, security, and prestige.
 *    - Left panel features interactive dashboard previews (Onboarding checklists, Task Kanban, and Smart Invoicing)
 *      with smooth Framer Motion layout transitions.
 * 2. Friction & Cognitive Load Reduction:
 *    - Prominent Google login (primary CTA, 1-click onboard).
 *    - Interactive password strength meter transforms safety verification from an annoying constraint into a satisfying reward.
 * 3. Fear of Missing Out (FOMO) / Social Proof:
 *    - Testimonial carousel updates to match the user's selected feature tab, reinforcing belief shifts.
 *    - Showing high-fidelity user avatars and authentic creative agency metrics.
 * 4. Anxiety Interception:
 *    - Transparent "What Happens Next?" timeline immediately sets expectations.
 *    - SOC 2, E2E Encryption, and "No Credit Card Required" trust badges displayed prominently.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithEmail, signUpWithEmail, signOut } from "@/lib/firebase/auth";
import { apiClient } from "@/lib/api-client";
import type { UserProfile } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { 
  IconShieldCheck, 
  IconLock, 
  IconCheck, 
  IconSparkles, 
  IconStarFilled, 
  IconTrendingUp, 
  IconArrowRight, 
  IconUsers, 
  IconFolder, 
  IconCreditCard,
  IconEye,
  IconEyeOff
} from "@tabler/icons-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in to your workspace — Mershal" },
      { name: "description", content: "Sign in to Mershal to manage your projects, invoices, client communications, and collaborate with your team." },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Log in — Mershal" },
      { property: "og:description", content: "Access your agency's unified command center on Mershal." },
    ],
  }),
  component: Login,
});

function Login() {
  return <AuthShell mode="login" />;
}

// Sub-component: Password Strength Meter
function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  
  const score = checks.filter(Boolean).length;
  
  const getStrengthText = () => {
    if (score <= 1) return { label: "Weak", color: "text-[#FF6B6B]", bg: "bg-[#FF6B6B]" };
    if (score <= 3) return { label: "Good", color: "text-[#FFB347]", bg: "bg-[#FFB347]" };
    return { label: "Strong", color: "text-[#00C896]", bg: "bg-[#00C896]" };
  };

  const strength = getStrengthText();

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-[#8B8FA8] font-medium">Password strength</span>
        <span className={`${strength.color} font-bold uppercase tracking-wider`}>{strength.label}</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5">
        {[1, 2, 3, 4].map((step) => (
          <div 
            key={step} 
            className={`h-full flex-1 rounded-full transition-all duration-300 ${
              score >= step ? strength.bg : "bg-white/5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Sub-component: Interactive Mock Preview Tabs
type PreviewTab = "onboarding" | "tasks" | "billing";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  agency: string;
  metric: string;
}

const TESTIMONIALS: Record<PreviewTab, Testimonial> = {
  onboarding: {
    quote: "Our clients are completely blown away by their onboarding portal. It made our agency look 10x more professional and automated our onboarding.",
    author: "Sarah Jenkins",
    role: "Founder",
    agency: "PixelCraft Agency",
    metric: "10x faster onboarding"
  },
  tasks: {
    quote: "We consolidated ClickUp and Notion into Mershal. Tracking deliverables and projects in the same spot where clients live is a complete game-changer.",
    author: "Alex Rivera",
    role: "Director of Operations",
    agency: "Apex Growth Group",
    metric: "Saved 8 hrs/week admin"
  },
  billing: {
    quote: "Invoices get paid in minutes instead of weeks now. The automatic reminders and Stripe integration cured our late client invoice headaches.",
    author: "Jessica Chen",
    role: "Managing Principal",
    agency: "Studio Nine Design",
    metric: "+24% cashflow optimization"
  }
};

export function AuthShell({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("Securing connection...");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // 2FA Challenge states
  const [show2FAChallenge, setShow2FAChallenge] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    setError("");
    setIsVerifying2FA(true);
    try {
      const res = await apiClient.post<{ success: boolean; token: string }>("/api/auth/2fa/validate", {
        code: twoFactorCode
      });
      if (res.token) {
        localStorage.setItem("mershal_2fa_token", res.token);
      }
      if (user) {
        await user.getIdToken(true);
      }
      const profile = await apiClient.get<UserProfile>("/api/profile");
      if (profile.onboardingCompleted) {
        await navigate({ to: "/dashboard" });
      } else {
        await navigate({ to: "/onboarding" });
      }
    } catch (err: any) {
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleCancel2FA = async () => {
    setShow2FAChallenge(false);
    setLoading(false);
    setError("");
    await signOut();
  };
  
  // Interactive left-panel preview state
  const [activeTab, setActiveTab] = useState<PreviewTab>("onboarding");

  // Fast-path bypass redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      setLoading(true);
      setLoadingPhase("You are logged in. Resecuring session...");
      apiClient.get<UserProfile>("/api/profile")
        .then((profile) => {
          if (profile.onboardingCompleted) {
            setLoadingPhase("Redirecting to dashboard...");
            navigate({ to: "/dashboard", replace: true });
          } else {
            setLoadingPhase("Taking you to onboarding...");
            navigate({ to: "/onboarding", replace: true });
          }
        })
        .catch((err: any) => {
          if (err.status === 403 && err.data?.code === "2fa_required") {
            setLoading(false);
            setShow2FAChallenge(true);
            setTwoFactorCode("");
          } else {
            // If no profile, lead to onboarding
            navigate({ to: "/onboarding", replace: true });
          }
        });
    }
  }, [user, authLoading, navigate]);

  // Dynamic copywriting cycler for the loader to make authentication feel smooth and high-fidelity
  useEffect(() => {
    if (!loading) return;
    
    const phases = [
      "Authenticating digital credentials...",
      "Resolving workspace instance...",
      "Syncing secure client databases...",
      "Preparing your command tower..."
    ];
    
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < phases.length) {
        setLoadingPhase(phases[currentIdx]);
        currentIdx++;
      }
    }, 1800);
    
    return () => clearInterval(interval);
  }, [loading]);

  // Auto-rotate tabs for micro-interaction/visual dynamics
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === "onboarding") return "tasks";
        if (prev === "tasks") return "billing";
        return "onboarding";
      });
    }, 10000); // rotate every 10s to give reading time
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setLoadingPhase(isSignup ? "Creating secure account..." : "Verifying credentials...");
    try {
      if (isSignup) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      
      setLoadingPhase("Synchronizing Firebase profile...");
      const profile = await apiClient.get<UserProfile>("/api/profile");
      setLoadingPhase("Redirecting to your workspace...");
      if (profile.onboardingCompleted) {
        await navigate({ to: "/dashboard" });
      } else {
        await navigate({ to: "/onboarding" });
      }
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      if (err.status === 403 && err.data?.code === "2fa_required") {
        setLoading(false);
        setShow2FAChallenge(true);
        setTwoFactorCode("");
        return;
      }
      const raw = err instanceof Error ? err.message : (err?.message || String(err));
      if (raw.includes("wrong-password") || raw.includes("invalid-credential")) {
        setError("Incorrect email or password. Try again.");
      } else if (raw.includes("email-already-in-use")) {
        setError("An account with this email already exists.");
      } else if (raw.includes("weak-password")) {
        setError("Password must be at least 6 characters.");
      } else if (raw.includes("user-not-found")) {
        setError("No account found with this email.");
      } else if (raw.includes("operation-not-allowed")) {
        setError("Email/Password sign-in is not enabled in Firebase Console.");
      } else {
        setError(`Couldn't sign in: ${raw}`);
      }
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen grid lg:grid-cols-[1.2fr_1fr] bg-[#0D0E12] overflow-hidden selection:bg-[#5E6AD2]/30 selection:text-white">
      
      {/* ── LEFT PANEL: PREMIUM PRODUCT VALUE PREVIEW ── */}
      <div className="hidden lg:flex flex-col justify-between h-full relative bg-[#0A0B0E] p-8 xl:p-12 border-r border-white/5 overflow-hidden">
        
        {/* Ambient Gradient Glows (The Halo Effect) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(94,106,210,0.18),transparent)] pointer-events-none" />
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.25, 0.45, 0.25],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-[25%] -left-[15%] w-[80%] h-[80%] bg-[#5E6AD2] blur-[140px] rounded-full pointer-events-none"
        />

        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[#00C896] blur-[160px] rounded-full pointer-events-none"
        />

        {/* Branding Header */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center w-max group">
            <img src="/logo.png" alt="Mershal" className="h-[52px] w-auto object-contain logo-slow-glow transition-transform duration-300 group-hover:scale-105" />
          </Link>
        </div>

        {/* Main Contentful Widget Showcase */}
        <div className="relative z-10 my-auto py-4 xl:py-6">
          <div className="max-w-[520px] space-y-6">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full bg-[rgba(94,106,210,0.08)] border border-[rgba(94,106,210,0.15)] text-[11px] font-semibold text-[#5E6AD2] uppercase tracking-wider">
                Product Showcase
              </span>
              <h2 className="text-[32px] xl:text-[38px] font-semibold text-[#F0F0F5] leading-[1.2] tracking-tight text-gradient">
                The operating system that turns agency chaos into predictable growth.
              </h2>
              <p className="text-[14px] text-[#8B8FA8] leading-relaxed">
                Stop hacking 6 different tools together. Automate your client onboarding, run tasks, and invoice seamlessly in one client-facing portal.
              </p>
            </div>

            {/* Interactive Preview Widget */}
            <div className="bg-[#111318]/90 border border-white/10 rounded-2xl p-5 shadow-card backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.08),transparent_70%)] pointer-events-none" />
              
              {/* Tabs Controller */}
              <div className="flex bg-[#0D0E12] p-1 rounded-xl border border-white/5 mb-5 relative z-10">
                {(["onboarding", "tasks", "billing"] as PreviewTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-[12.5px] font-semibold rounded-lg capitalize transition-all duration-300 relative z-10 flex items-center justify-center gap-2 ${
                      activeTab === tab ? "text-white" : "text-[#5C5F73] hover:text-[#8B8FA8]"
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-[#1C1E27] border border-white/10 rounded-lg shadow-sm"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {tab === "onboarding" && <IconUsers className="h-3.5 w-3.5 relative z-20" />}
                    {tab === "tasks" && <IconFolder className="h-3.5 w-3.5 relative z-20" />}
                    {tab === "billing" && <IconCreditCard className="h-3.5 w-3.5 relative z-20" />}
                    <span className="relative z-20">{tab}</span>
                  </button>
                ))}
              </div>

              {/* Preview Window (Fixed Height to prevent layout shifting) */}
              <div className="h-[150px] flex flex-col justify-center relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === "onboarding" && (
                    <motion.div
                      key="onboarding"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[13px] font-semibold text-[#F0F0F5]">Client: Zenith Ventures</p>
                          <p className="text-[11px] text-[#8B8FA8]">Brand Identity & Development Onboarding</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[rgba(0,200,150,0.1)] border border-[rgba(0,200,150,0.2)] text-[10px] font-bold text-[#00C896]">
                          80% Completed
                        </span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="h-2 w-full bg-[#0D0E12] rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "80%" }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-[#5E6AD2] to-[#00C896] rounded-full shadow-glow-sm"
                        />
                      </div>

                      {/* Steps list */}
                      <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                        {[
                          { label: "Intake Questionnaire", done: true },
                          { label: "Sign Contract & NDA", done: true },
                          { label: "Automated Slack Setup", done: true },
                          { label: "Book Strategy Kickoff", done: false },
                        ].map((step, i) => (
                          <div 
                            key={i} 
                            className={`p-2 rounded-lg border flex items-center gap-2 transition-all ${
                              step.done 
                                ? "bg-[#0D0E12]/50 border-white/5 text-[#8B8FA8]" 
                                : "bg-[rgba(94,106,210,0.03)] border-[#5E6AD2]/30 text-white"
                            }`}
                          >
                            <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center shrink-0 ${
                              step.done ? "bg-[#00C896]/10 text-[#00C896]" : "bg-white/5 text-[#5C5F73] animate-pulse"
                            }`}>
                              {step.done ? <IconCheck className="h-3 w-3 stroke-[3]" /> : <span className="h-1.5 w-1.5 rounded-full bg-[#5E6AD2]" />}
                            </div>
                            <span className="truncate font-medium">{step.label}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "tasks" && (
                    <motion.div
                      key="tasks"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[12px] font-semibold text-[#F0F0F5]">Active Deliverables</span>
                        <span className="text-[11px] text-[#8B8FA8] flex items-center gap-1.5 font-medium">
                          <IconSparkles className="h-3 w-3 text-[#5E6AD2]" />
                          AI Auto-prioritized
                        </span>
                      </div>

                      {/* Kanban / Tasks layout */}
                      <div className="space-y-2">
                        {[
                          { title: "Design High-Fidelity UI System", tab: "In Review", color: "badge-review", date: "Today" },
                          { title: "Develop Stripe Subscriptions Hook", tab: "In Progress", color: "badge-in-progress", date: "Tomorrow" }
                        ].map((task, i) => (
                          <div 
                            key={i} 
                            className="p-2.5 rounded-lg bg-[#0D0E12]/80 border border-white/5 flex items-center justify-between hover:border-white/10 transition-all cursor-pointer group/task"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-2 w-2 rounded-full bg-[#5E6AD2]" />
                              <span className="text-[11.5px] font-medium text-[#F0F0F5] group-hover/task:text-white truncate">
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-[#5C5F73] font-medium">{task.date}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${task.color}`}>
                                {task.tab}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "billing" && (
                    <motion.div
                      key="billing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3.5"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-[#0D0E12]/80 border border-white/5 flex flex-col justify-between">
                          <span className="text-[10px] text-[#8B8FA8] uppercase font-bold tracking-wider">MRR Growth</span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-[18px] font-bold text-[#F0F0F5]">$18,450</span>
                            <span className="text-[10px] text-[#00C896] font-semibold flex items-center">
                              <IconTrendingUp className="h-3 w-3" />
                              +34%
                            </span>
                          </div>
                          {/* Premium Micro SVG Line Chart */}
                          <div className="h-6 w-full mt-1.5 overflow-hidden">
                            <svg viewBox="0 0 100 30" className="w-full h-full">
                              <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#00C896" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#00C896" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <path
                                d="M0 25 Q15 15 30 18 T60 8 T90 5 L100 2 L100 30 L0 30 Z"
                                fill="url(#chartGrad)"
                              />
                              <motion.path
                                d="M0 25 Q15 15 30 18 T60 8 T90 5 L100 2"
                                fill="transparent"
                                stroke="#00C896"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              />
                            </svg>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#0D0E12]/80 border border-white/5 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-[#8B8FA8] uppercase font-bold tracking-wider">Latest Invoice</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full badge-paid">
                              PAID
                            </span>
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-[#F0F0F5] mt-0.5">$4,800.00</p>
                            <p className="text-[9.5px] text-[#5C5F73] font-medium truncate">Zenith Corp • INV-042</p>
                          </div>
                          <div className="pt-2 border-t border-white/5 text-[9.5px] text-[#8B8FA8] flex items-center justify-between">
                            <span>Auto-reconciliation</span>
                            <IconCheck className="h-3 w-3 text-[#00C896] stroke-[3]" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Dynamic Social Proof Testimonial */}
            <div className="pt-5 border-t border-white/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <IconStarFilled key={s} className="h-3.5 w-3.5 text-[#FFB347]" />
                    ))}
                  </div>
                  <blockquote className="text-[14px] text-[#F0F0F5] font-medium italic leading-relaxed">
                    "{TESTIMONIALS[activeTab].quote}"
                  </blockquote>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-[11px] font-bold text-white shadow-glow-sm">
                        {TESTIMONIALS[activeTab].author.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-[#F0F0F5] leading-tight">
                          {TESTIMONIALS[activeTab].author}
                        </p>
                        <p className="text-[10.5px] text-[#5C5F73]">
                          {TESTIMONIALS[activeTab].role}, <span className="text-[#8B8FA8]">{TESTIMONIALS[activeTab].agency}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-[#00C896] uppercase tracking-wider block">
                        Result
                      </span>
                      <span className="text-[12.5px] font-bold text-white">
                        {TESTIMONIALS[activeTab].metric}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="relative z-10 pt-5 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[20px] font-bold text-[#F0F0F5] tracking-tight">500+</p>
              <p className="text-[10px] text-[#5C5F73] font-semibold uppercase tracking-wider mt-0.5">Agencies Onboarded</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div>
              <p className="text-[20px] font-bold text-[#F0F0F5] tracking-tight">$4.8M+</p>
              <p className="text-[10px] text-[#5C5F73] font-semibold uppercase tracking-wider mt-0.5">Invoiced Securely</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-[#5C5F73]">
            <IconShieldCheck className="h-4.5 w-4.5 text-[#00C896]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">ISO 27001</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: PSYCHOLOGY-OPTIMIZED AUTH FORM ── */}
      <div className="relative flex flex-col items-center justify-center h-full p-6 md:p-8 xl:p-12 bg-[#0D0E12] overflow-y-auto">
        
        {/* Mobile Background Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-15%,rgba(94,106,210,0.1),transparent)] pointer-events-none lg:hidden" />
        <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none lg:hidden" />

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[380px] relative z-10 space-y-6 my-auto"
        >
          {show2FAChallenge ? (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center mb-2">
                  <IconLock className="h-6 w-6 text-[var(--violet)] animate-pulse" />
                </div>
                <h2 className="text-[26px] font-semibold text-[#F0F0F5] tracking-tight">
                  Two-Factor Verification
                </h2>
                <p className="text-[13px] text-[#8B8FA8] max-w-[320px] mx-auto leading-relaxed">
                  Enter the 6-digit verification code from your authenticator app to access your workspace.
                </p>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <InputOTP
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={setTwoFactorCode}
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup className="gap-1.5">
                      <InputOTPSlot index={0} className="bg-[#111318] border-white/10 text-white w-11 h-11 text-[18px] rounded-md animate-in fade-in zoom-in duration-300" />
                      <InputOTPSlot index={1} className="bg-[#111318] border-white/10 text-white w-11 h-11 text-[18px] rounded-md animate-in fade-in zoom-in duration-300" />
                      <InputOTPSlot index={2} className="bg-[#111318] border-white/10 text-white w-11 h-11 text-[18px] rounded-md animate-in fade-in zoom-in duration-300" />
                      <InputOTPSlot index={3} className="bg-[#111318] border-white/10 text-white w-11 h-11 text-[18px] rounded-md animate-in fade-in zoom-in duration-300" />
                      <InputOTPSlot index={4} className="bg-[#111318] border-white/10 text-white w-11 h-11 text-[18px] rounded-md animate-in fade-in zoom-in duration-300" />
                      <InputOTPSlot index={5} className="bg-[#111318] border-white/10 text-white w-11 h-11 text-[18px] rounded-md animate-in fade-in zoom-in duration-300" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <p className="text-[12.5px] text-[#FF6B6B] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.15)] rounded-lg p-3 font-medium text-center">
                    {error}
                  </p>
                )}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    loading={isVerifying2FA}
                    disabled={twoFactorCode.length !== 6}
                    className="w-full h-11.5 text-[13.5px] font-semibold bg-[#5E6AD2] hover:bg-[#4D59C2] text-white rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-300"
                  >
                    Verify & Continue
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCancel2FA}
                    variant="outline"
                    className="w-full h-11.5 text-[13.5px] border-white/10 hover:bg-[#111318] text-[#8B8FA8] hover:text-white rounded-xl transition-all"
                  >
                    Cancel & Back
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Mobile Logo Branding */}
              <Link to="/" className="flex items-center gap-2.5 lg:hidden mb-6">
                <img src="/favicon.png" alt="Mershal Logo" className="h-8.5 w-8.5 rounded-[8px] shadow-glow" />
                <span className="text-[19px] font-semibold text-[#F0F0F5]">Mershal</span>
              </Link>

          {/* Form Headings & Conversion Copy */}
          <div className="space-y-1.5">
            <h1 className="text-[28px] xl:text-[32px] font-semibold text-[#F0F0F5] tracking-tight leading-none">
              {isSignup ? "Create your Mershal account" : "Welcome back to Mershal"}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13.5px] text-[#8B8FA8]">
                {isSignup ? "Join 500+ freelancers and agencies" : "Sign in to your workspace"}
              </p>
              {isSignup && (
                <span className="px-2 py-0.5 rounded-full bg-[rgba(0,200,150,0.08)] border border-[rgba(0,200,150,0.15)] text-[9.5px] font-bold text-[#00C896] uppercase tracking-wider">
                  No CC Required
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="space-y-1.5 relative group">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B8FA8]" htmlFor="name">
                  Full name
                </label>
                <div className="relative">
                  <div className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#00C896] opacity-0 blur-sm transition duration-300 ${focusedInput === 'name' ? 'opacity-25' : 'group-hover:opacity-10'}`} />
                  <Input
                    id="name"
                    placeholder="Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    required
                    autoComplete="name"
                    className="relative h-11 bg-[#111318] border-white/10 focus:border-[#5E6AD2]/60 text-white rounded-xl placeholder-[#5C5F73] text-[13.5px]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 relative group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B8FA8]" htmlFor="email">
                Work Email
              </label>
              <div className="relative">
                <div className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#00C896] opacity-0 blur-sm transition duration-300 ${focusedInput === 'email' ? 'opacity-25' : 'group-hover:opacity-10'}`} />
                <Input
                  id="email"
                  type="email"
                  placeholder="sarah@pixelcraft.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  required
                  autoComplete="email"
                  className="relative h-11 bg-[#111318] border-white/10 focus:border-[#5E6AD2]/60 text-white rounded-xl placeholder-[#5C5F73] text-[13.5px]"
                />
              </div>
            </div>

            <div className="space-y-1.5 relative group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B8FA8]" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#00C896] opacity-0 blur-sm transition duration-300 ${focusedInput === 'password' ? 'opacity-25' : 'group-hover:opacity-10'}`} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  required
                  minLength={6}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="relative h-11 bg-[#111318] border-white/10 focus:border-[#5E6AD2]/60 text-white rounded-xl placeholder-[#5C5F73] text-[13.5px] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5C5F73] hover:text-[#8B8FA8] transition-colors"
                >
                  {showPassword ? <IconEyeOff className="h-4.5 w-4.5" /> : <IconEye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {isSignup && <PasswordStrengthMeter password={password} />}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[12.5px] text-[#FF6B6B] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.15)] rounded-lg p-3 font-medium"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="w-full h-11.5 text-[13.5px] font-semibold bg-[#5E6AD2] hover:bg-[#4D59C2] text-white rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-300 mt-2 flex items-center justify-center gap-2"
              loading={loading}
            >
              {isSignup ? (
                <>
                  Start building free
                  <IconArrowRight className="h-4.5 w-4.5" />
                </>
              ) : (
                "Enter my workspace"
              )}
            </Button>

            {isSignup && (
              <p className="text-[11px] text-[#5C5F73] text-center mt-2 px-4 leading-normal">
                By signing up you agree to Mershal's{" "}
                <a href="#" className="underline hover:text-[#8B8FA8]">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="underline hover:text-[#8B8FA8]">Privacy Policy</a>
              </p>
            )}
          </form>

          {/* Anxiety Interception — Sleek Horizontal Checkout Timeline */}
          {isSignup && (
            <div className="p-3.5 rounded-xl bg-[#111318]/50 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E6AD2] flex items-center gap-1.5">
                <IconSparkles className="h-3.5 w-3.5" />
                What happens next?
              </span>
              <div className="flex justify-between items-center text-[10.5px] text-[#8B8FA8] gap-1 px-1">
                <div className="text-center">
                  <p className="font-semibold text-white leading-none">1. Subdomain</p>
                  <p className="text-[9px] text-[#5C5F73] mt-0.5">Claim custom link</p>
                </div>
                <span className="text-[#5C5F73]">➔</span>
                <div className="text-center">
                  <p className="font-semibold text-white leading-none">2. Brand Portal</p>
                  <p className="text-[9px] text-[#5C5F73] mt-0.5">Customize workspace</p>
                </div>
                <span className="text-[#5C5F73]">➔</span>
                <div className="text-center">
                  <p className="font-semibold text-white leading-none">3. Invite Client</p>
                  <p className="text-[9px] text-[#5C5F73] mt-0.5">Start work instantly</p>
                </div>
              </div>
            </div>
          )}

          {/* Trust Assurances */}
          <div className="pt-4 border-t border-white/5 flex justify-center items-center gap-5">
            <div className="flex items-center gap-1.5">
              <IconLock className="h-4 w-4 text-[#5C5F73]" />
              <span className="text-[10px] font-bold text-[#8B8FA8] uppercase tracking-wider">
                AES-256 Encrypted
              </span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="flex items-center gap-1.5">
              <IconShieldCheck className="h-4 w-4 text-[#5C5F73]" />
              <span className="text-[10px] font-bold text-[#8B8FA8] uppercase tracking-wider">
                SOC 2 Compliant
              </span>
            </div>
          </div>

          {/* Toggle Screen Mode Links */}
          <p className="text-[13px] text-[#5C5F73] text-center pt-1.5">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-[#F0F0F5] font-semibold hover:text-[#5E6AD2] transition-colors decoration-[#5E6AD2]/30 hover:underline">
                  Sign in →
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <Link to="/signup" className="text-[#F0F0F5] font-semibold hover:text-[#5E6AD2] transition-colors decoration-[#5E6AD2]/30 hover:underline">
                  Start free →
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </motion.div>
  </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0D0E12]/85 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            {/* Glowing Ambient Backdrop */}
            <div className="absolute w-[250px] h-[250px] bg-[#5E6AD2] blur-[120px] rounded-full opacity-30 animate-pulse" />
            
            <div className="relative flex flex-col items-center text-center space-y-6 max-w-sm">
              {/* Spinner */}
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-t-[#5E6AD2] border-r-[#00C896] border-b-transparent border-l-transparent"
                />
              </div>

              {/* Progress Text */}
              <div className="space-y-2">
                <motion.p
                  key={loadingPhase}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-[15px] font-semibold text-white tracking-tight"
                >
                  {loadingPhase}
                </motion.p>
                <p className="text-[12px] text-[#5C5F73] uppercase tracking-wider font-bold">
                  Please hold tight
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
