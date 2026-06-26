"use node";

import { ConvexError, v } from "convex/values";

import { api } from "./_generated/api";
import { action } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { extractJsonObject } from "./lib/json";
import { generateCoachJson } from "./lib/llm";
import type { SessionStage } from "./prompts";

const stageTransitionMap: Record<
  Exclude<SessionStage, "wheel_scoring" | "focus_selection" | "focus_checkpoint" | "summary">,
  SessionStage
> = {
  reflection: "focus_selection",
  reality_exploration: "belief_conflict_exploration",
  belief_conflict_exploration: "goal_creation",
  goal_creation: "obstacles",
  obstacles: "next_action",
  next_action: "focus_checkpoint",
};

function sanitizeTurnResult(payload: unknown) {
  const result = payload as Record<string, unknown>;

  const recommendedFocusAreas = Array.isArray(result.recommendedFocusAreas)
    ? result.recommendedFocusAreas.filter((item): item is string => typeof item === "string")
    : typeof result.recommendedFocusArea === "string"
      ? [result.recommendedFocusArea]
      : [];

  return {
    assistantMessage:
      typeof result.assistantMessage === "string"
        ? result.assistantMessage.trim()
        : "Let's keep moving with one focused step.",
    recommendedFocusAreas: recommendedFocusAreas.map((item) => item.trim()).filter(Boolean),
    recommendedFocusReason:
      typeof result.recommendedFocusReason === "string"
        ? result.recommendedFocusReason.trim()
        : null,
    keyObservations: Array.isArray(result.keyObservations)
      ? result.keyObservations.filter((item): item is string => typeof item === "string")
      : [],
    limitingBeliefs: Array.isArray(result.limitingBeliefs)
      ? result.limitingBeliefs.filter((item): item is string => typeof item === "string")
      : [],
    obstacles: Array.isArray(result.obstacles)
      ? result.obstacles.filter((item): item is string => typeof item === "string")
      : [],
    goal: typeof result.goal === "string" ? result.goal.trim() : null,
    nextStep: typeof result.nextStep === "string" ? result.nextStep.trim() : null,
    commitment:
      typeof result.commitment === "string" ? result.commitment.trim() : null,
    readyForFocusSelection:
      typeof result.readyForFocusSelection === "boolean"
        ? result.readyForFocusSelection
        : false,
    shouldPauseForSupport: Boolean(result.shouldPauseForSupport),
  };
}

function selectedBecauseForArea(args: {
  areaName: string;
  needsAttention: string;
  wantsToImprove: string;
  excitedReady: string;
}) {
  const reasons: string[] = [];
  if (args.needsAttention === args.areaName) {
    reasons.push(`Needs attention: ${args.areaName}.`);
  }
  if (args.wantsToImprove === args.areaName) {
    reasons.push(`Wants to improve: ${args.areaName}.`);
  }
  if (args.excitedReady === args.areaName) {
    reasons.push(`Excited/ready: ${args.areaName}.`);
  }
  return reasons;
}

