import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Logo } from './Logo';

interface InfoModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  title,
  content,
  onClose,
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#F9F8F6] border-b border-gray-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-mono text-[10px] font-bold text-[#1A1A1B] uppercase tracking-wider">
              {title.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-4">
          <h3 className="text-xl font-bold text-[#1A1A1B]">{title}</h3>
          <p className="text-sm text-[#1A1A1B]/70 leading-relaxed whitespace-pre-line font-sans">
            {content}
          </p>

          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="bg-[#1A1A1B] hover:bg-[#2A2A2B] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

