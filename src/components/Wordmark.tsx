import { AbyssMark } from "./AbyssMark";

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <AbyssMark className="h-6 w-6" />
      <span className="font-serif text-lg tracking-[-0.03em]">BuildHub</span>
    </span>
  );
}
