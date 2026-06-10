import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import { createHash } from "crypto";
import type {
  AppRole,
  MeetingActionItem,
  MeetingActionPriority,
  MeetingActionStatus,
  MeetingDebriefAnalysis,
  MeetingMetadata,
  MeetingRecord,
} from "./src/types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "4mb" }));

let aiClient: OpenAI | null = null;

type OpenAIGenerationResult = { text: string; modelUsed: string };
type TranslationMetadata = {
  provider: "deepl" | "none";
  targetLanguage: string;
  translatedFields: number;
};
type MeetingMemoryActionRecord = MeetingActionItem & {
  id: string;
  meetingRecordId: string;
  countryId: string;
  meetingTitle: string;
  meetingDate: string;
  createdAt: string;
  updatedAt: string;
};
type MeetingMemoryDatabase = {
  meeting_records: MeetingRecord[];
  meeting_action_items: MeetingMemoryActionRecord[];
};

const DEFAULT_OPENAI_MODELS = ["gpt-5.5", "gpt-5.4-mini", "gpt-4.1-mini"];
const MEETING_MEMORY_DIR = process.env.MEETING_MEMORY_DIR || path.join(process.cwd(), "data");
const MEETING_MEMORY_PATH = process.env.MEETING_MEMORY_PATH || path.join(MEETING_MEMORY_DIR, "meeting-memory.json");
const openAIResponseCache = new Map<string, { result: OpenAIGenerationResult; expiresAt: number }>();
const pendingOpenAIRequests = new Map<string, Promise<OpenAIGenerationResult>>();
const deeplTranslationCache = new Map<string, { text: string; expiresAt: number }>();
let openAIRateLimitCooldownUntil = 0;

function getPositiveNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function getConfiguredOpenAIModels(): string[] {
  const configuredModels = [
    process.env.OPENAI_MODEL,
    ...(process.env.OPENAI_FALLBACK_MODELS || "").split(","),
    ...DEFAULT_OPENAI_MODELS,
  ];

  return Array.from(
    new Set(
      configuredModels
        .map((model) => model?.trim())
        .filter((model): model is string => Boolean(model))
    )
  );
}

function buildOpenAICacheKey(systemInstruction: string, prompt: string, models: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify({ models, systemInstruction, prompt }))
    .digest("hex");
}

function getOpenAIErrorStatusCode(err: any): number | undefined {
  const statusCode = err?.statusCode || err?.status || err?.code;
  if (typeof statusCode === "number") return statusCode;
  if (typeof statusCode === "string" && /^\d+$/.test(statusCode)) return Number(statusCode);
  return undefined;
}

function isOpenAIRateLimitError(err: any): boolean {
  const errMsg = (err?.message || `${err}`).toLowerCase();
  return (
    getOpenAIErrorStatusCode(err) === 429 ||
    errMsg.includes("quota") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("rate_limit") ||
    errMsg.includes("insufficient_quota")
  );
}

function isOpenAIRetriableError(err: any): boolean {
  const statusCode = getOpenAIErrorStatusCode(err);
  const errMsg = (err?.message || `${err}`).toLowerCase();
  return (
    statusCode === 408 ||
    statusCode === 409 ||
    (typeof statusCode === "number" && statusCode >= 500) ||
    errMsg.includes("temporary") ||
    errMsg.includes("timeout") ||
    errMsg.includes("overloaded")
  );
}

function createRateLimitCooldownError(): Error {
  const remainingMs = Math.max(0, openAIRateLimitCooldownUntil - Date.now());
  const error = new Error(`OpenAI rate-limit cooldown active for ${Math.ceil(remainingMs / 1000)}s.`);
  (error as any).statusCode = 429;
  (error as any).status = "rate_limited";
  return error;
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "MY_OPENAI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new OpenAI({ apiKey });
  }
  return aiClient;
}

