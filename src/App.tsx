import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { AuthScreen } from "./components/AuthScreen";
import { ChatPanel } from "./components/ChatPanel";
import { FocusSelector } from "./components/FocusSelector";
import { GoalSummaryCard } from "./components/GoalSummaryCard";
import { SessionSidebar } from "./components/SessionSidebar";
import { StageProgress } from "./components/StageProgress";
import { WheelChart } from "./components/WheelChart";
import { WheelScoringEditor } from "./components/WheelScoringEditor";
import type { EditableCategory, SettingsState } from "./lib/types";
import { getCategoryStyle } from "./lib/wheelTheme";

function normalizeCategories(categories: Array<{ _id?: Id<"sessionCategories">; name: string; score: number }>) {
  return categories.map((category) => ({
    id: category._id,
    name: category.name,
    score: category.score,
  }));
}

function normalizeFocusProgress(session: {
  currentStage: string;
  queuedFocusCount?: number | null;
  completedFocusCount?: number | null;
}) {
  const queued = session.queuedFocusCount ?? 0;
  const completed = session.completedFocusCount ?? 0;

  if (session.currentStage === "summary") {
    return "Session complete";
  }

  if (session.currentStage === "focus_selection") {
    return completed > 0 ? "Adding more focus" : "Building focus queue";
  }

  if (session.currentStage === "focus_checkpoint") {
    if (queued > 0) {
      return completed > 0
        ? `Focus ${completed} of ${queued} complete`
        : `Focus queue ready (${queued})`;
    }

    return "Focus checkpoint";
  }

  if (session.currentStage === "wheel_scoring") {
    return "Wheel snapshot";
  }

  if (queued > 0) {
    return `Focus ${Math.min(completed + 1, queued)} of ${queued}`;
  }

  return "Session in progress";
}

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [selectedSessionId, setSelectedSessionId] = useState<Id<"sessions"> | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const sessions = useQuery(api.sessions.listSessions, isAuthenticated ? {} : "skip");
  const settings = useQuery(api.settings.getMySettings, isAuthenticated ? {} : "skip");
  const sessionData = useQuery(
    api.sessions.getSession,
    isAuthenticated && selectedSessionId ? { sessionId: selectedSessionId } : "skip",
  );

  const createSession = useMutation(api.sessions.createSession);
  const saveWheelScores = useMutation(api.sessions.saveWheelScores);
  const saveMySettings = useMutation(api.settings.saveMySettings);
  const startReflection = useAction(api.coach.startReflection);
  const buildFocusQueue = useAction(api.coach.buildFocusQueue);
  const submitStageResponse = useAction(api.coach.submitStageResponse);
  const resolveFocusCheckpoint = useAction(api.coach.resolveFocusCheckpoint);

  useEffect(() => {
    if (!sessions) {
      return;
    }

    if (sessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }

    const stillExists = selectedSessionId
      ? sessions.some((session) => session._id === selectedSessionId)
      : false;

    if (!selectedSessionId || !stillExists) {
      setSelectedSessionId(sessions[0]._id);
    }
  }, [selectedSessionId, sessions]);

  async function withBusy<T>(label: string, fn: () => Promise<T>) {
    setBusyLabel(label);
    setErrorMessage(null);
    try {
      const result = await fn();
      console.info("[wheel] action succeeded", { label });
      return result;
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Something went wrong. Check the console for details.";

      console.error("[wheel] action failed", {
        label,
        error,
      });
      setErrorMessage(nextMessage);
      return null;
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleCreateSession() {
    const sessionId = await withBusy("Creating session", () =>
      createSession({ createdAt: Date.now() }),
    );
    if (!sessionId) {
      return;
    }
    setSelectedSessionId(sessionId);
    setLibraryOpen(false);
  }

  async function handleSaveWheel(categories: EditableCategory[]) {
    if (!selectedSessionId) {
      return;
    }

    await withBusy("Saving scores", () =>
      saveWheelScores({
        sessionId: selectedSessionId,
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
          score: category.score,
        })),
        updatedAt: Date.now(),
      }),
    );
  }

  async function handleStart(categories: EditableCategory[]) {
    if (!selectedSessionId) {
      return;
    }

    await handleSaveWheel(categories);
    await withBusy("Starting coaching", () =>
      startReflection({ sessionId: selectedSessionId }),
    );
  }

  async function handleSaveSettings(nextSettings: SettingsState) {
    await withBusy("Saving settings", () =>
      saveMySettings({
        provider: nextSettings.provider,
        model: nextSettings.model,
        updatedAt: Date.now(),
      }),
    );
  }

  async function handleFocusConfirm(payload: {
    needsAttention: string;
    wantsToImprove: string;
    excitedReady: string;
    queueNotes: Array<{ areaName: string; whyNow?: string }>;
  }) {
    if (!selectedSessionId || !sessionData) {
      return;
    }

    const startImmediately = completedFocusCount === 0;

    await withBusy("Building focus queue", () =>
      buildFocusQueue({
        sessionId: selectedSessionId,
        needsAttention: payload.needsAttention,
        wantsToImprove: payload.wantsToImprove,
        excitedReady: payload.excitedReady,
        queueNotes: payload.queueNotes,
        startImmediately,
      }),
    );
  }

  async function handleStageResponse(message: string) {
    if (!selectedSessionId || !sessionData) {
      return false;
    }

    console.info("[wheel] submitting stage response", {
      sessionId: selectedSessionId,
      stage: sessionData.session.currentStage,
      messageLength: message.length,
    });

    const result = await withBusy("Sending response", () =>
      submitStageResponse({
        sessionId: selectedSessionId,
        message,
      }),
    );

    return result !== null;
  }

  async function handleContinueFocus() {
    if (!selectedSessionId) {
      return;
    }

    await withBusy("Continuing focus", () =>
      resolveFocusCheckpoint({
        sessionId: selectedSessionId,
        choice: "continue",
      }),
    );
  }

  async function handleAddAnotherFocus() {
    if (!selectedSessionId) {
      return;
    }

    await withBusy("Adding focus", () =>
      resolveFocusCheckpoint({
        sessionId: selectedSessionId,
        choice: "add_another_focus",
      }),
    );
  }

  async function handleFinishSession() {
    if (!selectedSessionId) {
      return;
    }

    await withBusy("Finishing session", () =>
      resolveFocusCheckpoint({
        sessionId: selectedSessionId,
        choice: "finish",
      }),
    );
  }

  if (isLoading) {
    return <main className="loading-shell">Loading Wheel of Life Coach...</main>;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (!sessions || !settings) {
    return <main className="loading-shell">Loading your sessions...</main>;
  }

  const currentSettings: SettingsState = {
    provider: settings.provider,
    model: settings.model,
    updatedAt: settings.updatedAt,
  };

  const wheelCategories = sessionData ? normalizeCategories(sessionData.categories) : [];
  const usedFocusAreas = new Set(sessionData?.focusRuns.map((run) => run.areaName) ?? []);
  const completedFocusCount = sessionData
    ? sessionData.session.completedFocusCount ??
      sessionData.focusRuns.filter((run) => run.status === "completed").length
    : 0;
  const remainingCategories = sessionData
    ? sessionData.categories.filter((category) => !usedFocusAreas.has(category.name))
    : [];
  const focusSelectionMode = sessionData && completedFocusCount > 0 ? "add_more" : "initial";
  const hasQueuedFocusRuns = Boolean(sessionData?.focusRuns.some((run) => run.status === "queued"));
  const canAddAnotherFocus = remainingCategories.length > 0;
  const focusProgress = sessionData
    ? normalizeFocusProgress(sessionData.session)
    : "Session in progress";
  const completedRuns = sessionData?.focusRuns.filter((run) => run.status === "completed").length ?? 0;
  const activeRuns = sessionData?.focusRuns.filter((run) => run.status === "active").length ?? 0;
  const queuedRuns = sessionData?.focusRuns.filter((run) => run.status === "queued").length ?? 0;
  const insightRun = sessionData
    ? sessionData.activeFocusRun ??
      [...sessionData.focusRuns]
        .filter((run) => run.status === "completed")
        .sort((left, right) => right.order - left.order)[0] ??
      null
    : null;
  const focusObservations = insightRun?.keyObservations?.length
    ? insightRun.keyObservations
    : sessionData?.session.keyObservations ?? [];
  const focusBeliefs = insightRun?.limitingBeliefs?.length
    ? insightRun.limitingBeliefs
    : sessionData?.session.limitingBeliefs ?? [];
  const focusGoal = insightRun?.finalGoal ?? sessionData?.session.finalGoal ?? null;
  const focusNextStep = insightRun?.nextStep ?? sessionData?.session.nextStep ?? null;

  return (
    <div className="app-shell">
      <main className="main-shell">
        {busyLabel ? <div className="busy-banner">{busyLabel}</div> : null}
        {errorMessage ? (
          <div className="error-banner" role="alert">
            <strong>Could not complete that step.</strong>
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {!sessionData ? (
          <section className="hero-panel">
            <p className="eyebrow">Start here</p>
            <h2>Create your first session</h2>
            <p>
              Score the wheel, build a small queue of focus areas, and work through
              each run until you have one combined summary and one clear place to
              start.
            </p>
            <button
              className="primary-button"
              onClick={() => void handleCreateSession()}
              type="button"
            >
              Create first session
            </button>
          </section>
        ) : (
          <>
            <StageProgress
              currentStage={sessionData.session.currentStage}
              focusProgress={focusProgress}
              model={currentSettings.model}
              onOpenLibrary={() => setLibraryOpen((current) => !current)}
              provider={currentSettings.provider}
              sessionTitle={sessionData.session.title}
            />

            <div className="session-layout">
              <section className="session-workspace">
                {sessionData.session.currentStage === "wheel_scoring" ? (
                  <WheelScoringEditor
                    busy={Boolean(busyLabel)}
                    categories={wheelCategories}
                    onSave={handleSaveWheel}
                    onStart={handleStart}
                  />
                ) : (
                  <>
                    <ChatPanel
                      busy={Boolean(busyLabel)}
                      canAddAnotherFocus={canAddAnotherFocus}
                      currentStage={sessionData.session.currentStage}
                      data={sessionData}
                      errorMessage={errorMessage}
                      onAddAnotherFocus={
                        canAddAnotherFocus ? handleAddAnotherFocus : undefined
                      }
                      onContinueFocus={hasQueuedFocusRuns ? handleContinueFocus : undefined}
                      onFinishSession={handleFinishSession}
                      onSubmit={handleStageResponse}
                    />

                    {sessionData.session.currentStage === "focus_selection" ? (
                      <FocusSelector
                        key={`${sessionData.session._id}-${focusSelectionMode}-${remainingCategories
                          .map((category) => category.name)
                          .join("|")}`}
                        busy={Boolean(busyLabel)}
                        categories={
                          remainingCategories.length > 0
                            ? normalizeCategories(remainingCategories)
                            : wheelCategories
                        }
                        mode={focusSelectionMode}
                        onConfirm={handleFocusConfirm}
                        recommendedFocusAreas={sessionData.session.recommendedFocusAreas ?? undefined}
                        recommendedFocusReason={sessionData.session.recommendedFocusReason ?? undefined}
                      />
                    ) : null}

                    {sessionData.session.currentStage === "summary" ? (
                      <GoalSummaryCard
                        focusRuns={sessionData.focusRuns}
                        scores={sessionData.categories.map((category) => ({
                          name: category.name,
                          score: category.score,
                        }))}
                        session={sessionData.session}
                        summary={sessionData.summary}
                      />
                    ) : null}

                  </>
                )}
              </section>

              <aside className="session-rail">
                <section className="panel rail-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Wheel reference</p>
                      <h2>Current wheel</h2>
                    </div>
                  </div>
                  <div className="wheel-editor-layout compact">
                    <WheelChart categories={wheelCategories} />
                    <ul className="score-chip-grid">
                      {sessionData.categories.map((category) => (
                        <li
                          className="score-chip-card"
                          key={category._id}
                          style={getCategoryStyle(category.name)}
                        >
                          <span>{category.name}</span>
                          <strong>{category.score}/10</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="panel rail-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Focus status</p>
                      <h2>
                        {sessionData.activeFocusRun?.areaName ||
                          sessionData.session.focusArea ||
                          "Queue status"}
                      </h2>
                    </div>
                  </div>
                  <div className="summary-block">
                    <p>{focusProgress}</p>
                    <ul className="compact-list">
                      <li>
                        <span>Completed</span>
                        <strong>{sessionData.session.completedFocusCount ?? completedRuns}</strong>
                      </li>
                      <li>
                        <span>Active</span>
                        <strong>{activeRuns}</strong>
                      </li>
                      <li>
                        <span>Still queued</span>
                        <strong>{queuedRuns}</strong>
                      </li>
                    </ul>
                    {focusObservations.length ? (
                      <div className="insight-card">
                        <strong>What seems true right now</strong>
                        <ul className="insight-list">
                          {focusObservations.slice(0, 3).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {focusBeliefs.length ? (
                      <div className="insight-card insight-card--beliefs">
                        <strong>Friction or inner conflict</strong>
                        <ul className="insight-list">
                          {focusBeliefs.slice(0, 3).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {focusGoal || focusNextStep ? (
                      <div className="insight-card insight-card--action">
                        <strong>Working direction</strong>
                        {focusGoal ? <p>{focusGoal}</p> : null}
                        {focusNextStep ? <small>{focusNextStep}</small> : null}
                      </div>
                    ) : null}
                    {sessionData.focusRuns.length ? (
                      <div className="queue-status">
                        <strong>Queue</strong>
                        <ol className="queue-status__list">
                          {sessionData.focusRuns.map((run) => (
                            <li key={run._id}>
                              <span>{run.areaName}</span>
                              <span className={`status-badge status-badge--${run.status}`}>
                                {run.status}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {sessionData.session.currentStage === "focus_selection" ? (
                      <div className="recommendation-card">
                        <strong>Available categories</strong>
                        <p>
                          {remainingCategories.length
                            ? remainingCategories.map((category) => category.name).join(", ")
                            : "No remaining categories"}
                        </p>
                      </div>
                    ) : null}
                    {sessionData.session.currentStage === "summary" && sessionData.summary ? (
                      <div className="recommendation-card">
                        <strong>Start here first</strong>
                        <p>{sessionData.summary.startHereFirst ?? "Review the summary above."}</p>
                      </div>
                    ) : null}
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>

      <SessionSidebar
        busy={Boolean(busyLabel)}
        onClose={() => setLibraryOpen(false)}
        onCreate={handleCreateSession}
        onSaveSettings={handleSaveSettings}
        onSelect={(sessionId) => {
          setSelectedSessionId(sessionId);
          setLibraryOpen(false);
        }}
        onSignOut={signOut}
        open={libraryOpen}
        selectedSessionId={selectedSessionId}
        sessions={sessions}
        settings={currentSettings}
      />
    </div>
  );
}
