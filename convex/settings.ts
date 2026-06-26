import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { requireUserId } from "./lib/auth";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "./prompts";

function normalizeModel(provider: "openai" | "anthropic", model: string) {
  const trimmed = model.trim();

  if (provider === "openai" && trimmed === "gpt-4.1-mini") {
    return DEFAULT_MODEL;
  }

  return trimmed;
}

export const getMySettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("userId", (query) => query.eq("userId", userId))
      .unique();

    return (
      (settings && {
        ...settings,
        model: normalizeModel(settings.provider, settings.model),
      }) ?? {
        userId,
        provider: DEFAULT_PROVIDER,
        model: DEFAULT_MODEL,
        updatedAt: 0,
      }
    );
  },
});

export const saveMySettings = mutation({
  args: {
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("userId", (query) => query.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        provider: args.provider,
        model: normalizeModel(args.provider, args.model),
        updatedAt: args.updatedAt,
      });
      return existing._id;
    }

    return ctx.db.insert("userSettings", {
      userId,
      provider: args.provider,
      model: normalizeModel(args.provider, args.model),
      updatedAt: args.updatedAt,
    });
  },
});
