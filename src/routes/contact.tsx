import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { MessageSquare, Mail, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Mershal" },
      { name: "description", content: "Get in touch with the Mershal team for support, feature requests, or enterprise inquiries." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    setLoading(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      if (res.ok) {
        setSubmitted(true);
        setEmail("");
        setMessage("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="grid md:grid-cols-5 gap-12">
          {/* Info Side */}
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#F0F0F5]">
                Get in touch
              </h1>
              <p className="text-[#8B8FA8] leading-relaxed text-[14.5px]">
                Have questions about our Pro plans, feature roadmap, or custom portal designs? Send us a message and we'll reply as soon as possible.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 text-[14px]">
                <Mail className="h-4 w-4 text-[var(--violet)]" />
                <a href="mailto:hello@mershal.in" className="hover:underline text-[#B3B5C6]">hello@mershal.in</a>
              </div>
              <div className="flex items-center gap-3 text-[14px]">
                <MapPin className="h-4 w-4 text-[var(--violet)]" />
                <span className="text-[#B3B5C6]">Mershal HQ &middot; remote-first</span>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="md:col-span-3">
            <div className="bg-[#111318] border border-white/5 rounded-2xl p-8 shadow-card relative overflow-hidden">
              {submitted ? (
                <div className="py-16 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-[var(--emerald)]/10 border border-[var(--emerald)]/20 text-[var(--emerald)] flex items-center justify-center mx-auto text-xl animate-pulse">
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-[#F0F0F5]">Message Received</h3>
                  <p className="text-[#8B8FA8] text-[13.5px] max-w-xs mx-auto">
                    Thank you! We have logged your request and will reach out to you via email shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-[12px] text-[var(--violet)] hover:underline font-semibold"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-lg font-bold text-[#F0F0F5]">Send a message</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@agency.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0D0E12] border border-white/8 rounded-lg px-3.5 py-2.5 text-[13.5px] text-[#F0F0F5] focus:outline-none focus:border-[var(--violet)] transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#8B8FA8] uppercase tracking-wider">Your Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell us about your requirements, inquiries, or support requests..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-[#0D0E12] border border-white/8 rounded-lg px-3.5 py-2.5 text-[13.5px] text-[#F0F0F5] focus:outline-none focus:border-[var(--violet)] transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#5E6AD2] hover:bg-[#4D59C2] text-white text-[14px] font-semibold h-11 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send Message"}
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
