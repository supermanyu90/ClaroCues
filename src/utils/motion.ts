/** True when the user has asked the OS to minimise animation. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
