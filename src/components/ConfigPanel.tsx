import React from "react";
import { CutConfig, STOCK_PRIORITY_MODES, StockPriorityMode } from "../types";

interface ConfigPanelProps {
  config: CutConfig;
  onChange: (config: CutConfig) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange }) => {
  const update = (field: keyof CutConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const activePriority: StockPriorityMode = config.stock_priority || "min_total_length";
  const activePriorityInfo =
    STOCK_PRIORITY_MODES.find((m) => m.id === activePriority) || STOCK_PRIORITY_MODES[0];

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3.5 space-y-2.5">
      <div className="pb-2 border-b border-[var(--border-subtle)]">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">Технологические параметры</h3>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          Ширина пропила, припуск на торцовку, остаток и приоритет обрезков
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div>
          <label className="text-[var(--text-secondary)] text-[11px] block mb-1">
            Ширина пропила, мм
          </label>
          <input
            type="number"
            value={config.cut_width}
            onChange={(e) => update("cut_width", Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="text-[var(--text-secondary)] text-[11px] block mb-1">
            Торцовка кромки, мм
          </label>
          <input
            type="number"
            value={config.trim_left}
            onChange={(e) => update("trim_left", Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="text-[var(--text-secondary)] text-[11px] block mb-1">
            Деловой остаток от, мм
          </label>
          <input
            type="number"
            value={config.min_remnant}
            onChange={(e) => update("min_remnant", Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer bg-[var(--bg-subtle)] border border-[var(--border-input)] hover:border-[var(--accent)]/50 rounded px-2.5 py-1.5 transition-colors h-[30px]">
            <input
              type="checkbox"
              checked={config.two_profiles}
              onChange={(e) => update("two_profiles", e.target.checked)}
              className="rounded border-[var(--border-input)] accent-[var(--accent)] focus:ring-0 cursor-pointer"
            />
            <span className="text-[11px] text-[var(--text-primary)] truncate">Рез в 2 профиля</span>
          </label>
        </div>
      </div>

      {/* Stock / Remnant Priority Switcher */}
      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 flex-wrap">
        <span
          className="text-[11px] text-[var(--text-secondary)] shrink-0"
          title={activePriorityInfo.description}
        >
          Приоритет склада:
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {STOCK_PRIORITY_MODES.map((m) => {
            const isSel = activePriority === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => update("stock_priority", m.id)}
                title={m.description}
                className={`px-2 py-1 rounded text-[10.5px] font-medium border transition-colors cursor-pointer ${
                  isSel
                    ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)]"
                    : "bg-[var(--bg-subtle)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {m.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
