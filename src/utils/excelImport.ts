import * as XLSX from "xlsx";
import { Part } from "../types";

export interface ImportResult {
  parts: Part[];
  totalParts: number;
  totalLengthM: number;
  fileName: string;
  detectedColumns: {
    lengthCol: string;
    qtyCol: string;
    angle1LCol?: string;
    angle1RCol?: string;
    angle2LCol?: string;
    angle2RCol?: string;
    labelCol?: string;
  };
}

/**
 * Normalizes string for fuzzy header comparison (lowercased, stripped spaces/punctuation).
 */
function normalizeHeader(str: any): string {
  if (typeof str !== "string") return "";
  return str.toLowerCase().replace(/[\s_\-.,/\\()°«»[\]]/g, "");
}

/**
 * Parse an uploaded Excel (.xlsx, .xls, .csv) file into typed Part[].
 */
export async function parseExcelFile(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Файл не содержит листов с данными.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as 2D array
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Лист Excel пуст.");
  }

  // 1. Locate the header row
  let headerRowIndex = -1;
  let colLength = -1;
  let colQty = -1;
  let colAngle1L = -1;
  let colAngle1R = -1;
  let colAngle2L = -1;
  let colAngle2R = -1;
  let colLabel = -1;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const norm = normalizeHeader(row[c]);

      // Length detection
      if (
        norm.includes("длина") ||
        norm.includes("length") ||
        norm === "l" ||
        norm === "размер"
      ) {
        colLength = c;
      }

      // Quantity detection
      if (
        norm.includes("кол") ||
        norm.includes("qty") ||
        norm.includes("quantity") ||
        norm.includes("штук") ||
        norm === "q"
      ) {
        colQty = c;
      }

      // Angle 1 Left
      if (
        (norm.includes("угол1") && norm.includes("лев")) ||
        (norm.includes("угол") && norm.includes("лев") && !norm.includes("2") && !norm.includes("доп")) ||
        norm === "l1" ||
        norm === "угол1l"
      ) {
        colAngle1L = c;
      }

      // Angle 1 Right
      if (
        (norm.includes("угол1") && norm.includes("прав")) ||
        (norm.includes("угол") && norm.includes("прав") && !norm.includes("2") && !norm.includes("доп")) ||
        norm === "r1" ||
        norm === "угол1r"
      ) {
        colAngle1R = c;
      }

      // Angle 2 Left (Доп / Плоскость 2)
      if (
        (norm.includes("угол2") && norm.includes("лев")) ||
        (norm.includes("доп") && norm.includes("лев")) ||
        norm.includes("наклонлев") ||
        norm === "l2" ||
        norm === "угол2l"
      ) {
        colAngle2L = c;
      }

      // Angle 2 Right (Доп / Плоскость 2)
      if (
        (norm.includes("угол2") && norm.includes("прав")) ||
        (norm.includes("доп") && norm.includes("прав")) ||
        norm.includes("наклонправ") ||
        norm === "r2" ||
        norm === "угол2r"
      ) {
        colAngle2R = c;
      }

      // Label / Mark
      if (
        norm.includes("марка") ||
        norm.includes("позици") ||
        norm.includes("обознач") ||
        norm.includes("label") ||
        norm.includes("маркировк")
      ) {
        colLabel = c;
      }
    }

    // Found at least length and quantity
    if (colLength !== -1 && colQty !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback if no explicit headers found: assume columns 0=Length, 1=Qty, 2=A1L, 3=A1R, 4=A2L, 5=A2R, 6=Label
  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
  if (colLength === -1) colLength = 0;
  if (colQty === -1) colQty = 1;
  if (colAngle1L === -1 && rawRows[0]?.length > 2) colAngle1L = 2;
  if (colAngle1R === -1 && rawRows[0]?.length > 3) colAngle1R = 3;
  if (colAngle2L === -1 && rawRows[0]?.length > 4) colAngle2L = 4;
  if (colAngle2R === -1 && rawRows[0]?.length > 5) colAngle2R = 5;

  const parsedParts: Part[] = [];

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawLen = row[colLength];
    const rawQty = row[colQty];

    if (rawLen === undefined || rawLen === null || rawLen === "") continue;

    const length = typeof rawLen === "number" ? Math.round(rawLen) : parseInt(String(rawLen).replace(/\D/g, ""), 10);
    const quantity = typeof rawQty === "number" ? Math.round(rawQty) : parseInt(String(rawQty).replace(/\D/g, ""), 10) || 1;

    if (!length || isNaN(length) || length <= 0) continue;
    if (!quantity || isNaN(quantity) || quantity <= 0) continue;

    // Parse main angles
    let angle_left = 90;
    let angle_right = 90;

    if (colAngle1L !== -1 && row[colAngle1L] !== undefined) {
      const val = parseFloat(String(row[colAngle1L]).replace(",", "."));
      if (!isNaN(val)) angle_left = val;
    }

    if (colAngle1R !== -1 && row[colAngle1R] !== undefined) {
      const val = parseFloat(String(row[colAngle1R]).replace(",", "."));
      if (!isNaN(val)) angle_right = val;
    }

    // Parse extra angles (Plane 2)
    let angle_extra_left = 90;
    let angle_extra_right = 90;

    if (colAngle2L !== -1 && row[colAngle2L] !== undefined) {
      const val = parseFloat(String(row[colAngle2L]).replace(",", "."));
      if (!isNaN(val)) angle_extra_left = val;
    }

    if (colAngle2R !== -1 && row[colAngle2R] !== undefined) {
      const val = parseFloat(String(row[colAngle2R]).replace(",", "."));
      if (!isNaN(val)) angle_extra_right = val;
    }

    // Parse optional label
    let label: string | undefined = undefined;
    if (colLabel !== -1 && row[colLabel]) {
      label = String(row[colLabel]).trim();
    }

    parsedParts.push({
      length,
      quantity,
      angle_left,
      angle_right,
      angle_extra_left,
      angle_extra_right,
      label,
    });
  }

  if (parsedParts.length === 0) {
    throw new Error(
      "Не удалось найти строки с деталями в файле. Проверьте формат файла (требуются колонки Длина и Количество)."
    );
  }

  const totalParts = parsedParts.reduce((sum, p) => sum + p.quantity, 0);
  const totalLengthM = parsedParts.reduce((sum, p) => sum + p.length * p.quantity, 0) / 1000;

  return {
    parts: parsedParts,
    totalParts,
    totalLengthM: Math.round(totalLengthM * 100) / 100,
    fileName: file.name,
    detectedColumns: {
      lengthCol: colLength !== -1 ? String(rawRows[headerRowIndex]?.[colLength] || `Колонка ${colLength + 1}`) : "Длина",
      qtyCol: colQty !== -1 ? String(rawRows[headerRowIndex]?.[colQty] || `Колонка ${colQty + 1}`) : "Количество",
      angle1LCol: colAngle1L !== -1 ? String(rawRows[headerRowIndex]?.[colAngle1L]) : undefined,
      angle1RCol: colAngle1R !== -1 ? String(rawRows[headerRowIndex]?.[colAngle1R]) : undefined,
      angle2LCol: colAngle2L !== -1 ? String(rawRows[headerRowIndex]?.[colAngle2L]) : undefined,
      angle2RCol: colAngle2R !== -1 ? String(rawRows[headerRowIndex]?.[colAngle2R]) : undefined,
      labelCol: colLabel !== -1 ? String(rawRows[headerRowIndex]?.[colLabel]) : undefined,
    },
  };
}

