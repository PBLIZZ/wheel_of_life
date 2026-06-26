import { mutation, query, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { DEFAULT_CATEGORIES } from "./prompts";
import { requireUserId } from "./lib/auth";

type SessionDoc = Doc<"sessions">;
type SessionCategoryDoc = Doc<"sessionCategories">;
type MessageDoc = Doc<"messages">;
type FocusRunDoc = Doc<"focusRuns">;
type SummaryDoc = Doc<"summaries">;

type SessionBundle = {
  session: SessionDoc;
  categories: SessionCategoryDoc[];
  messages: MessageDoc[];
  focusRuns: FocusRunDoc[];
  activeFocusRun: FocusRunDoc | null;
  summary: SummaryDoc | null;
};

function sessionTitle(now: number) {
  return `Wheel Session ${new Date(now).toISOString().slice(0, 10)}`;
}

function trimOrNull(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function summarizeRun(run: {
  areaName: string;
  order: number;
  selectedBecause: string[];
  whyNow?: string | null;
  status: "queued" | "active" | "completed";
  keyObservations?: string[] | null;
  limitingBeliefs?: string[] | null;
  finalGoal?: string | null;
  nextStep?: string | null;
  commitment?: string | null;
  startedAt?: number | null;
  completedAt?: number | null;
}) {
  return {
    areaName: run.areaName,
    order: run.order,
    selectedBecause: run.selectedBecause,
    whyNow: run.whyNow ?? undefined,
    status: run.status,
    keyObservations: run.keyObservations?.length ? run.keyObservations : [],
    limitingBeliefs: run.limitingBeliefs?.length ? run.limitingBeliefs : [],
    finalGoal: run.finalGoal ?? undefined,
    nextStep: run.nextStep ?? undefined,
    commitment: run.commitment ?? undefined,
    startedAt: run.startedAt ?? undefined,
    completedAt: run.completedAt ?? undefined,
  };
}

function buildOverallSummaryText(args: {
  wheelScores: Array<{ name: string; score: number }>;
  focusRuns: Array<ReturnType<typeof summarizeRun>>;
  startHereFirst: string;
}) {
  const lines = [
    "Wheel snapshot:",
    ...args.wheelScores.map((category) => `- ${category.name}: ${category.score}/10`),
    "",
    "Completed focus runs:",
  ];

  if (args.focusRuns.length === 0) {
    lines.push("- No completed focus runs were saved.");
  } else {
    args.focusRuns.forEach((run) => {
      lines.push(`${run.order + 1}. ${run.areaName}`);
      if (run.whyNow) {
        lines.push(`   Why now: ${run.whyNow}`);
      }
      if (run.selectedBecause.length) {
        lines.push(`   Selected because: ${run.selectedBecause.join("; ")}`);
      }
      if (run.keyObservations?.length) {
        lines.push(`   Observations: ${run.keyObservations.join("; ")}`);
      }
      if (run.limitingBeliefs?.length) {
        lines.push(`   Beliefs: ${run.limitingBeliefs.join("; ")}`);
      }
      if (run.finalGoal) {
        lines.push(`   Goal: ${run.finalGoal}`);
      }
      if (run.nextStep) {
        lines.push(`   Next step: ${run.nextStep}`);
      }
      if (run.commitment) {
        lines.push(`   Commitment: ${run.commitment}`);
      }
    });
  }

  lines.push("", `Start here first: ${args.startHereFirst}`);
  return lines.join("\n");
}

function pickStartHereFirst(focusRuns: Array<ReturnType<typeof summarizeRun>>) {
  const preferred = focusRuns.find((run) => run.nextStep?.trim()) ?? focusRuns[0];
  if (!preferred) {
    return "Review the wheel and choose one concrete first move.";
  }

  return (
    trimOrNull(preferred.nextStep) ??
    trimOrNull(preferred.finalGoal) ??
    `Start with ${preferred.areaName}.`
  );
}

async function loadSessionBundle(
  ctx: QueryCtx,
  userId: Id<"users">,
  sessionId: Id<"sessions">,
): Promise<SessionBundle> {
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId) {
    throw new ConvexError("Session not found.");
  }

  const [categories, messages, focusRuns, summary] = await Promise.all([
    ctx.db
      .query("sessionCategories")
      .withIndex("sessionId", (query) => query.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("messages")
      .withIndex("sessionId", (query) => query.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("focusRuns")
      .withIndex("sessionId", (query) => query.eq("sessionId", sessionId))
      .collect(),
    ctx.db
      .query("summaries")
      .withIndex("sessionId", (query) => query.eq("sessionId", sessionId))
      .unique(),
  ]);

  const orderedCategories = (categories as SessionCategoryDoc[]).sort((a, b) => a.order - b.order);
  const orderedMessages = (messages as MessageDoc[]).sort((a, b) => a.createdAt - b.createdAt);
  const orderedFocusRuns = (focusRuns as FocusRunDoc[]).sort((a, b) => a.order - b.order);
  const activeFocusRun = session.activeFocusRunId
    ? orderedFocusRuns.find((run) => run._id === session.activeFocusRunId) ?? null
    : null;

  return {
    session,
    categories: orderedCategories,
    messages: orderedMessages,
    focusRuns: orderedFocusRuns,
    activeFocusRun,
    summary,
  };
}

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("userIdAndUpdatedAt", (query) => query.eq("userId", userId))
      .collect();

    const ordered = sessions.sort((a, b) => b.updatedAt - a.updatedAt);

    return Promise.all(
      ordered.map(async (session) => {
        const categories = await ctx.db
          .query("sessionCategories")
          .withIndex("sessionId", (query) => query.eq("sessionId", session._id))
          .collect();
        const summary = await ctx.db
          .query("summaries")
          .withIndex("sessionId", (query) => query.eq("sessionId", session._id))
          .unique();

        return {
          ...session,
          categories: (categories as SessionCategoryDoc[]).sort((a, b) => a.order - b.order),
          summary: summary as SummaryDoc | null,
        };
      }),
    );
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return loadSessionBundle(ctx, userId, args.sessionId);
  },
});

