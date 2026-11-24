use reqwest::header::{ACCEPT, USER_AGENT};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::Emitter;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub const GITHUB_REPO: &str = "pururuall/raskroy-pro";

#[derive(Debug, Clone, Serialize)]
pub struct UpdateCheckResult {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_name: String,
    pub release_notes: String,
    pub release_url: String,
    pub published_at: String,
    pub asset_name: Option<String>,
    pub asset_size: Option<u64>,
    pub download_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateProgressEvent {
    pub downloaded: u64,
    pub total: u64,
    pub percent: f64,
    pub stage: String,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    size: u64,
    browser_download_url: String,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    html_url: String,
    published_at: Option<String>,
    assets: Vec<GithubAsset>,
}

fn parse_semver(raw: &str) -> (u64, u64, u64) {
    let cleaned = raw.trim().trim_start_matches(['v', 'V']);
    let core = cleaned.split('-').next().unwrap_or(cleaned);
    let mut parts = core.split('.');
    let major = parts.next().and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
    let minor = parts.next().and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
    let patch = parts.next().and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
    (major, minor, patch)
}

fn is_newer_version(latest: &str, current: &str) -> bool {
    parse_semver(latest) > parse_semver(current)
}

fn pick_windows_asset(assets: &[GithubAsset]) -> Option<&GithubAsset> {
    // 1. Prefer NSIS/installer .exe
    if let Some(a) = assets.iter().find(|a| {
        let lower = a.name.to_lowercase();
        lower.ends_with(".exe") && lower.contains("setup")
    }) {
        return Some(a);
    }

    // 2. Fallback to .msi
    if let Some(a) = assets
        .iter()
        .find(|a| a.name.to_lowercase().ends_with(".msi"))
    {
        return Some(a);
    }

    // 3. Fallback to portable .exe
    assets
        .iter()
        .find(|a| a.name.to_lowercase().ends_with(".exe"))
}

fn is_allowed_github_url(url: &str) -> bool {
    url.starts_with("https://github.com/")
        || url.starts_with("https://objects.githubusercontent.com/")
        || url.starts_with("https://release-assets.githubusercontent.com/")
        || url.starts_with("https://api.github.com/")
}

#[tauri::command]
pub fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    let api_url = format!("https://api.github.com/repos/{GITHUB_REPO}/releases/latest");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Ошибка инициализации HTTP-клиента: {e}"))?;

    let resp = client
        .get(&api_url)
        .header(USER_AGENT, format!("raskroy-pro/{current_version}"))
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("Не удалось подключиться к GitHub: {e}"))?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(UpdateCheckResult {
            has_update: false,
            current_version: current_version.clone(),
            latest_version: current_version,
            release_name: "Релизы пока не опубликованы".into(),
            release_notes: String::new(),
            release_url: format!("https://github.com/{GITHUB_REPO}/releases"),
            published_at: String::new(),
            asset_name: None,
            asset_size: None,
            download_url: None,
        });
    }

    if !resp.status().is_success() {
        return Err(format!("GitHub API вернул статус {}", resp.status()));
    }

    let release: GithubRelease = resp
        .json()
        .await
        .map_err(|e| format!("Ошибка разбора ответа GitHub: {e}"))?;

    let latest_clean = release
        .tag_name
        .trim()
        .trim_start_matches(['v', 'V'])
        .to_string();
    let has_update = is_newer_version(&latest_clean, &current_version);
    let asset = pick_windows_asset(&release.assets);

    Ok(UpdateCheckResult {
        has_update,
        current_version,
        latest_version: latest_clean,
        release_name: release.name.unwrap_or_else(|| release.tag_name.clone()),
        release_notes: release.body.unwrap_or_default(),
        release_url: release.html_url,
        published_at: release.published_at.unwrap_or_default(),
        asset_name: asset.map(|a| a.name.clone()),
        asset_size: asset.map(|a| a.size),
        download_url: asset.map(|a| a.browser_download_url.clone()),
    })
}

