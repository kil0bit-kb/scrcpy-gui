<div align="center">

# Scrcpy GUI

### Desktop Interface for Android Device Mirroring

A high-performance graphical user interface built on the scrcpy engine, delivering professional-grade Android device mirroring and control with minimal latency and extensive customization options.

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-blue.svg)](https://github.com/kil0bit-kb/scrcpy-gui)
[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848f.svg)](https://www.electronjs.org/)
[![Powered by scrcpy](https://img.shields.io/badge/Powered%20by-scrcpy-green.svg)](https://github.com/Genymobile/scrcpy)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/kil0bit-kb/scrcpy-gui)](https://github.com/kil0bit-kb/scrcpy-gui/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<img width="1919" alt="Scrcpy GUI Application Screenshot" src="https://github.com/user-attachments/assets/4296fa5d-387c-4d3c-a6af-63a9c5a01167" />

[Download Latest Release](https://github.com/kil0bit-kb/scrcpy-gui/releases) • [Report Bug](https://github.com/kil0bit-kb/scrcpy-gui/issues) • [Request Feature](https://github.com/kil0bit-kb/scrcpy-gui/issues)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Building from Source](#building-from-source)
- [Usage](#usage)
- [Technology Stack](#technology-stack)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Scrcpy GUI provides a streamlined desktop experience for mirroring and controlling Android devices. Built on top of the proven scrcpy engine, it offers an intuitive interface for developers, testers, and professionals who require reliable device interaction with advanced configuration capabilities.

**Core Capabilities:**
- Ultra-low latency screen mirroring
- Comprehensive device control via mouse and keyboard
- Dual connectivity support (USB and wireless TCP/IP)
- Advanced streaming parameter configuration
- Integrated APK deployment tools

---

## Key Features

### Device Mirroring & Control
Real-time Android screen mirroring with full input control, enabling seamless interaction with your device directly from your desktop environment.

### Video Configuration
Precision control over streaming parameters:
- **Resolution**: Up to 1080p
- **Frame Rate**: Up to 120 FPS
- **Bitrate**: Up to 24 Mbps

### APK Installation
Streamlined application deployment through drag-and-drop interface. Simply drop any `.apk` file into the application sidebar for instant installation on the connected device.

### Mirroring Presets
Quick-access toggles for common mirroring scenarios:
- **Stay Awake** – Prevent device sleep during sessions
- **Screen Off** – Mirror with device display disabled
- **System Audio** – Capture and stream device audio
- **Desktop Mode** – Enable Android desktop interface

### Keyboard Shortcuts
Integrated reference panel displaying Alt-key combinations for efficient device navigation and control without reaching for the physical device.

### Portable Configuration
Support for local scrcpy binaries without system PATH modification, ideal for portable installations and enterprise deployments.

---

## Prerequisites

Before installation, ensure you have the following:

1. **Scrcpy Binary** (v2.0 or later recommended)
   Download from: [Genymobile/scrcpy Releases](https://github.com/Genymobile/scrcpy/releases)

2. **Android Device Configuration**
   - USB Debugging enabled in Developer Options
   - For wireless connection: ADB over TCP/IP configured

3. **Development Environment** (for building from source)
   - Node.js (LTS version recommended)
   - npm or yarn package manager

---

## Installation

### Quick Start

Download the latest prebuilt release for your platform:

**[Latest Release →](https://github.com/kil0bit-kb/scrcpy-gui/releases)**

Prebuilt packages include all necessary dependencies and can be run immediately without additional configuration.

### Building from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/kil0bit-kb/scrcpy-gui.git
   cd scrcpy-gui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**
   ```bash
   npm start
   ```

4. **Build executable** (optional)

   For custom branding, place your icon at `build/icon.ico`, then run:
   ```bash
   npm run build
   ```

   The compiled executable will be available in the `dist/` directory.

---

## Usage

1. Launch Scrcpy GUI
2. Connect your Android device via USB or configure wireless connection
3. Select your scrcpy binary location (first launch only)
4. Configure mirroring parameters as needed
5. Click "Start Mirroring" to begin session

For wireless connections, ensure your device and computer are on the same network and ADB wireless debugging is properly configured.

---

## Technology Stack

| Component | Purpose |
|-----------|---------|
| **scrcpy** | Core mirroring engine providing low-latency streaming |
| **Electron** | Cross-platform desktop application framework |
| **Node.js** | Runtime environment and dependency management |

---

## Contributing

Contributions are welcome and appreciated. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/enhancement`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/enhancement`)
5. Open a Pull Request

Please ensure your code follows the existing style conventions and includes appropriate documentation.

---

## License

This project is distributed under the MIT License. See `LICENSE` file for details.

---

<div align="center">

**Developed and maintained by KB**

[![GitHub stars](https://img.shields.io/github/stars/kil0bit-kb/scrcpy-gui?style=social)](https://github.com/kil0bit-kb/scrcpy-gui/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/kil0bit-kb/scrcpy-gui?style=social)](https://github.com/kil0bit-kb/scrcpy-gui/network/members)

If you find this project useful, please consider starring the repository to show your support.

</div>
