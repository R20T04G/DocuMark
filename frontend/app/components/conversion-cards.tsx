'use client';

type ConversionInfoCardProps = {
  title: string;
  description: string;
  badge: string;
  note?: string;
};

type ConversionChoiceCardProps = {
  title: string;
  description: string;
  helper: string;
  badge: string;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type ConversionMetricCardProps = {
  label: string;
  value: string;
};

export function ConversionInfoCard({ title, description, badge, note }: ConversionInfoCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-white/20 hover:bg-slate-950/70">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-500">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
      {note ? <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p> : null}
    </article>
  );
}

export function ConversionChoiceCard({
  title,
  description,
  helper,
  badge,
  isSelected,
  disabled,
  onSelect,
}: ConversionChoiceCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left transition ${isSelected ? 'border-amber-300/60 bg-amber-300/10 shadow-lg shadow-amber-300/10' : 'border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-slate-950/80'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-500">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
    </button>
  );
}

export function ConversionMetricCard({ label, value }: ConversionMetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-black/10">
      <dt className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-sm leading-6 text-slate-100">{value}</dd>
    </div>
  );
}