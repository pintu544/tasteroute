'use client';

import { useEffect, useState } from 'react';
import { apiHealth } from '@/lib/api';
import { formatApiVersion } from '@/lib/version';

export default function Footer() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiHealth()
      .then((h) => {
        if (!cancelled) setVersion(formatApiVersion(h));
      })
      .catch(() => {
        // Unreachable API: footer simply renders without the version.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="py-4 text-center text-xs text-slate-500">
      {version && <span data-testid="api-version">{version}</span>}
    </footer>
  );
}
