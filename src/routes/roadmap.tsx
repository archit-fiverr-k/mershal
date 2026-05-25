import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Globe, Clock, CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Product Roadmap — Mershal" },
      { name: "description", content: "Explore the future of Mershal. See what features are planned, in-progress, or already completed." },
    ],
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  const sections = [
    {
      title: "Planned (Q3 2026)",
      status: "planned",
      items: [
        { title: "Wrangler Serverless Edge Optimization", desc: "Migrating API endpoints to Cloudflare Workers for near-zero database connection latency." },
        { title: "Client Contracts & e-Signatures", desc: "Upload and collect legally-binding signatures directly inside client portals." },
        { title: "Google Calendar & Calendly Sync", desc: "Let clients schedule onboarding calls or reviews directly from the overview tab." }
      ]
    },
    {
      title: "In Progress (Q2 2026)",
      status: "in-progress",
      items: [
        { title: "Advanced Revenue Charts", desc: "Yearly projection analytics, expense tracking, and custom invoice export options." },
        { title: "AI Contract Summarizer", desc: "Let Mershal AI parse raw contract drafts and outline deadlines automatically." },
        { title: "Custom Domain Portals", desc: "Allow freelancers to point portal links (e.g. portal.myagency.com) directly to their custom workspace." }
      ]
    },
    {
      title: "Completed (Q1 2026)",
      status: "completed",
      items: [
        { title: "Stripe & Razorpay Checkout Setup", desc: "Enable online credit card payments and automated subscription billing triggers." },
        { title: "Collaborative Whiteboard", desc: "Launch drawing whiteboard synchronization inside the redesigned portal dashboard." },
        { title: "Onboarding Country & Timezone Setup", desc: "Ask users for local timezone to sync notifications and greeting briefs." }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <Globe className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Product Vision</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Product Roadmap
        </h1>
        <p className="text-[#8B8FA8] text-base mb-16 max-w-xl">
          See what we're working on, what's coming next, and review already completed roadmap milestones.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                {sec.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--emerald)]" />
                ) : sec.status === "in-progress" ? (
                  <Clock className="h-4 w-4 text-[var(--amber)] animate-pulse" />
                ) : (
                  <Circle className="h-4 w-4 text-[#5C5F73]" />
                )}
                <h3 className="text-[14.5px] font-bold text-[#F0F0F5] tracking-tight">{sec.title}</h3>
              </div>

              <div className="space-y-4">
                {sec.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="bg-[#111318] border border-white/5 rounded-xl p-5 space-y-2 hover:border-white/10 transition-colors shadow-sm"
                  >
                    <h4 className="text-[13.5px] font-bold text-[#F0F0F5] leading-snug">{item.title}</h4>
                    <p className="text-[12px] text-[#8B8FA8] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
