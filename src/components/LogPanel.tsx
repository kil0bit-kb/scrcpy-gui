import { useRef, useEffect, useState, memo } from 'react';
import { Terminal, Download, Delete } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../i18n';

interface LogPanelProps {
    logs: string[];
    onClear: () => void;
    onAddLog?: (msg: string) => void;
    onRunCommand?: (cmd: string) => void;
}

const CONSTANT_TAG_COLORS = [
  'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-lime-500/20 text-lime-300 border-lime-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-sky-500/20 text-sky-300 border-sky-500/30',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function parseLogLine(log: string) {
  const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const upper = log.toUpperCase();
  const tagMatch = log.match(/^\[([A-Za-z0-9_:\- ]+)\]\s*(.*)/);
  let tag: string | null = null;
  let content = log;

  if (tagMatch) {
    tag = tagMatch[1];
    content = tagMatch[2];
  }

  if (upper.includes('ERROR') || upper.includes('FAIL') || upper.includes('CRITICAL') || upper.includes('FATAL')) {
    return {
      timestamp,
      tag: tag || 'ERROR',
      tagColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
      textColor: 'text-red-300 font-semibold',
      content
    };
  }
  if (upper.includes('WARN')) {
    return {
      timestamp,
      tag: tag || 'WARN',
      tagColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      textColor: 'text-amber-200',
      content
    };
  }
  if (upper.includes('SUCCESS') || upper.includes('CONNECTED') || upper.includes('READY') || upper.includes('SAVED')) {
    return {
      timestamp,
      tag: tag || 'OK',
      tagColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      textColor: 'text-emerald-300',
      content
    };
  }
  if (upper.startsWith('$') || upper.startsWith('>') || upper.includes('EXEC') || upper.includes('CMD')) {
    return {
      timestamp,
      tag: tag || 'CMD',
      tagColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      textColor: 'text-cyan-200',
      content
    };
  }
  if (upper.includes('DEBUG') || upper.includes('VERBOSE')) {
    return {
      timestamp,
      tag: tag || 'DEBUG',
      tagColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      textColor: 'text-purple-300',
      content
    };
  }

  const colorIndex = tag ? hashString(tag) % CONSTANT_TAG_COLORS.length : hashString(log) % CONSTANT_TAG_COLORS.length;
  return {
    timestamp,
    tag: tag || 'INFO',
    tagColor: `${CONSTANT_TAG_COLORS[colorIndex]} border`,
    textColor: 'text-[#e5e5e5] font-medium',
    content
  };
}

const LogPanel = memo(({ logs, onClear, onAddLog, onRunCommand }: LogPanelProps) => {
    const { t } = useI18n();
    const containerRef = useRef<HTMLDivElement>(null);
    const [command, setCommand] = useState("");

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs.length]); // Only trigger scroll on length change

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && command.trim()) {
            onRunCommand?.(command.trim());
            setCommand("");
        }
    };

    return (
        <div
            style={{ backgroundColor: '#232323', color: '#e5e5e5' }}
            className="rounded-2xl h-[340px] flex-none overflow-hidden flex flex-col relative border border-zinc-700/60"
        >
            {/* Top Bar Header Row (Dark #1c1c1c) */}
            <div
                style={{ backgroundColor: '#1c1c1c', color: '#e5e5e5' }}
                className="px-4 py-2.5 flex justify-between items-center shrink-0 border-b border-zinc-700/60 font-sans"
            >
                <div className="flex items-center gap-2.5 font-sans">
                    <Terminal size={18} className="text-primary shrink-0" />
                    <h2 style={{ color: '#e5e5e5' }} className="text-card-title uppercase font-sans">Shell</h2>
                </div>
                <div className="flex gap-2 shrink-0 items-center font-sans">
                    <button
                        onClick={async () => {
                            const storageData: Record<string, string> = {};
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key) storageData[key] = localStorage.getItem(key) || "";
                            }

                            const data = {
                                timestamp: new Date().toISOString(),
                                localStorage: storageData,
                                logs: logs
                            };

                            const jsonString = JSON.stringify(data, null, 2);
                            const fileName = `scrcpy-gui-logs-${Date.now()}.json`;

                            try {
                                await invoke('save_report', {
                                    content: jsonString,
                                    name: fileName
                                });
                                if (onAddLog) {
                                    onAddLog(t('logPanel.diagnosticReportSaved', { fileName }));
                                } else {
                                    alert(t('logPanel.reportSavedAlert', { fileName }));
                                }
                            } catch (e) {
                                console.warn("Tauri save_report failed, triggering browser file download fallback:", e);
                                const blob = new Blob([jsonString], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                if (onAddLog) {
                                    onAddLog(t('logPanel.diagnosticReportSaved', { fileName }));
                                }
                            }
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-black bg-primary text-on-primary hover:opacity-90 transition-all duration-75 ease-out px-3 py-1.5 rounded-full cursor-pointer shadow-sm"
                        title={t('logPanel.reportTitle')}
                    >
                        <Download size={16} color="currentColor" className="shrink-0 fill-current" />
                        <span>{t('logPanel.report')}</span>
                    </button>
                    <button
                        onClick={() => {
                            onClear();
                            if (onAddLog) onAddLog("System logs cleared");
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-black text-white bg-red-600 hover:bg-red-500 transition-all duration-75 ease-out px-3 py-1.5 rounded-full cursor-pointer shadow-sm"
                    >
                        <Delete size={16} color="white" className="shrink-0 text-white fill-current" />
                        <span>{t('logPanel.clear')}</span>
                    </button>
                </div>
            </div>

            {/* Terminal Body (#232323) */}
            <div
                ref={containerRef}
                style={{ backgroundColor: '#232323', color: '#e5e5e5' }}
                className="flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar font-shell-console text-[11px]"
            >
                {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center font-shell-console">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase font-shell-console">{t('logPanel.waitingForSequence')}</span>
                    </div>
                ) : (
                    <div className="space-y-1 font-shell-console">
                        {logs.map((log, i) => {
                            const parsed = parseLogLine(log);
                            return (
                                <div key={i} className="group flex items-center gap-2 text-[11px] leading-relaxed py-0.5 transition-colors pl-1 hover:bg-white/[0.04] rounded px-1 font-shell-console">
                                    <span className="text-zinc-400 font-shell-console text-[10px] font-bold shrink-0 tabular-nums">
                                        {parsed.timestamp}
                                    </span>
                                    {parsed.tag && (
                                        <span className={`text-[10px] font-black uppercase px-1 py-0 rounded-sm ${parsed.tagColor} shrink-0 tracking-wider font-shell-console`}>
                                            {parsed.tag}
                                        </span>
                                    )}
                                    <span className={`font-shell-console text-[11px] break-all selection:bg-primary selection:text-black ${parsed.textColor}`}>
                                        {parsed.content}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Terminal Input (#1c1c1c) */}
            <div
                style={{ backgroundColor: '#1c1c1c', color: '#e5e5e5' }}
                className="px-4 py-3 flex items-center gap-2.5 shrink-0 group border-t border-zinc-700/60 min-h-[44px] font-shell-console"
            >
                <span className="text-primary font-black text-[13px] select-none font-shell-console">$</span>
                <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('logPanel.terminalPlaceholder')}
                    style={{ color: '#e5e5e5' }}
                    className="flex-1 bg-transparent border-none outline-none text-[12px] placeholder:text-zinc-500 font-shell-console transition-colors py-0.5"
                />
            </div>
        </div>
    );
});

export default LogPanel;
