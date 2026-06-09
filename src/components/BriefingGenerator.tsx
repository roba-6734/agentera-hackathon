import React, { useState } from "react";
import pptxgen from "pptxgenjs";
import { PrebuiltCountry } from "../types";
import { FileText, Award, Layers, Volume2, ChevronLeft, ChevronRight, HelpCircle, ArrowRightLeft, FileCheck, Download } from "lucide-react";

interface BriefingGeneratorProps {
  country: PrebuiltCountry;
  language: "en" | "ar";
  aiBriefingText: string;
  isGenerating: boolean;
  briefingSource?: string;
}

export default function BriefingGenerator({ country, language, aiBriefingText, isGenerating, briefingSource }: BriefingGeneratorProps) {
  const isEn = language === "en";
  const [activeOutput, setActiveOutput] = useState<"summary" | "talking-points" | "one-pager" | "slides">("summary");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Pre-structured high value talking points depending on country
  const fallbackTalkingPoints: Record<string, any> = {
    brazil: [
      {
        headerEn: "Strategic Opening & Diplomatic Appreciation",
        headerAr: "الاستفادة الافتتاحية والترحيب الأكاديمي ثنائياً",
        pointEn: "Convey the warm regards of the UAE leadership. Highlight the robust trade relationship ($4.3B+) and coordinate the hand-off from modern COP28 targets to Brazil's upcoming COP30 summit.",
        pointAr: "نقل تحيات القيادة الرشيدة لدولة الإمارات. التنويه بمتانة العلاقات التجارية المتبادلة (أكثر من 4.3 مليار دولار) والتنسيق البنّاء لانتقال رئاسة مؤتمر المناخ من دبي إلى بيليم.",
      },
      {
        headerEn: "Deep Sea Port Logistics (DP World Santos)",
        headerAr: "القدرات اللوجستية وتكامل الموانئ العالمية",
        pointEn: "Discuss our $350M+ container scale-up at DP World Santos terminal. Outline the need to streamline agricultural bulk transport and secure food corridors with Jebel Ali Ports.",
        pointAr: "تسليط الضوء على استثمارات موانئ دبي العالمية بسانتوس وتحديث محطات الحاويات. دعوة الجانب البرازيلي لتأمين سلاسل النقل الغذائي والحبوب مباشرة وبكلف جمركية تفضيلية.",
      },
      {
        headerEn: "Joint Renewable Utility Farms Initiative",
        headerAr: "مبادرة توليد الطاقة المتجددة الكبرى",
        pointEn: "Invite the Brazilian Ministry of Mines and Energy to partner with Masdar on building high-voltage solar grids in northeastern Brazil to satisfy emerging heavy industry decarbonization.",
        pointAr: "اقتراح تأسيس شراكة رفيعة المستوى بين شركة 'مصدر' ووزارة المناجم والطاقة البرازيلية لبناء مجمعات شمسية متكاملة لخدمة التعدين الخالي من الكربون.",
      },
      {
        headerEn: "Bilateral Carbon Credit Trade Framework",
        headerAr: "الموقف التفاوضي وأسواق ائتمانات الكربون",
        pointEn: "Propose a unified framework for bilateral transfer of carbon credits aligned with Article 6 of the Paris Agreement, ahead of COP30.",
        pointAr: "اقتراح آلية ثنائية متكاملة لتبادل وحوكمة ائتمانات الكربون بما يستوفي المادة السادسة من اتفاقية باريس للمناخ.",
      }
    ],
    germany: [
      {
        headerEn: "ESIA Agreement Progress Evaluation",
        headerAr: "مراجعة مخرجات اتفاقية ESIA لأمن الطاقة",
        pointEn: "Commend the continuous deployment of our Energy Security and Industry Accelerator (ESIA) layout since 2022. Reinforce our position as a stable clean energy investor.",
        pointAr: "الإشادة بالتطور المستمر لاتفاقية تسريع أمن الطاقة والنمو الصناعي الموقعة في 2022، وتأكيد التزام الإمارات كمستثمر موثوق وشريك دائم.",
      },
      {
        headerEn: "Green Ammonia Shipping Pipeline to North Sea",
        headerAr: "ممرات تصدير الأمونيا الخضراء وبحر الشمال",
        pointEn: "Confirm readiness of initial liquid ammonia shipments produced at Ruwais (Masdar/ADNOC scale). Negotiate off-take commitments on German ports (Wilhelmshaven).",
        pointAr: "تأكيد جاهزية الدفعات الأولى للتصدير المنتظم للأمونيا الخضراء من مصافي الرويس التابعة لأدنوك ومصدر، والاتفاق على تسهيلات التخزين في موانئ ألمانيا.",
      },
      {
        headerEn: "Industrial Electrolyzer Joint Manufacturing",
        headerAr: "الإنتاج المشترك لأجهزة التحليل الكهربائي الكبيرة",
        pointEn: "Advocate for joint research and manufacturing pipelines with Siemens Energy to build gigawatt-scale hydrogen electrolyzers in Abu Dhabi, reducing system costs for the MENA region.",
        pointAr: "طرح مبادرة التجميع والإنتاج المشترك بمشاركة 'سيمنز للطاقة' لتشييد مصانع أجهزة التحليل الكهربائي العملاقة لتوفيرها بالإمارات والشرق الأوسط بكلف منخفضة.",
      },
      {
        headerEn: "Standardized Clean Tech Certifications",
        headerAr: "المعايير المعتمدة لشهادات المحروقات الخالية من الكربون",
        pointEn: "Suggest streamlining regulatory definitions associated with 'green hydrogen' within the EU to avoid double taxation on gulf liquid fuels imports.",
        pointAr: "مواجهة ازدواجية الرسوم البيئية عبر صياغة معايير فنية مشتركة لشهادات المنشأ للهيدروجين لتسريع التخليص الأوروبي كوقود أخضر ذكي."
      }
    ],
    india: [
      {
        headerEn: "Consolidating CEPA & IMEC Corridor Foundations",
        headerAr: "تفعيل الرصيد الاستراتيجي لمشروعات CEPA وممر IMEC",
        pointEn: "Address progress on the Comprehensive Economic Partnership Agreement (CEPA). Drive interest in shipping integration models of the wider India-Middle East-Europe Economic Corridor.",
        pointAr: "متابعة المكتسبات الكبرى في التبادل الجمركي المعزز باتفاقية الشراكة الاقتصادية، والتأكيد على الدور المحوري لربط الموانئ ضمن مسار (IMEC).",
      },
      {
        headerEn: "FEASIBILITY: The Undersea Direct-Current GigaGrid",
        headerAr: "دراسات الجدوى بربط الكابل الكهربائي المائي العملاق",
        pointEn: "Propose formalized federal funding for conducting technical surveys regarding a Fujairah-Gujarat high-voltage direct current (HVDC) undersea cable to trade desert solar power.",
        pointAr: "طرح تفعيل لجان المراقبة لدراسة الجدوى الفنية لمد كابل التوليد تحت المائي (GigaGrid) لربط حقول غوجارات الشمسية بالفجيرة واستيراد الفاض في ذروات الصيف.",
      },
      {
        headerEn: "Coexisting Logistics Hub Development",
        headerAr: "تكامل لوجستيات الحاويات والطلب التجاري",
        pointEn: "Coordinate joint port modernizations handled between DP World and Adani Terminals. Streamline freight train connectivity maps to industrial special economic zones.",
        pointAr: "تنسيق الاستملاك والنظم الجمركية بين موانئ دبي ومحطات الشحن بالهند، والمضي قدماً في ممرات القطارات اللوجستية السريعة.",
      },
      {
        headerEn: "Sovereign Green Fund Initiatives",
        headerAr: "صندوق الاستثمار الأخضر الاستراتيجي المشترك",
        pointEn: "Suggest a customized mutual sovereign climate development fund focusing on off-grid decentralized microgrids in agricultural provinces.",
        pointAr: "اقتراح تمويل مشترك عبر صناديق التنمية الاستراتيجية للمصغرات الشمسية الريفية لخفض بصمة التغذية والمحافظة على البيئة."
      }
    ],
    singapore: [
      {
        headerEn: "Bilateral Maritime Digital Logs Accord",
        headerAr: "رقمنة البيانات الملاحية وتقنية بلوكشين للموانئ",
        pointEn: "Propose digital container ledger alignments between Singapore MPA and Abu Dhabi/Dubai maritime registries. Minimize paper clearances using unified smart contracts.",
        pointAr: "اقتراح توحيد البوابات اللوجستية وتوثيق مستندات الشحن البحري عبر دفاتر مشفرة (بلوكشين) لتجنب الأوراق وضمان العبور السريع للحاويات.",
      },
      {
        headerEn: "Coastal Defense Infrastructure Technology",
        headerAr: "تقنيات حماية السواحل من ارتفاع منسوب البحار",
        pointEn: "Initiate technical knowledge exchange groups focused on resilient concrete barrier manufacturing and mangrove preservation networks to mitigate sea-level rise risks.",
        pointAr: "مشاركة نماذج مصدات المد البحرية وتطوير حماية السواحل لخدمة حماية البنية التحتية الساحلية للموانئ والجزر والمحطات الحيوية.",
      },
      {
        headerEn: "Decarbonized Ammonia Fuel Bunkering Hubs",
        headerAr: "مجمعات تزويد السفن بالأمونيا والوقود الحيوي النظيف",
        pointEn: "Co-develop carbon emission metrics and supply lines for low-carbon ship refueling in both Jebel Ali and Jurong Island to serve unified fleet routes.",
        pointAr: "تكامل خطوط تزويد الأساطيل البحرية بالوقود النظيف منخفض الكربون بالتشارك المباشر بين جزيرة جورونج ومحطة جبل علي اللوجستية.",
      },
      {
        headerEn: "Autonomous Rail & Subway Traffic Management",
        headerAr: "تنسيق تقنيات المترو وأنظمة النقل ذاتي القيادة",
        pointEn: "Initiate collaborative feedback loops on AI-powered federal highway traffic routing and driverless public transit automation systems.",
        pointAr: "مناقشة أتمتة خدمات السكك الفيدرالية والمترو وربط الإشارات بحلول الذكاء الاصطناعي لتقليل هدر الوقود والانبعاثات الضارة."
      }
    ],
  };

  const currentTP = fallbackTalkingPoints[country.id] || fallbackTalkingPoints["brazil"];

  // Modular slide configuration
  const slides: Array<{ titleEn: string; titleAr: string; bulletsEn: string[]; bulletsAr: string[] }> = [
    {
      titleEn: "EXECUTIVE BILATERAL CORRIDOR STRUCTURE",
      titleAr: "هيكل الإحاطة والممر الثنائي المشترك",
      bulletsEn: [
        `Subject Target: Deepening strategic cooperation with ${country.nameEn}`,
        "Principal Goal: Standardize clean energy imports, hydrogen off-take, and high-tech maritime logs",
        "Economic Value: Safeguard supply routes for energy and critical agricultural infrastructure"
      ],
      bulletsAr: [
        `الملف المستهدف: تعزيز التبادل الاستراتيجي والعملي مع ${country.nameAr}`,
        "الهدف الأميري: تنظيم استيراد الوقود الخالي من الكربون، لاسيما الهيدروجين وإقرار اللوجستيات الذكية",
        "الأثر الاقتصادي: تأمين السواحل والموانئ وعقود الاستيراد المشترك للأمونيا والسلع الأساسية"
      ]
    },
    {
      titleEn: "CRITICAL SECTOR REVIEW & BENCHMARKS",
      titleAr: "نبذة القطاعات الحيوية والمؤشرات المشتركة",
      bulletsEn: [
        `Overview: Governed under official ${country.profile.governmentEn}`,
        `Energy Landscape: ${country.sectors.energyEn}`,
        `Bilateral Treaty Core: ${country.indicators.cooperationAgreementEn}`
      ],
      bulletsAr: [
        `النظام الإداري التابع لـ: ${country.profile.governmentAr}`,
        `خارطة قطاع الطاقة: ${country.sectors.energyAr}`,
        `محور اتفاق مستوطنات التعاون: ${country.indicators.cooperationAgreementAr}`
      ]
    },
    {
      titleEn: "IMMEDIATE INVESTMENT OPPORTUNITIES MAP",
      titleAr: "خارطة الفرص الاستثمارية الفورية",
      bulletsEn: [
        `Commercial Ports Asset: ${country.strategicInsights.investmentsEn}`,
        `Masdar Renewable Utility Sourcing: ${country.strategicInsights.partnershipsEn}`,
        `Technical Knowledge Exchange Priorities: ${country.strategicInsights.knowledgeEn}`
      ],
      bulletsAr: [
        `الاستثمارات اللوجستية للموانئ: ${country.strategicInsights.investmentsAr}`,
        `مبادرات مصدر للطاقة النظيفة: ${country.strategicInsights.partnershipsAr}`,
        `مسارات نقل المعرفة والعلوم: ${country.strategicInsights.knowledgeAr}`
      ]
    },
    {
      titleEn: "PREDICTIVE RISKS & ACTION PROTOCOLS",
      titleAr: "الذكاء التنبؤي وتطويق المخاطر",
      bulletsEn: [
        `Emerging Market Sectors: ${country.predictive.marketsEn}`,
        `Mitigation Advice: ${country.predictive.risksEn}`,
        `Proposed Direct Action Line: ${country.predictive.proposalsEn}`
      ],
      bulletsAr: [
        `توجهات الأسواق الجديدة: ${country.predictive.marketsAr}`,
        `آلية الحد من المخاطر: ${country.predictive.risksAr}`,
        `المبادرة الفيدرالية المطروحة: ${country.predictive.proposalsAr}`
      ]
    }
  ];

  const handleExportToPptx = () => {
    try {
      const pptx = new pptxgen();

      // Configure widescreen layouts
      pptx.layout = "LAYOUT_16x9";
      pptx.title = `${country.nameEn} Strategic Briefing Presentation`;
      pptx.author = "MOEI Cabinet AI Strategic Advisor";

      slides.forEach((sl) => {
        const slide = pptx.addSlide();
        
        // Deep luxury green theme matching our visual identity color palette
        slide.background = { fill: "16211C" }; 

        // Main heading matching the designated language
        const titleText = isEn ? sl.titleEn : sl.titleAr;
        slide.addText(titleText, {
          x: 0.8,
          y: 0.6,
          w: 11.7,
          h: 0.8,
          fontSize: 24,
          fontFace: isEn ? "Georgia" : "Arial",
          color: "C5A85A", // Radiant Gold
          bold: true,
          align: isEn ? "left" : "right",
        });

        // Decorative horizontal rule
        slide.addShape("rect" as any, {
          x: 0.8,
          y: 1.4,
          w: 2.0,
          h: 0.04,
          fill: { color: "C5A85A" }
        });

        // Map list bullet items nicely using native pptxgen bullets to ensure perfect word wrap
        const bulletsList = isEn ? sl.bulletsEn : sl.bulletsAr;
        const textObjects = bulletsList.map((bullet) => {
          return {
            text: bullet,
            options: {
              bullet: true,
              fontSize: 13, // Slightly reduced from 16 to fit long country dossiers beautifully
              color: "E2E8F0", // Slate grey text
              fontFace: "Arial",
              paraSpaceAfter: 12, // Clean block spacing after each item
              align: (isEn ? "left" : "right") as "left" | "right",
            }
          };
        });

        slide.addText(textObjects, {
          x: 0.8,
          y: 1.8,
          w: 11.7,
          h: 4.5,
          align: isEn ? "left" : "right",
          wrap: true, // Forces text-wrapping inside the text-box bounds
        });

        // Add brand agency marker on slide footer
        slide.addText(
          isEn 
            ? "Ministry of Energy & Infrastructure - UAE | Secure Cabinet Support Node" 
            : "وزارة الطاقة والبنية التحتية - دولة الإمارات العربية المتحدة | نظام الدعم الاستراتيجي",
          {
            x: 0.8,
            y: 6.7,
            w: 11.7,
            h: 0.3,
            fontSize: 9,
            color: "718096",
            align: isEn ? "left" : "right",
          }
        );
      });

      const filename = `Cabinet_Bilateral_${country.nameEn.replace(/\s+/g, "_")}_Presentation.pptx`;
      pptx.writeFile({ fileName: filename });
    } catch (error) {
      console.error("Failed to generate PPTX:", error);
    }
  };

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="briefing-generator-workspace">
      
      {/* Selector controls for executive consumption formats */}
      <div className="flex flex-wrap items-center justify-start gap-2 border-b border-gray-100 pb-4" id="briefing-picker-buttons">
        <button
          onClick={() => setActiveOutput("summary")}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeOutput === "summary"
              ? "bg-emerald-deep text-white shadow-md border border-emerald-deep"
              : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
          }`}
          id="btn-output-summary"
        >
          <FileText className="w-4 h-4" />
          <span>{isEn ? "Executive Summary" : "الملخص التنفيذي"}</span>
        </button>

        <button
          onClick={() => setActiveOutput("talking-points")}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeOutput === "talking-points"
              ? "bg-emerald-deep text-white shadow-md border border-emerald-deep"
              : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
          }`}
          id="btn-output-talking-points"
        >
          <Volume2 className="w-4 h-4" />
          <span>{isEn ? "Talking Points" : "نقاط الحديث للوفد"}</span>
        </button>

        <button
          onClick={() => setActiveOutput("one-pager")}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeOutput === "one-pager"
              ? "bg-emerald-deep text-white shadow-md border border-emerald-deep"
              : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
          }`}
          id="btn-output-one-pager"
        >
          <FileCheck className="w-4 h-4" />
          <span>{isEn ? "One-Pager Memoram" : "مذكرة الحزب الفردية"}</span>
        </button>

        <button
          onClick={() => setActiveOutput("slides")}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeOutput === "slides"
              ? "bg-emerald-deep text-white shadow-md border border-emerald-deep"
              : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
          }`}
          id="btn-output-slides"
        >
          <Layers className="w-4 h-4" />
          <span>{isEn ? "Widescreen Briefing Slides" : "شرائح العرض والتقديم"}</span>
        </button>
      </div>

      {/* Main output container */}
      <div className="bg-white rounded-sm shadow-md border-l-4 border-emerald-deep min-h-[460px] relative overflow-hidden memo-glow" id="advisor-rendering-card">
        
        {/* Abstract elegant paper watermark representation */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gold-deep via-emerald-deep to-gold-deep pointer-events-none"></div>

        {/* 1. EXECUTIVE BRIEFING SUMMARY BLOCK */}
        {activeOutput === "summary" && (
          <div className="p-6 md:p-8 space-y-4" id="summary-section-content">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-gold-bg text-gold-deep border border-gold-border/50 font-bold font-mono px-2 py-0.5 rounded uppercase">
                  {isEn ? "Decision AI Synthesis" : "الذكاء التحليلي المشترك"}
                </span>
                <h3 className="text-xl font-bold font-serif text-slate-vip mt-1.5">
                  {isEn ? "Immediate Executive Overview" : "تحليل الملخص والفرص للمستشار"}
                </h3>
              </div>
              <div className="text-[10px] text-gray-400 font-mono">
                {isEn ? "DOC-ID: MOEI-SUM-09" : "معرف الوثيقة: MOEI-SUM-09"}
              </div>
            </div>

            {!isGenerating && briefingSource && briefingSource !== "gemini-strategic-ai" && (
              <div className="bg-[#FAF7F0] border-l-4 border-[#C5A059] p-4 rounded-sm flex items-start gap-3 text-xs md:text-sm text-slate-700 animate-fade-in" id="dignitary-intelligence-source-indicator">
                <HelpCircle className="w-5 h-5 text-[#C5A059] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-vip uppercase tracking-wider block text-[10px] font-mono">
                    {isEn ? "STANDBY SECURITY INTELLIGENCE ACTIVE" : "نشاط بروتوكول استرجاع البيانات المعتمدة محلياً"}
                  </span>
                  <p className="text-gray-600 leading-relaxed">
                    {isEn 
                      ? "Under ministerial secure communication protocol, high-fidelity sovereign briefing directories have been loaded as standby security models due to active external gateway rate throttling."
                      : "بموجب البريد الحكومي المؤمن، تم تفعيل خط السحب الاحتياطي المباشر وقراءة التقارير الحيوية المصدقة سلفاً بدلاً من البوابات السحابية النشطة تفادياً لبطء الاتصال."}
                  </p>
                </div>
              </div>
            )}

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3" id="briefing-generating-loader">
                <div className="h-10 w-10 border-4 border-gold-deep border-t-emerald-deep rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 font-semibold font-mono animate-pulse">
                  {isEn ? "Analyzing dynamic indicators and compiling brief..." : "يجري تجميع وتحليل البيانات وطحن الإحاطة..."}
                </p>
              </div>
            ) : (
              <div className="prose max-w-none text-gray-800 leading-relaxed font-sans" id="summary-output-text">
                <style>{`
                  .text-brief-formatted h3 { font-size: 1.125rem; font-weight: 700; color: #1A2621; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #E8DCC4; padding-bottom: 0.25rem; font-family: var(--font-serif); }
                  .text-brief-formatted p { margin-bottom: 1rem; text-align: justify; }
                  .text-brief-formatted ul { list-style-type: square; margin-left: 1.5rem; margin-bottom: 1rem; color: #374151; }
                  .text-brief-formatted li { margin-bottom: 0.4rem; }
                  .text-brief-formatted strong { color: #005A3C; font-weight: 600; }
                `}</style>
                <div className="text-brief-formatted text-sm md:text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: aiBriefingText.replace(/\n\n/g, "<br/><br/>").replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/### (.*?)\n/g, "<h3>$1</h3>") }} />
              </div>
            )}
          </div>
        )}

        {/* 2. TALKING POINTS SEGMENT */}
        {activeOutput === "talking-points" && (
          <div className="p-6 md:p-8 space-y-6" id="talking-points-section-content">
            <div className="border-b border-gray-100 pb-4">
              <span className="text-[10px] bg-emerald-deep/10 text-emerald-light border border-emerald-deep/20 font-bold font-mono px-2 py-0.5 rounded uppercase">
                {isEn ? "Sovereign Dialogue Protocols" : "بروتوكولات التوجيه ونقاط المحادثة"}
              </span>
              <h3 className="text-xl font-bold font-serif text-slate-vip mt-1.5">
                {isEn ? "Bilateral Session Preparatory Talking Points" : "نقاط الحديث والأوراق التفاوضية المرشدة للوزير والوفد"}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="talking-points-cards-grid">
              {currentTP.map((tpOn: any, idxKey: number) => (
                <div key={idxKey} className="bg-slate-50/60 hover:bg-gold-bg/35 rounded-xl border border-gray-100 p-5 flex gap-4 transition-all duration-300">
                  <div className="h-8 w-8 rounded-full bg-emerald-deep text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    {idxKey + 1}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-slate-vip border-b border-gold-deep/20 pb-1 mb-2 text-sm md:text-base">
                      {isEn ? tpOn.headerEn : tpOn.headerAr}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-medium">
                      {isEn ? tpOn.pointEn : tpOn.pointAr}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-3 bg-gold-bg/30 rounded-lg border border-gold-border/40 text-xs text-gray-500 font-mono text-center flex items-center justify-center gap-1.5">
              <span>⚠️</span>
              <span>{isEn ? "DIPLOMATIC NOTICE: Strictly for use of the official UAE delegation." : "تنبيه دبلوماسي: يُحظر مشاركة أو تسريب هذه البنود الاستراتيجية خارج الوفد الرسمي."}</span>
            </div>
          </div>
        )}

        {/* 3. ONE-PAGER MEMORANDUM */}
        {activeOutput === "one-pager" && (
          <div className="p-8 md:p-12 space-y-6 text-slate-vip relative leading-relaxed" id="one-pager-section-content">
            {/* Elegant luxury background element representing premium paper structure */}
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-gold-deep to-emerald-deep"></div>
            
            {/* Header elements matching MOEI standards */}
            <div className="flex justify-between items-start border-b-2 border-slate-vip/20 pb-6" id="one-pager-memo-header">
              <div className="space-y-1">
                <p className="text-xs uppercase font-mono tracking-widest text-emerald-deep font-bold">
                  {isEn ? "MINISTRY OF ENERGY & INFRASTRUCTURE" : "وزارة الطاقة والبنية التحتية"}
                </p>
                <p className="text-xs uppercase font-mono tracking-widest text-gold-deep font-bold">
                  {isEn ? "UNITED ARAB EMIRATES" : "دولة الإمارات العربية المتحدة"}
                </p>
                <h3 className="text-2xl font-serif font-bold pt-1">
                  {isEn ? "OFFICIAL STRATEGIC MEMORANDUM" : "مذكرة التوجيه اللوجستي والسياسي المستعجل"}
                </h3>
              </div>
              <div className="text-right space-y-1" id="memo-security-badges">
                <span className="inline-block bg-red-600 text-white font-mono font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded">
                  {isEn ? "VIP CLASS / RESTRICTED" : "سرّي للغاية / للوفد العلوي"}
                </span>
                <p className="text-xs text-gray-400 font-mono">{isEn ? "REF: UAE-MOEI-83" : "رقم القيد: UAE-MOEI-83"}</p>
              </div>
            </div>

            {/* Form details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-gray-200 text-xs sm:text-sm font-sans" id="one-pager-memo-metadata-table">
              <div>
                <span className="text-gray-400 uppercase tracking-widest font-mono font-semibold block">{isEn ? "ACTIONABLE TO:" : "مرسل إلى:"}</span>
                <span className="font-bold text-slate-vip">{isEn ? "Ministry Dignitaries / Undersecretaries" : "القيادة العليا وحقيبة الوفد"}</span>
              </div>
              <div>
                <span className="text-gray-400 uppercase tracking-widest font-mono font-semibold block">{isEn ? "DRAFTED BY:" : "صياغة:"}</span>
                <span className="font-bold text-slate-vip">{isEn ? "Cabinet AI Strategic Advisor" : "مستشار الذكاء الاصطناعي للملف القيادي"}</span>
              </div>
              <div>
                <span className="text-gray-400 uppercase tracking-widest font-mono font-semibold block">{isEn ? "DATE OF BRIEF:" : "التاريخ:"}</span>
                <span className="font-bold text-slate-vip font-mono">June 9, 2026</span>
              </div>
              <div>
                <span className="text-gray-400 uppercase tracking-widest font-mono font-semibold block">{isEn ? "SUBJECT COMPLIANCE:" : "شأن الملف الثنائي:"}</span>
                <span className="font-bold text-emerald-deep font-serif">{country.nameEn} Profile</span>
              </div>
            </div>

            {/* Core memorandum sections */}
            <div className="space-y-4 text-xs sm:text-sm md:text-base" id="one-pager-memo-body-paragraphs">
              <div>
                <h4 className="font-serif font-bold text-slate-vip border-b border-gray-100 pb-1 mb-1.5 uppercase tracking-wide">
                  {isEn ? "1. STRATEGIC JUSTIFICATION" : "أولاً: الدوافع السيادية واللوجستية المشتركة"}
                </h4>
                <p className="text-gray-700 leading-relaxed text-justify">
                  {isEn ? country.profile.overviewEn : country.profile.overviewAr}
                </p>
              </div>

              <div>
                <h4 className="font-serif font-bold text-slate-vip border-b border-gray-100 pb-1 mb-1.5 uppercase tracking-wide">
                  {isEn ? "2. IMMODERATE SECTOR TARGETS" : "ثانياً: مجمعات ومواقع المبادرة الحيوية"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs">
                  <div className="bg-gold-bg/15 p-3 rounded border border-gold-border/40">
                    <span className="font-bold block text-emerald-deep mb-1">{isEn ? "ENERGY PROSPECT" : "آفاق وتفاهمات قطاع الطاقة"}</span>
                    <span>{isEn ? country.sectors.energyEn : country.sectors.energyAr}</span>
                  </div>
                  <div className="bg-gold-bg/15 p-3 rounded border border-gold-border/40">
                    <span className="font-bold block text-emerald-deep mb-1">{isEn ? "PORT LOGISTICS" : "أرصفة وشحن البنية التحتية"}</span>
                    <span>{isEn ? country.sectors.infrastructureEn : country.sectors.infrastructureAr}</span>
                  </div>
                  <div className="bg-gold-bg/15 p-3 rounded border border-gold-border/40">
                    <span className="font-bold block text-emerald-deep mb-1">{isEn ? "SUSTAINABLE TARGETS" : "نظم الاستدامة المتبادلة"}</span>
                    <span>{isEn ? country.sectors.sustainabilityEn : country.sectors.sustainabilityAr}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-serif font-bold text-slate-vip border-b border-gray-100 pb-1 mb-1.5 uppercase tracking-wide">
                  {isEn ? "3. OFFICIAL ADVICE SUMMARY" : "ثالثاً: ملخص توصيات وحوكمة الموقف الإماراتي"}
                </h4>
                <p className="text-gray-700 leading-relaxed text-justify">
                  {isEn ? country.strategicInsights.investmentsEn : country.strategicInsights.investmentsAr} {isEn ? country.predictive.proposalsEn : country.predictive.proposalsAr}
                </p>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-8 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400" id="one-pager-memo-signatures">
              <div>
                <p className="font-semibold uppercase font-mono tracking-widest text-emerald-deep">{isEn ? "UAE DIGITAL STRATEGIC ADVISOR" : "مستشار الذكاء الاصطناعي للملف الدبلوماسي"}</p>
                <p>{isEn ? "ELECTRONIC SEAL REGISTERED" : "الختم الفيدرالي الإلكتروني المعتمد"}</p>
              </div>
              <div className="right-signature text-right">
                <span className="font-serif font-semibold italic text-slate-vip block h-8">{isEn ? "MOEI Cabinet" : "حقيبة وزارة الطاقة والبنية التحتية"}</span>
                <span className="h-0.5 bg-gray-200 w-24 block"></span>
              </div>
            </div>
          </div>
        )}

        {/* 4. DIGITAL PRESENTATION SLIDE PLAYER CARD */}
        {activeOutput === "slides" && (
          <div className="p-0 bg-[#16211C] text-white flex flex-col justify-between min-h-[460px]" id="slide-player-card">
            
            {/* Upper state banner */}
            <div className="bg-slate-vip px-6 py-3 border-b border-gold-deep/20 flex items-center justify-between text-xs" id="slide-player-banner">
              <span className="text-gold-deep font-mono font-bold tracking-wider">
                {isEn ? `SLIDE DECK: ${country.nameEn} STRATEGIC PREPARATION` : `مجموعة الشرائح: الملف الاستراتيجي لـ ${country.nameAr}`}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-deep text-emerald-light rounded-full border border-emerald-light/20 font-mono font-bold">
                {isEn ? `SLIDE ${currentSlideIndex + 1} / ${slides.length}` : `الشريحة ${currentSlideIndex + 1} / ${slides.length}`}
              </span>
            </div>

            {/* Slide Body Widescreen Visual Area */}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative overflow-hidden" id="slide-player-content-body">
              {/* Elegant geometry styling matching executive briefings */}
              <div className="absolute top-2 right-2 w-16 h-16 border-t border-r border-[#C5A85A]/30"></div>
              <div className="absolute bottom-2 left-2 w-16 h-16 border-b border-l border-[#C5A85A]/30"></div>
              
              <div className="max-w-2xl mx-auto space-y-6 relative z-10 text-center md:text-left" style={{ direction: language === "ar" ? "rtl" : "ltr" }}>
                
                {/* Decorative title background line */}
                <div className="space-y-1">
                  <div className="h-1 w-20 bg-gold-deep mx-auto md:mx-0"></div>
                  <h4 className="text-2xl font-serif font-bold text-gold-deep tracking-tight">
                    {isEn ? slides[currentSlideIndex].titleEn : slides[currentSlideIndex].titleAr}
                  </h4>
                </div>

                {/* Bullets lists */}
                <ul className="space-y-4 text-sm md:text-base text-gray-300 list-none font-medium mt-4">
                  {(isEn ? slides[currentSlideIndex].bulletsEn : slides[currentSlideIndex].bulletsAr).map((bulOn: string, keyOn: number) => (
                    <li key={keyOn} className="flex items-start gap-3 justify-center md:justify-start">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-deep mt-2 shrink-0"></span>
                      <span>{bulOn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Controls Area */}
            <div className="bg-slate-vip px-6 py-4 border-t border-gold-deep/15 flex items-center justify-between flex-wrap gap-3" id="slide-player-controls">
              <p className="text-[10px] text-gray-500 font-mono">
                {isEn ? "Interactive Presentation Module" : "نظام العرض الرقمي المتكامل"}
              </p>
              
              <div className="flex items-center gap-3" id="slide-player-action-buttons">
                <button
                  onClick={handleExportToPptx}
                  className="bg-[#C5A85A]/10 hover:bg-[#C5A85A]/25 border border-[#C5A85A]/50 text-gold-deep px-3 py-1.5 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                  id="btn-export-pptx"
                  title={isEn ? "Export complete deck to PPTX" : "تصدير الملف بالكامل إلى عرض تقديمي PPTX"}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isEn ? "Export PPTX" : "تصدير العرض التقديمي"}</span>
                </button>

                <div className="h-4 w-px bg-white/15"></div>

                <button
                  onClick={handlePrevSlide}
                  className="p-2 bg-emerald-deep hover:bg-emerald-light text-white rounded-lg border border-gold-deep/20 cursor-pointer"
                  id="btn-slide-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-3 text-gold-deep font-bold">
                  {currentSlideIndex + 1} / {slides.length}
                </span>
                <button
                  onClick={handleNextSlide}
                  className="p-2 bg-emerald-deep hover:bg-emerald-light text-white rounded-lg border border-gold-deep/20 cursor-pointer"
                  id="btn-slide-next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
