import React, { useState } from "react";
import pptxgen from "pptxgenjs";
import { BriefingArtifacts, BriefingReferenceFact, PrebuiltCountry, UaeIndicator } from "../types";
import { FileText, Award, Layers, Volume2, ChevronLeft, ChevronRight, HelpCircle, ArrowRightLeft, FileCheck, Download, X, Printer, AlertTriangle, Video, Clock3 } from "lucide-react";
import CountryFlag from "./CountryFlag";

interface BriefingGeneratorProps {
  country: PrebuiltCountry;
  language: "en" | "ar";
  aiBriefingText: string;
  briefingArtifacts?: BriefingArtifacts | null;
  isGenerating: boolean;
  briefingSource?: string;
  meetingObjective?: string;
  uaeData?: UaeIndicator;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);

const isRenderableFlagUrl = (value?: string) =>
  Boolean(value && /^(https?:\/\/|\/|data:image\/)/i.test(value.trim()));

const formatCountryFlagForHtml = (country: PrebuiltCountry, isEn: boolean) => {
  const flagUrl = country.flagUrl?.trim();
  if (isRenderableFlagUrl(flagUrl)) {
    return `<img src="${escapeHtml(flagUrl)}" alt="${escapeHtml(country.nameEn)} flag" style="width: 22px; height: 15px; object-fit: cover; border-radius: 2px; border: 1px solid #E2E8F0; vertical-align: -2px; margin-${isEn ? "right" : "left"}: 5px;" />`;
  }

  return escapeHtml(country.flag || "🌐");
};

const formatHtmlFileSegment = (value: string) => {
  const safeName = value
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");

  return safeName || "strategic_briefing";
};

const formatInlineMarkdownForHtml = (value: string) =>
  escapeHtml(value).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

const formatBriefingTextForHtml = (value: string) => {
  const blocks: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;

    blocks.push(
      `<p style="margin-bottom: 12px; text-align: justify;">${paragraphLines
        .map(formatInlineMarkdownForHtml)
        .join("<br/>")}</p>`
    );
    paragraphLines = [];
  };

  value.split(/\r?\n/).forEach((line) => {
    const headingMatch = line.match(/^###\s+(.+?)\s*$/);

    if (headingMatch) {
      flushParagraph();
      blocks.push(
        `<h3 style='margin-top: 22px; margin-bottom: 8px; font-size: 15px; color: #16211C; border-bottom: 1px solid #E8DCC4; padding-bottom: 4px;font-family: "Playfair Display", serif;'>${formatInlineMarkdownForHtml(headingMatch[1])}</h3>`
      );
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      return;
    }

    paragraphLines.push(line);
  });

  flushParagraph();

  return blocks.join("");
};

const renderInlineMarkdown = (value: string, keyPrefix: string) => {
  const nodes: React.ReactNode[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    nodes.push(<strong key={`${keyPrefix}-bold-${match.index}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
};

const renderBriefingText = (value: string) => {
  const nodes: React.ReactNode[] = [];
  let paragraphLines: string[] = [];
  let paragraphIndex = 0;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;

    const key = `briefing-paragraph-${paragraphIndex}`;
    nodes.push(
      <p key={key}>
        {paragraphLines.map((line, lineIndex) => (
          <React.Fragment key={`${key}-line-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {renderInlineMarkdown(line, `${key}-line-${lineIndex}`)}
          </React.Fragment>
        ))}
      </p>
    );
    paragraphLines = [];
    paragraphIndex += 1;
  };

  value.split(/\r?\n/).forEach((line, lineIndex) => {
    const headingMatch = line.match(/^###\s+(.+?)\s*$/);

    if (headingMatch) {
      flushParagraph();
      nodes.push(
        <h3 key={`briefing-heading-${lineIndex}`}>
          {renderInlineMarkdown(headingMatch[1], `briefing-heading-${lineIndex}`)}
        </h3>
      );
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      return;
    }

    paragraphLines.push(line);
  });

  flushParagraph();

  return nodes;
};

