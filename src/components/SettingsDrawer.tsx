import React, { useState, useEffect } from "react";
import {
  APP_THEMES,
  AppSettings,
  CutConfig,
  AnglePreset,
  UpdateCheckResult,
  UpdateProgressEvent,
  DEFAULT_REPORT_CONFIG,
  ReportDisplaySettings,
  CUTTING_ALGORITHMS,
  STOCK_PRIORITY_MODES,
  StockPriorityMode,
} from "../types";
import { MobilLogo } from "./MobilLogo";
import { DEFAULT_ANGLE_PRESETS } from "./PartsTable";
import {
  X,
  RefreshCw,
  Compass,
  Sliders,
  Building2,
  Plus,
  Trash2,
  RotateCcw,
  Cpu,
  Clock,
  ArrowUpCircle,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  Palette,
  FileSpreadsheet,
  Layers,
  Pin,
} from "lucide-react";

export type SettingsTabType =
  | "algorithms"
  | "machine"
  | "angles"
  | "import"
  | "report"
  | "themes"
  | "branding"
  | "update"
  | "cutting"
  | "refresh";

function normalizeGroup(tab?: SettingsTabType): Exclude<SettingsTabType, "cutting" | "refresh"> {
  if (!tab || tab === "cutting") return "algorithms";
  if (tab === "refresh") return "machine";
  return tab;
}

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabType;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  config: CutConfig;
  onConfigChange: (config: CutConfig) => void;
  calcTimeMs: number | null;
  onManualRefresh: () => void;
  onOpenReportPreview?: () => void;
  onDownloadSample: () => void;
  onLoadExample: () => void;
  isCalculating: boolean;
  appVersion: string;
  updateInfo: UpdateCheckResult | null;
  updateChecking: boolean;
  updateDownloading: boolean;
  updateProgress: UpdateProgressEvent | null;
  updateError: string | null;
  onCheckUpdates: () => void;
  onInstallUpdate: () => void;
  onOpenReleasePage: (url: string) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  initialTab = "algorithms",
  settings,
  onSettingsChange,
  config,
  onConfigChange,
  calcTimeMs,
  onManualRefresh,
  onOpenReportPreview,
  onDownloadSample,
  onLoadExample,
  isCalculating,
  appVersion,
  updateInfo,
  updateChecking,
  updateDownloading,
  updateProgress,
  updateError,
  onCheckUpdates,
  onInstallUpdate,
  onOpenReleasePage,
}) => {
  const [activeGroup, setActiveGroup] = useState(() => normalizeGroup(initialTab));

  useEffect(() => {
    if (isOpen) {
      setActiveGroup(normalizeGroup(initialTab));
    }
  }, [isOpen, initialTab]);

  // New angle template form state
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetLeft, setNewPresetLeft] = useState<number>(45);
  const [newPresetRight, setNewPresetRight] = useState<number>(45);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const updateImportOption = (
    key: keyof AppSettings["importOptions"],
    value: boolean
  ) => {
    updateSetting("importOptions", {
      ...settings.importOptions,
      [key]: value,
    });
  };

  const activeAlgorithm = config.algorithm || "auto";
  const activeAlgorithmMeta =
    CUTTING_ALGORITHMS.find((a) => a.id === activeAlgorithm) || CUTTING_ALGORITHMS[0];

  const reportCfg: ReportDisplaySettings = {
    ...DEFAULT_REPORT_CONFIG,
    ...(settings.reportConfig || {}),
  };

  const updateReportCfg = <K extends keyof ReportDisplaySettings>(
    key: K,
    value: ReportDisplaySettings[K]
  ) => {
    updateSetting("reportConfig", {
      ...reportCfg,
      [key]: value,
    });
  };

  const resetReportCfg = () => {
    updateSetting("reportConfig", DEFAULT_REPORT_CONFIG);
  };

  const updateConfig = <K extends keyof CutConfig>(key: K, value: CutConfig[K]) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const newPreset: AnglePreset = {
      id: `p-custom-${Date.now()}`,
      name: newPresetName.trim(),
      left: newPresetLeft,
      right: newPresetRight,
    };
    updateSetting("anglePresets", [...settings.anglePresets, newPreset]);
    setNewPresetName("");
  };

  const handleDeletePreset = (id: string) => {
    updateSetting(
      "anglePresets",
      settings.anglePresets.filter((p) => p.id !== id)
    );
  };

  const handleResetPresets = () => {
    updateSetting("anglePresets", DEFAULT_ANGLE_PRESETS);
  };

  const navGroups: Array<{
    id: Exclude<SettingsTabType, "cutting" | "refresh">;
    label: string;
    meta: string;
    icon: React.ReactNode;
    dot?: boolean;
  }> = [
    {
      id: "algorithms",
      label: "Алгоритм раскроя",
      meta: `${CUTTING_ALGORITHMS.length} реж.`,
      icon: <Cpu className="w-4 h-4 shrink-0" />,
    },
    {
      id: "machine",
      label: "Станок и расчёт",
      meta: `${config.cut_width} мм`,
      icon: <Sliders className="w-4 h-4 shrink-0" />,
    },
    {
      id: "angles",
      label: "Углы и шаблоны",
      meta: `${settings.anglePresets.length}`,
      icon: <Compass className="w-4 h-4 shrink-0" />,
    },
    {
      id: "import",
      label: "Импорт CSV / Excel",
      meta: `${settings.defaultStockLength} мм`,
      icon: <FileSpreadsheet className="w-4 h-4 shrink-0" />,
    },
    {
      id: "report",
      label: "Печать и отчёт А4",
      meta: "А4",
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    {
      id: "themes",
      label: "Темы",
      meta: `${APP_THEMES.length} темы`,
      icon: <Palette className="w-4 h-4 shrink-0" />,
    },
    {
      id: "branding",
      label: "Брендинг и цех",
      meta: "Реквизиты",
      icon: <Building2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: "update",
      label: "Обновления и о ПО",
      meta: `v${appVersion}`,
      icon: <ArrowUpCircle className="w-4 h-4 shrink-0" />,
      dot: Boolean(updateInfo?.has_update),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 md:p-6 no-print">
      {/* Backdrop click closes */}
      <div onClick={onClose} className="absolute inset-0" />

      {/* Spacious Dedicated Settings Area */}
      <div className="relative z-10 w-full max-w-5xl h-[88vh] max-h-[820px] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-subtle)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-main)] flex items-center justify-center text-[var(--accent)]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Настройки программы</h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Выберите группу параметров слева — изменения применяются и сохраняются автоматически
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-main)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Вернуться к раскрою</span>
          </button>
        </div>

        {/* Split Body: Left Groups Navigation + Right Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Groups Sidebar */}
          <aside className="md:w-60 shrink-0 bg-[var(--bg-subtle)] border-b md:border-b-0 md:border-r border-[var(--border-main)] p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto">
            <div className="hidden md:block px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Группы настроек
            </div>

            {navGroups.map((grp) => {
              const isAct = activeGroup === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setActiveGroup(grp.id)}
                  className={`shrink-0 md:w-full px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer border ${
                    isAct
                      ? "bg-[var(--accent-subtle)] border-[var(--accent)]/40 text-[var(--accent)] font-semibold"
                      : "border-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {grp.icon}
                    <span className="truncate">{grp.label}</span>
                    {grp.dot && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                    )}
                  </span>
                  <span
                    className={`hidden md:inline text-[10px] font-mono shrink-0 ${
                      isAct ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {grp.meta}
                  </span>
                </button>
              );
            })}

            <div className="hidden md:block flex-1" />
            <div className="hidden md:block px-2.5 pt-3 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] leading-relaxed">
              Все параметры сохраняются локально и действуют для всех вкладок.
            </div>
          </aside>

          {/* Right Group Content */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 text-xs">
            {/* GROUP 1: CUTTING ALGORITHMS */}
            {activeGroup === "algorithms" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Алгоритм расчёта линейного раскроя
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Выберите стратегию оптимизации карт распила. При смене режима активная вкладка
                    пересчитывается сразу.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {CUTTING_ALGORITHMS.map((algo) => {
                    const isSelected = activeAlgorithm === algo.id;
                    return (
                      <label
                        key={algo.id}
                        className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[var(--accent-subtle)]/50 border-[var(--accent)]"
                            : "bg-[var(--bg-subtle)] border-[var(--border-main)] hover:border-[var(--accent)]/40"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="cuttingAlgorithm"
                            checked={isSelected}
                            onChange={() => updateConfig("algorithm", algo.id)}
                            className="mt-1 accent-[var(--accent)]"
                          />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-semibold text-[var(--text-primary)]">
                                {algo.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                  isSelected
                                    ? "bg-[var(--accent)] text-white"
                                    : "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                                }`}
                              >
                                {algo.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                              {algo.summary}
                            </p>
                            <div className="pt-1.5 text-[10.5px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)] space-y-1">
                              <div>
                                <strong className="text-[var(--text-secondary)]">Как считает:</strong>{" "}
                                {algo.howItWorks}
                              </div>
                              <div>
                                <strong className="text-[var(--text-secondary)]">Когда выбирать:</strong>{" "}
                                {algo.bestFor}
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GROUP 2: MACHINE & CALCULATION MODE */}
            {activeGroup === "machine" && (
              <div className="max-w-2xl space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Параметры станка, интерфейс и расчёт
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Толщина пильного диска, торцовки, режим автообновления и поведение боковой панели
                  </p>
                </div>

                {/* Machine parameters */}
                <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                        Ширина пропила пильного диска (dRez), мм
                      </label>
                      <input
                        type="number"
                        value={config.cut_width}
                        onChange={(e) =>
                          updateConfig("cut_width", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                        Порог делового остатка (delOst), мм
                      </label>
                      <input
                        type="number"
                        value={config.min_remnant}
                        onChange={(e) =>
                          updateConfig("min_remnant", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                        Торцовка слева, мм
                      </label>
                      <input
                        type="number"
                        value={config.trim_left}
                        onChange={(e) =>
                          updateConfig("trim_left", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                        Торцовка справа, мм
                      </label>
                      <input
                        type="number"
                        value={config.trim_right}
                        onChange={(e) =>
                          updateConfig("trim_right", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.two_profiles}
                      onChange={(e) => updateConfig("two_profiles", e.target.checked)}
                      className="mt-0.5 rounded accent-[var(--accent)]"
                    />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        Рез в 2 профиля (пакетный распил)
                      </div>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                        Удваивает производительность: одновременно пилятся два сложенных профиля
                      </p>
                    </div>
                  </label>

                  <div>
                    <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                      Название станка / линии
                    </label>
                    <input
                      type="text"
                      value={settings.machineName}
                      onChange={(e) => updateSetting("machineName", e.target.value)}
                      placeholder="Например: Двухголовочная усорезная пила"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                {/* Stock / Remnant Priority Strategy */}
                <div className="space-y-2">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Приоритет склада заготовок и обрезков
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Определяет порядок расхода коротких заготовок, партий с заданным количеством и
                    строк с отметкой «Обрезок»
                  </p>
                  {STOCK_PRIORITY_MODES.map((mode) => {
                    const isSelected =
                      (config.stock_priority || "min_total_length") === mode.id;
                    return (
                      <label
                        key={mode.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                          isSelected
                            ? "bg-[var(--accent-subtle)]/50 border-[var(--accent)]"
                            : "bg-[var(--bg-subtle)] border-[var(--border-main)] hover:border-[var(--accent)]/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="stockPriorityMode"
                          checked={isSelected}
                          onChange={() =>
                            updateConfig("stock_priority", mode.id as StockPriorityMode)
                          }
                          className="mt-0.5 accent-[var(--accent)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
                            <span>{mode.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                isSelected
                                  ? "bg-[var(--accent)] text-white"
                                  : "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                              }`}
                            >
                              {mode.badge}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                            {mode.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Sidebar Pin Setting */}
                <label className="flex items-center justify-between gap-3 p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl cursor-pointer">
                  <div className="flex items-start gap-2.5">
                    <Pin className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        Закреплять боковую панель постоянно
                      </div>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                        По умолчанию боковое меню скрыто; его также можно закрепить кнопкой в шапке
                        самого меню.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sidebarPinned}
                    onChange={(e) => updateSetting("sidebarPinned", e.target.checked)}
                    className="rounded accent-[var(--accent)] shrink-0"
                  />
                </label>

                {/* Calculation Mode */}
                <div className="space-y-2">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Режим перерасчёта карт
                  </div>
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                      settings.calcMode === "instant"
                        ? "bg-[var(--accent-subtle)]/50 border-[var(--accent)]"
                        : "bg-[var(--bg-subtle)] border-[var(--border-main)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="calcMode"
                      checked={settings.calcMode === "instant"}
                      onChange={() => updateSetting("calcMode", "instant")}
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <div>
                      <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>Мгновенно (Live)</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Рекомендуется
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                        Автоматический перерасчет сразу при изменении данных в таблицах
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                      settings.calcMode === "timer"
                        ? "bg-[var(--accent-subtle)]/50 border-[var(--accent)]"
                        : "bg-[var(--bg-subtle)] border-[var(--border-main)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="calcMode"
                      checked={settings.calcMode === "timer"}
                      onChange={() => updateSetting("calcMode", "timer")}
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>По таймеру ({settings.timerSeconds} сек)</span>
                      </div>
                      {settings.calcMode === "timer" && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center gap-3">
                          <span className="text-[11px] text-[var(--text-secondary)]">Интервал:</span>
                          <input
                            type="range"
                            min="3"
                            max="60"
                            step="1"
                            value={settings.timerSeconds}
                            onChange={(e) =>
                              updateSetting("timerSeconds", parseInt(e.target.value) || 10)
                            }
                            className="flex-1 accent-[var(--accent)]"
                          />
                          <span className="font-mono font-medium w-10 text-right">
                            {settings.timerSeconds} с
                          </span>
                        </div>
                      )}
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                      settings.calcMode === "manual"
                        ? "bg-[var(--accent-subtle)]/50 border-[var(--accent)]"
                        : "bg-[var(--bg-subtle)] border-[var(--border-main)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="calcMode"
                      checked={settings.calcMode === "manual"}
                      onChange={() => updateSetting("calcMode", "manual")}
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">Только вручную</div>
                      <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                        Запуск только по кнопке «Обновить» или Ctrl+Enter
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={settings.autoRecalcOnFocus}
                      onChange={(e) => updateSetting("autoRecalcOnFocus", e.target.checked)}
                      className="rounded accent-[var(--accent)]"
                    />
                    <span className="text-[11px]">
                      Обновлять раскрой при возвращении в окно программы
                    </span>
                  </label>
                </div>

                {/* Quick Diagnostics */}
                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[11px] space-y-0.5">
                    <div className="text-[var(--text-secondary)]">
                      Алгоритм:{" "}
                      <button
                        type="button"
                        onClick={() => setActiveGroup("algorithms")}
                        className="font-mono text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        {activeAlgorithmMeta.name}
                      </button>
                    </div>
                    <div className="text-[var(--text-muted)] font-mono">
                      Последний расчёт: {calcTimeMs !== null ? `${calcTimeMs} мс` : "Ожидание"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onManualRefresh}
                    disabled={isCalculating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-[var(--accent)] ${
                        isCalculating ? "animate-spin" : ""
                      }`}
                    />
                    <span>{isCalculating ? "Расчёт..." : "Пересчитать"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* GROUP 3: ANGLE TEMPLATES */}
            {activeGroup === "angles" && (
              <div className="max-w-2xl space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Шаблоны углов торцевания
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Пользовательские пресеты углов для выпадающих списков в таблице деталей
                  </p>
                </div>

                <form
                  onSubmit={handleAddPreset}
                  className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl space-y-3"
                >
                  <div className="font-medium text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Добавить новый шаблон угла</span>
                  </div>

                  <div>
                    <label className="text-[10.5px] text-[var(--text-secondary)] block mb-1">
                      Название шаблона
                    </label>
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Например: Фасадный скос 33.5° / 90°"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div>
                      <label className="text-[10.5px] text-[var(--text-secondary)] block mb-1">
                        Левый угол L (°)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newPresetLeft}
                        onChange={(e) => setNewPresetLeft(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-[var(--text-secondary)] block mb-1">
                        Правый угол R (°)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newPresetRight}
                        onChange={(e) => setNewPresetRight(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!newPresetName.trim()}
                    className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Сохранить шаблон
                  </button>
                </form>

                <div className="space-y-1.5">
                  {settings.anglePresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-2.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg hover:border-[var(--accent)]/40 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{preset.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          L = {preset.left}° &bull; R = {preset.right}°
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded transition-colors cursor-pointer"
                        title="Удалить шаблон"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetPresets}
                    className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Сбросить к заводским</span>
                  </button>
                </div>
              </div>
            )}

            {/* GROUP 4: IMPORT CSV / EXCEL & DEFAULT STOCK LENGTH */}
            {activeGroup === "import" && (
              <div className="max-w-2xl space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Импорт выгрузок САПР / Excel и заготовки по умолчанию
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Правила автоматической разбивки материалов по вкладкам и длина хлыста для новых
                    вкладок
                  </p>
                </div>

                {/* Default Stock Length card */}
                <div className="p-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-subtle)]/40 space-y-2.5">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Длина хлыстов по умолчанию для новых вкладок, мм
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Автоматически подставляется на склад при создании вкладок из CSV / Excel (в
                    каждой открытой вкладке склад можно изменить вручную).
                  </p>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <input
                      type="number"
                      min={500}
                      max={20000}
                      value={settings.defaultStockLength}
                      onChange={(e) =>
                        updateSetting(
                          "defaultStockLength",
                          Math.max(100, parseInt(e.target.value, 10) || 6000)
                        )
                      }
                      className="w-28 bg-[var(--bg-surface)] border border-[var(--accent)] rounded px-3 py-1.5 font-mono font-bold text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                    {[6000, 6100, 6500, 7000].map((presetLen) => (
                      <button
                        key={presetLen}
                        type="button"
                        onClick={() => updateSetting("defaultStockLength", presetLen)}
                        className={`px-2.5 py-1.5 rounded border font-mono text-[11px] transition-colors cursor-pointer ${
                          settings.defaultStockLength === presetLen
                            ? "bg-[var(--accent)] border-[var(--accent)] text-white font-semibold"
                            : "bg-[var(--bg-surface)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {presetLen}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Import rules toggles */}
                <div className="space-y-2.5">
                  {(
                    [
                      [
                        "splitByMaterialAndColor",
                        "Разбивать материалы на отдельные вкладки",
                        "Для каждой пары «Артикул + Цвет» (например AYPC.EF100.0501 · RAL 7012 и RAL 7001) создаётся отдельная вкладка раскроя.",
                      ],
                      [
                        "mergeDuplicateParts",
                        "Объединять дубликаты строк при импорте",
                        "Суммирует количество деталей при совпадении марки/артикула, длины и всех 4 углов (убирает повторы из САПР-выгрузки).",
                      ],
                      [
                        "roundFractionalUp",
                        "Округлять дробные длины вверх (например 3112,5 → 3113 мм)",
                        "Корректно распознаёт десятичную запятую/точку и гарантирует запас по длине при резке.",
                      ],
                    ] as const
                  ).map(([field, title, desc]) => (
                    <label
                      key={field}
                      className="flex items-start justify-between gap-3 p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl cursor-pointer"
                    >
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{title}</div>
                        <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">{desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.importOptions[field])}
                        onChange={(e) => updateImportOption(field, e.target.checked)}
                        className="mt-1 rounded accent-[var(--accent)] shrink-0"
                      />
                    </label>
                  ))}
                </div>

                {/* Secondary actions moved from sidebar */}
                <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl space-y-2.5">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Шаблон и демонстрационный пример
                  </div>
                  <p className="text-[10.5px] text-[var(--text-muted)]">
                    Перенесено из боковой панели, чтобы не загромождать основное меню.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={onDownloadSample}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Скачать шаблон Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onLoadExample();
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Открыть демо-пример во вкладке</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GROUP 5: REPORT DISPLAY EDITOR */}
            {activeGroup === "report" && (
              <div className="max-w-2xl space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Редактор отображения отчётов (А4)
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Выберите нужные блоки, плотность карт и подписи для печати / PDF
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetReportCfg}
                    className="shrink-0 flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 rounded border border-[var(--border-main)] bg-[var(--bg-subtle)] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Сброс</span>
                  </button>
                </div>

                {/* Live Mini Preview of A4 Sheet */}
                <div className="p-3 bg-white text-black border border-neutral-300 rounded-lg shadow-xs space-y-2 text-[10px]">
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-neutral-500 border-b border-neutral-200 pb-1">
                    <span>Мини-макет листа А4</span>
                    {onOpenReportPreview && (
                      <button
                        type="button"
                        onClick={onOpenReportPreview}
                        className="flex items-center gap-1 text-[#dd4b19] hover:underline font-semibold normal-case cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Открыть А4</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2 border-b border-black pb-1.5">
                    <div>
                      {reportCfg.showLogoAndCompany && (
                        <div className="flex items-center gap-1.5 mb-0.5 text-[9px] text-neutral-600 font-semibold">
                          <MobilLogo height={12} color="#000000" accentColor="#dd4b19" />
                          <span>{settings.companyName}</span>
                        </div>
                      )}
                      <div className="font-bold text-xs">{reportCfg.defaultTitle}</div>
                      {reportCfg.showMaterialAndMachine && (
                        <div className="text-[9px] text-neutral-600">
                          Материал: Профиль &bull; Станок: {settings.machineName}
                        </div>
                      )}
                    </div>
                    {reportCfg.showOrderParams && (
                      <div className="text-[9px] font-mono text-right text-neutral-700 shrink-0">
                        <div>Дата &bull; Пропил: {config.cut_width} мм</div>
                      </div>
                    )}
                  </div>

                  {reportCfg.showSummaryTable && (
                    <div className="grid grid-cols-4 border border-black text-center font-mono text-[9px]">
                      <div className="py-1 border-r border-black bg-neutral-100">Деталей: 41</div>
                      <div className="py-1 border-r border-black">Хлыстов: 20</div>
                      <div className="py-1 border-r border-black font-bold">КИМ: 85%</div>
                      <div className="py-1">Остаток</div>
                    </div>
                  )}

                  <div
                    className={`border border-black bg-white ${
                      reportCfg.compactCards ? "p-1.5" : "p-2"
                    }`}
                  >
                    <div className="flex justify-between font-mono text-[9px] mb-1">
                      <strong>КАРТА #1 &bull; L={settings.defaultStockLength} мм</strong>
                      <span className="text-neutral-600">Отход: 202 мм</span>
                    </div>
                    {reportCfg.showCutDiagrams && (
                      <svg
                        viewBox="0 0 360 22"
                        className="w-full h-auto border border-black bg-white mb-1 block"
                      >
                        <polygon
                          points="1,1 140,1 132,21 9,21"
                          fill="#fff"
                          stroke="#000"
                          strokeWidth="1"
                        />
                        {reportCfg.showAnglesOnDiagram && (
                          <text x="12" y="14" fontSize="7" fontFamily="monospace" fill="#444">
                            45°
                          </text>
                        )}
                        <text
                          x="70"
                          y="14"
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="700"
                          textAnchor="middle"
                          fill="#000"
                        >
                          {reportCfg.showPartLabelsOnDiagram ? "EF100 · 3126" : "3126"}
                        </text>
                        <polygon
                          points="145,1 285,1 285,21 145,21"
                          fill="#fff"
                          stroke="#000"
                          strokeWidth="1"
                        />
                        <text
                          x="215"
                          y="14"
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="700"
                          textAnchor="middle"
                          fill="#000"
                        >
                          {reportCfg.showPartLabelsOnDiagram ? "EF100 · 1326" : "1326"}
                        </text>
                        <rect
                          x="290"
                          y="1"
                          width="69"
                          height="20"
                          fill="#e5e5e5"
                          stroke="#000"
                          strokeWidth="1"
                        />
                      </svg>
                    )}
                    {reportCfg.showCutSequence && (
                      <div className="font-mono text-[8.5px] text-neutral-700">
                        Распил: 1) [EF100] 3126 мм → 2) [EF100] 1326 мм → Ост: 202 мм
                      </div>
                    )}
                  </div>

                  {reportCfg.showSignatures && (
                    <div className="pt-1 border-t border-black flex justify-between font-mono text-[9px] text-neutral-700">
                      <span>
                        {reportCfg.leftSignatureTitle}: {settings.operatorName || "____"}
                      </span>
                      <span>{reportCfg.rightSignatureTitle}: ____</span>
                    </div>
                  )}
                </div>

                {/* Section Visibility Checkboxes */}
                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl space-y-2">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">
                    Отображаемые разделы
                  </div>
                  {(
                    [
                      ["showLogoAndCompany", "Логотип и реквизиты компании в шапке"],
                      ["showMaterialAndMachine", "Материал, профиль и название станка"],
                      ["showOrderParams", "Дата, ширина пропила и режим резки"],
                      ["showSummaryTable", "Таблица сводных показателей (КИМ, отходы)"],
                      ["showCutDiagrams", "Графические векторные схемы полос раскроя"],
                      ["showPartLabelsOnDiagram", "Показывать марку детали внутри полосы"],
                      ["showAnglesOnDiagram", "Показывать углы в градусах на чертеже полосы"],
                      ["showCutSequence", "Список отрезков по порядку распила под картой"],
                      ["compactCards", "Компактные карточки (больше карт на лист А4)"],
                    ] as const
                  ).map(([field, label]) => (
                    <label
                      key={field}
                      className="flex items-center gap-2.5 cursor-pointer text-[11.5px] text-[var(--text-primary)]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(reportCfg[field])}
                        onChange={(e) => updateReportCfg(field, e.target.checked)}
                        className="rounded accent-[var(--accent)]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {/* Diagram Bar Height Selector */}
                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl space-y-2">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Толщина полос распила на листе А4
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["compact", "Узкие (24 px)"],
                        ["normal", "Стандарт (30 px)"],
                        ["tall", "Крупные (38 px)"],
                      ] as const
                    ).map(([mode, title]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateReportCfg("diagramBarHeight", mode)}
                        className={`py-1.5 px-2 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                          reportCfg.diagramBarHeight === mode
                            ? "border-[var(--accent)] bg-[var(--bg-hover)] text-[var(--text-primary)]"
                            : "border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes & Signatures */}
                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl space-y-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                      Заголовок документа по умолчанию
                    </label>
                    <input
                      type="text"
                      value={reportCfg.defaultTitle}
                      onChange={(e) => updateReportCfg("defaultTitle", e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer text-[11.5px] text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={reportCfg.showNotes}
                      onChange={(e) => updateReportCfg("showNotes", e.target.checked)}
                      className="rounded accent-[var(--accent)]"
                    />
                    <span>Выводить блок примечаний для цеха</span>
                  </label>

                  {reportCfg.showNotes && (
                    <textarea
                      rows={2}
                      value={reportCfg.notesText}
                      onChange={(e) => updateReportCfg("notesText", e.target.value)}
                      placeholder="Например: Проверить направление паза профиля при торцовке 45°..."
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                  )}

                  <label className="flex items-center gap-2.5 cursor-pointer text-[11.5px] text-[var(--text-primary)] pt-1 border-t border-[var(--border-subtle)]">
                    <input
                      type="checkbox"
                      checked={reportCfg.showSignatures}
                      onChange={(e) => updateReportCfg("showSignatures", e.target.checked)}
                      className="rounded accent-[var(--accent)]"
                    />
                    <span>Показывать блок подписей в нижней части листа</span>
                  </label>

                  {reportCfg.showSignatures && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={reportCfg.leftSignatureTitle}
                        onChange={(e) => updateReportCfg("leftSignatureTitle", e.target.value)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        type="text"
                        value={reportCfg.rightSignatureTitle}
                        onChange={(e) => updateReportCfg("rightSignatureTitle", e.target.value)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GROUP 6: THEMES */}
            {activeGroup === "themes" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Темы оформления интерфейса
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Выберите комфортную цветовую схему для офиса или цехового монитора. Палитра
                    применяется мгновенно ко всем вкладкам и панелям.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {APP_THEMES.map((thm) => {
                    const isSel = settings.theme === thm.id;
                    return (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => updateSetting("theme", thm.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-3 ${
                          isSel
                            ? "border-[var(--accent)] bg-[var(--accent-subtle)]/50 ring-1 ring-[var(--accent)]"
                            : "border-[var(--border-main)] bg-[var(--bg-subtle)] hover:border-[var(--accent)]/40"
                        }`}
                      >
                        {/* Live schematic mini preview */}
                        <div
                          className="rounded-lg border overflow-hidden h-24 flex flex-col"
                          style={{
                            backgroundColor: thm.preview.bg,
                            borderColor: "rgba(148,163,184,0.35)",
                          }}
                        >
                          <div
                            className="h-4 px-2 flex items-center gap-1.5"
                            style={{ backgroundColor: thm.preview.sidebar }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: thm.preview.accent }}
                            />
                            <span className="text-[8px] font-mono text-slate-300 truncate">
                              {thm.name}
                            </span>
                          </div>
                          <div className="flex-1 p-2 grid grid-cols-3 gap-2">
                            <div
                              className="rounded p-1.5 space-y-1 border border-slate-400/20"
                              style={{ backgroundColor: thm.preview.surface }}
                            >
                              <div
                                className="h-1.5 w-10 rounded"
                                style={{ backgroundColor: thm.preview.accent }}
                              />
                              <div className="h-1.5 w-14 rounded bg-slate-400/40" />
                            </div>
                            <div
                              className="col-span-2 rounded p-2 space-y-1.5 border border-slate-400/20"
                              style={{ backgroundColor: thm.preview.surface }}
                            >
                              <div className="h-3 w-full rounded bg-[#1e3a5f]" />
                              <div
                                className="h-3 w-3/4 rounded"
                                style={{ backgroundColor: thm.preview.accent }}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                              <span
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  isSel
                                    ? "border-[var(--accent)]"
                                    : "border-[var(--border-input)]"
                                }`}
                              >
                                {isSel && (
                                  <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                                )}
                              </span>
                              <span>{thm.name}</span>
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                isSel
                                  ? "bg-[var(--accent)] text-white"
                                  : "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                              }`}
                            >
                              {thm.badge}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-[var(--text-secondary)] mt-1 leading-snug">
                            {thm.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Strip height setting */}
                <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl space-y-2 max-w-xl">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Высота полос на схемах карт раскроя по умолчанию
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["compact", "Узкие (28 px)"],
                        ["normal", "Средние (36 px)"],
                        ["tall", "Крупные (44 px)"],
                      ] as const
                    ).map(([mode, title]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateSetting("barDensity", mode)}
                        className={`py-1.5 px-2.5 rounded border text-[11px] font-medium cursor-pointer ${
                          settings.barDensity === mode
                            ? "border-[var(--accent)] bg-[var(--accent-subtle)]/50 text-[var(--text-primary)]"
                            : "border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* GROUP 7: BRANDING */}
            {activeGroup === "branding" && (
              <div className="max-w-2xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Брендинг и реквизиты предприятия
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Реквизиты отображаются в подвале интерфейса и в печатной форме наряда А4
                  </p>
                </div>

                <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--accent)]/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MobilLogo
                        height={16}
                        accentColor="var(--accent)"
                        color="var(--text-primary)"
                      />
                      <span className="text-[10px] text-[var(--accent)] font-mono">mobil66.ru</span>
                    </div>
                    <span className="text-[10px] bg-[var(--accent-subtle)] text-[var(--accent)] px-2 py-0.5 rounded font-medium">
                      Активен
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    АО «Мобиль» (г. Екатеринбург) — светопрозрачные фасады, витражные и оконные
                    системы.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                    Название предприятия
                  </label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => updateSetting("companyName", e.target.value)}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                      Сайт
                    </label>
                    <input
                      type="text"
                      value={settings.companyWebsite}
                      onChange={(e) => updateSetting("companyWebsite", e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                      Телефон цеха
                    </label>
                    <input
                      type="text"
                      value={settings.companyPhone}
                      onChange={(e) => updateSetting("companyPhone", e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                    Технолог / Мастер смены по умолчанию
                  </label>
                  <input
                    type="text"
                    value={settings.operatorName}
                    onChange={(e) => updateSetting("operatorName", e.target.value)}
                    placeholder="Например: Иванов А. С."
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            )}

            {/* GROUP 8: UPDATES & ABOUT */}
            {activeGroup === "update" && (
              <div className="max-w-xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Обновление программы и версия
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Автоматическая проверка и загрузка новых версий из GitHub Releases
                  </p>
                </div>

                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">Установленная версия:</span>
                    <span className="font-mono text-[var(--text-primary)] font-semibold">
                      v{appVersion}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">Источник релизов:</span>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenReleasePage("https://github.com/pururuall/raskroy-pro/releases")
                      }
                      className="font-mono text-[var(--text-primary)] hover:text-[var(--accent)] flex items-center gap-1 cursor-pointer"
                    >
                      <span>pururuall/raskroy-pro</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={settings.autoCheckUpdates}
                    onChange={(e) => updateSetting("autoCheckUpdates", e.target.checked)}
                    className="rounded accent-[var(--accent)]"
                  />
                  <span className="text-[11px]">
                    Проверять обновления автоматически при запуске программы
                  </span>
                </label>

                <button
                  type="button"
                  onClick={onCheckUpdates}
                  disabled={updateChecking || updateDownloading}
                  className="w-full h-9 flex items-center justify-center gap-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg border border-[var(--border-main)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[var(--accent)] ${
                      updateChecking ? "animate-spin" : ""
                    }`}
                  />
                  <span>{updateChecking ? "Проверка GitHub..." : "Проверить обновления"}</span>
                </button>

                {updateError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-rose-600 dark:text-rose-300 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{updateError}</span>
                  </div>
                )}

                {updateInfo && !updateInfo.has_update && !updateError && (
                  <div className="p-3.5 bg-[var(--bg-subtle)] border border-emerald-500/35 rounded-lg flex items-center gap-2.5 text-[11px]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        Установлена актуальная версия (v{updateInfo.current_version})
                      </div>
                      {updateInfo.latest_version && (
                        <div className="text-[var(--text-muted)] font-mono mt-0.5">
                          Последний релиз на GitHub: v{updateInfo.latest_version}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {updateInfo && updateInfo.has_update && (
                  <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--accent)]/50 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          Доступна версия v{updateInfo.latest_version}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {updateInfo.release_name}
                        </div>
                      </div>
                      {updateInfo.asset_size && (
                        <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-muted)] px-2 py-0.5 rounded">
                          {(updateInfo.asset_size / (1024 * 1024)).toFixed(2)} МБ
                        </span>
                      )}
                    </div>

                    {updateInfo.release_notes && (
                      <div className="p-2.5 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded text-[11px] text-[var(--text-secondary)] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {updateInfo.release_notes}
                      </div>
                    )}

                    {updateDownloading && updateProgress && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                          <span>
                            {updateProgress.stage === "launching"
                              ? "Запуск установщика..."
                              : updateProgress.stage === "verifying"
                              ? "Проверка файла..."
                              : "Скачивание обновления..."}
                          </span>
                          <span className="text-[var(--text-primary)] font-semibold">
                            {Math.round(updateProgress.percent)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-muted)] rounded overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)] transition-all duration-150"
                            style={{ width: `${Math.min(100, updateProgress.percent)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {updateInfo.download_url ? (
                        <button
                          type="button"
                          onClick={onInstallUpdate}
                          disabled={updateDownloading}
                          className="flex-1 h-9 flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {updateDownloading
                              ? "Загрузка..."
                              : `Установить v${updateInfo.latest_version}`}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenReleasePage(updateInfo.release_url)}
                          className="flex-1 h-9 flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded text-xs transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Скачать со страницы релиза</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenReleasePage(updateInfo.release_url)}
                        className="h-9 px-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] transition-colors cursor-pointer"
                        title="Открыть страницу релиза на GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
