# 📖 ScrcpyGUI v4 - User Guide

This guide provides everything you need to know to get started with ScrcpyGUI, from initial setup to advanced feature usage.

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Installation Guide](#-installation-guide)
3. [Android Device Setup](#-android-device-setup)
4. [Connecting Your Device](#-connecting-your-device)
5. [Feature Guide](#-feature-guide)
6. [Troubleshooting](#-troubleshooting)

---

## 🛠 Prerequisites

Before using ScrcpyGUI, ensure you have the following:

- **Android Device**: Running Android 5.0 or higher (Android 12+ required for Camera Mode, Android 11+ for Desktop Mode).
- **USB Cable**: A high-quality data cable (avoid charging-only cables).
- **PC**: Windows, macOS, or Linux.
- **Scrcpy Binaries**: The app can download these for you automatically, but you can also provide your own.

---

## 🚀 Installation Guide

### 🪟 Windows
1. Download the latest `.exe` or `.msi` from the [Releases](https://github.com/kil0bit-kb/scrcpy-gui/releases) page.
2. Run the installer or standalone executable.
3. **Smart Setup**: On the first launch, ScrcpyGUI will detect if you have `scrcpy` installed. If not, it will offer a one-click download.
4. **Automated Updates**: When launched, ScrcpyGUI v4 will automatically check your installed version against Genymobile's latest official release and prompt you with a beautiful one-click update modal if a new version is available.

### 🍎 macOS
1. Download the `.dmg` file matching your architecture (**Intel** or **Apple Silicon/M1/M2**).
2. Drag the **ScrcpyGUI** icon into your **Applications** folder.
3. **Security Note**: Since the app is not signed by Apple, you may need to:
   - Go to **System Settings > Privacy & Security**.
   - Scroll down to "Security" and click **Open Anyway**.

### 🐧 Linux
1. Download the `.AppImage` or `.deb` package.
2. **AppImage**: Right-click -> Properties -> Permissions -> **Allow executing file as program**. Double-click to run.
3. **Dependencies**: Ensure you have the following installed if you encounter issues:
   ```bash
   sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev
   ```

---

## 📱 Android Device Setup

You must enable **Developer Options** and **USB Debugging** on your phone for ScrcpyGUI to communicate with it.

### 1. Enable Developer Options
1. Open **Settings** on your Android device.
2. Go to **About Phone** (usually at the bottom).
3. Find the **Build Number** and tap it **7 times** rapidly.
4. You will see a toast message: "You are now a developer!"

### 2. Enable USB Debugging
1. Go back to the main **Settings** menu.
2. Go to **System > Developer Options** (or search for it).
3. Toggle ON **USB Debugging**.
4. **Important for Mice/Keyboards**: If you see options like **Install via USB** or **USB Debugging (Security Settings)**, enable them too.

---

## 🌐 Connecting Your Device

### USB Connection (Recommended)
1. Plug your phone into your PC via USB.
2. A prompt will appear on your phone: "Allow USB Debugging?".
3. Check **Always allow from this computer** and tap **Allow**.
4. In ScrcpyGUI, click the **Refresh** button in the header if the device doesn't appear automatically.

### Wireless Connection (Android 11+)
1. Ensure both your Phone and PC are on the **same Wi-Fi network**.
2. In **Developer Options**, toggle ON **Wireless Debugging**.
3. Tap on the **Wireless Debugging** text to enter its settings.
4. In ScrcpyGUI, click the **🌐 Wireless Connect** button in the sidebar.
5. Tap **Pair device with pairing code** on your phone.
6. Enter the **IP Address**, **Port**, and **Pairing Code** shown on your phone into ScrcpyGUI.
7. Once paired, ScrcpyGUI will remember your device for future one-click connections!

---

## 🎮 Feature Guide

### ⌨️ HID Keyboard & Mouse (OTG Mode)
ScrcpyGUI v4 features advanced hardware simulation (HID) for a lag-free experience.
- **HID Keyboard**: Simulates a real USB keyboard. This is the **only way** to fix issues with Polish accents, special characters, and international layouts.
- **HID Mouse**: Provides a high-precision, native cursor feel. Eliminates the "double cursor" or lag found in standard mirroring.
- **Pure HID (No Mirror)**: Perfect for when you only want to use your PC as a "controller" for your phone (e.g., typing long messages or playing games while looking at the phone screen).

### 📹 Pro Camera Mode (Webcam)
Turn your phone into a professional, hardware-controlled webcam.
1. Change **Capture Source** to **Camera**.
2. **Scan Lenses**: Click the **Refresh Lenses** button. ScrcpyGUI will instantly scan your phone and populate a spacious dropdown with all physical camera lenses, native resolutions, and zoom capabilities.
3. **Select Camera**: Select your desired lens (e.g., Ultra-Wide, Front, or Main Back) from the list.
4. **Advanced Controls**:
   - **Camera Torch**: Toggle your device's physical flashlight on or off directly from the GUI.
   - **Camera Zoom**: Adjust the dynamic zoom level slider (1.0x to 5.0x) to frame your feed perfectly.
   - **Failsafe Resolution**: Standard high-megapixel phone lenses can crash scrcpy if launched at their native 4:3 photo resolution (e.g., `4080x3060`) due to hardware video encoder limits. ScrcpyGUI automatically maps your selected resolution and defaults to a safe 1080p standard size (`1920x1080`), ensuring a crash-free experience.
   - **FPS**: Set to **Auto** (recommended) to let your device run at its native capture frame rate, or select **30 FPS**.
5. **OBS Integration**: Open **OBS Studio**, add a "Window Capture" source, and select the ScrcpyGUI window. Use OBS's **Virtual Camera** to use your phone in Zoom, Teams, or Discord.

### 🖥️ Desktop Mode (Virtual Display)
Turn your Android device into a secondary workspace or virtual monitor.
1. Change **Capture Source** to **Desktop**.
2. **Flex Display**: Toggle ON **Flex Display**. Dragging and resizing the scrcpy client window borders on your computer will dynamically scale the resolution and aspect ratio of your phone's virtual display on the fly to fit your window perfectly with no black bars.
3. **Background Color**: Customize the window borders or letterbox border colors by typing in a hex value (e.g., `#2b2d42`) with a live preview swatch.
4. **Keep Active**: Enable **Keep Active** to simulate activity and prevent the virtual display from turning off or sleeping during mirroring sessions.

### 🖥 Graphics Renderer (Render API)
You can choose which graphics renderer scrcpy should request for video display.

- **Auto**: Recommended default. Lets scrcpy choose the best renderer.
- **Manual Selection**: Options like Direct3D, OpenGL, OpenGL ES, Metal, or Software may appear.

Renderer choices are **capability-aware**:

- ScrcpyGUI reads what your installed scrcpy build advertises.
- ScrcpyGUI filters options by your host OS.
- Unsupported options are hidden automatically (e.g. Metal is only shown on macOS).

### 🧩 Multi-Device Grid
Mirror every connected device at once in a tiled layout - the GUI equivalent of a "launch all devices" script.
1. Connect as many devices as you want (USB or wireless) and let the device hub list them.
2. In the **Multi-Device Grid** panel, click **Launch All (n)** to open one scrcpy window per device.
3. Adjust the grid:
   - **Width / Height**: initial size of each scrcpy window in pixels (default `400x800`).
   - **Columns**: how many windows per row before wrapping (default `3`).
   - **Gap**: space between windows (default `20`).
   - **Start X / Start Y**: screen coordinates of the first window (default `50,100`).
4. Optional: enable **Auto-Launch on Startup** to rebuild the grid automatically the next time ScrcpyGUI starts. It runs once per session, after the first device scan.

Grid launches always mirror the device and ignore remembered window positions so the layout stays aligned. When a device already has a window open, **Launch All** only opens the remaining ones.

### 📂 File Transfers & APKs
- **Install Apps**: Just drag an `.apk` file from your PC and drop it anywhere into the ScrcpyGUI window.
- **Transfer Files**: Drag any file into the window to automatically push it to your device's `/sdcard/Download/` folder.

---

## 🔧 Troubleshooting

- **Device not found?**: Try a different USB port or cable. Ensure "USB Debugging" is still active.
- **Laggy video?**: Lower the **Bitrate** (8M-12M is usually perfect) or the **Resolution**.
- **ADB Error?**: If commands are failing, click the **Kill ADB** button in the sidebar. This resets the connection bridge without closing the app.
- **Binary Error?**: If the app says it cannot find scrcpy, use the **Downloader** in the top right corner.

---

*Found a bug or have a suggestion? Open an issue on [GitHub](https://github.com/kil0bit-kb/scrcpy-gui/issues)!*
