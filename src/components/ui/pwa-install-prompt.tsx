/**
 * PWAInstallPrompt — Shows a subtle banner when the app is installable
 *
 * Only renders when:
 * 1. The browser fires `beforeinstallprompt` (Chrome/Edge)
 * 2. Not dismissed in the last 30 days (localStorage)
 * 3. Not already installed (display-mode: standalone)
 */
import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

const DISMISSED_KEY = "mershal_pwa_dismissed_at";
const DISMISS_DAYS = 30;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Don't show if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const msSinceDismiss = Date.now() - parseInt(dismissedAt, 10);
      if (msSinceDismiss < DISMISS_DAYS * 86400 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[340px] z-50"
      style={{
        background: "rgba(17,19,24,0.95)",
        border: "1px solid rgba(94,106,210,0.25)",
        borderRadius: "12px",
        padding: "12px 14px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0"
          style={{ background: "rgba(94,106,210,0.15)" }}
        >
          <Download className="h-4 w-4 text-[#8F99E8]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#F0F0F5]">Install Mershal</p>
          <p className="text-[11px] text-[#8B8FA8] mt-0.5 leading-relaxed">
            Add to your home screen for quick access — works offline too.
          </p>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-[6px] text-[11px] font-medium text-white cursor-pointer"
              style={{ background: "#5E6AD2" }}
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-[6px] text-[11px] font-medium text-[#8B8FA8] hover:text-[#F0F0F5] cursor-pointer"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#5C5F73] hover:text-[#F0F0F5] transition-colors cursor-pointer shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