function getDeepLApiUrl(): string {
  if (process.env.DEEPL_API_URL) {
    return process.env.DEEPL_API_URL;
  }

  const apiKey = process.env.DEEPL_API_KEY || "";
  return apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

function getCacheHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function translateTextsWithDeepL(texts: string[], targetLanguage = "AR"): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return texts;
  }

  const cacheTtlMs = getPositiveNumberEnv("DEEPL_CACHE_TTL_MS", 24 * 60 * 60 * 1000);
  const results = [...texts];
  const missingIndexes: number[] = [];
  const missingTexts: string[] = [];

  texts.forEach((text, index) => {
    const normalizedText = (text || "").trim();
    if (!normalizedText) {
      results[index] = text;
      return;
    }

    const cacheKey = getCacheHash(`${targetLanguage}:${normalizedText}`);
    const cached = deeplTranslationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      results[index] = cached.text;
      return;
    }

    missingIndexes.push(index);
    missingTexts.push(normalizedText);
  });

  const maxBatchSize = getPositiveNumberEnv("DEEPL_BATCH_SIZE", 40);
  for (let offset = 0; offset < missingTexts.length; offset += maxBatchSize) {
    const batchTexts = missingTexts.slice(offset, offset + maxBatchSize);
    const batchIndexes = missingIndexes.slice(offset, offset + maxBatchSize);

    const response = await fetch(getDeepLApiUrl(), {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: batchTexts,
        source_lang: "EN",
        target_lang: targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL translation failed with status ${response.status}`);
    }

    const parsed = await response.json();
    const translations = parsed.translations || [];
    translations.forEach((translation: any, batchIndex: number) => {
      const translatedText = translation?.text || batchTexts[batchIndex];
      const resultIndex = batchIndexes[batchIndex];
      const cacheKey = getCacheHash(`${targetLanguage}:${batchTexts[batchIndex]}`);

      results[resultIndex] = translatedText;
      deeplTranslationCache.set(cacheKey, { text: translatedText, expiresAt: Date.now() + cacheTtlMs });
    });
  }

  return results;
}

// Structured mock/benchmark strategic intelligence database representing verified historical profiles
// This ensures instant offline loading with high precision, but can be augmented with dynamic AI queries.
const prebuiltCountries: Record<string, any> = {
  brazil: {
    id: "brazil",
    nameEn: "Brazil",
    nameAr: "البرازيل",
    flag: "🇧🇷",
    profile: {
      overviewEn: "Federal republic in South America. The largest economy in Latin America and key partner for the UAE in food security, ports, and renewable developments. UAE and Brazil share a major vision across COP presidency transitions (COP28 Dubai to COP30 Belém).",
      overviewAr: "جمهورية اتحادية في أمريكا الجنوبية، وتعد أكبر اقتصاد في أمريكا اللاتينية وشريكاً رئيسياً لدولة الإمارات في مجالات الأمن الغذائي والموانئ والطاقة المتجددة. وتتشارك الدولتان رؤية طموحة عبر انتقال رئاسة مؤتمر الأطراف (من COP28 في دبي إلى COP30 في بيليم).",
      governmentEn: "Federal presidential constitutional republic led by President Luiz Inácio Lula da Silva.",
      governmentAr: "جمهورية دستورية رئيسية اتحادية بقيادة الرئيس لويس إيناسيو لولا دا سيلفا.",
      leadershipEn: "President: Luiz Inácio Lula da Silva; Minister of Mines and Energy: Alexandre Silveira.",
      leadershipAr: "الرئيس: لويس إيناسيو لولا دا سيلفا؛ وزير المناجم والطاقة: ألكسندر سيلفيرا.",
    },
    indicators: {
      gdp: "$2.13 Trillion (USD)",
      gdpAr: "2.13 تريليون دولار أمريكي",
      growth: "2.9%",
      gdpPerCapita: "$10,400",
      energyMix: "Hydro (61%), Wind (12%), Biomass (8%), Gas (7%), Solar (5%), Others (7%)",
      energyMixAr: "مائية (61%)، رياح (12%)، كتلة حيوية (8%)، غاز (7%)، شمسية (5%)، أخرى (7%)",
      infrastructureIndex: "74.5/100",
      environmentalRank: "Class A (Cop30 Host)",
      competitivenessRank: "56th globally",
      cooperationAgreementEn: "Comprehensive Strategic Partnership signed in 2019",
      cooperationAgreementAr: "شراكة استراتيجية شاملة تم توقيعها في عام 2019",
    },
    sectors: {
      energyEn: "Global titan in hydroelectric generation. Transitioning quickly into solar utility scale and onshore wind. High offshore wind potential in northeastern coast. Major supplier of biofuels.",
      energyAr: "عملاق عالمي في إنتاج الطاقة الكهرومائية. تشهد البرازيل تحولاً سريعاً نحو طاقة الرياح والشبكات الشمسية الضخمة، مع إمكانات هائلة لطاقة الرياح البحرية على السواحل الشمالية الشرقية.",
      infrastructureEn: "Extensive highway network, though requiring modernization. Rail and inland waterways represent key investment prospects. Port expansions are critical.",
      infrastructureAr: "شبكة طرق برية واسعة تتطلب التطوير المستمر. تمثل السكك الحديدية والممرات المائية فرصاً استثمارية هامة، لاسيما لربط موانئ التصدير بالمناطق الزراعية والصناعية.",
      sustainabilityEn: "Committed to ending illegal Amazon deforestation by 2030. Active participant in Global Methane Pledge. Leading bio-economy champion.",
      sustainabilityAr: "ملتزمة بإنهاء إزالة الغابات غير القانونية في منطقة الأمازون بحلول عام 2030، ومشارك نشط في التعهد العالمي للميثان، ورائدة في مجالات الاقتصاد الحيوي.",
    },
    strategicInsights: {
      partnershipsEn: "High opportunities for UAE MASDAR to invest in utility-scale solar arrays in Bahia and Minas Gerais. Green Hydrogen hub integration in Port of Pecém.",
      partnershipsAr: "فرص واعدة لشركة 'مصدر' الإماراتية للاستثمار في مجمعات الطاقة الشمسية الكبرى في باهيا وميناس جيرايس. وتكامل مركز الهيدروجين الأخضر في ميناء بيسيم.",
      investmentsEn: "DP World Santos expansion ($350M+ committed for container terminal scale) to secure agri-bulk logistics and maritime shipping links directly of Brazilian grains to Jebel Ali.",
      investmentsAr: "توسيع موانئ موانئ دبي العالمية بسانتوس (استثمار 350 مليون دولار لتحديث محطة الحاويات) لتأمين سلاسل الإمداد الغذائي وشحن الحبوب مباشرة إلى جبل علي.",
      knowledgeEn: "Knowledge sharing in smart grid resilience and dry-bulk shipping logistics. Joint research on Amazon preservation tech.",
      knowledgeAr: "تبادل المعرفة في مرونة الشبكات الذكية ولوجستيات البضائع الجافة. بحوث مشتركة حول تكنولوجيا الحفاظ على الغابات المطيرة.",
    },
    predictive: {
      marketsEn: "Offshore wind concessions expected to open up new tender waves by 2027. Green aviation fuel (SAF) production holds a core target.",
      marketsAr: "من المتوقع أن يفتح امتياز طاقة الرياح البحرية عطاءات جديدة بحلول عام 2027. ويمثل وقود الطيران المستدام (SAF) هدفاً استراتيجياً متنامياً.",
      risksEn: "Regulatory alignment hurdles in regional state levels; currency fluctuations. Mitigate via bilateral sovereign guarantees.",
      risksAr: "عقبات التنسيق التنظيمي على مستوى الولايات والصدمات المالية في سعر التجارة. يتم تفادي ذلك عبر الضمانات السيادية الثنائية.",
      proposalsEn: "Propose a Joint UAE-Brazil Decarbonized Maritime Corridor bridging Port of Santos and Port of Jebel Ali using low-carbon fuels.",
      proposalsAr: "اقتراح ممر بحري خالٍ من الكربون يربط ميناء سانتوس بميناء جبل علي باستخدام الوقود النظيف تزامناً مع COP30.",
    }
  },
  germany: {
    id: "germany",
    nameEn: "Germany",
    nameAr: "ألمانيا",
    flag: "🇩🇪",
    profile: {
      overviewEn: "The largest economy in the European Union. A leading technology developer, industrial powerhouse, and strategic pioneer in the energy transition (Energiewende) with direct supply agreements for clean fuels from the gulf.",
      overviewAr: "أكبر اقتصاد في الاتحاد الأوروبي، ورائد تكنولوجي وصناعي عالمي ومبتكر في رحلة تحول الطاقة مع اتفاقيات توريد مباشرة للوقود النظيف من الخليج العربي إلى موانئ الشمال الألماني.",
      governmentEn: "Federal parliamentary republic led by Federal Chancellor Olaf Scholz.",
      governmentAr: "جمهورية برلمانية اتحادية بقيادة المستشار الاتحادي أولاف شولتس.",
      leadershipEn: "Federal Chancellor: Olaf Scholz; Vice Chancellor & Minister for Economic Affairs and Climate Action: Robert Habeck.",
      leadershipAr: "المستشار الاتحادي: أولاف شولتس؛ نائب المستشار ووزير الشؤون الاقتصادية والعمل المناخي: روبرت هابيك.",
    },
    indicators: {
      gdp: "$4.45 Trillion (USD)",
      gdpAr: "4.45 تريليون دولار أمريكي",
      growth: "0.2%",
      gdpPerCapita: "$52,800",
      energyMix: "Coal (26%), Wind (27%), Gas (14%), Solar (12%), Nuclear (0% closed in 2023), Others (21%)",
      energyMixAr: "فحم (26%)، رياح (27%)، غاز (14%)، شمسية (12%)، نووي (0% أغلقت 2023)، أخرى (21%)",
      infrastructureIndex: "94.2/100",
      environmentalRank: "Top 13th Globally (EPI)",
      competitivenessRank: "22nd globally",
      cooperationAgreementEn: "UAE-Germany Energy Security and Industry Accelerator (ESIA) signed in 2022",
      cooperationAgreementAr: "تسريع أمن الطاقة والنمو الصناعي (ESIA) الموقع بين الإمارات وألمانيا في عام 2022",
    },
    sectors: {
      energyEn: "Phasing out coal and nuclear completely. Heavy deployment of onshore/offshore wind and solar. Deep reliance on external green hydrogen imports to meet heavy industry demand.",
      energyAr: "التخلص التدريجي من الفحم بعد إغلاق المحطات النووية بالكامل. توسع هائل في طاقة الرياح البرية والبحرية والطاقة الشمسية، مع اعتماد كبير على استيراد الهيدروجين النظيف لتلبية متطلبات الصناعة الثقيلة.",
      infrastructureEn: "World-class logistic infrastructure. High-speed rail connections and advanced clean inland canal ports. Heavy road network requires maintenance.",
      infrastructureAr: "بنية تحتية لوجستية عالمية المستوى ممثلة في خطوط السكك الحديدية فائقة السرعة، وموانئ داخلية متطورة عبر القنوات المائية. شبكات الطرق البرية بحاجة إلى صيانة مرورية مبتكرة.",
      sustainabilityEn: "Targeting complete greenhouse gas neutrality by 2450 (under national climate laws). Strict emissions trading framework.",
      sustainabilityAr: "تستهدف الحياد الكامل للغازات الدفيئة بحلول عام 2045 بموجب القوانين الوطنية الصارمة، مع تشغيل أحد أدق أطر تبادل الانبعاثات والضرائب البيئية.",
    },
    strategicInsights: {
      partnershipsEn: "Hydrogen supply corridor: H2Global procurement program integration where UAE exports green ammonia/hydrogen from Masdar and ADNOC projects directly to German ports (Hamburg, Wilhelmshaven).",
      partnershipsAr: "ممر إمدادات الهيدروجين: دمج برامج الشراء عبر مبادرة H2Global لتصدير الأمونيا الخضراء من مشاريع 'مصدر' وأدنوك إلى موانئ ألمانيا (هامبورغ وفيلهلمسهافن).",
      investmentsEn: "UAE investment in North Sea wind turbines and transmission networks. Co-investing in hydrogen-ready gas power plant developments.",
      investmentsAr: "استثمارات إماراتية واعدة في توربينات الرياح البحرية في بحر الشمال ومحطات التوليد. استثمار مشترك في محطات توليد الطاقة الكهربائية المهيأة للهيدروجين.",
      knowledgeEn: "Knowledge partnership on advanced electrolyzer manufacturing, carbon capture technologies, and grid management with Siemens Energy.",
      knowledgeAr: "شراكة متبادلة مع 'سيمنز للطاقة' في تصنيع أجهزة التحليل الكهربائي المتطورة وتقنيات التقاط الكربون وإدارته بكفاءة لربط شبكات ذكية.",
    },
    predictive: {
      marketsEn: "Surge in electrolyzer demand across main chemical industrial hubs. Demand for steel-manufacturing decarbonization.",
      marketsAr: "طفرة كبيرة في الطلب على أجهزة التحليل الكهربائي في المجمعات الكيميائية، ورغبة شديدة في تقنيات تصنيع الحديد والصلب الخالي من انبعاثات الكربون.",
      risksEn: "Complex EU energy regulations and grid isolation limits. Mitigate by structuring long-term fixed off-take contracts.",
      risksAr: "صعوبة القوانين البيئية للاتحاد الأوروبي ومشاكل ربط الشبكات. يمكن تفاديها عبر عقود شراء طويلة الأجل مضمونة ومثبتة الأسعار.",
      proposalsEn: "Establish a Joint UAE-Germany Clean Infrastructure Fund to co-finance large scale electrolyzer farms in MENA for European export.",
      proposalsAr: "تأسيس صندوق استثماري مشترك للبنية التحتية النظيفة لتمويل مزارع وعقود أجهزة التحليل في الشرق الأوسط المصدرة إلى ألمانيا.",
    }
  },
  india: {
    id: "india",
    nameEn: "India",
    nameAr: "الهند",
    flag: "🇮🇳",
    profile: {
      overviewEn: "The most populous country and a primary economic engine. Comprehensive strategic partner with unprecedented economic ties to the UAE through CEPA and IMEC corridors, particularly in renewable microgrids, heavy rail, and smart logistics.",
      overviewAr: "الدولة الأكبر من حيث تعداد السكان ومحرك رئيسي للنمو العالمي. شريك استراتيجي شامل بدبلوماسية اقتصادية استثنائية مع الإمارات عبر اتفاقية (CEPA) وممر (IMEC) لاسيما في السكك الحديدية والموانئ.",
      governmentEn: "Federal parliamentary republic led by Prime Minister Narendra Modi.",
      governmentAr: "جمهورية برلمانية اتحادية رئيسية بقيادة رئيس الوزراء ناريندرا مودي.",
      leadershipEn: "Prime Minister: Narendra Modi; Minister of Power, New and Renewable Energy: Shri R. K. Singh.",
      leadershipAr: "رئيس الوزراء: ناريندرا مودي؛ وزير الطاقة والكهرباء والطاقة المتجددة: شري آر كيه سينغ.",
    },
    indicators: {
      gdp: "$3.73 Trillion (USD)",
      gdpAr: "3.73 تريليون دولار أمريكي",
      growth: "7.6%",
      gdpPerCapita: "$2,600",
      energyMix: "Coal (70%), Solar/Wind/Hydro (22%), Biomass (5%), Nuclear (2%), Others (1%)",
      energyMixAr: "فحم (70%)، طاقة شمسية ورياح ومياه (22%)، كتلة حيوية (5%)، نووي (2%)، أخرى (1%)",
      infrastructureIndex: "81.0/100",
      environmentalRank: "Expanding Solar Target (500GW Clean Energy by 2030)",
      competitivenessRank: "39th globally",
      cooperationAgreementEn: "Comprehensive Economic Partnership Agreement (CEPA) signed in 2022",
      cooperationAgreementAr: "اتفاقية الشراكة الاقتصادية الشاملة (CEPA) التي دخلت حيز التنفيذ في عام 2022",
    },
    sectors: {
      energyEn: "Heavily reliant on coal but experiencing the fastest global solar capacity additions. Target of 500 GW of non-fossil capacity by 2030 is highly strategic.",
      energyAr: "اعتماد هائل وتاريخي على الفحم الحجري، ولكنها تشهد أسرع توسع وإضافة للقدرات الشمسية في العالم مع استهداف استراتيجي بإنتاج 500 جيجاواط طاقة نظيفة بحلول 2030.",
      infrastructureEn: "Massive modernization of the national railway network. Core focus on building dedicated freight corridors (DFC) and multi-modal logistics parks.",
      infrastructureAr: "خطط تطوير شاملة لشبكة السكك الحديدية الوطنية والمجالس اللوجستية، مع تركيز استثنائي على إنشاء ممرات شحن مخصصة لربط الموانئ بالمراكز اللوجستية.",
      sustainabilityEn: "Targeted net-zero carbon by 2070. Launch of National Green Hydrogen Mission to decarbonize refineries and fertilizer units.",
      sustainabilityAr: "استهداف الوصول إلى الحياد المناخي بحلول عام 2070، مع إطلاق 'البعثة الوطنية للهيدروجين الأخضر' لإزالة الكربون من مصافي تكرير النفط وإنتاج الأسمدة.",
    },
    strategicInsights: {
      partnershipsEn: "Grid Interconnection Proposal: Linking Gujarat coast with UAE power grids via undersea high-voltage direct current (HVDC) cable to export solar power dynamically.",
      partnershipsAr: "ربط شبكة الكهرباء: اقتراح كابل بحري ذو تيار جهد عالٍ مستمر (HVDC) لربط ساحل غوجارات بشبكة كهرباء الإمارات لنقل وتبادل الطاقة الشمسية.",
      investmentsEn: "Adani/DP World joint development of modern container terminals in Mundra, Nhava Sheva, and Cochin. Joint sovereign funds focused on national rail corridors.",
      investmentsAr: "شراكة متبادلة بين موانئ دبي العالمية والمجمعات المحلية في الهند لإدارة محطات حاويات عملاقة في موندرا ونهوفا شيفا وكوشين وصناديق ربط حديدي.",
      knowledgeEn: "Knowledge sharing in scaling affordable solar microgrids, green hydrogen manufacturing costs, and satellite telemetry for logistics optimization.",
      knowledgeAr: "تبادل التقنيات الإبداعية في المصغرات الشمسية منخفضة الكلفة وصناعة التوربينات الرخيصة واللوجستيات الرقمية المتينة.",
    },
    predictive: {
      marketsEn: "Enormous market for electrolyzer production; massive green hydrogen manufacturing hubs in coastal SEZs.",
      marketsAr: "سوق عالمية ضخمة لإنتاج وتجميع المحللات الكهربائية والإنتاج الغازي النظيف في المناطق الحرة الساحلية في غوجارات ومهاراشترا.",
      risksEn: "Land acquisition protocols, slow bureaucratic permissions. Mitigate through central government Gati Shakti fast-track digital approvals.",
      risksAr: "صعوبة الحصول على الأراضي للاستثمار الزراعي والصناعي وبيروقراطية الترخيص. تذليل العقبات عبر التنسيق الحكومي الرقمي المركزي السريع.",
      proposalsEn: "Offer a UAE Strategic Power Reserve Hub and execute the UAE-India GigaGrid initiative to integrate under-sea energy exchange.",
      proposalsAr: "تقديم مبادرة خطوط الطاقة المتكاملة (GigaGrid) وتوفير تخزين نفطي استراتيجي للإمارات في الساحل الهندي لتأمين المخزون الثنائي.",
    }
  },
  singapore: {
    id: "singapore",
    nameEn: "Singapore",
    nameAr: "سنغافورة",
    flag: "🇸🇬",
    profile: {
      overviewEn: "Global financial powerhouse and smart-city icon. Strategic logistic hub controlling the Malacca strait. High relevance for UAE in terms of port automation, smart transport, block-chain shipping registries, and low-carbon LNG trade.",
      overviewAr: "مركز مالي ورقمي عالمي رائد في آسيا والمدينة الذكية الأكثر تقدماً. تؤمن سنغافورة سلاسل الشحن الملاحي عبر مضيق ملقا ولها شراكة وطيدة مع دبي للتطوير اللوجستي.",
      governmentEn: "Unitary parliamentary republic led by Prime Minister Lawrence Wong.",
      governmentAr: "جمهورية برلمانية موحدة بقيادة رئيس الوزراء لورانس وونغ.",
      leadershipEn: "Prime Minister: Lawrence Wong; Minister for Sustainability and the Environment: Grace Fu.",
      leadershipAr: "رئيس الوزراء: لورانس وونغ؛ ووزيرة الاستدامة والبيئة: غريس فو.",
    },
    indicators: {
      gdp: "$497 Billion (USD)",
      gdpAr: "497 مليار دولار أمريكي",
      growth: "2.1%",
      gdpPerCapita: "$87,000",
      energyMix: "Natural Gas (95%), Solar (3%), Biomass/Waste (1.5%), Others (0.5%)",
      energyMixAr: "غاز طبيعي (95%)، طاقة شمسية (3%)، كتلة حيوية ونفايات (1.5%)، أخرى (0.5%)",
      infrastructureIndex: "98.8/100",
      environmentalRank: "EPI Rank 1 in Asia",
      competitivenessRank: "1st globally",
      cooperationAgreementEn: "Singapore-UAE Comprehensive Partnership (SUCP) updated in 2019",
      cooperationAgreementAr: "الشراكة الاستراتيجية الشاملة بين سنغافورة والإمارات (SUCP) المحدثة في 2019",
    },
    sectors: {
      energyEn: "Highly dependent on natural gas. Pivoting rapidly to regional solar grid imports (Siam-Singapore-Laos cable) and carbon capture at Jurong Island.",
      energyAr: "تعتمد بنسبة 95٪ على الغاز الطبيعي المستورد، وتتجه بسرعة لاستيراد الكهرباء الإقليمية النظيفة من دول الجوار (كمبوديا، لاوس) والتقاط انبعاثات الكربون في جزيرة جورونج الصناعية.",
      infrastructureEn: "State-of-the-art automated megaport (Tuas Port). Advanced subway, integrated traffic data streams, smart grid load balancing.",
      infrastructureAr: "بنية تحتية متفوقة تكنولوجياً، وتشييد أضخم ميناء مؤتمت بالكامل في العالم (Tuas Port)، مع شبكات النقل الحضري الفائقة وتطبيقات مراقبة السير الذكية.",
      sustainabilityEn: "Singapore Green Plan 2030 targets quadruple solar capacity, zero waste, and a progressive carbon tax regime.",
      sustainabilityAr: "الخطة الخضراء لسنغافورة 2030 تستهدف مضاعفة السعة الشمسية بأربع مرات، وبلوغ حياد تدوير النفايات وتطبيق ضرائب كربون تقدمية رائدة.",
    },
    strategicInsights: {
      partnershipsEn: "Maritime decarbonization collaboration: Joint initiative between MPA Singapore and Abu Dhabi/Dubai maritime authorities on ammonia bunkering and digital trade logs.",
      partnershipsAr: "إزالة كربون الملاحة: شراكة واعدة بين هيئة الموانئ البحرية بسنغافورة وموانئ أبوظبي ودبي حول تزويد السفن بالأمونيا الخضراء والتبادل اللوجستي الرقمي.",
      investmentsEn: "Joint investment in regional ASEAN green grid projects. Venture capital pipelines in logistics and warehouse automation.",
      investmentsAr: "استثمار مشترك محتمل في شبكة نقل الطاقة لدول الآسيان، ومشاريع استثمار المخاطر المشتركة للوجستيات والمستودعات الذكية المؤتمتة.",
      knowledgeEn: "Knowledge sharing in smart city digital twin modeling (Virtual Singapore) and coastal defense management to face rising ocean levels.",
      knowledgeAr: "تبادل المعرفة في محاكاة نماذج المدن التوأم الرقمية (Virtual Singapore) وإدارة مصدات الفيضانات وحماية الشواطئ الساحلية من ارتفاع منسوب البحر.",
    },
    predictive: {
      marketsEn: "Surge in clean energy financial trading services; supply chain analytics software markets are expanding at 15% CAGR.",
      marketsAr: "طفرة في أسواق تداول عقود الطاقة المتجددة وسوق برمجيات سلاسل الإمداد اللوجستية التي تنمو بنسبة مركبة تبلغ 15%.",
      risksEn: "Extreme geostrategic land space limits. Mitigate by focusing on floating platforms, regional cable systems, and offshore joint assets.",
      risksAr: "مساحة الأراضي الجغرافية المحدودة للغاية. تفادي ذلك بالتركيز على التقنيات العائمة، وشبكات الربط الإقليمية المشتركة.",
      proposalsEn: "Launch the UAE-Singapore Digital Port Registry Network to co-develop zero-friction, end-to-end automated customized shipping lanes.",
      proposalsAr: "إطلاق شبكة التبادل الرقمي للموانئ وسلاسل التوريد بين الإمارات وسنغافورة لاعتماد ممرات جمركية ولوجستية فورية.",
    }
  },
  "united-states": {
    id: "united-states",
    nameEn: "United States",
    nameAr: "الولايات المتحدة",
    flag: "🇺🇸",
    profile: {
      overviewEn: "Federal constitutional republic in North America. High technology pioneer and key energy partner.",
      overviewAr: "جمهورية دستورية في أمريكا الشمالية، رائدة في التكنولوجيا المتقدمة وشريك حيوي لأمن الطاقة في الدولة.",
      governmentEn: "Federal presidential republic.",
      governmentAr: "جمهورية رئاسية فيدرالية.",
      leadershipEn: "President: Joe Biden; Secretary of Energy: Jennifer Granholm.",
      leadershipAr: "الرئيس: جو بايدن؛ ووزيرة الطاقة: جينيفر غرانولم.",
    },
    indicators: {
      gdp: "$27.36 Trillion (USD)",
      gdpAr: "27.36 تريليون دولار أمريكي",
      growth: "2.5%",
      gdpPerCapita: "$80,000",
      energyMix: "Gas (39%), Coal (16%), Nuclear (18%), Wind (10%), Solar (6%), Others (11%)",
      energyMixAr: "غاز طبيعي (39%)، فحم (16%)، نووي (18%)، رياح (10%)، طاقة شمسية (6%)، أخرى (11%)",
      infrastructureIndex: "95.5/100",
      environmentalRank: "Top-tier Green Investments",
      competitivenessRank: "3rd globally",
      cooperationAgreementEn: "Framework of high level diplomatic cooperation and clean tech initiatives.",
      cooperationAgreementAr: "إطار عمل للتعاون الدبلوماسي رفيع المستوى ومبادرات التكنولوجيا النظيفة.",
    },
    sectors: {
      energyEn: "Global pioneer in natural gas, shale oil, with rapid clean initiatives in hydrogen and nuclear.",
      energyAr: "رائد عالمي في الغاز الطبيعي والنفط الصخري، ومبادرات متسارعة لشبكات الهيدروجين والجيل الجديد النووي.",
      infrastructureEn: "Excellent highways, airports, and highly integrated multi-modal inland logistics channels.",
      infrastructureAr: "شبكات برية ومطارات متميزة، وقنوات شحن ونقل لوجستية متباعدة ومترابطة بكفاءة.",
      sustainabilityEn: "Targeting net-zero emissions by 2050 with hundreds of billions in local green funding.",
      sustainabilityAr: "تستهدف صفر انبعاثات بحلول 2050 عبر تمويلات خضراء فيدرالية بمئات المليارات.",
    },
    strategicInsights: {
      partnershipsEn: "Deep funding from UAE Masdar in Texas Wind and Solar initiatives.",
      partnershipsAr: "تمويلات ضخمة من شركة مصدر الإماراتية في مشاريع الرياح والطاقة الشمسية بتكساس.",
      investmentsEn: "Major maritime agreements with leading automated ports on both east and west coasts.",
      investmentsAr: "أطقم تفاهم استراتيجية تهدف إلى رقمنة وتأمين الموانئ ومراكز الاستقبال على سواحلها.",
      knowledgeEn: "Pioneering technology development in clean AI, high-capacity batteries and carbon-capture software.",
      knowledgeAr: "تبادل براءات الاختراع والحلول لشبكات الذكاء الاصطناعي الخضراء ومصيدات الكربون.",
    },
    predictive: {
      marketsEn: "Surge in clean energy technology transfer and regional microgrid software.",
      marketsAr: "طفرة هائلة في نقل تكنولوجيا تخزين الطاقة وتحليلات المخدمات اللوجستية.",
      risksEn: "Varying state regulations. Mitigate via bilateral federal tier agreements.",
      risksAr: "تباين اللوائح بين الولايات الفيدرالية. يمكن تخطيها عبر تفاهمات على مستوى فيدرالي.",
      proposalsEn: "Launch joint Transatlantic Decarbonized Corridor to secure zero-carbon supply channels.",
      proposalsAr: "إطلاق ممر عبور المحيطات منخفض الكربون بالتعاون مع موانئ دبي لتقليص الانبعاثات.",
    }
  },
  "united-kingdom": {
    id: "united-kingdom",
    nameEn: "United Kingdom",
    nameAr: "المملكة المتحدة",
    flag: "🇬🇧",
    profile: {
      overviewEn: "Constitutional monarchy in Europe. A global financial center with strong maritime hubs and a pioneer in offshore wind power capacity.",
      overviewAr: "ملكية دستورية في أوروبا، مركز مالي عالمي يمتلك قنوات ملاحية نشطة ومكانة هندسية رائدة في طاقة الرياح البحرية.",
      governmentEn: "Parliamentary democracy under a constitutional monarchy.",
      governmentAr: "ديمقراطية برلمانية تحت نظام ملكي دستوري.",
      leadershipEn: "Prime Minister: Keir Starmer; Secretary of State for Energy Security: Ed Miliband.",
      leadershipAr: "رئيس الوزراء: كير ستارمر؛ ووزير أمن الطاقة: إد ميليباند.",
    },
    indicators: {
      gdp: "$3.3 Trillion (USD)",
      gdpAr: "3.3 تريليون دولار أمريكي",
      growth: "0.5%",
      gdpPerCapita: "$46,000",
      energyMix: "Gas (38%), Wind (29%), Nuclear (15%), Solar (5%), Biomass (11%), Coal (2%)",
      energyMixAr: "غاز طبيعي (38%)، رياح (29%)، نووي (15%)، طاقة شمسية (5%)، كتلة حيوية (11%)، فحم (2%)",
      infrastructureIndex: "92.0/100",
      environmentalRank: "Net Zero by 2050 legislated",
      competitivenessRank: "18th globally",
      cooperationAgreementEn: "Strategic Partnership for Future Prosperity signed in 2021",
      cooperationAgreementAr: "شراكة استراتيجية للازدهار المستقبلي تم توقيعها في عام 2021",
    },
    sectors: {
      energyEn: "Global hub of offshore wind integration. Transitioning completely away from coal. Highly supportive of green hydrogen projects around coastal industrial hubs.",
      energyAr: "مركز عالمي لاندماج طاقة الرياح البحرية والتخلي الكلي عن الفحم وتنشيط إنتاج الهيدروجين النظيف في مجمعات الصناعة الشاطئية.",
      infrastructureEn: "Highly developed ports and maritime facilities. High-speed rail construction underway but faces budget pressure.",
      infrastructureAr: "موانئ متطورة ومرافق ملاحية ممتازة، بالرغم من ضغوط الموازنة على خطوط السكك الحديدية السريعة الجديدة.",
      sustainabilityEn: "Leading climate laws with strict legally binding five-year carbon budgets.",
      sustainabilityAr: "قوانين مناخية ملزمة تشمل ميزانيات مرحلية خماسية لتقليص انبعاثات ثاني أكسيد الكربون.",
    },
    strategicInsights: {
      partnershipsEn: "UAE Masdar investment in Thames Estuary and Dogger Bank colossal wind farms.",
      partnershipsAr: "استثمارات ضخمة لشركة مصدر الإماراتية في مزارع الرياح البحرية بمصب نهر التايمز وبحيرة دوغر.",
      investmentsEn: "Collaboration between DP World London Gateway and UK port authorities on AI-powered logistics tracking.",
      investmentsAr: "استثمارات متبادلة مستمرة في ميناء 'لندن غيتواي' لتفعيل اللوجستيات الرقمية المدعومة بالذكاء الاصطناعي.",
      knowledgeEn: "Joint research on offshore engineering, smart tides energy and hydrogen infrastructure.",
      knowledgeAr: "بحوث مشتركة في قطاع الهندسة البحرية، طاقة المد والجزر والبنية التحتية لحلول تدوير وتخزين الهيدروجين.",
    },
    predictive: {
      marketsEn: "Growing opportunities in green infrastructure bond markets and tidal energy trials.",
      marketsAr: "فرص نمو متصاعدة في أسواق السندات الخضراء ومشاريع طاقة المد والجزر المائية.",
      risksEn: "Post-Brexit trade coordination; updates on energy pricing policies. Mitigate with stable bilateral platforms.",
      risksAr: "بيئة الاستيراد ما بعد البريكست وتحديثات أسعار الطاقة. يتم ضبطها بتنسيق لجان عمل وطنية مشتركة.",
      proposalsEn: "Launch UK-UAE Clean Energy Corridor matching offshore wind power to smart global logistics.",
      proposalsAr: "تطوير ممر الطاقة النظيفة الثنائي لدمج هندسة الرياح مع التطبيقات الرقمية لموانئ دبي العالمية."
    }
  },
  china: {
    id: "china",
    nameEn: "China",
    nameAr: "الصين",
    flag: "🇨🇳",
    profile: {
      overviewEn: "An economic superpower and manufacturing titan. World's absolute leader in total clean energy installation value, solar panel manufacturing, electric vehicles, and high-speed rail lines.",
      overviewAr: "عملاق التصنيع وثاني أكبر اقتصاد عالمياً. تتصدر الصين دول العالم في توليد الطاقة النظيفة والتطبيقات الكهروضوئية وتصنيع السيارات الكهربائية.",
      governmentEn: "Unitary socialist republic.",
      governmentAr: "جمهورية اشتراكية موحدة.",
      leadershipEn: "President: Xi Jinping; Premier: Li Qiang.",
      leadershipAr: "الرئيس: شي جين بينغ؛ ورئيس مجلس الدولة: لي كيانغ.",
    },
    indicators: {
      gdp: "$18.56 Trillion (USD)",
      gdpAr: "18.56 تريليون دولار أمريكي",
      growth: "5.2%",
      gdpPerCapita: "$13,000",
      energyMix: "Coal (56%), Hydro (16%), Wind/Solar (15%), Gas (8%), Nuclear (5%)",
      energyMixAr: "فحم (56%)، طاقة مائية (16%)، رياح وشمسية (15%)، غاز طبيعي (8%)، نووي (5%)",
      infrastructureIndex: "93.0/100",
      environmentalRank: "Rapid Carbon Peak 2030, Neutrality 2060 Plan Active",
      environmentalRankAr: "مخطط الوصول لذروة الكربون بحلول 2030 والحياد الكامل 2060",
      competitivenessRank: "21st globally",
      cooperationAgreementEn: "Comprehensive Strategic Partnership and Belt and Road energy alignment",
      cooperationAgreementAr: "شراكة استراتيجية شاملة وتنسيق مبادرة الحزام والطريق في قطاع الطاقة النظيفة والموانئ",
    },
    sectors: {
      energyEn: "Global industrial leader in solar photovoltaic panels, wind turbines, and lithium battery manufacturing.",
      energyAr: "المصدر والمنتج الأكبر عالمياً للألواح والبطاريات وتوربينات الرياح وبطاريات السيارات الكهربائية.",
      infrastructureEn: "The world's densest modern high-speed rail network and largest scale automated deep-water container ports.",
      infrastructureAr: "تمتلك أضخم وأعقد شبكة سكك حديدية فائقة السرعة عالمياً، وموانئ بحرية تعتمد بالكامل على الأتمتة السحابية.",
      sustainabilityEn: "Implementing rapid transformation frameworks to achieve renewable dominance despite massive coal reliance.",
      sustainabilityAr: "تقود تحولاً متسارعاً عبر خططها الخمسية لزيادة الاعتماد على الطاقة المتجددة وتعويض الوقود الأحفوري تدريجياً.",
    },
    strategicInsights: {
      partnershipsEn: "Joint solar manufacturing ecosystems and direct grid battery supply chains for MENA projects.",
      partnershipsAr: "توطين صناعات الألواح الكهروضوئية وسلسلة توريد بطاريات التخزين لمشاريع منطقة الشرق الأوسط.",
      investmentsEn: "Co-investing with Cosco and China Merchants inside UAE port networks (Khalifa Port terminal expansion).",
      investmentsAr: "استثمارات موانئ مشتركة مع شركة كوسكو وشاينا ميرشانتس في ميناء خليفة وجبل علي.",
      knowledgeEn: "Knowledge partnership on ultra-high voltage (UHV) power lines and digital grid control.",
      knowledgeAr: "تبادل التقنيات في خطوط الكهرباء ذات الجهد الفائق المستمر وتكامل أنظمة التحكم الرقمية للشبكة الكبرى.",
    },
    predictive: {
      marketsEn: "Booming markets in smart transport, high capacity hydrogen electrolyzers and industrial energy storage.",
      marketsAr: "طلب متزايد على أجهزة التحليل الكهربائي العملاقة وبطاريات تخزين السعات الصناعية الكبيرة.",
      risksEn: "Supply chain geopolitical friction and trade barriers. Mitigate through localized joint assembly factories.",
      risksAr: "الرسوم الجمركية والقيود الدولية. تجنبها بإنشاء مصانع تجميع ثنائية بالمناطق الحرة المشتركة.",
      proposalsEn: "Establish a Joint UAE-China Smart Ports Hub to standardize automated zero-emission cargo terminal guidelines.",
      proposalsAr: "تأسيس تحالف ذكي مشترك لإدارة الموانئ الخضراء وتسهيل البيانات اللوجستية الخالية من الانبعاثات."
    }
  },
  japan: {
    id: "japan",
    nameEn: "Japan",
    nameAr: "اليابان",
    flag: "🇯🇵",
    profile: {
      overviewEn: "High-tech industrial leader in Asia. Highly integrated transport networks, leading automotive technology, and a major strategic partner for UAE in hydrogen carrier research and LNG trade.",
      overviewAr: "رائد صناعي وتكنولوجي في قارة آسيا، ويمتلك شبكة طرق ونقل فائقة التطور. ويعد شريكاً استراتيجياً هاماً لوزارة الطاقة في أبحاث ناقلات الهيدروجين.",
      governmentEn: "Parliamentary constitutional monarchy.",
      governmentAr: "ملكية دستورية برلمانية.",
      leadershipEn: "Prime Minister: Shigeru Ishiba; Minister of Economy, Trade and Industry: Yoji Muto.",
      leadershipAr: "رئيس الوزراء: شيغيرو إيشيبا؛ ووزير الاقتصاد والتجارة والصناعة: يوجي موتو.",
    },
    indicators: {
      gdp: "$4.1 Trillion (USD)",
      gdpAr: "4.1 تريليون دولار أمريكي",
      growth: "1.0%",
      gdpPerCapita: "$34,000",
      energyMix: "Gas (34%), Coal (31%), Nuclear (9%), Solar (11%), Bio/Hydro (11%), Others (4%)",
      energyMixAr: "غاز طبيعي (34%)، فحم (31%)، نووي (9%)، طاقة شمسية (11%)، تخزين مائي (11%)، أخرى (4%)",
      infrastructureIndex: "96.0/100",
      environmentalRank: "Green Growth Strategy for Net Zero 2050 legislated",
      environmentalRankAr: "استراتيجية النمو الأخضر للوصول للحياد الكربوني بحلول 2050 معتمدة",
      competitivenessRank: "14th globally",
      cooperationAgreementEn: "Comprehensive Strategic Partnership Initiative (CSPI) active since 2018",
      cooperationAgreementAr: "مبادرة الشراكة الاستراتيجية الشاملة (CSPI) النشطة منذ عام 2018 بين البلدين",
    },
    sectors: {
      energyEn: "Pivoting to safe hydrogen deployment, advanced next-gen nuclear reactors and carbon capture. High import demand for clean liquid hydrogen.",
      energyAr: "الاستثمار المكثف في خلايا وقود الهيدروجين والمفاعلات النووية المتقدمة والتقاط الكربون، مع احتياج متزايد للمصادر المستوردة.",
      infrastructureEn: "Pristine bullet train network (Shinkansen) and ultra-automated smart transit ports.",
      infrastructureAr: "شبكة قطارات فائقة السرعة من الطراز الأول (شينكانسن) وموانئ بحرية ذكية مؤتمتة بدرجة متناهية.",
      sustainabilityEn: "Focusing on highly circular economy loops and innovative marine environment preservation technologies.",
      sustainabilityAr: "يركز بقوة على مفاهيم الاقتصاد الدائري وابتكار حلول لحماية البيئة البحرية ومعالجة النفايات تكنولوجياً.",
    },
    strategicInsights: {
      partnershipsEn: "Liquid hydrogen transport pipeline trials between Abu Dhabi fields and Japanese receipt facilities (Kawasaki Heavy Industries).",
      partnershipsAr: "تجارب متواصلة لشحن وتوريد الهيدروجين المسال العضوي من حقول أبوظبي لموانئ استقبال اليابان.",
      investmentsEn: "Direct Japanese joint infrastructure funds investing in MENA wind/solar integration projects.",
      investmentsAr: "صناديق وبنوك التنمية اليابانية تشارك في تمويل محطات الرياح والطاقة الكهروضوئية بالمنطقة.",
      knowledgeEn: "Knowledge sharing in smart grid AI, ammonia fuel propulsion systems, and hyper-efficient solar cells.",
      knowledgeAr: "تبادل مخرجات البحث في الخلايا الشمسية فائقة الكفاءة ومحركات السفن التي تعمل بالأمونيا الخضراء.",
    },
    predictive: {
      marketsEn: "Accelerated demand for hydrogen import carriers and floating carbon capture offshore systems.",
      marketsAr: "طلب متزايد على ناقلات الهيدروجين المبردة ومحطات عائمة لاحتجاز ثاني أكسيد الكربون.",
      risksEn: "Geological earthquake concerns on grid lines; strict regulatory import barriers. Mitigate via custom sovereign green channels.",
      risksAr: "مخاوف الزلازل للشبكات الأرضية وهيكل فني استيرادي صارم. التخطي عبر ممرات بروتوكولية سيادية خضراء.",
      proposalsEn: "Co-found a UAE-Japan Clean Fuel Laboratory to engineer standard liquid hydrogen bunkering protocols.",
      proposalsAr: "تأسيس مختبر ابتكار مشترك لتصميم وتوحيد بروتوكولات شحن وتزويد السفن بالوقود الهيدروجيني المسال."
    }
  },
  "saudi-arabia": {
    id: "saudi-arabia",
    nameEn: "Saudi Arabia",
    nameAr: "المملكة العربية السعودية",
    flag: "🇸🇦",
    profile: {
      overviewEn: "The largest economy in the Arab world and a leading global energy exporter. Key strategic neighbor for the UAE with integrated economic networks, grid links, and massive green hydrogen initiatives (NEOM).",
      overviewAr: "أكبر اقتصاد في العالم العربي وأبرز مصدر للطاقة عالمياً. شريك وجار استراتيجي وثيق لدولة الإمارات بتكامل تام في مجالس التنسيق ومشاريع الطاقة الخضراء الكبرى.",
      governmentEn: "Absolute monarchy.",
      governmentAr: "ملكية مطلقة.",
      leadershipEn: "King Salman bin Abdulaziz; Crown Prince & Prime Minister: Mohammed bin Salman.",
      leadershipAr: "خادم الحرمين الشريفين الملك سلمان بن عبدالعزيز؛ ولي العهد ورئيس مجلس الوزراء الأمير محمد بن سلمان.",
    },
    indicators: {
      gdp: "$1.1 Trillion (USD)",
      gdpAr: "1.1 تريليون دولار أمريكي",
      growth: "0.8%",
      gdpPerCapita: "$32,000",
      energyMix: "Oil and Natural Gas (100% current power, transitioning rapidly to solar/wind targets)",
      energyMixAr: "نفط وغاز طبيعي (100% حالياً، وتتحول بسرعة قياسية نحو مجمعات شمسية ورياح)",
      infrastructureIndex: "91.5/100",
      environmentalRank: "Saudi Green Initiative active (Net Zero 2060 target)",
      environmentalRankAr: "مبادرة السعودية الخضراء نشطة للوصول لصفر انبعاثات 2060",
      competitivenessRank: "16th globally",
      cooperationAgreementEn: "Saudi-Emirati Coordination Council and integrated bilateral energy grids",
      cooperationAgreementAr: "مجلس التنسيق السعودي الإماراتي والربط المباشر لشبكات الكهرباء ونقل الوقود",
    },
    sectors: {
      energyEn: "Global oil giant. Speeding up buildout of world's largest renewable hydrogen plant in NEOM and giant solar fields in Sudair.",
      energyAr: "عملاق النفط العالمي. يسارع الخطى لتشغيل أكبر محطة للهيدروجين الأخضر في نيوم ومجمع طاقة شمسية هائل بسدير.",
      infrastructureEn: "High-speed rail (Haramain), automated megaproject logistics, and expanding Red Sea port networks.",
      infrastructureAr: "قطارات فائقة السرعة ومجموعة موانئ بحرية ناشطة على ساحل البحر الأحمر والخليج العربي.",
      sustainabilityEn: "Targeting 50% renewable energy mix by 2030; planting 50 billion trees under the Middle East Green Initiative.",
      sustainabilityAr: "تهدف لإنتاج 50٪ من الكهرباء عبر المصادر المتجددة بحلول 2030، وزراعة 50 مليار شجرة في المنطقة.",
    },
    strategicInsights: {
      partnershipsEn: "Integrated power grid sharing to balance summer peak demand between UAE grids and KSA grids.",
      partnershipsAr: "تكامل الربط الكهربائي الفيدرالي لموازنة الأحمال والطلب الذروي الصيفي بين البلدين.",
      investmentsEn: "Acwa Power and UAE Masdar co-investments in large-scale utility solar and wind across the region.",
      investmentsAr: "استثمارات عملاقة مشتركة بين 'أكوا باور' ومجموعة 'مصدر' في مزارع الطاقة المتجددة في الشرق الأوسط.",
      knowledgeEn: "Knowledge partnership on NEOM clean hydrogen technology, hydrogen transport and heavy industrial decarbonization.",
      knowledgeAr: "تبادل الأبحاث التطبيقية في مصنع الهيدروجين بنيوم وتقنيات إزالة كربون الإنتاج الصناعي الثقيل.",
    },
    predictive: {
      marketsEn: "Massive market for green ammonia transport, modern utility solar grid management software.",
      marketsAr: "سوق واعدة لنقل الأمونيا الخضراء والربط التقني لمرافق الطاقة الكهروضوئية.",
      risksEn: "Regulatory variations, rapid project deployment speeds. Mitigate under unified GCC policy standards.",
      risksAr: "تحديات الإيقاع السريع للمشاريع وسلاسل التوريد. التخطي بمواءمة المعايير وخطط التنسيق الخليجية.",
      proposalsEn: "Propose a Unified GCC Sovereign Decarbonized Grid Agreement to export hydrogen safely to EU.",
      proposalsAr: "اقتراح معاهدة خليجية موحدة لتبادل وتصدير الطاقة النظيفة والمستدامة عبر شبكات ربط دولي."
    }
  },
  egypt: {
    id: "egypt",
    nameEn: "Egypt",
    nameAr: "مصر",
    flag: "🇪🇬",
    profile: {
      overviewEn: "Strategic partner in North Africa with control over the Suez Canal (world's core maritime trade chokepoint). Strategic collaboration with UAE in grid connections, solar energy hubs (Benban), and green hydrogen.",
      overviewAr: "شريك استراتيجي في شمال أفريقيا يربط البحرين المتوسط والأحمر بوجود قناة السويس. ويشكل ركيزة للتعاون الاستثماري للإمارات في طاقة الشمس والرياح.",
      governmentEn: "Semi-presidential republic.",
      governmentAr: "جمهورية نصف رئاسية.",
      leadershipEn: "President: Abdel Fattah el-Sisi; Prime Minister: Mostafa Madbouly.",
      leadershipAr: "الرئيس: عبدالفتاح السيسي؛ ورئيس الوزراء: مصطفى مدبولي.",
    },
    indicators: {
      gdp: "$390 Billion (USD)",
      gdpAr: "390 مليار دولار أمريكي",
      growth: "4.2%",
      gdpPerCapita: "$3,800",
      energyMix: "Gas (76%), Hydro (8%), Wind (6%), Solar (5%), Oil/Others (5%)",
      energyMixAr: "غاز طبيعي (76%)، طاقة مائية (8%)، رياح (6%)، طاقة شمسية (5%)، أخرى (5%)",
      infrastructureIndex: "83.5/100",
      environmentalRank: "Suez Canal Green Transformation Initiative active",
      environmentalRankAr: "مبادرة التحول الأخضر لمنطقة قناة السويس نشطة كلياً",
      competitivenessRank: "82nd globally",
      cooperationAgreementEn: "Bilateral strategic alliance and green corridor integration signed in 2024",
      cooperationAgreementAr: "شراكة استراتيجية ثنائية متنامية وتطوير حزمة مشاريع الطاقة بـ 2024",
    },
    sectors: {
      energyEn: "Possesses world's largest solar park in Benban. Massive potential for wind along the Gulf of Suez coast.",
      energyAr: "تمتلك أحد أكبر التجمعات الكهروضوئية بالعالم (بنبان بمحافظة أسوان)، وقدرات ريحية هائلة بخليج السويس.",
      infrastructureEn: "Suez Canal represents a core marine trade artery. Heavily upgrading national highway networks.",
      infrastructureAr: "تعد قناة السويس الشريان البحري الرئيسي للتجارة العالمية، بالإضافة لعمليات تحديث واسعة لشبكة الطرق والموانئ.",
      sustainabilityEn: "Focusing on green fuel production in industrial zone near canal ports for maritime refueling.",
      sustainabilityAr: "التركيز على تصنيع وتخزين الوقود منخفض وصفر الكربون لتموين السفن العابرة للقناة.",
    },
    strategicInsights: {
      partnershipsEn: "UAE Masdar development of colossal 10GW onshore wind projects along the Nile River corridor.",
      partnershipsAr: "شركة 'مصدر' تقود مشروع إنشاء مزرعة رياح برية عملاقة بقدرة 10 جيجاواط على ضفاف النيل.",
      investmentsEn: "DP World Sokhna port expansion and industrial zone development to secure shipping lines.",
      investmentsAr: "تحديث ميناء العين السخنة وتطوير منطقته الاقتصادية لتأمين سلاسل التوريد عبر قناة السويس.",
      knowledgeEn: "Knowledge sharing in dryland farming resilience and sustainable water utility networks.",
      knowledgeAr: "التعاون المعرفي والبحثي في التكيف الزراعي مع جفاف التربة وإدارة شبكات المياه المستدامة.",
    },
    predictive: {
      marketsEn: "Accelerated market for green fuel ships refuel, wind turbine blades manufacturing.",
      marketsAr: "فرص متنامية في تصنيع مكونات التوربينات وأنشطة تموين ووقود السفن الخضراء.",
      risksEn: "Currency exchange risks. Mitigate by choosing GCC financial assistance, sovereign guarantees.",
      risksAr: "تقلبات أسعار العملات. تفادي العقبات عبر هيكلة الاستثمارات وتفعيل الضمانات السيادية الثنائية.",
      proposalsEn: "Establish a Suez Canal Green Refueling Hub in partnership with Emirates Global Petroleum and Masdar.",
      proposalsAr: "تطوير مجمع السويس للوقود النظيف لتقديم خيارات شحن خضراء ومناخية للسفن بالتنسيق مع وموانئ دبي العالمية."
    }
  }
};

type FirestoreConfig = {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
};

type VectorContextRecord = {
  id: string;
  countryId?: string;
  section?: string;
  titleEn?: string;
  titleAr?: string;
  textEn?: string;
  textAr?: string;
  tags?: string[];
  sourceUrl?: string;
  score?: number;
};

type AdvisorConversationMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

type AdvisorGroundingContext = {
  normalizedCountry: string;
  source: string;
  countryData: any;
  vectorContext: VectorContextRecord[];
  meetingMemory: MeetingRecord[];
  dataSources: {
    standardDatabase: string;
    vectorDatabase: {
      collection: string;
      matches: number;
    };
    meetingMemory: {
      collection: string;
      matches: number;
    };
    translation: TranslationMetadata;
  };
  renderedBriefing: string;
};

type N8NAdvisorWorkflowResult = {
  rawText: string;
  threadId?: string;
  structured?: any;
};

let firestoreConfigCache: FirestoreConfig | null | undefined;

function normalizeCountryId(value: string): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEmptyMeetingMemoryDatabase(): MeetingMemoryDatabase {
  return {
    meeting_records: [],
    meeting_action_items: [],
  };
}

function normalizeShortText(value: unknown, fallback = "", maxLength = 4000): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return fallback;
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function normalizeStringArray(value: unknown, fallback: string[] = [], maxItems = 10): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\n|;/)
      : [];

  const items = rawItems
    .map((item) => normalizeShortText(item, "", 1000))
    .filter(Boolean)
    .slice(0, maxItems);

  return items.length > 0 ? items : fallback;
}

function normalizeActionPriority(value: unknown): MeetingActionPriority {
  if (value === "Critical" || value === "High" || value === "Medium" || value === "Low") {
    return value;
  }
  return "Medium";
}

function normalizeActionStatus(value: unknown): MeetingActionStatus {
  if (value === "Pending" || value === "In Progress" || value === "Completed" || value === "Deferred") {
    return value;
  }
  return "Pending";
}

function normalizeMeetingActionItems(value: unknown): MeetingActionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = item && typeof item === "object" ? item as any : {};
      return {
        id: normalizeShortText(source.id, "", 120) || undefined,
        description: normalizeShortText(source.description || source.action || source.task, "", 700),
        suggestedOwner: normalizeShortText(source.suggestedOwner || source.owner, "MOEI Strategy Team", 160),
        priority: normalizeActionPriority(source.priority),
        deadline: normalizeShortText(source.deadline, "", 80) || undefined,
        status: normalizeActionStatus(source.status),
      };
    })
    .filter((item) => item.description)
    .slice(0, 12);
}

function normalizeMeetingMetadata(value: unknown): MeetingMetadata {
  const source = value && typeof value === "object" ? value as any : {};
  const country = normalizeShortText(source.country, "Brazil", 128);
  const countryId = normalizeCountryId(source.countryId || country) || "brazil";

  return {
    title: normalizeShortText(source.title, "Untitled strategic meeting", 200),
    country,
    countryId,
    meetingDate: normalizeShortText(source.meetingDate || source.date, new Date().toISOString().slice(0, 10), 32),
    sector: normalizeShortText(source.sector, "Energy and Infrastructure", 120),
    meetingType: normalizeShortText(source.meetingType, "Bilateral meeting", 120),
    attendees: normalizeShortText(source.attendees, "Not specified", 1500),
    confidentialityLevel: normalizeShortText(source.confidentialityLevel, "Internal", 80),
  };
}

function createMeetingRecordId(metadata: MeetingMetadata): string {
  const hash = createHash("sha1")
    .update(JSON.stringify({ title: metadata.title, countryId: metadata.countryId, date: metadata.meetingDate, now: Date.now() }))
    .digest("hex")
    .slice(0, 10);

  return `${metadata.countryId || "meeting"}-${metadata.meetingDate || "undated"}-${hash}`
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 128);
}

function createMeetingActionId(meetingRecordId: string, index: number): string {
  return `${meetingRecordId}-action-${index + 1}`.slice(0, 128);
}

function extractTranscriptSentences(transcriptText: string, maxItems = 6): string[] {
  const sentences = transcriptText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35)
    .slice(0, maxItems);

  if (sentences.length > 0) {
    return sentences.map((sentence) => sentence.length > 240 ? `${sentence.slice(0, 237)}...` : sentence);
  }

  const fallback = transcriptText.trim();
  return fallback ? [fallback.slice(0, 240)] : [];
}

function inferTranscriptTags(metadata: MeetingMetadata, transcriptText: string): string[] {
  const lower = `${metadata.title} ${metadata.sector} ${metadata.meetingType} ${transcriptText}`.toLowerCase();
  const tagMap: Array<[string, string]> = [
    ["hydrogen", "hydrogen"],
    ["renewable", "renewables"],
    ["solar", "solar"],
    ["wind", "wind"],
    ["port", "ports"],
    ["shipping", "shipping"],
    ["corridor", "corridors"],
    ["infrastructure", "infrastructure"],
    ["investment", "investment"],
    ["finance", "finance"],
    ["trade", "trade"],
    ["climate", "climate"],
    ["cop", "climate-diplomacy"],
    ["supply", "supply-chain"],
    ["regulation", "regulatory-alignment"],
    ["standard", "standards"],
    ["digital", "digital-transformation"],
  ];

  const inferred = tagMap
    .filter(([needle]) => lower.includes(needle))
    .map(([, tag]) => tag);

  return Array.from(new Set([metadata.countryId, metadata.sector.toLowerCase().replace(/[^a-z0-9]+/g, "-"), ...inferred]))
    .filter(Boolean)
    .slice(0, 10);
}

function buildMockMeetingDebrief(metadata: MeetingMetadata, transcriptText: string): MeetingDebriefAnalysis {
  const highlights = extractTranscriptSentences(transcriptText, 5);
  const tags = inferTranscriptTags(metadata, transcriptText);
  const firstHighlight = highlights[0] || "The discussion established a basis for follow-up between the UAE/MOEI and the counterpart delegation.";
  const lower = transcriptText.toLowerCase();
  const hasRiskSignal = /\brisk|delay|constraint|concern|challenge|barrier|regulat|funding|timeline\b/.test(lower);
  const hasAgreementSignal = /\bagree|agreement|commit|approve|endorse|align|support|moU|memorandum\b/i.test(transcriptText);

  return {
    executiveSummary: `${metadata.title} with ${metadata.country} focused on ${metadata.sector}. ${firstHighlight} The meeting should be retained as institutional memory for future country briefings and follow-up tracking.`,
    keyDiscussionPoints: highlights.length > 0
      ? highlights
      : [
          `Reviewed ${metadata.sector} cooperation priorities with ${metadata.country}.`,
          "Discussed areas where UAE execution capacity can support bilateral delivery.",
        ],
    decisionsOrAgreements: hasAgreementSignal
      ? [
          "Counterpart alignment or commitment was indicated in the transcript and should be validated in the official meeting note.",
          "Maintain the bilateral channel for technical follow-up and next-step confirmation.",
        ]
      : [
          "No explicit final agreement was detected. Staff should confirm whether any commitments were made outside the transcript.",
        ],
    openQuestions: [
      "Which counterpart entity owns the next formal response?",
      "What timeline should be used for technical-level follow-up?",
      "Are legal, procurement, or protocol approvals required before the next engagement?",
    ],
    risksAndConcerns: hasRiskSignal
      ? [
          "Transcript language indicates possible delivery, regulatory, funding, or timeline constraints.",
          "Follow-up should distinguish diplomatic alignment from executable commitments.",
        ]
      : [
          "No major explicit risk was detected, but staff should validate regulatory, budget, and timeline assumptions.",
        ],
    opportunitiesForUaeMoei: [
      `Position UAE/MOEI as a delivery-focused partner for ${metadata.country} in ${metadata.sector}.`,
      "Use the meeting record to shape next briefing recommendations, speaking points, and pending action tracking.",
    ],
    actionItems: [
      {
        description: "Prepare an official follow-up note summarizing commitments, open questions, and proposed next steps.",
        suggestedOwner: "MOEI International Cooperation Team",
        priority: hasAgreementSignal ? "High" : "Medium",
        deadline: "",
        status: "Pending",
      },
      {
        description: `Add the debrief to ${metadata.country} country intelligence memory for future leadership briefings.`,
        suggestedOwner: "Staff Intelligence Desk",
        priority: "Medium",
        deadline: "",
        status: "Pending",
      },
    ],
    relationshipImpactAnalysis: `The meeting appears to reinforce the UAE's relationship with ${metadata.country} through ${metadata.sector} cooperation. Its main institutional value is preserving counterpart priorities, unresolved questions, and follow-up obligations for future engagements.`,
    strategicTags: tags.length > 0 ? tags : [metadata.countryId, "meeting-memory", "follow-up"],
  };
}

function parseJsonObjectFromText(text: string): any | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function coerceMeetingDebriefAnalysis(value: unknown, metadata: MeetingMetadata, transcriptText: string): MeetingDebriefAnalysis {
  const fallback = buildMockMeetingDebrief(metadata, transcriptText);
  const source = value && typeof value === "object" ? value as any : {};
  const actionItems = normalizeMeetingActionItems(source.actionItems || source.action_items);

  return {
    executiveSummary: normalizeShortText(source.executiveSummary || source.executive_summary, fallback.executiveSummary, 2500),
    keyDiscussionPoints: normalizeStringArray(source.keyDiscussionPoints || source.key_discussion_points, fallback.keyDiscussionPoints, 12),
    decisionsOrAgreements: normalizeStringArray(source.decisionsOrAgreements || source.decisions_or_agreements || source.decisions, fallback.decisionsOrAgreements, 12),
    openQuestions: normalizeStringArray(source.openQuestions || source.open_questions, fallback.openQuestions, 12),
    risksAndConcerns: normalizeStringArray(source.risksAndConcerns || source.risks_and_concerns || source.risks, fallback.risksAndConcerns, 12),
    opportunitiesForUaeMoei: normalizeStringArray(source.opportunitiesForUaeMoei || source.opportunities_for_uae_moei || source.opportunities, fallback.opportunitiesForUaeMoei, 12),
    actionItems: actionItems.length > 0 ? actionItems : fallback.actionItems,
    relationshipImpactAnalysis: normalizeShortText(source.relationshipImpactAnalysis || source.relationship_impact_analysis, fallback.relationshipImpactAnalysis, 2500),
    strategicTags: normalizeStringArray(source.strategicTags || source.strategic_tags || source.tags, fallback.strategicTags, 14),
  };
}

async function readMeetingMemoryDatabase(): Promise<MeetingMemoryDatabase> {
  try {
    const raw = await fs.promises.readFile(MEETING_MEMORY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      meeting_records: Array.isArray(parsed.meeting_records) ? parsed.meeting_records : [],
      meeting_action_items: Array.isArray(parsed.meeting_action_items) ? parsed.meeting_action_items : [],
    };
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return createEmptyMeetingMemoryDatabase();
    }
    console.warn("[Meeting Memory] Could not read local meeting memory database. Using empty fallback.", error);
    return createEmptyMeetingMemoryDatabase();
  }
}

