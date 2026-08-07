/* Escape a value before interpolating it into a shadow-root innerHTML string.
 * Shared so the two components that build markup from attributes
 * (<scratch-card>, <scratch-nav-item>) can never disagree about what is escaped.
 * Inlined into each component at build time — no runtime import. */
const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ENTITIES[c] ?? c);
}
