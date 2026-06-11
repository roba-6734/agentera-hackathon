import { Activity, CheckCircle2, ShieldAlert, Sparkles, Target } from "lucide-react";
import { BriefingArtifacts, BriefingRiskItem, PrebuiltCountry } from "../types";

type Language = "en" | "ar";
type RecommendationMode = "Proceed" | "Explore" | "Pause" | "Escalate";
type RiskSeverity = "High" | "Medium" | "Low";

interface ExecutiveDecisionSupportProps {
  country: PrebuiltCountry;
  language: Language;
  briefingArtifacts?: BriefingArtifacts | null;
  meetingObjective?: string;
}

interface ExecutiveRiskInsight extends BriefingRiskItem {
  severity: RiskSeverity;
  watchSignal: string;
}

const recommendationLabels: Record<RecommendationMode, Record<Language, string>> = {
  Proceed: {
    en: "Proceed",
    ar: "المتابعة",
  },
  Explore: {
    en: "Explore",
    ar: "الاستكشاف",
  },
  Pause: {
    en: "Pause",
    ar: "التريث",
  },
  Escalate: {
    en: "Escalate",
    ar: "التصعيد",
  },
};

const severityLabels: Record<RiskSeverity, Record<Language, string>> = {
  High: {
    en: "High",
    ar: "مرتفع",
  },
  Medium: {
    en: "Medium",
    ar: "متوسط",
  },
  Low: {
    en: "Low",
    ar: "منخفض",
  },
};

const recommendationStyles: Record<RecommendationMode, { badge: string; border: string; icon: string }> = {
  Proceed: {
    badge: "bg-emerald-deep text-white border-emerald-deep",
    border: "border-emerald-deep",
    icon: "bg-emerald-deep/10 text-emerald-deep",
  },
  Explore: {
    badge: "bg-gold-bg text-slate-vip border-gold-border",
    border: "border-gold-deep",
    icon: "bg-gold-bg text-gold-deep",
  },
  Pause: {
    badge: "bg-red-50 text-red-800 border-red-200",
    border: "border-red-500",
    icon: "bg-red-50 text-red-700",
  },
  Escalate: {
    badge: "bg-slate-vip text-white border-slate-vip",
    border: "border-gold-deep",
    icon: "bg-slate-100 text-slate-vip",
  },
};

const severityStyles: Record<RiskSeverity, string> = {
  High: "bg-red-50 text-red-800 border-red-200",
  Medium: "bg-amber-50 text-amber-800 border-amber-200",
  Low: "bg-emerald-deep/10 text-emerald-deep border-emerald-deep/20",
};

function cleanText(value = "", maxLength = 280) {
  const cleaned = value
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
}

function splitRiskText(value: string, maxItems = 3) {
  const cleaned = cleanText(value, 900);
  const items = cleaned
    .split(/(?:\n+|[.;!?؟؛]\s+)/)
    .map((item) => cleanText(item, 220))
    .filter((item) => item.length > 18);

  return Array.from(new Set(items)).slice(0, maxItems);
}

function inferRiskSeverity(riskText: string, index: number): RiskSeverity {
  const highRiskPattern = /(sanction|security|geopolitical|conflict|regulat|carbon|tax|tariff|debt|financ|sovereign|instability|supply|delay|compliance|أمن|سياس|تنظيم|ضريب|ديون|تمويل|توريد|تأخير|عقوب)/i;
  const lowRiskPattern = /(technical|coordination|minor|pilot|documentation|capacity|فني|تنسيق|تجريبي|توثيق)/i;

  if (highRiskPattern.test(riskText)) {
    return "High";
  }

  if (lowRiskPattern.test(riskText)) {
    return "Low";
  }

  return index === 0 ? "High" : "Medium";
}

