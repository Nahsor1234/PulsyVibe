'use client';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8 text-center">
        <h1 className="text-xl font-bold">PulsyVibe hit an unexpected error.</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">The V2 discovery and playback engine is isolated from the legacy application path. You can safely retry this page.</p>
        <button onClick={reset} className="mt-6 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground">Retry</button>
      </div>
    </main>
  );
}
