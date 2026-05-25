import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Receipt, Sparkles, ExternalLink } from "lucide-react";

/* ── Feature mockup cards (stylized UI components) ─────────────────────── */

function KanbanMockup() {
  const columns = [
    { title: "Planning", color: "#8B8FA8", cards: [
      { name: "Brand guidelines", priority: "#FFB347", due: "May 22" },
      { name: "Competitor analysis", priority: "#5E6AD2", due: "May 24" },
    ]},
    { title: "In Progress", color: "#5E6AD2", cards: [
      { name: "Homepage redesign", priority: "#FF6B6B", due: "May 20" },
      { name: "Wireframes v2", priority: "#00C896", due: "May 23" },
    ]},
    { title: "Done", color: "#00C896", cards: [
      { name: "Client kickoff", priority: "#00C896", due: "May 15" },
    ]},
  ];

  return (
    <div 
      className="rounded-xl p-5 space-y-4 shadow-glow-sm" 
      style={{ 
        background: "#16181F", 
        border: "1px solid #2A2D3A",
        borderTop: "2px solid #5E6AD2",
        boxShadow: "0 0 60px rgba(94,106,210,0.08)"
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-[#F0F0F5]">Website Redesign</span>
        <span className="text-[10px] text-[#8B8FA8] px-2 py-0.5 rounded bg-[#1C1E27] font-semibold border border-white/5">5 tasks</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {columns.map((col) => (
          <div key={col.title}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: col.color }} />
              <span className="text-[9.5px] font-bold text-[#8B8FA8] uppercase tracking-wider">{col.title}</span>
            </div>
            <div className="space-y-2">
              {col.cards.map((card) => (
                <div key={card.name} className="rounded-lg p-2.5 bg-[#0D0E12] border border-[#2A2D3A] shadow-inner">
                  <p className="text-[9.5px] font-semibold text-[#F0F0F5] mb-1.5 leading-tight">{card.name}</p>
                  <div className="flex items-center justify-between">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: card.priority }} />
                    <span className="text-[8px] text-[#8B8FA8] font-medium">{card.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CRMMockup() {
  return (
    <div 
      className="rounded-xl p-5 shadow-glow-sm" 
      style={{ 
        background: "#16181F", 
        border: "1px solid #2A2D3A",
        borderTop: "2px solid #5E6AD2",
        boxShadow: "0 0 60px rgba(94,106,210,0.08)"
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-[#5E6AD2] flex items-center justify-center text-[13px] text-white font-bold">JW</div>
        <div>
          <p className="text-[12.5px] font-bold text-[#F0F0F5]">Jessica Williams</p>
          <p className="text-[10px] text-[#8B8FA8] font-medium">Northwind Creative • Director</p>
        </div>
        <span className="ml-auto text-[9.5px] font-bold px-2.5 py-1 rounded-full bg-[#5E6AD2]/10 text-[#5E6AD2] border border-[#5E6AD2]/20">Active</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {[
          { label: "Active Proj.", value: "3" },
          { label: "Billed Total", value: "$4,200" },
          { label: "Last Contact", value: "2d ago" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-2.5 text-center bg-[#0D0E12] border border-white/5">
            <p className="text-[12.5px] font-bold text-[#F0F0F5]">{s.value}</p>
            <p className="text-[8px] text-[#8B8FA8] font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-[8.5px] text-[#8B8FA8] uppercase tracking-widest font-bold">Recent History</p>
        {[
          { action: "Invoice #042 paid", time: "2 days ago", color: "#00C896" },
          { action: "Project milestone completed", time: "5 days ago", color: "#5E6AD2" },
          { action: "Proposal reviewed by client", time: "1 week ago", color: "#FFB347" },
        ].map((item) => (
          <div key={item.action} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0 pb-1.5">
            <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="text-[10px] text-[#F0F0F5] font-medium flex-1">{item.action}</span>
            <span className="text-[8.5px] text-[#8B8FA8]">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoiceMockup() {
  return (
    <div 
      className="rounded-xl p-5 shadow-glow-sm" 
      style={{ 
        background: "#16181F", 
        border: "1px solid #2A2D3A",
        borderTop: "2px solid #5E6AD2",
        boxShadow: "0 0 60px rgba(94,106,210,0.08)"
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[12.5px] font-bold text-[#F0F0F5]">INV-0012</p>
          <p className="text-[10px] text-[#8B8FA8]">Northwind Creative</p>
        </div>
        <span className="text-[9.5px] font-bold px-2.5 py-1 rounded-full bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/20">Sent</span>
      </div>
      <div className="rounded-lg p-3.5 mb-3 bg-[#0D0E12] border border-[#2A2D3A]">
        <div className="space-y-2">
          {[
            { item: "Website Design", amount: "$2,400" },
            { item: "Brand Identity Package", amount: "$800" },
            { item: "SEO Optimization", amount: "$200" },
          ].map((line) => (
            <div key={line.item} className="flex justify-between text-[10px]">
              <span className="text-[#8B8FA8] font-medium">{line.item}</span>
              <span className="text-[#F0F0F5] font-bold">{line.amount}</span>
            </div>
          ))}
          <div className="border-t border-[#2A2D3A] pt-2 flex justify-between">
            <span className="text-[10px] font-bold text-[#F0F0F5]">Total Due</span>
            <span className="text-[13px] font-bold text-[#00C896]">$3,400</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <span className="text-[9.5px] text-[#8B8FA8] font-medium">Due: Jun 15, 2025</span>
        <button className="text-[10px] font-bold px-3.5 py-1.5 rounded-lg bg-[#5E6AD2] hover:bg-[#4D59C2] text-white transition-colors">Pay now</button>
      </div>
    </div>
  );
}

function AIMockup() {
  return (
    <div 
      className="rounded-xl p-5 shadow-glow-sm" 
      style={{ 
        background: "#16181F", 
        border: "1px solid #2A2D3A",
        borderTop: "2px solid #5E6AD2",
        boxShadow: "0 0 60px rgba(94,106,210,0.08)"
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-[#5E6AD2]" />
        <span className="text-[11.5px] font-bold text-[#F0F0F5]">AI Workspace Assistant</span>
      </div>
      <div className="space-y-3">
        {/* User bubble */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-xl rounded-br-sm px-3 py-2 bg-[#5E6AD2]">
            <p className="text-[10px] text-white font-medium leading-normal">Create a project plan for a restaurant website redesign</p>
          </div>
        </div>
        {/* AI response */}
        <div className="flex justify-start">
          <div className="max-w-[90%] rounded-xl rounded-bl-sm px-3.5 py-2.5 bg-[#0D0E12] border border-[#2A2D3A]">
            <p className="text-[9.5px] text-[#F0F0F5] mb-2 font-bold">Generated project plan details:</p>
            <div className="space-y-2">
              {[
                { phase: "Discovery & Research", duration: "Week 1" },
                { phase: "Wireframes & Copy", duration: "Week 2" },
                { phase: "Visual UI Design", duration: "Week 3-4" },
                { phase: "Tailwind Frontend Dev", duration: "Week 5-7" },
              ].map((step, i) => (
                <div key={step.phase} className="flex items-center gap-2 text-[9px] border-b border-white/5 pb-1 last:border-0 last:pb-0">
                  <span className="text-[#5E6AD2] font-bold w-3">{i + 1}.</span>
                  <span className="text-[#8B8FA8] font-medium flex-1">{step.phase}</span>
                  <span className="text-[#F0F0F5] font-semibold">{step.duration}</span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 pt-1.5 border-t border-white/5">
              <div className="h-1.5 w-1.5 rounded-full bg-[#5E6AD2] animate-pulse" />
              <span className="text-[8.5px] text-[#8B8FA8] font-semibold">12 tasks queued to board</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalMockup() {
  const steps = [
    { name: "Kickoff call", status: "done" },
    { name: "Wireframes & Mockups", status: "done" },
    { name: "Design review & approval", status: "active" },
    { name: "Final deployment", status: "pending" },
  ];

  return (
    <div 
      className="rounded-xl p-5 shadow-glow-sm" 
      style={{ 
        background: "#16181F", 
        border: "1px solid #2A2D3A",
        borderTop: "2px solid #5E6AD2",
        boxShadow: "0 0 60px rgba(94,106,210,0.08)"
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[12px] font-bold text-[#F0F0F5]">Client Portal Hub</p>
          <p className="text-[9.5px] text-[#8B8FA8] font-medium">Northwind Creative — Brand Redesign</p>
        </div>
        <ExternalLink className="h-3 w-3 text-[#8B8FA8]" />
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={step.name} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step.status === "done"
                    ? "bg-[#00C896] text-white"
                    : step.status === "active"
                      ? "bg-[#5E6AD2] text-white"
                      : "bg-[#0D0E12] text-[#5C5F73] border border-[#2A2D3A]"
                }`}
              >
                {step.status === "done" ? "✓" : step.status === "active" ? "→" : "○"}
              </div>
              {i < steps.length - 1 && (
                <div className="w-px h-5" style={{ background: step.status === "done" ? "#00C896" : "#2A2D3A" }} />
              )}
            </div>
            <div className="flex-1 pb-1">
              <p className={`text-[11.5px] font-semibold ${step.status === "pending" ? "text-[#5C5F73]" : "text-[#F0F0F5]"}`}>{step.name}</p>
              {step.status === "active" && <p className="text-[8.5px] font-semibold text-[#5E6AD2]">In progress</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main features data ────────────────────────────────────────────────── */

const FEATURES = [
  {
    id: "feature-projects",
    icon: LayoutDashboard,
    headline: "See every project at a glance",
    body: "Kanban, list, or timeline — switch views in one click. Your whole team always knows what's happening, what's stuck, and what's next.",
    tags: ["Kanban board", "Timeline view", "Drag & drop", "Milestones"],
    timeSaved: "Saves ~2 hrs/week",
    mockup: KanbanMockup,
  },
  {
    id: "feature-crm",
    icon: Users,
    headline: "Never lose track of a client again",
    body: "Every email, invoice, project, and note — in one client profile. The AI reminds you to follow up before clients have to ask twice.",
    tags: ["Client profiles", "Project history", "AI follow-ups", "Notes"],
    timeSaved: "Saves ~3 hrs/week",
    mockup: CRMMockup,
  },
  {
    id: "feature-invoices",
    icon: Receipt,
    headline: "Get paid faster, automatically",
    body: "Create and send invoices in 30 seconds. Automatic reminders chase late payments so you don't have to. Stripe payments built in.",
    tags: ["Auto-reminders", "Stripe payments", "Recurring billing", "PDF invoices"],
    timeSaved: "Saves ~3 hrs/month",
    mockup: InvoiceMockup,
  },
  {
    id: "feature-ai",
    icon: Sparkles,
    headline: "Your smartest team member costs $19/mo",
    body: "Type 'create a project plan for a restaurant website redesign' — get a full plan with milestones and tasks in 10 seconds. Write proposals, draft emails, summarize meetings.",
    tags: ["Project generation", "Proposal writer", "Email drafting", "Meeting summaries"],
    timeSaved: "Saves ~4 hrs/week",
    mockup: AIMockup,
  },
  {
    id: "feature-portal",
    icon: ExternalLink,
    headline: "Impress clients without lifting a finger",
    body: "Give clients a branded portal to track progress, approve work, and pay invoices. They feel like you have a full team behind you.",
    tags: ["Progress tracking", "File sharing", "Client approvals", "Invoice payments"],
    timeSaved: "Saves ~2 hrs/week",
    mockup: PortalMockup,
  },
];

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState("feature-projects");

  useEffect(() => {
    const handleScroll = () => {
      const ids = ["feature-projects", "feature-crm", "feature-invoices", "feature-ai", "feature-portal"];
      const scrollPos = window.scrollY + 250; // Offset for triggering detection

      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveTab(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100; // Offset for sticky nav
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section id="features" style={{ background: "#0D0E12", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center mb-4"
        >
          <span
            className="text-[11px] font-bold tracking-[0.12em] uppercase px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(94,106,210,0.12)",
              color: "#5E6AD2",
              border: "1px solid rgba(94,106,210,0.3)",
            }}
          >
            FEATURES
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[30px] md:text-[42px] font-medium text-[#F0F0F5] text-center mb-3"
          style={{ lineHeight: 1.25 }}
        >
          Everything your agency needs. Nothing it doesn't.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[16px] text-[#8B8FA8] text-center mb-16 leading-[1.75]"
        >
          One workspace. Every tool you actually use.
        </motion.p>

        {/* Sticky pill nav */}
        <div className="sticky top-4 z-40 hidden md:flex justify-center mb-16">
          <div className="bg-[#111318]/80 backdrop-blur-md border border-white/5 p-1.5 rounded-full flex items-center gap-1.5 shadow-glow-sm">
            {[
              { id: "feature-projects", label: "Projects" },
              { id: "feature-crm", label: "CRM" },
              { id: "feature-invoices", label: "Invoicing" },
              { id: "feature-ai", label: "AI" },
              { id: "feature-portal", label: "Portal" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`px-4.5 py-1.5 rounded-full text-[12.5px] font-bold transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-[#5E6AD2] text-white shadow-glow-sm"
                    : "text-[#5C5F73] hover:text-[#8B8FA8]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature blocks */}
        <div className="space-y-32">
          {FEATURES.map((feature, i) => {
            const isReversed = i % 2 === 1;
            const MockupComponent = feature.mockup;

            return (
              <div
                key={feature.headline}
                id={feature.id}
                className={`flex flex-col ${isReversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-20 scroll-mt-28`}
              >
                {/* Text content */}
                <motion.div
                  initial={{ opacity: 0, x: isReversed ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex-1 max-w-lg"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-xl bg-[rgba(94,106,210,0.12)] flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-[#5E6AD2]" />
                    </div>
                    {/* Time saved badge */}
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/20 uppercase tracking-[0.06em]">
                      {feature.timeSaved}
                    </span>
                  </div>
                  <h3 className="text-[28px] md:text-[32px] font-medium text-[#F0F0F5] mb-4 leading-tight">
                    {feature.headline}
                  </h3>
                  <p className="text-[15.5px] text-[#8B8FA8] leading-[1.75] mb-6">{feature.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[12px] text-[#8B8FA8] px-3.5 py-1 rounded-full font-medium"
                        style={{ background: "#1C1E27", border: "1px solid #2A2D3A" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Mockup */}
                <motion.div
                  initial={{ opacity: 0, x: isReversed ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="flex-1 w-full max-w-md"
                  style={{ willChange: "transform, opacity" }}
                >
                  <MockupComponent />
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
