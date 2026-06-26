import type { CSSProperties } from "react";

import type { EditableCategory } from "./types";

type CategoryTheme = {
  color: string;
  soft: string;
  ink: string;
  shortLabel: string;
};

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  Health: {
    color: "#1F9A8A",
    soft: "rgba(31, 154, 138, 0.14)",
    ink: "#0E5F55",
    shortLabel: "Health",
  },
  Relationships: {
    color: "#2F6BDE",
    soft: "rgba(47, 107, 222, 0.14)",
    ink: "#1F4391",
    shortLabel: "Relations",
  },
  Work: {
    color: "#8A5B32",
    soft: "rgba(138, 91, 50, 0.14)",
    ink: "#5E3B1D",
    shortLabel: "Work",
  },
  Money: {
    color: "#D94C45",
    soft: "rgba(217, 76, 69, 0.14)",
    ink: "#912F2B",
    shortLabel: "Money",
  },
  "Personal Growth": {
    color: "#D5AE26",
    soft: "rgba(213, 174, 38, 0.16)",
    ink: "#7C630C",
    shortLabel: "Growth",
  },
  "Fun/Recreation": {
    color: "#F1AF59",
    soft: "rgba(241, 175, 89, 0.18)",
    ink: "#9A6318",
    shortLabel: "Fun",
  },
  Environment: {
    color: "#D96AAE",
    soft: "rgba(217, 106, 174, 0.15)",
    ink: "#8C3A6D",
    shortLabel: "Env",
  },
  "Emotional Wellbeing": {
    color: "#E26A4B",
    soft: "rgba(226, 106, 75, 0.16)",
    ink: "#9B412A",
    shortLabel: "Emotion",
  },
  "Purpose/Contribution": {
    color: "#5A4FD5",
    soft: "rgba(90, 79, 213, 0.15)",
    ink: "#3C3197",
    shortLabel: "Purpose",
  },
};

const FALLBACK_THEME: CategoryTheme = {
  color: "#56657A",
  soft: "rgba(86, 101, 122, 0.12)",
  ink: "#2E3A49",
  shortLabel: "Custom",
};

export function getCategoryTheme(categoryName: string): CategoryTheme {
  return CATEGORY_THEMES[categoryName] ?? FALLBACK_THEME;
}

export function getCategoryStyle(categoryName: string) {
  const theme = getCategoryTheme(categoryName);
  return {
    "--category-color": theme.color,
    "--category-soft": theme.soft,
    "--category-ink": theme.ink,
  } as CSSProperties;
}

export function buildCategoryScoreSummary(categories: EditableCategory[]) {
  const highest = [...categories].sort((left, right) => right.score - left.score).slice(0, 2);
  const lowest = [...categories].sort((left, right) => left.score - right.score).slice(0, 2);

  return {
    strongest: highest.map((category) => `${category.name} ${category.score}/10`),
    weakest: lowest.map((category) => `${category.name} ${category.score}/10`),
  };
}
