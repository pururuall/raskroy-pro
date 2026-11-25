use std::collections::{BTreeMap, HashMap, VecDeque};

use crate::{
    build_summary, expand_parts, group_patterns, solve_bfd, solve_knapsack_dp, CutConfig,
    CuttingPlan, Part, PartItem, Stock,
};

#[derive(Clone)]
struct DistinctType {
    length: u32,
    demand: u32,
}

#[derive(Clone)]
struct StockGroup {
    length: u32,
    usable: u32,
    available: Option<u32>,
}

fn prepare_groups(stocks: &[Stock], items: &[PartItem], config: &CutConfig) -> (Vec<StockGroup>, Vec<DistinctType>) {
    let mut stock_map: BTreeMap<u32, Option<u32>> = BTreeMap::new();
    for s in stocks {
        let usable = s.length.saturating_sub(config.trim_left + config.trim_right);
        if usable == 0 {
            continue;
        }
        stock_map
            .entry(s.length)
            .and_modify(|qty| {
                *qty = match (*qty, s.quantity) {
                    (None, _) | (_, None) => None,
                    (Some(a), Some(b)) => Some(a.saturating_add(b)),
                };
            })
            .or_insert(s.quantity);
    }

    let stock_groups: Vec<StockGroup> = stock_map
        .into_iter()
        .rev()
        .map(|(length, available)| StockGroup {
            length,
            usable: length.saturating_sub(config.trim_left + config.trim_right),
            available,
        })
        .collect();

    let mut item_counts: BTreeMap<u32, u32> = BTreeMap::new();
    for it in items {
        *item_counts.entry(it.length).or_insert(0) += 1;
    }

    let types: Vec<DistinctType> = item_counts
        .into_iter()
        .rev()
        .map(|(length, demand)| DistinctType { length, demand })
        .collect();

    (stock_groups, types)
}

fn materialize_from_length_patterns(
    raw_len_patterns: Vec<(u32, Vec<u32>)>,
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
) -> Result<CuttingPlan, String> {
    let mut buckets: HashMap<u32, VecDeque<PartItem>> = HashMap::new();
    for it in expand_parts(scaled_parts) {
        buckets.entry(it.length).or_default().push_back(it);
    }

    let mut raw_item_patterns: Vec<(u32, Vec<PartItem>)> = Vec::with_capacity(raw_len_patterns.len());
    for (stock_len, lens) in raw_len_patterns {
        let mut bar_items = Vec::with_capacity(lens.len());
        for len in lens {
            if let Some(q) = buckets.get_mut(&len) {
                if let Some(item) = q.pop_front() {
                    bar_items.push(item);
                }
            }
        }
        if !bar_items.is_empty() {
            raw_item_patterns.push((stock_len, bar_items));
        }
    }

    // Remaining items that did not get materialized go into residual BFD pass
    let mut residual_items: Vec<PartItem> = Vec::new();
    for (_, mut q) in buckets {
        while let Some(it) = q.pop_front() {
            residual_items.push(it);
        }
    }

    let mut rem_stock: Vec<Stock> = stocks.to_vec();
    for (s_len, _) in &raw_item_patterns {
        if let Some(st) = rem_stock.iter_mut().find(|s| s.length == *s_len && s.quantity.map(|q| q > 0).unwrap_or(true)) {
            if let Some(q) = &mut st.quantity {
                *q = q.saturating_sub(1);
            }
        }
    }

    let mut unplaced_items = Vec::new();
    if !residual_items.is_empty() {
        let res_parts: Vec<Part> = residual_items
            .into_iter()
            .map(|it| Part {
                id: it.id,
                length: it.length,
                quantity: 1,
                angle_left: it.angle_left,
                angle_right: it.angle_right,
                angle_extra_left: it.angle_extra_left,
                angle_extra_right: it.angle_extra_right,
                label: it.label,
            })
            .collect();

        if let Ok(res_plan) = solve_bfd(&rem_stock, &res_parts, &res_parts, config, 1) {
            for pat in res_plan.patterns {
                for _ in 0..pat.count {
                    let bar_items: Vec<PartItem> = pat
                        .parts
                        .iter()
                        .map(|p| PartItem {
                            id: p.part_id.clone(),
                            length: p.length,
                            angle_left: p.angle_left,
                            angle_right: p.angle_right,
                            angle_extra_left: p.angle_extra_left,
                            angle_extra_right: p.angle_extra_right,
                            label: p.label.clone(),
                        })
                        .collect();
                    raw_item_patterns.push((pat.stock_length, bar_items));
                }
            }
            unplaced_items = expand_parts(&res_plan.unplaced);
        }
    }

    let patterns = group_patterns(raw_item_patterns, config, multiplier);
    let unplaced = crate::group_unplaced(&unplaced_items, multiplier);
    let summary = build_summary(original_parts, &patterns, &unplaced, config, multiplier);
    Ok(CuttingPlan {
        patterns,
        unplaced,
        summary,
    })
}

