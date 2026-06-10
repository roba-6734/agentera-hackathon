import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import IntelligenceProfile from "./components/IntelligenceProfile";
import StrategicInsightsView from "./components/StrategicInsightsView";
import BriefingGenerator from "./components/BriefingGenerator";
import ComparisonEngine from "./components/ComparisonEngine";
import PredictiveIntelligenceView from "./components/PredictiveIntelligenceView";
import AiChatAssistant from "./components/AiChatAssistant";
import BilateralCalendar from "./components/BilateralCalendar";
import DeveloperDashboard from "./components/DeveloperDashboard";
import AuthPortal from "./components/AuthPortal";
import StrategicSignalsMonitor from "./components/StrategicSignalsMonitor";
import { db, OperationType, handleFirestoreError } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { AppRole, AppSession, PrebuiltCountry, UaeIndicator, activeTabCode } from "./types";
import { ShieldAlert, Globe, Layers, Award, Landmark, Eye, ArrowRight, HelpCircle, FileText, CheckCircle2, ChevronRight, Activity, Cpu, ChevronDown, Crown, Target, Sparkles, UsersRound } from "lucide-react";

const SESSION_STORAGE_KEY = "majlis-ai-session";

function normalizeStoredRole(role: unknown): AppRole | null {
  if (role === "developer" || role === "staff" || role === "executive") {
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

function cleanBriefingBlock(value: string, maxLength = 430) {
  const cleaned = value
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
}

function getExecutiveBriefingBlocks(aiBriefingText: string, fallbackBlocks: string[]) {
  const aiBlocks = aiBriefingText
    .split(/\n{2,}/)
    .map((block) => cleanBriefingBlock(block))
    .filter((block) => block.length > 80)
    .slice(0, 2);

  return aiBlocks.length > 0 ? aiBlocks : fallbackBlocks.map((block) => cleanBriefingBlock(block));
}

export default function App() {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [session, setSession] = useState<AppSession | null>(() => readStoredAppSession());
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("brazil");
  const [activeTab, setActiveTab] = useState<activeTabCode>("passport");
  const [currentStep, setCurrentStep] = useState<number>(3);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState<boolean>(false);
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
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [briefingSource, setBriefingSource] = useState<string>("gemini-strategic-ai");

  // Country listing options (pre-seeded with high fidelity research)
  const availableBilateralOptions = [
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

  // Initialize and load default comparison values
  useEffect(() => {
    if (!session || session.role === "developer") {
      return;
    }

    if (initialLoadStartedRef.current) {
      return;
    }
    initialLoadStartedRef.current = true;

    async function loadInitialDatabase() {
      try {
        const resp = await fetch("/api/advisor/compare");
        const data = await resp.json();
        if (data.countries) {
          const combinedCountries = { ...data.countries };
          try {
            const querySnapshot = await getDocs(collection(db, "countries"));
            querySnapshot.forEach((docSnap) => {
              const fsData = docSnap.data() as PrebuiltCountry;
              if (fsData.id) {
                combinedCountries[fsData.id] = fsData;
              }
            });
          } catch (e) {
            console.warn("Firestore collection inactive/empty on boot. Continuing with fallbacks.", e);
            try {
              handleFirestoreError(e, OperationType.GET, "countries");
            } catch (err) {
              console.error("Gracefully caught boot error log wrapper:", err);
            }
          }
          setCountriesIndex(combinedCountries);
          setUaeData(data.uae);
          
          // Load default country (brazil) on initial execution
          setIsGenerating(true);
          const briefResp = await fetch("/api/advisor/brief", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              country: "brazil",
              language: language,
              question: session.role === "executive"
                ? "Draft a concise executive meeting briefing for Brazil. Keep it focused on decision points, meeting leadership, and no more than three priorities."
                : undefined,
            }),
          });
          const briefData = await briefResp.json();
          if (briefData.success) {
            setAiBriefingText(briefData.aiBriefing.rawText);
            setBriefingSource(briefData.source || "gemini-strategic-ai");
            setActiveCountry(briefData.countryData || combinedCountries["brazil"]);
          }
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
    activeIndex: Record<string, PrebuiltCountry> = countriesIndex
  ) => {
    setIsGenerating(true);
    try {
      const trimmedObjective = meetingObjective.trim();
      const executivePrompt = `Draft a concise executive meeting briefing for ${targetCountry}. Keep it focused on decision points, meeting leadership, and no more than three priorities.`;
      const resp = await fetch("/api/advisor/brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: targetCountry,
          language: targetLang,
          question: trimmedObjective
            ? session?.role === "executive"
              ? `${executivePrompt} Center it around this objective: ${trimmedObjective}`
              : `Draft briefing for ${targetCountry} centered around this objective: ${trimmedObjective}`
            : session?.role === "executive"
              ? executivePrompt
              : undefined,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setAiBriefingText(data.aiBriefing.rawText);
        setBriefingSource(data.source || "gemini-strategic-ai");
        if (data.countryData) {
          setActiveCountry(data.countryData);
        }
        
        if (meetingObjective.trim()) {
          setActiveTab("briefing");
          setCurrentStep(8); // Elevate workflow straight to briefing presentation stage
        } else {
          setCurrentStep(4); // Workspace successfully updated
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
      triggerSyncSearch(selectedCountryCode, language, countriesIndex);
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
    setSelectedCountryCode(code);
    setCurrentStep(2); // Set workflow timeline stage to Step 2: Target country selected
  };

  const handleAuthenticated = (nextSession: AppSession) => {
    // Placeholder session persistence:
    // Replace with verified auth tokens, server-issued role claims, and user records when real auth is connected.
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setActiveTab(nextSession.role === "executive" ? "briefing" : "passport");
    setCurrentStep(nextSession.role === "executive" ? 8 : 3);
    setIsChatOpen(false);
    setIsCalendarOpen(false);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    initialLoadStartedRef.current = false;
    setSession(null);
    setActiveCountry(null);
    setAiBriefingText("");
    setBriefingSource("gemini-strategic-ai");
    setIsChatOpen(false);
    setIsCalendarOpen(false);
  };

  const refreshDatabaseIndex = async () => {
    try {
      const resp = await fetch("/api/advisor/compare");
      const data = await resp.json();
      if (data.countries) {
        const combinedCountries = { ...data.countries };
        try {
          const querySnapshot = await getDocs(collection(db, "countries"));
          querySnapshot.forEach((docSnap) => {
            const fsData = docSnap.data() as PrebuiltCountry;
            if (fsData.id) {
              combinedCountries[fsData.id] = fsData;
            }
          });
        } catch (e) {
          console.warn("Firestore refresh failed:", e);
        }
        setCountriesIndex(combinedCountries);
      }
    } catch (e) {
      console.error("Failed to refresh database index:", e);
    }
  };

  const isEn = language === "en";
  const countryOptions = [
    ...availableBilateralOptions,
    ...(Object.values(countriesIndex) as PrebuiltCountry[])
      .filter((country) => !availableBilateralOptions.some((option) => option.code === country.id))
      .map((country) => ({
        code: country.id,
        nameEn: country.nameEn,
        nameAr: country.nameAr,
        flag: country.flag || "🌐",
      })),
  ];
  const selectedCountryOption = countryOptions.find((option) => option.code === selectedCountryCode);
  const executiveBriefingBlocks = activeCountry
    ? getExecutiveBriefingBlocks(aiBriefingText, [
        isEn ? activeCountry.profile.overviewEn : activeCountry.profile.overviewAr,
        isEn ? activeCountry.strategicInsights.partnershipsEn : activeCountry.strategicInsights.partnershipsAr,
      ])
    : [];
  const executivePriorityCards = activeCountry
    ? [
        {
          icon: Target,
          titleEn: "Decision Priority",
          titleAr: "أولوية القرار",
          bodyEn: activeCountry.predictive.proposalsEn,
          bodyAr: activeCountry.predictive.proposalsAr,
        },
        {
          icon: Sparkles,
          titleEn: "Strategic Opening",
          titleAr: "المدخل الاستراتيجي",
          bodyEn: activeCountry.strategicInsights.partnershipsEn,
          bodyAr: activeCountry.strategicInsights.partnershipsAr,
        },
        {
          icon: UsersRound,
          titleEn: "People in the Room",
          titleAr: "الأطراف القيادية",
          bodyEn: activeCountry.profile.leadershipEn,
          bodyAr: activeCountry.profile.leadershipAr,
        },
      ]
    : [];

  if (!session) {
    return (
      <AuthPortal
        language={language}
        setLanguage={setLanguage}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (session.role === "developer") {
    return (
      <div className="min-h-screen bg-[#0E0E0D] flex flex-col" id="majlis-developer-application-root">
        <main className="max-w-[1700px] xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 flex-1 w-full">
          <DeveloperDashboard
            language={language}
            countriesCount={Object.keys(countriesIndex).length}
            onRefreshDatabase={refreshDatabaseIndex}
            onClose={handleLogout}
          />
        </main>
      </div>
    );
  }

  if (session.role === "executive") {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex flex-col justify-between" id="majlis-executive-briefing-root">
        <Header
          language={language}
          setLanguage={setLanguage}
          selectedCountryNameEn={activeCountry?.nameEn || selectedCountryCode}
          selectedCountryNameAr={activeCountry?.nameAr || selectedCountryCode}
          sessionDisplayName={session.displayName}
          sessionRole={session.role}
          onLogout={handleLogout}
        />

        <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 flex-1 w-full space-y-6" id="executive-briefing-workspace">
          <section className="bg-white rounded-sm shadow-md border-l-4 border-[#C5A059] p-5 md:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5" id="executive-briefing-control-ribbon">
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
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="bg-white hover:bg-gray-50 border border-gold-border rounded-sm shadow-sm px-4 py-2.5 inline-flex items-center justify-between gap-3 text-xs font-bold text-slate-vip focus:outline-none focus:ring-1 focus:ring-gold-deep cursor-pointer min-w-[210px]"
                  id="executive-country-selector-btn"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none">{selectedCountryOption?.flag || activeCountry?.flag || "🌐"}</span>
                    <span className="truncate max-w-[135px]">
                      {selectedCountryOption
                        ? isEn ? selectedCountryOption.nameEn : selectedCountryOption.nameAr
                        : (isEn ? activeCountry?.nameEn : activeCountry?.nameAr) || selectedCountryCode}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gold-deep shrink-0 transition-transform duration-200" style={{ transform: isCountryDropdownOpen ? "rotate(180deg)" : "none" }} />
                </button>

                {isCountryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCountryDropdownOpen(false)}></div>
                    <div
                      className="origin-top-left absolute left-0 mt-1.5 w-64 rounded-sm shadow-xl bg-white border border-gold-border z-50 focus:outline-none divide-y divide-gray-100 max-h-60 overflow-y-auto"
                      id="executive-country-selector-panel"
                    >
                      <div className="py-1">
                        {countryOptions.map((option) => (
                          <button
                            key={option.code}
                            type="button"
                            onClick={() => {
                              handleCountryPicked(option.code);
                              setIsCountryDropdownOpen(false);
                              triggerSyncSearch(option.code);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              selectedCountryCode === option.code
                                ? "bg-gold-bg text-emerald-deep font-extrabold"
                                : "text-slate-vip hover:bg-gray-50 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base leading-none">{option.flag}</span>
                              <span className="truncate">{isEn ? option.nameEn : option.nameAr}</span>
                            </div>
                            {selectedCountryCode === option.code && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-deep shrink-0" />
                            )}
                          </button>
                        ))}
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
                  disabled={isGenerating}
                  className="px-3.5 py-2 bg-slate-vip hover:bg-gold-deep hover:text-slate-vip text-white text-[10px] uppercase tracking-widest font-extrabold rounded-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all font-mono"
                  id="executive-refresh-brief-btn"
                >
                  <span>{isGenerating ? (isEn ? "Updating" : "تحديث") : (isEn ? "Refresh Brief" : "تحديث الإحاطة")}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </form>
            </div>
          </section>

          {activeCountry ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="executive-briefing-grid">
              <section className="xl:col-span-8 bg-white rounded-sm shadow-md border-l-4 border-emerald-deep overflow-hidden" id="executive-summary-panel">
                <div className="bg-slate-vip px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-4xl leading-none">{activeCountry.flag}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-gold-deep font-mono font-extrabold">
                        {isEn ? "Meeting Brief" : "إحاطة الاجتماع"}
                      </p>
                      <h3 className="text-xl font-serif font-bold truncate">
                        {isEn ? activeCountry.nameEn : activeCountry.nameAr}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] bg-gold-deep text-slate-vip font-mono font-black px-2.5 py-1 rounded-sm uppercase self-start sm:self-auto">
                    {isEn ? "Concise" : "موجز"}
                  </span>
                </div>

                <div className="p-6 md:p-8 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border border-gold-border bg-[#F8F8F6] rounded-sm p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono font-bold">{isEn ? "Objective" : "الهدف"}</p>
                      <p className="text-sm font-bold text-slate-vip mt-1 leading-5">
                        {meetingObjective.trim() || (isEn ? "Lead a focused bilateral discussion." : "قيادة نقاش ثنائي مركز.")}
                      </p>
                    </div>
                    <div className="border border-gold-border bg-[#F8F8F6] rounded-sm p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono font-bold">{isEn ? "Framework" : "الإطار"}</p>
                      <p className="text-sm font-bold text-slate-vip mt-1 leading-5">
                        {isEn ? activeCountry.indicators.cooperationAgreementEn : activeCountry.indicators.cooperationAgreementAr}
                      </p>
                    </div>
                    <div className="border border-gold-border bg-[#F8F8F6] rounded-sm p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono font-bold">{isEn ? "Posture" : "الموقف"}</p>
                      <p className="text-sm font-bold text-slate-vip mt-1 leading-5">
                        {isEn ? "Confirm alignment, ask for commitment, avoid operational depth." : "تأكيد التوافق وطلب الالتزام دون الدخول في التفاصيل التشغيلية."}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-emerald-deep" />
                      <h4 className="font-serif font-bold text-lg text-slate-vip">
                        {isEn ? "What to Know Before Speaking" : "ما يجب معرفته قبل الحديث"}
                      </h4>
                    </div>
                    {isGenerating ? (
                      <div className="flex items-center justify-center py-16 gap-3" id="executive-briefing-loader">
                        <div className="h-9 w-9 border-4 border-gold-deep border-t-emerald-deep rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500 font-semibold font-mono">
                          {isEn ? "Compiling executive brief..." : "تجميع الإحاطة القيادية..."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {executiveBriefingBlocks.map((block, index) => (
                          <p key={index} className="text-sm md:text-base text-gray-700 leading-7 font-medium">
                            {block}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <aside className="xl:col-span-4 space-y-4" id="executive-priority-stack">
                {executivePriorityCards.map((card, index) => {
                  const PriorityIcon = card.icon;
                  return (
                    <div key={card.titleEn} className="bg-white rounded-sm shadow-md border border-gold-border border-l-4 border-gold-deep p-5">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <PriorityIcon className="w-4 h-4 text-emerald-deep" />
                          <h4 className="font-serif font-bold text-base text-slate-vip">
                            {isEn ? card.titleEn : card.titleAr}
                          </h4>
                        </div>
                        <span className="h-6 w-6 rounded-sm bg-gold-bg border border-gold-border flex items-center justify-center text-[10px] font-mono font-black text-emerald-deep">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-6">
                        {cleanBriefingBlock(isEn ? card.bodyEn : card.bodyAr, 260)}
                      </p>
                    </div>
                  );
                })}
              </aside>

              <section className="xl:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4" id="executive-speaking-line-grid">
                <div className="bg-slate-vip text-white rounded-sm shadow-md border-l-4 border-gold-deep p-5">
                  <p className="text-[10px] uppercase tracking-widest text-gold-deep font-mono font-bold">{isEn ? "Opening Line" : "سطر الافتتاح"}</p>
                  <p className="text-sm leading-6 mt-2 text-gray-100">
                    {isEn
                      ? `Position the UAE as a stable, execution-oriented partner for ${activeCountry.nameEn}.`
                      : `تقديم دولة الإمارات كشريك مستقر وعملي مع ${activeCountry.nameAr}.`}
                  </p>
                </div>
                <div className="bg-white rounded-sm shadow-md border-l-4 border-emerald-deep p-5">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-deep font-mono font-bold">{isEn ? "Ask" : "الطلب"}</p>
                  <p className="text-sm leading-6 mt-2 text-gray-700">
                    {isEn ? activeCountry.predictive.proposalsEn : activeCountry.predictive.proposalsAr}
                  </p>
                </div>
                <div className="bg-white rounded-sm shadow-md border-l-4 border-[#C5A059] p-5">
                  <p className="text-[10px] uppercase tracking-widest text-gold-deep font-mono font-bold">{isEn ? "Risk Watch" : "مراقبة المخاطر"}</p>
                  <p className="text-sm leading-6 mt-2 text-gray-700">
                    {isEn ? activeCountry.predictive.risksEn : activeCountry.predictive.risksAr}
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <div className="bg-white rounded-sm shadow-md border border-gold-border p-12 text-center" id="executive-no-country-fallback">
              <ShieldAlert className="w-12 h-12 text-gold-deep mx-auto mb-4" />
              <h3 className="text-lg font-serif font-bold text-slate-vip">
                {isEn ? "Preparing executive briefing..." : "جارٍ تحضير الإحاطة القيادية..."}
              </h3>
            </div>
          )}
        </main>

        <footer className="bg-slate-vip border-t border-gold-deep/15 py-5 mt-8 text-white" id="executive-briefing-footer">
          <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-gray-400">
            <span className="font-serif font-extrabold text-gold-deep">Ministry of Energy & Infrastructure</span>
            <span>{isEn ? "Executive Briefing Node" : "وحدة الإحاطة القيادية"}</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col justify-between" id="uae-advisor-application-root">
      
      {/* UAE themed global header */}
      <Header
        language={language}
        setLanguage={setLanguage}
        selectedCountryNameEn={activeCountry?.nameEn || selectedCountryCode}
        selectedCountryNameAr={activeCountry?.nameAr || selectedCountryCode}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        sessionDisplayName={session.displayName}
        sessionRole={session.role}
        onLogout={handleLogout}
      />

      {/* Primary Workspace container */}
      <main className="max-w-[1700px] xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 flex-1 w-full space-y-8" id="application-primary-workspace">
            {/* UPPER BANNER PROTOCOL */}
        <div className="bg-white rounded-sm shadow-md border-l-4 border-[#C5A059] p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative" id="cabinet-briefing-upper-ribbon">
          <div className="absolute top-0 right-0 w-2 bg-gradient-to-b from-gold-deep to-emerald-deep h-full pointer-events-none rounded-r-sm"></div>
          
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-deep font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              <span>{isEn ? "COUNCIL DECISION SUPPORT" : "نظام تدقيق وتخطيط المخرجات الدبلوماسية"}</span>
            </span>
            <h2 className="text-xl font-bold font-serif text-slate-vip">
              {isEn ? "Bilateral Delegation Intelligence Room" : "غرفة استخبارات الوفود وجاهزية صناع القرار"}
            </h2>
            <p className="text-xs text-gray-400">
              {isEn ? "Select a strategic nation or onboard custom country directories to prepare talking points and interactive briefing boards instantly." : "اختر شريكاً دولياً لوجستياً أو ولد ملفات استتثنائية لأي دولة بالعالم في ثوانٍ لاستعراض مذكرات وشرائح العرض الفورية."}
            </p>
          </div>

           {/* Styled premium spinner country selector with dropdown options */}
          <div className="flex flex-wrap items-center gap-3" id="quick-bilateral-selector">
            <div className="relative inline-block text-left" id="country-dropdown-spinner-wrapper">
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="bg-white hover:bg-gray-50 border border-gold-border rounded-sm shadow-sm px-4 py-2.5 inline-flex items-center justify-between gap-3 text-xs font-bold text-slate-vip focus:outline-none focus:ring-1 focus:ring-gold-deep cursor-pointer min-w-[200px]"
                id="country-spinner-trigger-btn"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">
                    {(() => {
                      const found = [...availableBilateralOptions, ...(Object.values(countriesIndex) as PrebuiltCountry[])
                        .filter((c) => !availableBilateralOptions.some((b) => b.code === c.id))
                        .map((c) => ({ code: c.id, nameEn: c.nameEn, nameAr: c.nameAr, flag: c.flag || "🌐" }))
                      ].find(o => o.code === selectedCountryCode);
                      return found?.flag || activeCountry?.flag || "🌐";
                    })()}
                  </span>
                  <span className="truncate max-w-[130px]">
                    {(() => {
                      const found = [...availableBilateralOptions, ...(Object.values(countriesIndex) as PrebuiltCountry[])
                        .filter((c) => !availableBilateralOptions.some((b) => b.code === c.id))
                        .map((c) => ({ code: c.id, nameEn: c.nameEn, nameAr: c.nameAr, flag: c.flag || "🌐" }))
                      ].find(o => o.code === selectedCountryCode);
                      return found ? (isEn ? found.nameEn : found.nameAr) : (isEn ? activeCountry?.nameEn : activeCountry?.nameAr) || selectedCountryCode;
                    })()}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gold-deep shrink-0 transition-transform duration-200" style={{ transform: isCountryDropdownOpen ? "rotate(180deg)" : "none" }} />
              </button>

              {isCountryDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsCountryDropdownOpen(false)}
                  ></div>
                  
                  <div 
                    className="origin-top-left absolute left-0 mt-1.5 w-64 rounded-sm shadow-xl bg-white border border-gold-border z-50 focus:outline-none divide-y divide-gray-100 max-h-60 overflow-y-auto"
                    id="country-spinner-options-panel"
                  >
                    <div className="py-1">
                      {[
                        ...availableBilateralOptions,
                        ...(Object.values(countriesIndex) as PrebuiltCountry[])
                          .filter((c) => !availableBilateralOptions.some((b) => b.code === c.id))
                          .map((c) => ({
                            code: c.id,
                            nameEn: c.nameEn,
                            nameAr: c.nameAr,
                            flag: c.flag || "🌐",
                          }))
                      ].map((opt) => (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => {
                            handleCountryPicked(opt.code);
                            setIsCountryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            selectedCountryCode === opt.code
                              ? "bg-gold-bg text-emerald-deep font-extrabold"
                              : "text-slate-vip hover:bg-gray-50 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{opt.flag}</span>
                            <span>{isEn ? opt.nameEn : opt.nameAr}</span>
                          </div>
                          {selectedCountryCode === opt.code && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-deep shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

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
                disabled={isGenerating}
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

        {/* CORE WORKSPACE BOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8" id="primary-workspace-grid-layout">
          
          {/* LEFT PANELS: PRIMARY SECTOR WORKSPACE SELECTION TABS */}
          <div className="lg:col-span-1 space-y-4" id="left-rail-selector">
            <div className="bg-white rounded-sm shadow-md border border-gold-border overflow-hidden" id="left-rail-navigation-card">
              <div className="bg-slate-vip p-4 border-b border-gold-deep/20 flex items-center gap-2" id="navigation-rail-brand">
                <Cpu className="w-4 h-4 text-gold-deep" />
                <span className="text-xs uppercase font-mono tracking-widest text-gray-200 font-extrabold">
                  {isEn ? "Intelligence Hub" : "قنوات البحث الفني"}
                </span>
              </div>
              
              <div className="grid grid-cols-1 p-2 gap-1" id="navigation-rail-buttons">
                {/* Tab 1: Country Background */}
                <button
                  onClick={() => setActiveTab("passport")}
                  className={`w-full text-left font-serif px-4 py-3 rounded-sm text-xs sm:text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activeTab === "passport"
                      ? "bg-gold-bg text-emerald-deep font-extrabold border-l-4 border-emerald-deep"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-90">📋</span>
                    <span>{isEn ? "Country Intelligence" : "الملف الذكي للدولة"}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gold-deep" style={{ transform: language === "ar" ? "rotate(180deg)" : "none" }} />
                </button>

                {/* Tab 2: Strategic Insights */}
                <button
                  onClick={() => setActiveTab("strategic")}
                  className={`w-full text-left font-serif px-4 py-3 rounded-sm text-xs sm:text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activeTab === "strategic"
                      ? "bg-gold-bg text-emerald-deep font-extrabold border-l-4 border-emerald-deep"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-90">🤝</span>
                    <span>{isEn ? "Strategic Insights" : "الدليل الاستراتيجي الثنائي"}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gold-deep" style={{ transform: language === "ar" ? "rotate(180deg)" : "none" }} />
                </button>

                {/* Tab 3: Briefing Generator */}
                <button
                  onClick={() => {
                    setActiveTab("briefing");
                    setCurrentStep(8); // Elevate workflow on navigation
                  }}
                  className={`w-full text-left font-serif px-4 py-3 rounded-sm text-xs sm:text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activeTab === "briefing"
                      ? "bg-gold-bg text-emerald-deep font-extrabold border-l-4 border-emerald-deep"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-90">✨</span>
                    <span>{isEn ? "Briefings & Presentation" : "مولد الإحاطات والشرائح"}</span>
                  </div>
                  <span className="text-[9px] bg-red-600 text-white font-mono px-1.5 py-0.5 rounded font-extrabold">MEMO</span>
                </button>

                {/* Tab 4: Comparison Engine */}
                <button
                  onClick={() => {
                    setActiveTab("compare");
                    setCurrentStep(4);
                  }}
                  className={`w-full text-left font-serif px-4 py-3 rounded-sm text-xs sm:text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activeTab === "compare"
                      ? "bg-gold-bg text-emerald-deep font-extrabold border-l-4 border-emerald-deep"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-90">⚖️</span>
                    <span>{isEn ? "Sovereign Comparison" : "مقارنة المؤشرات السيادية"}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gold-deep" style={{ transform: language === "ar" ? "rotate(180deg)" : "none" }} />
                </button>

                {/* Tab 5: Predictive Analytics */}
                <button
                  onClick={() => {
                    setActiveTab("predictive");
                    setCurrentStep(5);
                  }}
                  className={`w-full text-left font-serif px-4 py-3 rounded-sm text-xs sm:text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activeTab === "predictive"
                      ? "bg-gold-bg text-emerald-deep font-extrabold border-l-4 border-emerald-deep"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-90">🔮</span>
                    <span>{isEn ? "Predictive Intelligence" : "التنبؤات المستقبلية والمخاطر"}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gold-deep" style={{ transform: language === "ar" ? "rotate(180deg)" : "none" }} />
                </button>

                {/* Tab 6: Dialogue Center */}
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="fixed bottom-10 right-6 z-[100] flex items-center justify-between gap-1 px-5 py-3.5 rounded-full bg-slate-vip hover:bg-[#15241F] text-white shadow-2xl border-2 border-[#C5A059] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer max-w-xs sm:max-w-sm"
                  style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="opacity-90">🗣️</span>
                    <span>{isEn ? "AI Policy Advisor Chat" : "المستشار الرقمي الفوري"}</span>
                  </div>
                  {!isChatOpen && (
                    <span className="h-2 w-2 rounded-full bg-emerald-light animate-pulse ml-2 shrink-0 block"></span>
                  )}
                  {isChatOpen && (
                    <span className="text-gold-deep text-xs font-bold ml-2">✕</span>
                  )}
                </button>

              </div>
            </div>

            {session.role === "staff" && (
              <StrategicSignalsMonitor language={language} />
            )}

          </div>

          {/* MAIN COLUMN PANELS: DISPLAY CHOSEN CATEGORY WORKSPACE COMPONENTS */}
          <div className="lg:col-span-3 space-y-6" id="right-workspace-panel" style={{ direction: language === "ar" ? "rtl" : "ltr" }}>
            {activeCountry ? (
              <>
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
                    isGenerating={isGenerating}
                    briefingSource={briefingSource}
                    meetingObjective={meetingObjective}
                    uaeData={uaeData}
                  />
                )}

                {/* 4. Sovereign Indicators Comparison */}
                {activeTab === "compare" && (
                  <ComparisonEngine country={activeCountry} uaeData={uaeData} language={language} />
                )}

                {/* 5. Predictive intelligence forecasts */}
                {activeTab === "predictive" && (
                  <PredictiveIntelligenceView country={activeCountry} language={language} />
                )}
              </>
            ) : (
              <div className="bg-white rounded-sm shadow-md border border-gold-border p-12 text-center" id="no-country-fallback">
                <ShieldAlert className="w-12 h-12 text-gold-deep mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-slate-vip">
                  {isEn ? "Synchronizing Bilateral Repositories..." : "جارٍ سحب ومعالجة قواعد البيانات الثنائية..."}
                </h3>
              </div>
            )}
          </div>

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
            className="fixed bottom-28 right-6 z-50 w-96 sm:w-[440px] max-w-[calc(100vw-3rem)] h-[580px] bg-white rounded-lg shadow-2xl border border-[#C5A059] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ direction: language === "ar" ? "rtl" : "ltr" }}
          >
          <AiChatAssistant
            language={language}
            selectedCountryCode={selectedCountryCode}
            selectedCountryNameEn={activeCountry.nameEn}
            selectedCountryNameAr={activeCountry.nameAr}
            onNewBriefGenerated={(newText) => {
              setAiBriefingText(newText);
              setActiveTab("briefing"); // Direct user straight to formatting preview to read update
            }}
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
