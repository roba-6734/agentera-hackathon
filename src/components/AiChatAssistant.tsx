import React, { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, RotateCcw, Send, Sparkles, X } from "lucide-react";

interface AiChatAssistantProps {
  language: "en" | "ar";
  selectedCountryCode: string;
  selectedCountryNameEn: string;
  selectedCountryNameAr: string;
  onNewBriefGenerated: (text: string) => void;
  onClose?: () => void;
}

type ChatMessage = {
  id: string;
  sender: "user" | "advisor";
  text: string;
  createdAt: string;
  source?: string;
};

type StoredChatThread = {
  threadId: string;
  messages: ChatMessage[];
  updatedAt: string;
};

const CHAT_THREAD_STORAGE_PREFIX = "majlis-ai-chat-thread";

function buildChatStorageKey(countryCode: string) {
  return `${CHAT_THREAD_STORAGE_PREFIX}:${countryCode || "default"}`;
}

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createGreetingMessage(
  language: "en" | "ar",
  selectedCountryNameEn: string,
  selectedCountryNameAr: string
): ChatMessage {
  const isEn = language === "en";
  return {
    id: createClientId("advisor"),
    sender: "advisor",
    createdAt: new Date().toISOString(),
    text: isEn
      ? `Welcome, Executive Dignitary. I am your AI Strategic Advisor. Submit any question about ${selectedCountryNameEn} to generate immediate custom briefs or policy analyses.`
      : `أهلاً بك يا صاحب السمو والمعالي. أنا المستشار الرقمي الاستراتيجي لعلوم الطاقة والبنية التحتية. يرجى التفضل بطرح أي استفسار حول ملف ${selectedCountryNameAr} لتفنيد فرص التعاون والتفاوض ثنائياً.`,
  };
}

function createNewChatThread(
  countryCode: string,
  language: "en" | "ar",
  selectedCountryNameEn: string,
  selectedCountryNameAr: string
): StoredChatThread {
  return {
    threadId: createClientId(`thread-${countryCode || "country"}`),
    messages: [createGreetingMessage(language, selectedCountryNameEn, selectedCountryNameAr)],
    updatedAt: new Date().toISOString(),
  };
}

function readStoredChatThread(storageKey: string): StoredChatThread | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredChatThread;
    if (!parsed.threadId || !Array.isArray(parsed.messages)) return null;

    const messages = parsed.messages
      .filter((message) => message.sender === "user" || message.sender === "advisor")
      .filter((message) => typeof message.text === "string" && message.text.trim())
      .slice(-40);

    if (messages.length === 0) return null;

    return {
      threadId: parsed.threadId,
      messages,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.warn("Unable to restore chat thread.", error);
    return null;
  }
}

function writeStoredChatThread(storageKey: string, thread: StoredChatThread) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(thread));
  } catch (error) {
    console.warn("Unable to persist chat thread.", error);
  }
}

