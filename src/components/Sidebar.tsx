import React from 'react';
import { Smartphone, RefreshCw, Usb, Wifi, UploadCloud, Zap, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { MdnsDevice, isMdnsDeviceConnected } from '../hooks/useScrcpy';

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
            <div className="glass p-4 rounded-xl space-y-4 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-zinc-800/50 pb-2 mb-1">
                    <h2 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-zinc-400">
                        <Smartphone size={14} className="text-primary" />
                        {t('sidebar.deviceHub')}
                    </h2>
                    <div className="flex gap-2 items-center ml-auto">
                        <button
                            onClick={onKillAdb}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all group/zap"
                            title={t('sidebar.killAdbTitle')}
                        >
                            <Zap size={10} className="group-hover/zap:fill-red-400 group-hover/zap:scale-110 transition-all" />
                            {t('sidebar.killAdb')}
                        </button>
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className={`flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/50 hover:bg-primary/20 border border-zinc-800 hover:border-primary/30 rounded-md text-[9px] font-black uppercase tracking-widest text-primary hover:text-white transition-all group/refresh ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw size={10} className={`group-hover/refresh:rotate-180 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? t('sidebar.syncing') : t('sidebar.refresh')}
                        </button>
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
                                        <div className={`p-1.5 rounded-md transition-colors ${isSelected ? 'bg-primary text-on-primary' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>
                                            <Smartphone size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[11px] font-bold truncate tracking-tight ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{formatDeviceLabel(d)}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {isRunning ? (
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse" />
                                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{t('sidebar.live')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t('sidebar.ready')}</span>
                                                )}
                                                {d.includes('.') ? (
                                                    <span className="flex items-center gap-1 bg-primary/10 px-1 py-0.5 rounded border border-primary/20">
                                                        <Wifi size={8} className="text-primary" />
                                                        <span className="text-[7px] font-black text-primary uppercase tracking-tighter">{t('sidebar.wifi')}</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">
                                                        <Usb size={8} className="text-zinc-400" />
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

                    <div className="bg-black/40 p-1 rounded-lg flex gap-1 border border-zinc-800/50">
                        <button
                            onClick={() => setActiveTab('usb')}
                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-md transition-all ${activeTab === 'usb' ? 'bg-primary text-on-primary shadow-lg translate-y-[-1px]' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Usb size={11} /> {t('sidebar.usb')}
                        </button>
                        <button
                            onClick={() => setActiveTab('wireless')}
                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-md transition-all ${activeTab === 'wireless' ? 'bg-primary text-on-primary shadow-lg translate-y-[-1px]' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Wifi size={11} /> {t('sidebar.wireless')}
                        </button>
                    </div>

                    {activeTab === 'usb' && (
                        <div className="pt-1">
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-primary rounded-full" />
                                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">{t('sidebar.usbSetupTip')}</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                    {t('sidebar.usbSetupTipTextBefore')} <span className="text-zinc-300 underline decoration-primary/30 decoration-dashed">{t('sidebar.usbSetupTipDeveloperOptions')}</span> {t('sidebar.usbSetupTipAnd')} <span className="text-zinc-300 underline decoration-primary/30 decoration-dashed">{t('sidebar.usbSetupTipUsbDebugging')}</span> {t('sidebar.usbSetupTipTextAfter')}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'wireless' && (
                        <div className="space-y-5 pt-2">
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-primary rounded-full" />
                                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">{t('sidebar.wirelessSetupTip')}</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                    {t('sidebar.wirelessSetupTipTextBefore')} <span className="text-zinc-300 underline decoration-primary/30 decoration-dashed">{t('sidebar.wirelessSetupTipSameWifi')}</span> {t('sidebar.wirelessSetupTipAnd')} <span className="text-zinc-300 underline decoration-primary/30 decoration-dashed">{t('sidebar.wirelessSetupTipWirelessDebugging')}</span>{t('sidebar.wirelessSetupTipTextAfter')}
                                </p>
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
                                    className={`w-full py-1.5 border border-zinc-800 hover:border-primary/50 hover:bg-primary/5 text-zinc-500 hover:text-primary rounded-lg text-[10px] font-black uppercase transition-all active:scale-[0.98] ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isRefreshing ? t('sidebar.synchronizing') : t('sidebar.startPairing')}
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </div>

            <div
                onClick={onFilePush}
                className="glass p-5 rounded-xl flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-primary/5 transition-all border-2 border-dashed border-zinc-800/50 hover:border-primary/30 group bg-zinc-900/40 backdrop-blur-md"
            >
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                    <UploadCloud className="text-primary group-hover:scale-110 transition-transform" size={24} />
                </div>
                <div className="text-center">
                    <h3 className="text-[11px] font-black text-zinc-300 uppercase tracking-widest">{t('sidebar.flashPushFiles')}</h3>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter mt-1 opacity-60">{t('sidebar.flashPushSubtitle')}</p>
                </div>
            </div>
        </aside>

        {pairingTarget && (
            <div
                className="fixed inset-0 z-[300] flex items-center justify-center p-6 sm:p-8"
                onClick={(e) => { if (e.target === e.currentTarget) setPairingTarget(null); }}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                <div className="relative w-full max-w-sm bg-zinc-950/90 border border-primary/30 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-2xl p-6">
                    <button
                        onClick={() => setPairingTarget(null)}
                        className="absolute top-4 right-4 p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all active:scale-90"
                    >
                        <X size={18} />
                    </button>
                    {pairingTarget.service.includes('_adb-tls-pairing') ? (
                        <>
                            <h3 className="text-base font-black uppercase tracking-tight text-white mb-1 pr-6">{t('sidebar.pairModalTitle')}</h3>
                            <p className="text-[11px] text-zinc-500 mb-4 truncate">{pairingTarget.address} ({formatMdnsName(pairingTarget.name)})</p>
                            <input
                                autoFocus
                                type="text"
                                placeholder={t('sidebar.pairingCodePlaceholder')}
                                value={modalCode}
                                onChange={(e) => { setModalCode(e.target.value); setModalError(false); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') submitPairingModal(); }}
                                className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-primary/40 transition-all outline-none mb-2"
                            />
                            {modalError && <p className="text-[10px] text-red-400 mb-2">{t('sidebar.pairModalError')}</p>}
                            <button
                                onClick={submitPairingModal}
                                disabled={!modalCode || modalSubmitting}
                                className="w-full py-2.5 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {modalSubmitting ? t('sidebar.synchronizing') : t('common.ok')}
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-base font-black uppercase tracking-tight text-white mb-1 pr-6">{t('sidebar.pairModalNotReadyTitle')}</h3>
                            <p className="text-[11px] text-zinc-500 mb-4 truncate">{pairingTarget.address} ({formatMdnsName(pairingTarget.name)})</p>
                            <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">{t('sidebar.pairModalNotReadyBody')}</p>
                            <div className="flex items-center justify-center gap-2 mb-4 text-zinc-500">
                                <RefreshCw size={12} className="animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{t('sidebar.pairModalWaiting')}</span>
                            </div>
                            <button
                                onClick={() => setPairingTarget(null)}
                                className="w-full py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
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
