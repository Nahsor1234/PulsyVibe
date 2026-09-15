'use client';

export default function V2Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8 text-center">
        <h1 className="text-xl font-bold">PulsyVibe V2 hit an unexpected error.</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">The discovery and playback engine is isolated from this route, so you can safely retry without affecting V1.</p>
        <button onClick={reset} className="mt-6 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground">Retry</button>
      </div>
    </main>
  );
}
