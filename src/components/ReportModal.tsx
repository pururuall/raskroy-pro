import React from "react";
import { CutConfig, CuttingPlan, DocumentMeta, AppSettings } from "../types";
import { PrintReport } from "./PrintReport";
import { Printer, X } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: CuttingPlan;
  meta: DocumentMeta;
  onMetaChange: (meta: DocumentMeta) => void;
  config: CutConfig;
  settings?: AppSettings;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  plan,
  meta,
  onMetaChange,
  config,
  settings,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto no-print">
      <div className="bg-[#17171a] border border-white/[0.1] rounded-xl max-w-[1020px] w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Toolbar */}
        <div className="p-3.5 px-6 border-b border-white/[0.08] flex items-center justify-between bg-[#121214]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-[#ededed]">Предпросмотр наряда на раскрой</h2>
            <span className="text-[11px] text-[#9ea3ae] bg-[#222226] px-2 py-0.5 rounded font-mono">
              Формат А4 &bull; АО «Мобиль»
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-medium bg-[#dd4b19] hover:bg-[#c53f12] text-white px-4 py-1.5 rounded transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать / В PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#9ea3ae] hover:text-[#ededed] rounded transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Container (Preview) */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#26262b] flex justify-center">
          <div className="w-full max-w-[850px] shadow-2xl rounded-sm">
            <PrintReport
              plan={plan}
              meta={meta}
              onMetaChange={onMetaChange}
              cutWidth={config.cut_width}
              trimLeft={config.trim_left}
              trimRight={config.trim_right}
              minRemnant={config.min_remnant}
              twoProfiles={config.two_profiles}
              settings={settings}
              isPreview={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
