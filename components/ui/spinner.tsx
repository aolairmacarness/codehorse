export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`size-5 animate-spin rounded-full border-2 border-muted border-t-foreground ${className ?? ""}`}
      role="status"
      aria-label="Loading"
    />
  );
}
