import { useEffect, useState } from "react";

import type { EditableCategory } from "../lib/types";
import { buildCategoryScoreSummary, getCategoryStyle } from "../lib/wheelTheme";
import { WheelChart } from "./WheelChart";

type Props = {
  categories: EditableCategory[];
  busy: boolean;
  onSave: (categories: EditableCategory[]) => Promise<void>;
  onStart: (categories: EditableCategory[]) => Promise<void>;
};

export function WheelScoringEditor({ categories, busy, onSave, onStart }: Props) {
  const [draft, setDraft] = useState<EditableCategory[]>(categories);

  useEffect(() => {
    setDraft(categories);
  }, [categories]);

  function updateCategory(index: number, patch: Partial<EditableCategory>) {
    setDraft((current) =>
      current.map((category, currentIndex) =>
        currentIndex === index ? { ...category, ...patch } : category,
      ),
    );
  }

  const scoreSummary = buildCategoryScoreSummary(draft);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2>Score your wheel</h2>
        </div>
        <button
          className="ghost-button"
          onClick={() =>
            setDraft((current) => [
              ...current,
              { name: `New Category ${current.length + 1}`, score: 5 },
            ])
          }
          type="button"
        >
          Add category
        </button>
      </div>

      <div className="wheel-editor-layout">
        <div className="wheel-hero">
          <WheelChart categories={draft} />
          <div className="wheel-hero__summary">
            <div className="wheel-hero__block">
              <small>Strongest right now</small>
              <p>{scoreSummary.strongest.join(" / ")}</p>
            </div>
            <div className="wheel-hero__block">
              <small>Needs love</small>
              <p>{scoreSummary.weakest.join(" / ")}</p>
            </div>
          </div>
        </div>

        <div className="score-grid">
          {draft.map((category, index) => (
            <div
              className="score-row"
              key={`${category.id ?? "new"}-${index}`}
              style={getCategoryStyle(category.name)}
            >
              <div className="score-row__label">
                <span className="score-row__swatch" />
                <input
                  maxLength={36}
                  onChange={(event) =>
                    updateCategory(index, { name: event.target.value })
                  }
                  value={category.name}
                />
              </div>

              <div className="score-row__slider">
                <input
                  max={10}
                  min={1}
                  onChange={(event) =>
                    updateCategory(index, {
                      score: Number(event.target.value) || 1,
                    })
                  }
                  type="range"
                  value={category.score}
                />
                <div className="score-row__scale">
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>

              <div className="score-row__value">
                <input
                  max={10}
                  min={1}
                  onChange={(event) =>
                    updateCategory(index, {
                      score: Number(event.target.value) || 1,
                    })
                  }
                  type="number"
                  value={category.score}
                />
                <small>/10</small>
              </div>

              <button
                aria-label={`Remove ${category.name}`}
                className="icon-button"
                disabled={draft.length <= 3}
                onClick={() =>
                  setDraft((current) =>
                    current.filter((_, currentIndex) => currentIndex !== index),
                  )
                }
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="action-row">
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => void onSave(draft)}
          type="button"
        >
          Save scores
        </button>
        <button
          className="primary-button"
          disabled={busy}
          onClick={() => void onStart(draft)}
          type="button"
        >
          {busy ? "Starting..." : "Start coaching"}
        </button>
      </div>
    </section>
  );
}
