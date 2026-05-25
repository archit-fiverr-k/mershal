import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Globe } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { Client } from "@/lib/types";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";
import { toast } from "sonner";
import { getIdToken } from "@/lib/firebase/auth";

export const Route = createFileRoute("/dashboard/portal")({
  head: () => ({
    meta: [
      { title: "Client Portal — Mershal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalIndex,
});

function PortalIndex() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<{ clients: Client[] }>({
    queryKey: ["clients"],
    queryFn: () => apiClient.get<{ clients: Client[] }>("/api/clients"),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: subscription } = useQuery<{
    plan: string;
    subscriptionStatus: string;
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

  const clients = data?.clients ?? [];

  return (
    <div className="space-y-6 max-w-[800px] page-enter">
      {subscription?.plan !== "pro" && (
        <UpgradePrompt
          feature="Client Portal"
          description="Give clients a branded portal to track progress and pay invoices. Upgrade to Pro."
          onUpgrade={handleUpgrade}
        />
      )}
      <div>
        <h1 className="text-page-title">Client Portal</h1>
        <p className="text-[13px] text-[#8B8FA8] mt-1">
          A private space your clients can view progress, files, and invoices.
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[12px]" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state">
          <div className="h-12 w-12 rounded-[12px] bg-[#1C1E27] flex items-center justify-center">
            <Globe className="h-6 w-6 text-[#5C5F73]" />
          </div>
          <p className="text-[15px] font-medium text-[#F0F0F5]">No clients yet</p>
          <p className="text-[13px] text-[#8B8FA8]">
            Add clients to create their private portals
          </p>
          <Button asChild size="sm" className="mt-2 shadow-glow-sm">
            <Link to="/dashboard/clients">Go to Clients</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {clients.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3 rounded-[12px] border border-white/8 bg-[#16181F] hover:bg-[#1C1E27] hover:border-white/12 transition-[background,border-color] duration-100"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-[#5E6AD2] text-white text-[10px] font-medium">
                  {c.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#F0F0F5] truncate">{c.name}</p>
                <p className="text-[11px] text-[#8B8FA8] truncate">{c.company}</p>
              </div>
              {/* Ghost button — signals "optional, non-destructive" */}
              <Button asChild variant="outline" size="sm">
                <Link to="/portal/$clientId" params={{ clientId: c.id }}>
                  Open <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
