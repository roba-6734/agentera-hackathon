import React, { useState, useEffect } from "react";
import { PrebuiltCountry } from "../types";
import { Calendar, CalendarPlus, Clock, Plus, Download, RefreshCw, CheckCircle, Trash2, MapPin, UserCheck, Shield, Clipboard, HelpCircle } from "lucide-react";

interface BilateralSession {
  id: string;
  countryName: string;
  countryNameAr: string;
  title: string;
  titleAr: string;
  objective: string;
  objectiveAr: string;
  date: string;
  time: string;
  location: string;
  locationAr: string;
  sector: string;
  sectorAr: string;
}

interface BilateralCalendarProps {
  country: PrebuiltCountry | null;
  language: "en" | "ar";
}

export default function BilateralCalendar({ country, language }: BilateralCalendarProps) {
  const isEn = language === "en";
  
  // State for universal session logs (shared across active country selections)
  const [sessions, setSessions] = useState<BilateralSession[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Sync state simulation variables
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState("");
  const [syncCompleted, setSyncCompleted] = useState(false);

  // Form field state
  const [meetingCountry, setMeetingCountry] = useState("");
  const [meetingCountryAr, setMeetingCountryAr] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTitleAr, setNewTitleAr] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [newObjectiveAr, setNewObjectiveAr] = useState("");
  const [newDate, setNewDate] = useState("2026-06-10");
  const [newTime, setNewTime] = useState("11:00");
  const [newLocation, setNewLocation] = useState("");
  const [newLocationAr, setNewLocationAr] = useState("");
  const [newSector, setNewSector] = useState("Energy");
  const [newSectorAr, setNewSectorAr] = useState("الطاقة");

  const [formError, setFormError] = useState("");

  // Update country input whenever active country changes to provide seamless UX
  useEffect(() => {
    if (country) {
      setMeetingCountry(country.nameEn);
      setMeetingCountryAr(country.nameAr);
    }
  }, [country]);

  // Preseeded default dates generator (universal list)
  const getPreseededSessions = (): BilateralSession[] => {
    return [
      {
        id: "br-1",
        countryName: "Brazil",
        countryNameAr: "البرازيل",
        title: "UAE-Brazil Agritech & Food Security Working Group",
        titleAr: "مجموعة العمل للأمن الغذائي والزراعة الذكية المشتركة",
        objective: "Review DP World Santos container capacity and coordinate direct clean lanes.",
        objectiveAr: "مراجعة السعة التفريغية لموانئ دبي العالمية بسانتوس وتنسيق الشحن المستدام المباشر.",
        date: "2026-06-10",
        time: "10:00",
        location: "Abu Dhabi Global Market (ADGM) - Room 4",
        locationAr: "سوق أبوظبي العالمي (ADGM) - القاعة 4",
        sector: "Logistics",
        sectorAr: "اللوجستيات والشحن"
      },
      {
        id: "de-1",
        countryName: "Germany",
        countryNameAr: "ألمانيا",
        title: "Ruwais Green Ammonia Supply Logistics Technical Review",
        titleAr: "الجلسة الفنية لإمدادات الأمونيا الخضراء من مصنع الرويس لموانئ الشمال",
        objective: "Co-align ADNOC export plans with Germany's H2Global bidding parameters.",
        objectiveAr: "مواءمة خطط أدنوك للتصدير وتوقيتاتها الاستراتيجية مع متطلبات H2Global.",
        date: "2026-06-11",
        time: "09:00",
        location: "Masdar City Executive Pavilion",
        locationAr: "مجمع مدينة مصدر التنفيذي - أبوظبي",
        sector: "Energy",
        sectorAr: "الطاقة والهيدروجين"
      },
      {
        id: "in-1",
        countryName: "India",
        countryNameAr: "الهند",
        title: "IMEC Undersea Interconnect & HVDC Cable Joint Taskforce",
        titleAr: "الفريق الفني للربط الكهربائي فائق الجهد العابر للبحار (HVDC)",
        objective: "Examine undersea path coordinates linking West India solar fields directly to Fujairah.",
        objectiveAr: "دراسة وتحديد نقاط الإحداثيات البحرية بالاشتراك مع ممثلي شبكة الكهرباء في الهند.",
        date: "2026-06-12",
        time: "11:00",
        location: "Federal Electricity Grid Control Node - Fujairah",
        locationAr: "مركز التحكم الفيدرالي لشبكة الكهرباء الوطنية - الفجيرة",
        sector: "Energy",
        sectorAr: "خطوط الكهرباء الإقليمية"
      }
    ];
  };

  // Load universal cabinet-wide sessions from localStorage or preseed them
  useEffect(() => {
    const customKey = "moei_universal_bilateral_sessions_v2";
    const stored = localStorage.getItem(customKey);
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch (e) {
        setSessions(getPreseededSessions());
      }
    } else {
      const initial = getPreseededSessions();
      setSessions(initial);
      localStorage.setItem(customKey, JSON.stringify(initial));
    }
  }, []);

  // Persist sessions helper
  const saveSessions = (updatedList: BilateralSession[]) => {
    setSessions(updatedList);
    localStorage.setItem("moei_universal_bilateral_sessions_v2", JSON.stringify(updatedList));
  };

  // Add new scheduled bilateral appointment
  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCountry.trim()) {
      setFormError(isEn ? "Please specify the Country Name." : "يرجى تحديد اسم الدولة للوفد.");
      return;
    }
    if (!newTitle.trim()) {
      setFormError(isEn ? "Please fill in the Session Title." : "يرجى كتابة عنوان الجلسة الثنائية.");
      return;
    }
    setFormError("");

    const newSessionItem: BilateralSession = {
      id: `session-${Date.now()}`,
      countryName: meetingCountry,
      countryNameAr: meetingCountryAr || meetingCountry,
      title: newTitle,
      titleAr: newTitleAr || newTitle,
      objective: newObjective || "Establish core bilateral dialogue routes.",
      objectiveAr: newObjectiveAr || "تأسيس خطوط التفاهم الاقتصادي.",
      date: newDate,
      time: newTime,
      location: newLocation || "MOEI Headquarters, Abu Dhabi",
      locationAr: newLocationAr || "ديوان عام الوزارة - أبوظبي",
      sector: newSector,
      sectorAr: newSectorAr
    };

    const updated = [newSessionItem, ...sessions];
    saveSessions(updated);

    // Reset optional title/objective fields but keep country context
    setNewTitle("");
    setNewTitleAr("");
    setNewObjective("");
    setNewObjectiveAr("");
    setNewLocation("");
    setNewLocationAr("");
    
    // Smooth scroll to list view or show success
    setSyncCompleted(false);
  };

  // Delete scheduled bilateral appointment
  const handleDeleteSession = (idToDelete: string) => {
    const filtered = sessions.filter(s => s.id !== idToDelete);
    saveSessions(filtered);
  };

  // Export to standard calendar ICS file to let user import to Outlook/Google Calendar
  const handleExportToIcs = (session: BilateralSession) => {
    const formatIcsDate = (dateStr: string, timeStr: string) => {
      const cleanDate = dateStr.replace(/-/g, "");
      const cleanTime = timeStr.replace(/:/g, "") + "00";
      return `${cleanDate}T${cleanTime}`;
    };

    const startDateTime = formatIcsDate(session.date, session.time);
    
    // Default duration: 1 hour
    const [hours, minutes] = session.time.split(":").map(Number);
    let endHours = hours + 1;
    if (endHours >= 24) endHours = 23;
    const endStr = `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const endDateTime = formatIcsDate(session.date, endStr);

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MOEI UAE//Bilateral Cabinet Support Room//EN",
      "BEGIN:VEVENT",
      `UID:${session.id}@cabinet.moei.gov.ae`,
      `DTSTAMP:${formatIcsDate("2026-06-09", "11:00")}`,
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${isEn ? session.title : session.titleAr} (${isEn ? session.countryName : session.countryNameAr})`,
      `LOCATION:${isEn ? session.location : session.locationAr}`,
      `DESCRIPTION:Cabinet Bilateral Meeting with ${isEn ? session.countryName : session.countryNameAr}. Sector Focus: ${isEn ? session.sector : session.sectorAr}. Objective: ${isEn ? session.objective : session.objectiveAr}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Cabinet_Bilateral_${session.countryName.replace(/\s+/g, "_")}_Session.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Simulate secure, encrypted synchronization protocol with the UAE Ministry network
  const handleSimulateSync = () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    setSyncCompleted(false);

    const stepsEn = [
      "Targeting MOEI Federal Gateway Hub 4...",
      "Validating encryption keys and delegation digital seal...",
      "Uploading session dates payload via AES-256 secure channel...",
      "Syncing scheduled sessions with delegation Outlook federation...",
      "Synchronization achieved! Verified by Cabinet Node."
    ];

    const stepsAr = [
      "يجري الاتصال بالبوابة الاتحادية لوزارة الطاقة والبنية التحتية...",
      "التحقق من المفاتيح التشفيرية وختم الوفد الإماراتي الرقمي...",
      "رفع حمولة المواعيد المجدولة عبر قناة AES-256 الآمنة...",
      "تزامن التوقيتات بنجاح مع الفيدراليات والتقويم الوزاري المشترك...",
      "اكتملت المزامنة! تم التصديق والأرشفة في ديوان عام الوزير."
    ];

    const steps = isEn ? stepsEn : stepsAr;
    let idx = 0;
    setSyncStatusText(steps[0]);

    const interval = setInterval(() => {
      idx++;
      if (idx < steps.length) {
        setSyncStatusText(steps[idx]);
      } else {
        clearInterval(interval);
        setIsSyncingAll(false);
        setSyncCompleted(true);
      }
    }, 600);
  };

  return (
    <div className="bg-white rounded-sm shadow-md border-t-4 border-emerald-deep p-5 md:p-6 space-y-4" id="bilateral-calendar-module">
      
      {/* Top Bar with Add Meeting Schedule Icon */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-deep/5 rounded-full flex items-center justify-center text-emerald-deep">
            <CalendarPlus className="w-5 h-5 text-emerald-deep" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#C5A059] font-extrabold block">
                {isEn ? "CABINET PORTFOLIO SCHEDULE" : "برنامج المواعيد والوفود لمجلس الوزراء"}
              </span>
              <span className="text-[9px] bg-red-600 text-white font-mono px-1.5 py-0.2 rounded font-extrabold animate-pulse uppercase">
                {isEn ? "Live Sync" : "مباشر"}
              </span>
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-slate-vip mt-0.5">
              {isEn ? "Bilateral Summit & Mission Scheduler" : "مركز جدولة اللقاءات الثنائية والمهمات الدبلوماسية"}
            </h3>
          </div>
        </div>

        {/* Toggle Collapse and Sync buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateSync}
            disabled={isSyncingAll || sessions.length === 0}
            className="bg-emerald-deep hover:bg-emerald-deep/95 text-white font-mono font-bold text-[9px] uppercase tracking-widest px-3 py-2 rounded-sm shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            id="btn-trigger-sync"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncingAll ? "animate-spin" : ""}`} />
            <span>{isEn ? "Sync Gateway" : "مزامنة البوابة الاتحادية"}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-[#FAF8F5] border border-gold-border hover:bg-gold-bg text-slate-vip font-mono font-bold text-[10px] uppercase tracking-wider px-3-4 py-2 rounded-sm transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{isExpanded ? (isEn ? "Collapse [-]" : "طوي [-]") : (isEn ? `Expand Scheduler (+${sessions.length})` : `عرض المفكرة (+${sessions.length})`)}</span>
          </button>
        </div>
      </div>

      {/* Sync visual status notifier */}
      {(syncStatusText || syncCompleted) && (
        <div 
          className={`p-3 rounded-sm border text-xs ${
            syncCompleted 
              ? "bg-[#F0F5F2] border-emerald-deep/20 text-emerald-deep" 
              : "bg-gold-bg/50 border-gold-border text-slate-vip"
          } flex items-center justify-between font-medium animate-fadeIn`}
          id="sync-status-indicator"
        >
          <div className="flex items-center gap-2">
            {syncCompleted ? (
              <CheckCircle className="w-4 h-4 text-emerald-deep shrink-0" />
            ) : (
              <div className="w-3 h-3 rounded-full border-2 border-gold-deep border-t-transparent animate-spin shrink-0"></div>
            )}
            <span>{syncStatusText}</span>
          </div>
          {syncCompleted && (
            <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-deep text-white rounded font-bold uppercase">
              {isEn ? "VERIFIED" : "تم التصديق الفيدرالي"}
            </span>
          )}
        </div>
      )}

      {/* Scheduler Inner Content */}
      {isExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 animate-fadeIn" id="calendar-grid-divider">
          
          {/* Left: Schedule Form with Optional Objective Statement */}
          <div className="lg:col-span-5 bg-gold-bg/30 p-4 rounded-sm border border-gold-border" id="session-form-container">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gold-border/40">
              <Plus className="w-4 h-4 text-emerald-deep" />
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-slate-vip">
                {isEn ? "Log Bilateral Summit Session" : "توثيق وحجز لقاء دبلوماسي"}
              </h4>
            </div>

            <form onSubmit={handleAddSession} className="space-y-3.5" id="add-session-form">
              {formError && (
                <p className="text-xs text-red-600 font-bold font-sans bg-red-50 p-2 border border-red-200">⚠️ {formError}</p>
              )}

              {/* Country Picker/Input - Explicit Country Name field */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-gray-500 font-bold block">
                    {isEn ? "Country Name (En) *" : "اسم دولة الوفد (إنكليزي) *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brazil, Norway, Japan"
                    value={meetingCountry}
                    onChange={e => setMeetingCountry(e.target.value)}
                    className="w-full bg-white border border-gold-border rounded-sm px-2.5 py-1.5 text-xs font-sans placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold-deep"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-gray-500 font-bold block">
                    {isEn ? "Country Name (Ar)" : "اسم دولة الوفد (عربي)"}
                  </label>
                  <input
                    type="text"
                    placeholder="البرازيل، النرويج، اليابان"
                    value={meetingCountryAr}
                    onChange={e => setMeetingCountryAr(e.target.value)}
                    className="w-full bg-white border border-gold-border rounded-sm px-2.5 py-1.5 text-xs font-sans placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold-deep text-right"
                    style={{ direction: "rtl" }}
                  />
                </div>
              </div>

              {/* Title Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-gray-500 font-bold block">
                    {isEn ? "Summit Title (English) *" : "عنوان اللقاء بالإنكليزية *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Masdar Smart Grid Co-finance"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-white border border-gold-border rounded-sm px-2.5 py-1.5 text-xs font-sans placeholder-gray-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-gray-500 font-bold block">
                    {isEn ? "Summit Title (Arabic)" : "عنوان الموعد بالعربية"}
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: قمة الهيدروجين الأخضر المشترك"
                    value={newTitleAr}
                    onChange={e => setNewTitleAr(e.target.value)}
                    className="w-full bg-white border border-gold-border rounded-sm px-2.5 py-1.5 text-xs font-sans placeholder-gray-400 focus:outline-none text-right"
                    style={{ direction: "rtl" }}
                  />
                </div>
              </div>

              {/* Crucial Optional Objective Statement Field */}
              <div className="space-y-1 border-t border-gold-border/20 pt-2 pb-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] uppercase font-mono tracking-widest text-[#9c7823] font-extrabold block">
                    {isEn ? "Bilateral Objective Statement" : "بيان الهدف الاستراتيجي والمخرجات المرغوبة"}
                  </label>
                  <span className="text-[8px] bg-[#FAF6ED] text-gold-deep font-mono px-1 border border-gold-border rounded">
                    {isEn ? "OPTIONAL OBJECTIVE" : "هدفي اختياري"}
                  </span>
                </div>
                
                <input
                  type="text"
                  placeholder={isEn ? "e.g. Est. carbon offsets & optimize port clearing speeds" : "مثال: تأسيس موازنة الكربون وتسريع فحص سفن الشحن"}
                  value={newObjective}
                  onChange={e => setNewObjective(e.target.value)}
                  className="w-full bg-white border border-gold-border rounded-sm px-2.5 py-1.5 text-xs font-sans placeholder-gray-400 focus:outline-none"
                />

                <input
                  type="text"
                  placeholder="بيان الغاية والمستهدفات كمسودة لصانع القرار"
                  value={newObjectiveAr}
                  onChange={e => setNewObjectiveAr(e.target.value)}
                  className="w-full bg-white border border-gold-border rounded-sm px-2.5 py-1.5 text-xs font-sans placeholder-gray-400 focus:outline-none text-right placeholder-right mt-1.5"
                  style={{ direction: "rtl" }}
                />
              </div>

              {/* Date, Time, Sector focus */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono text-gray-500 font-bold block">
                    {isEn ? "Meeting Date" : "تاريخ الاجتماع"}
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full bg-white border border-gold-border rounded-sm px-2.5 py-1 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono text-gray-500 font-bold block">
                    {isEn ? "Meeting Time (GST)" : "التوقيت المقترح (دبي)"}
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full bg-white border border-gold-border rounded-sm px-2.5 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono text-gray-500 font-bold block">
                    {isEn ? "Focused Sector" : "القطاع المعني"}
                  </label>
                  <select
                    value={newSector}
                    onChange={e => {
                      setNewSector(e.target.value);
                      const sectorMapAr: Record<string, string> = {
                        Energy: "الطاقة والهيدروجين",
                        Logistics: "اللوجستيات والموانئ",
                        Sustainability: "الاستدامة والبيئة",
                        Knowledge: "نقل وتبادل المعرفة",
                        Strategy: "التطوير الاستراتيجي"
                      };
                      setNewSectorAr(sectorMapAr[e.target.value] || "الطاقة");
                    }}
                    className="w-full bg-white border border-gold-border rounded-sm px-2 py-1 text-xs font-bold text-slate-vip"
                  >
                    <option value="Energy">Energy</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Sustainability">Sustainability</option>
                    <option value="Knowledge">Knowledge</option>
                    <option value="Strategy">Strategy</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono text-gray-500 font-bold block">
                    {isEn ? "Meeting Location" : "الموقع الدبلوماسي"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MOEI HQ, Abu Dhabi"
                    value={newLocation}
                    onChange={e => {
                      setNewLocation(e.target.value);
                      setNewLocationAr(e.target.value);
                    }}
                    className="w-full bg-white border border-gold-border rounded-sm px-2 py-1 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-vip hover:bg-slate-vip/90 text-white font-mono font-bold text-[10px] uppercase tracking-widest py-2.5 rounded-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-gold-deep" />
                <span>{isEn ? "Schedule bilateral Summit" : "توثيق وجدول الموعد فوراً"}</span>
              </button>
            </form>
          </div>

          {/* Right: Upcoming Agenda & Exporters */}
          <div className="lg:col-span-7 space-y-3" id="scheduled-meetings-timeline">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#C5A059] font-bold">
                {isEn ? "UPCOMING BIATERAL AGENDA DISPATCH" : "الأجندة الدبلوماسية النشطة لوزارة الهيئة"}
              </span>
              <span className="text-[9px] font-mono font-bold text-emerald-deep bg-[#F0F5F2] px-2 py-0.5 rounded border border-emerald-deep/20">
                {sessions.length} {isEn ? "Total Forums" : "لقاءات ثنائية"}
              </span>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-gray-50 border border-gold-border rounded-sm p-8 text-center" id="empty-calendar-message">
                <Shield className="w-8 h-8 text-gold-deep mx-auto mb-2" />
                <p className="text-xs font-serif font-bold text-slate-vip">
                  {isEn ? "No planned bilateral dates configured." : "لا توجد مواعيد ثنائية مسجلة حالياً."}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {isEn ? "Use the sidebar scheduler to record custom delegation events." : "يرجى تعبئة الحقول لإدراج المواعيد للوزراء."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1" id="scheduled-agenda-scroller">
                {sessions.map((ses) => (
                  <div
                    key={ses.id}
                    className="bg-white border border-gold-border/80 border-l-4 border-emerald-deep shadow-sm hover:shadow-md transition-shadow p-3.5 flex flex-col justify-between gap-2 text-xs"
                    id={`session-card-${ses.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[8px] bg-slate-vip text-white px-2 py-0.5 rounded font-mono font-extrabold border border-gold-deep/20 uppercase tracking-wider">
                            {isEn ? ses.countryName : ses.countryNameAr}
                          </span>
                          <span className="text-[8px] bg-gold-bg text-gold-deep px-1.5 py-0.5 rounded font-mono font-bold border border-gold-border uppercase tracking-wider">
                            {isEn ? ses.sector : ses.sectorAr}
                          </span>
                          <span className="text-[8px] font-mono text-gray-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gold-deep" />
                            <span>{ses.date} | {ses.time}</span>
                          </span>
                        </div>
                        <h5 className="font-serif font-bold text-slate-vip text-sm mt-1">
                          {isEn ? ses.title : ses.titleAr}
                        </h5>
                        <p className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-deep" />
                          <span>{isEn ? ses.location : ses.locationAr}</span>
                        </p>
                      </div>

                      {/* Cancel item button */}
                      <button
                        onClick={() => handleDeleteSession(ses.id)}
                        className="p-1 hover:bg-red-50 text-red-500 rounded-sm hover:text-red-700 transition-colors cursor-pointer"
                        title={isEn ? "Cancel session" : "إلغاء حجز الموعد"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Objective statement view */}
                    {ses.objective && (
                      <div className="bg-[#FAF8F5] border-l-2 border-gold-deep p-2 text-[11px] text-gray-600 leading-relaxed font-sans rounded-xs flex items-start gap-1 w-full">
                        <Clipboard className="w-3 h-3 text-[#C5A059] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-vip text-[9px] uppercase font-mono block">
                            {isEn ? "Bilateral Objective" : "الهدف التوجيهي والمستهدف"}
                          </strong>
                          <span>{isEn ? ses.objective : ses.objectiveAr}</span>
                        </div>
                      </div>
                    )}

                    {/* Operational export */}
                    <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-2 text-[9px] gap-2 pt-2">
                      <span className="font-mono text-gray-400 font-bold flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-emerald-deep" />
                        <span>{isEn ? "UAE Minister alignment ready" : "جاهزية الفريق الوزاري الإماراتي"}</span>
                      </span>

                      <button
                        onClick={() => handleExportToIcs(ses)}
                        className="bg-gold-bg hover:bg-gold-border/40 text-slate-vip border border-gold-border px-2 py-1 rounded-sm font-mono font-bold text-[8px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-gold-deep" />
                        <span>{isEn ? "Export ICS file" : "تحميل ملف الموعد (.ics)"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* compact view when collapsed */}
      {!isExpanded && sessions.length > 0 && (
        <div className="bg-gold-bg/30 border border-gold-border/40 p-3 rounded-xs text-[11px] flex gap-4 overflow-x-auto items-center whitespace-nowrap scrollbar-thin" id="collapsed-horizontal-reel">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-vip shrink-0 border-r border-gold-border/60 pr-3 my-0.5">
            {isEn ? "UPCOMING FORUMS" : "الملتقيات القادمة"}:
          </span>
          {sessions.slice(0, 3).map((ses) => (
            <div key={ses.id} className="flex items-center gap-2" id={`collapsed-item-${ses.id}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-deep"></span>
              <span className="font-bold text-slate-vip shrink-0">{isEn ? ses.countryName : ses.countryNameAr} ({ses.date})</span>
              <span className="text-gray-500 max-w-[200px] truncate pr-3 border-r border-gray-100">{isEn ? ses.title : ses.titleAr}</span>
            </div>
          ))}
          {sessions.length > 3 && (
            <span className="text-emerald-deep font-mono font-bold text-[10px] shrink-0">
              +{sessions.length - 3} {isEn ? "more sessions" : "جلسات أخرى"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
