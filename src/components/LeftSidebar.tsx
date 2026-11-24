import React from "react";
import { AppSettings } from "../types";
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
} from "lucide-react";

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
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
  onClose,
  settings,
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
      : "bg-[#6b7280]";

  const statusText =
    settings.calcMode === "instant"
      ? `Мгновенно${calcTimeMs !== null ? ` • ${calcTimeMs} мс` : ""}`
      : settings.calcMode === "timer"
      ? `Таймер: через ${timerSecondsLeft} с`
      : isDirty
      ? "Требует обновления"
      : `Обновлено${calcTimeMs !== null ? ` • ${calcTimeMs} мс` : ""}`;

  const itemClass =
    "w-full h-8 px-2 rounded flex items-center justify-between text-xs text-[#9ea3ae] hover:text-[#ededed] hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <aside className="w-60 shrink-0 bg-[#151518] border-r border-white/[0.08] flex flex-col select-none no-print sticky top-0 h-screen">
      {/* Brand + Collapse Control */}
      <div className="h-12 px-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <MobilLogo height={16} showWordmark={true} accentColor="#dd4b19" color="#ededed" />
          <span className="text-[10px] text-[#6b7280] font-mono">v0.2</span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[#9ea3ae] hover:text-[#ededed] hover:bg-white/[0.05] rounded transition-colors cursor-pointer"
          title="Скрыть левую панель"
        >
          <PanelLeftClose className="w-4 h-4 stroke-[1.5]" />
        </button>
      </div>

      {/* Primary Refresh Action + Status */}
      <div className="p-3 border-b border-white/[0.06] space-y-2">
        <button
          onClick={onCalculate}
          disabled={loading}
          className={`w-full h-9 px-3 rounded flex items-center justify-between text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
            isDirty && settings.calcMode !== "instant"
              ? "bg-[#dd4b19] hover:bg-[#c53f12] text-white"
              : "bg-[#202024] hover:bg-[#28282e] text-[#ededed] border border-white/[0.08]"
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
          <kbd className="text-[10px] font-mono opacity-65 px-1 rounded bg-black/20">
            Ctrl+↵
          </kbd>
        </button>

        <div className="flex items-center gap-2 px-1 text-[11px] text-[#9ea3ae] font-mono">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="truncate">{statusText}</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mt-2 mb-1.5 px-2 text-[11px] font-medium text-[#6b7280]">
          Настройки и режим
        </div>

        <div className="space-y-0.5">
          <button onClick={() => onOpenSettings("cutting")} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span>Настройки станка</span>
            </span>
          </button>

          <button onClick={() => onOpenSettings("refresh")} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span>Обновление</span>
            </span>
            <span className="text-[10px] font-mono text-[#6b7280] bg-[#1d1d21] px-1.5 py-0.5 rounded">
              {modeBadge}
            </span>
          </button>

          <button onClick={() => onOpenSettings("angles")} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span>Шаблоны углов</span>
            </span>
            <span className="text-[10px] font-mono text-[#6b7280]">
              {settings.anglePresets.length}
            </span>
          </button>

          <button onClick={() => onOpenSettings("branding")} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span>Брендинг и цех</span>
            </span>
          </button>
        </div>

        <div className="mt-6 mb-1.5 px-2 text-[11px] font-medium text-[#6b7280]">
          Документ и данные
        </div>

        <div className="space-y-0.5">
          <button onClick={onOpenReport} disabled={!hasPlan} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 stroke-[1.5] shrink-0 text-[#dd4b19]" />
              <span className="text-[#ededed]">Печать / Наряд А4</span>
            </span>
          </button>

          <button onClick={onOpenImport} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span>Импорт из Excel</span>
            </span>
          </button>

          <button onClick={onDownloadSample} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <Download className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span>Шаблон Excel</span>
            </span>
          </button>

          <button onClick={onLoadExample} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span>Пример из Excel</span>
            </span>
          </button>

          <button onClick={onClearAll} className={itemClass}>
            <span className="flex items-center gap-2.5">
              <RotateCcw className="w-4 h-4 stroke-[1.5] shrink-0" />
              <span>Сбросить таблицы</span>
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom Info Footer */}
      <div className="p-3 border-t border-white/[0.06] text-[11px] text-[#6b7280] space-y-1">
        <div className="text-[#9ea3ae] font-medium truncate">{settings.companyName}</div>
        <div className="truncate font-mono text-[10px]">{settings.machineName}</div>
      </div>
    </aside>
  );
};
