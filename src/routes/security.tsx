import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security Policy — Mershal" },
      { name: "description", content: "Security Policy for Mershal. Learn how we safeguard your databases, API keys, and client communication." },
    ],
  }),
  component: SecurityPolicy,
});

function SecurityPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Trust & Security</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Security Policy</h1>
        <p className="text-[14px] text-[#8B8FA8] mb-12">Last Updated: May 25, 2026</p>

        <div className="space-y-10 prose prose-invert max-w-none text-[#B3B5C6] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">1. Data Security & Storage</h2>
            <p>
              Mershal takes the security of your data seriously. All user databases, settings profile, projects, and clients timelines are stored securely in Google Cloud Firestore. Data is encrypted in transit using Transport Layer Security (TLS) and at rest using AES-256 encryption.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">2. Authentication & 2FA</h2>
            <p>
              We provide robust authentication structures. Beyond standard email/password setups, Mershal supports multi-factor authentication (MFA/2FA) utilizing Time-based One-Time Passwords (TOTP). This ensures that even if your password is compromised, your workspace and client communication records remain shielded.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">3. Payment Processing & PCI Compliance</h2>
            <p>
              Mershal does not store card details on its servers. All payments, subscription upgrades, and transaction checks are handled directly through PCI-DSS compliant providers — Stripe and Razorpay. Communication between our server, client portals, and payment providers is fully encrypted.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">4. Client Portal Tokens</h2>
            <p>
              Each client portal is secured using cryptographically generated unique access tokens tied to the corresponding client document. This allows your clients to review projects, chat, edit whiteboards, and submit payments without needing to register a full user account. Security settings can be updated by the freelancer to invalidate or regenerate tokens at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">5. Vulnerability Reporting</h2>
            <p>
              If you identify a security issue on our platform, please report it to us immediately at <a href="mailto:security@mershal.in" className="text-[var(--violet)] hover:underline font-semibold">security@mershal.in</a>. We review all submissions promptly and work to resolve vulnerabilities in a timely manner.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
