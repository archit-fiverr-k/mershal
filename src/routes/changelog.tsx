import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Sparkles, Calendar, Zap, Shield, HelpCircle, Palette } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Mershal" },
      { name: "description", content: "Review recent updates, new features, and design improvements added to the Mershal platform." },
    ],
  }),
  component: ChangelogPage,
});

function ChangelogPage() {
  const updates = [
    {
      version: "v1.2.0",
      date: "May 24, 2026",
      title: "Google Auth Clean-up & Timezone-Aware greetings",
      icon: Shield,
      colorClass: "text-[var(--violet)] bg-[var(--violet)]/10 border-[var(--violet)]/20",
      changes: [
        "Removed third-party Google SSO dependency to enforce standard secure email+password credential controls with MFA options.",
        "Introduced timezone-aware greetings on the freelancer dashboard using the country timezone configured during onboarding.",
        "Added specialized 'Good noon' greeting states triggered at 12:00 PM local client time."
      ]
    },
    {
      version: "v1.1.0",
      date: "May 20, 2026",
      title: "Anti-Abuse Trial System & Settings Billing Redesign",
      icon: Zap,
      colorClass: "text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20",
      changes: [
        "Constructed a secure device fingerprinting and IP validation service checking signup records against Firestore metadata to prevent trial spam.",
        "Redesigned the Settings Billing tab showing a glassmorphic timeline for trial account days remaining.",
        "Unlocked Pro features (AI workspace assistant, invoice tracking, unlimited projects) automatically for trial users."
      ]
    },
    {
      version: "v1.0.0",
      date: "May 15, 2026",
      title: "Stripe Subscriptions & Collaborative Whiteboard Portal",
      icon: Palette,
      colorClass: "text-[var(--emerald)] bg-[var(--emerald)]/10 border-[var(--emerald)]/20",
      changes: [
        "Integrated recurring subscription billing via Stripe and Razorpay checkouts with webhooks to synchronize user plans.",
        "Overhauled the Client Portal with vertical tabs: Overview timeline, Files manager, Invoices, and Discussion chat.",
        "Created a real-time collaborative Whiteboard Canvas syncing drawing data between freelancers and portal guests."
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Product Updates</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Changelog
        </h1>
        <p className="text-[#8B8FA8] text-base mb-16 max-w-xl">
          Follow the latest features, enhancements, and performance optimizations shipped to Mershal.
        </p>

        <div className="relative border-l border-white/8 ml-4 pl-8 space-y-16">
          {updates.map((update) => {
            const Icon = update.icon;
            return (
              <div key={update.version} className="relative">
                {/* Timeline Dot */}
                <div className={`absolute -left-[45px] top-1.5 h-8 w-8 rounded-full border flex items-center justify-center ${update.colorClass} z-10 shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[13px] font-bold text-[#F0F0F5] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      {update.version}
                    </span>
                    <span className="text-[12.5px] text-[#5C5F73] font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {update.date}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#F0F0F5]">{update.title}</h3>
                  
                  <ul className="list-disc pl-5 text-[#B3B5C6] text-[14px] leading-relaxed space-y-2 max-w-2xl">
                    {update.changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
