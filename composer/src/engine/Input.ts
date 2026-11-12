export const MODE_NAMES = [
  "ink",
  "lattice",
  "helios",
  "obsidian",
  "glass",
] as const;

export type ModeIndex = 0 | 1 | 2 | 3 | 4;

export class InputState {
  pointerX = 0.5;
  pointerY = 0.5;
  velocity = 0;
  mode: ModeIndex = 0;
  modeTarget: ModeIndex = 0;
  modeBlend = 1;
  pulse = 0;
  hudVisible = true;
  private lastX = 0.5;
  private lastY = 0.5;
  private blendStart = 0;
  private readonly blendDuration = 350;
  private readonly canvas: HTMLCanvasElement;

  readonly reducedMotion: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const onPointer = (e: PointerEvent) => this.onPointer(e);
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!this.reducedMotion) this.pulse = 1;
      }
      if (e.code === "KeyH") this.hudVisible = !this.hudVisible;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5) this.setMode((n - 1) as ModeIndex);
    });

    window.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const dir = e.deltaY > 0 ? 1 : -1;
        const next = (this.modeTarget + dir + 5) % 5;
        this.setMode(next as ModeIndex);
      },
      { passive: false },
    );
  }

  private onPointer(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const vx = (x - this.lastX) * 60;
    const vy = (y - this.lastY) * 60;
    this.velocity = this.velocity * 0.85 + Math.hypot(vx, vy) * 0.15;
    this.lastX = x;
    this.lastY = y;
    this.pointerX = Math.min(1, Math.max(0, x));
    this.pointerY = Math.min(1, Math.max(0, y));
  }

  setMode(index: ModeIndex): void {
    if (index === this.modeTarget && this.modeBlend >= 1) return;
    this.mode = this.modeTarget;
    this.modeTarget = index;
    this.modeBlend = 0;
    this.blendStart = performance.now();
  }

  update(now: number): void {
    if (this.pulse > 0) {
      this.pulse = Math.max(0, this.pulse - 0.035);
    }
    this.velocity *= 0.98;

    if (this.modeBlend < 1) {
      const t = (now - this.blendStart) / this.blendDuration;
      this.modeBlend = Math.min(1, t);
    }
  }

  modeForShader(): { current: number; next: number; blend: number } {
    return {
      current: this.mode,
      next: this.modeTarget,
      blend: this.modeBlend,
    };
  }
}
