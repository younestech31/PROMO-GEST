export interface DetailKeyValueItem {
  label: string;
  value: string;
  monospace?: boolean;
}

export function DetailKeyValueList({
  items,
  columns = 2,
}: {
  items: readonly DetailKeyValueItem[];
  columns?: 1 | 2 | 3;
}) {
  const gridClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2';

  return (
    <dl className={`grid ${gridClass} gap-3 text-xs`}>
      {items.map((item) => (
        <div key={item.label} className="rounded border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-[11px] font-medium text-slate-500">{item.label}</dt>
          <dd className={`mt-0.5 font-semibold text-slate-900 ${item.monospace ? 'font-data' : ''}`}>
            {item.value || '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
