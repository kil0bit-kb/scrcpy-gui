import React from 'react';
import { Devices, Refresh, Wifi, Usb } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { UploadCloud, Lightbulb, Zap } from 'lucide-react';
import { useI18n } from '../i18n';
import { MdnsDevice, isMdnsDeviceConnected } from '../hooks/useScrcpy';
import Tooltip from './Tooltip';

// mDNS wireless-debugging serials look like
// "adb-<serial>-<random>._adb-tls-connect._tcp" (optionally with an mDNS
// conflict suffix, e.g. "... (2)._adb-tls-connect._tcp"). That is the real adb
// serial (still needed for -s), just unreadable as a label, so strip the mDNS
// protocol boilerplate for display only.
function formatDeviceLabel(serial: string): string {
    const match = serial.match(/^adb-(.+?)( \(\d+\))?\._adb-tls-connect\._(tcp|udp)$/);
    return match ? `${match[1]}${match[2] ?? ''}` : serial;
}

// An mDNS instance name like "adb-VWGE5XZHOBAIAAJN-thoiAU" is long and the
// "adb-" prefix adds nothing readable as a secondary label next to the
// address; strip it for display only.
function formatMdnsName(name: string): string {
    return name.replace(/^adb-/, '');
}

export interface SidebarProps {
    devices: string[];
    runningDevices: string[];
    onRefresh: () => void;
    onKillAdb: () => void;
    selectedDevice: string;
    onSelectDevice: (d: string) => void;
    onPair: (ip: string, code: string) => Promise<any>;
    onConnect: (ip: string) => Promise<any>;
    isRefreshing?: boolean;
    onFilePush: () => void;
    // History props
    historyDevices?: string[];
    clearHistory?: () => void;
    mdnsDevices?: MdnsDevice[];
}

