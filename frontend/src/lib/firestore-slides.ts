import {
  collection, doc,
  getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { LayoutNodeSchema } from './ir';
import type { LayoutNode } from './ir';
import type { SlideNode } from './projektor-data';
import { SLIDE_CANDIDATES } from './slide-candidates';

const COL = 'slides';

// Firestore rejects `undefined` — strip it before every write.
function serialize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

// Load all slides from Firestore, sorted by index.
// Returns null if the collection is empty (first run — caller should seed from defaults).
export async function loadSlides(): Promise<SlideNode[] | null> {
  const snap = await getDocs(collection(db, COL));
  if (snap.empty) return null;

  const slides = snap.docs
    .map((d) => {
      const data = d.data();
      const parsed = LayoutNodeSchema.safeParse(data.root);
      if (!parsed.success) {
        console.error(`[firestore] Failed to parse slide ${d.id}:`, parsed.error);
        return null;
      }
      const slide: SlideNode = {
        id:            d.id,
        index:         data.index   ?? 0,
        title:         data.title   ?? 'Untitled',
        x:             data.x       ?? 0,
        y:             data.y       ?? 0,
        rotation:      data.rotation ?? 0,
        state:         data.state   ?? 'rendered',
        components:    data.components ?? [],
        thumb:         data.thumb   ?? 'title',
        width:         data.width,
        height:        data.height,
        root:          parsed.data,
        // Candidates are static design options — not persisted, merged in on load.
        candidates:    SLIDE_CANDIDATES[d.id] ?? [],
        activeDesignId: SLIDE_CANDIDATES[d.id]?.[0]?.id ?? null,
      };
      return slide;
    })
    .filter((s): s is SlideNode => s !== null)
    .sort((a, b) => a.index - b.index);

  return slides.length > 0 ? slides : null;
}

// Write a single slide's full state to Firestore.
// Only persists fields that belong in the DB — candidates are static and excluded.
export async function saveSlide(slide: SlideNode): Promise<void> {
  await setDoc(doc(db, COL, slide.id), serialize({
    root:       slide.root,
    index:      slide.index,
    title:      slide.title,
    state:      slide.state,
    components: slide.components,
    thumb:      slide.thumb,
    x:          slide.x,
    y:          slide.y,
    rotation:   slide.rotation,
    width:      slide.width,
    height:     slide.height,
  }));
}

// Seed Firestore with an initial set of slides (first run only).
export async function seedSlides(slides: SlideNode[]): Promise<void> {
  await Promise.all(slides.map(saveSlide));
}

// Remove a slide document from Firestore.
export async function deleteSlideDoc(slideId: string): Promise<void> {
  await deleteDoc(doc(db, COL, slideId));
}
