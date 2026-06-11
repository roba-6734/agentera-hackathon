import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import IntelligenceProfile from "./components/IntelligenceProfile";
import StrategicInsightsView from "./components/StrategicInsightsView";
import BriefingGenerator from "./components/BriefingGenerator";
import ComparisonEngine from "./components/ComparisonEngine";
import PredictiveIntelligenceView from "./components/PredictiveIntelligenceView";
import AiChatAssistant from "./components/AiChatAssistant";
import BilateralCalendar from "./components/BilateralCalendar";
import AuthPortal from "./components/AuthPortal";
import StrategicSignalsMonitor from "./components/StrategicSignalsMonitor";
import StrategicMeetingDebrief from "./components/StrategicMeetingDebrief";
import ExecutiveDecisionSupport from "./components/ExecutiveDecisionSupport";
import CountryFlag from "./components/CountryFlag";
import { apiFetch } from "./api";
import { AppRole, AppSession, BriefingArtifacts, PrebuiltCountry, UaeIndicator, activeTabCode } from "./types";
import { ShieldAlert, Layers, Award, Landmark, Eye, ArrowRight, FileText, CheckCircle2, Activity, Cpu, ChevronDown, Crown, Target, Sparkles, UsersRound, BrainCircuit, MessageCircle, X, Bot, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useGsapScrollCards } from "./hooks/useGsapScrollCards";

const SESSION_STORAGE_KEY = "majlis-ai-session";

const workspacePanelMotion = {
  initial: { opacity: 0, y: 22, scale: 0.992, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: 10, scale: 0.996, filter: "blur(4px)" },
  transition: {
    duration: 0.54,
    ease: [0.16, 1, 0.3, 1],
    opacity: { duration: 0.34 },
    filter: { duration: 0.42 },
  },
};

interface CountryOption {
  code: string;
  nameEn: string;
  nameAr: string;
  flag: string;
  flagUrl?: string;
}

function normalizeCountrySearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .toLocaleLowerCase()
    .trim();
}

function normalizeStoredRole(role: unknown): AppRole | null {
  if (role === "staff" || role === "executive") {
    return role;
  }

  // Existing hackathon sessions used `cabinet`; keep them working as staff sessions.
  if (role === "cabinet") {
    return "staff";
  }

  return null;
}

function readStoredAppSession(): AppSession | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as AppSession;
    const normalizedRole = normalizeStoredRole(parsed.role);
    if (!normalizedRole) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return {
      ...parsed,
      role: normalizedRole,
    };
  } catch (error) {
    console.warn("Unable to restore Majlis AI session.", error);
    return null;
  }
}