function inferWatchSignal(riskText: string, language: Language) {
  const isEn = language === "en";
  const regulatoryPattern = /(regulat|tax|carbon|compliance|tariff|تنظيم|ضريب|امتثال|تعرفة)/i;
  const financePattern = /(financ|debt|investment|bank|fund|تمويل|ديون|استثمار|مصرف|بنك)/i;
  const securityPattern = /(security|geopolitical|sanction|conflict|politic|أمن|سياس|عقوب|نزاع)/i;
  const logisticsPattern = /(supply|logistic|port|route|shipping|chain|توريد|لوجست|ميناء|ممر|شحن|سلاسل)/i;

  if (regulatoryPattern.test(riskText)) {
    return isEn
      ? "New regulatory, tax, or compliance guidance changes access or cost assumptions."
      : "صدور توجيه تنظيمي أو ضريبي أو امتثالي يغير افتراضات الوصول أو التكلفة.";
  }

  if (financePattern.test(riskText)) {
    return isEn
      ? "Financing terms, guarantees, or project bankability weaken before commitment."
      : "تراجع شروط التمويل أو الضمانات أو قابلية المشروع للتمويل قبل الالتزام.";
  }

  if (securityPattern.test(riskText)) {
    return isEn
      ? "Security posture, sanctions exposure, or political alignment shifts materially."
      : "تغير جوهري في الوضع الأمني أو التعرض للعقوبات أو الاصطفاف السياسي.";
  }

  if (logisticsPattern.test(riskText)) {
    return isEn
      ? "Port, route, supply, or delivery indicators move against the project timeline."
      : "تحرك مؤشرات الموانئ أو الممرات أو التوريد أو التسليم عكس الجدول الزمني.";
  }

  return isEn
    ? "Counterpart posture, delivery timeline, or evidence base changes before follow-up."
    : "تغير موقف الطرف المقابل أو جدول التنفيذ أو قاعدة الأدلة قبل المتابعة.";
}

function buildRiskInsights(
  country: PrebuiltCountry,
  briefingArtifacts: BriefingArtifacts | null | undefined,
  language: Language,
  fallbackMitigation: string
): ExecutiveRiskInsight[] {
  const isEn = language === "en";
  const artifactRisks = briefingArtifacts?.onePager?.risks?.filter((risk) => risk.risk?.trim()) || [];
  const sourceRisks = artifactRisks.length
    ? artifactRisks.slice(0, 3)
    : splitRiskText(isEn ? country.predictive.risksEn : country.predictive.risksAr, 3).map((risk) => ({
        risk,
        mitigation: fallbackMitigation || (isEn ? country.predictive.proposalsEn : country.predictive.proposalsAr),
      }));

  return sourceRisks.slice(0, 3).map((risk, index) => {
    const cleanRisk = cleanText(risk.risk, 220);
    return {
      risk: cleanRisk,
      mitigation: cleanText(risk.mitigation || fallbackMitigation, 240),
      severity: inferRiskSeverity(`${cleanRisk} ${risk.mitigation || ""}`, index),
      watchSignal: inferWatchSignal(cleanRisk, language),
    };
  });
}

function inferRecommendationMode(recommendation: string, risks: ExecutiveRiskInsight[]): RecommendationMode {
  const recommendationText = recommendation.toLocaleLowerCase();
  const combinedText = `${recommendation} ${risks.map((risk) => risk.risk).join(" ")}`.toLocaleLowerCase();
  const hasHighRisk = risks.some((risk) => risk.severity === "High");

  if (/(pause|defer|avoid|hold|not proceed|blocked|sanction|suspend|تأجيل|تعليق|إيقاف|تجنب|تريث)/i.test(combinedText)) {
    return "Pause";
  }

  if (/(escalate|cabinet|urgent|leader-level|high-level|critical decision|تصعيد|عاجل|مجلس الوزراء|رفيع المستوى)/i.test(recommendationText)) {
    return "Escalate";
  }

  if (/(explore|pilot|assess|evaluate|working group|dialogue|feasibility|استكشاف|تجريبي|تقييم|دراسة|حوار|فريق عمل)/i.test(recommendationText)) {
    return "Explore";
  }

  return hasHighRisk ? "Explore" : "Proceed";
}

