'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function BottomSheet({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] md:hidden" role="presentation">
      <button
        aria-label="Close sheet"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pulsyvibe-sheet-title"
        className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border border-white/10 bg-[#151515] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15" />
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 id="pulsyvibe-sheet-title" className="text-base font-bold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-full bg-white/[0.06] p-2"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
