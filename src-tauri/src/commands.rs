use tauri::{State, Window, Emitter, Manager};
use std::process::{Command as StdCommand, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use serde_json::json;
use crate::ScrcpyState;
use tokio::process::Command as TokioCommand;
use tokio::io::{BufReader, AsyncBufReadExt};
use tokio::time::{timeout, Duration};
use serde::Deserialize;
use flate2::read::GzDecoder;
use tar::Archive;

const AUDIO_FALLBACK_CHAIN: &[&str] = &["aac", "flac", "raw"];

fn is_audio_codec_error(text: &str) -> bool {
    let lower = text.to_lowercase();
    if lower.contains("could not create default audio encoder")
        || lower.contains("failed to initialize audio")
    {
        return true;
    }
    let mentions_codec = lower.contains("audio encoder") || lower.contains("audio codec");
    let mentions_failure = lower.contains("fail")
        || lower.contains("error")
        || lower.contains("could not")
        || lower.contains("not available")
        || lower.contains("not supported");
    mentions_codec && mentions_failure
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn get_binary_path(binary_name: &str, custom_folder: Option<String>) -> String {
    let exe_ext = std::env::consts::EXE_EXTENSION;
    let binary_filename = if exe_ext.is_empty() {
        binary_name.to_string()
    } else {
        format!("{}.{}", binary_name, exe_ext)
    };

    // 1. Check custom folder if provided
    if let Some(folder) = custom_folder {
        if !folder.trim().is_empty() {
            let full_path = Path::new(&folder).join(&binary_filename);
            if full_path.exists() && full_path.is_file() {
                return full_path.to_string_lossy().to_string();
            }
        }
    }
    
    // 2. Check local scrcpy-bin folder (relative to executable for portable/production)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
             let local_bin = exe_dir.join("scrcpy-bin").join(&binary_filename);
             if local_bin.exists() && local_bin.is_file() {
                 return local_bin.to_string_lossy().to_string();
             }
        }
    }

    // 3. Fallback to current working directory scrcpy-bin
    if let Ok(current_dir) = std::env::current_dir() {
        let local_bin = current_dir.join("scrcpy-bin").join(&binary_filename);
        if local_bin.exists() && local_bin.is_file() {
            return local_bin.to_string_lossy().to_string();
        }
    }

    // 4. Return simple name to rely on system PATH
    binary_name.to_string()
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    let src_ref = src.as_ref();
    let dst_ref = dst.as_ref();
    
    // Canonicalize dst path if it exists to get absolute base path
    let canonical_dst = if dst_ref.exists() {
        dst_ref.canonicalize()?
    } else {
        std::fs::create_dir_all(dst_ref)?;
        dst_ref.canonicalize()?
    };
    
    for entry in std::fs::read_dir(src_ref)? {
        let entry = entry?;
        let entry_path = entry.path();
        let file_name = entry.file_name();
        
        // Prevent directory traversal elements in entry name
        let file_name_str = file_name.to_string_lossy();
        if file_name_str.contains("..") || file_name_str.contains('/') || file_name_str.contains('\\') {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Directory entry contains directory traversal components",
            ));
        }
        
        let target_path = dst_ref.join(&file_name);
        
        // Ensure destination path is strictly within the target base directory
        if let Some(parent_dir) = target_path.parent() {
            if parent_dir.exists() {
                let canonical_parent = parent_dir.canonicalize()?;
                if !canonical_parent.starts_with(&canonical_dst) && canonical_parent != canonical_dst {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::PermissionDenied,
                        "Path traversal attempt detected during directory copy",
                    ));
                }
            }
        }
        
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry_path, &target_path)?;
        } else {
            std::fs::copy(&entry_path, &target_path)?;
        }
    }
    Ok(())
}



#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn create_command<S: AsRef<std::ffi::OsStr>>(program: S) -> TokioCommand {
    let cmd = TokioCommand::new(program);
    #[cfg(target_os = "windows")]
    {
        let mut cmd = cmd;
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd
    }
    #[cfg(not(target_os = "windows"))]
    cmd
}

#[tauri::command]
pub async fn check_scrcpy(custom_path: Option<String>) -> serde_json::Value {
    let exe_path = get_binary_path("scrcpy", custom_path);
    
    // Check version to verify it exists and is runnable
    let output = create_command(&exe_path)
        .arg("--version")
        .output()
        .await;

    match output {
        Ok(o) if o.status.success() => {
             json!({ "found": true, "message": "Scrcpy Ready" })
        },
        Ok(_) => {
             json!({ "found": false, "message": "Failed to start scrcpy (Exit Code != 0)" })
        },
        Err(_) => {
             json!({ "found": false, "message": "Scrcpy not found" })
        }
    }
}

#[tauri::command]
pub async fn get_devices(custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("devices")
        .output()
        .await;

    match output {
        Ok(o) => {
             if o.status.success() {
                 let out_str = String::from_utf8_lossy(&o.stdout);
                 let devices: Vec<String> = out_str.lines()
                    .skip(1) // Skip "List of devices attached"
                    .filter(|l| l.contains("\tdevice"))
                    .map(|l| l.split('\t').next().unwrap_or("").trim().to_string())
                    .filter(|s| !s.is_empty() && !s.contains("._tcp") && !s.contains("._udp"))
                    .collect();
                 
                 json!({ "error": false, "devices": devices })
             } else {
                 json!({ "error": true, "message": "ADB returned error" })
             }
        },
        Err(e) => {
             json!({ "error": true, "message": e.to_string() })
         }
    }
}

#[tauri::command]
pub async fn get_mdns_devices(custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("mdns")
        .arg("services")
        .output()
        .await;

    match output {
        Ok(o) => {
            if o.status.success() {
                let out_str = String::from_utf8_lossy(&o.stdout);
                let mut services = Vec::new();
                let mut seen = std::collections::HashSet::new();
                for line in out_str.lines().skip(1) {
                    let parts: Vec<&str> = line.split('\t').collect();
                    if parts.len() >= 3 {
                        let name = parts[0].trim();
                        let service = parts[1].trim();
                        let address = parts[2].trim();
                        let key = format!("{}|{}|{}", name, service, address);
                        if !seen.contains(&key) {
                            services.push(json!({
                                "name": name,
                                "service": service,
                                "address": address
                            }));
                            seen.insert(key);
                        }
                    }
                }
                json!({ "error": false, "services": services })
            } else {
                json!({ "error": true, "message": "ADB mdns returned error" })
            }
        },
        Err(e) => {
            json!({ "error": true, "message": e.to_string() })
        }
    }
}

