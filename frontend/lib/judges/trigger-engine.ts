import type { Expression, Judge, JudgeId, MetricKey, TriggerOp, TriggerRule } from "@/types/judges";
import { JUDGES } from "./definitions";

export interface TriggerEval {
  judgeId: JudgeId;
  expression: Expression;
  comment: string | null;
  trigger?: { metric: MetricKey; value: number };
}

function compare(value: number, op: TriggerOp, target: number): boolean {
  switch (op) {
    case ">":
      return value > target;
    case ">=":
      return value >= target;
    case "<":
      return value < target;
    case "<=":
      return value <= target;
    case "==":
      return value === target;
  }
}

export function evaluateJudge(
  judge: Judge,
  metrics: Partial<Record<MetricKey, number>>,
): TriggerEval {
  let bestRule: TriggerRule | null = null;
  let bestValue: number | null = null;
  let bestPriority = -1;

  for (const rule of judge.triggers) {
    const v = metrics[rule.metric];
    if (typeof v !== "number") continue;
    if (compare(v, rule.op, rule.value)) {
      const p = rule.priority ?? 0;
      if (p > bestPriority) {
        bestPriority = p;
        bestRule = rule;
        bestValue = v;
      }
    }
  }

  if (bestRule && typeof bestValue === "number") {
    return {
      judgeId: judge.id,
      expression: bestRule.expression,
      comment: bestRule.comment,
      trigger: { metric: bestRule.metric, value: bestValue },
    };
  }

  return {
    judgeId: judge.id,
    expression: judge.defaultExpression,
    comment: null,
  };
}

export function evaluateAllJudges(metrics: Partial<Record<MetricKey, number>>): TriggerEval[] {
  return JUDGES.map((j) => evaluateJudge(j, metrics));
}
