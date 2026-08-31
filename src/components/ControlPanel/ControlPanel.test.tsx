import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ControlPanel from '.';
import { RenderDriverSupport, ScrcpyConfig } from '../../hooks/useScrcpy';

const supportedRenderers: RenderDriverSupport = {
    hostOs: 'windows',
    supportsRenderDriver: true,
    supportedDrivers: [
        { id: 'direct3d', label: 'D3D11 (Direct3D)' },
        { id: 'opengl', label: 'OpenGL' }
    ]
};

const unsupportedRenderers: RenderDriverSupport = {
    hostOs: 'windows',
    supportsRenderDriver: false,
    supportedDrivers: []
};

function createConfig(overrides: Partial<ScrcpyConfig> = {}): ScrcpyConfig {
    return {
        device: 'device-1',
        sessionMode: 'mirror',
        fps: 60,
        res: '0',
        ...overrides
    };
}

function renderControlPanel(config: ScrcpyConfig, support: RenderDriverSupport, setConfig = vi.fn()) {
    const { container } = render(
        <ControlPanel
            config={config}
            setConfig={setConfig}
            onStart={vi.fn()}
            onStop={vi.fn()}
            isRunning={false}
            onListOptions={vi.fn()}
            detectedCameras={[]}
            renderDriverSupport={support}
        />
    );

    return { setConfig, container };
}

async function openRendererSelect(user: ReturnType<typeof userEvent.setup>) {
    const label = screen.getByText('Graphics Renderer');
    const container = label.parentElement as HTMLElement;
    const button = container.querySelector('button') as HTMLButtonElement;
    await user.click(button);
}

describe('ControlPanel renderer selector', () => {
    describe('with supported renderers and default config', () => {
        let user: ReturnType<typeof userEvent.setup>;

        beforeEach(() => {
            user = userEvent.setup();
            renderControlPanel(createConfig(), supportedRenderers);
        });

        it('shows graphics renderer label', () => {
            expect(screen.getByText('Graphics Renderer')).toBeInTheDocument();
        });

        it('shows auto renderer value by default', () => {
            expect(screen.getByText('Auto')).toBeInTheDocument();
        });

        it('shows supported renderer option', async () => {
            await openRendererSelect(user);
            expect(screen.getByText('OpenGL')).toBeInTheDocument();
        });

        it('hides unsupported renderer option', async () => {
            await openRendererSelect(user);
            expect(screen.queryByText('Metal')).not.toBeInTheDocument();
        });
    });

    describe('when selecting renderers', () => {
        it('updates renderDriver when selecting supported renderer', async () => {
            const user = userEvent.setup();
            const { setConfig } = renderControlPanel(createConfig(), supportedRenderers);
            await openRendererSelect(user);
            await user.click(screen.getByText('D3D11 (Direct3D)'));
            expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ renderDriver: 'direct3d' }));
        });

        it('clears renderDriver when selecting auto renderer', async () => {
            const user = userEvent.setup();
            const { setConfig } = renderControlPanel(createConfig({ renderDriver: 'direct3d' }), supportedRenderers);
            await openRendererSelect(user);
            await user.click(screen.getByText('Auto'));
            expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ renderDriver: undefined }));
        });
    });

    describe('with unsupported renderer capability', () => {
        it('keeps renderer options auto only when support is unavailable', async () => {
            const user = userEvent.setup();
            renderControlPanel(createConfig(), unsupportedRenderers);
            await openRendererSelect(user);
            expect(screen.queryByText('OpenGL')).not.toBeInTheDocument();
        });
    });

    describe('across session modes', () => {
        it('shows renderer selector in camera mode', () => {
            renderControlPanel(createConfig({ sessionMode: 'camera' }), supportedRenderers);
            expect(screen.getByText('Graphics Renderer')).toBeInTheDocument();
        });

        it('shows renderer selector in desktop mode', () => {
            renderControlPanel(createConfig({ sessionMode: 'desktop' }), supportedRenderers);
            expect(screen.getByText('Graphics Renderer')).toBeInTheDocument();
        });
    });
});

function renderDesktopPanel(overrides: Partial<ScrcpyConfig> = {}) {
    const config: ScrcpyConfig = {
        device: '',
        sessionMode: 'desktop',
        vdWidth: 1920,
        vdHeight: 1080,
        vdDpi: 420,
        aspectRatioLock: false,
        ...overrides
    };
    const setConfig = vi.fn();

    const { container } = render(
        <ControlPanel
            config={config}
            setConfig={setConfig}
            onStart={() => {}}
            onStop={() => {}}
            isRunning={false}
            onListOptions={() => {}}
        />
    );

    return {
        config,
        setConfig,
        widthSlider: container.querySelector('.vd-width-slider') as HTMLInputElement,
        heightSlider: container.querySelector('.vd-height-slider') as HTMLInputElement
    };
}