#[tauri::command]
pub async fn adb_connect(window: Window, ip: String, custom_path: Option<String>) -> Result<serde_json::Value, String> {
    let adb_path = get_binary_path("adb", custom_path);
    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Attempting wireless connection to {}...", ip));
    
    let child = create_command(&adb_path)
        .arg("connect")
        .arg(&ip)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start adb connect: {}", e))?;

    // Implement 5s timeout
    let output_res = timeout(Duration::from_secs(5), child.wait_with_output()).await;

    match output_res {
        Ok(Ok(output)) => {
            let out_text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let err_text = String::from_utf8_lossy(&output.stderr).trim().to_string();
            
            // Log everything to terminal for visibility
            if !out_text.is_empty() { let _ = window.emit("scrcpy-log", format!("[ADB] {}", out_text)); }
            if !err_text.is_empty() { let _ = window.emit("scrcpy-log", format!("[ADB ERROR] {}", err_text)); }

            let success = output.status.success() && !out_text.contains("cannot connect") && !out_text.contains("failed");
            Ok(json!({ "success": success, "message": if out_text.is_empty() { err_text } else { out_text } }))
        }
        Ok(Err(e)) => Err(e.to_string()),
        Err(_) => {
            let _ = window.emit("scrcpy-log", format!("[SYSTEM] Connection to {} timed out after 5s.", ip));
            Ok(json!({ "success": false, "message": "connection timed out" }))
        }
    }
}

#[tauri::command]
pub async fn adb_pair(window: Window, ip: String, code: String, custom_path: Option<String>) -> Result<serde_json::Value, String> {
    let adb_path = get_binary_path("adb", custom_path);
    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Pairing with {}...", ip));

    let output = create_command(&adb_path)
        .arg("pair")
        .arg(&ip)
        .arg(&code)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let out_text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let err_text = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !out_text.is_empty() { let _ = window.emit("scrcpy-log", format!("[ADB] {}", out_text)); }
    if !err_text.is_empty() { let _ = window.emit("scrcpy-log", format!("[ADB ERROR] {}", err_text)); }

    let success = output.status.success() && (out_text.contains("Successfully paired") || err_text.contains("Successfully paired"));

    Ok(json!({ "success": success, "message": if out_text.is_empty() { err_text } else { out_text } }))
}

