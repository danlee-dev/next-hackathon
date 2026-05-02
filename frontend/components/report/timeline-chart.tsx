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
              <stop offset="0%" stopColor="oklch(0.74 0.15 195)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="oklch(0.74 0.15 195)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tickFormatter={(v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-faint)" }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-faint)" }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(v: number) => [`${v}`, "Trust"]}
          />
          <Area
            type="monotone"
            dataKey="trust"
            stroke="oklch(0.74 0.15 195)"
            strokeWidth={1.5}
            fill="url(#trustFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
