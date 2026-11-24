import React, { useState, useEffect } from "react";
import { Part, AnglePreset } from "../types";
import {
  Plus,
  Trash2,
  SlidersHorizontal,
  CheckCheck,
  FileSpreadsheet,
  Download,
  Box,
} from "lucide-react";
import { downloadSampleExcel } from "../utils/excelImport";

interface PartsTableProps {
  parts: Part[];
  onChange: (parts: Part[]) => void;
  hoveredLength: number | null;
  onHoverLength: (length: number | null) => void;
  presets?: AnglePreset[];
  onOpenImport?: () => void;
}

export const DEFAULT_ANGLE_PRESETS: AnglePreset[] = [
  { id: "p-90-90", name: "90° / 90° (Прямой)", left: 90, right: 90 },
  { id: "p-45-45", name: "45° / 45° (Рама / Створка)", left: 45, right: 45 },
  { id: "p-45-90", name: "45° / 90° (Примыкание)", left: 45, right: 90 },
  { id: "p-90-45", name: "90° / 45° (Примыкание)", left: 90, right: 45 },
  { id: "p-135-90", name: "135° / 90° (Эркер)", left: 135, right: 90 },
  { id: "p-135-45", name: "135° / 45° (Фасадный)", left: 135, right: 45 },
  { id: "p-60-60", name: "60° / 60° (Фонарь/Купол)", left: 60, right: 60 },
  { id: "p-22.5-22.5", name: "22.5° / 22.5° (8-гранник)", left: 22.5, right: 22.5 },
];

/**
 * Renders a tiny SVG glyph showing the cut profile shape with left & right bevels.
 */
