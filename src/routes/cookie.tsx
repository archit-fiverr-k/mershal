import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/cookie")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Mershal" },
      { name: "description", content: "Cookie Policy for Mershal. Learn how and why we use cookies on our platform." },
    ],
  }),
  component: CookiePolicy,
});

function CookiePolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <Eye className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Cookie Statement</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Cookie Policy</h1>
        <p className="text-[14px] text-[#8B8FA8] mb-12">Last Updated: May 25, 2026</p>

        <div className="space-y-10 prose prose-invert max-w-none text-[#B3B5C6] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your computer or mobile device when you visit websites. They are widely used to make websites work or improve user experience, as well as to provide reporting information to site owners.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">2. How We Use Cookies</h2>
            <p>We use cookies and similar technologies (like localStorage) on Mershal for several critical reasons:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential (Strictly Necessary):</strong> These are required to keep you signed in, manage secure sessions, prevent CSRF vulnerabilities, and process payments. Without these cookies, our platform cannot function correctly.</li>
              <li><strong>Preferences:</strong> Used to store settings like your selected theme mode (light or dark layout settings).</li>
              <li><strong>Security & Anti-Abuse:</strong> LocalStorage keys are used to store device credentials to prevent trial plan abuse and keep client portal routes secure.</li>
              <li><strong>Analytics:</strong> Help us analyze how users navigate our site so that we can optimize workflows and fix bugs.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">3. Managing Your Choices</h2>
            <p>
              Most web browsers allow you to control cookies through their settings preferences. However, if you disable essential cookies, please note that certain components of our dashboard, authentication, or Stripe payment integration might fail to function.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">4. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies or details within this policy, please reach out to us at <a href="mailto:hello@mershal.in" className="text-[var(--violet)] hover:underline font-semibold">hello@mershal.in</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
