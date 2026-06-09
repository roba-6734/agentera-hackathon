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

export interface PrebuiltCountry {
  id: string;
  nameEn: string;
  nameAr: string;
  flag: string;
  profile: CountryProfile;
  indicators: CountryIndicators;
  sectors: CountrySectors;
  strategicInsights: CountryStrategicInsights;
  predictive: CountryPredictive;
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

export type activeTabCode = "passport" | "strategic" | "briefing" | "compare" | "chat" | "predictive" | "database";

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