export default function App() {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [session, setSession] = useState<AppSession | null>(() => readStoredAppSession());
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");
  const [selectedComparisonCountryCodes, setSelectedComparisonCountryCodes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<activeTabCode>("passport");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState<boolean>(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>("");
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  // Sovereign Comparison stats
  const [uaeData, setUaeData] = useState<UaeIndicator>({
    nameEn: "United Arab Emirates",
    nameAr: "دولة الإمارات العربية المتحدة",
    flag: "🇦🇪",
    gdp: "$504 Billion (USD)",
    gdpAr: "504 مليار دولار أمريكي",
    growth: "3.7%",
    energyMix: "Natural Gas (55%), Solar & Clean Nuclear (42%), Oil & Clean Coal (3%)",
    energyMixAr: "غاز طبيعي (55%)، طاقة شمسية ونووية نظيفة (42%)، نفط وفحم نظيف (3%)",
    infrastructureIndex: "96.5/100 (Global Top Rank on Roads/Ports)",
    infrastructureIndexAr: "96.5/100 (مرتبة رائدة عالمياً في جودة الطرق والموانئ)",
    environmentalRank: "Net Zero Strategic Initiative 2050 Active",
    environmentalRankAr: "مبادرة الحياد المناخي 2050 نشطة كلياً",
    competitivenessRank: "Top 10th globally",
    competitivenessRankAr: "ضمن أفضل 10 دول تنافسية عالمياً",
    cooperationAgreementEn: "Host of COP28, Global Green Corridor Champion",
    cooperationAgreementAr: "مستضيف مؤتمر الأطراف COP28 ورائد الممرات العالمية الخضراء",
  });

  const [countriesIndex, setCountriesIndex] = useState<Record<string, PrebuiltCountry>>({});
  const [activeCountry, setActiveCountry] = useState<PrebuiltCountry | null>(null);

  // Strategic AI briefing state loaded back and forth from server
  const [aiBriefingText, setAiBriefingText] = useState<string>("");
  const [briefingArtifacts, setBriefingArtifacts] = useState<BriefingArtifacts | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [briefingSource, setBriefingSource] = useState<string>("openai-strategic-ai");

  // Country listing options (pre-seeded with high fidelity research)
  const availableBilateralOptions: CountryOption[] = [
    { code: "brazil", nameEn: "Brazil", nameAr: "البرازيل", flag: "🇧🇷" },
    { code: "germany", nameEn: "Germany", nameAr: "ألمانيا", flag: "🇩🇪" },
    { code: "india", nameEn: "India", nameAr: "الهند", flag: "🇮🇳" },
    { code: "singapore", nameEn: "Singapore", nameAr: "سنغافورة", flag: "🇸🇬" },
    { code: "united-states", nameEn: "United States", nameAr: "الولايات المتحدة", flag: "🇺🇸" },
    { code: "united-kingdom", nameEn: "United Kingdom", nameAr: "المملكة المتحدة", flag: "🇬🇧" },
    { code: "china", nameEn: "China", nameAr: "الصين", flag: "🇨🇳" },
    { code: "japan", nameEn: "Japan", nameAr: "اليابان", flag: "🇯🇵" },
    { code: "saudi-arabia", nameEn: "Saudi Arabia", nameAr: "المملكة العربية السعودية", flag: "🇸🇦" },
    { code: "egypt", nameEn: "Egypt", nameAr: "مصر", flag: "🇪🇬" },
  ];

  // Meeting objective and search initializer state
  const [meetingObjective, setMeetingObjective] = useState("");
  const initialLoadStartedRef = useRef(false);

  // Initialize shared comparison values without loading a country briefing.
  useEffect(() => {
    if (!session) {
      return;
    }

    if (initialLoadStartedRef.current) {
      return;
    }
    initialLoadStartedRef.current = true;

    async function loadInitialDatabase() {
      try {
        const resp = await apiFetch("/api/advisor/compare");
        const data = await resp.json();
        if (data.countries) {
          const combinedCountries = { ...data.countries };
          setCountriesIndex(combinedCountries);
          setUaeData(data.uae);
        }
      } catch (err) {
        console.error("Failed to load compare parameters from server:", err);
      } finally {
        setIsGenerating(false);
      }
    }
    loadInitialDatabase();
  }, [session?.role]);

  // Sync selected country dataset manually based on selection and meeting objective
  const triggerSyncSearch = async (
    targetCountry: string = selectedCountryCode,
    targetLang: "en" | "ar" = language,
    options: { redirectToProfile?: boolean } = {}
  ) => {
    const shouldRedirectToProfile = options.redirectToProfile !== false;
    const cleanTargetCountry = targetCountry.trim();
    if (!cleanTargetCountry) {
      setActiveCountry(null);
      setSelectedComparisonCountryCodes([]);
      setAiBriefingText("");
      setBriefingArtifacts(null);
      setCurrentStep(1);
      return;
    }

    setIsGenerating(true);
    if (shouldRedirectToProfile) {
      setActiveTab(session?.role === "executive" ? "briefing" : "passport");
      setCurrentStep(session?.role === "executive" ? 8 : 3);
    }
    try {
      const trimmedObjective = meetingObjective.trim();
      const executivePrompt = `Draft a concise executive meeting briefing for ${cleanTargetCountry}. Keep it focused on decision points, meeting leadership, and no more than three priorities.`;
      const resp = await apiFetch("/api/advisor/brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: cleanTargetCountry,
          language: targetLang,
          question: trimmedObjective
            ? session?.role === "executive"
              ? `${executivePrompt} Center it around this objective: ${trimmedObjective}`
              : `Draft briefing for ${cleanTargetCountry} centered around this objective: ${trimmedObjective}`
            : session?.role === "executive"
              ? executivePrompt
              : undefined,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setAiBriefingText(data.aiBriefing.rawText);
        setBriefingArtifacts(data.briefingArtifacts || data.aiBriefing?.structured || null);
        setBriefingSource(data.source || "openai-strategic-ai");
        if (data.countryData) {
          setActiveCountry(data.countryData);
          setSelectedComparisonCountryCodes((current) =>
            current.includes(data.countryData.id) ? current : [...current, data.countryData.id]
          );
        }
        
        if (!shouldRedirectToProfile) {
          return;
        }

        if (session?.role === "executive") {
          setActiveTab("briefing");
          setCurrentStep(8); // Elevate workflow straight to briefing presentation stage
        } else {
          setActiveTab("passport");
          setCurrentStep(3); // Show country profile first after generation.
        }
      }
    } catch (err) {
      console.error("Critical error syncing bilateral dataset:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Synchronize language changes on demand
  useEffect(() => {
    if (activeCountry) {
      triggerSyncSearch(selectedCountryCode, language, { redirectToProfile: false });
    }
  }, [language]);

  // Handle activeTab redirect from chat tab to side floating layout
  useEffect(() => {
    if (activeTab === "chat") {
      setIsChatOpen(true);
      setActiveTab("passport"); // revert to main tab so workspace is not empty
    }
  }, [activeTab]);

  const handleCountryPicked = (code: string) => {
    const isChangingCountry = code !== selectedCountryCode || activeCountry?.id !== code;
    setSelectedCountryCode(code);
    setSelectedComparisonCountryCodes((current) =>
      current.includes(code) ? current : [...current, code]
    );
    if (isChangingCountry) {
      setActiveCountry(null);
      setAiBriefingText("");
      setBriefingArtifacts(null);
    }
    setCurrentStep(2); // Set workflow timeline stage to Step 2: Target country selected
  };

  const toggleComparisonCountry = (code: string) => {
    setSelectedComparisonCountryCodes((current) =>
      current.includes(code)
        ? current.filter((countryCode) => countryCode !== code)
        : [...current, code]
    );
  };

  const toggleCountryDropdown = () => {
    setCountrySearchQuery("");
    setIsCountryDropdownOpen((current) => !current);
  };

  const closeCountryDropdown = () => {
    setCountrySearchQuery("");
    setIsCountryDropdownOpen(false);
  };

  const handleAuthenticated = (nextSession: AppSession) => {
    // Placeholder session persistence:
    // Replace with verified auth tokens, server-issued role claims, and user records when real auth is connected.
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setSelectedCountryCode("");
    setSelectedComparisonCountryCodes([]);
    setActiveCountry(null);
    setAiBriefingText("");
    setBriefingArtifacts(null);
    setActiveTab(nextSession.role === "executive" ? "briefing" : "passport");
    setCurrentStep(1);
    setIsChatOpen(false);
    setIsCalendarOpen(false);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    initialLoadStartedRef.current = false;
    setSession(null);
    setSelectedCountryCode("");
    setSelectedComparisonCountryCodes([]);
    setActiveCountry(null);
    setAiBriefingText("");
    setBriefingArtifacts(null);
    setBriefingSource("openai-strategic-ai");
    setIsChatOpen(false);
    setIsCalendarOpen(false);
  };

  const isEn = language === "en";
  const enrichedBilateralOptions = availableBilateralOptions.map((option) => {
    const indexedCountry = countriesIndex[option.code];
    return {
      ...option,
      flag: indexedCountry?.flag || option.flag,
      flagUrl: indexedCountry?.flagUrl || option.flagUrl,
    };
  });
  const countryOptions: CountryOption[] = [
    ...enrichedBilateralOptions,
    ...(Object.values(countriesIndex) as PrebuiltCountry[])
      .filter((country) => !enrichedBilateralOptions.some((option) => option.code === country.id))
      .map((country) => ({
        code: country.id,
        nameEn: country.nameEn,
        nameAr: country.nameAr,
        flag: country.flag || "🌐",
        flagUrl: country.flagUrl,
      })),
  ].sort((firstCountry, secondCountry) =>
    firstCountry.nameEn.localeCompare(secondCountry.nameEn, "en", { sensitivity: "base" }) ||
    firstCountry.code.localeCompare(secondCountry.code, "en", { sensitivity: "base" })
  );
  const normalizedCountrySearchQuery = normalizeCountrySearch(countrySearchQuery);
  const filteredCountryOptions = normalizedCountrySearchQuery
    ? countryOptions.filter((option) =>
        normalizeCountrySearch(`${option.nameEn} ${option.nameAr} ${option.code}`).includes(normalizedCountrySearchQuery)
      )
    : countryOptions;
  const selectedCountryOption = countryOptions.find((option) => option.code === selectedCountryCode);
  const suggestedCountryOptions = ["india", "germany", "singapore"]
    .map((code) => countryOptions.find((option) => option.code === code))
    .filter((option): option is CountryOption => Boolean(option));
  const selectedCountryNameEn = activeCountry?.nameEn || selectedCountryOption?.nameEn || "Select country";
  const selectedCountryNameAr = activeCountry?.nameAr || selectedCountryOption?.nameAr || "اختر الدولة";
  const comparisonCountryLookup = new Map<string, PrebuiltCountry>(
    (Object.values(countriesIndex) as PrebuiltCountry[]).map((country) => [country.id, country])
  );
  if (activeCountry) {
    comparisonCountryLookup.set(activeCountry.id, activeCountry);
    if (selectedCountryCode) {
      comparisonCountryLookup.set(selectedCountryCode, activeCountry);
    }
  }
  const selectedComparisonCountries = selectedComparisonCountryCodes
    .map((code) => comparisonCountryLookup.get(code))
    .filter((country): country is PrebuiltCountry => Boolean(country));
  const comparisonCountriesForView = selectedComparisonCountries;
  const workspaceTabItems = [
    {
      code: "passport" as activeTabCode,
      labelEn: "Country Intelligence",
      labelAr: "الملف الذكي للدولة",
      Icon: FileText,
      step: 3,
    },
    {
      code: "strategic" as activeTabCode,
      labelEn: "Strategic Insights",
      labelAr: "الدليل الاستراتيجي الثنائي",
      Icon: Layers,
      step: 4,
    },
    {
      code: "compare" as activeTabCode,
      labelEn: "Sovereign Comparison",
      labelAr: "مقارنة المؤشرات",
      Icon: Landmark,
      step: 4,
    },
    {
      code: "predictive" as activeTabCode,
      labelEn: "Predictive Intelligence",
      labelAr: "التنبؤات المستقبلية",
      Icon: Eye,
      step: 5,
    },
    {
      code: "briefing" as activeTabCode,
      labelEn: "Briefings",
      labelAr: "الإحاطات",
      Icon: Award,
      step: 8,
      badge: "MEMO",
    },
    ...(session?.role === "staff"
      ? [{
          code: "debrief" as activeTabCode,
          labelEn: "Meeting Debrief",
          labelAr: "تحليل الاجتماع",
          Icon: BrainCircuit,
          step: 9,
        }]
      : []),
  ];
  const showSignalsPanel = session?.role === "staff" && activeTab !== "debrief";
  const activeWorkspaceTab = workspaceTabItems.find((item) => item.code === activeTab);
  const workspaceSectionTitle = activeCountry
    ? `${isEn ? activeWorkspaceTab?.labelEn || "Workspace" : activeWorkspaceTab?.labelAr || "مساحة العمل"} - ${isEn ? activeCountry.nameEn : activeCountry.nameAr}`
    : selectedCountryOption
      ? isEn
        ? `${selectedCountryOption.nameEn} is ready to initialize`
        : `${selectedCountryOption.nameAr} جاهزة للتحضير`
      : isEn
        ? "Start with a country profile"
        : "ابدأ بملف الدولة";
  const workspaceSectionStatus = activeCountry
    ? isEn
      ? "Profile loaded"
      : "تم تحميل الملف"
    : selectedCountryOption
      ? isEn
        ? "Country selected"
        : "تم اختيار الدولة"
      : isEn
        ? "No target selected"
        : "لم يتم اختيار هدف";
  const initializeCountryFromWidget = (code?: string) => {
    const targetCountry = (code || selectedCountryCode).trim();
    if (!targetCountry) {
      return;
    }

    if (targetCountry !== selectedCountryCode || activeCountry?.id !== targetCountry) {
      handleCountryPicked(targetCountry);
    }
    triggerSyncSearch(targetCountry);
  };
  const meetingTopicChips = [
    {
      labelEn: "Energy",
      labelAr: "الطاقة",
      valueEn: "Energy cooperation, grid resilience, and clean power partnerships",
      valueAr: "التعاون في الطاقة ومرونة الشبكات وشراكات الطاقة النظيفة",
    },
    {
      labelEn: "Infrastructure",
      labelAr: "البنية التحتية",
      valueEn: "Infrastructure corridors, ports, logistics, and project delivery",
      valueAr: "ممرات البنية التحتية والموانئ واللوجستيات وتنفيذ المشاريع",
    },
    {
      labelEn: "Investment",
      labelAr: "الاستثمار",
      valueEn: "Investment pipeline, sovereign partnerships, and priority projects",
      valueAr: "مسار الاستثمار والشراكات السيادية والمشاريع ذات الأولوية",
    },
    {
      labelEn: "Climate",
      labelAr: "المناخ",
      valueEn: "Climate alignment, sustainability commitments, and COP follow-through",
      valueAr: "مواءمة المناخ والتزامات الاستدامة ومتابعة مخرجات مؤتمر الأطراف",
    },
  ];
  const signalSummaryItems = [
    { labelEn: "Energy", labelAr: "الطاقة", valueEn: "Grid watch", valueAr: "متابعة الشبكات" },
    { labelEn: "Logistics", labelAr: "اللوجستيات", valueEn: "Corridor shifts", valueAr: "تحولات الممرات" },
    { labelEn: "Diplomacy", labelAr: "الدبلوماسية", valueEn: "Regional posture", valueAr: "الموقف الإقليمي" },
  ];
  const assistantPortalState = {
    titleEn: isGenerating
      ? "Compiling intelligence update"
      : activeCountry
        ? `${activeWorkspaceTab?.labelEn || "Advisor"} tuned to ${activeCountry.nameEn}`
        : "Awaiting country selection",
    titleAr: isGenerating
      ? "جاري تجميع تحديث استخباراتي"
      : activeCountry
        ? `${activeWorkspaceTab?.labelAr || "المستشار"} مضبوط على ${activeCountry.nameAr}`
        : "بانتظار اختيار الدولة",
    statusEn: isGenerating
      ? "Live analysis"
      : activeCountry
        ? "Advisor ready"
        : "Setup required",
    statusAr: isGenerating
      ? "تحليل مباشر"
      : activeCountry
        ? "المستشار جاهز"
        : "يتطلب الإعداد",
    nodeOneEn: isGenerating ? "Sync" : activeCountry ? "Ready" : "Select",
    nodeOneAr: isGenerating ? "مزامنة" : activeCountry ? "جاهز" : "اختر",
    nodeTwoEn: activeWorkspaceTab?.labelEn.split(" ")[0] || "Brief",
    nodeTwoAr: activeWorkspaceTab?.labelAr || "إحاطة",
    nodeThreeEn: isChatOpen ? "Chat" : "Signal",
    nodeThreeAr: isChatOpen ? "محادثة" : "مؤشر",
    modeClass: isGenerating ? "ai-assist-card-live" : activeCountry ? "ai-assist-card-ready" : "ai-assist-card-idle",
  };

  useGsapScrollCards([
    session?.role,
    activeCountry?.id,
    activeTab,
    language,
    isGenerating,
    showSignalsPanel,
  ]);

  if (!session) {
    return (
      <AuthPortal
        language={language}
        setLanguage={setLanguage}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (session.role === "executive") {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex flex-col justify-between" id="majlis-executive-briefing-root">
        <Header
          language={language}
          setLanguage={setLanguage}
          selectedCountryNameEn={selectedCountryNameEn}
          selectedCountryNameAr={selectedCountryNameAr}
          onOpenCalendar={() => setIsCalendarOpen(true)}
          sessionDisplayName={session.displayName}
          sessionRole={session.role}
          onLogout={handleLogout}
        />

        <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 flex-1 w-full space-y-6" id="executive-briefing-workspace">
          <section className="bg-white rounded-sm shadow-md border-l-4 border-[#CBD5E1] p-5 md:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5" id="executive-briefing-control-ribbon">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-deep font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>{isEn ? "EXECUTIVE MEETING MODE" : "نمط الإحاطة القيادية"}</span>
              </span>
              <h2 className="text-xl md:text-2xl font-bold font-serif text-slate-vip">
                {isEn ? "Concise Bilateral Briefing" : "إحاطة ثنائية موجزة"}
              </h2>
              <p className="text-xs text-gray-500 max-w-2xl">
                {isEn
                  ? "Focused view for meeting chairs and senior officials: context, decision priority, and speaking posture only."
                  : "عرض مركز لرؤساء الاجتماعات وكبار المسؤولين: السياق وأولوية القرار ونبرة الحديث فقط."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3" id="executive-briefing-controls">
              <div className="relative inline-block text-left" id="executive-country-selector-wrapper">
                <button
                  type="button"
                  onClick={toggleCountryDropdown}
                  className="bg-white hover:bg-gray-50 border border-gold-border rounded-sm shadow-sm px-4 py-2.5 inline-flex items-center justify-between gap-3 text-xs font-bold text-slate-vip focus:outline-none focus:ring-1 focus:ring-gold-deep cursor-pointer min-w-[210px]"
                  id="executive-country-selector-btn"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CountryFlag
                      flag={selectedCountryOption?.flag || activeCountry?.flag}
                      flagUrl={selectedCountryOption?.flagUrl || activeCountry?.flagUrl}
                      countryName={isEn ? selectedCountryNameEn : selectedCountryNameAr}
                      size="sm"
                    />
                    <span className="truncate max-w-[135px]">
                      {selectedCountryOption
                        ? isEn ? selectedCountryOption.nameEn : selectedCountryOption.nameAr
                        : activeCountry
                          ? isEn ? activeCountry.nameEn : activeCountry.nameAr
                          : isEn ? "Select country" : "اختر الدولة"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gold-deep shrink-0 transition-transform duration-200" style={{ transform: isCountryDropdownOpen ? "rotate(180deg)" : "none" }} />
                </button>

                {isCountryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={closeCountryDropdown}></div>
                    <div
                      className="origin-top-left absolute left-0 mt-1.5 w-72 rounded-sm shadow-xl bg-white border border-gold-border z-50 focus:outline-none overflow-hidden"
                      id="executive-country-selector-panel"
                    >
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                          <input
                            type="search"
                            value={countrySearchQuery}
                            onChange={(event) => setCountrySearchQuery(event.target.value)}
                            placeholder={isEn ? "Search countries" : "ابحث عن دولة"}
                            autoFocus
                            className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-xs font-medium text-slate-vip outline-none transition focus:border-gold-deep focus:bg-white focus:ring-1 focus:ring-gold-deep"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto py-1">
                        {filteredCountryOptions.map((option) => (
                          <button
                            key={option.code}
                            type="button"
                            onClick={() => {
                              handleCountryPicked(option.code);
                              closeCountryDropdown();
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              selectedCountryCode === option.code
                                ? "bg-gold-bg text-emerald-deep font-extrabold"
                                : "text-slate-vip hover:bg-gray-50 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <CountryFlag flag={option.flag} flagUrl={option.flagUrl} countryName={isEn ? option.nameEn : option.nameAr} size="sm" />
                              <span className="truncate">{isEn ? option.nameEn : option.nameAr}</span>
                            </div>
                            {selectedCountryCode === option.code && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-deep shrink-0" />
                            )}
                          </button>
                        ))}
                        {filteredCountryOptions.length === 0 && (
                          <div className="px-4 py-5 text-center text-xs font-semibold text-gray-500">
                            {isEn ? "No countries found" : "لم يتم العثور على دول"}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <form onSubmit={(event) => { event.preventDefault(); triggerSyncSearch(); }} className="flex items-center gap-2 border border-gold-border rounded-sm p-1 bg-white shadow-sm" id="executive-meeting-objective-form">
                <input
                  type="text"
                  placeholder={isEn ? "Meeting objective..." : "هدف الاجتماع..."}
                  value={meetingObjective}
                  onChange={(event) => setMeetingObjective(event.target.value)}
                  disabled={isGenerating}
                  className="px-2 py-1.5 text-xs w-48 sm:w-56 outline-none bg-transparent placeholder-gray-400 font-sans border-0"
                  id="executive-meeting-objective-input"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !selectedCountryCode}
                  className="px-3.5 py-2 bg-slate-vip hover:bg-gold-deep hover:text-slate-vip text-white text-[10px] uppercase tracking-widest font-extrabold rounded-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all font-mono"
                  id="executive-refresh-brief-btn"
                >
                  <span>
                    {isGenerating
                      ? isEn ? "Updating" : "تحديث"
                      : activeCountry
                        ? isEn ? "Refresh Brief" : "تحديث الإحاطة"
                        : isEn ? "Initialize Search" : "تحضير الإيجاز"}
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </form>
            </div>
          </section>

          {activeCountry && (
            <ExecutiveDecisionSupport
              country={activeCountry}
              language={language}
              briefingArtifacts={briefingArtifacts}
              meetingObjective={meetingObjective}
            />
          )}

          {isGenerating && !activeCountry ? (
            <div className="bg-white rounded-sm shadow-md border border-gold-border p-12 text-center" id="executive-briefing-loading-state">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-gold-border border-t-emerald-deep animate-spin"></div>
              <h3 className="text-lg font-serif font-bold text-slate-vip">
                {isEn ? "Preparing briefing sections..." : "جاري إعداد أقسام الإحاطة..."}
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                {isEn
                  ? "Executive summary, talking points, one-pager, and slides will appear here when ready."
                  : "سيظهر الملخص التنفيذي ونقاط الحديث والصفحة الواحدة والشرائح هنا عند الجاهزية."}
              </p>
            </div>
          ) : activeCountry ? (
            <section className="bg-white rounded-sm shadow-md border-l-4 border-emerald-deep overflow-hidden" id="executive-briefing-parts-panel">
              <div className="bg-slate-vip px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-white">
                <div className="flex items-center gap-3 min-w-0">
                  <CountryFlag flag={activeCountry.flag} flagUrl={activeCountry.flagUrl} countryName={isEn ? activeCountry.nameEn : activeCountry.nameAr} size="lg" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-gold-deep font-mono font-extrabold">
                      {isEn ? "Briefing Package" : "حزمة الإحاطة"}
                    </p>
                    <h3 className="text-xl font-serif font-bold truncate">
                      {isEn ? activeCountry.nameEn : activeCountry.nameAr}
                    </h3>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono font-black uppercase">
                  <span className="bg-gold-deep text-slate-vip px-2.5 py-1 rounded-sm">{isEn ? "Summary" : "ملخص"}</span>
                  <span className="bg-white/10 text-white px-2.5 py-1 rounded-sm border border-white/15">{isEn ? "Talking Points" : "نقاط الحديث"}</span>
                  <span className="bg-white/10 text-white px-2.5 py-1 rounded-sm border border-white/15">{isEn ? "One-Pager" : "صفحة واحدة"}</span>
                  <span className="bg-white/10 text-white px-2.5 py-1 rounded-sm border border-white/15">{isEn ? "Slides" : "شرائح"}</span>
                </div>
              </div>

              <div className="p-4 md:p-6">
                <BriefingGenerator
                  country={activeCountry}
                  language={language}
                  aiBriefingText={aiBriefingText}
                  briefingArtifacts={briefingArtifacts}
                  isGenerating={isGenerating}
                  briefingSource={briefingSource}
                  meetingObjective={meetingObjective}
                  uaeData={uaeData}
                />
              </div>
            </section>
          ) : (
            <div className="bg-white rounded-sm shadow-md border border-gold-border p-12 text-center" id="executive-no-country-fallback">
              <ShieldAlert className="w-12 h-12 text-gold-deep mx-auto mb-4" />
              <h3 className="text-lg font-serif font-bold text-slate-vip">
                {isEn ? "Select a country, then initialize search." : "اختر دولة، ثم ابدأ البحث."}
              </h3>
            </div>
          )}
        </main>

        <button
          onClick={() => {
            if (activeCountry) {
              setIsChatOpen(!isChatOpen);
            }
          }}
          disabled={!activeCountry}
          title={
            activeCountry
              ? isEn ? "Open executive AI advisor chat" : "فتح محادثة المستشار الذكي القيادي"
              : isEn ? "Select and initialize a country first" : "اختر دولة وابدأ البحث أولاً"
          }
          className="fixed bottom-10 right-6 z-[100] flex items-center justify-between gap-1 px-5 py-3.5 rounded-full bg-slate-vip hover:bg-[#15241F] text-white shadow-2xl border-2 border-[#94A3B8] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer max-w-xs sm:max-w-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          id="ai-policy-chat-launcher"
          style={{ direction: language === "ar" ? "rtl" : "ltr" }}
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4 opacity-90" />
            <span className="chat-launcher-label">{isEn ? "Executive AI Advisor Chat" : "محادثة المستشار الذكي القيادي"}</span>
          </div>
          {!isChatOpen && (
            <span className="chat-launcher-dot h-2 w-2 rounded-full bg-emerald-light animate-pulse ml-2 shrink-0 block"></span>
          )}
          {isChatOpen && (
            <X className="chat-launcher-close w-4 h-4 text-gold-deep ml-2 shrink-0" />
          )}
        </button>

        <footer className="bg-slate-vip border-t border-gold-deep/15 py-5 mt-8 text-white" id="executive-briefing-footer">
          <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-gray-400">
            <span className="font-serif font-extrabold text-gold-deep">Ministry of Energy & Infrastructure</span>
            <span>{isEn ? "Executive Briefing Node" : "وحدة الإحاطة القيادية"}</span>
          </div>
        </footer>

        {isChatOpen && activeCountry && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsChatOpen(false)}
              id="chat-outside-dismiss-backdrop"
            />
            <div
              className="fixed bottom-28 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[560px] lg:w-[640px] max-w-[calc(100vw-2rem)] h-[min(720px,calc(100vh-9rem))] bg-white rounded-lg shadow-2xl border border-[#CBD5E1] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ direction: language === "ar" ? "rtl" : "ltr" }}
            >
              <AiChatAssistant
                language={language}
                selectedCountryCode={selectedCountryCode}
                selectedCountryNameEn={activeCountry.nameEn}
                selectedCountryNameAr={activeCountry.nameAr}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          </>
        )}

        {isCalendarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" id="executive-calendar-modal-backdrop" onClick={() => setIsCalendarOpen(false)}>
            <div
              className="bg-white rounded-md shadow-2xl border border-gold-border w-full max-w-[1200px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative"
              id="executive-calendar-modal-content-container"
              onClick={(event) => event.stopPropagation()}
              style={{ direction: language === "ar" ? "rtl" : "ltr" }}
            >
              <BilateralCalendar
                country={activeCountry}
                language={language}
                onClose={() => setIsCalendarOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col justify-between" id="uae-advisor-application-root">
      
      {/* UAE themed global header */}
      <Header
        language={language}
        setLanguage={setLanguage}
        selectedCountryNameEn={selectedCountryNameEn}
        selectedCountryNameAr={selectedCountryNameAr}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        sessionDisplayName={session.displayName}
        sessionRole={session.role}
        onLogout={handleLogout}
      />

      {/* Primary Workspace container */}
      <main className="max-w-[1700px] xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 flex-1 w-full space-y-8" id="application-primary-workspace">
            {/* UPPER BANNER PROTOCOL */}
        <div className="bg-white rounded-sm shadow-md border-l-4 border-[#CBD5E1] p-4 md:p-5 grid grid-cols-1 xl:grid-cols-12 xl:items-center gap-4 xl:gap-5 relative" id="cabinet-briefing-upper-ribbon">
          <div className="absolute top-2 bottom-2 right-0 w-1 bg-gradient-to-b from-gold-deep to-emerald-deep pointer-events-none rounded-l-full opacity-60"></div>
          
          <div className="space-y-1.5 xl:col-span-5 min-w-0">
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-deep font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              <span>{isEn ? "COUNCIL DECISION SUPPORT" : "نظام تدقيق وتخطيط المخرجات الدبلوماسية"}</span>
            </span>
            <h2 className="text-lg md:text-xl font-bold font-serif text-slate-vip">
              {isEn ? "Bilateral Delegation Intelligence Room" : "غرفة استخبارات الوفود وجاهزية صناع القرار"}
            </h2>
            <p className="text-xs text-gray-500 max-w-3xl">
              {isEn ? "Select a strategic nation or onboard custom country directories to prepare talking points and interactive briefing boards instantly." : "اختر شريكاً دولياً لوجستياً أو ولد ملفات استتثنائية لأي دولة بالعالم في ثوانٍ لاستعراض مذكرات وشرائح العرض الفورية."}
            </p>
          </div>

          <div className={`ai-assist-card ${assistantPortalState.modeClass} xl:col-span-3 rounded-lg p-3 md:p-3.5 min-w-0`}>
            <div className="relative z-10 flex items-center gap-3">
              <div className="ai-node-icon h-9 w-9 rounded-lg flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-mono font-black text-slate-500">
                  {isEn ? assistantPortalState.statusEn : assistantPortalState.statusAr}
                </p>
                <h3 className="text-sm font-serif font-bold text-slate-vip truncate">
                  {isEn ? assistantPortalState.titleEn : assistantPortalState.titleAr}
                </h3>
              </div>
            </div>
            <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
              <div className="ai-node-pill">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>{isEn ? assistantPortalState.nodeOneEn : assistantPortalState.nodeOneAr}</span>
              </div>
              <div className="ai-node-pill">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEn ? assistantPortalState.nodeTwoEn : assistantPortalState.nodeTwoAr}</span>
              </div>
              <div className="ai-node-pill">
                <Activity className="w-3.5 h-3.5" />
                <span>{isEn ? assistantPortalState.nodeThreeEn : assistantPortalState.nodeThreeAr}</span>
              </div>
            </div>
          </div>

           {/* Styled premium spinner country selector with dropdown options */}
          <div className="flex flex-wrap items-center gap-3 xl:col-span-4 xl:self-center" id="quick-bilateral-selector">
            <div className="relative inline-block text-left" id="country-dropdown-spinner-wrapper">
              <button
                type="button"
                onClick={toggleCountryDropdown}
                className="bg-white hover:bg-gray-50 border border-gold-border rounded-sm shadow-sm px-4 py-2.5 inline-flex items-center justify-between gap-3 text-xs font-bold text-slate-vip focus:outline-none focus:ring-1 focus:ring-gold-deep cursor-pointer min-w-[200px]"
                id="country-spinner-trigger-btn"
              >
                <div className="flex items-center gap-2">
                  <CountryFlag
                    flag={selectedCountryOption?.flag || activeCountry?.flag}
                    flagUrl={selectedCountryOption?.flagUrl || activeCountry?.flagUrl}
                    countryName={isEn ? selectedCountryNameEn : selectedCountryNameAr}
                    size="sm"
                  />
                  <span className="truncate max-w-[130px]">
                    {selectedCountryOption
                      ? isEn ? selectedCountryOption.nameEn : selectedCountryOption.nameAr
                      : activeCountry
                        ? isEn ? activeCountry.nameEn : activeCountry.nameAr
                        : isEn ? "Select country" : "اختر الدولة"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gold-deep shrink-0 transition-transform duration-200" style={{ transform: isCountryDropdownOpen ? "rotate(180deg)" : "none" }} />
              </button>

              {isCountryDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={closeCountryDropdown}
                  ></div>
                  
                  <div 
                    className="origin-top-left absolute left-0 mt-1.5 w-72 rounded-sm shadow-xl bg-white border border-gold-border z-50 focus:outline-none overflow-hidden"
                    id="country-spinner-options-panel"
                  >
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="search"
                          value={countrySearchQuery}
                          onChange={(event) => setCountrySearchQuery(event.target.value)}
                          placeholder={isEn ? "Search countries" : "ابحث عن دولة"}
                          autoFocus
                          className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-xs font-medium text-slate-vip outline-none transition focus:border-gold-deep focus:bg-white focus:ring-1 focus:ring-gold-deep"
                        />
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {filteredCountryOptions.map((opt) => {
                        const isPrimaryCountry = selectedCountryCode === opt.code;
                        const isComparisonCountry = selectedComparisonCountryCodes.includes(opt.code);
                        return (
                          <div
                            key={opt.code}
                            className={`grid grid-cols-[minmax(0,1fr)_auto] items-stretch border-b border-gray-50 last:border-b-0 ${
                              isPrimaryCountry ? "bg-gold-bg text-emerald-deep" : "text-slate-vip hover:bg-gray-50"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                handleCountryPicked(opt.code);
                                closeCountryDropdown();
                              }}
                              className={`min-w-0 text-left px-4 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isPrimaryCountry ? "font-extrabold" : "font-medium"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <CountryFlag flag={opt.flag} flagUrl={opt.flagUrl} countryName={isEn ? opt.nameEn : opt.nameAr} size="sm" />
                                <span className="truncate">{isEn ? opt.nameEn : opt.nameAr}</span>
                              </div>
                              {isPrimaryCountry && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-deep shrink-0" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleComparisonCountry(opt.code)}
                              className={`border-l border-gray-100 px-2.5 text-[10px] font-mono font-extrabold uppercase transition-colors cursor-pointer ${
                                isComparisonCountry
                                  ? "bg-emerald-deep text-white"
                                  : "bg-white text-slate-500 hover:bg-gold-bg hover:text-emerald-deep"
                              }`}
                              title={isEn ? "Toggle comparison selection" : "تحديد للمقارنة"}
                              aria-pressed={isComparisonCountry}
                            >
                              {isComparisonCountry ? (isEn ? "In" : "ضمن") : (isEn ? "Compare" : "قارن")}
                            </button>
                          </div>
                        );
                      })}
                      {filteredCountryOptions.length === 0 && (
                        <div className="px-4 py-5 text-center text-xs font-semibold text-gray-500">
                          {isEn ? "No countries found" : "لم يتم العثور على دول"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="text-[10px] font-mono font-extrabold uppercase text-slate-500">
                        {isEn
                          ? `${selectedComparisonCountryCodes.length} selected for comparison`
                          : `${selectedComparisonCountryCodes.length} محددة للمقارنة`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedComparisonCountryCodes([])}
                        className="text-[10px] font-bold text-emerald-deep hover:text-gold-deep cursor-pointer"
                      >
                        {isEn ? "Clear" : "مسح"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {activeTab === "compare" && (
              <div className="inline-flex items-center gap-2 rounded-sm border border-[#D8E0EF] bg-white px-3 py-2 text-[10px] font-mono font-extrabold uppercase text-slate-500 shadow-sm">
                <UsersRound className="w-3.5 h-3.5 text-gold-deep" />
                <span>
                  {isEn
                    ? `${comparisonCountriesForView.length} countries in comparison`
                    : `${comparisonCountriesForView.length} دول في المقارنة`}
                </span>
              </div>
            )}

            {/* Meeting Objective Input Field & Search Initializer Button */}
            <form onSubmit={(e) => { e.preventDefault(); triggerSyncSearch(); }} className="flex items-center gap-3 border border-gold-border rounded-sm p-1 bg-white shadow-sm" id="meeting-objective-search-form">
              <input
                type="text"
                placeholder={isEn ? "Meeting objective (e.g. Infrastructure Corridor)..." : "هدف الاجتماع (مثال: ممر البنية التحتية)..."}
                value={meetingObjective}
                onChange={(e) => setMeetingObjective(e.target.value)}
                disabled={isGenerating}
                className="px-2 py-1.5 text-xs w-56 sm:w-72 outline-none bg-transparent placeholder-gray-400 font-sans border-0"
                id="meeting-objective-input"
              />
              <button
                type="submit"
                disabled={isGenerating || !selectedCountryCode}
                className="px-3.5 py-2 bg-slate-vip hover:bg-gold-deep hover:text-slate-vip text-white text-[10px] uppercase tracking-widest font-extrabold rounded-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all font-mono"
                id="initialize-search-btn"
              >
                <span>{isGenerating ? (isEn ? "Syncing..." : "جاري التحضير...") : (isEn ? "Initialize Search" : "تحضير الإيجاز")}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

        {/* TOP LEVEL CABINET BILATERAL SUMMIT & MEETING SCHEDULER REMOVED FROM MAIN INLINE ROW GRID TO OVERLAY PORTAL TRIGGERED VIA HEADER */}

        <section className="bg-white rounded-sm shadow-md border border-gold-border overflow-hidden" id="intelligence-hub-strip">
          <div className="p-4 grid grid-cols-1 xl:grid-cols-[minmax(180px,0.22fr)_1fr] xl:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <Cpu className="w-4 h-4 text-gold-deep" />
              <div>
                <p className="text-xs uppercase font-mono tracking-widest text-slate-vip font-extrabold">
                  {isEn ? "Intelligence Hub" : "قنوات البحث الفني"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-1.5 flex-1" id="navigation-rail-buttons">
              {workspaceTabItems.map((item) => {
                const TabIcon = item.Icon;
                const isActiveTab = activeTab === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.code);
                      setCurrentStep(item.step);
                    }}
                    className={`min-h-11 px-3 py-2 rounded-sm border-b-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isActiveTab
                        ? "bg-gold-bg text-emerald-deep border-gold-deep"
                        : "bg-white text-gray-600 border-transparent hover:bg-[#F8F8F6] hover:text-slate-vip"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isActiveTab ? "text-emerald-deep" : "text-gold-deep"}`} />
                      <span className="text-[11px] font-mono font-black uppercase tracking-wide truncate">
                        {isEn ? item.labelEn : item.labelAr}
                      </span>
                    </span>
                    {item.badge && (
                      <span className="text-[8px] bg-red-600 text-white font-mono px-1.5 py-0.5 rounded font-extrabold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`fixed bottom-10 right-6 z-[100] flex items-center justify-between gap-1 px-5 py-3.5 rounded-full bg-slate-vip hover:bg-[#15241F] text-white shadow-2xl border-2 border-[#94A3B8] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer max-w-xs sm:max-w-sm ${showSignalsPanel ? "staff-signals-chat-launcher" : ""}`}
          id="ai-policy-chat-launcher"
          style={{ direction: language === "ar" ? "rtl" : "ltr" }}
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4 opacity-90" />
            <span className="chat-launcher-label">{isEn ? "AI Policy Advisor Chat" : "المستشار الرقمي الفوري"}</span>
          </div>
          {!isChatOpen && (
            <span className="chat-launcher-dot h-2 w-2 rounded-full bg-emerald-light animate-pulse ml-2 shrink-0 block"></span>
          )}
          {isChatOpen && (
            <X className="chat-launcher-close w-4 h-4 text-gold-deep ml-2 shrink-0" />
          )}
        </button>

        <section className="workspace-section-heading flex flex-col md:flex-row md:items-end md:justify-between gap-3" id="workspace-section-heading">
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-deep flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEn ? "Active workspace" : "مساحة العمل الحالية"}</span>
            </p>
            <h2 className="text-xl md:text-2xl font-bold font-serif text-slate-vip mt-1 truncate">
              {workspaceSectionTitle}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span className="workspace-status-pill">{workspaceSectionStatus}</span>
            {showSignalsPanel && (
              <span className="workspace-status-pill">{isEn ? "Signals live" : "المؤشرات مباشرة"}</span>
            )}
          </div>
        </section>

        {/* CORE WORKSPACE BOARD */}
        <div className={`grid grid-cols-1 ${showSignalsPanel ? "xl:grid-cols-12" : ""} gap-6`} id="primary-workspace-grid-layout">
          {/* MAIN COLUMN PANELS: DISPLAY CHOSEN CATEGORY WORKSPACE COMPONENTS */}
          <motion.div
            layout
            transition={{ layout: { duration: 0.46, ease: [0.16, 1, 0.3, 1] } }}
            className={`${showSignalsPanel ? "xl:col-span-8" : "xl:col-span-12"} space-y-6`}
            id="right-workspace-panel"
            style={{ direction: language === "ar" ? "rtl" : "ltr" }}
          >
            <AnimatePresence mode="wait">
              {activeTab === "debrief" && session.role === "staff" ? (
                <motion.div key={`debrief-${selectedCountryCode || "new"}`} {...workspacePanelMotion}>
                  <StrategicMeetingDebrief
                    language={language}
                    countryOptions={countryOptions}
                    defaultCountryCode={selectedCountryCode}
                    session={session}
                  />
                </motion.div>
              ) : activeTab === "compare" ? (
                <motion.div key={`compare-${selectedComparisonCountryCodes.join("-") || activeCountry?.id || "selected"}`} {...workspacePanelMotion}>
                  {comparisonCountriesForView.length > 0 ? (
                    <ComparisonEngine
                      country={comparisonCountriesForView[0]}
                      countries={comparisonCountriesForView}
                      uaeData={uaeData}
                      language={language}
                    />
                  ) : (
                    <div className="bg-white rounded-sm shadow-md border border-gold-border p-10 md:p-12 text-center">
                      <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-gold-bg text-gold-deep flex items-center justify-center">
                        <UsersRound className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-serif font-bold text-slate-vip">
                        {isEn ? "Select countries for comparison" : "حدد الدول للمقارنة"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-2">
                        {isEn
                          ? "Use the country dropdown and toggle Compare for each peer country."
                          : "استخدم قائمة الدول وفعل خيار المقارنة لكل دولة نظيرة."}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : activeCountry ? (
                <motion.div key={`${activeCountry.id}-${activeTab}`} {...workspacePanelMotion}>
                  {/* 1. Country Intelligence Background */}
                  {activeTab === "passport" && (
                    <IntelligenceProfile country={activeCountry} language={language} />
                  )}

                  {/* 2. Strategic Insights & Bilateral Proposals */}
                  {activeTab === "strategic" && (
                    <StrategicInsightsView country={activeCountry} language={language} />
                  )}

                  {/* 3. Briefings & Presentation Slides */}
                  {activeTab === "briefing" && (
                    <BriefingGenerator
                      country={activeCountry}
                      language={language}
                      aiBriefingText={aiBriefingText}
                      briefingArtifacts={briefingArtifacts}
                      isGenerating={isGenerating}
                      briefingSource={briefingSource}
                      meetingObjective={meetingObjective}
                      uaeData={uaeData}
                    />
                  )}

                  {/* 4. Sovereign Indicators Comparison */}
                  {activeTab === "compare" && (
                    <ComparisonEngine
                      country={activeCountry}
                      countries={comparisonCountriesForView}
                      uaeData={uaeData}
                      language={language}
                    />
                  )}

                  {/* 5. Predictive intelligence forecasts */}
                  {activeTab === "predictive" && (
                    <PredictiveIntelligenceView country={activeCountry} language={language} />
                  )}
                </motion.div>
              ) : isGenerating ? (
                <motion.div
                  key={`loading-${selectedCountryCode || "country"}`}
                  {...workspacePanelMotion}
                  className="bg-white rounded-sm shadow-md border border-gold-border p-10 md:p-12 text-center"
                  id="country-profile-loading-state"
                >
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-gold-border border-t-emerald-deep animate-spin"></div>
                  <h3 className="text-lg font-serif font-bold text-slate-vip">
                    {isEn ? "Preparing the country profile..." : "جاري إعداد ملف الدولة..."}
                  </h3>
                  <p className="text-sm text-gray-500 mt-2">
                    {isEn ? "Majlis AI is organizing the profile before opening other workspaces." : "يقوم مجلس AI بتنظيم الملف قبل فتح بقية مساحات العمل."}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-country"
                  {...workspacePanelMotion}
                  className="workspace-empty-state text-left"
                  id="no-country-fallback"
                >
                  <div className="widget-start-grid grid grid-cols-1 2xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] gap-4">
                    <section className="workflow-widget country-launcher-widget p-5 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="h-12 w-12 rounded-lg bg-[#EEF2FF] text-gold-deep flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-deep">
                              {selectedCountryOption
                                ? isEn ? "Ready to initialize" : "جاهز للتحضير"
                                : isEn ? "Country launcher" : "مشغل الدولة"}
                            </p>
                            <h3 className="text-xl md:text-2xl font-serif font-bold text-slate-vip mt-1">
                              {selectedCountryOption
                                ? isEn ? `Open ${selectedCountryOption.nameEn} profile` : `فتح ملف ${selectedCountryOption.nameAr}`
                                : isEn ? "Country briefing workspace" : "مساحة إحاطة الدولة"}
                            </h3>
                            <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                              {isEn
                                ? "Country context, meeting briefs, comparisons, forecasts, and debrief notes stay aligned in one workspace."
                                : "يبقى سياق الدولة والإحاطات والمقارنات والتوقعات وملاحظات التحليل منسقة في مساحة واحدة."}
                            </p>
                          </div>
                        </div>

                        {selectedCountryOption && (
                          <span className="selected-country-badge">
                            <CountryFlag
                              flag={selectedCountryOption.flag}
                              flagUrl={selectedCountryOption.flagUrl}
                              countryName={isEn ? selectedCountryOption.nameEn : selectedCountryOption.nameAr}
                              size="sm"
                            />
                            <span className="truncate">{isEn ? selectedCountryOption.nameEn : selectedCountryOption.nameAr}</span>
                          </span>
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 2xl:grid-cols-1 gap-2.5">
                        {suggestedCountryOptions.map((option) => (
                          <button
                            key={option.code}
                            type="button"
                            onClick={() => initializeCountryFromWidget(option.code)}
                            className="empty-country-suggestion-button group w-full rounded-lg border border-[#D8E0EF] bg-white px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-gold-deep/45 hover:shadow-md cursor-pointer"
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-2 min-w-0">
                                <CountryFlag
                                  flag={option.flag}
                                  flagUrl={option.flagUrl}
                                  countryName={isEn ? option.nameEn : option.nameAr}
                                  size="sm"
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold text-slate-vip truncate">
                                    {isEn ? option.nameEn : option.nameAr}
                                  </span>
                                  <span className="block text-xs text-slate-500">
                                    {isEn ? "Priority profile" : "ملف ذو أولوية"}
                                  </span>
                                </span>
                              </span>
                              <ArrowRight className="w-4 h-4 text-gold-deep shrink-0 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={() => initializeCountryFromWidget(selectedCountryOption?.code)}
                          disabled={!selectedCountryOption || isGenerating}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-deep to-gold-deep px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-55 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <span>{isEn ? "Initialize selected country" : "تحضير الدولة المختارة"}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("debrief");
                            setCurrentStep(9);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D8E0EF] bg-white px-4 py-2.5 text-sm font-bold text-emerald-deep transition-all hover:-translate-y-0.5 hover:border-gold-deep/45 hover:shadow-md cursor-pointer"
                        >
                          <BrainCircuit className="w-4 h-4" />
                          <span>{isEn ? "Meeting debrief" : "تحليل الاجتماع"}</span>
                        </button>
                      </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-1 gap-4">
                      <section className="workflow-widget p-4 md:p-5">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-gold-deep" />
                          <h3 className="text-sm font-bold text-slate-vip">{isEn ? "Meeting setup" : "إعداد الاجتماع"}</h3>
                        </div>
                        <input
                          type="text"
                          value={meetingObjective}
                          onChange={(event) => setMeetingObjective(event.target.value)}
                          placeholder={isEn ? "Meeting objective" : "هدف الاجتماع"}
                          className="meeting-setup-input mt-3 w-full rounded-lg border border-[#D8E0EF] bg-white px-3 py-2.5 text-sm text-slate-vip outline-none focus:border-gold-deep focus:ring-4 focus:ring-blue-900/10"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          {meetingTopicChips.map((chip) => (
                            <button
                              key={chip.labelEn}
                              type="button"
                              onClick={() => setMeetingObjective(isEn ? chip.valueEn : chip.valueAr)}
                              className="meeting-topic-chip"
                            >
                              {isEn ? chip.labelEn : chip.labelAr}
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="workflow-widget ai-recommendation-widget p-4 md:p-5">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4 text-gold-deep" />
                          <h3 className="text-sm font-bold text-slate-vip">{isEn ? "AI recommendation" : "توصية الذكاء"}</h3>
                        </div>
                        <p className="mt-3 text-sm text-slate-600 leading-6">
                          {selectedCountryOption
                            ? isEn
                              ? `${selectedCountryOption.nameEn} is selected. Open the profile before moving into briefing or comparison.`
                              : `تم اختيار ${selectedCountryOption.nameAr}. افتح الملف قبل الانتقال إلى الإحاطة أو المقارنة.`
                            : isEn
                              ? "Start with a priority country profile, then review live signals before preparing the briefing."
                              : "ابدأ بملف دولة ذات أولوية، ثم راجع المؤشرات المباشرة قبل إعداد الإحاطة."}
                        </p>
                        <button
                          type="button"
                          onClick={() => initializeCountryFromWidget(selectedCountryOption?.code || suggestedCountryOptions[0]?.code)}
                          disabled={isGenerating || (!selectedCountryOption && suggestedCountryOptions.length === 0)}
                          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#EEF2FF] px-3.5 py-2 text-sm font-bold text-emerald-deep transition-all hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{selectedCountryOption ? isEn ? "Open profile" : "فتح الملف" : isEn ? "Start recommended" : "ابدأ المقترح"}</span>
                        </button>
                      </section>
                    </div>
                  </div>

                  <section className="workflow-widget mt-4 p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-bold text-slate-vip">{isEn ? "Signals summary" : "ملخص المؤشرات"}</p>
                      <span className="text-[10px] font-bold text-emerald-deep">{isEn ? "Live" : "مباشر"}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {signalSummaryItems.map((item) => (
                        <div key={item.labelEn} className="signal-summary-row">
                          <span className="font-bold text-slate-vip">{isEn ? item.labelEn : item.labelAr}</span>
                          <span className="text-slate-500">{isEn ? item.valueEn : item.valueAr}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {showSignalsPanel && (
            <aside className="xl:col-span-4 xl:sticky xl:top-6 xl:self-start" id="strategic-signals-side-panel">
              <StrategicSignalsMonitor language={language} compact />
            </aside>
          )}

        </div>

      </main>

      {/* Flag footer details following the executive standards */}
      <footer className="bg-slate-vip border-t border-gold-deep/15 py-6 mt-12 text-white" id="cabinet-briefing-footer">
        <div className="max-w-[1700px] xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <span className="font-serif font-extrabold text-gold-deep">Ministry of Energy & Infrastructure</span>
            <span className="h-4 w-px bg-white/10 hidden md:block"></span>
            <span>{isEn ? "Cabinet Support Node v4.1" : "موزع دعم اتخاذ القرار لمجلس الوزراء"}</span>
          </div>
          <div>
            <p>{isEn ? "© 2026 MOEI UAE - SECURE INTRA-CABINET NETWORK." : "حقوق النشر محفوظة © 2026 وزارة الطاقة والبنية التحتية - دولة الإمارات العربية المتحدة"}</p>
          </div>
        </div>
      </footer>

      {/* Floating Chatbot Popup Window */}
      {isChatOpen && activeCountry && (
        <>
          {/* Backdrop overlay to catch clicks outside of chat assistant */}
          <div 
            className="fixed inset-0 z-40 bg-transparent" 
            onClick={() => setIsChatOpen(false)}
            id="chat-outside-dismiss-backdrop"
          />
          <div 
            className="fixed bottom-28 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[560px] lg:w-[640px] max-w-[calc(100vw-2rem)] h-[min(720px,calc(100vh-9rem))] bg-white rounded-lg shadow-2xl border border-[#CBD5E1] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ direction: language === "ar" ? "rtl" : "ltr" }}
          >
          <AiChatAssistant
            language={language}
            selectedCountryCode={selectedCountryCode}
            selectedCountryNameEn={activeCountry.nameEn}
            selectedCountryNameAr={activeCountry.nameAr}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      </>
      )}

      {/* Portfolio Schedule Calendar Modal */}
      {isCalendarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" id="calendar-modal-backdrop" onClick={() => setIsCalendarOpen(false)}>
          <div 
            className="bg-white rounded-md shadow-2xl border border-gold-border w-full max-w-[1200px] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative"
            id="calendar-modal-content-container"
            onClick={(e) => e.stopPropagation()}
            style={{ direction: language === "ar" ? "rtl" : "ltr" }}
          >
            <BilateralCalendar
              country={activeCountry}
              language={language}
              onClose={() => setIsCalendarOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