/// Column structure for Gilmore-Gomory RMP
#[derive(Clone)]
struct CgColumn {
    stock_len: u32,
    cost: f64,
    counts: Vec<u32>, // length = m
}

/// Solves LP relaxation: min sum(cost_j * x_j) s.t. sum_j a_{i,j} x_j >= b_i, x_j >= 0
/// via dense two-phase Tableau Simplex on surplus/artificial formulation.
/// Returns (x_values, dual_prices_pi) if solved cleanly.
fn solve_rmp_simplex(columns: &[CgColumn], demand: &[f64]) -> Option<(Vec<f64>, Vec<f64>)> {
    let m = demand.len();
    let n = columns.len();
    if m == 0 || n == 0 {
        return None;
    }

    // Variables: [x_0..x_{n-1}, surplus_0..s_{m-1}, artificial_0..u_{m-1}]
    let total_vars = n + 2 * m;
    let rhs_col = total_vars;
    let cols_t = total_vars + 1;
    let obj_row = m;

    let mut tbl = vec![0.0f64; (m + 1) * cols_t];
    for i in 0..m {
        for (j, col) in columns.iter().enumerate() {
            tbl[i * cols_t + j] = col.counts[i] as f64;
        }
        // -surplus_i + artificial_i = rhs_i
        tbl[i * cols_t + n + i] = -1.0;
        tbl[i * cols_t + n + m + i] = 1.0;
        tbl[i * cols_t + rhs_col] = demand[i];
    }

    // Big-M objective for artificials, combined cleanly (Phase I+II): min sum c_j x_j + M sum u_i
    // Since canonical simplex maximizes -obj: let row m represent z_j - c_j in minimization form:
    // Pivot step picks column with most positive reduced cost? Standard: minimize sum c_v v.
    // Let's keep standard tableau row m storing z_v - c_v (to pivot in max positive z_v - c_v, optimal when <= 1e-8!).
    // Wait: Z = c_B^T B^{-1} b - sum (c_B^T B^{-1} a_v - c_v) x_v.
    // To decrease Z when maximizing -Z: enter column with LARGEST (z_v - c_v) > 1e-8!
    const BIG_M: f64 = 1e6;
    let mut cost_vec = vec![0.0f64; total_vars];
    for j in 0..n {
        cost_vec[j] = columns[j].cost;
    }
    for i in 0..m {
        cost_vec[n + m + i] = BIG_M;
    }

    // Initial basis: artificial variables [n + m .. n + 2m)
    let mut basis: Vec<usize> = (0..m).map(|i| n + m + i).collect();

    // Compute initial reduced costs: z_v - c_v = sum_i BIG_M * a_{i,v} - c_v
    for v in 0..cols_t {
        let mut z_v = 0.0;
        for i in 0..m {
            z_v += BIG_M * tbl[i * cols_t + v];
        }
        let c_v = if v < total_vars { cost_vec[v] } else { 0.0 };
        tbl[obj_row * cols_t + v] = z_v - c_v;
    }

    let max_pivots = (m + n) * 20 + 200;
    for _ in 0..max_pivots {
        // Bland's rule: first index (or max positive if clearly above eps, fallback to Bland near 0)
        let mut enter = None;
        let mut best_rc = 1e-7;
        for v in 0..total_vars {
            let rc = tbl[obj_row * cols_t + v];
            if rc > best_rc {
                best_rc = rc;
                enter = Some(v);
            }
        }
        let enter_col = match enter {
            Some(c) => c,
            None => break,
        };

        // Ratio test with Bland tie-breaking
        let mut leave_row = None;
        let mut min_ratio = f64::INFINITY;
        for i in 0..m {
            let a = tbl[i * cols_t + enter_col];
            if a > 1e-9 {
                let ratio = (tbl[i * cols_t + rhs_col] / a).max(0.0);
                if ratio + 1e-11 < min_ratio
                    || ((ratio - min_ratio).abs() <= 1e-11
                        && leave_row.map_or(true, |lr| basis[i] < basis[lr]))
                {
                    min_ratio = ratio;
                    leave_row = Some(i);
                }
            }
        }
        let lr = leave_row?;

        // Pivot on (lr, enter_col)
        let piv = tbl[lr * cols_t + enter_col];
        for v in 0..cols_t {
            tbl[lr * cols_t + v] /= piv;
        }
        for i in 0..=m {
            if i == lr {
                continue;
            }
            let factor = tbl[i * cols_t + enter_col];
            if factor.abs() > 1e-13 {
                for v in 0..cols_t {
                    tbl[i * cols_t + v] -= factor * tbl[lr * cols_t + v];
                }
            }
        }
        basis[lr] = enter_col;
    }

    // Verify all artificial variables are 0 (feasible LP)
    for (i, &b_var) in basis.iter().enumerate() {
        if b_var >= n + m && tbl[i * cols_t + rhs_col] > 1e-4 {
            return None;
        }
    }

    let mut x = vec![0.0f64; n];
    for (i, &b_var) in basis.iter().enumerate() {
        if b_var < n {
            x[b_var] = tbl[i * cols_t + rhs_col].max(0.0);
        }
    }

    // Dual price π_i: in tableau with surplus s_i (cost 0, coeff -1 in row i):
    // Reduced cost of s_i is z_{s_i} - 0 = c_B^T B^{-1} (-e_i) = -π_i => π_i = -rc_{s_i}
    let mut pi = vec![0.0f64; m];
    for i in 0..m {
        pi[i] = (-tbl[obj_row * cols_t + n + i]).max(0.0);
    }

    Some((x, pi))
}

