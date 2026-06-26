"use node";

import {
  BASE_SYSTEM_PROMPT,
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  OUTPUT_SCHEMA_INSTRUCTIONS,
  STAGE_PROMPTS,
} from "../prompts";
import type { SessionStage } from "../prompts";

type CoachMessage = {
  role: "user" | "assistant";
  stage: SessionStage;
  content: string;
  createdAt: number;
  focusRunId?: string | null;
};

type CategoryScore = {
  name: string;
  score: number;
};

type FocusRunContext = {
  _id: string;
  areaName: string;
  order: number;
  selectedBecause: string[];
  whyNow?: string | null;
  status: "queued" | "active" | "completed";
  keyObservations?: string[];
  limitingBeliefs?: string[];
  finalGoal?: string;
  nextStep?: string;
  commitment?: string;
  startedAt?: number;
  completedAt?: number;
};

type CoachSession = {
  currentStage: SessionStage;
  status: "draft" | "active" | "completed";
  title: string;
  focusArea?: string | null;
  activeFocusRunId?: string | null;
  activeFocusIndex?: number | null;
  queuedFocusCount?: number | null;
  completedFocusCount?: number | null;
  recommendedFocusArea?: string | null;
  recommendedFocusReason?: string | null;
  recommendedFocusAreas?: string[] | null;
  keyObservations?: string[] | null;
  limitingBeliefs?: string[] | null;
  finalGoal?: string | null;
  nextStep?: string | null;
  commitment?: string | null;
};

type ProviderSettings = {
  provider: "openai" | "anthropic";
  model: string;
};

function scoreTable(categories: CategoryScore[]) {
  return categories.map((category) => `- ${category.name}: ${category.score}/10`).join("\n");
}

function describeFocusRun(run: FocusRunContext) {
  const parts = [
    `${run.areaName} (#${run.order + 1})`,
    `status: ${run.status}`,
    run.whyNow ? `why now: ${run.whyNow}` : null,
    run.selectedBecause.length ? `selected because: ${run.selectedBecause.join(" | ")}` : null,
    run.keyObservations?.length ? `observations: ${run.keyObservations.join(" | ")}` : null,
    run.limitingBeliefs?.length ? `beliefs: ${run.limitingBeliefs.join(" | ")}` : null,
    run.finalGoal ? `goal: ${run.finalGoal}` : null,
    run.nextStep ? `next step: ${run.nextStep}` : null,
    run.commitment ? `commitment: ${run.commitment}` : null,
  ];

  return parts.filter(Boolean).join(" | ");
}

function conversationTranscript(messages: CoachMessage[], focusRuns: FocusRunContext[]) {
  if (messages.length === 0) {
    return "No prior conversation yet.";
  }

  const focusRunNames = new Map(focusRuns.map((run) => [run._id, run.areaName]));

  return messages
    .slice(-14)
    .map((message) => {
      const focusLabel = message.focusRunId ? ` | focus: ${focusRunNames.get(message.focusRunId) ?? "unknown"}` : "";
      return `[${message.role} | ${message.stage}${focusLabel}] ${message.content}`;
    })
    .join("\n");
}

