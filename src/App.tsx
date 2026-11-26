import { useState, useEffect, useCallback, useRef } from "react";
import {
  Stock,
  Part,
  CutConfig,
  CuttingPlan,
  AppSettings,
  AppTheme,
  APP_THEMES,
  CuttingAlgorithm,
  StockPriorityMode,
  CuttingTab,
  DEFAULT_IMPORT_OPTIONS,
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
import { ResizeHandle } from "./components/ResizeHandle";
import { TitleBar } from "./components/TitleBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { TabsBar } from "./components/TabsBar";
import { downloadSampleExcel, ImportGroup, parseExcelFile } from "./utils/excelImport";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AlertCircle, FileText, RefreshCw, Info, X } from "lucide-react";

// Benchmark dataset from "таблица раскроя.xlsm" (accessible from Settings -> Import -> Demo)
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
  stock_priority: "min_total_length",
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  barDensity: "compact",
  calcMode: "instant",
  timerSeconds: 10,
  autoRecalcOnFocus: true,
  autoCheckUpdates: true,
  defaultStockLength: 6000,
  sidebarPinned: false,
  importOptions: DEFAULT_IMPORT_OPTIONS,
  anglePresets: DEFAULT_ANGLE_PRESETS,
  companyName: "АО «Мобиль»",
  companyLogo: "mobil",
  companyPhone: "+7 (343) 287-00-66",
  companyWebsite: "mobil66.ru",
  machineName: "Двухголовочная усорезная пила",
  operatorName: "Иванов А. С.",
  reportConfig: DEFAULT_REPORT_CONFIG,
};

function makeTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getSavedAlgorithm(): CuttingAlgorithm {
  try {
    const saved = localStorage.getItem("raskroy_cut_algorithm") as CuttingAlgorithm | null;
    if (saved) return saved;
  } catch {
    // ignore
  }
  return "auto";
}

function getSavedStockPriority(): StockPriorityMode {
  try {
    const saved = localStorage.getItem("raskroy_stock_priority") as StockPriorityMode | null;
    if (saved === "min_total_length" || saved === "remnants_first" || saved === "min_bars_count") {
      return saved;
    }
  } catch {
    // ignore
  }
  return "min_total_length";
}

function makeDefaultTabConfig(): CutConfig {
  return {
    ...DEFAULT_CONFIG,
    algorithm: getSavedAlgorithm(),
    stock_priority: getSavedStockPriority(),
  };
}