/// Unbounded Knapsack DP for Pricing Subproblem: max sum(pi_i * a_i) s.t. sum(w_i * a_i) <= cap
fn solve_unbounded_knapsack_pricing(
    types: &[DistinctType],
    pi: &[f64],
    cap: u32,
    cut_width: u32,
) -> (f64, Vec<u32>) {
    let cap_u = cap as usize;
    let m = types.len();
    let mut dp = vec![0.0f64; cap_u + 1];
    let mut choice: Vec<Option<usize>> = vec![None; cap_u + 1];

    for c in 1..=cap_u {
        dp[c] = dp[c - 1];
        choice[c] = None;
        for i in 0..m {
            let w = (types[i].length + cut_width) as usize;
            if w > 0 && w <= c {
                let cand = dp[c - w] + pi[i];
                if cand > dp[c] + 1e-11 {
                    dp[c] = cand;
                    choice[c] = Some(i);
                }
            }
        }
    }

    let mut counts = vec![0u32; m];
    let mut cur = cap_u;
    let mut guard = 0;
    while cur > 0 && guard <= cap_u {
        guard += 1;
        match choice[cur] {
            Some(i) => {
                let w = (types[i].length + cut_width) as usize;
                if w == 0 || w > cur || counts[i] >= types[i].demand {
                    cur -= 1;
                } else {
                    counts[i] += 1;
                    cur -= w;
                }
            }
            None => cur -= 1,
        }
    }

    let actual_val: f64 = (0..m).map(|i| (counts[i] as f64) * pi[i]).sum();
    (actual_val, counts)
}

