export const chartTheme = {
  axis: "#475569",
  grid: "rgba(148,163,184,0.12)",
  tooltipBg: "#0b1020",
  tooltipBorder: "rgba(124,92,255,0.3)",
  text: "#cbd5e1",
};

export const tooltipStyle = {
  contentStyle: {
    background: chartTheme.tooltipBg,
    border: `1px solid ${chartTheme.tooltipBorder}`,
    borderRadius: 12,
    color: chartTheme.text,
    fontSize: 12,
  },
  labelStyle: { color: chartTheme.text, fontWeight: 600 },
  cursor: { fill: "rgba(124,92,255,0.06)" },
};
