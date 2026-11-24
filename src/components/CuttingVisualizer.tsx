import React, { useState } from "react";
import { CuttingPattern } from "../types";
import { Printer, Copy, Check, Eye } from "lucide-react";

interface CuttingVisualizerProps {
  patterns: CuttingPattern[];
  hoveredLength: number | null;
  onHoverLength: (length: number | null) => void;
  onOpenReport?: () => void;
}

// Consistent engineering solid tones (industrial palette)
const getPartStyle = (len: number, isHovered: boolean) => {
  if (isHovered) {
    return "bg-[#dd4b19] text-white border-[#ea580c] z-20";
  }
  const tones = [
    "bg-[#252529] text-[#ededed] border-white/10 hover:bg-[#2e2e34]",
    "bg-[#2c2c32] text-[#ededed] border-white/10 hover:bg-[#35353d]",
    "bg-[#222226] text-[#ededed] border-white/10 hover:bg-[#2a2a30]",
    "bg-[#2f2f35] text-[#ededed] border-white/10 hover:bg-[#383840]",
    "bg-[#28282e] text-[#ededed] border-white/10 hover:bg-[#313138]",
  ];
  const idx = Math.abs(len * 17) % tones.length;
  return tones[idx];
};

/**
 * Computes CSS clip-path polygon for beveled/slanted cut angles in visual bar.
 */
function getCutClipPath(left: number = 90, right: number = 90, slantPx: number = 6): string {
  if (left === 90 && right === 90) return "none";

  let tl = "0% 0%";
  let bl = "0% 100%";
  let tr = "100% 0%";
  let br = "100% 100%";

  if (left < 90) {
    tl = "0% 0%";
    bl = `${slantPx}px 100%`;
  } else if (left > 90) {
    tl = `${slantPx}px 0%`;
    bl = "0% 100%";
  }

  if (right < 90) {
    tr = `calc(100% - ${slantPx}px) 0%`;
    br = "100% 100%";
  } else if (right > 90) {
    tr = "100% 0%";
    br = `calc(100% - ${slantPx}px) 100%`;
  }

  return `polygon(${tl}, ${tr}, ${br}, ${bl})`;
}

