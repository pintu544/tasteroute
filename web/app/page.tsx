export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-taste-500">TasteRoute</p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
        Plans with <span className="text-taste-500">taste</span>.
      </h1>
      <p className="mt-4 max-w-md text-slate-400">
        Tell the agent your vibe — it reads your taste from Qloo&apos;s cultural graph and plans
        your evening on a map. Chat + itinerary land in T-6.
      </p>
    </main>
  );
}
