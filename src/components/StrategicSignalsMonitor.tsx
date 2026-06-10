import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Newspaper, RefreshCw, RadioTower, Search } from "lucide-react";
import {
  fetchStrategicSignals,
  STRATEGIC_SIGNAL_CATEGORIES,
  StrategicSignal,
  StrategicSignalCategory,
} from "../data/strategicSignals";

interface StrategicSignalsMonitorProps {
  language: "en" | "ar";
}

const defaultFilters: StrategicSignalCategory[] = ["energy", "infrastructure", "trade-investment", "diplomacy"];

function formatSignalDate(publishedAt: string, language: "en" | "ar") {
  const timestamp = new Date(publishedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return language === "en" ? "Recently" : "حديثاً";
  }

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) {
    return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ar-AE", {
      month: "short",
      day: "numeric",
    }).format(new Date(publishedAt));
  }

  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) {
    return language === "en" ? `${minutes}m ago` : `قبل ${minutes} د`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return language === "en" ? `${hours}h ago` : `قبل ${hours} س`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return language === "en" ? `${days}d ago` : `قبل ${days} ي`;
  }

  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ar-AE", {
    month: "short",
    day: "numeric",
  }).format(new Date(publishedAt));
}

export default function StrategicSignalsMonitor({ language }: StrategicSignalsMonitorProps) {
  const isEn = language === "en";
  const [selectedFilters, setSelectedFilters] = useState<StrategicSignalCategory[]>(defaultFilters);
  const [signals, setSignals] = useState<StrategicSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  const categoryLabelById = useMemo(
    () =>
      STRATEGIC_SIGNAL_CATEGORIES.reduce<Record<StrategicSignalCategory, string>>((labels, category) => {
        labels[category.id] = isEn ? category.labelEn : category.labelAr;
        return labels;
      }, {} as Record<StrategicSignalCategory, string>),
    [isEn]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSignals() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextSignals = await fetchStrategicSignals(selectedFilters);
        if (isMounted) {
          setSignals(nextSignals);
        }
      } catch (error) {
        console.error("Failed to load strategic signals.", error);
        if (isMounted) {
          setSignals([]);
          setErrorMessage(
            isEn
              ? "Signals feed is temporarily unavailable."
              : "تعذر تحميل موجز المؤشرات مؤقتاً."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSignals();

    return () => {
      isMounted = false;
    };
  }, [selectedFilters, isEn]);

  const toggleFilter = (category: StrategicSignalCategory) => {
    setSelectedFilters((currentFilters) =>
      currentFilters.includes(category)
        ? currentFilters.filter((filter) => filter !== category)
        : [...currentFilters, category]
    );
  };

  const resetFilters = () => {
    setSelectedFilters(defaultFilters);
  };

  const refreshSignals = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextSignals = await fetchStrategicSignals(selectedFilters);
      setSignals(nextSignals);
    } catch (error) {
      console.error("Failed to refresh strategic signals.", error);
      setSignals([]);
      setErrorMessage(
        isEn
          ? "Signals feed is temporarily unavailable."
          : "تعذر تحميل موجز المؤشرات مؤقتاً."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      className="bg-white rounded-sm shadow-md border border-gold-border overflow-hidden"
      id="staff-strategic-signals-monitor"
      style={{ direction: language === "ar" ? "rtl" : "ltr" }}
    >
      <div className="bg-slate-vip p-4 border-b border-gold-deep/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <RadioTower className="w-4 h-4 text-gold-deep shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs uppercase font-mono tracking-widest text-gray-100 font-extrabold truncate">
              {isEn ? "Strategic Signals Monitor" : "مراقب المؤشرات الاستراتيجية"}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">
              {isEn ? "News & trends for staff review" : "أخبار واتجاهات لمراجعة فريق العمل"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshSignals}
          disabled={isLoading}
          className="h-8 w-8 rounded-sm border border-gold-deep/30 bg-white/5 text-gold-deep hover:bg-gold-deep hover:text-slate-vip disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer"
          title={isEn ? "Refresh signals" : "تحديث المؤشرات"}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <button
          type="button"
          onClick={() => setIsFiltersOpen((isOpen) => !isOpen)}
          className="w-full flex items-center justify-between gap-2 text-left text-[10px] uppercase tracking-widest font-mono font-black text-emerald-deep cursor-pointer"
        >
          <span>{isEn ? "Interest Filters" : "مرشحات الاهتمام"}</span>
          <ChevronDown
            className="w-3.5 h-3.5 text-gold-deep transition-transform"
            style={{ transform: isFiltersOpen ? "rotate(180deg)" : "none" }}
          />
        </button>

        {isFiltersOpen && (
          <div className="flex flex-wrap gap-1.5" id="strategic-signal-filter-chips">
            {STRATEGIC_SIGNAL_CATEGORIES.map((category) => {
              const isSelected = selectedFilters.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleFilter(category.id)}
                  className={`px-2.5 py-1.5 rounded-sm border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-deep text-white border-emerald-deep"
                      : "bg-[#F8F8F6] text-gray-600 border-gold-border hover:border-gold-deep"
                  }`}
                  aria-pressed={isSelected}
                >
                  {isEn ? category.labelEn : category.labelAr}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-gray-400">
          <span>
            {isEn
              ? `${selectedFilters.length} filters active`
              : `${selectedFilters.length} مرشحات نشطة`}
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-emerald-deep hover:text-gold-deep font-black uppercase tracking-widest cursor-pointer"
          >
            {isEn ? "Reset" : "إعادة ضبط"}
          </button>
        </div>

        {errorMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-sm p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-5">{errorMessage}</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-2" id="strategic-signals-loading-state">
            {[0, 1, 2].map((item) => (
              <div key={item} className="border border-gold-border rounded-sm p-3 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-100 rounded w-full mt-3"></div>
                <div className="h-2 bg-gray-100 rounded w-2/3 mt-2"></div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !errorMessage && signals.length === 0 && (
          <div className="border border-dashed border-gold-border rounded-sm p-4 text-center bg-[#F8F8F6]" id="strategic-signals-empty-state">
            <Search className="w-5 h-5 text-gold-deep mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-vip">
              {isEn ? "No signals match these filters." : "لا توجد مؤشرات مطابقة لهذه المرشحات."}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              {isEn ? "Select at least one interest area." : "اختر مجال اهتمام واحداً على الأقل."}
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && signals.length > 0 && (
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1" id="strategic-signals-top-five-list">
            {signals.map((signal) => (
              <article key={signal.id} className="border border-gold-border rounded-sm p-3 bg-[#FDFDFC] hover:bg-gold-bg/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[9px] uppercase tracking-widest font-mono font-black text-emerald-deep bg-emerald-deep/10 border border-emerald-deep/10 px-1.5 py-0.5 rounded-sm">
                    {categoryLabelById[signal.category]}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono shrink-0">
                    {formatSignalDate(signal.publishedAt, language)}
                  </span>
                </div>

                <h4 className="text-xs font-serif font-bold text-slate-vip leading-5 mt-2">
                  {signal.title}
                </h4>
                <p className="text-[11px] text-gray-600 leading-5 mt-1">
                  {signal.summary}
                </p>

                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                    <Newspaper className="w-3 h-3 text-gold-deep shrink-0" />
                    <span className="truncate">{signal.sourceName}</span>
                  </div>
                  <p className="text-[10px] leading-4 text-emerald-deep font-semibold">
                    {signal.relevanceNote}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
