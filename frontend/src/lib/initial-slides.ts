// Slide element data generated from the SlideSpec schema (mock fixture data).
// Source: mock-slide-specs.ts → spec-to-elements.ts → SlideElement[]
// EditorView and SlideThumb consume SLIDE_ELEMENTS exactly as before.

import type { SlideElement } from "./slide-model";
import { specToElements } from "./spec-to-elements";
import { MOCK_SPECS_BY_NODE_ID } from "./mock-slide-specs";

export const SLIDE_ELEMENTS: Record<string, SlideElement[]> = Object.fromEntries(
  Object.entries(MOCK_SPECS_BY_NODE_ID).map(([id, spec]) => [id, specToElements(spec)])
);
