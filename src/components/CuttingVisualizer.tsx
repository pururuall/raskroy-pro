import React, { useState, useRef, useEffect } from "react";
import {
  BarDensity,
  CUTTING_ALGORITHMS,
  CuttingAlgorithm,
  CuttingPattern,
} from "../types";
import { Printer, Copy, Check, Eye, Cpu } from "lucide-react";
import { ResizeHandle } from "./ResizeHandle";

interface CuttingVisualizerProps {
  patterns: CuttingPattern[];
  hoveredLength: number | null;
  onHoverLength: (length: number | null) => void;
  onOpenReport?: () => void;
  barDensity?: BarDensity;
  onBarDensityChange?: (density: BarDensity) => void;
  trimLeft?: number;
  trimRight?: number;
  activeAlgorithm?: CuttingAlgorithm;
  onOpenAlgorithmSettings?: () => void;
}

interface SegmentPalette {
  fill: string;
  stroke: string;
  text: string;
  angleText: string;
}

// High-contrast industrial colors inspired by architectural drawings (no AI gradients)
const SEGMENT_PALETTE: SegmentPalette[] = [
  { fill: "#1e3a5f", stroke: "#0f233d", text: "#ffffff", angleText: "#cbd5e1" },
  { fill: "#d97706", stroke: "#b45309", text: "#ffffff", angleText: "#fef3c7" },
  { fill: "#0f766e", stroke: "#115e59", text: "#ffffff", angleText: "#ccfbf1" },
  { fill: "#2563eb", stroke: "#1d4ed8", text: "#ffffff", angleText: "#dbeafe" },
  { fill: "#475569", stroke: "#334155", text: "#ffffff", angleText: "#e2e8f0" },
];

const HOVER_PALETTE: SegmentPalette = {
  fill: "#dd4b19",
  stroke: "#9a3412",
  text: "#ffffff",
  angleText: "#ffedd5",
};

function getPartPalette(len: number, label: string | undefined, isHovered: boolean): SegmentPalette {
  if (isHovered) return HOVER_PALETTE;
  const seed = label
    ? label.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), len)
    : len * 17;
  return SEGMENT_PALETTE[Math.abs(seed) % SEGMENT_PALETTE.length];
}

/**
 * Computes horizontal cut slant (px) from angle in degrees.
 * 90° => 0px; <90° => positive slant; >90° => negative slant.
 */
function computeBevelOffset(angleDeg: number, height: number, maxWidth: number): number {
  const clamped = Math.max(15, Math.min(165, angleDeg));
  if (Math.abs(clamped - 90) < 0.5) return 0;

  const rad = (clamped * Math.PI) / 180;
  // At 45°: cot(45°) = 1 => shift by ~0.7 * height so miter slope is unmistakable
  const raw = height * 0.7 * (1 / Math.tan(rad));
  const limit = Math.min(height * 0.85, maxWidth * 0.28);
  return Math.max(-limit, Math.min(limit, raw));
}