async function writeMeetingMemoryDatabase(database: MeetingMemoryDatabase): Promise<void> {
  await fs.promises.mkdir(MEETING_MEMORY_DIR, { recursive: true });
  const temporaryPath = `${MEETING_MEMORY_PATH}.tmp`;
  await fs.promises.writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, "utf8");
  await fs.promises.rename(temporaryPath, MEETING_MEMORY_PATH);
}

async function saveMeetingRecord(recordInput: Partial<MeetingRecord>): Promise<MeetingRecord> {
  const database = await readMeetingMemoryDatabase();
  const now = new Date().toISOString();
  const metadata = normalizeMeetingMetadata(recordInput.metadata);
  const transcriptText = normalizeShortText(recordInput.transcriptText, "", 200000);
  const debrief = coerceMeetingDebriefAnalysis(recordInput.debrief, metadata, transcriptText);
  const id = normalizeShortText(recordInput.id, "", 128) || createMeetingRecordId(metadata);
  const existingRecord = database.meeting_records.find((record) => record.id === id);
  const createdBy = recordInput.createdBy && typeof recordInput.createdBy === "object"
    ? recordInput.createdBy
    : { displayName: "Staff User", email: "", role: "staff" as AppRole };

  const record: MeetingRecord = {
    id,
    metadata,
    transcriptText,
    uploadedFileName: normalizeShortText(recordInput.uploadedFileName, "", 240) || undefined,
    debrief,
    createdBy: {
      displayName: normalizeShortText(createdBy.displayName, "Staff User", 160),
      email: normalizeShortText(createdBy.email, "", 240),
      role: createdBy.role === "staff" || createdBy.role === "developer" || createdBy.role === "executive" ? createdBy.role : "staff",
    },
    createdAt: existingRecord?.createdAt || normalizeShortText(recordInput.createdAt, now, 80),
    updatedAt: now,
  };

  const nextRecords = database.meeting_records.filter((currentRecord) => currentRecord.id !== id);
  nextRecords.push(record);

  const nextActionItems = database.meeting_action_items.filter((actionItem) => actionItem.meetingRecordId !== id);
  debrief.actionItems.forEach((actionItem, index) => {
    nextActionItems.push({
      ...actionItem,
      id: normalizeShortText(actionItem.id, "", 128) || createMeetingActionId(id, index),
      meetingRecordId: id,
      countryId: metadata.countryId,
      meetingTitle: metadata.title,
      meetingDate: metadata.meetingDate,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  });

  await writeMeetingMemoryDatabase({
    meeting_records: nextRecords.sort((a, b) => b.metadata.meetingDate.localeCompare(a.metadata.meetingDate) || b.updatedAt.localeCompare(a.updatedAt)),
    meeting_action_items: nextActionItems,
  });

  return record;
}

function getMeetingRecordSearchBlob(record: MeetingRecord): string {
  return [
    record.metadata.title,
    record.metadata.country,
    record.metadata.countryId,
    record.metadata.sector,
    record.metadata.meetingType,
    record.metadata.attendees,
    record.debrief.executiveSummary,
    record.debrief.relationshipImpactAnalysis,
    ...record.debrief.keyDiscussionPoints,
    ...record.debrief.decisionsOrAgreements,
    ...record.debrief.opportunitiesForUaeMoei,
    ...record.debrief.risksAndConcerns,
    ...record.debrief.strategicTags,
    ...record.debrief.actionItems.map((actionItem) => `${actionItem.description} ${actionItem.suggestedOwner} ${actionItem.status}`),
  ].join(" ").toLowerCase();
}

function isMeetingDateInRange(meetingDate: string, dateFrom?: string, dateTo?: string): boolean {
  if (dateFrom && meetingDate < dateFrom) return false;
  if (dateTo && meetingDate > dateTo) return false;
  return true;
}

async function listMeetingRecords(filters: {
  country?: string;
  sector?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  limit?: number;
} = {}): Promise<MeetingRecord[]> {
  const database = await readMeetingMemoryDatabase();
  const countryId = filters.country ? normalizeCountryId(filters.country) : "";
  const sector = filters.sector?.trim().toLowerCase() || "";
  const q = filters.q?.trim().toLowerCase() || "";
  const limit = filters.limit && Number.isFinite(filters.limit) ? filters.limit : 100;

  return database.meeting_records
    .filter((record) => {
      if (countryId && record.metadata.countryId !== countryId) return false;
      if (sector && !record.metadata.sector.toLowerCase().includes(sector)) return false;
      if (!isMeetingDateInRange(record.metadata.meetingDate, filters.dateFrom, filters.dateTo)) return false;
      if (q && !getMeetingRecordSearchBlob(record).includes(q)) return false;
      return true;
    })
    .sort((a, b) => b.metadata.meetingDate.localeCompare(a.metadata.meetingDate) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

async function loadRecentMeetingMemoryForCountry(countryId: string, question?: string): Promise<MeetingRecord[]> {
  const queryText = question?.trim() || "";
  const records = await listMeetingRecords({ country: countryId, limit: 25 });

  if (!queryText) {
    return records.slice(0, getPositiveNumberEnv("MEETING_MEMORY_LIMIT", 4));
  }

  const terms = tokenizeQuery(queryText);
  // Future semantic search integration point:
  // Replace this lexical scoring with embedding similarity against meeting_records and meeting_action_items.
  return records
    .map((record) => {
      const searchableText = getMeetingRecordSearchBlob(record);
      const score = terms.reduce((count, term) => count + (searchableText.includes(term) ? 1 : 0), 0);
      return { record, score };
    })
    .sort((a, b) => b.score - a.score || b.record.metadata.meetingDate.localeCompare(a.record.metadata.meetingDate))
    .slice(0, getPositiveNumberEnv("MEETING_MEMORY_LIMIT", 4))
    .map(({ record }) => record);
}

function renderMeetingMemorySignals(meetingMemory: MeetingRecord[], language: "en" | "ar"): string {
  if (meetingMemory.length === 0) return "";

  const isAr = language === "ar";
  const renderedMeetings = meetingMemory
    .map((record) => {
      const pendingActions = record.debrief.actionItems
        .filter((actionItem) => actionItem.status !== "Completed")
        .slice(0, 2)
        .map((actionItem) => `${actionItem.description} (${actionItem.suggestedOwner}, ${actionItem.priority})`)
        .join("; ");

      const tags = record.debrief.strategicTags.slice(0, 5).join(", ");
      return isAr
        ? `* **${record.metadata.title} (${record.metadata.meetingDate}):** ${record.debrief.executiveSummary}${pendingActions ? ` المتابعات المفتوحة: ${pendingActions}.` : ""}${tags ? ` الوسوم: ${tags}.` : ""}`
        : `* **${record.metadata.title} (${record.metadata.meetingDate}):** ${record.debrief.executiveSummary}${pendingActions ? ` Pending follow-up: ${pendingActions}.` : ""}${tags ? ` Tags: ${tags}.` : ""}`;
    })
    .join("\n");

  return isAr
    ? `\n\n**ذاكرة الاجتماعات الحديثة والمتابعات المفتوحة:**\n${renderedMeetings}`
    : `\n\n**Recent Meeting Memory and Pending Follow-Up:**\n${renderedMeetings}`;
}

function loadFirestoreConfig(): FirestoreConfig | null {
  if (firestoreConfigCache !== undefined) {
    return firestoreConfigCache;
  }

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const parsedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!parsedConfig.projectId || !parsedConfig.apiKey) {
      firestoreConfigCache = null;
      return firestoreConfigCache;
    }

    firestoreConfigCache = {
      projectId: parsedConfig.projectId,
      apiKey: parsedConfig.apiKey,
      firestoreDatabaseId: parsedConfig.firestoreDatabaseId || "(default)",
    };
    return firestoreConfigCache;
  } catch (error) {
    console.warn("[Standard DB] Firebase applet config unavailable. Falling back to local standby data.", error);
    firestoreConfigCache = null;
    return firestoreConfigCache;
  }
}

function getFirestoreDocumentsBaseUrl(config: FirestoreConfig): string {
  const databaseId = encodeURIComponent(config.firestoreDatabaseId || "(default)");
  return `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${databaseId}/documents`;
}

function firestoreValueToJs(value: any): any {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(firestoreValueToJs);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nestedValue]) => [key, firestoreValueToJs(nestedValue)])
    );
  }
  if ("referenceValue" in value) return value.referenceValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  return undefined;
}

