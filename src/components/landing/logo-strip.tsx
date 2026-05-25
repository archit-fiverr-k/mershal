import { motion } from "framer-motion";

const COMPANIES = ["Pixel Studio", "Nova Agency", "Brightwork", "Moonlight Co", "Apex Digital"];

export function LogoStrip() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "#111318",
        borderTop: "1px solid #2A2D3A",
        borderBottom: "1px solid #2A2D3A",
        height: "72px",
      }}
    >
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center gap-8 md:gap-12">
        <span className="text-[13px] text-[#5C5F73] whitespace-nowrap shrink-0">Trusted by teams at</span>
        <div className="hidden md:flex items-center gap-10 flex-1 justify-around">
          {COMPANIES.map((company, i) => (
            <motion.span
              key={company}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              viewport={{ once: true }}
              className="text-[15px] font-medium text-[#3D4158] whitespace-nowrap"
            >
              {company}
            </motion.span>
          ))}
        </div>
        {/* Mobile: scrolling marquee */}
        <div className="md:hidden flex-1 overflow-hidden">
          <div className="flex animate-[marquee_20s_linear_infinite] gap-10">
            {[...COMPANIES, ...COMPANIES].map((company, i) => (
              <span key={`${company}-${i}`} className="text-[14px] font-medium text-[#3D4158] whitespace-nowrap">
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