function MiniAngleGlyph({
  left,
  right,
  isPlane2 = false,
}: {
  left: number;
  right: number;
  isPlane2?: boolean;
}) {
  const w = 26;
  const h = 13;
  const leftOffset = left === 90 ? 0 : left < 90 ? 4 : -4;
  const rightOffset = right === 90 ? 0 : right < 90 ? -4 : 4;

  const tl = `${Math.max(0, leftOffset)},0`;
  const bl = `${Math.max(0, -leftOffset)},${h}`;
  const br = `${Math.min(w, w - Math.max(0, -rightOffset))},${h}`;
  const tr = `${Math.min(w, w - Math.max(0, rightOffset))},0`;

  return (
    <svg
      width={w}
      height={h}
      className={`shrink-0 stroke-current ${
        isPlane2
          ? "text-sky-400 fill-sky-500/10"
          : "text-amber-400 fill-amber-500/10"
      }`}
    >
      <polygon points={`${tl} ${tr} ${br} ${bl}`} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export const PartsTable: React.FC<PartsTableProps> = ({
  parts,
  onChange,
  hoveredLength,
  onHoverLength,
  presets = DEFAULT_ANGLE_PRESETS,
  onOpenImport,
}) => {
  const hasExtraAngles = parts.some(
    (p) =>
      (p.angle_extra_left !== undefined && p.angle_extra_left !== 90) ||
      (p.angle_extra_right !== undefined && p.angle_extra_right !== 90)
  );

  const [showPlane2, setShowPlane2] = useState<boolean>(hasExtraAngles);
  const [customModeRows, setCustomModeRows] = useState<Record<number, boolean>>({});
  const [bulkPresetId, setBulkPresetId] = useState<string>("");

  useEffect(() => {
    if (hasExtraAngles) {
      setShowPlane2(true);
    }
  }, [hasExtraAngles]);

  const addPart = () => {
    onChange([
      ...parts,
      {
        length: 2000,
        quantity: 1,
        angle_left: 90,
        angle_right: 90,
        angle_extra_left: 90,
        angle_extra_right: 90,
      },
    ]);
  };

  const removePart = (index: number) => {
    onChange(parts.filter((_, i) => i !== index));
    const next = { ...customModeRows };
    delete next[index];
    setCustomModeRows(next);
  };

  const updatePart = (index: number, field: keyof Part, value: any) => {
    const updated = [...parts];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const toggleCustomMode = (index: number) => {
    setCustomModeRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const applyBulkPreset = (presetId: string) => {
    if (!presetId) return;
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    const updated = parts.map((p) => ({
      ...p,
      angle_left: preset.left,
      angle_right: preset.right,
    }));
    onChange(updated);
    setBulkPresetId("");
  };

  const totalParts = parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalLength = parts.reduce((sum, p) => sum + (p.length || 0) * (p.quantity || 0), 0);

  return (
      <div className="bg-[#17171a] border border-white/[0.08] rounded-lg p-4 flex flex-col">
        {/* Header Toolbar */}
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06] flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-medium text-[#ededed]">Спецификация деталей</h3>
              <span className="text-[10px] text-[#9ea3ae] bg-[#222226] px-1.5 py-0.2 rounded font-mono">
                {parts.length} поз.
              </span>
            </div>
            <p className="text-[11px] text-[#9ea3ae] mt-0.5">Требуемые отрезки для текущего заказа</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle 2nd plane (Наклон диска / фасадный скос) */}
            <button
              onClick={() => setShowPlane2(!showPlane2)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors cursor-pointer ${
                showPlane2
                  ? "bg-sky-500/15 border-sky-500/40 text-sky-300 font-medium"
                  : "bg-[#222226] border-white/[0.08] text-[#9ea3ae] hover:text-[#ededed]"
              }`}
              title="Переключить отображение углов во 2-й плоскости (наклон диска пилы)"
            >
              <Box className="w-3.5 h-3.5" />
              <span>2 плоскости {showPlane2 ? "(3D)" : ""}</span>
            </button>

            {/* Import from Excel button */}
            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="flex items-center gap-1.5 text-xs text-[#ededed] bg-[#222226] hover:bg-[#2c2c32] px-2.5 py-1.5 rounded border border-white/[0.08] transition-colors cursor-pointer"
                title="Загрузить детали из Excel файла"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#dd4b19]" />
                <span>Импорт Excel</span>
              </button>
            )}

            {/* Download Sample Excel */}
            <button
              onClick={downloadSampleExcel}
              className="p-1.5 text-[#9ea3ae] hover:text-[#ededed] bg-[#222226] hover:bg-[#2c2c32] rounded border border-white/[0.08] transition-colors cursor-pointer"
              title="Скачать образец таблицы Excel для импорта"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Bulk angle assign */}
            {parts.length > 1 && (
              <div className="relative hidden md:block">
                <select
                  value={bulkPresetId}
                  onChange={(e) => applyBulkPreset(e.target.value)}
                  className="bg-[#222226] hover:bg-[#2c2c32] text-[11px] text-[#9ea3ae] rounded border border-white/[0.08] px-2 py-1.5 focus:outline-none cursor-pointer"
                  title="Задать угол для всех деталей в списке"
                >
                  <option value="">Угол для всех...</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Add manual row */}
            <button
              onClick={addPart}
              className="flex items-center gap-1 text-xs text-white bg-[#dd4b19] hover:bg-[#c53f12] px-2.5 py-1.5 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Добавить</span>
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto max-h-[360px]">
          <table className={`w-full text-xs text-left ${showPlane2 ? "min-w-[680px]" : "min-w-[500px]"}`}>
            <thead className="text-[#6b7280] font-normal border-b border-white/[0.06] sticky top-0 bg-[#17171a] z-10">
              <tr>
                <th className="py-1.5 px-1.5 w-7">№</th>
                <th className="py-1.5 px-1.5 w-24">Марка</th>
                <th className="py-1.5 px-1.5 w-20">Длина, мм</th>
                <th className="py-1.5 px-1.5 w-14">Шт.</th>
                <th className="py-1.5 px-1.5">Углы 1 (поворот L/R)</th>
                {showPlane2 && (
                  <th className="py-1.5 px-1.5 text-sky-400">Углы 2 (наклон L/R)</th>
                )}
                <th className="py-1.5 px-1 w-7 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {parts.map((part, i) => {
                const isHovered = hoveredLength === part.length;
                const leftAngle = part.angle_left ?? 90;
                const rightAngle = part.angle_right ?? 90;
                const leftExtra = part.angle_extra_left ?? 90;
                const rightExtra = part.angle_extra_right ?? 90;

                const matchingPreset = presets.find(
                  (p) => p.left === leftAngle && p.right === rightAngle
                );
                const isCustom = customModeRows[i] || !matchingPreset;

                return (
                  <tr
                    key={i}
                    onMouseEnter={() => onHoverLength(part.length)}
                    onMouseLeave={() => onHoverLength(null)}
                    className={`transition-colors ${
                      isHovered ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-1.5 px-1.5 text-[#6b7280] font-mono">{i + 1}</td>

                    {/* Part Label / Mark */}
                    <td className="py-1.5 px-1.5">
                      <input
                        type="text"
                        value={part.label || ""}
                        onChange={(e) => updatePart(i, "label", e.target.value)}
                        placeholder="Р-1"
                        className="w-full min-w-[82px] bg-[#121214] border border-white/[0.08] rounded px-2 py-1 text-[#ededed] text-[11px] focus:outline-none focus:border-[#dd4b19]"
                        title="Марка / обозначение детали"
                      />
                    </td>

                    {/* Length */}
                    <td className="py-1.5 px-1.5">
                      <input
                        type="number"
                        value={part.length || ""}
                        onChange={(e) =>
                          updatePart(i, "length", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        placeholder="2700"
                        className="w-full min-w-[60px] bg-[#121214] border border-white/[0.08] rounded px-2 py-1 text-[#ededed] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-1.5 px-1.5">
                      <input
                        type="number"
                        value={part.quantity || ""}
                        onChange={(e) =>
                          updatePart(i, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                        }
                        placeholder="1"
                        className="w-full min-w-[44px] bg-[#121214] border border-white/[0.08] rounded px-2 py-1 text-center text-[#ededed] font-mono text-xs focus:outline-none focus:border-[#dd4b19]"
                      />
                    </td>

                    {/* Plane 1: Primary Angles */}
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <MiniAngleGlyph left={leftAngle} right={rightAngle} />

                        {isCustom ? (
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-[#6b7280]">L:</span>
                            <input
                              type="number"
                              step="0.5"
                              value={leftAngle}
                              onChange={(e) =>
                                updatePart(i, "angle_left", parseFloat(e.target.value) || 0)
                              }
                              className="w-13 bg-[#121214] border border-white/[0.1] rounded px-1 py-0.5 text-[#ededed] text-center focus:outline-none focus:border-[#dd4b19]"
                            />
                            <span className="text-[#6b7280]">°</span>
                            <span className="text-[#6b7280] ml-0.5">R:</span>
                            <input
                              type="number"
                              step="0.5"
                              value={rightAngle}
                              onChange={(e) =>
                                updatePart(i, "angle_right", parseFloat(e.target.value) || 0)
                              }
                              className="w-13 bg-[#121214] border border-white/[0.1] rounded px-1 py-0.5 text-[#ededed] text-center focus:outline-none focus:border-[#dd4b19]"
                            />
                            <span className="text-[#6b7280]">°</span>
                            <button
                              type="button"
                              onClick={() => toggleCustomMode(i)}
                              className="p-1 text-[#9ea3ae] hover:text-[#ededed] bg-[#222226] rounded border border-white/[0.08] transition-colors ml-0.5 cursor-pointer"
                              title="Выбрать из готовых шаблонов"
                            >
                              <CheckCheck className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 flex-1">
                            <select
                              value={matchingPreset ? matchingPreset.id : "custom"}
                              onChange={(e) => {
                                if (e.target.value === "custom") {
                                  toggleCustomMode(i);
                                  return;
                                }
                                const preset = presets.find((p) => p.id === e.target.value);
                                if (preset) {
                                  const updated = [...parts];
                                  updated[i] = {
                                    ...updated[i],
                                    angle_left: preset.left,
                                    angle_right: preset.right,
                                  };
                                  onChange(updated);
                                }
                              }}
                              className="bg-[#121214] border border-white/[0.08] rounded px-2 py-1 text-[#ededed] font-mono text-[11px] focus:outline-none focus:border-white/30 flex-1"
                            >
                              {presets.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                              <option value="custom">Свой угол (L / R)...</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => toggleCustomMode(i)}
                              className="p-1 text-[#6b7280] hover:text-[#ededed] rounded transition-colors cursor-pointer"
                              title="Ввести произвольные градусы"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Plane 2: Extra Angles (Tilt / Bevel) */}
                    {showPlane2 && (
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <MiniAngleGlyph left={leftExtra} right={rightExtra} isPlane2={true} />
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-sky-400/80">L2:</span>
                            <input
                              type="number"
                              step="0.5"
                              value={leftExtra}
                              onChange={(e) =>
                                updatePart(i, "angle_extra_left", parseFloat(e.target.value) || 0)
                              }
                              className="w-13 bg-[#121214] border border-sky-500/30 rounded px-1 py-0.5 text-sky-200 text-center focus:outline-none focus:border-sky-400"
                              title="Угол наклона диска пилы слева (плоскость 2)"
                            />
                            <span className="text-sky-400/60">°</span>
                            <span className="text-sky-400/80 ml-0.5">R2:</span>
                            <input
                              type="number"
                              step="0.5"
                              value={rightExtra}
                              onChange={(e) =>
                                updatePart(i, "angle_extra_right", parseFloat(e.target.value) || 0)
                              }
                              className="w-13 bg-[#121214] border border-sky-500/30 rounded px-1 py-0.5 text-sky-200 text-center focus:outline-none focus:border-sky-400"
                              title="Угол наклона диска пилы справа (плоскость 2)"
                            />
                            <span className="text-sky-400/60">°</span>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Delete Row */}
                    <td className="py-1.5 px-1 text-right">
                      <button
                        onClick={() => removePart(i)}
                        className="p-1 text-[#6b7280] hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Удалить позицию"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#6b7280] flex justify-between font-mono flex-wrap gap-2">
          <span>Всего позиций: {parts.length} ({totalParts} шт.)</span>
          <span>Суммарно: <strong className="text-[#ededed] font-medium">{(totalLength / 1000).toFixed(2)} м</strong></span>
        </div>
      </div>
  );
};
