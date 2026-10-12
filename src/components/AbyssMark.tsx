export function AbyssMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}
