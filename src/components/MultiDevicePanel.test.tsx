import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MultiDevicePanel from './MultiDevicePanel';
import { DEFAULT_MULTI_DEVICE_SETTINGS } from '../lib/multiDevice';

type PanelProps = Parameters<typeof MultiDevicePanel>[0];

function renderPanel(overrides: Partial<PanelProps> = {}) {
    const onLaunchAll = vi.fn();
    const onChange = vi.fn();

    render(
        <MultiDevicePanel
            devices={['device-1', 'device-2']}
            runningDevices={[]}
            settings={DEFAULT_MULTI_DEVICE_SETTINGS}
            onChange={onChange}
            onLaunchAll={onLaunchAll}
            isLaunching={false}
            {...overrides}
        />
    );

    return { onLaunchAll, onChange };
}

describe('MultiDevicePanel', () => {
    it('shows the pending device count on the launch button', () => {
        renderPanel();

        expect(screen.getByText('Multi-Device Grid')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Launch All (2)' })).toBeEnabled();
    });

    it('launches every pending device when clicked', async () => {
        const user = userEvent.setup();
        const { onLaunchAll } = renderPanel();

        await user.click(screen.getByRole('button', { name: 'Launch All (2)' }));

        expect(onLaunchAll).toHaveBeenCalledTimes(1);
    });

    it('disables the button when no devices are connected', () => {
        renderPanel({ devices: [] });

        expect(screen.getByRole('button', { name: 'No devices connected' })).toBeDisabled();
    });

    it('disables the button when every device is already running', () => {
        renderPanel({ runningDevices: ['device-1', 'device-2'] });

        expect(screen.getByRole('button', { name: 'All devices are running' })).toBeDisabled();
    });

    it('disables the button while a batch is launching', () => {
        renderPanel({ isLaunching: true });

        expect(screen.getByRole('button', { name: 'Launching...' })).toBeDisabled();
    });

    it('commits the window width on blur', async () => {
        const user = userEvent.setup();
        const { onChange } = renderPanel();
        const input = screen.getByLabelText('Width');

        await user.clear(input);
        await user.type(input, '500');
        await user.tab();

        expect(onChange).toHaveBeenCalledWith({ windowWidth: 500 });
    });

    it('restores the current value when the width is not a number', async () => {
        const user = userEvent.setup();
        const { onChange } = renderPanel();
        const input = screen.getByLabelText('Width');

        await user.clear(input);
        await user.tab();

        expect(onChange).not.toHaveBeenCalled();
        expect(input).toHaveValue(400);
    });

    it('toggles auto-launch', async () => {
        const user = userEvent.setup();
        const { onChange } = renderPanel();
        const toggle = screen.getByRole('switch', { name: 'Auto-Launch on Startup' });

        expect(toggle).toHaveAttribute('aria-checked', 'false');
        await user.click(toggle);

        expect(onChange).toHaveBeenCalledWith({ autoLaunch: true });
    });
});
