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
  Award,
  Download
} from "lucide-react";
import CountryFlag from "./CountryFlag";

interface ComparisonEngineProps {
  country: PrebuiltCountry;
  countries?: PrebuiltCountry[];
  uaeData: UaeIndicator;
  language: "en" | "ar";
}

interface EnergySegment {
  nameEn: string;
  nameAr: string;
  percentage: number;
  color: string;
}

interface ComparisonRow {
  key: string;
  nameEn: string;
  nameAr: string;
  shortNameEn: string;
  shortNameAr: string;
  flag?: string;
  flagUrl?: string;
  country?: PrebuiltCountry;
  gdp: number | null;
  gdpLabel: string;
  growth: number;
  infra: number;
  competitivenessValue: number;
  competitivenessLabelEn: string;
  competitivenessLabelAr: string;
  energySegments: EnergySegment[];
  barClass: string;
  headerClass: string;
  ringColor: string;
  valueClass: string;
  isUae: boolean;
}

const targetStylePalette = [
  {
    barClass: "bg-gradient-to-r from-slate-vip to-slate-800",
    headerClass: "bg-slate-vip",
    ringColor: "#C5A059",
    valueClass: "text-slate-800",
  },
  {
    barClass: "bg-gradient-to-r from-[#6B5E2E] to-[#C5A059]",
    headerClass: "bg-[#6B5E2E]",
    ringColor: "#6B5E2E",
    valueClass: "text-[#6B5E2E]",
  },
  {
    barClass: "bg-gradient-to-r from-[#294B63] to-[#3B82F6]",
    headerClass: "bg-[#294B63]",
    ringColor: "#294B63",
    valueClass: "text-[#294B63]",
  },
  {
    barClass: "bg-gradient-to-r from-[#5B4B63] to-[#A855F7]",
    headerClass: "bg-[#5B4B63]",
    ringColor: "#5B4B63",
    valueClass: "text-[#5B4B63]",
  },
  {
    barClass: "bg-gradient-to-r from-[#7C2D12] to-[#EA580C]",
    headerClass: "bg-[#7C2D12]",
    ringColor: "#7C2D12",
    valueClass: "text-[#7C2D12]",
  },
];

function escapeHtml(value: string | number | null | undefined): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value ?? "").replace(/[&<>"']/g, (char) => replacements[char]);
}

function isPlaceholderGdpValue(gdpStr: string): boolean {
  const normalized = (gdpStr || "").toLowerCase();
  return (
    !normalized.trim() ||
    normalized.includes("dynamic evaluation") ||
    normalized.includes("under review") ||
    normalized.includes("قيد التقييم")
  );
}

function extractGdpValue(gdpStr: string): number | null {
  if (!gdpStr || isPlaceholderGdpValue(gdpStr)) return null;
  const cleaned = gdpStr.replace(/,/g, "").replace(/\([^)]*\)/g, "");
  const match = cleaned.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;

  const numeric = parseFloat(match[1]);
  if (cleaned.toLowerCase().includes("trillion") || cleaned.includes("ترليون")) {
    return numeric * 1000;
  }
  return numeric;
}

function formatParsedGdpValue(gdpValue: number | null, fallbackLabel: string, isEn: boolean): string {
  if (!isPlaceholderGdpValue(fallbackLabel)) {
    return fallbackLabel;
  }

  if (gdpValue === null) {
    return isEn ? "GDP data unavailable" : "بيانات الناتج المحلي غير متوفرة";
  }

  return `$${gdpValue.toLocaleString("en-US", {
    maximumFractionDigits: gdpValue >= 100 ? 1 : 2,
  })} Billion USD`;
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
    if (score <= 10) return score * 10;
    return score;
  }
  return 50;
}

function extractRankValue(rankStr: string): number {
  if (!rankStr) return 50;
  const match = rankStr.replace(/[^0-9]/g, "");
  return match ? parseInt(match, 10) : 30;
}

