import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useI18n } from '../i18n';

export interface RenderDriverOption {
    id: string;
    label: string;
}

export interface RenderDriverSupport {
    hostOs: string;
    supportsRenderDriver: boolean;
    supportedDrivers: RenderDriverOption[];
}

export interface MdnsDevice {
    name: string;
    service: string;
    address: string;
}

/** Whether an mDNS-discovered device is already present in `devices`.
 *  A device connected via a plain `adb connect ip:port` is tracked under that
 *  same "ip:port" serial, but one already connected through wireless
 *  debugging's mDNS pairing (e.g. paired via Android Studio, not through this
 *  app) is tracked under its "adb-<name>._adb-tls-connect._tcp" serial
 *  instead -- which never matches `dev.address`. Checking both forms is what
 *  keeps an already-connected device from being listed a second time under
 *  "Discovered Devices", or auto-(re)connected by IP. */
export function isMdnsDeviceConnected(dev: MdnsDevice, devices: string[]): boolean {
    return devices.includes(dev.address) || devices.some(d => d.includes(dev.name));
}

export interface ScrcpyConfig {
    device: string;
    sessionMode: string;
    bitrate?: number;
    fps?: number;
    stayAwake?: boolean;
    turnOff?: boolean;
    audioEnabled?: boolean;
    audioCodec?: string;
    alwaysOnTop?: boolean;
    fullscreen?: boolean;
    borderless?: boolean;
    record?: boolean;
    recordPath?: string;
    scrcpyPath?: string;
    otgPure?: boolean;
    cameraFacing?: string;
    cameraId?: string;
    codec?: string;
    cameraAr?: string;
    cameraHighSpeed?: boolean;
    vdWidth?: number;
    vdHeight?: number;
    vdDpi?: number;
    rotation?: string;
    res?: string;
    aspectRatioLock?: boolean;
    hidKeyboard?: boolean;
    hidMouse?: boolean;
    renderDriver?: string;
    // v4 features
    flexDisplay?: boolean;
    cameraTorch?: boolean;
    cameraZoom?: number;
    backgroundColor?: string;
    keepActive?: boolean;
    shortcutMod?: string;
    vsync?: boolean;
    /** Whether to remember each device's mirror window position and restore
     *  it on the next launch. Defaults to true; some users find a window
     *  that always reopens at scrcpy's default spot less surprising. */
    rememberWindowPosition?: boolean;
    /** Screen position (pixels) to restore via --window-x / --window-y for
     *  this launch. Resolved per-device from windowPositions right before
     *  invoking run_scrcpy; never set directly by the UI. */
    windowX?: number;
    windowY?: number;
}

/** Last known screen position of the scrcpy window, per device serial. Keyed
 *  by device because different devices (e.g. a phone vs. a tablet) produce
 *  very differently sized windows: a single shared position would reopen an
 *  unrelated device's window mostly off-screen. */
type WindowPositions = Record<string, { x: number; y: number }>;

