import React, { useState } from "react";
import { Stock } from "../types";
import { Plus, Trash2 } from "lucide-react";
import { ResizeHandle } from "./ResizeHandle";

interface StockTableProps {
  stocks: Stock[];
  onChange: (stocks: Stock[]) => void;
}

export const StockTable: React.FC<StockTableProps> = ({ stocks, onChange }) => {
  const [tableHeight, setTableHeight] = useState<number>(145);

  const addStock = () => {
    onChange([...stocks, { length: 6100, quantity: undefined }]);
  };

  const removeStock = (index: number) => {
    onChange(stocks.filter((_, i) => i !== index));
  };

  const updateStock = (index: number, field: keyof Stock, value: any) => {
    const updated = [...stocks];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg overflow-hidden flex flex-col">
      <div className="p-3.5 pb-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">Склад заготовок</h3>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Исходные хлысты и заготовки в наличии
          </p>
        </div>
        <button
          onClick={addStock}
          className="flex items-center gap-1 text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] px-2.5 py-1.5 rounded border border-[var(--border-main)] transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span>Добавить</span>
        </button>
      </div>

      <div className="overflow-y-auto px-3.5 py-1.5" style={{ maxHeight: tableHeight }}>
        <table className="w-full text-xs text-left">
          <thead className="text-[var(--text-muted)] font-normal border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-surface)]">
            <tr>
              <th className="py-1.5 px-2 w-8">№</th>
              <th className="py-1.5 px-2">Длина, мм</th>
              <th className="py-1.5 px-2">Количество</th>
              <th className="py-1.5 px-1 w-8 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {stocks.map((stock, i) => (
              <tr key={i} className="hover:bg-[var(--bg-hover)]/50 transition-colors">
                <td className="py-1.5 px-2 text-[var(--text-muted)] font-mono">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    value={stock.length || ""}
                    onChange={(e) =>
                      updateStock(i, "length", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    placeholder="6100"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2 py-1 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
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
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-input)] rounded px-2 py-1 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#dd4b19] placeholder:text-[var(--text-muted)]"
                  />
                </td>
                <td className="py-1.5 px-1 text-right">
                  <button
                    onClick={() => removeStock(i)}
                    className="p-1 text-[var(--text-muted)] hover:text-rose-500 rounded transition-colors cursor-pointer"
                    title="Удалить строку"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-3.5 py-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex justify-between">
        <span>Позиций: {stocks.length}</span>
        <span>Пустое количество = запас не ограничен</span>
      </div>

      <ResizeHandle
        orientation="horizontal"
        onResize={(dy) => setTableHeight((prev) => Math.max(90, Math.min(450, prev + dy)))}
        onReset={() => setTableHeight(145)}
      />
    </div>
  );
};
