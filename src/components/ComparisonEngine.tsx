import React from "react";
import { PrebuiltCountry, UaeIndicator } from "../types";
import { Scale, ArrowRightLeft, ShieldAlert, Award, AlertTriangle, TrendingUp, Zap, HardHat, Recycle, Compass } from "lucide-react";

interface ComparisonEngineProps {
  country: PrebuiltCountry;
  uaeData: UaeIndicator;
  language: "en" | "ar";
}

export default function ComparisonEngine({ country, uaeData, language }: ComparisonEngineProps) {
  const isEn = language === "en";

  // Define side by side metrics to compare beautifully with qualitative values or indicators
  const comparisonMetrics = [
    {
      labelEn: "Sovereign GPR (General Economy Size)",
      labelAr: "الحجم الاقتصادي ومقدار الناتج المحلي السنوي",
      icon: <TrendingUp className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.gdp,
      uaeValueAr: uaeData.gdpAr,
      countryValue: country.indicators.gdp,
      countryValueAr: country.indicators.gdpAr,
    },
    {
      labelEn: "Energy Transition Mix Matrix",
      labelAr: "هيكل توليد الطاقة ومصفوفة تحول الوقود النظيف",
      icon: <Zap className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.energyMix,
      uaeValueAr: uaeData.energyMixAr,
      countryValue: country.indicators.energyMix,
      countryValueAr: country.indicators.energyMixAr,
    },
    {
      labelEn: "Infrastructure & Road Quality Readiness",
      labelAr: "مؤشر جاهزية البنية التحتية والموانئ الفيدرالية",
      icon: <HardHat className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.infrastructureIndex,
      uaeValueAr: uaeData.infrastructureIndexAr,
      countryValue: country.indicators.infrastructureIndex,
      countryValueAr: country.indicators.infrastructureIndex, // Country index is just numeric string
    },
    {
      labelEn: "Sustainability Targets & Environmental Rank",
      labelAr: "المؤشرات المناخية وترتيب الاستدامة الدولي",
      icon: <Recycle className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.environmentalRank,
      uaeValueAr: uaeData.environmentalRankAr,
      countryValue: country.indicators.environmentalRank,
      countryValueAr: country.indicators.environmentalRank, // String is descriptive enough
    },
    {
      labelEn: "Global Competitiveness Rank",
      labelAr: "مستويات التنافسية والتمكين الاقتصادي العالمي",
      icon: <Compass className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.competitivenessRank,
      uaeValueAr: uaeData.competitivenessRankAr,
      countryValue: country.indicators.competitivenessRank,
      countryValueAr: country.indicators.competitivenessRank,
    }
  ];

  return (
    <div className="space-y-6" id="country-comparison-engine-view">
      
      {/* Visual Header scale display representing the UAE theme */}
      <div className="bg-white rounded-sm shadow-md border-l-4 border-[#C5A059] p-6 md:p-8" id="comparison-banner-scale">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gold-bg border border-gold-border/60 text-gold-deep rounded-sm flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold font-mono text-emerald-deep tracking-wider uppercase block">
                {isEn ? "Sovereign Benchmarks Ratio" : "المقارنات الفيدرالية الثنائية"}
              </span>
              <h3 className="text-xl font-serif font-bold text-slate-vip mt-0.5">
                {isEn ? `UAE vs ${country.nameEn} Competitive Indicators` : `مقارنة دولة الإمارات ومؤشرات ${country.nameAr}`}
              </h3>
            </div>
          </div>
          <div className="text-sm border border-gold-border/40 bg-gold-bg/30 text-gray-600 px-4 py-2 rounded-lg leading-relaxed max-w-md">
            {isEn
              ? "This dashboard compares the indicators of the host country directly with the UAE to identify negotiating leverage and structural synergy."
              : "يقارن هذا الملف المؤشرات التنافسية للدولة المستهدفة مع دبي وأبوظبي مباشرة لتحديد ركائز القوة ومحاور التفاوض الدبلوماسية."}
          </div>
        </div>
      </div>

      {/* Head-to-Head Country Comparison Country Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="comparison-col-headers">
        {/* UAE Column */}
        <div className="bg-emerald-deep h-16 rounded-sm flex items-center justify-between px-6 text-white border-b-4 border-gold-deep shadow-md" id="col-uae-header">
          <span className="text-xl font-bold font-serif tracking-tight flex items-center gap-2">
            <span>🇦🇪</span>
            <span>{isEn ? uaeData.nameEn : uaeData.nameAr}</span>
          </span>
          <span className="text-xs uppercase font-mono tracking-widest text-gold-deep bg-slate-vip/50 px-3 py-1 rounded border border-gold-deep/20">
            {isEn ? "Benchmark Host" : "الدولة المرجعية"}
          </span>
        </div>

        {/* Selected Country Column */}
        <div className="bg-slate-vip h-16 rounded-sm flex items-center justify-between px-6 text-white border-b-4 border-gold-deep shadow-md" id="col-target-header">
          <span className="text-xl font-bold font-serif tracking-tight flex items-center gap-2">
            <span>{country.flag}</span>
            <span>{isEn ? country.nameEn : country.nameAr}</span>
          </span>
          <span className="text-xs uppercase font-mono tracking-widest text-gold-deep bg-[#1D2A24] px-3 py-1 rounded border border-gold-deep/20">
            {isEn ? "Target Nation" : "الوفد النظير"}
          </span>
        </div>
      </div>

      {/* Structured Comparison Metrics Stack */}
      <div className="space-y-4" id="comparison-rows-stack">
        {comparisonMetrics.map((metItem, idxKey) => (
          <div key={idxKey} className="bg-white rounded-sm border border-gold-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            
            {/* Metric title riband */}
            <div className="bg-gray-50/70 border-b border-gray-100 px-6 py-3 flex items-center gap-3">
              {metItem.icon}
              <span className="font-serif font-bold text-slate-vip text-sm md:text-base">
                {isEn ? metItem.labelEn : metItem.labelAr}
              </span>
            </div>

            {/* Side-by-side parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 text-sm">
              
              {/* UAE Value Card */}
              <div className="p-6 bg-emerald-deep/[0.01]">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-light font-bold mb-2">
                  <span>🇦🇪</span>
                  <span>{isEn ? "UAE INDEX INDICATOR" : "حصيلة دولة الإمارات"}</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-vip leading-relaxed">
                  {isEn ? metItem.uaeValue : metItem.uaeValueAr}
                </p>
              </div>

              {/* Target Country Value Card */}
              <div className="p-6 bg-slate-50/10">
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 font-bold mb-2">
                  <span>{country.flag}</span>
                  <span>{isEn ? `${country.nameEn.toUpperCase()} INDEX` : `نتيجة ${country.nameAr}`}</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-vip leading-relaxed">
                  {isEn ? metItem.countryValue : metItem.countryValueAr}
                </p>
              </div>

            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
