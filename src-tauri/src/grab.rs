//! Windows-only: drag the borderless scrcpy mirror window with the mouse.
//!
//! scrcpy's `--window-borderless` window has no title bar, and Windows, unlike
//! GNOME/KDE, which provide Super/Meta+drag, has no built-in way to move such a
//! window. (A title bar can't simply be added from the outside either: scrcpy's
//! SDL window owns its non-client area, so an externally-set WS_CAPTION never
//! renders.) This registers a global shortcut (Ctrl+Alt+Shift+W) that "grabs"
//! the focused scrcpy window: the cursor jumps to the window's centre and the
//! window then follows the mouse. Drop it with a left click or by pressing the
//! shortcut again. The window is moved from the outside via Win32 `SetWindowPos`;
//! scrcpy itself is never touched.
//!
//! Self-contained on purpose: the whole feature lives in this module plus a
//! small hook in `lib.rs` and one target-gated dependency, so it is easy to
//! review, or to split out into its own change.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

use windows::Win32::Foundation::{HINSTANCE, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, GetCursorPos, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId,
    IsZoomed, PeekMessageW, SetCursorPos, SetWindowsHookExW, SetWindowPos, UnhookWindowsHookEx,
    HC_ACTION, HHOOK, MSG, PM_REMOVE, SWP_NOACTIVATE, SWP_NOSIZE, SWP_NOZORDER, WH_MOUSE_LL,
    WM_LBUTTONDOWN,
};

use crate::ScrcpyState;

/// Whether a grab is in progress. Flipped by the shortcut handler, ended by the
/// mouse hook on a left click, and polled by the follow thread. A module static
/// (not managed state) so the C-style hook procedure, which cannot capture, can
/// reach it.
static GRAB_ACTIVE: AtomicBool = AtomicBool::new(false);

// Ctrl+Alt+Shift+W, all four keys sit under the left hand, so it is a
// one-handed shortcut. RegisterHotKey makes the combo global (consumed
// system-wide while registered), so it is deliberately an uncommon four-key
// chord that steers clear of scrcpy's own shortcuts (all MOD(Alt/Super)+key)
// and the GUI's (none).
pub fn toggle_shortcut() -> Shortcut {
    Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::ALT | Modifiers::SHIFT),
        Code::KeyW,
    )
}

/// Flip the grab on/off. Called from `shortcuts.rs`'s shared global-shortcut
/// handler on the key-down edge of [`toggle_shortcut`].
pub fn toggle() {
    GRAB_ACTIVE.fetch_xor(true, Ordering::SeqCst);
}

/// Start the follow thread. Call from the app's `setup` (main thread); the
/// shortcut itself is registered by `shortcuts.rs`.
pub fn register<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    std::thread::spawn(move || follow_loop(handle));
}

/// Background loop: while a grab is active, keep the grabbed window under the
/// cursor and watch for the left-click that drops it. Sleeps cheaply when idle.
fn follow_loop<R: Runtime>(app: AppHandle<R>) {
    // Everything below runs on this one thread: the raw HWND in `grabbed` and the
    // mouse hook both stay thread-local.
    let mut grabbed: Option<GrabbedWindow> = None;
    let mut hook: Option<HHOOK> = None;

    loop {
        if !GRAB_ACTIVE.load(Ordering::SeqCst) {
            release_hook(&mut hook);
            grabbed = None;
            std::thread::sleep(Duration::from_millis(40));
            continue;
        }

        // Arm on the first tick of a new grab: attach to the focused window (only
        // if it is one of our scrcpy windows) and install the click-to-drop hook.
        if grabbed.is_none() {
            match GrabbedWindow::arm(&app) {
                Some(g) => {
                    grabbed = Some(g);
                    hook = install_hook();
                }
                None => {
                    GRAB_ACTIVE.store(false, Ordering::SeqCst);
                    continue;
                }
            }
        }

        // Pump this thread's queue so the low-level mouse hook can fire, then move
        // the window to follow the cursor.
        pump_messages();
        if let Some(g) = &grabbed {
            if !g.follow_cursor() {
                // The window went away (e.g. session closed): end the grab.
                GRAB_ACTIVE.store(false, Ordering::SeqCst);
                release_hook(&mut hook);
                grabbed = None;
                continue;
            }
        }
        std::thread::sleep(Duration::from_millis(6));
    }
}

