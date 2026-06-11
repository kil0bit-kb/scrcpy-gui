mod commands;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;
use tokio::process::Child;

#[cfg(target_os = "linux")]
use std::os::unix::process::CommandExt;

pub struct ScrcpyState {
    pub processes: Mutex<HashMap<String, Child>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Fix for white screen on Linux (Wayland/NVIDIA)
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }

        // Workaround for AppImage blank UI on Fedora/Wayland
        // Preload the host's libwayland-client.so.0 to prevent conflicts with bundled version
        // Checking whether it is an AppImage or not by checking APPDIR environment variable
        if std::env::var("APPDIR").is_ok() && std::env::var("WAYLAND_DISPLAY").is_ok() {
            let preload = std::env::var("LD_PRELOAD").unwrap_or_default();
            if !preload.contains("libwayland-client.so.0") {
                // checking host native libwayland-client.so.0 is loaded or not by checking LD_PRELOAD environment variable
                let paths = [
                    "/usr/lib64/libwayland-client.so.0",
                    "/usr/lib/x86_64-linux-gnu/libwayland-client.so.0",
                    "/usr/lib/libwayland-client.so.0",
                ];
                for path in paths {
                    // if host native libwayland-client.so.0 is found it will be loaded instead of bundled version
                    if std::path::Path::new(path).exists() {
                        let mut new_preload = preload;
                        if !new_preload.is_empty() {
                            new_preload.push(':');
                        }
                        new_preload.push_str(path);
                        std::env::set_var("LD_PRELOAD", &new_preload);

                        let current_exe = std::env::current_exe().unwrap_or_else(|_| {
                            std::path::PathBuf::from(std::env::args().next().unwrap())
                        });
                        let mut cmd = std::process::Command::new(current_exe);
                        cmd.args(std::env::args().skip(1));
                        let _ = cmd.exec();
                        break;
                    }
                }
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(ScrcpyState {
                processes: Mutex::new(HashMap::new()),
            });

            // Show splashscreen instantly
            if let Some(splash_window) = app.get_webview_window("splashscreen") {
                splash_window.show().unwrap();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_scrcpy,
            commands::get_devices,
            commands::adb_connect,
            commands::adb_pair,
            commands::push_file,
            commands::install_apk,
            commands::kill_adb,
            commands::run_scrcpy,
            commands::stop_scrcpy,
            commands::download_scrcpy,
            commands::list_scrcpy_options,
            commands::get_render_drivers,
            commands::get_videos_dir,
            commands::save_report,
            commands::get_scrcpy_bin_dir,
            commands::run_terminal_command,
            commands::check_scrcpy_update,
            close_splashscreen,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
async fn close_splashscreen(window: tauri::Window) {
    // Get the main window
    if let Some(main_window) = window.get_webview_window("main") {
        // Show the main window
        main_window.show().unwrap();
    }
    // Close the splashscreen window
    if let Some(splash_window) = window.get_webview_window("splashscreen") {
        splash_window.close().unwrap();
    }
}
