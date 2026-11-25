import React from "react";
import {
  CuttingPlan,
  DocumentMeta,
  AppSettings,
  CuttingPattern,
  DEFAULT_REPORT_CONFIG,
  ReportDisplaySettings,
} from "../types";
import { MobilLogo } from "./MobilLogo";

interface PrintReportProps {
  plan: CuttingPlan;
  meta: DocumentMeta;
  onMetaChange?: (meta: DocumentMeta) => void;
  cutWidth: number;
  trimLeft: number;
  trimRight: number;
  minRemnant: number;
  twoProfiles: boolean;
  settings?: AppSettings;
  isPreview?: boolean;
}

function computePrintBevel(angleDeg: number, height: number, maxWidth: number): number {
  const clamped = Math.max(15, Math.min(165, angleDeg));
  if (Math.abs(clamped - 90) < 0.5) return 0;
  const rad = (clamped * Math.PI) / 180;
  const raw = height * 0.68 * (1 / Math.tan(rad));
  const limit = Math.min(height * 0.85, maxWidth * 0.28);
  return Math.max(-limit, Math.min(limit, raw));
}

function PrintSvgBar({
  pat,
  trimLeft,
  trimRight,
  reportCfg,
}: {
  pat: CuttingPattern;
  trimLeft: number;
  trimRight: number;
  reportCfg: ReportDisplaySettings;
}) {
  const W = 760;
  const H =
    reportCfg.diagramBarHeight === "compact"
      ? 24
      : reportCfg.diagramBarHeight === "tall"
      ? 38
      : 30;
  const totalLen = Math.max(1, pat.stock_length);
  const scale = W / totalLen;
  const isReusable = pat.remnant_type === "Reusable";
  let cursorX = trimLeft * scale;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto border-2 border-black bg-white block mb-1.5"
    >
      <defs>
        <pattern
          id="print-hatch"
          width="6"
          height="6"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#a3a3a3" strokeWidth="1.2" />
        </pattern>
      </defs>

      {trimLeft > 0 && (
        <rect
          x={0}
          y={0.5}
          width={Math.max(2, trimLeft * scale)}
          height={H - 1}
          fill="url(#print-hatch)"
          stroke="#000000"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {pat.parts.map((part, idx) => {
        const xStart = typeof part.start_pos === "number" ? part.start_pos * scale : cursorX;
        const xEnd =
          typeof part.end_pos === "number" ? part.end_pos * scale : xStart + part.length * scale;
        const w = Math.max(4, xEnd - xStart);
        cursorX = xEnd;

        const leftAngle = part.angle_left ?? 90;
        const rightAngle = part.angle_right ?? 90;
        const lSlant = computePrintBevel(leftAngle, H, w);
        const rSlant = computePrintBevel(rightAngle, H, w);

        const tlX = lSlant >= 0 ? xStart + 0.5 : xStart + Math.abs(lSlant) + 0.5;
        const blX = lSlant >= 0 ? xStart + lSlant + 0.5 : xStart + 0.5;
        const trX = rSlant >= 0 ? xEnd - 0.5 : xEnd - Math.abs(rSlant) - 0.5;
        const brX = rSlant >= 0 ? xEnd - rSlant - 0.5 : xEnd - 0.5;

        const safeLeft = Math.max(tlX, blX);
        const safeRight = Math.min(trX, brX);
        const safeWidth = Math.max(0, safeRight - safeLeft);
        const showLeftA = reportCfg.showAnglesOnDiagram && safeWidth >= 86 && leftAngle !== 90;
        const showRightA = reportCfg.showAnglesOnDiagram && safeWidth >= 86 && rightAngle !== 90;
        const textStart = safeLeft + (showLeftA ? 24 : 0);
        const textEnd = safeRight - (showRightA ? 24 : 0);
        const innerTextWidth = Math.max(0, textEnd - textStart);
        const centerX = (textStart + textEnd) / 2;

        const fullText =
          reportCfg.showPartLabelsOnDiagram && part.label
            ? `${part.label} · ${part.length}`
            : `${part.length}`;
        const label =
          reportCfg.showPartLabelsOnDiagram && part.label && innerTextWidth >= fullText.length * 7.5 + 14
            ? fullText
            : innerTextWidth >= Math.max(28, String(part.length).length * 7.2 + 8)
            ? `${part.length}`
            : "";

        return (
          <g key={idx}>
            <polygon
              points={`${tlX},0.5 ${trX},0.5 ${brX},${H - 0.5} ${blX},${H - 0.5}`}
              fill="#ffffff"
              stroke="#000000"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            {showLeftA && (
              <text
                x={safeLeft + 3}
                y={H / 2 + 3}
                fill="#404040"
                fontSize="8.5"
                fontFamily="monospace"
                textAnchor="start"
              >
                {leftAngle}°
              </text>
            )}
            {showRightA && (
              <text
                x={safeRight - 3}
                y={H / 2 + 3}
                fill="#404040"
                fontSize="8.5"
                fontFamily="monospace"
                textAnchor="end"
              >
                {rightAngle}°
              </text>
            )}
            {label && (
              <text
                x={centerX}
                y={H / 2 + 3.5}
                fill="#000000"
                fontSize={H <= 26 ? "10.5" : "11.5"}
                fontWeight="700"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}

      {pat.remnant_length > 0 && (() => {
        const remStart = Math.max(0, (pat.stock_length - pat.remnant_length - trimRight) * scale);
        const remW = Math.max(2, pat.remnant_length * scale);
        return (
          <g>
            <rect
              x={remStart}
              y={0.5}
              width={remW}
              height={H - 1}
              fill={isReusable ? "#e5e5e5" : "url(#print-hatch)"}
              stroke="#000000"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
            {remW >= 32 && (
              <text
                x={remStart + remW / 2}
                y={H / 2 + 3.5}
                fill="#000000"
                fontSize="9.5"
                fontWeight={isReusable ? "700" : "500"}
                fontFamily="monospace"
                textAnchor="middle"
              >
                {isReusable ? `ОСТ: ${pat.remnant_length}` : `${pat.remnant_length}`}
              </text>
            )}
          </g>
        );
      })()}

      {trimRight > 0 && (
        <rect
          x={Math.max(0, W - Math.max(2, trimRight * scale))}
          y={0.5}
          width={Math.max(2, trimRight * scale)}
          height={H - 1}
          fill="url(#print-hatch)"
          stroke="#000000"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

export const PrintReport: React.FC<PrintReportProps> = ({
  plan,
  meta,
  onMetaChange,
  cutWidth,
  trimLeft,
  trimRight,
  minRemnant,
  twoProfiles,
  settings,
  isPreview = false,
}) => {
  const companyName = settings?.companyName || "АО «Мобиль»";
  const companyWebsite = settings?.companyWebsite || "mobil66.ru";
  const companyPhone = settings?.companyPhone || "";
  const machineName = settings?.machineName || "Двухголовочная усорезная пила";
  const operatorName = settings?.operatorName || "";
  const reportCfg: ReportDisplaySettings = {
    ...DEFAULT_REPORT_CONFIG,
    ...(settings?.reportConfig || {}),
  };

  return (
    <div
      className={`w-full bg-white text-black font-sans selection:bg-neutral-200 ${
        reportCfg.compactCards ? "p-5" : "p-6 md:p-8"
      }`}
    >
      {/* 1. Engineering Header */}
      <div className="border-b-2 border-black pb-3.5 mb-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            {reportCfg.showLogoAndCompany && (
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <MobilLogo height={20} color="#000000" accentColor="#dd4b19" />
                <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-600 border-l border-neutral-300 pl-3">
                  {companyName}
                  {companyWebsite ? ` • ${companyWebsite}` : ""}
                  {companyPhone ? ` • ${companyPhone}` : ""}
                </div>
              </div>
            )}

            {isPreview && onMetaChange ? (
              <input
                type="text"
                value={meta.title}
                onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
                placeholder={reportCfg.defaultTitle}
                className="w-full font-bold text-xl text-black border-b border-neutral-300 hover:border-black focus:border-black focus:outline-none py-0.5"
              />
            ) : (
              <h1 className="font-bold text-xl text-black leading-tight">
                {meta.title || reportCfg.defaultTitle}
              </h1>
            )}

            {reportCfg.showMaterialAndMachine && (
              <>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-neutral-600 font-semibold">Материал:</span>
                  {isPreview && onMetaChange ? (
                    <input
                      type="text"
                      value={meta.material}
                      onChange={(e) => onMetaChange({ ...meta, material: e.target.value })}
                      placeholder="Наименование материала (профиль, артикул, цвет)"
                      className="font-medium text-black border-b border-neutral-300 hover:border-black focus:border-black focus:outline-none flex-1 py-0.5 text-xs"
                    />
                  ) : (
                    <span className="font-medium text-black">{meta.material || "Не указан"}</span>
                  )}
                </div>

                {machineName && (
                  <div className="mt-1 text-[11px] text-neutral-600">
                    Оборудование: <span className="text-black font-medium">{machineName}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {reportCfg.showOrderParams && (
            <div className="text-right text-xs font-mono shrink-0 space-y-1">
              <div>
                <span className="text-neutral-500">Дата: </span>
                {isPreview && onMetaChange ? (
                  <input
                    type="text"
                    value={meta.date}
                    onChange={(e) => onMetaChange({ ...meta, date: e.target.value })}
                    className="w-24 text-right font-medium border-b border-neutral-300 focus:outline-none focus:border-black text-xs"
                  />
                ) : (
                  <strong className="text-black">{meta.date}</strong>
                )}
              </div>
              <div>
                <span className="text-neutral-500">Ширина пропила: </span>
                <strong className="text-black">{cutWidth} мм</strong>
              </div>
              {(trimLeft > 0 || trimRight > 0) && (
                <div className="text-[11px] text-neutral-600">
                  Торцовка: L={trimLeft} / R={trimRight} мм
                </div>
              )}
              {twoProfiles && (
                <div className="text-[11px] font-bold text-black bg-neutral-100 px-1 py-0.5 border border-black inline-block">
                  [ПАКЕТНЫЙ РЕЗ В 2 ПРОФИЛЯ]
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Summary Table */}
      {reportCfg.showSummaryTable && (
        <div className={reportCfg.compactCards ? "mb-4" : "mb-6"}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 mb-1.5">
            Сводные производственные показатели
          </div>
          <table className="w-full text-xs border border-black border-collapse">
            <thead>
              <tr className="bg-neutral-100 border-b border-black text-neutral-800 font-bold">
                <th className="p-2 border-r border-black text-left">Требуется деталей</th>
                <th className="p-2 border-r border-black text-left">Хлыстов в раскрое</th>
                <th className="p-2 border-r border-black text-left">Полезный выход (КИМ)</th>
                <th className="p-2 border-r border-black text-left">Невозвратный отход</th>
                <th className="p-2 text-left">Деловые остатки на склад</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-neutral-300">
                <td className="p-2 border-r border-neutral-300">
                  <strong className="text-sm">{plan.summary.total_parts_placed}</strong> шт.
                  <div className="text-[11px] text-neutral-600">
                    {(plan.summary.total_parts_length / 1000).toFixed(2)} м
                  </div>
                </td>
                <td className="p-2 border-r border-neutral-300">
                  <strong className="text-sm">{plan.summary.total_stocks_used}</strong> шт.
                  <div className="text-[11px] text-neutral-600">
                    {(plan.summary.total_stock_length / 1000).toFixed(2)} м
                  </div>
                </td>
                <td className="p-2 border-r border-neutral-300">
                  <strong className="text-base text-black">
                    {plan.summary.efficiency_percent.toFixed(2)}%
                  </strong>
                </td>
                <td className="p-2 border-r border-neutral-300">
                  <strong className="text-sm">{plan.summary.waste_percent.toFixed(2)}%</strong>
                  <div className="text-[11px] text-neutral-600">
                    {(plan.summary.total_waste_length / 1000).toFixed(2)} м стружка
                  </div>
                </td>
                <td className="p-2">
                  <strong className="text-sm">
                    {(plan.summary.total_reusable_length / 1000).toFixed(2)} м
                  </strong>
                  <div className="text-[11px] text-neutral-600">(порог &ge; {minRemnant} мм)</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Detailed Cutting Patterns */}
      <div className={reportCfg.compactCards ? "space-y-2.5" : "space-y-4"}>
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 flex items-center justify-between">
          <span>Карты распила ({plan.patterns.length} типов карт)</span>
          <span className="font-normal text-neutral-500 font-mono text-[10px]">
            Размеры в миллиметрах (мм) &bull; Углы в градусах (°)
          </span>
        </div>

        {plan.patterns.map((pat, pIdx) => {
          const isReusable = pat.remnant_type === "Reusable";

          return (
            <div
              key={pIdx}
              className={`print-card border-2 border-black bg-white ${
                reportCfg.compactCards ? "p-2" : "p-3"
              }`}
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              {/* Pattern Header */}
              <div className="flex items-center justify-between text-xs mb-1.5 border-b border-neutral-300 pb-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="bg-black text-white px-2 py-0.5 text-[11px] font-bold">
                    КАРТА #{pIdx + 1}
                  </span>
                  <strong className="text-sm text-black">
                    {pat.count} хлыст{pat.count === 1 ? "" : pat.count < 5 ? "а" : "ов"}
                  </strong>
                  <span className="text-neutral-700">L = {pat.stock_length} мм</span>
                </div>

                <div className="font-mono text-xs text-right">
                  <span>
                    Расход: <strong>{pat.used_length} мм</strong>
                  </span>
                  <span className="mx-2 text-neutral-400">|</span>
                  <span className={isReusable ? "font-bold text-black" : "text-neutral-600"}>
                    {isReusable
                      ? `ДЕЛОВОЙ ОСТАТОК: ${pat.remnant_length} мм (НА СКЛАД)`
                      : `ОТХОД: ${pat.remnant_length} мм (СТРУЖКА)`}
                  </span>
                </div>
              </div>

              {/* High-Contrast SVG Cut Bar with Real Bevel Geometry */}
              {reportCfg.showCutDiagrams && (
                <PrintSvgBar
                  pat={pat}
                  trimLeft={trimLeft}
                  trimRight={trimRight}
                  reportCfg={reportCfg}
                />
              )}

              {/* Step-by-Step Operator Sequence */}
              {reportCfg.showCutSequence && (
                <div className="text-[11px] font-mono text-neutral-800 flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-black">Распил:</span>
                  {pat.parts.map((p, idx) => {
                    const hasAngle1 = (p.angle_left ?? 90) !== 90 || (p.angle_right ?? 90) !== 90;
                    const hasAngle2 =
                      (p.angle_extra_left ?? 90) !== 90 || (p.angle_extra_right ?? 90) !== 90;

                    return (
                      <span
                        key={idx}
                        className="border border-neutral-400 px-1.5 py-0.5 text-black bg-neutral-50"
                      >
                        {idx + 1}) {p.label && <strong>[{p.label}] </strong>}
                        <strong>{p.length} мм</strong>
                        {hasAngle1 && (
                          <span className="text-neutral-800">
                            {" "}
                            (∠{p.angle_left ?? 90}°/{p.angle_right ?? 90}°)
                          </span>
                        )}
                        {hasAngle2 && (
                          <span className="font-bold text-neutral-900 bg-neutral-200 px-1 ml-0.5">
                            [Пл.2 (наклон): ∠{p.angle_extra_left ?? 90}°/{p.angle_extra_right ?? 90}°]
                          </span>
                        )}
                      </span>
                    );
                  })}
                  <span className="text-neutral-400">&rarr;</span>
                  <span
                    className={
                      isReusable
                        ? "font-bold text-black border border-black px-1.5 py-0.5 bg-neutral-200"
                        : "text-neutral-600 border border-neutral-300 px-1.5 py-0.5"
                    }
                  >
                    Остаток: {pat.remnant_length} мм
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional Workshop Notes */}
      {reportCfg.showNotes && reportCfg.notesText.trim() && (
        <div className="mt-5 p-3 border border-neutral-400 bg-neutral-50 text-xs whitespace-pre-wrap leading-relaxed">
          <strong className="uppercase text-[10px] tracking-wider block text-neutral-700 mb-1">
            Примечание / указания к раскрою:
          </strong>
          {reportCfg.notesText}
        </div>
      )}

      {/* 4. Bottom Signatures */}
      {reportCfg.showSignatures && (
        <div className="mt-7 pt-4 border-t-2 border-black flex items-center justify-between text-xs font-mono text-neutral-800 flex-wrap gap-4">
          <div>
            {reportCfg.leftSignatureTitle || "Раскрой выполнил"}:{" "}
            <strong>{operatorName || "______________________"}</strong> (ФИО, подпись)
          </div>
          <div>
            {reportCfg.rightSignatureTitle || "Склад / Контроль ОТК"}: ______________________
            (подпись)
          </div>
        </div>
      )}
    </div>
  );
};
