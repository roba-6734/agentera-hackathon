import React, { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Code2, Crown, Globe, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import majlisLogo from "../../assets/images/majlis-ai-logo.png";
import { AppRole, AppSession } from "../types";

interface AuthPortalProps {
  language: "en" | "ar";
  setLanguage: (lang: "en" | "ar") => void;
  onAuthenticated: (session: AppSession) => void;
}

type AuthMode = "signin" | "signup";

const roleOptions: Array<{
  role: AppRole;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: typeof BriefcaseBusiness;
}> = [
  {
    role: "staff",
    titleEn: "Staff",
    titleAr: "فريق العمل",
    descriptionEn: "Full preparation workspace with country intelligence, comparisons, schedules, and policy advisor chat.",
    descriptionAr: "مساحة تحضير كاملة تشمل ملفات الدول والمقارنات والجداول والمستشار الرقمي.",
    icon: BriefcaseBusiness,
  },
  {
    role: "executive",
    titleEn: "Executive",
    titleAr: "قيادي",
    descriptionEn: "Concise meeting briefing for chairs, senior officials, and decision makers who need only the essentials.",
    descriptionAr: "إحاطة موجزة لرؤساء الاجتماعات وكبار المسؤولين وصناع القرار دون تفاصيل زائدة.",
    icon: Crown,
  },
  {
    role: "developer",
    titleEn: "Developer",
    titleAr: "المطور",
    descriptionEn: "Systems console, Neon data migration, diagnostics, and security audit tools.",
    descriptionAr: "وحدة الأنظمة وترحيل بيانات نيون والتشخيص وأدوات التدقيق الأمني.",
    icon: Code2,
  },
];

const formMotion = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(6px)" },
  transition: { duration: 0.32, ease: "easeOut" },
};

