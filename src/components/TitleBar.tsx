import React, { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MobilLogo } from "./MobilLogo";
import { Minus, Square, Copy, X } from "lucide-react";

interface TitleBarProps {
  appVersion: string;
  documentTitle?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ appVersion, documentTitle }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized).catch(() => {});

    let unlisten: (() => void) | undefined;
    win
      .onResized(() => {
        win.isMaximized().then(setIsMaximized).catch(() => {});
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = () => {
    if (!isTauri()) return;
    getCurrentWindow().minimize().catch(() => {});
  };

  const handleToggleMaximize = () => {
    if (!isTauri()) return;
    getCurrentWindow().toggleMaximize().catch(() => {});
  };

  const handleClose = () => {
    if (!isTauri()) return;
    getCurrentWindow().close().catch(() => {});
  };

  return (
    <div className="h-8 shrink-0 bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] border-b border-[var(--sidebar-border)] flex items-center justify-between select-none no-print z-40">
      {/* Left draggable identity cluster */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleToggleMaximize}
        className="flex-1 h-full flex items-center gap-2.5 px-3 min-w-0 cursor-default"
      >
        <div className="flex items-center gap-2 pointer-events-none min-w-0">
          <MobilLogo height={14} showWordmark={false} accentColor="var(--accent)" color="#f1f5f9" />
          <span className="text-[11.5px] font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            Раскрой Про
          </span>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            v{appVersion}
          </span>
          {documentTitle && (
            <span className="text-[11px] text-slate-400 truncate hidden md:inline">
              &bull; {documentTitle}
            </span>
          )}
        </div>
      </div>

      {/* Right native-style caption buttons (excluded from drag region) */}
      <div className="flex items-center h-full shrink-0">
        <button
          type="button"
          onClick={handleMinimize}
          aria-label="Свернуть окно"
          title="Свернуть"
          className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5 stroke-[1.6]" />
        </button>

        <button
          type="button"
          onClick={handleToggleMaximize}
          aria-label={isMaximized ? "Восстановить окно" : "Развернуть окно"}
          title={isMaximized ? "Восстановить" : "Развернуть"}
          className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 stroke-[1.6] -scale-x-100" />
          ) : (
            <Square className="w-3 h-3 stroke-[1.6]" />
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Закрыть программу"
          title="Закрыть"
          className="w-11 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#c42b1c] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5 stroke-[1.6]" />
        </button>
      </div>
    </div>
  );
};
