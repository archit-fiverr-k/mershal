import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

const TICKER_ITEMS = [
  "👋 Marcus from Lagos just signed up",
  "⚡ Sarah from London just sent her first invoice",
  "🚀 David from Austin onboarded 3 new clients",
  "🔥 Liam from Berlin saved 10 hours this week",
  "✨ Elena from Madrid launched her client portal",
];

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, minutes: 33, seconds: 22 });

  useEffect(() => {
    // Set target date to 2 days 14 hours from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    targetDate.setHours(targetDate.getHours() + 14);

    const interval = setInterval(() => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference <= 0) {
        clearInterval(interval);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="flex items-center justify-center gap-1.5 mt-2 mb-8">
      <span className="text-[12px] text-[#8B8FA8] mr-1.5 font-bold uppercase tracking-wider">Launch pricing ends in:</span>
      <div className="flex items-center gap-1">
        <span className="font-bold text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 rounded border border-[#FFB347]/20 text-[13px] font-mono">
          {formatNumber(timeLeft.days)}d
        </span>
        <span className="text-[#FFB347] font-bold">:</span>
        <span className="font-bold text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 rounded border border-[#FFB347]/20 text-[13px] font-mono">
          {formatNumber(timeLeft.hours)}h
        </span>
        <span className="text-[#FFB347] font-bold">:</span>
        <span className="font-bold text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 rounded border border-[#FFB347]/20 text-[13px] font-mono">
          {formatNumber(timeLeft.minutes)}m
        </span>
        <span className="text-[#FFB347] font-bold">:</span>
        <span className="font-bold text-[#FFB347] bg-[#FFB347]/10 px-2 py-0.5 rounded border border-[#FFB347]/20 text-[13px] font-mono">
          {formatNumber(timeLeft.seconds)}s
        </span>
      </div>
    </div>
  );
}

export function FinalCTA() {
  const { user } = useAuth();
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKER_ITEMS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section style={{ background: "#111318", padding: "120px 0" }}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        {/* Real-time social proof ticker */}
        <div className="flex justify-center mb-6 h-9 overflow-hidden">
          <div className="bg-[#0D0E12] border border-white/5 px-4.5 py-1 rounded-[20px] text-[13px] text-[#8B8FA8] font-bold inline-flex items-center min-w-[320px] justify-center shadow-inner relative">
            <AnimatePresence mode="wait">
              <motion.span
                key={tickerIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="absolute"
              >
                {TICKER_ITEMS[tickerIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[32px] md:text-[48px] font-medium text-[#F0F0F5] max-w-[680px] mx-auto mb-5"
          style={{ lineHeight: 1.25 }}
        >
          Every week without Mershal is a week of admin you didn't have to do.
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-[15.5px] text-[#8B8FA8] mb-8 max-w-lg mx-auto leading-[1.75]"
        >
          Free forever on the basic plan. Pro is $19/month, cancel any time. Setup takes 10 minutes. Your first project is ready before your next client call.
        </motion.p>

        {/* Countdown Timer */}
        <CountdownTimer />

        {/* Button block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center h-[52px] px-9 bg-[#5E6AD2] text-white text-[16px] font-bold rounded-[10px] hover:bg-[#4D59C2] hover:scale-[1.02] transition-all duration-150 shadow-[0_0_24px_rgba(94,106,210,0.4)]"
            >
              Go to my dashboard →
            </Link>
          ) : (
            <Link
              to="/signup"
              className="inline-flex items-center justify-center h-[52px] px-9 bg-[#5E6AD2] text-white text-[16px] font-bold rounded-[10px] hover:bg-[#4D59C2] hover:scale-[1.02] transition-all duration-150 shadow-[0_0_24px_rgba(94,106,210,0.4)]"
            >
              Start free — no credit card needed →
            </Link>
          )}
        </motion.div>

        {/* Big Trust Icons Grid */}
        <div className="flex justify-center gap-4 mt-14 flex-wrap">
          {[
            { icon: "🔒", title: "No credit card", desc: "Start immediately" },
            { icon: "⚡", title: "10 min setup", desc: "No learning curve" },
            { icon: "✓", title: "Cancel anytime", desc: "Zero lock-in" }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="w-[140px] bg-[#0D0E12] border border-white/5 rounded-xl p-4 flex flex-col items-center text-center shadow-inner hover:border-white/10 hover:scale-[1.02] transition-all duration-300"
            >
              <span className="text-2xl mb-1.5">{item.icon}</span>
              <span className="text-[12.5px] font-bold text-[#F0F0F5]">{item.title}</span>
              <span className="text-[10px] text-[#5C5F73] font-semibold mt-0.5">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
