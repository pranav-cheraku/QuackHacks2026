import { callEditAgent } from "./editAgent";
import { EditRequestSchema, type EditResponse } from "./editSchema";

export async function handleEditRequest(rawBody: unknown): Promise<EditResponse> {
  const parsed = EditRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw Object.assign(
      new Error(`Invalid edit request: ${parsed.error.issues.map((i) => i.message).join(", ")}`),
      { status: 400 },
    );
  }
  return callEditAgent(parsed.data);
}
