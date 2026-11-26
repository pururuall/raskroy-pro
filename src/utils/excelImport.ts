import * as XLSX from "xlsx";
import { DEFAULT_IMPORT_OPTIONS, ImportOptions, Part } from "../types";

export interface ImportGroup {
  id: string;
  article: string;
  colour: string;
  tabTitle: string;
  materialLabel: string;
  parts: Part[];
  rawRowCount: number;
  totalParts: number;
  totalLengthM: number;
}

export interface FractionalRoundingInfo {
  rawValue: string;
  roundedValue: number;
  article?: string;
}

export interface ImportResult {
  parts: Part[];
  groups: ImportGroup[];
  rawRowCount: number;
  totalParts: number;
  totalLengthM: number;
  fileName: string;
  fractionalRounded: FractionalRoundingInfo[];
  detectedColumns: {
    lengthCol: string;
    qtyCol: string;
    angle1LCol?: string;
    angle1RCol?: string;
    angle2LCol?: string;
    angle2RCol?: string;
    labelCol?: string;
    articleCol?: string;
    colorCol?: string;
  };
}

/**
 * Normalizes header string for fuzzy comparison (lowercased, stripped spaces/punctuation).
 */
function normalizeHeader(str: unknown): string {
  if (typeof str !== "string") return "";
  return str.toLowerCase().replace(/[\s_\-.,/\\()°«»[\]]/g, "");
}

/**
 * Parses a decimal number cleanly from Excel number or localized string (comma or dot).
 */