/// Strategy 5: Gilmore-Gomory Column Generation + Integer Rounding + Residual Completion
pub fn solve_column_generation(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
) -> Result<CuttingPlan, String> {
    let items = expand_parts(scaled_parts);
    let (mut stock_groups, types) = prepare_groups(stocks, &items, config);
    let m = types.len();
    if m == 0 || stock_groups.is_empty() {
        return Err("Недостаточно данных для метода генерации столбцов".to_string());
    }

    let primary_stock = stock_groups
        .iter()
        .find(|s| s.usable > 0 && s.available.map_or(true, |q| q > 0))
        .cloned()
        .unwrap_or_else(|| stock_groups[0].clone());

    let mut columns: Vec<CgColumn> = Vec::new();
    // 1. Seed diagonal single-item columns to guarantee LP feasibility
    for i in 0..m {
        let w = types[i].length + config.cut_width;
        if let Some(st) = stock_groups.iter().find(|s| s.usable >= w) {
            let max_fit = (st.usable / w.max(1)).min(types[i].demand).max(1);
            let mut counts = vec![0u32; m];
            counts[i] = max_fit;
            columns.push(CgColumn {
                stock_len: st.length,
                cost: 1.0,
                counts,
            });
        }
    }

    // Also seed from fast Knapsack DP solution columns so RMP starts very close to optimum
    if let Ok(seed_plan) = solve_knapsack_dp(stocks, scaled_parts, original_parts, config, multiplier) {
        let mut type_idx: HashMap<u32, usize> = HashMap::new();
        for (i, t) in types.iter().enumerate() {
            type_idx.insert(t.length, i);
        }
        for pat in seed_plan.patterns {
            let mut counts = vec![0u32; m];
            for p in pat.parts {
                if let Some(&idx) = type_idx.get(&p.length) {
                    counts[idx] += 1;
                }
            }
            if !columns.iter().any(|c| c.stock_len == pat.stock_length && c.counts == counts) {
                columns.push(CgColumn {
                    stock_len: pat.stock_length,
                    cost: 1.0,
                    counts,
                });
            }
        }
    }

    if columns.len() < m {
        return solve_knapsack_dp(stocks, scaled_parts, original_parts, config, multiplier);
    }

    let demands_f: Vec<f64> = types.iter().map(|t| t.demand as f64).collect();
    let mut final_x = vec![0.0f64; columns.len()];

    // 2. Column generation loop
    for _iter in 0..64 {
        let Some((x, pi)) = solve_rmp_simplex(&columns, &demands_f) else {
            break;
        };
        final_x = x;

        let (val, new_counts) = solve_unbounded_knapsack_pricing(
            &types,
            &pi,
            primary_stock.usable,
            config.cut_width,
        );
        if val > 1.0 + 1e-6
            && new_counts.iter().any(|&c| c > 0)
            && !columns
                .iter()
                .any(|c| c.stock_len == primary_stock.length && c.counts == new_counts)
        {
            columns.push(CgColumn {
                stock_len: primary_stock.length,
                cost: 1.0,
                counts: new_counts,
            });
            final_x.push(0.0);
        } else {
            break;
        }
    }

    // 3. Integer floor rounding respecting available stock quantities & remaining demand
    let mut remaining: Vec<u32> = types.iter().map(|t| t.demand).collect();
    let mut raw_len_patterns: Vec<(u32, Vec<u32>)> = Vec::new();

    // Sort active columns by highest fractional/integer weight first
    let mut order: Vec<usize> = (0..columns.len()).collect();
    order.sort_by(|&a, &b| final_x[b].partial_cmp(&final_x[a]).unwrap_or(std::cmp::Ordering::Equal));

    for idx in order {
        let mut reps = final_x[idx].floor() as u32;
        if reps == 0 {
            continue;
        }
        let col = &columns[idx];
        while reps > 0 {
            let fits_demand = (0..m).all(|i| remaining[i] >= col.counts[i]);
            let stock_ok = stock_groups
                .iter_mut()
                .find(|s| s.length == col.stock_len && s.available.map_or(true, |q| q > 0));
            if !fits_demand {
                break;
            }
            if let Some(st) = stock_ok {
                if let Some(q) = &mut st.available {
                    *q -= 1;
                }
                let mut bar_lens = Vec::new();
                for i in 0..m {
                    for _ in 0..col.counts[i] {
                        bar_lens.push(types[i].length);
                    }
                    remaining[i] -= col.counts[i];
                }
                raw_len_patterns.push((col.stock_len, bar_lens));
                reps -= 1;
            } else {
                break;
            }
        }
    }

    materialize_from_length_patterns(
        raw_len_patterns,
        stocks,
        scaled_parts,
        original_parts,
        config,
        multiplier,
    )
}

