import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useI18n } from "../i18n";
import ThemedModal from "./ThemedModal";

interface HeaderProps {
  version: string;
}

export default function Header({ version }: HeaderProps) {
  const { t } = useI18n();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="w-full px-6 py-4 flex items-center justify-between gap-4 z-40 relative">
      {/* Setup Guide Modal */}
      <ThemedModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title={t("header.setupHelpTitle")}
        icon={<HelpCircle size={28} />}
        confirmText={t("header.gotIt")}
      >
        <div className="space-y-3 text-xs text-[var(--text-muted)] font-sans">
          <p>
            <strong className="text-[var(--text-base)] block mb-0.5 font-bold">
              1. {t("header.usbDebuggingTitle")}
            </strong>
            {t("header.usbDebuggingDesc")}
          </p>
          <p>
            <strong className="text-[var(--text-base)] block mb-0.5 font-bold">
              2. {t("header.connectDeviceTitle")}
            </strong>
            {t("header.connectDeviceDesc")}
          </p>
          <p>
            <strong className="text-[var(--text-base)] block mb-0.5 font-bold">
              3. {t("header.otgModeTitle")}
            </strong>
            {t("header.otgModeDesc")}
          </p>
        </div>
      </ThemedModal>

      {/* Branding - Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-1">
          <h1 className="text-display-brand text-[var(--text-base)] inline-flex items-baseline gap-1">
            <span>SCRCPY</span>
            <span className="text-primary">GUI</span>
          </h1>
          <span className="text-[10px] font-black text-primary">
            v{version}
          </span>
        </div>
      </div>

      {/* Header Actions - Far Right */}
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setShowHelp(true)}
          className="px-3 py-1.5 glass rounded-full text-primary hover:text-white transition-all flex items-center gap-2 group/help cursor-pointer"
          title={t("header.setupHelpTitle")}
        >
          <HelpCircle
            size={16}
            className="group-hover/help:rotate-12 transition-transform"
          />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {t("header.setupHelp")}
          </span>
        </button>
      </div>
    </header>
  );
}
