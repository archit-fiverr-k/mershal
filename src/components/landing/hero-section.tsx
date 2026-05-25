import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Star, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

function CountUp({ to, duration = 1500 }: { to: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = to;
    if (start === end) return;

    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [to, duration]);

  return <>{count}</>;
}

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
      className="relative mx-auto max-w-4xl mt-16"
      style={{ perspective: "1200px" }}
    >
      <div className="absolute -inset-12 bg-[#5E6AD2] opacity-15 blur-[80px] rounded-full pointer-events-none" />
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          border: "1px solid #2A2D3A",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
          transform: "rotateX(5deg) scale(0.95)",
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#0D0E12]" style={{ borderBottom: "1px solid #2A2D3A" }}>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFB347]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#00C896]/60" />
          <div className="ml-3 flex-1 h-5 rounded bg-[#16181F] max-w-[260px] flex items-center px-2">
            <span className="text-[10px] text-[#5C5F73]">app.mershal.in/dashboard</span>
          </div>
        </div>

        <div className="grid grid-cols-12" style={{ background: "linear-gradient(135deg, #111318, #1C1E27)" }}>
          {/* Sidebar */}
          <div className="col-span-3 p-3 space-y-1 min-h-[360px]" style={{ borderRight: "1px solid #2A2D3A", background: "#111318" }}>
            <div className="flex items-center gap-2 px-3 py-2 mb-3">
              <div className="h-5 w-5 rounded bg-[#5E6AD2] flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">S</span>
              </div>
              <span className="text-[11px] font-medium text-[#F0F0F5]">Mershal</span>
            </div>
            {[
              { name: "Dashboard", active: true },
              { name: "Projects", active: false },
              { name: "Clients", active: false },
              { name: "Invoices", active: false },
              { name: "AI Assistant", active: false },
            ].map((item) => (
              <div
                key={item.name}
                className={`px-3 py-2 rounded-lg text-[11px] ${
                  item.active
                    ? "bg-[#1C1E27] text-[#F0F0F5] font-medium border-l-2 border-l-[#5E6AD2]"
                    : "text-[#5C5F73] border-l-2 border-l-transparent"
                }`}
              >
                {item.name}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="col-span-9 p-5 space-y-4 bg-[#0D0E12]">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Active Projects", value: "12", change: "+3", positive: true },
                { label: "Revenue (May)", value: "$28.4k", change: "+18%", positive: true },
                { label: "Pending Tasks", value: "24", change: "-6", positive: true },
                { label: "Overdue Inv.", value: "3", change: "+1", positive: false },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-3" style={{ border: "1px solid #2A2D3A", background: "#16181F" }}>
                  <p className="text-[8px] uppercase tracking-wider text-[#5C5F73] mb-1">{stat.label}</p>
                  <p className="text-[16px] font-medium text-[#F0F0F5]">{stat.value}</p>
                  <p className={`text-[9px] ${stat.positive ? "text-[#00C896]" : "text-[#FF6B6B]"}`}>{stat.change}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3" style={{ border: "1px solid #2A2D3A", background: "#16181F" }}>
              <p className="text-[10px] text-[#5C5F73] mb-2">Recent projects</p>
              {[
                { name: "Brand identity refresh", client: "Northwind", progress: 35 },
                { name: "E-commerce redesign", client: "Lumen Labs", progress: 72 },
                { name: "Mobile app v2", client: "Holt & Co", progress: 18 },
              ].map((project) => (
                <div key={project.name} className="flex items-center gap-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#F0F0F5] truncate">{project.name}</p>
                    <p className="text-[9px] text-[#5C5F73]">{project.client}</p>
                  </div>
                  <div className="w-20 h-1 rounded-full bg-[#1C1E27] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#5E6AD2] to-[#7582EB]" style={{ width: `${project.progress}%` }} />
                  </div>
                  <p className="text-[9px] text-[#5C5F73] w-7 text-right">{project.progress}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  const { user } = useAuth();

  const AVATAR_COLORS = [
    "bg-[#5E6AD2] text-white",
    "bg-[#00C896] text-black",
    "bg-[#FFB347] text-black",
    "bg-[#FF6B6B] text-white",
    "bg-[#E2B93B] text-black",
  ];
  const AVATAR_INITIALS = ["A", "J", "M", "S", "K"];

  return (
    <section className="relative overflow-hidden min-h-screen flex flex-col justify-center" style={{ background: "#0D0E12" }}>
      {/* Styles for float animations & pulses */}
      <style>{`
        @keyframes float-blob-1 {
          0% { transform: translate(-50%, -10%) scale(1); }
          100% { transform: translate(-45%, -5%) scale(1.1); }
        }
        @keyframes float-blob-2 {
          0% { transform: translate(-40%, -20%) scale(1.1); }
          100% { transform: translate(-50%, -25%) scale(1); }
        }
        @keyframes float-cta {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        @keyframes chevron-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black, transparent)",
        }}
      />

      {/* Subtle animated gradient background blobs */}
      <div 
        className="absolute top-[10%] left-[25%] w-[380px] h-[380px] bg-[#5E6AD2] opacity-[0.06] blur-[120px] rounded-full pointer-events-none"
        style={{ animation: "float-blob-1 8s infinite alternate ease-in-out" }}
      />
      <div 
        className="absolute top-[15%] right-[25%] w-[380px] h-[380px] bg-[#00C896] opacity-[0.06] blur-[120px] rounded-full pointer-events-none"
        style={{ animation: "float-blob-2 8s infinite alternate ease-in-out" }}
      />

      {/* Violet glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#5E6AD2] opacity-[0.08] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-[800px] mx-auto px-6 pt-24 pb-8 text-center z-10">
        {/* Badge pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[20px] mb-8"
          style={{
            background: "rgba(94,106,210,0.12)",
            border: "1px solid rgba(94,106,210,0.3)",
          }}
        >
          <span className="text-[12px] text-[#5E6AD2] font-semibold tracking-[0.12em] uppercase">✦ AI-powered agency workspace</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-[36px] md:text-[58px] font-bold text-[#F0F0F5] mb-6 leading-[1.12]"
        >
          Stop juggling 6 tools.
          <br />
          Run your entire agency{" "}
          <span className="bg-gradient-to-r from-[#5E6AD2] to-[#00C896] bg-clip-text text-transparent">
            in one place.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-[17px] text-[#8B8FA8] max-w-[580px] mx-auto mb-10 leading-[1.75]"
        >
          Mershal replaces ClickUp, Notion, HubSpot, and your invoice spreadsheet — with one clean workspace that has AI built into everything. Set up in 10 minutes. Cancel anytime.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex flex-col items-center justify-center gap-3 mb-4"
        >
          <div className="flex flex-wrap justify-center gap-4 w-full sm:w-auto">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center w-full sm:w-auto h-[52px] px-9 bg-[#5E6AD2] text-white text-[16px] font-semibold rounded-[10px] hover:bg-[#4D59C2] hover:scale-[1.02] transition-all duration-150 shadow-[0_0_30px_rgba(94,106,210,0.4)]"
                style={{ animation: "float-cta 3s infinite ease-in-out" }}
              >
                Go to my dashboard →
              </Link>
            ) : (
              <Link
                to="/signup"
                className="inline-flex items-center justify-center w-full sm:w-auto h-[52px] px-9 bg-[#5E6AD2] text-white text-[16px] font-semibold rounded-[10px] hover:bg-[#4D59C2] hover:scale-[1.02] transition-all duration-150 shadow-[0_0_30px_rgba(94,106,210,0.4)]"
                style={{ animation: "float-cta 3s infinite ease-in-out" }}
              >
                Start free — no credit card needed →
              </Link>
            )}
            <button
              className="inline-flex items-center justify-center w-full sm:w-auto h-[52px] px-6 text-[15px] text-[#8B8FA8] font-medium rounded-[10px] hover:bg-[#1C1E27] transition-all duration-150 border border-white/5"
            >
              ▶ See how it works
            </button>
          </div>

          {/* Trust Row */}
          <div className="flex items-center justify-center gap-4 mt-2 text-[12px] text-[#5C5F73] font-medium">
            <span>🔒 No credit card</span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span>⚡ 10 min setup</span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span>✓ Cancel anytime</span>
          </div>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col items-center justify-center gap-2 mt-8"
        >
          {/* Avatar stack + Stars */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2.5">
              {AVATAR_INITIALS.map((init, idx) => (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10.5px] font-bold border-2 border-[#0D0E12] shadow-sm select-none ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
                >
                  {init}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="fill-[#FFB347] text-[#FFB347]" style={{ width: 18, height: 18 }} />
                ))}
              </div>
              <span className="text-[13px] font-bold text-[#F0F0F5] ml-1">
                500+ agencies already inside
              </span>
            </div>
          </div>

          {/* Animated counter line */}
          <p className="text-[13px] text-[#5C5F73]">
            Join <span className="text-[#00C896] font-bold"><CountUp to={500} />+</span> freelancers already saving <span className="text-[#5E6AD2] font-bold"><CountUp to={8} /> hours/week</span>
          </p>
        </motion.div>
      </div>

      {/* Dashboard mockup */}
      <div className="relative max-w-5xl mx-auto px-6 pb-20">
        <DashboardMockup />
      </div>

      {/* Scroll to explore */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none animate-pulse">
        <span className="text-[11px] text-[#5C5F73] uppercase tracking-wider font-semibold">Scroll to see features</span>
        <div style={{ animation: "chevron-bounce 2s infinite ease-in-out" }}>
          <ChevronDown className="h-4.5 w-4.5 text-[#5C5F73]" />
        </div>
      </div>
    </section>
  );
}
