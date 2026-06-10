import React, { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Code2, Crown, Globe, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
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
    <div className="min-h-screen bg-[#F8F8F6] text-slate-vip relative overflow-hidden" id="majlis-auth-portal">
      <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-deep"></div>
      <div className="absolute inset-x-0 top-1.5 h-1 bg-gold-deep"></div>
      <div className="absolute -right-28 top-24 h-80 w-80 rounded-full bg-emerald-deep/8 blur-3xl pointer-events-none"></div>
      <div className="absolute -left-28 bottom-12 h-80 w-80 rounded-full bg-gold-deep/12 blur-3xl pointer-events-none"></div>

      <header className="relative z-10 max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img src={majlisLogo} alt="Majlis AI logo" className="h-14 w-12 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-mono font-bold text-[#C5A059]">
              {isEn ? "Secure Executive Access" : "دخول تنفيذي آمن"}
            </p>
            <h1 className="text-xl font-serif font-bold text-emerald-deep leading-tight">Majlis AI</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLanguage(isEn ? "ar" : "en")}
          className="bg-gold-deep hover:bg-gold-deep/90 text-[#1B1B1B] font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-sm shadow-sm transition-all flex items-center gap-2 border-0 cursor-pointer"
          id="auth-language-toggle"
        >
          <Globe className="w-4 h-4" />
          <span>{isEn ? "العربية" : "English"}</span>
        </button>
      </header>

      <main className="relative z-10 max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <section className="lg:col-span-5 flex flex-col justify-center">
            <div className="space-y-6" style={{ direction: isEn ? "ltr" : "rtl" }}>
              <div className="inline-flex items-center gap-2 bg-white border border-gold-border rounded-sm px-3 py-2 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-deep" />
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-slate-vip">
                  {isEn ? "Role-Gated Intelligence Portal" : "بوابة استخبارات حسب الصلاحية"}
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-vip leading-tight">
                  {isEn ? "Select your Majlis AI access role." : "اختر دور الدخول إلى مجلس AI."}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 leading-7 max-w-xl">
                  {isEn
                    ? "Staff users prepare the full intelligence workspace. Executives receive a concise meeting brief. Developers enter the protected systems and database console."
                    : "يدخل فريق العمل إلى مساحة التحضير الكاملة، ويحصل القياديون على إحاطة موجزة، ويدخل المطورون إلى وحدة الأنظمة وقواعد البيانات المحمية."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                {roleOptions.map((option) => {
                  const RoleIcon = option.icon;
                  const isSelected = selectedRole === option.role;
                  return (
                    <button
                      key={option.role}
                      type="button"
                      onClick={() => setSelectedRole(option.role)}
                      className={`text-left rounded-sm border p-4 transition-all cursor-pointer bg-white shadow-sm ${
                        isSelected
                          ? "border-emerald-deep ring-2 ring-emerald-deep/15"
                          : "border-gold-border hover:border-gold-deep"
                      }`}
                      aria-pressed={isSelected}
                      style={{ direction: isEn ? "ltr" : "rtl" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`p-2.5 rounded-sm ${isSelected ? "bg-emerald-deep text-white" : "bg-[#F0F0EE] text-emerald-deep"}`}>
                          <RoleIcon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="text-[9px] uppercase font-mono font-black text-emerald-deep bg-emerald-deep/10 px-2 py-1 rounded-sm">
                            {isEn ? "Selected" : "محدد"}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-4 text-base font-serif font-bold text-slate-vip">
                        {isEn ? option.titleEn : option.titleAr}
                      </h3>
                      <p className="mt-2 text-xs text-gray-500 leading-5">
                        {isEn ? option.descriptionEn : option.descriptionAr}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-gold-border shadow-xl rounded-sm overflow-hidden"
              style={{ direction: isEn ? "ltr" : "rtl" }}
            >
              <div className="bg-slate-vip px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-mono font-extrabold">
                    {isEn ? "Authentication" : "المصادقة"}
                  </p>
                  <h2 className="text-lg font-serif font-bold text-white mt-1">
                    {authMode === "signin"
                      ? isEn ? "Sign in to continue" : "تسجيل الدخول للمتابعة"
                      : isEn ? "Create an access profile" : "إنشاء ملف دخول"}
                  </h2>
                </div>

                <div className="grid grid-cols-2 bg-[#111] border border-white/10 rounded-sm p-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode("signin")}
                    className={`px-3 py-2 text-[10px] uppercase tracking-widest font-mono font-black rounded-sm cursor-pointer ${
                      authMode === "signin" ? "bg-gold-deep text-slate-vip" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {isEn ? "Login" : "دخول"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className={`px-3 py-2 text-[10px] uppercase tracking-widest font-mono font-black rounded-sm cursor-pointer ${
                      authMode === "signup" ? "bg-gold-deep text-slate-vip" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {isEn ? "Signup" : "تسجيل"}
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
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
                      className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-deep focus:border-emerald-deep"
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
                    className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-deep focus:border-emerald-deep"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                    {isEn ? "Access Code" : "رمز الدخول"}
                  </span>
                  <div className="relative">
                    <LockKeyhole className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value)}
                      placeholder={isEn ? "Placeholder only" : "للعرض فقط"}
                      className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm pl-10 pr-3 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-deep focus:border-emerald-deep"
                    />
                  </div>
                </label>

                <div className="bg-[#F8F8F6] border border-gold-border rounded-sm p-4 flex items-start gap-3">
                  <UserPlus className="w-4 h-4 text-emerald-deep shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500 leading-5">
                    {isEn
                      ? "This hackathon build uses placeholder authentication. The selected role is stored only in browser session storage."
                      : "يستخدم هذا النموذج مصادقة تجريبية. يتم حفظ الدور المحدد في جلسة المتصفح فقط."}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-deep hover:bg-[#067242] text-white font-mono font-black text-xs uppercase tracking-widest py-3.5 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
