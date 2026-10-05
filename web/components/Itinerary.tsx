'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { PlanPayload } from '@/lib/api';

const PlanMap = dynamic(() => import('./PlanMap'), { ssr: false });

export default function Itinerary({ plan }: { plan: PlanPayload }) {
  const [copied, setCopied] = useState(false);
  const stops = plan.itinerary.stops;

  async function share() {
    const url = `${window.location.origin}/plan/${plan.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard unavailable — fall back to prompt-free selection
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Your evening, mapped</h2>
        <button
          onClick={share}
          className="rounded-full bg-taste-600 px-4 py-2 text-sm font-semibold hover:bg-taste-500"
        >
          {copied ? 'Link copied!' : 'Share plan'}
        </button>
      </div>

      {plan.itinerary.summary && (
        <p className="text-sm text-slate-400">{plan.itinerary.summary}</p>
      )}

      <PlanMap stops={stops} />

      <ol className="space-y-3">
        {stops.map((s, i) => (
          <li key={s.qlooId ?? i} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-taste-600 text-xs">
                    {i + 1}
                  </span>
                  {s.name}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  <span className="font-medium text-taste-100">Why: </span>
                  {s.rationale}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-taste-100">
                {Math.round(s.affinity * 100)}% match
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
