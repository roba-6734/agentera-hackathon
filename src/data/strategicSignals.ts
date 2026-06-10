export type StrategicSignalCategory =
  | "economy"
  | "politics"
  | "regional-affairs"
  | "energy"
  | "infrastructure"
  | "sustainability"
  | "trade-investment"
  | "diplomacy";

export interface StrategicSignalCategoryOption {
  id: StrategicSignalCategory;
  labelEn: string;
  labelAr: string;
}

export interface StrategicSignal {
  id: string;
  title: string;
  category: StrategicSignalCategory;
  summary: string;
  sourceName: string;
  publishedAt: string;
  relevanceNote: string;
  relevanceScore: number;
}

export const STRATEGIC_SIGNAL_CATEGORIES: StrategicSignalCategoryOption[] = [
  { id: "economy", labelEn: "Economy", labelAr: "الاقتصاد" },
  { id: "politics", labelEn: "Politics", labelAr: "السياسة" },
  { id: "regional-affairs", labelEn: "Regional Affairs", labelAr: "الشؤون الإقليمية" },
  { id: "energy", labelEn: "Energy", labelAr: "الطاقة" },
  { id: "infrastructure", labelEn: "Infrastructure", labelAr: "البنية التحتية" },
  { id: "sustainability", labelEn: "Sustainability", labelAr: "الاستدامة" },
  { id: "trade-investment", labelEn: "Trade & Investment", labelAr: "التجارة والاستثمار" },
  { id: "diplomacy", labelEn: "Diplomacy / Bilateral Relations", labelAr: "الدبلوماسية والعلاقات الثنائية" },
];

const mockStrategicSignals: StrategicSignal[] = [
  {
    id: "signal-energy-grid-gcc",
    title: "GCC grid interconnection expansion moves into new procurement phase",
    category: "energy",
    summary: "Regional utilities are advancing cross-border capacity upgrades intended to improve reserve sharing and clean power balancing.",
    sourceName: "Regional Energy Desk",
    publishedAt: "2026-06-10T06:20:00Z",
    relevanceNote: "Supports UAE/MOEI positioning on electricity resilience, clean-energy integration, and regional grid diplomacy.",
    relevanceScore: 98,
  },
  {
    id: "signal-india-corridor",
    title: "India-Middle East-Europe corridor partners renew logistics workstreams",
    category: "infrastructure",
    summary: "Transport ministries and port operators are revisiting technical packages for customs digitization, rail links, and maritime routing.",
    sourceName: "Trade Corridors Monitor",
    publishedAt: "2026-06-10T04:40:00Z",
    relevanceNote: "Directly affects UAE port, rail, and logistics priorities tied to corridor leadership and supply-chain security.",
    relevanceScore: 96,
  },
  {
    id: "signal-eu-carbon-border",
    title: "EU carbon border rules trigger fresh clean-fuel compliance talks",
    category: "trade-investment",
    summary: "Industrial exporters are seeking clearer treatment for low-carbon fuels and embedded emissions in strategic commodities.",
    sourceName: "Global Trade Review",
    publishedAt: "2026-06-09T18:15:00Z",
    relevanceNote: "Important for UAE exporters, clean hydrogen certification, and investment discussions with European counterparts.",
    relevanceScore: 94,
  },
  {
    id: "signal-climate-finance",
    title: "Climate finance group proposes blended funding for emerging-market infrastructure",
    category: "sustainability",
    summary: "A multilateral working group is promoting de-risking instruments for resilient roads, ports, and clean water infrastructure.",
    sourceName: "Sustainable Finance Brief",
    publishedAt: "2026-06-09T12:05:00Z",
    relevanceNote: "Creates diplomatic and financing openings for UAE-backed sustainable infrastructure partnerships.",
    relevanceScore: 92,
  },
  {
    id: "signal-bilateral-asia",
    title: "Asian strategic partner requests ministerial dialogue on maritime decarbonization",
    category: "diplomacy",
    summary: "Officials are preparing a bilateral agenda around green shipping lanes, ammonia bunkering standards, and port data exchange.",
    sourceName: "Diplomatic Cable Digest",
    publishedAt: "2026-06-09T08:30:00Z",
    relevanceNote: "Aligns with UAE maritime, clean-fuel, and bilateral partnership priorities for senior leadership meetings.",
    relevanceScore: 91,
  },
  {
    id: "signal-oil-demand",
    title: "Energy agencies revise medium-term oil demand outlook after Asia growth data",
    category: "economy",
    summary: "New forecasts indicate stronger industrial activity and transport demand across several high-growth Asian markets.",
    sourceName: "Macro Energy Watch",
    publishedAt: "2026-06-08T16:50:00Z",
    relevanceNote: "Frames revenue, investment, and energy-transition messaging for UAE leadership in external engagements.",
    relevanceScore: 88,
  },
  {
    id: "signal-regional-port-security",
    title: "Regional port authorities tighten security coordination after shipping disruption",
    category: "regional-affairs",
    summary: "Maritime agencies are sharing risk notices and contingency planning guidance for sensitive shipping routes.",
    sourceName: "Maritime Risk Monitor",
    publishedAt: "2026-06-08T10:10:00Z",
    relevanceNote: "Relevant to UAE logistics continuity, port readiness, and ministerial briefings on regional resilience.",
    relevanceScore: 86,
  },
  {
    id: "signal-election-policy",
    title: "Election platform in major partner country emphasizes infrastructure localization",
    category: "politics",
    summary: "Policy advisers are prioritizing local content rules and public procurement reform ahead of national elections.",
    sourceName: "Political Economy Tracker",
    publishedAt: "2026-06-07T19:45:00Z",
    relevanceNote: "May affect UAE investment terms, project delivery models, and bilateral negotiation posture.",
    relevanceScore: 84,
  },
];

export function getMockStrategicSignals(filters: StrategicSignalCategory[]) {
  if (filters.length === 0) {
    return [];
  }

  return mockStrategicSignals
    .filter((signal) => filters.includes(signal.category))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

export async function fetchStrategicSignals(filters: StrategicSignalCategory[]) {
  // Replace this mock layer with an approved live source when available:
  // NewsAPI, GDELT, Google News RSS, SerpAPI, or a ministry-approved intelligence feed.
  await new Promise((resolve) => setTimeout(resolve, 350));
  return getMockStrategicSignals(filters);
}
