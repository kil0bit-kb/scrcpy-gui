# ScrcpyGUI - User Guide

---

## Prerequisites

Android 5.0 or higher for screen mirroring. Android 11+ for wireless debugging and desktop mode. Android 12+ for camera mode. A data USB cable, not a charge-only one. The scrcpy binary, which the app can download for you on first launch.

---

## Installation

### Windows

Download the latest `.exe` or `.msi` from the [Releases](https://github.com/kil0bit-kb/scrcpy-gui/releases) page and run it. On first launch the app checks if scrcpy is present and offers a one-click download if it is not. It also checks your installed scrcpy version against the latest Genymobile release and prompts you to update if you are behind.

### macOS

Download the `.dmg` matching your chip (Intel or Apple Silicon). Drag ScrcpyGUI into Applications. Because the app is not notarized you will likely need to go to System Settings, Privacy and Security, and click Open Anyway the first time.

### Linux

Download the `.AppImage` or `.deb`. For the AppImage right-click it, go to Properties, Permissions, and allow it to run as a program. If you hit missing library errors:

```bash
sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev
```

---

## Android setup

### Enable Developer Options

Go to Settings, then About Phone, find Build Number and tap it seven times. You will get a toast saying you are now a developer.

### Enable USB Debugging

Go to Settings, System, Developer Options. Toggle on USB Debugging. If you see Install via USB or USB Debugging (Security Settings), enable those too as they are needed for HID keyboard and mouse to work.

---

## Connecting a device

### USB

Plug the phone in. A prompt will appear on the phone asking to allow USB debugging from your computer. Tick Always allow and tap Allow. The device should show up in the sidebar automatically. If it does not, hit Refresh.

### Wireless (Android 11+)

Both the phone and PC need to be on the same Wi-Fi network. In Developer Options, enable Wireless Debugging, then tap into its settings. In ScrcpyGUI click the Wireless Connect button in the sidebar. On the phone tap Pair device with pairing code. Enter the IP, port, and pairing code shown on the phone into ScrcpyGUI. After pairing succeeds the device is saved so future connections are one click from the Recent Devices list.

---

## Features

### HID keyboard and mouse

HID mode simulates real USB hardware rather than sending touch events over ADB. The keyboard option fixes international layouts and special characters that do not work in standard mirroring. The mouse option gives you a native cursor without the double-cursor issue. Pure HID mode hides the video stream entirely if you just want to use your PC as a keyboard and mouse while watching the phone directly.

### Camera mode

Switch Capture Source to Camera. Click Refresh Lenses to scan the device and populate the dropdown with all available physical lenses, their resolutions, and frame rate ranges. Select the lens you want. You can toggle the flashlight on or off and set zoom anywhere from 1x to 5x. Resolution is automatically limited to a safe 1080p size to prevent high-megapixel sensors from crashing the hardware encoder. For OBS, add a Window Capture source pointing at the scrcpy window and start OBS Virtual Camera to use the phone in Zoom, Teams, or Discord.

### Desktop mode

Switch Capture Source to Desktop. Flex Display makes the phone's virtual display follow the scrcpy window size as you drag and resize it, no black bars. Background Color lets you set a hex value for the window letterbox area. Keep Active simulates periodic input so the virtual display does not go to sleep mid-session.

### Graphics renderer

The renderer dropdown shows only what your installed scrcpy build and OS actually support. Auto is the right choice for most people. If you are having display issues on a specific machine you can try forcing Direct3D, OpenGL, OpenGL ES, or Software. Metal only appears on macOS.

### File transfer

Drag an APK onto the ScrcpyGUI window to install it. Drag any other file to push it to the device at `/sdcard/Download/`. You can also use the file browser button in the sidebar.

---

## Troubleshooting

Device not showing up: try a different cable or USB port and confirm USB Debugging is still on.

Laggy or blurry video: lower the bitrate slider (8 to 12 Mbps covers most cases) or drop the resolution.

ADB stuck or commands failing: click Kill ADB in the sidebar. It restarts the ADB server without closing the app.

scrcpy binary not found: use the download button in the top right corner of the header to fetch the latest release automatically.

---

Found a bug or have a suggestion? Open an issue on [GitHub](https://github.com/kil0bit-kb/scrcpy-gui/issues).