/**
 * Generates and downloads the official Excel import sample template directly in the browser.
 */
export function downloadSampleExcel() {
  const wb = XLSX.utils.book_new();

  const sampleData = [
    {
      "Марка / Позиция": "Профиль 1",
      "Длина (мм)": 2700,
      "Количество (шт)": 37,
      "Угол 1 левый (°)": 90,
      "Угол 1 правый (°)": 90,
      "Угол 2 доп. левый (°)": 90,
      "Угол 2 доп. правый (°)": 90,
      "Примечание": 'см. чертеж "0101-3150-21"',
    },
    {
      "Марка / Позиция": "Профиль 2",
      "Длина (мм)": 2400,
      "Количество (шт)": 12,
      "Угол 1 левый (°)": 90,
      "Угол 1 правый (°)": 90,
      "Угол 2 доп. левый (°)": 90,
      "Угол 2 доп. правый (°)": 90,
      "Примечание": 'см. чертеж "0101-2555-14"',
    },
    {
      "Марка / Позиция": "Профиль 3",
      "Длина (мм)": 2067,
      "Количество (шт)": 4,
      "Угол 1 левый (°)": 45,
      "Угол 1 правый (°)": 45,
      "Угол 2 доп. левый (°)": 90,
      "Угол 2 доп. правый (°)": 90,
      "Примечание": 'см. чертеж "0101-1840-08"',
    },
    {
      "Марка / Позиция": "Профиль 4",
      "Длина (мм)": 2260,
      "Количество (шт)": 2,
      "Угол 1 левый (°)": 135,
      "Угол 1 правый (°)": 90,
      "Угол 2 доп. левый (°)": 85,
      "Угол 2 доп. правый (°)": 90,
      "Примечание": 'см. чертеж "0101-4022-03"',
    },
    {
      "Марка / Позиция": "Профиль 5",
      "Длина (мм)": 1875,
      "Количество (шт)": 4,
      "Угол 1 левый (°)": 60,
      "Угол 1 правый (°)": 60,
      "Угол 2 доп. левый (°)": 75,
      "Угол 2 доп. правый (°)": 75,
      "Примечание": 'см. чертеж "0101-5110-12"',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws["!cols"] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Спецификация деталей");

  const instructions = [
    { "Инструкция по заполнению файла для импорта": "Колонка «Длина (мм)» — целое число в миллиметрах (обязательно)." },
    { "Инструкция по заполнению файла для импорта": "Колонка «Количество (шт)» — целое число от 1 и выше (обязательно)." },
    { "Инструкция по заполнению файла для импорта": "Колонки «Угол 1 левый / правый» — основной угол поворота стола пилы в градусах (по умолчанию 90°)." },
    { "Инструкция по заполнению файла для импорта": "Колонки «Угол 2 доп. левый / правый» — угол наклона диска во 2-й плоскости (по умолчанию 90°)." },
    { "Инструкция по заполнению файла для импорта": "Колонка «Марка / Позиция» — маркировка детали в наряде (необязательно)." },
    { "Инструкция по заполнению файла для импорта": "Программа автоматически распознает названия колонок, даже если они записаны короче (L, Q, Угол 1, Угол 2)." },
  ];
  const wsInfo = XLSX.utils.json_to_sheet(instructions);
  wsInfo["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Инструкция");

  XLSX.writeFile(wb, "шаблон_импорта_раскроя.xlsx");
}
