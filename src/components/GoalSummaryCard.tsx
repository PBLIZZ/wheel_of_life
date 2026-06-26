import type { Doc } from "../../convex/_generated/dataModel";
import { getCategoryStyle } from "../lib/wheelTheme";

type SummaryRun = {
  areaName: string;
  order: number;
  selectedBecause: string[];
  whyNow?: string;
  status: "queued" | "active" | "completed";
  keyObservations?: string[];
  limitingBeliefs?: string[];
  finalGoal?: string;
  nextStep?: string;
  commitment?: string;
  startedAt?: number;
  completedAt?: number;
};

type Props = {
  session: Doc<"sessions">;
  summary: Doc<"summaries"> | null;
  scores: Array<{ name: string; score: number }>;
  focusRuns: Doc<"focusRuns">[];
};

function normalizeFocusRuns(summary: Doc<"summaries"> | null, focusRuns: Doc<"focusRuns">[]) {
  if (summary?.focusRuns?.length) {
    return summary.focusRuns as SummaryRun[];
  }

  return focusRuns
    .filter((run) => run.status === "completed")
    .map((run) => ({
      areaName: run.areaName,
      order: run.order,
      selectedBecause: run.selectedBecause,
      whyNow: run.whyNow ?? undefined,
      status: run.status,
      keyObservations: run.keyObservations ?? [],
      limitingBeliefs: run.limitingBeliefs ?? [],
      finalGoal: run.finalGoal ?? undefined,
      nextStep: run.nextStep ?? undefined,
      commitment: run.commitment ?? undefined,
      startedAt: run.startedAt ?? undefined,
      completedAt: run.completedAt ?? undefined,
    }));
}

function formatMarkdown(summaryText: string, report: {
  wheelScores: Array<{ name: string; score: number }>;
  focusRuns: SummaryRun[];
  startHereFirst: string;
}) {
  const sections = [
    "# Wheel of Life Summary",
    "",
    "## Wheel snapshot",
    ...report.wheelScores.map((score) => `- ${score.name} ${score.score}/10`),
    "",
    "## Focus runs",
  ];

  if (report.focusRuns.length === 0) {
    sections.push("- No completed focus runs were saved.");
  } else {
    report.focusRuns.forEach((run) => {
      sections.push(`### ${run.order + 1}. ${run.areaName}`);
      if (run.whyNow) {
        sections.push(`- Why now: ${run.whyNow}`);
      }
      if (run.selectedBecause.length) {
        sections.push(`- Selected because: ${run.selectedBecause.join("; ")}`);
      }
      if (run.keyObservations?.length) {
        sections.push(`- Observations: ${run.keyObservations.join("; ")}`);
      }
      if (run.limitingBeliefs?.length) {
        sections.push(`- Beliefs: ${run.limitingBeliefs.join("; ")}`);
      }
      if (run.finalGoal) {
        sections.push(`- Goal: ${run.finalGoal}`);
      }
      if (run.nextStep) {
        sections.push(`- Next step: ${run.nextStep}`);
      }
      if (run.commitment) {
        sections.push(`- Commitment: ${run.commitment}`);
      }
      sections.push("");
    });
  }

  sections.push("## Start here first");
  sections.push(report.startHereFirst);
  sections.push("");
  sections.push("## Overall summary");
  sections.push(summaryText);

  return sections.join("\n");
}

