import React, { useState } from "react";
import { PrebuiltCountry } from "../types";
import { ShieldAlert, Handshake, Landmark, Lightbulb, CheckSquare, PlusCircle, ArrowRightLeft } from "lucide-react";

interface StrategicInsightsViewProps {
  country: PrebuiltCountry;
  language: "en" | "ar";
}

export default function StrategicInsightsView({ country, language }: StrategicInsightsViewProps) {
  const isEn = language === "en";
  const [selectedBilateralTopic, setSelectedBilateralTopic] = useState<string>("ports");

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

  return (
    <div className="space-y-6" id="strategic-insights-view-tab">
      
      {/* Three Pillars Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="three-pillars-strategic-grid">
        
        {/* Partnership Pillar */}
        <div className="bg-white rounded-sm shadow-md border border-gold-border border-l-4 border-emerald-deep p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-emerald-deep mb-4">
              <div className="p-2 bg-emerald-deep/5 rounded-lg text-emerald-deep">
                <Handshake className="w-5 h-5 text-gold-deep" />
              </div>
              <h4 className="font-serif font-bold text-base text-slate-vip">
                {isEn ? "Bilateral Partnerships" : "فرص الشراكة والتحالف"}
              </h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-sans font-medium">
              {isEn ? country.strategicInsights.partnershipsEn : country.strategicInsights.partnershipsAr}
            </p>
          </div>
          <div className="border-t border-gray-100 pt-4 mt-6 text-xs font-mono text-emerald-light font-bold flex items-center justify-between">
            <span>{isEn ? "TARGET FIELD" : "المجال المستهدف"}</span>
            <span className="uppercase">{isEn ? "Energy / Hydrogen" : "الطاقة / الهيدروجين"}</span>
          </div>
        </div>

        {/* Investment Pillar */}
        <div className="bg-white rounded-sm shadow-md border border-gold-border border-l-4 border-emerald-deep p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-emerald-deep mb-4">
              <div className="p-2 bg-emerald-deep/5 rounded-lg text-emerald-deep">
                <Landmark className="w-5 h-5 text-gold-deep" />
              </div>
              <h4 className="font-serif font-bold text-base text-slate-vip">
                {isEn ? "Strategic Investments" : "الاستثمارات السيادية والموانئ"}
              </h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-sans font-medium">
              {isEn ? country.strategicInsights.investmentsEn : country.strategicInsights.investmentsAr}
            </p>
          </div>
          <div className="border-t border-gray-100 pt-4 mt-6 text-xs font-mono text-emerald-light font-bold flex items-center justify-between">
            <span>{isEn ? "INSTRUMENT" : "الآلية الاستثمارية"}</span>
            <span className="uppercase">{isEn ? "Sovereign / Ports" : "سيادي / موانئ وطرق"}</span>
          </div>
        </div>

        {/* Knowledge Pillar */}
        <div className="bg-white rounded-sm shadow-md border border-gold-border border-l-4 border-emerald-deep p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-emerald-deep mb-4">
              <div className="p-2 bg-emerald-deep/5 rounded-lg text-emerald-deep">
                <Lightbulb className="w-5 h-5 text-gold-deep" />
              </div>
              <h4 className="font-serif font-bold text-base text-slate-vip">
                {isEn ? "Knowledge Exchange" : "تبادل الخبرات والعلوم"}
              </h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-sans font-medium">
              {isEn ? country.strategicInsights.knowledgeEn : country.strategicInsights.knowledgeAr}
            </p>
          </div>
          <div className="border-t border-gray-100 pt-4 mt-6 text-xs font-mono text-emerald-light font-bold flex items-center justify-between">
            <span>{isEn ? "FOCUS TYPE" : "نوع نقل المعرفة"}</span>
            <span className="uppercase">{isEn ? "Tech Transfer" : "نقل التكنولوجيا"}</span>
          </div>
        </div>
      </div>

      {/* Flagship Bilateral Collaboration Scenario Builder */}
      <div className="bg-white rounded-sm shadow-md border-l-4 border-gold-deep p-6 md:p-8 relative" id="flagship-bilateral-builder">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs font-bold font-mono tracking-widest text-emerald-deep bg-gold-bg border border-gold-border/60 px-2.5 py-1 rounded">
              {isEn ? "RECOMMENDED BILATERAL INITIATIVE" : "المبادرة الاستراتيجية المقترحة للوفد الثنائي"}
            </span>
            <h3 className="font-serif font-bold text-xl text-slate-vip mt-2">
              {isEn ? bilateralCase.titleEn : bilateralCase.titleAr}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-deep text-white px-3 py-1 text-xs rounded-full font-bold">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isEn ? "UAE Core Alignment" : "توافق وطني إماراتي"}</span>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="bilateral-alignment-details">
          <div className="bg-gold-bg/30 p-5 rounded-sm border border-gold-border">
            <h4 className="text-sm font-bold text-slate-vip/80 mb-2 uppercase tracking-wide">
              {isEn ? "Strategic Scope & Decarbonization Roadmap" : "نطاق العمل الاستراتيجي وخارطة الطريق"}
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {isEn ? bilateralCase.descEn : bilateralCase.descAr}
            </p>
          </div>

          <div className="bg-[#F0F5F2] p-5 rounded-sm border border-emerald-deep/25">
            <h4 className="text-sm font-bold text-emerald-deep mb-2 uppercase tracking-wide">
              {isEn ? "Expected Economic & Logistic Impact" : "الأثر اللوجستي والاقتصادي المتوقع"}
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              {isEn ? bilateralCase.impactEn : bilateralCase.impactAr}
            </p>
          </div>
        </div>

        {/* Action Propose Section */}
        <div className="mt-6 p-4 bg-gold-bg border-l-4 border-gold-deep rounded-sm flex items-start gap-3" id="briefing-action-point">
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
      </div>

    </div>
  );
}
