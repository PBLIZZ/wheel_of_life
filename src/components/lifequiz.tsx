import { CheckCircle2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const CATEGORY_CONFIG = [
  {
    id: "health",
    label: "Health",
    description: "Physical and mental wellbeing",
    start: "#2fbf99",
    end: "#0f9cb0",
    surface: "rgba(47, 191, 153, 0.14)",
  },
  {
    id: "career",
    label: "Career",
    description: "Work satisfaction and progress",
    start: "#4f46d6",
    end: "#2f6bde",
    surface: "rgba(79, 70, 214, 0.13)",
  },
  {
    id: "finances",
    label: "Finances",
    description: "Financial stability and growth",
    start: "#239c5a",
    end: "#2fbf99",
    surface: "rgba(35, 156, 90, 0.14)",
  },
  {
    id: "relationships",
    label: "Relationships",
    description: "Quality of personal connections",
    start: "#d96aae",
    end: "#de5f7b",
    surface: "rgba(217, 106, 174, 0.14)",
  },
  {
    id: "growth",
    label: "Personal Growth",
    description: "Learning and self-improvement",
    start: "#8458d9",
    end: "#4f46d6",
    surface: "rgba(132, 88, 217, 0.14)",
  },
  {
    id: "fun",
    label: "Fun",
    description: "Enjoyment and recreation",
    start: "#f0a43b",
    end: "#e17740",
    surface: "rgba(240, 164, 59, 0.16)",
  },
  {
    id: "spirituality",
    label: "Spirituality",
    description: "Sense of meaning and purpose",
    start: "#7250d9",
    end: "#8d62e6",
    surface: "rgba(114, 80, 217, 0.14)",
  },
  {
    id: "environment",
    label: "Environment",
    description: "Living space and surroundings",
    start: "#0f9cb0",
    end: "#37b6cc",
    surface: "rgba(15, 156, 176, 0.14)",
  },
] as const;

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type CategoryId = (typeof CATEGORY_CONFIG)[number]["id"];
type QuizValues = Record<CategoryId, number>;

const INITIAL_VALUES: QuizValues = {
  health: 5,
  career: 5,
  finances: 5,
  relationships: 5,
  growth: 5,
  fun: 5,
  spirituality: 5,
  environment: 5,
};

function getEmoji(score: number) {
  if (score <= 3) {
    return "😞";
  }
  if (score <= 5) {
    return "😐";
  }
  if (score <= 7) {
    return "🙂";
  }
  return "😄";
}

export default function LifeQuiz() {
  const [values, setValues] = useState<QuizValues>(INITIAL_VALUES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) {
        window.clearTimeout(submitTimerRef.current);
      }
    };
  }, []);

  function handleScoreChange(categoryId: CategoryId, nextValue: number) {
    setValues((current) => ({
      ...current,
      [categoryId]: nextValue,
    }));
  }

  function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (submitTimerRef.current !== null) {
      window.clearTimeout(submitTimerRef.current);
    }

    setIsSubmitting(true);
    submitTimerRef.current = window.setTimeout(() => {
      console.info("[life-quiz] submitted values", values);
      setIsSubmitting(false);
      setSubmitted(true);
      submitTimerRef.current = null;
    }, 1500);
  }

  function handleEditResponses() {
    setSubmitted(false);
  }

  const averageScore =
    Object.values(values).reduce((sum, score) => sum + score, 0) / CATEGORY_CONFIG.length;

  return (
    <section className="panel life-quiz" aria-labelledby="life-quiz-title">
      <header className="life-quiz__header">
        <p className="eyebrow">Snapshot</p>
        <h2 id="life-quiz-title">Life satisfaction quiz</h2>
        <p className="life-quiz__lede">
          Rate each area from 1 to 10 for a quick wheel-of-life snapshot you can revisit.
        </p>
      </header>

      {submitted ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="life-quiz__result"
          initial={{ opacity: 0, y: 20 }}
        >
          <div className="life-quiz__result-icon" aria-hidden="true">
            <CheckCircle2 />
          </div>
          <p className="life-quiz__result-kicker">Responses saved</p>
          <h3>Thank you.</h3>
          <p className="life-quiz__result-copy">
            Your current average satisfaction score is <strong>{averageScore.toFixed(1)}/10</strong>.
          </p>
          <div className="life-quiz__result-emoji" aria-hidden="true">
            {getEmoji(averageScore)}
          </div>
          <button className="secondary-button" onClick={handleEditResponses} type="button">
            Edit responses
          </button>
        </motion.div>
      ) : (
        <>
          <div className="life-quiz__grid">
            {CATEGORY_CONFIG.map((category, index) => {
              const score = values[category.id];
              const cardStyle = {
                "--life-quiz-start": category.start,
                "--life-quiz-end": category.end,
                "--life-quiz-surface": category.surface,
                "--life-quiz-progress": `${score * 10}%`,
              } as CSSProperties;

              return (
                <motion.article
                  key={category.id}
                  animate={{ opacity: 1, y: 0 }}
                  className="life-quiz__card"
                  initial={{ opacity: 0, y: 16 }}
                  style={cardStyle}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="life-quiz__card-header">
                    <div>
                      <h3>{category.label}</h3>
                      <p>{category.description}</p>
                    </div>
                    <div className="life-quiz__score-pill" aria-label={`${category.label} score ${score} out of 10`}>
                      <span aria-hidden="true">{getEmoji(score)}</span>
                      <strong>{score}</strong>
                    </div>
                  </div>

                  <div className="life-quiz__progress" aria-hidden="true">
                    <span />
                  </div>

                  <div className="life-quiz__options" role="group" aria-label={`${category.label} rating`}>
                    {SCORE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        aria-label={`Rate ${category.label} ${option} out of 10`}
                        className="life-quiz__option"
                        data-active={score === option}
                        onClick={() => handleScoreChange(category.id, option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </motion.article>
              );
            })}
          </div>

          <footer className="life-quiz__footer">
            <div className="life-quiz__summary">
              <span className="life-quiz__summary-label">Average right now</span>
              <strong>{averageScore.toFixed(1)}/10</strong>
            </div>
            <button className="primary-button life-quiz__submit" disabled={isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? (
                <span className="life-quiz__submit-label">
                  <span className="life-quiz__spinner" aria-hidden="true" />
                  Processing
                </span>
              ) : (
                <span className="life-quiz__submit-label">
                  Submit
                  <ChevronRight size={18} />
                </span>
              )}
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