export const getCoachContext = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return loadSessionBundle(ctx, userId, args.sessionId);
  },
});

export const createSession = mutation({
  args: { createdAt: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = args.createdAt;
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      title: sessionTitle(now),
      currentStage: "wheel_scoring",
      status: "draft",
      queuedFocusCount: 0,
      completedFocusCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await Promise.all(
      DEFAULT_CATEGORIES.map((name, index) =>
        ctx.db.insert("sessionCategories", {
          userId,
          sessionId,
          name,
          score: 5,
          order: index,
        }),
      ),
    );

    return sessionId;
  },
});

export const saveWheelScores = mutation({
  args: {
    sessionId: v.id("sessions"),
    categories: v.array(
      v.object({
        id: v.optional(v.id("sessionCategories")),
        name: v.string(),
        score: v.number(),
      }),
    ),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new ConvexError("Session not found.");
    }

    const existing = await ctx.db
      .query("sessionCategories")
      .withIndex("sessionId", (query) => query.eq("sessionId", args.sessionId))
      .collect();

    const incomingIds = new Set(args.categories.flatMap((category) => (category.id ? [category.id] : [])));

    await Promise.all(
      existing
        .filter((category) => !incomingIds.has(category._id))
        .map((category) => ctx.db.delete(category._id)),
    );

    await Promise.all(
      args.categories.map((category, index) => {
        const payload = {
          userId,
          sessionId: args.sessionId,
          name: category.name.trim(),
          score: Math.max(1, Math.min(10, Math.round(category.score))),
          order: index,
        };

        if (category.id) {
          return ctx.db.patch(category.id, payload);
        }

        return ctx.db.insert("sessionCategories", payload);
      }),
    );

    await ctx.db.patch(args.sessionId, { updatedAt: args.updatedAt });
  },
});