function SmallCutShapeGlyph({ left, right }: { left: number; right: number }) {
  const w = 22;
  const h = 11;
  const lOff = left === 90 ? 0 : left < 90 ? 4 : -4;
  const rOff = right === 90 ? 0 : right < 90 ? 4 : -4;

  const tlX = lOff >= 0 ? 1 : 1 - lOff;
  const blX = lOff >= 0 ? 1 + lOff : 1;
  const trX = rOff >= 0 ? w - 1 : w - 1 + rOff;
  const brX = rOff >= 0 ? w - 1 - rOff : w - 1;

  return (
    <svg width={w} height={h} className="shrink-0 stroke-current fill-current/15">
      <polygon
        points={`${tlX},1 ${trX},1 ${brX},${h - 1} ${blX},${h - 1}`}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface BarSvgProps {
  pattern: CuttingPattern;
  barHeight: number;
  hoveredLength: number | null;
  onHoverLength: (length: number | null) => void;
  showAngles: boolean;
  trimLeft?: number;
  trimRight?: number;
}

const PatternSvgBar: React.FC<BarSvgProps> = ({
  pattern,
  barHeight,
  hoveredLength,
  onHoverLength,
  showAngles,
  trimLeft = 0,
  trimRight = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState<number>(680);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setBarWidth(el.clientWidth || 680);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setBarWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const totalLen = Math.max(1, pattern.stock_length);
  const isReusable = pattern.remnant_type === "Reusable";
  const scale = barWidth / totalLen;
  const patternId = `hatch-${pattern.stock_length}-${isReusable ? "re" : "ws"}`;

  let cursorX = trimLeft * scale;

  return (
    <div
      ref={containerRef}
      className="w-full rounded border border-[var(--border-main)] bg-[var(--bar-track)] overflow-hidden"
      style={{ height: barHeight }}
    >
      <svg
        width={barWidth}
        height={barHeight}
        viewBox={`0 0 ${barWidth} ${barHeight}`}
        className="block select-none"
      >
        <defs>
          <pattern
            id={patternId}
            width="8"
            height="8"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke={isReusable ? "var(--bar-reusable-stroke)" : "var(--bar-waste-stroke)"}
              strokeWidth="2"
            />
          </pattern>
        </defs>

        {pattern.parts.map((part, idx) => {
          // Use exact start_pos/end_pos if available, or sequential fallback
          const xStart =
            typeof part.start_pos === "number" ? part.start_pos * scale : cursorX;
          const xEnd =
            typeof part.end_pos === "number"
              ? part.end_pos * scale
              : xStart + part.length * scale;
          const w = Math.max(4, xEnd - xStart);
          cursorX = xEnd;

          const leftAngle = part.angle_left ?? 90;
          const rightAngle = part.angle_right ?? 90;
          const leftExtra = part.angle_extra_left ?? 90;
          const rightExtra = part.angle_extra_right ?? 90;
          const hasExtraL = leftExtra !== 90;
          const hasExtraR = rightExtra !== 90;

          const lSlant = computeBevelOffset(leftAngle, barHeight, w);
          const rSlant = computeBevelOffset(rightAngle, barHeight, w);

          // Left < 90 => top outer, bottom inner (\); Left > 90 => top inner, bottom outer (/)
          const tlX = lSlant >= 0 ? xStart + 0.5 : xStart + Math.abs(lSlant) + 0.5;
          const blX = lSlant >= 0 ? xStart + lSlant + 0.5 : xStart + 0.5;

          // Right < 90 => top outer, bottom inner (/); Right > 90 => top inner, bottom outer (\)
          const trX = rSlant >= 0 ? xEnd - 0.5 : xEnd - Math.abs(rSlant) - 0.5;
          const brX = rSlant >= 0 ? xEnd - rSlant - 0.5 : xEnd - 0.5;

          const safeLeft = Math.max(tlX, blX);
          const safeRight = Math.min(trX, brX);
          const safeWidth = Math.max(0, safeRight - safeLeft);

          const isHovered = hoveredLength === part.length;
          const palette = getPartPalette(part.length, part.label, isHovered);

          const showLeftAngle = showAngles && leftAngle !== 90 && safeWidth >= 82;
          const showRightAngle = showAngles && rightAngle !== 90 && safeWidth >= 82;
          const textStart = safeLeft + (showLeftAngle ? 26 : 0);
          const textEnd = safeRight - (showRightAngle ? 26 : 0);
          const innerTextWidth = Math.max(0, textEnd - textStart);
          const centerX = (textStart + textEnd) / 2;

          const fullText = part.label ? `${part.label} · ${part.length}` : `${part.length}`;
          const lenText = `${part.length}`;
          const fullTextNeedPx = fullText.length * 7.6 + 14;
          const lenTextNeedPx = lenText.length * 7.2 + 8;

          const mainLabel =
            part.label && innerTextWidth >= fullTextNeedPx
              ? fullText
              : innerTextWidth >= Math.max(28, lenTextNeedPx)
              ? lenText
              : "";

          const fontSize = innerTextWidth >= 42 ? (barHeight <= 30 ? 11.5 : 12.5) : 9.5;

          return (
            <g
              key={idx}
              onMouseEnter={() => onHoverLength(part.length)}
              onMouseLeave={() => onHoverLength(null)}
              className="cursor-pointer"
            >
              <title>
                {`${part.label ? part.label + " • " : ""}${part.length} мм | Пл.1: L=${leftAngle}°, R=${rightAngle}°${
                  hasExtraL || hasExtraR ? ` | Пл.2 (наклон): L2=${leftExtra}°, R2=${rightExtra}°` : ""
                }`}
              </title>

              <polygon
                points={`${tlX},1 ${trX},1 ${brX},${barHeight - 1} ${blX},${barHeight - 1}`}
                fill={palette.fill}
                stroke={palette.stroke}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />

              {/* Highlighted angled edge strokes so miter direction pops */}
              {leftAngle !== 90 && (
                <line
                  x1={tlX}
                  y1={1.5}
                  x2={blX}
                  y2={barHeight - 1.5}
                  stroke="#fbbf24"
                  strokeWidth="2"
                />
              )}
              {rightAngle !== 90 && (
                <line
                  x1={trX}
                  y1={1.5}
                  x2={brX}
                  y2={barHeight - 1.5}
                  stroke="#fbbf24"
                  strokeWidth="2"
                />
              )}

              {/* 2nd Plane (3D blade tilt) dashed indicator lines */}
              {hasExtraL && (
                <line
                  x1={tlX + 4}
                  y1={2}
                  x2={blX + 4}
                  y2={barHeight - 2}
                  stroke="#38bdf8"
                  strokeWidth="1.6"
                  strokeDasharray="3 2"
                />
              )}
              {hasExtraR && (
                <line
                  x1={trX - 4}
                  y1={2}
                  x2={brX - 4}
                  y2={barHeight - 2}
                  stroke="#38bdf8"
                  strokeWidth="1.6"
                  strokeDasharray="3 2"
                />
              )}

              {/* Left / Right corner angle readouts when space allows */}
              {showLeftAngle && (
                <text
                  x={safeLeft + 4}
                  y={barHeight / 2 + 3.5}
                  fill={palette.angleText}
                  fontSize="9.5"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="600"
                  textAnchor="start"
                >
                  {leftAngle}°
                </text>
              )}

              {showRightAngle && (
                <text
                  x={safeRight - 4}
                  y={barHeight / 2 + 3.5}
                  fill={palette.angleText}
                  fontSize="9.5"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {rightAngle}°
                </text>
              )}

              {/* Centered Length (and optional mark) */}
              {mainLabel && (
                <text
                  x={centerX}
                  y={barHeight / 2 + 4}
                  fill={palette.text}
                  fontSize={fontSize}
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {mainLabel}
                </text>
              )}
            </g>
          );
        })}

        {/* Optional leading edge trim */}
        {trimLeft > 0 && (
          <g>
            <title>{`Торцовка левой кромки: ${trimLeft} мм`}</title>
            <rect
              x={0}
              y={1}
              width={Math.max(2, trimLeft * scale)}
              height={barHeight - 2}
              fill={`url(#${patternId})`}
              stroke="var(--bar-waste-stroke)"
              strokeWidth="1"
            />
          </g>
        )}

        {/* Remnant segment */}
        {pattern.remnant_length > 0 && (() => {
          const remStart = Math.max(
            0,
            (pattern.stock_length - pattern.remnant_length - trimRight) * scale
          );
          const remW = Math.max(2, pattern.remnant_length * scale);
          return (
            <g>
              <title>
                {isReusable
                  ? `Деловой остаток на склад: ${pattern.remnant_length} мм`
                  : `Невозвратный отход: ${pattern.remnant_length} мм`}
              </title>
              <rect
                x={remStart + 0.5}
                y={1}
                width={Math.max(1, remW - 1)}
                height={barHeight - 2}
                fill={isReusable ? "var(--bar-reusable-fill)" : `url(#${patternId})`}
                stroke={isReusable ? "var(--bar-reusable-stroke)" : "var(--bar-waste-stroke)"}
                strokeWidth="1"
              />
              {remW >= 32 && (
                <text
                  x={remStart + remW / 2}
                  y={barHeight / 2 + 3.5}
                  fill={isReusable ? "var(--bar-reusable-text)" : "var(--bar-waste-text)"}
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                  fontWeight={isReusable ? "700" : "500"}
                  textAnchor="middle"
                >
                  {isReusable ? `+${pattern.remnant_length}` : `${pattern.remnant_length}`}
                </text>
              )}
            </g>
          );
        })()}

        {/* Optional trailing edge trim */}
        {trimRight > 0 && (
          <g>
            <title>{`Торцовка правой кромки: ${trimRight} мм`}</title>
            <rect
              x={Math.max(0, barWidth - Math.max(2, trimRight * scale))}
              y={1}
              width={Math.max(2, trimRight * scale)}
              height={barHeight - 2}
              fill={`url(#${patternId})`}
              stroke="var(--bar-waste-stroke)"
              strokeWidth="1"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

export const CuttingVisualizer: React.FC<CuttingVisualizerProps> = ({
  patterns,
  hoveredLength,
  onHoverLength,
  onOpenReport,
  barDensity = "compact",
  onBarDensityChange,
  trimLeft = 0,
  trimRight = 0,
  activeAlgorithm = "auto",
  onOpenAlgorithmSettings,
}) => {
  const activeAlgoInfo =
    CUTTING_ALGORITHMS.find((a) => a.id === activeAlgorithm) || CUTTING_ALGORITHMS[0];
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAnglesOnBar, setShowAnglesOnBar] = useState<boolean>(true);
  const [listMaxHeight, setListMaxHeight] = useState<number>(620);

  const barHeight = barDensity === "compact" ? 28 : barDensity === "normal" ? 36 : 44;

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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-12 text-center text-[var(--text-muted)] text-xs font-mono">
        Нет данных для отображения. Заполните спецификацию и нажмите «Обновить».
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg overflow-hidden flex flex-col">
      <div className="p-3.5 pb-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Карты раскроя ({patterns.length} типов)
            </h3>
            {onOpenAlgorithmSettings && (
              <button
                type="button"
                onClick={onOpenAlgorithmSettings}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[#dd4b19] border border-[var(--border-main)] transition-colors cursor-pointer"
                title={activeAlgoInfo.howItWorks}
              >
                <Cpu className="w-3 h-3 text-[#dd4b19]" />
                <span>{activeAlgoInfo.name}</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Векторная геометрия срезов: жёлтый срез — угол пл. 1, пунктир — наклон пл. 2
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Bar Thickness Toggle */}
          {onBarDensityChange && (
            <div className="flex items-center bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => onBarDensityChange("compact")}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  barDensity === "compact"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="Узкие компактные полосы (28 px)"
              >
                Узкие
              </button>
              <button
                type="button"
                onClick={() => onBarDensityChange("normal")}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  barDensity === "normal"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="Средняя высота полос (36 px)"
              >
                Средние
              </button>
              <button
                type="button"
                onClick={() => onBarDensityChange("tall")}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  barDensity === "tall"
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="Широкие полосы (44 px)"
              >
                Крупные
              </button>
            </div>
          )}

          <button
            onClick={() => setShowAnglesOnBar(!showAnglesOnBar)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors cursor-pointer ${
              showAnglesOnBar
                ? "bg-[#dd4b19]/10 border-[#dd4b19]/40 text-[#dd4b19] font-medium"
                : "bg-[var(--bg-subtle)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            title="Показывать или скрывать градусы прямо на полосе"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Углы</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] px-3 py-1.5 rounded border border-[var(--border-main)] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Печать карт</span>
          </button>
        </div>
      </div>

      {/* Scrollable & Vertically Resizable Pattern List */}
      <div
        className="overflow-y-auto p-3 space-y-2.5"
        style={{ maxHeight: listMaxHeight }}
      >
        {patterns.map((pattern, pIdx) => {
          const isReusable = pattern.remnant_type === "Reusable";

          return (
            <div
              key={pIdx}
              className="bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg p-2.5 hover:border-[#dd4b19]/40 transition-colors"
            >
              {/* Pattern Header */}
              <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)] font-mono text-[11px]">
                    #{pIdx + 1}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] font-mono">
                    {pattern.count} хлыст{pattern.count === 1 ? "" : pattern.count < 5 ? "а" : "ов"}
                  </span>
                  <span className="text-[var(--text-muted)] font-mono text-[11px]">
                    L={pattern.stock_length} мм
                  </span>
                </div>

                <div className="flex items-center gap-2.5 font-mono text-[11px]">
                  <span className="text-[var(--text-secondary)]">
                    Расход: <strong className="text-[var(--text-primary)]">{pattern.used_length} мм</strong>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      isReusable
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25"
                        : "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-main)]"
                    }`}
                  >
                    {isReusable
                      ? `Деловой остаток: ${pattern.remnant_length} мм`
                      : `Отход: ${pattern.remnant_length} мм`}
                  </span>
                  <button
                    onClick={() => copyPatternText(pattern, pIdx)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
                    title="Скопировать строку карты"
                  >
                    {copiedIndex === pIdx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Vector SVG Bar with Real Geometric Bevels */}
              <PatternSvgBar
                pattern={pattern}
                barHeight={barHeight}
                hoveredLength={hoveredLength}
                onHoverLength={onHoverLength}
                showAngles={showAnglesOnBar}
                trimLeft={trimLeft}
                trimRight={trimRight}
              />

              {/* Compact Visual Angle Sequence Chips */}
              <div className="mt-2 text-[11px] font-mono flex items-center gap-1.5 flex-wrap">
                <span className="text-[var(--text-secondary)]">Распил:</span>
                {pattern.parts.map((p, idx) => {
                  const aL = p.angle_left ?? 90;
                  const aR = p.angle_right ?? 90;
                  const eL = p.angle_extra_left ?? 90;
                  const eR = p.angle_extra_right ?? 90;
                  const hasAngle1 = aL !== 90 || aR !== 90;
                  const hasAngle2 = eL !== 90 || eR !== 90;
                  const isHovered = hoveredLength === p.length;

                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => onHoverLength(p.length)}
                      onMouseLeave={() => onHoverLength(null)}
                      className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                        isHovered
                          ? "bg-[#dd4b19] text-white border-[#dd4b19] font-medium"
                          : "bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-main)]"
                      }`}
                    >
                      {hasAngle1 && <SmallCutShapeGlyph left={aL} right={aR} />}
                      {p.label && (
                        <span className={isHovered ? "text-white/90 font-sans" : "text-[var(--text-secondary)] font-sans"}>
                          {p.label}:
                        </span>
                      )}
                      <span className="font-semibold">{p.length}</span>
                      {hasAngle1 && (
                        <span className={isHovered ? "text-amber-100" : "text-amber-600 font-medium"}>
                          ({aL}°/{aR}°)
                        </span>
                      )}
                      {hasAngle2 && (
                        <span className={isHovered ? "text-sky-100" : "text-sky-600 font-medium"}>
                          [Пл.2:{eL}°/{eR}°]
                        </span>
                      )}
                    </span>
                  );
                })}
                <span className="text-[var(--text-muted)]">&rarr;</span>
                <span
                  className={
                    isReusable
                      ? "text-sky-600 font-semibold"
                      : "text-[var(--text-secondary)]"
                  }
                >
                  ост. {pattern.remnant_length} мм
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Vertical Height Resizer */}
      <ResizeHandle
        orientation="horizontal"
        onResize={(dy) =>
          setListMaxHeight((prev) => Math.max(200, Math.min(1100, prev + dy)))
        }
        onReset={() => setListMaxHeight(620)}
      />
    </div>
  );
};
