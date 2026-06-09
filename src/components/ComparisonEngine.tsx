import React, { useState } from "react";
import { PrebuiltCountry, UaeIndicator } from "../types";
import { 
  Scale, 
  BarChart3, 
  Table, 
  TrendingUp, 
  Zap, 
  HardHat, 
  Recycle, 
  Compass, 
  ArrowUpRight, 
  Globe2, 
  Award,
  Maximize2
} from "lucide-react";

interface ComparisonEngineProps {
  country: PrebuiltCountry;
  uaeData: UaeIndicator;
  language: "en" | "ar";
}

// Robust parsing utilities to convert string indices to reliable numbers for calculation
function extractGdpValue(gdpStr: string): number {
  if (!gdpStr) return 100;
  // Clean comma, brackets and currency symbols
  const cleaned = gdpStr.replace(/,/g, "").replace(/\([^)]*\)/g, "");
  // Look for decimals or integers
  const match = cleaned.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (match) {
    let numeric = parseFloat(match[1]);
    // If GDP is listed in Trillions rather than Billions, scale it
    if (cleaned.toLowerCase().includes("trillion") || cleaned.includes("ترليون")) {
      return numeric * 1000;
    }
    return numeric;
  }
  return 100;
}

function extractGrowthValue(growthStr: string): number {
  if (!growthStr) return 0;
  const match = growthStr.match(/(-?[0-9]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function extractInfrastructureScore(infraStr: string): number {
  if (!infraStr) return 50;
  const slashed = infraStr.split("/");
  if (slashed.length > 1) {
    const score = parseFloat(slashed[0].replace(/[^0-9.]/g, ""));
    return isNaN(score) ? 50 : score;
  }
  const score = parseFloat(infraStr.replace(/[^0-9.]/g, ""));
  if (!isNaN(score)) {
    if (score <= 10) return score * 10; // normalize 1-10 to 1-100 scale
    return score;
  }
  return 50;
}

function extractRankValue(rankStr: string): number {
  if (!rankStr) return 50;
  const match = rankStr.replace(/[^0-9]/g, "");
  if (match) {
    return parseInt(match, 10);
  }
  return 30; // default medium high for descriptions
}

// Extractor for complex Energy lists (e.g. "Natural Gas (55%), Solar & Clean Nuclear (42%)")
interface EnergySegment {
  nameEn: string;
  nameAr: string;
  percentage: number;
  color: string;
}

function parseEnergyMix(energyStr: string, isUae: boolean): EnergySegment[] {
  if (!energyStr) {
    return [
      { nameEn: "Renewables", nameAr: "مصادر متجددة", percentage: 50, color: "bg-[#D4AF37]" },
      { nameEn: "Fossils", nameAr: "مصادر تقليدية", percentage: 50, color: "bg-slate-vip" }
    ];
  }

  // Parse percentages dynamically
  const segments: EnergySegment[] = [];
  const parts = energyStr.split(",");
  
  const colorsPalette = [
    isUae ? "bg-emerald-deep" : "bg-slate-vip",
    "bg-[#C5A059]", // Gold
    "bg-[#1D322A]", // Dark Emerald
    "bg-amber-600",
    "bg-gray-400"
  ];

  parts.forEach((part, index) => {
    const pctMatch = part.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
    const pct = pctMatch ? parseFloat(pctMatch[1]) : 0;
    
    // Determine label
    let labelEn = "Fossil / Mixed";
    let labelAr = "هيدروكربونات / مختلط";
    
    const lower = part.toLowerCase();
    if (lower.includes("gas") || lower.includes("غاز")) {
      labelEn = "Natural Gas";
      labelAr = "غاز طبيعي";
    } else if (lower.includes("solar") || lower.includes("شمسية")) {
      labelEn = "Solar Clean Energy";
      labelAr = "طاقة شمسية نظيفة";
    } else if (lower.includes("nuclear") || lower.includes("نووية")) {
      labelEn = "Nuclear Clean Energy";
      labelAr = "طاقة نووية نظيفة";
    } else if (lower.includes("oil") || lower.includes("نفط")) {
      labelEn = "Petroleum Assets";
      labelAr = "نفط ومشتقاته";
    } else if (lower.includes("coal") || lower.includes("فحم")) {
      labelEn = "Clean Coal";
      labelAr = "فحم مستدام";
    } else if (lower.includes("wind") || lower.includes("رياح")) {
      labelEn = "Wind Energy";
      labelAr = "طاقة الرياح";
    } else {
      // Extract first two words for label fallback
      const cleanLabel = part.replace(/[0-9%()]/g, "").trim();
      labelEn = cleanLabel.split(" ").slice(0, 2).join(" ") || "Energy Core";
      labelAr = cleanLabel || "قطاع الطاقة";
    }

    if (pct > 0) {
      segments.push({
        nameEn: labelEn,
        nameAr: labelAr,
        percentage: pct,
        color: colorsPalette[index % colorsPalette.length]
      });
    }
  });

  if (segments.length === 0) {
    // If string has status descriptions without percentage figures
    return [
      { nameEn: "Transition Assets", nameAr: "أصول تحول الطاقة", percentage: 65, color: isUae ? "bg-emerald-deep" : "bg-slate-vip" },
      { nameEn: "Standby Capacity", nameAr: "الاحتياطي التشغيلي", percentage: 35, color: "bg-[#C5A059]" }
    ];
  }

  return segments;
}

export default function ComparisonEngine({ country, uaeData, language }: ComparisonEngineProps) {
  const isEn = language === "en";
  const [viewMode, setViewMode] = useState<"charts" | "table">("charts");
  const [activeHoverData, setActiveHoverData] = useState<string | null>(null);

  // Parsing values dynamically for high fidelity chart scaling
  const uaeGdp = extractGdpValue(uaeData.gdp);
  const targetGdp = extractGdpValue(country.indicators.gdp);
  const maxGdpValue = Math.max(uaeGdp, targetGdp, 100);

  const uaeGrowth = extractGrowthValue(uaeData.growth);
  const targetGrowth = extractGrowthValue(country.indicators.growth);

  const uaeInfra = extractInfrastructureScore(uaeData.infrastructureIndex);
  const targetInfra = extractInfrastructureScore(country.indicators.infrastructureIndex);

  const uaeCompetitivenessValue = extractRankValue(uaeData.competitivenessRank);
  const targetCompetitivenessValue = extractRankValue(country.indicators.competitivenessRank);

  const uaeEnergyMixSegments = parseEnergyMix(uaeData.energyMix, true);
  const targetEnergyMixSegments = parseEnergyMix(country.indicators.energyMix, false);

  const traditionalMetrics = [
    {
      labelEn: "Sovereign GDP Size (Market Value)",
      labelAr: "الناتج المحلي الإجمالي وحياد الأسواق",
      icon: <TrendingUp className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.gdp,
      uaeValueAr: uaeData.gdpAr,
      countryValue: country.indicators.gdp,
      countryValueAr: country.indicators.gdpAr,
    },
    {
      labelEn: "Annual Economic Growth Rate",
      labelAr: "معدل النمو الاقتصادي السنوي",
      icon: <ArrowUpRight className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.growth,
      uaeValueAr: uaeData.growth,
      countryValue: country.indicators.growth,
      countryValueAr: country.indicators.growth,
    },
    {
      labelEn: "Energy Grid Transition Mix",
      labelAr: "مصفوفة ومزيج الطاقة الوطني",
      icon: <Zap className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.energyMix,
      uaeValueAr: uaeData.energyMixAr,
      countryValue: country.indicators.energyMix,
      countryValueAr: country.indicators.energyMixAr,
    },
    {
      labelEn: "Infrastructure & Logistics Readiness Score",
      labelAr: "مؤشر جاهزية البنية التحتية والموانئ",
      icon: <HardHat className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.infrastructureIndex,
      uaeValueAr: uaeData.infrastructureIndexAr,
      countryValue: country.indicators.infrastructureIndex,
      countryValueAr: country.indicators.infrastructureIndex,
    },
    {
      labelEn: "Sustainability Horizon & Climate Focus",
      labelAr: "أهداف الاستدامة وترتيب الحفظ البيئي الدولي",
      icon: <Recycle className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.environmentalRank,
      uaeValueAr: uaeData.environmentalRankAr,
      countryValue: country.indicators.environmentalRank,
      countryValueAr: country.indicators.environmentalRank,
    },
    {
      labelEn: "Global Competitiveness Positioning",
      labelAr: "مستويات التنافسية والتمكين الاستثماري",
      icon: <Compass className="w-5 h-5 text-gold-deep" />,
      uaeValue: uaeData.competitivenessRank,
      uaeValueAr: uaeData.competitivenessRankAr,
      countryValue: country.indicators.competitivenessRank,
      countryValueAr: country.indicators.competitivenessRank,
    }
  ];

  return (
    <div className="space-y-6" id="country-comparison-engine-view">
      
      {/* Sovereign Scale Header Card */}
      <div className="bg-white rounded-sm shadow-md border-l-4 border-gold-deep p-6 md:p-8" id="comparison-banner-scale">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gold-bg border border-gold-border/60 text-gold-deep rounded-sm flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold font-mono text-emerald-deep tracking-wider uppercase block">
                {isEn ? "Sovereign Benchmarks Ratio" : "المقارنات الفيدرالية الثنائية"}
              </span>
              <h3 className="text-xl font-serif font-bold text-slate-vip mt-0.5">
                {isEn ? `Bilateral Comparative Dashboard: UAE vs ${country.nameEn}` : `لوحة المقارنة المتطورة: الإمارات ضد ${country.nameAr}`}
              </h3>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Display View Mode Switcher */}
            <div className="bg-gray-100 p-1 rounded-sm flex gap-1 border border-gray-200">
              <button
                onClick={() => setViewMode("charts")}
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "charts"
                    ? "bg-white text-slate-vip shadow-sm font-bold"
                    : "text-gray-500 hover:text-slate-vip"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{isEn ? "Visual Charts" : "مخططات بيانية"}</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-slate-vip shadow-sm font-bold"
                    : "text-gray-500 hover:text-slate-vip"
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-deep" />
                <span>{isEn ? "Briefing Table" : "جدول البيانات"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Head-to-Head Country Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="comparison-col-headers">
        {/* UAE Column */}
        <div className="bg-emerald-deep h-16 rounded-sm flex items-center justify-between px-6 text-white border-b-4 border-gold-deep shadow-md" id="col-uae-header">
          <span className="text-lg font-bold font-serif tracking-tight flex items-center gap-2.5">
            <span className="text-2xl">🇦🇪</span>
            <span>{isEn ? uaeData.nameEn : uaeData.nameAr}</span>
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#E5C179] bg-slate-vip/70 px-2.5 py-1 rounded border border--[#C5A059]/20">
            {isEn ? "Benchmark Host" : "الدولة المرجعية"}
          </span>
        </div>

        {/* Selected Country Column */}
        <div className="bg-slate-vip h-16 rounded-sm flex items-center justify-between px-6 text-white border-b-4 border-gold-deep shadow-md" id="col-target-header">
          <span className="text-lg font-bold font-serif tracking-tight flex items-center gap-2.5">
            <span className="text-2xl">{country.flag}</span>
            <span>{isEn ? country.nameEn : country.nameAr}</span>
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#E5C179] bg-[#121E1A] px-2.5 py-1 rounded border border-[#C5A059]/20">
            {isEn ? "Target Nation" : "الوفد النظير"}
          </span>
        </div>
      </div>

      {viewMode === "charts" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="comparison-visual-charts-grid">
          
          {/* Chart 1: Sovereign Economic Scale Comparison */}
          <div 
            className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            onMouseEnter={() => setActiveHoverData("gdp")}
            onMouseLeave={() => setActiveHoverData(null)}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "GDP Economic Size (Volume Comparison)" : "حجم الناتج المحلي الإجمالي الاسمي الثنائي"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">USD Billion</span>
              </div>

              {/* Chart Visual Section */}
              <div className="space-y-5 h-44 flex flex-col justify-center">
                {/* UAE GDP Column Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-semibold text-slate-700">
                    <span className="flex items-center gap-1">🇦🇪 {isEn ? "UAE" : "الإمارات"}</span>
                    <span className="font-mono text-emerald-deep font-extrabold">{uaeData.gdp}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-6 rounded-md overflow-hidden p-0.5 border border-gray-200">
                    <div 
                      className="bg-gradient-to-r from-emerald-deep to-emerald-light h-full rounded transition-all duration-1000 ease-out flex items-center justify-end px-2"
                      style={{ width: `${Math.max(12, (uaeGdp / maxGdpValue) * 100)}%` }}
                    >
                      <span className="text-[10px] font-mono font-bold text-white text-[9px]">
                        {Math.round((uaeGdp / maxGdpValue) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Country GDP Column Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-semibold text-slate-700">
                    <span className="flex items-center gap-1">{country.flag} {isEn ? country.nameEn : country.nameAr}</span>
                    <span className="font-mono text-slate-800 font-extrabold">{country.indicators.gdp}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-6 rounded-md overflow-hidden p-0.5 border border-gray-200">
                    <div 
                      className="bg-gradient-to-r from-slate-vip to-slate-800 h-full rounded transition-all duration-1000 ease-out flex items-center justify-end px-2"
                      style={{ width: `${Math.max(12, (targetGdp / maxGdpValue) * 100)}%` }}
                    >
                      <span className="text-[10px] font-mono font-bold text-[#E5C179] text-[9px]">
                        {Math.round((targetGdp / maxGdpValue) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-2 border-t border-gray-100 pt-3 flex items-center gap-1 bg-gold-bg/10 p-2 rounded">
              <span className="font-bold text-[#C5A059]">ℹ️ Ratio:</span> 
              {uaeGdp > targetGdp 
                ? (isEn 
                  ? `UAE GDP is ${((uaeGdp / (targetGdp || 1))).toFixed(1)}x larger than the peer national index.`
                  : `الناتج المحلي لدولة الإمارات أكبر بمقدار ${((uaeGdp / (targetGdp || 1))).toFixed(1)} أضعاف الناتج النظير.`)
                : (isEn 
                  ? `${country.nameEn} occupies a heavier economic scale (~${((targetGdp / (uaeGdp || 1))).toFixed(1)}x larger than UAE).`
                  : `تشغل ${country.nameAr} نطاقاً اقتصادياً أثقل حجماً بنسبة تُقدّر بنحو ${((targetGdp / (uaeGdp || 1))).toFixed(1)} أضعاف حجم الاقتصاد الإماراتي.`)}
            </p>
          </div>

          {/* Chart 2: Annual GDP Growth Rate Accelerator */}
          <div 
            className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            onMouseEnter={() => setActiveHoverData("growth")}
            onMouseLeave={() => setActiveHoverData(null)}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "Annual GDP Growth Vector" : "مؤشر سرعة النمو الاقتصادي السنوي"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-emerald-light bg-emerald-deep font-bold px-2 py-0.5 rounded">% Growth</span>
              </div>

              {/* Chart Visual Section */}
              <div className="flex justify-around items-center h-44">
                
                {/* UAE Concentric Ring Meter */}
                <div className="flex flex-col items-center">
                  <div className="relative h-24 w-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="38" stroke="#F1F5F9" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="38" 
                        stroke="#0D4C3A" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(10, Math.max(0, uaeGrowth)) / 10)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col justify-center items-center">
                      <span className="text-xl font-bold font-mono text-emerald-deep">{uaeGrowth}%</span>
                      <span className="text-[9px] text-gray-500 font-bold">🇦🇪 UAE</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono mt-2 bg-emerald-light/10 text-emerald-deep px-2 py-0.5 rounded font-extrabold uppercase">
                    {isEn ? "Accelerated" : "نشط"}
                  </span>
                </div>

                {/* Target Country Concentric Ring Meter */}
                <div className="flex flex-col items-center">
                  <div className="relative h-24 w-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="38" stroke="#F1F5F9" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="38" 
                        stroke="#C5A059" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(10, Math.max(0, targetGrowth)) / 10)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col justify-center items-center">
                      <span className="text-xl font-bold font-mono text-slate-vip">{targetGrowth}%</span>
                      <span className="text-[9px] text-gray-500 font-bold">{country.flag} {country.nameEn}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono mt-2 px-2 py-0.5 rounded font-extrabold uppercase ${
                    targetGrowth > 2 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                  }`}>
                    {targetGrowth > 2 ? (isEn ? "Expanding" : "توسع") : (isEn ? "Steady" : "مستقر")}
                  </span>
                </div>

              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-2 border-t border-gray-100 pt-3 flex items-center gap-1 bg-gold-bg/10 p-2 rounded">
              <span className="font-bold text-[#C5A059]">⚡ Comparative Pace:</span>
              {uaeGrowth > targetGrowth 
                ? (isEn 
                  ? `UAE GDP speed leads by a vector of +${(uaeGrowth - targetGrowth).toFixed(1)}% annual rate.`
                  : `النشاط الاقتصادي الإماراتي يتصدر بمعدل تصاعدي يوازي +${(uaeGrowth - targetGrowth).toFixed(1)}% سنويّاً.`)
                : (isEn 
                  ? `Peer delegation features active target growth delta (+${(targetGrowth - uaeGrowth).toFixed(1)}% vs UAE).`
                  : `تمتلك الدولة المستهدفة فارق نمو متسارع يُقدّر بنحو +${(targetGrowth - uaeGrowth).toFixed(1)}% مقارنةً بدولة الإمارات.`)}
            </p>
          </div>

          {/* Chart 3: Infrastructure Readiness Horizon */}
          <div 
            className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            onMouseEnter={() => setActiveHoverData("infra")}
            onMouseLeave={() => setActiveHoverData(null)}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm">
                    <HardHat className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "Infrastructure & Logistical Connectivity" : "مؤشر جاهزية البنية التحتية والشبكة الملاحية"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Index Score / 100</span>
              </div>

              {/* Chart Visual Section */}
              <div className="space-y-6 h-44 flex flex-col justify-center">
                {/* Dual Horizontal Sliding Bars */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1">🇦🇪 {isEn ? "UAE Logistical Hub" : "الإمارات اللوجستية"}</span>
                    <span className="font-mono text-emerald-deep font-extrabold">{uaeInfra}/100</span>
                  </div>
                  <div className="relative w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5 border border-gray-200">
                    <div 
                      className="bg-gradient-to-r from-[#033425] to-emerald-light h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${uaeInfra}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 font-semibold block mt-1 line-clamp-1">
                    {isEn ? uaeData.infrastructureIndex : uaeData.infrastructureIndexAr}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1">{country.flag} {isEn ? `${country.nameEn} Grid` : `بنية ${country.nameAr}`}</span>
                    <span className="font-mono text-slate-800 font-extrabold">{targetInfra}/100</span>
                  </div>
                  <div className="relative w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5 border border-gray-200">
                    <div 
                      className="bg-gradient-to-r from-[#172520] to-[#C5A059] h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${targetInfra}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 block mt-1 line-clamp-1">
                    {isEn ? country.indicators.infrastructureIndex : country.indicators.infrastructureIndex}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-2 border-t border-gray-100 pt-3 flex items-center gap-1 bg-gold-bg/10 p-2 rounded">
              <span className="font-bold text-[#C5A059]">👑 Status:</span>
              {uaeInfra >= targetInfra 
                ? (isEn 
                  ? "UAE maintains highly optimized ports/road framework for high-efficiency sovereign exports."
                  : "تحتفظ دولة الإمارات بمستوى ريادي مطلق وبنية متكاملة تُسهل سلاسل الإمداد الثنائية.")
                : (isEn 
                  ? `${country.nameEn} holds structural excellence in complex logistic corridors.`
                  : `تتمتع ${country.nameAr} بكفاءة عالية في هيكل الممرات اللوجستية.`)}
            </p>
          </div>

          {/* Chart 4: Segmented Energy Transition Stack */}
          <div 
            className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            onMouseEnter={() => setActiveHoverData("energy")}
            onMouseLeave={() => setActiveHoverData(null)}
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm">
                    <Zap className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "Energy Grid Matrices Comparison" : "خارطة توزيع ومزيج مصادر الطاقة النظيفة"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-emerald-light bg-emerald-deep font-bold px-2 py-0.5 rounded">Stacked Fuel %</span>
              </div>

              {/* Chart Visual Section */}
              <div className="space-y-5 h-44 flex flex-col justify-center">
                {/* Stacked indicator bars */}
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">🇦🇪 {isEn ? "UAE Hybrid Matrix Grid" : "مزيج دولة الإمارات الهجين"}</span>
                  <div className="w-full h-5 rounded overflow-hidden flex shadow-inner border border-gray-200">
                    {uaeEnergyMixSegments.map((seg, sIdx) => (
                      <div 
                        key={sIdx} 
                        className={`h-full ${seg.color} transition-all relative group flex items-center justify-center`}
                        style={{ width: `${seg.percentage}%` }}
                        title={`${isEn ? seg.nameEn : seg.nameAr}: ${seg.percentage}%`}
                      >
                        <span className="text-[8px] font-mono text-white font-black truncate px-0.5">
                          {seg.percentage >= 15 ? `${seg.percentage}%` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Legend mini */}
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 font-mono text-[9px] text-gray-500">
                    {uaeEnergyMixSegments.map((seg, sIdx) => (
                      <span key={sIdx} className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${seg.color}`}></span>
                        <span>{isEn ? seg.nameEn : seg.nameAr}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">{country.flag} {isEn ? `${country.nameEn} Fuel Index` : `مزيج وملف ${country.nameAr}`}</span>
                  <div className="w-full h-5 rounded overflow-hidden flex shadow-inner border border-gray-200">
                    {targetEnergyMixSegments.map((seg, sIdx) => (
                      <div 
                        key={sIdx} 
                        className={`h-full ${seg.color} transition-all relative group flex items-center justify-center`}
                        style={{ width: `${seg.percentage}%` }}
                        title={`${isEn ? seg.nameEn : seg.nameAr}: ${seg.percentage}%`}
                      >
                        <span className="text-[8px] font-mono text-white font-black truncate px-0.5">
                          {seg.percentage >= 15 ? `${seg.percentage}%` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 font-mono text-[9px] text-gray-500">
                    {targetEnergyMixSegments.map((seg, sIdx) => (
                      <span key={sIdx} className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${seg.color}`}></span>
                        <span>{isEn ? seg.nameEn : seg.nameAr}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-2 border-t border-gray-100 pt-3 flex items-center gap-1 bg-gold-bg/10 p-2 rounded">
              <span className="font-bold text-[#C5A059]">🤝 Synergy Vector:</span>
              {isEn 
                ? "Excellent potential for technological transfer in net-zero infrastructure & utility decarbonization pacts."
                : "فرص واعدة لنقل المعرفة التقنية والخبرات في مجال الطاقة النووية ومشاريع الطاقة الشمسية الذكية."}
            </p>
          </div>

          {/* Chart 5: Global Competitiveness Inverted Podium */}
          <div 
            className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between lg:col-span-2"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm">
                    <Compass className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "Global Competitiveness Rank Distribution" : "توزيع وترتيب الميزة التنافسية العالمية"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded font-bold">Inverted Target (Lower is Superior)</span>
              </div>

              {/* Chart Visual Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-auto md:h-36 py-2">
                {/* Left Side: Text and values */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-deep flex items-center justify-center text-white font-serif font-bold text-sm">
                      1st
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">{isEn ? "Goal Horizon" : "الأفق المستهدف"}</span>
                      <span className="text-xs font-bold text-emerald-deep font-sans">
                        {isEn ? "Rank #1 Gold Medalist Center" : "المرتبة الأولى كمركز ريادي ذهبي"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-emerald-deep/5 rounded border border-emerald-deep/10">
                      <span className="text-gray-500 block text-[10px]">🇦🇪 {isEn ? "UAE Rank" : "الترتيب الفيدرالي"}</span>
                      <span className="font-serif font-bold text-slate-vip text-sm mt-1 block">
                        {isEn ? uaeData.competitivenessRank : uaeData.competitivenessRankAr}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded border border-gray-100">
                      <span className="text-gray-500 block text-[10px]">{country.flag} {isEn ? `${country.nameEn} Rank` : `ترتيب ${country.nameEn}`}</span>
                      <span className="font-serif font-bold text-slate-vip text-sm mt-1 block">
                        {isEn ? country.indicators.competitivenessRank : country.indicators.competitivenessRank}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Simple Podium block diagram */}
                <div className="flex justify-center items-end h-full gap-2 pt-6">
                  {/* Target nation column block */}
                  <div className="flex flex-col items-center w-24">
                    <span className="text-xs font-bold text-slate-vip pb-1 font-mono">{targetCompetitivenessValue}</span>
                    <div 
                      className="w-full bg-slate-vip rounded-t-sm transition-all duration-1000 ease-out flex items-center justify-center text-[#E5C179] font-bold text-[10px]"
                      style={{ height: `${Math.max(25, 100 - targetCompetitivenessValue)}px` }}
                    >
                      {country.flag}
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 mt-1 truncate max-w-full">{country.nameEn}</span>
                  </div>

                  {/* King's Podium Spot (UAE) */}
                  <div className="flex flex-col items-center w-24">
                    <span className="text-xs font-bold text-emerald-deep pb-1 font-mono">
                      {uaeCompetitivenessValue}
                    </span>
                    <div 
                      className="w-full bg-[#0E4637] rounded-t-sm transition-all duration-1000 ease-out border-t-2 border-[#C5A059] flex flex-col items-center justify-center text-white"
                      style={{ height: `${Math.max(45, 100 - uaeCompetitivenessValue)}px` }}
                    >
                      <Award className="w-3.5 h-3.5 text-gold-deep animate-bounce mt-1" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 mt-1">🇦🇪 UAE</span>
                  </div>

                  {/* High Benchmark Line representation */}
                  <div className="flex flex-col items-center w-24">
                    <span className="text-xs font-bold text-gray-400 pb-1 font-mono">1</span>
                    <div className="w-full bg-gold-bg/30 rounded-t-sm h-32 border-x border-t border-gold-deep/20 border-dashed flex items-center justify-center text-gold-deep font-sans font-bold text-[10px]">
                      👑
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 mt-1">{isEn ? "Global Top 1" : "الصدارة"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Tabular Fallback View */
        <div className="space-y-4 animate-in fade-in duration-300" id="comparison-rows-stack">
          {traditionalMetrics.map((metItem, idxKey) => (
            <div key={idxKey} className="bg-white rounded-sm border border-gold-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              
              {/* Metric Title Riband */}
              <div className="bg-gray-50/70 border-b border-gray-100 px-6 py-3 flex items-center gap-3">
                {metItem.icon}
                <span className="font-serif font-bold text-slate-vip text-sm md:text-base">
                  {isEn ? metItem.labelEn : metItem.labelAr}
                </span>
              </div>

              {/* Side-by-side comparative parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 text-sm">
                
                {/* UAE Index Value Spot */}
                <div className="p-6 bg-emerald-deep/[0.01]">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-light font-bold mb-2">
                    <span>🇦🇪</span>
                    <span>{isEn ? "UAE INDEX INDICATOR" : "حصيلة دولة الإمارات"}</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-[#0E4637] leading-relaxed">
                    {isEn ? metItem.uaeValue : metItem.uaeValueAr}
                  </p>
                </div>

                {/* Target Delegation Value Spot */}
                <div className="p-6 bg-slate-50/10">
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400 font-bold mb-2">
                    <span>{country.flag}</span>
                    <span>{isEn ? `${country.nameEn.toUpperCase()} INDEX` : `نتيجة ${country.nameAr}`}</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed">
                    {isEn ? metItem.countryValue : metItem.countryValueAr}
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

