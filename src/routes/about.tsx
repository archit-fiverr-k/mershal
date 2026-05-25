import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Users, Sparkles, Flame, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Mershal" },
      { name: "description", content: "Learn about the mission behind Mershal - the AI-powered workspace OS built specifically for independent creators, freelancers, and small agencies." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <Users className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Our Mission</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
          Empowering the Independent Workforce
        </h1>
        
        <p className="text-lg text-[#8B8FA8] leading-relaxed mb-12">
          Mershal was built out of frustration. The frustration of jumping between CRM tools, proposal software, email clients, invoice generators, and chat applications just to manage a single client. We wanted to build a single, unified operating system that handles the overhead so you can focus on doing your best work.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <div className="bg-[#111318] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-[var(--emerald)]/10 border border-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] mb-4">
              <Flame className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F0F0F5] mb-2">Eliminate Tool Fatigue</h3>
            <p className="text-[13.5px] text-[#8B8FA8] leading-relaxed">
              Why pay for 6 different subscriptions? Mershal aggregates proposals, timelines, task tracking, whiteboards, invoicing, and client portals under a single roof.
            </p>
          </div>

          <div className="bg-[#111318] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F0F0F5] mb-2">AI-Accelerated Workflows</h3>
            <p className="text-[13.5px] text-[#8B8FA8] leading-relaxed">
              Draft proposals, outline sprint plans, summarize chat timelines, and follow up on payments with the built-in Mershal AI Assistant tailored for freelancers.
            </p>
          </div>
        </div>

        <div className="space-y-6 text-[#B3B5C6] leading-relaxed mb-16">
          <h2 className="text-2xl font-bold text-[#F0F0F5]">Who We Are</h2>
          <p>
            Mershal is built by a distributed team of engineers, designers, and former freelancers who understand the operational struggles of running an independent business. We are passionate about crafting premium, highly responsive user experiences that make business operations feel exciting rather than tedious.
          </p>
          <p>
            Our core product values center around visual excellence, micro-second latency, robust secure standards (with 2FA), and clean developer API patterns.
          </p>
        </div>

        <div className="border border-[var(--violet)]/20 bg-gradient-to-r from-[var(--violet)]/10 to-transparent rounded-2xl p-8 text-center md:text-left md:flex items-center justify-between gap-6">
          <div>
            <h4 className="text-lg font-bold text-[#F0F0F5] mb-1">Ready to automate your agency operations?</h4>
            <p className="text-[13px] text-[#8B8FA8]">Set up your custom client portal and start billing in under 10 minutes.</p>
          </div>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center h-11 px-6 bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-[14px] font-semibold rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(94,106,210,0.3)] transition-all shrink-0 mt-4 md:mt-0"
          >
            Create Free Account
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
