import type { EditableCategory } from "../lib/types";
import { getCategoryTheme } from "../lib/wheelTheme";

function polarPoint(index: number, count: number, score: number, radius: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  const scaled = (score / 10) * radius;
  const x = 120 + Math.cos(angle) * scaled;
  const y = 120 + Math.sin(angle) * scaled;
  return `${x},${y}`;
}

function axisPoint(index: number, count: number, radius: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  const x = 120 + Math.cos(angle) * radius;
  const y = 120 + Math.sin(angle) * radius;
  return { x, y };
}

function polygonRing(count: number, radius: number) {
  return Array.from({ length: count }, (_, index) => {
    const { x, y } = axisPoint(index, count, radius);
    return `${x},${y}`;
  }).join(" ");
}

export function WheelChart({ categories }: { categories: EditableCategory[] }) {
  if (categories.length < 3) {
    return null;
  }

  const count = categories.length;
  const polygon = categories
    .map((category, index) =>
      polarPoint(index, count, category.score, 88),
    )
    .join(" ");

  return (
    <svg className="wheel-chart" viewBox="0 0 240 240" aria-label="Wheel of life chart">
      {[20, 40, 60, 80, 100].map((percent) => (
        <polygon
          className="wheel-grid"
          key={percent}
          points={polygonRing(count, (88 * percent) / 100)}
        />
      ))}

      {categories.map((category, index) => {
        const theme = getCategoryTheme(category.name);
        const { x, y } = axisPoint(index, count, 88);
        const { x: dotX, y: dotY } = axisPoint(index, count, (88 * category.score) / 10);
        const { x: labelX, y: labelY } = axisPoint(index, count, 108);

        return (
          <g key={category.name}>
            <line
              className="wheel-axis"
              style={{ stroke: theme.color }}
              x1="120"
              x2={x}
              y1="120"
              y2={y}
            />
            <circle
              className="wheel-dot"
              cx={dotX}
              cy={dotY}
              r="3.6"
              style={{ fill: theme.color }}
            />
            <text className="wheel-label" style={{ fill: theme.ink }} x={labelX} y={labelY}>
              {theme.shortLabel} {category.score}
            </text>
          </g>
        );
      })}

      <polygon className="wheel-area" points={polygon} />
    </svg>
  );
}
