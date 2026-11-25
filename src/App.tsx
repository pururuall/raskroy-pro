import { useState, useEffect, useCallback, useRef } from "react";
import {
  Stock,
  Part,
  CutConfig,
  CuttingPlan,
  DocumentMeta,
  AppSettings,
  AppTheme,
  CuttingAlgorithm,
  DEFAULT_REPORT_CONFIG,
  UpdateCheckResult,
  UpdateProgressEvent,
} from "./types";
import { StockTable } from "./components/StockTable";
import { PartsTable, DEFAULT_ANGLE_PRESETS } from "./components/PartsTable";
import { ConfigPanel } from "./components/ConfigPanel";
import { SummaryStats } from "./components/SummaryStats";
import { CuttingVisualizer } from "./components/CuttingVisualizer";
import { ReportModal } from "./components/ReportModal";
import { PrintReport } from "./components/PrintReport";
import { SettingsDrawer, SettingsTabType } from "./components/SettingsDrawer";
import { LeftSidebar } from "./components/LeftSidebar";
import { ImportExcelModal } from "./components/ImportExcelModal";
import { MobilLogo } from "./components/MobilLogo";
import { ResizeHandle } from "./components/ResizeHandle";
import { TitleBar } from "./components/TitleBar";
import { downloadSampleExcel } from "./utils/excelImport";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AlertCircle,
  FileText,
  Sliders,
  RefreshCw,
  PanelLeft,
  Sun,
  Moon,
} from "lucide-react";

// Benchmark dataset from "таблица раскроя.xlsm"
const EXCEL_EXAMPLE_STOCKS: Stock[] = [{ length: 6100, quantity: undefined }];

const EXCEL_EXAMPLE_PARTS: Part[] = [
  { label: "Стойка С-1", length: 2700, quantity: 37, angle_left: 90, angle_right: 90, angle_extra_left: 90, angle_extra_right: 90 },
  { label: "Ригель Р-1", length: 2400, quantity: 12, angle_left: 90, angle_right: 90, angle_extra_left: 90, angle_extra_right: 90 },
  { label: "Створка В-1", length: 2067, quantity: 1, angle_left: 45, angle_right: 90, angle_extra_left: 90, angle_extra_right: 90 },
  { label: "Рама Ф-1", length: 2260, quantity: 2, angle_left: 45, angle_right: 45, angle_extra_left: 90, angle_extra_right: 90 },
  { label: "Зенит З-1", length: 1875, quantity: 4, angle_left: 60, angle_right: 60, angle_extra_left: 75, angle_extra_right: 75 },
  { label: "Примыкание", length: 1625, quantity: 2, angle_left: 90, angle_right: 45, angle_extra_left: 90, angle_extra_right: 90 },
  { label: "Стойка С-2", length: 2595, quantity: 4, angle_left: 90, angle_right: 90, angle_extra_left: 90, angle_extra_right: 90 },
  { label: "Ригель Р-2", length: 2500, quantity: 4, angle_left: 90, angle_right: 90, angle_extra_left: 90, angle_extra_right: 90 },
  { label: "Эркер Э-1", length: 2200, quantity: 1, angle_left: 135, angle_right: 90, angle_extra_left: 85, angle_extra_right: 90 },
  { label: "Стойка С-3", length: 2950, quantity: 4, angle_left: 90, angle_right: 90, angle_extra_left: 90, angle_extra_right: 90 },
];

