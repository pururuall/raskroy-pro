import React from "react";
import { PlanSummary } from "../types";

interface SummaryStatsProps {
  summary: PlanSummary;
  patternCount: number;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ summary, patternCount }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/[0.06] border border-white/[0.08] rounded-lg overflow-hidden">
      {/* 1. Использовано заготовок */}
      <div className="bg-[#17171a] p-3.5 flex flex-col justify-between">
        <span className="text-xs text-[#9ea3ae]">Хлыстов в раскрое</span>
        <div className="mt-2">
          <div className="text-2xl font-medium font-mono text-[#ededed]">
            {summary.total_stocks_used} <span className="text-xs text-[#6b7280] font-normal">шт.</span>
          </div>
          <div className="text-[11px] text-[#6b7280] font-mono mt-0.5">
            {(summary.total_stock_length / 1000).toFixed(2)} м материала
          </div>
        </div>
      </div>

      {/* 2. Полезный выход (КИМ) - Главный показатель */}
      <div className="bg-[#17171a] p-3.5 flex flex-col justify-between">
        <span className="text-xs text-[#9ea3ae]">Полезный выход (КИМ)</span>
        <div className="mt-2">
          <div className="text-2xl font-medium font-mono text-[#ededed]">
            {summary.efficiency_percent.toFixed(2)}%
          </div>
          <div className="text-[11px] text-[#6b7280] font-mono mt-0.5">
            {(summary.total_parts_length / 1000).toFixed(2)} м в деталях
          </div>
        </div>
      </div>

      {/* 3. Невозвратный отход */}
      <div className="bg-[#17171a] p-3.5 flex flex-col justify-between">
        <span className="text-xs text-[#9ea3ae]">Невозвратный отход</span>
        <div className="mt-2">
          <div className="text-2xl font-medium font-mono text-[#ededed]">
            {summary.waste_percent.toFixed(2)}%
          </div>
          <div className="text-[11px] text-[#6b7280] font-mono mt-0.5">
            {(summary.total_waste_length / 1000).toFixed(2)} м стружка
          </div>
        </div>
      </div>

      {/* 4. Деловые остатки */}
      <div className="bg-[#17171a] p-3.5 flex flex-col justify-between">
        <span className="text-xs text-[#9ea3ae]">Деловой остаток</span>
        <div className="mt-2">
          <div className="text-2xl font-medium font-mono text-[#ededed]">
            {(summary.total_reusable_length / 1000).toFixed(2)} <span className="text-xs text-[#6b7280] font-normal">м</span>
          </div>
          <div className="text-[11px] text-[#6b7280] font-mono mt-0.5">
            Полезные остатки на склад
          </div>
        </div>
      </div>

      {/* 5. Карт раскроя */}
      <div className="bg-[#17171a] p-3.5 flex flex-col justify-between col-span-2 md:col-span-1">
        <span className="text-xs text-[#9ea3ae]">Карт раскроя</span>
        <div className="mt-2">
          <div className="text-2xl font-medium font-mono text-[#ededed]">
            {patternCount} <span className="text-xs text-[#6b7280] font-normal">карт</span>
          </div>
          <div className="text-[11px] text-[#6b7280] font-mono mt-0.5">
            {summary.total_parts_placed} из {summary.total_parts_requested} деталей
          </div>
        </div>
      </div>
    </div>
  );
};
