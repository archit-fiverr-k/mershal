import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Users,
  Send,
  Trash2,
  Shield,
  ShieldAlert,
  ArrowUpCircle,
  ArrowDownCircle,
  Mail,
  Loader2,
  ArrowLeft,
  Tag,
  MessageSquare,
  History,
  Percent,
  CheckCircle,
  Clock,
  Plus,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Mershal OS Admin Panel" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

interface AdminUser {
  uid: string;
  fullName: string;
  email: string;
  plan: "free" | "pro";
  isAdmin?: boolean;
  onboardingCompleted: boolean;
  createdAt: any;
}

interface CampaignLog {
  id: string;
  subject: string;
  recipientGroup: string;
  recipientCount: number;
  sentAt: string;
  sentBy: string;
  headerTitle: string;
  bodyMarkdown: string;
  openRateMock: number;
  clickRateMock: number;
}

interface PromoCode {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  value: number;
  status: "active" | "inactive";
  createdAt: string;
}

interface LeadMessage {
  id: string;
  email: string;
  message: string;
  status: "new" | "contacted" | "converted";
  createdAt: string;
}

type TabType = "users" | "campaign" | "campaign-logs" | "promo-codes" | "leads";

function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("users");

  // Email Campaign States
  const [recipientGroup, setRecipientGroup] = useState<"all" | "pro" | "free" | "test">("test");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailHeader, setEmailHeader] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  // Promo Code States
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [promoValue, setPromoValue] = useState("");
  const [promoStatus, setPromoStatus] = useState<"active" | "inactive">("active");

  // Auth User Profile verification
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/profile"),
    enabled: !!user,
  });

  // Admin access redirects
  useEffect(() => {
    if (profile) {
      const isUserAdmin = profile.email === "hello@mershal.in" || profile.isAdmin;
      if (!isUserAdmin) {
        navigate({ to: "/dashboard", replace: true });
        toast.error("Access denied. Administrator privileges required.");
      }
    }
  }, [profile, navigate]);

  // Queries
  const { data: usersData, isLoading: isUsersLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin", "users"],
    queryFn: () => apiClient.get<{ users: AdminUser[] }>("/api/admin/users"),
    enabled: !!profile && (profile.email === "hello@mershal.in" || !!profile.isAdmin),
  });

  const { data: campaignLogsData, isLoading: isLogsLoading } = useQuery<{ logs: CampaignLog[] }>({
    queryKey: ["admin", "campaigns-logs"],
    queryFn: () => apiClient.get<{ logs: CampaignLog[] }>("/api/admin/campaign"),
    enabled: !!profile && (profile.email === "hello@mershal.in" || !!profile.isAdmin) && activeTab === "campaign-logs",
  });

  const { data: promoCodesData, isLoading: isPromoLoading } = useQuery<{ codes: PromoCode[] }>({
    queryKey: ["admin", "promo-codes"],
    queryFn: () => apiClient.get<{ codes: PromoCode[] }>("/api/admin/promo-codes"),
    enabled: !!profile && (profile.email === "hello@mershal.in" || !!profile.isAdmin) && activeTab === "promo-codes",
  });

  const { data: leadsData, isLoading: isLeadsLoading } = useQuery<{ leads: LeadMessage[] }>({
    queryKey: ["admin", "leads"],
    queryFn: () => apiClient.get<{ leads: LeadMessage[] }>("/api/admin/leads"),
    enabled: !!profile && (profile.email === "hello@mershal.in" || !!profile.isAdmin) && activeTab === "leads",
  });

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: (data: { uid: string; plan?: "free" | "pro"; isAdmin?: boolean }) =>
      apiClient.patch("/api/admin/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User updated successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update user"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (uid: string) => apiClient.delete(`/api/admin/users?uid=${uid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User account deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete user"),
  });

  const sendCampaignMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/api/admin/campaign", data),
    onSuccess: (res: any) => {
      toast.success(`Success! Sent email to ${res.count} recipient(s).`);
      qc.invalidateQueries({ queryKey: ["admin", "campaigns-logs"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to send email campaign"),
  });

  const createPromoMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/api/admin/promo-codes", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promo-codes"] });
      toast.success("Promo code created successfully");
      setPromoCode("");
      setPromoValue("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create promo code"),
  });

  const deletePromoMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/promo-codes?id=${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promo-codes"] });
      toast.success("Promo code deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete promo code"),
  });

  const updateLeadMutation = useMutation({
    mutationFn: (data: { id: string; status: string }) => apiClient.patch("/api/admin/leads", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success("Lead status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update lead"),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/leads?id=${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      toast.success("Lead deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete lead"),
  });

  // Handlers
  const handleDeleteUser = (uid: string, name: string) => {
    if (confirm(`Confirm: Delete user ${name} permanently?`)) {
      deleteUserMutation.mutate(uid);
    }
  };

  const handleSendCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailHeader || !emailBody) {
      toast.error("Subject, Header Title, and Body are required.");
      return;
    }
    const targetDesc = recipientGroup === "test" ? "send test to yourself" : `send to "${recipientGroup}" users`;
    if (confirm(`Confirm: Do you want to ${targetDesc}?`)) {
      sendCampaignMutation.mutate({
        recipientGroup,
        subject: emailSubject,
        headerTitle: emailHeader,
        bodyMarkdown: emailBody,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
      });
    }
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoValue) {
      toast.error("Please fill in all fields.");
      return;
    }
    createPromoMutation.mutate({
      code: promoCode,
      discountType,
      value: Number(promoValue),
      status: promoStatus,
    });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0D0E12] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#5E6AD2] mx-auto" />
          <p className="text-[#8B8FA8] text-[14px]">Verifying administration access...</p>
        </div>
      </div>
    );
  }

  const usersList = usersData?.users ?? [];
  const totalUsers = usersList.length;
  const proUsersCount = usersList.filter(u => u.plan === "pro").length;
  const freeUsersCount = totalUsers - proUsersCount;

  return (
    <div className="min-h-screen bg-[#0D0E12] text-[#F0F0F5] flex flex-col font-sans">
      {/* Admin Shell Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/6 bg-[#111318] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/">
            <img src="/logo.png" alt="Mershal" className="h-7 w-auto object-contain logo-slow-glow" />
          </Link>
          <span className="text-[#5C5F73] text-[15px]">/</span>
          <span className="text-white/20 text-xs font-semibold px-2.5 py-1 rounded border border-white/5 bg-white/[0.02] tracking-wider select-none font-mono">
            ADMIN CENTRE
          </span>
        </div>
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8B8FA8] hover:text-[#F0F0F5] bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Workspace
        </Link>
      </header>

      {/* Main Two-column Sidebar Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Control Navigation */}
        <aside className="w-full md:w-64 border-r border-white/5 bg-[#111318] p-6 space-y-2 flex-shrink-0">
          <p className="text-[10px] font-bold text-[#5C5F73] uppercase tracking-wider px-3 mb-4">Core Management</p>
          
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all text-left cursor-pointer",
              activeTab === "users" 
                ? "bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20" 
                : "text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-white/[0.02] border border-transparent"
            )}
          >
            <Users className="h-4 w-4" />
            <span>User Directory</span>
          </button>

          <p className="text-[10px] font-bold text-[#5C5F73] uppercase tracking-wider px-3 pt-6 mb-4">Marketing & Growth</p>

          <button
            onClick={() => setActiveTab("campaign")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all text-left cursor-pointer",
              activeTab === "campaign" 
                ? "bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20" 
                : "text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-white/[0.02] border border-transparent"
            )}
          >
            <Send className="h-4 w-4" />
            <span>Broadcast Center</span>
          </button>

          <button
            onClick={() => setActiveTab("campaign-logs")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all text-left cursor-pointer",
              activeTab === "campaign-logs" 
                ? "bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20" 
                : "text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-white/[0.02] border border-transparent"
            )}
          >
            <History className="h-4 w-4" />
            <span>Campaign Reports</span>
          </button>

          <button
            onClick={() => setActiveTab("promo-codes")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all text-left cursor-pointer",
              activeTab === "promo-codes" 
                ? "bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20" 
                : "text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-white/[0.02] border border-transparent"
            )}
          >
            <Percent className="h-4 w-4" />
            <span>Promo Coupons</span>
          </button>

          <button
            onClick={() => setActiveTab("leads")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all text-left cursor-pointer",
              activeTab === "leads" 
                ? "bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20" 
                : "text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-white/[0.02] border border-transparent"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Inbound Leads</span>
          </button>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 p-8 overflow-y-auto">
          {/* TAB 1: USERS */}
          {activeTab === "users" && (
            <div className="space-y-6 page-enter">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-[20px] font-bold text-[#F0F0F5]">User Accounts Directory</h1>
                  <p className="text-[13px] text-[#8B8FA8]">Monitor signups, toggle premium plans, and manage platform permissions.</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#111318] border border-white/5 rounded-xl p-5">
                  <span className="text-[11px] font-bold text-[#8B8FA8] uppercase tracking-wider">Total Registrations</span>
                  <p className="text-3xl font-extrabold text-[#F0F0F5] mt-1 font-mono">{totalUsers}</p>
                </div>
                <div className="bg-[#111318] border border-[#5E6AD2]/15 rounded-xl p-5">
                  <span className="text-[11px] font-bold text-[#8B8FA8] uppercase tracking-wider text-[#5E6AD2]">Pro Tier Accounts</span>
                  <p className="text-3xl font-extrabold text-[#F0F0F5] mt-1 font-mono text-[#5E6AD2]">{proUsersCount}</p>
                </div>
                <div className="bg-[#111318] border border-white/5 rounded-xl p-5">
                  <span className="text-[11px] font-bold text-[#8B8FA8] uppercase tracking-wider">Free Tier Accounts</span>
                  <p className="text-3xl font-extrabold text-[#F0F0F5] mt-1 font-mono">{freeUsersCount}</p>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-[#111318] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                {isUsersLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="p-12 text-center text-[#8B8FA8] text-sm">No registered user profiles found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-[#5C5F73] bg-white/[0.01]">
                          <th className="px-6 py-4">Account Profile</th>
                          <th className="px-6 py-4">Plan Access</th>
                          <th className="px-6 py-4">Security Level</th>
                          <th className="px-6 py-4">Registered Date</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[13px]">
                        {usersList.map((usr) => (
                          <tr key={usr.uid} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-[#F0F0F5]">{usr.fullName || "Unnamed User"}</div>
                              <div className="text-xs text-[#8B8FA8] font-mono mt-0.5">{usr.email}</div>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                                usr.plan === "pro" 
                                  ? "bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20" 
                                  : "bg-white/5 text-[#8B8FA8] border border-white/5"
                              )}>
                                {usr.plan}
                              </span>
                            </td>
                            <td className="px-6 py-4.5">
                              {usr.isAdmin ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-[#FFB347] font-semibold">
                                  <Shield className="h-3.5 w-3.5" />
                                  Admin
                                </span>
                              ) : (
                                <span className="text-[#5C5F73]">Standard</span>
                              )}
                            </td>
                            <td className="px-6 py-4.5 text-[#8B8FA8]">
                              {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString(undefined, {
                                year: "numeric", month: "short", day: "numeric"
                              }) : "N/A"}
                            </td>
                            <td className="px-6 py-4.5 text-right space-x-2">
                              {/* Toggle Plan */}
                              <button
                                onClick={() => updateRoleMutation.mutate({
                                  uid: usr.uid,
                                  plan: usr.plan === "pro" ? "free" : "pro"
                                })}
                                title="Toggle Plan"
                                className="inline-flex h-8 px-2.5 items-center justify-center text-xs font-semibold rounded-lg bg-white/5 border border-white/5 text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                {usr.plan === "pro" ? <ArrowDownCircle className="h-3.5 w-3.5 mr-1" /> : <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />}
                                {usr.plan === "pro" ? "Demote" : "Upgrade"}
                              </button>

                              {/* Toggle Admin */}
                              <button
                                onClick={() => updateRoleMutation.mutate({
                                  uid: usr.uid,
                                  isAdmin: !usr.isAdmin
                                })}
                                title="Toggle Admin Access"
                                className="inline-flex h-8 px-2.5 items-center justify-center text-xs font-semibold rounded-lg bg-white/5 border border-white/5 text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <Shield className="h-3.5 w-3.5 mr-1" />
                                Admin
                              </button>

                              {/* Delete User */}
                              <button
                                onClick={() => handleDeleteUser(usr.uid, usr.fullName)}
                                disabled={usr.email === profile.email}
                                title="Delete User Account"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/25 text-[#FF6B6B] border border-[#FF6B6B]/15 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CAMPAIGN BROADCAST COMPOSER */}
          {activeTab === "campaign" && (
            <div className="space-y-6 page-enter max-w-4xl">
              <div>
                <h1 className="text-[20px] font-bold text-[#F0F0F5]">Broadcast Campaign Center</h1>
                <p className="text-[13px] text-[#8B8FA8]">Draft and dispatch professional announcements, updates, or marketing emails directly.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Draft Composer Form */}
                <form onSubmit={handleSendCampaign} className="space-y-5 bg-[#111318] border border-white/5 rounded-xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#5C5F73]">Draft Composer</h3>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8B8FA8] block">Recipient Group Filter</label>
                    <select
                      value={recipientGroup}
                      onChange={(e) => setRecipientGroup(e.target.value as any)}
                      className="w-full bg-[#0D0E12] border border-white/5 rounded-lg px-3 py-2 text-[13px] text-[#F0F0F5] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                    >
                      <option value="test">Send Test Email (Only to hello@mershal.in)</option>
                      <option value="all">All Platform Registered Accounts</option>
                      <option value="pro">Pro Subscription Accounts Only</option>
                      <option value="free">Free Tier Users Only</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8B8FA8] block">Email Subject line</label>
                    <Input
                      required
                      placeholder="e.g. Mershal OS v2.0 is officially live!"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="bg-[#0D0E12] border-white/5 text-[13px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8B8FA8] block">Email Header Banner Title</label>
                    <Input
                      required
                      placeholder="e.g. Major Platform Update"
                      value={emailHeader}
                      onChange={(e) => setEmailHeader(e.target.value)}
                      className="bg-[#0D0E12] border-white/5 text-[13px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8B8FA8] block flex justify-between">
                      <span>Body Markdown Content</span>
                      <span className="text-[10px] text-[#5C5F73] font-mono">supports **bold** and [links](url)</span>
                    </label>
                    <Textarea
                      required
                      rows={6}
                      placeholder="Draft your markdown body details here..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="bg-[#0D0E12] border-white/5 text-[13px] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8B8FA8] block">Call-To-Action Text (Optional)</label>
                      <Input
                        placeholder="e.g. Access My Dashboard"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="bg-[#0D0E12] border-white/5 text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8B8FA8] block">Call-To-Action URL (Optional)</label>
                      <Input
                        placeholder="e.g. https://mershal.in/dashboard"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        className="bg-[#0D0E12] border-white/5 text-[13px]"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={sendCampaignMutation.isPending}
                    className="w-full bg-[#5E6AD2] hover:bg-[#4D59C2] text-white font-bold h-10 tracking-wide rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(94,106,210,0.3)] transition-all"
                  >
                    {sendCampaignMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Broadcasting Campaign...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{recipientGroup === "test" ? "Send Test Email" : "Broadcast Announcement"}</span>
                      </>
                    )}
                  </Button>
                </form>

                {/* Live Preview Box */}
                <div className="flex flex-col space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#5C5F73]">Real-time HTML Preview</h3>
                  <div className="bg-[#16181F] border border-white/5 rounded-xl overflow-hidden shadow-xl flex-1 flex flex-col min-h-[400px]">
                    <div className="bg-[#0f111a] p-4 text-center border-b-2 border-[#5E6AD2]">
                      <span className="text-lg font-extrabold text-[#F0F0F5]">Mer<span className="text-[#5E6AD2]">shal</span></span>
                      <p className="text-[9px] text-[#94a3b8] uppercase tracking-wider mt-0.5 font-bold">Official Announcement</p>
                    </div>
                    <div className="p-6 bg-white flex-1 text-slate-800 text-[14px] overflow-y-auto space-y-4">
                      {emailHeader ? (
                        <h2 className="text-lg font-bold text-slate-900 border-b pb-2">{emailHeader}</h2>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-mono block">Header title will render here</span>
                      )}
                      
                      {emailBody ? (
                        <div 
                          className="space-y-3 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: emailBody
                              .split(/\n\n+/)
                              .map(p => {
                                let formatted = p.trim();
                                formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #5E6AD2; font-weight: bold; text-decoration: underline;">$1</a>');
                                formatted = formatted.replace(/\n/g, '<br />');
                                return `<p style="margin: 0 0 12px 0;">${formatted}</p>`;
                              })
                              .join("")
                          }}
                        />
                      ) : (
                        <span className="text-xs text-slate-400 italic font-mono block">Draft body copy in markdown to see HTML compilation preview</span>
                      )}

                      {ctaText && ctaUrl && (
                        <div className="text-center pt-4">
                          <span className="inline-block bg-[#5E6AD2] text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md">
                            {ctaText}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-[#f8fafc] border-t border-slate-200 py-3 text-center text-[10px] text-slate-400">
                      &copy; 2026 Mershal OS &middot; mershal.in
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CAMPAIGN LOGS REPORTS */}
          {activeTab === "campaign-logs" && (
            <div className="space-y-6 page-enter">
              <div>
                <h1 className="text-[20px] font-bold text-[#F0F0F5]">Broadcast Campaign Reports</h1>
                <p className="text-[13px] text-[#8B8FA8]">Track delivery statistics, engagement metrics, and historical logs of all dispatched broadcasts.</p>
              </div>

              <div className="bg-[#111318] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                {isLogsLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : !campaignLogsData || campaignLogsData.logs.length === 0 ? (
                  <div className="p-12 text-center text-[#8B8FA8] text-sm">No campaigns have been broadcasted yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-[#5C5F73] bg-white/[0.01]">
                          <th className="px-6 py-4">Subject & Details</th>
                          <th className="px-6 py-4">Audience / Recipient Count</th>
                          <th className="px-6 py-4">Delivery Date</th>
                          <th className="px-6 py-4">Open Rate</th>
                          <th className="px-6 py-4">Click Rate</th>
                          <th className="px-6 py-4">Sender</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[13px]">
                        {campaignLogsData.logs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-[#F0F0F5]">{log.subject}</div>
                              <div className="text-xs text-[#8B8FA8] mt-0.5 italic">{log.headerTitle}</div>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                                  log.recipientGroup === "test" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                  log.recipientGroup === "pro" ? "bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20" :
                                  log.recipientGroup === "free" ? "bg-white/5 text-white/60 border border-white/5" :
                                  "bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20"
                                )}>
                                  {log.recipientGroup}
                                </span>
                                <span className="font-mono text-xs text-[#8B8FA8]">({log.recipientCount} emails)</span>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 text-[#8B8FA8] font-mono text-xs">
                              {new Date(log.sentAt).toLocaleString(undefined, {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="space-y-1.5 w-24">
                                <div className="flex justify-between text-[11px] font-mono">
                                  <span className="text-[#8B8FA8]">Open</span>
                                  <span className="font-bold text-[#00C896]">{log.openRateMock}%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded overflow-hidden">
                                  <div className="h-full bg-[#00C896] rounded" style={{ width: `${log.openRateMock}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="space-y-1.5 w-24">
                                <div className="flex justify-between text-[11px] font-mono">
                                  <span className="text-[#8B8FA8]">Click</span>
                                  <span className="font-bold text-[#5E6AD2]">{log.clickRateMock}%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded overflow-hidden">
                                  <div className="h-full bg-[#5E6AD2] rounded" style={{ width: `${log.clickRateMock}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 text-xs text-[#8B8FA8] font-mono">
                              {log.sentBy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PROMO CODES */}
          {activeTab === "promo-codes" && (
            <div className="space-y-6 page-enter">
              <div>
                <h1 className="text-[20px] font-bold text-[#F0F0F5]">Promo Codes Engine</h1>
                <p className="text-[13px] text-[#8B8FA8]">Configure, generate, and manage discount coupons for subscription checkout flows.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Generate Form */}
                <form onSubmit={handleCreatePromo} className="bg-[#111318] border border-white/5 rounded-xl p-6 shadow-xl space-y-4 h-fit">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#5C5F73]">Generate Promo Code</h3>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8B8FA8] block">Promo Coupon Code</label>
                    <Input
                      required
                      placeholder="e.g. MERSHAL30"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="bg-[#0D0E12] border-white/5 text-[13px] uppercase font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8B8FA8] block">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full bg-[#0D0E12] border border-white/5 rounded-lg px-3 py-2 text-[13px] text-[#F0F0F5] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                    >
                      <option value="percent">Percentage Off (%)</option>
                      <option value="fixed">Fixed Amount Off ($)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8B8FA8] block">Discount Amount/Value</label>
                    <Input
                      required
                      type="number"
                      placeholder={discountType === "percent" ? "e.g. 30" : "e.g. 15"}
                      value={promoValue}
                      onChange={(e) => setPromoValue(e.target.value)}
                      className="bg-[#0D0E12] border-white/5 text-[13px] font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#8B8FA8] block">Status</label>
                    <select
                      value={promoStatus}
                      onChange={(e) => setPromoStatus(e.target.value as any)}
                      className="w-full bg-[#0D0E12] border border-white/5 rounded-lg px-3 py-2 text-[13px] text-[#F0F0F5] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                    >
                      <option value="active">Active (Can be redeemed)</option>
                      <option value="inactive">Inactive (Disabled)</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={createPromoMutation.isPending}
                    className="w-full bg-[#5E6AD2] hover:bg-[#4D59C2] text-white font-bold h-10 tracking-wide rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(94,106,210,0.3)] transition-all"
                  >
                    {createPromoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>Create Promo Coupon</span>
                  </Button>
                </form>

                {/* List Table */}
                <div className="lg:col-span-2 bg-[#111318] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#5C5F73] p-5 border-b border-white/5 bg-white/[0.01]">Existing Promo Codes</h3>
                  
                  {isPromoLoading ? (
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : !promoCodesData || promoCodesData.codes.length === 0 ? (
                    <div className="p-12 text-center text-[#8B8FA8] text-sm">No promo codes generated yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-[#5C5F73] bg-white/[0.01]">
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4">Discount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Created Date</th>
                            <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[13px]">
                          {promoCodesData.codes.map((code) => (
                            <tr key={code.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-white tracking-wider">
                                {code.code}
                              </td>
                              <td className="px-6 py-4 text-[#F0F0F5] font-semibold">
                                {code.discountType === "percent" ? `${code.value}% Off` : `$${code.value} Off`}
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  code.status === "active" ? "bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20" : "bg-white/5 text-[#8B8FA8] border border-white/5"
                                )}>
                                  {code.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-[#8B8FA8] font-mono text-xs">
                                {new Date(code.createdAt).toLocaleDateString(undefined, {
                                  month: "short", day: "numeric", year: "numeric"
                                })}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => deletePromoMutation.mutate(code.id)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/25 text-[#FF6B6B] border border-[#FF6B6B]/15 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INBOUND LEADS (CRM) */}
          {activeTab === "leads" && (
            <div className="space-y-6 page-enter">
              <div>
                <h1 className="text-[20px] font-bold text-[#F0F0F5]">Inbound Message Leads (CRM)</h1>
                <p className="text-[13px] text-[#8B8FA8]">Track support queries, product inquiries, and sales leads submitted through the landing page chat widget.</p>
              </div>

              <div className="bg-[#111318] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                {isLeadsLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : !leadsData || leadsData.leads.length === 0 ? (
                  <div className="p-12 text-center text-[#8B8FA8] text-sm">No inquiries or leads received yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-[#5C5F73] bg-white/[0.01]">
                          <th className="px-6 py-4">Lead Details</th>
                          <th className="px-6 py-4">Inquiry Message</th>
                          <th className="px-6 py-4">Status Pipeline</th>
                          <th className="px-6 py-4">Submitted Date</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[13px]">
                        {leadsData.leads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-[#F0F0F5]">{lead.email}</div>
                              <div className="text-xs text-[#8B8FA8] font-mono mt-0.5">id: {lead.id.substring(0, 8)}</div>
                            </td>
                            <td className="px-6 py-4.5 max-w-sm">
                              <p className="text-[#8B8FA8] leading-relaxed break-words">{lead.message}</p>
                            </td>
                            <td className="px-6 py-4.5">
                              <select
                                value={lead.status}
                                onChange={(e) => updateLeadMutation.mutate({ id: lead.id, status: e.target.value })}
                                className={cn(
                                  "bg-[#0D0E12] border border-white/5 rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide cursor-pointer focus:outline-none",
                                  lead.status === "new" ? "text-[#FFB347]" : 
                                  lead.status === "contacted" ? "text-[#5E6AD2]" : 
                                  "text-[#00C896]"
                                )}
                              >
                                <option value="new" className="text-[#FFB347]">New Lead</option>
                                <option value="contacted" className="text-[#5E6AD2]">Contacted</option>
                                <option value="converted" className="text-[#00C896]">Converted</option>
                              </select>
                            </td>
                            <td className="px-6 py-4.5 text-[#8B8FA8] font-mono text-xs">
                              {new Date(lead.createdAt).toLocaleString(undefined, {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                            <td className="px-6 py-4.5 text-right space-x-2">
                              {/* Quick Reply button */}
                              <a
                                href={`mailto:${lead.email}?subject=Regarding your Mershal inquiry`}
                                className="h-8 px-2.5 inline-flex items-center justify-center text-xs font-semibold rounded-lg bg-white/5 border border-white/5 text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <Mail className="h-3.5 w-3.5 mr-1" />
                                Reply
                              </a>

                              {/* Delete Lead */}
                              <button
                                onClick={() => {
                                  if (confirm("Confirm: Delete this inbound lead?")) {
                                    deleteLeadMutation.mutate(lead.id);
                                  }
                                }}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/25 text-[#FF6B6B] border border-[#FF6B6B]/15 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
