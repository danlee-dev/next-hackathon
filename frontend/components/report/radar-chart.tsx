"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{
              fill: "rgba(255,255,255,0.3)",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
            }}
            axisLine={false}
          />
          <Radar
            dataKey="value"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={1.5}
            fill="rgba(255,255,255,0.85)"
            fillOpacity={0.18}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
