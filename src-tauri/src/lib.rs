mod updater;

use raskroy_core::{calculate_cutting, CutConfig, CuttingPlan, Part, Stock};

#[tauri::command]
fn calculate_cutting_plan(
    stocks: Vec<Stock>,
    parts: Vec<Part>,
    config: CutConfig,
) -> Result<CuttingPlan, String> {
    calculate_cutting(&stocks, &parts, &config)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            calculate_cutting_plan,
            updater::get_app_version,
            updater::check_for_updates,
            updater::download_and_install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tauri_command_e2e() {
        let stocks = vec![Stock::new(6100, None)];
        let parts = vec![Part::new(2700, 37), Part::new(2400, 12)];
        let config = CutConfig::default();
        let plan = calculate_cutting_plan(stocks, parts, config).expect("Calculation failed");
        assert!(plan.summary.total_parts_placed == 49);
        assert!(plan.summary.total_stocks_used > 0);
    }
}