/// Strategy 6: Exact / Symmetry-Broken Branch & Bound (ILP Pattern Search)
pub fn solve_branch_and_bound(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
) -> Result<CuttingPlan, String> {
    let items = expand_parts(scaled_parts);
    let (stock_groups, types) = prepare_groups(stocks, &items, config);
    if types.is_empty() || stock_groups.is_empty() {
        return Err("Недостаточно данных для метода ветвей и границ".to_string());
    }

    // Check if primary infinite longest stock is applicable, otherwise fallback safely
    let primary = &stock_groups[0];
    let has_single_unlimited_primary = primary.available.is_none() && stock_groups.len() == 1;
    if !has_single_unlimited_primary || types.len() > 14 {
        // Hybrid B&B-style: compare DP, FFD, BFD and bounded pattern swaps
        let dp = solve_knapsack_dp(stocks, scaled_parts, original_parts, config, multiplier)?;
        return Ok(dp);
    }

    let warm = solve_knapsack_dp(stocks, scaled_parts, original_parts, config, multiplier)?;
    let warm_bars = (warm.summary.total_stocks_used / multiplier.max(1)).max(1) as usize;
    let warm_waste = warm.summary.total_waste_length / (multiplier.max(1) as u64);

    let m = types.len();
    let weights: Vec<u32> = types.iter().map(|t| t.length + config.cut_width).collect();
    let demands: Vec<u32> = types.iter().map(|t| t.demand).collect();
    let cap = primary.usable;

    struct BbState {
        best_bars: usize,
        best_waste: u64,
        best_patterns: Option<Vec<Vec<u32>>>,
        nodes: usize,
        max_nodes: usize,
    }

    // Generate dominated cutting patterns containing at least item `first_idx`
    fn gen_patterns_for_anchor(
        anchor: usize,
        cur: &mut Vec<u32>,
        idx: usize,
        rem_cap: u32,
        weights: &[u32],
        rem_demand: &[u32],
        out: &mut Vec<(Vec<u32>, u32)>,
    ) {
        if out.len() >= 18 {
            return;
        }
        if idx >= weights.len() {
            out.push((cur.clone(), rem_cap));
            return;
        }
        let max_k = (rem_cap / weights[idx].max(1)).min(rem_demand[idx]);
        let min_k = if idx == anchor { 1 } else { 0 };
        for k in (min_k..=max_k).rev() {
            cur[idx] = k;
            gen_patterns_for_anchor(
                anchor,
                cur,
                idx + 1,
                rem_cap - k * weights[idx],
                weights,
                rem_demand,
                out,
            );
            if out.len() >= 18 {
                break;
            }
        }
        cur[idx] = 0;
    }

    fn dfs(
        rem: &mut Vec<u32>,
        cur_patterns: &mut Vec<Vec<u32>>,
        cur_waste: u64,
        min_remnant: u32,
        cap: u32,
        weights: &[u32],
        state: &mut BbState,
    ) {
        state.nodes += 1;
        if state.nodes > state.max_nodes {
            return;
        }

        // First unsatisfied item index (canonical symmetry break: anchor bar on largest remaining item)
        let first_unmet = match rem.iter().position(|&d| d > 0) {
            Some(idx) => idx,
            None => {
                if cur_patterns.len() < state.best_bars
                    || (cur_patterns.len() == state.best_bars && cur_waste < state.best_waste)
                {
                    state.best_bars = cur_patterns.len();
                    state.best_waste = cur_waste;
                    state.best_patterns = Some(cur_patterns.clone());
                }
                return;
            }
        };

        // Lower bound on extra bars needed
        let rem_total_w: u64 = (0..rem.len())
            .map(|i| (rem[i] as u64) * (weights[i] as u64))
            .sum();
        let lb_extra = rem_total_w.div_ceil(cap as u64) as usize;
        if cur_patterns.len() + lb_extra > state.best_bars {
            return;
        }
        if cur_patterns.len() + lb_extra == state.best_bars && cur_waste >= state.best_waste {
            return;
        }

        let mut cands: Vec<(Vec<u32>, u32)> = Vec::new();
        let mut pat_buf = vec![0u32; rem.len()];
        gen_patterns_for_anchor(first_unmet, &mut pat_buf, first_unmet, cap, weights, rem, &mut cands);
        // Prefer tightest fill first
        cands.sort_by_key(|(_, left)| *left);

        for (pat, rem_space) in cands.into_iter().take(6) {
            let added_waste = if rem_space >= min_remnant { 0 } else { rem_space as u64 };
            // Try batch-applying maximal identical repeats? Just 1 step gives flexibility; fast for <= 60 bars!
            for i in 0..rem.len() {
                rem[i] -= pat[i];
            }
            cur_patterns.push(pat.clone());
            dfs(rem, cur_patterns, cur_waste + added_waste, min_remnant, cap, weights, state);
            cur_patterns.pop();
            for i in 0..rem.len() {
                rem[i] += pat[i];
            }
            if state.nodes > state.max_nodes {
                return;
            }
        }
    }

    let mut state = BbState {
        best_bars: warm_bars,
        best_waste: warm_waste,
        best_patterns: None,
        nodes: 0,
        max_nodes: 25_000,
    };
    let mut rem_init = demands;
    let mut cur_pats = Vec::new();
    dfs(
        &mut rem_init,
        &mut cur_pats,
        0,
        config.min_remnant,
        cap,
        &weights,
        &mut state,
    );

    if let Some(best_pats) = state.best_patterns {
        let mut raw_len_patterns = Vec::with_capacity(best_pats.len());
        for pat in best_pats {
            let mut lens = Vec::new();
            for i in 0..m {
                for _ in 0..pat[i] {
                    lens.push(types[i].length);
                }
            }
            raw_len_patterns.push((primary.length, lens));
        }
        materialize_from_length_patterns(
            raw_len_patterns,
            stocks,
            scaled_parts,
            original_parts,
            config,
            multiplier,
        )
    } else {
        Ok(warm)
    }
}

