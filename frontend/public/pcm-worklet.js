// AudioWorklet processor — captures Float32 mic samples at the AudioContext
// sampleRate (we set 24000) and posts them back to the main thread in 100ms
// frames. Main thread converts to PCM16 base64 and sends over WebSocket.
class PCMWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const ctxRate = options?.processorOptions?.sampleRate || sampleRate;
    // 100ms per frame at 24kHz = 2400 samples
    this._frameSize = Math.round(ctxRate * 0.1);
    this._buf = new Float32Array(this._frameSize);
    this._idx = 0;
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    let i = 0;
    while (i < ch.length) {
      const room = this._frameSize - this._idx;
      const take = Math.min(room, ch.length - i);
      this._buf.set(ch.subarray(i, i + take), this._idx);
      this._idx += take;
      i += take;
      if (this._idx >= this._frameSize) {
        // Transfer a copy so we don't reuse the same backing buffer
        const out = new Float32Array(this._buf);
        this.port.postMessage(out, [out.buffer]);
        this._idx = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-worklet", PCMWorklet);
