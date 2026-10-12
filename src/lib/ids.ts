export function createId(prefix: string): string {
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `${prefix}-${id}`;
}
