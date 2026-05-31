export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.1;
export const DEFAULT_ZOOM = 0.85;

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

export function zoomBy(value: number, delta: number): number {
  return clampZoom(value + delta);
}