function parseEnergyMix(energyStr: string, isUae: boolean): EnergySegment[] {
  if (!energyStr) {
    return [
      { nameEn: "Renewables", nameAr: "مصادر متجددة", percentage: 50, color: "bg-[#D4AF37]" },
      { nameEn: "Fossils", nameAr: "مصادر تقليدية", percentage: 50, color: "bg-slate-vip" }
    ];
  }

  const segments: EnergySegment[] = [];
  const parts = energyStr.split(",");
  const colorsPalette = [
    isUae ? "bg-emerald-deep" : "bg-slate-vip",
    "bg-[#C5A059]",
    "bg-[#1D322A]",
    "bg-amber-600",
    "bg-gray-400"
  ];

  parts.forEach((part, index) => {
    const pctMatch = part.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
    const pct = pctMatch ? parseFloat(pctMatch[1]) : 0;
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
    return [
      { nameEn: "Transition Assets", nameAr: "أصول تحول الطاقة", percentage: 65, color: isUae ? "bg-emerald-deep" : "bg-slate-vip" },
      { nameEn: "Standby Capacity", nameAr: "الاحتياطي التشغيلي", percentage: 35, color: "bg-[#C5A059]" }
    ];
  }

  return segments;
}

function dedupeCountries(countries: PrebuiltCountry[]): PrebuiltCountry[] {
  return Array.from(new Map(countries.map((item) => [item.id, item])).values());
}

export default function ComparisonEngine({ country, countries, uaeData, language }: ComparisonEngineProps) {
  const isEn = language === "en";
  const [viewMode, setViewMode] = useState<"charts" | "table">("charts");
  const targetCountries = dedupeCountries((countries && countries.length > 0 ? countries : [country]).filter(Boolean));
  const primaryCountry = targetCountries[0] || country;
  const isMultiCountry = targetCountries.length > 1;

  const uaeGdp = extractGdpValue(uaeData.gdp);
  const uaeRow: ComparisonRow = {
    key: "uae",
    nameEn: uaeData.nameEn,
    nameAr: uaeData.nameAr,
    shortNameEn: "UAE",
    shortNameAr: "الإمارات",
    flag: uaeData.flag,
    gdp: uaeGdp,
    gdpLabel: formatParsedGdpValue(uaeGdp, isEn ? uaeData.gdp : uaeData.gdpAr, isEn),
    growth: extractGrowthValue(uaeData.growth),
    infra: extractInfrastructureScore(uaeData.infrastructureIndex),
    competitivenessValue: extractRankValue(uaeData.competitivenessRank),
    competitivenessLabelEn: uaeData.competitivenessRank,
    competitivenessLabelAr: uaeData.competitivenessRankAr,
    energySegments: parseEnergyMix(uaeData.energyMix, true),
    barClass: "bg-gradient-to-r from-emerald-deep to-emerald-light",
    headerClass: "bg-emerald-deep",
    ringColor: "#0D4C3A",
    valueClass: "text-emerald-deep",
    isUae: true,
  };

  const targetRows: ComparisonRow[] = targetCountries.map((targetCountry, index) => {
    const style = targetStylePalette[index % targetStylePalette.length];
    const gdp = extractGdpValue(targetCountry.indicators.gdp);
    return {
      key: targetCountry.id,
      nameEn: targetCountry.nameEn,
      nameAr: targetCountry.nameAr,
      shortNameEn: targetCountry.nameEn,
      shortNameAr: targetCountry.nameAr,
      flag: targetCountry.flag,
      flagUrl: targetCountry.flagUrl,
      country: targetCountry,
      gdp,
      gdpLabel: formatParsedGdpValue(gdp, isEn ? targetCountry.indicators.gdp : targetCountry.indicators.gdpAr, isEn),
      growth: extractGrowthValue(targetCountry.indicators.growth),
      infra: extractInfrastructureScore(targetCountry.indicators.infrastructureIndex),
      competitivenessValue: extractRankValue(targetCountry.indicators.competitivenessRank),
      competitivenessLabelEn: targetCountry.indicators.competitivenessRank,
      competitivenessLabelAr: targetCountry.indicators.competitivenessRank,
      energySegments: parseEnergyMix(targetCountry.indicators.energyMix, false),
      barClass: style.barClass,
      headerClass: style.headerClass,
      ringColor: style.ringColor,
      valueClass: style.valueClass,
      isUae: false,
    };
  });

  const comparisonRows = [uaeRow, ...targetRows];
  const maxGdpValue = Math.max(...comparisonRows.map((row) => row.gdp || 0), 100);
  const highestGrowthRow = comparisonRows.reduce((highest, row) => row.growth > highest.growth ? row : highest, comparisonRows[0]);
  const strongestInfraRow = comparisonRows.reduce((strongest, row) => row.infra > strongest.infra ? row : strongest, comparisonRows[0]);
  const competitivenessRows = [...comparisonRows].sort((first, second) => first.competitivenessValue - second.competitivenessValue);

  const renderMarker = (row: ComparisonRow, size: "xs" | "sm" | "md" = "sm") => (
    row.country ? (
      <CountryFlag flag={row.flag} flagUrl={row.flagUrl} countryName={isEn ? row.nameEn : row.nameAr} size={size} />
    ) : (
      <span className={size === "md" ? "text-2xl" : size === "sm" ? "text-base" : "text-xs"}>{row.flag || "🇦🇪"}</span>
    )
  );

  const rowName = (row: ComparisonRow) => isEn ? row.nameEn : row.nameAr;
  const rowShortName = (row: ComparisonRow) => isEn ? row.shortNameEn : row.shortNameAr;

  const traditionalMetrics = [
    {
      labelEn: "Sovereign GDP Size (Market Value)",
      labelAr: "الناتج المحلي الإجمالي وحياد الأسواق",
      icon: <TrendingUp className="w-5 h-5 text-gold-deep" />,
      getUaeValue: () => isEn ? uaeData.gdp : uaeData.gdpAr,
      getCountryValue: (targetCountry: PrebuiltCountry) => isEn ? targetCountry.indicators.gdp : targetCountry.indicators.gdpAr,
    },
    {
      labelEn: "Annual Economic Growth Rate",
      labelAr: "معدل النمو الاقتصادي السنوي",
      icon: <ArrowUpRight className="w-5 h-5 text-gold-deep" />,
      getUaeValue: () => uaeData.growth,
      getCountryValue: (targetCountry: PrebuiltCountry) => targetCountry.indicators.growth,
    },
    {
      labelEn: "Energy Grid Transition Mix",
      labelAr: "مصفوفة ومزيج الطاقة الوطني",
      icon: <Zap className="w-5 h-5 text-gold-deep" />,
      getUaeValue: () => isEn ? uaeData.energyMix : uaeData.energyMixAr,
      getCountryValue: (targetCountry: PrebuiltCountry) => isEn ? targetCountry.indicators.energyMix : targetCountry.indicators.energyMixAr,
    },
    {
      labelEn: "Infrastructure & Logistics Readiness Score",
      labelAr: "مؤشر جاهزية البنية التحتية والموانئ",
      icon: <HardHat className="w-5 h-5 text-gold-deep" />,
      getUaeValue: () => isEn ? uaeData.infrastructureIndex : uaeData.infrastructureIndexAr,
      getCountryValue: (targetCountry: PrebuiltCountry) => targetCountry.indicators.infrastructureIndex,
    },
    {
      labelEn: "Sustainability Horizon & Climate Focus",
      labelAr: "أهداف الاستدامة وترتيب الحفظ البيئي الدولي",
      icon: <Recycle className="w-5 h-5 text-gold-deep" />,
      getUaeValue: () => isEn ? uaeData.environmentalRank : uaeData.environmentalRankAr,
      getCountryValue: (targetCountry: PrebuiltCountry) => targetCountry.indicators.environmentalRank,
    },
    {
      labelEn: "Global Competitiveness Positioning",
      labelAr: "مستويات التنافسية والتمكين الاستثماري",
      icon: <Compass className="w-5 h-5 text-gold-deep" />,
      getUaeValue: () => isEn ? uaeData.competitivenessRank : uaeData.competitivenessRankAr,
      getCountryValue: (targetCountry: PrebuiltCountry) => targetCountry.indicators.competitivenessRank,
    }
  ];

  const handleDownloadPdf = () => {
    const generatedOn = new Date().toLocaleDateString(isEn ? "en-GB" : "ar-AE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const uaeCountryName = isEn ? uaeData.nameEn : uaeData.nameAr;
    const targetHeaderCells = targetCountries
      .map((targetCountry) => `<th>${escapeHtml(isEn ? targetCountry.nameEn : targetCountry.nameAr)}</th>`)
      .join("");
    const summaryItems = [
      {
        label: isEn ? "GDP scale" : "حجم الناتج المحلي",
        uaeValue: uaeRow.gdpLabel,
        getTargetValue: (row: ComparisonRow) => row.gdpLabel,
      },
      {
        label: isEn ? "Annual growth" : "النمو السنوي",
        uaeValue: `${uaeRow.growth}%`,
        getTargetValue: (row: ComparisonRow) => `${row.growth}%`,
      },
      {
        label: isEn ? "Infrastructure score" : "مؤشر البنية التحتية",
        uaeValue: `${uaeRow.infra}/100`,
        getTargetValue: (row: ComparisonRow) => `${row.infra}/100`,
      },
      {
        label: isEn ? "Competitiveness rank" : "ترتيب التنافسية",
        uaeValue: isEn ? uaeData.competitivenessRank : uaeData.competitivenessRankAr,
        getTargetValue: (row: ComparisonRow) => isEn ? row.competitivenessLabelEn : row.competitivenessLabelAr,
      },
    ];
    const summaryRows = summaryItems
      .map((item) => `
        <tr>
          <th>${escapeHtml(item.label)}</th>
          <td>${escapeHtml(item.uaeValue)}</td>
          ${targetRows.map((row) => `<td>${escapeHtml(item.getTargetValue(row))}</td>`).join("")}
        </tr>
      `)
      .join("");
    const metricRows = traditionalMetrics
      .map((metric) => `
        <tr>
          <th>${escapeHtml(isEn ? metric.labelEn : metric.labelAr)}</th>
          <td>${escapeHtml(metric.getUaeValue())}</td>
          ${targetCountries.map((targetCountry) => `<td>${escapeHtml(metric.getCountryValue(targetCountry))}</td>`).join("")}
        </tr>
      `)
      .join("");
    const targetTitle = isMultiCountry
      ? targetCountries.map((targetCountry) => isEn ? targetCountry.nameEn : targetCountry.nameAr).join(", ")
      : isEn ? primaryCountry.nameEn : primaryCountry.nameAr;
    const printHtml = `
      <!doctype html>
      <html lang="${isEn ? "en" : "ar"}" dir="${isEn ? "ltr" : "rtl"}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(isEn ? `UAE Sovereign Comparison - ${targetTitle}` : `مقارنة الإمارات - ${targetTitle}`)}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #ffffff;
              color: #172520;
              font-family: Inter, Arial, sans-serif;
              font-size: 11px;
              line-height: 1.45;
            }
            .report-header {
              border-left: 5px solid #C5A059;
              padding: 16px 18px;
              background: #F8FAFC;
              margin-bottom: 14px;
            }
            [dir="rtl"] .report-header {
              border-left: 0;
              border-right: 5px solid #C5A059;
            }
            .eyebrow {
              color: #0D4C3A;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }
            h1 {
              margin: 6px 0 8px;
              font-size: 22px;
              line-height: 1.2;
              color: #172520;
            }
            .meta {
              color: #64748B;
              font-size: 10px;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
              page-break-inside: auto;
            }
            th,
            td {
              border: 1px solid #D8E0EF;
              padding: 8px;
              text-align: start;
              vertical-align: top;
            }
            thead th {
              background: #0D4C3A;
              color: #FFFFFF;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.06em;
            }
            tbody th {
              min-width: 170px;
              background: #F8FAFC;
              color: #172520;
            }
            tr {
              break-inside: avoid;
            }
            .section-title {
              margin: 14px 0 6px;
              color: #0D4C3A;
              font-size: 12px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.06em;
            }
            .footer {
              margin-top: 14px;
              padding-top: 10px;
              border-top: 1px solid #D8E0EF;
              color: #64748B;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <main>
            <section class="report-header">
              <div class="eyebrow">${escapeHtml(isEn ? "Sovereign Comparison Export" : "تصدير المقارنة السيادية")}</div>
              <h1>${escapeHtml(isEn ? `UAE vs ${targetTitle}` : `الإمارات و${targetTitle}`)}</h1>
              <div class="meta">${escapeHtml(isEn ? `${targetCountries.length} peer countries - Generated ${generatedOn}` : `${targetCountries.length} دول مقارنة - تم الإنشاء في ${generatedOn}`)}</div>
            </section>

            <div class="section-title">${escapeHtml(isEn ? "Executive metric summary" : "ملخص المؤشرات القيادية")}</div>
            <table>
              <thead>
                <tr>
                  <th>${escapeHtml(isEn ? "Benchmark" : "المعيار")}</th>
                  <th>${escapeHtml(uaeCountryName)}</th>
                  ${targetHeaderCells}
                </tr>
              </thead>
              <tbody>${summaryRows}</tbody>
            </table>

            <div class="section-title">${escapeHtml(isEn ? "Full sovereign comparison matrix" : "مصفوفة المقارنة السيادية الكاملة")}</div>
            <table>
              <thead>
                <tr>
                  <th>${escapeHtml(isEn ? "Indicator" : "المؤشر")}</th>
                  <th>${escapeHtml(uaeCountryName)}</th>
                  ${targetHeaderCells}
                </tr>
              </thead>
              <tbody>${metricRows}</tbody>
            </table>

            <div class="footer">${escapeHtml(isEn ? "UAE Digital Strategic Advisor - Sovereign comparison report" : "المستشار الاستراتيجي الرقمي لدولة الإمارات - تقرير المقارنة السيادية")}</div>
          </main>
          <script>
            window.addEventListener("load", () => {
              setTimeout(() => window.print(), 250);
            });
          </script>
        </body>
      </html>
    `;
    const printFrame = document.createElement("iframe");
    printFrame.title = isEn ? "Sovereign comparison PDF export" : "تصدير المقارنة السيادية";
    printFrame.style.position = "fixed";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";
    printFrame.style.pointerEvents = "none";
    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    const printDocument = printWindow?.document;
    if (!printWindow || !printDocument) {
      printFrame.remove();
      window.print();
      return;
    }

    const cleanup = () => {
      setTimeout(() => printFrame.remove(), 500);
    };
    printWindow.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 15000);

    printDocument.open();
    printDocument.write(printHtml);
    printDocument.close();
  };

  return (
    <div className="space-y-6" id="country-comparison-engine-view">
      <div className="bg-white rounded-sm shadow-md border-l-4 border-gold-deep p-6 md:p-8" id="comparison-banner-scale">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 bg-gold-bg border border-gold-border/60 text-gold-deep rounded-sm flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold font-mono text-emerald-deep tracking-wider uppercase block">
                {isEn ? "Sovereign Benchmarks Ratio" : "المقارنات الفيدرالية الثنائية"}
              </span>
              <h3 className="text-xl font-serif font-bold text-slate-vip mt-0.5">
                {isMultiCountry
                  ? isEn
                    ? `Multi-Country Comparative Dashboard: UAE + ${targetCountries.length} Peers`
                    : `لوحة مقارنة متعددة الدول: الإمارات + ${targetCountries.length} دول`
                  : isEn
                    ? `Bilateral Comparative Dashboard: UAE vs ${primaryCountry.nameEn}`
                    : `لوحة المقارنة المتطورة: الإمارات ضد ${primaryCountry.nameAr}`}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-start lg:justify-end">
            <button
              type="button"
              onClick={handleDownloadPdf}
              title={isEn ? "Save comparison as PDF" : "حفظ المقارنة بصيغة PDF"}
              aria-label={isEn ? "Save comparison as PDF" : "حفظ المقارنة بصيغة PDF"}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-gold-border bg-white px-2.5 text-xs font-extrabold text-emerald-deep shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-deep hover:shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <div className="bg-gray-100 p-1 rounded-sm flex gap-1 border border-gray-200">
              <button
                type="button"
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
                type="button"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" id="comparison-country-roster">
        {comparisonRows.map((row, index) => (
          <div
            key={row.key}
            className={`${row.headerClass} min-h-16 rounded-sm flex items-center justify-between gap-3 px-4 text-white border-b-4 border-gold-deep shadow-md`}
          >
            <span className="text-sm font-bold font-serif tracking-tight flex items-center gap-2.5 min-w-0">
              {renderMarker(row, "md")}
              <span className="truncate">{rowName(row)}</span>
            </span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-[#E5C179] bg-black/25 px-2 py-1 rounded border border-[#C5A059]/20 shrink-0">
              {row.isUae ? (isEn ? "Host" : "مرجعية") : (isEn ? `Peer ${index}` : `نظير ${index}`)}
            </span>
          </div>
        ))}
      </div>

      {viewMode === "charts" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="comparison-visual-charts-grid">
          <div className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "GDP Economic Size (Volume Comparison)" : "حجم الناتج المحلي الإجمالي الاسمي الثنائي"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 shrink-0">USD Billion</span>
              </div>

              <div className="space-y-4">
                {comparisonRows.map((row) => {
                  const barPercent = row.gdp === null ? 0 : Math.max(10, (row.gdp / maxGdpValue) * 100);
                  return (
                    <div key={`gdp-${row.key}`}>
                      <div className="flex justify-between gap-3 text-xs mb-1.5 font-semibold text-slate-700">
                        <span className="flex items-center gap-1 min-w-0">
                          {renderMarker(row, "xs")}
                          <span className="truncate">{rowShortName(row)}</span>
                        </span>
                        <span className={`font-mono font-extrabold text-right ${row.valueClass}`}>{row.gdpLabel}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-6 rounded-md overflow-hidden p-0.5 border border-gray-200">
                        <div
                          className={`${row.barClass} h-full rounded transition-all duration-1000 ease-out flex items-center justify-end px-2`}
                          style={{ width: `${barPercent}%` }}
                        >
                          <span className="font-mono font-bold text-white text-[9px]">
                            {row.gdp === null ? "N/A" : `${Math.round((row.gdp / maxGdpValue) * 100)}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-4 border-t border-gray-100 pt-3 flex items-center gap-1 bg-gold-bg/10 p-2 rounded">
              <span className="font-bold text-[#C5A059]">Ratio:</span>
              {isMultiCountry
                ? isEn
                  ? `${targetCountries.length} peer GDP profiles normalized against the largest verified economy in the selected basket.`
                  : `تمت مواءمة ${targetCountries.length} ملفات للناتج المحلي مقابل أكبر اقتصاد موثق ضمن السلة المختارة.`
                : uaeRow.gdp === null || targetRows[0]?.gdp === null
                  ? isEn
                    ? "A verified peer GDP figure is not available in the current country profile."
                    : "لا تتوفر قيمة موثقة للناتج المحلي في ملف الدولة الحالي."
                  : (uaeRow.gdp || 0) > (targetRows[0]?.gdp || 0)
                    ? isEn
                      ? `UAE GDP is ${((uaeRow.gdp || 0) / (targetRows[0]?.gdp || 1)).toFixed(1)}x larger than the peer national index.`
                      : `الناتج المحلي لدولة الإمارات أكبر بمقدار ${((uaeRow.gdp || 0) / (targetRows[0]?.gdp || 1)).toFixed(1)} أضعاف الناتج النظير.`
                    : isEn
                      ? `${targetRows[0]?.nameEn} occupies a heavier economic scale (~${((targetRows[0]?.gdp || 0) / (uaeRow.gdp || 1)).toFixed(1)}x larger than UAE).`
                      : `تشغل ${targetRows[0]?.nameAr} نطاقاً اقتصادياً أثقل حجماً بنسبة تُقدّر بنحو ${((targetRows[0]?.gdp || 0) / (uaeRow.gdp || 1)).toFixed(1)} أضعاف حجم الاقتصاد الإماراتي.`}
            </p>
          </div>

          <div className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "Annual GDP Growth Vector" : "مؤشر سرعة النمو الاقتصادي السنوي"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-emerald-light bg-emerald-deep font-bold px-2 py-0.5 rounded shrink-0">% Growth</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {comparisonRows.map((row) => {
                  const progress = Math.min(10, Math.max(0, row.growth)) / 10;
                  return (
                    <div key={`growth-${row.key}`} className="flex flex-col items-center rounded border border-gray-100 bg-gray-50/60 p-3">
                      <div className="relative h-24 w-24">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="48" cy="48" r="38" stroke="#F1F5F9" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="48"
                            cy="48"
                            r="38"
                            stroke={row.ringColor}
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 38}
                            strokeDashoffset={2 * Math.PI * 38 * (1 - progress)}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col justify-center items-center">
                          <span className={`text-lg font-bold font-mono ${row.valueClass}`}>{row.growth}%</span>
                          <span className="text-[9px] text-gray-500 font-bold flex items-center justify-center gap-1 max-w-[78px]">
                            {renderMarker(row, "xs")}
                            <span className="truncate">{rowShortName(row)}</span>
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono mt-2 px-2 py-0.5 rounded font-extrabold uppercase ${
                        row.growth > 2 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {row.growth > 2 ? (isEn ? "Expanding" : "توسع") : (isEn ? "Steady" : "مستقر")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-4 border-t border-gray-100 pt-3 flex items-center gap-1 bg-gold-bg/10 p-2 rounded">
              <span className="font-bold text-[#C5A059]">Comparative Pace:</span>
              {isEn
                ? `${rowName(highestGrowthRow)} has the highest parsed annual growth signal in this comparison set.`
                : `${rowName(highestGrowthRow)} تسجل أعلى إشارة نمو سنوي مقروءة ضمن مجموعة المقارنة.`}
            </p>
          </div>

          <div className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm shrink-0">
                    <HardHat className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "Infrastructure & Logistical Connectivity" : "مؤشر جاهزية البنية التحتية والشبكة الملاحية"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 shrink-0">Index / 100</span>
              </div>

              <div className="space-y-4">
                {comparisonRows.map((row) => (
                  <div key={`infra-${row.key}`}>
                    <div className="flex justify-between gap-3 text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1 min-w-0">
                        {renderMarker(row, "xs")}
                        <span className="truncate">{row.isUae ? (isEn ? "UAE Logistical Hub" : "الإمارات اللوجستية") : rowName(row)}</span>
                      </span>
                      <span className={`font-mono font-extrabold ${row.valueClass}`}>{row.infra}/100</span>
                    </div>
                    <div className="relative w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5 border border-gray-200">
                      <div
                        className={`${row.barClass} h-full rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${Math.min(100, Math.max(0, row.infra))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-4 border-t border-gray-100 pt-3 flex items-center gap-1 bg-gold-bg/10 p-2 rounded">
              <span className="font-bold text-[#C5A059]">Status:</span>
              {isEn
                ? `${rowName(strongestInfraRow)} has the strongest parsed infrastructure readiness score in the selected group.`
                : `${rowName(strongestInfraRow)} تسجل أقوى مؤشر جاهزية بنية تحتية ضمن المجموعة المختارة.`}
            </p>
          </div>

          <div className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm shrink-0">
                    <Zap className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "Energy Grid Matrices Comparison" : "خارطة توزيع ومزيج مصادر الطاقة النظيفة"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-emerald-light bg-emerald-deep font-bold px-2 py-0.5 rounded shrink-0">Stacked Fuel %</span>
              </div>

              <div className="space-y-4">
                {comparisonRows.map((row) => (
                  <div key={`energy-${row.key}`}>
                    <span className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      {renderMarker(row, "xs")}
                      <span className="truncate">{row.isUae ? (isEn ? "UAE Hybrid Matrix Grid" : "مزيج دولة الإمارات الهجين") : rowName(row)}</span>
                    </span>
                    <div className="w-full h-5 rounded overflow-hidden flex shadow-inner border border-gray-200">
                      {row.energySegments.map((segment, segmentIndex) => (
                        <div
                          key={`${row.key}-${segmentIndex}`}
                          className={`h-full ${segment.color} transition-all relative group flex items-center justify-center`}
                          style={{ width: `${segment.percentage}%` }}
                          title={`${isEn ? segment.nameEn : segment.nameAr}: ${segment.percentage}%`}
                        >
                          <span className="text-[8px] font-mono text-white font-black truncate px-0.5">
                            {segment.percentage >= 15 ? `${segment.percentage}%` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 font-mono text-[9px] text-gray-500">
                      {row.energySegments.map((segment, segmentIndex) => (
                        <span key={`${row.key}-legend-${segmentIndex}`} className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${segment.color}`}></span>
                          <span>{isEn ? segment.nameEn : segment.nameAr}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-4 border-t border-gray-100 pt-3 flex items-center gap-1 bg-gold-bg/10 p-2 rounded">
              <span className="font-bold text-[#C5A059]">Synergy Vector:</span>
              {isEn
                ? "Selected energy matrices reveal transfer pathways across net-zero infrastructure, utility decarbonization, and grid resilience."
                : "تكشف مصفوفات الطاقة المختارة مسارات لنقل المعرفة في البنية التحتية للحياد المناخي وإزالة الكربون ومرونة الشبكات."}
            </p>
          </div>

          <div className="bg-white border border-gold-border rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between lg:col-span-2">
            <div>
              <div className="flex justify-between items-start mb-4 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="bg-gold-bg text-gold-deep p-1.5 rounded-sm shrink-0">
                    <Compass className="w-4 h-4" />
                  </span>
                  <h4 className="font-serif font-bold text-slate-vip text-sm md:text-base">
                    {isEn ? "Global Competitiveness Rank Distribution" : "توزيع وترتيب الميزة التنافسية العالمية"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded font-bold shrink-0">
                  {isEn ? "Lower Rank Is Superior" : "الترتيب الأقل أفضل"}
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 items-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {comparisonRows.map((row) => (
                    <div key={`rank-card-${row.key}`} className="p-3 bg-slate-50 rounded border border-gray-100">
                      <span className="text-gray-500 text-[10px] flex items-center gap-1">
                        {renderMarker(row, "xs")}
                        <span className="truncate">{rowName(row)}</span>
                      </span>
                      <span className="font-serif font-bold text-slate-vip text-sm mt-1 block">
                        {isEn ? row.competitivenessLabelEn : row.competitivenessLabelAr}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {competitivenessRows.map((row) => {
                    const scoreWidth = Math.max(12, 100 - Math.min(95, row.competitivenessValue));
                    return (
                      <div key={`rank-bar-${row.key}`}>
                        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700 mb-1">
                          <span className="flex items-center gap-1 min-w-0">
                            {renderMarker(row, "xs")}
                            <span className="truncate">{rowShortName(row)}</span>
                          </span>
                          <span className={`font-mono ${row.valueClass}`}>{row.competitivenessValue}</span>
                        </div>
                        <div className="h-6 rounded bg-gray-100 border border-gray-200 p-0.5 overflow-hidden">
                          <div
                            className={`${row.barClass} h-full rounded transition-all duration-1000 ease-out flex items-center justify-end px-2`}
                            style={{ width: `${scoreWidth}%` }}
                          >
                            {row.isUae && <Award className="w-3.5 h-3.5 text-gold-deep" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300" id="comparison-rows-stack">
          {traditionalMetrics.map((metric, metricIndex) => (
            <div key={metricIndex} className="bg-white rounded-sm border border-gold-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-gray-50/70 border-b border-gray-100 px-6 py-3 flex items-center gap-3">
                {metric.icon}
                <span className="font-serif font-bold text-slate-vip text-sm md:text-base">
                  {isEn ? metric.labelEn : metric.labelAr}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="bg-slate-vip text-white">
                      <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest">
                        <span className="inline-flex items-center gap-1.5">
                          <span>🇦🇪</span>
                          <span>{isEn ? "UAE Index" : "حصيلة دولة الإمارات"}</span>
                        </span>
                      </th>
                      {targetCountries.map((targetCountry) => (
                        <th key={`${metricIndex}-${targetCountry.id}`} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest">
                          <span className="inline-flex items-center gap-1.5 min-w-0">
                            <CountryFlag flag={targetCountry.flag} flagUrl={targetCountry.flagUrl} countryName={isEn ? targetCountry.nameEn : targetCountry.nameAr} size="xs" />
                            <span className="truncate">{isEn ? targetCountry.nameEn : targetCountry.nameAr}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="divide-x divide-gray-100">
                      <td className="p-5 bg-emerald-deep/[0.01] align-top">
                        <p className="text-sm sm:text-base font-bold text-[#0E4637] leading-relaxed">
                          {metric.getUaeValue()}
                        </p>
                      </td>
                      {targetCountries.map((targetCountry) => (
                        <td key={`${metricIndex}-${targetCountry.id}-value`} className="p-5 bg-slate-50/10 align-top">
                          <p className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed">
                            {metric.getCountryValue(targetCountry)}
                          </p>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