function toConversationPayload(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.text.trim())
    .slice(-16)
    .map((message) => ({
      sender: message.sender,
      text: message.text,
      createdAt: message.createdAt,
      source: message.source,
    }));
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`strong-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
  });
}

function normalizeAdvisorMarkdown(text: string) {
  return text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/^\s*```(?:markdown|md|json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function renderAdvisorMarkdown(text: string) {
  const lines = normalizeAdvisorMarkdown(text).split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraphLines: string[] = [];
  let bulletItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const content = paragraphLines.join(" ").trim();
    if (content) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="mb-2 last:mb-0">
          {renderInlineMarkdown(content)}
        </p>
      );
    }
    paragraphLines = [];
  };

  const flushBullets = () => {
    if (bulletItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="mb-3 ml-4 list-disc space-y-1 last:mb-0">
        {bulletItems.map((item, index) => (
          <li key={`li-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushBullets();
      return;
    }

    const headingMatch = trimmed.match(/^#{1,6}\s*(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushBullets();
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="mt-1 mb-3 border-b border-gold-border/70 pb-2 font-serif text-base font-bold text-emerald-deep first:mt-0">
          {renderInlineMarkdown(headingMatch[1])}
        </h3>
      );
      return;
    }

    const boldSectionMatch = trimmed.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (boldSectionMatch) {
      flushParagraph();
      flushBullets();
      blocks.push(
        <h4 key={`h4-${blocks.length}`} className="mt-3 mb-1 text-[0.78rem] font-extrabold uppercase tracking-wide text-emerald-deep first:mt-0">
          {boldSectionMatch[1].replace(/:$/, "")}
        </h4>
      );
      return;
    }

    const bulletMatch = trimmed.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      bulletItems.push(bulletMatch[1]);
      return;
    }

    flushBullets();
    paragraphLines.push(trimmed);
  });

  flushParagraph();
  flushBullets();

  return <div className="chat-brief-text leading-relaxed">{blocks.length > 0 ? blocks : text}</div>;
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
  const storageKey = useMemo(() => buildChatStorageKey(selectedCountryCode), [selectedCountryCode]);
  const initialThread = useMemo(
    () =>
      readStoredChatThread(storageKey) ||
      createNewChatThread(selectedCountryCode, language, selectedCountryNameEn, selectedCountryNameAr),
    []
  );
  const [threadId, setThreadId] = useState(initialThread.threadId);
  const [loadedStorageKey, setLoadedStorageKey] = useState(storageKey);
  const [userInput, setUserInput] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [lastWorkflowStatus, setLastWorkflowStatus] = useState<"ready" | "n8n" | "local-fallback">("ready");
  const [chatLog, setChatLog] = useState<ChatMessage[]>(initialThread.messages);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedThread = readStoredChatThread(storageKey);
    const nextThread =
      storedThread ||
      createNewChatThread(selectedCountryCode, language, selectedCountryNameEn, selectedCountryNameAr);

    setLoadedStorageKey(storageKey);
    setThreadId(nextThread.threadId);
    setChatLog(nextThread.messages);
    setLastWorkflowStatus("ready");
    setUserInput("");
  }, [storageKey, selectedCountryCode, selectedCountryNameEn, selectedCountryNameAr]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;

    writeStoredChatThread(storageKey, {
      threadId,
      messages: chatLog.slice(-40),
      updatedAt: new Date().toISOString(),
    });
  }, [chatLog, loadedStorageKey, storageKey, threadId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatLog, isQuerying]);

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

  const resetThread = () => {
    const nextThread = createNewChatThread(selectedCountryCode, language, selectedCountryNameEn, selectedCountryNameAr);
    setLoadedStorageKey(storageKey);
    setThreadId(nextThread.threadId);
    setChatLog(nextThread.messages);
    setLastWorkflowStatus("ready");
    setUserInput("");
    writeStoredChatThread(storageKey, nextThread);
  };

  const handleSendMessage = async (customQueryText?: string) => {
    const queryToSubmit = (customQueryText || userInput).trim();
    if (!queryToSubmit) return;

    const userMessage: ChatMessage = {
      id: createClientId("user"),
      sender: "user",
      text: queryToSubmit,
      createdAt: new Date().toISOString(),
    };
    const nextLog = [...chatLog, userMessage];
    setChatLog(nextLog);
    setUserInput("");
    setIsQuerying(true);

    try {
      const resp = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: selectedCountryCode,
          question: queryToSubmit,
          language,
          threadId,
          conversationHistory: toConversationPayload(nextLog),
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || "Advisor workflow request failed.");
      }

      const aiResponseText = data.aiBriefing?.rawText || "Strategic answer couldn't be compiled.";
      const workflowStatus = data.workflow?.status === "n8n" ? "n8n" : "local-fallback";
      const advisorMessage: ChatMessage = {
        id: createClientId("advisor"),
        sender: "advisor",
        text: aiResponseText,
        createdAt: new Date().toISOString(),
        source: data.source || workflowStatus,
      };

      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId);
      }
      setLastWorkflowStatus(workflowStatus);
      setChatLog((prev) => [...prev, advisorMessage]);
      onNewBriefGenerated(aiResponseText);
    } catch (error) {
      console.error("AI Advisor Query Error:", error);
      const errorMessage: ChatMessage = {
        id: createClientId("advisor-error"),
        sender: "advisor",
        createdAt: new Date().toISOString(),
        source: "connection-error",
        text: isEn
          ? "Secure advisor workflow is temporarily unresponsive. Please retry in a moment."
          : "تعذر الاتصال المؤقت بمسار المستشار الذكي. يرجى إعادة المحاولة بعد قليل.",
      };
      setChatLog((prev) => [...prev, errorMessage]);
    } finally {
      setIsQuerying(false);
    }
  };

  const workflowLabel =
    lastWorkflowStatus === "n8n" ? "N8N" : lastWorkflowStatus === "local-fallback" ? "LOCAL" : "READY";

  return (
    <div className="bg-white rounded-sm shadow-md border border-gold-border overflow-hidden flex flex-col h-full" id="ai-chat-assistant-container">
      <div className="bg-slate-vip p-4 border-b border-gold-deep/20 flex items-center justify-between gap-3" id="chat-header-identity">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-9 w-9 bg-gold-deep/10 text-gold-deep rounded-sm flex items-center justify-center border border-gold-deep/25 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-serif font-bold text-sm text-gray-100 block truncate">
              {isEn ? "Dignitary Direct Policy Advisor" : "المستشار الفيدرالي لصناعة وحوكمة القرار"}
            </h4>
            <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-light font-bold">
              {isEn ? "Grounded Workflow Bridge" : "جسر سير العمل المدعوم بالسياق"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#172520] px-2 py-1 rounded border border-emerald-deep/35">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-light block animate-pulse"></span>
            <span className="text-[9px] font-mono text-emerald-light font-extrabold uppercase tracking-wider">{workflowLabel}</span>
          </div>
          <button
            onClick={resetThread}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-white/10"
            title={isEn ? "Start new thread" : "بدء محادثة جديدة"}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
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

      <div ref={scrollerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50" id="chat-scroller-log">
        {chatLog.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} items-start gap-3`}
            id={`chat-msg-row-${msg.id}`}
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
              <div className="max-w-none text-xs sm:text-sm">
                {msg.sender === "advisor" ? (
                  renderAdvisorMarkdown(msg.text)
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
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
                {isEn ? "Advisor workflow is composing response..." : "مسار المستشار يصيغ الرد..."}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-3 xl:block overflow-x-auto whitespace-nowrap" id="chat-suggested-prompts">
        <div className="flex gap-2 text-xs">
          {quickPrompts.map((p, idxPt) => (
            <button
              key={idxPt}
              onClick={() => handleSendMessage(p.query)}
              disabled={isQuerying}
              className="bg-gold-bg hover:bg-gold-border/30 border border-gold-border text-slate-vip px-3 py-1.5 rounded-full font-bold transition-all text-ellipsis overflow-hidden max-w-[280px] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-gold-deep" />
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-vip p-4 border-t border-gold-deep/15 flex items-center gap-3" id="chat-user-form">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder={isEn ? "Submit custom strategic question..." : "اطرح سؤالك الاستراتيجي للوزير والوفد هنا..."}
          disabled={isQuerying}
          className="flex-1 min-w-0 bg-[#1A2621] border border-gold-deep/20 hover:border-gold-deep/30 rounded-sm py-2.5 px-4 text-sm text-gray-100 placeholder-gray-400 font-sans focus:outline-none focus:ring-1 focus:ring-gold-deep"
          id="chat-input-element"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isQuerying || !userInput.trim()}
          className="p-3 bg-gold-deep hover:bg-gold-deep/80 text-slate-vip font-extrabold rounded-sm shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
          id="btn-chat-send"
          title={isEn ? "Send" : "إرسال"}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
