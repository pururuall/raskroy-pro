import React, { useState, useRef } from "react";
import { Part } from "../types";
import { parseExcelFile, downloadSampleExcel, ImportResult } from "../utils/excelImport";
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
} from "lucide-react";

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newParts: Part[], replace: boolean) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const parsed = await parseExcelFile(file);
      setResult(parsed);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка чтения Excel-файла.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleApply = (replace: boolean) => {
    if (!result) return;
    onImport(result.parts, replace);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--bg-surface)] border border-[var(--border-main)] flex items-center justify-center text-[#dd4b19]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Импорт спецификации из Excel
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Загрузка деталей из файлов .xlsx, .xls, .csv
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
        <div className="p-6 space-y-4">
          {/* Download Sample Banner */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg">
            <div className="text-xs">
              <div className="font-medium text-[var(--text-primary)]">Нужен образец таблицы?</div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Скачайте готовый шаблон с правильными названиями колонок и углами в 2-х плоскостях.
              </p>
            </div>
            <button
              onClick={downloadSampleExcel}
              className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-3 py-1.5 rounded border border-[var(--border-main)] transition-colors cursor-pointer shrink-0 ml-3"
            >
              <Download className="w-3.5 h-3.5 text-[#dd4b19]" />
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
                ? "border-[#dd4b19] bg-[#dd4b19]/10"
                : "border-[var(--border-input)] hover:border-[#dd4b19]/50 bg-[var(--bg-subtle)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="w-7 h-7 mx-auto text-[var(--text-muted)] mb-2" />
            <div className="text-xs text-[var(--text-primary)] font-medium">
              Перетащите сюда Excel-файл со спецификацией
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              или нажмите, чтобы выбрать файл на компьютере (.xlsx, .xls, .csv)
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
              Чтение и распознавание колонок Excel...
            </div>
          )}

          {/* Parsed Results Preview */}
          {result && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">
                      {result.fileName}:{" "}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      распознано {result.parts.length} позиций ({result.totalParts} шт.,{" "}
                      {result.totalLengthM} м)
                    </span>
                  </div>
                </div>
              </div>

              {/* Detected Columns pill */}
              <div className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-2 flex-wrap">
                <span>Колонки:</span>
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
                    Углы 2 (доп): {result.detectedColumns.angle2LCol} /{" "}
                    {result.detectedColumns.angle2RCol}
                  </span>
                )}
              </div>

              {/* Table Preview */}
              <div className="max-h-48 overflow-y-auto border border-[var(--border-main)] rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-main)] sticky top-0 font-normal">
                    <tr>
                      <th className="py-1.5 px-2">№</th>
                      <th className="py-1.5 px-2">Марка</th>
                      <th className="py-1.5 px-2">Длина</th>
                      <th className="py-1.5 px-2">Шт.</th>
                      <th className="py-1.5 px-2">Углы 1 (осн)</th>
                      <th className="py-1.5 px-2">Углы 2 (доп)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                    {result.parts.slice(0, 8).map((p, idx) => (
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

              {result.parts.length > 8 && (
                <div className="text-center text-[10px] text-[var(--text-muted)] font-mono">
                  + еще {result.parts.length - 8} позиций...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
          >
            Отмена
          </button>

          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApply(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded border border-[var(--border-main)] transition-colors cursor-pointer"
                title="Добавить импортированные детали к существующим"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Добавить к текущим</span>
              </button>

              <button
                onClick={() => handleApply(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#dd4b19] hover:bg-[#c53f12] text-white font-medium rounded transition-colors cursor-pointer"
                title="Очистить текущие детали и вставить импортированные"
              >
                <span>Заменить спецификацию</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
