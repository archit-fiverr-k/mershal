/**
 * Mershal Landing Page — Premium SaaS design
 *
 * Sections: Announcement Bar, Navbar, Hero, Logo Strip, Pain Points,
 * Features, Testimonials, Pricing, FAQ, Final CTA, Footer
 *
 * All animations via Framer Motion. Design matches $50/mo SaaS standard.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import { AnnouncementBar } from "@/components/landing/announcement-bar";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { LogoStrip } from "@/components/landing/logo-strip";
import { PainSection } from "@/components/landing/pain-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FAQSection } from "@/components/landing/faq-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mershal — Work less. Bill more." },
      {
        name: "description",
        content:
          "Mershal is an AI-powered operating system for freelancers and agencies. Manage clients, projects, invoices, and workflows — all in one place.",
      },
      { name: "keywords", content: "freelancer OS, agency management system, client onboarding portal, invoice software, AI workflow automation, agency CRM" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Mershal — Work less. Bill more." },
      {
        property: "og:description",
        content:
          "Mershal is an AI-powered operating system for freelancers and agencies. Manage clients, projects, invoices, and workflows — all in one place.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mershal.in" },
      { property: "og:image", content: "https://mershal.in/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Mershal — Work less. Bill more." },
      {
        name: "twitter:description",
        content:
          "Mershal is an AI-powered operating system for freelancers and agencies. Manage clients, projects, invoices, and workflows — all in one place.",
      },
      { name: "twitter:image", content: "https://mershal.in/og-image.png" },
      { name: "twitter:creator", content: "@mershalapp" },
    ],
    links: [
      { rel: "canonical", href: "https://mershal.in" },
    ],
  }),
  component: Landing,
});

function Landing() {
  // Exit Intent Popup State
  const [showExitIntent, setShowExitIntent] = useState(false);

  // Sticky Bottom Mobile CTA Bar State
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Live Chat Widget State
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatEmail, setChatEmail] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatSubmitted, setChatSubmitted] = useState(false);

  useEffect(() => {
    // 1. Exit Intent detection (desktop only - leaves top of viewport)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 5 && !sessionStorage.getItem("mershal-exit-intent-shown")) {
        setShowExitIntent(true);
        sessionStorage.setItem("mershal-exit-intent-shown", "true");
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);

    // 2. Scroll detection for Sticky Bottom Bar
    const handleScroll = () => {
      if (window.scrollY > 600) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatEmail || !chatMessage) return;
    
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: chatEmail, message: chatMessage }),
      });
      if (res.ok) {
        setChatSubmitted(true);
        setTimeout(() => {
          setChatEmail("");
          setChatMessage("");
          setChatSubmitted(false);
          setShowChatPanel(false);
        }, 2200);
      }
    } catch (err) {
      console.error("Error submitting lead:", err);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0D0E12", color: "#F0F0F5" }}>
      {/* Scroll-to-top tracking & layouts */}
      <AnnouncementBar />
      <Navbar />
      <HeroSection />
      <LogoStrip />
      <PainSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection openChat={() => setShowChatPanel(true)} />
      <FinalCTA />
      <Footer />

      {/* 1. EXIT INTENT POPUP */}
      {showExitIntent && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300">
          <div className="relative bg-[#111318] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <button 
              onClick={() => setShowExitIntent(false)}
              className="absolute top-4 right-4 text-[#5C5F73] hover:text-[#F0F0F5] transition-colors text-lg"
              aria-label="Close modal"
            >
              ✕
            </button>
            <span className="text-4xl mb-4 block" role="img" aria-label="wave">👋</span>
            <h3 className="text-[22px] font-bold text-[#F0F0F5] mb-2 tracking-tight">Wait — before you go</h3>
            <p className="text-[14px] text-[#8B8FA8] mb-6 leading-[1.7] max-w-xs mx-auto">
              Start free today. No credit card required. Setting up your workspace takes just 10 minutes.
            </p>
            <div className="space-y-3">
              <Link
                to="/signup"
                onClick={() => setShowExitIntent(false)}
                className="flex items-center justify-center h-12 w-full bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-[14.5px] font-bold rounded-lg shadow-lg hover:shadow-[0_0_16px_rgba(94,106,210,0.4)] transition-all"
              >
                Start my free account →
              </Link>
              <button
                onClick={() => setShowExitIntent(false)}
                className="text-[12px] text-[#5C5F73] hover:text-[#FF6B6B] transition-colors underline block mx-auto font-medium"
              >
                No thanks, I'll keep using 6 tools
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. STICKY BOTTOM CTA BAR (Mobile Only) */}
      {showStickyBar && (
        <div 
          className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#111318] border-t border-[#2A2D3A] px-5 flex items-center justify-between z-[999] shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-all duration-300 transform translate-y-0"
        >
          <div className="flex flex-col items-start">
            <span className="text-[13px] font-bold text-[#F0F0F5]">Start free today</span>
            <span className="text-[10px] text-[#5C5F73] font-semibold">No credit card needed</span>
          </div>
          <Link
            to="/signup"
            className="h-10 px-4 bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-[12.5px] font-bold rounded-lg flex items-center justify-center transition-all shadow-[0_0_12px_rgba(94,106,210,0.3)]"
          >
            Get started →
          </Link>
        </div>
      )}

      {/* 3. LIVE CHAT WIDGET PLACEHOLDER */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end">
        {/* Chat Panel */}
        {showChatPanel && (
          <div className="mb-4 w-[320px] bg-[#111318] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
            <div className="bg-[#5E6AD2] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">👋</span>
                <div>
                  <h4 className="text-[13px] font-bold">Hi! Questions about Mershal?</h4>
                  <p className="text-[10px] text-white/80">We typically reply in under 2 hours.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowChatPanel(false)}
                className="text-white/80 hover:text-white text-[12px] font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1">
              {chatSubmitted ? (
                <div className="py-8 text-center space-y-2">
                  <span className="text-2xl">⚡</span>
                  <p className="text-[13px] font-bold text-[#F0F0F5]">Message sent!</p>
                  <p className="text-[11px] text-[#8B8FA8]">We will email you at the address provided.</p>
                </div>
              ) : (
                <form onSubmit={handleSendChatMessage} className="space-y-3">
                  <div>
                    <label className="text-[9.5px] uppercase tracking-wider text-[#8B8FA8] font-bold block mb-1">Your Email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@agency.com"
                      value={chatEmail}
                      onChange={(e) => setChatEmail(e.target.value)}
                      className="w-full bg-[#0D0E12] border border-white/5 rounded-lg px-3 py-1.5 text-[12.5px] text-[#F0F0F5] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] uppercase tracking-wider text-[#8B8FA8] font-bold block mb-1">Your Message</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Ask us anything..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="w-full bg-[#0D0E12] border border-white/5 rounded-lg px-3 py-1.5 text-[12.5px] text-[#F0F0F5] focus:outline-none focus:border-[#5E6AD2] transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-[12.5px] font-bold py-2 rounded-lg transition-colors mt-2"
                  >
                    Send message
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Chat Button */}
        <button
          onClick={() => setShowChatPanel(!showChatPanel)}
          className="w-14 h-14 bg-[#5E6AD2] hover:scale-110 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(94,106,210,0.5)] hover:shadow-[0_0_30px_rgba(94,106,210,0.8)] transition-all duration-300"
          style={{ transform: showChatPanel ? "rotate(90deg)" : "rotate(0)" }}
          aria-label="Open support chat panel"
        >
          <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
