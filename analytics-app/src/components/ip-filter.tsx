'use client';

import { Filter, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface IpFilterProps {
  excludedIps: string[];
  onUpdate: (ips: string[]) => void;
  allClientIds: string[];
}

export function IpFilter({ excludedIps, onUpdate, allClientIds }: IpFilterProps) {
  const [open, setOpen] = useState(false);
  const [newIp, setNewIp] = useState('');

  const addIp = (ip: string) => {
    const trimmed = ip.trim();
    if (trimmed && !excludedIps.includes(trimmed)) {
      onUpdate([...excludedIps, trimmed]);
    }
    setNewIp('');
  };

  const removeIp = (ip: string) => {
    onUpdate(excludedIps.filter(i => i !== ip));
  };

  // Get unique client IDs not already excluded
  const suggestions = Array.from(new Set(allClientIds)).filter(id => !excludedIps.includes(id));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md ${
          excludedIps.length > 0
            ? 'bg-orange-50 border-orange-300 text-orange-700'
            : 'border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Filter className="h-4 w-4" />
        Filter IPs
        {excludedIps.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full">
            {excludedIps.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-3 min-w-[280px]">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Excluded IPs</div>

            {excludedIps.length > 0 && (
              <div className="space-y-1 mb-3">
                {excludedIps.map(ip => (
                  <div
                    key={ip}
                    className="flex items-center justify-between gap-2 px-2 py-1 bg-orange-50 rounded text-sm"
                  >
                    <span className="font-mono text-xs">{ip}</span>
                    <button
                      onClick={() => removeIp(ip)}
                      className="p-0.5 hover:bg-orange-200 rounded"
                    >
                      <X className="h-3 w-3 text-orange-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-1 mb-2">
              <input
                type="text"
                placeholder="Add IP to exclude..."
                value={newIp}
                onChange={e => setNewIp(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addIp(newIp);
                }}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={() => addIp(newIp)}
                disabled={!newIp.trim()}
                className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {suggestions.length > 0 && (
              <>
                <div className="text-xs text-gray-500 mb-1">Click to exclude:</div>
                <div className="max-h-[150px] overflow-y-auto space-y-0.5">
                  {suggestions.slice(0, 20).map(id => (
                    <button
                      key={id}
                      onClick={() => addIp(id)}
                      className="block w-full text-left px-2 py-1 text-xs font-mono text-gray-700 hover:bg-gray-100 rounded truncate"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
