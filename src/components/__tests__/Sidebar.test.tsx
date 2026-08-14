import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { describe, it, expect, vi } from 'vitest';

describe('Sidebar Component', () => {
    const mockProps = {
        devices: ['device1', 'device2'],
        runningDevices: ['device1'],
        onRefresh: vi.fn(),
        onKillAdb: vi.fn(),
        selectedDevice: 'device1',
        onSelectDevice: vi.fn(),
        onPair: vi.fn(),
        onConnect: vi.fn(),
        historyDevices: [],
        onFilePush: vi.fn(),
        isRefreshing: false
    };

    it('renders device list correctly', () => {
        render(<Sidebar {...mockProps} />);
        expect(screen.getByText('device1')).toBeInTheDocument();
        expect(screen.getByText('device2')).toBeInTheDocument();
    });

    it('shows "Live" status for running devices', () => {
        render(<Sidebar {...mockProps} />);
        const liveIndicator = screen.getByText('Live');
        expect(liveIndicator).toBeInTheDocument();
        expect(liveIndicator).toHaveClass('text-emerald-500');
    });

    it('calls onSelectDevice when a device is clicked', () => {
        render(<Sidebar {...mockProps} />);
        fireEvent.click(screen.getByText('device2'));
        expect(mockProps.onSelectDevice).toHaveBeenCalledWith('device2');
    });

    it('calls onRefresh when refresh button is clicked', () => {
        render(<Sidebar {...mockProps} />);
        fireEvent.click(screen.getByText(/refresh/i));
        expect(mockProps.onRefresh).toHaveBeenCalled();
    });

    it('switches tabs correctly', () => {
        render(<Sidebar {...mockProps} />);

        // USB default
        expect(screen.getByText('USB Setup Tip')).toBeInTheDocument();

        // Switch to Wireless
        fireEvent.click(screen.getByText('Wireless'));
        expect(screen.getByText('Wireless Setup Tip')).toBeInTheDocument();
    });

    it('opens a pairing modal for a discovered device on the pairing screen, and submits the code', async () => {
        const onPair = vi.fn().mockResolvedValue({ success: true });
        const mdnsProps = {
            ...mockProps,
            onPair,
            mdnsDevices: [
                { name: 'DiscoveredPhone', service: '_adb-tls-pairing._tcp', address: '192.168.0.104:37521' }
            ]
        };
        render(<Sidebar {...mdnsProps} />);

        // Switch to Wireless tab to see it
        fireEvent.click(screen.getByText('Wireless'));
        fireEvent.click(screen.getByText(/DiscoveredPhone/));

        // A device on the pairing screen never gets a doomed direct connect --
        // just a code field. The manual pairing section below always renders
        // its own "Pairing Code" input too, so the modal's is the 2nd one.
        expect(mockProps.onConnect).not.toHaveBeenCalled();
        const [, modalCodeInput] = screen.getAllByPlaceholderText('Pairing Code');
        fireEvent.change(modalCodeInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByText('OK'));

        await waitFor(() => expect(onPair).toHaveBeenCalledWith('192.168.0.104:37521', '123456'));
    });

    it('collapses connect + pairing broadcasts from the same device into one entry', () => {
        const mdnsProps = {
            ...mockProps,
            mdnsDevices: [
                { name: 'DiscoveredPhone', service: '_adb-tls-connect._tcp', address: '192.168.0.104:42441' },
                { name: 'DiscoveredPhone', service: '_adb-tls-pairing._tcp', address: '192.168.0.104:33427' }
            ]
        };
        render(<Sidebar {...mdnsProps} />);

        fireEvent.click(screen.getByText('Wireless'));
        // Same physical device broadcasting both services shows up once, not
        // twice -- and as the pairing entry, the one actually actionable now.
        expect(screen.getAllByText(/DiscoveredPhone/)).toHaveLength(1);
        expect(screen.getByText(/192.168.0.104:33427/)).toBeInTheDocument();
    });

    it('shows a "not ready" info modal for a discovered device not yet on the pairing screen', () => {
        const mdnsProps = {
            ...mockProps,
            mdnsDevices: [
                { name: 'DiscoveredPhone', service: '_adb-tls-connect._tcp', address: '192.168.0.104:44321' }
            ]
        };
        render(<Sidebar {...mdnsProps} />);

        fireEvent.click(screen.getByText('Wireless'));
        fireEvent.click(screen.getByText(/DiscoveredPhone/));

        // Only advertising "_adb-tls-connect" means pairing was never done and
        // the pairing port/code don't exist yet -- no modal code field (only
        // the manual pairing section's own, always-rendered input), and no
        // connect/pair attempt that could only fail.
        expect(screen.getAllByPlaceholderText('Pairing Code')).toHaveLength(1);
        expect(mockProps.onConnect).not.toHaveBeenCalled();
        expect(mockProps.onPair).not.toHaveBeenCalled();
    });

    it('shows a loading indicator and the device identity while waiting on the pairing screen', () => {
        const mdnsProps = {
            ...mockProps,
            mdnsDevices: [
                { name: 'adb-DiscoveredPhone', service: '_adb-tls-connect._tcp', address: '192.168.0.104:44321' }
            ]
        };
        render(<Sidebar {...mdnsProps} />);

        fireEvent.click(screen.getByText('Wireless'));
        fireEvent.click(screen.getByText(/DiscoveredPhone/));

        // Which device it's waiting on (shown once in the list behind the
        // modal, once in the modal itself), that it's actively checking (not
        // a dead end), and a way out that doesn't claim to "OK" something
        // that never happened.
        expect(screen.getAllByText(/192.168.0.104:44321/)).toHaveLength(2);
        expect(screen.getByText('Checking for the pairing screen...')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('auto-transitions the open modal to the code field once the phone opens the pairing screen', () => {
        const notReady = { name: 'adb-DiscoveredPhone', service: '_adb-tls-connect._tcp', address: '192.168.0.104:44321' };
        const ready = { name: 'adb-DiscoveredPhone', service: '_adb-tls-pairing._tcp', address: '192.168.0.104:55555' };
        const { rerender } = render(<Sidebar {...mockProps} mdnsDevices={[notReady]} />);

        fireEvent.click(screen.getByText('Wireless'));
        fireEvent.click(screen.getByText(/DiscoveredPhone/));
        expect(screen.getAllByPlaceholderText('Pairing Code')).toHaveLength(1);

        // Simulate the background poll picking up the pairing broadcast --
        // same modal stays open and swaps straight to the code field, no
        // closing and reopening needed.
        rerender(<Sidebar {...mockProps} mdnsDevices={[ready]} />);
        expect(screen.getAllByPlaceholderText('Pairing Code')).toHaveLength(2);
    });

    it('disables the Recent Devices connect button while a refresh is already in flight', () => {
        render(<Sidebar {...mockProps} historyDevices={['192.168.1.128:5555']} isRefreshing={true} />);

        fireEvent.click(screen.getByText('Wireless'));
        // A rapid second click before the first connect attempt settles fired
        // a duplicate `adb connect` -- disabling this button while one is
        // already in flight, like the other two connect-triggering buttons
        // already do, is what prevents that.
        const connectBtn = screen.getByText('192.168.1.128:5555').closest('button');
        expect(connectBtn).toBeDisabled();
    });

    it('shows a clean label for an mDNS wireless-debugging serial, but keeps the full serial for selection', () => {
        const mdnsSerial = 'adb-VWGE5XZHOBAIAAJN-thoiAU._adb-tls-connect._tcp';
        const onSelectDevice = vi.fn();
        render(<Sidebar {...mockProps} devices={[mdnsSerial]} runningDevices={[]} onSelectDevice={onSelectDevice} />);

        expect(screen.getByText('VWGE5XZHOBAIAAJN-thoiAU')).toBeInTheDocument();
        expect(screen.queryByText(mdnsSerial)).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('VWGE5XZHOBAIAAJN-thoiAU'));
        expect(onSelectDevice).toHaveBeenCalledWith(mdnsSerial);
    });
});
