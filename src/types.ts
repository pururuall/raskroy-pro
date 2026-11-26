export interface Stock {
  id?: string;
  length: number;
  quantity?: number;
  is_remnant?: boolean; // true = обрезок/остаток со склада (расходуется в первую очередь)
}

export interface Part {
  id?: string;
  length: number;
  quantity: number;
  angle_left?: number;
  angle_right?: number;
  angle_extra_left?: number; // Угол во 2-й плоскости (наклон / bevel / фасад)
  angle_extra_right?: number; // Угол во 2-й плоскости
  label?: string; // Маркировка / позиция на фасаде (например "Р-1", "Импост")
}

export type CuttingAlgorithm =
  | 'auto'
  | 'column_generation'
  | 'branch_and_bound'
  | 'knapsack_dp'
  | 'knapsack_tolerance'
  | 'simulated_annealing'
  | 'best_fit'
  | 'first_fit'
  | 'min_patterns';

export interface CuttingAlgorithmInfo {
  id: CuttingAlgorithm;
  name: string;
  badge: string;
  summary: string;
  howItWorks: string;
  bestFor: string;
}

export const CUTTING_ALGORITHMS: CuttingAlgorithmInfo[] = [
  {
    id: 'auto',
    name: 'Автоподбор (Комбинированный)',
    badge: 'По умолчанию',
    summary: 'Запускает все 7 стратегий раскроя параллельно и автоматически выбирает лучший результат.',
    howItWorks:
      'Считает раскрой методами Генерации столбцов (ЦЛП), Ветвей и границ, Имитации отжига, Knapsack DP, Knapsack с допуском, Best Fit и First Fit, затем сравнивает планы: максимум деталей → минимум хлыстов → минимум невозвратного отхода → минимум карт.',
    bestFor: 'Для большинства заказов: автоматически находит лучший КИМ среди точных, линейных, жадных и эвристических методов.',
  },
  {
    id: 'column_generation',
    name: 'Метод генерации столбцов (Gilmore–Gomory / ЦЛП)',
    badge: 'Крупный ЦЛП',
    summary: 'Решает задачу линейного программирования (симплекс-метод) и итеративно генерирует самые выгодные карты раскроя.',
    howItWorks:
      'Строит базис карт для симплекс-метода (RMP), затем через двойственные цены и задачу о рюкзаке догенерирует новые комбинации резов, снижающие общий расход хлыстов; дробное решение округляется вниз, а остаток добивается ДП.',
    bestFor: 'Крупные заказы с большим количеством разных типоразмеров, где последовательный жадный выбор оставляет лишние хлысты.',
  },
  {
    id: 'branch_and_bound',
    name: 'Метод ветвей и границ (Branch & Bound)',
    badge: 'Отсечение ветвей',
    summary: 'Ищет оптимальную связку карт по дереву решений ЦЛП, сразу отсекая заведомо худшие ветви.',
    howItWorks:
      'Берёт стартовую оценку от Knapsack DP, перебирает до 6 плотных шаблонов на каждом шаге с исключением симметрий и отсекает ветви по нижней оценке расхода (лимит 25 000 узлов на однородном безлимитном складе до 14 типоразмеров; иначе ДП).',
    bestFor: 'Малые и средние заказы из одного базового профиля, где важно проверить альтернативные связки карт ради экономии хлыста.',
  },
  {
    id: 'knapsack_dp',
    name: 'Динамическое программирование (Knapsack DP)',
    badge: 'Макс. КИМ',
    summary: 'Подбирает для каждого очередного хлыста комбинацию отрезков, вплотную заполняющую всю длину.',
    howItWorks:
      'Сортирует хлысты и детали по убыванию, строит целочисленную DP-таблицу достижимых длин (деталь + пропил) и находит точное заполнение хлыста с точностью до 1 мм.',
    bestFor: 'Крупные однотипные партии профиля, где важен максимальный коэффициент использования материала.',
  },
  {
    id: 'knapsack_tolerance',
    name: 'Knapsack DP с допуском',
    badge: 'Гибкий подбор',
    summary: 'Разрешает небольшой недобор при заполнении хлыста (до 2× ширины пропила) ради лучшего остатка заказа.',
    howItWorks:
      'При поиске по DP-таблице разрешает остановиться чуть ниже 100% заполнения первого хлыста, чтобы оставшиеся детали удачнее сложились на следующих хлыстах без мелкой обрези.',
    bestFor: 'Заказы, где «жадная» плотная упаковка первых хлыстов оставляет неудобные хвосты в конце.',
  },
  {
    id: 'simulated_annealing',
    name: 'Имитация отжига + локальный поиск (SA)',
    badge: 'Метаэвристика',
    summary: 'Стохастически перебирает перестановки деталей (Swap, Relocate, 2-Opt), выходя из локальных минимумов.',
    howItWorks:
      'Запускает управляемый поиск в окрестности (до 900 итераций в зависимости от числа деталей) с перестановкой порядка нарезки, инверсией подпоследовательностей (2-Opt) и переключением Best/First Fit, балансируя расход, отход и число карт.',
    bestFor: 'Сложные заказы со складом разноразмерных остатков, жёсткими лимитами заготовок и поиском нестандартных комбинаций.',
  },
  {
    id: 'min_patterns',
    name: 'Минимум перенастроек станка',
    badge: 'Для серии',
    summary: 'Выбирает план с наименьшим количеством разных карт раскроя среди всех 7 стратегий.',
    howItWorks:
      'Запускает все доступные алгоритмы (включая ЦЛП, B&B и SA) и при полном размещении деталей ставит на первое место минимум уникальных карт раскроя (меньше перестановок упора пилы), затем расход и отход.',
    bestFor: 'Серийное производство на усорезном станке, где важна скорость переналадки.',
  },
  {
    id: 'best_fit',
    name: 'Best Fit Decreasing (Наилучший подходящий)',
    badge: 'Жадный / Меньше отхода',
    summary: 'Каждую деталь от большей к меньшей кладёт в тот уже открытый хлыст, где останется минимум пустого места.',
    howItWorks:
      'Упорядочивает детали по убыванию длины и для каждой просматривает все начатые хлысты, выбирая вариант с наименьшим свободным остатком после реза; если деталь не влезает, открывает новый хлыст.',
    bestFor: 'Заказы со множеством заготовок разных длин или строгими лимитами на складе.',
  },
  {
    id: 'first_fit',
    name: 'First Fit Decreasing (Первый подходящий)',
    badge: 'Быстрый жадный',
    summary: 'Кладёт каждую следующую деталь в первый по порядку начатый хлыст, куда она помещается.',
    howItWorks:
      'Сортирует детали по убыванию и последовательно размещает каждую в самый первый открытый хлыст с достаточным запасом длины (деталь + пропил), формируя предсказуемую очередь нарезки.',
    bestFor: 'Быстрая классическая схема 1D-раскроя от крупных деталей к коротким.',
  },
];

