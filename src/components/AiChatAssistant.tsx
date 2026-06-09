import React, { useState } from "react";
import { Sparkles, Send, ShieldAlert, Cpu, X } from "lucide-react";

interface AiChatAssistantProps {
  language: "en" | "ar";
  selectedCountryCode: string;
  selectedCountryNameEn: string;
  selectedCountryNameAr: string;
  onNewBriefGenerated: (text: string) => void;
  onClose?: () => void;
}

export default function AiChatAssistant({
  language,
  selectedCountryCode,
  selectedCountryNameEn,
  selectedCountryNameAr,
  onNewBriefGenerated,
  onClose,
}: AiChatAssistantProps) {
  const isEn = language === "en";
  const [userInput, setUserInput] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ sender: "user" | "advisor"; text: string }>>([
    {
      sender: "advisor",
      text: isEn
        ? `Welcome, Executive Dignitary. I am your AI Strategic Advisor. Submit any question about ${selectedCountryNameEn} to generate immediate custom briefs or policy analyses.`
        : `أهلاً بك يا صاحب السمو والمعالي. أنا المستشار الرقمي الاستراتيجي لعلوم الطاقة والبنية التحتية. يرجى التفضل بطرح أي استفسار حول ملف ${selectedCountryNameAr} لتفنيد فرص التعاون والتفاوض ثنائياً.`,
    },
  ]);

  const quickPrompts = isEn
    ? [
        {
          label: "Renewable energy synergy",
          query: `What are the highest value wind or solar cooperation avenues with ${selectedCountryNameEn} for Masdar?`,
        },
        {
          label: "Smart ports & shipping corridor",
          query: `How can DP World expand smart logistics or green corridors with ${selectedCountryNameEn}?`,
        },
        {
          label: "Risk evaluation & countermeasures",
          query: `What are the primary investment or regulatory risks in ${selectedCountryNameEn} and their mitigator tactics?`,
        },
        {
          label: "Compare indicators vs UAE",
          query: `Provide a direct comparative policy analysis of ${selectedCountryNameEn} infrastructure capabilities compared with the UAE.`,
        },
      ]
    : [
        {
          label: "آفاق الطاقة المتجددة بمجالات شركة مصدر",
          query: `ما هي أهم قنوات تجمعات الطاقة الشمسية والرياح للتعاون الثنائي في شركة مصدر مع ${selectedCountryNameAr}؟`,
        },
        {
          label: "الممرات الخضراء ورقمنة الموانئ",
          query: `كيف يمكن لموانئ دبي العالمية إبرام ممرات تداول وشحن بحري نظيف مع ${selectedCountryNameAr}؟`,
        },
        {
          label: "دراسة وتطويق المخاطر التنظيمية",
          query: `ما هي أهم التحديات أو العوائق البيروقراطية في ${selectedCountryNameAr} وكيفية تفاديها أو معالجتها؟`,
        },
        {
          label: "مقارنة السياسات والمؤشرات مع الإمارات",
          query: `توفير مقارنة تحليلية مباشرة لجاهزية الطرق والموانئ في ${selectedCountryNameAr} مع المكتسبات الفيدرالية للإمارات.`,
        },
      ];

  const handleSendMessage = async (customQueryText?: string) => {
    const queryToSubmit = customQueryText || userInput;
    if (!queryToSubmit.trim()) return;

    // Log user response
    const nextLog = [...chatLog, { sender: "user", text: queryToSubmit } as const];
    setChatLog(nextLog);
    setUserInput("");
    setIsQuerying(true);

    try {
      const resp = await fetch("/api/advisor/brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: selectedCountryCode,
          question: queryToSubmit,
          language: language,
        }),
      });

      const data = await resp.json();
      const aiResponseText = data.aiBriefing?.rawText || "Strategic answer couldn't be compiled.";

      // Log AI response
      setChatLog((prev) => [...prev, { sender: "advisor", text: aiResponseText }]);

      // Dynamically update the main workspace with the newly generated detailed brief!
      onNewBriefGenerated(aiResponseText);

    } catch (error) {
      console.error("AI Advisor Query Error:", error);
      setChatLog((prev) => [
        ...prev,
        {
          sender: "advisor",
          text: isEn
            ? "Secure server connection temporarily unresponsive. Falling back to structured bilateral data models. Check standard channels."
            : "تعذر الاتصال بمركز المستشار الذكي، يجري التوثيق ثنائياً عبر قاعدة العلوم المعتمدة محلياً.",
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="bg-white rounded-sm shadow-md border border-gold-border overflow-hidden flex flex-col h-full" id="ai-chat-assistant-container">
      
      {/* Advisor Identity header */}
      <div className="bg-slate-vip p-4 border-b border-gold-deep/20 flex items-center justify-between" id="chat-header-identity">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gold-deep/10 text-gold-deep rounded-sm flex items-center justify-center border border-gold-deep/25">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-sm text-gray-100 block">
              {isEn ? "Dignitary Direct Policy Advisor" : "المستشار الفيدرالي لصناعة وحوكمة القرار"}
            </h4>
            <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-light font-bold">
              {isEn ? "Gemini Strategic Grounding Enabled" : "منظومة جيمني للاستنباط الدبلوماسي نشطة"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#172520] px-2 py-1 rounded border border-emerald-deep/35">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-light block animate-pulse"></span>
            <span className="text-[9px] font-mono text-emerald-light font-extrabold uppercase tracking-wider">ONLINE</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-white/10"
              title={isEn ? "Close Chat" : "إغلاق المحادثة"}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message logs area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50" id="chat-scroller-log">
        {chatLog.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} items-start gap-3`}
            id={`chat-msg-row-${idx}`}
          >
            {msg.sender === "advisor" && (
              <div className="h-7 w-7 rounded bg-gold-bg border border-gold-border/60 text-gold-deep text-[10px] font-bold font-serif flex items-center justify-center shrink-0">
                UAE
              </div>
            )}
            <div
              className={`rounded-sm p-4 text-sm leading-relaxed max-w-[85%] ${
                msg.sender === "user"
                  ? "bg-emerald-deep text-white shadow-sm border border-emerald-deep ml-12"
                  : "bg-white text-slate-vip shadow-sm border border-gold-border mr-12"
              }`}
              style={{ direction: language === "ar" ? "rtl" : "ltr" }}
            >
              <div className="prose max-w-none text-xs sm:text-sm">
                <style>{`
                  .chat-brief-text h3 { font-size: 1rem; font-weight: 700; color: #005A3C; margin-top: 1rem; margin-bottom: 0.4rem; font-family: var(--font-serif); }
                  .chat-brief-text p { margin-bottom: 0.8rem; }
                  .chat-brief-text strong { color: #005A3C; font-weight: 600; }
                  .chat-brief-text ul { list-style-type: disc; margin-left: 1.25rem; margin-bottom: 0.8rem; }
                  .chat-brief-text li { margin-bottom: 0.3rem; }
                `}</style>
                <div className="chat-brief-text leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n\n/g, "<br/><br/>").replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/### (.*?)\n/g, "<h3>$1</h3>") }} />
              </div>
            </div>
          </div>
        ))}

        {isQuerying && (
          <div className="flex justify-start items-center gap-3" id="chat-loading-item">
            <div className="h-7 w-7 rounded bg-gold-bg text-gold-deep text-[10px] font-bold font-serif flex items-center justify-center shrink-0">
              UAE
            </div>
            <div className="bg-white rounded-sm border border-gold-border p-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gold-deep animate-ping"></div>
              <span className="text-xs text-gray-400 font-semibold font-mono">
                {isEn ? "Advisor is formulating policy memo..." : "الخادم يربط النبذة ويصيغ المذكرة..."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested prompts helper ribbon */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 xl:block overflow-x-auto whitespace-nowrap" id="chat-suggested-prompts">
        <div className="flex gap-2 text-xs">
          {quickPrompts.map((p, idxPt) => (
            <button
              key={idxPt}
              onClick={() => handleSendMessage(p.query)}
              disabled={isQuerying}
              className="bg-gold-bg hover:bg-gold-border/30 border border-gold-border text-slate-vip px-3 py-1.5 rounded-full font-bold transition-all text-ellipsis overflow-hidden max-w-[280px] cursor-pointer"
            >
              🚀 {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt text formulation */}
      <div className="bg-slate-vip p-4 border-t border-gold-deep/15 flex items-center gap-3" id="chat-user-form">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder={isEn ? "Submit custom strategic question..." : "اطرح سؤالك الاستراتيجي للوزير والوفد هنا..."}
          disabled={isQuerying}
          className="flex-1 bg-[#1A2621] border border-gold-deep/20 hover:border-gold-deep/30 rounded-sm py-2.5 px-4 text-sm text-gray-100 placeholder-gray-400 font-sans focus:outline-none focus:ring-1 focus:ring-gold-deep"
          id="chat-input-element"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isQuerying || !userInput.trim()}
          className="p-3 bg-gold-deep hover:bg-gold-deep/80 text-slate-vip font-extrabold rounded-sm shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
          id="btn-chat-send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
