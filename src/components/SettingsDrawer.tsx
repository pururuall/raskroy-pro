import React, { useState, useEffect } from "react";
import {
  AppSettings,
  CutConfig,
  AnglePreset,
  UpdateCheckResult,
  UpdateProgressEvent,
  DEFAULT_REPORT_CONFIG,
  ReportDisplaySettings,
  CUTTING_ALGORITHMS,
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
  Sun,
  Moon,
  FileText,
  Eye,
} from "lucide-react";

export type SettingsTabType = "refresh" | "angles" | "cutting" | "report" | "branding" | "update";

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
  initialTab = "refresh",
  settings,
  onSettingsChange,
  config,
  onConfigChange,
  calcTimeMs,
  onManualRefresh,
  onOpenReportPreview,
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
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden no-print">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
      />

      {/* Left Slide-out Drawer Panel */}
      <div className="absolute inset-y-0 left-0 max-w-full flex pr-8">
        <div className="w-screen max-w-xl bg-[var(--bg-surface)] border-r border-[var(--border-main)] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[var(--bg-surface)] border border-[var(--border-main)] flex items-center justify-center text-[#dd4b19]">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Панель настроек</h2>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Конфигурация интерфейса, алгоритма и производства
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-6 border-b border-[var(--border-main)] bg-[var(--bg-subtle)] px-2 pt-2 gap-1">
            <button
              onClick={() => setActiveTab("refresh")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "refresh"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border-t-2 border-[#dd4b19]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Таймер</span>
            </button>

            <button
              onClick={() => setActiveTab("angles")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "angles"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border-t-2 border-[#dd4b19]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Углы</span>
            </button>

            <button
              onClick={() => setActiveTab("cutting")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "cutting"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border-t-2 border-[#dd4b19]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Алгоритм</span>
            </button>

            <button
              onClick={() => setActiveTab("report")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "report"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border-t-2 border-[#dd4b19]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Отчёт</span>
            </button>

            <button
              onClick={() => setActiveTab("branding")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "branding"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border-t-2 border-[#dd4b19]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Вид</span>
            </button>

            <button
              onClick={() => setActiveTab("update")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer relative ${
                activeTab === "update"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border-t-2 border-[#dd4b19]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Версия</span>
              {updateInfo?.has_update && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#dd4b19] shrink-0" />
              )}
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* TAB 1: REFRESH & CALCULATION */}
            {activeTab === "refresh" && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                    Режим расчета и обновления
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                    Выберите, когда выполнять перерасчет оптимального плана раскроя
                  </p>

                  <div className="space-y-2">
                    {/* Mode: Instant */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        settings.calcMode === "instant"
                          ? "bg-[var(--bg-hover)] border-[#dd4b19] text-[var(--text-primary)]"
                          : "bg-[var(--bg-subtle)] border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[#dd4b19]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="calcMode"
                        checked={settings.calcMode === "instant"}
                        onChange={() => updateSetting("calcMode", "instant")}
                        className="mt-0.5 accent-[#dd4b19]"
                      />
                      <div>
                        <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>Мгновенно (Live)</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Рекомендуется
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Автоматический перерасчет сразу при изменении любых чисел в таблицах
                        </p>
                      </div>
                    </label>

                    {/* Mode: Timer */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        settings.calcMode === "timer"
                          ? "bg-[var(--bg-hover)] border-[#dd4b19] text-[var(--text-primary)]"
                          : "bg-[var(--bg-subtle)] border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[#dd4b19]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="calcMode"
                        checked={settings.calcMode === "timer"}
                        onChange={() => updateSetting("calcMode", "timer")}
                        className="mt-0.5 accent-[#dd4b19]"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#dd4b19]" />
                          <span>По таймеру ({settings.timerSeconds} сек)</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Фоновое периодическое автообновление раскроя без лишней нагрузки
                        </p>

                        {settings.calcMode === "timer" && (
                          <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center gap-3">
                            <span className="text-[11px] text-[var(--text-secondary)]">
                              Интервал:
                            </span>
                            <input
                              type="range"
                              min="3"
                              max="60"
                              step="1"
                              value={settings.timerSeconds}
                              onChange={(e) =>
                                updateSetting("timerSeconds", parseInt(e.target.value) || 10)
                              }
                              className="flex-1 accent-[#dd4b19]"
                            />
                            <span className="font-mono text-[var(--text-primary)] font-medium w-12 text-right">
                              {settings.timerSeconds} с
                            </span>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Mode: Manual */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        settings.calcMode === "manual"
                          ? "bg-[var(--bg-hover)] border-[#dd4b19] text-[var(--text-primary)]"
                          : "bg-[var(--bg-subtle)] border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[#dd4b19]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="calcMode"
                        checked={settings.calcMode === "manual"}
                        onChange={() => updateSetting("calcMode", "manual")}
                        className="mt-0.5 accent-[#dd4b19]"
                      />
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">Только вручную</div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Расчет запускается только по клику на кнопку «Обновить» или Ctrl+Enter
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={settings.autoRecalcOnFocus}
                      onChange={(e) => updateSetting("autoRecalcOnFocus", e.target.checked)}
                      className="rounded accent-[#dd4b19]"
                    />
                    <span className="text-[11px]">
                      Обновлять раскрой при переключении обратно в окно программы
                    </span>
                  </label>
                </div>

                {/* Diagnostics block */}
                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px] gap-2">
                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Алгоритм раскроя:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("cutting")}
                      className="font-mono text-[var(--text-primary)] hover:text-[#dd4b19] underline decoration-dotted cursor-pointer truncate"
                      title="Перейти к выбору алгоритма расчёта"
                    >
                      {activeAlgorithmMeta.name}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">Время выполнения расчета:</span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {calcTimeMs !== null ? `${calcTimeMs} мс` : "Ожидание"}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={onManualRefresh}
                      disabled={isCalculating}
                      className="w-full flex items-center justify-center gap-2 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-[#dd4b19] ${
                          isCalculating ? "animate-spin" : ""
                        }`}
                      />
                      <span>
                        {isCalculating ? "Расчет выполняется..." : "Принудительно обновить"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ANGLE TEMPLATES */}
            {activeTab === "angles" && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                    Шаблоны углов торцевания
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                    Создайте собственные шаблоны произвольных углов для фасадов, эркеров и зенитных фонарей.
                  </p>

                  {/* Add Template Form */}
                  <form
                    onSubmit={handleAddPreset}
                    className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg space-y-3 mb-4"
                  >
                    <div className="font-medium text-[var(--text-primary)] text-[11px] flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-[#dd4b19]" />
                      <span>Добавить новый шаблон угла</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[var(--text-secondary)] block mb-1">
                        Название шаблона
                      </label>
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="Например: Фасадный скос 33.5° / 90°"
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div>
                        <label className="text-[10px] text-[var(--text-secondary)] block mb-1">
                          Левый угол L (°)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={newPresetLeft}
                          onChange={(e) => setNewPresetLeft(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--text-secondary)] block mb-1">
                          Правый угол R (°)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={newPresetRight}
                          onChange={(e) => setNewPresetRight(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!newPresetName.trim()}
                      className="w-full py-1.5 bg-[#dd4b19] hover:bg-[#c53f12] text-white font-medium rounded transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      Сохранить шаблон
                    </button>
                  </form>

                  {/* List of presets */}
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                    {settings.anglePresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between p-2.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg hover:border-[#dd4b19]/40 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{preset.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            L = {preset.left}° &bull; R = {preset.right}°
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-500 rounded transition-colors cursor-pointer"
                          title="Удалить шаблон"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex justify-end">
                    <button
                      onClick={handleResetPresets}
                      className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Сбросить к заводским</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CUTTING TECH, ALGORITHM & MACHINE */}
            {activeTab === "cutting" && (
              <div className="space-y-5">
                {/* Algorithm Selector + Explanations */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-[#dd4b19]" />
                    <h4 className="font-semibold text-[var(--text-primary)]">
                      Алгоритм расчёта линейного раскроя
                    </h4>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                    Выберите стратегию оптимизации карт распила. При смене режима план пересчитывается сразу.
                  </p>

                  <div className="space-y-2">
                    {CUTTING_ALGORITHMS.map((algo) => {
                      const isSelected = activeAlgorithm === algo.id;
                      return (
                        <label
                          key={algo.id}
                          className={`block p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[var(--bg-hover)] border-[#dd4b19]"
                              : "bg-[var(--bg-subtle)] border-[var(--border-main)] hover:border-[#dd4b19]/40"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="cuttingAlgorithm"
                              checked={isSelected}
                              onChange={() => updateConfig("algorithm", algo.id)}
                              className="mt-1 accent-[#dd4b19]"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {algo.name}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                    isSelected
                                      ? "bg-[#dd4b19] text-white"
                                      : "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                                  }`}
                                >
                                  {algo.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                                {algo.summary}
                              </p>
                              <div className="pt-1 text-[10.5px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)] space-y-0.5">
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

                <div className="border-t border-[var(--border-main)] pt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                      Параметры станка и пропила
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Точность раскроя с учетом ширины пильного диска и технологических кромок
                    </p>
                  </div>

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
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Для дисковых пил по алюминию обычно 4.0 – 5.0 мм
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
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
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                    />
                  </div>
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
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Отрезки длиннее этого значения маркируются как пригодные для возврата на склад
                  </p>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-subtle)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.two_profiles}
                      onChange={(e) => updateConfig("two_profiles", e.target.checked)}
                      className="mt-0.5 rounded accent-[#dd4b19]"
                    />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        Рез в 2 профиля (пакетный распил)
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Удваивает производительность пилы: одновременно пилятся два сложенных профиля
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                    Название станка / линии
                  </label>
                  <input
                    type="text"
                    value={settings.machineName}
                    onChange={(e) => updateSetting("machineName", e.target.value)}
                    placeholder="Например: Двухголовочная пила"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                </div>
                </div>
              </div>
            )}

            {/* TAB 4: REPORT DISPLAY EDITOR */}
            {activeTab === "report" && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">
                      Редактор отображения отчётов (А4)
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Выберите нужные блоки, плотность карт раскроя и подписи для печати / PDF
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetReportCfg}
                    className="shrink-0 flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded border border-[var(--border-main)] bg-[var(--bg-subtle)] cursor-pointer"
                    title="Восстановить вид отчёта по умолчанию"
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
                          Материал: Профиль • Станок: {settings.machineName}
                        </div>
                      )}
                    </div>
                    {reportCfg.showOrderParams && (
                      <div className="text-[9px] font-mono text-right text-neutral-700 shrink-0">
                        <div>Дата • Пропил: {config.cut_width} мм</div>
                      </div>
                    )}
                  </div>

                  {reportCfg.showSummaryTable && (
                    <div className="grid grid-cols-4 border border-black text-center font-mono text-[9px]">
                      <div className="py-1 border-r border-black bg-neutral-100">Деталей: 71</div>
                      <div className="py-1 border-r border-black">Хлыстов: 34</div>
                      <div className="py-1 border-r border-black font-bold">КИМ: 87%</div>
                      <div className="py-1">Остаток</div>
                    </div>
                  )}

                  <div className={`border border-black bg-white ${reportCfg.compactCards ? "p-1.5" : "p-2"}`}>
                    <div className="flex justify-between font-mono text-[9px] mb-1">
                      <strong>КАРТА #1 • L=6100 мм</strong>
                      <span className="text-neutral-600">Отход: 60 мм</span>
                    </div>
                    {reportCfg.showCutDiagrams && (
                      <svg
                        viewBox="0 0 360 22"
                        className="w-full h-auto border border-black bg-white mb-1 block"
                      >
                        <polygon points="1,1 140,1 132,21 9,21" fill="#fff" stroke="#000" strokeWidth="1" />
                        {reportCfg.showAnglesOnDiagram && (
                          <text x="12" y="14" fontSize="7" fontFamily="monospace" fill="#444">45°</text>
                        )}
                        <text x="70" y="14" fontSize="8" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#000">
                          {reportCfg.showPartLabelsOnDiagram ? "Рама Ф-1 · 2260" : "2260"}
                        </text>
                        <polygon points="145,1 285,1 285,21 145,21" fill="#fff" stroke="#000" strokeWidth="1" />
                        <text x="215" y="14" fontSize="8" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#000">
                          {reportCfg.showPartLabelsOnDiagram ? "Стойка · 2700" : "2700"}
                        </text>
                        <rect x="290" y="1" width="69" height="20" fill="#e5e5e5" stroke="#000" strokeWidth="1" />
                      </svg>
                    )}
                    {reportCfg.showCutSequence && (
                      <div className="font-mono text-[8.5px] text-neutral-700">
                        Распил: 1) [Рама Ф-1] 2260 мм → 2) [Стойка] 2700 мм → Ост: 60 мм
                      </div>
                    )}
                  </div>

                  {reportCfg.showNotes && (
                    <div className="p-1.5 border border-neutral-400 bg-neutral-50 text-[9px] text-neutral-700">
                      Примечание: {reportCfg.notesText || "(будет показан ваш комментарий для цеха)"}
                    </div>
                  )}

                  {reportCfg.showSignatures && (
                    <div className="pt-1 border-t border-black flex justify-between font-mono text-[9px] text-neutral-700">
                      <span>{reportCfg.leftSignatureTitle}: {settings.operatorName || "____"}</span>
                      <span>{reportCfg.rightSignatureTitle}: ____</span>
                    </div>
                  )}
                </div>

                {/* Section Visibility Checkboxes */}
                <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg space-y-2">
                  <div className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                    Отображаемые разделы и элементы
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
                        className="rounded accent-[#dd4b19]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {/* Diagram Bar Height Selector */}
                <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg space-y-2">
                  <div className="text-[11px] font-semibold text-[var(--text-primary)]">
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
                            ? "border-[#dd4b19] bg-[var(--bg-hover)] text-[var(--text-primary)]"
                            : "border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titles, Notes & Signatures */}
                <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg space-y-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                      Заголовок документа по умолчанию (если поле названия пустое)
                    </label>
                    <input
                      type="text"
                      value={reportCfg.defaultTitle}
                      onChange={(e) => updateReportCfg("defaultTitle", e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer text-[11.5px] text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={reportCfg.showNotes}
                        onChange={(e) => updateReportCfg("showNotes", e.target.checked)}
                        className="rounded accent-[#dd4b19]"
                      />
                      <span>Выводить блок примечаний / инструкций в отчёте</span>
                    </label>

                    {reportCfg.showNotes && (
                      <textarea
                        rows={2}
                        value={reportCfg.notesText}
                        onChange={(e) => updateReportCfg("notesText", e.target.value)}
                        placeholder="Например: Проверить направление паза профиля при торцовке 45°..."
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                      />
                    )}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
                    <label className="flex items-center gap-2.5 cursor-pointer text-[11.5px] text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={reportCfg.showSignatures}
                        onChange={(e) => updateReportCfg("showSignatures", e.target.checked)}
                        className="rounded accent-[#dd4b19]"
                      />
                      <span>Показывать блок подписей в нижней части листа</span>
                    </label>

                    {reportCfg.showSignatures && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                            Левая подпись
                          </label>
                          <input
                            type="text"
                            value={reportCfg.leftSignatureTitle}
                            onChange={(e) =>
                              updateReportCfg("leftSignatureTitle", e.target.value)
                            }
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                            Правая подпись
                          </label>
                          <input
                            type="text"
                            value={reportCfg.rightSignatureTitle}
                            onChange={(e) =>
                              updateReportCfg("rightSignatureTitle", e.target.value)
                            }
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-input)] rounded px-2.5 py-1 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: APPEARANCE & BRANDING */}
            {activeTab === "branding" && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                    Тема оформления и реквизиты
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                    Настройка внешнего вида программы, толщины полос и реквизитов для наряда А4
                  </p>
                </div>

                {/* Theme selector */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateSetting("theme", "light")}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      settings.theme === "light"
                        ? "border-[#dd4b19] bg-[var(--bg-hover)]"
                        : "border-[var(--border-main)] bg-[var(--bg-subtle)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                      <Sun className="w-4 h-4 text-[#dd4b19]" />
                      <span>Светлая тема</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Высокая читаемость днём и в цеху
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateSetting("theme", "dark")}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      settings.theme === "dark"
                        ? "border-[#dd4b19] bg-[var(--bg-hover)]"
                        : "border-[var(--border-main)] bg-[var(--bg-subtle)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                      <Moon className="w-4 h-4 text-sky-400" />
                      <span>Графитовая тема</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Мягкий тёмный фон без бликов
                    </p>
                  </button>
                </div>

                {/* Mobil66 Preset Card */}
                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[#dd4b19]/40 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MobilLogo
                        height={16}
                        accentColor="#dd4b19"
                        color="var(--text-primary)"
                      />
                      <span className="text-[10px] text-[#dd4b19] font-mono">mobil66.ru</span>
                    </div>
                    <span className="text-[10px] bg-[#dd4b19]/15 text-[#dd4b19] px-2 py-0.5 rounded font-medium">
                      Активен
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    АО «Мобиль» (г. Екатеринбург) — светопрозрачные фасады, витражные и оконные системы.
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
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-secondary)] block mb-1">Сайт</label>
                    <input
                      type="text"
                      value={settings.companyWebsite}
                      onChange={(e) => updateSetting("companyWebsite", e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[#dd4b19]"
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
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[#dd4b19]"
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
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-3 py-1.5 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: APP UPDATES VIA GITHUB RELEASES */}
            {activeTab === "update" && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">
                    Обновление программы
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Автоматическая проверка и загрузка новых версий из релизов GitHub
                  </p>
                </div>

                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg space-y-2">
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
                      className="font-mono text-[var(--text-primary)] hover:text-[#dd4b19] flex items-center gap-1 cursor-pointer"
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
                    className="rounded accent-[#dd4b19]"
                  />
                  <span className="text-[11px]">
                    Проверять обновления автоматически при запуске программы
                  </span>
                </label>

                <button
                  type="button"
                  onClick={onCheckUpdates}
                  disabled={updateChecking || updateDownloading}
                  className="w-full h-9 flex items-center justify-center gap-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#dd4b19] ${updateChecking ? "animate-spin" : ""}`}
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
                  <div className="p-4 bg-[var(--bg-subtle)] border border-[#dd4b19]/50 rounded-lg space-y-3">
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
                            className="h-full bg-[#dd4b19] transition-all duration-150"
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
                          className="flex-1 h-9 flex items-center justify-center gap-2 bg-[#dd4b19] hover:bg-[#c53f12] text-white font-medium rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
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
                          className="flex-1 h-9 flex items-center justify-center gap-2 bg-[#dd4b19] hover:bg-[#c53f12] text-white font-medium rounded text-xs transition-colors cursor-pointer"
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

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              Настройки сохраняются автоматически
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#dd4b19] hover:bg-[#c53f12] text-white font-medium rounded text-xs transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