export function useScrcpy() {
    const { t } = useI18n();
    const [devices, setDevices] = useState<string[]>([]);
    // Best-effort, display-only device model per serial (from `adb devices
    // -l`'s own `model:` field). Never used for identity/comparisons -- `d`
    // (the serial) remains the source of truth everywhere else.
    const [deviceModels, setDeviceModels] = useState<Record<string, string>>({});
    // Nicer than deviceModels when available (e.g. "Galaxy S23" instead of
    // "SM S911B"), fetched lazily per device via one extra `adb shell
    // getprop` round-trip -- see the effect below for the once-per-serial
    // cache that keeps this off the 5s background device poll.
    const [deviceFriendlyNames, setDeviceFriendlyNames] = useState<Record<string, string>>({});
    const [logs, setLogs] = useState<string[]>([]);
    const [activeDevice, setActiveDevice] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [scrcpyStatus, setScrcpyStatus] = useState<{ found: boolean, message: string }>({ found: false, message: t('common.loading') });
    const [isInitialized, setIsInitialized] = useState(false);
    const [runningDevices, setRunningDevices] = useState<string[]>([]);
    const [defaultRecordPath, setDefaultRecordPath] = useState<string>("");
    const [detectedCameras, setDetectedCameras] = useState<{ id: string, name: string }[]>([]);
    const [renderDriverSupport, setRenderDriverSupport] = useState<RenderDriverSupport>({
        hostOs: 'unknown',
        supportsRenderDriver: false,
        supportedDrivers: []
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [mdnsDevices, setMdnsDevices] = useState<MdnsDevice[]>([]);
    const [theme, setTheme] = useState("ultraviolet");
    const [colorMode, setColorModeState] = useState<'light' | 'dark' | 'system'>(() => {
        try {
            return (localStorage.getItem('scrcpy_color_mode') as 'light' | 'dark' | 'system') || 'system';
        } catch {
            return 'system';
        }
    });
    const [config, setConfig] = useState<ScrcpyConfig>({
        device: "",
        sessionMode: "mirror",
        bitrate: 8,
        fps: undefined,
        stayAwake: false,
        turnOff: false,
        audioEnabled: true,
        audioCodec: "auto",
        alwaysOnTop: false,
        res: "0",
        recordPath: "",
        vdWidth: 1920,
        vdHeight: 1080,
        vdDpi: 420,
        aspectRatioLock: true,
        hidKeyboard: false,
        hidMouse: false,
        // v4 features
        flexDisplay: false,
        cameraTorch: false,
        cameraZoom: 1.0,
        backgroundColor: '',
        keepActive: false,
        vsync: true,
        rememberWindowPosition: true
    });
    const [windowPositions, setWindowPositions] = useState<WindowPositions>({});
    const prevDevicesRef = useRef<string[]>([]);
    const mdnsDevicesRef = useRef<MdnsDevice[]>([]);
    const rememberWindowPositionRef = useRef(true);
    // Serials already queried for a friendly name this session (success or
    // failure) -- guards against re-querying the same device on every 5s
    // background poll. A failed attempt is not retried until the app restarts;
    // the display falls back to deviceModels/the serial in the meantime.
    const fetchedFriendlyNamesRef = useRef<Set<string>>(new Set());

    useEffect(() => {

        const savedTheme = localStorage.getItem('scrcpy_theme');
        if (savedTheme) {
            setTheme(savedTheme);
        }

        const savedWindowPositions = localStorage.getItem('scrcpy_window_positions');
        if (savedWindowPositions) {
            try {
                setWindowPositions(JSON.parse(savedWindowPositions));
            } catch (e) {
                console.error("Failed to parse saved window positions", e);
            }
        }

        const savedConfig = localStorage.getItem('scrcpy_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setConfig(prev => ({ ...prev, ...parsed }));
                // Initial check with saved path if it exists
                if (parsed.scrcpyPath) {
                    checkScrcpy(parsed.scrcpyPath);
                }
            } catch (e) {
                console.error("Failed to parse saved config", e);
            }
        }

        const initPaths = async () => {
            try {
                const defaultDir: string = await invoke('get_videos_dir');
                setDefaultRecordPath(defaultDir);

                // If no saved path in config, set it now
                setConfig(prev => {
                    if (!prev.recordPath) {
                        return { ...prev, recordPath: defaultDir };
                    }
                    return prev;
                });

                return defaultDir;
            } catch (e) {
                console.error("Failed to fetch videos dir", e);
                return "";
            }
        };

        const initStart = async () => {
            await initPaths();
            setIsInitialized(true);
        };

        initStart();
    }, []);

    // Persist changes
    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem('scrcpy_config', JSON.stringify(config));
    }, [config, isInitialized]);

    // Kept in a ref (not read from `config` directly) so the window-position
    // listener below, which only subscribes once on mount, always sees the
    // current value without needing to resubscribe on every config change.
    useEffect(() => {
        rememberWindowPositionRef.current = config.rememberWindowPosition !== false;
    }, [config.rememberWindowPosition]);

    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem('scrcpy_window_positions', JSON.stringify(windowPositions));
    }, [windowPositions, isInitialized]);

    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem('scrcpy_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme, isInitialized]);

    useEffect(() => {
        const applyMode = (dark: boolean) => {
            document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
        };
        if (colorMode === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            applyMode(mq.matches);
            const handler = (e: MediaQueryListEvent) => applyMode(e.matches);
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        } else {
            applyMode(colorMode === 'dark');
        }
    }, [colorMode]);

    const setColorMode = (mode: 'light' | 'dark' | 'system') => {
        setColorModeState(mode);
        localStorage.setItem('scrcpy_color_mode', mode);
    };

    // Clear detected cameras when device changes
    useEffect(() => {
        setDetectedCameras([]);
    }, [activeDevice]);



    useEffect(() => {
        const unlistenLog = listen<string>('scrcpy-log', (event) => {
            const newLines = event.payload.split('\n');
            setLogs(prev => [...prev.slice(-(100 - newLines.length)), ...newLines]);
        });

        const unlistenStatus = listen<any>('scrcpy-status', (event) => {
            const data = event.payload;
            if (data.device && typeof data.running === 'boolean') {
                setRunningDevices(prev => {
                    if (data.running) {
                        return [...new Set([...prev, data.device])];
                    } else {
                        return prev.filter(d => d !== data.device);
                    }
                });
            } else if (data.type === 'downloading') {
                setIsDownloading(true);
                setStatus(data.message);
            } else if (data.type === 'download-progress') {
                setDownloadProgress(data.percent);
            } else if (data.type === 'download-complete') {
                setIsDownloading(false);
                setStatus(t('logs.downloadComplete'));
                // adb didn't exist at all until this just finished, so the
                // settle-poll from mount had nothing to find yet and gave up
                // early -- this is the first real chance to detect anything,
                // and a single refresh can still miss a device that's mid
                // reconnect, same as at mount or right after pairing.
                refreshDevicesUntilSettled(data.message);
                checkScrcpy(); // Re-check binary status
            }
        });

        // Persist the scrcpy window position emitted when a session ends, so the
        // next launch restores it (via --window-x / --window-y). This is what
        // lets a borderless window, which cannot be dragged, reopen where the
        // user placed it with borders. Keyed by device (not stored on the
        // shared config): different devices produce very differently sized
        // windows (e.g. a phone vs. a tablet), so a single shared position
        // would reopen an unrelated device's window mostly off-screen.
        const unlistenWindowPos = listen<{ device: string; x: number; y: number }>(
            'scrcpy-window-pos',
            (event) => {
                if (!rememberWindowPositionRef.current) return;
                const { device, x, y } = event.payload;
                setWindowPositions(prev => ({ ...prev, [device]: { x, y } }));
            }
        );

        return () => {
            unlistenLog.then(f => f());
            unlistenStatus.then(f => f());
            unlistenWindowPos.then(f => f());
        };
    }, [t]);

    const [historyDevices, setHistoryDevices] = useState<string[]>([]);

    // Load history on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('scrcpy_history');
        if (savedHistory) {
            try {
                setHistoryDevices(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);

    const addToHistory = (ip: string) => {
        if (!ip.includes(':')) return; // Only add valid IP:Port combos
        setHistoryDevices(prev => {
            const next = [ip, ...prev.filter(d => d !== ip)].slice(0, 10); // Keep last 10 unique
            localStorage.setItem('scrcpy_history', JSON.stringify(next));
            return next;
        });
    };

    const clearHistory = () => {
        setHistoryDevices([]);
        localStorage.removeItem('scrcpy_history');
    };

    // Does the actual device + mDNS fetch. Split out from `refreshDevices` so
    // `refreshDevicesUntilSettled` can drive several of these back to back
    // under one continuous "syncing" state, instead of the isRefreshing flag
    // (and the "Syncing..." label bound to it) flickering off and back on
    // between each poll.
    const fetchDevicesOnce = async (customPath?: string, silent: boolean = false) => {
        try {
            const res: any = await invoke('get_devices', { customPath: customPath || config.scrcpyPath });
            let newDevices: string[] = [];

            if (!res.error) {
                newDevices = res.devices as string[];
                if (res.deviceModels) {
                    setDeviceModels(res.deviceModels as Record<string, string>);
                }
                const prevDevices = prevDevicesRef.current;

                // Identify connections/disconnections
                const added = newDevices.filter(d => !prevDevices.includes(d));
                const removed = prevDevices.filter(d => !newDevices.includes(d));

                added.forEach(device => {
                    setLogs(prev => [...prev.slice(-100), t('logs.newDeviceDiscovered', { device })]);
                });

                removed.forEach(device => {
                    setLogs(prev => [...prev.slice(-100), t('logs.deviceDisconnected', { device })]);
                });

                setDevices(newDevices);
                prevDevicesRef.current = newDevices;

                if (!silent && added.length === 0 && removed.length === 0) {
                    setLogs(prev => [...prev.slice(-100), t('logs.discoveryActive', { count: newDevices.length })]);
                }

                if (newDevices.length > 0 && !activeDevice) {
                    setActiveDevice(newDevices[0]);
                }
            } else if (!silent) {
                setLogs(prev => [...prev.slice(-100), t('logs.discoveryError', { error: res.message })]);
            }

            // Fetch wireless devices broadcasting on the network via mDNS
            try {
                const mdnsRes: any = await invoke('get_mdns_devices', { customPath: customPath || config.scrcpyPath });
                if (mdnsRes && !mdnsRes.error && mdnsRes.services) {
                    // Keep both service kinds: "_adb-tls-connect" (ready to
                    // connect) and "_adb-tls-pairing" (a device sitting on the
                    // "Pair device with pairing code" screen). The UI routes a
                    // click on either into the pairing modal, code-ready or not.
                    const parsedMdns = (mdnsRes.services as any[]).filter(s => s.service && (s.service.includes('_adb-tls-connect') || s.service.includes('_adb-tls-pairing')));
                    setMdnsDevices(parsedMdns);
                    mdnsDevicesRef.current = parsedMdns;

                    // No client-side auto-connect: adb already reconnects paired
                    // devices it rediscovers over mDNS from its own keystore
                    // (transport_mdns: "Don't try to auto-connect if not in the
                    // keystore"). Once adb reconnects one, get_devices surfaces it
                    // in the hub. Racing it with our own `adb connect` only opened
                    // a duplicate ip:port session for the same device; discovery
                    // here is display-only, plus the pairing modal.
                } else if (mdnsRes && mdnsRes.error) {
                    console.warn("[ADB MDNS] Failed to get mdns devices:", mdnsRes.message);
                    setMdnsDevices([]);
                    mdnsDevicesRef.current = [];
                }
            } catch (mdnsErr) {
                console.error("Failed to query mDNS devices:", mdnsErr);
            }
        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev.slice(-100), t('logs.errorRefreshingDevices', { error: String(e) })]);
        }
    };

    const refreshDevices = async (customPath?: string, silent: boolean = false) => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await fetchDevicesOnce(customPath, silent);
        } finally {
            setIsRefreshing(false);
        }
    };

    // adb reconnects a known device from its own keystore once it resolves it
    // again over mDNS, but that isn't instant -- right after this app starts
    // (especially right after an `adb kill-server`, where adb's own mDNS scan
    // hasn't found anything yet either) or right after pairing succeeds, a
    // single refresh can still miss it entirely: the very first pass can come
    // back with no mDNS record at all, not just an unconnected one, so
    // waiting only for a *known* unconnected device would already be too
    // late to start watching. Instead, keep refreshing until two consecutive
    // reads agree (devices and mDNS entries both unchanged) -- that catches
    // the mDNS scan lagging behind, the reconnect handshake lagging behind
    // that, or nothing happening at all (which just settles immediately).
    //
    // isRefreshing (and the "Syncing..." label bound to it) is held for the
    // whole poll, not just each individual pass -- otherwise it flips back to
    // "Refresh" between polls while still silently waiting, then a device can
    // pop into the hub several seconds after the button already looks idle.
    const refreshDevicesUntilSettled = async (customPath?: string, attempts: number = 8, delayMs: number = 2000) => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            let prevSnapshot = '';
            for (let i = 0; i <= attempts; i++) {
                await fetchDevicesOnce(customPath, true);
                const snapshot = JSON.stringify([prevDevicesRef.current, mdnsDevicesRef.current]);
                if (snapshot === prevSnapshot) return;
                prevSnapshot = snapshot;
                if (i < attempts) await new Promise(r => setTimeout(r, delayMs));
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    // Refs so the interval below always calls the latest closures without
    // being torn down and recreated every render (which would reset its
    // timing and, more subtly, could stack overlapping adb calls).
    const isRefreshingRef = useRef(isRefreshing);
    useEffect(() => { isRefreshingRef.current = isRefreshing; }, [isRefreshing]);
    const fetchDevicesOnceRef = useRef(fetchDevicesOnce);
    useEffect(() => { fetchDevicesOnceRef.current = fetchDevicesOnce; });

    // Keep the hub in sync on its own so a device pairing, reconnecting, or
    // dropping off doesn't require a manual refresh to notice. This calls
    // fetchDevicesOnce() directly rather than refreshDevices(), so it never
    // toggles isRefreshing (no "Syncing..." flicker or buttons disabling
    // every few seconds) and never fires while a manual refresh or the
    // settle-poll above is already in flight. It also pauses while the
    // window is hidden, since there's nothing to update on screen anyway.
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'hidden' || isRefreshingRef.current) return;
            fetchDevicesOnceRef.current(undefined, true);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Upgrade each device's label to its marketing name (e.g. "Galaxy S23"),
    // one extra `adb shell getprop` round-trip per *newly seen* serial only --
    // fetchedFriendlyNamesRef is what keeps this off the 5s poll above, since
    // `devices` is a new array reference on every poll tick even when its
    // contents haven't changed.
    useEffect(() => {
        devices.forEach(async (serial) => {
            if (fetchedFriendlyNamesRef.current.has(serial)) return;
            fetchedFriendlyNamesRef.current.add(serial);

            // Emulators (Android Studio AVDs, "emulator-5554") never have a
            // meaningful marketname or manufacturer, and ro.product.model is
            // a generic SDK build string (e.g. "sdk_gphone64_x86_64") --
            // uglier than the plain serial adb already assigns. Look up the
            // AVD's own configured name instead; if that's unavailable too,
            // explicitly keep the serial so it doesn't fall through to that
            // uglier model string via deviceModels.
            const isEmulator = /^emulator-\d+$/.test(serial);

            try {
                const command = isEmulator
                    ? 'getprop ro.boot.qemu.avd_name; getprop ro.kernel.qemu.avd_name'
                    : 'getprop ro.product.marketname; getprop ro.product.manufacturer; getprop ro.product.model';
                const res: any = await invoke('adb_shell', { device: serial, command, customPath: config.scrcpyPath });

                if (isEmulator) {
                    const avdName = res?.success
                        ? (res.output as string).split('\n').map(line => line.trim()).find(line => line.length > 0)
                        : undefined;
                    // Keep the serial visible alongside the AVD name: several
                    // emulator instances of the same AVD image running at
                    // once would otherwise show up as indistinguishable
                    // identical labels in the hub.
                    setDeviceFriendlyNames(prev => ({
                        ...prev,
                        [serial]: avdName ? `${avdName.replace(/_/g, ' ')} (${serial})` : serial
                    }));
                    return;
                }

                if (res?.success) {
                    const [marketname, manufacturer, model] = (res.output as string)
                        .split('\n')
                        .map(line => line.trim());
                    // Most devices never set marketname (it's not a universal
                    // property -- scrcpy's own device log falls back to the
                    // same manufacturer+model combo for exactly this reason,
                    // e.g. "[OPPO] OPPO CPH2697"). Avoid a doubled-up name
                    // when the model already starts with the manufacturer.
                    const name = marketname ||
                        (manufacturer && model && !model.toLowerCase().startsWith(manufacturer.toLowerCase())
                            ? `${manufacturer} ${model}`
                            : model);
                    if (name) {
                        setDeviceFriendlyNames(prev => ({ ...prev, [serial]: name }));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch friendly name for", serial, e);
            }
        });
    }, [devices, config.scrcpyPath]);

    // Legacy ADB-over-network devices (a plain ip:port from the manual "IP
    // Connect" field, e.g. an Android TV/set-top box on `adb tcpip`) have no
    // persistent trust the way wireless debugging's TLS pairing does -- adb
    // doesn't remember them at all once its server restarts or the
    // connection drops, so nothing reconnects them the way a paired phone
    // reconnects on its own over mDNS. Retry anything already in "Recent
    // Devices" but not currently in the hub, quietly, once on mount and then
    // every 25s. Unlike the removed client-side auto-connect, this only ever
    // targets addresses the user has already connected to themselves before,
    // never anything freshly discovered -- and it calls adb_connect directly
    // rather than through connectDevice(), so a device that's simply offline
    // doesn't spam the log with a failure every 25 seconds; a successful
    // reconnect still surfaces normally through the next device-list poll.
    useEffect(() => {
        const tryReconnectHistory = () => {
            if (document.visibilityState === 'hidden') return;
            historyDevices.forEach(ip => {
                if (!prevDevicesRef.current.includes(ip)) {
                    invoke('adb_connect', { ip, customPath: config.scrcpyPath, silent: true }).catch(() => { });
                }
            });
        };
        tryReconnectHistory();
        const interval = setInterval(tryReconnectHistory, 25000);
        return () => clearInterval(interval);
    }, [historyDevices, config.scrcpyPath]);

    const runScrcpy = async (config: ScrcpyConfig) => {
        try {
            setLogs(prev => [...prev.slice(-100), t('logs.initializingScrcpy', { device: config.device })]);
            // Resolve the saved position for this specific device only, so
            // launching one device never reuses another device's window spot.
            const savedPos = config.rememberWindowPosition !== false ? windowPositions[config.device] : undefined;
            const configWithPos: ScrcpyConfig = {
                ...config,
                windowX: savedPos?.x,
                windowY: savedPos?.y
            };
            await invoke('run_scrcpy', { config: configWithPos });
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), t('logs.failedToStartScrcpy', { error: String(e) })]);
        }
    };

    const stopScrcpy = async (device: string) => {
        try {
            await invoke('stop_scrcpy', { device });
        } catch (e) {
            console.error(e);
        }
    };

    /** Snaps the running mirror window for `device` back to the centre of the
     *  primary screen. Recovers a window whose saved position no longer lands
     *  on any connected monitor (e.g. it was saved on a second monitor that
     *  has since been unplugged), so it never gets stuck off-screen with no
     *  way to reach it. */
    const recenterMirrorWindow = async (device: string) => {
        try {
            await invoke('recenter_scrcpy_window', { device });
        } catch (e) {
            console.error(e);
        }
    };

    const downloadScrcpy = async () => {
        try {
            setIsDownloading(true);
            await invoke('download_scrcpy');
        } catch (e: any) {
            setIsDownloading(false);
            setLogs(prev => [...prev, t('logs.downloadError', { error: String(e) })]);
        }
    };

    const checkScrcpy = async (customPath?: string) => {
        try {
            // If customPath is explicitly provided (even as undefined/null for reset), use it.
            // Otherwise, use the saved path from config.
            const pathToCheck = customPath !== undefined ? customPath : config.scrcpyPath;
            const res: any = await invoke('check_scrcpy', { customPath: pathToCheck });
            setScrcpyStatus(res);

            if (res.found) {
                try {
                    const renderRes: any = await invoke('get_render_drivers', { customPath: pathToCheck });
                    setRenderDriverSupport({
                        hostOs: renderRes?.hostOs || 'unknown',
                        supportsRenderDriver: !!renderRes?.supportsRenderDriver,
                        supportedDrivers: Array.isArray(renderRes?.supportedDrivers) ? renderRes.supportedDrivers : []
                    });
                } catch {
                    setRenderDriverSupport({
                        hostOs: 'unknown',
                        supportsRenderDriver: false,
                        supportedDrivers: []
                    });
                }
            } else {
                setRenderDriverSupport({
                    hostOs: 'unknown',
                    supportsRenderDriver: false,
                    supportedDrivers: []
                });
            }

            // Auto-trigger onboarding if not found
            if (!res.found) {
                setIsOnboardingOpen(true);
            }

            return res.found;
        } catch (e: any) {
            setScrcpyStatus({ found: false, message: t('logs.genericError', { error: String(e) }) });
            return false;
        }
    };

    const pairDevice = async (ip: string, code: string, customPath?: string) => {
        try {
            const res: any = await invoke('adb_pair', { ip, code, customPath: customPath || config.scrcpyPath });
            if (res.success) {
                setLogs(prev => [...prev.slice(-100), t('logs.successfullyPaired', { ip })]);
                await refreshDevicesUntilSettled(customPath);
            } else {
                setLogs(prev => {
                    const msgs = [t('logs.pairingFailed', { message: String(res.message) })];
                    if (typeof res.message === 'string' && res.message.includes('protocol fault')) {
                        msgs.push(t('logs.pairingProtocolFault'));
                    }
                    return [...prev.slice(-100), ...msgs];
                });
            }
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), t('logs.pairingError', { error: String(e) })]);
            return { success: false, message: e };
        }
    };

    const connectDevice = async (ip: string, customPath?: string) => {
        setIsRefreshing(true);
        try {
            // Attempt 1: Connect
            let res: any = await invoke('adb_connect', { ip, customPath: customPath || config.scrcpyPath });

            // Retry Logic: If failed, try to disconnect first then reconnect
            if (!res.success && typeof res.message === 'string' && (res.message.includes('failed to connect') || res.message.includes('cannot connect'))) {
                setLogs(prev => [...prev.slice(-100), t('logs.connectionFailedRetrying')]);
                // Force disconnect to clear ghost state
                await invoke('run_terminal_command', { cmd: `adb disconnect ${ip}`, customPath: customPath || config.scrcpyPath });
                // Small delay
                await new Promise(r => setTimeout(r, 500));
                // Attempt 2
                res = await invoke('adb_connect', { ip, customPath: customPath || config.scrcpyPath });
            }

            if (res.success) {
                setLogs(prev => [...prev.slice(-100), t('logs.connectedSuccessfully', { ip })]);
                addToHistory(ip);

                // Allow ADB to settle and state to update
                await new Promise(r => setTimeout(r, 1000));

                setIsRefreshing(false); // Enable refreshDevices to run
                await refreshDevices(customPath || config.scrcpyPath, true);
            } else {
                setLogs(prev => {
                    const msgs = [t('logs.connectionFailed', { message: String(res.message) })];
                    // Smart tip for stale ports
                    if (typeof res.message === 'string' && (res.message.includes('failed to connect') || res.message.includes('cannot connect'))) {
                        msgs.push(t('logs.connectionStaleTip'));
                    }
                    return [...prev.slice(-100), ...msgs];
                });
            }
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), t('logs.connectionError', { error: String(e) })]);
            return { success: false, message: e };
        } finally {
            setIsRefreshing(false);
        }
    };

    const listScrcpyOptions = async (device: string, arg: string, customPath?: string) => {
        try {
            setLogs(prev => [...prev.slice(-100), t('logs.runningScrcpyArg', { arg })]);
            const res: any = await invoke('list_scrcpy_options', { device, arg, customPath: customPath || config.scrcpyPath });
            if (res.output) {
                const lines = res.output.split('\n');
                setLogs(prev => [...prev.slice(-100), ...lines]);

                // Parse cameras if requested
                if (arg === '--list-cameras') {
                    const cameras: { id: string, name: string }[] = [];
                    lines.forEach((line: string) => {
                        const trimmedLine = line.trim();
                        // New format (scrcpy 3.x): "    --camera-id=0    (back, 4080x3060, fps=[15, 20, 24, 30])"
                        // Old format: "    - [0] (3264x2448) back, macro"
                        const newMatch = trimmedLine.match(/--camera-id=(\w+)\s*\((.*?)\)/);
                        const oldMatch = trimmedLine.match(/^(?:-\s*)?\[(\w+)\]\s*\((.*?)\)\s*(.*)/);

                        if (newMatch) {
                            const id = newMatch[1];
                            const details = newMatch[2]; // e.g. "back, 4080x3060, fps=[...]"
                            cameras.push({
                                id,
                                name: `${id}: ${details}`
                            });
                        } else if (oldMatch) {
                            const id = oldMatch[1];
                            const resolution = oldMatch[2];
                            const metadata = oldMatch[3].replace(/\r$/, '').trim();
                            cameras.push({
                                id,
                                name: `${id}: ${metadata || 'Camera'} (${resolution})`
                            });
                        }
                    });
                    if (cameras.length > 0) {
                        setDetectedCameras(cameras);
                    } else {
                        setLogs(prev => [...prev, t('logs.noCamerasParsed')]);
                    }
                }
            }
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), t('logs.genericError', { error: String(e) })]);
            return { success: false, message: e };
        }
    };

    const pushFile = async (device: string, filePath: string, customPath?: string) => {
        try {
            setLogs(prev => [...prev.slice(-100), t('logs.pushingFile', { device, filePath })]);
            const res: any = await invoke('push_file', { device, filePath, customPath: customPath || config.scrcpyPath });
            setLogs(prev => [...prev.slice(-100), t('logs.adbPrefix', { message: String(res.message) })]);
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), t('logs.genericError', { error: String(e) })]);
            return { success: false, message: e };
        }
    };

    const installApk = async (device: string, filePath: string, customPath?: string) => {
        try {
            setLogs(prev => [...prev.slice(-100), t('logs.installingApk', { device, filePath })]);
            const res: any = await invoke('install_apk', { device, filePath, customPath: customPath || config.scrcpyPath });
            setLogs(prev => [...prev.slice(-100), t('logs.adbPrefix', { message: String(res.message) })]);
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), t('logs.genericError', { error: String(e) })]);
            return { success: false, message: e };
        }
    };

    const runTerminalCommand = async (command: string, customPath?: string) => {
        try {
            // Check if user specifically typed scrcpy or adb to format log nicely
            const lower = command.trim().toLowerCase();
            const prefix = (lower.startsWith('scrcpy') || lower.startsWith('adb')) ? '' : 'adb ';
            setLogs(prev => [...prev.slice(-100), `> ${prefix}${command}`]);

            const res: any = await invoke('run_terminal_command', {
                device: activeDevice,
                cmd: command,
                customPath: customPath || config.scrcpyPath
            });

            if (res.stdout) {
                const lines = res.stdout.trim().split('\n');
                setLogs(prev => [...prev.slice(-100), ...lines]);
            }
            if (res.stderr) {
                const lines = res.stderr.trim().split('\n').map((l: string) => `[${res.binary?.toUpperCase() || 'ERR'}] ${l}`);
                setLogs(prev => [...prev.slice(-100), ...lines]);
            }
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), t('logs.commandFailed', { error: String(e) })]);
            return { success: false, message: e };
        }
    };

    const clearLogs = () => setLogs([]);

    return {
        devices,
        deviceModels,
        deviceFriendlyNames,
        logs,
        setLogs,
        clearLogs,
        isDownloading,
        downloadProgress,
        status,
        refreshDevices,
        refreshDevicesUntilSettled,
        runScrcpy,
        stopScrcpy,
        recenterMirrorWindow,
        downloadScrcpy,
        activeDevice,
        setActiveDevice,
        checkScrcpy,
        scrcpyStatus,
        pairDevice,
        connectDevice,
        listScrcpyOptions,
        runTerminalCommand,
        runningDevices,
        defaultRecordPath,
        detectedCameras,
        renderDriverSupport,
        isRefreshing,
        mdnsDevices,
        config,
        setConfig,
        theme,
        setTheme,
        colorMode,
        setColorMode,
        pushFile,
        installApk,
        historyDevices,
        clearHistory,
        sessionRunning: runningDevices.includes(activeDevice || ''),
        isOnboardingOpen,
        setIsOnboardingOpen,
        completeOnboarding: () => {
            localStorage.setItem('scrcpy_onboarding_done', 'true');
            setIsOnboardingOpen(false);
        }
    };
}
