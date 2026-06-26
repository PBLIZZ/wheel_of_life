import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import type { SettingsState, SessionListItem } from "../lib/types";

const MODEL_OPTIONS: Record<SettingsState["provider"], string[]> = {
  openai: ["gpt-5.4-mini", "gpt-5-mini", "gpt-4.1-mini"],
  anthropic: [
    "claude-3-5-haiku-latest",
    "claude-3-7-sonnet-latest",
    "claude-sonnet-4-0",
  ],
};

type Props = {
  busy: boolean;
  open: boolean;
  onClose: () => void;
  onCreate: () => Promise<void>;
  onSaveSettings: (settings: SettingsState) => Promise<void>;
  onSelect: (sessionId: SessionListItem["_id"]) => void;
  onSignOut: () => Promise<void>;
  selectedSessionId: SessionListItem["_id"] | null;
  sessions: SessionListItem[];
  settings: SettingsState;
};

export function SessionSidebar({
  busy,
  open,
  onClose,
  onCreate,
  onSaveSettings,
  onSelect,
  onSignOut,
  selectedSessionId,
  sessions,
  settings,
}: Props) {
  const [draftSettings, setDraftSettings] = useState(settings);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSaveSettings(draftSettings);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="session-drawer-shell">
      <button
        aria-label="Close history and settings"
        className="session-drawer-backdrop"
        onClick={onClose}
        type="button"
      />

      <div className="session-drawer" role="dialog" aria-label="History and settings" aria-modal="true">
        <div className="session-drawer__header">
          <div>
            <p className="eyebrow">Library</p>
            <h2>History and settings</h2>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="session-drawer__section">
          <button className="primary-button" disabled={busy} onClick={() => void onCreate()} type="button">
            New session
          </button>
        </div>

        <div className="session-drawer__section">
          <div className="sidebar-heading">
            <h3>History</h3>
          </div>
          <div className="session-list">
            {sessions.map((session) => {
              const summaryLabel =
                session.summary?.startHereFirst ??
                session.summary?.overallSummaryText ??
                session.summary?.summaryText ??
                "In progress";

              const progressLabel =
                session.currentStage === "summary"
                  ? "Complete"
                  : session.queuedFocusCount
                    ? `Focus ${Math.min((session.completedFocusCount ?? 0) + 1, session.queuedFocusCount)} of ${session.queuedFocusCount}`
                    : session.currentStage.replaceAll("_", " ");

              return (
                <button
                  className={`session-tile ${selectedSessionId === session._id ? "active" : ""}`}
                  key={session._id}
                  onClick={() => onSelect(session._id)}
                  type="button"
                >
                  <strong>{session.title}</strong>
                  <span>{progressLabel}</span>
                  <small>{summaryLabel}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="session-drawer__section">
          <div className="sidebar-heading">
            <h3>Model settings</h3>
          </div>
          <form className="settings-form" onSubmit={handleSave}>
            <label className="field">
              <span>Provider</span>
              <select
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    provider: event.target.value as SettingsState["provider"],
                    model:
                      MODEL_OPTIONS[event.target.value as SettingsState["provider"]][0],
                  }))
                }
                value={draftSettings.provider}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>

            <label className="field">
              <span>Recommended model</span>
              <select
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    model: event.target.value,
                  }))
                }
                value={
                  MODEL_OPTIONS[draftSettings.provider].includes(draftSettings.model)
                    ? draftSettings.model
                    : "__custom__"
                }
              >
                {MODEL_OPTIONS[draftSettings.provider].map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                <option value="__custom__">Custom model</option>
              </select>
            </label>

            <label className="field">
              <span>Model override</span>
              <input
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    model: event.target.value,
                  }))
                }
                placeholder="gpt-5.4-mini"
                value={draftSettings.model}
              />
            </label>

            <button className="secondary-button" disabled={busy} type="submit">
              Save settings
            </button>
          </form>
        </div>

        <button className="ghost-button" onClick={() => void onSignOut()} type="button">
          Sign out
        </button>
      </div>
    </div>
  );
}
