import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Mershal" },
      { name: "description", content: "Privacy Policy for Mershal. Learn how we collect, use, and protect your personal data." },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Legal Agreement</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-[14px] text-[#8B8FA8] mb-12">Last Updated: May 25, 2026</p>

        <div className="space-y-10 prose prose-invert max-w-none text-[#B3B5C6] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">1. Introduction</h2>
            <p>
              Welcome to Mershal (accessible via mershal.in). We respect your privacy and are committed to protecting your personal data. This Privacy Policy describes how we collect, use, process, and disclose your information, including personal information, in conjunction with your access to and use of our platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">2. Information We Collect</h2>
            <p>We collect information you provide directly to us when creating an account, editing your profile, or setting up client portals:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, password, workspace name, country, and timezone.</li>
              <li><strong>Billing & Payment Information:</strong> Payment card details (processed securely via Stripe/Razorpay) and billing history.</li>
              <li><strong>Client Data:</strong> Names, emails, and project descriptions related to clients you manage.</li>
              <li><strong>Technical Data:</strong> Browser fingerprint hashes, IP addresses, browser types, and operating systems collected for security and fraud prevention (trial abuse prevention).</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">3. How We Use Your Information</h2>
            <p>We use the collected data for various purposes, including to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the Mershal platform.</li>
              <li>Verify sign-ups to prevent trial license abuse (checking IP limits and device fingerprints).</li>
              <li>Send transaction emails, welcome emails, invoices, and notification briefs.</li>
              <li>Facilitate client portal collaboration and real-time whiteboard drawing.</li>
              <li>Analyze usage trends and improve user experience.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">4. Data Retention & Security</h2>
            <p>
              Mershal operates on secure Firestore databases. We implement standard physical, technical, and administrative security measures designed to safeguard your information from unauthorized access, loss, or misuse.
            </p>
            <p>
              We retain account data for as long as your account is active or as needed to provide our services. You can delete your account or client records at any time via the settings dashboard.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">5. Third-Party Integrations</h2>
            <p>Mershal integrates with third-party service providers to deliver key product features:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe / Razorpay:</strong> Payment processing and billing dashboard infrastructure.</li>
              <li><strong>Resend:</strong> Transactional emails and automatic client welcome notifications.</li>
              <li><strong>OpenAI:</strong> AI Assistant features and inline command generation.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">6. Your Rights & Choices</h2>
            <p>
              Depending on your location, you may have rights under the GDPR, CCPA, or other local regulations regarding your data. This includes the right to access, correct, delete, or limit the processing of your personal information. To exercise these rights, please contact us at <a href="mailto:hello@mershal.in" className="text-[var(--violet)] hover:underline font-semibold">hello@mershal.in</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
