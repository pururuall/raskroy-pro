import React, { useState, useEffect } from "react";
import {
  AppSettings,
  CutConfig,
  AnglePreset,
  UpdateCheckResult,
  UpdateProgressEvent,
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
} from "lucide-react";

export type SettingsTabType = "refresh" | "angles" | "cutting" | "branding" | "update";

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
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Left Slide-out Drawer Panel */}
      <div className="absolute inset-y-0 left-0 max-w-full flex pr-8">
        <div className="w-screen max-w-lg bg-[#17171a] border-r border-white/[0.08] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#121214]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#202024] border border-white/[0.1] flex items-center justify-center text-[#dd4b19]">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#ededed]">Панель настроек</h2>
                <p className="text-[11px] text-[#9ea3ae]">Конфигурация алгоритма и производства</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#9ea3ae] hover:text-[#ededed] rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-5 border-b border-white/[0.06] bg-[#141416] px-2 pt-2 gap-1">
            <button
              onClick={() => setActiveTab("refresh")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "refresh"
                  ? "bg-[#17171a] text-[#ededed] border-t-2 border-[#dd4b19]"
                  : "text-[#9ea3ae] hover:text-[#ededed]"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Таймер</span>
            </button>

            <button
              onClick={() => setActiveTab("angles")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "angles"
                  ? "bg-[#17171a] text-[#ededed] border-t-2 border-[#dd4b19]"
                  : "text-[#9ea3ae] hover:text-[#ededed]"
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Углы</span>
            </button>

            <button
              onClick={() => setActiveTab("cutting")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "cutting"
                  ? "bg-[#17171a] text-[#ededed] border-t-2 border-[#dd4b19]"
                  : "text-[#9ea3ae] hover:text-[#ededed]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Станок</span>
            </button>

            <button
              onClick={() => setActiveTab("branding")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer ${
                activeTab === "branding"
                  ? "bg-[#17171a] text-[#ededed] border-t-2 border-[#dd4b19]"
                  : "text-[#9ea3ae] hover:text-[#ededed]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Бренд</span>
            </button>

            <button
              onClick={() => setActiveTab("update")}
              className={`flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] rounded-t font-medium transition-colors cursor-pointer relative ${
                activeTab === "update"
                  ? "bg-[#17171a] text-[#ededed] border-t-2 border-[#dd4b19]"
                  : "text-[#9ea3ae] hover:text-[#ededed]"
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
                  <h4 className="font-medium text-[#ededed] mb-1">Режим расчета и обновления</h4>
                  <p className="text-[11px] text-[#9ea3ae] mb-3">
                    Выберите, когда выполнять перерасчет оптимального плана раскроя
                  </p>

                  <div className="space-y-2">
                    {/* Mode: Instant */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        settings.calcMode === "instant"
                          ? "bg-[#202024] border-[#dd4b19]/60 text-[#ededed]"
                          : "bg-[#121214] border-white/[0.06] text-[#9ea3ae] hover:border-white/[0.12]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="calcMode"
                        checked={settings.calcMode === "instant"}
                        onChange={() => updateSetting("calcMode", "instant")}
                        className="mt-0.5 text-[#dd4b19] focus:ring-0"
                      />
                      <div>
                        <div className="font-medium text-[#ededed] flex items-center gap-1.5">
                          <span>Мгновенно (Live)</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Рекомендуется
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">
                          Автоматический перерасчет сразу при изменении любых чисел в таблицах
                        </p>
                      </div>
                    </label>

                    {/* Mode: Timer */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        settings.calcMode === "timer"
                          ? "bg-[#202024] border-[#dd4b19]/60 text-[#ededed]"
                          : "bg-[#121214] border-white/[0.06] text-[#9ea3ae] hover:border-white/[0.12]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="calcMode"
                        checked={settings.calcMode === "timer"}
                        onChange={() => updateSetting("calcMode", "timer")}
                        className="mt-0.5 text-[#dd4b19] focus:ring-0"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-[#ededed] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#dd4b19]" />
                          <span>По таймеру ({settings.timerSeconds} сек)</span>
                        </div>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">
                          Фоновое периодическое автообновление раскроя без лишней нагрузки
                        </p>

                        {settings.calcMode === "timer" && (
                          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center gap-3">
                            <span className="text-[11px] text-[#9ea3ae]">Интервал:</span>
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
                            <span className="font-mono text-[#ededed] font-medium w-12 text-right">
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
                          ? "bg-[#202024] border-[#dd4b19]/60 text-[#ededed]"
                          : "bg-[#121214] border-white/[0.06] text-[#9ea3ae] hover:border-white/[0.12]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="calcMode"
                        checked={settings.calcMode === "manual"}
                        onChange={() => updateSetting("calcMode", "manual")}
                        className="mt-0.5 text-[#dd4b19] focus:ring-0"
                      />
                      <div>
                        <div className="font-medium text-[#ededed]">Только вручную</div>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">
                          Расчет запускается только по клику на кнопку «Обновить» или Ctrl+Enter
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-[#ededed]">
                    <input
                      type="checkbox"
                      checked={settings.autoRecalcOnFocus}
                      onChange={(e) => updateSetting("autoRecalcOnFocus", e.target.checked)}
                      className="rounded bg-[#121214] border-white/20 text-[#dd4b19] focus:ring-0"
                    />
                    <span className="text-[11px]">
                      Обновлять раскрой при переключении обратно в окно программы
                    </span>
                  </label>
                </div>

                {/* Diagnostics block */}
                <div className="p-3.5 bg-[#121214] border border-white/[0.06] rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#9ea3ae]">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Вычислительное ядро:</span>
                    </div>
                    <span className="font-mono text-[#ededed]">Rust Core (DP Knapsack)</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#9ea3ae]">Время выполнения расчета:</span>
                    <span className="font-mono text-[#ededed]">
                      {calcTimeMs !== null ? `${calcTimeMs} мс` : "Ожидание"}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={onManualRefresh}
                      disabled={isCalculating}
                      className="w-full flex items-center justify-center gap-2 py-1.5 bg-[#222226] hover:bg-[#2c2c32] text-[#ededed] rounded border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-[#dd4b19] ${
                          isCalculating ? "animate-spin" : ""
                        }`}
                      />
                      <span>{isCalculating ? "Расчет выполняется..." : "Принудительно обновить"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ANGLE TEMPLATES */}
            {activeTab === "angles" && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-medium text-[#ededed] mb-1">Шаблоны углов торцевания</h4>
                  <p className="text-[11px] text-[#9ea3ae] mb-3">
                    Углы не всегда равны 45°, 90° или 135°. Создайте собственные шаблоны для фасадов, эркеров и зенитных фонарей.
                  </p>

                  {/* Add Template Form */}
                  <form
                    onSubmit={handleAddPreset}
                    className="p-3 bg-[#121214] border border-white/[0.08] rounded-lg space-y-3 mb-4"
                  >
                    <div className="font-medium text-[#ededed] text-[11px] flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-[#dd4b19]" />
                      <span>Добавить новый шаблон угла</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#9ea3ae] block mb-1">Название шаблона</label>
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="Например: Фасадный скос 33.5° / 90°"
                        className="w-full bg-[#17171a] border border-white/[0.08] rounded px-2.5 py-1.5 text-[#ededed] text-xs focus:outline-none focus:border-[#dd4b19]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div>
                        <label className="text-[10px] text-[#9ea3ae] block mb-1">Левый угол L (°)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newPresetLeft}
                          onChange={(e) => setNewPresetLeft(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#17171a] border border-white/[0.08] rounded px-2.5 py-1.5 text-[#ededed] text-xs focus:outline-none focus:border-[#dd4b19]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#9ea3ae] block mb-1">Правый угол R (°)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={newPresetRight}
                          onChange={(e) => setNewPresetRight(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#17171a] border border-white/[0.08] rounded px-2.5 py-1.5 text-[#ededed] text-xs focus:outline-none focus:border-[#dd4b19]"
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
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {settings.anglePresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between p-2.5 bg-[#121214] border border-white/[0.06] rounded-lg hover:border-white/[0.12] transition-colors"
                      >
                        <div>
                          <div className="font-medium text-[#ededed]">{preset.name}</div>
                          <div className="text-[10px] text-[#6b7280] font-mono">
                            L = {preset.left}° &bull; R = {preset.right}°
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="p-1 text-[#6b7280] hover:text-rose-400 rounded transition-colors cursor-pointer"
                          title="Удалить шаблон"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/[0.06] flex justify-end">
                    <button
                      onClick={handleResetPresets}
                      className="flex items-center gap-1.5 text-[11px] text-[#9ea3ae] hover:text-[#ededed] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Сбросить к заводским</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CUTTING TECH & MACHINE */}
            {activeTab === "cutting" && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[#ededed] mb-1">Параметры станка и пропила</h4>
                  <p className="text-[11px] text-[#9ea3ae] mb-3">
                    Точность раскроя с учетом ширины пильного диска и технологических кромок
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-[#9ea3ae] block mb-1">
                    Ширина пропила пильного диска (dRez), мм
                  </label>
                  <input
                    type="number"
                    value={config.cut_width}
                    onChange={(e) =>
                      updateConfig("cut_width", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                  <p className="text-[10px] text-[#6b7280] mt-1">
                    Для дисковых пил по алюминию обычно 4.0 – 5.0 мм (в Excel-макросе было 10 мм)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#9ea3ae] block mb-1">Торцовка слева, мм</label>
                    <input
                      type="number"
                      value={config.trim_left}
                      onChange={(e) =>
                        updateConfig("trim_left", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9ea3ae] block mb-1">Торцовка справа, мм</label>
                    <input
                      type="number"
                      value={config.trim_right}
                      onChange={(e) =>
                        updateConfig("trim_right", Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#9ea3ae] block mb-1">
                    Порог делового остатка (delOst), мм
                  </label>
                  <input
                    type="number"
                    value={config.min_remnant}
                    onChange={(e) =>
                      updateConfig("min_remnant", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                  <p className="text-[10px] text-[#6b7280] mt-1">
                    Отрезки длиннее этого значения маркируются как пригодные для возврата на склад
                  </p>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-white/[0.08] bg-[#121214] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.two_profiles}
                      onChange={(e) => updateConfig("two_profiles", e.target.checked)}
                      className="mt-0.5 rounded bg-[#17171a] border-white/20 text-[#dd4b19] focus:ring-0"
                    />
                    <div>
                      <div className="font-medium text-[#ededed]">Рез в 2 профиля (пакетный распил)</div>
                      <p className="text-[10px] text-[#6b7280] mt-0.5">
                        Удваивает производительность пилы: одновременно пилятся два сложенных профиля
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="text-[11px] text-[#9ea3ae] block mb-1">Название станка / линии</label>
                  <input
                    type="text"
                    value={settings.machineName}
                    onChange={(e) => updateSetting("machineName", e.target.value)}
                    placeholder="Например: Двухголовочная пила Yilmaz DC 421"
                    className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: BRANDING & ENTERPRISE */}
            {activeTab === "branding" && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[#ededed] mb-1">Фирменный стиль и реквизиты</h4>
                  <p className="text-[11px] text-[#9ea3ae] mb-3">
                    Стилизация приложения и оформление нарядов на раскрой для цеха
                  </p>
                </div>

                {/* Mobil66 Preset Card */}
                <div className="p-3.5 bg-[#121214] border border-[#dd4b19]/40 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MobilLogo height={16} accentColor="#dd4b19" />
                      <span className="text-[10px] text-amber-500 font-mono">mobil66.ru</span>
                    </div>
                    <span className="text-[10px] bg-[#dd4b19]/20 text-[#ea580c] px-2 py-0.5 rounded font-medium">
                      Активен
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9ea3ae]">
                    АО «Мобиль» (г. Екатеринбург) — светопрозрачные фасады, витражные и оконные системы.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-[#9ea3ae] block mb-1">Название предприятия</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => updateSetting("companyName", e.target.value)}
                    className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#9ea3ae] block mb-1">Сайт</label>
                    <input
                      type="text"
                      value={settings.companyWebsite}
                      onChange={(e) => updateSetting("companyWebsite", e.target.value)}
                      className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#dd4b19]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9ea3ae] block mb-1">Телефон цеха</label>
                    <input
                      type="text"
                      value={settings.companyPhone}
                      onChange={(e) => updateSetting("companyPhone", e.target.value)}
                      className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#dd4b19]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#9ea3ae] block mb-1">Технолог / Мастер смены по умолчанию</label>
                  <input
                    type="text"
                    value={settings.operatorName}
                    onChange={(e) => updateSetting("operatorName", e.target.value)}
                    placeholder="Например: Иванов А. С."
                    className="w-full bg-[#121214] border border-white/[0.08] rounded px-3 py-1.5 text-[#ededed] text-xs focus:outline-none focus:border-[#dd4b19]"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: APP UPDATES VIA GITHUB RELEASES */}
            {activeTab === "update" && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[#ededed] mb-1">Обновление программы</h4>
                  <p className="text-[11px] text-[#9ea3ae]">
                    Автоматическая проверка и загрузка новых версий из релизов GitHub
                  </p>
                </div>

                {/* Current Version Info */}
                <div className="p-3.5 bg-[#121214] border border-white/[0.08] rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#9ea3ae]">Установленная версия:</span>
                    <span className="font-mono text-[#ededed] font-medium">v{appVersion}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#9ea3ae]">Источник релизов:</span>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenReleasePage("https://github.com/pururuall/raskroy-pro/releases")
                      }
                      className="font-mono text-[#ededed] hover:text-[#dd4b19] flex items-center gap-1 cursor-pointer"
                    >
                      <span>pururuall/raskroy-pro</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-[#ededed]">
                  <input
                    type="checkbox"
                    checked={settings.autoCheckUpdates}
                    onChange={(e) => updateSetting("autoCheckUpdates", e.target.checked)}
                    className="rounded bg-[#121214] border-white/20 text-[#dd4b19] focus:ring-0"
                  />
                  <span className="text-[11px]">
                    Проверять обновления автоматически при запуске программы
                  </span>
                </label>

                <button
                  type="button"
                  onClick={onCheckUpdates}
                  disabled={updateChecking || updateDownloading}
                  className="w-full h-9 flex items-center justify-center gap-2 bg-[#202024] hover:bg-[#28282e] text-[#ededed] rounded border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#dd4b19] ${updateChecking ? "animate-spin" : ""}`}
                  />
                  <span>{updateChecking ? "Проверка GitHub..." : "Проверить обновления"}</span>
                </button>

                {updateError && (
                  <div className="p-3 bg-[#1e1517] border border-rose-500/20 rounded-lg text-rose-300 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{updateError}</span>
                  </div>
                )}

                {updateInfo && !updateInfo.has_update && !updateError && (
                  <div className="p-3.5 bg-[#121214] border border-emerald-500/25 rounded-lg flex items-center gap-2.5 text-[11px]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-medium text-[#ededed]">
                        Установлена актуальная версия (v{updateInfo.current_version})
                      </div>
                      {updateInfo.latest_version && (
                        <div className="text-[#6b7280] font-mono mt-0.5">
                          Последний релиз на GitHub: v{updateInfo.latest_version}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {updateInfo && updateInfo.has_update && (
                  <div className="p-4 bg-[#121214] border border-[#dd4b19]/50 rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-[#ededed]">
                          Доступна версия v{updateInfo.latest_version}
                        </div>
                        <div className="text-[11px] text-[#9ea3ae] mt-0.5">
                          {updateInfo.release_name}
                        </div>
                      </div>
                      {updateInfo.asset_size && (
                        <span className="text-[10px] font-mono text-[#9ea3ae] bg-[#202024] px-2 py-0.5 rounded">
                          {(updateInfo.asset_size / (1024 * 1024)).toFixed(2)} МБ
                        </span>
                      )}
                    </div>

                    {updateInfo.release_notes && (
                      <div className="p-2.5 bg-[#17171a] border border-white/[0.06] rounded text-[11px] text-[#9ea3ae] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {updateInfo.release_notes}
                      </div>
                    )}

                    {updateDownloading && updateProgress && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono text-[#9ea3ae]">
                          <span>
                            {updateProgress.stage === "launching"
                              ? "Запуск установщика..."
                              : updateProgress.stage === "verifying"
                              ? "Проверка файла..."
                              : "Скачивание обновления..."}
                          </span>
                          <span className="text-[#ededed]">
                            {Math.round(updateProgress.percent)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#202024] rounded overflow-hidden">
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
                        className="h-9 px-3 bg-[#202024] hover:bg-[#28282e] text-[#ededed] rounded border border-white/[0.08] transition-colors cursor-pointer"
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
          <div className="p-4 border-t border-white/[0.08] bg-[#121214] flex items-center justify-between">
            <span className="text-[10px] text-[#6b7280] font-mono">Настройки сохраняются автоматически</span>
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
