'use client';

import type { ReactNode } from 'react';

export function SettingRow({ icon, title, description, value, onClick }: { icon: ReactNode; title: string; description: string; value: string; onClick?: () => void }) {
  return <button disabled={!onClick} onClick={onClick} className="flex w-full items-center gap-3 border-b border-white/[0.06] py-5 text-left last:border-0 disabled:cursor-default"><span className="rounded-xl bg-white/[0.05] p-2.5">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] capitalize">{value}</span></button>;
}
