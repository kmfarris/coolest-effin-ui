export class AudioDrone {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  active = false;

  toggle(): boolean {
    if (this.active) {
      this.disable();
      return false;
    }
    return this.enable();
  }

  enable(): boolean {
    if (this.active) return true;
    try {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 420;
      this.oscA = this.ctx.createOscillator();
      this.oscB = this.ctx.createOscillator();
      this.oscA.type = "sine";
      this.oscB.type = "triangle";
      this.oscA.frequency.value = 55;
      this.oscB.frequency.value = 82.5;
      this.oscA.connect(this.filter);
      this.oscB.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.oscA.start();
      this.oscB.start();
      this.gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 1.2);
      this.active = true;
      return true;
    } catch {
      return false;
    }
  }

  disable(): void {
    if (!this.active) return;
    this.active = false;

    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    const ctx = this.ctx;
    const gain = this.gain;
    const oscA = this.oscA;
    const oscB = this.oscB;

    if (ctx && gain) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.35);
      const stopAt = t + 0.4;
      oscA?.stop(stopAt);
      oscB?.stop(stopAt);
      this.stopTimer = setTimeout(() => {
        void ctx.close();
      }, 450);
    }

    this.ctx = null;
    this.gain = null;
    this.oscA = null;
    this.oscB = null;
    this.filter = null;
  }

  update(pointerY: number, velocity: number): void {
    if (!this.active || !this.ctx || !this.filter || !this.gain) return;
    const base = 48 + pointerY * 40;
    const detune = Math.min(velocity * 2, 120);
    if (this.oscA) this.oscA.frequency.setTargetAtTime(base, this.ctx.currentTime, 0.1);
    if (this.oscB)
      this.oscB.frequency.setTargetAtTime(
        base * 1.5 + detune * 0.1,
        this.ctx.currentTime,
        0.1,
      );
    this.filter.frequency.setTargetAtTime(
      300 + velocity * 8,
      this.ctx.currentTime,
      0.08,
    );
  }
}
