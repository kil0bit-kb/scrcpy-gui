<p align="center">
  <img src="icon.png" width="128" height="128" alt="ScrcpyGUI Icon">
  <br>
  <h1>ScrcpyGUI v4</h1>
  <strong>A premium, high-performance Android control experience.</strong>
</p>

<p align="center">
  <img width="850" alt="ScrcpyGUI Interface" src="https://github.com/user-attachments/assets/a416fcd3-295a-4a01-8769-6f9da429b028" />
</p>


---

ScrcpyGUI v4 is a modern, feature-rich GUI for [scrcpy](https://github.com/Genymobile/scrcpy), completely rebuilt from the ground up using **Tauri v2**, **React 19**, and **Rust**. It transforms your Android device into a professional tool for gaming, development, and content creation.

## 🚀 Key Features

- **✨ Best Looking GUI**: A stunning, modern interface with smooth animations and a premium look and feel.
- **🎨 Custom Theme Engine**: 5 premium, hand-crafted themes including **Ultraviolet**, **Astro**, **Carbon**, **Emerald**, and **Bloodmoon** to match your workspace setup.
- **🔄 Automated Binary Updates**: Deep-integrated system that automatically checks if your local `scrcpy` binary is outdated compared to Genymobile's latest official release, prompting you with a beautiful one-click update modal.
- **🎮 Precision Input (OTG)**:
  - **HID Keyboard**: Native hardware simulation for international layouts and special characters.
  - **HID Mouse**: Zero-lag, high-precision cursor control for a "native desktop" feel.
- **🖥️ Graphics Renderer Selection**:
  - Choose a renderer backend such as Direct3D, OpenGL, OpenGL ES, Metal, or Software (capability-aware, OS-filtered).
- **🌐 Seamless Connectivity**:
  - **Wireless Pairing**: Native UI for Android 11+ wireless pairings.
  - **Connection History**: Remember and reconnect to wireless devices with one click.
- **📹 Pro Camera Mode (Webcam)**:
  - **Refresh Lenses**: Click to automatically scan and list all physical camera sensors, resolutions, and zoom ranges.
  - **Torch & Zoom**: Toggle your device's flashlight or adjust zoom level (1.0x - 5.0x) natively.
  - **Failsafe Camera-Size**: Automatically maps resolutions and defaults to safe 1080p dimensions, preventing hardware encoder crashes on high-megapixel devices.
- **🖥️ Desktop Mode (Virtual Display)**:
  - **Flex Display**: Drag and resize your virtual desktop window dynamically on the fly!
  - **Background Colors**: Customize scrcpy's border and letterbox color with hex values and a live color swatch.
  - **Keep Active**: Periodic user activity simulator preventing device sleep without changing global settings.
- **🧩 Multi-Device Grid**:
  - **Launch All**: Mirror every connected device at once in a tiled grid with configurable window size, columns, gap, and start position.
  - **Auto-Launch on Startup**: Rebuild the grid automatically the next time the app starts.
- **📁 Fluid File Management**:
  - Drag & drop APK installation or file pushing directly to `/sdcard/Download/`.
- **🖼️ Premium UX**:
  - **Splash Screen**: Zero-flicker, themed startup experience.
  - **Smart Folder Picker**: Automatically falls back to local `scrcpy-bin` or application executable directories when browsing folders.

---

## 📖 Getting Started

To learn how to enable **USB Debugging**, set up **Wireless Pairing**, or install requirements, please read our comprehensive guide:

### 👉 **[View the Complete User Guide (GUIDE.md)](GUIDE.md)**

---

## 🛠️ Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rust-lang.org/) & Cargo
- [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Build Instructions
1. `npm install`
2. `npm run tauri dev` (Development)
3. `npm run tauri build` (Production)

## ❄️ NixOS Installation (flakes)

To install it permanently with a desktop launcher, add the flake to your system's `flake.nix`:

```nix
inputs.scrcpy-gui.url = "github:kil0bit-kb/scrcpy-gui";
```

Then add it to your system packages:

```nix
environment.systemPackages = [
  inputs.scrcpy-gui.packages.${pkgs.system}.default
];
```
---

## 💖 Support the Project

If ScrcpyGUI helps you in your daily workflow, consider supporting its development on Patreon. Your support keeps the project alive and independent!

<p align="left">
  <a href="https://www.patreon.com/cw/KB_kilObit">
    <img src="https://img.shields.io/badge/Patreon-Support_KB-F96854?style=for-the-badge&logo=patreon" alt="Support on Patreon">
  </a>
</p>

---

## � Acknowledgments

ScrcpyGUI is made possible by the following amazing open-source projects:

- **[scrcpy](https://github.com/Genymobile/scrcpy)**: The ultra-fast core engine.
- **[Tauri](https://tauri.app/)**: The secure, lightweight framework for the desktop app.
- **[Lucide Icons](https://lucide.dev/)**: For the clean and consistent iconography.
- **[React](https://react.dev/)**: Powering the modern, interactive interface.

---

## �📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

*ScrcpyGUI is an independent project and is not affiliated with Genymobile or scrcpy authors.*

