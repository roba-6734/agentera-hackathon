import React from "react";
import { PrebuiltCountry } from "../types";
import { Building, Award, Landmark, TrendingUp, Zap, HardHat, Recycle } from "lucide-react";
import CountryFlag from "./CountryFlag";

interface IntelligenceProfileProps {
  country: PrebuiltCountry;
  language: "en" | "ar";
}

export default function IntelligenceProfile({ country, language }: IntelligenceProfileProps) {
  const isEn = language === "en";

  return (
    <div className="space-y-6" id="country-intelligence-profile-view">
      
      {/* Overview Hero Section */}
      <div className="bg-white rounded-sm shadow-md border-l-4 border-[#C5A059] p-6 md:p-8 relative overflow-hidden" id="country-hero-card">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-deep/5 rounded-bl-full pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <CountryFlag flag={country.flag} flagUrl={country.flagUrl} countryName={isEn ? country.nameEn : country.nameAr} size="xl" />
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-light"></span>
                <span className="text-xs uppercase font-semibold text-emerald-deep tracking-wider font-mono">
                  {isEn ? "Diplomatic Country File" : "الملف القياسي للدولة"}
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-vip font-serif mt-1">
                {isEn ? country.nameEn : country.nameAr}
              </h2>
            </div>
          </div>

          <div className="bg-gold-bg border border-gold-border/50 rounded-xl p-4 min-w-[240px]" id="cooperation-status-info">
            <div className="flex items-center gap-2 text-gold-deep mb-2 font-semibold text-xs uppercase tracking-wide">
              <Award className="w-4 h-4" />
              <span>{isEn ? "Cooperation Framework" : "إطار التعاون الثنائي"}</span>
            </div>
            <p className="text-sm font-bold text-slate-vip">
              {isEn ? country.indicators.cooperationAgreementEn : country.indicators.cooperationAgreementAr}
            </p>
          </div>
        </div>

        {/* Dynamic description aligned with the VIP requirements */}
        <div className="mt-6 pt-6 border-t border-gray-100" id="country-profile-overview-text">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-vip/60 mb-2">
            {isEn ? "Executive Country Summary" : "نبذة تنفيذية عامة"}
          </h3>
          <p className="text-base text-gray-700 leading-relaxed font-sans first-letter:text-xl font-medium">
            {isEn ? country.profile.overviewEn : country.profile.overviewAr}
          </p>
        </div>
      </div>

      {/* Leadership Profile section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="leadership-and-government-grid">
        <div className="bg-white rounded-sm p-6 shadow-md border-l-4 border-emerald-deep flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-emerald-deep mb-4">
              <Landmark className="w-5 h-5" />
              <h3 className="font-serif font-bold text-lg text-slate-vip">
                {isEn ? "Government Structure" : "الهيكل الحكومي والسياسي"}
              </h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              {isEn ? country.profile.governmentEn : country.profile.governmentAr}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 p-6 rounded-b-xl flex items-center justify-between">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{isEn ? "Governance" : "نظام الحكم"}</span>
            <span className="text-xs font-bold text-slate-vip font-serif px-2.5 py-1 bg-gold-bg border border-gold-border/60 rounded-md">
              {isEn ? "Constitutional Matrix" : "الهيكل الدستوري"}
            </span>
          </div>
        </div>

        <div className="bg-slate-vip text-white rounded-sm p-6 shadow-lg border-l-4 border-gold-deep flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-gold-deep mb-4">
              <Building className="w-5 h-5" />
              <h3 className="font-serif font-bold text-lg text-white">
                {isEn ? "Decision Makers & Key Targets" : "صناع القرار والقيادات المستهدفة"}
              </h3>
            </div>
            <p className="text-gold-deep/90 text-sm leading-relaxed">
              {isEn ? country.profile.leadershipEn : country.profile.leadershipAr}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 bg-slate-vip/80 -mx-6 -mb-6 p-6 rounded-b-xl flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{isEn ? "Delegation Context" : "مستوى الوفد المرتقب"}</span>
            <span className="text-xs font-bold text-gold-deep px-2.5 py-1 bg-emerald-deep/40 border border-gold-deep/30 rounded-md">
              {isEn ? "Ministerial Level" : "تمثيل وزاري رفيع"}
            </span>
          </div>
        </div>
      </div>

      {/* UAE Ministry specific sector updates: Energy, Infrastructure, Sustainability */}
      <div className="bg-white rounded-sm shadow-md border-l-4 border-[#C5A059] p-6 md:p-8" id="sectors-intelligence-section">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
          <h3 className="font-serif font-bold text-xl text-slate-vip">
            {isEn ? "Core Ministry Sector Intelligence" : "الملفات القطاعية لعلوم البنية التحتية والطاقة"}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="core-sectors-grid">
          {/* Energy Segment */}
          <div className="p-5 rounded-sm border border-gold-border bg-gold-bg/40 hover:bg-gold-bg/70 transition-colors" id="sector-field-energy">
            <div className="flex items-center gap-3 text-emerald-deep mb-3">
              <Zap className="w-5 h-5 text-gold-deep" />
              <h4 className="font-serif font-bold text-base text-slate-vip">
                {isEn ? "Energy Profile" : "قطاع وملف الطاقة"}
              </h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {isEn ? country.sectors.energyEn : country.sectors.energyAr}
            </p>
          </div>

          {/* Infrastructure Segment */}
          <div className="p-5 rounded-sm border border-gold-border bg-gold-bg/40 hover:bg-gold-bg/70 transition-colors" id="sector-field-infrastructure">
            <div className="flex items-center gap-3 text-emerald-deep mb-3">
              <HardHat className="w-5 h-5 text-gold-deep" />
              <h4 className="font-serif font-bold text-base text-slate-vip">
                {isEn ? "Infrastructure & Logistics" : "قطاع البنية التحتية واللوجستية"}
              </h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {isEn ? country.sectors.infrastructureEn : country.sectors.infrastructureAr}
            </p>
          </div>

          {/* Sustainability Segment */}
          <div className="p-5 rounded-sm border border-gold-border bg-gold-bg/40 hover:bg-gold-bg/70 transition-colors" id="sector-field-sustainability">
            <div className="flex items-center gap-3 text-emerald-deep mb-3">
              <Recycle className="w-5 h-5 text-gold-deep" />
              <h4 className="font-serif font-bold text-base text-slate-vip">
                {isEn ? "Sustainability Initiatives" : "مبادرات الاستدامة والمناخ"}
              </h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {isEn ? country.sectors.sustainabilityEn : country.sectors.sustainabilityAr}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
