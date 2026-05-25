import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { Upload, Image as ImageIcon } from "lucide-react";
import type { UserProfile } from "@/lib/types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Complete your profile — Mershal" },
      { name: "description", content: "Set up your workspace and customize your brand onboarding portal on Mershal." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Onboarding,
});

// Country list with flag + name + primary timezone
const COUNTRIES: { code: string; flag: string; name: string; timezone: string }[] = [
  { code: "IN", flag: "🇮🇳", name: "India", timezone: "Asia/Kolkata" },
  { code: "US", flag: "🇺🇸", name: "United States", timezone: "America/New_York" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", timezone: "Europe/London" },
  { code: "CA", flag: "🇨🇦", name: "Canada", timezone: "America/Toronto" },
  { code: "AU", flag: "🇦🇺", name: "Australia", timezone: "Australia/Sydney" },
  { code: "AE", flag: "🇦🇪", name: "UAE", timezone: "Asia/Dubai" },
  { code: "SG", flag: "🇸🇬", name: "Singapore", timezone: "Asia/Singapore" },
  { code: "DE", flag: "🇩🇪", name: "Germany", timezone: "Europe/Berlin" },
  { code: "FR", flag: "🇫🇷", name: "France", timezone: "Europe/Paris" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands", timezone: "Europe/Amsterdam" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan", timezone: "Asia/Karachi" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh", timezone: "Asia/Dhaka" },
  { code: "LK", flag: "🇱🇰", name: "Sri Lanka", timezone: "Asia/Colombo" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria", timezone: "Africa/Lagos" },
  { code: "GH", flag: "🇬🇭", name: "Ghana", timezone: "Africa/Accra" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa", timezone: "Africa/Johannesburg" },
  { code: "KE", flag: "🇰🇪", name: "Kenya", timezone: "Africa/Nairobi" },
  { code: "BR", flag: "🇧🇷", name: "Brazil", timezone: "America/Sao_Paulo" },
  { code: "MX", flag: "🇲🇽", name: "Mexico", timezone: "America/Mexico_City" },
  { code: "AR", flag: "🇦🇷", name: "Argentina", timezone: "America/Argentina/Buenos_Aires" },
  { code: "PH", flag: "🇵🇭", name: "Philippines", timezone: "Asia/Manila" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia", timezone: "Asia/Kuala_Lumpur" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia", timezone: "Asia/Jakarta" },
  { code: "JP", flag: "🇯🇵", name: "Japan", timezone: "Asia/Tokyo" },
  { code: "CN", flag: "🇨🇳", name: "China", timezone: "Asia/Shanghai" },
  { code: "KR", flag: "🇰🇷", name: "South Korea", timezone: "Asia/Seoul" },
  { code: "RU", flag: "🇷🇺", name: "Russia", timezone: "Europe/Moscow" },
  { code: "IT", flag: "🇮🇹", name: "Italy", timezone: "Europe/Rome" },
  { code: "ES", flag: "🇪🇸", name: "Spain", timezone: "Europe/Madrid" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", timezone: "Europe/Lisbon" },
  { code: "SE", flag: "🇸🇪", name: "Sweden", timezone: "Europe/Stockholm" },
  { code: "NO", flag: "🇳🇴", name: "Norway", timezone: "Europe/Oslo" },
  { code: "PL", flag: "🇵🇱", name: "Poland", timezone: "Europe/Warsaw" },
  { code: "TR", flag: "🇹🇷", name: "Turkey", timezone: "Europe/Istanbul" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia", timezone: "Asia/Riyadh" },
  { code: "EG", flag: "🇪🇬", name: "Egypt", timezone: "Africa/Cairo" },
  { code: "IL", flag: "🇮🇱", name: "Israel", timezone: "Asia/Jerusalem" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand", timezone: "Pacific/Auckland" },
  { code: "OTHER", flag: "🌍", name: "Other", timezone: "UTC" },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Redirect to login if not authenticated
  if (!user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  const { data: profile, isLoading: isProfileLoading } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/profile"),
    enabled: !!user,
  });

  // If they somehow land here but are already completed, send them to dashboard
  useEffect(() => {
    if (profile?.onboardingCompleted) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [profile, navigate]);

  const [workspaceName, setWorkspaceName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with defaults if profile is loaded
  useEffect(() => {
    if (profile) {
      if (!workspaceName && profile.workspaceName) setWorkspaceName(profile.workspaceName);
      if (!mobileNumber && profile.mobileNumber) setMobileNumber(profile.mobileNumber);
      if (!logoPreview && profile.avatarUrl) setLogoPreview(profile.avatarUrl);
      if (!country && profile.country) setCountry(profile.country);
      if (!timezone && profile.timezone) setTimezone(profile.timezone);
    }
  }, [profile]);

  // Auto-detect country from browser locale on first load
  useEffect(() => {
    if (!country) {
      try {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const matched = COUNTRIES.find((c) => c.timezone === browserTz);
        if (matched) {
          setCountry(matched.code);
          setTimezone(matched.timezone);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const savedCode = localStorage.getItem("mershal_referral_code");
    if (savedCode) {
      setReferralCode(savedCode);
    }
  }, []);

  // When country changes, auto-set timezone
  function handleCountryChange(code: string) {
    setCountry(code);
    const found = COUNTRIES.find((c) => c.code === code);
    if (found) setTimezone(found.timezone);
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      let avatarUrl = profile?.avatarUrl || "";

      // Upload logo if a new file was selected
      if (logoFile && storage) {
        const ext = logoFile.name.split(".").pop();
        const filename = `logos/${user.uid}-${Date.now()}.${ext}`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, logoFile);
        avatarUrl = await getDownloadURL(storageRef);
      }

      // Try applying referral code first if provided
      if (referralCode.trim()) {
        try {
          await apiClient.post("/api/referrals", { code: referralCode.trim() });
          localStorage.removeItem("mershal_referral_code");
        } catch (err: any) {
          const msg = err.message || "Invalid referral code";
          toast.error(msg);
          throw err;
        }
      }

      return apiClient.patch("/api/profile", {
        workspaceName,
        mobileNumber,
        avatarUrl,
        country,
        timezone,
        onboardingCompleted: true,
      });
    },
    onSuccess: () => {
      // Optimistically update the cache
      qc.setQueryData(["profile"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          workspaceName,
          mobileNumber,
          country,
          timezone,
          onboardingCompleted: true,
          avatarUrl: logoPreview || old.avatarUrl,
        };
      });
      
      // Still invalidate to ensure fresh data in the background
      qc.invalidateQueries({ queryKey: ["profile"] });
      
      toast.success("Welcome to Mershal!");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!country) {
      toast.error("Please select your country to continue.");
      return;
    }
    updateMutation.mutate();
  }

  if (isProfileLoading) {
    return <div className="min-h-screen bg-[#0D0E12] flex items-center justify-center" />;
  }

  return (
    <div className="min-h-screen bg-[#0D0E12] flex items-center justify-center p-6">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-8">
          <div className="h-10 w-10 mx-auto rounded-[10px] bg-gradient-primary flex items-center justify-center shadow-glow mb-4" />
          <h1 className="text-[24px] font-semibold text-[#F0F0F5] tracking-tight">
            Complete your profile
          </h1>
          <p className="text-[14px] text-[#8B8FA8] mt-2">
            Just a few details before we set up your workspace.
          </p>
        </div>

        <div className="bg-[#111318] border border-white/8 rounded-[16px] p-8 shadow-card">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-3">
              <div 
                className="h-20 w-20 rounded-full bg-[#16181F] border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-white/20 transition-colors group relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-[#5C5F73] group-hover:text-[#F0F0F5] transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-[#F0F0F5]">Agency Logo</p>
                <p className="text-[11px] text-[#8B8FA8] mt-0.5">Click to upload (optional)</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/png, image/jpeg, image/svg+xml, image/webp" 
              />
            </div>

            {/* Agency Name */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#8B8FA8]">Agency / Workspace Name</label>
              <Input
                placeholder="My Awesome Agency"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#8B8FA8]">Mobile Number</label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
              />
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#8B8FA8]">
                Country <span className="text-[#E11D48]">*</span>
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  required
                  className="w-full bg-[#16181F] border border-white/10 text-[13px] rounded-lg pl-4 pr-10 py-2.5 h-10 text-[#F0F0F5] focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/40 focus:border-[#5E6AD2]/60 transition-all cursor-pointer hover:border-white/20 appearance-none"
                >
                  <option value="" disabled className="bg-[#16181F] text-[#5C5F73]">
                    Select your country…
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#16181F] text-[#F0F0F5]">
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                {/* Custom chevron */}
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5F73]">▾</span>
              </div>
              {/* Auto-detected timezone pill */}
              {timezone && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-[#5C5F73]">Auto-detected timezone:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 text-[10px] font-semibold text-[#8B8FA8]">
                    🕐 {timezone}
                  </span>
                </div>
              )}
            </div>

            {/* Referral Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[#8B8FA8]">Referral Code</label>
                <span className="text-[11px] text-[#5C5F73]">Optional</span>
              </div>
              <Input
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2 shadow-glow-sm"
              loading={updateMutation.isPending}
            >
              Continue to Dashboard →
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#4A4F6A] mt-5">
          Your country is used to personalize time-based greetings and localize your experience.
        </p>
      </div>
    </div>
  );
}
