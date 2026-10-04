/**
 * Classic Enterprise Modal Component
 * نافذة حوارية منبثقة بتصميم مكتبي أنيق
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'lg',
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '4xl': 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print animate-fade-in">
      <div
        className={`w-full ${widthClasses[width]} bg-white rounded-lg shadow-2xl border-2 border-[#1B3A5C] flex flex-col max-h-[92vh] overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#1B3A5C] text-white px-5 py-3 border-b-2 border-[#c49a37] flex items-center justify-between select-none">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-300">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#f8fafc]">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="bg-slate-100 px-5 py-3 border-t border-slate-300 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
