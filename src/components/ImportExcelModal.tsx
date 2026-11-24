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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-[#17171a] border border-white/[0.1] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#121214]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#202024] border border-white/[0.1] flex items-center justify-center text-[#dd4b19]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-[#ededed]">Импорт спецификации из Excel</h2>
              <p className="text-[11px] text-[#9ea3ae]">Загрузка деталей из файлов .xlsx, .xls, .csv</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#9ea3ae] hover:text-[#ededed] rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Download Sample Banner */}
          <div className="flex items-center justify-between p-3 bg-[#121214] border border-white/[0.06] rounded-lg">
            <div className="text-xs">
              <div className="font-medium text-[#ededed] flex items-center gap-1.5">
                <span>Нужен образец таблицы?</span>
              </div>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                Скачайте готовый шаблон с правильными названиями колонок и углами в 2-х плоскостях.
              </p>
            </div>
            <button
              onClick={downloadSampleExcel}
              className="flex items-center gap-1.5 text-xs text-[#ededed] bg-[#222226] hover:bg-[#2c2c32] px-3 py-1.5 rounded border border-white/[0.08] transition-colors cursor-pointer shrink-0 ml-3"
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
                : "border-white/[0.12] hover:border-white/30 bg-[#121214]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="w-7 h-7 mx-auto text-[#9ea3ae] mb-2" />
            <div className="text-xs text-[#ededed] font-medium">
              Перетащите сюда Excel-файл со спецификацией
            </div>
            <p className="text-[11px] text-[#6b7280] mt-1">
              или нажмите, чтобы выбрать файл на компьютере (.xlsx, .xls, .csv)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[#1e1517] border border-rose-500/20 rounded text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-4 text-center text-xs text-[#9ea3ae] font-mono">
              Чтение и распознавание колонок Excel...
            </div>
          )}

          {/* Parsed Results Preview */}
          {result && (
            <div className="space-y-3">
              <div className="p-3 bg-[#131b15] border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-medium text-[#ededed]">{result.fileName}: </span>
                    <span className="text-emerald-300">
                      распознано {result.parts.length} позиций ({result.totalParts} шт., {result.totalLengthM} м)
                    </span>
                  </div>
                </div>
              </div>

              {/* Detected Columns pill */}
              <div className="text-[11px] text-[#6b7280] font-mono flex items-center gap-2 flex-wrap">
                <span>Колонки:</span>
                <span className="bg-[#202024] px-1.5 py-0.5 rounded text-[#ededed]">
                  Длина: {result.detectedColumns.lengthCol}
                </span>
                <span className="bg-[#202024] px-1.5 py-0.5 rounded text-[#ededed]">
                  Кол-во: {result.detectedColumns.qtyCol}
                </span>
                {result.detectedColumns.angle1LCol && (
                  <span className="bg-[#202024] px-1.5 py-0.5 rounded text-amber-300">
                    Углы 1: {result.detectedColumns.angle1LCol} / {result.detectedColumns.angle1RCol}
                  </span>
                )}
                {result.detectedColumns.angle2LCol && (
                  <span className="bg-[#202024] px-1.5 py-0.5 rounded text-sky-300">
                    Углы 2 (доп): {result.detectedColumns.angle2LCol} / {result.detectedColumns.angle2RCol}
                  </span>
                )}
              </div>

              {/* Table Preview */}
              <div className="max-h-48 overflow-y-auto border border-white/[0.08] rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#121214] text-[#6b7280] border-b border-white/[0.06] sticky top-0 font-normal">
                    <tr>
                      <th className="py-1.5 px-2">№</th>
                      <th className="py-1.5 px-2">Марка</th>
                      <th className="py-1.5 px-2">Длина</th>
                      <th className="py-1.5 px-2">Шт.</th>
                      <th className="py-1.5 px-2">Углы 1 (осн)</th>
                      <th className="py-1.5 px-2">Углы 2 (доп)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono text-[11px]">
                    {result.parts.slice(0, 8).map((p, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-1 px-2 text-[#6b7280]">{idx + 1}</td>
                        <td className="py-1 px-2 text-[#ededed] font-sans">{p.label || "—"}</td>
                        <td className="py-1 px-2 text-[#ededed] font-bold">{p.length} мм</td>
                        <td className="py-1 px-2 text-[#ededed]">{p.quantity}</td>
                        <td className="py-1 px-2 text-amber-300">
                          {p.angle_left ?? 90}° / {p.angle_right ?? 90}°
                        </td>
                        <td className="py-1 px-2 text-sky-300">
                          {p.angle_extra_left ?? 90}° / {p.angle_extra_right ?? 90}°
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.parts.length > 8 && (
                <div className="text-center text-[10px] text-[#6b7280] font-mono">
                  + еще {result.parts.length - 8} позиций...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#121214] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[#9ea3ae] hover:text-[#ededed] rounded transition-colors cursor-pointer"
          >
            Отмена
          </button>

          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApply(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#222226] hover:bg-[#2c2c32] text-[#ededed] rounded border border-white/[0.08] transition-colors cursor-pointer"
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
