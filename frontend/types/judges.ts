export type JudgeId = "judge-fact" | "judge-connect" | "judge-critical";

export type Expression = "neutral" | "smile" | "nod" | "frown" | "doubt" | "bored" | "surprised";

export type MetricKey =
  | "eye_contact_ratio"
  | "head_stability"
  | "body_sway"
  | "gesture_usage"
  | "smile_naturalness"
  | "filler_count_per_min"
  | "pace_cpm"
  | "pitch_stability"
  | "volume_consistency"
  | "speech_ratio"
  | "core_message_clarity"
  | "argument_evidence_balance"
  | "empty_phrases_count"
  | "audience_comprehension";

export type TriggerOp = ">" | ">=" | "<" | "<=" | "==";

export interface TriggerRule {
  metric: MetricKey;
  op: TriggerOp;
  value: number;
  expression: Expression;
  /** Single canonical comment — kept for backwards compatibility. */
  comment: string;
  /** Optional pool of paraphrased comments. When present, the trigger engine
   * picks one at random per fire so judges don't repeat themselves. */
  comments?: string[];
  priority?: number;
}

export interface Judge {
  id: JudgeId;
  nameKo: string;
  nameEn: string;
  persona: string;
  defaultExpression: Expression;
  triggers: TriggerRule[];
  accentVar: string;
}
