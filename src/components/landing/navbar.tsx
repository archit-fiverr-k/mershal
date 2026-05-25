import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/firebase/auth";
import { toast } from "sonner";

const NAV_LINKS = [
  { label: "Features", href: "/#features", isHash: true },
  { label: "Pricing", href: "/#pricing", isHash: true },
  { label: "Changelog", href: "/changelog" },
  { label: "Blog", href: "/blog" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Couldn't sign out. Try again.");
    }
  }

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="sticky top-0 z-50"
      style={{
        background: "rgba(13,14,18,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #2A2D3A",
      }}
    >
      <div className="max-w-6xl mx-auto h-16 flex items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src="/logo.png" alt="Mershal" className="h-[44px] w-auto object-contain logo-slow-glow" />
        </Link>

        {/* Center links - desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            link.isHash ? (
              <a
                key={link.label}
                href={link.href}
                className="text-[14px] text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors duration-150"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className="text-[14px] text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors duration-150"
              >
                {link.label}
              </Link>
            )
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center h-9 px-4 bg-[#5E6AD2] text-white text-[14px] font-medium rounded-lg hover:bg-[#4D59C2] transition-all duration-150 hover:scale-[1.02]"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center h-9 px-4 border border-white/10 hover:border-white/20 text-[#8B8FA8] hover:text-[#F0F0F5] text-[14px] font-medium rounded-lg cursor-pointer transition-all duration-150"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex text-[14px] text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors duration-150"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="hidden sm:inline-flex items-center justify-center h-9 px-4 bg-[#5E6AD2] text-white text-[14px] font-medium rounded-lg hover:bg-[#4D59C2] transition-all duration-150 hover:scale-[1.02]"
              >
                Start free
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[#8B8FA8] hover:text-[#F0F0F5]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-[#2A2D3A]"
            style={{ background: "rgba(13,14,18,0.95)" }}
          >
            <div className="px-6 py-4 space-y-3">
              {NAV_LINKS.map((link) => (
                link.isHash ? (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-[15px] text-[#8B8FA8] hover:text-[#F0F0F5] py-2"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-[15px] text-[#8B8FA8] hover:text-[#F0F0F5] py-2"
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <div className="pt-3 border-t border-[#2A2D3A] flex flex-col gap-2">
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center justify-center h-10 bg-[#5E6AD2] text-white text-[14px] font-medium rounded-lg"
                    >
                      Go to Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        handleSignOut();
                      }}
                      className="inline-flex items-center justify-center h-10 border border-white/10 hover:border-white/20 text-[#8B8FA8] hover:text-[#F0F0F5] text-[14px] font-medium rounded-lg cursor-pointer transition-all duration-150"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="text-[15px] text-[#8B8FA8] py-2">
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      className="inline-flex items-center justify-center h-10 bg-[#5E6AD2] text-white text-[14px] font-medium rounded-lg"
                    >
                      Start free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