/// A window being dragged, plus the cursor-to-window-corner offset captured when
/// the grab started, so the grab point stays under the cursor.
struct GrabbedWindow {
    hwnd: HWND,
    offset: (i32, i32),
}

impl GrabbedWindow {
    fn arm<R: Runtime>(app: &AppHandle<R>) -> Option<GrabbedWindow> {
        let fg = unsafe { GetForegroundWindow() };
        if fg.0.is_null() {
            return None;
        }
        let mut pid: u32 = 0;
        unsafe { GetWindowThreadProcessId(fg, Some(&mut pid)) };
        if pid == 0 || !pid_is_ours(app, pid) {
            return None;
        }
        // Refuse a maximized window: SetWindowPos with SWP_NOSIZE would drag it
        // around still-maximized (monitor-sized) and partly off-screen. Restore
        // it first (e.g. Win+Down) to move it.
        if unsafe { IsZoomed(fg) }.as_bool() {
            return None;
        }
        let mut rect = RECT::default();
        if unsafe { GetWindowRect(fg, &mut rect) }.is_err() {
            return None;
        }
        // Warp the cursor to the window's centre and grab from there. Grabbing
        // from wherever the cursor happens to be would run out of cursor travel
        // on that side (you couldn't drag the window past that screen edge);
        // centring gives room to move in every direction and lets the window
        // reach all four edges.
        let centre = ((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
        let _ = unsafe { SetCursorPos(centre.0, centre.1) };
        Some(GrabbedWindow {
            hwnd: fg,
            offset: (centre.0 - rect.left, centre.1 - rect.top),
        })
    }

    /// Move the window so the grab point stays under the cursor. Returns false
    /// only when the window can no longer be moved (e.g. it was closed).
    fn follow_cursor(&self) -> bool {
        // A transient cursor-read failure should not drop the grab.
        let Some((cx, cy)) = cursor_pos() else {
            return true;
        };
        unsafe {
            SetWindowPos(
                self.hwnd,
                None,
                cx - self.offset.0,
                cy - self.offset.1,
                0,
                0,
                SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
            )
        }
        .is_ok()
    }
}

/// Low-level mouse hook: while a grab is active, a left-button press ends it and
/// is swallowed, so the click that "drops" the window is not forwarded to scrcpy
/// as a tap on the phone.
unsafe extern "system" fn mouse_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32
        && wparam.0 as u32 == WM_LBUTTONDOWN
        && GRAB_ACTIVE.load(Ordering::SeqCst)
    {
        GRAB_ACTIVE.store(false, Ordering::SeqCst);
        return LRESULT(1); // handled -> do not pass the click to scrcpy
    }
    CallNextHookEx(None, code, wparam, lparam)
}

fn install_hook() -> Option<HHOOK> {
    // WH_MOUSE_LL is global; it is installed only for the duration of a grab.
    let hmod = unsafe { GetModuleHandleW(None) }.ok()?;
    unsafe { SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook), Some(HINSTANCE(hmod.0)), 0) }.ok()
}

fn release_hook(hook: &mut Option<HHOOK>) {
    if let Some(h) = hook.take() {
        let _ = unsafe { UnhookWindowsHookEx(h) };
    }
}

/// Pump the thread's message queue so the installed low-level hook can fire
/// (low-level hooks are delivered while the thread retrieves messages).
fn pump_messages() {
    let mut msg = MSG::default();
    while unsafe { PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE) }.as_bool() {}
}

/// True if `pid` is one of the scrcpy processes we launched.
fn pid_is_ours<R: Runtime>(app: &AppHandle<R>, pid: u32) -> bool {
    app.state::<ScrcpyState>()
        .processes
        .lock()
        .unwrap()
        .values()
        .any(|child| child.id() == Some(pid))
}

fn cursor_pos() -> Option<(i32, i32)> {
    let mut p = POINT::default();
    if unsafe { GetCursorPos(&mut p) }.is_ok() {
        Some((p.x, p.y))
    } else {
        None
    }
}
