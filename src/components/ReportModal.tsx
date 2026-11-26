import React from "react";
import { CutConfig, CuttingPlan, CuttingTab, DocumentMeta, AppSettings } from "../types";
import { PrintReport } from "./PrintReport";
import { Printer, X, Sliders, Layers, FileText } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReportEditor?: () => void;
  plan: CuttingPlan;
  meta: DocumentMeta;
  onMetaChange: (meta: DocumentMeta) => void;
  config: CutConfig;
  settings?: AppSettings;
  printableTabs?: CuttingTab[];
  reportScope?: "active" | "all";
  onReportScopeChange?: (scope: "active" | "all") => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onOpenReportEditor,
  plan,
  meta,
  onMetaChange,
  config,
  settings,
  printableTabs = [],
  reportScope = "active",
  onReportScopeChange,
}) => {
  if (!isOpen) return null;

  const canBatchPrint = printableTabs.length > 1;
  const effectiveScope = canBatchPrint && reportScope === "all" ? "all" : "active";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto no-print">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl max-w-[1040px] w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Toolbar */}
        <div className="p-3.5 px-6 border-b border-[var(--border-main)] flex items-center justify-between gap-3 flex-wrap bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Предпросмотр наряда на раскрой
            </h2>
            <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-muted)] px-2 py-0.5 rounded font-mono">
              Формат А4 &bull; {settings?.companyName || "АО «Мобиль»"}
            </span>

            {canBatchPrint && onReportScopeChange && (
              <div className="inline-flex rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => onReportScopeChange("active")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    effectiveScope === "active"
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Текущая вкладка</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReportScopeChange("all")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    effectiveScope === "all"
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Все вкладки ({printableTabs.length})</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenReportEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReportEditor();
                }}
                className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-3 py-1.5 rounded border border-[var(--border-main)] transition-colors cursor-pointer"
                title="Настроить отображаемые блоки отчёта"
              >
                <Sliders className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Настроить отчёт</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-1.5 rounded transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {effectiveScope === "all"
                  ? `Печать всех (${printableTabs.length}) / PDF`
                  : "Печать / В PDF"}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Container (Preview) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/80 dark:bg-[#26262b] flex flex-col items-center gap-6">
          {effectiveScope === "all" ? (
            printableTabs.map((tab, idx) =>
              tab.plan ? (
                <div key={tab.id} className="w-full max-w-[850px] space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 px-1 flex items-center justify-between">
                    <span>
                      Лист {idx + 1} из {printableTabs.length}:{" "}
                      <strong>{tab.meta.material || tab.title}</strong>
                    </span>
                    <span>
                      {tab.plan.summary.total_stocks_used} хл. &bull; КИМ{" "}
                      {tab.plan.summary.efficiency_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full shadow-2xl rounded-sm overflow-hidden">
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
                </div>
              ) : null
            )
          ) : (
            <div className="w-full max-w-[850px] shadow-2xl rounded-sm">
              <PrintReport
                plan={plan}
                meta={meta}
                onMetaChange={onMetaChange}
                cutWidth={config.cut_width}
                trimLeft={config.trim_left}
                trimRight={config.trim_right}
                minRemnant={config.min_remnant}
                twoProfiles={config.two_profiles}
                settings={settings}
                isPreview={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
