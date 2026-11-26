import React, { useState, useRef, useEffect, useCallback } from "react";
import { CuttingTab } from "../types";
import { getRalSwatchColor } from "../utils/excelImport";
import {
  PanelLeft,
  Home,
  Plus,
  X,
  Sliders,
  Layers,
  ChevronLeft,
  ChevronRight,
  Printer,
} from "lucide-react";

interface TabsBarProps {
  tabs: CuttingTab[];
  activeTabId: string | null;
  isSidebarOpen: boolean;
  onRevealSidebar: () => void;
  onGoHome: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddNewTab: () => void;
  onOpenSettings: () => void;
  onOpenBatchReport?: () => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  tabs,
  activeTabId,
  isSidebarOpen,
  onRevealSidebar,
  onGoHome,
  onSelectTab,
  onCloseTab,
  onAddNewTab,
  onOpenSettings,
  onOpenBatchReport,
}) => {
  const [showSummaryPopover, setShowSummaryPopover] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(maxScroll - el.scrollLeft > 2);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollButtons());
    ro.observe(el);
    return () => ro.disconnect();
  }, [tabs.length, isSidebarOpen, updateScrollButtons]);

  // Keep active tab comfortably visible when switched via Summary popover or shortcuts
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeTabId) return;
    const activeEl = el.querySelector<HTMLElement>('[data-active-tab="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
      const timer = setTimeout(updateScrollButtons, 220);
      return () => clearTimeout(timer);
    }
  }, [activeTabId, tabs.length, updateScrollButtons]);

  const scrollTabs = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      updateScrollButtons();
    }
  };

  const hasOverflow = canScrollLeft || canScrollRight;
  const printableTabsCount = tabs.filter((t) => Boolean(t.plan)).length;

  const totalStocksAcrossTabs = tabs.reduce(
    (sum, t) => sum + (t.plan?.summary.total_stocks_used || 0),
    0
  );
  const totalPartsAcrossTabs = tabs.reduce(
    (sum, t) => sum + t.parts.reduce((s, p) => s + (p.quantity || 0), 0),
    0
  );

  return (
    <div className="h-10 shrink-0 bg-[var(--bg-tabs)] border-b border-[var(--border-main)] px-2.5 flex items-end justify-between gap-2 select-none no-print relative z-20">
      {/* Left: Menu button + Home + Arrow-controlled Tabs + New tab */}
      <div className="flex items-end gap-1.5 flex-1 min-w-0 h-full pt-1.5">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={onRevealSidebar}
            className="mb-1 shrink-0 h-7 px-2.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-1.5 text-[11.5px] font-medium transition-colors cursor-pointer"
            title="Раскрыть боковую панель меню (Ctrl+B)"
          >
            <PanelLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Меню</span>
          </button>
        )}

        <button
          type="button"
          onClick={onGoHome}
          className="mb-1 shrink-0 w-7 h-7 rounded border border-[var(--border-main)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          title="Стартовый экран (Импорт / Начать с нуля)"
        >
          <Home className="w-3.5 h-3.5" />
        </button>

        {hasOverflow && (
          <button
            type="button"
            onClick={() => scrollTabs(-1)}
            disabled={!canScrollLeft}
            className="mb-1 shrink-0 w-6 h-7 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-default"
            title="Прокрутить вкладки влево"
            aria-label="Прокрутить вкладки влево"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Horizontally scrollable tabs without native scrollbar */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          onWheel={handleTabsWheel}
          className="flex items-end gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const swatch = getRalSwatchColor(tab.colour);
            const partsCount = tab.parts.reduce((s, p) => s + (p.quantity || 0), 0);
            const badgeText = tab.plan
              ? `${tab.plan.summary.efficiency_percent.toFixed(0)}%`
              : partsCount > 0
              ? `${partsCount} шт`
              : "Пусто";

            return (
              <div
                key={tab.id}
                data-active-tab={isActive ? "true" : "false"}
                onClick={() => onSelectTab(tab.id)}
                title={`${tab.meta.material || tab.title} • ${partsCount} шт.`}
                className={`group shrink-0 h-8 max-w-[230px] px-2.5 rounded-t-md border-t border-x flex items-center gap-2 text-[11px] transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[var(--bg-surface)] border-[var(--border-main)] text-[var(--text-primary)] font-semibold -mb-px pb-px"
                    : "bg-[var(--bg-tab-inactive)] border-transparent hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                }`}
              >
                {swatch && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 border border-black/20 dark:border-white/30"
                    style={{ backgroundColor: swatch }}
                  />
                )}

                <span className="truncate">{tab.title}</span>

                <span
                  className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                    isActive
                      ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                      : "bg-[var(--bg-surface)]/80 text-[var(--text-muted)]"
                  }`}
                >
                  {badgeText}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="p-0.5 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title="Закрыть вкладку"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {hasOverflow && (
          <button
            type="button"
            onClick={() => scrollTabs(1)}
            disabled={!canScrollRight}
            className="mb-1 shrink-0 w-6 h-7 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-default"
            title="Прокрутить вкладки вправо"
            aria-label="Прокрутить вкладки вправо"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onAddNewTab}
          className="mb-1 shrink-0 w-7 h-7 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-center transition-colors cursor-pointer"
          title="Новая пустая вкладка раскроя (Ctrl+T)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Summary across tabs + Batch print + Quick Settings */}
      <div className="flex items-center gap-1.5 pb-1 shrink-0">
        {tabs.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSummaryPopover((v) => !v)}
              className="h-7 px-2.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Сводка ({tabs.length})</span>
            </button>

            {showSummaryPopover && (
              <div className="absolute right-0 mt-1.5 w-84 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-xl p-3 z-40 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Открытые вкладки ({tabs.length})
                  </span>
                  <span className="font-mono text-[10.5px] text-[var(--text-muted)]">
                    {totalPartsAcrossTabs} дет. &bull; {totalStocksAcrossTabs} хл.
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(t.id);
                        setShowSummaryPopover(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        t.id === activeTabId
                          ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium"
                          : "hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="truncate text-[11px]">{t.title}</span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">
                        {t.plan
                          ? `${t.plan.summary.total_stocks_used} хл. • ${t.plan.summary.efficiency_percent.toFixed(1)}%`
                          : `${t.parts.reduce((s, p) => s + p.quantity, 0)} шт`}
                      </span>
                    </button>
                  ))}
                </div>
                {onOpenBatchReport && printableTabsCount > 1 && (
                  <div className="pt-2.5 mt-2 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSummaryPopover(false);
                        onOpenBatchReport();
                      }}
                      className="w-full h-8 px-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Напечатать все вкладки ({printableTabsCount})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isSidebarOpen && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-7 px-2.5 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-1.5 text-[11.5px] font-medium transition-colors cursor-pointer"
            title="Открыть настройки программы"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Настройки</span>
          </button>
        )}
      </div>
    </div>
  );
};