function loadInitialSettings(): AppSettings {
  try {
    const saved = localStorage.getItem("raskroy_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      const validTheme = APP_THEMES.some((t) => t.id === parsed?.theme)
        ? (parsed.theme as AppTheme)
        : "light";
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        theme: validTheme,
        defaultStockLength:
          typeof parsed?.defaultStockLength === "number" && parsed.defaultStockLength >= 100
            ? parsed.defaultStockLength
            : 6000,
        sidebarPinned: Boolean(parsed?.sidebarPinned),
        importOptions: {
          ...DEFAULT_IMPORT_OPTIONS,
          ...(parsed?.importOptions || {}),
        },
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
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadInitialSettings);

  // App opens to empty Welcome Screen (tabs = [], activeTabId = null)
  const [tabs, setTabs] = useState<CuttingTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const manualCounterRef = useRef<number>(1);

  const [hoveredLength, setHoveredLength] = useState<number | null>(null);
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Sidebar is hidden by default unless user pinned it permanently
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => settings.sidebarPinned);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("raskroy_sidebar_width");
      const val = saved ? parseInt(saved, 10) : 228;
      return isNaN(val) ? 228 : Math.max(190, Math.min(340, val));
    } catch {
      return 228;
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
  const [settingsTab, setSettingsTab] = useState<SettingsTabType>("algorithms");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportScope, setReportScope] = useState<"active" | "all">("active");

  // App Version & GitHub Releases Auto-Updater state
  const [appVersion, setAppVersion] = useState<string>("0.6.0");
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgressEvent | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(settings.timerSeconds);

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const isWelcomeScreen = activeTab === null;
  const printableTabs = tabs.filter((t) => Boolean(t.plan));

  // Keep a ref of latest tabs so timer/async callbacks read current data cleanly
  const tabsRef = useRef<CuttingTab[]>(tabs);
  tabsRef.current = tabs;

  // Persist default global algorithm & stock priority selection
  const fallbackConfig: CutConfig = activeTab ? activeTab.config : makeDefaultTabConfig();

  // Sync theme attribute on root <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const handleSettingsChange = useCallback(
    (newSettings: AppSettings) => {
      setSettings((prev) => {
        if (newSettings.sidebarPinned && !prev.sidebarPinned) {
          setIsSidebarOpen(true);
        }
        return newSettings;
      });
      try {
        localStorage.setItem("raskroy_settings", JSON.stringify(newSettings));
      } catch (e) {
        console.warn("Failed to persist settings", e);
      }
    },
    []
  );

  const handleTogglePin = () => {
    const nextPinned = !settings.sidebarPinned;
    handleSettingsChange({ ...settings, sidebarPinned: nextPinned });
    if (nextPinned) {
      setIsSidebarOpen(true);
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

  const handleOpenSettings = (tab: SettingsTabType = "algorithms") => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const updateTab = useCallback((tabId: string, updater: (t: CuttingTab) => CuttingTab) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updater(t) : t)));
  }, []);

  // Calculate cutting plan for a specific tab ID
  const calculateTabPlan = useCallback(
    async (tabId: string, explicitSnapshot?: { stocks: Stock[]; parts: Part[]; config: CutConfig }) => {
      const current = explicitSnapshot || tabsRef.current.find((t) => t.id === tabId);
      if (!current) return;

      const validStocks = current.stocks.filter((s) => s.length > 0);
      const validParts = current.parts.filter((p) => p.length > 0 && p.quantity > 0);

      if (validStocks.length === 0 || validParts.length === 0) {
        updateTab(tabId, (t) => ({
          ...t,
          plan: null,
          error: null,
          loading: false,
          isDirty: false,
        }));
        return;
      }

      updateTab(tabId, (t) => ({ ...t, error: null, loading: true }));
      const start = performance.now();

      try {
        if (isTauri()) {
          const result = await invoke<CuttingPlan>("calculate_cutting_plan", {
            stocks: validStocks,
            parts: validParts,
            config: current.config,
          });
          const elapsed = Math.round((performance.now() - start) * 10) / 10;
          const timeStr = new Date().toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          updateTab(tabId, (t) => ({
            ...t,
            plan: result,
            calcTimeMs: elapsed,
            lastCalculatedAt: timeStr,
            isDirty: false,
            error: null,
            loading: false,
          }));
        } else {
          updateTab(tabId, (t) => ({
            ...t,
            error:
              "Запущено в браузере. Для вызова Rust-ядра запустите приложение через `npm run tauri dev`.",
            loading: false,
          }));
        }
      } catch (err: unknown) {
        console.error(err);
        const msg =
          typeof err === "string"
            ? err
            : err instanceof Error
            ? err.message
            : "Ошибка расчета раскроя";
        updateTab(tabId, (t) => ({
          ...t,
          error: msg,
          loading: false,
        }));
      }
    },
    [updateTab]
  );

  // Reactive calculation for active tab when inputs/config change
  const inputFingerprint = activeTab
    ? JSON.stringify({
        id: activeTab.id,
        stocks: activeTab.stocks,
        parts: activeTab.parts,
        config: activeTab.config,
      })
    : "";

  const prevFingerprintRef = useRef<string>("");
  const prevActiveIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const curTab = activeTabId ? tabsRef.current.find((t) => t.id === activeTabId) : null;
    if (!curTab) {
      prevFingerprintRef.current = "";
      prevActiveIdRef.current = null;
      return;
    }

    const tabJustSwitched = prevActiveIdRef.current !== curTab.id;
    prevActiveIdRef.current = curTab.id;

    if (prevFingerprintRef.current === inputFingerprint) return;
    prevFingerprintRef.current = inputFingerprint;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Switching to another tab that already has an up-to-date plan doesn't need recalc
    if (tabJustSwitched && curTab.plan !== null && !curTab.isDirty) {
      return;
    }

    // Only auto-trigger when inputs actually have data or clearing
    const hasInputs =
      curTab.stocks.some((s) => s.length > 0) &&
      curTab.parts.some((p) => p.length > 0 && p.quantity > 0);

    if (!hasInputs) {
      if (curTab.plan !== null || curTab.error !== null) {
        updateTab(curTab.id, (t) => ({
          ...t,
          plan: null,
          error: null,
          isDirty: false,
        }));
      }
      return;
    }

    updateTab(curTab.id, (t) => ({ ...t, isDirty: true }));

    if (settings.calcMode === "instant") {
      const targetId = curTab.id;
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        calculateTabPlan(targetId);
      }, 150);
    }
  }, [inputFingerprint, activeTabId, settings.calcMode, calculateTabPlan, updateTab]);

  // Timer interval effect for active tab in 'timer' mode
  useEffect(() => {
    if (settings.calcMode !== "timer" || !activeTab) {
      setTimerSecondsLeft(settings.timerSeconds);
      return;
    }

    const interval = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          if (activeTab.isDirty) {
            calculateTabPlan(activeTab.id);
          }
          return settings.timerSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.calcMode, settings.timerSeconds, activeTab, calculateTabPlan]);

  // Window focus auto-recalc
  useEffect(() => {
    const handleFocus = () => {
      if (settings.autoRecalcOnFocus && activeTab?.isDirty) {
        calculateTabPlan(activeTab.id);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [settings.autoRecalcOnFocus, activeTab, calculateTabPlan]);

  // Create empty manual tab (clean slate, zero demo data!)
  const handleStartManual = useCallback(() => {
    const num = manualCounterRef.current++;
    const tabTitle = `Новый раскрой #${num}`;
    const newTab: CuttingTab = {
      id: makeTabId(),
      title: tabTitle,
      meta: {
        title: tabTitle,
        material: "",
        date: new Date().toLocaleDateString("ru-RU"),
        orderNumber: "",
      },
      stocks: [],
      parts: [],
      config: makeDefaultTabConfig(),
      plan: null,
      loading: false,
      error: null,
      calcTimeMs: null,
      lastCalculatedAt: null,
      isDirty: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setWelcomeError(null);
  }, []);

  // Keyboard shortcuts: Ctrl+Enter (recalc), Ctrl+B (toggle sidebar), Ctrl+T (new tab)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && activeTabId) {
        calculateTabPlan(activeTabId);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B") && !isWelcomeScreen) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        handleStartManual();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, isWelcomeScreen, calculateTabPlan, handleStartManual]);

  // Open imported groups as tabs and calculate each one
  const handleImportAsTabs = useCallback(
    (groups: ImportGroup[], sourceFile: string, fractionalCount = 0) => {
      if (groups.length === 0) return;
      const defaultLen = settings.defaultStockLength || 6000;
      const baseTitle = sourceFile.replace(/\.(xlsx|xls|csv|txt)$/i, "");
      const dateStr = new Date().toLocaleDateString("ru-RU");

      const created: CuttingTab[] = groups.map((g, idx) => {
        const stocks: Stock[] = [{ length: defaultLen, quantity: undefined }];
        const tabConfig: CutConfig = makeDefaultTabConfig();
        return {
          id: makeTabId(),
          title: g.tabTitle || `${baseTitle} #${idx + 1}`,
          article: g.article,
          colour: g.colour,
          sourceFile,
          meta: {
            title:
              groups.length > 1
                ? `${baseTitle} [${idx + 1}/${groups.length}]`
                : baseTitle,
            material: g.materialLabel,
            date: dateStr,
            orderNumber: g.article || "",
          },
          stocks,
          parts: g.parts,
          config: tabConfig,
          plan: null,
          loading: true,
          error: null,
          calcTimeMs: null,
          lastCalculatedAt: null,
          isDirty: false,
        };
      });

      setTabs((prev) => [...prev, ...created]);
      setActiveTabId(created[0].id);

      if (fractionalCount > 0) {
        setImportNotice(
          `Загружено вкладок: ${created.length} (хлыст ${defaultLen} мм). Дробных размеров округлено вверх: ${fractionalCount}.`
        );
      } else if (created.length > 1) {
        setImportNotice(
          `Создано ${created.length} вкладок по артикулам и цветам из «${sourceFile}» (хлыст по умолчанию ${defaultLen} мм).`
        );
      } else {
        setImportNotice(null);
      }

      // Compute cutting plan for every created tab
      (async () => {
        for (const tab of created) {
          await calculateTabPlan(tab.id, {
            stocks: tab.stocks,
            parts: tab.parts,
            config: tab.config,
          });
        }
      })();
    },
    [settings.defaultStockLength, calculateTabPlan]
  );

  // Direct file upload / drop from Welcome Screen or global workspace drop
  const handleWelcomeSelectFile = useCallback(
    async (file: File) => {
      setWelcomeError(null);
      setWelcomeLoading(true);
      try {
        const parsed = await parseExcelFile(file, settings.importOptions);
        handleImportAsTabs(parsed.groups, parsed.fileName, parsed.fractionalRounded.length);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Ошибка чтения файла выгрузки.";
        setWelcomeError(msg);
      } finally {
        setWelcomeLoading(false);
      }
    },
    [settings.importOptions, handleImportAsTabs]
  );

  // Prevent WebView2 navigating on OS file drops anywhere in the window & accept spreadsheet drops
  useEffect(() => {
    const onWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      if (isImportModalOpen || isSettingsOpen || isReportOpen) return;
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (/\.(xlsx|xls|csv|txt)$/i.test(file.name)) {
        handleWelcomeSelectFile(file);
      }
    };
    window.addEventListener("dragover", onWindowDragOver);
    window.addEventListener("drop", onWindowDrop);
    return () => {
      window.removeEventListener("dragover", onWindowDragOver);
      window.removeEventListener("drop", onWindowDrop);
    };
  }, [isImportModalOpen, isSettingsOpen, isReportOpen, handleWelcomeSelectFile]);

  // Import into current active tab
  const handleImportToCurrentTab = (newParts: Part[], replace: boolean, materialLabel?: string) => {
    if (!activeTab) return;
    const defaultLen = settings.defaultStockLength || 6000;
    updateTab(activeTab.id, (t) => ({
      ...t,
      stocks: t.stocks.length === 0 ? [{ length: defaultLen, quantity: undefined }] : t.stocks,
      parts: replace ? newParts : [...t.parts, ...newParts],
      meta: materialLabel && !t.meta.material ? { ...t.meta, material: materialLabel } : t.meta,
    }));
  };

  const handleLoadExample = () => {
    const newTab: CuttingTab = {
      id: makeTabId(),
      title: "Пример из Excel",
      meta: {
        title: "Контрольный заказ из Excel",
        material: "Профиль алюминиевый фасадный",
        date: new Date().toLocaleDateString("ru-RU"),
        orderNumber: "ЗК-EXCEL",
      },
      stocks: EXCEL_EXAMPLE_STOCKS,
      parts: EXCEL_EXAMPLE_PARTS,
      config: makeDefaultTabConfig(),
      plan: null,
      loading: true,
      error: null,
      calcTimeMs: null,
      lastCalculatedAt: null,
      isDirty: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    calculateTabPlan(newTab.id, {
      stocks: newTab.stocks,
      parts: newTab.parts,
      config: newTab.config,
    });
  };

  const handleClearActiveTab = () => {
    if (!activeTab) return;
    updateTab(activeTab.id, (t) => ({
      ...t,
      stocks: [],
      parts: [],
      plan: null,
      error: null,
      isDirty: false,
    }));
  };

  const handleCloseTab = (tabId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const nextTabs = prev.filter((t) => t.id !== tabId);
      if (tabId === activeTabId) {
        if (nextTabs.length === 0) {
          setActiveTabId(null);
        } else {
          const fallbackIdx = Math.min(idx, nextTabs.length - 1);
          setActiveTabId(nextTabs[fallbackIdx].id);
        }
      }
      return nextTabs;
    });
  };

  // GitHub updater commands
  const checkForUpdates = useCallback(async () => {
    if (!isTauri()) return;
    setUpdateError(null);
    setUpdateChecking(true);
    try {
      const res = await invoke<UpdateCheckResult>("check_for_updates");
      setUpdateInfo(res);
    } catch (err: unknown) {
      const msg =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : "Ошибка проверки обновлений";
      setUpdateError(msg);
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
    } catch (err: unknown) {
      setUpdateDownloading(false);
      const msg =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : "Ошибка установки обновления";
      setUpdateError(msg);
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
  }, []); // Run once on mount

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] font-sans no-print selection:bg-[var(--accent-subtle)]">
        {/* Frameless App TitleBar */}
        <TitleBar
          appVersion={appVersion}
          documentTitle={activeTab ? activeTab.title : "Стартовый экран"}
        />

        {/* Welcome Screen (No sidebar visible!) vs Multi-Tab Workspace */}
        {isWelcomeScreen ? (
          <WelcomeScreen
            settings={settings}
            existingTabsCount={tabs.length}
            loadingFile={welcomeLoading}
            error={welcomeError}
            onSelectFile={handleWelcomeSelectFile}
            onStartManual={handleStartManual}
            onOpenSettings={() => handleOpenSettings("algorithms")}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onReturnToTabs={() => {
              if (tabs[0]) setActiveTabId(tabs[0].id);
            }}
          />
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Hidden by default Left Sidebar; user reveals via Menu button or locks open via Pin */}
            <LeftSidebar
              isOpen={isSidebarOpen}
              pinned={settings.sidebarPinned}
              widthPx={sidebarWidth}
              onTogglePin={handleTogglePin}
              onClose={() => {
                if (settings.sidebarPinned) {
                  handleSettingsChange({ ...settings, sidebarPinned: false });
                }
                setIsSidebarOpen(false);
              }}
              settings={settings}
              appVersion={appVersion}
              updateAvailableVersion={updateInfo?.has_update ? updateInfo.latest_version : null}
              isDirty={activeTab.isDirty}
              loading={activeTab.loading}
              calcTimeMs={activeTab.calcTimeMs}
              timerSecondsLeft={timerSecondsLeft}
              hasPlan={Boolean(activeTab.plan)}
              onCalculate={() => calculateTabPlan(activeTab.id)}
              onNewTab={handleStartManual}
              onOpenImport={() => setIsImportModalOpen(true)}
              onOpenReport={() => {
                setReportScope("active");
                setIsReportOpen(true);
              }}
              onClearTab={handleClearActiveTab}
              onOpenSettings={handleOpenSettings}
            />

            {isSidebarOpen && (
              <ResizeHandle
                orientation="vertical"
                onResize={handleSidebarResize}
                onReset={() => {
                  setSidebarWidth(228);
                  localStorage.setItem("raskroy_sidebar_width", "228");
                }}
                title="Потяните для изменения ширины бокового меню"
              />
            )}

            {/* Main Right Area: Tabs Bar + Toolbar + Workspace Split Grid */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              <TabsBar
                tabs={tabs}
                activeTabId={activeTab.id}
                isSidebarOpen={isSidebarOpen}
                onRevealSidebar={() => setIsSidebarOpen(true)}
                onGoHome={() => setActiveTabId(null)}
                onSelectTab={(id) => setActiveTabId(id)}
                onCloseTab={handleCloseTab}
                onAddNewTab={handleStartManual}
                onOpenSettings={() => handleOpenSettings("algorithms")}
                onOpenBatchReport={() => {
                  setReportScope("all");
                  setIsReportOpen(true);
                }}
              />

              {/* Scrollable Workspace Content */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Document Metadata Toolbar */}
                <header className="border-b border-[var(--border-main)] bg-[var(--bg-surface)] px-4 md:px-5 py-2 no-print shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--text-muted)]">Документ:</span>
                        <input
                          type="text"
                          value={activeTab.meta.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateTab(activeTab.id, (t) => ({
                              ...t,
                              meta: { ...t.meta, title: val },
                            }));
                          }}
                          placeholder="Название заказа"
                          className="bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)] w-44 md:w-52"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--text-muted)]">Материал:</span>
                        <input
                          type="text"
                          value={activeTab.meta.material}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateTab(activeTab.id, (t) => ({
                              ...t,
                              meta: { ...t.meta, material: val },
                            }));
                          }}
                          placeholder="Профиль, артикул, цвет..."
                          className="bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)] w-48 md:w-68"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--text-muted)]">Дата:</span>
                        <input
                          type="text"
                          value={activeTab.meta.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateTab(activeTab.id, (t) => ({
                              ...t,
                              meta: { ...t.meta, date: val },
                            }));
                          }}
                          className="bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2 py-1 text-[var(--text-primary)] text-xs font-mono w-24 text-center focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>

                    {/* Right Toolbar Cluster */}
                    <div className="flex items-center gap-2 shrink-0">
                      {activeTab.calcTimeMs !== null && (
                        <span className="text-[11px] text-[var(--text-muted)] font-mono hidden xl:inline-block">
                          {activeTab.calcTimeMs} мс{" "}
                          {activeTab.lastCalculatedAt && `• ${activeTab.lastCalculatedAt}`}
                        </span>
                      )}

                      {!isSidebarOpen && (
                        <>
                          <button
                            type="button"
                            onClick={() => calculateTabPlan(activeTab.id)}
                            disabled={activeTab.loading}
                            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 ${
                              activeTab.isDirty && settings.calcMode !== "instant"
                                ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
                                : "bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-main)]"
                            }`}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 stroke-[1.5] text-[var(--accent)] ${
                                activeTab.loading ? "animate-spin" : ""
                              } ${
                                activeTab.isDirty && settings.calcMode !== "instant"
                                  ? "!text-white"
                                  : ""
                              }`}
                            />
                            <span>Обновить</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReportScope("active");
                              setIsReportOpen(true);
                            }}
                            disabled={!activeTab.plan}
                            className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] px-2.5 py-1.5 rounded border border-[var(--border-main)] transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 stroke-[1.5] text-[var(--accent)]" />
                            <span className="hidden sm:inline">Отчёт</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </header>

                {/* Main Split Workspace */}
                <main ref={splitContainerRef} className="flex-1 w-full p-3.5 md:p-5 space-y-3 no-print">
                  {importNotice && (
                    <div className="p-2.5 px-3.5 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-800 dark:text-sky-200 text-xs flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{importNotice}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setImportNotice(null)}
                        className="p-0.5 hover:opacity-75 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {activeTab.error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{activeTab.error}</span>
                    </div>
                  )}

                  <div
                    className="flex flex-col xl:flex-row items-stretch gap-3 xl:gap-0"
                    style={{ "--left-pane-pct": `${leftPanePct}%` } as React.CSSProperties}
                  >
                    {/* Left Resizable Column */}
                    <div className="xl-split-left space-y-3 xl:pr-1.5">
                      <ConfigPanel
                        config={activeTab.config}
                        onChange={(nextCfg) => {
                          try {
                            if (nextCfg.stock_priority) {
                              localStorage.setItem("raskroy_stock_priority", nextCfg.stock_priority);
                            }
                          } catch {
                            // ignore
                          }
                          updateTab(activeTab.id, (t) => ({ ...t, config: nextCfg }));
                        }}
                      />
                      <StockTable
                        stocks={activeTab.stocks}
                        defaultStockLength={settings.defaultStockLength}
                        onChange={(nextStocks) =>
                          updateTab(activeTab.id, (t) => ({ ...t, stocks: nextStocks }))
                        }
                      />
                      <PartsTable
                        parts={activeTab.parts}
                        onChange={(nextParts) =>
                          updateTab(activeTab.id, (t) => ({ ...t, parts: nextParts }))
                        }
                        hoveredLength={hoveredLength}
                        onHoverLength={setHoveredLength}
                        presets={settings.anglePresets}
                        onOpenImport={() => setIsImportModalOpen(true)}
                      />
                    </div>

                    {/* Horizontal Splitter */}
                    <ResizeHandle
                      orientation="vertical"
                      onResize={handleMainSplitResize}
                      onReset={() => {
                        setLeftPanePct(44);
                        localStorage.setItem("raskroy_left_pane_pct", "44");
                      }}
                      title="Потяните, чтобы растянуть или сузить колонки таблиц и карт раскроя (двойной клик — сброс)"
                    />

                    {/* Right Resizable Column */}
                    <div className="flex-1 min-w-0 w-full space-y-3 xl:pl-1.5">
                      {activeTab.plan && (
                        <>
                          <SummaryStats
                            summary={activeTab.plan.summary}
                            patternCount={activeTab.plan.patterns.length}
                          />

                          {activeTab.plan.unplaced.length > 0 && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-800 dark:text-amber-200 text-xs">
                              <div className="font-semibold mb-1">
                                Недостаточно заготовок на складе для позиций:
                              </div>
                              <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                                {activeTab.plan.unplaced.map((p, idx) => (
                                  <li key={idx}>
                                    Длина {p.length} мм — {p.quantity} шт.
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <CuttingVisualizer
                            patterns={activeTab.plan.patterns}
                            hoveredLength={hoveredLength}
                            onHoverLength={setHoveredLength}
                            onOpenReport={() => {
                              setReportScope("active");
                              setIsReportOpen(true);
                            }}
                            barDensity={settings.barDensity}
                            onBarDensityChange={(density) =>
                              handleSettingsChange({ ...settings, barDensity: density })
                            }
                            trimLeft={activeTab.config.trim_left}
                            trimRight={activeTab.config.trim_right}
                            activeAlgorithm={activeTab.config.algorithm || "auto"}
                            onOpenAlgorithmSettings={() => handleOpenSettings("algorithms")}
                          />
                        </>
                      )}

                      {!activeTab.plan && !activeTab.loading && (
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-16 text-center space-y-2">
                          <div className="text-xs text-[var(--text-primary)] font-semibold">
                            Рабочая область готова к вводу
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                            Добавьте заготовки на склад и требуемые детали в спецификацию (или
                            импортируйте файл Excel / CSV).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-[var(--border-main)] bg-[var(--bg-surface)] py-2 px-5 text-[11px] text-[var(--text-muted)] font-mono flex items-center justify-between no-print mt-auto shrink-0">
                  <span>
                    {settings.companyName} &bull; Линейный раскрой v{appVersion} &bull; Rust Core
                  </span>
                  <span>Материал: {activeTab.meta.material || "Не указан"}</span>
                </footer>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Settings Workspace Overlay (Accessible from WelcomeScreen & Workspace) */}
        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialTab={settingsTab}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          config={fallbackConfig}
          onConfigChange={(nextCfg) => {
            try {
              if (nextCfg.algorithm) {
                localStorage.setItem("raskroy_cut_algorithm", nextCfg.algorithm);
              }
              if (nextCfg.stock_priority) {
                localStorage.setItem("raskroy_stock_priority", nextCfg.stock_priority);
              }
            } catch {
              // ignore
            }
            if (activeTab) {
              updateTab(activeTab.id, (t) => ({ ...t, config: nextCfg }));
            }
          }}
          calcTimeMs={activeTab?.calcTimeMs ?? null}
          onManualRefresh={() => {
            if (activeTab) calculateTabPlan(activeTab.id);
          }}
          onOpenReportPreview={() => {
            setIsSettingsOpen(false);
            if (activeTab?.plan) {
              setReportScope("active");
              setIsReportOpen(true);
            }
          }}
          onDownloadSample={downloadSampleExcel}
          onLoadExample={handleLoadExample}
          isCalculating={Boolean(activeTab?.loading)}
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

        {/* Excel / CSV Import Modal */}
        <ImportExcelModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          hasActiveTab={Boolean(activeTab)}
          importOptions={settings.importOptions}
          defaultStockLength={settings.defaultStockLength}
          onImportToCurrentTab={handleImportToCurrentTab}
          onImportAsTabs={(groups, file) => handleImportAsTabs(groups, file)}
        />

        {/* Printable Report Modal */}
        {(activeTab?.plan || (reportScope === "all" && printableTabs.length > 0)) && (
          <ReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            onOpenReportEditor={() => handleOpenSettings("report")}
            plan={activeTab?.plan || printableTabs[0].plan!}
            meta={activeTab?.meta || printableTabs[0].meta}
            onMetaChange={(nextMeta) => {
              const targetId = activeTab?.plan ? activeTab.id : printableTabs[0]?.id;
              if (targetId) {
                updateTab(targetId, (t) => ({ ...t, meta: nextMeta }));
              }
            }}
            config={activeTab?.config || printableTabs[0].config}
            settings={settings}
            printableTabs={printableTabs}
            reportScope={reportScope}
            onReportScopeChange={setReportScope}
          />
        )}
      </div>

      {/* Dedicated Paper Print Document (supports single active tab or all calculated tabs) */}
      {(activeTab?.plan || (reportScope === "all" && printableTabs.length > 0)) && (
        <div className="print-document">
          {(reportScope === "all" && printableTabs.length > 1
            ? printableTabs
            : activeTab?.plan
            ? [activeTab]
            : printableTabs.slice(0, 1)
          ).map((tab, idx, arr) =>
            tab.plan ? (
              <div
                key={tab.id}
                className={idx < arr.length - 1 ? "print-tab-page-break" : undefined}
              >
                <PrintReport
                  plan={tab.plan}
                  meta={tab.meta}
                  cutWidth={tab.config.cut_width}
                  trimLeft={tab.config.trim_left}
                  trimRight={tab.config.trim_right}
                  minRemnant={tab.config.min_remnant}
                  twoProfiles={tab.config.two_profiles}
                  settings={settings}
                  isPreview={false}
                />
              </div>
            ) : null
          )}
        </div>
      )}
    </>
  );
}