export const CuttingVisualizer: React.FC<CuttingVisualizerProps> = ({
  patterns,
  hoveredLength,
  onHoverLength,
  onOpenReport,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAnglesOnBar, setShowAnglesOnBar] = useState<boolean>(true);

  const handlePrint = () => {
    if (onOpenReport) {
      onOpenReport();
    } else {
      window.print();
    }
  };

  const copyPatternText = (pattern: CuttingPattern, index: number) => {
    const partsStr = pattern.parts
      .map((p) => {
        const mark = p.label ? `[${p.label}] ` : "";
        const angles1 = `∠${p.angle_left ?? 90}°/∠${p.angle_right ?? 90}°`;
        const hasExtra = (p.angle_extra_left ?? 90) !== 90 || (p.angle_extra_right ?? 90) !== 90;
        const angles2 = hasExtra ? ` [Пл.2: ∠${p.angle_extra_left}°/∠${p.angle_extra_right}°]` : "";
        return `${mark}${p.length} мм (${angles1}${angles2})`;
      })
      .join(" + ");
    const text = `Карта #${index + 1} (${pattern.count} шт. по ${pattern.stock_length} мм): ${partsStr} | Остаток: ${pattern.remnant_length} мм`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  if (patterns.length === 0) {
    return (
      <div className="bg-[#17171a] border border-white/[0.08] rounded-lg p-12 text-center text-[#6b7280] text-xs font-mono">
        Нет данных для отображения. Заполните спецификацию и нажмите «Обновить».
      </div>
    );
  }

  return (
    <div className="bg-[#17171a] border border-white/[0.08] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-white/[0.06] flex-wrap gap-2">
        <div>
          <h3 className="text-xs font-medium text-[#ededed]">Карты раскроя ({patterns.length} типов)</h3>
          <p className="text-[11px] text-[#9ea3ae] mt-0.5">Чертежные схемы распила хлыстов с углами в 2-х плоскостях</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnglesOnBar(!showAnglesOnBar)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors cursor-pointer ${
              showAnglesOnBar
                ? "bg-[#dd4b19]/15 border-[#dd4b19]/40 text-[#f59e0b]"
                : "bg-[#222226] border-white/[0.08] text-[#9ea3ae] hover:text-[#ededed]"
            }`}
            title="Переключить видимость меток углов на полосе раскроя"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Углы</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs text-[#ededed] bg-[#222226] hover:bg-[#2c2c32] px-3 py-1.5 rounded border border-white/[0.08] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#9ea3ae]" />
            <span>Печать карт</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {patterns.map((pattern, pIdx) => {
          const totalStockLen = pattern.stock_length;
          const isReusable = pattern.remnant_type === "Reusable";

          return (
            <div
              key={pIdx}
              className="bg-[#121214] border border-white/[0.08] rounded-lg p-3.5 hover:border-white/[0.14] transition-colors"
            >
              {/* Pattern Header */}
              <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[#9ea3ae] font-mono text-[11px]">
                    #{pIdx + 1}
                  </span>
                  <span className="font-medium text-[#ededed] font-mono">
                    {pattern.count} хлыст{pattern.count === 1 ? "" : pattern.count < 5 ? "а" : "ов"}
                  </span>
                  <span className="text-[#6b7280] font-mono text-[11px]">
                    L={pattern.stock_length} мм
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-[#9ea3ae]">
                    Расход: <span className="text-[#ededed]">{pattern.used_length} мм</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      isReusable
                        ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        : "bg-white/[0.04] text-[#9ea3ae] border border-white/[0.06]"
                    }`}
                  >
                    {isReusable
                      ? `Деловой остаток: ${pattern.remnant_length} мм`
                      : `Отход: ${pattern.remnant_length} мм`}
                  </span>
                  <button
                    onClick={() => copyPatternText(pattern, pIdx)}
                    className="p-1 text-[#6b7280] hover:text-[#ededed] rounded transition-colors cursor-pointer"
                    title="Скопировать строку карты"
                  >
                    {copiedIndex === pIdx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Engineering Cut Bar with Visual Bevels */}
              <div className="relative h-12 bg-[#17171a] border border-white/[0.12] rounded overflow-hidden flex items-stretch p-0.5 gap-[1px]">
                {pattern.parts.map((part, partIdx) => {
                  const widthPercent = (part.length / totalStockLen) * 100;
                  const isHovered = hoveredLength === part.length;
                  const partClass = getPartStyle(part.length, isHovered);
                  const leftAngle = part.angle_left ?? 90;
                  const rightAngle = part.angle_right ?? 90;
                  const leftExtra = part.angle_extra_left ?? 90;
                  const rightExtra = part.angle_extra_right ?? 90;
                  const hasBevel = leftAngle !== 90 || rightAngle !== 90;
                  const hasExtra = leftExtra !== 90 || rightExtra !== 90;
                  const clipPath = getCutClipPath(leftAngle, rightAngle, 6);

                  return (
                    <div
                      key={partIdx}
                      style={{
                        width: `${widthPercent}%`,
                        clipPath: clipPath !== "none" ? clipPath : undefined,
                      }}
                      onMouseEnter={() => onHoverLength(part.length)}
                      onMouseLeave={() => onHoverLength(null)}
                      className={`relative h-full flex flex-col items-center justify-center font-mono text-xs border rounded-sm transition-all cursor-pointer ${partClass}`}
                      title={`Деталь: ${part.label ? part.label + " • " : ""}${part.length} мм | Плоскость 1: L=${leftAngle}°, R=${rightAngle}°${hasExtra ? ` | Плоскость 2: L2=${leftExtra}°, R2=${rightExtra}°` : ""}`}
                    >
                      {part.label && (
                        <span className="text-[9px] text-[#ededed]/70 font-sans leading-none truncate max-w-full px-1">
                          {part.label}
                        </span>
                      )}

                      <span className="truncate px-1 text-[11px] font-bold leading-tight">
                        {part.length}
                      </span>

                      {/* Cut Angle Badges inside segment */}
                      {showAnglesOnBar && (hasBevel || hasExtra) && widthPercent > 8 && (
                        <div className="flex items-center gap-1 text-[8px] font-mono leading-none scale-90">
                          {hasBevel && (
                            <span className="text-amber-300">
                              ∠{leftAngle}°/{rightAngle}°
                            </span>
                          )}
                          {hasExtra && (
                            <span className="text-sky-300">
                              3D:{leftExtra}°/{rightExtra}°
                            </span>
                          )}
                        </div>
                      )}

                      {/* Visual Miter Angle Slant Guides */}
                      {leftAngle !== 90 && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-400/50 pointer-events-none"
                          style={{
                            transform: `skewX(${leftAngle < 90 ? -15 : 15}deg)`,
                          }}
                        />
                      )}
                      {rightAngle !== 90 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-[2px] bg-amber-400/50 pointer-events-none"
                          style={{
                            transform: `skewX(${rightAngle < 90 ? -15 : 15}deg)`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Remnant bar at the end */}
                {pattern.remnant_length > 0 && (
                  <div
                    style={{ width: `${(pattern.remnant_length / totalStockLen) * 100}%` }}
                    className={`h-full flex items-center justify-center font-mono text-[10px] rounded-sm transition-colors ${
                      isReusable
                        ? "pattern-reusable text-sky-400 border border-sky-500/20"
                        : "pattern-waste text-[#6b7280] border border-white/[0.04]"
                    }`}
                    title={
                      isReusable
                        ? `Деловой остаток на склад: ${pattern.remnant_length} мм`
                        : `Невозвратный отход: ${pattern.remnant_length} мм`
                    }
                  >
                    <span className="truncate px-1">
                      {isReusable ? `+${pattern.remnant_length}` : `${pattern.remnant_length}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Technical sequence of cuts with angles in 2 planes */}
              <div className="mt-2 text-[11px] text-[#6b7280] font-mono flex items-center gap-1.5 flex-wrap">
                <span className="text-[#9ea3ae]">Распил:</span>
                {pattern.parts.map((p, idx) => {
                  const hasAngle1 = (p.angle_left ?? 90) !== 90 || (p.angle_right ?? 90) !== 90;
                  const hasAngle2 = (p.angle_extra_left ?? 90) !== 90 || (p.angle_extra_right ?? 90) !== 90;

                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => onHoverLength(p.length)}
                      onMouseLeave={() => onHoverLength(null)}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                        hoveredLength === p.length
                          ? "bg-[#dd4b19] text-white font-medium shadow"
                          : "bg-[#202024] text-[#ededed]"
                      }`}
                    >
                      {p.label && <span className="text-amber-300 font-sans">{p.label}:</span>}
                      <span>{p.length} мм</span>
                      {hasAngle1 && (
                        <span className="text-[10px] text-amber-300 font-normal">
                          (∠{p.angle_left ?? 90}°/{p.angle_right ?? 90}°)
                        </span>
                      )}
                      {hasAngle2 && (
                        <span className="text-[10px] text-sky-300 font-normal">
                          [Пл.2: {p.angle_extra_left ?? 90}°/{p.angle_extra_right ?? 90}°]
                        </span>
                      )}
                    </span>
                  );
                })}
                <span className="text-[#6b7280]">&rarr;</span>
                <span className={isReusable ? "text-sky-400" : "text-[#9ea3ae]"}>
                  остаток {pattern.remnant_length} мм
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