function buildSessionNotes(args: {
  stage: Exclude<SessionStage, "wheel_scoring" | "focus_checkpoint" | "summary">;
  session: CoachSession;
  categories: CategoryScore[];
  messages: CoachMessage[];
  focusRuns: FocusRunContext[];
  activeFocusRun?: FocusRunContext | null;
  userInput?: string;
  focusSelectionMode?: "initial" | "add_more";
  selectedFocusAreas?: string[];
}) {
  const completedFocusRuns = args.focusRuns.filter((run) => run.status === "completed");
  const queuedFocusRuns = args.focusRuns.filter((run) => run.status === "queued");

  const sessionNotes = [
    `Current stage: ${args.stage}`,
    `Session status: ${args.session.status}`,
    args.session.focusArea ? `Current focus area field: ${args.session.focusArea}` : null,
    args.session.queuedFocusCount != null
      ? `Queued focus count: ${args.session.queuedFocusCount}`
      : null,
    args.session.completedFocusCount != null
      ? `Completed focus count: ${args.session.completedFocusCount}`
      : null,
    args.session.recommendedFocusAreas?.length
      ? `Reflection candidates: ${args.session.recommendedFocusAreas.join(" | ")}`
      : null,
    args.session.recommendedFocusReason
      ? `Reflection note: ${args.session.recommendedFocusReason}`
      : null,
    args.activeFocusRun ? `Active focus run: ${describeFocusRun(args.activeFocusRun)}` : null,
    completedFocusRuns.length
      ? `Completed focus runs:\n${completedFocusRuns.map((run) => `- ${describeFocusRun(run)}`).join("\n")}`
      : null,
    queuedFocusRuns.length
      ? `Queued focus runs:\n${queuedFocusRuns.map((run) => `- ${describeFocusRun(run)}`).join("\n")}`
      : null,
    args.focusSelectionMode ? `Focus selection mode: ${args.focusSelectionMode}` : null,
    args.selectedFocusAreas?.length
      ? `Selected focus areas from chooser: ${args.selectedFocusAreas.join(" | ")}`
      : null,
    args.session.keyObservations?.length
      ? `Saved observations: ${args.session.keyObservations.join(" | ")}`
      : null,
    args.session.limitingBeliefs?.length
      ? `Saved beliefs: ${args.session.limitingBeliefs.join(" | ")}`
      : null,
    args.session.finalGoal ? `Saved goal: ${args.session.finalGoal}` : null,
    args.session.nextStep ? `Saved next step: ${args.session.nextStep}` : null,
    args.session.commitment ? `Saved commitment: ${args.session.commitment}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Current stage: ${args.stage}

Stage instructions:
${STAGE_PROMPTS[args.stage]}

Wheel scores:
${scoreTable(args.categories)}

Session state:
${sessionNotes || "No saved notes yet."}

Recent conversation:
${conversationTranscript(args.messages, args.focusRuns)}

${args.userInput ? `Latest user input:\n${args.userInput}` : ""}

${OUTPUT_SCHEMA_INSTRUCTIONS}`;
}

async function callOpenAI(args: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  user: string;
}) {
  const response = await fetch(`${args.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty completion.");
  }

  return content;
}

async function callAnthropic(args: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: 900,
      temperature: 0.5,
      system: args.system,
      messages: [{ role: "user", content: args.user }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const content = body.content?.find((item) => item.type === "text")?.text;

  if (!content) {
    throw new Error("Anthropic returned an empty completion.");
  }

  return content;
}

export async function generateCoachJson(args: {
  stage: Exclude<SessionStage, "wheel_scoring" | "focus_checkpoint" | "summary">;
  session: CoachSession;
  categories: CategoryScore[];
  messages: CoachMessage[];
  focusRuns: FocusRunContext[];
  activeFocusRun?: FocusRunContext | null;
  settings?: Partial<ProviderSettings> | null;
  userInput?: string;
  focusSelectionMode?: "initial" | "add_more";
  selectedFocusAreas?: string[];
}) {
  const provider = args.settings?.provider ?? DEFAULT_PROVIDER;
  const model = args.settings?.model?.trim() || DEFAULT_MODEL;
  const userPrompt = buildSessionNotes({
    stage: args.stage,
    session: args.session,
    categories: args.categories,
    messages: args.messages,
    focusRuns: args.focusRuns,
    activeFocusRun: args.activeFocusRun,
    userInput: args.userInput,
    focusSelectionMode: args.focusSelectionMode,
    selectedFocusAreas: args.selectedFocusAreas,
  });

  console.info("[wheel][llm] generating coach turn", {
    stage: args.stage,
    provider,
    model,
    promptLength: userPrompt.length,
    userInputLength: args.userInput?.length ?? 0,
    messageCount: args.messages.length,
    focusRunCount: args.focusRuns.length,
  });

  try {
    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is missing. Add it in Convex environment variables.");
      }

      return await callOpenAI({
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        model,
        system: BASE_SYSTEM_PROMPT,
        user: userPrompt,
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is missing. Add it in Convex environment variables or switch providers.",
      );
    }

    return await callAnthropic({
      apiKey,
      model,
      system: BASE_SYSTEM_PROMPT,
      user: userPrompt,
    });
  } catch (error) {
    console.error("[wheel][llm] generation failed", {
      stage: args.stage,
      provider,
      model,
      promptLength: userPrompt.length,
      userInputLength: args.userInput?.length ?? 0,
      error,
    });
    throw error;
  }
}
