export default function Sparkline({
  values = [],
  color = "#8b5cf6",
  height = 28,
  width = 120,
  strokeWidth = 1.5,
  showArea = true,
}) {
  if (!values?.length) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line
          x1="0" x2={width}
          y1={height / 2} y2={height / 2}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const path = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${path} L${points[points.length - 1][0]},${height} L0,${height} Z`
      : "";

  const id = `sg-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} className="block">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <path d={areaPath} fill={`url(#${id})`} />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  );
}
