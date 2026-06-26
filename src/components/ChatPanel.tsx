import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { SessionDetails, SessionStage } from "../lib/types";

const placeholders: Partial<Record<SessionStage, string>> = {
  reflection: "What stands out to you from the wheel?",
  reality_exploration: "Describe what this area looks like in real life.",
  belief_conflict_exploration: "What feels stuck, conflicted, or unsafe here?",
  goal_creation: "What goal would feel honest and doable?",
  obstacles: "What is most likely to derail this?",
  next_action: "What tiny step will you take in the next 24-48 hours?",
};

type Props = {
  busy: boolean;
  currentStage: SessionStage;
  data: SessionDetails;
  errorMessage?: string | null;
  onSubmit: (message: string) => Promise<boolean>;
  onContinueFocus?: () => Promise<void>;
  onAddAnotherFocus?: () => Promise<void>;
  onFinishSession?: () => Promise<void>;
  canAddAnotherFocus?: boolean;
};

function stageCopy(stage: SessionStage) {
  switch (stage) {
    case "wheel_scoring":
      return "Score the wheel to begin.";
    case "reflection":
      return "Reflect on the pattern before narrowing.";
    case "focus_selection":
      return "Build the queue from the three lenses.";
    case "reality_exploration":
      return "Talk through what this focus looks like in real life.";
    case "belief_conflict_exploration":
      return "Surface the beliefs or payoffs that may be getting in the way.";
    case "goal_creation":
      return "Turn the insight into a practical goal.";
    case "obstacles":
      return "Name the failure points and supports.";
    case "next_action":
      return "Set the next 24 to 48 hour commitment.";
    case "focus_checkpoint":
      return "Choose whether to continue, add another focus, or finish.";
    case "summary":
      return "Review the combined summary and export it if needed.";
  }
}

export function ChatPanel({
  busy,
  currentStage,
  data,
  errorMessage,
  onSubmit,
  onContinueFocus,
  onAddAnotherFocus,
  onFinishSession,
  canAddAnotherFocus = false,
}: Props) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const focusRunNames = useMemo(
    () =>
      new Map(data.focusRuns.map((run) => [run._id, run.areaName])),
    [data.focusRuns],
  );
  const showInput = useMemo(
    () =>
      ![
        "wheel_scoring",
        "focus_selection",
        "focus_checkpoint",
        "summary",
      ].includes(currentStage),
    [currentStage],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: data.messages.length > 1 ? "smooth" : "auto",
      block: "end",
    });
  }, [data.messages.length, currentStage]);

  useEffect(() => {
    if (showInput && !busy) {
      textareaRef.current?.focus();
    }
  }, [busy, showInput, currentStage, data.messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draftMessage = message;
    const nextMessage = draftMessage.trim();
    if (!nextMessage) {
      return;
    }

    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }

    const submitted = await onSubmit(nextMessage);
    if (!submitted) {
      setMessage(draftMessage);
    }
  }

  const emptyStateCopy =
    currentStage === "wheel_scoring"
      ? "Save your wheel and start the session to generate the first coaching turn."
      : currentStage === "focus_selection"
          ? "The reflection turn is done. Use the queue builder below."
        : data.messages.length === 0
          ? "No conversation yet."
          : null;
  const activeFocusLabel =
    data.activeFocusRun?.areaName ??
    (currentStage === "focus_selection"
      ? "Queue builder"
      : currentStage === "focus_checkpoint"
        ? "Focus checkpoint"
        : null);

  return (
    <section className="panel chat-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Coaching transcript</p>
          <h2>{stageCopy(currentStage)}</h2>
        </div>
        <div className="chat-panel__meta">
          {activeFocusLabel ? <span className="status-note">{activeFocusLabel}</span> : null}
          <span className="status-note">{data.session.currentStage.replaceAll("_", " ")}</span>
        </div>
      </div>

      {currentStage === "focus_selection" ? (
        <div className="stage-handoff">
          Reflection complete. Choose up to three focus areas and the app will turn them into a clean queue.
        </div>
      ) : null}

      {currentStage === "focus_checkpoint" ? (
        <div className="stage-handoff">
          Focus {data.session.completedFocusCount ?? 0} complete. Continue with the next queued area, add one more, or finish now.
        </div>
      ) : null}

      <div className="message-list">
        {data.messages.length === 0 ? (
          <div className="empty-state">{emptyStateCopy}</div>
        ) : (
          data.messages.map((messageItem) => (
            <article className={`message ${messageItem.role}`} key={messageItem._id}>
              <header>
                <span>{messageItem.role === "assistant" ? "Coach" : "You"}</span>
                <div className="message__meta">
                  {messageItem.focusRunId ? (
                    <span>{focusRunNames.get(messageItem.focusRunId) ?? "Focus run"}</span>
                  ) : null}
                  <span>{messageItem.stage.replaceAll("_", " ")}</span>
                </div>
              </header>
              <p>{messageItem.content}</p>
            </article>
          ))
        )}
        <div ref={endRef} />
      </div>

      {currentStage === "focus_checkpoint" ? (
        <div className="checkpoint-actions">
          <button className="primary-button" disabled={busy || !onContinueFocus} onClick={() => void onContinueFocus?.()} type="button">
            Continue next focus
          </button>
          <button className="secondary-button" disabled={busy || !canAddAnotherFocus || !onAddAnotherFocus} onClick={() => void onAddAnotherFocus?.()} type="button">
            Add another focus
          </button>
          <button className="ghost-button" disabled={busy || !onFinishSession} onClick={() => void onFinishSession?.()} type="button">
            Finish session now
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="chat-error-banner" role="alert">
          <strong>Could not complete that step.</strong>
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {showInput ? (
        <form className="chat-form" onSubmit={handleSubmit}>
          <textarea
            onChange={(event) => setMessage(event.target.value)}
            placeholder={placeholders[currentStage]}
            ref={textareaRef}
            rows={5}
            value={message}
          />
          <button className="primary-button" disabled={busy || !message.trim()} type="submit">
            {busy ? "Sending..." : "Submit response"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
