"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  ts_ms: number;
  trust: number;
}

interface Props {
  data: Point[];
}

export function TimelineChart({ data }: Props) {
  const formatted = data.map((d) => ({
    t: Math.round(d.ts_ms / 1000),
    trust: Math.round(d.trust),
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="trustFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="rgba(255,255,255,0.5)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tickFormatter={(v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            interval="preserveStartEnd"
            minTickGap={42}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#0a0a0c",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              fontSize: 12,
              color: "white",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.55)" }}
            formatter={(v: number) => [`${v}`, "Trust"]}
          />
          <Area
            type="monotone"
            dataKey="trust"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={1.5}
            fill="url(#trustFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
