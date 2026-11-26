import React, { useState } from "react";
import { Stock } from "../types";
import { Plus, Trash2, Scissors } from "lucide-react";
import { ResizeHandle } from "./ResizeHandle";

interface StockTableProps {
  stocks: Stock[];
  defaultStockLength?: number;
  onChange: (stocks: Stock[]) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  defaultStockLength = 6000,
  onChange,
}) => {
  const [tableHeight, setTableHeight] = useState<number>(155);

  const addStock = (isRemnant = false) => {
    onChange([
      ...stocks,
      {
        length: isRemnant ? 3000 : defaultStockLength,
        quantity: isRemnant ? 1 : undefined,
        is_remnant: isRemnant,
      },
    ]);
  };

  const removeStock = (index: number) => {
    onChange(stocks.filter((_, i) => i !== index));
  };

  const updateStock = (index: number, field: keyof Stock, value: any) => {
    const updated = [...stocks];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const remnantCount = stocks.filter((s) => Boolean(s.is_remnant)).length;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg overflow-hidden flex flex-col">
      <div className="p-3.5 pb-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">Склад заготовок</h3>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Исходные хлысты и деловые обрезки в наличии
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => addStock(true)}
            className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1.5 rounded border border-amber-500/30 transition-colors cursor-pointer"
            title="Добавить приоритетный обрезок / остаток со склада"
          >
            <Scissors className="w-3 h-3" />
            <span>+ Обрезок</span>
          </button>
          <button
            type="button"
            onClick={() => addStock(false)}
            className="flex items-center gap-1 text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] px-2.5 py-1.5 rounded border border-[var(--border-main)] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Добавить</span>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-3.5 py-1.5" style={{ maxHeight: tableHeight }}>
        {stocks.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <div className="text-xs font-medium text-[var(--text-secondary)]">Склад пока пуст</div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Нажмите «+ Добавить», чтобы добавить заготовку {defaultStockLength} мм или обрезок со
              склада
            </p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="text-[var(--text-muted)] font-normal border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-surface)]">
              <tr>
                <th className="py-1.5 px-2 w-8">№</th>
                <th className="py-1.5 px-2">Длина, мм</th>
                <th className="py-1.5 px-2">Количество</th>
                <th className="py-1.5 px-2 w-24">Приоритет</th>
                <th className="py-1.5 px-1 w-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {stocks.map((stock, i) => {
                const isRemnant = Boolean(stock.is_remnant);
                return (
                  <tr key={i} className="hover:bg-[var(--bg-hover)]/50 transition-colors">
                    <td className="py-1.5 px-2 text-[var(--text-muted)] font-mono">{i + 1}</td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        value={stock.length || ""}
                        onChange={(e) =>
                          updateStock(i, "length", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        placeholder={String(defaultStockLength)}
                        className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2 py-1 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        value={stock.quantity ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          updateStock(
                            i,
                            "quantity",
                            val === "" ? undefined : Math.max(0, parseInt(val) || 0)
                          );
                        }}
                        placeholder="Без ограничений"
                        className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2 py-1 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <button
                        type="button"
                        onClick={() => updateStock(i, "is_remnant", !isRemnant)}
                        title={
                          isRemnant
                            ? "Обрезок (1-я очередь): программа старается сработать эти заготовки в первую очередь"
                            : "Нажмите, чтобы отметить как обрезок / остаток со склада (расходуется в 1-ю очередь)"
                        }
                        className={`w-full h-7 px-2 rounded border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                          isRemnant
                            ? "bg-amber-500/15 border-amber-500/45 text-amber-700 dark:text-amber-300"
                            : "bg-[var(--bg-subtle)] border-[var(--border-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40"
                        }`}
                      >
                        {isRemnant ? (
                          <>
                            <Scissors className="w-3 h-3 shrink-0" />
                            <span>Обрезок</span>
                          </>
                        ) : (
                          <span>Целый</span>
                        )}
                      </button>
                    </td>
                    <td className="py-1.5 px-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeStock(i)}
                        className="p-1 text-[var(--text-muted)] hover:text-rose-500 rounded transition-colors cursor-pointer"
                        title="Удалить строку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-3.5 py-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex justify-between gap-2 flex-wrap">
        <span>
          Позиций: {stocks.length}
          {remnantCount > 0 ? ` • Обрезков (1-я очер.): ${remnantCount}` : ""}
        </span>
        <span>Пустое количество = запас не ограничен</span>
      </div>

      <ResizeHandle
        orientation="horizontal"
        onResize={(dy) => setTableHeight((prev) => Math.max(90, Math.min(450, prev + dy)))}
        onReset={() => setTableHeight(155)}
      />
    </div>
  );
};
