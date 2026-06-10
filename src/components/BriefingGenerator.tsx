import React, { useState } from "react";
import pptxgen from "pptxgenjs";
import { PrebuiltCountry, UaeIndicator } from "../types";
import { FileText, Award, Layers, Volume2, ChevronLeft, ChevronRight, HelpCircle, ArrowRightLeft, FileCheck, Download, X, Printer, AlertTriangle } from "lucide-react";

interface BriefingGeneratorProps {
  country: PrebuiltCountry;
  language: "en" | "ar";
  aiBriefingText: string;
  isGenerating: boolean;
  briefingSource?: string;
  meetingObjective?: string;
  uaeData?: UaeIndicator;
}

export default function BriefingGenerator({
  country,
  language,
  aiBriefingText,
  isGenerating,
  briefingSource,
  meetingObjective,
  uaeData,
}: BriefingGeneratorProps) {
  const isEn = language === "en";
  const [activeOutput, setActiveOutput] = useState<"summary" | "talking-points" | "one-pager" | "slides">("summary");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

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

  const handleExportToPdf = () => {
    setPrintError(null);
    try {
      // Define appropriate fallback indicators for comparative engine
      const fallbackUaeData: UaeIndicator = {
        nameEn: "United Arab Emirates",
        nameAr: "دولة الإمارات العربية المتحدة",
        flag: "🇦🇪",
        gdp: "$507 Billion",
        gdpAr: "507 مليار دولار",
        growth: "+3.6% (2025)",
        energyMix: "Nuclear, Solar PV, Gas",
        energyMixAr: "طاقة نووية، شمسية، غاز",
        infrastructureIndex: "91.4 / 100",
        infrastructureIndexAr: "91.4 / 100",
        environmentalRank: "2nd Regional",
        environmentalRankAr: "الثاني إقليمياً",
        competitivenessRank: "10th Globally",
        competitivenessRankAr: "العاشر عالمياً",
        cooperationAgreementEn: "Comprehensive Economic Partnership Agreement (CEPA)",
        cooperationAgreementAr: "اتفاقية الشراكة الاقتصادية الشاملة"
      };

      const activeUae = uaeData || fallbackUaeData;
      const activeObjective = meetingObjective?.trim() || (isEn 
        ? "Consolidate active trade corridors, harmonize deep water shipping protocols, establish mutual renewable power targets, and coordinate regional policy."
        : "توطيد ممرات التبادل التجاري المفتوح، ومواءمة معايير الشحن والموانئ البحرية العميقة، وبناء محطات توليد الطاقة والممر المشترك.");

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const formattedBriefingText = aiBriefingText
        .replace(/\n\n/g, "</p><p style='margin-bottom: 12px; text-align: justify;'>")
        .replace(/\n/g, "<br/>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/### (.*?)(?:<br\/>|\n|$)/g, "<h3 style='margin-top: 22px; margin-bottom: 8px; font-size: 15px; color: #16211C; border-bottom: 1px solid #E8DCC4; padding-bottom: 4px;font-family: \"Playfair Display\", serif;'>$1</h3>");

      const printHtml = `
<!DOCTYPE html>
<html lang="${language}" dir="${isEn ? "ltr" : "rtl"}">
<head>
  <meta charset="utf-8">
  <title>Cabinet_Briefing_Memo_${country.nameEn}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Noto+Kufi+Arabic:wght@400;500;700&display=swap');
    
    * {
      box-sizing: border-box;
    }
    body {
      background: #fafaf9;
      color: #1c2421;
      font-family: ${isEn ? "'Inter', sans-serif" : "'Noto Kufi Arabic', sans-serif"};
      margin: 0;
      padding: 35px;
      line-height: 1.5;
    }
    .page {
      background: white;
      border: 1px solid #e5e5e0;
      border-top: 6px solid #16211C;
      padding: 45px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      max-width: 850px;
      margin: 0 auto;
      position: relative;
    }
    .page-header {
      border-bottom: 2px solid #C5A059;
      padding-bottom: 18px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .ministry-title {
      font-family: ${isEn ? "'Cinzel', serif" : "'Noto Kufi Arabic', sans-serif"};
      color: #16211C;
      margin: 0;
      font-size: ${isEn ? "14px" : "12px"};
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .emirates-title {
      font-family: ${isEn ? "'Cinzel', serif" : "'Noto Kufi Arabic', sans-serif"};
      color: #C5A059;
      margin: 0;
      font-size: ${isEn ? "12px" : "10px"};
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .doc-title {
      font-family: 'Playfair Display', serif;
      font-weight: 700;
      font-size: ${isEn ? "21px" : "18px"};
      color: #16211C;
      margin: 12px 0 0 0;
    }
    .security-badge {
      background: #e11d48;
      color: white;
      font-family: monospace;
      font-weight: 700;
      font-size: 9px;
      padding: 4px 9px;
      border-radius: 2px;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: inline-block;
    }
    .metadata-box {
      background: #F8F8F6;
      border: 1px solid #E8DCC4;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 25px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 12px;
    }
    .metadata-item h5 {
      color: #718096;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
    }
    .metadata-item p {
      margin: 0;
      font-weight: 700;
      color: #16211C;
    }
    .section-title {
      font-family: 'Playfair Display', serif;
      color: #16211C;
      font-size: 16px;
      border-bottom: 1.5px solid #E8DCC4;
      padding-bottom: 4px;
      margin: 25px 0 12px 0;
      text-transform: ${isEn ? "uppercase" : "none"};
      letter-spacing: 0.5px;
    }
    .metrics-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 12px;
    }
    .metrics-table th {
      background: #16211C;
      color: #C5A059;
      text-align: ${isEn ? "left" : "right"};
      padding: 8px 10px;
      font-weight: 600;
      border: 1px solid #16211C;
    }
    .metrics-table td {
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
    }
    .metrics-table tr:nth-child(even) {
      background: #F9F9F7;
    }
    .briefing-content {
      font-size: 13px;
      color: #2d3748;
      text-align: justify;
    }
    .points-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .point-card {
      background: #F9F9F7;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 12px;
      font-size: 12px;
    }
    .point-card h4 {
      margin: 0 0 6px 0;
      color: #16211C;
      font-family: 'Playfair Display', serif;
      font-weight: 700;
      border-bottom: 1px solid #E8DCC4;
      padding-bottom: 3px;
    }
    .point-number {
      display: inline-block;
      background: #16211C;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      text-align: center;
      line-height: 16px;
      font-size: 9px;
      margin-right: ${isEn ? "5px" : "0"};
      margin-left: ${isEn ? "0" : "5px"};
      font-weight: 700;
    }
    .diplomatic-warning {
      background: #FFFBEB;
      border: 1px solid #FCD34D;
      color: #B45309;
      font-size: 10px;
      padding: 8px;
      border-radius: 4px;
      text-align: center;
      margin: 20px 0;
    }
    .footer-signatures {
      border-top: 1px solid #E2E8F0;
      padding-top: 15px;
      margin-top: 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #718096;
    }
    .seal-text {
      color: #16211C;
      font-weight: 700;
    }
    .page-break {
      page-break-before: always;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;
      }
      .page {
        border: none;
        box-shadow: none;
        padding: 0;
        margin: 0;
        max-width: 100%;
        page-break-after: always;
      }
      .page:last-child {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- FIRST PAGE: OVERVIEW, META & COMPARATIVE STATISTICS -->
  <div class="page">
    <div class="page-header">
      <div>
        <h4 class="ministry-title">${isEn ? "MINISTRY OF ENERGY & INFRASTRUCTURE" : "وزارة الطاقة والبنية التحتية"}</h4>
        <h5 class="emirates-title">${isEn ? "UNITED ARAB EMIRATES" : "دولة الإمارات العربية المتحدة"}</h5>
        <h1 class="doc-title">${isEn ? "EXECUTIVE STRATEGIC DOSSIER" : "الملف الاستراتيجي المشترك والتحليل السيادي"}</h1>
      </div>
      <div>
        <span class="security-badge">${isEn ? "CLASSIFIED / RESTRICTED" : "سرّي للغاية / تداول محدود"}</span>
        <div style="font-family: monospace; font-size: 10px; color: #718096; margin-top: 6px; text-align: right;">
          ${isEn ? "REF: MOEI-VIP-99" : "رقم القيد: MOEI-VIP-99"}
        </div>
      </div>
    </div>

    <!-- METADATA INFORMATION BLOCK -->
    <div class="metadata-box">
      <div class="metadata-item">
        <h5>${isEn ? "PARTNER STATE" : "الشريك الدولي"}</h5>
        <p>${country.flag} ${isEn ? country.nameEn : country.nameAr}</p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "AUTHORITY NODE" : "جهة الصدور"}</h5>
        <p>${isEn ? "Cabinet AI Strategic Advisor" : "مستشار الذكاء الاصطناعي لحقيبة الوزير"}</p>
      </div>
      <div class="metadata-item" style="grid-column: span 2;">
        <h5>${isEn ? "SPECIFIC TALKS OBJECTIVE" : "الهدف المحدد والمطلوب للمباحثات الثنائية"}</h5>
        <p style="font-weight: 500; font-size: 11px; line-height: 1.4; color: #2d3748;">
          ${activeObjective}
        </p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "DATE OF ACQUISITION" : "تاريخ إصدار التقرير"}</h5>
        <p style="font-family: monospace;">June 9, 2026</p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "Bilateral Treaty" : "طبيعة العلاقات الثنائية"}</h5>
        <p style="font-size: 11px; color: #16211C;">${isEn ? country.indicators.cooperationAgreementEn : country.indicators.cooperationAgreementAr}</p>
      </div>
    </div>

    <!-- SOVEREIGN SYSTEM BENCHMARKS (COMPARATIVE GRID) -->
    <h2 class="section-title">${isEn ? "Sovereign Benchmarks Engine" : "جرد ومقارنة المؤشرات السيادية والتنافسية للبلدين"}</h2>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>${isEn ? "Benchmark Indicator" : "مؤشر القياس والتنافسية"}</th>
          <th>${isEn ? "United Arab Emirates 🇦🇪" : "دولة الإمارات العربية المتحدة 🇦🇪"}</th>
          <th>${country.flag} ${isEn ? country.nameEn : country.nameAr}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${isEn ? "Sovereign GDP" : "الناتج المحلي الإجمالي"}</strong></td>
          <td>${isEn ? activeUae.gdp : activeUae.gdpAr}</td>
          <td>${isEn ? country.indicators.gdp : country.indicators.gdpAr}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Annual Real Growth Rate" : "معدل النمو السنوي الفعلي"}</strong></td>
          <td>${activeUae.growth}</td>
          <td>${country.indicators.growth}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Infrastructure System Index" : "ترتيب جودة البنية التحتية والموانئ"}</strong></td>
          <td>${isEn ? activeUae.infrastructureIndex : activeUae.infrastructureIndexAr}</td>
          <td>${country.indicators.infrastructureIndex}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Global Competitiveness Rank" : "تأهيل مؤشر التنافسية العالمي"}</strong></td>
          <td>${isEn ? activeUae.competitivenessRank : activeUae.competitivenessRankAr}</td>
          <td>${country.indicators.competitivenessRank}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Environmental Quality Rank" : "مؤشر التنمية والاستدامة البيئية"}</strong></td>
          <td>${isEn ? activeUae.environmentalRank : activeUae.environmentalRankAr}</td>
          <td>${country.indicators.environmentalRank}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Energy Sourcing Grid Mix" : "مزيج خطوط توليد الشبكة الوطنية للكهرباء"}</strong></td>
          <td>${isEn ? activeUae.energyMix : activeUae.energyMixAr}</td>
          <td>${isEn ? country.indicators.energyMix : country.indicators.energyMixAr}</td>
        </tr>
      </tbody>
    </table>

    <div class="diplomatic-warning">
      ⚠️ ${isEn 
        ? "NOTICE: Confirmed federal stats mapped side-by-side. Confirm values with accompanying documentation before drafting formal treaties." 
        : "إقرار الفيدرالية: جرى دمج هذه البيانات والمطابقة الإحصائية الرسمية تلقائياً. يرجى تأكيد الأرقام بمقارنتها مع الكشوفات المصاحبة."}
    </div>

    <div class="footer-signatures">
      <div>
        <p class="seal-text">${isEn ? "FEDERAL PORTFOLIO NODE" : "منصة الدعم الفيدرالي الموحد"}</p>
        <p>${isEn ? "UAE Ministry of Energy & Infrastructure" : "وزارة الطاقة والبنية التحتية - دولة الإمارات العربية المتحدة"}</p>
      </div>
      <div style="text-align: right;">
        <span style="font-style: italic; font-weight: 700;">Page 1 of 2</span>
      </div>
    </div>
  </div>

  <!-- SECOND PAGE: AI-GENERATED BRIEFING MEMO & DIGNITARY TALKING POINTS -->
  <div class="page page-break">
    <div class="page-header">
      <div>
        <h4 class="ministry-title">${isEn ? "MINISTRY OF ENERGY & INFRASTRUCTURE" : "وزارة الطاقة والبنية التحتية"}</h4>
        <h5 class="emirates-title">${isEn ? "UNITED ARAB EMIRATES" : "دولة الإمارات العربية المتحدة"}</h5>
        <h1 class="doc-title">${isEn ? "EXECUTIVE DECISION AI ANALYSIS" : "التحليل المعمق وإجراءات مذكرات الوفد"}</h1>
      </div>
      <div>
        <span class="security-badge" style="background-color: #0d9488;">${isEn ? "SECURE CHANNELS Active" : "تأمين نشط للقنوات"}</span>
      </div>
    </div>

    <h2 class="section-title" style="margin-top: 0;">${isEn ? "Real-Time Alignment Intelligence Summary" : "تقرير الإيجاز التوليدي الذكي لمذكرة التفاهم"}</h2>
    <div class="briefing-content">
      <p style="margin-bottom: 12px; text-align: justify;">
        ${formattedBriefingText}
      </p>
    </div>

    <h2 class="section-title">${isEn ? "Strategic Preparatory Dialogue Protocols" : "نقاط الحديث الثنائية الموصى بتغطيتها خلال الاجتماع"}</h2>
    <div class="points-grid">
      ${currentTP.map((tpOn: any, idxKey: number) => `
        <div class="point-card">
          <h4>
            <span class="point-number">${idxKey + 1}</span>
            ${isEn ? tpOn.headerEn : tpOn.headerAr}
          </h4>
          <p style="margin: 0; color: #4a5568; line-height: 1.4; font-size: 11px;">
            ${isEn ? tpOn.pointEn : tpOn.pointAr}
          </p>
        </div>
      `).join("")}
    </div>

    <div class="footer-signatures">
      <div>
        <p class="seal-text">${isEn ? "SECURE CHANNELS SEAL REGISTERED" : "تم ختم وتصديق القنوات الدبلوماسية إلكترونياً"}</p>
        <p>${isEn ? "CONFIDENTIAL - Strictly UAE Delegation Use Only" : "سرّي للغاية - يُتداول لوفد دولة الإمارات العربيّة المتحدّة حصراً"}</p>
      </div>
      <div style="text-align: right;">
        <span style="font-style: italic; font-weight: 700;">Page 2 of 2</span>
      </div>
    </div>
  </div>

</body>
</html>
      `;

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();

        // Let rendering settle then trigger print dialog
        setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          } catch (printEx: any) {
            console.warn("Direct iframe print blocked:", printEx);
            setPrintError(isEn 
              ? "Your browser's iframe security sandbox blocks direct print dialogues here. Please click 'Download Offline Dossier' below instead to save or print perfectly!" 
              : "حظر برتوكول الأمان الفيدرالي الطباعة المباشرة داخل هذا الإطار. يرجى الضغط على زر تصدير ملف HTML الخارجي أدناه لحفظه وطباعته.");
          }
          // Cleanup
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }, 800);
      }
    } catch (error: any) {
      console.error("PDF generation failed:", error);
      setPrintError(isEn 
        ? "Could not initiate local browser print module. Please use our high-fidelity downloadable HTML memo instead." 
        : "تعذر تشغيل معالج الطباعة التلقائي بالمتصفح. يرجى استخدام ميزة تصدير وتحميل الملف الرئاسي بالأسفل.");
    }
  };

  const downloadOfflineHtml = () => {
    try {
      const fallbackUaeData: UaeIndicator = {
        nameEn: "United Arab Emirates",
        nameAr: "دولة الإمارات العربية المتحدة",
        flag: "🇦🇪",
        gdp: "$507 Billion",
        gdpAr: "507 مليار دولار",
        growth: "+3.6% (2025)",
        energyMix: "Nuclear, Solar PV, Gas",
        energyMixAr: "طاقة نووية، شمسية، غاز",
        infrastructureIndex: "91.4 / 100",
        infrastructureIndexAr: "91.4 / 100",
        environmentalRank: "2nd Regional",
        environmentalRankAr: "الثاني إقليمياً",
        competitivenessRank: "10th Globally",
        competitivenessRankAr: "العاشر عالمياً",
        cooperationAgreementEn: "Comprehensive Economic Partnership Agreement (CEPA)",
        cooperationAgreementAr: "اتفاقية الشراكة الاقتصادية الشاملة"
      };

      const activeUae = uaeData || fallbackUaeData;
      const activeObjective = meetingObjective?.trim() || (isEn 
        ? "Consolidate active trade corridors, harmonize deep water shipping protocols, establish mutual renewable power targets, and coordinate regional policy."
        : "توطيد ممرات التبادل التجاري المفتوح، ومواءمة معايير الشحن والموانئ البحرية العميقة، وبناء محطات توليد الطاقة والممر المشترك.");

      const formattedBriefingText = aiBriefingText
        .replace(/\n\n/g, "</p><p style='margin-bottom: 12px; text-align: justify;'>")
        .replace(/\n/g, "<br/>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/### (.*?)(?:<br\/>|\n|$)/g, "<h3 style='margin-top: 22px; margin-bottom: 8px; font-size: 15px; color: #16211C; border-bottom: 1px solid #E8DCC4; padding-bottom: 4px;font-family: \"Playfair Display\", serif;'>$1</h3>");

      const printHtml = `
<!DOCTYPE html>
<html lang="${language}" dir="${isEn ? "ltr" : "rtl"}">
<head>
  <meta charset="utf-8">
  <title>Cabinet_Briefing_Memo_${country.nameEn.replace(/\s+/g, "_")}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Noto+Kufi+Arabic:wght@400;500;700&display=swap');
    
    * {
      box-sizing: border-box;
    }
    body {
      background: #fafaf9;
      color: #1c2421;
      font-family: ${isEn ? "'Inter', sans-serif" : "'Noto Kufi Arabic', sans-serif"};
      margin: 0;
      padding: 35px;
      line-height: 1.5;
    }
    .print-actions-bar {
      max-width: 850px;
      margin: 0 auto 20px auto;
      background: #16211C;
      padding: 15px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .print-main-title {
      color: #C5A059;
      margin: 0;
      font-family: 'Cinzel', serif;
      font-size: 13px;
    }
    .action-btn {
      background: #C5A059;
      color: #16211C;
      border: 1px solid #C5A059;
      font-weight: bold;
      font-size: 11px;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.2s;
    }
    .action-btn:hover {
      background: transparent;
      color: #C5A059;
    }
    .page {
      background: white;
      border: 1px solid #e5e5e0;
      border-top: 6px solid #16211C;
      padding: 45px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      max-width: 850px;
      margin: 0 auto 30px auto;
      position: relative;
    }
    .page-header {
      border-bottom: 2px solid #C5A059;
      padding-bottom: 18px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .ministry-title {
      font-family: ${isEn ? "'Cinzel', serif" : "'Noto Kufi Arabic', sans-serif"};
      color: #16211C;
      margin: 0;
      font-size: ${isEn ? "14px" : "12px"};
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .emirates-title {
      font-family: ${isEn ? "'Cinzel', serif" : "'Noto Kufi Arabic', sans-serif"};
      color: #C5A059;
      margin: 0;
      font-size: ${isEn ? "12px" : "10px"};
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .doc-title {
      font-family: 'Playfair Display', serif;
      font-weight: 700;
      font-size: ${isEn ? "21px" : "18px"};
      color: #16211C;
      margin: 12px 0 0 0;
    }
    .security-badge {
      background: #e11d48;
      color: white;
      font-family: monospace;
      font-weight: 700;
      font-size: 9px;
      padding: 4px 9px;
      border-radius: 2px;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: inline-block;
    }
    .metadata-box {
      background: #F8F8F6;
      border: 1px solid #E8DCC4;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 25px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 12px;
    }
    .metadata-item h5 {
      color: #718096;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
    }
    .metadata-item p {
      margin: 0;
      font-weight: 700;
      color: #16211C;
    }
    .section-title {
      font-family: 'Playfair Display', serif;
      color: #16211C;
      font-size: 16px;
      border-bottom: 1.5px solid #E8DCC4;
      padding-bottom: 4px;
      margin: 25px 0 12px 0;
      text-transform: ${isEn ? "uppercase" : "none"};
      letter-spacing: 0.5px;
    }
    .metrics-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 12px;
    }
    .metrics-table th {
      background: #16211C;
      color: #C5A059;
      text-align: ${isEn ? "left" : "right"};
      padding: 8px 10px;
      font-weight: 600;
      border: 1px solid #16211C;
    }
    .metrics-table td {
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
    }
    .metrics-table tr:nth-child(even) {
      background: #F9F9F7;
    }
    .briefing-content {
      font-size: 13px;
      color: #2d3748;
      text-align: justify;
    }
    .points-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .point-card {
      background: #F9F9F7;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 12px;
      font-size: 12px;
    }
    .point-card h4 {
      margin: 0 0 6px 0;
      color: #16211C;
      font-family: 'Playfair Display', serif;
      font-weight: 700;
      border-bottom: 1px solid #E8DCC4;
      padding-bottom: 3px;
    }
    .point-number {
      display: inline-block;
      background: #16211C;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      text-align: center;
      line-height: 16px;
      font-size: 9px;
      margin-right: ${isEn ? "5px" : "0"};
      margin-left: ${isEn ? "0" : "5px"};
      font-weight: 700;
    }
    .diplomatic-warning {
      background: #FFFBEB;
      border: 1px solid #FCD34D;
      color: #B45309;
      font-size: 10px;
      padding: 8px;
      border-radius: 4px;
      text-align: center;
      margin: 20px 0;
    }
    .footer-signatures {
      border-top: 1px solid #E2E8F0;
      padding-top: 15px;
      margin-top: 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #718096;
    }
    .seal-text {
      color: #16211C;
      font-weight: 700;
    }
    .page-break {
      page-break-before: always;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;
      }
      .print-actions-bar {
        display: none !important;
      }
      .page {
        border: none;
        box-shadow: none;
        padding: 0;
        margin: 0;
        max-width: 100%;
        page-break-after: always;
      }
      .page:last-child {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>

  <div class="print-actions-bar">
    <h3 class="print-main-title">${isEn ? "UAE CABINET STRATEGIC BRIEFING EXPEDITION" : "وفد وزارة الطاقة والبنية التحتية لحكومة الإمارات"}</h3>
    <button class="action-btn" onclick="window.print()">${isEn ? "Print / Save PDF" : "بدء الطباعة أو الحفظ كـ PDF"}</button>
  </div>

  <!-- FIRST PAGE: OVERVIEW, META & COMPARATIVE STATISTICS -->
  <div class="page">
    <div class="page-header">
      <div>
        <h4 class="ministry-title">${isEn ? "MINISTRY OF ENERGY & INFRASTRUCTURE" : "وزارة الطاقة والبنية التحتية"}</h4>
        <h5 class="emirates-title">${isEn ? "UNITED ARAB EMIRATES" : "دولة الإمارات العربية المتحدة"}</h5>
        <h1 class="doc-title">${isEn ? "EXECUTIVE STRATEGIC DOSSIER" : "الملف الاستراتيجي المشترك والتحليل السيادي"}</h1>
      </div>
      <div>
        <span class="security-badge">${isEn ? "CLASSIFIED / RESTRICTED" : "سرّي للغاية / تداول محدود"}</span>
        <div style="font-family: monospace; font-size: 10px; color: #718096; margin-top: 6px; text-align: right;">
          ${isEn ? "REF: MOEI-VIP-99" : "رقم القيد: MOEI-VIP-99"}
        </div>
      </div>
    </div>

    <!-- METADATA INFORMATION BLOCK -->
    <div class="metadata-box">
      <div class="metadata-item">
        <h5>${isEn ? "PARTNER STATE" : "الشريك الدولي"}</h5>
        <p>${country.flag} ${isEn ? country.nameEn : country.nameAr}</p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "AUTHORITY NODE" : "جهة الصدور"}</h5>
        <p>${isEn ? "Cabinet AI Strategic Advisor" : "مستشار الذكاء الاصطناعي لحقيبة الوزير"}</p>
      </div>
      <div class="metadata-item" style="grid-column: span 2;">
        <h5>${isEn ? "SPECIFIC TALKS OBJECTIVE" : "الهدف المحدد والمطلوب للمباحثات الثنائية"}</h5>
        <p style="font-weight: 500; font-size: 11px; line-height: 1.4; color: #2d3748;">
          ${activeObjective}
        </p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "DATE OF ACQUISITION" : "تاريخ إصدار التقرير"}</h5>
        <p style="font-family: monospace;">June 9, 2026</p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "Bilateral Treaty" : "طبيعة العلاقات الثنائية"}</h5>
        <p style="font-size: 11px; color: #16211C;">${isEn ? country.indicators.cooperationAgreementEn : country.indicators.cooperationAgreementAr}</p>
      </div>
    </div>

    <!-- SOVEREIGN SYSTEM BENCHMARKS (COMPARATIVE GRID) -->
    <h2 class="section-title">${isEn ? "Sovereign Benchmarks Engine" : "جرد ومقارنة المؤشرات السيادية والتنافسية للبلدين"}</h2>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>${isEn ? "Benchmark Indicator" : "مؤشر القياس والتنافسية"}</th>
          <th>${isEn ? "United Arab Emirates 🇦🇪" : "دولة الإمارات العربية المتحدة 🇦🇪"}</th>
          <th>${country.flag} ${isEn ? country.nameEn : country.nameAr}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${isEn ? "Sovereign GDP" : "الناتج المحلي الإجمالي"}</strong></td>
          <td>${isEn ? activeUae.gdp : activeUae.gdpAr}</td>
          <td>${isEn ? country.indicators.gdp : country.indicators.gdpAr}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Annual Real Growth Rate" : "معدل النمو السنوي الفعلي"}</strong></td>
          <td>${activeUae.growth}</td>
          <td>${country.indicators.growth}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Infrastructure System Index" : "ترتيب جودة البنية التحتية والموانئ"}</strong></td>
          <td>${isEn ? activeUae.infrastructureIndex : activeUae.infrastructureIndexAr}</td>
          <td>${country.indicators.infrastructureIndex}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Global Competitiveness Rank" : "تأهيل مؤشر التنافسية العالمي"}</strong></td>
          <td>${isEn ? activeUae.competitivenessRank : activeUae.competitivenessRankAr}</td>
          <td>${country.indicators.competitivenessRank}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Environmental Quality Rank" : "مؤشر التنمية والاستدامة البيئية"}</strong></td>
          <td>${isEn ? activeUae.environmentalRank : activeUae.environmentalRankAr}</td>
          <td>${country.indicators.environmentalRank}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Energy Sourcing Grid Mix" : "مزيج خطوط توليد الشبكة الوطنية للكهرباء"}</strong></td>
          <td>${isEn ? activeUae.energyMix : activeUae.energyMixAr}</td>
          <td>${isEn ? country.indicators.energyMix : country.indicators.energyMixAr}</td>
        </tr>
      </tbody>
    </table>

    <div class="diplomatic-warning">
      ⚠️ ${isEn 
        ? "NOTICE: Confirmed federal stats mapped side-by-side. Confirm values with accompanying documentation before drafting formal treaties." 
        : "إقرار الفيدرالية: جرى دمج هذه البيانات والمطابقة الإحصائية الرسمية تلقائياً. يرجى تأكيد الأرقام بمقارنتها مع الكشوفات المصاحبة."}
    </div>

    <div class="footer-signatures">
      <div>
        <p class="seal-text">${isEn ? "FEDERAL PORTFOLIO NODE" : "منصة الدعم الفيدرالي الموحد"}</p>
        <p>${isEn ? "UAE Ministry of Energy & Infrastructure" : "وزارة الطاقة والبنية التحتية - دولة الإمارات العربية المتحدة"}</p>
      </div>
      <div style="text-align: right;">
        <span style="font-style: italic; font-weight: 700;">Page 1 of 2</span>
      </div>
    </div>
  </div>

  <!-- SECOND PAGE: AI-GENERATED BRIEFING MEMO & DIGNITARY TALKING POINTS -->
  <div class="page page-break">
    <div class="page-header">
      <div>
        <h4 class="ministry-title">${isEn ? "MINISTRY OF ENERGY & INFRASTRUCTURE" : "وزارة الطاقة والبنية التحتية"}</h4>
        <h5 class="emirates-title">${isEn ? "UNITED ARAB EMIRATES" : "دولة الإمارات العربية المتحدة"}</h5>
        <h1 class="doc-title">${isEn ? "EXECUTIVE DECISION AI ANALYSIS" : "التحليل المعمق وإجراءات مذكرات الوفد"}</h1>
      </div>
      <div>
        <span class="security-badge" style="background-color: #0d9488;">${isEn ? "SECURE CHANNELS Active" : "تأمين نشط للقنوات"}</span>
      </div>
    </div>

    <h2 class="section-title" style="margin-top: 0;">${isEn ? "Real-Time Alignment Intelligence Summary" : "تقرير الإيجاز التوليدي الذكي لمذكرة التفاهم"}</h2>
    <div class="briefing-content">
      <p style="margin-bottom: 12px; text-align: justify;">
        ${formattedBriefingText}
      </p>
    </div>

    <h2 class="section-title">${isEn ? "Strategic Preparatory Dialogue Protocols" : "نقاط الحديث الثنائية الموصى بتغطيتها خلال الاجتماع"}</h2>
    <div class="points-grid">
      ${currentTP.map((tpOn: any, idxKey: number) => `
        <div class="point-card">
          <h4>
            <span class="point-number">${idxKey + 1}</span>
            ${isEn ? tpOn.headerEn : tpOn.headerAr}
          </h4>
          <p style="margin: 0; color: #4a5568; line-height: 1.4; font-size: 11px;">
            ${isEn ? tpOn.pointEn : tpOn.pointAr}
          </p>
        </div>
      `).join("")}
    </div>

    <div class="footer-signatures">
      <div>
        <p class="seal-text">${isEn ? "SECURE CHANNELS SEAL REGISTERED" : "تم ختم وتصديق القنوات الدبلوماسية إلكترونياً"}</p>
        <p>${isEn ? "CONFIDENTIAL - Strictly UAE Delegation Use Only" : "سرّي للغاية - يُتداول لوفد دولة الإمارات العربيّة المتحدّة حصراً"}</p>
      </div>
      <div style="text-align: right;">
        <span style="font-style: italic; font-weight: 700;">Page 2 of 2</span>
      </div>
    </div>
  </div>

  <script>
    // Automatically trigger printing when loaded independently
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
      `;

      const blob = new Blob([printHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Cabinet_Bilateral_Briefing_${country.nameEn.replace(/\s+/g, "_")}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("HTML download fail:", err);
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4" id="briefing-picker-buttons-container">
        <div className="flex flex-wrap items-center gap-2" id="briefing-picker-buttons">
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

        {/* Unified VIP Export PDF and Print Trigger Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportToPdf}
            className="bg-gold-deep border border-gold-deep text-slate-vip hover:bg-slate-vip hover:text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md tracking-wide"
            id="btn-export-pdf"
            title={isEn ? "Print polished PDF strategic briefing" : "تصدير الملف الاستراتيجي الكامل بصيغة PDF"}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>{isEn ? "Export Executive PDF" : "تصدير ملف PDF الرئاسي"}</span>
          </button>

          <button
            onClick={downloadOfflineHtml}
            className="bg-white border border-gray-200 text-slate-vip hover:bg-gray-50 hover:border-gray-300 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm tracking-wide"
            id="btn-download-offline-html"
            title={isEn ? "Download standalone offline interactive dossier" : "تحميل ملف الإيجاز الرئاسي المستقل"}
          >
            <Download className="w-4 h-4 shrink-0 text-emerald-deep" />
            <span>{isEn ? "Download Offline HTML" : "تحميل الملف المستقل"}</span>
          </button>
        </div>
      </div>

      {printError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3.5 flex items-start gap-2.5 animate-fade-in" id="print-sandbox-advisory">
          <HelpCircle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{isEn ? "Cabinet Printing Notice:" : "تنويه طباعة مذكرات الوزراء:"}</p>
            <p className="mt-0.5 leading-relaxed">{printError}</p>
          </div>
        </div>
      )}

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