export default function ExecutiveDecisionSupport({
  country,
  language,
  briefingArtifacts,
  meetingObjective = "",
}: ExecutiveDecisionSupportProps) {
  const isEn = language === "en";
  const strategicRecommendation = cleanText(
    briefingArtifacts?.onePager?.strategicRecommendation ||
      briefingArtifacts?.executiveSummary?.decisionFocus ||
      (isEn ? country.predictive.proposalsEn : country.predictive.proposalsAr),
    340
  );
  const risks = buildRiskInsights(country, briefingArtifacts, language, strategicRecommendation);
  const recommendationMode = inferRecommendationMode(strategicRecommendation, risks);
  const recommendationStyle = recommendationStyles[recommendationMode];
  const rationale = cleanText(
    briefingArtifacts?.executiveSummary?.decisionFocus ||
      briefingArtifacts?.onePager?.uaeRelevance ||
      (isEn ? country.strategicInsights.partnershipsEn : country.strategicInsights.partnershipsAr),
    260
  );
  const nextMove = cleanText(briefingArtifacts?.onePager?.actions90Days?.[0] || strategicRecommendation, 220);
  const objective = cleanText(meetingObjective, 180);

  return (
    <section className="space-y-5" id="executive-decision-support-panel">
      <div className={`bg-white rounded-sm shadow-md border-l-4 ${recommendationStyle.border} p-5 md:p-7`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-12 w-12 rounded-sm flex items-center justify-center shrink-0 ${recommendationStyle.icon}`}>
              <Target className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-mono font-black text-emerald-deep">
                {isEn ? "Recommended Position" : "الموقف الموصى به"}
              </p>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-slate-vip leading-tight">
                {isEn ? "Executive Decision Snapshot" : "ملخص القرار التنفيذي"}
              </h3>
            </div>
          </div>
          <span className={`shrink-0 rounded-sm border px-4 py-2 text-xs font-mono font-black uppercase ${recommendationStyle.badge}`}>
            {recommendationLabels[recommendationMode][language]}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] gap-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-mono font-black text-gray-500">
              {isEn ? "Short Rationale" : "المبرر المختصر"}
            </p>
            <p className="mt-2 text-base leading-7 text-slate-vip font-medium">
              {rationale}
            </p>
          </div>

          <div className="space-y-3 min-w-0">
            <div className="bg-[#F8F8F6] border border-gold-border/60 rounded-sm p-4">
              <div className="flex items-center gap-2 text-gold-deep">
                <Sparkles className="w-4 h-4" />
                <p className="text-[10px] uppercase tracking-widest font-mono font-black">
                  {isEn ? "Best Next Move" : "أفضل خطوة تالية"}
                </p>
              </div>
              <p className="mt-2 text-base leading-7 text-slate-vip font-semibold">
                {nextMove}
              </p>
            </div>

            {objective && (
              <div className="flex items-start gap-2 text-sm leading-6 text-gray-500">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-deep" />
                <span>
                  {isEn ? "Aligned to objective: " : "مرتبط بهدف الاجتماع: "}
                  {objective}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-sm shadow-md border-l-4 border-amber-500 p-5 md:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-sm bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono font-black text-amber-700">
                {isEn ? "Risks To Keep In Mind" : "مخاطر يجب الانتباه لها"}
              </p>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-slate-vip leading-tight">
                {isEn ? "Top 3 Risk Watchlist" : "أهم 3 مخاطر للمتابعة"}
              </h3>
            </div>
          </div>
          <span className="w-fit rounded-sm border border-gray-200 bg-slate-50 px-2.5 py-1 text-[10px] font-mono font-black uppercase text-gray-500">
            {isEn ? "Severity / Mitigation / Watch Signal" : "الشدة / المعالجة / إشارة المتابعة"}
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-sm border border-gray-200 divide-y divide-gray-100">
          {risks.map((risk, index) => (
            <article
              key={`${risk.risk}-${index}`}
              className="grid grid-cols-1 xl:grid-cols-[5rem_minmax(0,1fr)_minmax(18rem,0.5fr)] gap-4 bg-white p-4 transition-colors hover:bg-[#F8F8F6]"
            >
              <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-start lg:justify-start">
                <span className="text-[10px] font-mono font-black text-gray-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={`rounded border px-2.5 py-1 text-[11px] font-mono font-black uppercase ${severityStyles[risk.severity]}`}>
                  {severityLabels[risk.severity][language]}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-base font-serif font-bold leading-6 text-slate-vip">
                  {risk.risk}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-widest font-mono font-black text-emerald-deep">
                  {isEn ? "Countermeasure" : "إجراء المعالجة"}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {risk.mitigation}
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-sm bg-[#F8F8F6] border border-gray-100 p-3">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-mono font-black text-gray-500">
                    {isEn ? "Watch Signal" : "إشارة المتابعة"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    {risk.watchSignal}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
