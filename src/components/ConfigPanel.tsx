import React from "react";
import { CutConfig } from "../types";

interface ConfigPanelProps {
  config: CutConfig;
  onChange: (config: CutConfig) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange }) => {
  const update = (field: keyof CutConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-3.5">
      <div className="mb-2.5 pb-2 border-b border-[var(--border-subtle)]">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">Технологические параметры</h3>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          Ширина пропила, припуск на торцовку и порог остатка
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
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
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
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
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
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2.5 py-1.5 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
          />
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer bg-[var(--bg-subtle)] border border-[var(--border-input)] hover:border-[#dd4b19]/50 rounded px-2.5 py-1.5 transition-colors h-[30px]">
            <input
              type="checkbox"
              checked={config.two_profiles}
              onChange={(e) => update("two_profiles", e.target.checked)}
              className="rounded border-[var(--border-input)] accent-[#dd4b19] focus:ring-0 cursor-pointer"
            />
            <span className="text-[11px] text-[var(--text-primary)] truncate">Рез в 2 профиля</span>
          </label>
        </div>
      </div>
    </div>
  );
};