const DEFAULT_CONFIG: CutConfig = {
  cut_width: 10,
  trim_left: 0,
  trim_right: 0,
  min_remnant: 1000,
  two_profiles: false,
  algorithm: "auto",
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  barDensity: "compact",
  calcMode: "instant",
  timerSeconds: 10,
  autoRecalcOnFocus: true,
  autoCheckUpdates: true,
  anglePresets: DEFAULT_ANGLE_PRESETS,
  companyName: "АО «Мобиль»",
  companyLogo: "mobil",
  companyPhone: "+7 (343) 287-00-66",
  companyWebsite: "mobil66.ru",
  machineName: "Двухголовочная усорезная пила",
  operatorName: "Иванов А. С.",
  reportConfig: DEFAULT_REPORT_CONFIG,
};

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>(EXCEL_EXAMPLE_STOCKS);
  const [parts, setParts] = useState<Part[]>(EXCEL_EXAMPLE_PARTS);
  const [config, setConfig] = useState<CutConfig>(() => {
    try {
      const savedAlgo = localStorage.getItem("raskroy_cut_algorithm") as CuttingAlgorithm | null;
      if (savedAlgo) {
        return { ...DEFAULT_CONFIG, algorithm: savedAlgo };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_CONFIG;
  });
  const [plan, setPlan] = useState<CuttingPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredLength, setHoveredLength] = useState<number | null>(null);
  const [calcTimeMs, setCalcTimeMs] = useState<number | null>(null);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("raskroy_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          reportConfig: {
            ...DEFAULT_REPORT_CONFIG,
            ...(parsed?.reportConfig || {}),
          },
        };
      }
    } catch (e) {
      console.warn("Failed to load settings from storage", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Left sidebar & resizable split layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("raskroy_sidebar_open");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("raskroy_sidebar_width");
      const val = saved ? parseInt(saved, 10) : 236;
      return isNaN(val) ? 236 : Math.max(190, Math.min(340, val));
    } catch {
      return 236;
    }
  });

  const [leftPanePct, setLeftPanePct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("raskroy_left_pane_pct");
      const val = saved ? parseFloat(saved) : 44;
      return isNaN(val) ? 44 : Math.max(28, Math.min(68, val));
    } catch {
      return 44;
    }
  });

  const splitContainerRef = useRef<HTMLDivElement>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabType>("refresh");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // App Version & GitHub Releases Auto-Updater state
  const [appVersion, setAppVersion] = useState<string>("0.5.0");
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgressEvent | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Timer countdown state (for 'timer' mode)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(settings.timerSeconds);

  // Document and Material metadata
  const [meta, setMeta] = useState<DocumentMeta>({
    title: "Наряд на раскрой № 1",
    material: "Профиль алюминиевый фасадный (АО «Мобиль»)",
    date: new Date().toLocaleDateString("ru-RU"),
    orderNumber: "ЗК-104",
  });

  // Persist selected cutting algorithm across app restarts
  useEffect(() => {
    try {
      if (config.algorithm) {
        localStorage.setItem("raskroy_cut_algorithm", config.algorithm);
      }
    } catch {
      // ignore
    }
  }, [config.algorithm]);

  // Sync theme attribute on root <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const handleSidebarToggle = (open: boolean) => {
    setIsSidebarOpen(open);
    try {
      localStorage.setItem("raskroy_sidebar_open", String(open));
    } catch {
      // ignore storage errors
    }
  };

  const handleSidebarResize = (deltaPx: number) => {
    setSidebarWidth((prev) => {
      const next = Math.max(190, Math.min(340, prev + deltaPx));
      try {
        localStorage.setItem("raskroy_sidebar_width", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleMainSplitResize = (deltaPx: number) => {
    const containerW = splitContainerRef.current?.clientWidth || 1200;
    const deltaPct = (deltaPx / containerW) * 100;
    setLeftPanePct((prev) => {
      const next = Math.max(28, Math.min(68, prev + deltaPct));
      try {
        localStorage.setItem("raskroy_left_pane_pct", next.toFixed(2));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleOpenSettings = (tab: SettingsTabType) => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  // Save settings when changed
  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem("raskroy_settings", JSON.stringify(newSettings));
    } catch (e) {
      console.warn("Failed to persist settings", e);
    }
  };

  const handleToggleTheme = (theme: AppTheme) => {
    handleSettingsChange({ ...settings, theme });
  };

  // Perform calculation
  const runCalculation = useCallback(async () => {
    setError(null);
    setLoading(true);
    const start = performance.now();

    try {
      if (isTauri()) {
        const result = await invoke<CuttingPlan>("calculate_cutting_plan", {
          stocks,
          parts,
          config,
        });
        setPlan(result);
        setCalcTimeMs(Math.round((performance.now() - start) * 10) / 10);
        setLastCalculatedAt(
          new Date().toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
        setIsDirty(false);
      } else {
        setError(
          "Запущено в браузере. Для вызова Rust-ядра запустите десктопное приложение через `npm run tauri dev`."
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(typeof err === "string" ? err : err.message || "Ошибка расчета раскроя");
    } finally {
      setLoading(false);
    }
  }, [stocks, parts, config]);

  // Track changes to inputs and mark dirty
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      runCalculation();
      return;
    }
    setIsDirty(true);

    if (settings.calcMode === "instant") {
      const handler = setTimeout(() => {
        runCalculation();
      }, 150);
      return () => clearTimeout(handler);
    }
  }, [stocks, parts, config, settings.calcMode, runCalculation]);

  // Timer interval effect
  useEffect(() => {
    if (settings.calcMode !== "timer") {
      setTimerSecondsLeft(settings.timerSeconds);
      return;
    }

    const interval = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          if (isDirty) {
            runCalculation();
          }
          return settings.timerSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.calcMode, settings.timerSeconds, isDirty, runCalculation]);

  // Window focus effect
  useEffect(() => {
    const handleFocus = () => {
      if (settings.autoRecalcOnFocus && isDirty) {
        runCalculation();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [settings.autoRecalcOnFocus, isDirty, runCalculation]);

  // Keyboard shortcuts: Ctrl+Enter (recalc), Ctrl+B (toggle sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        runCalculation();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        handleSidebarToggle(!isSidebarOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [runCalculation, isSidebarOpen]);

  const loadExample = () => {
    setStocks(EXCEL_EXAMPLE_STOCKS);
    setParts(EXCEL_EXAMPLE_PARTS);
    setConfig(DEFAULT_CONFIG);
    setMeta({
      title: "Контрольный заказ из Excel",
      material: "Хлыст 6100 мм (АО «Мобиль»)",
      date: new Date().toLocaleDateString("ru-RU"),
      orderNumber: "ЗК-EXCEL",
    });
  };

  const clearAll = () => {
    setStocks([{ length: 6100, quantity: undefined }]);
    setParts([{ length: 2000, quantity: 1, angle_left: 90, angle_right: 90 }]);
    setPlan(null);
    setIsDirty(true);
  };

  // Check GitHub Releases for updates
  const checkForUpdates = useCallback(async () => {
    if (!isTauri()) return;
    setUpdateError(null);
    setUpdateChecking(true);
    try {
      const res = await invoke<UpdateCheckResult>("check_for_updates");
      setUpdateInfo(res);
    } catch (err: any) {
      setUpdateError(typeof err === "string" ? err : err.message || "Ошибка проверки обновлений");
    } finally {
      setUpdateChecking(false);
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!isTauri() || !updateInfo?.download_url || !updateInfo?.asset_name) return;
    setUpdateError(null);
    setUpdateDownloading(true);
    setUpdateProgress({
      downloaded: 0,
      total: updateInfo.asset_size || 0,
      percent: 0,
      stage: "downloading",
    });
    try {
      await invoke("download_and_install_update", {
        downloadUrl: updateInfo.download_url,
        assetName: updateInfo.asset_name,
      });
    } catch (err: any) {
      setUpdateDownloading(false);
      setUpdateError(typeof err === "string" ? err : err.message || "Ошибка установки обновления");
    }
  }, [updateInfo]);

  const handleOpenReleasePage = useCallback(async (url: string) => {
    try {
      if (isTauri()) {
        await openUrl(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  // Load compiled version, subscribe to download progress, and run startup update check
  useEffect(() => {
    if (!isTauri()) return;
    invoke<string>("get_app_version")
      .then((ver) => setAppVersion(ver))
      .catch(() => {});

    let unlisten: (() => void) | undefined;
    listen<UpdateProgressEvent>("update-progress", (event) => {
      setUpdateProgress(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    if (settings.autoCheckUpdates) {
      startupTimer = setTimeout(() => {
        checkForUpdates();
      }, 1500);
    }

    return () => {
      if (unlisten) unlisten();
      if (startupTimer) clearTimeout(startupTimer);
    };
  }, []); // Run once on app mount

  const handleImportParts = (newParts: Part[], replace: boolean) => {
    if (replace) {
      setParts(newParts);
    } else {
      setParts((prev) => [...prev, ...newParts]);
    }
  };

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] font-sans no-print selection:bg-[#dd4b19]/20 border border-[var(--border-main)]">
        {/* Custom Frameless App Title Bar */}
        <TitleBar appVersion={appVersion} documentTitle={meta.title} />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Collapsible & Horizontally Resizable Left Navigation Menu */}
          <LeftSidebar
            isOpen={isSidebarOpen}
            widthPx={sidebarWidth}
            onClose={() => handleSidebarToggle(false)}
            settings={settings}
            onToggleTheme={handleToggleTheme}
            appVersion={appVersion}
            updateAvailableVersion={updateInfo?.has_update ? updateInfo.latest_version : null}
            isDirty={isDirty}
            loading={loading}
            calcTimeMs={calcTimeMs}
            lastCalculatedAt={lastCalculatedAt}
            timerSecondsLeft={timerSecondsLeft}
            hasPlan={Boolean(plan)}
            onCalculate={runCalculation}
            onOpenSettings={handleOpenSettings}
            onOpenReport={() => setIsReportOpen(true)}
            onOpenImport={() => setIsImportModalOpen(true)}
            onDownloadSample={downloadSampleExcel}
            onLoadExample={loadExample}
            onClearAll={clearAll}
          />

          {isSidebarOpen && (
            <ResizeHandle
              orientation="vertical"
              onResize={handleSidebarResize}
              onReset={() => {
                setSidebarWidth(236);
                localStorage.setItem("raskroy_sidebar_width", "236");
              }}
              title="Потяните для изменения ширины бокового меню"
            />
          )}

          {/* Right / Main Fluid Workspace */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Clean Top Toolbar & Document Metadata */}
          <header className="border-b border-[var(--border-main)] bg-[var(--bg-surface)] px-4 md:px-5 py-2 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left cluster */}
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                {!isSidebarOpen && (
                  <div className="flex items-center gap-2.5 pr-3 border-r border-[var(--border-main)]">
                    <button
                      onClick={() => handleSidebarToggle(true)}
                      className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] px-2.5 py-1.5 rounded border border-[var(--border-main)] transition-colors cursor-pointer"
                      title="Показать левую панель меню (Ctrl+B)"
                    >
                      <PanelLeft className="w-4 h-4 stroke-[1.5] text-[#dd4b19]" />
                      <span>Меню</span>
                    </button>
                    <MobilLogo
                      height={16}
                      showWordmark={true}
                      accentColor="#dd4b19"
                      color="var(--text-primary)"
                      className="hidden sm:inline-block"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)]">Документ:</span>
                  <input
                    type="text"
                    value={meta.title}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                    placeholder="Название заказа / наряда"
                    className="bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19] w-44 md:w-56"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)]">Материал:</span>
                  <input
                    type="text"
                    value={meta.material}
                    onChange={(e) => setMeta({ ...meta, material: e.target.value })}
                    placeholder="Название материала (профиль, артикул...)"
                    className="bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#dd4b19] w-48 md:w-72"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)]">Дата:</span>
                  <input
                    type="text"
                    value={meta.date}
                    onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                    className="bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2 py-1 text-[var(--text-primary)] text-xs font-mono w-24 text-center focus:outline-none focus:border-[#dd4b19]"
                  />
                </div>
              </div>

              {/* Right cluster */}
              <div className="flex items-center gap-2 shrink-0">
                {calcTimeMs !== null && (
                  <span className="text-[11px] text-[var(--text-muted)] font-mono hidden xl:inline-block">
                    {calcTimeMs} мс {lastCalculatedAt && `• ${lastCalculatedAt}`}
                  </span>
                )}

                {/* Quick theme toggle */}
                <button
                  onClick={() => handleToggleTheme(settings.theme === "light" ? "dark" : "light")}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border-main)] transition-colors cursor-pointer"
                  title={
                    settings.theme === "light"
                      ? "Переключить на тёмную тему"
                      : "Переключить на светлую тему"
                  }
                >
                  {settings.theme === "light" ? (
                    <Moon className="w-4 h-4 stroke-[1.5]" />
                  ) : (
                    <Sun className="w-4 h-4 stroke-[1.5]" />
                  )}
                </button>

                {!isSidebarOpen && (
                  <>
                    <button
                      onClick={runCalculation}
                      disabled={loading}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 ${
                        isDirty && settings.calcMode !== "instant"
                          ? "bg-[#dd4b19] hover:bg-[#c53f12] text-white"
                          : "bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-main)]"
                      }`}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 stroke-[1.5] text-[#dd4b19] ${
                          loading ? "animate-spin" : ""
                        } ${isDirty && settings.calcMode !== "instant" ? "!text-white" : ""}`}
                      />
                      <span>Обновить</span>
                    </button>

                    <button
                      onClick={() => setIsReportOpen(true)}
                      disabled={!plan}
                      className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] px-2.5 py-1.5 rounded border border-[var(--border-main)] transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 stroke-[1.5] text-[#dd4b19]" />
                      <span className="hidden sm:inline">Отчёт</span>
                    </button>

                    <button
                      onClick={() => handleOpenSettings("refresh")}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border-main)] transition-colors cursor-pointer"
                      title="Настройки"
                    >
                      <Sliders className="w-4 h-4 stroke-[1.5]" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Main Workspace Resizable Split Grid */}
          <main ref={splitContainerRef} className="flex-1 w-full p-3.5 md:p-5 space-y-3 no-print">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div
              className="flex flex-col xl:flex-row items-stretch gap-3 xl:gap-0"
              style={{ "--left-pane-pct": `${leftPanePct}%` } as React.CSSProperties}
            >
              {/* Left Resizable Column: Specifications & Parameters */}
              <div className="xl-split-left space-y-3 xl:pr-1.5">
                <ConfigPanel config={config} onChange={setConfig} />
                <StockTable stocks={stocks} onChange={setStocks} />
                <PartsTable
                  parts={parts}
                  onChange={setParts}
                  hoveredLength={hoveredLength}
                  onHoverLength={setHoveredLength}
                  presets={settings.anglePresets}
                  onOpenImport={() => setIsImportModalOpen(true)}
                />
              </div>

              {/* Draggable Horizontal Splitter */}
              <ResizeHandle
                orientation="vertical"
                onResize={handleMainSplitResize}
                onReset={() => {
                  setLeftPanePct(44);
                  localStorage.setItem("raskroy_left_pane_pct", "44");
                }}
                title="Потяните, чтобы растянуть или сузить колонки таблиц и карт раскроя (двойной клик — сброс)"
              />

              {/* Right Resizable Column: Key Stats & Cutting Diagrams */}
              <div className="flex-1 min-w-0 w-full space-y-3 xl:pl-1.5">
                {plan && (
                  <>
                    <SummaryStats summary={plan.summary} patternCount={plan.patterns.length} />

                    {plan.unplaced.length > 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-800 dark:text-amber-200 text-xs">
                        <div className="font-semibold mb-1">
                          Недостаточно заготовок на складе для позиций:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                          {plan.unplaced.map((p, idx) => (
                            <li key={idx}>
                              Длина {p.length} мм — {p.quantity} шт.
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <CuttingVisualizer
                      patterns={plan.patterns}
                      hoveredLength={hoveredLength}
                      onHoverLength={setHoveredLength}
                      onOpenReport={() => setIsReportOpen(true)}
                      barDensity={settings.barDensity}
                      onBarDensityChange={(density) =>
                        handleSettingsChange({ ...settings, barDensity: density })
                      }
                      trimLeft={config.trim_left}
                      trimRight={config.trim_right}
                      activeAlgorithm={config.algorithm || "auto"}
                      onOpenAlgorithmSettings={() => handleOpenSettings("cutting")}
                    />
                  </>
                )}

                {!plan && !loading && (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-16 text-center space-y-2">
                    <div className="text-xs text-[var(--text-primary)] font-semibold">
                      Нет активного расчёта
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                      Заполните склад и спецификацию деталей, затем нажмите «Обновить» или Ctrl+Enter.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </main>

        {/* Footer */}
          <footer className="border-t border-[var(--border-main)] bg-[var(--bg-surface)] py-2 px-5 text-[11px] text-[var(--text-muted)] font-mono flex items-center justify-between no-print mt-auto">
            <span>
              {settings.companyName} &bull; Линейный раскрой v{appVersion} &bull; Rust Core
            </span>
            <span>Материал: {meta.material || "Не указан"}</span>
          </footer>
        </div>
        </div>

        {/* Left Slide-out Settings Drawer */}
        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialTab={settingsTab}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          config={config}
          onConfigChange={setConfig}
          calcTimeMs={calcTimeMs}
          onManualRefresh={runCalculation}
          onOpenReportPreview={() => {
            setIsSettingsOpen(false);
            setIsReportOpen(true);
          }}
          isCalculating={loading}
          appVersion={appVersion}
          updateInfo={updateInfo}
          updateChecking={updateChecking}
          updateDownloading={updateDownloading}
          updateProgress={updateProgress}
          updateError={updateError}
          onCheckUpdates={checkForUpdates}
          onInstallUpdate={handleInstallUpdate}
          onOpenReleasePage={handleOpenReleasePage}
        />

        {/* Excel Import Modal */}
        <ImportExcelModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportParts}
        />

        {/* Printable Report Modal (Preview) */}
        {plan && (
          <ReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            onOpenReportEditor={() => handleOpenSettings("report")}
            plan={plan}
            meta={meta}
            onMetaChange={setMeta}
            config={config}
            settings={settings}
          />
        )}
      </div>

      {/* Dedicated Paper Print Document (Directly rendered for window.print()) */}
      {plan && (
        <div className="print-document">
          <PrintReport
            plan={plan}
            meta={meta}
            cutWidth={config.cut_width}
            trimLeft={config.trim_left}
            trimRight={config.trim_right}
            minRemnant={config.min_remnant}
            twoProfiles={config.two_profiles}
            settings={settings}
            isPreview={false}
          />
        </div>
      )}
    </>
  );
}
