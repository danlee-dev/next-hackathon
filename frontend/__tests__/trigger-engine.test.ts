import { JUDGES } from "@/lib/judges/definitions";
import { evaluateAllJudges, evaluateJudge } from "@/lib/judges/trigger-engine";
import { describe, expect, it } from "vitest";

describe("evaluateJudge", () => {
  it("returns default expression when no metric matches", () => {
    const fact = JUDGES.find((j) => j.id === "judge-fact")!;
    const r = evaluateJudge(fact, {});
    expect(r.expression).toBe(fact.defaultExpression);
    expect(r.comment).toBeNull();
  });

  it("connect frowns at low eye contact", () => {
    const connect = JUDGES.find((j) => j.id === "judge-connect")!;
    const r = evaluateJudge(connect, { eye_contact_ratio: 30 });
    expect(r.expression).toBe("frown");
    expect(r.comment).toMatch(/눈/);
  });

  it("critical bored at high filler count", () => {
    const critical = JUDGES.find((j) => j.id === "judge-critical")!;
    const r = evaluateJudge(critical, { filler_count_per_min: 12 });
    expect(r.expression).toBe("bored");
  });

  it("higher priority rule wins when multiple match", () => {
    const connect = JUDGES.find((j) => j.id === "judge-connect")!;
    // eye_contact_ratio<40 (priority 8) vs body_sway>70 (priority 6)
    const r = evaluateJudge(connect, {
      eye_contact_ratio: 25,
      body_sway: 80,
    });
    expect(r.expression).toBe("frown"); // eye contact wins
  });
});

describe("evaluateAllJudges", () => {
  it("returns one eval per judge", () => {
    const evals = evaluateAllJudges({});
    expect(evals).toHaveLength(3);
    expect(new Set(evals.map((e) => e.judgeId))).toEqual(
      new Set(["judge-fact", "judge-connect", "judge-critical"]),
    );
  });
});
