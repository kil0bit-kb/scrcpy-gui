mod commands;
// Windows-only: drag the borderless scrcpy window with the mouse
// (Ctrl+Alt+Shift+W).
#[cfg(target_os = "windows")]
mod grab;
// Cross-platform global OS shortcuts (e.g. Ctrl+Alt+Shift+C to recentre the
// active mirror window), shared with grab.rs's Windows-only drag toggle.
mod shortcuts;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;
use tokio::process::Child;

#[cfg(target_os = "linux")]
use std::os::unix::process::CommandExt;

#[cfg(desktop)]
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg(desktop)]
const TRAY_ICON_BYTES: &[u8] = include_bytes!("../icons/icon.png");

pub struct ScrcpyState {
    pub processes: Mutex<HashMap<String, Child>>,
    pub active_device: Mutex<Option<String>>,
    /// A raw window position captured by `stop_scrcpy` right before it kills
    /// the process (the window is still exactly where the user left it at
    /// that instant), handed off to the run_scrcpy monitor loop so it can
    /// apply its already-learned decoration offset instead of persisting its
    /// own periodic sample, which can be a few seconds stale. See
    /// `resolve_window_pos_to_persist` in commands.rs.
    pub final_capture_hint: Mutex<HashMap<String, (i32, i32)>>,
}

#[cfg(desktop)]
fn restore_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(false);
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(desktop)]
fn hide_main_window_to_tray(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(true);
        let _ = window.hide();
    }
}

#[cfg(desktop)]
fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "tray-open", "Open / Restore", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "tray-exit", "Exit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(Image::from_bytes(TRAY_ICON_BYTES)?)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => restore_main_window(tray.app_handle()),
            _ => {}
        })
        .build(app)?;

    app.on_menu_event(|app, event| {
        if event.id() == "tray-open" {
            restore_main_window(app);
        } else if event.id() == "tray-exit" {
            app.exit(0);
        }
    });

    Ok(())
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

    let builder = tauri::Builder::default()
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                hide_main_window_to_tray(window.app_handle());
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        // The global-shortcut plugin must be registered on the builder (its
        // setup wires the OS hotkey manager on the main thread). Individual
        // shortcuts are registered below in setup.
        .plugin(shortcuts::plugin());

    builder
        .setup(|app| {
            app.manage(ScrcpyState {
                processes: Mutex::new(HashMap::new()),
                active_device: Mutex::new(None),
                final_capture_hint: Mutex::new(HashMap::new()),
            });

            #[cfg(desktop)]
            {
                setup_tray(app)?;
            }

            // Ctrl+Alt+Shift+C (recentre the active mirror window) on every
            // platform, plus Ctrl+Alt+Shift+W (drag the borderless window) on
            // Windows. Non-fatal if a shortcut fails to register.
            if let Err(e) = shortcuts::register(app.handle()) {
                eprintln!("[shortcuts] failed to register global shortcuts: {e}");
            }

            // Windows-only: start the drag-follow thread backing Ctrl+Alt+Shift+W.
            #[cfg(target_os = "windows")]
            grab::register(app.handle());

            // Show splashscreen instantly
            if let Some(splash_window) = app.get_webview_window("splashscreen") {
                splash_window.show().unwrap();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::check_scrcpy,
            commands::get_devices,
            commands::adb_connect,
            commands::get_mdns_devices,
            commands::adb_pair,
            commands::adb_shell,
            commands::push_file,
            commands::install_apk,
            commands::kill_adb,
            commands::run_scrcpy,
            commands::stop_scrcpy,
            commands::recenter_scrcpy_window,
            commands::set_active_device,
            commands::download_scrcpy,
            commands::list_scrcpy_options,
            commands::get_render_drivers,
            commands::get_videos_dir,
            commands::save_report,
            commands::get_scrcpy_bin_dir,
            commands::run_terminal_command,
            commands::check_scrcpy_update,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}
