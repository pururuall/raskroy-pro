mod advanced;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Stock {
    pub id: Option<String>,
    pub length: u32,
    pub quantity: Option<u32>, // None = unlimited
}

impl Stock {
    pub fn new(length: u32, quantity: Option<u32>) -> Self {
        Self {
            id: None,
            length,
            quantity,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Part {
    pub id: Option<String>,
    pub length: u32,
    pub quantity: u32,
    pub angle_left: Option<f32>,
    pub angle_right: Option<f32>,
    pub angle_extra_left: Option<f32>,
    pub angle_extra_right: Option<f32>,
    pub label: Option<String>,
}

impl Part {
    pub fn new(length: u32, quantity: u32) -> Self {
        Self {
            id: None,
            length,
            quantity,
            angle_left: None,
            angle_right: None,
            angle_extra_left: None,
            angle_extra_right: None,
            label: None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum CuttingAlgorithm {
    #[default]
    Auto,
    ColumnGeneration,
    BranchAndBound,
    KnapsackDp,
    KnapsackTolerance,
    BestFit,
    FirstFit,
    SimulatedAnnealing,
    MinPatterns,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CutConfig {
    pub cut_width: u32,      // Kerf (ширина пропила пилы, мм)
    pub trim_left: u32,      // Торцовка передней кромки (мм)
    pub trim_right: u32,     // Торцовка задней кромки (мм)
    pub min_remnant: u32,    // Порог делового остатка (мм)
    pub two_profiles: bool,  // Раскрой в 2 профиля (спаренный рез)
    #[serde(default)]
    pub algorithm: CuttingAlgorithm, // Выбранный алгоритм расчёта
}

impl Default for CutConfig {
    fn default() -> Self {
        Self {
            cut_width: 10,
            trim_left: 0,
            trim_right: 0,
            min_remnant: 1000,
            two_profiles: false,
            algorithm: CuttingAlgorithm::Auto,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RemnantType {
    Waste,    // Невозвратный отход (< min_remnant)
    Reusable, // Деловой полезный остаток (>= min_remnant)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlacedPart {
    pub part_id: Option<String>,
    pub length: u32,
    pub start_pos: u32,
    pub end_pos: u32,
    pub angle_left: Option<f32>,
    pub angle_right: Option<f32>,
    pub angle_extra_left: Option<f32>,
    pub angle_extra_right: Option<f32>,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CuttingPattern {
    pub stock_length: u32,
    pub count: u32, // Number of identical bars with this pattern
    pub parts: Vec<PlacedPart>,
    pub used_length: u32, // trim + parts + kerfs
    pub remnant_length: u32,
    pub remnant_type: RemnantType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlanSummary {
    pub total_parts_requested: u32,
    pub total_parts_placed: u32,
    pub total_stocks_used: u32,
    pub total_stock_length: u64,
    pub total_parts_length: u64,
    pub total_kerf_length: u64,
    pub total_reusable_length: u64,
    pub total_waste_length: u64,
    pub waste_percent: f64,
    pub efficiency_percent: f64, // КИМ (%)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CuttingPlan {
    pub patterns: Vec<CuttingPattern>,
    pub unplaced: Vec<Part>,
    pub summary: PlanSummary,
}

/// Solves 1D Cutting Stock Problem using multiple optimization strategies and returns the best plan.
pub fn calculate_cutting(
    stocks: &[Stock],
    parts: &[Part],
    config: &CutConfig,
) -> Result<CuttingPlan, String> {
    if stocks.is_empty() {
        return Err("Список заготовок пуст".to_string());
    }
    if parts.is_empty() {
        return Err("Список требуемых деталей пуст".to_string());
    }

    // Handle two_profiles mode if applicable
    let (scaled_parts, multiplier) = if config.two_profiles {
        let all_even = parts.iter().all(|p| p.quantity % 2 == 0);
        if all_even {
            let halved: Vec<Part> = parts
                .iter()
                .map(|p| {
                    let mut cp = p.clone();
                    cp.quantity /= 2;
                    cp
                })
                .collect();
            (halved, 2u32)
        } else {
            (parts.to_vec(), 1u32)
        }
    } else {
        (parts.to_vec(), 1u32)
    };

    // Run selected strategy or multi-strategy optimization
    let mut candidates = Vec::new();

    match config.algorithm {
        CuttingAlgorithm::ColumnGeneration => {
            if let Ok(plan) =
                advanced::solve_column_generation(stocks, &scaled_parts, parts, config, multiplier)
            {
                candidates.push(plan);
            }
        }
        CuttingAlgorithm::BranchAndBound => {
            if let Ok(plan) =
                advanced::solve_branch_and_bound(stocks, &scaled_parts, parts, config, multiplier)
            {
                candidates.push(plan);
            }
        }
        CuttingAlgorithm::KnapsackDp => {
            if let Ok(plan) = solve_knapsack_dp(stocks, &scaled_parts, parts, config, multiplier) {
                candidates.push(plan);
            }
        }
        CuttingAlgorithm::KnapsackTolerance => {
            if let Ok(plan) =
                solve_knapsack_dp_with_tolerance(stocks, &scaled_parts, parts, config, multiplier)
            {
                candidates.push(plan);
            }
        }
        CuttingAlgorithm::BestFit => {
            if let Ok(plan) = solve_bfd(stocks, &scaled_parts, parts, config, multiplier) {
                candidates.push(plan);
            }
        }
        CuttingAlgorithm::FirstFit => {
            if let Ok(plan) = solve_ffd(stocks, &scaled_parts, parts, config, multiplier) {
                candidates.push(plan);
            }
        }
        CuttingAlgorithm::SimulatedAnnealing => {
            if let Ok(plan) =
                advanced::solve_simulated_annealing(stocks, &scaled_parts, parts, config, multiplier)
            {
                candidates.push(plan);
            }
        }
        CuttingAlgorithm::Auto | CuttingAlgorithm::MinPatterns => {
            if let Ok(plan) = solve_knapsack_dp(stocks, &scaled_parts, parts, config, multiplier) {
                candidates.push(plan);
            }
            if let Ok(plan) = solve_bfd(stocks, &scaled_parts, parts, config, multiplier) {
                candidates.push(plan);
            }
            if let Ok(plan) = solve_ffd(stocks, &scaled_parts, parts, config, multiplier) {
                candidates.push(plan);
            }
            if let Ok(plan) =
                solve_knapsack_dp_with_tolerance(stocks, &scaled_parts, parts, config, multiplier)
            {
                candidates.push(plan);
            }
            if let Ok(plan) =
                advanced::solve_column_generation(stocks, &scaled_parts, parts, config, multiplier)
            {
                candidates.push(plan);
            }
            if let Ok(plan) =
                advanced::solve_simulated_annealing(stocks, &scaled_parts, parts, config, multiplier)
            {
                candidates.push(plan);
            }
            if let Ok(plan) =
                advanced::solve_branch_and_bound(stocks, &scaled_parts, parts, config, multiplier)
            {
                candidates.push(plan);
            }
        }
    }

    if candidates.is_empty() {
        return Err("Не удалось построить план раскроя".to_string());
    }

    if config.algorithm == CuttingAlgorithm::MinPatterns {
        // Prioritize minimal setup changes (fewest distinct patterns) among complete plans
        candidates.sort_by(|a, b| {
            let unplaced_a: u32 = a.unplaced.iter().map(|p| p.quantity).sum();
            let unplaced_b: u32 = b.unplaced.iter().map(|p| p.quantity).sum();
            unplaced_a
                .cmp(&unplaced_b)
                .then_with(|| a.patterns.len().cmp(&b.patterns.len()))
                .then_with(|| a.summary.total_stocks_used.cmp(&b.summary.total_stocks_used))
                .then_with(|| a.summary.total_waste_length.cmp(&b.summary.total_waste_length))
        });
    } else {
        // Default score: min unplaced -> min total stocks -> min total waste -> fewest pattern types
        candidates.sort_by(|a, b| {
            let unplaced_a: u32 = a.unplaced.iter().map(|p| p.quantity).sum();
            let unplaced_b: u32 = b.unplaced.iter().map(|p| p.quantity).sum();
            unplaced_a
                .cmp(&unplaced_b)
                .then_with(|| a.summary.total_stocks_used.cmp(&b.summary.total_stocks_used))
                .then_with(|| a.summary.total_waste_length.cmp(&b.summary.total_waste_length))
                .then_with(|| a.patterns.len().cmp(&b.patterns.len()))
        });
    }

    Ok(candidates.remove(0))
}

#[derive(Clone)]
struct PartItem {
    id: Option<String>,
    length: u32,
    angle_left: Option<f32>,
    angle_right: Option<f32>,
    angle_extra_left: Option<f32>,
    angle_extra_right: Option<f32>,
    label: Option<String>,
}

fn expand_parts(parts: &[Part]) -> Vec<PartItem> {
    let mut items = Vec::new();
    for p in parts {
        for _ in 0..p.quantity {
            items.push(PartItem {
                id: p.id.clone(),
                length: p.length,
                angle_left: p.angle_left,
                angle_right: p.angle_right,
                angle_extra_left: p.angle_extra_left,
                angle_extra_right: p.angle_extra_right,
                label: p.label.clone(),
            });
        }
    }
    items
}

/// Strategy 1: Knapsack DP
fn solve_knapsack_dp(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
) -> Result<CuttingPlan, String> {
    solve_knapsack_internal(stocks, scaled_parts, original_parts, config, multiplier, 0)
}

/// Strategy 3: Knapsack DP with tolerance
fn solve_knapsack_dp_with_tolerance(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
) -> Result<CuttingPlan, String> {
    solve_knapsack_internal(
        stocks,
        scaled_parts,
        original_parts,
        config,
        multiplier,
        config.cut_width * 2,
    )
}

fn solve_knapsack_internal(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
    tolerance: u32,
) -> Result<CuttingPlan, String> {
    let mut available_stocks: Vec<Stock> = stocks.to_vec();
    // Sort stocks descending by length
    available_stocks.sort_by(|a, b| b.length.cmp(&a.length));

    let mut remaining_items = expand_parts(scaled_parts);
    // Sort items descending by length
    remaining_items.sort_by(|a, b| b.length.cmp(&a.length));

    let mut raw_patterns: Vec<(u32, Vec<PartItem>)> = Vec::new();

    while !remaining_items.is_empty() {
        let min_item_len = remaining_items.last().unwrap().length;

        // Choose stock
        let stock_idx = available_stocks.iter().position(|s| {
            let usable = s.length.saturating_sub(config.trim_left + config.trim_right);
            let has_qty = s.quantity.map(|q| q > 0).unwrap_or(true);
            has_qty && usable >= min_item_len + config.cut_width
        });

        let stock_idx = match stock_idx {
            Some(idx) => idx,
            None => break, // No stock can fit remaining items
        };

        let stock_len = available_stocks[stock_idx].length;
        if let Some(q) = &mut available_stocks[stock_idx].quantity {
            *q = q.saturating_sub(1);
        }

        let usable_capacity = stock_len.saturating_sub(config.trim_left + config.trim_right);

        let chosen_indices = knapsack_best_fit(&remaining_items, usable_capacity, config.cut_width, tolerance);

        if chosen_indices.is_empty() {
            continue;
        }

        let mut chosen_items = Vec::new();
        for &idx in chosen_indices.iter().rev() {
            chosen_items.push(remaining_items.remove(idx));
        }
        chosen_items.reverse();

        raw_patterns.push((stock_len, chosen_items));
    }

    let unplaced = group_unplaced(&remaining_items, multiplier);
    let patterns = group_patterns(raw_patterns, config, multiplier);
    let summary = build_summary(original_parts, &patterns, &unplaced, config, multiplier);

    Ok(CuttingPlan {
        patterns,
        unplaced,
        summary,
    })
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum GreedyMode {
    BestFit,
    FirstFit,
}

/// Strategy 2: Best Fit Decreasing (tightest remaining bin)
fn solve_bfd(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
) -> Result<CuttingPlan, String> {
    solve_greedy_fit(stocks, scaled_parts, original_parts, config, multiplier, GreedyMode::BestFit)
}

/// Strategy 4: First Fit Decreasing (first open bin that fits)
fn solve_ffd(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
) -> Result<CuttingPlan, String> {
    solve_greedy_fit(stocks, scaled_parts, original_parts, config, multiplier, GreedyMode::FirstFit)
}

fn solve_greedy_fit(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
    mode: GreedyMode,
) -> Result<CuttingPlan, String> {
    let mut available_stocks: Vec<Stock> = stocks.to_vec();
    available_stocks.sort_by(|a, b| b.length.cmp(&a.length));

    let mut remaining_items = expand_parts(scaled_parts);
    remaining_items.sort_by(|a, b| b.length.cmp(&a.length));

    struct OpenBar {
        stock_length: u32,
        remaining_space: u32,
        items: Vec<PartItem>,
    }

    let mut open_bars: Vec<OpenBar> = Vec::new();

    'item_loop: for item in remaining_items.into_iter() {
        let needed = item.length + config.cut_width;

        let chosen_bar_idx = match mode {
            GreedyMode::BestFit => {
                let mut best_bar_idx = None;
                let mut min_rem = u32::MAX;
                for (idx, bar) in open_bars.iter().enumerate() {
                    if bar.remaining_space >= needed && bar.remaining_space < min_rem {
                        min_rem = bar.remaining_space;
                        best_bar_idx = Some(idx);
                    }
                }
                best_bar_idx
            }
            GreedyMode::FirstFit => open_bars
                .iter()
                .position(|bar| bar.remaining_space >= needed),
        };

        if let Some(idx) = chosen_bar_idx {
            let bar = &mut open_bars[idx];
            bar.remaining_space -= needed;
            bar.items.push(item);
            continue 'item_loop;
        }

        let stock_idx = available_stocks.iter().position(|s| {
            let usable = s.length.saturating_sub(config.trim_left + config.trim_right);
            let has_qty = s.quantity.map(|q| q > 0).unwrap_or(true);
            has_qty && usable >= needed
        });

        if let Some(s_idx) = stock_idx {
            let s_len = available_stocks[s_idx].length;
            if let Some(q) = &mut available_stocks[s_idx].quantity {
                *q = q.saturating_sub(1);
            }
            let usable = s_len.saturating_sub(config.trim_left + config.trim_right);
            open_bars.push(OpenBar {
                stock_length: s_len,
                remaining_space: usable - needed,
                items: vec![item],
            });
        } else {
            let unplaced = vec![Part {
                id: item.id,
                length: item.length,
                quantity: multiplier,
                angle_left: item.angle_left,
                angle_right: item.angle_right,
                angle_extra_left: item.angle_extra_left,
                angle_extra_right: item.angle_extra_right,
                label: item.label,
            }];
            let raw_patterns: Vec<(u32, Vec<PartItem>)> = open_bars
                .into_iter()
                .map(|b| (b.stock_length, b.items))
                .collect();
            let patterns = group_patterns(raw_patterns, config, multiplier);
            let summary = build_summary(original_parts, &patterns, &unplaced, config, multiplier);
            return Ok(CuttingPlan {
                patterns,
                unplaced,
                summary,
            });
        }
    }

    let raw_patterns: Vec<(u32, Vec<PartItem>)> = open_bars
        .into_iter()
        .map(|b| (b.stock_length, b.items))
        .collect();
    let patterns = group_patterns(raw_patterns, config, multiplier);
    let summary = build_summary(original_parts, &patterns, &[], config, multiplier);

    Ok(CuttingPlan {
        patterns,
        unplaced: Vec::new(),
        summary,
    })
}

fn knapsack_best_fit(
    items: &[PartItem],
    capacity: u32,
    cut_width: u32,
    tolerance: u32,
) -> Vec<usize> {
    let cap = capacity as usize;
    if cap == 0 || items.is_empty() {
        return Vec::new();
    }

    let mut dp = vec![(-1i32, -1i32); cap + 1];
    dp[0] = (0, -1);

    for (item_idx, item) in items.iter().enumerate() {
        let weight = (item.length + cut_width) as usize;
        if weight > cap {
            continue;
        }

        for w in (weight..=cap).rev() {
            let prev_w = w - weight;
            if dp[prev_w].0 >= 0 && dp[w].0 < 0 {
                dp[w] = (prev_w as i32, item_idx as i32);
            }
        }
    }

    let search_floor = if cap > tolerance as usize {
        cap - tolerance as usize
    } else {
        0
    };

    let mut best_w = None;
    for w in (search_floor..=cap).rev() {
        if dp[w].0 >= 0 {
            best_w = Some(w);
            break;
        }
    }

    if best_w.is_none() {
        for w in (1..=cap).rev() {
            if dp[w].0 >= 0 {
                best_w = Some(w);
                break;
            }
        }
    }

    match best_w {
        Some(mut curr_w) => {
            let mut chosen = Vec::new();
            while curr_w > 0 && dp[curr_w].1 >= 0 {
                let item_idx = dp[curr_w].1 as usize;
                chosen.push(item_idx);
                curr_w = dp[curr_w].0 as usize;
            }
            chosen.sort_unstable();
            chosen
        }
        None => Vec::new(),
    }
}

fn group_unplaced(items: &[PartItem], multiplier: u32) -> Vec<Part> {
    use std::collections::BTreeMap;
    let mut map: BTreeMap<u32, u32> = BTreeMap::new();
    for it in items {
        *map.entry(it.length).or_insert(0) += multiplier;
    }
    map.into_iter()
        .map(|(len, qty)| Part::new(len, qty))
        .collect()
}

fn group_patterns(
    raw: Vec<(u32, Vec<PartItem>)>,
    config: &CutConfig,
    multiplier: u32,
) -> Vec<CuttingPattern> {
    use std::collections::HashMap;

    let mut pattern_map: HashMap<(u32, Vec<u32>), (CuttingPattern, u32)> = HashMap::new();
    let mut order_keys = Vec::new();

    for (stock_len, items) in raw {
        let key = (stock_len, items.iter().map(|it| it.length).collect::<Vec<_>>());

        if let Some((_, count)) = pattern_map.get_mut(&key) {
            *count += multiplier;
        } else {
            let mut placed = Vec::new();
            let mut current_pos = config.trim_left;
            let mut used_len = config.trim_left;

            for it in items {
                let start = current_pos;
                let end = start + it.length;
                placed.push(PlacedPart {
                    part_id: it.id,
                    length: it.length,
                    start_pos: start,
                    end_pos: end,
                    angle_left: it.angle_left,
                    angle_right: it.angle_right,
                    angle_extra_left: it.angle_extra_left,
                    angle_extra_right: it.angle_extra_right,
                    label: it.label,
                });
                current_pos = end + config.cut_width;
                used_len += it.length + config.cut_width;
            }

            let remnant = stock_len.saturating_sub(used_len + config.trim_right);
            let rem_type = if remnant >= config.min_remnant {
                RemnantType::Reusable
            } else {
                RemnantType::Waste
            };

            let pat = CuttingPattern {
                stock_length: stock_len,
                count: multiplier,
                parts: placed,
                used_length: used_len,
                remnant_length: remnant,
                remnant_type: rem_type,
            };

            order_keys.push(key.clone());
            pattern_map.insert(key, (pat, multiplier));
        }
    }

    order_keys
        .into_iter()
        .map(|k| {
            let (mut pat, count) = pattern_map.remove(&k).unwrap();
            pat.count = count;
            pat
        })
        .collect()
}

fn build_summary(
    requested_parts: &[Part],
    patterns: &[CuttingPattern],
    unplaced: &[Part],
    config: &CutConfig,
    _multiplier: u32,
) -> PlanSummary {
    let total_parts_requested: u32 = requested_parts.iter().map(|p| p.quantity).sum();
    let total_unplaced: u32 = unplaced.iter().map(|p| p.quantity).sum();
    let total_parts_placed = total_parts_requested.saturating_sub(total_unplaced);

    let mut total_stocks_used = 0u32;
    let mut total_stock_length = 0u64;
    let mut total_parts_length = 0u64;
    let mut total_kerf_length = 0u64;
    let mut total_reusable_length = 0u64;
    let mut total_waste_length = 0u64;

    for pat in patterns {
        total_stocks_used += pat.count;
        total_stock_length += (pat.stock_length as u64) * (pat.count as u64);

        let parts_in_pat: u64 = pat.parts.iter().map(|p| p.length as u64).sum();
        total_parts_length += parts_in_pat * (pat.count as u64);

        let kerfs = (pat.parts.len() as u64) * (config.cut_width as u64)
            + (config.trim_left as u64)
            + (config.trim_right as u64);
        total_kerf_length += kerfs * (pat.count as u64);

        match pat.remnant_type {
            RemnantType::Reusable => {
                total_reusable_length += (pat.remnant_length as u64) * (pat.count as u64);
            }
            RemnantType::Waste => {
                total_waste_length += (pat.remnant_length as u64) * (pat.count as u64);
            }
        }
    }

    let waste_percent = if total_stock_length > 0 {
        (total_waste_length as f64 / total_stock_length as f64) * 100.0
    } else {
        0.0
    };

    let efficiency_percent = if total_stock_length > 0 {
        (total_parts_length as f64 / total_stock_length as f64) * 100.0
    } else {
        0.0
    };

    PlanSummary {
        total_parts_requested,
        total_parts_placed,
        total_stocks_used,
        total_stock_length,
        total_parts_length,
        total_kerf_length,
        total_reusable_length,
        total_waste_length,
        waste_percent,
        efficiency_percent,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_benchmark_from_excel_file() {
        let stocks = vec![Stock::new(6100, None)];
        let parts = vec![
            Part::new(2700, 37),
            Part::new(2400, 12),
            Part::new(2067, 1),
            Part::new(2260, 2),
            Part::new(1875, 4),
            Part::new(1625, 2),
            Part::new(2595, 4),
            Part::new(2500, 4),
            Part::new(2200, 1),
            Part::new(2950, 4),
        ];

        let config = CutConfig {
            cut_width: 10,
            trim_left: 0,
            trim_right: 0,
            min_remnant: 1000,
            two_profiles: false,
            algorithm: CuttingAlgorithm::Auto,
        };

        let start = std::time::Instant::now();
        let plan = calculate_cutting(&stocks, &parts, &config).expect("Calculation failed");
        let elapsed = start.elapsed();

        assert_eq!(plan.summary.total_parts_placed, 71);
        assert!(plan.unplaced.is_empty(), "All parts must be placed");
        assert!(plan.summary.total_stocks_used <= 34);
        assert!(elapsed.as_millis() < 500);
    }

    #[test]
    fn test_limited_stock_unplaced() {
        let stocks = vec![Stock::new(3000, Some(1))];
        let parts = vec![
            Part::new(1000, 2),
            Part::new(2000, 2),
        ];
        let config = CutConfig {
            cut_width: 10,
            trim_left: 0,
            trim_right: 0,
            min_remnant: 500,
            two_profiles: false,
            algorithm: CuttingAlgorithm::Auto,
        };

        let plan = calculate_cutting(&stocks, &parts, &config).expect("Calculation failed");
        assert_eq!(plan.summary.total_stocks_used, 1);
        assert!(!plan.unplaced.is_empty());
        let unplaced_count: u32 = plan.unplaced.iter().map(|p| p.quantity).sum();
        assert_eq!(plan.summary.total_parts_placed + unplaced_count, 4);
    }

    #[test]
    fn test_two_profiles_mode() {
        let stocks = vec![Stock::new(6000, None)];
        let parts = vec![
            Part::new(2000, 6),
            Part::new(1500, 4),
        ];
        let config = CutConfig {
            cut_width: 10,
            trim_left: 0,
            trim_right: 0,
            min_remnant: 500,
            two_profiles: true,
            algorithm: CuttingAlgorithm::Auto,
        };

        let plan = calculate_cutting(&stocks, &parts, &config).expect("Calculation failed");
        assert_eq!(plan.summary.total_parts_placed, 10);
        assert!(plan.unplaced.is_empty());
        assert!(plan.summary.total_stocks_used > 0);
    }

    #[test]
    fn test_trim_reduces_usable_capacity() {
        let stocks = vec![Stock::new(1000, Some(1))];
        let parts = vec![Part::new(980, 1)];

        let config_no_trim = CutConfig {
            cut_width: 10,
            trim_left: 0,
            trim_right: 0,
            min_remnant: 100,
            two_profiles: false,
            algorithm: CuttingAlgorithm::Auto,
        };
        let plan1 = calculate_cutting(&stocks, &parts, &config_no_trim).unwrap();
        assert_eq!(plan1.summary.total_parts_placed, 1);

        let config_with_trim = CutConfig {
            cut_width: 10,
            trim_left: 15,
            trim_right: 10,
            min_remnant: 100,
            two_profiles: false,
            algorithm: CuttingAlgorithm::Auto,
        };
        let plan2 = calculate_cutting(&stocks, &parts, &config_with_trim).unwrap();
        assert_eq!(plan2.summary.total_parts_placed, 0);
        assert_eq!(plan2.unplaced.len(), 1);
    }

    #[test]
    fn test_all_algorithm_modes() {
        let stocks = vec![Stock::new(6100, None)];
        let parts = vec![
            Part::new(2700, 12),
            Part::new(2400, 8),
            Part::new(1875, 4),
            Part::new(1625, 4),
        ];

        for algo in [
            CuttingAlgorithm::Auto,
            CuttingAlgorithm::ColumnGeneration,
            CuttingAlgorithm::BranchAndBound,
            CuttingAlgorithm::KnapsackDp,
            CuttingAlgorithm::KnapsackTolerance,
            CuttingAlgorithm::BestFit,
            CuttingAlgorithm::FirstFit,
            CuttingAlgorithm::SimulatedAnnealing,
            CuttingAlgorithm::MinPatterns,
        ] {
            let cfg = CutConfig {
                algorithm: algo,
                ..CutConfig::default()
            };
            let plan = calculate_cutting(&stocks, &parts, &cfg).expect("Algo failed");
            assert_eq!(plan.summary.total_parts_placed, 28);
            assert!(plan.unplaced.is_empty());
        }

        // Verify benchmark case across Column Generation, B&B, and Simulated Annealing too
        let bench_stocks = vec![Stock::new(6100, None)];
        let bench_parts = vec![
            Part::new(2700, 37),
            Part::new(2400, 12),
            Part::new(2067, 1),
            Part::new(2260, 2),
            Part::new(1875, 4),
            Part::new(1625, 2),
            Part::new(2595, 4),
            Part::new(2500, 4),
            Part::new(2200, 1),
            Part::new(2950, 4),
        ];
        for algo in [
            CuttingAlgorithm::ColumnGeneration,
            CuttingAlgorithm::BranchAndBound,
            CuttingAlgorithm::SimulatedAnnealing,
        ] {
            let cfg = CutConfig {
                algorithm: algo,
                ..CutConfig::default()
            };
            let plan = calculate_cutting(&bench_stocks, &bench_parts, &cfg).expect("Bench failed");
            assert_eq!(plan.summary.total_parts_placed, 71);
            assert!(plan.unplaced.is_empty());
        }
    }
}
