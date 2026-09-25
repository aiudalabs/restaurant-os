export function Spinner({ full = false }: { full?: boolean }) {
  const ring = <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />;
  if (!full) return ring;
  return <div className="flex h-full items-center justify-center">{ring}</div>;
}
