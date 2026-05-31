import {
  collection, doc,
  getDocs, getDoc, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SlideNode, Edge } from './projektor-data';
import type { ContentNode } from './ir';

// Firestore rejects `undefined` — strip it before every write.
function serialize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

// ── Project schema ────────────────────────────────────────────────────────────
// Each user's presentations live at users/{uid}/projects/{projectId}.
// This replaces the old flat `slides` collection and the single `decks/current` doc.

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

// Create a new project document and return its generated ID.
// Optionally seeds the project with an initial deck (used right after generation).
export async function createProject(
  uid: string,
  name: string,
  nodes: SlideNode[] = [],
  edges: Edge[] = [],
  contentPool: ContentNode[] = [],
): Promise<string> {
  const projectId = `proj-${Date.now()}`;
  await setDoc(
    doc(db, 'users', uid, 'projects', projectId),
    serialize({ name, nodes, edges, contentPool, createdAt: Date.now(), updatedAt: Date.now() }),
  );
  return projectId;
}

// List all projects for a user, sorted by most recently updated.
export async function listProjects(uid: string): Promise<ProjectMeta[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'projects'));
  return snap.docs
    .map((d) => ({
      id: d.id,
      name: (d.data().name as string) ?? 'Untitled',
      createdAt: (d.data().createdAt as number) ?? 0,
      updatedAt: (d.data().updatedAt as number) ?? 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// Save (or update) deck data within a project. Uses merge so `name`/`createdAt` survive.
export async function saveDeck(
  uid: string,
  projectId: string,
  nodes: SlideNode[],
  edges: Edge[],
  contentPool: ContentNode[] = [],
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'projects', projectId),
    serialize({ nodes, edges, contentPool, updatedAt: Date.now() }) as Record<string, unknown>,
    { merge: true },
  );
}

// Load a specific project's deck. Returns null if the project doesn't exist yet.
export async function loadDeck(uid: string, projectId: string): Promise<{
  nodes: SlideNode[];
  edges: Edge[];
  contentPool: ContentNode[];
  name?: string;
} | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'projects', projectId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!Array.isArray(data.nodes) || data.nodes.length === 0) return null;
  return {
    nodes: data.nodes as SlideNode[],
    edges: Array.isArray(data.edges) ? (data.edges as Edge[]) : [],
    contentPool: Array.isArray(data.contentPool) ? (data.contentPool as ContentNode[]) : [],
    name: data.name as string | undefined,
  };
}

// Delete a project and all its data.
export async function deleteProject(uid: string, projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'projects', projectId));
}
