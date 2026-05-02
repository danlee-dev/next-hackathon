"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface Props {
  visual: number;
  audio: number;
  content: number;
  consistency: number;
}

export function RadarScore({ visual, audio, content, consistency }: Props) {
  const data = [
    { axis: "시각", value: Math.round(visual) },
    { axis: "음성", value: Math.round(audio) },
    { axis: "논리", value: Math.round(content) },
    { axis: "일관성", value: Math.round(consistency) },
  ];
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border-faint)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "var(--subtle-foreground)", fontSize: 9, fontFamily: "var(--font-mono)" }}
            axisLine={false}
          />
          <Radar
            dataKey="value"
            stroke="oklch(0.74 0.15 195)"
            strokeWidth={1.5}
            fill="oklch(0.74 0.15 195)"
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