export default function BriefingGenerator({
  country,
  language,
  aiBriefingText,
  briefingArtifacts,
  isGenerating,
  briefingSource,
  meetingObjective,
  uaeData,
}: BriefingGeneratorProps) {
  const isEn = language === "en";
  const [activeOutput, setActiveOutput] = useState<"summary" | "talking-points" | "one-pager" | "slides" | "video-brief">("summary");
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

  const artifactTalkingPoints = briefingArtifacts?.talkingPoints?.length
    ? briefingArtifacts.talkingPoints.map((point) => ({
        headerEn: point.title,
        headerAr: point.title,
        pointEn: [point.point, point.ask ? `Ask: ${point.ask}` : "", point.evidence ? `Evidence: ${point.evidence}` : "", point.riskNote ? `Risk: ${point.riskNote}` : ""]
          .filter(Boolean)
          .join(" "),
        pointAr: [point.point, point.ask ? `Ask: ${point.ask}` : "", point.evidence ? `Evidence: ${point.evidence}` : "", point.riskNote ? `Risk: ${point.riskNote}` : ""]
          .filter(Boolean)
          .join(" "),
      }))
    : null;
  const currentTP = artifactTalkingPoints || fallbackTalkingPoints[country.id] || fallbackTalkingPoints["brazil"];

  // Modular slide configuration
  const fallbackSlides: Array<{ titleEn: string; titleAr: string; bulletsEn: string[]; bulletsAr: string[] }> = [
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
  const artifactSlides = briefingArtifacts?.slides?.length
    ? briefingArtifacts.slides.map((slide) => ({
        titleEn: slide.title,
        titleAr: slide.title,
        bulletsEn: slide.bullets,
        bulletsAr: slide.bullets,
      }))
    : null;
  const slides = artifactSlides || fallbackSlides;
  const executiveSummaryArtifact = briefingArtifacts?.executiveSummary;
  const onePagerArtifact = briefingArtifacts?.onePager;
  const isDatabaseBriefingSource = Boolean(
    briefingSource?.includes("neon-country-briefing-artifacts") ||
    briefingSource?.includes("country_briefing_artifacts") ||
    briefingSource?.includes("countries_briefing_artifacts")
  );

  const formatPptxFileName = (name: string) => {
    const safeName = name
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    return `${safeName || "strategic-briefing"}-deck.pptx`;
  };

  const trimSlideText = (value: string, maxLength = 220) => {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  };

  const handleExportToPptx = async () => {
    setPrintError(null);

    try {
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "UAE Digital Strategic Advisor";
      pptx.company = "Ministry of Energy and Infrastructure";
      pptx.subject = `${country.nameEn} strategic briefing`;
      pptx.title = `${country.nameEn} Strategic Preparation`;

      slides.forEach((deckSlide, index) => {
        const slide = pptx.addSlide();
        const title = isEn ? deckSlide.titleEn : deckSlide.titleAr;
        const bullets = isEn ? deckSlide.bulletsEn : deckSlide.bulletsAr;
        const align = language === "ar" ? "right" : "left";

        slide.background = { color: "16211C" };
        slide.addText(isEn ? "UAE DIGITAL STRATEGIC ADVISOR" : "المستشار الرقمي الاستراتيجي", {
          x: 0.55,
          y: 0.3,
          w: 8.5,
          h: 0.28,
          fontFace: "Aptos",
          fontSize: 8,
          bold: true,
          color: "C5A85A",
          charSpacing: 1.2,
        });
        slide.addText(`${index + 1} / ${slides.length}`, {
          x: 11.7,
          y: 0.3,
          w: 0.95,
          h: 0.28,
          fontFace: "Aptos",
          fontSize: 9,
          bold: true,
          color: "C5A85A",
          align: "right",
        });
        slide.addText(title, {
          x: 0.85,
          y: 1.15,
          w: 11.6,
          h: 0.8,
          fontFace: "Aptos Display",
          fontSize: 28,
          bold: true,
          color: "C5A85A",
          align,
          fit: "shrink",
        });
        slide.addText(bullets.map((bullet) => `• ${trimSlideText(bullet)}`).join("\n"), {
          x: 1.05,
          y: 2.35,
          w: 11.1,
          h: 3.05,
          fontFace: "Aptos",
          fontSize: 17,
          breakLine: false,
          color: "F3F4F6",
          valign: "middle",
          fit: "shrink",
          paraSpaceAfter: 10,
          align,
        });
        slide.addText(isEn ? country.nameEn : country.nameAr, {
          x: 0.85,
          y: 6.65,
          w: 5.5,
          h: 0.32,
          fontFace: "Aptos",
          fontSize: 10,
          bold: true,
          color: "C5A85A",
          align,
        });
      });

      await pptx.writeFile({ fileName: formatPptxFileName(country.nameEn) });
    } catch (error) {
      console.error("PPTX export failed:", error);
      setPrintError(isEn ? "PPTX export failed. Please try again." : "تعذر تصدير ملف العرض التقديمي. يرجى المحاولة مرة أخرى.");
    }
  };

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

      const h = escapeHtml;
      const formattedBriefingText = formatBriefingTextForHtml(aiBriefingText);

      const printHtml = `
<!DOCTYPE html>
<html lang="${language}" dir="${isEn ? "ltr" : "rtl"}">
<head>
  <meta charset="utf-8">
  <title>Cabinet_Briefing_Memo_${h(country.nameEn)}</title>
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
        <p>${formatCountryFlagForHtml(country, isEn)} ${h(isEn ? country.nameEn : country.nameAr)}</p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "AUTHORITY NODE" : "جهة الصدور"}</h5>
        <p>${isEn ? "Cabinet AI Strategic Advisor" : "مستشار الذكاء الاصطناعي لحقيبة الوزير"}</p>
      </div>
      <div class="metadata-item" style="grid-column: span 2;">
        <h5>${isEn ? "SPECIFIC TALKS OBJECTIVE" : "الهدف المحدد والمطلوب للمباحثات الثنائية"}</h5>
        <p style="font-weight: 500; font-size: 11px; line-height: 1.4; color: #2d3748;">
          ${h(activeObjective)}
        </p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "DATE OF ACQUISITION" : "تاريخ إصدار التقرير"}</h5>
        <p style="font-family: monospace;">June 9, 2026</p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "Bilateral Treaty" : "طبيعة العلاقات الثنائية"}</h5>
        <p style="font-size: 11px; color: #16211C;">${h(isEn ? country.indicators.cooperationAgreementEn : country.indicators.cooperationAgreementAr)}</p>
      </div>
    </div>

    <!-- SOVEREIGN SYSTEM BENCHMARKS (COMPARATIVE GRID) -->
    <h2 class="section-title">${isEn ? "Sovereign Benchmarks Engine" : "جرد ومقارنة المؤشرات السيادية والتنافسية للبلدين"}</h2>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>${isEn ? "Benchmark Indicator" : "مؤشر القياس والتنافسية"}</th>
          <th>${isEn ? "United Arab Emirates 🇦🇪" : "دولة الإمارات العربية المتحدة 🇦🇪"}</th>
          <th>${formatCountryFlagForHtml(country, isEn)} ${h(isEn ? country.nameEn : country.nameAr)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${isEn ? "Sovereign GDP" : "الناتج المحلي الإجمالي"}</strong></td>
          <td>${h(isEn ? activeUae.gdp : activeUae.gdpAr)}</td>
          <td>${h(isEn ? country.indicators.gdp : country.indicators.gdpAr)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Annual Real Growth Rate" : "معدل النمو السنوي الفعلي"}</strong></td>
          <td>${h(activeUae.growth)}</td>
          <td>${h(country.indicators.growth)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Infrastructure System Index" : "ترتيب جودة البنية التحتية والموانئ"}</strong></td>
          <td>${h(isEn ? activeUae.infrastructureIndex : activeUae.infrastructureIndexAr)}</td>
          <td>${h(country.indicators.infrastructureIndex)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Global Competitiveness Rank" : "تأهيل مؤشر التنافسية العالمي"}</strong></td>
          <td>${h(isEn ? activeUae.competitivenessRank : activeUae.competitivenessRankAr)}</td>
          <td>${h(country.indicators.competitivenessRank)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Environmental Quality Rank" : "مؤشر التنمية والاستدامة البيئية"}</strong></td>
          <td>${h(isEn ? activeUae.environmentalRank : activeUae.environmentalRankAr)}</td>
          <td>${h(country.indicators.environmentalRank)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Energy Sourcing Grid Mix" : "مزيج خطوط توليد الشبكة الوطنية للكهرباء"}</strong></td>
          <td>${h(isEn ? activeUae.energyMix : activeUae.energyMixAr)}</td>
          <td>${h(isEn ? country.indicators.energyMix : country.indicators.energyMixAr)}</td>
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
      ${formattedBriefingText}
    </div>

    <h2 class="section-title">${isEn ? "Strategic Preparatory Dialogue Protocols" : "نقاط الحديث الثنائية الموصى بتغطيتها خلال الاجتماع"}</h2>
    <div class="points-grid">
      ${currentTP.map((tpOn: any, idxKey: number) => `
        <div class="point-card">
          <h4>
            <span class="point-number">${idxKey + 1}</span>
            ${h(isEn ? tpOn.headerEn : tpOn.headerAr)}
          </h4>
          <p style="margin: 0; color: #4a5568; line-height: 1.4; font-size: 11px;">
            ${h(isEn ? tpOn.pointEn : tpOn.pointAr)}
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

      const h = escapeHtml;
      const formattedBriefingText = formatBriefingTextForHtml(aiBriefingText);

      const printHtml = `
<!DOCTYPE html>
<html lang="${language}" dir="${isEn ? "ltr" : "rtl"}">
<head>
  <meta charset="utf-8">
  <title>Cabinet_Briefing_Memo_${h(formatHtmlFileSegment(country.nameEn))}</title>
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
        <p>${formatCountryFlagForHtml(country, isEn)} ${h(isEn ? country.nameEn : country.nameAr)}</p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "AUTHORITY NODE" : "جهة الصدور"}</h5>
        <p>${isEn ? "Cabinet AI Strategic Advisor" : "مستشار الذكاء الاصطناعي لحقيبة الوزير"}</p>
      </div>
      <div class="metadata-item" style="grid-column: span 2;">
        <h5>${isEn ? "SPECIFIC TALKS OBJECTIVE" : "الهدف المحدد والمطلوب للمباحثات الثنائية"}</h5>
        <p style="font-weight: 500; font-size: 11px; line-height: 1.4; color: #2d3748;">
          ${h(activeObjective)}
        </p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "DATE OF ACQUISITION" : "تاريخ إصدار التقرير"}</h5>
        <p style="font-family: monospace;">June 9, 2026</p>
      </div>
      <div class="metadata-item">
        <h5>${isEn ? "Bilateral Treaty" : "طبيعة العلاقات الثنائية"}</h5>
        <p style="font-size: 11px; color: #16211C;">${h(isEn ? country.indicators.cooperationAgreementEn : country.indicators.cooperationAgreementAr)}</p>
      </div>
    </div>

    <!-- SOVEREIGN SYSTEM BENCHMARKS (COMPARATIVE GRID) -->
    <h2 class="section-title">${isEn ? "Sovereign Benchmarks Engine" : "جرد ومقارنة المؤشرات السيادية والتنافسية للبلدين"}</h2>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>${isEn ? "Benchmark Indicator" : "مؤشر القياس والتنافسية"}</th>
          <th>${isEn ? "United Arab Emirates 🇦🇪" : "دولة الإمارات العربية المتحدة 🇦🇪"}</th>
          <th>${formatCountryFlagForHtml(country, isEn)} ${h(isEn ? country.nameEn : country.nameAr)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${isEn ? "Sovereign GDP" : "الناتج المحلي الإجمالي"}</strong></td>
          <td>${h(isEn ? activeUae.gdp : activeUae.gdpAr)}</td>
          <td>${h(isEn ? country.indicators.gdp : country.indicators.gdpAr)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Annual Real Growth Rate" : "معدل النمو السنوي الفعلي"}</strong></td>
          <td>${h(activeUae.growth)}</td>
          <td>${h(country.indicators.growth)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Infrastructure System Index" : "ترتيب جودة البنية التحتية والموانئ"}</strong></td>
          <td>${h(isEn ? activeUae.infrastructureIndex : activeUae.infrastructureIndexAr)}</td>
          <td>${h(country.indicators.infrastructureIndex)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Global Competitiveness Rank" : "تأهيل مؤشر التنافسية العالمي"}</strong></td>
          <td>${h(isEn ? activeUae.competitivenessRank : activeUae.competitivenessRankAr)}</td>
          <td>${h(country.indicators.competitivenessRank)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Environmental Quality Rank" : "مؤشر التنمية والاستدامة البيئية"}</strong></td>
          <td>${h(isEn ? activeUae.environmentalRank : activeUae.environmentalRankAr)}</td>
          <td>${h(country.indicators.environmentalRank)}</td>
        </tr>
        <tr>
          <td><strong>${isEn ? "Energy Sourcing Grid Mix" : "مزيج خطوط توليد الشبكة الوطنية للكهرباء"}</strong></td>
          <td>${h(isEn ? activeUae.energyMix : activeUae.energyMixAr)}</td>
          <td>${h(isEn ? country.indicators.energyMix : country.indicators.energyMixAr)}</td>
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
      ${formattedBriefingText}
    </div>

    <h2 class="section-title">${isEn ? "Strategic Preparatory Dialogue Protocols" : "نقاط الحديث الثنائية الموصى بتغطيتها خلال الاجتماع"}</h2>
    <div class="points-grid">
      ${currentTP.map((tpOn: any, idxKey: number) => `
        <div class="point-card">
          <h4>
            <span class="point-number">${idxKey + 1}</span>
            ${h(isEn ? tpOn.headerEn : tpOn.headerAr)}
          </h4>
          <p style="margin: 0; color: #4a5568; line-height: 1.4; font-size: 11px;">
            ${h(isEn ? tpOn.pointEn : tpOn.pointAr)}
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
      link.download = `Cabinet_Bilateral_Briefing_${formatHtmlFileSegment(country.nameEn)}.html`;
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

  const fallbackOnePagerFastFacts: BriefingReferenceFact[] = [
    { label: isEn ? "GDP" : "الناتج المحلي", value: isEn ? country.indicators.gdp : country.indicators.gdpAr, context: isEn ? "Country profile" : "ملف الدولة" },
    { label: isEn ? "Growth" : "النمو", value: country.indicators.growth, context: isEn ? "Annual indicator" : "مؤشر سنوي" },
    { label: isEn ? "Energy mix" : "مزيج الطاقة", value: isEn ? country.indicators.energyMix : country.indicators.energyMixAr, context: isEn ? "Power system" : "نظام الطاقة" },
    { label: isEn ? "Infrastructure" : "البنية التحتية", value: country.indicators.infrastructureIndex, context: isEn ? "Benchmark" : "مؤشر" },
    { label: isEn ? "Competitiveness" : "التنافسية", value: country.indicators.competitivenessRank, context: isEn ? "Position" : "الموقع" },
    { label: isEn ? "Framework" : "اطار التعاون", value: isEn ? country.indicators.cooperationAgreementEn : country.indicators.cooperationAgreementAr, context: isEn ? "Bilateral" : "ثنائي" },
  ].filter((fact) => fact.value);
  const onePagerFastFacts = onePagerArtifact?.fastFacts?.length ? onePagerArtifact.fastFacts : fallbackOnePagerFastFacts;
  const onePagerLeadership = onePagerArtifact?.leadership?.length
    ? onePagerArtifact.leadership
    : [
        { role: isEn ? "Government" : "الحكومة", name: isEn ? country.profile.governmentEn : country.profile.governmentAr },
        { role: isEn ? "Leadership" : "القيادة", name: isEn ? country.profile.leadershipEn : country.profile.leadershipAr },
      ];
  const onePagerSectorScorecard = onePagerArtifact?.sectorScorecard?.length
    ? onePagerArtifact.sectorScorecard
    : [
        {
          sector: isEn ? "Energy" : "الطاقة",
          currentBaseline: isEn ? country.sectors.energyEn : country.sectors.energyAr,
          policyTarget: isEn ? "Confirm bankable clean-energy priority." : "تأكيد أولوية طاقة نظيفة قابلة للتمويل.",
          uaeAngle: isEn ? "Grid, storage, and clean power investment." : "استثمار الشبكات والتخزين والطاقة النظيفة.",
        },
        {
          sector: isEn ? "Infrastructure" : "البنية التحتية",
          currentBaseline: isEn ? country.sectors.infrastructureEn : country.sectors.infrastructureAr,
          policyTarget: isEn ? "Map corridors and logistics bottlenecks." : "تحديد الممرات ونقاط الاختناق اللوجستية.",
          uaeAngle: isEn ? "Ports, corridors, smart logistics." : "الموانئ والممرات واللوجستيات الذكية.",
        },
        {
          sector: isEn ? "Sustainability" : "الاستدامة",
          currentBaseline: isEn ? country.sectors.sustainabilityEn : country.sectors.sustainabilityAr,
          policyTarget: isEn ? "Convert climate goals into projects." : "تحويل اهداف المناخ الى مشاريع.",
          uaeAngle: isEn ? "Sovereign finance and execution." : "التمويل السيادي والتنفيذ.",
        },
      ];
  const onePagerOpportunities = onePagerArtifact?.opportunityMap?.length
    ? onePagerArtifact.opportunityMap
    : [
        { title: isEn ? "Partnerships" : "الشراكات", detail: isEn ? country.strategicInsights.partnershipsEn : country.strategicInsights.partnershipsAr, priority: "High" as const },
        { title: isEn ? "Investments" : "الاستثمارات", detail: isEn ? country.strategicInsights.investmentsEn : country.strategicInsights.investmentsAr, priority: "High" as const },
        { title: isEn ? "Knowledge" : "المعرفة", detail: isEn ? country.strategicInsights.knowledgeEn : country.strategicInsights.knowledgeAr, priority: "Medium" as const },
      ];
  const onePagerRisks = onePagerArtifact?.risks?.length
    ? onePagerArtifact.risks
    : [
        {
          risk: isEn ? country.predictive.risksEn : country.predictive.risksAr,
          mitigation: isEn ? "Use government fast-track channels and assign one owner." : "استخدام قنوات حكومية سريعة وتعيين مالك متابعة واحد.",
        },
      ];
  const onePagerActions = onePagerArtifact?.actions90Days?.length
    ? onePagerArtifact.actions90Days
    : [
        isEn ? "Convene bilateral energy and infrastructure working group." : "تشكيل فريق عمل ثنائي للطاقة والبنية التحتية.",
        isEn ? "Select three bankable pilot projects." : "اختيار ثلاثة مشاريع قابلة للتمويل.",
        isEn ? "Prepare UAE financing and execution note." : "اعداد مذكرة تمويل وتنفيذ اماراتية.",
      ];
  const onePagerRecommendation = onePagerArtifact?.strategicRecommendation || (isEn ? country.predictive.proposalsEn : country.predictive.proposalsAr);
  const onePagerTitle = onePagerArtifact?.title || (isEn ? `${country.nameEn} Strategic One-Pager` : `ملف استراتيجي موجز: ${country.nameAr}`);
  const onePagerSubtitle = onePagerArtifact?.subtitle || (isEn ? "Fast reference for executive briefing, diplomatic positioning, and immediate UAE action." : "مرجع سريع للإحاطة القيادية والتموضع الدبلوماسي والخطوات الإماراتية الفورية.");
  const onePagerPriority = onePagerArtifact?.strategicPriority || "High";
  const onePagerUpdated = onePagerArtifact?.lastUpdated || "Current";
  const onePagerUaeRelevance = onePagerArtifact?.uaeRelevance || (isEn ? country.strategicInsights.partnershipsEn : country.strategicInsights.partnershipsAr);
  const displayedOnePagerFastFacts = onePagerFastFacts.filter((fact) => {
    const normalizedLabel = fact.label.toLowerCase();
    const normalizedValue = fact.value.trim().toLowerCase();
    return !(normalizedValue === "0" && (normalizedLabel.includes("vector") || normalizedLabel.includes("memory")));
  });
  const onePagerFactsForDisplay = displayedOnePagerFastFacts.length >= 4 ? displayedOnePagerFastFacts : onePagerFastFacts;
  const primaryOpportunity = onePagerOpportunities[0];
  const primaryLeader = onePagerLeadership.find((leader) => leader.name?.trim()) || onePagerLeadership[0];
  const primaryAction = onePagerActions[0] || onePagerRecommendation;
  const onePagerDecisionCards = [
    {
      label: isEn ? "Next Move" : "الخطوة التالية",
      value: primaryAction,
      tone: "bg-slate-vip text-white border-slate-vip",
      valueClass: "text-white",
      labelClass: "text-blue-100",
    },
    {
      label: isEn ? "Lead Opportunity" : "الفرصة الرئيسية",
      value: primaryOpportunity ? `${primaryOpportunity.title}: ${primaryOpportunity.detail}` : onePagerUaeRelevance,
      tone: "bg-[#F1F5F9] text-slate-vip border-[#CBD5E1]",
      valueClass: "text-slate-vip",
      labelClass: "text-[#475569]",
    },
    {
      label: isEn ? "Counterpart" : "الطرف المقابل",
      value: primaryLeader ? `${primaryLeader.role}: ${primaryLeader.name}` : (isEn ? country.profile.leadershipEn : country.profile.leadershipAr),
      tone: "bg-white text-slate-vip border-gray-200",
      valueClass: "text-slate-vip",
      labelClass: "text-emerald-deep",
    },
  ];

  const compactText = (value: unknown, maxLength: number) => {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    const clipped = normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd();
    return `${clipped}...`;
  };

  const formatSectionPdfDate = () =>
    new Date().toLocaleDateString(isEn ? "en-GB" : "ar-AE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const openSectionPdfDialog = (documentTitle: string, eyebrow: string, bodyHtml: string) => {
    setPrintError(null);

    try {
      const iframe = document.createElement("iframe");
      iframe.title = documentTitle;
      iframe.style.position = "fixed";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const printWindow = iframe.contentWindow;
      const printDocument = printWindow?.document;
      if (!printWindow || !printDocument) {
        iframe.remove();
        window.print();
        return;
      }

      const generatedOn = formatSectionPdfDate();
      const printHtml = `
<!doctype html>
<html lang="${language}" dir="${isEn ? "ltr" : "rtl"}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: #172520;
      font-family: ${isEn ? "Inter, Arial, sans-serif" : "'Noto Kufi Arabic', Arial, sans-serif"};
      font-size: 12px;
      line-height: 1.48;
    }
    .report-shell { width: 100%; }
    .report-header {
      border-left: 5px solid #C5A059;
      background: #F8FAFC;
      padding: 18px 20px;
      margin-bottom: 16px;
    }
    [dir="rtl"] .report-header {
      border-left: 0;
      border-right: 5px solid #C5A059;
    }
    .eyebrow {
      color: #0D4C3A;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 6px 0 8px;
      color: #172520;
      font-size: 24px;
      line-height: 1.18;
    }
    h2 {
      margin: 18px 0 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #D8E0EF;
      color: #172520;
      font-size: 15px;
    }
    h3 {
      margin: 14px 0 6px;
      color: #172520;
      font-size: 13px;
    }
    p { margin: 0 0 10px; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .meta-card,
    .info-card {
      border: 1px solid #D8E0EF;
      background: #FFFFFF;
      padding: 11px 12px;
    }
    .meta-card span,
    .info-card span {
      display: block;
      color: #64748B;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .meta-card strong,
    .info-card strong {
      display: block;
      margin-top: 4px;
      color: #172520;
      font-size: 13px;
    }
    .content-card {
      border: 1px solid #D8E0EF;
      padding: 14px;
      margin-bottom: 12px;
      background: #FFFFFF;
      break-inside: avoid;
    }
    .briefing-content p {
      text-align: justify;
    }
    .briefing-content strong {
      color: #0D4C3A;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    th,
    td {
      border: 1px solid #D8E0EF;
      padding: 8px;
      text-align: start;
      vertical-align: top;
    }
    th {
      background: #172520;
      color: #C5A059;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    ul,
    ol {
      margin: 8px 0 0;
      padding-inline-start: 18px;
    }
    li { margin-bottom: 6px; }
    .callout {
      background: #0D4C3A;
      color: #FFFFFF;
      border-left: 4px solid #C5A059;
      padding: 12px;
      margin-top: 14px;
    }
    [dir="rtl"] .callout {
      border-left: 0;
      border-right: 4px solid #C5A059;
    }
    .callout span {
      display: block;
      color: #C5A059;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #D8E0EF;
      color: #64748B;
      font-size: 10px;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .content-card,
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="report-shell">
    <section class="report-header">
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(documentTitle)}</h1>
      <div style="color:#64748B;font-size:11px;font-weight:700;">${escapeHtml(isEn ? `Generated ${generatedOn}` : `تم الإنشاء في ${generatedOn}`)}</div>
    </section>
    <section class="meta-grid">
      <div class="meta-card">
        <span>${escapeHtml(isEn ? "Partner state" : "الشريك الدولي")}</span>
        <strong>${formatCountryFlagForHtml(country, isEn)} ${escapeHtml(isEn ? country.nameEn : country.nameAr)}</strong>
      </div>
      <div class="meta-card">
        <span>${escapeHtml(isEn ? "Authority node" : "جهة الصدور")}</span>
        <strong>${escapeHtml(isEn ? "Cabinet AI Strategic Advisor" : "مستشار الذكاء الاصطناعي لحقيبة الوزير")}</strong>
      </div>
    </section>
    ${bodyHtml}
    <div class="footer">${escapeHtml(isEn ? "UAE Digital Strategic Advisor - Section export" : "المستشار الاستراتيجي الرقمي لدولة الإمارات - تصدير القسم")}</div>
  </main>
</body>
</html>`;

      const cleanup = () => {
        setTimeout(() => iframe.remove(), 500);
      };
      printWindow.addEventListener("afterprint", cleanup, { once: true });
      window.setTimeout(cleanup, 15000);

      printDocument.open();
      printDocument.write(printHtml);
      printDocument.close();
      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.warn("Section print blocked:", error);
          setPrintError(isEn ? "Could not open the PDF save dialog for this section. Please try again." : "تعذر فتح نافذة حفظ PDF لهذا القسم. يرجى المحاولة مرة أخرى.");
        }
      }, 300);
    } catch (error) {
      console.error("Section PDF generation failed:", error);
      setPrintError(isEn ? "Could not prepare this section for PDF export. Please try again." : "تعذر إعداد هذا القسم لتصدير PDF. يرجى المحاولة مرة أخرى.");
    }
  };

  const handleDownloadSummaryPdf = () => {
    if (isGenerating) return;

    const decisionFocusHtml = executiveSummaryArtifact?.decisionFocus
      ? `<div class="callout"><span>${escapeHtml(isEn ? "Decision Focus" : "محور القرار")}</span>${escapeHtml(executiveSummaryArtifact.decisionFocus)}</div>`
      : "";
    const partnershipsHtml = executiveSummaryArtifact?.priorityPartnerships?.length
      ? `
        <section class="content-card">
          <h2>${escapeHtml(isEn ? "Priority Partnerships" : "الشراكات ذات الأولوية")}</h2>
          <ul>${executiveSummaryArtifact.priorityPartnerships.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
      `
      : "";
    const objectiveHtml = meetingObjective?.trim()
      ? `
        <section class="content-card">
          <span>${escapeHtml(isEn ? "Meeting Objective" : "هدف الاجتماع")}</span>
          <strong>${escapeHtml(meetingObjective.trim())}</strong>
        </section>
      `
      : "";

    openSectionPdfDialog(
      isEn ? `${country.nameEn} Executive Summary` : `الملخص التنفيذي: ${country.nameAr}`,
      isEn ? "Executive Summary Export" : "تصدير الملخص التنفيذي",
      `
        ${objectiveHtml}
        <section class="content-card briefing-content">
          <h2>${escapeHtml(isEn ? "Immediate Executive Overview" : "الملخص التنفيذي الفوري")}</h2>
          ${formatBriefingTextForHtml(aiBriefingText)}
          ${decisionFocusHtml}
        </section>
        ${partnershipsHtml}
      `
    );
  };

  const handleDownloadTalkingPointsPdf = () => {
    const objectiveHtml = meetingObjective?.trim()
      ? `
        <section class="content-card">
          <span>${escapeHtml(isEn ? "Meeting Objective" : "هدف الاجتماع")}</span>
          <strong>${escapeHtml(meetingObjective.trim())}</strong>
        </section>
      `
      : "";
    const talkingPointsHtml = currentTP.map((point: any, index: number) => `
      <section class="content-card">
        <span>${escapeHtml(isEn ? `Talking Point ${index + 1}` : `نقطة الحديث ${index + 1}`)}</span>
        <h2>${escapeHtml(isEn ? point.headerEn : point.headerAr)}</h2>
        <p>${escapeHtml(isEn ? point.pointEn : point.pointAr)}</p>
      </section>
    `).join("");

    openSectionPdfDialog(
      isEn ? `${country.nameEn} Talking Points` : `نقاط الحديث: ${country.nameAr}`,
      isEn ? "Talking Points Export" : "تصدير نقاط الحديث",
      `
        ${objectiveHtml}
        <section class="content-card">
          <span>${escapeHtml(isEn ? "Sovereign Dialogue Protocols" : "بروتوكولات التوجيه ونقاط المحادثة")}</span>
          <h2>${escapeHtml(isEn ? "Bilateral Session Preparatory Talking Points" : "نقاط الحديث والأوراق التفاوضية المرشدة للوزير والوفد")}</h2>
          <p>${escapeHtml(isEn ? "Prepared for official delegation use during bilateral ministerial engagement." : "أعدت للاستخدام الرسمي للوفد خلال الاجتماع الوزاري الثنائي.")}</p>
        </section>
        ${talkingPointsHtml}
        <div class="callout">
          <span>${escapeHtml(isEn ? "Diplomatic Notice" : "تنبيه دبلوماسي")}</span>
          ${escapeHtml(isEn ? "Strictly for use of the official UAE delegation." : "يحظر مشاركة أو تسريب هذه البنود الاستراتيجية خارج الوفد الرسمي.")}
        </div>
      `
    );
  };

  const handleDownloadOnePagerPdf = () => {
    setPrintError(null);

    try {
      const iframe = document.createElement("iframe");
      iframe.title = onePagerTitle;
      iframe.style.position = "fixed";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const printWindow = iframe.contentWindow;
      const printDocument = printWindow?.document;
      if (!printWindow || !printDocument) {
        iframe.remove();
        window.print();
        return;
      }

      const factCardsHtml = onePagerFactsForDisplay.slice(0, 8).map((fact) => {
        const context = [fact.context, fact.year].filter(Boolean).join(" | ");
        return `
          <div class="fact-card">
            <span>${escapeHtml(compactText(fact.label, 34))}</span>
            <strong>${escapeHtml(compactText(fact.value, 56))}</strong>
            ${context ? `<small>${escapeHtml(compactText(context, 42))}</small>` : ""}
          </div>
        `;
      }).join("");
      const sectorRowsHtml = onePagerSectorScorecard.slice(0, 3).map((item) => `
        <tr>
          <td>
            <strong>${escapeHtml(compactText(item.sector, 30))}</strong>
            ${item.policyTarget ? `<small>${escapeHtml(compactText(item.policyTarget, 54))}</small>` : ""}
          </td>
          <td>${escapeHtml(compactText(item.currentBaseline, 105))}</td>
          <td>${escapeHtml(compactText(item.uaeAngle, 96))}</td>
        </tr>
      `).join("");
      const leadershipHtml = onePagerLeadership.slice(0, 3).map((leader) => `
        <div class="leader-card">
          <span>${escapeHtml(compactText(leader.role, 32))}</span>
          <strong>${escapeHtml(compactText(leader.name, 74))}</strong>
          ${leader.note ? `<small>${escapeHtml(compactText(leader.note, 56))}</small>` : ""}
        </div>
      `).join("");
      const decisionCardsHtml = onePagerDecisionCards.map((card, index) => `
        <div class="decision-card ${index === 0 ? "primary" : ""}">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(compactText(card.value, index === 0 ? 92 : 105))}</strong>
        </div>
      `).join("");
      const opportunitiesHtml = onePagerOpportunities.slice(0, 3).map((opportunity) => `
        <div class="brief-item">
          <div>
            <strong>${escapeHtml(compactText(opportunity.title, 46))}</strong>
            <p>${escapeHtml(compactText(opportunity.detail, 106))}</p>
          </div>
          ${opportunity.priority ? `<span class="priority-badge">${escapeHtml(opportunity.priority)}</span>` : ""}
        </div>
      `).join("");
      const risksHtml = onePagerRisks.slice(0, 2).map((risk) => `
        <div class="risk-item">
          <strong>${escapeHtml(compactText(risk.risk, 90))}</strong>
          <p>${escapeHtml(compactText(risk.mitigation, 96))}</p>
        </div>
      `).join("");
      const actionsHtml = onePagerActions.slice(0, 4).map((action, index) => `
        <li>
          <span>${index + 1}</span>
          <p>${escapeHtml(compactText(action, 94))}</p>
        </li>
      `).join("");
      const generatedOn = formatSectionPdfDate();

      const printHtml = `
<!doctype html>
<html lang="${language}" dir="${isEn ? "ltr" : "rtl"}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(onePagerTitle)}</title>
  <style>
    @page { size: A4 landscape; margin: 6mm; }
    * { box-sizing: border-box; }
    html,
    body {
      margin: 0;
      width: 285mm;
      height: 198mm;
      overflow: hidden;
      background: #FFFFFF;
      color: #101828;
      font-family: ${isEn ? "Inter, Arial, sans-serif" : "'IBM Plex Sans Arabic', Arial, sans-serif"};
      font-size: 7.9pt;
      line-height: 1.2;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .one-page {
      position: relative;
      width: 100%;
      height: 198mm;
      max-height: 198mm;
      overflow: hidden;
      background: #FFFFFF;
      border-top: 2.4mm solid #101828;
      padding-top: 2.4mm;
      page-break-after: avoid;
      break-after: avoid;
    }
    .one-page-content {
      --fit-scale: 1;
      width: 100%;
      transform: scale(var(--fit-scale));
      transform-origin: top left;
    }
    html[dir="rtl"] .one-page-content {
      transform-origin: top right;
    }
    .top-accent {
      position: absolute;
      inset-block-start: -2.4mm;
      inset-inline-start: 0;
      width: 100%;
      height: 2.4mm;
      background: linear-gradient(90deg, #1E3A8A, #4F46E5 44%, #C5A059 100%);
    }
    .page-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 48mm;
      gap: 3.5mm;
      align-items: start;
      padding-bottom: 2.4mm;
      border-bottom: 0.35mm solid #D8E0EF;
    }
    .eyebrow {
      display: flex;
      align-items: center;
      gap: 1.6mm;
      color: #1E3A8A;
      font-size: 6.7pt;
      font-weight: 900;
    }
    h1 {
      margin: 1mm 0 0.8mm;
      color: #101828;
      font-size: 17.2pt;
      line-height: 1.06;
    }
    .subtitle {
      max-width: 198mm;
      margin: 0;
      color: #475569;
      font-size: 8pt;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5mm;
    }
    .meta-card,
    .fact-card,
    .leader-card,
    .decision-card,
    .panel {
      border: 0.28mm solid #D8E0EF;
      border-radius: 1.5mm;
      background: #FFFFFF;
    }
    .meta-card {
      min-height: 12mm;
      padding: 2mm;
    }
    .meta-card span,
    .fact-card span,
    .leader-card span,
    .decision-card span,
    .panel h2 {
      display: block;
      color: #64748B;
      font-size: 6.2pt;
      font-weight: 900;
      letter-spacing: 0.03em;
    }
    .meta-card strong {
      display: block;
      margin-top: 0.8mm;
      color: #101828;
      font-size: 8.7pt;
      line-height: 1.12;
    }
    .decision-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2mm;
      margin-top: 2.2mm;
    }
    .decision-card {
      min-height: 17mm;
      padding: 2.2mm;
      background: #F8FAFC;
    }
    .decision-card strong {
      display: block;
      margin-top: 1mm;
      color: #101828;
      font-size: 8.1pt;
      line-height: 1.18;
    }
    .decision-card.primary {
      background: #101828;
      border-color: #101828;
    }
    .decision-card.primary span { color: #BFDBFE; }
    .decision-card.primary strong { color: #FFFFFF; }
    .main-grid {
      display: grid;
      grid-template-columns: 0.92fr 1.2fr 0.78fr;
      gap: 2mm;
      margin-top: 2.2mm;
      align-items: start;
    }
    .bottom-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.9fr 0.95fr;
      gap: 2mm;
      margin-top: 2.2mm;
      align-items: start;
    }
    .panel {
      padding: 2.2mm;
      break-inside: avoid;
      page-break-inside: avoid;
      overflow: hidden;
    }
    .panel h2 {
      margin: 0 0 1.6mm;
      color: #1E3A8A;
      font-size: 7.1pt;
    }
    .facts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.3mm;
    }
    .fact-card {
      min-height: 12mm;
      padding: 1.6mm;
      background: #F8FAFC;
    }
    .fact-card strong {
      display: block;
      margin-top: 0.6mm;
      color: #101828;
      font-size: 7.7pt;
      line-height: 1.1;
    }
    .fact-card small,
    .leader-card small,
    td small {
      display: block;
      margin-top: 0.6mm;
      color: #64748B;
      font-size: 6pt;
      line-height: 1.12;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.9pt;
      line-height: 1.18;
    }
    th,
    td {
      border: 0.25mm solid #D8E0EF;
      padding: 1.5mm;
      text-align: start;
      vertical-align: top;
    }
    th {
      background: #101828;
      color: #FFFFFF;
      font-size: 6.1pt;
      font-weight: 900;
    }
    td strong {
      color: #1E3A8A;
      font-size: 7pt;
    }
    .relevance {
      margin-top: 1.4mm;
      padding: 1.8mm;
      border-inline-start: 0.8mm solid #475569;
      background: #F1F5F9;
      color: #101828;
    }
    .relevance span,
    .recommendation span {
      display: block;
      margin-bottom: 0.6mm;
      color: #475569;
      font-size: 6.2pt;
      font-weight: 900;
    }
    .relevance p,
    .brief-item p,
    .risk-item p,
    .recommendation p,
    .actions-list p {
      margin: 0;
    }
    .leader-stack {
      display: grid;
      gap: 1.3mm;
    }
    .leader-card {
      padding: 1.8mm;
      background: #FFFFFF;
    }
    .leader-card strong {
      display: block;
      margin-top: 0.6mm;
      color: #101828;
      font-size: 7.5pt;
      line-height: 1.12;
    }
    .brief-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1.5mm;
      padding: 1.5mm 0;
      border-top: 0.25mm solid #E2E8F0;
    }
    .brief-item:first-of-type,
    .risk-item:first-of-type {
      border-top: 0;
      padding-top: 0;
    }
    .brief-item strong,
    .risk-item strong {
      color: #101828;
      font-size: 7.5pt;
    }
    .brief-item p,
    .risk-item p {
      margin-top: 0.6mm;
      color: #475569;
      font-size: 6.9pt;
      line-height: 1.16;
    }
    .priority-badge {
      align-self: start;
      border-radius: 99px;
      background: #EEF2FF;
      color: #3730A3;
      padding: 0.6mm 1.2mm;
      font-size: 5.8pt;
      font-weight: 900;
    }
    .risk-panel {
      background: #FFFBEB;
      border-color: #FDE68A;
    }
    .risk-panel h2 { color: #92400E; }
    .risk-item {
      padding: 1.5mm 0;
      border-top: 0.25mm solid #FDE68A;
    }
    .actions-panel {
      background: #101828;
      border-color: #101828;
      color: #FFFFFF;
    }
    .actions-panel h2 { color: #C4B5FD; }
    .actions-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1.2mm;
    }
    .actions-list li {
      display: grid;
      grid-template-columns: 5.8mm minmax(0, 1fr);
      gap: 1.3mm;
      align-items: start;
    }
    .actions-list span {
      display: grid;
      place-items: center;
      width: 5mm;
      height: 5mm;
      border-radius: 1.2mm;
      background: #4F46E5;
      color: #FFFFFF;
      font-size: 6.2pt;
      font-weight: 900;
    }
    .actions-list p {
      color: #FFFFFF;
      font-size: 6.9pt;
      line-height: 1.16;
    }
    .recommendation {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 3mm;
      align-items: center;
      margin-top: 2.2mm;
      padding: 2.2mm 2.8mm;
      border-inline-start: 1mm solid #4F46E5;
      background: #1E3A8A;
      color: #FFFFFF;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .recommendation span { color: #BFDBFE; }
    .recommendation p {
      color: #FFFFFF;
      font-size: 8pt;
      font-weight: 800;
      line-height: 1.18;
    }
    .footer-meta {
      color: #CBD5E1;
      font-size: 6.1pt;
      font-weight: 800;
      white-space: nowrap;
    }
    @media print {
      html,
      body {
        width: 285mm;
        height: 198mm;
        overflow: hidden;
      }
      .one-page {
        height: 198mm;
        max-height: 198mm;
      }
    }
  </style>
</head>
<body>
  <main class="one-page">
    <div class="top-accent"></div>
    <div class="one-page-content">
    <header class="page-header">
      <section>
        <div class="eyebrow">${formatCountryFlagForHtml(country, isEn)} ${escapeHtml(isEn ? "Executive Infographic One-Pager" : "صفحة معلومات تنفيذية واحدة")}</div>
        <h1>${escapeHtml(compactText(onePagerTitle, 110))}</h1>
        <p class="subtitle">${escapeHtml(compactText(onePagerSubtitle, 132))}</p>
      </section>
      <section class="meta-grid">
        <div class="meta-card">
          <span>${escapeHtml(isEn ? "Priority" : "الأولوية")}</span>
          <strong>${escapeHtml(compactText(onePagerPriority, 24))}</strong>
        </div>
        <div class="meta-card">
          <span>${escapeHtml(isEn ? "Updated" : "التحديث")}</span>
          <strong>${escapeHtml(compactText(onePagerUpdated, 28))}</strong>
        </div>
      </section>
    </header>

    <section class="decision-strip">
      ${decisionCardsHtml}
    </section>

    <section class="main-grid">
      <section class="panel">
        <h2>${escapeHtml(isEn ? "Fast Facts" : "حقائق سريعة")}</h2>
        <div class="facts-grid">${factCardsHtml}</div>
      </section>

      <section class="panel">
        <h2>${escapeHtml(isEn ? "Sector Scorecard" : "بطاقة القطاعات")}</h2>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(isEn ? "Sector" : "القطاع")}</th>
              <th>${escapeHtml(isEn ? "Baseline" : "الوضع")}</th>
              <th>${escapeHtml(isEn ? "UAE Angle" : "زاوية الإمارات")}</th>
            </tr>
          </thead>
          <tbody>${sectorRowsHtml}</tbody>
        </table>
        <div class="relevance">
          <span>${escapeHtml(isEn ? "UAE Relevance" : "صلة الملف بالإمارات")}</span>
          <p>${escapeHtml(compactText(onePagerUaeRelevance, 126))}</p>
        </div>
      </section>

      <section class="panel">
        <h2>${escapeHtml(isEn ? "Leadership" : "القيادة")}</h2>
        <div class="leader-stack">${leadershipHtml}</div>
      </section>
    </section>

    <section class="bottom-grid">
      <section class="panel">
        <h2>${escapeHtml(isEn ? "Opportunity Map" : "خريطة الفرص")}</h2>
        ${opportunitiesHtml}
      </section>

      <section class="panel risk-panel">
        <h2>${escapeHtml(isEn ? "Risk And Mitigation" : "المخاطر والمعالجة")}</h2>
        ${risksHtml}
      </section>

      <section class="panel actions-panel">
        <h2>${escapeHtml(isEn ? "90-Day Actions" : "خطوات 90 يوما")}</h2>
        <ol class="actions-list">${actionsHtml}</ol>
      </section>
    </section>

    <section class="recommendation">
      <div>
        <span>${escapeHtml(isEn ? "Strategic Recommendation" : "التوصية الاستراتيجية")}</span>
        <p>${escapeHtml(compactText(onePagerRecommendation, 170))}</p>
      </div>
      <div class="footer-meta">${escapeHtml(isEn ? `Generated ${generatedOn}` : `تم الإنشاء في ${generatedOn}`)}</div>
    </section>
    </div>
  </main>
</body>
</html>`;

      const cleanup = () => {
        setTimeout(() => iframe.remove(), 500);
      };
      printWindow.addEventListener("afterprint", cleanup, { once: true });
      window.setTimeout(cleanup, 15000);

      printDocument.open();
      printDocument.write(printHtml);
      printDocument.close();
      window.setTimeout(() => {
        try {
          const page = printDocument.querySelector<HTMLElement>(".one-page");
          const content = printDocument.querySelector<HTMLElement>(".one-page-content");
          if (page && content) {
            content.style.setProperty("--fit-scale", "1");
            const heightScale = page.clientHeight / Math.max(content.scrollHeight, 1);
            const widthScale = page.clientWidth / Math.max(content.scrollWidth, 1);
            const fitScale = Math.min(1, heightScale, widthScale);
            if (fitScale < 1) {
              content.style.setProperty("--fit-scale", Math.max(0.72, fitScale - 0.015).toFixed(3));
            }
          }
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.warn("One-pager print blocked:", error);
          setPrintError(isEn ? "Could not open the PDF save dialog for the one-pager. Please try again." : "تعذر فتح نافذة حفظ PDF للصفحة الواحدة. يرجى المحاولة مرة أخرى.");
        }
      }, 300);
    } catch (error) {
      console.error("One-pager PDF generation failed:", error);
      setPrintError(isEn ? "Could not prepare the one-pager for PDF export. Please try again." : "تعذر إعداد الصفحة الواحدة لتصدير PDF. يرجى المحاولة مرة أخرى.");
    }
  };

  const renderTalkingPointCard = (tpOn: (typeof currentTP)[number], idxKey: number) => (
    <div key={idxKey} className="bg-slate-50/60 hover:bg-gold-bg/35 rounded-lg border border-gray-100 p-4 flex items-start gap-3 h-fit transition-all duration-300">
      <div className="h-8 w-8 rounded-full bg-emerald-deep text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
        {idxKey + 1}
      </div>
      <div className="min-w-0">
        <h4 className="font-serif font-bold text-slate-vip border-b border-gold-deep/20 pb-1 mb-2 text-sm md:text-base">
          {isEn ? tpOn.headerEn : tpOn.headerAr}
        </h4>
        <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-medium">
          {isEn ? tpOn.pointEn : tpOn.pointAr}
        </p>
      </div>
    </div>
  );

  const talkingPointColumns = [0, 1].map((columnIndex) =>
    currentTP
      .map((tpOn, idxKey) => ({ tpOn, idxKey }))
      .filter(({ idxKey }) => idxKey % 2 === columnIndex)
  );

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
            onClick={() => setActiveOutput("one-pager")}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeOutput === "one-pager"
                ? "bg-emerald-deep text-white shadow-md border border-emerald-deep"
                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            }`}
            id="btn-output-one-pager"
          >
            <FileCheck className="w-4 h-4" />
            <span>{isEn ? "One-Pager" : "صفحة واحدة"}</span>
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

          <button
            onClick={() => setActiveOutput("video-brief")}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeOutput === "video-brief"
                ? "bg-emerald-deep text-white shadow-md border border-emerald-deep"
                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            }`}
            id="btn-output-video-brief"
          >
            <Video className="w-4 h-4" />
            <span>{isEn ? "Video Brief" : "الإحاطة المرئية"}</span>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-gold-bg text-gold-deep border border-gold-border/50 font-bold font-mono px-2 py-0.5 rounded uppercase">
                  {isEn ? "Decision AI Synthesis" : "الذكاء التحليلي المشترك"}
                </span>
                <h3 className="text-xl font-bold font-serif text-slate-vip mt-1.5">
                  {isEn ? "Immediate Executive Overview" : "تحليل الملخص والفرص للمستشار"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] text-gray-400 font-mono">
                  {isEn ? "DOC-ID: MOEI-SUM-09" : "معرف الوثيقة: MOEI-SUM-09"}
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSummaryPdf}
                  disabled={isGenerating}
                  title={isEn ? "Save executive summary as PDF" : "حفظ الملخص التنفيذي بصيغة PDF"}
                  aria-label={isEn ? "Save executive summary as PDF" : "حفظ الملخص التنفيذي بصيغة PDF"}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded border border-gold-border bg-white px-2 text-xs font-extrabold text-emerald-deep shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-deep hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {!isGenerating && briefingSource && briefingSource !== "openai-strategic-ai" && (
              <div className="bg-[#FAF7F0] border-l-4 border-[#C5A059] p-4 rounded-sm flex items-start gap-3 text-xs md:text-sm text-slate-700 animate-fade-in" id="dignitary-intelligence-source-indicator">
                <HelpCircle className="w-5 h-5 text-[#C5A059] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-vip uppercase tracking-wider block text-[10px] font-mono">
                    {isDatabaseBriefingSource
                      ? isEn ? "DATABASE BRIEFING ARTIFACT LOADED" : "تم تحميل إحاطة محفوظة من قاعدة البيانات"
                      : isEn ? "STANDBY SECURITY INTELLIGENCE ACTIVE" : "نشاط بروتوكول استرجاع البيانات المعتمدة محلياً"}
                  </span>
                  <p className="text-gray-600 leading-relaxed">
                    {isDatabaseBriefingSource
                      ? isEn
                        ? "The saved country briefing package was loaded from the briefing artifacts database and rendered through the same summary, one-pager, talking-points, and slide views."
                        : "تم تحميل حزمة الإحاطة المحفوظة من قاعدة بيانات الإحاطات وعرضها عبر الملخص والصفحة الواحدة ونقاط الحديث والشرائح نفسها."
                      : isEn
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
                <div className="text-brief-formatted text-sm md:text-base leading-relaxed">
                  {renderBriefingText(aiBriefingText)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. TALKING POINTS SEGMENT */}
        {activeOutput === "talking-points" && (
          <div className="p-6 md:p-8 space-y-6" id="talking-points-section-content">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-emerald-deep/10 text-emerald-light border border-emerald-deep/20 font-bold font-mono px-2 py-0.5 rounded uppercase">
                  {isEn ? "Sovereign Dialogue Protocols" : "بروتوكولات التوجيه ونقاط المحادثة"}
                </span>
                <h3 className="text-xl font-bold font-serif text-slate-vip mt-1.5">
                  {isEn ? "Bilateral Session Preparatory Talking Points" : "نقاط الحديث والأوراق التفاوضية المرشدة للوزير والوفد"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleDownloadTalkingPointsPdf}
                title={isEn ? "Save talking points as PDF" : "حفظ نقاط الحديث بصيغة PDF"}
                aria-label={isEn ? "Save talking points as PDF" : "حفظ نقاط الحديث بصيغة PDF"}
                className="inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded border border-gold-border bg-white px-2 text-xs font-extrabold text-emerald-deep shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-deep hover:shadow-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>

            <div id="talking-points-cards-grid">
              <div className="space-y-4 md:hidden">
                {currentTP.map((tpOn, idxKey) => renderTalkingPointCard(tpOn, idxKey))}
              </div>

              <div className="hidden md:grid md:grid-cols-2 gap-4 items-start">
                {talkingPointColumns.map((column, columnIndex) => (
                  <div key={`talking-point-column-${columnIndex}`} className="space-y-4">
                    {column.map(({ tpOn, idxKey }) => renderTalkingPointCard(tpOn, idxKey))}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-3 bg-gold-bg/30 rounded-lg border border-gold-border/40 text-xs text-gray-500 font-mono text-center flex items-center justify-center gap-1.5">
              <span>⚠️</span>
              <span>{isEn ? "DIPLOMATIC NOTICE: Strictly for use of the official UAE delegation." : "تنبيه دبلوماسي: يُحظر مشاركة أو تسريب هذه البنود الاستراتيجية خارج الوفد الرسمي."}</span>
            </div>
          </div>
        )}

        {/* 3. ONE-PAGER INFOGRAPHIC DATA RENDER */}
        {activeOutput === "one-pager" && (
          <div className="p-4 md:p-6 text-slate-vip relative leading-relaxed bg-[#F8F8F6]" id="one-pager-section-content">
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-[#C5A059] via-[#005A3C] to-[#475569]"></div>

            <div className="bg-white border border-gray-200 shadow-sm p-4 md:p-5 space-y-4 overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-gray-200 pb-4" id="one-pager-infographic-header">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <CountryFlag flag={country.flag} flagUrl={country.flagUrl} countryName={isEn ? country.nameEn : country.nameAr} size="lg" />
                    <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-deep font-black">
                      {isEn ? "Executive Infographic One-Pager" : "صفحة معلومات تنفيذية واحدة"}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-vip leading-tight">
                    {onePagerTitle}
                  </h3>
                  <p className="text-sm text-gray-600 max-w-4xl">
                    {onePagerSubtitle}
                  </p>
                </div>

                <div className="min-w-[220px] space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={handleDownloadOnePagerPdf}
                    title={isEn ? "Save one-pager as PDF" : "حفظ الصفحة الواحدة بصيغة PDF"}
                    aria-label={isEn ? "Save one-pager as PDF" : "حفظ الصفحة الواحدة بصيغة PDF"}
                    className="ml-auto flex h-8 w-fit items-center justify-center gap-1.5 rounded border border-gold-border bg-white px-2 text-xs font-extrabold text-emerald-deep shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-deep hover:shadow-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-gold-border bg-gold-bg/25 p-3 rounded">
                      <span className="block text-[9px] uppercase font-mono tracking-widest text-gray-500 font-bold">{isEn ? "Priority" : "الأولوية"}</span>
                      <span className="block text-lg font-serif font-bold text-emerald-deep">{onePagerPriority}</span>
                    </div>
                    <div className="border border-gray-200 bg-slate-50 p-3 rounded">
                      <span className="block text-[9px] uppercase font-mono tracking-widest text-gray-500 font-bold">{isEn ? "Updated" : "التحديث"}</span>
                      <span className="block text-sm font-mono font-bold text-slate-vip">{onePagerUpdated}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5" id="one-pager-decision-strip">
                {onePagerDecisionCards.map((card) => (
                  <div key={card.label} className={`rounded border p-3.5 min-h-[108px] ${card.tone}`}>
                    <p className={`text-[10px] uppercase tracking-widest font-mono font-black ${card.labelClass}`}>{card.label}</p>
                    <p className={`mt-2 text-sm font-bold leading-5 line-clamp-4 ${card.valueClass}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-12 gap-3 items-start">
                <section className="2xl:col-span-4 space-y-3">
                  <h4 className="text-xs uppercase tracking-widest font-mono font-black text-emerald-deep">{isEn ? "Fast Facts" : "حقائق سريعة"}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {onePagerFactsForDisplay.slice(0, 8).map((fact, index) => (
                      <div key={`${fact.label}-${index}`} className="bg-white border border-gray-200 rounded p-2.5 min-h-[86px]">
                        <p className="text-[9px] uppercase tracking-widest font-mono font-bold text-gray-500 truncate" title={fact.label}>{fact.label}</p>
                        <p className="text-base font-serif font-bold text-slate-vip leading-tight mt-1 break-words line-clamp-3">{fact.value}</p>
                        {(fact.context || fact.source || fact.year) && (
                          <p className="text-[10px] text-gray-500 mt-1 leading-4 line-clamp-2">{[fact.context, fact.year, fact.source].filter(Boolean).join(" | ")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="2xl:col-span-5 space-y-3">
                  <h4 className="text-xs uppercase tracking-widest font-mono font-black text-emerald-deep">{isEn ? "Sector Scorecard" : "بطاقة القطاعات"}</h4>
                  <div className="overflow-hidden border border-gray-200 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-vip text-white">
                        <tr>
                          <th className="p-2 text-left font-mono uppercase tracking-wider">{isEn ? "Sector" : "القطاع"}</th>
                          <th className="p-2 text-left font-mono uppercase tracking-wider">{isEn ? "Baseline" : "الوضع"}</th>
                          <th className="p-2 text-left font-mono uppercase tracking-wider">{isEn ? "UAE Angle" : "زاوية الإمارات"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {onePagerSectorScorecard.slice(0, 3).map((item, index) => (
                          <tr key={`${item.sector}-${index}`} className="border-t border-gray-200 bg-white align-top">
                            <td className="p-2 font-bold text-emerald-deep">
                              <span>{item.sector}</span>
                              {item.policyTarget && <span className="block text-[10px] font-medium text-gray-500 leading-4 mt-1">{item.policyTarget}</span>}
                            </td>
                            <td className="p-2 text-gray-700 leading-5">{item.currentBaseline}</td>
                            <td className="p-2 text-gray-700 leading-5">{item.uaeAngle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-[#F1F5F9] border-l-4 border-[#475569] p-3 rounded-sm">
                    <p className="text-[10px] uppercase tracking-widest font-mono font-black text-[#475569]">{isEn ? "UAE Relevance" : "صلة الملف بالامارات"}</p>
                    <p className="text-sm text-slate-vip leading-6 mt-1">{onePagerUaeRelevance}</p>
                  </div>
                </section>

                <section className="2xl:col-span-3 space-y-3">
                  <h4 className="text-xs uppercase tracking-widest font-mono font-black text-emerald-deep">{isEn ? "Leadership" : "القيادة"}</h4>
                  <div className="space-y-2">
                    {onePagerLeadership.slice(0, 3).map((leader, index) => (
                      <div key={`${leader.role}-${index}`} className="bg-white border border-gray-200 rounded p-3">
                        <p className="text-[9px] uppercase tracking-widest font-mono font-bold text-gray-500">{leader.role}</p>
                        <p className="text-sm font-bold text-slate-vip mt-1">{leader.name}</p>
                        {leader.note && <p className="text-[10px] text-gray-500 mt-1">{leader.note}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-12 gap-3 items-start">
                <section className="2xl:col-span-5 bg-white border border-gray-200 rounded p-3.5 h-fit self-start">
                  <h4 className="text-xs uppercase tracking-widest font-mono font-black text-emerald-deep mb-3">{isEn ? "Opportunity Map" : "خريطة الفرص"}</h4>
                  <div className="space-y-2.5">
                    {onePagerOpportunities.slice(0, 3).map((opportunity, index) => (
                      <div key={`${opportunity.title}-${index}`} className="border-l-2 border-gold-deep pl-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-serif font-bold text-slate-vip">{opportunity.title}</p>
                          {opportunity.priority && <span className="text-[9px] font-mono font-black text-emerald-deep bg-gold-bg/50 px-1.5 py-0.5 rounded">{opportunity.priority}</span>}
                        </div>
                        <p className="text-xs text-gray-600 leading-5 mt-1">{opportunity.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="2xl:col-span-4 bg-white border border-gray-200 rounded p-3.5 h-fit self-start">
                  <h4 className="text-xs uppercase tracking-widest font-mono font-black text-emerald-deep mb-3">{isEn ? "Risk And Mitigation" : "المخاطر والمعالجة"}</h4>
                  <div className="space-y-2.5">
                    {onePagerRisks.slice(0, 2).map((risk, index) => (
                      <div key={`${risk.risk}-${index}`} className="bg-amber-50 border border-amber-100 rounded p-3">
                        <p className="text-xs font-bold text-amber-900 leading-5 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{risk.risk}</span>
                        </p>
                        <p className="text-[11px] text-amber-800 leading-5 mt-1">{risk.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="2xl:col-span-3 bg-slate-vip text-white rounded p-3.5 h-fit self-start">
                  <h4 className="text-xs uppercase tracking-widest font-mono font-black text-gold-deep mb-3 flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5" />
                    <span>{isEn ? "90-Day Actions" : "خطوات 90 يوما"}</span>
                  </h4>
                  <ol className="space-y-2">
                    {onePagerActions.slice(0, 4).map((action, index) => (
                      <li key={`${action}-${index}`} className="flex gap-2 text-xs leading-5">
                        <span className="h-5 w-5 shrink-0 rounded bg-gold-deep text-slate-vip font-mono font-black flex items-center justify-center text-[10px]">{index + 1}</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              <div className="bg-emerald-deep text-white p-4 rounded-sm border-l-4 border-gold-deep">
                <p className="text-[10px] uppercase tracking-widest font-mono font-black text-gold-deep">{isEn ? "Strategic Recommendation" : "التوصية الاستراتيجية"}</p>
                <p className="text-sm md:text-base leading-6 mt-1 font-semibold">{onePagerRecommendation}</p>
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

        {/* 5. VIDEO BRIEF PLACEHOLDER */}
        {activeOutput === "video-brief" && (
          <div className="p-6 md:p-8 min-h-[460px] bg-[#F8FAFC]" id="video-brief-coming-soon-section">
            <div className="h-full min-h-[410px] rounded-sm border border-gold-border bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-vip px-5 py-3 border-b border-gold-deep/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-gold-deep">
                  <Video className="w-4 h-4" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest">
                    {isEn ? "Video Brief" : "الإحاطة المرئية"}
                  </span>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gold-deep/30 bg-gold-bg/10 px-3 py-1 text-[10px] font-mono font-black uppercase tracking-widest text-gold-deep">
                  <Clock3 className="w-3.5 h-3.5" />
                  {isEn ? "Coming Soon" : "قريباً"}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-0 min-h-[350px]">
                <div className="bg-[#16211C] text-white p-6 md:p-8 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-3 right-3 h-16 w-16 border-t border-r border-gold-deep/25"></div>
                  <div className="absolute bottom-3 left-3 h-16 w-16 border-b border-l border-gold-deep/25"></div>
                  <div className="relative z-10 space-y-4">
                    <div className="h-14 w-14 rounded-full border border-gold-deep/40 bg-gold-deep/10 text-gold-deep flex items-center justify-center">
                      <Video className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-black uppercase tracking-widest text-gold-deep">
                        {isEn ? `${country.nameEn} Briefing Package` : `حزمة إحاطة ${country.nameAr}`}
                      </p>
                      <h3 className="mt-2 text-2xl md:text-3xl font-serif font-bold leading-tight">
                        {isEn ? "Video Brief is coming soon" : "الإحاطة المرئية قادمة قريباً"}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-gray-300">
                        {isEn
                          ? "This briefing package will support short narrated video summaries for executive review before meetings."
                          : "ستدعم هذه الحزمة ملخصات مرئية قصيرة ومروية للمراجعة القيادية قبل الاجتماعات."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] bg-gold-bg text-gold-deep border border-gold-border/50 font-bold font-mono px-2 py-0.5 rounded uppercase">
                        {isEn ? "Planned Output" : "المخرج المخطط"}
                      </span>
                      <h4 className="mt-2 text-xl font-serif font-bold text-slate-vip">
                        {isEn ? "Executive video briefing module" : "وحدة الإحاطة المرئية القيادية"}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          titleEn: "Narrated Summary",
                          titleAr: "ملخص مروي",
                          bodyEn: "A short leadership-ready overview generated from the executive summary.",
                          bodyAr: "نظرة موجزة جاهزة للقيادة ومبنية على الملخص التنفيذي.",
                        },
                        {
                          titleEn: "Briefing Visuals",
                          titleAr: "مرئيات الإحاطة",
                          bodyEn: "Selected facts, talking points, and slide highlights arranged for video.",
                          bodyAr: "حقائق ونقاط حديث وأبرز الشرائح مرتبة للعرض المرئي.",
                        },
                        {
                          titleEn: "Secure Review",
                          titleAr: "مراجعة آمنة",
                          bodyEn: "Designed for controlled internal preview before delegation meetings.",
                          bodyAr: "مصممة للمعاينة الداخلية المنضبطة قبل اجتماعات الوفود.",
                        },
                      ].map((item) => (
                        <div key={item.titleEn} className="rounded border border-gray-200 bg-slate-50 p-3">
                          <p className="text-sm font-bold text-slate-vip">{isEn ? item.titleEn : item.titleAr}</p>
                          <p className="mt-1 text-xs leading-5 text-gray-600">{isEn ? item.bodyEn : item.bodyAr}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-sm border-l-4 border-gold-deep bg-gold-bg/25 p-4">
                      <p className="text-sm font-bold text-slate-vip">
                        {isEn
                          ? "The video brief feature is not active yet. Use the Executive Summary, One-Pager, Talking Points, and Slides tabs for the current pitch flow."
                          : "ميزة الإحاطة المرئية غير مفعلة حالياً. استخدم تبويبات الملخص التنفيذي والصفحة الواحدة ونقاط الحديث والشرائح في مسار العرض الحالي."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
