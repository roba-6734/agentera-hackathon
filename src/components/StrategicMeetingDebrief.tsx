import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Filter,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import {
  AppSession,
  MeetingActionItem,
  MeetingActionPriority,
  MeetingActionStatus,
  MeetingDebriefAnalysis,
  MeetingMetadata,
  MeetingRecord,
} from "../types";

interface CountryOption {
  code: string;
  nameEn: string;
  nameAr: string;
  flag: string;
}

interface StrategicMeetingDebriefProps {
  language: "en" | "ar";
  countryOptions: CountryOption[];
  defaultCountryCode: string;
  session: AppSession;
}

type ViewMode = "new" | "history";
type StringArrayDebriefKey =
  | "keyDiscussionPoints"
  | "decisionsOrAgreements"
  | "openQuestions"
  | "risksAndConcerns"
  | "opportunitiesForUaeMoei"
  | "strategicTags";

const priorityOptions: MeetingActionPriority[] = ["Critical", "High", "Medium", "Low"];
const statusOptions: MeetingActionStatus[] = ["Pending", "In Progress", "Completed", "Deferred"];

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialMetadata(countryOptions: CountryOption[], defaultCountryCode: string): MeetingMetadata {
  const defaultCountry = countryOptions.find((country) => country.code === defaultCountryCode) || countryOptions[0];

  return {
    title: "",
    country: defaultCountry?.nameEn || "Brazil",
    countryId: defaultCountry?.code || "brazil",
    meetingDate: getTodayIsoDate(),
    sector: "Energy and Infrastructure",
    meetingType: "Bilateral meeting",
    attendees: "",
    confidentialityLevel: "Internal",
  };
}

