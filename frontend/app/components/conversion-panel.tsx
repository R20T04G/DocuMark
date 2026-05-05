'use client';

import type { ReactNode } from 'react';

type ConversionPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ConversionPanel({ eyebrow, title, description, action, children, className }: ConversionPanelProps) {
  return (
    <section className={`rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl ${className ?? ''}`.trim()}>
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.34em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{description}</p>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="pt-6">{children}</div>
    </section>
  );
}