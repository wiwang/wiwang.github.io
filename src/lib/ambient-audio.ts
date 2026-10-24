export type Soundscape = { name: string; notes: number[]; seconds: number };
export function soundscapeFor(path: string): Soundscape {
  if (path.includes("rag-tempo-loop"))
    return {
      name: "Evidence · layered ambient",
      notes: [196, 246.94, 293.66, 369.99],
      seconds: 2.4,
    };
  if (path.includes("agentic-ai"))
    return {
      name: "Orbit · exploratory ambient",
      notes: [174.61, 220, 261.63, 329.63],
      seconds: 2.1,
    };
  if (path.includes("mlops"))
    return {
      name: "Flow · steady ambient",
      notes: [146.83, 185, 220, 277.18],
      seconds: 1.8,
    };
  if (path.includes("recomendation"))
    return {
      name: "Connections · interwoven ambient",
      notes: [164.81, 207.65, 246.94, 311.13],
      seconds: 2.2,
    };
  if (path.includes("Bias-Variance"))
    return {
      name: "Balance · spacious ambient",
      notes: [130.81, 164.81, 196, 246.94],
      seconds: 2.8,
    };
  return {
    name: "Focus · quiet ambient",
    notes: [130.81, 164.81, 196, 293.66],
    seconds: 2.6,
  };
}

// Original generative tones: no recordings, streaming services, or audio downloads.
export class AmbientAudio {
  private context = new AudioContext();
  private master = this.context.createGain();
  private timer: ReturnType<typeof setInterval>;
  private next = 0;
  private step = 0;
  private mood: Soundscape;
  constructor(mood: Soundscape, volume: number) {
    this.mood = mood;
    this.master.gain.value = volume * 0.18;
    this.master.connect(this.context.destination);
    this.next = this.context.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), 150);
  }
  setMood(mood: Soundscape) {
    this.mood = mood;
  }
  setVolume(volume: number) {
    this.master.gain.setTargetAtTime(
      volume * 0.18,
      this.context.currentTime,
      0.12,
    );
  }
  async play() {
    await this.context.resume();
    this.schedule();
  }
  async pause() {
    await this.context.suspend();
  }
  private schedule() {
    if (this.context.state !== "running") return;
    const now = this.context.currentTime;
    if (this.next < now) this.next = now + 0.05;
    while (this.next < now + 0.4) {
      const time = this.next;
      const duration = this.mood.seconds * 2.8;
      const motif = [0, 2, 1, 3, 2, 1, 3, 0];
      const frequency = this.mood.notes[motif[this.step % motif.length]];
      // Long, overlapping envelopes keep transitions soft and avoid clicks.
      for (const [ratio, level] of [
        [1, 0.34],
        [2, 0.07],
        [0.5, 0.12],
      ]) {
        const oscillator = this.context.createOscillator();
        const envelope = this.context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency * ratio;
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(level, time + 0.9);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        oscillator.connect(envelope);
        envelope.connect(this.master);
        oscillator.start(time);
        oscillator.stop(time + duration + 0.1);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
      }
      this.step++;
      this.next += this.mood.seconds;
    }
  }
  destroy() {
    clearInterval(this.timer);
    void this.context.close();
  }
}
