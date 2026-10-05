'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSharedPlan, type SharedPlan } from '@/lib/api';

const PlanMap = dynamic(() => import('@/components/PlanMap'), { ssr: false });

export default function SharedPlanPage({ params }: { params: { id: string } }) {
  const [plan, setPlan] = useState<SharedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSharedPlan(params.id)
      .then(setPlan)
      .catch((e) => setError(e instanceof Error ? e.message : 'Plan not found'));
  }, [params.id]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-400">{error}</p>
        <Link href="/" className="mt-4 rounded-full bg-taste-600 px-5 py-2.5 text-sm font-bold">
          Plan your own evening
        </Link>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center">
        <p className="text-slate-400">Loading the plan…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-10">
      <header className="py-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-taste-500">TasteRoute</p>
        <h1 className="mt-1 text-2xl font-extrabold">A shared evening</h1>
        {plan.itinerary.summary && (
          <p className="mt-2 text-sm text-slate-400">{plan.itinerary.summary}</p>
        )}
      </header>

      <PlanMap stops={plan.itinerary.stops} />

      <ol className="mt-4 space-y-3">
        {plan.itinerary.stops.map((s, i) => (
          <li key={s.qlooId ?? i} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
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
          </li>
        ))}
      </ol>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block rounded-full bg-taste-600 px-6 py-3 text-sm font-bold hover:bg-taste-500"
        >
          Plan your own evening
        </Link>
      </div>
    </main>
  );
}