#[tauri::command]
pub async fn download_and_install_update(
    app: tauri::AppHandle,
    download_url: String,
    asset_name: String,
) -> Result<(), String> {
    if !is_allowed_github_url(&download_url) {
        return Err("Недопустимый источник загрузки обновления.".into());
    }

    let safe_name = Path::new(&asset_name)
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty())
        .unwrap_or("raskroy-pro-update.exe")
        .to_string();

    let update_dir = std::env::temp_dir().join("raskroy-pro-updates");
    tokio::fs::create_dir_all(&update_dir)
        .await
        .map_err(|e| format!("Не удалось создать папку обновлений: {e}"))?;

    let dest_path = update_dir.join(&safe_name);

    let current_version = app.package_info().version.to_string();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Ошибка HTTP-клиента: {e}"))?;

    let mut resp = client
        .get(&download_url)
        .header(USER_AGENT, format!("raskroy-pro/{current_version}"))
        .send()
        .await
        .map_err(|e| format!("Ошибка загрузки файла обновления: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Сервер загрузки вернул статус {}", resp.status()));
    }

    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut last_emitted_pct: f64 = -1.0;

    let mut file = tokio::fs::File::create(&dest_path)
        .await
        .map_err(|e| format!("Не удалось создать файл {}: {e}", dest_path.display()))?;

    while let Some(chunk) = resp
        .chunk()
        .await
        .map_err(|e| format!("Ошибка чтения потока загрузки: {e}"))?
    {
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Ошибка записи на диск: {e}"))?;

        downloaded += chunk.len() as u64;
        let pct = if total > 0 {
            ((downloaded as f64 / total as f64) * 100.0).min(100.0)
        } else {
            0.0
        };

        if pct - last_emitted_pct >= 2.0 || downloaded == total {
            last_emitted_pct = pct;
            let _ = app.emit(
                "update-progress",
                UpdateProgressEvent {
                    downloaded,
                    total,
                    percent: pct,
                    stage: "downloading".into(),
                },
            );
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("Ошибка сохранения файла: {e}"))?;
    drop(file);

    let _ = app.emit(
        "update-progress",
        UpdateProgressEvent {
            downloaded,
            total: downloaded.max(total),
            percent: 100.0,
            stage: "verifying".into(),
        },
    );

    if downloaded < 1024 {
        return Err("Скачанный файл повреждён или пуст.".into());
    }

    // Basic PE signature check for Windows executables (.exe) reading only first 2 bytes
    let lower_name = safe_name.to_lowercase();
    if lower_name.ends_with(".exe") {
        let mut magic = [0u8; 2];
        let mut f = tokio::fs::File::open(&dest_path)
            .await
            .map_err(|e| format!("Не удалось проверить файл: {e}"))?;
        f.read_exact(&mut magic)
            .await
            .map_err(|e| format!("Не удалось прочитать заголовок файла: {e}"))?;
        if &magic != b"MZ" {
            return Err("Скачанный файл не является корректным Windows .exe.".into());
        }
    }

    let _ = app.emit(
        "update-progress",
        UpdateProgressEvent {
            downloaded,
            total: downloaded.max(total),
            percent: 100.0,
            stage: "launching".into(),
        },
    );

    #[cfg(target_os = "windows")]
    {
        if lower_name.ends_with(".msi") {
            std::process::Command::new("msiexec")
                .arg("/i")
                .arg(&dest_path)
                .spawn()
                .map_err(|e| format!("Не удалось запустить установщик MSI: {e}"))?;
        } else if lower_name.contains("setup") {
            std::process::Command::new(&dest_path)
                .spawn()
                .map_err(|e| format!("Не удалось запустить установщик: {e}"))?;
        } else {
            // Portable .exe: replace current exe once process exits and relaunch
            let current_exe = std::env::current_exe()
                .map_err(|e| format!("Не удалось определить путь программы: {e}"))?;
            let bat_path = update_dir.join("apply_update.cmd");
            let current_str = current_exe.to_string_lossy();
            let dest_str = dest_path.to_string_lossy();
            let script = format!(
                "@echo off\r\ntimeout /t 2 /nobreak >nul\r\ncopy /Y \"{dest_str}\" \"{current_str}\" >nul\r\nif errorlevel 1 (\r\n  start \"\" \"{dest_str}\"\r\n) else (\r\n  start \"\" \"{current_str}\"\r\n)\r\n"
            );
            tokio::fs::write(&bat_path, script.as_bytes())
                .await
                .map_err(|e| format!("Ошибка подготовки скрипта обновления: {e}"))?;

            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            std::process::Command::new("cmd")
                .args(["/C", &bat_path.to_string_lossy()])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| format!("Не удалось запустить обновление: {e}"))?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = lower_name;
    }

    // Give spawned process a moment to start, then exit so files can be overwritten
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(350)).await;
        app_handle.exit(0);
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_semver_comparison() {
        assert!(is_newer_version("v0.3.0", "0.2.0"));
        assert!(is_newer_version("1.0.0", "0.9.9"));
        assert!(!is_newer_version("v0.2.0", "0.2.0"));
        assert!(!is_newer_version("0.1.9", "0.2.0"));
    }

    #[test]
    fn test_pick_windows_asset_prefers_setup() {
        let assets = vec![
            GithubAsset {
                name: "raskroy-pro.exe".into(),
                size: 4_600_000,
                browser_download_url: "https://github.com/a".into(),
            },
            GithubAsset {
                name: "RaskroyPro_0.3.0_x64-setup.exe".into(),
                size: 1_550_000,
                browser_download_url: "https://github.com/b".into(),
            },
        ];
        let picked = pick_windows_asset(&assets).unwrap();
        assert_eq!(picked.name, "RaskroyPro_0.3.0_x64-setup.exe");
    }
}
