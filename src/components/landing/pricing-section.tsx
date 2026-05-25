import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    subtitle: "Get started, no credit card",
    features: [
      { text: "1 workspace", included: true },
      { text: "2 clients", included: true },
      { text: "3 projects", included: true },
      { text: "AI assistant", included: false },
      { text: "Invoicing", included: false },
      { text: "Client portal", included: false },
    ],
    cta: "Start for free",
    popular: false,
    ctaStyle: "ghost",
    orderClass: "order-2 md:order-none",
  },
  {
    name: "Pro",
    monthlyPrice: "$19",
    yearlyPrice: "$15",
    subtitle: "Less than one billable hour",
    features: [
      { text: "Unlimited clients", included: true },
      { text: "Unlimited projects", included: true },
      { text: "AI assistant", included: true },
      { text: "Invoicing + Stripe", included: true },
      { text: "Client portal", included: true },
      { text: "Analytics", included: true },
    ],
    cta: "Start free trial",
    popular: true,
    ctaStyle: "primary",
    orderClass: "order-1 md:order-none",
  },
];

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" style={{ background: "#0D0E12", padding: "120px 0" }}>
      <div className="max-w-5xl mx-auto px-6">
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
              background: "rgba(94,106,210,0.12)",
              color: "#5E6AD2",
              border: "1px solid rgba(94,106,210,0.3)",
            }}
          >
            PRICING
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[30px] md:text-[42px] font-medium text-[#F0F0F5] text-center mb-3"
          style={{ lineHeight: 1.25 }}
        >
          Simple pricing. No per-seat surprises.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[16px] text-[#8B8FA8] text-center max-w-lg mx-auto mb-10 leading-[1.75]"
        >
          Most agencies pay $120+/month across separate tools. Mershal replaces all of them.
        </motion.p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-[14px] font-semibold transition-colors duration-200 ${!yearly ? "text-[#F0F0F5]" : "text-[#5C5F73]"}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className="relative h-6.5 w-12 rounded-full transition-colors duration-200 p-0.5 border border-white/5"
            style={{ background: yearly ? "#5E6AD2" : "#2A2D3A" }}
          >
            <div
              className="h-5.5 w-5.5 rounded-full bg-white transition-transform duration-200 shadow"
              style={{ transform: yearly ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
          <span className={`text-[14px] font-semibold transition-colors duration-200 ${yearly ? "text-[#F0F0F5]" : "text-[#5C5F73]"}`}>Yearly</span>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#00C896]/15 text-[#00C896] border border-[#00C896]/20 uppercase tracking-[0.04em] ml-1">
            2 months free
          </span>
        </div>

        {/* Value Anchoring Comparison */}
        <div className="flex flex-col items-center mb-16 max-w-xl mx-auto text-center px-4">
          <p className="text-[11.5px] uppercase tracking-[0.12em] text-[#8B8FA8] mb-3.5 font-bold">vs what you pay today:</p>
          <div className="bg-[#111318] border border-white/5 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 shadow-inner w-full justify-center">
            <span className="text-[13px] text-[#8B8FA8] font-medium line-through decoration-[#FF6B6B]/80 decoration-2">
              ClickUp ($12) + Notion ($8) + Bonsai ($17) + Invoicing ($10) = $47/mo
            </span>
            <span className="hidden sm:inline text-[#5E6AD2] font-bold">➔</span>
            <span className="inline-flex items-center gap-1.5 bg-[#00C896]/10 border border-[#00C896]/20 px-3.5 py-1 rounded-full text-[12.5px] font-bold text-[#00C896]">
              Mershal $19/mo
            </span>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative rounded-2xl p-10 flex flex-col justify-between ${tier.orderClass}`}
              style={{
                background: tier.popular ? "rgba(94,106,210,0.06)" : "#16181F",
                border: tier.popular ? "2px solid #5E6AD2" : "1px solid #2A2D3A",
              }}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full bg-[#5E6AD2] text-white uppercase tracking-wider">
                  Most popular
                </span>
              )}

              <div>
                <p className="text-[17px] font-bold text-[#F0F0F5]">{tier.name}</p>
                <p className="text-[12.5px] text-[#8B8FA8] mt-1 mb-6 font-medium">{tier.subtitle}</p>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className={`text-[44px] font-black tracking-tight transition-all duration-300 ${tier.popular ? "text-[#5E6AD2]" : "text-[#F0F0F5]"}`}>
                    {yearly ? tier.yearlyPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-[14px] text-[#8B8FA8] font-semibold">/month</span>
                </div>

                <ul className="space-y-4 mb-10">
                  {tier.features.map((feat) => (
                    <li key={feat.text} className="flex items-center gap-3">
                      {feat.included ? (
                        <Check className="h-4.5 w-4.5 text-[#00C896] shrink-0" />
                      ) : (
                        <X className="h-4.5 w-4.5 text-[#3D4158] shrink-0" />
                      )}
                      <span className={`text-[14px] font-medium leading-relaxed ${feat.included ? "text-[#8B8FA8]" : "text-[#3D4158]"}`}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Link
                  to="/signup"
                  className={`flex items-center justify-center w-full h-11 rounded-lg text-[14.5px] font-bold transition-all duration-150 ${
                    tier.ctaStyle === "primary"
                      ? "bg-[#5E6AD2] text-white hover:bg-[#4D59C2] shadow-[0_0_16px_rgba(94,106,210,0.4)] hover:scale-[1.01]"
                      : "text-[#8B8FA8] hover:text-[#F0F0F5] hover:bg-[#1C1E27]"
                  }`}
                  style={tier.ctaStyle === "ghost" ? { border: "1px solid #2A2D3A" } : {}}
                >
                  {tier.cta}
                </Link>
                {tier.name === "Pro" && (
                  <p className="text-[12px] text-[#5C5F73] text-center mt-3 font-semibold">
                    🔥 19 founders joined this week
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 4-Item Guarantee Row */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-16 pt-10 border-t border-white/5 text-[13px] text-[#5C5F73] font-semibold">
          <span>✓ 14-day free trial</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:inline" />
          <span>✓ No credit card required</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:inline" />
          <span>✓ Cancel anytime</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:inline" />
          <span>✓ Data export anytime</span>
        </div>
      </div>
    </section>
  );
}
