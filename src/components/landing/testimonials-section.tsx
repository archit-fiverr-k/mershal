import { motion } from "framer-motion";
import { Star, CheckCircle } from "lucide-react";

const TESTIMONIALS = [
  {
    borderColor: "#5E6AD2",
    avatarBg: "#5E6AD2",
    initials: "JR",
    name: "James R.",
    role: "Freelance web developer, 8 clients",
    quote: "I cancelled ClickUp, Bonsai, and my invoice tool. Mershal does everything for less than what I paid for Bonsai alone. The AI project generator saves me 2 hours a week.",
    plan: "Pro Plan",
    memberSince: "Member for 3 months",
  },
  {
    borderColor: "#00C896",
    avatarBg: "#00C896",
    initials: "SP",
    name: "Sarah P.",
    role: "Brand designer, 12 active clients",
    quote: "My clients comment on how professional the portal looks. They think I have a team of 10. It's just me and Mershal.",
    plan: "Pro Plan",
    memberSince: "Member for 5 months",
  },
  {
    borderColor: "#FFB347",
    avatarBg: "#FFB347",
    initials: "MT",
    name: "Marcus T.",
    role: "SEO agency owner, 6-person team",
    quote: "Setup took 8 minutes. I had my first invoice sent within the hour. I've tried every tool out there — this is the first one that didn't need a YouTube tutorial to use.",
    plan: "Pro Plan",
    memberSince: "Member for 2 months",
  },
];

export function TestimonialsSection() {
  return (
    <section style={{ background: "#111318", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">
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
            WHAT PEOPLE SAY
          </span>
        </motion.div>

        {/* Section Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[30px] md:text-[42px] font-medium text-[#F0F0F5] text-center mb-14"
          style={{ lineHeight: 1.25 }}
        >
          Agencies like yours switched — here's what happened.
        </motion.h2>

        {/* Stat Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16 py-8 border-y border-white/5 bg-[#0D0E12]/40 rounded-2xl px-6">
          {[
            { value: "500+", label: "Agencies using Mershal", color: "text-[#5E6AD2]" },
            { value: "8 hrs", label: "Saved per week on average", color: "text-[#00C896]" },
            { value: "$120", label: "Average monthly saving", color: "text-[#FFB347]" },
          ].map((stat, idx) => (
            <div key={idx} className="text-center flex flex-col items-center justify-center">
              <span className={`text-[36px] font-black ${stat.color}`}>{stat.value}</span>
              <span className="text-[13px] font-medium text-[#8B8FA8] mt-1">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Testimonial Cards Layout - horizontal scroll on mobile, grid on desktop */}
        <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-6 pb-6 md:pb-0 scrollbar-none">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="p-10 min-w-[280px] sm:min-w-[340px] md:min-w-0 snap-center flex flex-col justify-between bg-[#16181F]"
              style={{
                border: "1px solid #2A2D3A",
                borderLeft: `3px solid ${t.borderColor}`,
                borderRadius: "0 12px 12px 0",
              }}
            >
              <div>
                {/* Stars + verified info */}
                <div className="flex items-center justify-between gap-2 mb-6">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="fill-[#FFB347] text-[#FFB347]" style={{ width: 14, height: 14 }} />
                    ))}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] text-[#00C896] bg-[#00C896]/10 px-2 py-0.5 rounded-full font-bold border border-[#00C896]/20">
                    <CheckCircle style={{ width: 10, height: 10 }} />
                    <span>Verified</span>
                  </div>
                </div>

                {/* Quote */}
                <p className="text-[14px] text-[#8B8FA8] leading-[1.75] mb-6 font-medium italic">"{t.quote}"</p>
              </div>

              {/* Avatar & info */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-[12.5px] text-white font-bold select-none"
                  style={{ background: t.avatarBg }}
                >
                  {t.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#F0F0F5] truncate">{t.name}</p>
                  <p className="text-[11px] text-[#5C5F73] font-medium truncate mb-1">{t.role}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9.5px] font-bold text-[#5E6AD2] bg-[#5E6AD2]/10 px-1.5 py-0.5 rounded border border-[#5E6AD2]/20 uppercase">
                      {t.plan}
                    </span>
                    <span className="text-[9.5px] text-[#8B8FA8] font-semibold">{t.memberSince}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
