import { describe, expect, it } from 'vitest';
import type { ScrcpyConfig } from '../hooks/useScrcpy';
import {
    buildMultiDeviceConfig,
    computeGridPosition,
    DEFAULT_MULTI_DEVICE_SETTINGS,
    normalizeMultiDeviceSettings,
    resolveGridIndex,
    selectLaunchTargets,
    shouldRunAutoLaunch,
} from './multiDevice';

const baseConfig: ScrcpyConfig = {
    device: 'original-device',
    sessionMode: 'mirror',
    fps: 60,
    res: '0',
    windowX: 1,
    windowY: 2,
    windowWidth: 99,
    windowHeight: 99,
    rememberWindowPosition: true,
};

describe('normalizeMultiDeviceSettings', () => {
    it('returns defaults for missing input', () => {
        expect(normalizeMultiDeviceSettings(undefined)).toEqual(DEFAULT_MULTI_DEVICE_SETTINGS);
        expect(normalizeMultiDeviceSettings(null)).toEqual(DEFAULT_MULTI_DEVICE_SETTINGS);
    });

    it('clamps and rounds every numeric setting', () => {
        expect(normalizeMultiDeviceSettings({
            autoLaunch: true,
            windowWidth: 50,
            windowHeight: 20000,
            columns: 0,
            gap: -5,
            startX: -20000,
            startY: 12.6,
        })).toEqual({
            autoLaunch: true,
            windowWidth: 100,
            windowHeight: 10000,
            columns: 1,
            gap: 0,
            startX: -10000,
            startY: 13,
        });
    });

    it('falls back to defaults for non-finite numbers', () => {
        expect(normalizeMultiDeviceSettings({ windowWidth: Number.NaN, columns: Number.POSITIVE_INFINITY })).toMatchObject({
            windowWidth: DEFAULT_MULTI_DEVICE_SETTINGS.windowWidth,
            columns: DEFAULT_MULTI_DEVICE_SETTINGS.columns,
        });
    });

    it('only accepts a literal true for autoLaunch', () => {
        expect(normalizeMultiDeviceSettings({ autoLaunch: false }).autoLaunch).toBe(false);
        expect(normalizeMultiDeviceSettings({}).autoLaunch).toBe(false);
    });
});

describe('computeGridPosition', () => {
    const settings = normalizeMultiDeviceSettings({
        windowWidth: 400,
        windowHeight: 800,
        columns: 3,
        gap: 20,
        startX: 50,
        startY: 100,
    });

    it('places the first device at the start position', () => {
        expect(computeGridPosition(0, settings)).toEqual({ x: 50, y: 100, row: 0, column: 0 });
    });

    it('fills a row before wrapping to the next one', () => {
        expect(computeGridPosition(2, settings)).toEqual({ x: 890, y: 100, row: 0, column: 2 });
        expect(computeGridPosition(3, settings)).toEqual({ x: 50, y: 920, row: 1, column: 0 });
    });

    it('supports custom sizes, gaps and negative start coordinates', () => {
        const custom = normalizeMultiDeviceSettings({
            windowWidth: 300,
            windowHeight: 500,
            columns: 2,
            gap: 10,
            startX: -100,
            startY: -50,
        });

        expect(computeGridPosition(3, custom)).toEqual({ x: 210, y: 460, row: 1, column: 1 });
    });

    it('treats negative indexes as the first cell', () => {
        expect(computeGridPosition(-4, settings)).toEqual({ x: 50, y: 100, row: 0, column: 0 });
    });

    it('normalizes unsafe settings before computing the grid', () => {
        expect(computeGridPosition(1, {
            ...settings,
            windowWidth: 0,
            columns: 0,
        })).toEqual({ x: 50, y: 920, row: 1, column: 0 });
    });
});

describe('resolveGridIndex', () => {
    it('uses the connected device order so relaunches keep their slot', () => {
        expect(resolveGridIndex(['a', 'b', 'c'], 'c', 0)).toBe(2);
        expect(resolveGridIndex(['a', 'b', 'c'], 'a', 2)).toBe(0);
    });

    it('falls back to the pending index when the device is missing', () => {
        expect(resolveGridIndex(['a'], 'missing', 3)).toBe(3);
        expect(resolveGridIndex(['a'], 'missing', -2)).toBe(0);
    });
});

describe('buildMultiDeviceConfig', () => {
    it('overrides only launch-specific fields', () => {
        const result = buildMultiDeviceConfig(baseConfig, 'serial-1', 4, DEFAULT_MULTI_DEVICE_SETTINGS);

        expect(result).toMatchObject({
            device: 'serial-1',
            windowX: 470,
            windowY: 920,
            windowWidth: 400,
            windowHeight: 800,
            rememberWindowPosition: false,
            sessionMode: 'mirror',
        });
    });

    it('always launches the grid in mirror mode', () => {
        const result = buildMultiDeviceConfig(
            { ...baseConfig, sessionMode: 'camera' },
            'serial-1',
            0,
            DEFAULT_MULTI_DEVICE_SETTINGS
        );

        expect(result.sessionMode).toBe('mirror');
    });

    it('does not mutate the base config', () => {
        buildMultiDeviceConfig(baseConfig, 'serial-1', 0, DEFAULT_MULTI_DEVICE_SETTINGS);

        expect(baseConfig).toMatchObject({
            device: 'original-device',
            windowX: 1,
            windowY: 2,
            windowWidth: 99,
            windowHeight: 99,
            rememberWindowPosition: true,
        });
    });
});

describe('selectLaunchTargets', () => {
    it('deduplicates devices while preserving order', () => {
        expect(selectLaunchTargets(['a', 'b', 'a', 'c'], [], [])).toEqual(['a', 'b', 'c']);
    });

    it('skips running and already launching devices', () => {
        expect(selectLaunchTargets(['a', 'b', 'c', 'd'], ['b'], new Set(['d']))).toEqual(['a', 'c']);
    });

    it('ignores empty device identifiers', () => {
        expect(selectLaunchTargets(['a', '', 'b'], [], [])).toEqual(['a', 'b']);
    });
});

describe('shouldRunAutoLaunch', () => {
    const ready = {
        enabled: true,
        initialized: true,
        scrcpyFound: true,
        refreshing: false,
        hasRefreshed: true,
        alreadyLaunched: false,
    };

    it('allows a single launch when every condition is met', () => {
        expect(shouldRunAutoLaunch(ready)).toBe(true);
    });

    it.each([
        ['disabled', { enabled: false }],
        ['not initialized', { initialized: false }],
        ['scrcpy missing', { scrcpyFound: false }],
        ['still refreshing', { refreshing: true }],
        ['discovery has not run', { hasRefreshed: false }],
        ['already launched', { alreadyLaunched: true }],
    ])('blocks auto-launch when %s', (_label, override) => {
        expect(shouldRunAutoLaunch({ ...ready, ...override })).toBe(false);
    });
});
