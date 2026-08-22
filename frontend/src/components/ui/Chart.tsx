import React from "react";
import type { TrendDataPoint } from "@/types/analytics";

interface ChartProps {
  data: TrendDataPoint[];
  height?: number;
}

export const SimpleLineChart: React.FC<ChartProps> = ({ data, height = 240 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center font-sans text-xs text-[#5D5A55] italic">
        No trend data available for period.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 5);
  const minVal = 0;
  const padding = 30;
  const chartWidth = 700;
  const chartHeight = height;

  // Calculate points
  const points = data.map((d, idx) => {
    const x = padding + (idx / (data.length - 1 || 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((d.count - minVal) / (maxVal - minVal)) * (chartHeight - padding * 2);
    return { x, y, date: d.date, count: d.count };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[500px]">
        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * (chartHeight - padding * 2);
          const val = Math.round(maxVal - ratio * maxVal);
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#D6CFC3"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 8}
                y={y + 4}
                fill="#5D5A55"
                fontSize="10"
                fontFamily="sans-serif"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Gradient / Fill */}
        <path d={areaD} fill="#B7A58A" fillOpacity="0.15" />

        {/* Charcoal Line */}
        <path d={pathD} fill="none" stroke="#292724" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((pt, idx) => (
          <circle key={idx} cx={pt.x} cy={pt.y} r="3.5" fill="#FBFAF7" stroke="#292724" strokeWidth="2" />
        ))}

        {/* X Axis Labels */}
        {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((pt, idx) => (
          <text
            key={idx}
            x={pt.x}
            y={chartHeight - 8}
            fill="#5D5A55"
            fontSize="10"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            {new Date(pt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
    </div>
  );
};
