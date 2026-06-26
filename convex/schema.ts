import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const sessionStage = v.union(
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
);

const focusRunStatus = v.union(
  v.literal("queued"),
  v.literal("active"),
  v.literal("completed"),
);

const focusRunRecord = v.object({
  areaName: v.string(),
  order: v.number(),
  selectedBecause: v.array(v.string()),
  whyNow: v.optional(v.string()),
  status: focusRunStatus,
  keyObservations: v.optional(v.array(v.string())),
  limitingBeliefs: v.optional(v.array(v.string())),
  finalGoal: v.optional(v.string()),
  nextStep: v.optional(v.string()),
  commitment: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
});

export default defineSchema({
  ...authTables,
  sessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    currentStage: sessionStage,
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("completed")),
    focusArea: v.optional(v.string()),
    activeFocusRunId: v.optional(v.id("focusRuns")),
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
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("userId", ["userId"])
    .index("userIdAndUpdatedAt", ["userId", "updatedAt"]),

  sessionCategories: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    name: v.string(),
    score: v.number(),
    order: v.number(),
  })
    .index("sessionId", ["sessionId"])
    .index("userIdAndSessionId", ["userId", "sessionId"]),

  focusRuns: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    areaName: v.string(),
    order: v.number(),
    selectedBecause: v.array(v.string()),
    whyNow: v.optional(v.string()),
    status: focusRunStatus,
    keyObservations: v.optional(v.array(v.string())),
    limitingBeliefs: v.optional(v.array(v.string())),
    finalGoal: v.optional(v.string()),
    nextStep: v.optional(v.string()),
    commitment: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("sessionId", ["sessionId"])
    .index("sessionIdAndOrder", ["sessionId", "order"])
    .index("userIdAndSessionId", ["userId", "sessionId"]),

  messages: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    focusRunId: v.optional(v.id("focusRuns")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    stage: sessionStage,
    content: v.string(),
    createdAt: v.number(),
  })
    .index("sessionId", ["sessionId"])
    .index("sessionIdAndFocusRunId", ["sessionId", "focusRunId"])
    .index("userIdAndSessionId", ["userId", "sessionId"]),

  summaries: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    chosenArea: v.string(),
    wheelScores: v.array(
      v.object({
        name: v.string(),
        score: v.number(),
      }),
    ),
    keyObservations: v.array(v.string()),
    limitingBeliefs: v.array(v.string()),
    finalGoal: v.string(),
    nextStep: v.string(),
    commitment: v.string(),
    summaryText: v.string(),
    overallSummaryText: v.optional(v.string()),
    startHereFirst: v.optional(v.string()),
    focusRuns: v.optional(v.array(focusRunRecord)),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("sessionId", ["sessionId"])
    .index("userId", ["userId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    updatedAt: v.number(),
  }).index("userId", ["userId"]),
});
