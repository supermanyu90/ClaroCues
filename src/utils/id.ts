/** Collision-free client-side id. Timestamps alone collide when two items are created in the same millisecond. */
export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
