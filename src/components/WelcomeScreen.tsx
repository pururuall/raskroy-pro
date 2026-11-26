import React, { useRef, useState } from "react";
import { AppSettings } from "../types";
import { MobilLogo } from "./MobilLogo";
import { Upload, Plus, Sliders, ArrowRight, FileSpreadsheet, AlertCircle } from "lucide-react";

interface WelcomeScreenProps {
  settings: AppSettings;
  existingTabsCount: number;
  loadingFile: boolean;
  error: string | null;
  onSelectFile: (file: File) => void;
  onStartManual: () => void;
  onOpenSettings: () => void;
  onOpenImportModal: () => void;
  onReturnToTabs: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  settings,
  existingTabsCount,
  loadingFile,
  error,
  onSelectFile,
  onStartManual,
  onOpenSettings,
  onOpenImportModal,
  onReturnToTabs,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className="flex-1 flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] select-none overflow-y-auto relative"
    >
      {/* Clean top bar without sidebar */}
      <div className="px-5 pt-3.5 flex items-center justify-between gap-3">
        <div className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-2">
          <span>{settings.companyName}</span>
          <span>&bull;</span>
          <span>Хлыст по умолчанию: {settings.defaultStockLength} мм</span>
        </div>

        <div className="flex items-center gap-2">
          {existingTabsCount > 0 && (
            <button
              type="button"
              onClick={onReturnToTabs}
              className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-main)] transition-colors cursor-pointer"
            >
              <span>К открытым вкладкам ({existingTabsCount})</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)]" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-3 py-1.5 rounded-lg border border-[var(--border-main)] transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Настройки</span>
          </button>
        </div>
      </div>

      {/* Centered Welcome Hero & Two Interactive Buttons */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-main)] shadow-sm flex items-center justify-center mb-3.5">
            <MobilLogo
              height={28}
              showWordmark={false}
              accentColor="var(--accent)"
              color="var(--text-primary)"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Раскрой Про
          </h1>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mt-2 leading-relaxed">
            Загрузите файл выгрузки из САПР / Excel для автоматического раскроя по вкладкам или
            начните работу вручную на чистом листе.
          </p>
        </div>

        {error && (
          <div className="mb-5 max-w-xl w-full p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl w-full">
          {/* Card 1: Загрузить файл / Импорт */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingFile}
            className={`group relative h-48 rounded-2xl border p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer overflow-hidden shadow-xs ${
              dragActive
                ? "border-2 border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md"
                : "border-[var(--border-main)] bg-[var(--bg-surface)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] hover:shadow-md"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors border ${
                dragActive
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/25 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent)]"
              }`}
            >
              <Upload className={`w-5 h-5 ${loadingFile ? "animate-bounce" : ""}`} />
            </div>

            <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
              {loadingFile ? "Чтение файла..." : "Загрузить файл / Импорт"}
            </div>

            {/* Hover / Drag revealed hint directly on the button surface */}
            <div
              className={`mt-3 w-full rounded-lg border px-3 py-1.5 transition-all duration-200 ${
                dragActive
                  ? "opacity-100 translate-y-0 border-[var(--accent)]/40 bg-[var(--bg-surface)]/90"
                  : "opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 border-[var(--accent)]/35 bg-[var(--bg-surface)]/90"
              }`}
            >
              <div className="text-xs font-semibold text-[var(--accent)]">
                Перетащите файл или выберите файл
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                .xlsx, .xls, .csv &bull; вкладки по материалам
              </div>
            </div>
          </button>

          {/* Card 2: Начать с нуля */}
          <button
            type="button"
            onClick={onStartManual}
            className="group relative h-48 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-surface)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:shadow-md p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer overflow-hidden shadow-xs"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-main)] flex items-center justify-center mb-3 transition-colors group-hover:bg-[var(--text-primary)] group-hover:text-[var(--bg-surface)] group-hover:border-[var(--text-primary)]">
              <Plus className="w-6 h-6" />
            </div>

            <div className="text-sm font-semibold text-[var(--text-primary)]">
              Начать с нуля
            </div>

            {/* Hover revealed hidden hint directly on the button surface */}
            <div className="mt-3 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-1.5 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Начать вручную
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Откроет пустую рабочую область без демо-данных
              </div>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenImportModal}
          className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Предпросмотр импорта / скачать шаблон Excel</span>
        </button>
      </div>
    </div>
  );
};
