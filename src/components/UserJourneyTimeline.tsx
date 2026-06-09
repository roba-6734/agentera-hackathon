import React from "react";
import { Check, ClipboardList, Send, Database, Compass, CheckCircle, FileText, BarChart3, Presentation, Milestone } from "lucide-react";

interface UserJourneyTimelineProps {
  language: "en" | "ar";
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export default function UserJourneyTimeline({ language, currentStep, setCurrentStep }: UserJourneyTimelineProps) {
  const isEn = language === "en";

  // Official 9 stages representing the entire pre-meeting workflow
  const officialWorkflowSteps = [
    {
      step: 1,
      titleEn: "Bilateral Announced",
      titleAr: "إعلان الاجتماع ثنائياً",
      descEn: "Bilateral summit context officially added to calendar.",
      descAr: "تقييد وتعميم جلسة الوفد بجدول أعمال الوزارة.",
      icon: <Send className="w-4 h-4" />,
    },
    {
      step: 2,
      titleEn: "Target Nation Selected",
      titleAr: "اختيار الدولة الشريكة",
      descEn: "Load primary diplomatic and geographical parameters.",
      descAr: "تحميل معلمات القيادة والعقد الجغرافي للدولة النظيرة.",
      icon: <Milestone className="w-4 h-4" />,
    },
    {
      step: 3,
      titleEn: "Retrieve Sovereign Metrics",
      titleAr: "استرجاع بيانات المؤشرات",
      descEn: "Pull GDP, energy matrices, and trade histories.",
      descAr: "سحب وتدقيق الناتج المحلي، مؤشر النقل والطاقة والقدرات.",
      icon: <Database className="w-4 h-4" />,
    },
    {
      step: 4,
      titleEn: "Smart AI Analysis",
      titleAr: "التحليل الاستراتيجي الذكي",
      descEn: "Run comparative benchmarks with the UAE.",
      descAr: "إطلاق موازنات الذكاء الاصطناعي مع قياس القوة النسبية.",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      step: 5,
      titleEn: "Pinpoint Intersections",
      titleAr: "تحديد الفرص والمحاور",
      descEn: "Extract investable renewable solar farms or smart ports.",
      descAr: "استخلاص مجمعات الاستثمار وفرص شركة مصدر وموانئ دبي.",
      icon: <Compass className="w-4 h-4" />,
    },
    {
      step: 6,
      titleEn: "Structure Briefing Summary",
      titleAr: "صياغة التقرير والملخص",
      descEn: "Consolidate executive briefing blocks.",
      descAr: "تنظيم وصياغة نبذة المستشار الرقمي لحقيبة الوزير.",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      step: 7,
      titleEn: "Generate Speaking Guides",
      titleAr: "نقاط الحديث للوفد",
      descEn: "Generate critical conversational directives and targets.",
      descAr: "توليد بنود الموقف السياسي الإماراتي وتطويق الفجوات.",
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      step: 8,
      titleEn: "Compile Presenting Media",
      titleAr: "تجهيز الشرائح والعرض",
      descEn: "Widescreen slides prepared for immediate sharing.",
      descAr: "صياغة ملف الشرائح التفاعلي وجريد العرض للشاشات.",
      icon: <Presentation className="w-4 h-4" />,
    },
    {
      step: 9,
      titleEn: "Missions Readiness Level 100%",
      titleAr: "جاهزية الاجتماع الكاملة",
      descEn: "Delegation 100% briefed. Materials securely synchronized.",
      descAr: "دعم اتخاذ القرار مكتمل. الحقيبة متزامنة ومؤمنة تماماً للمجلس.",
      icon: <CheckCircle className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-white rounded-sm shadow-md border-l-4 border-[#C5A059] p-6 md:p-8" id="user-journey-stepper-panel">
      
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4" id="workflow-header-timeline">
        <h3 className="font-serif font-bold text-lg md:text-xl text-slate-vip">
          {isEn ? "Interactive Briefing Preparation Workflow" : "رحلة المستندات ومراحل الاستعداد للاجتماع الثنائي"}
        </h3>
        <span className="text-xs bg-gold-bg text-gold-deep border border-gold-border/40 hover:bg-gold-border/10 px-2.5 py-1 rounded-full font-bold">
          {isEn ? `Stage ${currentStep} of 9` : `المرحلة ${currentStep} من 9`}
        </span>
      </div>

      {/* Progress tracker timeline graphic bar */}
      <div className="grid grid-cols-1 md:grid-cols-9 gap-4 relative" id="timeline-stepper-graphic-grid">
        {officialWorkflowSteps.map((wkOn) => {
          const isActive = currentStep >= wkOn.step;
          const isCurrent = currentStep === wkOn.step;

          return (
            <button
              key={wkOn.step}
              onClick={() => setCurrentStep(wkOn.step)}
              className={`text-left md:text-center flex md:flex-col items-center gap-4 md:gap-2.5 p-3 rounded-lg transition-all duration-300 border cursor-pointer ${
                isCurrent
                  ? "bg-slate-vip text-white border-gold-deep shadow-md scale-102"
                  : isActive
                  ? "bg-gold-bg/45 text-slate-vip border-gold-deep/40 hover:bg-gold-bg/70"
                  : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
              }`}
              id={`step-btn-${wkOn.step}`}
            >
              {/* Stepper Dot circle indicating completion */}
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                  isCurrent
                    ? "bg-gold-deep text-slate-vip shadow-md"
                    : isActive
                    ? "bg-emerald-deep text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isActive && !isCurrent && currentStep > wkOn.step ? (
                  <Check className="w-4 h-4" />
                ) : (
                  wkOn.icon
                )}
              </div>

              {/* Informative summary tags */}
              <div className="md:text-center text-left" id={`step-meta-${wkOn.step}`}>
                <p className={`text-xs font-bold leading-tight ${isCurrent ? "text-gold-deep" : "text-slate-vip"}`}>
                  {isEn ? wkOn.titleEn : wkOn.titleAr}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 md:hidden lg:line-clamp-2">
                  {isEn ? wkOn.descEn : wkOn.descAr}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary helper representing the VIP workflow */}
      <div className="mt-6 p-4 bg-emerald-deep/[0.01] border border-emerald-deep/10 rounded-xl flex items-center justify-between text-xs sm:text-sm text-gray-600">
        <span>
          {isEn
            ? "⚠️ HIGH OFFICIAL PROTOCOL: Click any workflow stage to simulate state transitions or directly trigger AI brief formats."
            : "⚠️ مصفوفة الحوكمة: يمكنك النقر فوق أي مرحلة عمل استراتيجية لتهيئة البيانات وتجهيز ملفات الدعم التلقائي."}
        </span>
        <button
          onClick={() => setCurrentStep(9)}
          className="px-3 py-1 bg-emerald-deep hover:bg-emerald-light font-bold text-white font-mono rounded border border-gold-deep/20 cursor-pointer"
        >
          {isEn ? "Force 100% Prepared" : "تسريع الجاهزية القصوى"}
        </button>
      </div>

    </div>
  );
}