function textToLines(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function linesToText(values: string[]) {
  return values.join("\n");
}

function formatRecordDate(value: string, language: "en" | "ar") {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;

  return new Intl.DateTimeFormat(language === "en" ? "en-AE" : "ar-AE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function buildCreatedBy(session: AppSession) {
  return {
    displayName: session.displayName,
    email: session.email,
    role: session.role,
  };
}

export default function StrategicMeetingDebrief({
  language,
  countryOptions,
  defaultCountryCode,
  session,
}: StrategicMeetingDebriefProps) {
  const isEn = language === "en";
  const [viewMode, setViewMode] = useState<ViewMode>("new");
  const [metadata, setMetadata] = useState<MeetingMetadata>(() => buildInitialMetadata(countryOptions, defaultCountryCode));
  const [transcriptText, setTranscriptText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<MeetingDebriefAnalysis | null>(null);
  const [analysisSource, setAnalysisSource] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<MeetingRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    country: "",
    sector: "",
    dateFrom: "",
    dateTo: "",
    q: "",
  });

  const selectedCountry = useMemo(
    () => countryOptions.find((country) => country.code === metadata.countryId),
    [countryOptions, metadata.countryId]
  );

  const canAnalyze = metadata.title.trim() && metadata.countryId.trim() && metadata.meetingDate.trim() && transcriptText.trim().length >= 40;
  const pendingActionCount = historyRecords.reduce(
    (count, record) => count + record.debrief.actionItems.filter((actionItem) => actionItem.status !== "Completed").length,
    0
  );

  const updateMetadata = (field: keyof MeetingMetadata, value: string) => {
    setMetadata((current) => ({ ...current, [field]: value }));
  };

  const handleCountryChange = (countryId: string) => {
    const nextCountry = countryOptions.find((country) => country.code === countryId);
    setMetadata((current) => ({
      ...current,
      countryId,
      country: nextCountry?.nameEn || countryId,
    }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setFileNotice(null);

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension && ["txt", "md", "csv"].includes(extension)) {
      const text = await file.text();
      setTranscriptText(text);
      setFileNotice(isEn ? "Transcript text loaded from file." : "تم تحميل نص المحضر من الملف.");
      return;
    }

    // Future integration point: connect PDF/DOCX parsing, OCR, and live document ingestion here.
    // Future integration point: connect audio/video transcription here before calling /api/meetings/analyze.
    setFileNotice(
      isEn
        ? "File saved as a reference name. Paste transcript text for this MVP."
        : "تم حفظ اسم الملف كمرجع. يرجى لصق نص المحضر في هذا الإصدار."
    );
  };

  const analyzeTranscript = async () => {
    if (!canAnalyze) {
      setAnalysisError(isEn ? "Enter required metadata and at least 40 characters of transcript text." : "أدخل بيانات الاجتماع ونصاً لا يقل عن 40 حرفاً.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setSaveStatus(null);

    try {
      const response = await fetch("/api/meetings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata,
          transcriptText,
          uploadedFileName,
          createdBy: buildCreatedBy(session),
        }),
      });
      const parsed = await response.json();

      if (!response.ok || !parsed.success) {
        throw new Error(parsed.error || "Meeting analysis failed.");
      }

      setDebrief(parsed.debrief);
      setAnalysisSource(parsed.source || "structured-analysis");
    } catch (error: any) {
      setAnalysisError(error?.message || (isEn ? "Meeting analysis failed." : "تعذر تحليل الاجتماع."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveDebrief = async () => {
    if (!debrief) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);

    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata,
          transcriptText,
          uploadedFileName,
          debrief,
          createdBy: buildCreatedBy(session),
        }),
      });
      const parsed = await response.json();

      if (!response.ok || !parsed.success) {
        throw new Error(parsed.error || "Save failed.");
      }

      setSaveStatus(isEn ? "Saved to Intelligence Memory." : "تم الحفظ في ذاكرة الاستخبارات.");
      setViewMode("history");
      await loadHistory();
      setExpandedRecordId(parsed.record?.id || null);
    } catch (error: any) {
      setSaveError(error?.message || (isEn ? "Unable to save debrief." : "تعذر حفظ الملخص."));
    } finally {
      setIsSaving(false);
    }
  };

  const updateDebriefText = (field: "executiveSummary" | "relationshipImpactAnalysis", value: string) => {
    setDebrief((current) => current ? { ...current, [field]: value } : current);
  };

  const updateDebriefArray = (field: StringArrayDebriefKey, value: string) => {
    setDebrief((current) => current ? { ...current, [field]: textToLines(value) } : current);
  };

  const updateActionItem = (index: number, nextItem: MeetingActionItem) => {
    setDebrief((current) => {
      if (!current) return current;
      const nextItems = [...current.actionItems];
      nextItems[index] = nextItem;
      return { ...current, actionItems: nextItems };
    });
  };

  const addActionItem = () => {
    setDebrief((current) => {
      if (!current) return current;
      return {
        ...current,
        actionItems: [
          ...current.actionItems,
          {
            description: "",
            suggestedOwner: "MOEI Strategy Team",
            priority: "Medium",
            deadline: "",
            status: "Pending",
          },
        ],
      };
    });
  };

  const removeActionItem = (index: number) => {
    setDebrief((current) => {
      if (!current) return current;
      return {
        ...current,
        actionItems: current.actionItems.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const loadHistory = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const params = new URLSearchParams();
      if (filters.country) params.set("country", filters.country);
      if (filters.sector.trim()) params.set("sector", filters.sector.trim());
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.q.trim()) params.set("q", filters.q.trim());

      const response = await fetch(`/api/meetings?${params.toString()}`);
      const parsed = await response.json();
      if (!response.ok || !parsed.success) {
        throw new Error(parsed.error || "History load failed.");
      }

      setHistoryRecords(parsed.records || []);
    } catch (error: any) {
      setHistoryError(error?.message || (isEn ? "Unable to load meeting history." : "تعذر تحميل سجل الاجتماعات."));
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "history") {
      loadHistory();
    }
  }, [viewMode]);

  if (session.role !== "staff") {
    return (
      <section className="bg-white rounded-sm shadow-md border-l-4 border-red-600 p-8">
        <AlertCircle className="w-10 h-10 text-red-600 mb-3" />
        <h3 className="font-serif font-bold text-lg text-slate-vip">
          {isEn ? "Staff access required" : "يتطلب صلاحية فريق العمل"}
        </h3>
      </section>
    );
  }

  const debriefSections: Array<{ key: StringArrayDebriefKey; titleEn: string; titleAr: string }> = [
    { key: "keyDiscussionPoints", titleEn: "Key Discussion Points", titleAr: "نقاط النقاش الرئيسية" },
    { key: "decisionsOrAgreements", titleEn: "Decisions or Agreements", titleAr: "القرارات أو الاتفاقات" },
    { key: "openQuestions", titleEn: "Open Questions", titleAr: "أسئلة مفتوحة" },
    { key: "risksAndConcerns", titleEn: "Risks and Concerns", titleAr: "المخاطر والمخاوف" },
    { key: "opportunitiesForUaeMoei", titleEn: "Opportunities for UAE/MOEI", titleAr: "فرص لدولة الإمارات والوزارة" },
    { key: "strategicTags", titleEn: "Strategic Tags", titleAr: "وسوم استراتيجية" },
  ];

  return (
    <div className="space-y-6 animate-fade-in" id="staff-strategic-meeting-debrief">
      <section className="bg-white rounded-sm shadow-md border-l-4 border-emerald-deep p-5 md:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-deep font-bold flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>{isEn ? "Staff Mode" : "نمط فريق العمل"}</span>
            </span>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-vip">
              {isEn ? "Strategic Meeting Debrief" : "تحليل استراتيجي لما بعد الاجتماع"}
            </h2>
            <p className="text-xs text-gray-500 max-w-3xl leading-5">
              {isEn
                ? "Convert post-meeting transcripts into structured institutional memory for future country intelligence and briefing generation."
                : "تحويل نصوص الاجتماعات إلى ذاكرة مؤسسية منظمة لإحاطات وملفات الدول المستقبلية."}
            </p>
          </div>

          <div className="grid grid-cols-2 bg-[#F8F8F6] border border-gold-border rounded-sm p-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("new")}
              className={`px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest font-mono font-black cursor-pointer flex items-center justify-center gap-2 ${
                viewMode === "new" ? "bg-emerald-deep text-white" : "text-gray-500 hover:text-slate-vip"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isEn ? "New Debrief" : "تحليل جديد"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("history")}
              className={`px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest font-mono font-black cursor-pointer flex items-center justify-center gap-2 ${
                viewMode === "history" ? "bg-emerald-deep text-white" : "text-gray-500 hover:text-slate-vip"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{isEn ? "Meeting History" : "سجل الاجتماعات"}</span>
            </button>
          </div>
        </div>
      </section>

      {viewMode === "new" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 bg-white rounded-sm shadow-md border border-gold-border overflow-hidden">
            <div className="bg-slate-vip text-white px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <ClipboardList className="w-4 h-4 text-gold-deep shrink-0" />
                <h3 className="font-serif font-bold text-base truncate">
                  {isEn ? "Meeting Metadata" : "بيانات الاجتماع"}
                </h3>
              </div>
              <span className="text-[9px] uppercase font-mono font-black text-gold-deep">
                {metadata.confidentialityLevel}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                  {isEn ? "Meeting Title" : "عنوان الاجتماع"}
                </span>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(event) => updateMetadata("title", event.target.value)}
                  className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                  placeholder={isEn ? "e.g. UAE-Brazil Clean Corridors Follow-Up" : "مثال: متابعة ممرات الطاقة النظيفة"}
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                    {isEn ? "Country" : "الدولة"}
                  </span>
                  <select
                    value={metadata.countryId}
                    onChange={(event) => handleCountryChange(event.target.value)}
                    className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                  >
                    {countryOptions.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {isEn ? country.nameEn : country.nameAr}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                    {isEn ? "Meeting Date" : "تاريخ الاجتماع"}
                  </span>
                  <input
                    type="date"
                    value={metadata.meetingDate}
                    onChange={(event) => updateMetadata("meetingDate", event.target.value)}
                    className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                    {isEn ? "Sector" : "القطاع"}
                  </span>
                  <input
                    type="text"
                    value={metadata.sector}
                    onChange={(event) => updateMetadata("sector", event.target.value)}
                    className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                    {isEn ? "Meeting Type" : "نوع الاجتماع"}
                  </span>
                  <select
                    value={metadata.meetingType}
                    onChange={(event) => updateMetadata("meetingType", event.target.value)}
                    className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                  >
                    <option>Bilateral meeting</option>
                    <option>Ministerial meeting</option>
                    <option>Technical working group</option>
                    <option>Delegation roundtable</option>
                    <option>Follow-up call</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                  {isEn ? "Attendees" : "الحضور"}
                </span>
                <textarea
                  value={metadata.attendees}
                  onChange={(event) => updateMetadata("attendees", event.target.value)}
                  rows={3}
                  className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep resize-y"
                  placeholder={isEn ? "Names, entities, and roles" : "الأسماء والجهات والأدوار"}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                  {isEn ? "Confidentiality Level" : "مستوى السرية"}
                </span>
                <select
                  value={metadata.confidentialityLevel}
                  onChange={(event) => updateMetadata("confidentialityLevel", event.target.value)}
                  className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                >
                  <option>Internal</option>
                  <option>Confidential</option>
                  <option>Restricted</option>
                  <option>Leadership Only</option>
                </select>
              </label>
            </div>
          </section>

          <section className="xl:col-span-7 bg-white rounded-sm shadow-md border border-gold-border overflow-hidden">
            <div className="bg-[#F8F8F6] border-b border-gold-border px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-deep" />
                <h3 className="font-serif font-bold text-base text-slate-vip">
                  {isEn ? "Transcript Input" : "نص الاجتماع"}
                </h3>
              </div>
              <label className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-gold-bg border border-gold-border rounded-sm text-[10px] uppercase tracking-widest font-mono font-black text-slate-vip cursor-pointer">
                <UploadCloud className="w-3.5 h-3.5 text-emerald-deep" />
                <span>{isEn ? "Upload Text" : "رفع ملف نصي"}</span>
                <input
                  type="file"
                  accept=".txt,.md,.csv,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="p-5 space-y-4">
              {fileNotice && (
                <div className="flex items-start gap-2 bg-gold-bg border border-gold-border rounded-sm p-3 text-xs text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-deep shrink-0 mt-0.5" />
                  <span>{fileNotice}</span>
                </div>
              )}

              <textarea
                value={transcriptText}
                onChange={(event) => setTranscriptText(event.target.value)}
                rows={18}
                className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-3 text-sm leading-6 outline-none focus:ring-1 focus:ring-emerald-deep resize-y"
                placeholder={isEn ? "Paste the meeting transcript here..." : "الصق نص الاجتماع هنا..."}
              />

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                  {selectedCountry && <span>{selectedCountry.flag} {isEn ? selectedCountry.nameEn : selectedCountry.nameAr}</span>}
                  <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                  <span>{transcriptText.trim().length.toLocaleString()} {isEn ? "characters" : "حرف"}</span>
                  {uploadedFileName && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                      <span>{uploadedFileName}</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={analyzeTranscript}
                  disabled={isAnalyzing || !canAnalyze}
                  className="px-4 py-2.5 bg-emerald-deep hover:bg-[#067242] text-white rounded-sm text-[10px] uppercase tracking-widest font-mono font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  <span>{isAnalyzing ? (isEn ? "Analyzing" : "جار التحليل") : (isEn ? "Run AI Analysis" : "تشغيل التحليل")}</span>
                </button>
              </div>

              {analysisError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{analysisError}</span>
                </div>
              )}
            </div>
          </section>

          <section className="xl:col-span-12">
            {!debrief ? (
              <div className="bg-white rounded-sm shadow-md border border-dashed border-gold-border p-10 text-center">
                <BrainCircuit className="w-12 h-12 text-gold-deep mx-auto mb-3" />
                <h3 className="font-serif font-bold text-lg text-slate-vip">
                  {isEn ? "Generated debrief will appear here" : "سيظهر التحليل هنا"}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  {isEn ? "Complete metadata, paste transcript text, then run analysis." : "أكمل بيانات الاجتماع والصق النص ثم شغل التحليل."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-sm shadow-md border border-gold-border overflow-hidden">
                <div className="bg-slate-vip text-white px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-deep" />
                    <div>
                      <h3 className="font-serif font-bold text-base">
                        {isEn ? "Review Generated Debrief" : "مراجعة التحليل الناتج"}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {analysisSource || "structured-analysis"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={saveDebrief}
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-gold-deep hover:bg-[#b9914c] text-slate-vip rounded-sm text-[10px] uppercase tracking-widest font-mono font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isEn ? "Save to Intelligence Memory" : "حفظ في ذاكرة الاستخبارات"}</span>
                  </button>
                </div>

                <div className="p-5 md:p-6 space-y-5">
                  {saveStatus && (
                    <div className="flex items-center gap-2 bg-emerald-deep/10 border border-emerald-deep/20 rounded-sm p-3 text-xs text-emerald-deep font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{saveStatus}</span>
                    </div>
                  )}
                  {saveError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <label className="block space-y-1.5 lg:col-span-2">
                      <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                        {isEn ? "Executive Summary" : "الملخص التنفيذي"}
                      </span>
                      <textarea
                        value={debrief.executiveSummary}
                        onChange={(event) => updateDebriefText("executiveSummary", event.target.value)}
                        rows={4}
                        className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm leading-6 outline-none focus:ring-1 focus:ring-emerald-deep resize-y"
                      />
                    </label>

                    {debriefSections.map((section) => (
                      <label key={section.key} className={`block space-y-1.5 ${section.key === "strategicTags" ? "lg:col-span-2" : ""}`}>
                        <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                          {isEn ? section.titleEn : section.titleAr}
                        </span>
                        <textarea
                          value={linesToText(debrief[section.key])}
                          onChange={(event) => updateDebriefArray(section.key, event.target.value)}
                          rows={section.key === "strategicTags" ? 2 : 5}
                          className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm leading-6 outline-none focus:ring-1 focus:ring-emerald-deep resize-y"
                        />
                      </label>
                    ))}

                    <label className="block space-y-1.5 lg:col-span-2">
                      <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                        {isEn ? "Relationship Impact Analysis" : "تحليل أثر العلاقة"}
                      </span>
                      <textarea
                        value={debrief.relationshipImpactAnalysis}
                        onChange={(event) => updateDebriefText("relationshipImpactAnalysis", event.target.value)}
                        rows={4}
                        className="w-full border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2.5 text-sm leading-6 outline-none focus:ring-1 focus:ring-emerald-deep resize-y"
                      />
                    </label>
                  </div>

                  <div className="border border-gold-border rounded-sm overflow-hidden">
                    <div className="bg-[#F8F8F6] border-b border-gold-border px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-emerald-deep" />
                        <h4 className="font-serif font-bold text-sm text-slate-vip">
                          {isEn ? "Action Items" : "إجراءات المتابعة"}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={addActionItem}
                        className="px-3 py-2 bg-white hover:bg-gold-bg border border-gold-border rounded-sm text-[10px] uppercase tracking-widest font-mono font-black text-slate-vip cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-deep" />
                        <span>{isEn ? "Add" : "إضافة"}</span>
                      </button>
                    </div>

                    <div className="divide-y divide-gold-border">
                      {debrief.actionItems.length === 0 ? (
                        <div className="p-5 text-sm text-gray-500">
                          {isEn ? "No action items generated." : "لم يتم إنشاء إجراءات متابعة."}
                        </div>
                      ) : (
                        debrief.actionItems.map((item, index) => (
                          <div key={index} className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(event) => updateActionItem(index, { ...item, description: event.target.value })}
                              className="lg:col-span-5 border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                              placeholder={isEn ? "Action item" : "الإجراء"}
                            />
                            <input
                              type="text"
                              value={item.suggestedOwner}
                              onChange={(event) => updateActionItem(index, { ...item, suggestedOwner: event.target.value })}
                              className="lg:col-span-2 border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                              placeholder={isEn ? "Owner" : "المالك"}
                            />
                            <select
                              value={item.priority}
                              onChange={(event) => updateActionItem(index, { ...item, priority: event.target.value as MeetingActionPriority })}
                              className="lg:col-span-1 border border-gold-border bg-[#FAFAF8] rounded-sm px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                            >
                              {priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}
                            </select>
                            <input
                              type="text"
                              value={item.deadline || ""}
                              onChange={(event) => updateActionItem(index, { ...item, deadline: event.target.value })}
                              className="lg:col-span-2 border border-gold-border bg-[#FAFAF8] rounded-sm px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                              placeholder={isEn ? "Deadline" : "الموعد"}
                            />
                            <select
                              value={item.status}
                              onChange={(event) => updateActionItem(index, { ...item, status: event.target.value as MeetingActionStatus })}
                              className="lg:col-span-1 border border-gold-border bg-[#FAFAF8] rounded-sm px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                            >
                              {statusOptions.map((status) => <option key={status}>{status}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeActionItem(index)}
                              className="lg:col-span-1 h-10 border border-red-200 hover:bg-red-50 text-red-700 rounded-sm flex items-center justify-center cursor-pointer"
                              title={isEn ? "Remove action item" : "حذف الإجراء"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="bg-white rounded-sm shadow-md border border-gold-border overflow-hidden">
          <div className="bg-slate-vip text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-gold-deep" />
              <div>
                <h3 className="font-serif font-bold text-base">
                  {isEn ? "Meeting History" : "سجل الاجتماعات"}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  {historyRecords.length} {isEn ? "records" : "سجل"} · {pendingActionCount} {isEn ? "pending actions" : "إجراء مفتوح"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={isHistoryLoading}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-sm text-[10px] uppercase tracking-widest font-mono font-black text-white cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isHistoryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{isEn ? "Refresh" : "تحديث"}</span>
            </button>
          </div>

          <div className="p-5 border-b border-gold-border bg-[#F8F8F6]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  {isEn ? "Country" : "الدولة"}
                </span>
                <select
                  value={filters.country}
                  onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))}
                  className="w-full border border-gold-border bg-white rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                >
                  <option value="">{isEn ? "All countries" : "كل الدول"}</option>
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {isEn ? country.nameEn : country.nameAr}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                  {isEn ? "Sector" : "القطاع"}
                </span>
                <input
                  type="text"
                  value={filters.sector}
                  onChange={(event) => setFilters((current) => ({ ...current, sector: event.target.value }))}
                  className="w-full border border-gold-border bg-white rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                  placeholder={isEn ? "Energy" : "الطاقة"}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                  {isEn ? "From" : "من"}
                </span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                  className="w-full border border-gold-border bg-white rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500">
                  {isEn ? "To" : "إلى"}
                </span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                  className="w-full border border-gold-border bg-white rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                />
              </label>

              <label className="space-y-1.5 xl:col-span-2">
                <span className="text-[10px] uppercase tracking-widest font-mono font-extrabold text-gray-500 flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  {isEn ? "Keyword" : "كلمة مفتاحية"}
                </span>
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={filters.q}
                    onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                    className="min-w-0 flex-1 border border-gold-border bg-white rounded-sm px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-deep"
                    placeholder={isEn ? "Search summaries, tags, actions..." : "بحث في الملخصات والوسوم والإجراءات..."}
                  />
                  <button
                    type="button"
                    onClick={loadHistory}
                    className="px-3.5 py-2.5 bg-emerald-deep hover:bg-[#067242] text-white rounded-sm cursor-pointer flex items-center justify-center"
                    title={isEn ? "Apply filters" : "تطبيق المرشحات"}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="p-5">
            {historyError && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{historyError}</span>
              </div>
            )}

            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-emerald-deep animate-spin" />
                <span className="text-sm text-gray-500 font-mono font-semibold">
                  {isEn ? "Loading meeting memory..." : "جار تحميل ذاكرة الاجتماعات..."}
                </span>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="border border-dashed border-gold-border rounded-sm p-10 text-center">
                <History className="w-12 h-12 text-gold-deep mx-auto mb-3" />
                <h4 className="font-serif font-bold text-lg text-slate-vip">
                  {isEn ? "No saved debriefs found" : "لا توجد تحليلات محفوظة"}
                </h4>
                <p className="text-sm text-gray-500 mt-2">
                  {isEn ? "Saved meeting debriefs will appear here for future retrieval." : "ستظهر التحليلات المحفوظة هنا للاسترجاع لاحقاً."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyRecords.map((record) => {
                  const isExpanded = expandedRecordId === record.id;
                  const pendingActions = record.debrief.actionItems.filter((actionItem) => actionItem.status !== "Completed");

                  return (
                    <article key={record.id} className="border border-gold-border rounded-sm overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                        className="w-full text-left p-4 hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest font-mono font-black text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="w-3 h-3 text-emerald-deep" />
                                {formatRecordDate(record.metadata.meetingDate, language)}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                              <span>{record.metadata.country}</span>
                              <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                              <span>{record.metadata.sector}</span>
                            </div>
                            <h4 className="font-serif font-bold text-lg text-slate-vip mt-1">
                              {record.metadata.title}
                            </h4>
                            <p className="text-sm text-gray-600 leading-6 mt-2 line-clamp-2">
                              {record.debrief.executiveSummary}
                            </p>
                          </div>
                          <div className="flex flex-wrap lg:justify-end gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gold-bg border border-gold-border rounded-sm text-[10px] font-mono font-black text-slate-vip">
                              <ClipboardList className="w-3 h-3 text-emerald-deep" />
                              {pendingActions.length} {isEn ? "open" : "مفتوح"}
                            </span>
                            <span className="px-2.5 py-1 bg-emerald-deep/10 border border-emerald-deep/15 rounded-sm text-[10px] font-mono font-black text-emerald-deep">
                              {record.metadata.confidentialityLevel}
                            </span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gold-border bg-[#FAFAF8] p-4 space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="bg-white border border-gold-border rounded-sm p-4">
                              <h5 className="text-[10px] uppercase tracking-widest font-mono font-black text-gray-500 flex items-center gap-1.5">
                                <UserRound className="w-3.5 h-3.5 text-emerald-deep" />
                                {isEn ? "Attendees" : "الحضور"}
                              </h5>
                              <p className="text-sm text-gray-700 leading-6 mt-2">{record.metadata.attendees || (isEn ? "Not specified" : "غير محدد")}</p>
                            </div>
                            <div className="bg-white border border-gold-border rounded-sm p-4 lg:col-span-2">
                              <h5 className="text-[10px] uppercase tracking-widest font-mono font-black text-gray-500 flex items-center gap-1.5">
                                <Tags className="w-3.5 h-3.5 text-emerald-deep" />
                                {isEn ? "Strategic Tags" : "الوسوم الاستراتيجية"}
                              </h5>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {record.debrief.strategicTags.map((tag) => (
                                  <span key={tag} className="px-2 py-1 bg-gold-bg border border-gold-border rounded-sm text-[10px] font-mono font-bold text-slate-vip">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white border border-gold-border rounded-sm p-4">
                              <h5 className="font-serif font-bold text-sm text-slate-vip">{isEn ? "Relationship Impact" : "أثر العلاقة"}</h5>
                              <p className="text-sm text-gray-700 leading-6 mt-2">{record.debrief.relationshipImpactAnalysis}</p>
                            </div>
                            <div className="bg-white border border-gold-border rounded-sm p-4">
                              <h5 className="font-serif font-bold text-sm text-slate-vip">{isEn ? "Pending Follow-Up" : "متابعات مفتوحة"}</h5>
                              {pendingActions.length === 0 ? (
                                <p className="text-sm text-gray-500 mt-2">{isEn ? "No pending actions." : "لا توجد إجراءات مفتوحة."}</p>
                              ) : (
                                <ul className="mt-2 space-y-2">
                                  {pendingActions.map((actionItem, index) => (
                                    <li key={`${record.id}-${index}`} className="text-sm text-gray-700 leading-6">
                                      <span className="font-bold text-slate-vip">{actionItem.priority}:</span> {actionItem.description}
                                      <span className="text-gray-500"> · {actionItem.suggestedOwner}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
