import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import type { EditableCategory } from "../lib/types";

type QueueNote = {
  areaName: string;
  whyNow?: string;
};

type FocusQueuePayload = {
  needsAttention: string;
  wantsToImprove: string;
  excitedReady: string;
  queueNotes: QueueNote[];
};

type Props = {
  busy: boolean;
  categories: EditableCategory[];
  mode: "initial" | "add_more";
  recommendedFocusAreas?: string[];
  recommendedFocusReason?: string;
  onConfirm: (payload: FocusQueuePayload) => Promise<void>;
};

function dedupeAreas(...areas: string[]) {
  return Array.from(new Set(areas.map((area) => area.trim()).filter(Boolean)));
}

function pickPreferredArea(preferred: string | undefined, categories: EditableCategory[]) {
  if (preferred && categories.some((category) => category.name === preferred)) {
    return preferred;
  }

  return categories[0]?.name || "";
}

function pickInitialSelections(
  categories: EditableCategory[],
  recommendedFocusAreas?: string[],
) {
  const rankedCategories = [...categories].sort((left, right) => left.score - right.score);
  const seeded = dedupeAreas(
    ...(recommendedFocusAreas ?? []),
    ...rankedCategories.map((category) => category.name),
  );

  return {
    needsAttention: seeded[0] ?? "",
    wantsToImprove: seeded[1] ?? seeded[0] ?? "",
    excitedReady: seeded[2] ?? seeded[1] ?? seeded[0] ?? "",
  };
}

export function FocusSelector({
  busy,
  categories,
  mode,
  recommendedFocusAreas,
  recommendedFocusReason,
  onConfirm,
}: Props) {
  const initialSelections = pickInitialSelections(categories, recommendedFocusAreas);
  const [needsAttention, setNeedsAttention] = useState(
    pickPreferredArea(initialSelections.needsAttention, categories),
  );
  const [wantsToImprove, setWantsToImprove] = useState(
    pickPreferredArea(initialSelections.wantsToImprove, categories),
  );
  const [excitedReady, setExcitedReady] = useState(
    pickPreferredArea(initialSelections.excitedReady, categories),
  );
  const [notes, setNotes] = useState<Record<string, string>>({});

  const queue = useMemo(
    () => dedupeAreas(needsAttention, wantsToImprove, excitedReady),
    [excitedReady, needsAttention, wantsToImprove],
  );
  const queueReasons = useMemo(() => {
    const reasons = new Map<string, string[]>();

    for (const [label, area] of [
      ["Needs attention", needsAttention],
      ["Wants to improve", wantsToImprove],
      ["Excited / ready", excitedReady],
    ] as const) {
      if (!area.trim()) {
        continue;
      }

      const existing = reasons.get(area) ?? [];
      existing.push(label);
      reasons.set(area, existing);
    }

    return reasons;
  }, [excitedReady, needsAttention, wantsToImprove]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (queue.length === 0) {
      return;
    }

    void onConfirm({
      needsAttention,
      wantsToImprove,
      excitedReady,
      queueNotes: queue.map((areaName) => ({
        areaName,
        whyNow: notes[areaName],
      })),
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 3</p>
          <h2>{mode === "initial" ? "Build your focus queue" : "Add another focus"}</h2>
        </div>
        <span className="status-note">
          {queue.length} area{queue.length === 1 ? "" : "s"} queued
        </span>
      </div>

      <p className="lede">
        {mode === "initial"
          ? "Choose the area that needs attention, the one you most want to improve, and the one you feel ready to work on now. The queue below shows the deduped order the session will follow."
          : "Choose from the remaining areas. New picks append to the queue without duplicating anything already completed or in progress."}
      </p>

      {recommendedFocusAreas?.length ? (
        <div className="recommendation-card">
          <strong>Reflection surfaced:</strong>
          <p>{recommendedFocusAreas.join(" / ")}</p>
          {recommendedFocusReason ? <small>{recommendedFocusReason}</small> : null}
        </div>
      ) : null}

      <form className="focus-form" onSubmit={handleSubmit}>
        <div className="lens-grid">
          <label className="field">
            <span>Needs attention</span>
            <small className="field-hint">Where the friction is costing you most right now.</small>
            <select onChange={(event) => setNeedsAttention(event.target.value)} value={needsAttention}>
              {categories.map((category) => (
                <option key={category.id ?? category.name} value={category.name}>
                  {category.name} ({category.score}/10)
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Wants to improve</span>
            <small className="field-hint">What you genuinely want to get better, not what you should pick.</small>
            <select onChange={(event) => setWantsToImprove(event.target.value)} value={wantsToImprove}>
              {categories.map((category) => (
                <option key={category.id ?? category.name} value={category.name}>
                  {category.name} ({category.score}/10)
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Excited / ready</span>
            <small className="field-hint">What has the best chance of moving because your energy is there.</small>
            <select onChange={(event) => setExcitedReady(event.target.value)} value={excitedReady}>
              {categories.map((category) => (
                <option key={category.id ?? category.name} value={category.name}>
                  {category.name} ({category.score}/10)
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="queue-preview">
          <h3>Queued order</h3>
          <p>The first unique item becomes the active run. Duplicate lens picks are folded into a single focus so the session stays tight.</p>

          <div className="queue-preview__list">
            {queue.map((areaName, index) => (
              <div className="queue-preview__item" key={areaName}>
                <div className="queue-preview__item-header">
                  <span className="queue-preview__index">{index + 1}</span>
                  <div>
                    <strong>{areaName}</strong>
                    <div className="queue-preview__reasons">
                      {(queueReasons.get(areaName) ?? []).map((reason) => (
                        <span className="status-note" key={`${areaName}-${reason}`}>
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <label className="field">
                  <span>Why now? Optional, but useful if there is a clear reason.</span>
                  <textarea
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [areaName]: event.target.value,
                      }))
                    }
                    placeholder={`Why is ${areaName.toLowerCase()} worth working on now?`}
                    rows={3}
                    value={notes[areaName] ?? ""}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <button className="primary-button" disabled={busy || queue.length === 0} type="submit">
          {busy
            ? "Building queue..."
            : mode === "initial"
              ? "Build queue and start"
              : "Add focus to queue"}
        </button>
      </form>
    </section>
  );
}