export default function Sidebar({
    devices,
    runningDevices,
    onRefresh,
    onKillAdb,
    selectedDevice,
    onSelectDevice,
    onPair,
    onConnect,
    isRefreshing,
    onFilePush,
    historyDevices = [],
    clearHistory = () => { },
    mdnsDevices = []
}: SidebarProps) {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = React.useState<'usb' | 'wireless'>('usb');
    const [connectIp, setConnectIp] = React.useState('');
    const [pairIp, setPairIp] = React.useState('');
    const [pairCode, setPairCode] = React.useState('');
    const pairCodeRef = React.useRef<HTMLInputElement>(null);

    // Tapping a discovered device opens this instead of attempting a doomed
    // `adb connect`: a device that shows up here but isn't in the hub above
    // isn't paired with this PC yet (a paired one reconnects on its own), so
    // connecting can't succeed before pairing.
    const [pairingTarget, setPairingTarget] = React.useState<MdnsDevice | null>(null);
    const [modalCode, setModalCode] = React.useState('');
    const [modalError, setModalError] = React.useState(false);
    const [modalSubmitting, setModalSubmitting] = React.useState(false);

    const handleConnect = async (ip: string) => {
        if (!ip) return;
        await onConnect(ip);
    };

    // The same physical device can broadcast both "_adb-tls-connect" (wireless
    // debugging is on) and "_adb-tls-pairing" (it's also sitting on the pairing
    // screen right now) at once -- two separate mDNS records for one phone.
    // Collapse them to one entry per name, keeping the pairing one when both
    // are present since that's the one actually actionable right now.
    const uniqueMdnsDevices = React.useMemo(() => {
        const byName = new Map<string, MdnsDevice>();
        for (const dev of mdnsDevices) {
            const existing = byName.get(dev.name);
            if (!existing || dev.service.includes('_adb-tls-pairing')) {
                byName.set(dev.name, dev);
            }
        }
        return Array.from(byName.values());
    }, [mdnsDevices]);

    // Shared by the manual pairing form and the discovered-device modal.
    // `onPair` already refreshes the device list on success, and a paired
    // device reconnects on its own from there (adb reconnects it natively from
    // its keystore over mDNS). Explicitly connecting here too -- as this used
    // to, to work around the old hardcoded ip:5555 -- raced that native
    // reconnect and opened a second, duplicate session for the same device
    // under a stale ip:port.
    const completePairing = async (ip: string, code: string) => onPair(ip, code);

    const submitPairingModal = async () => {
        if (!pairingTarget || !modalCode || modalSubmitting) return;
        setModalSubmitting(true);
        setModalError(false);
        const res = await completePairing(pairingTarget.address, modalCode);
        setModalSubmitting(false);
        if (res.success) {
            setPairingTarget(null);
            setModalCode('');
        } else {
            setModalError(true);
        }
    };

    // While the modal is waiting on the phone's pairing screen to open, keep
    // refreshing in the background so it can pick up the "_adb-tls-pairing"
    // broadcast the moment it appears, without the user needing to close the
    // modal, do the manual step, then reopen it.
    React.useEffect(() => {
        if (!pairingTarget || pairingTarget.service.includes('_adb-tls-pairing')) return;
        const interval = setInterval(onRefresh, 2000);
        return () => clearInterval(interval);
    }, [pairingTarget, onRefresh]);

    // The instant a matching pairing broadcast shows up, swap the modal
    // straight to the code field -- same modal, no reopening needed.
    React.useEffect(() => {
        if (!pairingTarget || pairingTarget.service.includes('_adb-tls-pairing')) return;
        const ready = uniqueMdnsDevices.find(d => d.name === pairingTarget.name && d.service.includes('_adb-tls-pairing'));
        if (ready) setPairingTarget(ready);
    }, [uniqueMdnsDevices, pairingTarget]);

    return (
        <>
        <aside className="lg:col-span-3 space-y-4">
            <div className="glass p-4 rounded-2xl space-y-4 bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] backdrop-blur-md border border-[var(--md-sys-color-surface-container-highest)]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-[var(--md-sys-color-surface-container-highest)] pb-2 mb-1">
                    <h2 className="text-card-title flex items-center gap-2">
                        <Devices size={18} className="text-primary shrink-0" />
                        <span>{t('sidebar.deviceHub')}</span>
                    </h2>
                    <div className="flex gap-2 items-center ml-auto">
                        <Tooltip text={t('sidebar.killAdbTitle')}>
                            <button
                                onClick={onKillAdb}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black text-[var(--text-base)] bg-[var(--md-sys-color-surface-container-highest)] hover:bg-red-600 hover:text-white transition-all duration-150 ease-out group/zap cursor-pointer border border-transparent hover:border-red-500 shadow-sm"
                            >
                                <Zap size={14} className="text-primary fill-primary group-hover:text-white group-hover:fill-white shrink-0 transition-colors" />
                                {t('sidebar.killAdb')}
                            </button>
                        </Tooltip>
                        <Tooltip text={t('sidebar.refresh')}>
                            <button
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className={`flex items-center gap-1.5 px-2.5 py-1 bg-[var(--md-sys-color-surface-container-highest)] hover:bg-(--md-sys-color-surface-container) rounded-xl text-[9px] font-black text-[var(--text-base)] transition-all duration-75 ease-out group/refresh ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <Refresh size={12} className={`group-hover/refresh:rotate-180 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? t('sidebar.syncing') : t('sidebar.refresh')}
                            </button>
                        </Tooltip>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {devices.length === 0 ? (
                            <div className="text-[10px] text-zinc-600 italic py-4 text-center border border-dashed border-zinc-800/50 rounded-lg bg-black/20">{t('sidebar.noDevicesDetected')}</div>
                        ) : (
                            devices.map(d => {
                                const isRunning = runningDevices.includes(d);
                                const isSelected = selectedDevice === d;
                                return (
                                    <button
                                        key={d}
                                        onClick={() => onSelectDevice(d)}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left group ${isSelected ? 'bg-primary/5 border-primary/30' : 'bg-black/20 border-zinc-800/50 hover:border-zinc-700'}`}
                                    >
                                        <Devices size={16} className={`shrink-0 ${isSelected ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[11px] font-bold truncate tracking-tight ${isSelected ? 'text-[var(--md-sys-color-on-primary-container)] font-black' : 'text-[var(--text-muted)] group-hover:text-[var(--text-base)]'}`}>{formatDeviceLabel(d)}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {isRunning ? (
                                                    <span className="flex items-center gap-1">
                                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{t('sidebar.live')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t('sidebar.ready')}</span>
                                                )}
                                                {d.includes('.') ? (
                                                    <span className="flex items-center gap-1 bg-primary/10 px-1 py-0.5 rounded border border-primary/20">
                                                        <Wifi size={10} className="text-primary" />
                                                        <span className="text-[7px] font-black text-primary uppercase tracking-tighter">{t('sidebar.wifi')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">
                                                        <Usb size={10} className="text-zinc-400" />
                                                        <span className="text-[7px] font-black text-zinc-400 uppercase tracking-tighter">{t('sidebar.usb')}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-0.5 bg-[var(--md-sys-color-surface-container-highest)] p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('usb')}
                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold transition-all duration-150 ease-out cursor-pointer ${
                                activeTab === 'usb'
                                    ? 'bg-primary text-on-primary font-black shadow-md rounded-2xl z-10 scale-[1.02]'
                                    : 'rounded-l-2xl rounded-r-xs text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-(--md-sys-color-surface-container)'
                            }`}
                        >
                            <Usb size={14} className="shrink-0" />
                            <span>{t('sidebar.usb')}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('wireless')}
                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold transition-all duration-150 ease-out cursor-pointer ${
                                activeTab === 'wireless'
                                    ? 'bg-primary text-on-primary font-black shadow-md rounded-2xl z-10 scale-[1.02]'
                                    : 'rounded-r-2xl rounded-l-xs text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-(--md-sys-color-surface-container)'
                            }`}
                        >
                            <Wifi size={14} className="shrink-0" />
                            <span>{t('sidebar.wireless')}</span>
                        </button>
                    </div>

                    {activeTab === 'usb' && (
                        <div className="pt-1 px-0.5">
                            <div className="flex items-start gap-2.5 font-sans">
                                <Lightbulb size={18} className="shrink-0 text-primary mt-0.5" />
                                <div className="space-y-0.5 flex-1 font-sans">
                                    <h4 className="text-[11px] font-bold uppercase text-primary tracking-wide select-none">{t('sidebar.usbSetupTip')}</h4>
                                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
                                        {t('sidebar.usbSetupTipTextBefore')} <span className="text-[var(--text-base)] font-bold">{t('sidebar.usbSetupTipDeveloperOptions')}</span> {t('sidebar.usbSetupTipAnd')} <span className="text-[var(--text-base)] font-bold">{t('sidebar.usbSetupTipUsbDebugging')}</span> {t('sidebar.usbSetupTipTextAfter')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'wireless' && (
                        <div className="space-y-4 pt-1 px-0.5">
                            <div className="flex items-start gap-2.5 font-sans">
                                <Lightbulb size={18} className="shrink-0 text-primary mt-0.5" />
                                <div className="space-y-0.5 flex-1 font-sans">
                                    <h4 className="text-[11px] font-bold uppercase text-primary tracking-wide select-none">{t('sidebar.wirelessSetupTip')}</h4>
                                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
                                        {t('sidebar.wirelessSetupTipTextBefore')} <span className="text-[var(--text-base)] font-bold">{t('sidebar.wirelessSetupTipSameWifi')}</span> {t('sidebar.wirelessSetupTipAnd')} <span className="text-[var(--text-base)] font-bold">{t('sidebar.wirelessSetupTipWirelessDebugging')}</span>{t('sidebar.wirelessSetupTipTextAfter')}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="border-b border-zinc-800/50 pb-1.5">
                                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{t('sidebar.ipConnect')}</span>
                                </div>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Wifi size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                                        <input
                                            type="text"
                                            placeholder={t('sidebar.ipPlaceholder')}
                                            value={connectIp}
                                            onChange={(e) => setConnectIp(e.target.value)}
                                            className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-200 focus:border-primary/40 focus:bg-black/60 transition-all outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleConnect(connectIp)}
                                        disabled={isRefreshing}
                                        className={`px-4 bg-zinc-800 hover:bg-primary text-zinc-400 hover:text-on-primary rounded-lg text-[10px] font-black uppercase transition-all active:scale-95 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isRefreshing ? t('sidebar.connecting') : t('sidebar.connect')}
                                    </button>
                                </div>

                            </div>

                            {/* Discovered Devices (mDNS) */}
                            {uniqueMdnsDevices.filter(dev => !isMdnsDeviceConnected(dev, devices)).length > 0 && (
                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between border-b border-zinc-800/50 pb-1.5">
                                        <span className="text-[9px] font-black uppercase text-primary/60 tracking-widest">{t('sidebar.discoveredDevices')}</span>
                                    </div>
                                    <p className="text-[9px] text-zinc-600 leading-relaxed font-medium">{t('sidebar.discoveredHint')}</p>
                                    <div className="space-y-2">
                                        {uniqueMdnsDevices
                                            .filter(dev => !isMdnsDeviceConnected(dev, devices))
                                            .map((dev, idx) => (
                                                <button
                                                    key={idx}
                                                    disabled={isRefreshing}
                                                    onClick={() => {
                                                        setPairingTarget(dev);
                                                        setModalCode('');
                                                        setModalError(false);
                                                    }}
                                                    className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-800/20 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group text-left"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Wifi size={10} className="text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                                                        <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 truncate" title={`${dev.address} (${formatMdnsName(dev.name)})`}>
                                                            {dev.address} ({formatMdnsName(dev.name)})
                                                        </span>
                                                    </div>
                                                    <div className="text-[8px] text-primary opacity-0 group-hover:opacity-100 uppercase font-black tracking-tighter shrink-0 ml-2">
                                                        {t('sidebar.startPairing')}
                                                    </div>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Devices History */}
                            {historyDevices.length > 0 && (
                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between border-b border-zinc-800/50 pb-1.5">
                                        <span className="text-[9px] font-black uppercase text-primary/60 tracking-widest">{t('sidebar.recentDevices')}</span>
                                        <button
                                            onClick={clearHistory}
                                            className="text-[9px] text-zinc-600 hover:text-red-400 font-bold uppercase tracking-tighter transition-colors"
                                        >
                                            {t('sidebar.clear')}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {historyDevices.map((ip, idx) => (
                                            <button
                                                key={idx}
                                                disabled={isRefreshing}
                                                onClick={() => {
                                                    setConnectIp(ip);
                                                    handleConnect(ip);
                                                }}
                                                className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-800/20 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Wifi size={10} className="text-zinc-500 group-hover:text-zinc-300" />
                                                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200">{ip}</span>
                                                </div>
                                                <div className="text-[8px] text-primary opacity-0 group-hover:opacity-100 uppercase font-black tracking-tighter">
                                                    {t('sidebar.connect')}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pairing Setup */}
                            <div className="space-y-3 pt-1">
                                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest border-b border-zinc-800/50 block pb-1.5">{t('sidebar.pairDeviceTitle')}</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder={t('sidebar.ipPortPlaceholder')}
                                        value={pairIp}
                                        onChange={(e) => setPairIp(e.target.value)}
                                        className="w-full bg-black/40 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:border-primary/40 transition-all outline-none"
                                    />
                                    <input
                                        ref={pairCodeRef}
                                        type="text"
                                        placeholder={t('sidebar.pairingCodePlaceholder')}
                                        value={pairCode}
                                        onChange={(e) => setPairCode(e.target.value)}
                                        className={`w-full bg-black/40 border rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 transition-all outline-none ${pairIp ? 'border-amber-400/50 focus:border-amber-400' : 'border-zinc-800 focus:border-primary/40'}`}
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!pairIp || !pairCode || isRefreshing) return;
                                        const res = await completePairing(pairIp, pairCode);
                                        if (res.success) setPairCode('');
                                    }}
                                    disabled={isRefreshing}
                                    className={`w-full py-3 rounded-full text-xs font-black transition-all relative overflow-hidden group cursor-pointer shadow-md bg-primary text-on-primary ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-primary opacity-90 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-primary animate-ping opacity-20 group-hover:opacity-40 pointer-events-none" />
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <Zap size={16} className="fill-current shrink-0" />
                                        {isRefreshing ? t('sidebar.synchronizing') : t('sidebar.startPairing')}
                                    </span>
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </div>

            <div
                onClick={onFilePush}
                className="p-3.5 rounded-2xl flex items-center gap-3.5 cursor-pointer bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] hover:bg-primary/25 border-2 border-dashed border-primary/40 hover:border-primary transition-all duration-150 group shadow-md font-sans"
            >
                <div className="p-3 bg-primary/20 rounded-2xl shrink-0">
                    <UploadCloud className="text-primary" size={28} />
                </div>
                <div className="flex-1 min-w-0 font-sans">
                    <h3 className="text-xs font-bold uppercase text-primary tracking-wide select-none truncate">{t('sidebar.flashPushFiles')}</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium leading-tight mt-0.5 group-hover:text-[var(--text-base)] transition-colors select-none line-clamp-2">{t('sidebar.flashPushSubtitle')}</p>
                </div>
            </div>
        </aside>

        {pairingTarget && (
            <div
                className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 select-none"
                onClick={(e) => { if (e.target === e.currentTarget) setPairingTarget(null); }}
            >
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative w-full max-w-sm bg-[var(--md-sys-color-surface-container-high)] text-[var(--text-base)] border border-[var(--md-sys-color-surface-container-highest)] rounded-3xl shadow-2xl overflow-hidden p-6 font-sans">
                    {pairingTarget.service.includes('_adb-tls-pairing') ? (
                        <>
                            <h3 className="text-lg font-bold text-[var(--text-base)] mb-1 pr-6 select-none">{t('sidebar.pairModalTitle')}</h3>
                            <p className="text-xs text-[var(--text-muted)] mb-4 truncate font-medium">{pairingTarget.address} ({formatMdnsName(pairingTarget.name)})</p>
                            <input
                                autoFocus
                                type="text"
                                placeholder={t('sidebar.pairingCodePlaceholder')}
                                value={modalCode}
                                onChange={(e) => { setModalCode(e.target.value); setModalError(false); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') submitPairingModal(); }}
                                className="w-full bg-(--md-sys-color-surface-container) border border-[var(--md-sys-color-surface-container-highest)] rounded-xl px-3 py-2 text-sm text-[var(--text-base)] focus:border-primary transition-colors outline-none mb-2 font-mono"
                            />
                            {modalError && <p className="text-xs text-red-500 mb-2 font-medium">{t('sidebar.pairModalError')}</p>}
                            <button
                                onClick={submitPairingModal}
                                disabled={!modalCode || modalSubmitting}
                                className="w-full py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold transition-all hover:opacity-95 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed select-none"
                            >
                                {modalSubmitting ? t('sidebar.synchronizing') : t('common.ok')}
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold text-[var(--text-base)] mb-1 pr-6 select-none">{t('sidebar.pairModalNotReadyTitle')}</h3>
                            <p className="text-xs text-[var(--text-muted)] mb-3 truncate font-medium">{pairingTarget.address} ({formatMdnsName(pairingTarget.name)})</p>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4 font-medium">{t('sidebar.pairModalNotReadyBody')}</p>
                            <div className="flex items-center justify-center gap-2 mb-4 text-[var(--text-muted)]">
                                <Refresh size={14} className="animate-spin text-primary" />
                                <span className="text-xs font-bold">{t('sidebar.pairModalWaiting')}</span>
                            </div>
                            <button
                                onClick={() => setPairingTarget(null)}
                                className="w-full py-2.5 bg-(--md-sys-color-surface-container) text-[var(--text-base)] hover:bg-[var(--md-sys-color-surface-container-highest)] rounded-xl text-xs font-bold transition-colors cursor-pointer select-none"
                            >
                                {t('common.cancel')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}
        </>
    );
}
