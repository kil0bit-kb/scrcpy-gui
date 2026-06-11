<p align="center">
  <img src="icon.png" width="128" height="128" alt="ScrcpyGUI Icon">
</p>

<h1 align="center">ScrcpyGUI</h1>
<p align="center">A desktop GUI for <a href="https://github.com/Genymobile/scrcpy">scrcpy</a> built with Tauri v2, React 19, and Rust.</p>

<p align="center">
  <img width="850" alt="ScrcpyGUI Interface" src="https://github.com/user-attachments/assets/a416fcd3-295a-4a01-8769-6f9da429b028" />
</p>

---

ScrcpyGUI wraps scrcpy in a proper interface so you are not stuck writing flags by hand every time. It handles the binary, remembers your settings, and surfaces all the options you actually care about without burying you in a wall of text.

## What it does

**Themes** - Ships with five built-in themes: Ultraviolet, Astro, Carbon, Emerald, and Bloodmoon. Light, dark, and system color modes are all supported.

**Auto update checks** - On launch it compares your local scrcpy binary against the latest Genymobile release. If you are behind it shows a one-click download prompt.

**Three capture modes** - Screen mirror, camera (webcam), and desktop (virtual display). Each has its own set of controls in the panel.

**HID input** - Proper hardware simulation for keyboard and mouse. Fixes international layout issues and removes the double-cursor problem you get with standard mirroring. There is also a pure HID mode if you want input only with no video stream.

**Camera controls** - Scan all physical lenses on the device, toggle the torch, and adjust zoom from 1x to 5x. Resolution is automatically capped to a safe size so high-megapixel sensors do not crash the encoder.

**Desktop mode** - Runs a virtual display on the phone. Flex Display lets you drag and resize the window and the phone resolution follows along. You can set a custom hex background color and enable Keep Active to stop the display from sleeping.

**Graphics renderer** - Pick Direct3D, OpenGL, OpenGL ES, Metal, or Software. The list is filtered to what your scrcpy build and OS actually support so you will not see options that do not work.

**Wireless pairing** - Built-in UI for Android 11 wireless debugging. Previously connected devices are saved so reconnecting is one click.

**File transfer** - Drag an APK onto the window to install it. Drag anything else to push it to the device Downloads folder.

## Getting started

Read [GUIDE.md](GUIDE.md) for setup steps including enabling USB debugging, wireless pairing, and first-launch walkthrough.

## Development

Requirements: Node.js 18+, Rust and Cargo, [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri dev
npm run tauri build
```

## NixOS

```nix
inputs.scrcpy-gui.url = "github:kil0bit-kb/scrcpy-gui";
```

```nix
environment.systemPackages = [
  inputs.scrcpy-gui.packages.${pkgs.system}.default
];
```

## Support

<a href="https://www.patreon.com/cw/KB_kilObit">
  <img src="https://img.shields.io/badge/Patreon-Support_KB-F96854?style=for-the-badge&logo=patreon" alt="Support on Patreon">
</a>

## Built on top of

[scrcpy](https://github.com/Genymobile/scrcpy), [Tauri](https://tauri.app/), [React](https://react.dev/), [Lucide Icons](https://lucide.dev/)

## License

MIT. See [LICENSE](LICENSE).

ScrcpyGUI is not affiliated with Genymobile or the scrcpy authors.
