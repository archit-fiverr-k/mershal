import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { BookOpen, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Mershal" },
      { name: "description", content: "Actionable guides, templates, and strategies to scale your freelance business and agency operations." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const posts = [
    {
      id: 1,
      category: "Operations",
      title: "How to Build a Seamless Client Onboarding Experience",
      excerpt: "First impressions are everything in client services. Learn how to automate client portals, welcome notifications, and agreements to reduce churn by 40%.",
      date: "May 22, 2026",
      readTime: "6 min read",
      gradient: "from-[#5E6AD2]/20 to-transparent"
    },
    {
      id: 2,
      category: "Finance",
      title: "Strategies for Handling Late Payments and Overdue Invoices",
      excerpt: "Chasing payments is the worst part of freelancing. Here is our step-by-step checklist of automated email reminder templates that double payment success rates.",
      date: "May 18, 2026",
      readTime: "5 min read",
      gradient: "from-[#00C896]/20 to-transparent"
    },
    {
      id: 3,
      category: "AI Automation",
      title: "Leveraging LLMs to Generate Proposals and Scopes of Work",
      excerpt: "Writing proposals takes hours. Learn how to integrate structured AI generation queries to draft agency-grade project briefs in under 60 seconds.",
      date: "May 12, 2026",
      readTime: "8 min read",
      gradient: "from-[#F59E0B]/20 to-transparent"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Resources & Guides</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          The Mershal Blog
        </h1>
        <p className="text-[#8B8FA8] text-base mb-16 max-w-xl">
          Actionable resources, operation templates, and growth strategies to help you run a highly-profitable independent agency.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article 
              key={post.id} 
              className="bg-[#111318] border border-white/5 hover:border-white/10 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 group shadow-sm relative overflow-hidden"
            >
              {/* Subtle ambient light block */}
              <div className={`absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl ${post.gradient} blur-xl pointer-events-none`} />

              <div className="space-y-4 relative z-10">
                <span className="text-[11px] font-bold text-[var(--violet)] uppercase tracking-wider bg-[var(--violet)]/10 px-2.5 py-1 rounded-md">
                  {post.category}
                </span>
                
                <h3 className="text-lg font-bold text-[#F0F0F5] leading-snug group-hover:text-white transition-colors">
                  {post.title}
                </h3>
                
                <p className="text-[13px] text-[#8B8FA8] leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5 relative z-10">
                <div className="text-[11.5px] text-[#5C5F73] font-medium">
                  {post.date} &middot; {post.readTime}
                </div>
                <span className="text-[var(--violet)] group-hover:translate-x-1.5 transition-transform duration-200 flex items-center gap-1 text-[13px] font-bold cursor-pointer">
                  Read <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
