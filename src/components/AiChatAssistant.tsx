import React, { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Mic, RotateCcw, Send, Sparkles, Square, X } from "lucide-react";

interface AiChatAssistantProps {
  language: "en" | "ar";
  selectedCountryCode: string;
  selectedCountryNameEn: string;
  selectedCountryNameAr: string;
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

type VoiceInputStatus = "idle" | "recording" | "transcribing" | "review";

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

function getPreferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined" || !("isTypeSupported" in MediaRecorder)) {
    return "";
  }

  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || "";
}

function formatRecordingDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(new Error("Audio recording could not be prepared for transcription."));
    reader.readAsDataURL(blob);
  });
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
  const [agentRequestPhase, setAgentRequestPhase] = useState<"idle" | "sending" | "waiting">("idle");
  const [lastWorkflowStatus, setLastWorkflowStatus] = useState<"ready" | "n8n" | "local-fallback">("ready");
  const [chatLog, setChatLog] = useState<ChatMessage[]>(initialThread.messages);
  const [voiceStatus, setVoiceStatus] = useState<VoiceInputStatus>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceIsMock, setVoiceIsMock] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef<number | null>(null);
  const discardRecordingRef = useRef(false);
  const transcriptionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const storedThread = readStoredChatThread(storageKey);
    const nextThread =
      storedThread ||
      createNewChatThread(selectedCountryCode, language, selectedCountryNameEn, selectedCountryNameAr);

    setLoadedStorageKey(storageKey);
    setThreadId(nextThread.threadId);
    setChatLog(nextThread.messages);
    setLastWorkflowStatus("ready");
    setAgentRequestPhase("idle");
    setVoiceStatus("idle");
    setVoiceError("");
    setVoiceTranscript("");
    setVoiceIsMock(false);
    setRecordingDurationMs(0);
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

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      transcriptionAbortRef.current?.abort();
      mediaRecorderRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };
  }, []);

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
    setAgentRequestPhase("idle");
    setVoiceStatus("idle");
    setVoiceError("");
    setVoiceTranscript("");
    setVoiceIsMock(false);
    setRecordingDurationMs(0);
    setUserInput("");
    writeStoredChatThread(storageKey, nextThread);
  };

  const stopVoiceCapture = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const transcribeAudio = async (audioBlob: Blob, durationMs: number) => {
    if (audioBlob.size < 1600 || durationMs < 700) {
      setVoiceError(isEn ? "Recording is too short. Please re-record a longer request." : "التسجيل قصير جداً. يرجى إعادة التسجيل.");
      setVoiceStatus("idle");
      return;
    }

    setVoiceStatus("transcribing");
    setVoiceError("");
    transcriptionAbortRef.current?.abort();
    const abortController = new AbortController();
    transcriptionAbortRef.current = abortController;

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const resp = await fetch("/api/advisor/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || "audio/webm",
          durationMs,
          // English is supported first. Arabic is passed through for future STT tuning.
          language,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || "Voice transcription failed.");
      }

      const transcript = (data.transcription?.text || "").trim();
      if (!transcript) {
        throw new Error(isEn ? "No speech was detected. Please re-record or type the request." : "لم يتم رصد كلام واضح. يرجى إعادة التسجيل أو كتابة الطلب.");
      }

      setVoiceTranscript(transcript);
      setUserInput(transcript);
      setVoiceIsMock(Boolean(data.transcription?.mock));
      setVoiceStatus("review");
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error("Voice transcription failed:", error);
      setVoiceError(error?.message || (isEn ? "Voice transcription failed. Please try again." : "تعذر تفريغ التسجيل الصوتي. يرجى المحاولة مرة أخرى."));
      setVoiceStatus("idle");
    } finally {
      if (transcriptionAbortRef.current === abortController) {
        transcriptionAbortRef.current = null;
      }
    }
  };

  const startRecording = async () => {
    if (isQuerying || voiceStatus === "transcribing") return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError(isEn ? "Voice recording is not supported in this browser." : "تسجيل الصوت غير مدعوم في هذا المتصفح.");
      return;
    }

    try {
      transcriptionAbortRef.current?.abort();
      setVoiceError("");
      setVoiceIsMock(false);
      if (voiceTranscript && userInput === voiceTranscript) {
        setUserInput("");
      }
      setVoiceTranscript("");
      setRecordingDurationMs(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = getPreferredAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      discardRecordingRef.current = false;
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVoiceError(isEn ? "Recording failed. Please check microphone access and try again." : "تعذر التسجيل. يرجى التحقق من صلاحية الميكروفون.");
        setVoiceStatus("idle");
        stopVoiceCapture();
      };

      recorder.onstop = () => {
        const durationMs = Math.max(0, Date.now() - recordingStartedAtRef.current);
        const chunks = audioChunksRef.current;
        const audioType = recorder.mimeType || mimeType || "audio/webm";
        mediaRecorderRef.current = null;
        stopVoiceCapture();

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(chunks, { type: audioType });
        audioChunksRef.current = [];
        void transcribeAudio(audioBlob, durationMs);
      };

      recordingStartedAtRef.current = Date.now();
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDurationMs(Date.now() - recordingStartedAtRef.current);
      }, 250);
      recorder.start();
      setVoiceStatus("recording");
    } catch (error: any) {
      console.error("Microphone permission or recording setup failed:", error);
      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      setVoiceError(
        denied
          ? (isEn ? "Microphone permission was denied. Enable microphone access to use voice input." : "تم رفض صلاحية الميكروفون. يرجى تفعيلها لاستخدام الإدخال الصوتي.")
          : (isEn ? "Unable to start voice recording. Please try again or type the request." : "تعذر بدء التسجيل الصوتي. يرجى المحاولة مرة أخرى أو كتابة الطلب.")
      );
      setVoiceStatus("idle");
      stopVoiceCapture();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const durationMs = Math.max(0, Date.now() - recordingStartedAtRef.current);
    setRecordingDurationMs(durationMs);
    if (durationMs < 700) {
      discardRecordingRef.current = true;
      setVoiceError(isEn ? "Recording is too short. Please record at least one second." : "التسجيل قصير جداً. يرجى التسجيل لمدة ثانية واحدة على الأقل.");
      setVoiceStatus("idle");
    } else {
      setVoiceStatus("transcribing");
      setVoiceError("");
    }
    recorder.stop();
  };

  const cancelVoiceInput = () => {
    if (voiceStatus === "recording") {
      discardRecordingRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      } else {
        stopVoiceCapture();
      }
    }
    if (voiceStatus === "transcribing") {
      transcriptionAbortRef.current?.abort();
    }
    if (voiceTranscript && userInput === voiceTranscript) {
      setUserInput("");
    }
    setVoiceStatus("idle");
    setVoiceError("");
    setVoiceTranscript("");
    setVoiceIsMock(false);
    setRecordingDurationMs(0);
  };

  const submitTranscribedPrompt = async () => {
    const prompt = userInput.trim();
    if (!prompt) {
      setVoiceError(isEn ? "Transcript is empty. Please re-record or type a request." : "النص المفرغ فارغ. يرجى إعادة التسجيل أو كتابة الطلب.");
      return;
    }

    setVoiceStatus("idle");
    setVoiceError("");
    setVoiceTranscript("");
    setVoiceIsMock(false);
    await handleSendMessage(prompt);
  };

  async function handleSendMessage(customQueryText?: string) {
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
    setAgentRequestPhase("sending");
    const phaseTimer = window.setTimeout(() => {
      setAgentRequestPhase((currentPhase) => currentPhase === "sending" ? "waiting" : currentPhase);
    }, 600);

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
      window.clearTimeout(phaseTimer);
      setIsQuerying(false);
      setAgentRequestPhase("idle");
    }
  }

  const workflowLabel =
    lastWorkflowStatus === "n8n" ? "N8N" : lastWorkflowStatus === "local-fallback" ? "LOCAL" : "READY";
  const agentLoadingLabel = agentRequestPhase === "sending"
    ? (isEn ? "Sending request to advisor..." : "جارٍ إرسال الطلب إلى المستشار...")
    : (isEn ? "Waiting for advisor response..." : "بانتظار رد المستشار...");

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
                {agentLoadingLabel}
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
              disabled={isQuerying || voiceStatus === "recording" || voiceStatus === "transcribing"}
              className="bg-gold-bg hover:bg-gold-border/30 border border-gold-border text-slate-vip px-3 py-1.5 rounded-full font-bold transition-all text-ellipsis overflow-hidden max-w-[280px] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-gold-deep" />
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {(voiceStatus !== "idle" || voiceError || voiceTranscript) && (
        <div className="bg-[#F8F8F6] border-t border-gold-border/50 px-4 py-3" id="voice-input-review-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  voiceStatus === "recording"
                    ? "bg-red-600 animate-pulse"
                    : voiceStatus === "transcribing"
                      ? "bg-gold-deep animate-pulse"
                      : voiceStatus === "review"
                        ? "bg-emerald-deep"
                        : "bg-gray-300"
                }`} />
                <p className="text-xs font-bold text-slate-vip">
                  {voiceStatus === "recording" && (isEn ? `Recording ${formatRecordingDuration(recordingDurationMs)}` : `جارٍ التسجيل ${formatRecordingDuration(recordingDurationMs)}`)}
                  {voiceStatus === "transcribing" && (isEn ? "Transcribing voice request..." : "جارٍ تفريغ الطلب الصوتي...")}
                  {voiceStatus === "review" && (isEn ? "Transcript ready. Review or edit before sending." : "النص المفرغ جاهز. راجعه أو عدله قبل الإرسال.")}
                  {voiceStatus === "idle" && voiceError && (isEn ? "Voice input needs attention" : "يتطلب الإدخال الصوتي مراجعة")}
                </p>
              </div>
              {voiceIsMock && (
                <p className="mt-1 text-[11px] font-semibold text-amber-700">
                  {isEn ? "Mock transcription is active. Edit this text before sending." : "التفريغ التجريبي مفعل. عدل النص قبل الإرسال."}
                </p>
              )}
              {voiceError && (
                <p className="mt-1 text-[11px] font-semibold text-red-700">{voiceError}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {voiceStatus === "recording" && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-red-700 bg-red-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-800"
                  aria-label={isEn ? "Stop recording" : "إيقاف التسجيل"}
                >
                  <Square className="h-3.5 w-3.5" />
                  {isEn ? "Stop" : "إيقاف"}
                </button>
              )}
              {voiceStatus === "review" && (
                <>
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isQuerying}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-gold-border bg-white px-3 py-1.5 text-xs font-bold text-slate-vip transition-colors hover:bg-gold-bg disabled:opacity-50"
                    aria-label={isEn ? "Re-record voice request" : "إعادة تسجيل الطلب الصوتي"}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    {isEn ? "Re-record" : "إعادة"}
                  </button>
                  <button
                    type="button"
                    onClick={submitTranscribedPrompt}
                    disabled={isQuerying || !userInput.trim()}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-deep bg-emerald-deep px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#00482f] disabled:opacity-50"
                    aria-label={isEn ? "Send transcript" : "إرسال النص المفرغ"}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isEn ? "Send transcript" : "إرسال النص"}
                  </button>
                </>
              )}
              {(voiceStatus === "recording" || voiceStatus === "transcribing" || voiceStatus === "review" || voiceError) && (
                <button
                  type="button"
                  onClick={cancelVoiceInput}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
                  aria-label={isEn ? "Cancel voice input" : "إلغاء الإدخال الصوتي"}
                >
                  <X className="h-3.5 w-3.5" />
                  {isEn ? "Cancel" : "إلغاء"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-vip p-4 border-t border-gold-deep/15 flex items-center gap-3" id="chat-user-form">
        {voiceStatus === "recording" ? (
          <button
            type="button"
            onClick={stopRecording}
            className="p-3 bg-red-700 hover:bg-red-800 text-white font-extrabold rounded-sm shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0"
            id="btn-chat-voice-stop"
            title={isEn ? "Stop recording" : "إيقاف التسجيل"}
            aria-label={isEn ? "Stop recording" : "إيقاف التسجيل"}
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={isQuerying || voiceStatus === "transcribing"}
            className="p-3 bg-[#1A2621] hover:bg-[#21332c] text-gold-deep font-extrabold rounded-sm shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0 border border-gold-deep/25 disabled:opacity-50"
            id="btn-chat-voice-record"
            title={isEn ? "Record voice" : "تسجيل صوتي"}
            aria-label={isEn ? "Record voice" : "تسجيل صوتي"}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={isEn ? "Submit custom strategic question..." : "اطرح سؤالك الاستراتيجي للوزير والوفد هنا..."}
          disabled={isQuerying || voiceStatus === "recording" || voiceStatus === "transcribing"}
          rows={1}
          className="flex-1 min-w-0 min-h-[42px] max-h-24 resize-none bg-[#1A2621] border border-gold-deep/20 hover:border-gold-deep/30 rounded-sm py-2.5 px-4 text-sm leading-5 text-gray-100 placeholder-gray-400 font-sans focus:outline-none focus:ring-1 focus:ring-gold-deep disabled:opacity-70"
          id="chat-input-element"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isQuerying || !userInput.trim() || voiceStatus === "recording" || voiceStatus === "transcribing"}
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
