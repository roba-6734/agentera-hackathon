export interface CountryProfile {
  overviewEn: string;
  overviewAr: string;
  governmentEn: string;
  governmentAr: string;
  leadershipEn: string;
  leadershipAr: string;
}

export interface CountryIndicators {
  gdp: string;
  gdpAr: string;
  growth: string;
  gdpPerCapita: string;
  energyMix: string;
  energyMixAr: string;
  infrastructureIndex: string;
  environmentalRank: string;
  competitivenessRank: string;
  cooperationAgreementEn: string;
  cooperationAgreementAr: string;
}

export interface CountrySectors {
  energyEn: string;
  energyAr: string;
  infrastructureEn: string;
  infrastructureAr: string;
  sustainabilityEn: string;
  sustainabilityAr: string;
}

export interface CountryStrategicInsights {
  partnershipsEn: string;
  partnershipsAr: string;
  investmentsEn: string;
  investmentsAr: string;
  knowledgeEn: string;
  knowledgeAr: string;
}

export interface CountryPredictive {
  marketsEn: string;
  marketsAr: string;
  risksEn: string;
  risksAr: string;
  proposalsEn: string;
  proposalsAr: string;
}

export type CountryJsonSection = Record<string, unknown>;

export interface CountryIntelligenceHub {
  provider: "neon";
  table: string;
  rowId: number | string;
  hubCountryId?: number | null;
  countryName: string;
  isoCode: string;
  flagUrl?: string;
  lastUpdated?: string;
  createdAt?: string;
  profileStatus?: string;
  confidenceScore?: number | null;
  aiGenerated?: boolean | null;
  aiGeneratedFacts?: boolean | null;
  method?: string;
  sections: Record<string, CountryJsonSection>;
}

export interface PrebuiltCountry {
  id: string;
  nameEn: string;
  nameAr: string;
  flag: string;
  flagUrl?: string;
  profile: CountryProfile;
  indicators: CountryIndicators;
  sectors: CountrySectors;
  strategicInsights: CountryStrategicInsights;
  predictive: CountryPredictive;
  intelligenceHub?: CountryIntelligenceHub;
}

export interface UaeIndicator {
  nameEn: string;
  nameAr: string;
  flag: string;
  gdp: string;
  gdpAr: string;
  growth: string;
  energyMix: string;
  energyMixAr: string;
  infrastructureIndex: string;
  infrastructureIndexAr: string;
  environmentalRank: string;
  environmentalRankAr: string;
  competitivenessRank: string;
  competitivenessRankAr: string;
  cooperationAgreementEn: string;
  cooperationAgreementAr: string;
}

export interface BriefingReferenceFact {
  label: string;
  value: string;
  context?: string;
  source?: string;
  year?: string;
}

export interface BriefingLeadershipContact {
  role: string;
  name: string;
  note?: string;
}

export interface BriefingSectorScorecardItem {
  sector: string;
  currentBaseline: string;
  policyTarget: string;
  uaeAngle: string;
}

export interface BriefingOpportunityItem {
  title: string;
  detail: string;
  priority?: "Critical" | "High" | "Medium" | "Low";
}

export interface BriefingRiskItem {
  risk: string;
  mitigation: string;
}

export interface BriefingExecutiveSummaryArtifact {
  title: string;
  overview: string;
  structuralReadiness: string;
  leadership: string;
  energyInfrastructureSectors: {
    energy: string;
    infrastructure: string;
    sustainability: string;
  };
  priorityPartnerships: string[];
  predictiveIntelligence: {
    emergingMarkets: string;
    calculatedRisks: string;
    proposedUaeInitiative: string;
  };
  decisionFocus: string;
}

export interface BriefingTalkingPoint {
  title: string;
  point: string;
  ask?: string;
  evidence?: string;
  riskNote?: string;
}

export interface BriefingOnePagerArtifact {
  title: string;
  subtitle: string;
  country: string;
  strategicPriority: string;
  lastUpdated: string;
  uaeRelevance: string;
  fastFacts: BriefingReferenceFact[];
  leadership: BriefingLeadershipContact[];
  sectorScorecard: BriefingSectorScorecardItem[];
  opportunityMap: BriefingOpportunityItem[];
  risks: BriefingRiskItem[];
  actions90Days: string[];
  strategicRecommendation: string;
}

export interface BriefingSlideArtifact {
  title: string;
  subtitle?: string;
  bullets: string[];
  speakerNote?: string;
  visualHint?: string;
}

export interface BriefingArtifacts {
  generatedAt: string;
  country: string;
  language: "en" | "ar";
  executiveSummary: BriefingExecutiveSummaryArtifact;
  talkingPoints: BriefingTalkingPoint[];
  onePager: BriefingOnePagerArtifact;
  slides: BriefingSlideArtifact[];
  sourceNotes: string[];
}

export type activeTabCode = "passport" | "strategic" | "briefing" | "compare" | "chat" | "predictive" | "database" | "debrief";

export type AppRole = "staff" | "executive";

export interface AppSession {
  role: AppRole;
  displayName: string;
  email: string;
  authMode: "signin" | "signup";
  issuedAt: string;
}

export type MeetingActionPriority = "Critical" | "High" | "Medium" | "Low";
export type MeetingActionStatus = "Pending" | "In Progress" | "Completed" | "Deferred";

export interface MeetingMetadata {
  title: string;
  country: string;
  countryId: string;
  meetingDate: string;
  sector: string;
  meetingType: string;
  attendees: string;
  confidentialityLevel: string;
}

export interface MeetingActionItem {
  id?: string;
  description: string;
  suggestedOwner: string;
  priority: MeetingActionPriority;
  deadline?: string;
  status: MeetingActionStatus;
}

export interface MeetingDebriefAnalysis {
  executiveSummary: string;
  keyDiscussionPoints: string[];
  decisionsOrAgreements: string[];
  openQuestions: string[];
  risksAndConcerns: string[];
  opportunitiesForUaeMoei: string[];
  actionItems: MeetingActionItem[];
  relationshipImpactAnalysis: string;
  strategicTags: string[];
}

export interface MeetingRecord {
  id: string;
  metadata: MeetingMetadata;
  transcriptText: string;
  uploadedFileName?: string;
  debrief: MeetingDebriefAnalysis;
  createdBy: {
    displayName: string;
    email: string;
    role: AppRole;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserJourneyStep {
  step: number;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  status: "pending" | "current" | "completed";
}

export interface SlidePage {
  titleEn: string;
  titleAr: string;
  type: "cover" | "bilateral" | "sectors" | "strategic" | "risks";
  bullet1En: string;
  bullet1Ar: string;
  bullet2En: string;
  bullet2Ar: string;
  bullet3En: string;
  bullet3Ar: string;
  footerEn: string;
  footerAr: string;
}
