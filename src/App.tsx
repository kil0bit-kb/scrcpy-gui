import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import Sidebar from "./components/Sidebar";
import ControlPanel from "./components/ControlPanel";
import LogPanel from "./components/LogPanel";
import Header from "./components/Header";
import SessionBehavior from "./components/SessionBehavior";
import ShortcutsPanel from "./components/ShortcutsPanel";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import OnboardingModal from "./components/OnboardingModal";
import ThemedModal from "./components/ThemedModal";
import { useScrcpy } from "./hooks/useScrcpy";
import { getVersion } from '@tauri-apps/api/app';
import { useI18n } from "./i18n";

function App() {
  const { t } = useI18n();
  const {
    devices,
    deviceModels,
    deviceFriendlyNames,
    logs,
    activeDevice,
    setActiveDevice,
    refreshDevices,
    refreshDevicesUntilSettled,
    runScrcpy,
    stopScrcpy,
    downloadScrcpy,
    checkScrcpy,
    scrcpyStatus,
    setLogs,
    isDownloading,
    downloadProgress,
    pairDevice,
    connectDevice,
    listScrcpyOptions,
    runTerminalCommand,
    runningDevices,
    isRefreshing,
    sessionRunning,
    clearLogs,
    detectedCameras,
    renderDriverSupport,
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
    isOnboardingOpen,
    setIsOnboardingOpen,
    completeOnboarding
  } = useScrcpy();

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    kind: 'warning' | 'error' | 'info' | 'success';
    actionLabel?: string;
    onAction?: () => void;
    showCancel?: boolean;
    cancelLabel?: string;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    kind: 'info'
  });

  const [appVersion, setAppVersion] = useState("3.3.0");
  const [lastCheckedPath, setLastCheckedPath] = useState<string | undefined>(undefined);
  const [hasCheckedUpdate, setHasCheckedUpdate] = useState(false);
  const trayHiddenRef = useRef(false);

  const showAlert = (
    title: string,
    message: string,
    kind: 'warning' | 'error' | 'info' | 'success' = 'info',
    actionLabel = 'OK',
    onAction?: () => void,
    showCancel = false,
    cancelLabel = 'Cancel',
    onCancel?: () => void
  ) => {
    setAlertState({
      isOpen: true,
      title,
      message,
      kind,
      actionLabel,
      onAction,
      showCancel,
      cancelLabel,
      onCancel
    });
  };

  useEffect(() => {
    // Initial setup: fetch version for the header
    const initApp = async () => {
      try {
        const startedAt = performance.now();
        const v = await getVersion();
        setAppVersion(v);
        console.info(`[startup] version loaded in ${Math.round(performance.now() - startedAt)}ms`);
      } catch (e) {
        console.error("Initialization failed:", e);
      }
    };

    void initApp();
  }, []);

  useEffect(() => {
    // Initial check (once on mount) - Silent to avoid log clatter. adb's own
    // reconnect of an already-paired device can lag a beat behind the app
    // opening, so keep checking briefly instead of a single refresh that
    // might land before adb has caught up.
    checkScrcpy(config.scrcpyPath);
    refreshDevicesUntilSettled(config.scrcpyPath);
  }, []);

  useEffect(() => {
    if (scrcpyStatus.found && (!hasCheckedUpdate || config.scrcpyPath !== lastCheckedPath) && !isDownloading) {
      setHasCheckedUpdate(true);
      setLastCheckedPath(config.scrcpyPath);
      
      const runCheck = async () => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const updateRes: any = await invoke('check_scrcpy_update', { customPath: config.scrcpyPath });
          if (updateRes && updateRes.update_available) {
            showAlert(
              t('alerts.updateAvailableTitle'),
              t('alerts.updateAvailableMessage', {
                local: updateRes.local_version || 'unknown',
                latest: updateRes.latest_version || 'unknown'
              }),
              'info',
              t('alerts.updateBtn'),
              async () => {
                if (config.scrcpyPath) {
                  setConfig(prev => ({ ...prev, scrcpyPath: undefined }));
                }
                await downloadScrcpy();
              },
              true,
              t('alerts.cancelBtn')
            );
          }
        } catch (e) {
          console.error("Failed to check for scrcpy updates:", e);
        }
      };
      runCheck();
    } else if (!scrcpyStatus.found) {
      setHasCheckedUpdate(false);
    }
  }, [scrcpyStatus.found, config.scrcpyPath, isDownloading, hasCheckedUpdate, lastCheckedPath, t]);

  useEffect(() => {
    // Global Drag and Drop Listener (re-bind only if activeDevice changes)
    const unlisten = getCurrentWindow().listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      if (!activeDevice) {
        setLogs(prev => [...prev.slice(-100), t('logs.noDeviceForDragDrop')]);
        return;
      }

      const paths = event.payload.paths;
      if (paths && paths.length > 0) {
        paths.forEach(path => handleFileOperation(path));
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [activeDevice]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let cancelled = false;

    const syncTrayState = async () => {
      try {
        const minimized = await appWindow.isMinimized();
        if (cancelled) {
          return;
        }

        if (minimized && !trayHiddenRef.current) {
          trayHiddenRef.current = true;
          await appWindow.hide();
          await appWindow.setSkipTaskbar(true);
        } else if (!minimized && trayHiddenRef.current) {
          trayHiddenRef.current = false;
          await appWindow.setSkipTaskbar(false);
        }
      } catch (error) {
        console.error("Failed to sync tray state:", error);
      }
    };

    void syncTrayState();

    const unlistenResized = appWindow.onResized(() => {
      void syncTrayState();
    });

    const pollTimer = window.setInterval(() => {
      void syncTrayState();
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      void unlistenResized.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    // Keep the Rust side's notion of "the selected device" in sync, so the
    // Ctrl+Alt+Shift+C global shortcut (a real OS-level hotkey registered in
    // shortcuts.rs, not a webview keydown listener) knows which mirror window
    // to recentre even when no app window has keyboard focus.
    const device = activeDevice && runningDevices.includes(activeDevice) ? activeDevice : null;
    (async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_active_device', { device });
    })();
  }, [activeDevice, runningDevices]);

  useEffect(() => {
    if (activeDevice) {
      setConfig(prev => ({ ...prev, device: activeDevice }));
    }
  }, [activeDevice]);

  const VALID_SHORTCUT_MODIFIERS = ['Alt', 'Ctrl', 'Ctrl+Alt'];

  const handleStart = async () => {
    if (!activeDevice) {
      showAlert(t('alerts.noDeviceSelectedTitle'), t('alerts.noDeviceSelectedMessage'), "warning");
      return;
    }
    const stored = localStorage.getItem('scrcpy_shortcut_modifier') ?? 'Alt';
    const shortcutMod = VALID_SHORTCUT_MODIFIERS.includes(stored) ? stored : 'Alt';
    await runScrcpy({ ...config, shortcutMod });
  };

  const handleStop = async () => {
    if (!activeDevice) return;
    await stopScrcpy(activeDevice);
  };

  const handleRefresh = () => {
    refreshDevices();
  };

  const handleKillAdb = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('kill_adb', { customPath: config.scrcpyPath });
      refreshDevices(config.scrcpyPath);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileOperation = async (path: string) => {
    if (!activeDevice) return;

    const isApk = path.toLowerCase().endsWith('.apk');
    if (isApk) {
      await installApk(activeDevice, path);
    } else {
      await pushFile(activeDevice, path);
    }
  };

  const handleFileBrowse = async () => {
    if (!activeDevice) return;
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'All Files',
            extensions: ['*']
          },
          {
            name: 'Android App (APK)',
            extensions: ['apk']
          }
        ]
      });

      if (selected) {
        if (Array.isArray(selected)) {
          selected.forEach(path => handleFileOperation(path));
        } else {
          handleFileOperation(selected);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetPath = async () => {
    try {
      let startPath = config.scrcpyPath;
      if (!startPath) {
        const { invoke } = await import('@tauri-apps/api/core');
        startPath = await invoke<string>('get_scrcpy_bin_dir').catch(() => '');
      }
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: startPath || undefined
      });
      if (selected && typeof selected === 'string') {
        setConfig(prev => ({ ...prev, scrcpyPath: selected }));
        setLogs(prev => [...prev.slice(-100), t('logs.customScrcpyPathSet', { path: selected })]);
        // Trigger a check with the new path
        setTimeout(() => checkScrcpy(selected), 100);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPath = async () => {
    setConfig(prev => ({ ...prev, scrcpyPath: undefined }));
    setLogs(prev => [...prev.slice(-100), t('logs.customScrcpyPathCleared')]);
    // Trigger a check with no custom path
    setTimeout(() => checkScrcpy(undefined), 100);
  };

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen font-sans selection:bg-primary selection:text-on-primary overflow-hidden flex flex-col transition-opacity duration-1000 ease-in-out" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-base)', opacity: 0, animation: 'fadeIn 0.8s ease-out forwards' }}>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
        <div className="fixed top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col h-screen transition-all duration-700">
          <Header
            onThemeChange={setTheme}
            currentTheme={theme}
            colorMode={colorMode}
            onColorModeChange={setColorMode}
            binaryStatus={scrcpyStatus}
            onDownload={downloadScrcpy}
            onSetPath={handleSetPath}
            onResetPath={handleResetPath}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            version={appVersion}
          />

          <div className="flex-1 overflow-y-auto flex flex-col pt-6 custom-scrollbar">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 px-6 pb-6">
              <div className="lg:col-span-3 flex flex-col">
                <div className="transition-all duration-700">
                  <Sidebar
                    devices={devices}
                    deviceModels={deviceModels}
                    deviceFriendlyNames={deviceFriendlyNames}
                    runningDevices={runningDevices}
                    onRefresh={handleRefresh}
                    onKillAdb={handleKillAdb}
                    selectedDevice={activeDevice}
                    onSelectDevice={setActiveDevice}
                    onPair={pairDevice}
                    onConnect={connectDevice}
                    isRefreshing={isRefreshing}
                    onFilePush={handleFileBrowse}
                    historyDevices={historyDevices}
                    clearHistory={clearHistory}
                    mdnsDevices={mdnsDevices}
                  />
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col gap-6 relative z-20">
                <div className="relative z-30">
                  <ControlPanel
                    config={config}
                    setConfig={setConfig}
                    onStart={handleStart}
                    onStop={handleStop}
                    isRunning={sessionRunning}
                    detectedCameras={detectedCameras}
                    renderDriverSupport={renderDriverSupport}
                    onListOptions={(arg) => {
                      if (activeDevice) {
                        listScrcpyOptions(activeDevice, arg);
                      }
                    }}
                  />
                </div>
                <div className="relative z-10">
                  <LogPanel
                    logs={logs}
                    onClear={clearLogs}
                    onAddLog={(msg) => setLogs((prev: string[]) => [...prev.slice(-100), msg])}
                    onRunCommand={runTerminalCommand}
                  />
                </div>
              </div>

              <div className="lg:col-span-3 flex flex-col gap-6">
                <SessionBehavior config={config} setConfig={setConfig} />
                <ShortcutsPanel />
              </div>
            </div>

            <Footer version={appVersion} />
          </div>
        </div>

        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          binaryStatus={scrcpyStatus}
          onDownload={downloadScrcpy}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          onComplete={completeOnboarding}
        />

        <ThemedModal
          isOpen={alertState.isOpen}
          onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
          title={alertState.title}
          message={alertState.message}
          kind={alertState.kind}
          actionLabel={alertState.actionLabel}
          onAction={alertState.onAction}
          showCancel={alertState.showCancel}
          cancelLabel={alertState.cancelLabel}
          onCancel={alertState.onCancel}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
