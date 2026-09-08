// Coerce anything thrown into a human-readable string.
// supabase-js throws PostgrestError-shaped objects that aren't `instanceof Error`,
// so plain `String(e)` produces "[object Object]". This handles both.
export function errorMessage(e: unknown): string {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (typeof e === 'object') {
    const obj = e as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown };
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.error === 'string' && obj.error) return obj.error;
    if (typeof obj.details === 'string' && obj.details) return obj.details;
    if (typeof obj.hint === 'string' && obj.hint) return obj.hint;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
