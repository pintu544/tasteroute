'use client';

import { useEffect, useRef, useState } from 'react';
import Itinerary from '@/components/Itinerary';
import { postPlan, type PlanPayload } from '@/lib/api';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

const SESSION_KEY = 'tasteroute.sessionId';

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: "Tell me about your evening — the occasion, the vibe, and what you love. Music, films, food… your taste plans the night.",
    },
  ]);
  const [input, setInput] = useState('');
  const [plan, setPlan] = useState<PlanPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    setError(null);
    setMessages((m) => [...m, { role: 'user', text: message }]);
    setInput('');
    setLoading(true);
    try {
      const sessionId = localStorage.getItem(SESSION_KEY) ?? undefined;
      const res = await postPlan(message, sessionId);
      localStorage.setItem(SESSION_KEY, res.sessionId);
      setMessages((m) => [...m, { role: 'assistant', text: res.reply }]);
      if (res.plan) setPlan(res.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      setMessages((m) => m.slice(0, m.lastIndexOf(lastUser)));
      send(lastUser.text);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-6">
      <header className="py-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-taste-500">TasteRoute</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Plans with <span className="text-taste-500">taste</span>
        </h1>
      </header>

      <div className="flex-1 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-taste-600 text-white' : 'bg-slate-900 text-slate-200'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-400">
              Reading your taste…
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm">
            <p className="text-red-300">Couldn't plan that: {error}</p>
            <button
              onClick={retry}
              className="mt-2 rounded-full bg-red-800 px-4 py-1.5 text-xs font-semibold hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {plan && <Itinerary plan={plan} />}

      <form
        className="sticky bottom-0 mt-6 flex gap-2 bg-slate-950 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Anniversary dinner — we love jazz and sushi…"
          className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-taste-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full bg-taste-600 px-5 py-3 text-sm font-bold disabled:opacity-40 hover:bg-taste-500"
        >
          Plan
        </button>
      </form>
    </main>
  );
}
