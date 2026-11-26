import React from "react";
import { PlanSummary } from "../types";

interface SummaryStatsProps {
  summary: PlanSummary;
  patternCount: number;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ summary, patternCount }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
      {/* 1. Использовано заготовок */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] border-t-2 border-t-slate-500 rounded-lg p-3 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
          Хлыстов в раскрое
        </span>
        <div className="mt-1.5">
          <div className="text-xl font-bold font-mono text-[var(--text-primary)] leading-tight">
            {summary.total_stocks_used}{" "}
            <span className="text-xs text-[var(--text-muted)] font-normal">шт.</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
            {(summary.total_stock_length / 1000).toFixed(2)} м материала
          </div>
        </div>
      </div>

      {/* 2. Полезный выход (КИМ) */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] border-t-2 border-t-emerald-500 rounded-lg p-3 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
          Полезный выход (КИМ)
        </span>
        <div className="mt-1.5">
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-tight">
            {summary.efficiency_percent.toFixed(2)}%
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
            {(summary.total_parts_length / 1000).toFixed(2)} м в деталях
          </div>
        </div>
      </div>

      {/* 3. Невозвратный отход */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] border-t-2 border-t-amber-500 rounded-lg p-3 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
          Невозвратный отход
        </span>
        <div className="mt-1.5">
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 leading-tight">
            {summary.waste_percent.toFixed(2)}%
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
            {(summary.total_waste_length / 1000).toFixed(2)} м стружка
          </div>
        </div>
      </div>

      {/* 4. Деловые остатки */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] border-t-2 border-t-sky-500 rounded-lg p-3 flex flex-col justify-between">
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
          Деловой остаток
        </span>
        <div className="mt-1.5">
          <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 leading-tight">
            {(summary.total_reusable_length / 1000).toFixed(2)}{" "}
            <span className="text-xs text-[var(--text-muted)] font-normal">м</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
            Полезные остатки на склад
          </div>
        </div>
      </div>

      {/* 5. Карт раскроя */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] border-t-2 border-t-[var(--accent)] rounded-lg p-3 flex flex-col justify-between col-span-2 md:col-span-1">
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
          Карт раскроя
        </span>
        <div className="mt-1.5">
          <div className="text-xl font-bold font-mono text-[var(--text-primary)] leading-tight">
            {patternCount}{" "}
            <span className="text-xs text-[var(--text-muted)] font-normal">карт</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
            {summary.total_parts_placed} из {summary.total_parts_requested} деталей
          </div>
        </div>
      </div>
    </div>
  );
};
