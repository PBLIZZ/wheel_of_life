import type { Doc, Id } from "../../convex/_generated/dataModel";

export type SessionStage =
  | "wheel_scoring"
  | "reflection"
  | "focus_selection"
  | "reality_exploration"
  | "belief_conflict_exploration"
  | "goal_creation"
  | "obstacles"
  | "next_action"
  | "focus_checkpoint"
  | "summary";

export type SessionListItem = Doc<"sessions"> & {
  categories: Doc<"sessionCategories">[];
  summary: Doc<"summaries"> | null;
};

export type SessionDetails = {
  session: Doc<"sessions">;
  categories: Doc<"sessionCategories">[];
  focusRuns: Doc<"focusRuns">[];
  activeFocusRun: Doc<"focusRuns"> | null;
  messages: Doc<"messages">[];
  summary: Doc<"summaries"> | null;
};

export type EditableCategory = {
  id?: Id<"sessionCategories">;
  name: string;
  score: number;
};

export type SettingsState = {
  provider: "openai" | "anthropic";
  model: string;
  updatedAt: number;
};