describe('VDSlider (Width / Height / DPI, desktop mode)', () => {
    it('double-clicking the value swaps in a spinner-free number input with the current value', async () => {
        const user = userEvent.setup();
        renderDesktopPanel();

        await user.dblClick(screen.getByText('1920px'));

        // The range input (role "slider") keeps rendering alongside the new
        // editor, so the number input (role "spinbutton") is the only
        // unambiguous way to grab it.
        const input = screen.getByRole('spinbutton');
        expect(input).toHaveValue(1920);
        expect(input).toHaveAttribute('type', 'number');
        expect(input).toHaveClass('no-spinner');
    });

    it('commits a typed value on Enter', async () => {
        const user = userEvent.setup();
        const { setConfig } = renderDesktopPanel();

        await user.dblClick(screen.getByText('1920px'));
        const input = screen.getByRole('spinbutton');
        await user.clear(input);
        await user.type(input, '2400{Enter}');

        expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ vdWidth: 2400 }));
        expect(screen.getByText('2400px')).toBeInTheDocument();
    });

    it('commits a typed value on blur', async () => {
        const user = userEvent.setup();
        const { setConfig } = renderDesktopPanel();

        await user.dblClick(screen.getByText('1080px'));
        const input = screen.getByRole('spinbutton');
        await user.clear(input);
        await user.type(input, '900');
        await user.tab();

        expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ vdHeight: 900 }));
    });

    it('clamps a typed value above the max to the slider bound', async () => {
        const user = userEvent.setup();
        const { setConfig } = renderDesktopPanel();

        await user.dblClick(screen.getByText('1920px'));
        const input = screen.getByRole('spinbutton');
        await user.clear(input);
        await user.type(input, '99999{Enter}');

        expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ vdWidth: 3840 }));
    });

    it('clamps a typed value below the min to the slider bound', async () => {
        const user = userEvent.setup();
        const { setConfig } = renderDesktopPanel();

        await user.dblClick(screen.getByText('1920px'));
        const input = screen.getByRole('spinbutton');
        await user.clear(input);
        await user.type(input, '1{Enter}');

        expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ vdWidth: 480 }));
    });

    it('cancels editing on Escape without committing', async () => {
        const user = userEvent.setup();
        const { setConfig } = renderDesktopPanel();

        await user.dblClick(screen.getByText('1920px'));
        const input = screen.getByRole('spinbutton');
        await user.clear(input);
        await user.type(input, '3000');
        await user.keyboard('{Escape}');

        expect(setConfig).not.toHaveBeenCalled();
        expect(screen.getByText('1920px')).toBeInTheDocument();
    });

    it('ignores a non-numeric typed value instead of committing garbage', async () => {
        const user = userEvent.setup();
        const { setConfig } = renderDesktopPanel();

        await user.dblClick(screen.getByText('1920px'));
        const input = screen.getByRole('spinbutton');
        await user.clear(input);
        await user.keyboard('{Enter}');

        expect(setConfig).not.toHaveBeenCalled();
        expect(screen.getByText('1920px')).toBeInTheDocument();
    });

    it('reuses the same editable slider for DPI, including its tooltip label', async () => {
        const user = userEvent.setup();
        const { setConfig } = renderDesktopPanel();

        expect(screen.getByText('420 DPI')).toBeInTheDocument();

        await user.dblClick(screen.getByText('420 DPI'));
        const input = screen.getByRole('spinbutton');
        await user.clear(input);
        await user.type(input, '300{Enter}');

        expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ vdDpi: 300 }));
    });
});

describe('Aspect ratio lock (desktop mode)', () => {
    it('updates height live while dragging the width slider, without waiting for release', () => {
        const { setConfig, widthSlider } = renderDesktopPanel({ aspectRatioLock: true, vdWidth: 1920, vdHeight: 1080 });

        fireEvent.change(widthSlider, { target: { value: '960' } });

        // No mouseup/change-commit event fired: the drag tick alone must propagate.
        expect(setConfig).toHaveBeenCalledTimes(1);
        expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ vdWidth: 960, vdHeight: 540 }));
    });

    it('updates width live while dragging the height slider, without waiting for release', () => {
        const { setConfig, heightSlider } = renderDesktopPanel({ aspectRatioLock: true, vdWidth: 1920, vdHeight: 1080 });

        fireEvent.change(heightSlider, { target: { value: '540' } });

        expect(setConfig).toHaveBeenCalledTimes(1);
        expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ vdWidth: 960, vdHeight: 540 }));
    });

    it('leaves the other dimension untouched while dragging when ratio lock is off', () => {
        const { setConfig, widthSlider } = renderDesktopPanel({ aspectRatioLock: false, vdWidth: 1920, vdHeight: 1080 });

        fireEvent.change(widthSlider, { target: { value: '960' } });

        expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ vdWidth: 960, vdHeight: 1080 }));
    });
});