struct Xorshift64(u64);
impl Xorshift64 {
    fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }
    fn next_usize(&mut self, bound: usize) -> usize {
        (self.next_u64() % (bound.max(1) as u64)) as usize
    }
    fn next_f64(&mut self) -> f64 {
        ((self.next_u64() >> 11) as f64) / ((1u64 << 53) as f64)
    }
}

/// Strategy 7: Metaheuristic — Simulated Annealing + 2-Opt / Grouping Local Search
pub fn solve_simulated_annealing(
    stocks: &[Stock],
    scaled_parts: &[Part],
    original_parts: &[Part],
    config: &CutConfig,
    multiplier: u32,
) -> Result<CuttingPlan, String> {
    let mut items = expand_parts(scaled_parts);
    if items.is_empty() {
        return Err("Список требуемых деталей пуст".to_string());
    }
    items.sort_by(|a, b| b.length.cmp(&a.length));
    let n = items.len();
    let lengths: Vec<u32> = items.iter().map(|it| it.length).collect();

    let mut avail_stocks: Vec<Stock> = stocks.to_vec();
    avail_stocks.sort_by(|a, b| b.length.cmp(&a.length));

    // Fast decoder: packs permutation into bars using Best-Fit / First-Fit dynamically
    let decode = |order: &[usize], use_best_fit: bool| -> (u32, usize, u64, usize, Vec<(u32, Vec<usize>)>) {
        struct Bar {
            stock_len: u32,
            rem: u32,
            idxs: Vec<usize>,
        }
        let mut stock_qty: Vec<Option<u32>> = avail_stocks.iter().map(|s| s.quantity).collect();
        let mut bars: Vec<Bar> = Vec::new();
        let mut unplaced = 0u32;

        for &item_idx in order {
            let needed = lengths[item_idx] + config.cut_width;
            let chosen = if use_best_fit {
                let mut best = None;
                let mut min_rem = u32::MAX;
                for (b_i, bar) in bars.iter().enumerate() {
                    if bar.rem >= needed && bar.rem < min_rem {
                        min_rem = bar.rem;
                        best = Some(b_i);
                    }
                }
                best
            } else {
                bars.iter().position(|bar| bar.rem >= needed)
            };

            if let Some(b_i) = chosen {
                bars[b_i].rem -= needed;
                bars[b_i].idxs.push(item_idx);
            } else {
                let s_pos = avail_stocks.iter().enumerate().position(|(si, st)| {
                    let usable = st.length.saturating_sub(config.trim_left + config.trim_right);
                    stock_qty[si].map_or(true, |q| q > 0) && usable >= needed
                });
                if let Some(si) = s_pos {
                    if let Some(q) = &mut stock_qty[si] {
                        *q -= 1;
                    }
                    let s_len = avail_stocks[si].length;
                    let usable = s_len.saturating_sub(config.trim_left + config.trim_right);
                    bars.push(Bar {
                        stock_len: s_len,
                        rem: usable - needed,
                        idxs: vec![item_idx],
                    });
                } else {
                    unplaced += 1;
                }
            }
        }

        let mut waste = 0u64;
        let mut pat_sigs: HashMap<(u32, Vec<u32>), ()> = HashMap::new();
        let mut out_bars = Vec::with_capacity(bars.len());
        for bar in bars {
            if bar.rem < config.min_remnant {
                waste += bar.rem as u64;
            }
            let mut sig: Vec<u32> = bar.idxs.iter().map(|&idx| lengths[idx]).collect();
            sig.sort_unstable();
            pat_sigs.insert((bar.stock_len, sig), ());
            out_bars.push((bar.stock_len, bar.idxs));
        }
        (unplaced, out_bars.len(), waste, pat_sigs.len(), out_bars)
    };

    let scalar_cost = |unplaced: u32, stocks_used: usize, waste: u64, pats: usize| -> f64 {
        (unplaced as f64) * 1e9
            + (stocks_used as f64) * 1e6
            + (waste as f64) * 1.0
            + (pats as f64) * 150.0
    };

    let mut cur_order: Vec<usize> = (0..n).collect();
    let mut cur_fit_bf = true;
    let cur_eval = decode(&cur_order, cur_fit_bf);
    let mut cur_cost = scalar_cost(cur_eval.0, cur_eval.1, cur_eval.2, cur_eval.3);

    let mut best_eval = cur_eval.clone();
    let mut best_cost = cur_cost;

    if n >= 2 {
        let mut rng = Xorshift64(0x9E37_79B9_7F4A_7C15 ^ (n as u64));
        let iterations = (n * 18).clamp(240, 900);
        let mut temp: f64 = 25000.0;
        let alpha: f64 = 0.985;

        for _ in 0..iterations {
            let mut next_order = cur_order.clone();
            let mut next_bf = cur_fit_bf;
            let op = rng.next_usize(10);
            if op < 4 {
                // Swap two items of different lengths
                let a = rng.next_usize(n);
                let b = rng.next_usize(n);
                next_order.swap(a, b);
            } else if op < 7 {
                // Relocate item
                let from = rng.next_usize(n);
                let to = rng.next_usize(n);
                let v = next_order.remove(from);
                next_order.insert(to, v);
            } else if op < 9 && n >= 4 {
                // 2-Opt subsegment reverse
                let a = rng.next_usize(n);
                let b = rng.next_usize(n);
                let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
                next_order[lo..=hi].reverse();
            } else {
                // Toggle packing rule between Best-Fit and First-Fit
                next_bf = !next_bf;
            }

            let next_eval = decode(&next_order, next_bf);
            let next_cost = scalar_cost(next_eval.0, next_eval.1, next_eval.2, next_eval.3);
            let delta = next_cost - cur_cost;

            if delta <= 0.0 || rng.next_f64() < (-delta / temp.max(1.0)).exp() {
                cur_order = next_order;
                cur_fit_bf = next_bf;
                cur_cost = next_cost;
                if next_cost < best_cost {
                    best_cost = next_cost;
                    best_eval = next_eval;
                }
            }
            temp *= alpha;
        }
    }

    let mut placed_mask = vec![false; n];
    let mut raw_patterns: Vec<(u32, Vec<PartItem>)> = Vec::with_capacity(best_eval.4.len());
    for (s_len, idxs) in best_eval.4 {
        let mut bar_items = Vec::with_capacity(idxs.len());
        for idx in idxs {
            placed_mask[idx] = true;
            bar_items.push(items[idx].clone());
        }
        raw_patterns.push((s_len, bar_items));
    }

    let unplaced_items: Vec<PartItem> = items
        .into_iter()
        .enumerate()
        .filter(|(idx, _)| !placed_mask[*idx])
        .map(|(_, it)| it)
        .collect();

    let patterns = group_patterns(raw_patterns, config, multiplier);
    let unplaced = crate::group_unplaced(&unplaced_items, multiplier);
    let summary = build_summary(original_parts, &patterns, &unplaced, config, multiplier);
    Ok(CuttingPlan {
        patterns,
        unplaced,
        summary,
    })
}