function parseNumericValue(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (raw === undefined || raw === null) return null;
  let cleaned = String(raw).trim().replace(/[\s\u00A0]+/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Disambiguate thousands separator when both comma and dot appear
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else {
    cleaned = cleaned.replace(",", ".");
  }
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const val = Number.parseFloat(match[0]);
  return Number.isFinite(val) ? val : null;
}

/**
 * Merges identical parts (same label, length and 4 cut angles), summing their quantities.
 */
export function mergeDuplicateParts(items: Part[]): Part[] {
  const map = new Map<string, Part>();
  for (const p of items) {
    const a1L = p.angle_left ?? 90;
    const a1R = p.angle_right ?? 90;
    const a2L = p.angle_extra_left ?? 90;
    const a2R = p.angle_extra_right ?? 90;
    const key = `${(p.label || "").trim()}|${p.length}|${a1L}|${a1R}|${a2L}|${a2R}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += p.quantity;
    } else {
      map.set(key, {
        ...p,
        angle_left: a1L,
        angle_right: a1R,
        angle_extra_left: a2L,
        angle_extra_right: a2R,
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Produces a concise display article code for browser-style tab headers.
 */
export function shortenArticleForTab(article: string): string {
  const trimmed = article.trim();
  if (!trimmed) return "Материал";
  if (trimmed.length <= 16) return trimmed;
  const segments = trimmed.split(".");
  if (segments.length >= 3) {
    const tail = segments.slice(-2).join(".");
    if (tail.length >= 6 && tail.length <= 16) return tail;
    return segments[segments.length - 1];
  }
  return `${trimmed.slice(0, 14)}…`;
}

/**
 * Maps common RAL / finish codes to visual tab swatch hex colors.
 */
export function getRalSwatchColor(colour?: string): string | undefined {
  if (!colour || colour === "Без цвета") return undefined;
  const norm = colour.toUpperCase().replace(/\s+/g, " ").trim();
  const RAL_MAP: Record<string, string> = {
    "RAL 7012": "#484f56",
    "RAL 7016": "#383e42",
    "RAL 7024": "#474a51",
    "RAL 7001": "#8c969d",
    "RAL 7004": "#9b9b9b",
    "RAL 7035": "#cbd0cc",
    "RAL 7040": "#9da3a6",
    "RAL 9005": "#111827",
    "RAL 9006": "#a1a1a0",
    "RAL 9007": "#878581",
    "RAL 9010": "#f1ece1",
    "RAL 9016": "#f8fafc",
    "RAL 8017": "#442f29",
    "RAL 8019": "#3d3635",
    "RAL 6005": "#114232",
    "RAL 5005": "#005387",
    "RAL 3020": "#cc0605",
  };
  for (const [k, hex] of Object.entries(RAL_MAP)) {
    if (norm.includes(k)) return hex;
  }
  return "#64748b";
}

/**
 * Parses an uploaded Excel/CSV file (.xlsx, .xls, .csv) into typed Part[] and grouped ImportGroup[].
 */
export async function parseExcelFile(
  file: File,
  importOptions: Partial<ImportOptions> = {}
): Promise<ImportResult> {
  const opts: ImportOptions = { ...DEFAULT_IMPORT_OPTIONS, ...importOptions };
  const arrayBuffer = await file.arrayBuffer();
  const isCsv = /\.(csv|txt)$/i.test(file.name);

  let workbook: XLSX.WorkBook;
  if (isCsv) {
    const bytes = new Uint8Array(arrayBuffer);
    let text = "";
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder("windows-1251").decode(bytes);
    }
    text = text.replace(/^\uFEFF/, "");
    const firstLine = text.split(/\r?\n/)[0] || "";
    const semiCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    workbook = XLSX.read(text, {
      type: "string",
      FS: semiCount > commaCount ? ";" : ",",
      raw: true,
    });
  } else {
    workbook = XLSX.read(arrayBuffer, { type: "array" });
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Файл не содержит листов с данными.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Лист таблицы пуст.");
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
  let colArticle = -1;
  let colColor = -1;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let cLen = -1;
    let cQty = -1;
    let cA1L = -1;
    let cA1R = -1;
    let cA2L = -1;
    let cA2R = -1;
    let cLbl = -1;
    let cArt = -1;
    let cCol = -1;

    for (let c = 0; c < row.length; c++) {
      const norm = normalizeHeader(row[c]);
      if (!norm) continue;

      if (
        norm.includes("длина") ||
        norm.includes("length") ||
        norm.includes("lenght") ||
        norm === "l" ||
        norm === "размер"
      ) {
        cLen = c;
      }

      if (
        norm.includes("кол") ||
        norm.includes("qty") ||
        norm.includes("quantity") ||
        norm.includes("штук") ||
        norm === "шт" ||
        norm === "q"
      ) {
        cQty = c;
      }

      if (
        (norm.includes("угол1") && norm.includes("лев")) ||
        (norm.includes("угол") && norm.includes("лев") && !norm.includes("2") && !norm.includes("доп")) ||
        norm === "l1" ||
        norm === "угол1l" ||
        norm.includes("primeryangles1") ||
        norm.includes("primaryangles1") ||
        norm === "primeryangle1" ||
        norm === "primaryangle1"
      ) {
        cA1L = c;
      }

      if (
        (norm.includes("угол1") && norm.includes("прав")) ||
        (norm.includes("угол") && norm.includes("прав") && !norm.includes("2") && !norm.includes("доп")) ||
        norm === "r1" ||
        norm === "угол1r" ||
        norm.includes("primeryangles2") ||
        norm.includes("primaryangles2") ||
        norm === "primeryangle2" ||
        norm === "primaryangle2"
      ) {
        cA1R = c;
      }

      if (
        (norm.includes("угол2") && norm.includes("лев")) ||
        (norm.includes("доп") && norm.includes("лев")) ||
        norm.includes("наклонлев") ||
        norm === "l2" ||
        norm === "угол2l" ||
        norm.includes("secondaryangles1") ||
        norm === "secondaryangle1"
      ) {
        cA2L = c;
      }

      if (
        (norm.includes("угол2") && norm.includes("прав")) ||
        (norm.includes("доп") && norm.includes("прав")) ||
        norm.includes("наклонправ") ||
        norm === "r2" ||
        norm === "угол2r" ||
        norm.includes("secondaryangles2") ||
        norm === "secondaryangle2"
      ) {
        cA2R = c;
      }

      if (
        norm.includes("articlenumber") ||
        norm === "article" ||
        norm.includes("артикул") ||
        norm.includes("сечение")
      ) {
        cArt = c;
      }

      if (
        norm === "colour" ||
        norm === "color" ||
        norm.includes("цвет") ||
        norm.includes("ral") ||
        norm.includes("окрас")
      ) {
        cCol = c;
      }

      if (
        norm.includes("марка") ||
        norm.includes("позици") ||
        norm.includes("обознач") ||
        norm.includes("label") ||
        norm.includes("маркировк")
      ) {
        cLbl = c;
      }
    }

    if (cLen !== -1 && cQty !== -1) {
      headerRowIndex = r;
      colLength = cLen;
      colQty = cQty;
      colAngle1L = cA1L;
      colAngle1R = cA1R;
      colAngle2L = cA2L;
      colAngle2R = cA2R;
      colLabel = cLbl;
      colArticle = cArt;
      colColor = cCol;
      break;
    }
  }

  // Only apply positional column fallback when NO explicit header row was found!
  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
  if (headerRowIndex === -1) {
    colLength = 0;
    colQty = 1;
    if (rawRows[0]?.length > 2) colAngle1L = 2;
    if (rawRows[0]?.length > 3) colAngle1R = 3;
    if (rawRows[0]?.length > 4) colAngle2L = 4;
    if (rawRows[0]?.length > 5) colAngle2R = 5;
  }

  const effectiveLabelCol = colLabel !== -1 ? colLabel : colArticle;

  interface RawParsedRow {
    part: Part;
    article: string;
    colour: string;
  }

  const rawParsed: RawParsedRow[] = [];
  const fractionalRounded: FractionalRoundingInfo[] = [];

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawLen = row[colLength];
    const lenFloat = parseNumericValue(rawLen);
    if (lenFloat === null || lenFloat <= 0) continue;

    const roundedLen = opts.roundFractionalUp
      ? Math.ceil(lenFloat - 1e-6)
      : Math.round(lenFloat);
    if (roundedLen <= 0) continue;

    const rawQty = row[colQty];
    const qtyFloat = parseNumericValue(rawQty);
    const quantity = qtyFloat !== null && qtyFloat > 0 ? Math.round(qtyFloat) : 1;

    const article =
      colArticle !== -1 && row[colArticle] !== undefined && row[colArticle] !== null
        ? String(row[colArticle]).trim()
        : "";
    const colourRaw =
      colColor !== -1 && row[colColor] !== undefined && row[colColor] !== null
        ? String(row[colColor]).trim()
        : "";
    const colour = colourRaw || (colColor !== -1 ? "Без цвета" : "");

    if (Math.abs(lenFloat - Math.round(lenFloat)) > 1e-4) {
      fractionalRounded.push({
        rawValue: String(rawLen),
        roundedValue: roundedLen,
        article: article || undefined,
      });
    }

    const parseAngle = (colIdx: number): number => {
      if (colIdx === -1) return 90;
      const val = parseNumericValue(row[colIdx]);
      if (val === null) return 90;
      return Math.max(5, Math.min(175, val));
    };

    const labelRaw =
      effectiveLabelCol !== -1 && row[effectiveLabelCol] !== undefined && row[effectiveLabelCol] !== null
        ? String(row[effectiveLabelCol]).trim()
        : "";
    const label = labelRaw || article || undefined;

    rawParsed.push({
      article,
      colour,
      part: {
        length: roundedLen,
        quantity,
        angle_left: parseAngle(colAngle1L),
        angle_right: parseAngle(colAngle1R),
        angle_extra_left: parseAngle(colAngle2L),
        angle_extra_right: parseAngle(colAngle2R),
        label,
      },
    });
  }

  if (rawParsed.length === 0) {
    throw new Error(
      "Не удалось найти строки с деталями в файле. Проверьте заголовки (Длина/Length/Lenght и Количество/Qty)."
    );
  }

  const hasGroupingCols = colArticle !== -1 || colColor !== -1;
  const groupMap = new Map<
    string,
    { article: string; colour: string; rawParts: Part[]; rawRowCount: number }
  >();

  for (const item of rawParsed) {
    const key =
      opts.splitByMaterialAndColor && hasGroupingCols
        ? `${item.article}|||${item.colour}`
        : "__ALL__";
    const existing = groupMap.get(key);
    if (existing) {
      existing.rawParts.push(item.part);
      existing.rawRowCount += 1;
    } else {
      groupMap.set(key, {
        article: item.article || file.name.replace(/\.(xlsx|xls|csv|txt)$/i, ""),
        colour: item.colour,
        rawParts: [item.part],
        rawRowCount: 1,
      });
    }
  }

  const groups: ImportGroup[] = Array.from(groupMap.entries()).map(([id, g]) => {
    const finalParts = opts.mergeDuplicateParts ? mergeDuplicateParts(g.rawParts) : g.rawParts;
    const totalParts = finalParts.reduce((s, p) => s + p.quantity, 0);
    const totalLengthM =
      Math.round((finalParts.reduce((s, p) => s + p.length * p.quantity, 0) / 1000) * 100) / 100;

    const shortArt = shortenArticleForTab(g.article);
    const tabTitle = g.colour ? `${shortArt} · ${g.colour}` : shortArt;
    const materialLabel = g.colour ? `${g.article} (${g.colour})` : g.article;

    return {
      id,
      article: g.article,
      colour: g.colour,
      tabTitle,
      materialLabel,
      parts: finalParts,
      rawRowCount: g.rawRowCount,
      totalParts,
      totalLengthM,
    };
  });

  const flatRawParts = rawParsed.map((r) => r.part);
  const parsedParts = opts.mergeDuplicateParts ? mergeDuplicateParts(flatRawParts) : flatRawParts;

  const totalParts = parsedParts.reduce((sum, p) => sum + p.quantity, 0);
  const totalLengthM =
    Math.round((parsedParts.reduce((sum, p) => sum + p.length * p.quantity, 0) / 1000) * 100) / 100;

  const hdrName = (idx: number): string | undefined =>
    idx !== -1 && headerRowIndex !== -1 && rawRows[headerRowIndex]?.[idx] !== undefined
      ? String(rawRows[headerRowIndex][idx])
      : undefined;

  return {
    parts: parsedParts,
    groups,
    rawRowCount: rawParsed.length,
    totalParts,
    totalLengthM,
    fileName: file.name,
    fractionalRounded,
    detectedColumns: {
      lengthCol: hdrName(colLength) || `Колонка ${colLength + 1}`,
      qtyCol: hdrName(colQty) || `Колонка ${colQty + 1}`,
      angle1LCol: hdrName(colAngle1L),
      angle1RCol: hdrName(colAngle1R),
      angle2LCol: hdrName(colAngle2L),
      angle2RCol: hdrName(colAngle2R),
      labelCol: hdrName(colLabel),
      articleCol: hdrName(colArticle),
      colorCol: hdrName(colColor),
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
