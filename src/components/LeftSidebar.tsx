import React from "react";
import { AppSettings, AppTheme } from "../types";
import { MobilLogo } from "./MobilLogo";
import { SettingsTabType } from "./SettingsDrawer";
import {
  PanelLeftClose,
  RefreshCw,
  Sliders,
  Clock,
  Compass,
  Building2,
  FileText,
  FileSpreadsheet,
  Download,
  Layers,
  RotateCcw,
  ArrowUpCircle,
  Sun,
  Moon,
} from "lucide-react";

interface LeftSidebarProps {
  isOpen: boolean;
  widthPx?: number;
  onClose: () => void;
  settings: AppSettings;
  onToggleTheme: (theme: AppTheme) => void;
  appVersion: string;
  updateAvailableVersion?: string | null;
  isDirty: boolean;
  loading: boolean;
  calcTimeMs: number | null;
  lastCalculatedAt: string | null;
  timerSecondsLeft: number;
  hasPlan: boolean;
  onCalculate: () => void;
  onOpenSettings: (tab: SettingsTabType) => void;
  onOpenReport: () => void;
  onOpenImport: () => void;
  onDownloadSample: () => void;
  onLoadExample: () => void;
  onClearAll: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen,
  widthPx = 236,
  onClose,
  settings,
  onToggleTheme,
  appVersion,
  updateAvailableVersion,
  isDirty,
  loading,
  calcTimeMs,
  timerSecondsLeft,
  hasPlan,
  onCalculate,
  onOpenSettings,
  onOpenReport,
  onOpenImport,
  onDownloadSample,
  onLoadExample,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const modeBadge =
    settings.calcMode === "instant"
      ? "Live"
      : settings.calcMode === "timer"
      ? `${timerSecondsLeft}с`
      : "Ручн.";

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

  const itemClass =
    "w-full h-8 px-2 rounded flex items-center justify-between text-xs text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <aside
      style={{ width: widthPx }}
      className="shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col select-none no-print h-full"
    >
      {/* Brand + Collapse Control */}
      <div className="h-12 px-4 border-b border-[var(--sidebar-border)] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <MobilLogo height={16} showWordmark={true} accentColor="#dd4b19" color="#f1f5f9" />
          <span className="text-[10px] text-[var(--sidebar-muted)] font-mono">v{appVersion}</span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] rounded transition-colors cursor-pointer"
          title="Скрыть левую панель (Ctrl+B)"
        >
          <PanelLeftClose className="w-4 h-4 stroke-[1.5]" />
        </button>
      </div>

      {/* Primary Refresh Action + Status */}
      <div className="p-3 border-b border-[var(--sidebar-border)] space-y-2">
        <button
          onClick={onCalculate}
          disabled={loading}
          className={`w-full h-9 px-3 rounded flex items-center justify-between text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
            isDirty && settings.calcMode !== "instant"
              ? "bg-[#dd4b19] hover:bg-[#c53f12] text-white"
              : "bg-white/[0.08] hover:bg-white/[0.13] text-[#f1f5f9] border border-white/[0.1]"
          }`}
          title="Выполнить перерасчет раскроя (Ctrl+Enter)"
        >
          <span className="flex items-center gap-2">
            <RefreshCw
              className={`w-4 h-4 stroke-[1.5] ${loading ? "animate-spin" : ""} ${
                isDirty && settings.calcMode !== "instant" ? "text-white" : "text-[#dd4b19]"
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
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mt-2 mb-1.5 px-2 text-[11px] font-medium text-slate-400">
          Настройки и режим
        </div>

        <div className="space-y-0.5">
          <button onClick={() => onOpenSettings("cutting")} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <Sliders className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Настройки станка</span>
            </span>
          </button>

          <button onClick={() => onOpenSettings("refresh")} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <Clock className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Таймер расчёта</span>
            </span>
            <span className="text-[10px] font-mono text-slate-300 bg-white/[0.07] px-1.5 py-0.5 rounded">
              {modeBadge}
            </span>
          </button>

          <button onClick={() => onOpenSettings("angles")} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <Compass className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Шаблоны углов</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {settings.anglePresets.length}
            </span>
          </button>

          <button onClick={() => onOpenSettings("report")} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <FileText className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Редактор отчёта</span>
            </span>
          </button>

          <button onClick={() => onOpenSettings("branding")} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <Building2 className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Брендинг и цех</span>
            </span>
          </button>

          <button onClick={() => onOpenSettings("update")} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <ArrowUpCircle
                className={`w-4 h-4 stroke-[1.5] shrink-0 ${
                  updateAvailableVersion ? "text-[#dd4b19]" : ""
                }`}
              />
              <span className={`truncate ${updateAvailableVersion ? "text-white font-medium" : ""}`}>
                Обновление ПО
              </span>
            </span>
            {updateAvailableVersion ? (
              <span className="text-[10px] font-mono text-white bg-[#dd4b19] px-1.5 py-0.5 rounded">
                v{updateAvailableVersion}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400">GitHub</span>
            )}
          </button>
        </div>

        <div className="mt-6 mb-1.5 px-2 text-[11px] font-medium text-slate-400">
          Документ и данные
        </div>

        <div className="space-y-0.5">
          <button onClick={onOpenReport} disabled={!hasPlan} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <FileText className="w-4 h-4 stroke-[1.5] shrink-0 text-[#dd4b19]" />
              <span className="text-[#f1f5f9] truncate">Печать / Наряд А4</span>
            </span>
          </button>

          <button onClick={onOpenImport} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <FileSpreadsheet className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Импорт из Excel</span>
            </span>
          </button>

          <button onClick={onDownloadSample} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <Download className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Шаблон Excel</span>
            </span>
          </button>

          <button onClick={onLoadExample} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <Layers className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Пример из Excel</span>
            </span>
          </button>

          <button onClick={onClearAll} className={itemClass}>
            <span className="flex items-center gap-2.5 truncate">
              <RotateCcw className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span className="truncate">Сбросить таблицы</span>
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom Theme Toggle + Info Footer */}
      <div className="p-3 border-t border-[var(--sidebar-border)] space-y-2.5">
        <div className="flex items-center bg-white/[0.06] rounded p-0.5 border border-white/[0.08] text-[11px]">
          <button
            type="button"
            onClick={() => onToggleTheme("light")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded transition-colors cursor-pointer ${
              settings.theme === "light"
                ? "bg-[#f8fafc] text-[#0f172a] font-medium"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Светлая</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleTheme("dark")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded transition-colors cursor-pointer ${
              settings.theme === "dark"
                ? "bg-[#282d37] text-white font-medium"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Тёмная</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 space-y-0.5 px-0.5">
          <div className="text-slate-200 font-medium truncate">{settings.companyName}</div>
          <div className="truncate font-mono text-[10px]">{settings.machineName}</div>
        </div>
      </div>
    </aside>
  );
};
