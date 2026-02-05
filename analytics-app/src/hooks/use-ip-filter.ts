'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'analytics-excluded-ips';

export function useIpFilter(): [string[], (ips: string[]) => void] {
  const [excludedIps, setExcludedIps] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setExcludedIps(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const updateExcludedIps = (ips: string[]) => {
    const cleaned = ips.map(ip => ip.trim()).filter(Boolean);
    setExcludedIps(cleaned);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  };

  return [excludedIps, updateExcludedIps];
}
