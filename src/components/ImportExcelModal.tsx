import React, { useState, useRef } from "react";
import { ImportOptions, Part } from "../types";
import {
  parseExcelFile,
  downloadSampleExcel,
  ImportGroup,
  ImportResult,
  getRalSwatchColor,
} from "../utils/excelImport";
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  FolderPlus,
} from "lucide-react";

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasActiveTab: boolean;
  importOptions: ImportOptions;
  defaultStockLength: number;
  onImportToCurrentTab: (newParts: Part[], replace: boolean, materialLabel?: string) => void;
  onImportAsTabs: (groups: ImportGroup[], sourceFile: string) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  hasActiveTab,
  importOptions,
  defaultStockLength,
  onImportToCurrentTab,
  onImportAsTabs,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseExcelFile(file, importOptions);
      setResult(parsed);
      setSelectedGroupIds(new Set(parsed.groups.map((g) => g.id)));
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Ошибка чтения файла спецификации.";
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter") {
      dragDepthRef.current += 1;
      setDragActive(true);
    } else if (e.type === "dragover") {
      if (!dragActive) setDragActive(true);
    } else if (e.type === "dragleave") {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setDragActive(false);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (!result) return;
    if (selectedGroupIds.size === result.groups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(result.groups.map((g) => g.id)));
    }
  };

  const selectedGroups = result
    ? result.groups.filter((g) => selectedGroupIds.has(g.id))
    : [];

  const handleOpenTabs = () => {
    if (!result || selectedGroups.length === 0) return;
    onImportAsTabs(selectedGroups, result.fileName);
    setResult(null);
    onClose();
  };

  const handleApplyCurrent = (replace: boolean) => {
    if (!result || selectedGroups.length === 0) return;
    const flatParts = selectedGroups.flatMap((g) => g.parts);
    const matLabel =
      selectedGroups.length === 1 ? selectedGroups[0].materialLabel : undefined;
    onImportToCurrentTab(flatParts, replace, matLabel);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--bg-surface)] border border-[var(--border-main)] flex items-center justify-center text-[var(--accent)]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Импорт спецификации из Excel / CSV
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Поддержка таблиц САПР (Артикул, Цвет RAL, 2 плоскости углов) • Хлыст по умолчанию:{" "}
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {defaultStockLength} мм
                </span>
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Download Sample Banner */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg">
            <div className="text-xs">
              <div className="font-medium text-[var(--text-primary)]">Нужен образец таблицы?</div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Скачайте готовый шаблон или загрузите любую выгрузку .xlsx, .xls, .csv.
              </p>
            </div>
            <button
              onClick={downloadSampleExcel}
              className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-3 py-1.5 rounded border border-[var(--border-main)] transition-colors cursor-pointer shrink-0 ml-3"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Скачать шаблон Excel</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                : "border-[var(--border-input)] hover:border-[var(--accent)]/60 bg-[var(--bg-subtle)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="w-7 h-7 mx-auto text-[var(--text-muted)] mb-2" />
            <div className="text-xs text-[var(--text-primary)] font-medium">
              Перетащите файл сюда или нажмите, чтобы выбрать на компьютере
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Если в файле несколько артикулов или цветов, каждый откроется в своей вкладке
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-4 text-center text-xs text-[var(--text-secondary)] font-mono">
              Чтение и распознавание колонок...
            </div>
          )}

          {/* Parsed Results Preview */}
          {result && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">
                      {result.fileName}:{" "}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      {result.groups.length > 1
                        ? `${result.groups.length} групп (материал + цвет), `
                        : ""}
                      {result.parts.length} уник. позиций ({result.rawRowCount} строк →{" "}
                      {result.totalParts} шт., {result.totalLengthM} м)
                    </span>
                  </div>
                </div>
              </div>

              {result.fractionalRounded.length > 0 && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Округлено дробных длин ({importOptions.roundFractionalUp ? "вверх" : "до ближайшего мм"}):{" "}
                    <strong>{result.fractionalRounded.length}</strong> поз. (например{" "}
                    <span className="font-mono">
                      {result.fractionalRounded[0].rawValue} → {result.fractionalRounded[0].roundedValue} мм
                    </span>
                    ).
                  </span>
                </div>
              )}

              {/* Detected Columns */}
              <div className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-1.5 flex-wrap">
                <span>Колонки:</span>
                {result.detectedColumns.articleCol && (
                  <span className="bg-[var(--bg-muted)] px-1.5 py-0.5 rounded text-[var(--text-primary)]">
                    Артикул: {result.detectedColumns.articleCol}
                  </span>
                )}
                {result.detectedColumns.colorCol && (
                  <span className="bg-[var(--bg-muted)] px-1.5 py-0.5 rounded text-[var(--text-primary)]">
                    Цвет: {result.detectedColumns.colorCol}
                  </span>
                )}
                <span className="bg-[var(--bg-muted)] px-1.5 py-0.5 rounded text-[var(--text-primary)]">
                  Длина: {result.detectedColumns.lengthCol}
                </span>
                <span className="bg-[var(--bg-muted)] px-1.5 py-0.5 rounded text-[var(--text-primary)]">
                  Кол-во: {result.detectedColumns.qtyCol}
                </span>
                {result.detectedColumns.angle1LCol && (
                  <span className="bg-amber-500/15 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300">
                    Углы 1: {result.detectedColumns.angle1LCol} / {result.detectedColumns.angle1RCol}
                  </span>
                )}
                {result.detectedColumns.angle2LCol && (
                  <span className="bg-sky-500/15 px-1.5 py-0.5 rounded text-sky-700 dark:text-sky-300">
                    Углы 2: {result.detectedColumns.angle2LCol} / {result.detectedColumns.angle2RCol}
                  </span>
                )}
              </div>

              {/* Group list if multiple groups, otherwise row preview */}
              {result.groups.length > 1 ? (
                <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-[var(--bg-subtle)] border-b border-[var(--border-main)] flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Группы раскроя по материалам и цветам ({selectedGroups.length} из{" "}
                      {result.groups.length})
                    </span>
                    <button
                      type="button"
                      onClick={toggleAllGroups}
                      className="text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      {selectedGroupIds.size === result.groups.length
                        ? "Снять все"
                        : "Выбрать все"}
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                    {result.groups.map((grp) => {
                      const checked = selectedGroupIds.has(grp.id);
                      const swatch = getRalSwatchColor(grp.colour);
                      return (
                        <label
                          key={grp.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-[var(--bg-hover)]/50 cursor-pointer text-xs"
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleGroup(grp.id)}
                              className="rounded accent-[var(--accent)]"
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-[var(--border-input)]"
                              style={{ backgroundColor: swatch || "transparent" }}
                            />
                            <span className="font-medium text-[var(--text-primary)] truncate font-mono">
                              {grp.article}
                            </span>
                            {grp.colour && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-secondary)] shrink-0">
                                {grp.colour}
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                            {grp.parts.length} поз. &bull; {grp.totalParts} шт. &bull;{" "}
                            {grp.totalLengthM} м
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-[var(--border-main)] rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-main)] sticky top-0 font-normal">
                      <tr>
                        <th className="py-1.5 px-2">№</th>
                        <th className="py-1.5 px-2">Марка</th>
                        <th className="py-1.5 px-2">Длина</th>
                        <th className="py-1.5 px-2">Шт.</th>
                        <th className="py-1.5 px-2">Углы 1</th>
                        <th className="py-1.5 px-2">Углы 2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                      {result.parts.slice(0, 10).map((p, idx) => (
                        <tr key={idx} className="hover:bg-[var(--bg-hover)]/50">
                          <td className="py-1 px-2 text-[var(--text-muted)]">{idx + 1}</td>
                          <td className="py-1 px-2 text-[var(--text-primary)] font-sans">
                            {p.label || "—"}
                          </td>
                          <td className="py-1 px-2 text-[var(--text-primary)] font-bold">
                            {p.length} мм
                          </td>
                          <td className="py-1 px-2 text-[var(--text-primary)]">{p.quantity}</td>
                          <td className="py-1 px-2 text-amber-600 dark:text-amber-300">
                            {p.angle_left ?? 90}° / {p.angle_right ?? 90}°
                          </td>
                          <td className="py-1 px-2 text-sky-600 dark:text-sky-300">
                            {p.angle_extra_left ?? 90}° / {p.angle_extra_right ?? 90}°
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center justify-between flex-wrap gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
          >
            Отмена
          </button>

          {result && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasActiveTab && (
                <>
                  <button
                    onClick={() => handleApplyCurrent(false)}
                    disabled={selectedGroups.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] transition-colors cursor-pointer disabled:opacity-40"
                    title="Добавить детали к текущей активной вкладке"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Добавить в текущую</span>
                  </button>

                  <button
                    onClick={() => handleApplyCurrent(true)}
                    disabled={selectedGroups.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] transition-colors cursor-pointer disabled:opacity-40"
                    title="Заменить детали в текущей активной вкладке"
                  >
                    <span>Заменить текущую</span>
                  </button>
                </>
              )}

              <button
                onClick={handleOpenTabs}
                disabled={selectedGroups.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded transition-colors cursor-pointer disabled:opacity-40"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>
                  {selectedGroups.length > 1
                    ? `Открыть во вкладках (${selectedGroups.length})`
                    : "Открыть в новой вкладке"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
