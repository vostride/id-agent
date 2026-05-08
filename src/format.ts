export function formatId(prefix: string | undefined, body: string): string {
  return prefix ? `${prefix}_${body}` : body
}