export type StockPriorityMode = 'min_total_length' | 'remnants_first' | 'min_bars_count';

export interface StockPriorityInfo {
  id: StockPriorityMode;
  name: string;
  shortLabel: string;
  badge: string;
  description: string;
}

export const STOCK_PRIORITY_MODES: StockPriorityInfo[] = [
  {
    id: 'min_total_length',
    name: 'Экономия метража и обрезков',
    shortLabel: 'Метраж + остатки',
    badge: 'Рекомендуется',
    description:
      'Минимизирует общий расход погонных метров материала и автоматически задействует подходящие короткие/ограниченные заготовки со склада (например, 3200 мм под деталь 3126 мм) вместо лишних длинных хлыстов.',
  },
  {
    id: 'remnants_first',
    name: 'Строго обрезки в 1-ю очередь',
    shortLabel: 'Обрезки 1-е',
    badge: 'Склад остатков',
    description:
      'В первую очередь принудительно расходует заготовки с отметкой «Обрезок» (а при их отсутствии — партии с заданным количеством штук) до полного исчерпания, и только затем переходит на целые хлысты.',
  },
  {
    id: 'min_bars_count',
    name: 'Минимум хлыстов (длинные сначала)',
    shortLabel: 'Мин. хлыстов',
    badge: 'Серийный',
    description:
      'Классический режим: старается уложить заказ в наименьшее число заготовок в штуках, начиная подбор с самых длинных хлыстов (6000 мм и выше).',
  },
];

export interface CutConfig {
  cut_width: number;
  trim_left: number;
  trim_right: number;
  min_remnant: number;
  two_profiles: boolean;
  algorithm?: CuttingAlgorithm;
  stock_priority?: StockPriorityMode;
}

export type RemnantType = 'Waste' | 'Reusable';

export interface PlacedPart {
  part_id?: string;
  length: number;
  start_pos: number;
  end_pos: number;
  angle_left?: number;
  angle_right?: number;
  angle_extra_left?: number;
  angle_extra_right?: number;
  label?: string;
}

export interface CuttingPattern {
  stock_length: number;
  count: number;
  parts: PlacedPart[];
  used_length: number;
  remnant_length: number;
  remnant_type: RemnantType;
}

export interface PlanSummary {
  total_parts_requested: number;
  total_parts_placed: number;
  total_stocks_used: number;
  total_stock_length: number;
  total_parts_length: number;
  total_kerf_length: number;
  total_reusable_length: number;
  total_waste_length: number;
  waste_percent: number;
  efficiency_percent: number;
}

export interface AnglePreset {
  id: string;
  name: string;
  left: number;
  right: number;
  extra_left?: number;
  extra_right?: number;
}

export type CalcMode = 'instant' | 'timer' | 'manual';
export type AppTheme = 'light' | 'steel_cad' | 'dark' | 'dark_emerald';
export type BarDensity = 'compact' | 'normal' | 'tall';