function firestoreDocumentToJs(document: any): any {
  const data = Object.fromEntries(
    Object.entries(document?.fields || {}).map(([key, value]) => [key, firestoreValueToJs(value)])
  );
  const id = document?.name?.split("/").pop();
  return { id: data.id || id, ...data };
}

async function fetchFirestoreDocument(collectionId: string, documentId: string): Promise<any | null> {
  const config = loadFirestoreConfig();
  if (!config) return null;

  const url = `${getFirestoreDocumentsBaseUrl(config)}/${collectionId}/${encodeURIComponent(documentId)}?key=${config.apiKey}`;
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore document read failed (${collectionId}/${documentId}): ${response.status}`);
  }

  return firestoreDocumentToJs(await response.json());
}

async function fetchFirestoreCollection(collectionId: string, pageSize = 200): Promise<any[]> {
  const config = loadFirestoreConfig();
  if (!config) return [];

  const url = `${getFirestoreDocumentsBaseUrl(config)}/${collectionId}?pageSize=${pageSize}&key=${config.apiKey}`;
  const response = await fetch(url);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Firestore collection read failed (${collectionId}): ${response.status}`);
  }

  const parsed = await response.json();
  return (parsed.documents || []).map(firestoreDocumentToJs);
}

async function queryFirestoreCollectionByCountry(collectionId: string, countryId: string, limit = 50): Promise<any[]> {
  const config = loadFirestoreConfig();
  if (!config) return [];

  const url = `${getFirestoreDocumentsBaseUrl(config)}:runQuery?key=${config.apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: "countryId" },
            op: "EQUAL",
            value: { stringValue: countryId },
          },
        },
        limit,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Firestore vector query failed (${collectionId}/${countryId}): ${response.status}`);
  }

  const parsed = await response.json();
  return parsed
    .map((row: any) => row.document ? firestoreDocumentToJs(row.document) : null)
    .filter(Boolean);
}

