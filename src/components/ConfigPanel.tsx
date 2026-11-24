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
    <div className="bg-[#17171a] border border-white/[0.08] rounded-lg p-4">
      <div className="mb-3 pb-2.5 border-b border-white/[0.06]">
        <h3 className="text-xs font-medium text-[#ededed]">Технологические параметры</h3>
        <p className="text-[11px] text-[#9ea3ae] mt-0.5">Ширина пропила, припуск на торцовку и порог остатка</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="text-[#9ea3ae] text-[11px] block mb-1">
            Ширина пропила, мм
          </label>
          <input
            type="number"
            value={config.cut_width}
            onChange={(e) => update("cut_width", Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-[#121214] border border-white/[0.08] rounded px-2.5 py-1.5 text-[#ededed] font-mono text-xs focus:outline-none focus:border-white/30"
          />
        </div>

        <div>
          <label className="text-[#9ea3ae] text-[11px] block mb-1">
            Торцовка кромки, мм
          </label>
          <input
            type="number"
            value={config.trim_left}
            onChange={(e) => update("trim_left", Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-[#121214] border border-white/[0.08] rounded px-2.5 py-1.5 text-[#ededed] font-mono text-xs focus:outline-none focus:border-white/30"
          />
        </div>

        <div>
          <label className="text-[#9ea3ae] text-[11px] block mb-1">
            Деловой остаток от, мм
          </label>
          <input
            type="number"
            value={config.min_remnant}
            onChange={(e) => update("min_remnant", Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-[#121214] border border-white/[0.08] rounded px-2.5 py-1.5 text-[#ededed] font-mono text-xs focus:outline-none focus:border-white/30"
          />
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer bg-[#121214] border border-white/[0.08] hover:border-white/[0.14] rounded px-3 py-1.5 transition-colors h-[32px]">
            <input
              type="checkbox"
              checked={config.two_profiles}
              onChange={(e) => update("two_profiles", e.target.checked)}
              className="rounded bg-[#17171a] border-white/20 text-[#f59e0b] focus:ring-0 cursor-pointer"
            />
            <span className="text-[11px] text-[#ededed]">Рез в 2 профиля</span>
          </label>
        </div>
      </div>
    </div>
  );
};