function composeQueueMessage(args: {
  mode: "initial" | "add_more";
  needsAttention: string;
  wantsToImprove: string;
  excitedReady: string;
  queue: Array<{ areaName: string; whyNow?: string }>;
}) {
  const selections = [
    `Needs attention: ${args.needsAttention}`,
    `Wants to improve: ${args.wantsToImprove}`,
    `Excited/ready: ${args.excitedReady}`,
  ];
  const queueLines = args.queue.map((item, index) => {
    const note = item.whyNow?.trim();
    return note
      ? `${index + 1}. ${item.areaName} | why now: ${note}`
      : `${index + 1}. ${item.areaName}`;
  });

  return [
    `Focus selection mode: ${args.mode}`,
    ...selections,
    `Ordered queue: ${args.queue.map((item) => item.areaName).join(" -> ")}`,
    queueLines.length ? `Queue notes:\n${queueLines.map((line) => `- ${line}`).join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function uniqueFocusAreas(areas: string[]) {
  return Array.from(new Set(areas.map((area) => area.trim()).filter(Boolean)));
}

export const startReflection = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const [coachContext, settings] = await Promise.all([
      ctx.runQuery(api.sessions.getCoachContext, { sessionId: args.sessionId }),
      ctx.runQuery(api.settings.getMySettings, {}),
    ]);

    if (coachContext.session.currentStage !== "wheel_scoring") {
      throw new ConvexError("This session has already moved beyond wheel scoring.");
    }

    console.info("[wheel][coach] startReflection", {
      sessionId: args.sessionId,
      categoryCount: coachContext.categories.length,
      provider: settings.provider,
      model: settings.model,
    });

    const raw = await generateCoachJson({
      stage: "reflection",
      session: coachContext.session,
      categories: coachContext.categories,
      messages: coachContext.messages,
      focusRuns: coachContext.focusRuns,
      activeFocusRun: coachContext.activeFocusRun,
      settings,
    });
    const parsed = sanitizeTurnResult(extractJsonObject(raw));
    const recordedAt = Date.now();

    await ctx.runMutation(api.sessions.applyCoachTurn, {
      sessionId: args.sessionId,
      stageForAssistantMessage: "reflection",
      nextStage: "reflection",
      assistantMessage: parsed.assistantMessage,
      sessionPatch: {
        recommendedFocusAreas: parsed.recommendedFocusAreas,
        recommendedFocusArea: parsed.recommendedFocusAreas[0] ?? undefined,
        recommendedFocusReason: parsed.recommendedFocusReason ?? undefined,
        keyObservations: parsed.keyObservations.length ? parsed.keyObservations : undefined,
      },
      recordedAt,
    });
  },
});

export const buildFocusQueue = action({
  args: {
    sessionId: v.id("sessions"),
    needsAttention: v.string(),
    wantsToImprove: v.string(),
    excitedReady: v.string(),
    queueNotes: v.array(
      v.object({
        areaName: v.string(),
        whyNow: v.optional(v.string()),
      }),
    ),
    startImmediately: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const [coachContext, settings] = await Promise.all([
      ctx.runQuery(api.sessions.getCoachContext, { sessionId: args.sessionId }),
      ctx.runQuery(api.settings.getMySettings, {}),
    ]);

    if (coachContext.session.currentStage !== "focus_selection") {
      throw new ConvexError("This session is not waiting for focus selection.");
    }

    const availableCategoryNames = new Set(coachContext.categories.map((category) => category.name));
    const usedCategoryNames = new Set(coachContext.focusRuns.map((run) => run.areaName));

    const orderedQueue = uniqueFocusAreas([
      args.needsAttention,
      args.wantsToImprove,
      args.excitedReady,
    ]).map((areaName) => areaName.trim());

    for (const areaName of orderedQueue) {
      if (!availableCategoryNames.has(areaName)) {
        throw new ConvexError(`Unknown focus area: ${areaName}`);
      }
      if (usedCategoryNames.has(areaName)) {
        throw new ConvexError(`Focus area already used: ${areaName}`);
      }
    }

    if (orderedQueue.length === 0) {
      throw new ConvexError("Choose at least one focus area.");
    }

    const queueMap = new Map<string, string | undefined>(
      args.queueNotes.map((item) => [item.areaName.trim(), item.whyNow?.trim() || undefined]),
    );
    const queue = orderedQueue.map((areaName) => ({
      areaName,
      whyNow: queueMap.get(areaName),
      selectedBecause: selectedBecauseForArea({
        areaName,
        needsAttention: args.needsAttention.trim(),
        wantsToImprove: args.wantsToImprove.trim(),
        excitedReady: args.excitedReady.trim(),
      }),
    }));

    const userMessage = composeQueueMessage({
      mode: args.startImmediately ? "initial" : "add_more",
      needsAttention: args.needsAttention.trim(),
      wantsToImprove: args.wantsToImprove.trim(),
      excitedReady: args.excitedReady.trim(),
      queue: queue.map((item) => ({
        areaName: item.areaName,
        whyNow: item.whyNow,
      })),
    });

    console.info("[wheel][coach] buildFocusQueue", {
      sessionId: args.sessionId,
      startImmediately: args.startImmediately,
      orderedQueue,
      queueNotesCount: args.queueNotes.length,
      provider: settings.provider,
      model: settings.model,
    });

    const raw = await generateCoachJson({
      stage: "focus_selection",
      session: coachContext.session,
      categories: coachContext.categories,
      messages: coachContext.messages,
      focusRuns: coachContext.focusRuns,
      activeFocusRun: coachContext.activeFocusRun,
      settings,
      userInput: userMessage,
      focusSelectionMode: args.startImmediately ? "initial" : "add_more",
      selectedFocusAreas: queue.map((item) => item.areaName),
    });
    const parsed = sanitizeTurnResult(extractJsonObject(raw));
    const createdRuns = await ctx.runMutation(api.sessions.queueFocusRuns, {
      sessionId: args.sessionId,
      runs: queue.map((item, index) => ({
        areaName: item.areaName,
        order: coachContext.focusRuns.length + index,
        selectedBecause: item.selectedBecause,
        whyNow: item.whyNow,
      })),
    });

    const queuedFocusCount = coachContext.focusRuns.length + createdRuns.length;
    const completedFocusCount =
      coachContext.session.completedFocusCount ??
      coachContext.focusRuns.filter((run) => run.status === "completed").length;
    const recordedAt = Date.now();
    const firstCreatedRun = createdRuns[0];
    const lastCompletedFocusIndex = completedFocusCount > 0 ? completedFocusCount - 1 : null;

    if (args.startImmediately) {
      await ctx.runMutation(api.sessions.applyCoachTurn, {
        sessionId: args.sessionId,
        stageForAssistantMessage: "focus_selection",
        nextStage: "reality_exploration",
        userMessage,
        assistantMessage: parsed.assistantMessage,
        focusRunId: firstCreatedRun?._id,
        sessionPatch: {
          focusArea: firstCreatedRun?.areaName,
          activeFocusRunId: firstCreatedRun?._id,
          activeFocusIndex: firstCreatedRun?.order,
          queuedFocusCount,
          completedFocusCount,
          keyObservations: parsed.keyObservations.length ? parsed.keyObservations : undefined,
        },
        recordedAt,
      });

      if (firstCreatedRun) {
        await ctx.runMutation(api.sessions.patchFocusRun, {
          sessionId: args.sessionId,
          focusRunId: firstCreatedRun._id,
          patch: {
            status: "active",
            startedAt: recordedAt,
          },
        });
      }
    } else {
      await ctx.runMutation(api.sessions.applyCoachTurn, {
        sessionId: args.sessionId,
        stageForAssistantMessage: "focus_selection",
        nextStage: "focus_checkpoint",
        userMessage,
        assistantMessage: parsed.assistantMessage,
        sessionPatch: {
          focusArea: coachContext.activeFocusRun?.areaName ?? coachContext.session.focusArea ?? undefined,
          activeFocusIndex: lastCompletedFocusIndex ?? undefined,
          queuedFocusCount,
          completedFocusCount,
          keyObservations: parsed.keyObservations.length ? parsed.keyObservations : undefined,
        },
        recordedAt,
      });
    }
  },
});

export const submitStageResponse = action({
  args: {
    sessionId: v.id("sessions"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const [coachContext, settings] = await Promise.all([
      ctx.runQuery(api.sessions.getCoachContext, { sessionId: args.sessionId }),
      ctx.runQuery(api.settings.getMySettings, {}),
    ]);

    const currentStage = coachContext.session.currentStage;
    if (
      currentStage === "wheel_scoring" ||
      currentStage === "focus_selection" ||
      currentStage === "focus_checkpoint" ||
      currentStage === "summary"
    ) {
      throw new ConvexError("This session is not expecting a written stage response.");
    }

    const activeFocusRun = coachContext.activeFocusRun;
    const requiresActiveFocusRun = currentStage !== "reflection";
    if (requiresActiveFocusRun && !activeFocusRun) {
      throw new ConvexError("No active focus run is available for this response.");
    }

    console.info("[wheel][coach] submitStageResponse", {
      sessionId: args.sessionId,
      currentStage,
      activeFocusRunId: activeFocusRun?._id ?? null,
      activeFocusArea: activeFocusRun?.areaName ?? null,
      messageLength: args.message.trim().length,
      provider: settings.provider,
      model: settings.model,
    });

    const raw = await generateCoachJson({
      stage: currentStage,
      session: coachContext.session,
      categories: coachContext.categories,
      messages: coachContext.messages,
      focusRuns: coachContext.focusRuns,
      activeFocusRun: activeFocusRun ?? undefined,
      settings,
      userInput: args.message.trim(),
    });
    const parsed = sanitizeTurnResult(extractJsonObject(raw));

    const nextStage = parsed.shouldPauseForSupport
      ? currentStage
      : currentStage === "reflection"
        ? parsed.readyForFocusSelection
          ? "focus_selection"
          : "reflection"
        : stageTransitionMap[currentStage as keyof typeof stageTransitionMap];
    const recordedAt = Date.now();
    const completedFocusRuns = coachContext.focusRuns.filter((run) => run.status === "completed").length;
    const totalFocusCount = coachContext.focusRuns.length;

    const sessionPatch: Record<string, unknown> = {
      queuedFocusCount: totalFocusCount,
      completedFocusCount: completedFocusRuns,
    };
    if (activeFocusRun) {
      sessionPatch.focusArea = activeFocusRun.areaName;
      sessionPatch.activeFocusRunId = activeFocusRun._id;
      sessionPatch.activeFocusIndex = activeFocusRun.order;
    }

    const focusRunPatch: Record<string, unknown> = {};

    if (currentStage === "reflection") {
      if (parsed.recommendedFocusAreas.length > 0) {
        sessionPatch.recommendedFocusAreas = parsed.recommendedFocusAreas;
        sessionPatch.recommendedFocusArea = parsed.recommendedFocusAreas[0];
      }
      if (parsed.recommendedFocusReason) {
        sessionPatch.recommendedFocusReason = parsed.recommendedFocusReason;
      }
      if (parsed.keyObservations.length > 0) {
        sessionPatch.keyObservations = parsed.keyObservations;
      }
    }

    if (currentStage === "reality_exploration") {
      if (parsed.keyObservations.length > 0) {
        sessionPatch.keyObservations = parsed.keyObservations;
        focusRunPatch.keyObservations = parsed.keyObservations;
      }
    }

    if (currentStage === "belief_conflict_exploration") {
      if (parsed.limitingBeliefs.length > 0) {
        sessionPatch.limitingBeliefs = parsed.limitingBeliefs;
        focusRunPatch.limitingBeliefs = parsed.limitingBeliefs;
      }
    }

    if (currentStage === "goal_creation") {
      if (parsed.goal) {
        sessionPatch.finalGoal = parsed.goal;
        focusRunPatch.finalGoal = parsed.goal;
      }
    }

    if (currentStage === "obstacles") {
      if (parsed.obstacles.length > 0) {
        sessionPatch.obstacleNotes = parsed.obstacles;
      }
    }

    if (currentStage === "next_action") {
      if (!activeFocusRun) {
        throw new ConvexError("No active focus run is available for next_action.");
      }
      if (parsed.goal) {
        sessionPatch.finalGoal = parsed.goal;
        focusRunPatch.finalGoal = parsed.goal;
      }
      if (parsed.nextStep) {
        sessionPatch.nextStep = parsed.nextStep;
        focusRunPatch.nextStep = parsed.nextStep;
      }
      if (parsed.commitment) {
        sessionPatch.commitment = parsed.commitment;
        focusRunPatch.commitment = parsed.commitment;
      }
      sessionPatch.completedFocusCount = completedFocusRuns + 1;
      sessionPatch.clearActiveFocusRun = true;
      sessionPatch.activeFocusIndex = activeFocusRun.order;
      focusRunPatch.status = "completed";
      focusRunPatch.completedAt = recordedAt;
    }

    await ctx.runMutation(api.sessions.applyCoachTurn, {
      sessionId: args.sessionId,
      stageForAssistantMessage: currentStage,
      nextStage,
      userMessage: args.message.trim(),
      assistantMessage: parsed.assistantMessage,
      focusRunId: activeFocusRun?._id,
      sessionPatch,
      recordedAt,
    });

    if (activeFocusRun && Object.keys(focusRunPatch).length > 0) {
      await ctx.runMutation(api.sessions.patchFocusRun, {
        sessionId: args.sessionId,
        focusRunId: activeFocusRun._id,
        patch: focusRunPatch as {
          status?: "queued" | "active" | "completed";
          selectedBecause?: string[];
          whyNow?: string;
          keyObservations?: string[];
          limitingBeliefs?: string[];
          finalGoal?: string;
          nextStep?: string;
          commitment?: string;
          startedAt?: number;
          completedAt?: number;
        },
      });
    }
  },
});

export const resolveFocusCheckpoint = action({
  args: {
    sessionId: v.id("sessions"),
    choice: v.union(
      v.literal("continue"),
      v.literal("add_another_focus"),
      v.literal("finish"),
    ),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const [coachContext] = await Promise.all([
      ctx.runQuery(api.sessions.getCoachContext, { sessionId: args.sessionId }),
    ]);

    if (coachContext.session.currentStage !== "focus_checkpoint") {
      throw new ConvexError("This session is not waiting at the focus checkpoint.");
    }

    const queuedRuns = coachContext.focusRuns.filter((run) => run.status === "queued");
    const completedCount = coachContext.focusRuns.filter((run) => run.status === "completed").length;
    const totalCount = coachContext.focusRuns.length;
    const recordedAt = Date.now();

    if (args.choice === "continue") {
      const nextRun = queuedRuns[0];
      if (!nextRun) {
        throw new ConvexError("No queued focus runs remain to continue.");
      }

      await ctx.runMutation(api.sessions.applyCoachTurn, {
        sessionId: args.sessionId,
        stageForAssistantMessage: "focus_checkpoint",
        nextStage: "reality_exploration",
        assistantMessage: `Next focus: ${nextRun.areaName}.`,
        focusRunId: nextRun._id,
        sessionPatch: {
          focusArea: nextRun.areaName,
          activeFocusRunId: nextRun._id,
          activeFocusIndex: nextRun.order,
          queuedFocusCount: totalCount,
          completedFocusCount: completedCount,
        },
        recordedAt,
      });

      await ctx.runMutation(api.sessions.patchFocusRun, {
        sessionId: args.sessionId,
        focusRunId: nextRun._id,
        patch: {
          status: "active",
          startedAt: recordedAt,
        },
      });

      return;
    }

    if (args.choice === "add_another_focus") {
      const remainingCategories = coachContext.categories.filter(
        (category) =>
          !coachContext.focusRuns.some((run) => run.areaName === category.name),
      );

      if (remainingCategories.length === 0) {
        throw new ConvexError("No remaining categories are available to add.");
      }

      await ctx.runMutation(api.sessions.applyCoachTurn, {
        sessionId: args.sessionId,
        stageForAssistantMessage: "focus_selection",
        nextStage: "focus_selection",
        assistantMessage: `Add another focus from the remaining areas: ${remainingCategories
          .map((category) => category.name)
          .join(", ")}.`,
        sessionPatch: {
          queuedFocusCount: totalCount,
          completedFocusCount: completedCount,
          activeFocusIndex: completedCount > 0 ? completedCount - 1 : undefined,
        },
        recordedAt,
      });

      return;
    }

    const completedRuns = coachContext.focusRuns
      .filter((run) => run.status === "completed")
      .sort((a, b) => a.order - b.order);
    const startHereFirst = completedRuns[0]?.nextStep?.trim() ?? completedRuns[0]?.finalGoal?.trim();
    const summaryMessage = startHereFirst
      ? `Combined summary ready. Start here first: ${startHereFirst}.`
      : "Combined summary ready.";

    await ctx.runMutation(api.sessions.applyCoachTurn, {
      sessionId: args.sessionId,
      stageForAssistantMessage: "summary",
      nextStage: "summary",
      assistantMessage: summaryMessage,
      completeSession: true,
      sessionPatch: {
        queuedFocusCount: totalCount,
        completedFocusCount: completedCount,
      },
      recordedAt,
    });
  },
});
