export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-primary/20" />
        <p className="text-sm font-medium text-muted-foreground">Loading PulsyVibe V2…</p>
      </div>
    </main>
  );
}
