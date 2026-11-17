import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface FilterToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  isRtl?: boolean;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  isRtl = true,
  filters,
  actions,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-0">
        <div className="relative flex-1 min-w-[210px] max-w-md">
          <Search
            className={`h-4 w-4 text-slate-400 absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'}`}
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full rounded-md border border-slate-300 bg-white py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 ${
              isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>
        {filters}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
