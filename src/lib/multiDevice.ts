import type { ScrcpyConfig } from '../hooks/useScrcpy';

export interface MultiDeviceSettings {
    autoLaunch: boolean;
    windowWidth: number;
    windowHeight: number;
    columns: number;
    gap: number;
    startX: number;
    startY: number;
}

export interface GridPosition {
    x: number;
    y: number;
    row: number;
    column: number;
}

export const DEFAULT_MULTI_DEVICE_SETTINGS: MultiDeviceSettings = {
    autoLaunch: false,
    windowWidth: 400,
    windowHeight: 800,
    columns: 3,
    gap: 20,
    startX: 50,
    startY: 100,
};

export const MULTI_DEVICE_STORAGE_KEY = 'scrcpy_multi_device';

function clampSetting(value: unknown, min: number, max: number, fallback: number): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.round(numeric)));
}

export function normalizeMultiDeviceSettings(
    input: Partial<MultiDeviceSettings> | null | undefined
): MultiDeviceSettings {
    const value = input ?? {};
    return {
        autoLaunch: value.autoLaunch === true,
        windowWidth: clampSetting(value.windowWidth, 100, 10000, DEFAULT_MULTI_DEVICE_SETTINGS.windowWidth),
        windowHeight: clampSetting(value.windowHeight, 100, 10000, DEFAULT_MULTI_DEVICE_SETTINGS.windowHeight),
        columns: clampSetting(value.columns, 1, 12, DEFAULT_MULTI_DEVICE_SETTINGS.columns),
        gap: clampSetting(value.gap, 0, 500, DEFAULT_MULTI_DEVICE_SETTINGS.gap),
        startX: clampSetting(value.startX, -10000, 10000, DEFAULT_MULTI_DEVICE_SETTINGS.startX),
        startY: clampSetting(value.startY, -10000, 10000, DEFAULT_MULTI_DEVICE_SETTINGS.startY),
    };
}

function gridPosition(index: number, settings: MultiDeviceSettings): GridPosition {
    const safeIndex = Math.max(0, Math.floor(index));
    const column = safeIndex % settings.columns;
    const row = Math.floor(safeIndex / settings.columns);
    return {
        x: Math.round(settings.startX + column * (settings.windowWidth + settings.gap)),
        y: Math.round(settings.startY + row * (settings.windowHeight + settings.gap)),
        row,
        column,
    };
}

export function computeGridPosition(
    index: number,
    settings: MultiDeviceSettings
): GridPosition {
    return gridPosition(index, normalizeMultiDeviceSettings(settings));
}

export function resolveGridIndex(devices: string[], device: string, fallback: number): number {
    const index = devices.indexOf(device);
    return index >= 0 ? index : Math.max(0, Math.floor(fallback));
}

export function buildMultiDeviceConfig(
    baseConfig: ScrcpyConfig,
    device: string,
    index: number,
    settings: MultiDeviceSettings
): ScrcpyConfig {
    const normalized = normalizeMultiDeviceSettings(settings);
    const position = gridPosition(index, normalized);
    return {
        ...baseConfig,
        device,
        sessionMode: 'mirror',
        windowX: position.x,
        windowY: position.y,
        windowWidth: normalized.windowWidth,
        windowHeight: normalized.windowHeight,
        rememberWindowPosition: false,
    };
}

export function selectLaunchTargets(
    devices: string[],
    runningDevices: string[],
    launchingDevices: Iterable<string>
): string[] {
    const blocked = new Set([...runningDevices, ...launchingDevices]);
    return Array.from(new Set(devices)).filter(device => device && !blocked.has(device));
}

export function shouldRunAutoLaunch(options: {
    enabled: boolean;
    initialized: boolean;
    scrcpyFound: boolean;
    refreshing: boolean;
    hasRefreshed: boolean;
    alreadyLaunched: boolean;
}): boolean {
    return options.enabled
        && options.initialized
        && options.scrcpyFound
        && options.hasRefreshed
        && !options.refreshing
        && !options.alreadyLaunched;
}
