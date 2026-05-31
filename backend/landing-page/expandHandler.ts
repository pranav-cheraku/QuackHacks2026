import { callExpansionAgent } from "./expandAgent";
import { ExpandRequestSchema, type ExpandResponse } from "./expandSchema";

export async function handleExpandRequest(rawBody: unknown): Promise<ExpandResponse> {
  const parsed = ExpandRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw Object.assign(
      new Error(`Invalid expand request: ${parsed.error.issues.map((i) => i.message).join(", ")}`),
      { status: 400 },
    );
  }
  return callExpansionAgent(parsed.data);
}
