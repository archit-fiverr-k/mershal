import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Mershal" },
      { name: "description", content: "Terms of Service for Mershal. Learn about our guidelines, accounts, pricing, and subscription rules." },
    ],
  }),
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D0E12] text-[#F0F0F5]">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 md:py-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center text-[var(--violet)] shadow-[0_0_15px_rgba(94,106,210,0.15)]">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-[var(--violet)] uppercase">Service Agreement</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Terms of Service</h1>
        <p className="text-[14px] text-[#8B8FA8] mb-12">Last Updated: May 25, 2026</p>

        <div className="space-y-10 prose prose-invert max-w-none text-[#B3B5C6] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Mershal (the "Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access or use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">2. Account Registration & Trial Period</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To access features of the Service, you must register for an account. You agree to provide accurate, current, and complete information.</li>
              <li>We offer a 15-day free trial for new users. To prevent trial abuse, we utilize device fingerprinting and IP verification. You are strictly limited to one trial account per device and two trial accounts per IP address on shared networks. Attempting to bypass these limits will result in account termination.</li>
              <li>You are responsible for safeguarding your account credentials and for all activities that occur under your account.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">3. Pricing, Subscriptions & Upgrades</h2>
            <p>
              Mershal offers Pro subscription plans. By upgrading, you agree to pay the fees associated with the chosen plan, which are billed on a recurring basis (monthly or annually). Payments are processed securely via Stripe or Razorpay. All fees are non-refundable except as required by law or as explicitly specified in our money-back guarantees.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">4. Client Portal & Collaboration</h2>
            <p>
              Mershal provides client portals for collaborating with your clients. You retain ownership of all files, drawings, timeline events, and messages posted to your client portals. You grant Mershal a license to store, transmit, and display this content solely to deliver the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">5. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable local, state, national, or international laws.</li>
              <li>Upload, transmit, or distribute any content that is unlawful, harmful, defamatory, or infringes on third-party intellectual property.</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
              <li>Interfere with or disrupt the security or integrity of the Service or its servers.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">6. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, without prior notice, if we believe you have violated these Terms of Service or engaged in fraudulent activity (such as trial abuse or credit card fraud).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">7. Limitation of Liability</h2>
            <p>
              Mershal is provided "as is" and "as available" without any warranties of any kind. In no event shall Mershal or its operators be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use or inability to use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#F0F0F5]">8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. We will notify you of any material changes by updating the "Last Updated" date at the top of this page. Your continued use of the Service following modifications constitutes your acceptance of the updated terms.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
