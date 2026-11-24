import React from "react";
import { Stock } from "../types";
import { Plus, Trash2 } from "lucide-react";

interface StockTableProps {
  stocks: Stock[];
  onChange: (stocks: Stock[]) => void;
}

export const StockTable: React.FC<StockTableProps> = ({ stocks, onChange }) => {
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
    <div className="bg-[#17171a] border border-white/[0.08] rounded-lg p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06]">
        <div>
          <h3 className="text-xs font-medium text-[#ededed]">Склад заготовок</h3>
          <p className="text-[11px] text-[#9ea3ae] mt-0.5">Исходные хлысты и заготовки в наличии</p>
        </div>
        <button
          onClick={addStock}
          className="flex items-center gap-1 text-xs text-[#ededed] bg-[#222226] hover:bg-[#2c2c32] px-2.5 py-1.5 rounded border border-white/[0.08] transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#9ea3ae]" />
          <span>Добавить</span>
        </button>
      </div>

      <div className="overflow-y-auto max-h-[220px]">
        <table className="w-full text-xs text-left">
          <thead className="text-[#6b7280] font-normal border-b border-white/[0.06]">
            <tr>
              <th className="py-1.5 px-2 w-8">№</th>
              <th className="py-1.5 px-2">Длина, мм</th>
              <th className="py-1.5 px-2">Количество</th>
              <th className="py-1.5 px-1 w-8 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {stocks.map((stock, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-1.5 px-2 text-[#6b7280] font-mono">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    value={stock.length || ""}
                    onChange={(e) => updateStock(i, "length", Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="6100"
                    className="w-full bg-[#121214] border border-white/[0.08] rounded px-2 py-1 text-[#ededed] font-mono text-xs focus:outline-none focus:border-white/30"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    value={stock.quantity ?? ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      updateStock(i, "quantity", val === "" ? undefined : Math.max(0, parseInt(val) || 0));
                    }}
                    placeholder="Без ограничений"
                    className="w-full bg-[#121214] border border-white/[0.08] rounded px-2 py-1 text-[#ededed] font-mono text-xs focus:outline-none focus:border-white/30 placeholder:text-[#6b7280]"
                  />
                </td>
                <td className="py-1.5 px-1 text-right">
                  <button
                    onClick={() => removeStock(i)}
                    className="p-1 text-[#6b7280] hover:text-[#ededed] rounded transition-colors cursor-pointer"
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

      <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#6b7280] flex justify-between">
        <span>Позиций: {stocks.length}</span>
        <span>Пустое количество = запас не ограничен</span>
      </div>
    </div>
  );
};