function formatPlainText(summaryText: string, report: {
  wheelScores: Array<{ name: string; score: number }>;
  focusRuns: SummaryRun[];
  startHereFirst: string;
}) {
  const sections = [
    "WHEEL OF LIFE SUMMARY",
    "",
    "Wheel snapshot",
    ...report.wheelScores.map((score) => `- ${score.name}: ${score.score}/10`),
    "",
    "Focus runs",
  ];

  if (report.focusRuns.length === 0) {
    sections.push("- No completed focus runs were saved.");
  } else {
    report.focusRuns.forEach((run) => {
      sections.push(`${run.order + 1}. ${run.areaName}`);
      if (run.whyNow) {
        sections.push(`   Why now: ${run.whyNow}`);
      }
      if (run.selectedBecause.length) {
        sections.push(`   Selected because: ${run.selectedBecause.join("; ")}`);
      }
      if (run.keyObservations?.length) {
        sections.push(`   Observations: ${run.keyObservations.join("; ")}`);
      }
      if (run.limitingBeliefs?.length) {
        sections.push(`   Beliefs: ${run.limitingBeliefs.join("; ")}`);
      }
      if (run.finalGoal) {
        sections.push(`   Goal: ${run.finalGoal}`);
      }
      if (run.nextStep) {
        sections.push(`   Next step: ${run.nextStep}`);
      }
      if (run.commitment) {
        sections.push(`   Commitment: ${run.commitment}`);
      }
      sections.push("");
    });
  }

  sections.push("Start here first");
  sections.push(report.startHereFirst);
  sections.push("");
  sections.push("Overall summary");
  sections.push(summaryText);

  return sections.join("\n");
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function downloadMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function GoalSummaryCard({ session, summary, scores, focusRuns }: Props) {
  const reportFocusRuns = normalizeFocusRuns(summary, focusRuns);
  const overallSummaryText = summary?.overallSummaryText ?? summary?.summaryText ?? "Summary not available yet.";
  const startHereFirst =
    summary?.startHereFirst ??
    reportFocusRuns[0]?.nextStep ??
    "Review the wheel and choose one concrete first move.";
  const markdown = formatMarkdown(overallSummaryText, {
    wheelScores: summary?.wheelScores?.length ? summary.wheelScores : scores,
    focusRuns: reportFocusRuns,
    startHereFirst,
  });
  const plainText = formatPlainText(overallSummaryText, {
    wheelScores: summary?.wheelScores?.length ? summary.wheelScores : scores,
    focusRuns: reportFocusRuns,
    startHereFirst,
  });

  async function handleCopyText() {
    await copyText(plainText);
  }

  async function handleCopyMarkdown() {
    await copyText(markdown);
  }

  function handleDownloadMarkdown() {
    const safeTitle = session.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    downloadMarkdown(`${safeTitle || "wheel-of-life-summary"}.md`, markdown);
  }

  return (
    <section className="panel summary-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Session summary</p>
          <h2>{session.title}</h2>
          <p className="summary-subtitle">
            {reportFocusRuns.length} completed focus run{reportFocusRuns.length === 1 ? "" : "s"} with one clear starting action.
          </p>
        </div>
        <div className="summary-actions">
          <button className="secondary-button" onClick={() => void handleCopyText()} type="button">
            Copy as text
          </button>
          <button className="secondary-button" onClick={() => void handleCopyMarkdown()} type="button">
            Copy as Markdown
          </button>
          <button className="ghost-button" onClick={handleDownloadMarkdown} type="button">
            Download Markdown
          </button>
        </div>
      </div>

      <div className="summary-block">
        <h3>Start here first</h3>
        <p className="summary-callout">{startHereFirst}</p>
      </div>

      <div className="summary-block">
        <h3>Overall summary</h3>
        <p className="summary-text">{overallSummaryText}</p>
      </div>

      <div className="summary-block">
        <h3>Wheel scores</h3>
        <ul className="score-chip-grid summary-chip-grid">
          {(summary?.wheelScores?.length ? summary.wheelScores : scores).map((score) => (
            <li className="score-chip-card" key={score.name} style={getCategoryStyle(score.name)}>
              <span>{score.name}</span>
              <strong>{score.score}/10</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="summary-block">
        <h3>Focus runs</h3>
        <div className="focus-run-list">
          {reportFocusRuns.length === 0 ? (
            <p>No completed focus runs were saved.</p>
          ) : (
            reportFocusRuns.map((run) => (
              <article className="focus-run-card" key={`${run.order}-${run.areaName}`}>
                <div className="focus-run-card__header">
                  <div>
                    <p className="eyebrow">Focus {run.order + 1}</p>
                    <h4>{run.areaName}</h4>
                  </div>
                  <span className="status-note">{run.status}</span>
                </div>
                {run.whyNow ? (
                  <p>
                    <strong>Why now:</strong> {run.whyNow}
                  </p>
                ) : null}
                {run.selectedBecause.length ? (
                  <p>
                    <strong>Selected because:</strong> {run.selectedBecause.join("; ")}
                  </p>
                ) : null}
                {run.keyObservations?.length ? (
                  <p>
                    <strong>Observations:</strong> {run.keyObservations.join("; ")}
                  </p>
                ) : null}
                {run.limitingBeliefs?.length ? (
                  <p>
                    <strong>Beliefs:</strong> {run.limitingBeliefs.join("; ")}
                  </p>
                ) : null}
                {run.finalGoal ? (
                  <p>
                    <strong>Goal:</strong> {run.finalGoal}
                  </p>
                ) : null}
                {run.nextStep ? (
                  <p>
                    <strong>Next step:</strong> {run.nextStep}
                  </p>
                ) : null}
                {run.commitment ? (
                  <p>
                    <strong>Commitment:</strong> {run.commitment}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