export const queueFocusRuns = mutation({
  args: {
    sessionId: v.id("sessions"),
    runs: v.array(
      v.object({
        areaName: v.string(),
        order: v.number(),
        selectedBecause: v.array(v.string()),
        whyNow: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new ConvexError("Session not found.");
    }

    const createdRuns: Array<{
      _id: Id<"focusRuns">;
      userId: Id<"users">;
      sessionId: Id<"sessions">;
      areaName: string;
      order: number;
      selectedBecause: string[];
      whyNow?: string;
      status: "queued";
    }> = [];
    for (const run of args.runs.sort((a, b) => a.order - b.order)) {
      const focusRunId = await ctx.db.insert("focusRuns", {
        userId,
        sessionId: args.sessionId,
        areaName: run.areaName.trim(),
        order: run.order,
        selectedBecause: run.selectedBecause.map((item) => item.trim()).filter(Boolean),
        whyNow: trimOrNull(run.whyNow) ?? undefined,
        status: "queued",
      });

      createdRuns.push({
        _id: focusRunId,
        userId,
        sessionId: args.sessionId,
        areaName: run.areaName.trim(),
        order: run.order,
        selectedBecause: run.selectedBecause.map((item) => item.trim()).filter(Boolean),
        whyNow: trimOrNull(run.whyNow) ?? undefined,
        status: "queued" as const,
      });
    }

    return createdRuns;
  },
});

export const patchFocusRun = mutation({
  args: {
    sessionId: v.id("sessions"),
    focusRunId: v.id("focusRuns"),
    patch: v.object({
      status: v.optional(v.union(v.literal("queued"), v.literal("active"), v.literal("completed"))),
      selectedBecause: v.optional(v.array(v.string())),
      whyNow: v.optional(v.string()),
      keyObservations: v.optional(v.array(v.string())),
      limitingBeliefs: v.optional(v.array(v.string())),
      finalGoal: v.optional(v.string()),
      nextStep: v.optional(v.string()),
      commitment: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    const focusRun = await ctx.db.get(args.focusRunId);

    if (!session || !focusRun || session.userId !== userId || focusRun.userId !== userId) {
      throw new ConvexError("Session not found.");
    }

    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(args.patch) as Array<keyof typeof args.patch>) {
      const value = args.patch[key];
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.focusRunId, patch);
    }
  },
});

export const applyCoachTurn = mutation({
  args: {
    sessionId: v.id("sessions"),
    stageForAssistantMessage: v.union(
      v.literal("wheel_scoring"),
      v.literal("reflection"),
      v.literal("focus_selection"),
      v.literal("reality_exploration"),
      v.literal("belief_conflict_exploration"),
      v.literal("goal_creation"),
      v.literal("obstacles"),
      v.literal("next_action"),
      v.literal("focus_checkpoint"),
      v.literal("summary"),
    ),
    nextStage: v.union(
      v.literal("wheel_scoring"),
      v.literal("reflection"),
      v.literal("focus_selection"),
      v.literal("reality_exploration"),
      v.literal("belief_conflict_exploration"),
      v.literal("goal_creation"),
      v.literal("obstacles"),
      v.literal("next_action"),
      v.literal("focus_checkpoint"),
      v.literal("summary"),
    ),
    userMessage: v.optional(v.string()),
    assistantMessage: v.string(),
    focusRunId: v.optional(v.id("focusRuns")),
    sessionPatch: v.optional(
      v.object({
        focusArea: v.optional(v.string()),
        activeFocusRunId: v.optional(v.id("focusRuns")),
        clearActiveFocusRun: v.optional(v.boolean()),
        activeFocusIndex: v.optional(v.number()),
        queuedFocusCount: v.optional(v.number()),
        completedFocusCount: v.optional(v.number()),
        recommendedFocusArea: v.optional(v.string()),
        recommendedFocusReason: v.optional(v.string()),
        recommendedFocusAreas: v.optional(v.array(v.string())),
        keyObservations: v.optional(v.array(v.string())),
        limitingBeliefs: v.optional(v.array(v.string())),
        obstacleNotes: v.optional(v.array(v.string())),
        finalGoal: v.optional(v.string()),
        nextStep: v.optional(v.string()),
        commitment: v.optional(v.string()),
      }),
    ),
    completeSession: v.optional(v.boolean()),
    recordedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.sessionId);

    if (!session || session.userId !== userId) {
      throw new ConvexError("Session not found.");
    }

    const now = args.recordedAt;

    if (args.userMessage?.trim()) {
      await ctx.db.insert("messages", {
        userId,
        sessionId: args.sessionId,
        focusRunId: args.focusRunId,
        role: "user",
        stage: session.currentStage,
        content: args.userMessage.trim(),
        createdAt: now - 1,
      });
    }

    await ctx.db.insert("messages", {
      userId,
      sessionId: args.sessionId,
      focusRunId: args.focusRunId,
      role: "assistant",
      stage: args.stageForAssistantMessage,
      content: args.assistantMessage.trim(),
      createdAt: now,
    });

    const sessionPatch: Record<string, unknown> = {
      currentStage: args.nextStage,
      status: args.completeSession ? "completed" : "active",
      updatedAt: now,
    };

    if (args.completeSession) {
      sessionPatch.completedAt = now;
    }

    if (args.sessionPatch) {
      for (const [key, value] of Object.entries(args.sessionPatch)) {
        if (value !== undefined) {
          sessionPatch[key] = value;
        }
      }
    }

    if (args.sessionPatch?.clearActiveFocusRun) {
      delete sessionPatch.clearActiveFocusRun;
      sessionPatch.activeFocusRunId = undefined;
    }

    await ctx.db.patch(args.sessionId, sessionPatch);

    if (args.completeSession) {
      const categories = await ctx.db
        .query("sessionCategories")
        .withIndex("sessionId", (query) => query.eq("sessionId", args.sessionId))
        .collect();
      const focusRuns = await ctx.db
        .query("focusRuns")
        .withIndex("sessionId", (query) => query.eq("sessionId", args.sessionId))
        .collect();
      const completedFocusRuns = focusRuns
        .filter((run) => run.status === "completed")
        .sort((a, b) => a.order - b.order)
        .map((run) => summarizeRun(run));
      const wheelScores = categories
        .sort((a, b) => a.order - b.order)
        .map((category) => ({ name: category.name, score: category.score }));
      const startHereFirst = pickStartHereFirst(completedFocusRuns);
      const overallSummaryText = buildOverallSummaryText({
        wheelScores,
        focusRuns: completedFocusRuns,
        startHereFirst,
      });
      const combinedObservations = uniq(
        completedFocusRuns.flatMap((run) => run.keyObservations ?? []),
      );
      const combinedBeliefs = uniq(
        completedFocusRuns.flatMap((run) => run.limitingBeliefs ?? []),
      );
      const chosenArea =
        completedFocusRuns.length === 1
          ? completedFocusRuns[0].areaName
          : completedFocusRuns.map((run) => run.areaName).join(", ") || "Combined focus areas";
      const finalGoal =
        completedFocusRuns[0]?.finalGoal ??
        (completedFocusRuns.length
          ? `Combined focus work across ${completedFocusRuns.length} area(s)`
          : "Combined focus work");
      const nextStep = startHereFirst;
      const commitment =
        completedFocusRuns[0]?.commitment ?? "Review the summary and start here first.";
      const existingSummary = await ctx.db
        .query("summaries")
        .withIndex("sessionId", (query) => query.eq("sessionId", args.sessionId))
        .unique();

      const summaryPayload = {
        userId,
        sessionId: args.sessionId,
        chosenArea,
        wheelScores,
        keyObservations: combinedObservations,
        limitingBeliefs: combinedBeliefs,
        finalGoal,
        nextStep,
        commitment,
        summaryText: overallSummaryText,
        overallSummaryText,
        startHereFirst,
        focusRuns: completedFocusRuns,
        createdAt: existingSummary?.createdAt ?? now,
        updatedAt: now,
      };

      if (existingSummary) {
        await ctx.db.patch(existingSummary._id, summaryPayload);
      } else {
        await ctx.db.insert("summaries", summaryPayload);
      }
    }
  },
});