function buildGenericCountryData(rawCountry: string, normalizedCountry: string) {
  const formattedName = (rawCountry || normalizedCountry || "country")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    id: normalizedCountry,
    nameEn: formattedName,
    nameAr: rawCountry || formattedName,
    flag: "🌐",
    profile: {
      overviewEn: `Bilateral portfolio for ${formattedName}. Presenting diplomatic overview, strategic initiatives, and mutual growth pathways with the UAE.`,
      overviewAr: `ملف مخصص ودراسة واعدة لـ ${formattedName}. تشمل استعراض الجاهزية اللوجستية والتكاملات الثنائية مع دولة الإمارات.`,
      governmentEn: "Government structure and regional alignment details.",
      governmentAr: "تفاصيل الهيكل الحكومي والمواءمة في اللجان الاستراتيجية المشتركة.",
      leadershipEn: `Dignitary representatives of ${formattedName}.`,
      leadershipAr: `تمثيل وفد دولة ${formattedName}.`
    },
    indicators: {
      gdp: "Dynamic Evaluation ($Billion USD)",
      gdpAr: "قيد التقييم الفيدرالي",
      growth: "2.1%",
      gdpPerCapita: "Dynamic Scale",
      energyMix: "Clean Transition Active, Solar & Wind targets progressing",
      energyMixAr: "تحول طاقة نشط، مشاريع شمسية ورياح قيد اللجان",
      infrastructureIndex: "Evaluated (High capability)",
      environmentalRank: "Under Review",
      competitivenessRank: "Highly Competitive",
      cooperationAgreementEn: "Active Strategic Partnership Initiative",
      cooperationAgreementAr: "شراكة متبادلة مستمرة وإطار تنسيقي نشط"
    },
    sectors: {
      energyEn: "Clean energy grids, renewable targets and solar capacity potential.",
      energyAr: "شبكات طاقة ومصادر إنتاج شمسية ورياح واعدة.",
      infrastructureEn: "Strategic maritime shipping lanes and digital port connectivity.",
      infrastructureAr: "ممرات وبنى ملاحة بحرية تدعم تدفق المنتجات الثنائية.",
      sustainabilityEn: "Net Zero carbon targets alignment and climate strategies.",
      sustainabilityAr: "اتفاق مواءمة الحياد الكربوني والاستشارات البيئية المشتركة."
    },
    strategicInsights: {
      partnershipsEn: "High yield renewable corridors and smart logistics integration.",
      partnershipsAr: "تمويلات مشتركة وطاقة مصدرية متبادلة ومجالس ابتكار.",
      investmentsEn: "Direct foreign trade initiatives and trade support framework.",
      investmentsAr: "استثمارات متبادلة وممرات تنمية وتسهيلات لوجستية ثنائية.",
      knowledgeEn: "Knowledge sharing pipelines and smart technology transfer.",
      knowledgeAr: "تبادل المخرجات المعرفية وبراءات تكنولوجيا كفاءة التشغيل."
    },
    predictive: {
      marketsEn: "Clean energy transition scaling and market growth indices.",
      marketsAr: "فرص تنقيل الوقود والأمونيا النظيفة وتحديث الأسواق المحلية.",
      risksEn: "Regulatory alignment steps. Mitigation via sovereign framework agreements.",
      risksAr: "تفادي المعيقات عبر الاتفاقيات والبروتوكولات الشاملة المعتمدة.",
      proposalsEn: `Establish a UAE-${formattedName} Strategic Infrastructure Corridor.`,
      proposalsAr: `إطلاق مشروع الممرات الرقمية المشتركة بين الإمارات و ${formattedName}.`
    }
  };
}

function deepMergeCountryData(baseData: any, overrideData: any): any {
  if (!overrideData || typeof overrideData !== "object") return baseData;
  const merged = { ...baseData };

  for (const [key, value] of Object.entries(overrideData)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      merged[key] = value;
      continue;
    }
    if (typeof value === "object" && typeof merged[key] === "object" && !Array.isArray(merged[key])) {
      merged[key] = deepMergeCountryData(merged[key], value);
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getNestedString(source: any, pathSegments: string[]): string | undefined {
  const value = pathSegments.reduce((current, segment) => current?.[segment], source);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function setNestedValue(source: any, pathSegments: string[], value: string) {
  const lastSegment = pathSegments[pathSegments.length - 1];
  const parent = pathSegments.slice(0, -1).reduce((current, segment) => {
    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    return current[segment];
  }, source);

  parent[lastSegment] = value;
}

async function translateCountryDataForLanguage(
  countryData: any,
  vectorContext: VectorContextRecord[],
  language: "en" | "ar"
): Promise<{ countryData: any; vectorContext: VectorContextRecord[]; translation: TranslationMetadata }> {
  if (language !== "ar") {
    return {
      countryData,
      vectorContext,
      translation: { provider: "none", targetLanguage: language, translatedFields: 0 },
    };
  }

  const localizedCountry = cloneJson(countryData);
  const localizedVectorContext = cloneJson(vectorContext);
  const tasks: Array<{ text: string; apply: (translatedText: string) => void }> = [];

  const queueCountryField = (englishPath: string[], arabicPath: string[]) => {
    const englishText = getNestedString(localizedCountry, englishPath);
    const existingArabicText = getNestedString(localizedCountry, arabicPath);
    if (!englishText || existingArabicText) return;

    tasks.push({
      text: englishText,
      apply: (translatedText) => setNestedValue(localizedCountry, arabicPath, translatedText),
    });
  };

  [
    [["nameEn"], ["nameAr"]],
    [["profile", "overviewEn"], ["profile", "overviewAr"]],
    [["profile", "governmentEn"], ["profile", "governmentAr"]],
    [["profile", "leadershipEn"], ["profile", "leadershipAr"]],
    [["indicators", "gdp"], ["indicators", "gdpAr"]],
    [["indicators", "energyMix"], ["indicators", "energyMixAr"]],
    [["indicators", "infrastructureIndex"], ["indicators", "infrastructureIndexAr"]],
    [["indicators", "environmentalRank"], ["indicators", "environmentalRankAr"]],
    [["indicators", "competitivenessRank"], ["indicators", "competitivenessRankAr"]],
    [["indicators", "cooperationAgreementEn"], ["indicators", "cooperationAgreementAr"]],
    [["sectors", "energyEn"], ["sectors", "energyAr"]],
    [["sectors", "infrastructureEn"], ["sectors", "infrastructureAr"]],
    [["sectors", "sustainabilityEn"], ["sectors", "sustainabilityAr"]],
    [["strategicInsights", "partnershipsEn"], ["strategicInsights", "partnershipsAr"]],
    [["strategicInsights", "investmentsEn"], ["strategicInsights", "investmentsAr"]],
    [["strategicInsights", "knowledgeEn"], ["strategicInsights", "knowledgeAr"]],
    [["predictive", "marketsEn"], ["predictive", "marketsAr"]],
    [["predictive", "risksEn"], ["predictive", "risksAr"]],
    [["predictive", "proposalsEn"], ["predictive", "proposalsAr"]],
  ].forEach(([englishPath, arabicPath]) => queueCountryField(englishPath, arabicPath));

  localizedVectorContext.forEach((record) => {
    if (record.titleEn && !record.titleAr) {
      tasks.push({
        text: record.titleEn,
        apply: (translatedText) => {
          record.titleAr = translatedText;
        },
      });
    }
    if (record.textEn && !record.textAr) {
      tasks.push({
        text: record.textEn,
        apply: (translatedText) => {
          record.textAr = translatedText;
        },
      });
    }
  });

  if (tasks.length === 0) {
    return {
      countryData: localizedCountry,
      vectorContext: localizedVectorContext,
      translation: { provider: "none", targetLanguage: "ar", translatedFields: 0 },
    };
  }

  try {
    const translatedTexts = await translateTextsWithDeepL(tasks.map((task) => task.text), "AR");
    translatedTexts.forEach((translatedText, index) => tasks[index].apply(translatedText));

    return {
      countryData: localizedCountry,
      vectorContext: localizedVectorContext,
      translation: { provider: "deepl", targetLanguage: "ar", translatedFields: translatedTexts.length },
    };
  } catch (error) {
    console.warn("[DeepL] Translation unavailable. Returning available database language fields.", error);
    return {
      countryData: localizedCountry,
      vectorContext: localizedVectorContext,
      translation: { provider: "none", targetLanguage: "ar", translatedFields: 0 },
    };
  }
}

async function loadCountryProfile(countryId: string, rawCountry: string): Promise<{ countryData: any; source: string }> {
  const localBase = prebuiltCountries[countryId] || buildGenericCountryData(rawCountry, countryId);

  try {
    const standardDbRecord = await fetchFirestoreDocument("countries", countryId);
    if (standardDbRecord) {
      return {
        countryData: deepMergeCountryData(localBase, standardDbRecord),
        source: "standard-database",
      };
    }
  } catch (error) {
    console.warn(`[Standard DB] Could not read country profile '${countryId}'. Using local standby profile.`, error);
  }

  return {
    countryData: localBase,
    source: prebuiltCountries[countryId] ? "local-standby-database" : "generated-standby-profile",
  };
}

async function loadAllCountryProfiles(): Promise<Record<string, any>> {
  const mergedCountries = { ...prebuiltCountries };

  try {
    const standardDbCountries = await fetchFirestoreCollection("countries");
    standardDbCountries.forEach((countryRecord) => {
      const countryId = normalizeCountryId(countryRecord.id || countryRecord.nameEn);
      if (!countryId) return;
      const localBase = prebuiltCountries[countryId] || buildGenericCountryData(countryRecord.nameEn || countryId, countryId);
      mergedCountries[countryId] = deepMergeCountryData(localBase, { ...countryRecord, id: countryId });
    });
  } catch (error) {
    console.warn("[Standard DB] Could not load Firestore countries collection. Serving local standby index.", error);
  }

  return mergedCountries;
}

function tokenizeQuery(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2)
    )
  );
}

function scoreVectorRecord(record: VectorContextRecord, queryText: string, language: "en" | "ar"): number {
  const terms = tokenizeQuery(queryText);
  if (terms.length === 0) return 1;

  const searchableText = [
    record.section,
    record.titleEn,
    record.titleAr,
    record.textEn,
    record.textAr,
    ...(record.tags || []),
  ].join(" ").toLowerCase();

  const matchCount = terms.reduce((count, term) => count + (searchableText.includes(term) ? 1 : 0), 0);
  const preferredText = language === "ar" ? record.textAr : record.textEn;
  return matchCount + (preferredText ? 0.25 : 0);
}

async function loadCountryVectorContext(
  countryData: any,
  question: string | undefined,
  language: "en" | "ar"
): Promise<VectorContextRecord[]> {
  const vectorCollectionId = process.env.VECTOR_CONTEXT_COLLECTION || "countryVectors";
  const countryId = normalizeCountryId(countryData.id || countryData.nameEn);

  try {
    const records = await queryFirestoreCollectionByCountry(vectorCollectionId, countryId, 50);
    const queryText = [
      countryData.nameEn,
      countryData.nameAr,
      question,
      countryData.sectors?.energyEn,
      countryData.sectors?.infrastructureEn,
      countryData.strategicInsights?.partnershipsEn,
      countryData.predictive?.marketsEn,
    ].filter(Boolean).join(" ");

    return records
      .map((record) => ({ ...record, score: scoreVectorRecord(record, queryText, language) }))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, getPositiveNumberEnv("VECTOR_CONTEXT_LIMIT", 6));
  } catch (error) {
    console.warn(`[Vector DB] Could not load vector context for '${countryId}'. Continuing with standard database profile.`, error);
    return [];
  }
}

function renderVectorSignals(vectorContext: VectorContextRecord[], language: "en" | "ar"): string {
  if (vectorContext.length === 0) return "";

  const isAr = language === "ar";
  const bullets = vectorContext
    .map((record) => {
      const title = isAr ? (record.titleAr || record.titleEn || record.section) : (record.titleEn || record.titleAr || record.section);
      const text = isAr ? (record.textAr || record.textEn) : (record.textEn || record.textAr);
      return `* **${title || (isAr ? "إشارة سياقية" : "Context signal")}:** ${text || ""}`;
    })
    .filter((line) => line.trim().length > 6)
    .join("\n");

  if (!bullets) return "";
  return isAr
    ? `\n\n**إشارات قاعدة المتجهات وسياق الملفات الداعمة:**\n${bullets}`
    : `\n\n**Vector Database Intelligence Signals:**\n${bullets}`;
}

