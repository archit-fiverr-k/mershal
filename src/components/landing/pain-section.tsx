import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const PAIN_CARDS = [
  {
    title: "Chasing clients for payments",
    desc: "You send an invoice and then spend weeks following up manually.",
  },
  {
    title: "Copy-pasting between tools",
    desc: "ClickUp for tasks, Notion for docs, spreadsheet for invoices — nothing talks to each other.",
  },
  {
    title: "Losing track of project status",
    desc: "You find out a project is delayed when a client emails you asking where things are.",
  },
  {
    title: "Writing proposals from scratch",
    desc: "Every new client means hours rewriting the same proposal template.",
  },
  {
    title: "Forgetting to follow up",
    desc: "Leads go cold because you were too busy to remember to reach out.",
  },
  {
    title: "Paying $100+/month for 6 tools",
    desc: "ClickUp + Notion + HubSpot + Bonsai + Calendly + invoice tool = $120+/mo.",
  },
];

function BeforeAfterComparison() {
  const [isAfter, setIsAfter] = useState(false);

  return (
    <div className="mt-20 max-w-4xl mx-auto rounded-2xl p-8 md:p-10 relative overflow-hidden" style={{ background: "#111318", border: "1px solid #2A2D3A" }}>
      {/* Glow effect */}
      <div className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[80px] transition-all duration-500 pointer-events-none ${isAfter ? "bg-[#00C896]/10" : "bg-[#FF6B6B]/5"}`} />

      <div className="flex flex-col items-center mb-8">
        <h4 className="text-[12px] uppercase tracking-[0.12em] text-[#8B8FA8] mb-4 font-bold">How do you want to work?</h4>
        <div className="flex items-center bg-[#0D0E12] p-1 rounded-full border border-white/5">
          <button
            onClick={() => setIsAfter(false)}
            className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 ${!isAfter ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30" : "text-[#5C5F73]"}`}
          >
            Before Mershal
          </button>
          <button
            onClick={() => setIsAfter(true)}
            className={`px-6 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 ${isAfter ? "bg-[#00C896]/20 text-[#00C896] border border-[#00C896]/30" : "text-[#5C5F73]"}`}
          >
            After Mershal
          </button>
        </div>
      </div>

      <div className="relative min-h-[220px]">
        {/* Before State */}
        <div className={`transition-all duration-300 grid grid-cols-1 md:grid-cols-3 gap-4 ${!isAfter ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none absolute inset-0"}`}>
          {[
            { name: "ClickUp (Tasks)", price: "$12/mo" },
            { name: "Notion (Docs)", price: "$10/mo" },
            { name: "HubSpot (CRM)", price: "$20/mo" },
            { name: "Bonsai (Proposals)", price: "$24/mo" },
            { name: "Calendly (Scheduler)", price: "$15/mo" },
            { name: "QuickBooks (Invoices)", price: "$40/mo" },
          ].map((tool, idx) => (
            <div key={idx} className="bg-[#0D0E12] rounded-xl p-4 border border-[#FF6B6B]/10 flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#8B8FA8]">{tool.name}</span>
              <span className="text-[13px] font-bold text-[#FF6B6B]">{tool.price}</span>
            </div>
          ))}
          <div className="col-span-1 md:col-span-3 mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-[14px] text-[#5C5F73]">Total Monthly Stack:</span>
            <span className="text-[20px] font-bold text-[#FF6B6B]">$121/mo</span>
          </div>
        </div>

        {/* After State */}
        <div className={`transition-all duration-300 flex flex-col items-center justify-center py-6 ${isAfter ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none absolute inset-0"}`}>
          <div className="bg-gradient-to-r from-[#5E6AD2] to-[#00C896] p-[1px] rounded-2xl shadow-glow-md">
            <div className="bg-[#0D0E12] px-8 py-6 rounded-2xl text-center min-w-[280px] md:min-w-[340px]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/favicon.png" alt="Mershal" className="h-6 w-6 rounded-[4px]" />
                <span className="text-[16px] font-bold text-[#F0F0F5] tracking-tight">Mershal OS</span>
              </div>
              <p className="text-[12px] text-[#8B8FA8] mb-4">All-in-one system for client portals, tasks, CRM, invoices, & AI</p>
              <div className="text-[32px] font-black text-[#00C896]">$19<span className="text-[14px] font-medium text-[#5C5F73]">/mo</span></div>
              <span className="inline-block mt-3 text-[11px] text-[#00C896] bg-[#00C896]/10 px-3 py-1 rounded-full font-bold border border-[#00C896]/20">
                Saves $102/mo & 8 hours/week
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PainSection() {
  return (
    <section className="relative overflow-hidden" style={{ background: "#0D0E12", padding: "120px 0" }}>
      {/* Massive backdrop "6" watermark */}
      <div 
        className="absolute top-[10%] left-1/2 -translate-x-1/2 text-[400px] font-bold text-white/[0.015] pointer-events-none select-none leading-none z-0"
      >
        6
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
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
              background: "rgba(255,107,107,0.1)",
              color: "#FF6B6B",
              border: "1px solid rgba(255,107,107,0.2)",
            }}
          >
            THE PROBLEM
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[30px] md:text-[42px] font-medium text-[#F0F0F5] text-center max-w-3xl mx-auto mb-4"
          style={{ lineHeight: 1.25 }}
        >
          You're not bad at running your business. Your tools are.
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-[16.5px] text-[#5C5F73] text-center max-w-[540px] mx-auto mb-16 leading-[1.75]"
        >
          The average freelancer uses 6 different tools and spends 8 hours/week on admin instead of client work.
        </motion.p>

        {/* Pain cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PAIN_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="relative rounded-xl p-10 group cursor-default"
              style={{
                background: "#111318",
                border: "1px solid #2A2D3A",
                borderLeft: "3px solid transparent",
                transition: "all 300ms ease",
              }}
              whileHover={{ y: -4, borderLeftColor: "#FF6B6B", borderColor: "#3D4158" }}
            >
              {/* Red X icon */}
              <div className="absolute top-6 left-6 h-5 w-5 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center border border-[#FF6B6B]/20">
                <X className="h-3 w-3 text-[#FF6B6B]" strokeWidth={3} />
              </div>
              <div className="mt-3">
                <h3 className="text-[15.5px] font-bold text-[#F0F0F5] mb-2">{card.title}</h3>
                <p className="text-[14px] text-[#8B8FA8] leading-[1.75]">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Before / After comparison toggle container */}
        <BeforeAfterComparison />
      </div>
    </section>
  );
}
