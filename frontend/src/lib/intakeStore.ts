// ── Session-scoped intake store ───────────────────────────────────────────────
// Holds the raw input (text + images) the user entered on the landing page so it
// can be surfaced in the editor's Content tray. Module-level: persists across
// re-renders and route transitions, resets on page refresh — same semantics as
// deckStore.ts. One current intake per session; the latest landing-page action
// overwrites it.

export interface IntakeImage {
  id: string;
  name: string;
  url: string; // object URL from URL.createObjectURL(file)
}

export interface Intake {
  text: string;
  images: IntakeImage[];
}

let current: Intake = { text: "", images: [] };

export function setIntake(intake: Intake): void {
  current = intake;
}

export function getIntake(): Intake {
  return current;
}

export function clearIntake(): void {
  current = { text: "", images: [] };
}
