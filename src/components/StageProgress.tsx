import type { SessionStage } from "../lib/types";

const orderedStages: SessionStage[] = [
  "wheel_scoring",
  "reflection",
  "focus_selection",
  "reality_exploration",
  "belief_conflict_exploration",
  "goal_creation",
  "obstacles",
  "next_action",
  "focus_checkpoint",
  "summary",
];

const labels: Record<SessionStage, string> = {
  wheel_scoring: "Wheel",
  reflection: "Reflect",
  focus_selection: "Queue",
  reality_exploration: "Reality",
  belief_conflict_exploration: "Beliefs",
  goal_creation: "Goal",
  obstacles: "Obstacles",
  next_action: "Action",
  focus_checkpoint: "Checkpoint",
  summary: "Summary",
};

type Props = {
  currentStage: SessionStage;
  focusProgress: string;
  provider: string;
  model: string;
  sessionTitle: string;
  onOpenLibrary: () => void;
};

export function StageProgress({
  currentStage,
  focusProgress,
  provider,
  model,
  sessionTitle,
  onOpenLibrary,
}: Props) {
  const currentIndex = orderedStages.indexOf(currentStage);

  return (
    <header className="session-header">
      <div className="session-header__title">
        <div>
          <p className="eyebrow">Wheel of Life Coach</p>
          <h1>{sessionTitle}</h1>
          <p className="session-header__subtitle">
            One wheel snapshot, one clear focus at a time.
          </p>
        </div>
        <button className="secondary-button session-menu-button" onClick={onOpenLibrary} type="button">
          Library
        </button>
      </div>

      <div className="session-header__meta">
        <div className="stage-progress">
          {orderedStages.map((stage, index) => {
            const status =
              index < currentIndex
                ? "done"
                : index === currentIndex
                  ? "current"
                  : "upcoming";

            return (
              <div className={`stage-pill ${status}`} key={stage}>
                <span>{labels[stage]}</span>
              </div>
            );
          })}
        </div>

        <div className="session-header__chips">
          <span className="status-note">{focusProgress}</span>
          <span className="status-note">{provider}</span>
          <span className="status-note">{model}</span>
        </div>
      </div>
    </header>
  );
}
