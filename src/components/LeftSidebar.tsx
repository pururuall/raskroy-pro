import React from "react";
import { APP_THEMES, AppSettings } from "../types";
import { MobilLogo } from "./MobilLogo";
import { SettingsTabType } from "./SettingsDrawer";
import {
  PanelLeftClose,
  RefreshCw,
  Sliders,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  Plus,
  Pin,
} from "lucide-react";

interface LeftSidebarProps {
  isOpen: boolean;
  pinned: boolean;
  widthPx?: number;
  onTogglePin: () => void;
  onClose: () => void;
  settings: AppSettings;
  appVersion: string;
  updateAvailableVersion?: string | null;
  isDirty: boolean;
  loading: boolean;
  calcTimeMs: number | null;
  timerSecondsLeft: number;
  hasPlan: boolean;
  onCalculate: () => void;
  onNewTab: () => void;
  onOpenImport: () => void;
  onOpenReport: () => void;
  onClearTab: () => void;
  onOpenSettings: (tab?: SettingsTabType) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen,
  pinned,
  widthPx = 228,
  onTogglePin,
  onClose,
  settings,
  appVersion,
  updateAvailableVersion,
  isDirty,
  loading,
  calcTimeMs,
  timerSecondsLeft,
  hasPlan,
  onCalculate,
  onNewTab,
  onOpenImport,
  onOpenReport,
  onClearTab,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  const dotColor =
    settings.calcMode === "instant"
      ? "bg-emerald-400"
      : settings.calcMode === "timer"
      ? "bg-sky-400"
      : isDirty
      ? "bg-amber-400"
      : "bg-slate-400";

  const statusText =
    settings.calcMode === "instant"
      ? `Мгновенно${calcTimeMs !== null ? ` • ${calcTimeMs} мс` : ""}`
      : settings.calcMode === "timer"
      ? `Таймер: через ${timerSecondsLeft} с`
      : isDirty
      ? "Требует обновления"
      : `Обновлено${calcTimeMs !== null ? ` • ${calcTimeMs} мс` : ""}`;

  const activeThemeName =
    APP_THEMES.find((t) => t.id === settings.theme)?.name || "Светлая классическая";

  const itemClass =
    "w-full h-8 px-2.5 rounded-md flex items-center justify-between text-xs text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <aside
      style={{ width: widthPx }}
      className="shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col select-none no-print h-full"
    >
      {/* Brand + Pin Button + Collapse */}
      <div className="h-11 px-3 border-b border-[var(--sidebar-border)] flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <MobilLogo height={15} showWordmark={true} accentColor="var(--accent)" color="#f1f5f9" />
          <span className="text-[10px] text-[var(--sidebar-muted)] font-mono">v{appVersion}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTogglePin}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              pinned
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
            }`}
            title={
              pinned
                ? "Панель закреплена постоянно (нажмите, чтобы открепить)"
                : "Закрепить боковую панель постоянно"
            }
          >
            <Pin className={`w-3.5 h-3.5 transition-transform ${pinned ? "fill-current" : "-rotate-45"}`} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] rounded transition-colors cursor-pointer"
            title="Скрыть боковую панель (Ctrl+B)"
          >
            <PanelLeftClose className="w-3.5 h-3.5 stroke-[1.6]" />
          </button>
        </div>
      </div>

      {/* Primary Refresh Action + Status */}
      <div className="p-3 border-b border-[var(--sidebar-border)] space-y-2">
        <button
          type="button"
          onClick={onCalculate}
          disabled={loading}
          className={`w-full h-9 px-3 rounded-md flex items-center justify-between text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
            isDirty && settings.calcMode !== "instant"
              ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
              : "bg-white/[0.08] hover:bg-white/[0.13] text-[#f1f5f9] border border-white/[0.1]"
          }`}
          title="Выполнить перерасчет раскроя (Ctrl+Enter)"
        >
          <span className="flex items-center gap-2">
            <RefreshCw
              className={`w-4 h-4 stroke-[1.5] ${loading ? "animate-spin" : ""} ${
                isDirty && settings.calcMode !== "instant" ? "text-white" : "text-[var(--accent)]"
              }`}
            />
            <span>{loading ? "Расчёт..." : "Обновить"}</span>
          </span>
          <kbd className="text-[10px] font-mono opacity-70 px-1 rounded bg-black/25">
            Ctrl+↵
          </kbd>
        </button>

        <div className="flex items-center gap-2 px-1 text-[11px] text-[var(--sidebar-muted)] font-mono">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="truncate">{statusText}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-[var(--sidebar-muted)]">
          <Pin
            className={`w-3 h-3 shrink-0 ${
              pinned ? "text-[var(--accent)] fill-current" : "-rotate-45 opacity-70"
            }`}
          />
          <span className="truncate">
            {pinned ? "Закреплена постоянно" : "Показывается по кнопке"}
          </span>
        </div>
      </div>

      {/* Frequent Actions Only */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2.5 flex flex-col">
        <div className="mb-1.5 px-2 text-[10.5px] font-medium text-slate-400">
          Быстрые действия
        </div>

        <div className="space-y-0.5">
          <button type="button" onClick={onNewTab} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <Plus className="w-4 h-4 stroke-[1.6] shrink-0" />
              <span className="truncate">Новая вкладка</span>
            </span>
          </button>

          <button type="button" onClick={onOpenImport} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <FileSpreadsheet className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Загрузить / Импорт</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenReport}
            disabled={!hasPlan}
            className={itemClass}
          >
            <span className="flex items-center gap-2.5 truncate">
              <FileText className="w-4 h-4 stroke-[1.5] shrink-0 text-[var(--accent)]" />
              <span className="text-[#f1f5f9] truncate">Печать / Наряд А4</span>
            </span>
          </button>

          <button type="button" onClick={onClearTab} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <RotateCcw className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Очистить вкладку</span>
            </span>
          </button>
        </div>

        <div className="my-3 border-t border-[var(--sidebar-border)]" />

        <div className="mb-1.5 px-2 text-[10.5px] font-medium text-slate-400">
          Конфигурация
        </div>

        <button
          type="button"
          onClick={() => onOpenSettings()}
          className="w-full h-9 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-between text-xs font-medium text-[#f1f5f9] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2.5 truncate">
            <Sliders className="w-4 h-4 stroke-[1.6] text-[var(--accent)] shrink-0" />
            <span className="truncate">Настройки</span>
          </span>
          {updateAvailableVersion ? (
            <span className="text-[9.5px] font-mono text-white bg-[var(--accent)] px-1.5 py-0.5 rounded shrink-0">
              v{updateAvailableVersion}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--sidebar-muted)]">&rsaquo;</span>
          )}
        </button>

        <p className="mt-2.5 px-2 text-[10px] leading-relaxed text-slate-500">
          Алгоритм, станок, хлыст по умолчанию ({settings.defaultStockLength} мм), углы, темы и
          обновления находятся в «Настройках».
        </p>
      </nav>

      {/* Bottom Info Footer */}
      <div className="p-3 border-t border-[var(--sidebar-border)] text-[10.5px] text-slate-400 space-y-0.5">
        <div className="text-slate-300 font-medium truncate">Тема: {activeThemeName}</div>
        <div className="truncate text-slate-400">
          {settings.companyName} &bull; {settings.machineName}
        </div>
      </div>
    </aside>
  );
};