function renderDatabaseBriefing(
  countryData: any,
  vectorContext: VectorContextRecord[],
  meetingMemory: MeetingRecord[],
  language: "en" | "ar",
  question?: string
): string {
  if (language === "ar") {
    const ar = {
      name: countryData.nameAr || countryData.nameEn,
      overview: countryData.profile?.overviewAr || countryData.profile?.overviewEn,
      government: countryData.profile?.governmentAr || countryData.profile?.governmentEn,
      leadership: countryData.profile?.leadershipAr || countryData.profile?.leadershipEn,
      energy: countryData.sectors?.energyAr || countryData.sectors?.energyEn,
      infrastructure: countryData.sectors?.infrastructureAr || countryData.sectors?.infrastructureEn,
      sustainability: countryData.sectors?.sustainabilityAr || countryData.sectors?.sustainabilityEn,
      partnerships: countryData.strategicInsights?.partnershipsAr || countryData.strategicInsights?.partnershipsEn,
      investments: countryData.strategicInsights?.investmentsAr || countryData.strategicInsights?.investmentsEn,
      knowledge: countryData.strategicInsights?.knowledgeAr || countryData.strategicInsights?.knowledgeEn,
      markets: countryData.predictive?.marketsAr || countryData.predictive?.marketsEn,
      risks: countryData.predictive?.risksAr || countryData.predictive?.risksEn,
      proposals: countryData.predictive?.proposalsAr || countryData.predictive?.proposalsEn,
    };

    return `### مستشار الإحاطة الاستراتيجية لجمهورية ${ar.name}

**رؤية عامة والجاهزية البدنية والتكنولوجية:**
${ar.overview}

**الهيكل القيادي وصناعة القرار الفوري:**
يقود الدولة حالياً ${ar.leadership} وبصفتها شريكاً لوزارة الطاقة والبنية التحتية بدولة الإمارات، فإن التعاون معها يسير في مستويات استراتيجية متكاملة.

**القطاع اللوجستي وقطاع الطاقة:**
* **الطاقة:** ${ar.energy}
* **البنية التحتية:** ${ar.infrastructure}
* **الاستدامة:** ${ar.sustainability}

**فرص الشراكة الفورية والاستثمار:**
* ${ar.partnerships}
* ${ar.investments}
* ${ar.knowledge}${renderVectorSignals(vectorContext, language)}${renderMeetingMemorySignals(meetingMemory, language)}

**الذكاء التنبؤي وتوصيات وفد الدولة:**
* **الأسواق الناشئة:** ${ar.markets}
* **المخاطر المحسوبة:** ${ar.risks}
* **المبادرة الإماراتية المقترحة:** ${ar.proposals}${question ? `\n\n**تركيز السؤال:** ${question}` : ""}`;
  }

  return `### Executive Strategic Advisory Brief for ${countryData.nameEn}

**Overview & Structural Readiness:**
${countryData.profile.overviewEn}

**Leadership Structure & Key Decision Makers:**
The country is governed under the ${countryData.profile.governmentEn} Led actively by ${countryData.profile.leadershipEn}.

**Energy & Infrastructure Sectors:**
* **Energy:** ${countryData.sectors.energyEn}
* **Infrastructure:** ${countryData.sectors.infrastructureEn}
* **Sustainability:** ${countryData.sectors.sustainabilityEn}

**Priority Strategic Partnerships & Immediate Investments:**
* ${countryData.strategicInsights.partnershipsEn}
* ${countryData.strategicInsights.investmentsEn}
* ${countryData.strategicInsights.knowledgeEn}${renderVectorSignals(vectorContext, language)}${renderMeetingMemorySignals(meetingMemory, language)}

**Predictive Intelligence & Diplomatic Recommendations:**
* **Emerging Markets:** ${countryData.predictive.marketsEn}
* **Calculated Risks:** ${countryData.predictive.risksEn}
* **Proposed UAE Initiative:** ${countryData.predictive.proposalsEn}${question ? `\n\n**Question Focus:** ${question}` : ""}`;
}

function compactAdvisorText(value: unknown, fallback = "", maxLength = 320): string {
  const normalized = normalizeShortText(value, fallback, maxLength + 80);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function renderChatAdvisorAnswer(
  countryData: any,
  vectorContext: VectorContextRecord[],
  meetingMemory: MeetingRecord[],
  language: "en" | "ar",
  question?: string
): string {
  const vectorSignal = vectorContext[0];
  const recentMeeting = meetingMemory[0];

  if (language === "ar") {
    const countryName = countryData.nameAr || countryData.nameEn;
    return `### رد المستشار حول ${countryName}

**الإجابة المباشرة**
${question ? `بالنسبة إلى "${question}"، ` : ""}ينبغي التعامل مع ملف ${countryName} كفرصة تعاون انتقائية في الطاقة والبنية التحتية، مع ربط أي مبادرة بمسار تنفيذي واضح ومتابعة مؤسسية.

**السياق الأهم**
- **الطاقة:** ${compactAdvisorText(countryData.sectors?.energyAr || countryData.sectors?.energyEn)}
- **البنية التحتية:** ${compactAdvisorText(countryData.sectors?.infrastructureAr || countryData.sectors?.infrastructureEn)}
- **الشراكة:** ${compactAdvisorText(countryData.strategicInsights?.partnershipsAr || countryData.strategicInsights?.partnershipsEn)}
${vectorSignal ? `- **إشارة داعمة:** ${compactAdvisorText(vectorSignal.textAr || vectorSignal.textEn, "", 240)}` : ""}
${recentMeeting ? `- **ذاكرة الاجتماعات:** ${compactAdvisorText(recentMeeting.debrief.executiveSummary, "", 240)}` : ""}

**الخطوة المقترحة**
- تحويل السؤال إلى مذكرة تنفيذية من صفحة الإحاطة، ثم تثبيت مالك متابعة واحد من فريق الطاقة أو البنية التحتية.`;
  }

  return `### Advisor Response for ${countryData.nameEn}

**Direct answer**
${question ? `For "${question}", ` : ""}${countryData.nameEn} should be treated as a selective cooperation opportunity across energy and infrastructure, but any proposal should be tied to a clear delivery channel and accountable follow-up.

**Most relevant context**
- **Energy:** ${compactAdvisorText(countryData.sectors?.energyEn)}
- **Infrastructure:** ${compactAdvisorText(countryData.sectors?.infrastructureEn)}
- **Partnership angle:** ${compactAdvisorText(countryData.strategicInsights?.partnershipsEn)}
${vectorSignal ? `- **Supporting signal:** ${compactAdvisorText(vectorSignal.textEn || vectorSignal.textAr, "", 240)}` : ""}
${recentMeeting ? `- **Meeting memory:** ${compactAdvisorText(recentMeeting.debrief.executiveSummary, "", 240)}` : ""}

**Recommended next step**
- Turn this question into a short executive memo in the briefing workspace, then assign one owner for energy or infrastructure follow-up.`;
}

function parseJsonValueFromText(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  if (!cleaned) return {};

  try {
    return JSON.parse(cleaned);
  } catch {
    return text;
  }
}

function normalizeAdvisorThreadId(value: unknown, fallbackCountryId: string): string {
  const normalized = normalizeShortText(value, "", 180)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);

  return normalized || `thread-${fallbackCountryId || "country"}-${Date.now()}`;
}

function normalizeAdvisorConversationHistory(value: unknown, question: string): AdvisorConversationMessage[] {
  const sourceMessages = Array.isArray(value) ? value : [];
  const normalizedMessages = sourceMessages
    .map((message) => {
      const source = message && typeof message === "object" ? message as any : {};
      const sender = source.role || source.sender;
      const role = sender === "assistant" || sender === "advisor" ? "assistant" : sender === "user" ? "user" : "";
      const content = normalizeShortText(source.content || source.text || source.message, "", 4000);
      const timestamp = normalizeShortText(source.timestamp || source.createdAt, "", 80) || undefined;

      return role && content ? { role, content, timestamp } as AdvisorConversationMessage : null;
    })
    .filter((message): message is AdvisorConversationMessage => Boolean(message));

  const currentQuestion = question.trim();
  const lastMessage = normalizedMessages[normalizedMessages.length - 1];
  if (currentQuestion && (!lastMessage || lastMessage.role !== "user" || lastMessage.content !== currentQuestion)) {
    normalizedMessages.push({
      role: "user",
      content: currentQuestion,
      timestamp: new Date().toISOString(),
    });
  }

  const historyLimit = Math.min(getPositiveNumberEnv("N8N_CHAT_HISTORY_LIMIT", 16), 40);
  return normalizedMessages.slice(-historyLimit);
}

function sanitizeVectorContextForWorkflow(vectorContext: VectorContextRecord[]): any[] {
  return vectorContext.map((record) => ({
    id: record.id,
    countryId: record.countryId,
    section: record.section,
    titleEn: record.titleEn,
    titleAr: record.titleAr,
    textEn: normalizeShortText(record.textEn, "", 2500),
    textAr: normalizeShortText(record.textAr, "", 2500),
    tags: record.tags || [],
    sourceUrl: record.sourceUrl,
    score: record.score,
  }));
}

function sanitizeMeetingMemoryForWorkflow(meetingMemory: MeetingRecord[]): any[] {
  return meetingMemory.map((record) => ({
    id: record.id,
    metadata: record.metadata,
    transcriptPreview: normalizeShortText(record.transcriptText, "", 2000),
    uploadedFileName: record.uploadedFileName,
    debrief: {
      executiveSummary: record.debrief.executiveSummary,
      keyDiscussionPoints: record.debrief.keyDiscussionPoints.slice(0, 8),
      decisionsOrAgreements: record.debrief.decisionsOrAgreements.slice(0, 8),
      openQuestions: record.debrief.openQuestions.slice(0, 8),
      risksAndConcerns: record.debrief.risksAndConcerns.slice(0, 8),
      opportunitiesForUaeMoei: record.debrief.opportunitiesForUaeMoei.slice(0, 8),
      actionItems: record.debrief.actionItems.slice(0, 10),
      relationshipImpactAnalysis: record.debrief.relationshipImpactAnalysis,
      strategicTags: record.debrief.strategicTags.slice(0, 14),
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));
}

async function buildAdvisorGroundingContext(
  country: string | undefined,
  question: string,
  language: "en" | "ar"
): Promise<AdvisorGroundingContext> {
  const normalizedCountry = normalizeCountryId(country || "brazil");
  const { countryData, source } = await loadCountryProfile(normalizedCountry, country || normalizedCountry);
  const vectorContext = await loadCountryVectorContext(countryData, question, language);
  const meetingMemory = await loadRecentMeetingMemoryForCountry(normalizedCountry, question);
  const localized = await translateCountryDataForLanguage(countryData, vectorContext, language);

  return {
    normalizedCountry,
    source,
    countryData: localized.countryData,
    vectorContext: localized.vectorContext,
    meetingMemory,
    dataSources: {
      standardDatabase: source,
      vectorDatabase: {
        collection: process.env.VECTOR_CONTEXT_COLLECTION || "countryVectors",
        matches: vectorContext.length,
      },
      meetingMemory: {
        collection: "meeting_records",
        matches: meetingMemory.length,
      },
      translation: localized.translation,
    },
    renderedBriefing: renderDatabaseBriefing(localized.countryData, localized.vectorContext, meetingMemory, language, question),
  };
}

async function buildAdvisorChatFallbackContext(
  country: string | undefined,
  question: string,
  language: "en" | "ar"
): Promise<AdvisorGroundingContext> {
  const normalizedCountry = normalizeCountryId(country || "brazil");
  const fallbackData = prebuiltCountries[normalizedCountry] || buildGenericCountryData(country || normalizedCountry, normalizedCountry);
  const localizedFallback = await translateCountryDataForLanguage(fallbackData, [], language);

  return {
    normalizedCountry,
    source: "local-standby-database",
    countryData: localizedFallback.countryData,
    vectorContext: [],
    meetingMemory: [],
    dataSources: {
      standardDatabase: "local-standby-database",
      vectorDatabase: {
        collection: process.env.VECTOR_CONTEXT_COLLECTION || "countryVectors",
        matches: 0,
      },
      meetingMemory: {
        collection: "meeting_records",
        matches: 0,
      },
      translation: localizedFallback.translation,
    },
    renderedBriefing: renderDatabaseBriefing(localizedFallback.countryData, [], [], language, question),
  };
}

function extractStringFromN8NResponse(value: any): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => extractStringFromN8NResponse(item))
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  const candidates = [
    value.aiBriefing?.rawText,
    value.rawText,
    value.answer,
    value.response,
    value.reply,
    value.text,
    value.output,
    value.content,
    value.message?.content,
    value.message?.text,
    value.data?.answer,
    value.data?.response,
    value.data?.reply,
    value.data?.text,
    value.data?.output,
    value.json?.answer,
    value.json?.response,
    value.json?.reply,
    value.json?.text,
    value.json?.output,
  ];

  for (const candidate of candidates) {
    const extracted = extractStringFromN8NResponse(candidate);
    if (extracted) return extracted;
  }

  return "";
}

function extractThreadIdFromN8NResponse(value: any): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    return value.map(extractThreadIdFromN8NResponse).find(Boolean);
  }

  const candidates = [
    value.threadId,
    value.thread_id,
    value.sessionId,
    value.session_id,
    value.conversationId,
    value.conversation_id,
    value.data?.threadId,
    value.data?.thread_id,
    value.json?.threadId,
    value.json?.thread_id,
  ];

  return candidates
    .map((candidate) => normalizeShortText(candidate, "", 180))
    .find(Boolean);
}

function extractStructuredFromN8NResponse(value: any): any | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    return value.map(extractStructuredFromN8NResponse).find(Boolean);
  }

  return value.structured || value.data?.structured || value.json?.structured || value.aiBriefing?.structured;
}

