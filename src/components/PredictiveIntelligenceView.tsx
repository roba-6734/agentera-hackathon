import React from "react";
import { PrebuiltCountry } from "../types";
import { AlertCircle, LineChart, Shield, Landmark, TrendingUp, Lightbulb } from "lucide-react";

interface PredictiveIntelligenceViewProps {
  country: PrebuiltCountry;
  language: "en" | "ar";
}

export default function PredictiveIntelligenceView({ country, language }: PredictiveIntelligenceViewProps) {
  const isEn = language === "en";

  return (
    <div className="space-y-6" id="predictive-intelligence-tab-view">
      
      {/* 1. Markets & Trends Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="predictive-trends-grid">
        
        {/* Forward Looking Markets */}
        <div className="bg-white rounded-sm shadow-md border-l-4 border-emerald-deep p-6 flex flex-col justify-between" id="future-markets-predictive">
          <div>
            <div className="flex items-center gap-3 text-emerald-deep mb-4 border-b border-gray-100 pb-3">
              <LineChart className="w-5 h-5 text-gold-deep" />
              <h3 className="font-serif font-bold text-base md:text-lg text-slate-vip">
                {isEn ? "Future Market Opportunities" : "توقعات توافق الأسواق المستقبلية"}
              </h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-sans">
              {isEn ? country.predictive.marketsEn : country.predictive.marketsAr}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 bg-gold-bg/30 -mx-6 -mb-6 p-4 rounded-b-sm flex items-center justify-between text-xs font-mono text-gray-500">
            <span>{isEn ? "TREND HORIZON" : "أفق التوقع الاستراتيجي"}</span>
            <span className="font-bold text-emerald-deep">2026 - 2030</span>
          </div>
        </div>

        {/* Calculated Investment Risks & Strategic Counterweights */}
        <div className="bg-white rounded-sm shadow-md border-l-4 border-red-600 p-6 flex flex-col justify-between" id="investment-risks-predictive">
          <div>
            <div className="flex items-center gap-3 text-red-600 mb-4 border-b border-gray-100 pb-3">
              <Shield className="w-5 h-5 text-gold-deep" />
              <h3 className="font-serif font-bold text-base md:text-lg text-slate-vip">
                {isEn ? "Calculated Risks & Mitigations" : "تقدير وتحييد المخاطر السيادية"}
              </h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-sans">
              {isEn ? country.predictive.risksEn : country.predictive.risksAr}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 bg-gold-bg/30 -mx-6 -mb-6 p-4 rounded-b-sm flex items-center justify-between text-xs font-mono text-gray-500">
            <span>{isEn ? "MITIGATION WEIGHT" : "عامل الحماية الموصى به"}</span>
            <span className="font-bold text-red-600">{isEn ? "High Safeguard" : "ضمانات سيادية كاملة"}</span>
          </div>
        </div>
      </div>

      {/* 2. Flagship UAE Strategic Proposal */}
      <div className="bg-[#1B1B1B] text-white rounded-sm shadow-xl border-l-4 border-gold-deep p-6 md:p-8 relative overflow-hidden" id="sovereign-strategic-initiative-proposal">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold-deep/5 rounded-bl-full pointer-events-none"></div>
        
        <div className="flex items-center gap-3 text-gold-deep mb-4 border-b border-white/5 pb-4">
          <Lightbulb className="w-6 h-6 shrink-0" />
          <div>
            <span className="text-[10px] bg-emerald-deep text-gold-deep font-mono font-bold px-2 py-0.5 rounded border border-gold-deep/20 uppercase tracking-widest block">
              {isEn ? "EXCLUSIVE BILATERAL PILOT PROPOSAL" : "المخرجات الاستراتيجية: مبادرة وفد الدولة المقترحة"}
            </span>
            <h3 className="font-serif font-bold text-lg md:text-xl text-gray-100 mt-1">
              {isEn ? "Strategic Pilot Partnership Formulation" : "صياغة المبادرة الفيدرالية المباشرة"}
            </h3>
          </div>
        </div>

        <p className="text-sm md:text-base text-gray-300 leading-relaxed font-medium">
          {isEn ? country.predictive.proposalsEn : country.predictive.proposalsAr}
        </p>

        {/* UAE alignment seal indicator */}
        <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-light"></span>
            <span>{isEn ? "Ministry Protocol Alignment: MOEI-PILOT-2026" : "متوافق مع خطة الوزارة الخمسية: MOEI-PILOT-2026"}</span>
          </div>
          <span className="px-3 py-1 bg-emerald-deep font-bold text-gold-deep rounded border border-gold-deep/25 uppercase">
            {isEn ? "Action Recommended" : "نوصي بالاعتماد الفوري"}
          </span>
        </div>
      </div>

    </div>
  );
}