export interface AppThemeInfo {
  id: AppTheme;
  name: string;
  badge: string;
  description: string;
  isDark: boolean;
  preview: {
    bg: string;
    surface: string;
    sidebar: string;
    accent: string;
  };
}

export const APP_THEMES: AppThemeInfo[] = [
  {
    id: 'light',
    name: 'Светлая классическая',
    badge: 'По умолчанию',
    description:
      'Бело-серые карточки, тёмная шапка и фирменный терракотовый акцент. Высокая читаемость при дневном свете.',
    isDark: false,
    preview: { bg: '#f1f3f6', surface: '#ffffff', sidebar: '#151c24', accent: '#dd4b19' },
  },
  {
    id: 'steel_cad',
    name: 'Сталь и индиго (CAD)',
    badge: 'Инженерная',
    description:
      'Холодный технический фон, стальная навигация и строгий синий акцент в стиле конструкторских САПР.',
    isDark: false,
    preview: { bg: '#eaeff5', surface: '#ffffff', sidebar: '#1e293b', accent: '#2563eb' },
  },
  {
    id: 'dark',
    name: 'Тёмная графитовая',
    badge: 'Вечер / Цех',
    description:
      'Мягкий графитовый фон без бликов с акцентом на фаски и линии распила для работы при приглушённом свете.',
    isDark: true,
    preview: { bg: '#16191f', surface: '#1e222a', sidebar: '#12151b', accent: '#dd4b19' },
  },
  {
    id: 'dark_emerald',
    name: 'Тёмный изумруд (Контраст)',
    badge: 'У станка',
    description:
      'Глубокий антрацит с контрастными границами карточек и изумрудным акцентом для цеховых мониторов.',
    isDark: true,
    preview: { bg: '#0b0f14', surface: '#141b23', sidebar: '#070a0e', accent: '#10b981' },
  },
];

export interface ImportOptions {
  splitByMaterialAndColor: boolean;
  mergeDuplicateParts: boolean;
  roundFractionalUp: boolean;
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  splitByMaterialAndColor: true,
  mergeDuplicateParts: true,
  roundFractionalUp: true,
};

export interface ReportDisplaySettings {
  defaultTitle: string;
  showLogoAndCompany: boolean;
  showMaterialAndMachine: boolean;
  showOrderParams: boolean;
  showSummaryTable: boolean;
  showCutDiagrams: boolean;
  showPartLabelsOnDiagram: boolean;
  showAnglesOnDiagram: boolean;
  showCutSequence: boolean;
  diagramBarHeight: BarDensity;
  compactCards: boolean;
  showNotes: boolean;
  notesText: string;
  showSignatures: boolean;
  leftSignatureTitle: string;
  rightSignatureTitle: string;
}

export const DEFAULT_REPORT_CONFIG: ReportDisplaySettings = {
  defaultTitle: 'Технологическая карта раскроя',
  showLogoAndCompany: true,
  showMaterialAndMachine: true,
  showOrderParams: true,
  showSummaryTable: true,
  showCutDiagrams: true,
  showPartLabelsOnDiagram: true,
  showAnglesOnDiagram: true,
  showCutSequence: true,
  diagramBarHeight: 'normal',
  compactCards: false,
  showNotes: false,
  notesText: '',
  showSignatures: true,
  leftSignatureTitle: 'Раскрой выполнил',
  rightSignatureTitle: 'Склад / Контроль ОТК',
};

export interface AppSettings {
  theme: AppTheme;
  barDensity: BarDensity;
  calcMode: CalcMode;
  timerSeconds: number;
  autoRecalcOnFocus: boolean;
  autoCheckUpdates: boolean;
  defaultStockLength: number;
  sidebarPinned: boolean;
  importOptions: ImportOptions;
  anglePresets: AnglePreset[];
  companyName: string;
  companyLogo: 'mobil' | 'custom' | 'none';
  companyPhone: string;
  companyWebsite: string;
  machineName: string;
  operatorName: string;
  reportConfig?: ReportDisplaySettings;
}

export interface CuttingTab {
  id: string;
  title: string;
  article?: string;
  colour?: string;
  sourceFile?: string;
  meta: DocumentMeta;
  stocks: Stock[];
  parts: Part[];
  config: CutConfig;
  plan: CuttingPlan | null;
  loading: boolean;
  error: string | null;
  calcTimeMs: number | null;
  lastCalculatedAt: string | null;
  isDirty: boolean;
}

export interface UpdateCheckResult {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  release_name: string;
  release_notes: string;
  release_url: string;
  published_at: string;
  asset_name?: string | null;
  asset_size?: number | null;
  download_url?: string | null;
}

export interface UpdateProgressEvent {
  downloaded: number;
  total: number;
  percent: number;
  stage: 'downloading' | 'verifying' | 'launching' | string;
}

export interface DocumentMeta {
  title: string;
  material: string;
  date: string;
  orderNumber?: string;
}

export interface CuttingPlan {
  patterns: CuttingPattern[];
  unplaced: Part[];
  summary: PlanSummary;
}
