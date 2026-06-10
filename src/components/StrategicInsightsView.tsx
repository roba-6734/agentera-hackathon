import React, { useState } from "react";
import { PrebuiltCountry } from "../types";
import { ShieldAlert, Handshake, Landmark, Lightbulb, CheckSquare, ArrowRightLeft, ChevronDown } from "lucide-react";

interface StrategicInsightsViewProps {
  country: PrebuiltCountry;
  language: "en" | "ar";
}

function normalizeInsightText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getInsightSentences(value: string) {
  const normalized = normalizeInsightText(value);
  if (!normalized) return [];

  return normalized
    .split(/(?<=[.!؟])\s+|;\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getInsightSummary(value: string, maxLength = 190) {
  const firstSentence = getInsightSentences(value)[0] || normalizeInsightText(value);
  return firstSentence.length > maxLength ? `${firstSentence.slice(0, maxLength - 3).trim()}...` : firstSentence;
}

function getInsightBullets(value: string) {
  const sentences = getInsightSentences(value);
  return (sentences.length > 1 ? sentences.slice(1) : sentences)
    .map((sentence) => sentence.replace(/^(Basis|Opportunity|Recommended proposal|Pilot proposal):\s*/i, "").trim())
    .filter((sentence) => sentence.length > 24)
    .slice(0, 3);
}

export default function StrategicInsightsView({ country, language }: StrategicInsightsViewProps) {
  const isEn = language === "en";
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);

  // Specific concrete collaborative projects representing actual high-level scenarios for the countries
  const specificBilateralCases: Record<string, any> = {
    brazil: {
      titleEn: "UAE - Brazil Net-Zero Maritime Corridor & Port Sourcing Initiative",
      titleAr: "مبادرة الممر البحري المستدام وتأمين سلاسل الإمداد بميناء سانتوس",
      descEn: "Structure DP World Santos container capacity and coordinate with Brazilian grain shippers to establish a decarbonized green shipping lane directly linking the Port of Santos with the Port of Jebel Ali using biofuel or e-methanol bunkering.",
      descAr: "توسيع مجمع حاويات موانئ دبي العالمية بسانتوس وتكاملها مع مصدري الحبوب والصناعات الغذائية بالبرازيل لتأسيس ممر بحري مستدام ومنخفض الكربون يربط ميناء سانتوس بميناء جبل علي في دبي.",
      impactEn: "Accelerates food security cargo shipping times by 4 days, ensuring 20% carbon emissions savings on long-range logistics.",
      impactAr: "يسرع الاستيراد الغذائي بـ 4 أيام، ويوفر 20% من انبعاثات الكربون للنقل والشحن البحري طويل المدى.",
      proposeEn: "Undersecretary to propose deep technical solar-powered grid connectivity protocols and carbon credit sharing programs for the incoming COP30 presidency.",
      proposeAr: "يقترح وكيل الوزير بروتوكولاً مشتركاً للتقاط الكربون، وإقرار حزمة ائتمانات متبادلة استعداداً لرئاسة البرازيل لـ COP30.",
    },
    germany: {
      titleEn: "H2Global procurement pipeline & Hydrogen corridors to North Sea",
      titleAr: "ممر إمدادات الهيدروجين النظيف ومبادرة الشراء الإقليمية H2Global",
      descEn: "Establish formal pipelines for importing green ammonia produced via ADNOC & Masdar in Ruwais directly to Germany's northern ports. Leverage the H2Global double-auction platform to secure high price floors.",
      descAr: "إنشاء تحالف متكامل لتصدير الأمونيا الخضراء المصنّعة بموقع الرويس بالإمارات (عبر مصدر وأدنوك) إلى موانئ الساحل الشمالي لألمانيا مباشرة مع الاستفادة من آليات تمويل H2Global.",
      impactEn: "Saves up to $220M in initial deployment infrastructure, anchoring the UAE as the largest renewable fuel partner to Europe.",
      impactAr: "استيراد وتصدير آمن يحفظ للإمارات موقعها كأكبر شريك للمحروقات والطاقة النظيفة بميزانية تتخطى 220 مليون دولار.",
      proposeEn: "Undersecretary to target common technical standards in industrial manufacturing of heavy hydrogen water electrolyzers.",
      proposeAr: "يقترح وفد الدولة توحيد المقاييس الهندسية لتصنيع أجهزة التحليل الكهربائي الكبيرة وعقود الصيانة المتطورة.",
    },
    india: {
      titleEn: "IMEC - Railway corridor connection & Clean Grid direct tie",
      titleAr: "ممر السكك الحديدية اللوجستي العالمي ورابط الطاقة الكهربائي البحري",
      descEn: "Drive UAE-India GigaGrid initiative by conducting feasibility studies on an ultra-long high-voltage undersea direct current (HVDC) cable linking the solar-heavy western desert of India to Fujairah power grid hubs.",
      descAr: "التكامل مع ممر السكك الحديدية (IMEC) ودراسة تأسيس خطوط كهربائية بحرية فائقة الجهد وعالية القدرة (HVDC) لربط حقول الكثبان الشمسية بغرب الهند مع ساحل الفجيرة بالإمارات.",
      impactEn: "Aids peak-load smoothing across time zones, enabling UAE grid utilization of zero-carbon solar power at cheap rates.",
      impactAr: "يسمح بالاستفادة المزدوجة من حمل موازنة الطاقة الشمسية عبر توقيتات ممتدة، وتخفيض الكلفة بنسبة 15%.",
      proposeEn: "Execute formal joint technical workgroups in coordination with federal energy regulators across both nations.",
      proposeAr: "تأسيس لجان فنية فيدرالية عليا مشتركة لتنظيم تدفق الطاقة الكهربائية والسكك الحديدية المشتركة.",
    },
    singapore: {
      titleEn: "Virtual Twin Smart cities modeling & carbon pricing exchanges",
      titleAr: "برامج نمذجة التوأمة الرقمية للمدن الذكية وتقنيات خفض كربون الملاحة",
      descEn: "Share joint database protocols between Singapore's Virtual City framework and the UAE's upcoming smart federal transit nodes. Deploy block-chain powered bills of lading for immediate container customs clearance.",
      descAr: "تبادل بروتوكولات البيانات الضخمة ونمذجة التوأم الرقمي السنغافوري لمركز النقل الإماراتي، بجانب تفعيل البيانات الجمركية المشفرة للشحن السريع.",
      impactEn: "Reduces administrative wait times at border checkpoints from 2 hours to 9 seconds.",
      impactAr: "يقلل فترات التخليص الجمركي للشاحنات والموانئ من ساعتين كاملتين إلى 9 ثوانٍ فقط إلكترونياً.",
      proposeEn: "Establish a Joint UAE-Singapore Working Council on Autonomous Maritime Logistics.",
      proposeAr: "صياغة وتأسيس 'المجلس الإماراتي السنغافوري لرقمنة اللوجستيات البحرية ونظم الموانئ الذكية'.",
    }
  };

  const bilateralCase = specificBilateralCases[country.id] || {
    titleEn: `UAE - ${country.nameEn} Clean Infrastructure & Resource Synergy`,
    titleAr: `التعاون الثنائي للبنية التحتية النظيفة بين الإمارات و${country.nameAr}`,
    descEn: `Explore high-level bilateral opportunities in clean logistics, smart terminals, and strategic resource trade.`,
    descAr: `استكشاف آفاق الدعم الفوري والنمو التبادلي في الموانئ وخطوط الإمداد وتنمية مبادرات الوقود المنخفض الكربون.`,
    impactEn: "Increases bilateral import efficiency, reducing maritime routing delays.",
    impactAr: "يسرع من تكامل خطوط الموانئ الوطنية ويقاوم اضطرابات الملاحة الطارئة.",
    proposeEn: "Target long-term strategic alignments across Ministry files.",
    proposeAr: "اقتراح شراكة شاملة تركز على مشروعات الاستدامة والربط اللوجستي الدولي."
  };

  const insightCards = [
    {
      id: "partnerships",
      titleEn: "Bilateral Partnerships",
      titleAr: "فرص الشراكة والتحالف",
      Icon: Handshake,
      text: isEn ? country.strategicInsights.partnershipsEn : country.strategicInsights.partnershipsAr,
      metaLabelEn: "Target Field",
      metaLabelAr: "المجال المستهدف",
      metaValueEn: "Energy / Hydrogen",
      metaValueAr: "الطاقة / الهيدروجين",
    },
    {
      id: "investments",
      titleEn: "Strategic Investments",
      titleAr: "الاستثمارات السيادية والموانئ",
      Icon: Landmark,
      text: isEn ? country.strategicInsights.investmentsEn : country.strategicInsights.investmentsAr,
      metaLabelEn: "Instrument",
      metaLabelAr: "الآلية الاستثمارية",
      metaValueEn: "Sovereign / Ports",
      metaValueAr: "سيادي / موانئ وطرق",
    },
    {
      id: "knowledge",
      titleEn: "Knowledge Exchange",
      titleAr: "تبادل الخبرات والعلوم",
      Icon: Lightbulb,
      text: isEn ? country.strategicInsights.knowledgeEn : country.strategicInsights.knowledgeAr,
      metaLabelEn: "Focus Type",
      metaLabelAr: "نوع نقل المعرفة",
      metaValueEn: "Tech Transfer",
      metaValueAr: "نقل التكنولوجيا",
    },
  ];

  const actionItems = [
    {
      labelEn: "Frame the initiative",
      labelAr: "تأطير المبادرة",
      body: getInsightSummary(isEn ? bilateralCase.descEn : bilateralCase.descAr, 150),
    },
    {
      labelEn: "Quantify the value",
      labelAr: "تحديد القيمة",
      body: getInsightSummary(isEn ? bilateralCase.impactEn : bilateralCase.impactAr, 150),
    },
    {
      labelEn: "Use as the meeting ask",
      labelAr: "صياغتها كطلب اجتماع",
      body: getInsightSummary(isEn ? bilateralCase.proposeEn : bilateralCase.proposeAr, 150),
    },
  ];

  return (
    <div className="space-y-6" id="strategic-insights-view-tab">
      <section className="bg-white rounded-sm shadow-md border border-gold-border border-l-4 border-gold-deep overflow-hidden" id="flagship-bilateral-builder">
        <div className="p-6 md:p-7 border-b border-gray-100 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="space-y-3 max-w-3xl">
            <span className="inline-flex text-xs font-bold font-mono tracking-widest text-emerald-deep bg-gold-bg border border-gold-border/60 px-2.5 py-1 rounded-sm uppercase">
              {isEn ? "RECOMMENDED BILATERAL INITIATIVE" : "المبادرة الاستراتيجية المقترحة للوفد الثنائي"}
            </span>
            <h3 className="font-serif font-bold text-2xl text-slate-vip leading-tight">
              {isEn ? bilateralCase.titleEn : bilateralCase.titleAr}
            </h3>
            <p className="text-sm text-gray-600 leading-6">
              {isEn ? bilateralCase.descEn : bilateralCase.descAr}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-deep text-white px-3 py-1.5 text-xs rounded-sm font-bold shrink-0">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isEn ? "UAE Core Alignment" : "توافق وطني إماراتي"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0" id="bilateral-alignment-details">
          <div className="lg:col-span-5 p-6 md:p-7 bg-gold-bg/30 border-b lg:border-b-0 lg:border-r border-gold-border">
            <p className="text-[10px] uppercase tracking-widest font-mono font-black text-gold-deep">
              {isEn ? "Expected Impact" : "الأثر المتوقع"}
            </p>
            <p className="text-base md:text-lg text-slate-vip font-serif font-bold leading-7 mt-2">
              {isEn ? bilateralCase.impactEn : bilateralCase.impactAr}
            </p>
          </div>

          <div className="lg:col-span-7 p-6 md:p-7">
            <p className="text-[10px] uppercase tracking-widest font-mono font-black text-emerald-deep mb-4">
              {isEn ? "Priority Actions" : "الأولويات التنفيذية"}
            </p>
            <div className="space-y-3">
              {actionItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-sm bg-emerald-deep text-white flex items-center justify-center text-[10px] font-mono font-black shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-mono font-black text-slate-vip">
                      {isEn ? item.labelEn : item.labelAr}
                    </p>
                    <p className="text-sm text-gray-700 leading-6 font-medium mt-0.5">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-6 md:mx-7 mb-6 md:mb-7 p-4 bg-[#F8F8F6] border border-gold-border border-l-4 border-gold-deep rounded-sm flex items-start gap-3" id="briefing-action-point">
          <ShieldAlert className="w-5 h-5 text-gold-deep shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-vip block">
              {isEn ? "Briefing Action Item for Dignitaries" : "توجيهات الوفد الإماراتي وصانع القرار"}
            </span>
            <p className="text-sm text-gray-700 mt-1">
              {isEn ? bilateralCase.proposeEn : bilateralCase.proposeAr}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="three-pillars-strategic-grid">
        {insightCards.map((insight) => {
          const InsightIcon = insight.Icon;
          const bullets = getInsightBullets(insight.text);
          const isExpanded = expandedInsightId === insight.id;

          return (
            <article key={insight.id} className="bg-white rounded-sm shadow-md border border-gold-border border-t-4 border-t-emerald-deep p-5 flex flex-col min-h-[260px]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 bg-emerald-deep/5 rounded-sm text-gold-deep flex items-center justify-center shrink-0">
                    <InsightIcon className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-slate-vip leading-5">
                    {isEn ? insight.titleEn : insight.titleAr}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedInsightId(isExpanded ? null : insight.id)}
                  className="h-8 w-8 rounded-sm border border-gold-border text-gold-deep hover:bg-gold-bg flex items-center justify-center cursor-pointer shrink-0"
                  aria-label={isEn ? `Toggle ${insight.titleEn} details` : `تبديل تفاصيل ${insight.titleAr}`}
                >
                  <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }} />
                </button>
              </div>

              <p className="text-sm text-gray-700 leading-6 mt-4 font-medium">
                {getInsightSummary(insight.text)}
              </p>

              <div className="mt-4 space-y-2 flex-1">
                {bullets.length > 0 ? bullets.map((bullet, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-deep shrink-0 mt-1" />
                    <p className="text-xs text-gray-600 leading-5 line-clamp-2">{bullet}</p>
                  </div>
                )) : (
                  <div className="flex items-start gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-deep shrink-0 mt-1" />
                    <p className="text-xs text-gray-600 leading-5">{getInsightSummary(insight.text, 130)}</p>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-600 leading-6">
                    {normalizeInsightText(insight.text)}
                  </p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 mt-4 text-[10px] font-mono text-emerald-light font-black flex items-center justify-between gap-3 uppercase">
                <span>{isEn ? insight.metaLabelEn : insight.metaLabelAr}</span>
                <span className="text-right">{isEn ? insight.metaValueEn : insight.metaValueAr}</span>
              </div>
            </article>
          );
        })}
      </section>

    </div>
  );
}
