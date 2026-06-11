import React from "react";
import { Globe, Award, Calendar, LogOut, UserRound, BellRing } from "lucide-react";
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
    staff: language === "en" ? "Staff" : "فريق العمل",
    executive: language === "en" ? "Executive" : "قيادي",
  }[sessionRole];
  const isExecutive = sessionRole === "executive";
  const selectedCountryLabel = language === "en" ? selectedCountryNameEn : selectedCountryNameAr;
  const controlShellClass = "h-12 rounded-lg border border-[#D7DFEA] bg-white shadow-sm shadow-slate-200/60 flex items-center transition-all";
  const iconTileClass = "h-8 w-8 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-emerald-deep shrink-0";
  const iconButtonClass = `${controlShellClass} w-12 justify-center text-slate-vip hover:bg-[#F8FAFC] hover:border-[#B8C4D6] cursor-pointer`;

  return (
    <header className="bg-white relative border-b border-gold-border text-slate-vip overflow-hidden shadow-sm animate-fade-in-down" id="moei-executive-header">
      {/* Top premium color lines from thematic design */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-[linear-gradient(90deg,#0F172A,#1E3A8A,#4F46E5,#60A5FA)]"></div>
      
      {/* UAE themed subtle backdrop element */}
      <div className="absolute inset-x-0 top-1.5 h-20 bg-[linear-gradient(105deg,rgba(30,58,138,0.08),transparent_42%,rgba(79,70,229,0.06))] pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(100,116,139,0.28),transparent)] pointer-events-none"></div>

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
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#4F46E5] font-bold">
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
          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 md:self-center" id="header-controls-section">
            
            {/* Preparation Indicator Badge */}
            <div className={`${controlShellClass} gap-2 px-3 min-w-[170px] max-w-[230px]`} id="briefing-target-badge">
              <span className={iconTileClass}>
                <Award className="w-4 h-4" />
              </span>
              <div className="text-left font-sans min-w-0">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest block leading-none">
                  {isExecutive
                    ? language === "en" ? "Briefing Target" : "هدف الإحاطة"
                    : language === "en" ? "Active Consult" : "الاستشاري النشط"}
                </p>
                <p className="text-xs font-bold font-mono text-slate-vip mt-1 truncate">
                  {selectedCountryLabel}
                </p>
              </div>
            </div>

            {/* Meeting scheduler and reminder status */}
            {onOpenCalendar && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenCalendar}
                  className={`${controlShellClass} gap-2 px-3.5 text-slate-vip hover:bg-[#F8FAFC] hover:border-[#B8C4D6] cursor-pointer`}
                  id="header-calendar-toggle-btn"
                  title={language === "en" ? "Schedule a bilateral meeting" : "جدولة اجتماع ثنائي"}
                >
                  <Calendar className="w-4 h-4 text-emerald-deep shrink-0" />
                  <span className="text-xs font-mono font-bold tracking-wide whitespace-nowrap">
                    {language === "en" ? "Schedule Meeting" : "جدولة اجتماع"}
                  </span>
                </button>

                <span
                  className={`${iconButtonClass} relative group`}
                  id="header-meeting-reminder-indicator"
                  title={
                    language === "en"
                      ? "Notification will be sent when the meeting time is approaching."
                      : "سيتم إرسال إشعار عند اقتراب موعد الاجتماع."
                  }
                  aria-label={
                    language === "en"
                      ? "Meeting reminder notifications enabled"
                      : "تنبيهات تذكير الاجتماعات مفعلة"
                  }
                >
                  <BellRing className="w-4 h-4" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gold-deep border border-white"></span>
                  <span className="pointer-events-none absolute top-[calc(100%+0.5rem)] right-0 z-50 hidden w-64 rounded-md border border-[#D7DFEA] bg-white px-3 py-2 text-left text-[11px] leading-4 font-sans font-semibold text-slate-vip shadow-xl group-hover:block">
                    {language === "en"
                      ? "Notification will be sent when the meeting time is approaching."
                      : "سيتم إرسال إشعار عند اقتراب موعد الاجتماع."}
                  </span>
                </span>
              </div>
            )}

            <div className={`${controlShellClass} gap-2 px-3 min-w-[132px] max-w-[176px]`} id="header-session-badge">
              <span className={iconTileClass}>
                <UserRound className="w-4 h-4" />
              </span>
              <div className="min-w-0 text-left">
                <span className="text-[10px] max-w-[104px] truncate font-mono font-bold text-slate-vip block leading-none">
                  {sessionDisplayName}
                </span>
                <span className="text-[8px] uppercase tracking-widest text-slate-500 font-mono font-bold block mt-1 leading-none">
                  {roleLabel}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className={`${iconButtonClass} hover:text-red-700 hover:bg-red-50`}
              id="header-switch-account-btn"
              title={language === "en" ? "Switch Account" : "تبديل الحساب"}
              aria-label={language === "en" ? "Switch Account" : "تبديل الحساب"}
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Bilingual Switcher Toggle Button */}
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="h-12 rounded-lg bg-[#3730A3] hover:bg-[#312E81] text-white font-bold text-xs uppercase tracking-widest px-3.5 shadow-sm transition-all duration-300 flex items-center gap-2 border border-[#4338CA] cursor-pointer"
              id="language-translator-toggle"
              title={language === "en" ? "Switch to Arabic" : "Switch to English"}
            >
              <Globe className="w-4 h-4 text-white" />
              <span>{language === "en" ? "AR" : "EN"}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
