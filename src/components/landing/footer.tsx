import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "Features", to: "/#features", isHash: true },
  { label: "Pricing", to: "/#pricing", isHash: true },
  { label: "Changelog", to: "/changelog" },
  { label: "Roadmap", to: "/roadmap" },
  { label: "Blog", to: "/blog" },
];
const COMPANY_LINKS = [
  { label: "About", to: "/about" },
  { label: "Careers", to: "/careers" },
  { label: "Press", to: "/about" },
  { label: "Contact", to: "/contact" },
];
const LEGAL_LINKS = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Cookie Policy", to: "/cookie" },
  { label: "Security", to: "/security" },
];

function SocialIcon({ type }: { type: "twitter" | "linkedin" | "youtube" }) {
  const paths: Record<string, string> = {
    twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z",
  };

  return (
    <a
      href="#"
      className="h-8 w-8 rounded-lg flex items-center justify-center text-[#5C5F73] hover:text-[#8B8FA8] hover:bg-[#1C1E27] transition-all duration-150"
    >
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d={paths[type]} />
      </svg>
    </a>
  );
}

interface FooterLink {
  label: string;
  to: string;
  isHash?: boolean;
}

function RenderFooterLink({ link }: { link: FooterLink }) {
  if (link.isHash) {
    return (
      <a href={link.to} className="text-[13px] text-[#5C5F73] hover:text-[#8B8FA8] transition-colors duration-150">
        {link.label}
      </a>
    );
  }
  return (
    <Link to={link.to} className="text-[13px] text-[#5C5F73] hover:text-[#8B8FA8] transition-colors duration-150">
      {link.label}
    </Link>
  );
}

export function Footer() {
  return (
    <footer style={{ background: "#0D0E12", borderTop: "1px solid #2A2D3A" }}>
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1 - Logo */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <img src="/favicon.png" alt="Mershal Logo" className="h-6 w-6 rounded-md" />
              <span className="text-[15px] font-semibold text-[#F0F0F5]">Mershal</span>
            </Link>
            <p className="text-[13px] text-[#5C5F73] leading-relaxed mb-4 max-w-[220px]">
              The AI-powered OS for freelancers and agencies.
            </p>
            <div className="flex gap-1">
              <SocialIcon type="twitter" />
              <SocialIcon type="linkedin" />
              <SocialIcon type="youtube" />
            </div>
          </div>

          {/* Column 2 - Product */}
          <div>
            <p className="text-[12px] font-semibold text-[#8B8FA8] uppercase tracking-wider mb-4">Product</p>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <RenderFooterLink link={link} />
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div>
            <p className="text-[12px] font-semibold text-[#8B8FA8] uppercase tracking-wider mb-4">Company</p>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <RenderFooterLink link={link} />
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Legal */}
          <div>
            <p className="text-[12px] font-semibold text-[#8B8FA8] uppercase tracking-wider mb-4">Legal</p>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <RenderFooterLink link={link} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6" style={{ borderTop: "1px solid #2A2D3A" }}>
          <p className="text-[12px] text-[#5C5F73]">© 2025 Mershal. All rights reserved.</p>
          <p className="text-[12px] text-[#5C5F73]">Made with ♥ for freelancers everywhere</p>
        </div>
      </div>
    </footer>
  );
}
