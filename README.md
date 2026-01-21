Scrcpy GUI by KB

A modern, high-performance desktop interface for the scrcpy engine. This GUI allows you to mirror and control Android devices easily, offering a streamlined experience for developers and power users.

🚀 Features

Mirror & Control: Low-latency screen mirroring and full device control.

Wireless Connectivity: Easily connect to devices via TCP/IP.

Video Engine Customization: Adjust resolution (up to 1080p), FPS (up to 120), and bitrate (up to 24 Mbps) on the fly.

Quick APK Installer: Drag and drop any .apk file into the sidebar to install it instantly on the active device.

Mirroring Presets: Toggle settings like Stay Awake, Screen Off, System Audio, and Desktop Mode.

Shortcut Reference: Built-in side panel for quick access to Alt key commands.

Portable & Local Support: Point the app to your local Scrcpy folder to use bundled binaries without installing them to your system path.

🛠️ Getting Started

Prerequisites

Official Scrcpy Binaries (Recommended v2.0+)

ADB Drivers installed on your Windows machine.

USB Debugging enabled on your Android device.

Installation

Clone the repository:

git clone [https://github.com/kil0bit-kb/scrcpy-gui.git](https://github.com/kil0bit-kb/scrcpy-gui.git)
cd scrcpy-gui


Install dependencies:

npm install


Run the app:

npm start


📦 Building the Executable

To create a portable .exe with your custom branding and icon:

Ensure your icon is placed at build/icon.ico.

Run the build script:

npm run build


The output will be available in the dist/ folder.

🔗 Official Links

GitHub: kil0bit-kb

YouTube: @kilObit

Website: kil0bit.blogspot.com

Scrcpy: Official Repository

Developed with ❤️ by KB
