// In-app screens as browser history entries, so the phone's back button moves
// inside the app (closes the review sheet, returns to the orders list) instead
// of leaving the page.
export type Layer = 'new' | 'review';

export function topLayer(): Layer | null {
  const state: unknown = window.history.state;
  if (state && typeof state === 'object' && 'waiterLayer' in state) {
    return (state as { waiterLayer: Layer }).waiterLayer;
  }
  return null;
}

export function openLayer(layer: Layer): void {
  window.history.pushState({ waiterLayer: layer }, '');
}

/** Pops every app layer (review sheet, new order) back to the orders list. */
export function closeLayers(): void {
  const depth = topLayer() === 'review' ? 2 : topLayer() === 'new' ? 1 : 0;
  if (depth > 0) window.history.go(-depth);
  else window.dispatchEvent(new PopStateEvent('popstate')); // already at the base: just re-sync
}
