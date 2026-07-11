export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-hint">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