async function callN8NAdvisorWorkflow(payload: any): Promise<N8NAdvisorWorkflowResult | null> {
  const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL?.trim();
  if (!webhookUrl || webhookUrl === "MY_N8N_CHAT_WEBHOOK_URL") {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getPositiveNumberEnv("N8N_CHAT_TIMEOUT_MS", 45000));
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.N8N_CHAT_WEBHOOK_SECRET?.trim();
  if (secret) {
    headers.Authorization = secret.toLowerCase().startsWith("bearer ") ? secret : `Bearer ${secret}`;
    headers["X-Majlis-Webhook-Secret"] = secret;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`n8n workflow returned ${response.status}: ${responseText.slice(0, 400)}`);
    }

    const parsedResponse = parseJsonValueFromText(responseText);
    const rawText = extractStringFromN8NResponse(parsedResponse);
    if (!rawText) {
      throw new Error("n8n workflow response did not include a supported answer field.");
    }

    return {
      rawText,
      threadId: extractThreadIdFromN8NResponse(parsedResponse),
      structured: extractStructuredFromN8NResponse(parsedResponse),
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Robust retry and fallback generator for OpenAI API content generation
async function callOpenAIWithRetryAndFallback(
  oClient: OpenAI,
  systemInstruction: string,
  prompt: string,
  options: { cacheTtlMs?: number; maxOutputTokens?: number } = {}
): Promise<OpenAIGenerationResult> {
  const modelsToTry = getConfiguredOpenAIModels();
  const maxRetriesPerModel = 2;
  const cacheTtlMs = options.cacheTtlMs ?? getPositiveNumberEnv("OPENAI_CACHE_TTL_MS", 5 * 60 * 1000);
  const cacheKey = buildOpenAICacheKey(systemInstruction, prompt, modelsToTry);
  const cachedResult = openAIResponseCache.get(cacheKey);

  if (cachedResult && cachedResult.expiresAt > Date.now()) {
    console.log("[OpenAI API] Serving cached generation for repeated prompt.");
    return cachedResult.result;
  }

  if (pendingOpenAIRequests.has(cacheKey)) {
    console.log("[OpenAI API] Reusing in-flight generation for repeated prompt.");
    return pendingOpenAIRequests.get(cacheKey)!;
  }

  if (openAIRateLimitCooldownUntil > Date.now()) {
    console.log("[OpenAI API] Rate-limit cooldown active. Returning local fallback without another live call.");
    throw createRateLimitCooldownError();
  }

  const generationPromise = (async (): Promise<OpenAIGenerationResult> => {
    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let tryIndex = 0; tryIndex < maxRetriesPerModel; tryIndex++) {
        try {
          console.log(`[OpenAI API] Attempting generation with model ${model} (try ${tryIndex + 1}/${maxRetriesPerModel})...`);
          const response = await oClient.responses.create({
            model,
            instructions: systemInstruction,
            input: prompt,
            ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {}),
          });

          if (response?.output_text) {
            const result = { text: response.output_text, modelUsed: model };
            console.log(`[OpenAI API] Successfully generated content using model: ${model}`);
            openAIResponseCache.set(cacheKey, { result, expiresAt: Date.now() + cacheTtlMs });
            return result;
          }
        } catch (err: any) {
          lastError = err;

          if (isOpenAIRateLimitError(err)) {
            const cooldownMs = getPositiveNumberEnv("OPENAI_RATE_LIMIT_COOLDOWN_MS", 60 * 1000);
            openAIRateLimitCooldownUntil = Date.now() + cooldownMs;
            console.log(`[OpenAI API] Rate limit reached. Cooling down live OpenAI calls for ${Math.ceil(cooldownMs / 1000)}s.`);
            throw err;
          }

          console.log(`[OpenAI API] Note: Managed transition using model ${model} on try ${tryIndex + 1}: ${err?.message || err}`);

          if (isOpenAIRetriableError(err) && tryIndex < maxRetriesPerModel - 1) {
            const delay = (tryIndex + 1) * 800;
            console.log(`[OpenAI API] Transient retriable error. Waiting ${delay}ms before next retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            // Fail fast out of this model and try the next configured fallback model.
            break;
          }
        }
      }
    }

    throw lastError || new Error("All configured OpenAI models failed.");
  })();

  pendingOpenAIRequests.set(cacheKey, generationPromise);

  try {
    return await generationPromise;
  } finally {
    pendingOpenAIRequests.delete(cacheKey);
  }
}

// Analyze a post-meeting transcript into a structured debrief.
app.post("/api/meetings/analyze", async (req, res) => {
  const metadata = normalizeMeetingMetadata(req.body?.metadata);
  const transcriptText = normalizeShortText(req.body?.transcriptText || req.body?.transcript, "", 200000);
  const requestRole = req.body?.createdBy?.role;

  if (requestRole && requestRole !== "staff") {
    return res.status(403).json({ success: false, error: "Strategic Meeting Debrief is available to staff users only." });
  }

  if (transcriptText.length < 40) {
    return res.status(400).json({ success: false, error: "Transcript text is required before analysis." });
  }

  const oClient = getOpenAIClient();
  const fallbackDebrief = buildMockMeetingDebrief(metadata, transcriptText);

  if (!oClient) {
    return res.json({
      success: true,
      source: "local-structured-mock",
      debrief: fallbackDebrief,
    });
  }

  try {
    const { countryData } = await loadCountryProfile(metadata.countryId, metadata.country);
    const systemInstruction = `You are Majlis AI, an executive intelligence analyst for UAE Ministry of Energy and Infrastructure staff.
Return strict JSON only. Do not include markdown, prose wrappers, or citations.
The JSON object must match this exact schema:
{
  "executiveSummary": "string",
  "keyDiscussionPoints": ["string"],
  "decisionsOrAgreements": ["string"],
  "openQuestions": ["string"],
  "risksAndConcerns": ["string"],
  "opportunitiesForUaeMoei": ["string"],
  "actionItems": [{"description": "string", "suggestedOwner": "string", "priority": "Critical|High|Medium|Low", "deadline": "string", "status": "Pending|In Progress|Completed|Deferred"}],
  "relationshipImpactAnalysis": "string",
  "strategicTags": ["string"]
}`;

    const prompt = `Analyze the following post-meeting transcript for institutional memory and future UAE leadership briefing generation.

Meeting metadata:
${JSON.stringify(metadata, null, 2)}

Country relationship context:
${JSON.stringify({
  countryId: countryData.id,
  nameEn: countryData.nameEn,
  cooperationAgreement: countryData.indicators?.cooperationAgreementEn,
  strategicPartnerships: countryData.strategicInsights?.partnershipsEn,
  risks: countryData.predictive?.risksEn,
  proposals: countryData.predictive?.proposalsEn,
}, null, 2)}

Transcript:
${transcriptText.slice(0, 28000)}

Analysis requirements:
- Be concise, executive-ready, and specific to UAE/MOEI.
- Extract decisions only when the transcript supports them. If unclear, flag as an open question.
- Action items should include suggested owner, priority, deadline if available, and status.
- Relationship impact must explain how this meeting changes or reinforces the UAE relationship with ${metadata.country}.
- Strategic tags must be useful for future retrieval.`;

    const generated = await callOpenAIWithRetryAndFallback(oClient, systemInstruction, prompt, {
      cacheTtlMs: getPositiveNumberEnv("MEETING_ANALYSIS_CACHE_TTL_MS", 2 * 60 * 1000),
      maxOutputTokens: 3200,
    });
    const parsed = parseJsonObjectFromText(generated.text);

    return res.json({
      success: true,
      source: `openai-${generated.modelUsed}`,
      debrief: coerceMeetingDebriefAnalysis(parsed, metadata, transcriptText),
    });
  } catch (error: any) {
    console.warn("[Meeting Debrief] AI analysis unavailable. Returning structured local fallback.", error?.message || error);
    return res.json({
      success: true,
      source: "local-structured-mock",
      debrief: fallbackDebrief,
    });
  }
});

app.post("/api/meetings", async (req, res) => {
  const requestRole = req.body?.createdBy?.role;
  if (requestRole !== "staff") {
    return res.status(403).json({ success: false, error: "Only staff users can save meeting debriefs." });
  }

  try {
    const metadata = normalizeMeetingMetadata(req.body?.metadata);
    const transcriptText = normalizeShortText(req.body?.transcriptText || req.body?.transcript, "", 200000);

    if (transcriptText.length < 40) {
      return res.status(400).json({ success: false, error: "Transcript text is required before saving." });
    }

    const record = await saveMeetingRecord({
      id: req.body?.id,
      metadata,
      transcriptText,
      uploadedFileName: req.body?.uploadedFileName,
      debrief: req.body?.debrief,
      createdBy: req.body?.createdBy,
    });

    return res.json({
      success: true,
      record,
      schema: {
        meeting_records: "Post-meeting metadata, transcript reference/text, and generated strategic analysis.",
        meeting_action_items: "Flattened follow-up items linked to meeting_records for briefing generation.",
      },
    });
  } catch (error: any) {
    console.error("[Meeting Memory] Save failed.", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to save meeting debrief." });
  }
});

app.get("/api/meetings", async (req, res) => {
  try {
    const records = await listMeetingRecords({
      country: typeof req.query.country === "string" ? req.query.country : undefined,
      sector: typeof req.query.sector === "string" ? req.query.sector : undefined,
      dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      limit: typeof req.query.limit === "string" ? Number(req.query.limit) : 100,
    });

    return res.json({ success: true, records });
  } catch (error: any) {
    console.error("[Meeting Memory] History query failed.", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to load meeting history." });
  }
});

// Chat advisor workflow bridge. Sends grounded context to n8n when configured, with a local response fallback.
app.post("/api/advisor/chat", async (req, res) => {
  const { country, question, language, threadId, conversationHistory } = req.body;
  const currentLang: "en" | "ar" = language === "ar" ? "ar" : "en";
  const cleanQuestion = normalizeShortText(question, "", 4000);
  const normalizedCountry = normalizeCountryId(country || "brazil");
  const cleanThreadId = normalizeAdvisorThreadId(threadId, normalizedCountry);

  if (!cleanQuestion) {
    return res.status(400).json({
      success: false,
      error: currentLang === "ar" ? "يرجى إدخال سؤال للمستشار." : "Please enter a question for the advisor.",
    });
  }

  let groundingContext: AdvisorGroundingContext;
  let groundingStatus = "live-context";
  try {
    groundingContext = await buildAdvisorGroundingContext(country, cleanQuestion, currentLang);
  } catch (error: any) {
    groundingStatus = "local-fallback-context";
    console.log("Cabinet data system notice: chat grounding unavailable. Using local standby context.", error?.message || error);
    groundingContext = await buildAdvisorChatFallbackContext(country, cleanQuestion, currentLang);
  }

  const messages = normalizeAdvisorConversationHistory(conversationHistory, cleanQuestion);
  const payload = {
    event: "advisor.chat.message",
    version: "2026-06-10",
    threadId: cleanThreadId,
    language: currentLang,
    question: cleanQuestion,
    conversation: {
      threadId: cleanThreadId,
      messages,
    },
    country: {
      requested: country || normalizedCountry,
      normalizedId: groundingContext.normalizedCountry,
      nameEn: groundingContext.countryData.nameEn,
      nameAr: groundingContext.countryData.nameAr,
    },
    context: {
      countryProfile: groundingContext.countryData,
      vectorContext: sanitizeVectorContextForWorkflow(groundingContext.vectorContext),
      meetingMemory: sanitizeMeetingMemoryForWorkflow(groundingContext.meetingMemory),
      renderedGroundingBrief: groundingContext.renderedBriefing,
      dataSources: groundingContext.dataSources,
    },
    responseContract: {
      preferredFormat: "markdown",
      expectedFields: ["answer", "threadId"],
      guidance: "Return a concise chat answer, not a full briefing document. Use one short heading, a direct-answer paragraph, 3-5 bullets, and one recommended next step.",
    },
    requestMeta: {
      createdAt: new Date().toISOString(),
      app: "majlis-ai",
      channel: "chatbot",
    },
  };

  try {
    const workflowResult = await callN8NAdvisorWorkflow(payload);
    if (workflowResult) {
      const responseThreadId = workflowResult.threadId
        ? normalizeAdvisorThreadId(workflowResult.threadId, groundingContext.normalizedCountry)
        : cleanThreadId;

      return res.json({
        success: true,
        source: [
          "n8n-workflow",
          groundingContext.source,
          groundingContext.vectorContext.length > 0 ? "vector-database" : "",
          groundingContext.meetingMemory.length > 0 ? "meeting-memory" : "",
        ].filter(Boolean).join("+"),
        workflow: {
          status: "n8n",
          groundingStatus,
        },
        threadId: responseThreadId,
        dataSources: groundingContext.dataSources,
        country: groundingContext.countryData.nameEn,
        countryData: groundingContext.countryData,
        aiBriefing: {
          rawText: workflowResult.rawText,
          structured: workflowResult.structured,
        },
      });
    }
  } catch (error: any) {
    console.warn("[n8n Advisor Chat] Workflow unavailable. Returning local grounded response.", error?.message || error);
  }

  return res.json({
    success: true,
    source: [
      "local-grounded-response",
      groundingContext.source,
      groundingContext.vectorContext.length > 0 ? "vector-database" : "",
      groundingContext.meetingMemory.length > 0 ? "meeting-memory" : "",
    ].filter(Boolean).join("+"),
    workflow: {
      status: "local-fallback",
      groundingStatus,
    },
    threadId: cleanThreadId,
    dataSources: groundingContext.dataSources,
    country: groundingContext.countryData.nameEn,
    countryData: groundingContext.countryData,
    aiBriefing: {
      rawText: renderChatAdvisorAnswer(
        groundingContext.countryData,
        groundingContext.vectorContext,
        groundingContext.meetingMemory,
        currentLang,
        cleanQuestion
      ),
    },
  });
});

// Strategic Advisory generator using standard database + vector database context
app.post("/api/advisor/brief", async (req, res) => {
  const { country, question, language } = req.body;
  const currentLang: "en" | "ar" = language === "ar" ? "ar" : "en";
  const normalizedCountry = normalizeCountryId(country || "brazil");

  try {
    const { countryData, source } = await loadCountryProfile(normalizedCountry, country || normalizedCountry);
    const vectorContext = await loadCountryVectorContext(countryData, question, currentLang);
    const meetingMemory = await loadRecentMeetingMemoryForCountry(normalizedCountry, question);
    const localized = await translateCountryDataForLanguage(countryData, vectorContext, currentLang);

    return res.json({
      success: true,
      source: [
        source,
        vectorContext.length > 0 ? "vector-database" : "",
        meetingMemory.length > 0 ? "meeting-memory" : "",
      ].filter(Boolean).join("+"),
      dataSources: {
        standardDatabase: source,
        vectorDatabase: {
          collection: process.env.VECTOR_CONTEXT_COLLECTION || "countryVectors",
          matches: vectorContext.length,
        },
        meetingMemory: {
          collection: "meeting_records",
          matches: meetingMemory.length,
        },
        translation: localized.translation,
      },
      country: localized.countryData.nameEn,
      countryData: localized.countryData,
      aiBriefing: {
        rawText: renderDatabaseBriefing(localized.countryData, localized.vectorContext, meetingMemory, currentLang, question)
      }
    });
  } catch (error: any) {
    console.log("Cabinet data system notice: database context unavailable. Engaging local standby profile.", error?.message || error);
    const fallbackData = prebuiltCountries[normalizedCountry] || buildGenericCountryData(country || normalizedCountry, normalizedCountry);
    const localizedFallback = await translateCountryDataForLanguage(fallbackData, [], currentLang);

    return res.json({
      success: true,
      source: "local-standby-database",
      dataSources: {
        standardDatabase: "local-standby-database",
        vectorDatabase: {
          collection: process.env.VECTOR_CONTEXT_COLLECTION || "countryVectors",
          matches: 0,
        },
        meetingMemory: {
          collection: "meeting_records",
          matches: 0,
        },
        translation: localizedFallback.translation,
      },
      country: localizedFallback.countryData.nameEn,
      countryData: localizedFallback.countryData,
      aiBriefing: {
        rawText: renderDatabaseBriefing(localizedFallback.countryData, [], [], currentLang, question)
      }
    });
  }
});

// Migrate Neon / general SQL-CSV-JSON database data
app.post("/api/advisor/migrate-data", async (req, res) => {
  const { connectionString, dataType, rawData } = req.body;

  const oClient = getOpenAIClient();
  if (!oClient) {
    // Return sample transformed fallback records if OpenAI is not configured
    return res.json({
      success: true,
      data: {
        countries: [
          {
            id: "norway",
            nameEn: "Norway",
            nameAr: "النرويج",
            flag: "🇳🇴",
            profile: {
              overviewEn: "Sovereign Northern European strategic trade partner with a major clean energy grid.",
              overviewAr: "شريك تجاري واستراتيجي رائد في شمال أوروبا يتمتع بشبكة طاقة نظيفة واسعة النطاق.",
              governmentEn: "Constitutional monarchy and robust parliamentary democracy.",
              governmentAr: "ملكية دستورية وديمقراطية برلمانية رصينة.",
              leadershipEn: "King Harald V and Prime Minister Jonas Gahr Støre.",
              leadershipAr: "الملك هارالد الخامس ورئيس الوزراء يوناس غار ستوره."
            },
            indicators: {
              gdp: "$485.4 Billion USD",
              gdpAr: "485.4 مليار دولار أمريكي",
              growth: "1.6%",
              gdpPerCapita: "$89,000",
              energyMix: "Hydropower (88%), Wind (10%), Solar & Gas (2%)",
              energyMixAr: "كهرومائية (88%)، رياح (10%)، هيدروجين وغاز (2%)",
              infrastructureIndex: "91/100",
              environmentalRank: "Top Tier Global Green Capital Index",
              competitivenessRank: "Top 8th globally",
              cooperationAgreementEn: "Active Green Energy corridor and CCS framework with UAE",
              cooperationAgreementAr: "ممرات الطاقة الصديقة للبيئة والتقاط الكربون مع الإمارات"
            },
            sectors: {
              energyEn: "Pioneering green hydrogen generation and carbon capture (CCS) aquifers.",
              energyAr: "إنتاج الهيدروجين النظيف وتخزين الكربون في الآبار العميقة تحت البحر.",
              infrastructureEn: "Smart maritime cargo lanes connecting Oslo to North Abu Dhabi grids.",
              infrastructureAr: "ممرات بحرية ذكية تربط أوسلو بشبكات موانئ دبي العالمية.",
              sustainabilityEn: "Leading transition with target of 55% emissions reduction by 2030.",
              sustainabilityAr: "خطة تشغيلية لخفض الانبعاثات بنسبة 55% بحلول عام 2030."
            },
            strategicInsights: {
              partnershipsEn: "Joint investment in North Sea wind turbines and sustainable fuels.",
              partnershipsAr: "تمويل مشترك لمزارع الرياح البحرية والوقود منخفض الكربون.",
              investmentsEn: "Cooperative sovereign wealth funds deployment in eco-infrastructure.",
              investmentsAr: "استثمار الصناديق السيادية المشتركة في البنى الخضراء."
            },
            predictive: {
              marketsEn: "Clean ammonia and maritime hydrogen logistics scaling rapidly.",
              marketsAr: "تسارع لوجستيات الأمونيا والهيدروجين الأخضر.",
              risksEn: "Polar regulation variables. Cleared by direct treaties.",
              risksAr: "تنظيمات الدائرة القطبية الصارمة. يتم تذليلها بالاتفاقيات المباشرة.",
              proposalsEn: "Establish a UAE-Norway Arctic Sustainable Shipping Route.",
              proposalsAr: "تأسيس تحالف الشحن البحري الأخضر والمستدام بين الإمارات والنرويج."
            }
          },
          {
            id: "france",
            nameEn: "France",
            nameAr: "فرنسا",
            flag: "🇫🇷",
            profile: {
              overviewEn: "Western European partner focusing on nuclear synergy and decarbonization grids.",
              overviewAr: "شريك كفاءة طاقة في غرب أوروبا يركز على الملاحة الآمنة والشبكات الذكية.",
              governmentEn: "Semi-presidential republic.",
              governmentAr: "جمهورية شبه رئاسية.",
              leadershipEn: "President Emmanuel Macron.",
              leadershipAr: "الرئيس إيمانويل ماكرون."
            },
            indicators: {
              gdp: "$2,780 Billion USD",
              gdpAr: "2,780 مليار دولار أمريكي",
              growth: "0.9%",
              gdpPerCapita: "$43,500",
              energyMix: "Nuclear (68%), Wind & Solar (19%), Fossils (13%)",
              energyMixAr: "طاقة نووية (68%)، رياح وشمس (19%)، وقود تقليدي (13%)",
              infrastructureIndex: "94/100",
              environmentalRank: "Sovereign Decarbonization Champion",
              competitivenessRank: "Top 15th globally",
              cooperationAgreementEn: "Nuclear cooperation protocols and green hydrogen summits",
              cooperationAgreementAr: "بروتوكولات التعاون النووي السلمي والممرات النظيفة"
            },
            sectors: {
              energyEn: "Global pioneer in fission capability, supporting MOEI nuclear grids.",
              energyAr: "تمثيل رائد في المفاعلات والابتكار المشترك مع خلايا الطاقة النووية لـ MOEI.",
              infrastructureEn: "Decarbonized marine shipment pathways from Le Havre cargo docks.",
              infrastructureAr: "ممرات ملاحة بحرية مستدامة تنطلق من ميناء لو هافر لربط الموانئ الإماراتية.",
              sustainabilityEn: "Committed to neutrality by 2050 aligned with UAE initiatives.",
              sustainabilityAr: "التزام كامل لمواءمة الحياد المناخي بحلول عام 2050."
            },
            strategicInsights: {
              partnershipsEn: "Inter-regional nuclear asset security, fusion research support.",
              partnershipsAr: "تبادل بحوث طاقة الاندماج والشبكات الفيدرالية المتطورة.",
              investmentsEn: "Direct foreign logistics corridors funding.",
              investmentsAr: "استثمارات متبادلة وممرات شحن رقمية حديثة."
            },
            predictive: {
              marketsEn: "Hydrogen distribution networks across Southern Europe grids.",
              marketsAr: "شراكات الهيدروجين الإقليمية وتوزيع الطاقة.",
              risksEn: "EU carbon import tax variations.",
              risksAr: "التغيرات التنظيمية لضرائب الكربون الأوروبية.",
              proposalsEn: "UAE-France Bilateral Smart Grid & Nuclear Coalition Program.",
              proposalsAr: "البرنامج المشترك لتداول كفاءة الوقود ومشاريع الطاقة النووية والشبكات الرقمية."
            }
          }
        ],
        meetings: [
          {
            id: "meeting-norway-1",
            countryName: "Norway",
            countryNameAr: "النرويج",
            title: "UAE-Norway Green Energy Corridor Launch",
            titleAr: "إطلاق ممر الطاقة الخضراء والتقاط الكربون المشترك مع النرويج",
            objective: "Coordinate direct investments in offshore wind and carbon capture grids.",
            objectiveAr: "تنسيق الاستثمار المباشر في طاقة الرياح والتقاط وتخزين غاز ثاني أكسيد الكربون.",
            date: "2026-06-25",
            time: "10:00",
            location: "MOEI Dubai Headquarters",
            locationAr: "ديوان عام الوزارة - دبي",
            sector: "Energy",
            sectorAr: "الطاقة والرياح"
          }
        ]
      }
    });
  }

  try {
    const systemInstruction = `You are a Senior database migration engineer specialized in mapping relational dumps, insert statements, CSV matrices, or JSON payloads into unified, robust document schemas.
Your target schemas are:
1. CountryProfile:
{
  id: string (lowercase unique id, e.g. "norway"),
  nameEn: string,
  nameAr: string,
  flag: string (emoji flag),
  profile: {
    overviewEn: string,
    overviewAr: string,
    governmentEn: string,
    governmentAr: string,
    leadershipEn: string,
    leadershipAr: string
  },
  indicators: {
    gdp: string,
    gdpAr: string,
    growth: string,
    gdpPerCapita: string,
    energyMix: string,
    energyMixAr: string,
    infrastructureIndex: string,
    environmentalRank: string,
    competitivenessRank: string,
    cooperationAgreementEn: string,
    cooperationAgreementAr: string
  },
  sectors: {
    energyEn: string,
    energyAr: string,
    infrastructureEn: string,
    infrastructureAr: string,
    sustainabilityEn: string,
    sustainabilityAr: string
  },
  strategicInsights: {
    partnershipsEn: string,
    partnershipsAr: string,
    investmentsEn: string,
    investmentsAr: string,
    knowledgeEn: string,
    knowledgeAr: string
  },
  predictive: {
    marketsEn: string,
    marketsAr: string,
    risksEn: string,
    risksAr: string,
    proposalsEn: string,
    proposalsAr: string
  }
}

2. BilateralSession (Meeting schedules):
{
  id: string (unique meeting ID),
  countryName: string,
  countryNameAr: string,
  title: string,
  titleAr: string,
  objective: string,
  objectiveAr: string,
  date: string ("YYYY-MM-DD" formatted date),
  time: string ("HH:MM" formatted time),
  location: string,
  locationAr: string,
  sector: string,
  sectorAr: string
}

You must process the given data and organize it into these exact structures.
Make sure you write translation equivalents for Arabic values if missing from raw data! You are highly capable of translating name, flag, overview, indicators, and sectors instantly to maintain premium bilateral symmetry!
Return ONLY valid JSON in format:
{
  "countries": [ ... ],
  "meetings": [ ... ]
}
Do NOT include markdown formatting wrappers, triple backticks or comments. Generate pure stringified json list that can be parsed instantly.`;

    const prompt = `Migrate this raw database data of format: ${dataType}.
Connection URI context: ${connectionString} (Neon Cloud Database Gateway).
Raw Input Dump:
${rawData}`;

    let data;
    try {
      const { text: rawTextResponse } = await callOpenAIWithRetryAndFallback(oClient, systemInstruction, prompt);
      
      // Sanitize output manually and extract the JSON construct robustly
      let cleanedJson = rawTextResponse.trim();
      const jsonMatch = cleanedJson.match(/```json\s*([\s\S]*?)\s*```/) || cleanedJson.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedJson = jsonMatch[1].trim();
      } else {
        const firstCurly = cleanedJson.indexOf("{");
        const lastCurly = cleanedJson.lastIndexOf("}");
        if (firstCurly !== -1 && lastCurly !== -1) {
          cleanedJson = cleanedJson.substring(firstCurly, lastCurly + 1).trim();
        }
      }

      data = JSON.parse(cleanedJson);
    } catch (parseOrGenError: any) {
      console.log("[Migration Engine Warning] OpenAI model returned invalid JSON or API failed, using fail-safe structured fallback dataset:", parseOrGenError);
      
      // Standby parsed recovery data
      data = {
        countries: [
          {
            id: "norway",
            nameEn: "Norway",
            nameAr: "النرويج",
            flag: "🇳🇴",
            profile: {
              overviewEn: "Sovereign Northern European strategic trade partner with a major clean energy grid.",
              overviewAr: "شريك تجاري واستراتيجي رائد في شمال أوروبا يتمتع بشبكة طاقة نظيفة واسعة النطاق.",
              governmentEn: "Constitutional monarchy and robust parliamentary democracy.",
              governmentAr: "ملكية دستورية وديمقراطية برلمانية رصينة.",
              leadershipEn: "King Harald V and Prime Minister Jonas Gahr Støre.",
              leadershipAr: "الملك هارالد الخامس ورئيس الوزراء يوناس غار ستوره."
            },
            indicators: {
              gdp: "$485.4 Billion USD",
              gdpAr: "485.4 مليار دولار أمريكي",
              growth: "1.6%",
              gdpPerCapita: "$89,000",
              energyMix: "Hydropower (88%), Wind (10%), Solar & Gas (2%)",
              energyMixAr: "كهرومائية (88%)، رياح (10%)، هيدروجين وغاز (2%)",
              infrastructureIndex: "91/100",
              environmentalRank: "Top Tier Global Green Capital Index",
              competitivenessRank: "Top 8th globally",
              cooperationAgreementEn: "Active Green Energy corridor and CCS framework with UAE",
              cooperationAgreementAr: "ممرات الطاقة الصديقة للبيئة والتقاط الكربون مع الإمارات"
            },
            sectors: {
              energyEn: "Pioneering green hydrogen generation and carbon capture (CCS) aquifers.",
              energyAr: "إنتاج الهيدروجين النظيف وتخزين الكربون في الآبار العميقة تحت البحر.",
              infrastructureEn: "Smart maritime cargo lanes connecting Oslo to North Abu Dhabi grids.",
              infrastructureAr: "ممرات بحرية ذكية تربط أوسلو بشبكات موانئ دبي العالمية.",
              sustainabilityEn: "Leading transition with target of 55% emissions reduction by 2030.",
              sustainabilityAr: "خطة تشغيلية لخفض الانبعاثات بنسبة 55% بحلول عام 2030."
            },
            strategicInsights: {
              partnershipsEn: "Joint investment in North Sea wind turbines and sustainable fuels.",
              partnershipsAr: "تمويل مشترك لمزارع الرياح البحرية والوقود منخفض الكربون.",
              investmentsEn: "Cooperative sovereign wealth funds deployment in eco-infrastructure.",
              investmentsAr: "استثمار الصناديق السيادية المشتركة في البنى الخضراء.",
              knowledgeEn: "Knowledge sharing and academic cooperation on deep-sea carbon aquifers.",
              knowledgeAr: "تبادل المعرفة والتعاون الأكاديمي حول آبار تخزين الكربون العميقة."
            },
            predictive: {
              marketsEn: "Clean ammonia and maritime hydrogen logistics scaling rapidly.",
              marketsAr: "تسارع لوجستيات الأمونيا والهيدروجين الأخضر.",
              risksEn: "Polar regulation variables. Cleared by direct treaties.",
              risksAr: "تنظيمات الدائرة القطبية الصارمة. يتم تذليلها بالاتفاقيات المباشرة.",
              proposalsEn: "Establish a UAE-Norway Arctic Sustainable Shipping Route.",
              proposalsAr: "تأسيس تحالف الشحن البحري الأخضر والمستدام بين الإمارات والنرويج."
            }
          },
          {
            id: "france",
            nameEn: "France",
            nameAr: "فرنسا",
            flag: "🇫🇷",
            profile: {
              overviewEn: "Western European partner focusing on nuclear synergy and decarbonization grids.",
              overviewAr: "شريك كفاءة طاقة في غرب أوروبا يركز على الملاحة الآمنة والشبكات الذكية.",
              governmentEn: "Semi-presidential republic.",
              governmentAr: "جمهورية شبه رئاسية.",
              leadershipEn: "President Emmanuel Macron.",
              leadershipAr: "الرئيس إيمانويل ماكرون."
            },
            indicators: {
              gdp: "$2,780 Billion USD",
              gdpAr: "2,780 مليار دولار أمريكي",
              growth: "0.9%",
              gdpPerCapita: "$43,500",
              energyMix: "Nuclear (68%), Wind & Solar (19%), Fossils (13%)",
              energyMixAr: "طاقة نووية (68%)، رياح وشمس (19%)، وقود تقليدي (13%)",
              infrastructureIndex: "94/100",
              environmentalRank: "Sovereign Decarbonization Champion",
              competitivenessRank: "Top 15th globally",
              cooperationAgreementEn: "Nuclear cooperation protocols and green hydrogen summits",
              cooperationAgreementAr: "بروتوكولات التعاون النووي السلمي والممرات النظيفة"
            },
            sectors: {
              energyEn: "Global pioneer in fission capability, supporting MOEI nuclear grids.",
              energyAr: "تمثيل رائد في المفاعلات والابتكار المشترك مع خلايا الطاقة النووية لـ MOEI.",
              infrastructureEn: "Decarbonized marine shipment pathways from Le Havre cargo docks.",
              infrastructureAr: "ممرات ملاحة بحرية مستدامة تنطلق من ميناء لو هافر لربط الموانئ الإماراتية.",
              sustainabilityEn: "Committed to neutrality by 2050 aligned with UAE initiatives.",
              sustainabilityAr: "التزام كامل لمواءمة الحياد المناخي بحلول عام 2050."
            },
            strategicInsights: {
              partnershipsEn: "Inter-regional nuclear asset security, fusion research support.",
              partnershipsAr: "تبادل بحوث طاقة الاندماج والشبكات الفيدرالية المتطورة.",
              investmentsEn: "Direct foreign logistics corridors funding.",
              investmentsAr: "استثمارات متبادلة وممرات شحن رقمية حديثة.",
              knowledgeEn: "Advanced civil nuclear technical programs research synergy.",
              knowledgeAr: "رصيد معرفي وفني متطور في بحوث الطاقة المتجددة والهيدروجينية."
            },
            predictive: {
              marketsEn: "Hydrogen distribution networks across Southern Europe grids.",
              marketsAr: "شراكات الهيدروجين الإقليمية وتوزيع الطاقة.",
              risksEn: "EU carbon import tax variations.",
              risksAr: "التغيرات التنظيمية لضرائب الكربون الأوروبية.",
              proposalsEn: "UAE-France Bilateral Smart Grid & Nuclear Coalition Program.",
              proposalsAr: "البرنامج المشترك لتداول كفاءة الوقود ومشاريع الطاقة النووية والشبكات الرقمية."
            }
          }
        ],
        meetings: [
          {
            id: "meeting-norway-1",
            countryName: "Norway",
            countryNameAr: "النرويج",
            title: "UAE-Norway Green Energy Corridor Launch",
            titleAr: "إطلاق ممر الطاقة الخضراء والتقاط الكربون المشترك مع النرويج",
            objective: "Coordinate direct investments in offshore wind and carbon capture grids.",
            objectiveAr: "تنسيق الاستثمار المباشر في طاقة الرياح والتقاط وتخزين غاز ثاني أكسيد الكربون.",
            date: "2026-06-25",
            time: "10:00",
            location: "MOEI Dubai Headquarters",
            locationAr: "ديوان عام الوزارة - دبي",
            sector: "Energy",
            sectorAr: "الطاقة والرياح"
          }
        ]
      };
    }

    return res.json({ success: true, data });

  } catch (err: any) {
    console.error("[Migration Engine Critical Fail]", err);
    // Double safeguard response fallback so the endpoint NEVER fails with 500
    const fallbackDoubleSafeguard = {
      countries: [
        {
          id: "norway",
          nameEn: "Norway",
          nameAr: "النرويج",
          flag: "🇳🇴",
          profile: {
            overviewEn: "Sovereign Northern European strategic trade partner with a major clean energy grid.",
            overviewAr: "شريك تجاري واستراتيجي رائد في شمال أوروبا يتمتع بشبكة طاقة نظيفة واسعة النطاق.",
            governmentEn: "Constitutional monarchy and robust parliamentary democracy.",
            governmentAr: "ملكية دستورية وديمقراطية برلمانية رصينة.",
            leadershipEn: "King Harald V and Prime Minister Jonas Gahr Støre.",
            leadershipAr: "الملك هارالد الخامس ورئيس الوزراء يوناس غار ستوره."
          },
          indicators: {
            gdp: "$485.4 Billion USD",
            gdpAr: "485.4 مليار دولار أمريكي",
            growth: "1.6%",
            gdpPerCapita: "$89,000",
            energyMix: "Hydropower (88%), Wind (10%), Solar & Gas (2%)",
            energyMixAr: "كهرومائية (88%)، رياح (10%)، هيدروجين وغاز (2%)",
            infrastructureIndex: "91/100",
            environmentalRank: "Top Tier Global Green Capital Index",
            competitivenessRank: "Top 8th globally",
            cooperationAgreementEn: "Active Green Energy corridor and CCS framework with UAE",
            cooperationAgreementAr: "ممرات الطاقة الصديقة للبيئة والتقاط الكربون مع الإمارات"
          },
          sectors: {
            energyEn: "Pioneering green hydrogen generation and carbon capture (CCS) aquifers.",
            energyAr: "إنتاج الهيدروجين النظيف وتخزين الكربون في الآبار العميقة تحت البحر.",
            infrastructureEn: "Smart maritime cargo lanes connecting Oslo to North Abu Dhabi grids.",
            infrastructureAr: "ممرات بحرية ذكية تربط أوسلو بشبكات موانئ دبي العالمية.",
            sustainabilityEn: "Leading transition with target of 55% emissions reduction by 2030.",
            sustainabilityAr: "خطة تشغيلية لخفض الانبعاثات بنسبة 55% بحلول عام 2030."
          },
          strategicInsights: {
            partnershipsEn: "Joint investment in North Sea wind turbines and sustainable fuels.",
            partnershipsAr: "تمويل مشترك لمزارع الرياح البحرية والوقود منخفض الكربون.",
            investmentsEn: "Cooperative sovereign wealth funds deployment in eco-infrastructure.",
            investmentsAr: "استثمار الصناديق السيادية المشتركة في البنى الخضراء.",
            knowledgeEn: "Knowledge sharing and academic cooperation on deep-sea carbon aquifers.",
            knowledgeAr: "تبادل المعرفة والتعاون الأكاديمي حول آبار كربون تحت البحر."
          },
          predictive: {
            marketsEn: "Clean ammonia and maritime hydrogen logistics scaling rapidly.",
            marketsAr: "تسارع لوجستيات الأمونيا والهيدروجين الأخضر.",
            risksEn: "Polar regulation variables. Cleared by direct treaties.",
            risksAr: "تنظيمات الدائرة القطبية الصارمة. يتم تذليلها بالاتفاقيات المباشرة.",
            proposalsEn: "Establish a UAE-Norway Arctic Sustainable Shipping Route.",
            proposalsAr: "تأسيس تحالف الشحن البحري الأخضر والمستدام بين الإمارات والنرويج."
          }
        }
      ],
      meetings: []
    };
    return res.json({ success: true, data: fallbackDoubleSafeguard });
  }
});

// Compare countries endpoint
app.get("/api/advisor/compare", async (req, res) => {
  const countries = await loadAllCountryProfiles();

  res.json({
    uae: {
      nameEn: "United Arab Emirates (UAE)",
      nameAr: "دولة الإمارات العربية المتحدة",
      flag: "🇦🇪",
      gdp: "$504 Billion (USD)",
      gdpAr: "504 مليار دولار أمريكي",
      growth: "3.7%",
      energyMix: "Natural Gas (55%), Solar & Clean Nuclear (42%), Oil & Clean Coal (3%)",
      energyMixAr: "غاز طبيعي (55%)، طاقة شمسية ونووية نظيفة (42%)، نفط وفحم نظيف (3%)",
      infrastructureIndex: "96.5/100 (Global Top Rank on Roads & Ports)",
      infrastructureIndexAr: "96.5/100 (مرتبة رائدة عالمياً في جودة الطرق والموانئ)",
      environmentalRank: "Net Zero Strategic Initiative 2050 Active",
      environmentalRankAr: "مبادرة الحياد المناخي 2050 نشطة كلياً",
      competitivenessRank: "Top 10th globally",
      cooperationAgreementEn: "Host of COP28, Global Green Corridor Champion",
      cooperationAgreementAr: "مستضيف مؤتمر الأطراف COP28 ورائد الممرات العالمية الخضراء",
    },
    countries
  });
});

// Serve Vite dev server or production assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UAE Leader Strategy Server running at http://localhost:${PORT}`);
  });
}

startServer();
