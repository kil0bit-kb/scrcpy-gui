# Scrcpy GUI

A **modern, high‑performance desktop interface** for the **scrcpy** engine. Scrcpy GUI lets you mirror and control Android devices with **minimal latency**, **powerful customization**, and a **clean professional UI**—built for speed, reliability, and daily use.

---

## ✨ Highlights

* ⚡ **Ultra‑Low Latency Mirroring** powered by scrcpy
* 🎮 **Full Device Control** using mouse and keyboard
* 📡 **Wireless (TCP/IP) & USB Connectivity**
* 🎥 **Advanced Video Controls** (Resolution, FPS, Bitrate)
* 📦 **Instant APK Installer** via drag & drop
* 🎛️ **One‑Click Mirroring Presets**
* 🧩 **Portable & Local Scrcpy Support**

---

## 🚀 Features

### 🪞 Mirror & Control

Experience smooth, real‑time Android screen mirroring with complete input control.

### 📶 Wireless Connectivity

Connect your Android device wirelessly using TCP/IP with just a few clicks.

### 🎞️ Video Engine Customization

Fine‑tune your streaming experience:

* Resolution up to **1080p**
* Frame rate up to **120 FPS**
* Bitrate up to **24 Mbps**

### 📥 Quick APK Installer

Simply **drag and drop any `.apk` file** into the sidebar to install it instantly on the connected device.

### 🎚️ Mirroring Presets

Toggle powerful options on the fly:

* Stay Awake
* Screen Off while Mirroring
* System Audio
* Desktop Mode

### ⌨️ Shortcut Reference Panel

Built‑in sidebar displaying **Alt‑key shortcuts** for faster navigation and control.

### 🧳 Portable & Local Support

Use your **local scrcpy binaries** without adding them to the system PATH—perfect for portable setups.

---

## 🛠️ Getting Started

### ✅ Prerequisites

* **Official scrcpy binaries** (Recommended: v2.0+)
  👉 [https://github.com/Genymobile/scrcpy/releases](https://github.com/Genymobile/scrcpy/releases)
* **USB Debugging** enabled on your Android device

---

### 📥 Installation

Clone the repository:

```bash
git clone https://github.com/kil0bit-kb/scrcpy-gui.git
cd scrcpy-gui
```

Install dependencies:

```bash
npm install
```

Run the application:

```bash
npm start
```

---

## 📦 Building the Executable

Create a **portable Windows executable** with custom branding:

1. Place your app icon at:

   ```
   build/icon.ico
   ```

2. Run the build command:

   ```bash
   npm run build
   ```

3. Find the output in the:

   ```
   dist/
   ```

   folder.

---

## ⬇️ Prebuilt Releases

If you **don’t want to build the app yourself**, you can download **ready-to-use builds** directly from the **Releases** page.

👉 [https://github.com/kil0bit-kb/scrcpy-gui/releases](https://github.com/kil0bit-kb/scrcpy-gui/releases)

These builds include all required files and are ideal for users who just want to **download and run** the application without installing Node.js or dependencies.

---

## 🧩 Built With

* **scrcpy** – Core mirroring engine
* **Node.js & npm** – Dependency management
* **Electron** – Cross‑platform desktop framework

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome!

* Fork the repository
* Create a feature branch
* Submit a pull request

---

## ⭐ Support the Project

If you find Scrcpy GUI useful, please consider giving it a **star ⭐ on GitHub**. Your support helps the project grow!

---

**Developed by KB** 🚀
