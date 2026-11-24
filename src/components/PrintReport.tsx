import React from "react";
import { CuttingPlan, DocumentMeta, AppSettings } from "../types";
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

/**
 * Computes CSS clip-path polygon for beveled/slanted cut angles in print.
 */
function getPrintClipPath(left: number = 90, right: number = 90, slantPx: number = 5): string {
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
  const machineName = settings?.machineName || "Двухголовочная усорезная пила";
  const operatorName = settings?.operatorName || "";

  return (
    <div className="w-full bg-white text-black p-6 md:p-8 font-sans selection:bg-neutral-200">
      {/* 1. Engineering Header with Mobil66 Brand */}
      <div className="border-b-2 border-black pb-4 mb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <MobilLogo height={20} color="#000000" accentColor="#dd4b19" />
              <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-600 border-l border-neutral-300 pl-3">
                {companyName} &bull; {companyWebsite}
              </div>
            </div>

            {isPreview && onMetaChange ? (
              <input
                type="text"
                value={meta.title}
                onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
                placeholder="Название документа / заказа"
                className="w-full font-bold text-xl text-black border-b border-neutral-300 hover:border-black focus:border-black focus:outline-none py-0.5"
              />
            ) : (
              <h1 className="font-bold text-xl text-black leading-tight">
                {meta.title || "Технологическая карта раскроя"}
              </h1>
            )}

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
                <span className="font-medium text-black">
                  {meta.material || "Не указан"}
                </span>
              )}
            </div>

            {machineName && (
              <div className="mt-1 text-[11px] text-neutral-600">
                Оборудование: <span className="text-black font-medium">{machineName}</span>
              </div>
            )}
          </div>

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
        </div>
      </div>

      {/* 2. Summary Table */}
      <div className="mb-6">
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
                <strong className="text-base text-black">{plan.summary.efficiency_percent.toFixed(2)}%</strong>
              </td>
              <td className="p-2 border-r border-neutral-300">
                <strong className="text-sm">{plan.summary.waste_percent.toFixed(2)}%</strong>
                <div className="text-[11px] text-neutral-600">
                  {(plan.summary.total_waste_length / 1000).toFixed(2)} м стружка
                </div>
              </td>
              <td className="p-2">
                <strong className="text-sm">{(plan.summary.total_reusable_length / 1000).toFixed(2)} м</strong>
                <div className="text-[11px] text-neutral-600">
                  (порог &ge; {minRemnant} мм)
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Detailed Cutting Patterns with Angles */}
      <div className="space-y-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 flex items-center justify-between">
          <span>Карты распила ({plan.patterns.length} типов карт)</span>
          <span className="font-normal text-neutral-500 font-mono text-[10px]">
            Размеры в миллиметрах (мм) &bull; Углы в градусах (°)
          </span>
        </div>

        {plan.patterns.map((pat, pIdx) => {
          const totalStockLen = pat.stock_length;
          const isReusable = pat.remnant_type === "Reusable";

          return (
            <div
              key={pIdx}
              className="print-card border-2 border-black p-3 bg-white"
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
                  <span>Расход: <strong>{pat.used_length} мм</strong></span>
                  <span className="mx-2 text-neutral-400">|</span>
                  <span className={isReusable ? "font-bold text-black" : "text-neutral-600"}>
                    {isReusable
                      ? `ДЕЛОВОЙ ОСТАТОК: ${pat.remnant_length} мм (НА СКЛАД)`
                      : `ОТХОД: ${pat.remnant_length} мм (СТРУЖКА)`}
                  </span>
                </div>
              </div>

              {/* High-Contrast Vector Cut Bar with Visual Bevels */}
              <div className="relative h-12 border-2 border-black flex items-stretch bg-white mb-1.5">
                {pat.parts.map((part, partIdx) => {
                  const widthPct = (part.length / totalStockLen) * 100;
                  const leftAngle = part.angle_left ?? 90;
                  const rightAngle = part.angle_right ?? 90;
                  const leftExtra = part.angle_extra_left ?? 90;
                  const rightExtra = part.angle_extra_right ?? 90;
                  const clipPath = getPrintClipPath(leftAngle, rightAngle, 5);

                  return (
                    <div
                      key={partIdx}
                      style={{
                        width: `${widthPct}%`,
                        clipPath: clipPath !== "none" ? clipPath : undefined,
                      }}
                      className="relative h-full flex flex-col items-center justify-center border-r-2 border-black bg-white font-mono"
                    >
                      {part.label && (
                        <span className="text-[8px] font-bold text-neutral-700 leading-none truncate max-w-full px-0.5">
                          {part.label}
                        </span>
                      )}
                      <span className="text-xs font-bold leading-none text-black">
                        {part.length}
                      </span>
                      {(leftAngle !== 90 || rightAngle !== 90) && (
                        <span className="text-[8px] text-neutral-800 leading-none mt-0.5">
                          ∠{leftAngle}°/{rightAngle}°
                        </span>
                      )}
                      {(leftExtra !== 90 || rightExtra !== 90) && (
                        <span className="text-[7px] text-neutral-900 font-bold leading-none mt-0.5">
                          3D:{leftExtra}°/{rightExtra}°
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Remnant representation */}
                {pat.remnant_length > 0 && (
                  <div
                    style={{ width: `${(pat.remnant_length / totalStockLen) * 100}%` }}
                    className={`h-full flex items-center justify-center font-mono text-[10px] ${
                      isReusable
                        ? "bg-neutral-200 text-black font-bold border-l-2 border-black"
                        : "bg-neutral-100 text-neutral-600 border-l border-neutral-400"
                    }`}
                  >
                    <span className="truncate px-1">
                      {isReusable ? `ОСТ: ${pat.remnant_length}` : `${pat.remnant_length}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Step-by-Step Operator Sequence with Miters in 2 Planes */}
              <div className="text-[11px] font-mono text-neutral-800 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-black">Распил:</span>
                {pat.parts.map((p, idx) => {
                  const hasAngle1 = (p.angle_left ?? 90) !== 90 || (p.angle_right ?? 90) !== 90;
                  const hasAngle2 = (p.angle_extra_left ?? 90) !== 90 || (p.angle_extra_right ?? 90) !== 90;

                  return (
                    <span
                      key={idx}
                      className="border border-neutral-400 px-1.5 py-0.5 text-black bg-neutral-50"
                    >
                      {idx + 1}) {p.label && <strong>[{p.label}] </strong>}
                      <strong>{p.length} мм</strong>
                      {hasAngle1 && (
                        <span className="text-neutral-800">
                          {" "}(∠{p.angle_left ?? 90}°/{p.angle_right ?? 90}°)
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
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Signatures & Machine Info */}
      <div className="mt-8 pt-4 border-t-2 border-black flex items-center justify-between text-xs font-mono text-neutral-800">
        <div>
          Раскрой выполнил: <strong>{operatorName || "______________________"}</strong> (ФИО, подпись)
        </div>
        <div>
          Склад / Контроль ОТК: ______________________ (подпись)
        </div>
      </div>
    </div>
  );
};
