'use client';

import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { ColumnConfig } from '@/lib/types';

interface ColumnSelectorProps {
  columns: ColumnConfig[];
  onToggle: (key: string, visible: boolean) => void;
}

export function ColumnSelector({ columns, onToggle }: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <Settings2 className="h-4 w-4" />
        Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-3 min-w-[180px]">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">
              Show/Hide Columns
            </div>
            {columns.map(col => (
              <label
                key={col.key}
                className="flex items-center gap-2 py-1 cursor-pointer text-sm hover:bg-gray-50 px-1 rounded"
              >
                <Checkbox
                  checked={col.visible}
                  onCheckedChange={checked => onToggle(col.key, checked === true)}
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
