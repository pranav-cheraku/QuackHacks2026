// ── Session-scoped per-node chat threads ────────────────────────────────────────
// The Board's Chat tab is per-node: each graph node owns its own conversation.
// Module-level Map, resets on refresh (same semantics as deckStore / intakeStore).
import type { EditResponse } from "@backend/landing-page/editSchema";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  // Agent messages may carry a proposed set of content-block edits, awaiting
  // the user's Accept/Discard.
  proposal?: EditResponse;
  proposalStatus?: "pending" | "accepted" | "discarded";
}

const threads = new Map<string, ChatMessage[]>();

export function getThread(nodeId: string): ChatMessage[] {
  return threads.get(nodeId) ?? [];
}

export function setThread(nodeId: string, messages: ChatMessage[]): void {
  threads.set(nodeId, messages);
}
