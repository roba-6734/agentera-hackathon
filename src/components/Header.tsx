import React from "react";
import { Globe, Award, Calendar } from "lucide-react";
import majlisLogo from "../../assets/images/majlis-ai-logo.png";

interface HeaderProps {
  language: "en" | "ar";
  setLanguage: (lang: "en" | "ar") => void;
  selectedCountryNameEn: string;
  selectedCountryNameAr: string;
  isDeveloperMode: boolean;
  setIsDeveloperMode: (val: boolean) => void;
  onOpenCalendar: () => void;
}

export default function Header({ language, setLanguage, selectedCountryNameEn, selectedCountryNameAr, isDeveloperMode, setIsDeveloperMode, onOpenCalendar }: HeaderProps) {

  return (
    <header className="bg-white relative border-b border-gold-border text-slate-vip overflow-hidden shadow-sm" id="moei-executive-header">
      {/* Top premium color lines from thematic design */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-deep"></div>
      
      {/* UAE themed subtle backdrop element */}
      <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-gold-deep/5 blur-3xl pointer-events-none"></div>
      <div className="absolute -left-32 -bottom-32 w-96 h-96 rounded-full bg-emerald-deep/5 blur-3xl pointer-events-none"></div>

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
                  {language === "en" ? "Cabinet Strategic Resource" : "مورد استراتيجي للمجلس"}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#F0F0EE] text-slate-vip rounded border border-gold-border font-mono font-bold">
                  SECURE v2.5
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight font-sans text-emerald-deep flex items-center gap-1">
                {language === "en" ? "Majlis AI" : "مجلس AI"}
              </h1>
              <p className="text-xs text-gray-500 font-medium tracking-wide">
                {language === "en" ? "Decision-Ready Intelligence for UAE Leadership" : "استخبارات جاهزة للقرار لقيادة دولة الإمارات"}
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
                  {language === "en" ? "Active Consult" : "الاستشاري النشط"}
                </p>
                <p className="text-xs font-bold font-mono text-slate-vip mt-0.5">
                  {language === "en" ? `Targeting: ${selectedCountryNameEn}` : `المستهدف: ${selectedCountryNameAr}`}
                </p>
              </div>
            </div>

            {/* Real-time Developer Terminal Button */}
            <button
              onClick={() => setIsDeveloperMode(!isDeveloperMode)}
              className={`font-semibold font-mono text-xs tracking-wide px-3.5 py-2.5 rounded shadow-sm transition-all flex items-center gap-2 border cursor-pointer ${
                isDeveloperMode 
                  ? "bg-emerald-deep text-white border-emerald-accent/20 hover:bg-[#067242]" 
                  : "bg-slate-vip text-[#C5A059] border-gold-border hover:bg-slate-vip/90"
              }`}
              id="header-terminal-toggle-btn"
            >
              <span>{isDeveloperMode ? (language === "en" ? "🖥️ Console Active" : "🖥️ وحدة التحكم نشطة") : (language === "en" ? "🛠️ Developer Console" : "🛠️ وحدة المطور")}</span>
            </button>

            {/* Cabinet Portfolio Schedule Calendar Toggle Button */}
            <button
              onClick={onOpenCalendar}
              className="bg-[#FAF8F5] hover:bg-gold-bg text-slate-vip border border-gold-border font-semibold font-mono text-xs tracking-wide px-3.5 py-2.5 rounded shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              id="header-calendar-toggle-btn"
              title={language === "en" ? "Bilateral Schedule Calendar" : "مفكرة المواعيد الثنائية"}
            >
              <Calendar className="w-4 h-4 text-emerald-deep" />
              <span>{language === "en" ? "Portfolio Schedule" : "المواعيد والوفود"}</span>
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