export default function AuthPortal({ language, setLanguage, onAuthenticated }: AuthPortalProps) {
  const isEn = language === "en";
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [selectedRole, setSelectedRole] = useState<AppRole>("staff");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const fallbackDisplayName: Record<AppRole, string> = {
    developer: "Developer User",
    staff: "Staff User",
    executive: "Executive User",
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Placeholder authentication entry point:
    // Replace this block with OAuth, SSO, password hashing, and database-backed user records.
    // Persist role claims on the authenticated user server-side before issuing the app session.
    onAuthenticated({
      role: selectedRole,
      displayName: displayName.trim() || email.trim() || fallbackDisplayName[selectedRole],
      email: email.trim(),
      authMode,
      issuedAt: new Date().toISOString(),
    });

    setAccessCode("");
  };

  return (
    <div className="auth-portal-shell min-h-screen text-slate-vip relative overflow-hidden" id="majlis-auth-portal">
      <div className="auth-gradient-bar" />
      <div className="auth-light-beam auth-light-beam-one" />
      <div className="auth-light-beam auth-light-beam-two" />

      <header className="relative z-10 max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4 animate-fade-in-down">
        <div className="auth-glass-pill flex items-center gap-3 min-w-0 rounded-lg px-3 py-2">
          <div className="auth-logo-badge h-14 w-14 rounded-lg flex items-center justify-center shrink-0">
            <img src={majlisLogo} alt="Majlis AI logo" className="h-12 w-10 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-mono font-bold text-[#A16C20]">
              {isEn ? "Secure Executive Access" : "دخول تنفيذي آمن"}
            </p>
            <h1 className="text-xl font-serif font-bold auth-gradient-text leading-tight">Majlis AI</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLanguage(isEn ? "ar" : "en")}
          className="text-[#1B1B1B] font-bold text-xs uppercase tracking-widest px-4 py-2.5 shadow-sm transition-all duration-300 flex items-center gap-2 border-0 cursor-pointer hover:shadow-lg active:scale-95"
          id="auth-language-toggle"
        >
          <Globe className="w-4 h-4" />
          <span>{isEn ? "العربية" : "English"}</span>
        </button>
      </header>

      <main className="relative z-10 max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <section className="lg:col-span-5 flex flex-col justify-center animate-fade-in-up">
            <div className="space-y-6" style={{ direction: isEn ? "ltr" : "rtl" }}>
              <div className="auth-glass-pill inline-flex items-center gap-2 rounded-lg px-3 py-2">
                <ShieldCheck className="w-4 h-4 text-teal-glow" />
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-slate-vip">
                  {isEn ? "Role-Gated Intelligence Portal" : "بوابة استخبارات حسب الصلاحية"}
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl sm:text-5xl font-serif font-bold text-slate-vip leading-tight">
                  {isEn ? (
                    <>
                      Select your <span className="auth-gradient-text">Majlis AI</span> access role.
                    </>
                  ) : (
                    "اختر دور الدخول إلى مجلس AI."
                  )}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 leading-7 max-w-xl">
                  {isEn
                    ? "Staff users prepare the full intelligence workspace. Executives receive a concise meeting brief. Developers enter the protected systems and database console."
                    : "يدخل فريق العمل إلى مساحة التحضير الكاملة، ويحصل القياديون على إحاطة موجزة، ويدخل المطورون إلى وحدة الأنظمة وقواعد البيانات المحمية."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                {roleOptions.map((option, index) => {
                  const RoleIcon = option.icon;
                  const isSelected = selectedRole === option.role;
                  return (
                    <motion.button
                      key={option.role}
                      type="button"
                      onClick={() => setSelectedRole(option.role)}
                      className={`auth-role-card text-left rounded-lg border p-4 transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? "auth-role-card-active border-white/60 ring-2 ring-white/45"
                          : "border-white/70 hover:border-teal-glow/60"
                      }`}
                      aria-pressed={isSelected}
                      style={{ direction: isEn ? "ltr" : "rtl" }}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.08, duration: 0.38, ease: "easeOut" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className={`p-2.5 rounded-lg shadow-sm ${isSelected ? "bg-white/18 text-white" : "bg-white text-emerald-deep"}`}>
                          <RoleIcon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="text-[9px] uppercase font-mono font-black text-white bg-white/18 px-2 py-1 rounded-md">
                            {isEn ? "Selected" : "محدد"}
                          </span>
                        )}
                      </div>
                      <h3 className={`relative z-10 mt-4 text-base font-serif font-bold ${isSelected ? "text-white" : "text-slate-vip"}`}>
                        {isEn ? option.titleEn : option.titleAr}
                      </h3>
                      <p className={`relative z-10 mt-2 text-xs leading-5 ${isSelected ? "text-white/82" : "text-gray-500"}`}>
                        {isEn ? option.descriptionEn : option.descriptionAr}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="lg:col-span-7 animate-fade-in-right">
            <form
              onSubmit={handleSubmit}
              className="auth-panel rounded-lg overflow-hidden"
              style={{ direction: isEn ? "ltr" : "rtl" }}
            >
              <div className="auth-panel-header relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 overflow-hidden">
                <div className="relative z-10">
                  <p className="text-[10px] uppercase tracking-widest text-[#FFD38B] font-mono font-extrabold">
                    {isEn ? "Authentication" : "المصادقة"}
                  </p>
                  <h2 className="text-lg font-serif font-bold text-white mt-1">
                    {authMode === "signin"
                      ? isEn ? "Sign in to continue" : "تسجيل الدخول للمتابعة"
                      : isEn ? "Create an access profile" : "إنشاء ملف دخول"}
                  </h2>
                </div>

                <div className="relative z-10 grid grid-cols-2 bg-white/10 border border-white/20 rounded-lg p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setAuthMode("signin")}
                    className={`px-3 py-2 text-[10px] uppercase tracking-widest font-mono font-black rounded-md cursor-pointer transition-all ${
                      authMode === "signin" ? "bg-white text-emerald-deep shadow-lg" : "text-white/65 hover:text-white"
                    }`}
                  >
                    {isEn ? "Login" : "دخول"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className={`px-3 py-2 text-[10px] uppercase tracking-widest font-mono font-black rounded-md cursor-pointer transition-all ${
                      authMode === "signup" ? "bg-white text-emerald-deep shadow-lg" : "text-white/65 hover:text-white"
                    }`}
                  >
                    {isEn ? "Signup" : "تسجيل"}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={authMode} {...formMotion} className="relative z-10 p-6 sm:p-8 space-y-5">
                  {authMode === "signup" && (
                    <label className="block space-y-1.5">
                      <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                        {isEn ? "Display Name" : "اسم المستخدم"}
                      </span>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder={isEn ? "e.g. Ministry Strategy Lead" : "مثال: قائد الاستراتيجية"}
                        className="auth-input w-full border rounded-lg px-3 py-3 text-sm outline-none"
                      />
                    </label>
                  )}

                  <label className="block space-y-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                      {isEn ? "Official Email" : "البريد الرسمي"}
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={isEn ? "name@entity.gov.ae" : "name@entity.gov.ae"}
                      className="auth-input w-full border rounded-lg px-3 py-3 text-sm outline-none"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                      {isEn ? "Access Code" : "رمز الدخول"}
                    </span>
                    <div className="relative">
                      <LockKeyhole className="w-4 h-4 text-teal-glow absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="password"
                        value={accessCode}
                        onChange={(event) => setAccessCode(event.target.value)}
                        placeholder={isEn ? "Placeholder only" : "للعرض فقط"}
                        className="auth-input w-full border rounded-lg pl-10 pr-3 py-3 text-sm outline-none"
                      />
                    </div>
                  </label>

                  <div className="bg-white/66 border border-white/70 rounded-lg p-4 flex items-start gap-3 shadow-sm">
                    <UserPlus className="w-4 h-4 text-coral-bright shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-5">
                      {isEn
                        ? "This hackathon build uses placeholder authentication. The selected role is stored only in browser session storage."
                        : "يستخدم هذا النموذج مصادقة تجريبية. يتم حفظ الدور المحدد في جلسة المتصفح فقط."}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-button w-full text-white font-mono font-black text-xs uppercase tracking-widest py-3.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:shadow-2xl active:scale-[0.99]"
                  >
                    <span>
                      {selectedRole === "developer"
                        ? isEn ? "Enter Developer Console" : "دخول وحدة المطور"
                        : selectedRole === "executive"
                          ? isEn ? "Enter Executive Briefing" : "دخول الإحاطة القيادية"
                          : isEn ? "Enter Staff Workspace" : "دخول مساحة فريق العمل"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </AnimatePresence>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
