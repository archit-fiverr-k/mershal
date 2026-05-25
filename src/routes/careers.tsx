import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Briefcase, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Mershal" },
      { name: "description", content: "Join our distributed, remote-first team at Mershal and help build the future workspace OS for freelancers." },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  const jobs = [
    {
      id: 1,
      title: "Senior Full Stack Engineer (React/SSR/Firestore)",
      team: "Product Engineering",
      location: "Remote (UTC-5 to UTC+5)",
      type: "Full-Time"
    },
    {
      id: 2,
      title: "Senior Product Designer (UX/Design Systems)",
      team: "Product & Design",
      location: "Remote (Global)",
      type: "Full-Time"
    },
    {
      id: 3,
      title: "Technical Support & Customer Success Lead",
      team: "Operations",
      location: "Remote (Global)",
      type: "Full-Time"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <Briefcase className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Work With Us</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Join the Mershal Team
        </h1>
        <p className="text-[#8B8FA8] text-base mb-12 max-w-xl">
          We are a fully remote, distributed crew of operators building tools that make independent business management effortless.
        </p>

        <div className="space-y-6 text-[#B3B5C6] leading-relaxed mb-16 max-w-3xl">
          <h2 className="text-2xl font-bold text-[#F0F0F5]">Our Culture & Values</h2>
          <p>
            At Mershal, we believe in high autonomy, asynchronous alignment, and obsessive quality. We don't care about hours logged; we care about polished deliverables, robust testing, and user satisfaction.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Remote-First:</strong> Work from anywhere that matches your lifestyle and timezone.</li>
            <li><strong>High Autonomy:</strong> No micro-management. You own your roadmap items end-to-end.</li>
            <li><strong>Continuous Learning:</strong> We provide budgets for books, classes, and setup upgrades.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#F0F0F5] mb-6">Open Roles</h3>
          {jobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-[#111318] border border-white/5 hover:border-white/10 rounded-xl p-5 md:flex items-center justify-between gap-6 transition-all duration-150 cursor-pointer group"
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-[var(--violet)] uppercase tracking-wider bg-[var(--violet)]/10 px-2 py-0.5 rounded">
                  {job.team}
                </span>
                <h4 className="text-[15px] font-bold text-[#F0F0F5] group-hover:text-white transition-colors">{job.title}</h4>
                <p className="text-[12.5px] text-[#8B8FA8]">{job.location} &middot; {job.type}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--violet)] group-hover:translate-x-1 transition-transform mt-4 md:mt-0">
                Apply Now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
