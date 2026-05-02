/**
 * Exponential Moving Average smoother. alpha 0.85 = 85% prior weight,
 * matching spec (점수가 너무 자주 깜빡이지 않게).
 */
export class EMA {
  private value: number | null = null;
  constructor(private readonly alpha: number = 0.85) {}

  push(next: number): number {
    if (this.value === null) {
      this.value = next;
    } else {
      this.value = this.alpha * this.value + (1 - this.alpha) * next;
    }
    return this.value;
  }

  get current(): number {
    return this.value ?? 0;
  }

  reset() {
    this.value = null;
  }
}

export class WindowedAverage {
  private buf: number[] = [];
  constructor(private readonly maxSize: number) {}
  push(n: number) {
    this.buf.push(n);
    if (this.buf.length > this.maxSize) this.buf.shift();
  }
  get average(): number {
    if (this.buf.length === 0) return 0;
    return this.buf.reduce((a, b) => a + b, 0) / this.buf.length;
  }
  get std(): number {
    if (this.buf.length < 2) return 0;
    const m = this.average;
    const v = this.buf.reduce((s, x) => s + (x - m) ** 2, 0) / this.buf.length;
    return Math.sqrt(v);
  }
  reset() {
    this.buf = [];
  }
}
