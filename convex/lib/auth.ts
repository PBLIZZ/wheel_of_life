import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

export async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) {
    throw new ConvexError("You must be signed in to use Wheel of Life Coach.");
  }
  return userId;
}