#[tauri::command]
pub async fn adb_shell(device: String, command: String, custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("-s")
        .arg(&device)
        .arg("shell")
        .arg(&command)
        .output()
        .await;

    match output {
        Ok(o) => {
             json!({ "success": o.status.success(), "output": String::from_utf8_lossy(&o.stdout).to_string() })
        },
        Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

#[tauri::command]
pub async fn run_terminal_command(device: Option<String>, cmd: String, custom_path: Option<String>) -> serde_json::Value {
    let mut parts = split_args(&cmd).unwrap_or_else(|_| cmd.split_whitespace().map(|s| s.to_string()).collect());
    if parts.is_empty() { return json!({ "success": false, "message": "No command provided" }); }

    let first_part = parts[0].to_lowercase();
    let is_scrcpy = first_part == "scrcpy";
    let is_adb = first_part == "adb";

    let binary_name = if is_scrcpy { "scrcpy" } else { "adb" };
    let exe_path = get_binary_path(binary_name, custom_path);

    // If they explicitly typed "adb" or "scrcpy", remove it from arguments
    if is_adb || is_scrcpy {
        parts.remove(0);
    }

    let mut args = Vec::new();
    
    // Auto-inject device ID for ADB/Scrcpy commands if a device is active and not already specified
    let has_serial_flag = parts.contains(&"-s".to_string()) || parts.contains(&"--serial".to_string());
    
    if !has_serial_flag {
        if let Some(ref d) = device {
            if !d.is_empty() {
                // For ADB, don't inject for certain global commands
                let is_global_adb = binary_name == "adb" && !parts.is_empty() && (parts[0] == "devices" || parts[0] == "connect" || parts[0] == "pair");
                
                if !is_global_adb {
                    args.push("-s".to_string());
                    args.push(d.clone());
                }
            }
        }
    }

    for part in parts {
        args.push(part);
    }

    let output = create_command(&exe_path)
        .args(&args)
        .output()
        .await;

    match output {
        Ok(o) => {
             json!({ 
                 "success": o.status.success(), 
                 "binary": binary_name,
                 "stdout": String::from_utf8_lossy(&o.stdout).to_string(),
                 "stderr": String::from_utf8_lossy(&o.stderr).to_string()
             })
        },
        Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

fn split_args(s: &str) -> Result<Vec<String>, String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let chars = s.chars();

    for c in chars {
        if c == '"' {
            in_quotes = !in_quotes;
        } else if c.is_whitespace() && !in_quotes {
            if !current.is_empty() {
                args.push(current.clone());
                current.clear();
            }
        } else {
            current.push(c);
        }
    }
    if !current.is_empty() {
        args.push(current);
    }
    if in_quotes {
        return Err("Unclosed quotes".to_string());
    }
    Ok(args)
}

#[tauri::command]
pub async fn push_file(device: String, file_path: String, custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("-s")
        .arg(&device)
        .arg("push")
        .arg(&file_path)
        .arg("/sdcard/Download/")
        .output()
        .await;

    match output {
         Ok(o) => {
             if o.status.success() {
                 json!({ "success": true, "message": "File pushed to Downloads" })
             } else {
                 json!({ "success": false, "message": "Transfer failed" })
             }
         },
         Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

#[tauri::command]
pub async fn install_apk(device: String, file_path: String, custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("-s")
        .arg(&device)
        .arg("install")
        .arg(&file_path)
        .output()
        .await;

     match output {
        Ok(o) => {
             let out_text = String::from_utf8_lossy(&o.stdout);
             let err_text = String::from_utf8_lossy(&o.stderr);
             
             if o.status.success() {
                 json!({ "success": true, "message": out_text.trim() })
             } else {
                 json!({ "success": false, "message": err_text.trim() })
             }
        },
        Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

#[tauri::command]
pub async fn kill_adb(window: Window, custom_path: Option<String>) -> Result<serde_json::Value, String> {
    let adb_path = get_binary_path("adb", custom_path);
    let _ = window.emit("scrcpy-log", "[SYSTEM] Terminating ADB stack...".to_string());
    
    let mut child = create_command(&adb_path)
        .arg("kill-server")
        .spawn()
        .map_err(|e| e.to_string())?;
        
    let _ = child.wait().await;

    // Force kill adb process via OS specifics
    #[cfg(target_os = "windows")]
    {
        let _ = TokioCommand::new("taskkill")
            .args(&["/F", "/IM", "adb.exe", "/T"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .await;
    }

    #[cfg(not(target_os = "windows"))]
    {
         let _ = TokioCommand::new("pkill")
            .arg("adb")
            .output()
            .await;
    }

    let _ = window.emit("scrcpy-log", "[SYSTEM] ADB Stack Terminated.".to_string());
    Ok(json!({ "success": true, "message": "ADB Stack Terminated" }))
}

#[tauri::command]
pub async fn list_scrcpy_options(device: String, arg: String, custom_path: Option<String>) -> serde_json::Value {
    let exe_path = get_binary_path("scrcpy", custom_path);
    
    let mut command = create_command(&exe_path);
    command.arg("-s").arg(&device).arg(&arg);
    
    let output = command.output().await;

    match output {
        Ok(o) => {
             let out_text = String::from_utf8_lossy(&o.stdout);
             let err_text = String::from_utf8_lossy(&o.stderr); // scrcpy often prints lists to stderr
             let combined = format!("{}{}", out_text, err_text);
             json!({ "success": o.status.success(), "output": combined })
        },
        Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

fn detect_host_os() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
}

fn render_driver_label(driver: &str) -> &'static str {
    match driver {
        "direct3d" => "D3D11 (Direct3D)",
        "opengl" => "OpenGL",
        "opengles2" => "OpenGL ES 2",
        "opengles" => "OpenGL ES",
        "metal" => "Metal",
        "software" => "Software",
        "vulkan" => "Vulkan",
        _ => "Custom",
    }
}

fn is_driver_allowed_on_os(driver: &str, host_os: &str) -> bool {
    match host_os {
        "windows" => driver != "metal",
        "macos" => driver != "direct3d",
        "linux" => driver != "direct3d" && driver != "metal",
        _ => true,
    }
}

fn detect_render_drivers_from_help(help_output: &str) -> Vec<String> {
    let known = [
        "direct3d",
        "opengl",
        "opengles2",
        "opengles",
        "metal",
        "software",
        "vulkan",
    ];

    let lower = help_output.to_lowercase();
    let render_context = if let Some(start) = lower.find("--render-driver") {
        let end = (start + 1600).min(lower.len());
        lower[start..end].to_string()
    } else {
        String::new()
    };

    known
        .iter()
        .filter(|driver| {
            render_context.contains(&format!("\"{}\"", driver))
                || render_context.contains(&format!("'{}'", driver))
                || render_context.contains(*driver)
        })
        .map(|driver| (*driver).to_string())
        .collect()
}

#[tauri::command]
pub async fn get_render_drivers(custom_path: Option<String>) -> serde_json::Value {
    let exe_path = get_binary_path("scrcpy", custom_path);
    let host_os = detect_host_os();

    let output = create_command(&exe_path).arg("--help").output().await;

    match output {
        Ok(o) => {
            let out_text = String::from_utf8_lossy(&o.stdout);
            let err_text = String::from_utf8_lossy(&o.stderr);
            let combined = format!("{}{}", out_text, err_text);
            let lower = combined.to_lowercase();

            let supports_render_driver = lower.contains("--render-driver");
            if !supports_render_driver {
                return json!({
                    "success": true,
                    "hostOs": host_os,
                    "supportsRenderDriver": false,
                    "detectedDrivers": [],
                    "supportedDrivers": [],
                    "diagnostics": "scrcpy does not advertise --render-driver in --help output"
                });
            }

            let detected_drivers = detect_render_drivers_from_help(&combined);
            let supported_drivers: Vec<serde_json::Value> = detected_drivers
                .iter()
                .filter(|driver| is_driver_allowed_on_os(driver, host_os))
                .map(|driver| {
                    json!({
                        "id": driver,
                        "label": render_driver_label(driver)
                    })
                })
                .collect();

            json!({
                "success": o.status.success(),
                "hostOs": host_os,
                "supportsRenderDriver": true,
                "detectedDrivers": detected_drivers,
                "supportedDrivers": supported_drivers,
                "diagnostics": "render drivers parsed from scrcpy --help"
            })
        }
        Err(e) => json!({
            "success": false,
            "hostOs": host_os,
            "supportsRenderDriver": false,
            "detectedDrivers": [],
            "supportedDrivers": [],
            "message": e.to_string()
        }),
    }
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScrcpyConfig {
    device: String,
    session_mode: String,
    // ... other fields matching JS ...
    bitrate: Option<u32>,
    fps: Option<u32>,
    stay_awake: Option<bool>,
    turn_off: Option<bool>,
    audio_enabled: Option<bool>,
    audio_codec: Option<String>,
    always_on_top: Option<bool>,
    fullscreen: Option<bool>,
    borderless: Option<bool>,
    record: Option<bool>,
    record_path: Option<String>,
    scrcpy_path: Option<String>,
    otg_pure: Option<bool>,
    camera_facing: Option<String>,
    camera_id: Option<String>,
    codec: Option<String>,
    camera_ar: Option<String>,
    camera_high_speed: Option<bool>,
    vd_width: Option<u32>,
    vd_height: Option<u32>,
    vd_dpi: Option<u32>,
    rotation: Option<String>,
    res: Option<String>,
    hid_keyboard: Option<bool>,
    hid_mouse: Option<bool>,
    render_driver: Option<String>,
    // v4 features
    flex_display: Option<bool>,
    camera_torch: Option<bool>,
    camera_zoom: Option<f32>,
    background_color: Option<String>,
    keep_active: Option<bool>,
    shortcut_mod: Option<String>,
}

/// Maps a modifier name to the scrcpy flag value that accepts both left and right variants.
/// Returns None if any component is unrecognised, so the caller skips the flag entirely.
fn modifier_to_scrcpy_flag(modifier: &str) -> Option<String> {
    // Each named key expands to "lkey,rkey" so either physical key works.
    // For combos (joined with '+'), we emit every L/R combination separated by ','
    // so any mix of left/right keys triggers the shortcut.
    let keys: Option<Vec<Vec<&str>>> = modifier.split('+')
        .map(|m| match m.trim() {
            "Alt"  => Some(vec!["lalt",  "ralt"]),
            "Ctrl" => Some(vec!["lctrl", "rctrl"]),
            _      => None,
        })
        .collect();

    keys.map(|groups| {
        // Cartesian product of the groups to get all valid combinations.
        let mut combos: Vec<String> = vec![String::new()];
        for group in &groups {
            let mut next = Vec::new();
            for combo in &combos {
                for key in group {
                    if combo.is_empty() {
                        next.push(key.to_string());
                    } else {
                        next.push(format!("{}+{}", combo, key));
                    }
                }
            }
            combos = next;
        }
        combos.join(",")
    })
}

fn resolve_audio_codec_flag<'a>(config: &'a ScrcpyConfig, audio_codec_override: Option<&'a str>) -> Option<&'a str> {
    if let Some(c) = audio_codec_override {
        let trimmed = c.trim();
        if !trimmed.is_empty() {
            return Some(trimmed);
        }
    }
    config.audio_codec.as_deref().and_then(|c| {
        let trimmed = c.trim();
        if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("auto") {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn build_scrcpy_args(config: &ScrcpyConfig, video_dir_fallback: Option<String>, audio_codec_override: Option<&str>) -> Vec<String> {
    let mut args = Vec::new();
    
    // Construct arguments based on config
    if !config.device.is_empty() {
        args.push("-s".to_string());
        args.push(config.device.clone());
    }

    let codec = config.codec.as_deref().unwrap_or("h264");
    args.push(format!("--video-codec={}", codec));

    let otg_pure = config.otg_pure.unwrap_or(false);
    let hid_keyboard = config.hid_keyboard.unwrap_or(false);
    let hid_mouse = config.hid_mouse.unwrap_or(false);

    if config.session_mode == "mirror" && (hid_keyboard || hid_mouse) && otg_pure {
        if config.device.contains('.') || config.device.contains(':') {
             args.push("--no-video".to_string());
             args.push("--no-audio".to_string());
             args.push("--keyboard=uhid".to_string());
             args.push("--mouse=uhid".to_string());
        } else {
             args.push("--otg".to_string());
        }
    } else {
        if hid_keyboard {
            args.push("--keyboard=uhid".to_string());
        }
        if hid_mouse {
            args.push("--mouse=uhid".to_string());
        }

        if let Some(render_driver) = &config.render_driver {
            let selected_driver = render_driver.trim();
            if !selected_driver.is_empty() && selected_driver != "auto" {
                args.push("--render-driver".to_string());
                args.push(selected_driver.to_string());
            }
        }

        if let Some(bitrate) = config.bitrate {
            args.push("--video-bit-rate".to_string());
            args.push(format!("{}M", bitrate));
        }
        
        let audio_enabled = config.audio_enabled.unwrap_or(true);
        if !audio_enabled { args.push("--no-audio".to_string()); }
        if audio_enabled {
            // "auto" returns None from the resolver; default to aac for broadest compatibility.
            let codec = resolve_audio_codec_flag(config, audio_codec_override).unwrap_or("aac");
            args.push(format!("--audio-codec={}", codec));
            args.push("--audio-bit-rate=128k".to_string());
            args.push("--audio-buffer=50".to_string());
        }
        if let Some(aot) = config.always_on_top { if aot { args.push("--always-on-top".to_string()); } }
        if let Some(fs) = config.fullscreen { if fs { args.push("--fullscreen".to_string()); } }
        if let Some(bl) = config.borderless { if bl { args.push("--window-borderless".to_string()); } }
        
        if let Some(rot) = &config.rotation {
            if rot != "0" {
                args.push("--orientation".to_string());
                args.push(rot.clone());
            }
        }

        let can_control = config.session_mode != "camera";
        if can_control {
             if let Some(sa) = config.stay_awake { if sa { args.push("--stay-awake".to_string()); } }
             if let Some(ka) = config.keep_active { if ka { args.push("--keep-active".to_string()); } }
             if let Some(to) = config.turn_off { if to { args.push("--turn-screen-off".to_string()); args.push("--no-power-on".to_string()); } }
        }

        if config.session_mode == "camera" {
            args.push("--video-source=camera".to_string());
            if let Some(cid) = &config.camera_id {
                if !cid.is_empty() { args.push(format!("--camera-id={}", cid)); }
                else if let Some(facing) = &config.camera_facing { args.push(format!("--camera-facing={}", facing)); }
            } else if let Some(facing) = &config.camera_facing { args.push(format!("--camera-facing={}", facing)); }
            
            // Resolution logic: Map res (e.g., "1920") to standard camera sizes (e.g., "1920x1080")
            if let Some(res) = &config.res {
                if res != "0" {
                    let camera_size = match res.as_str() {
                        "3840" => "3840x2160",
                        "2560" => "2560x1440",
                        "1920" => "1920x1080",
                        "1600" => "1600x900",
                        "1280" => "1280x720",
                        "1024" => "1024x576",
                        "800" => "800x480",
                        _ => "1920x1080",
                    };
                    args.push(format!("--camera-size={}", camera_size));
                } else {
                    // Safe fallback default to avoid camera configuration error on non-standard sensor photo sizes (e.g. 4080x3060)
                    args.push("--camera-size=1920x1080".to_string());
                }
            } else {
                args.push("--camera-size=1920x1080".to_string());
            }

            if let Some(ar) = &config.camera_ar { if ar != "0" { args.push(format!("--camera-ar={}", ar)); } }
            if let Some(chs) = config.camera_high_speed { if chs { args.push("--camera-high-speed".to_string()); } }
            // v4: camera torch and zoom
            if let Some(true) = config.camera_torch { args.push("--camera-torch".to_string()); }
            if let Some(zoom) = config.camera_zoom {
                if zoom > 1.005 { // avoid floating point noise at 1.0
                    args.push(format!("--camera-zoom={:.1}", zoom));
                }
            }
             // fps handled generically below
        } else if config.session_mode == "desktop" {
             let w = config.vd_width.unwrap_or(1920);
             let h = config.vd_height.unwrap_or(1080);
             let dpi = config.vd_dpi.unwrap_or(420);
             args.push(format!("--new-display={}x{}/{}", w, h, dpi));
             args.push("--video-buffer=100".to_string());
             // v4: flex display (resize virtual display with window)
             if let Some(true) = config.flex_display { args.push("--flex-display".to_string()); }
        }
        
        if let Some(fps) = config.fps {
            if fps > 0 {
                if config.session_mode == "camera" {
                    args.push("--camera-fps".to_string());
                } else {
                    args.push("--max-fps".to_string());
                }
                args.push(fps.to_string());
            }
        } else if config.session_mode == "camera" && config.camera_high_speed.unwrap_or(false) {
            args.push("--camera-fps".to_string());
            args.push("60".to_string());
        }

        // Shared resolution logic (applies to mirror and desktop)
        if config.session_mode != "camera" {
            if let Some(res) = &config.res { 
                if res != "0" { 
                    args.push("--max-size".to_string()); 
                    args.push(res.clone()); 
                } 
            }
        }
        
        if let Some(rec) = config.record {
             if rec {
                 let mut path = config.record_path.clone().unwrap_or_default();
                 
                 // If path is empty, try to get Video dir fallback
                 if path.trim().is_empty() {
                    path = video_dir_fallback.unwrap_or_else(|| ".".to_string());
                 }

                 let filename = format!("scrcpy_{}_{}.mkv", config.device.replace(":", "-"), chrono::Local::now().format("%Y%m%d_%H%M%S"));
                 let full_path = std::path::Path::new(&path).join(filename);
                 args.push(format!("--record={}", full_path.to_string_lossy()));
             }
        }

        // v4: background color (all modes)
        if let Some(ref color) = config.background_color {
            let trimmed = color.trim();
            if !trimmed.is_empty() {
                args.push(format!("--background-color={}", trimmed));
            }
        }

        if let Some(ref shortcut_mod) = config.shortcut_mod {
            let trimmed = shortcut_mod.trim();
            if let Some(flag) = modifier_to_scrcpy_flag(trimmed) {
                args.push(format!("--shortcut-mod={}", flag));
            }
        }
    }

    args
}

async fn spawn_scrcpy_streams(
    window: &Window,
    exe_path: &str,
    adb_exe_path: &str,
    server_path: Option<&str>,
    args: &[String],
) -> Result<(tokio::process::Child, Arc<AtomicBool>), String> {
    let command_str = format!("> scrcpy {}", args.join(" "));
    let _ = window.emit("scrcpy-log", command_str);

    let mut command = create_command(exe_path);
    command.args(args);
    command.env("ADB", adb_exe_path);
    if let Some(sp) = server_path {
        if Path::new(sp).exists() {
            command.env("SCRCPY_SERVER_PATH", sp);
        }
    }
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().expect("Failed to capture stdout");
    let stderr = child.stderr.take().expect("Failed to capture stderr");

    let audio_error_flag = Arc::new(AtomicBool::new(false));

    let window_stdout = window.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        let mut buffer = Vec::new();
        let mut interval = tokio::time::interval(Duration::from_millis(100));

        loop {
            tokio::select! {
                line_res = lines.next_line() => {
                    match line_res {
                        Ok(Some(line)) => buffer.push(line),
                        Ok(None) => break,
                        Err(_) => break,
                    }
                }
                _ = interval.tick() => {
                    if !buffer.is_empty() {
                        let combined = buffer.join("\n");
                        let _ = window_stdout.emit("scrcpy-log", combined);
                        buffer.clear();
                    }
                }
            }
        }
        if !buffer.is_empty() {
            let _ = window_stdout.emit("scrcpy-log", buffer.join("\n"));
        }
    });

    let window_stderr = window.clone();
    let flag_clone = audio_error_flag.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        let mut buffer = Vec::new();
        let mut interval = tokio::time::interval(Duration::from_millis(100));

        loop {
            tokio::select! {
                line_res = lines.next_line() => {
                    match line_res {
                        Ok(Some(line)) => {
                            if is_audio_codec_error(&line) {
                                flag_clone.store(true, Ordering::SeqCst);
                            }
                            buffer.push(line);
                        }
                        Ok(None) => break,
                        Err(_) => break,
                    }
                }
                _ = interval.tick() => {
                    if !buffer.is_empty() {
                        let combined = buffer.join("\n");
                        let _ = window_stderr.emit("scrcpy-log", combined);
                        buffer.clear();
                    }
                }
            }
        }
        if !buffer.is_empty() {
            let _ = window_stderr.emit("scrcpy-log", buffer.join("\n"));
        }
    });

    Ok((child, audio_error_flag))
}

enum AttemptOutcome {
    Exited(String),
    WaitError(String),
    UserStopped,
}

#[tauri::command]
pub async fn run_scrcpy(window: Window, state: State<'_, ScrcpyState>, config: ScrcpyConfig, app_handle: tauri::AppHandle) -> Result<(), String> {

    let video_dir = app_handle.path().video_dir().ok().map(|p| p.to_string_lossy().to_string());

    let exe_path = get_binary_path("scrcpy", config.scrcpy_path.clone());

    // Log the session details for the user
    let mode_label = match config.session_mode.as_str() {
        "camera" => "Camera Mode",
        "desktop" => "Desktop Mode",
        _ => "Screen Mirroring",
    };

    let res_label = config.res.as_ref().map(|r| if r == "0" { "Original" } else { r }).unwrap_or("Original");
    let bitrate_label = format!("{}Mbps", config.bitrate.unwrap_or(8));
    let fps_label = format!("{}fps", config.fps.unwrap_or(60));

    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Starting {} session...", mode_label));
    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Target: {} | Config: {} @ {}, {}", config.device, res_label, bitrate_label, fps_label));

    if config.record.unwrap_or(false) {
        let path = config.record_path.as_ref().map(|p| if p.is_empty() { "Videos" } else { p }).unwrap_or("Videos");
        let _ = window.emit("scrcpy-log", format!("[SYSTEM] Recording enabled -> output to {}", path));
    }

    let adb_exe_path = get_binary_path("adb", config.scrcpy_path.clone());
    let server_path = if !exe_path.is_empty() && exe_path != "scrcpy" {
        Path::new(&exe_path).parent().map(|p| p.join("scrcpy-server").to_string_lossy().to_string())
    } else {
        None
    };

    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Using scrcpy: {}", exe_path));
    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Using adb: {}", adb_exe_path));

    // Decide whether automatic audio codec fallback should kick in on errors.
    let audio_enabled = config.audio_enabled.unwrap_or(true);
    let audio_codec_mode = config.audio_codec.as_deref().unwrap_or("auto").trim();
    let should_auto_fallback = audio_enabled
        && (audio_codec_mode.is_empty() || audio_codec_mode.eq_ignore_ascii_case("auto"));

    // First attempt: honour the user's audio codec choice. In "auto" mode this
    // launches without --audio-codec, matching the previous default behaviour.
    let initial_args = build_scrcpy_args(&config, video_dir.clone(), None);

    let (child, audio_error_flag) = spawn_scrcpy_streams(
        &window,
        &exe_path,
        &adb_exe_path,
        server_path.as_deref(),
        &initial_args,
    ).await?;

    state.processes.lock().unwrap().insert(config.device.clone(), child);
    let _ = window.emit("scrcpy-status", json!({ "device": config.device, "running": true }));

    // Monitor for exit (and orchestrate the audio codec fallback chain)
    let device_mon = config.device.clone();
    let window_mon = window.clone();
    let app_handle_mon = window.app_handle().clone();
    let video_dir_mon = video_dir;
    let exe_path_mon = exe_path;
    let adb_exe_path_mon = adb_exe_path;
    let server_path_mon = server_path;
    let config_mon = config.clone();

    tokio::spawn(async move {
        let mut current_audio_flag = audio_error_flag;
        let mut chain_index: usize = 0;

        loop {
            tokio::time::sleep(Duration::from_millis(500)).await;

            let outcome = {
                let state_mon = app_handle_mon.state::<ScrcpyState>();
                let mut processes = state_mon.processes.lock().unwrap();
                match processes.get_mut(&device_mon) {
                    Some(child) => match child.try_wait() {
                        Ok(Some(status)) => {
                            processes.remove(&device_mon);
                            Some(AttemptOutcome::Exited(status.to_string()))
                        }
                        Ok(None) => None,
                        Err(e) => {
                            processes.remove(&device_mon);
                            Some(AttemptOutcome::WaitError(e.to_string()))
                        }
                    },
                    None => Some(AttemptOutcome::UserStopped),
                }
            };

            let outcome = match outcome {
                Some(o) => o,
                None => continue,
            };

            match outcome {
                AttemptOutcome::WaitError(e) => {
                    let _ = window_mon.emit("scrcpy-log", format!("[SYSTEM] Error waiting for scrcpy: {}", e));
                    let _ = window_mon.emit("scrcpy-status", json!({ "device": device_mon, "running": false }));
                    break;
                }
                AttemptOutcome::UserStopped => {
                    let _ = window_mon.emit("scrcpy-status", json!({ "device": device_mon, "running": false }));
                    break;
                }
                AttemptOutcome::Exited(status) => {
                    let _ = window_mon.emit("scrcpy-log", format!("[SYSTEM] Scrcpy process exited with status: {}", status));

                    // Give stream reader tasks a moment to flush remaining stderr
                    // lines (the audio error pattern may still be in flight).
                    tokio::time::sleep(Duration::from_millis(250)).await;

                    let audio_failed = current_audio_flag.load(Ordering::SeqCst);

                    if should_auto_fallback && audio_failed && chain_index < AUDIO_FALLBACK_CHAIN.len() {
                        let next_codec = AUDIO_FALLBACK_CHAIN[chain_index];
                        let _ = window_mon.emit(
                            "scrcpy-log",
                            format!("[SYSTEM] Default audio codec failed, retrying with {}...", next_codec.to_uppercase()),
                        );

                        let new_args = build_scrcpy_args(&config_mon, video_dir_mon.clone(), Some(next_codec));

                        match spawn_scrcpy_streams(
                            &window_mon,
                            &exe_path_mon,
                            &adb_exe_path_mon,
                            server_path_mon.as_deref(),
                            &new_args,
                        ).await {
                            Ok((new_child, new_flag)) => {
                                let state_mon = app_handle_mon.state::<ScrcpyState>();
                                state_mon.processes.lock().unwrap().insert(device_mon.clone(), new_child);
                                current_audio_flag = new_flag;
                                chain_index += 1;
                                continue;
                            }
                            Err(e) => {
                                let _ = window_mon.emit("scrcpy-log", format!("[SYSTEM] Failed to spawn retry: {}", e));
                                let _ = window_mon.emit("scrcpy-status", json!({ "device": device_mon, "running": false }));
                                break;
                            }
                        }
                    } else if should_auto_fallback && audio_failed {
                        let _ = window_mon.emit(
                            "scrcpy-log",
                            "[SYSTEM] No compatible audio codec found. Consider disabling audio forwarding.".to_string(),
                        );
                        let _ = window_mon.emit("scrcpy-status", json!({ "device": device_mon, "running": false }));
                        break;
                    } else {
                        let _ = window_mon.emit("scrcpy-status", json!({ "device": device_mon, "running": false }));
                        break;
                    }
                }
            }
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_config(session_mode: &str) -> ScrcpyConfig {
        ScrcpyConfig {
            device: "device1".to_string(),
            session_mode: session_mode.to_string(),
            bitrate: None,
            fps: None,
            stay_awake: None,
            turn_off: None,
            audio_enabled: None,
            audio_codec: None,
            always_on_top: None,
            fullscreen: None,
            borderless: None,
            record: None,
            record_path: None,
            scrcpy_path: None,
            otg_pure: None,
            camera_facing: None,
            camera_id: None,
            codec: None,
            camera_ar: None,
            camera_high_speed: None,
            vd_width: None,
            vd_height: None,
            vd_dpi: None,
            rotation: None,
            res: None,
            hid_keyboard: None,
            hid_mouse: None,
            render_driver: None,
            flex_display: None,
            camera_torch: None,
            camera_zoom: None,
            background_color: None,
            keep_active: None,
            shortcut_mod: None,
        }
    }

    #[test]
    fn test_build_scrcpy_args_mirror_defaults() {
        let config = base_config("mirror");
        let args = build_scrcpy_args(&config, None, None);
        assert!(args.contains(&"-s".to_string()));
        assert!(args.contains(&"device1".to_string()));
        assert!(args.contains(&"--video-codec=h264".to_string()));
    }

    #[test]
    fn test_build_scrcpy_args_camera_mode() {
        let mut config = base_config("camera");
        config.fps = Some(30);
        config.camera_facing = Some("front".to_string());

        let args = build_scrcpy_args(&config, None, None);
        assert!(args.contains(&"--video-source=camera".to_string()));
        assert!(args.contains(&"--camera-facing=front".to_string()));
        assert!(args.contains(&"--camera-fps".to_string()));
        assert!(args.contains(&"30".to_string()));
    }

    #[test]
    fn test_build_scrcpy_args_bitrate_and_fps() {
        let mut config = base_config("mirror");
        config.bitrate = Some(8);
        config.fps = Some(60);

        let args = build_scrcpy_args(&config, None, None);
        assert!(args.contains(&"--video-bit-rate".to_string()));
        assert!(args.contains(&"8M".to_string()));
        assert!(args.contains(&"--max-fps".to_string()));
        assert!(args.contains(&"60".to_string()));
    }

    #[test]
    fn test_audio_codec_auto_adds_no_flag() {
        let mut config = base_config("mirror");
        config.audio_codec = Some("auto".to_string());

        let args = build_scrcpy_args(&config, None, None);
        assert!(!args.iter().any(|a| a.starts_with("--audio-codec")));
    }

    #[test]
    fn test_audio_codec_manual_adds_flag() {
        let mut config = base_config("mirror");
        config.audio_codec = Some("aac".to_string());

        let args = build_scrcpy_args(&config, None, None);
        assert!(args.contains(&"--audio-codec=aac".to_string()));
    }

    #[test]
    fn test_audio_codec_override_takes_precedence() {
        let mut config = base_config("mirror");
        config.audio_codec = Some("auto".to_string());

        let args = build_scrcpy_args(&config, None, Some("flac"));
        assert!(args.contains(&"--audio-codec=flac".to_string()));
    }

    #[test]
    fn test_audio_codec_skipped_when_audio_disabled() {
        let mut config = base_config("mirror");
        config.audio_enabled = Some(false);
        config.audio_codec = Some("aac".to_string());

        let args = build_scrcpy_args(&config, None, None);
        assert!(args.contains(&"--no-audio".to_string()));
        assert!(!args.iter().any(|a| a.starts_with("--audio-codec")));
    }

    #[test]
    fn test_is_audio_codec_error_matches_known_patterns() {
        assert!(is_audio_codec_error(
            "ERROR: Could not create default audio encoder for opus"
        ));
        assert!(is_audio_codec_error("Failed to initialize audio/opus"));
        assert!(is_audio_codec_error("audio codec not supported on device"));
        assert!(is_audio_codec_error("audio encoder failed to start"));
    }

    #[test]
    fn test_is_audio_codec_error_ignores_unrelated() {
        assert!(!is_audio_codec_error("ADB disconnected"));
        assert!(!is_audio_codec_error("device offline"));
        assert!(!is_audio_codec_error("video encoder error"));
        assert!(!is_audio_codec_error("permission issue"));
        assert!(!is_audio_codec_error("INFO Audio codec selected: opus"));
    }
}

#[tauri::command]
pub async fn stop_scrcpy(state: State<'_, ScrcpyState>, device: String) -> Result<(), String> {
    let child = {
        let mut processes = state.processes.lock().unwrap();
        processes.remove(&device)
    };

    if let Some(mut c) = child {
        if let Some(pid) = c.id() {
             #[cfg(target_os = "windows")]
             {
                let _ = StdCommand::new("taskkill")
                    .args(&["/PID", &pid.to_string()])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
             }
             
             #[cfg(not(target_os = "windows"))]
             {
                 // Try graceful termination first via SIGTERM
                 let _ = StdCommand::new("kill")
                    .arg(pid.to_string())
                    .output();
             }

            // Give it a moment to finalize, but don't block too long
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        } else {
            let _ = c.kill().await;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn download_scrcpy(window: Window) -> Result<(), String> {
    use std::io::Write;
    
    let (os_tag, arch_tag, extension) = if cfg!(target_os = "windows") {
        let arch = if cfg!(target_arch = "x86_64") { "win64" } else { "win32" };
        (arch, arch, ".zip")
    } else if cfg!(target_os = "linux") {
        ("linux", "linux-x86_64", ".tar.gz")
    } else if cfg!(target_os = "macos") {
        let arch = if cfg!(target_arch = "aarch64") { "macos-aarch64" } else { "macos-x86_64" };
        ("macos", arch, ".tar.gz")
    } else {
        return Err("Unsupported OS for auto-download".to_string());
    };

    window.emit("scrcpy-log", format!("[SYSTEM] Detecting platform: {} ({})", os_tag, arch_tag)).unwrap();
    window.emit("scrcpy-status", json!({ "type": "downloading", "success": true, "message": format!("Fetching latest {} release...", arch_tag) })).unwrap();

    let client = reqwest::Client::builder().user_agent("ScrcpyGui-Downloader").build().map_err(|e| e.to_string())?;
    
    // Attempt to get the latest release via API, but fallback to redirect scraping if rate limited
    let mut download_url = String::new();
    let mut filename = String::new();

    let api_url = "https://api.github.com/repos/Genymobile/scrcpy/releases/latest";
    let api_resp = client.get(api_url).send().await;

    let mut used_fallback = false;

    if let Ok(resp) = api_resp {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(assets) = json["assets"].as_array() {
                    for asset in assets {
                        let name = asset["name"].as_str().unwrap_or("");
                        if name.contains(arch_tag) && name.ends_with(extension) {
                            download_url = asset["browser_download_url"].as_str().unwrap_or("").to_string();
                            filename = name.to_string();
                            break;
                        }
                    }
                }
            }
        } else if resp.status() == reqwest::StatusCode::FORBIDDEN {
            window.emit("scrcpy-log", "[SYSTEM] API rate limited, attempting fallback discovery...").unwrap();
            used_fallback = true;
        }
    } else {
        used_fallback = true;
    }

    if used_fallback || download_url.is_empty() {
        // Fallback: Follow redirect of /releases/latest to get the tag name
        let redirect_res = client.get("https://github.com/Genymobile/scrcpy/releases/latest")
            .send().await.map_err(|e| format!("Fallback failed: {}", e))?;
        
        let final_url = redirect_res.url().as_str();
        // URL is like https://github.com/Genymobile/scrcpy/releases/tag/v2.7
        if let Some(tag) = final_url.split('/').next_back() {
            if tag.starts_with('v') {
                filename = format!("scrcpy-{}-{}{}", arch_tag, tag, extension);
                download_url = format!("https://github.com/Genymobile/scrcpy/releases/download/{}/{}", tag, filename);
                window.emit("scrcpy-log", format!("[SYSTEM] Discovered latest tag via fallback: {}", tag)).unwrap();
            }
        }
    }
    
    if download_url.is_empty() {
        return Err(format!("Could not find {} binary. (API rate limit might be active)", arch_tag));
    }

    window.emit("scrcpy-log", format!("[SYSTEM] Found asset: {}", filename)).unwrap();
    
    let current_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap());
        
    let temp_archive_path = current_dir.join(format!("scrcpy_temp{}", extension));
    let extract_path = current_dir.join("scrcpy-bin");
    
    {
        let mut file = std::fs::File::create(&temp_archive_path).map_err(|e| format!("Failed to create archive file: {}", e))?;
        let mut download_resp = client.get(&download_url).send().await.map_err(|e| format!("Failed to connect to download URL: {}", e))?;
        let total_size = download_resp.content_length().unwrap_or(0);
        
        window.emit("scrcpy-log", format!("[SYSTEM] Downloading: {} MB", total_size / 1024 / 1024)).unwrap();

        let mut downloaded: u64 = 0;
        while let Some(chunk) = download_resp.chunk().await.map_err(|e| e.to_string())? {
            file.write_all(&chunk).map_err(|e| format!("Failed to write chunk: {}", e))?;
            downloaded += chunk.len() as u64;
            if total_size > 0 {
                let percent = (downloaded * 100) / total_size;
                let _ = window.emit("scrcpy-status", json!({ "type": "download-progress", "percent": percent }));
            }
        }
    }
    
    window.emit("scrcpy-log", "[SYSTEM] Download finished. Starting extraction...").unwrap();
    window.emit("scrcpy-status", json!({ "type": "downloading", "success": true, "message": "Extracting binaries..." })).unwrap();

    if extract_path.exists() {
        let _ = std::fs::remove_dir_all(&extract_path);
    }
    
    let temp_extract_dir = current_dir.join("temp_extract");
    if temp_extract_dir.exists() {
        let _ = std::fs::remove_dir_all(&temp_extract_dir);
    }
    std::fs::create_dir_all(&temp_extract_dir).map_err(|e| e.to_string())?;

    if extension == ".zip" {
        window.emit("scrcpy-log", "[SYSTEM] Decompressing ZIP archive...").unwrap();
        let file = std::fs::File::open(&temp_archive_path).map_err(|e| format!("Failed to open zip: {}", e))?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {}", e))?;
        archive.extract(&temp_extract_dir).map_err(|e| format!("Failed to extract: {}", e))?;
    } else {
        window.emit("scrcpy-log", "[SYSTEM] Decompressing TAR.GZ archive...").unwrap();
        let file = std::fs::File::open(&temp_archive_path).map_err(|e| format!("Failed to open tar.gz: {}", e))?;
        let tar = GzDecoder::new(file);
        let mut archive = Archive::new(tar);
        archive.unpack(&temp_extract_dir).map_err(|e| format!("Failed to extract tar: {}", e))?;
    }
    
    // Verify entries and move to scrcpy-bin
    let mut entries = std::fs::read_dir(&temp_extract_dir).map_err(|e| e.to_string())?;
    if let Some(entry) = entries.next() {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_dir() {
            // Usually scrcpy archives contain a single root folder
            let _ = std::fs::rename(&path, &extract_path).or_else(|_| {
                copy_dir_all(&path, &extract_path)
            });
        } else {
            // If files are in root, rename the whole temp dir
            let _ = std::fs::rename(&temp_extract_dir, &extract_path).or_else(|_| {
                copy_dir_all(&temp_extract_dir, &extract_path)
            });
        }
    }
    
    // Cleanup
    if temp_extract_dir.exists() { let _ = std::fs::remove_dir_all(&temp_extract_dir); }
    if temp_archive_path.exists() { let _ = std::fs::remove_file(&temp_archive_path); }

    window.emit("scrcpy-status", json!({ "type": "download-complete", "success": true, "message": extract_path.to_string_lossy() })).unwrap();
    Ok(())
}

#[tauri::command]
pub async fn get_videos_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    app_handle.path().video_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_report(app_handle: tauri::AppHandle, content: String, name: String) -> Result<String, String> {
    use std::fs;
    use tauri::Manager;

    let downloads = app_handle.path().download_dir()
        .map_err(|e| e.to_string())?;
    
    let path = downloads.join(&name);
    fs::write(&path, content).map_err(|e| e.to_string())?;
    
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_scrcpy_bin_dir() -> Result<String, String> {
    let current_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap());
        
    let extract_path = current_dir.join("scrcpy-bin");
    
    if extract_path.exists() {
        Ok(extract_path.to_string_lossy().to_string())
    } else {
        Ok(current_dir.to_string_lossy().to_string())
    }
}

pub fn get_local_scrcpy_version(custom_path: Option<String>) -> Option<String> {
    let exe_path = get_binary_path("scrcpy", custom_path);
    let mut cmd = std::process::Command::new(&exe_path);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd.arg("--version").output().ok()?;
    if output.status.success() {
        let out_str = String::from_utf8_lossy(&output.stdout);
        for line in out_str.lines() {
            if line.contains("scrcpy") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if let Some(idx) = parts.iter().position(|&x| x == "scrcpy") {
                    if let Some(version) = parts.get(idx + 1) {
                        return Some(version.trim_start_matches('v').to_string());
                    }
                }
            }
        }
    }
    None
}

pub async fn get_latest_scrcpy_version() -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("ScrcpyGui-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    let api_url = "https://api.github.com/repos/Genymobile/scrcpy/releases/latest";
    let api_resp = client.get(api_url).send().await;

    let mut tag_name = String::new();
    let mut used_fallback = false;

    if let Ok(resp) = api_resp {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(tag) = json["tag_name"].as_str() {
                    tag_name = tag.trim_start_matches('v').to_string();
                }
            }
        } else if resp.status() == reqwest::StatusCode::FORBIDDEN {
            used_fallback = true;
        }
    } else {
        used_fallback = true;
    }

    if used_fallback || tag_name.is_empty() {
        let redirect_res = client.get("https://github.com/Genymobile/scrcpy/releases/latest")
            .send().await
            .map_err(|e| format!("Fallback failed: {}", e))?;
        
        let final_url = redirect_res.url().as_str();
        if let Some(tag) = final_url.split('/').next_back() {
            if tag.starts_with('v') || tag.chars().next().map_or(false, |c| c.is_ascii_digit()) {
                tag_name = tag.trim_start_matches('v').to_string();
            }
        }
    }

    if tag_name.is_empty() {
        return Err("Could not determine latest version".to_string());
    }

    Ok(tag_name)
}

fn compare_versions(local: &str, remote: &str) -> bool {
    let local_parts: Vec<u32> = local.split('.')
        .filter_map(|s| s.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().ok())
        .collect();
    let remote_parts: Vec<u32> = remote.split('.')
        .filter_map(|s| s.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().ok())
        .collect();

    for i in 0..std::cmp::max(local_parts.len(), remote_parts.len()) {
        let local_val = local_parts.get(i).cloned().unwrap_or(0);
        let remote_val = remote_parts.get(i).cloned().unwrap_or(0);
        if remote_val > local_val {
            return true;
        } else if local_val > remote_val {
            return false;
        }
    }
    false
}

#[tauri::command]
pub async fn check_scrcpy_update(custom_path: Option<String>) -> serde_json::Value {
    let local_version = match get_local_scrcpy_version(custom_path.clone()) {
        Some(v) => v,
        None => return json!({ "update_available": false, "local_version": null, "latest_version": null, "message": "Scrcpy not installed or not working" })
    };

    let latest_version = match get_latest_scrcpy_version().await {
        Ok(v) => v,
        Err(e) => return json!({ "update_available": false, "local_version": local_version, "latest_version": null, "message": format!("Could not fetch latest release: {}", e) })
    };

    let update_available = compare_versions(&local_version, &latest_version);

    json!({
        "update_available": update_available,
        "local_version": local_version,
        "latest_version": latest_version
    })
}



