import React from "react";
import { Globe, Award, Calendar, LogOut, UserRound } from "lucide-react";
import majlisLogo from "../../assets/images/majlis-ai-logo.png";
import { AppRole } from "../types";

interface HeaderProps {
  language: "en" | "ar";
  setLanguage: (lang: "en" | "ar") => void;
  selectedCountryNameEn: string;
  selectedCountryNameAr: string;
  onOpenCalendar?: () => void;
  sessionDisplayName: string;
  sessionRole: AppRole;
  onLogout: () => void;
}

export default function Header({ language, setLanguage, selectedCountryNameEn, selectedCountryNameAr, onOpenCalendar, sessionDisplayName, sessionRole, onLogout }: HeaderProps) {
  const roleLabel = {
    developer: language === "en" ? "Developer" : "مطوّر",
    staff: language === "en" ? "Staff" : "فريق العمل",
    executive: language === "en" ? "Executive" : "قيادي",
  }[sessionRole];
  const isExecutive = sessionRole === "executive";

  return (
    <header className="bg-white relative border-b border-gold-border text-slate-vip overflow-hidden shadow-sm animate-fade-in-down" id="moei-executive-header">
      {/* Top premium color lines from thematic design */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-[linear-gradient(90deg,#00732F,#14B8A6,#2563EB,#F9735B,#C5A059)]"></div>
      
      {/* UAE themed subtle backdrop element */}
      <div className="absolute inset-x-0 top-1.5 h-20 bg-[linear-gradient(105deg,rgba(20,184,166,0.14),transparent_38%,rgba(249,115,91,0.12))] pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(197,160,89,0.5),transparent)] pointer-events-none"></div>

      <div className="max-w-[1700px] xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-5 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6" id="header-internal-container">
          
          {/* Project Logo & Brand */}
          <div className="flex items-center gap-4" id="ministry-logo-section">
            <img
              src={majlisLogo}
              alt="Majlis AI logo"
              className="h-20 w-16 rounded-sm shrink-0 object-contain"
              id="ministry-emblem-wrapper"
            />

            <div className="flex flex-col justify-center" id="ministry-text-brand">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-deep animate-pulse"></span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#C5A059] font-bold">
                  {isExecutive
                    ? language === "en" ? "Executive Briefing Resource" : "مورد الإحاطة القيادية"
                    : language === "en" ? "Staff Strategic Resource" : "مورد استراتيجي لفريق العمل"}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#F0F0EE] text-slate-vip rounded border border-gold-border font-mono font-bold">
                  SECURE v2.5
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight font-sans text-emerald-deep flex items-center gap-1">
                {language === "en" ? "Majlis AI" : "مجلس AI"}
              </h1>
              <p className="text-xs text-gray-500 font-medium tracking-wide">
                {isExecutive
                  ? language === "en" ? "Concise Briefings for UAE Leadership" : "إحاطات موجزة لقيادة دولة الإمارات"
                  : language === "en" ? "Decision-Ready Intelligence for UAE Leadership" : "استخبارات جاهزة للقرار لقيادة دولة الإمارات"}
              </p>
            </div>
          </div>

          {/* Real-time Status and Language Toggle */}
          <div className="flex flex-wrap items-center gap-4 md:self-center" id="header-controls-section">
            
            {/* Preparation Indicator Badge */}
            <div className="bg-[#F8F8F6] rounded-md p-2.5 border border-gold-border flex items-center gap-3 shadow-xs" id="briefing-target-badge">
              <Award className="w-4 h-4 text-emerald-deep" />
              <div className="text-left font-sans">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest block leading-none">
                  {isExecutive
                    ? language === "en" ? "Briefing Target" : "هدف الإحاطة"
                    : language === "en" ? "Active Consult" : "الاستشاري النشط"}
                </p>
                <p className="text-xs font-bold font-mono text-slate-vip mt-0.5">
                  {language === "en" ? `Targeting: ${selectedCountryNameEn}` : `المستهدف: ${selectedCountryNameAr}`}
                </p>
              </div>
            </div>

            {/* Cabinet Portfolio Schedule Calendar Toggle Button */}
            {!isExecutive && onOpenCalendar && (
              <button
                onClick={onOpenCalendar}
                className="bg-[#FAF8F5] hover:bg-gold-bg text-slate-vip border border-gold-border font-semibold font-mono text-xs tracking-wide px-3.5 py-2.5 rounded shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                id="header-calendar-toggle-btn"
                title={language === "en" ? "Bilateral Schedule Calendar" : "مفكرة المواعيد الثنائية"}
              >
                <Calendar className="w-4 h-4 text-emerald-deep" />
                <span>{language === "en" ? "Portfolio Schedule" : "المواعيد والوفود"}</span>
              </button>
            )}

            <div className="bg-[#F8F8F6] rounded-md border border-gold-border flex items-center gap-2 shadow-xs px-3 py-2.5" id="header-session-badge">
              <UserRound className="w-4 h-4 text-emerald-deep" />
              <div className="min-w-0">
                <span className="text-[10px] max-w-[120px] truncate font-mono font-bold text-slate-vip block leading-none">
                  {sessionDisplayName}
                </span>
                <span className="text-[8px] uppercase tracking-widest text-gray-500 font-mono font-bold block mt-1 leading-none">
                  {roleLabel}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="bg-white hover:bg-red-50 text-slate-vip hover:text-red-700 border border-gold-border font-semibold font-mono text-xs tracking-wide px-3.5 py-2.5 rounded shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              id="header-switch-account-btn"
              title={language === "en" ? "Switch Account" : "تبديل الحساب"}
            >
              <LogOut className="w-4 h-4" />
              <span>{language === "en" ? "Switch Account" : "تبديل الحساب"}</span>
            </button>

            {/* Bilingual Switcher Toggle Button */}
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="bg-gold-deep hover:bg-gold-deep/90 text-[#1B1B1B] font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-sm shadow-sm transition-all duration-300 flex items-center gap-2 border-0 cursor-pointer"
              id="language-translator-toggle"
            >
              <Globe className="w-4 h-4 text-[#1B1B1B]" />
              <span>{language === "en" ? "العربية" : "English"}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
