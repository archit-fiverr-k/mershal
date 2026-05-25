import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="relative flex items-center justify-center h-11 px-4 z-50"
          style={{
            background: "rgba(94,106,210,0.22)",
            borderBottom: "1px solid rgba(94,106,210,0.4)",
          }}
        >
          <p className="text-[12.5px] text-[#F0F0F5] flex items-center justify-center flex-wrap gap-x-1.5 gap-y-0.5 pr-6 text-center leading-none">
            <span>⚡ Early access — first 50 users get Pro free for 3 months.</span>
            <span className="inline-flex items-center gap-1.5 bg-[#0D0E12]/60 px-2.5 py-0.5 rounded-full border border-white/5">
              <span 
                className="h-1.5 w-1.5 rounded-full bg-[#FF6B6B]" 
                style={{ 
                  animation: "pulse-dot 1.5s infinite ease-in-out",
                  willChange: "transform, opacity" 
                }} 
              />
              <span className="font-bold text-[#5E6AD2] text-[11px]">31 spots left</span>
            </span>
          </p>
          <button
            onClick={() => setVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors duration-150"
            aria-label="Close announcement"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
