import {
  createGL,
  QualityGovernor,
  resizeCanvas,
} from "./engine/GLContext";
import { FluidPass } from "./engine/FluidPass";
import { CompositePass } from "./engine/CompositePass";
import { PostPass } from "./engine/PostPass";
import { InputState } from "./engine/Input";
import { AudioDrone } from "./engine/AudioDrone";
import { bindOverlay } from "./ui/overlay";

function main(): void {
  const canvasEl = document.getElementById("gl");
  const fallback = document.getElementById("fallback");
  if (!(canvasEl instanceof HTMLCanvasElement)) return;

  const glContext = createGL(canvasEl);
  if (!glContext) {
    fallback?.classList.remove("hidden");
    canvasEl.style.display = "none";
    return;
  }

  const canvas = canvasEl;
  const gl = glContext;

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  const governor = new QualityGovernor();
  const input = new InputState(canvas);
  const audio = new AudioDrone();

  let width = 1;
  let height = 1;
  let fluid!: FluidPass;
  let composite!: CompositePass;
  let post!: PostPass;

  const overlay = bindOverlay(
    () => {},
    () => {
      const on = audio.toggle();
      overlay.setListenActive(on);
    },
  );

  function initPasses(): void {
    const size = resizeCanvas(canvas);
    width = size.width;
    height = size.height;
    fluid = new FluidPass(gl, width, height, governor.fluidScale);
    composite = new CompositePass(gl, width, height);
    post = new PostPass(gl);
  }

  initPasses();

  let lastT = performance.now();
  let timeSec = 0;
  let splatCooldown = 0;

  overlay.setMode(input.mode);
  overlay.setHudVisible(input.hudVisible);

  function frame(now: number): void {
    const dt = now - lastT;
    lastT = now;
    governor.tick(dt);
    timeSec += dt * 0.001;

    const size = resizeCanvas(canvas);
    if (size.width !== width || size.height !== height) {
      width = size.width;
      height = size.height;
      composite.resize(width, height);
    }
    fluid.resize(width, height, governor.fluidScale);

    input.update(now);
    overlay.setMode(input.modeTarget);
    overlay.setHudVisible(input.hudVisible);

    const breathe = 0.5 + 0.5 * Math.sin(timeSec * 0.4);
    const dissipation = input.reducedMotion ? 0.992 : 0.988;

    fluid.step(timeSec, dissipation, input.reducedMotion);

    splatCooldown -= dt;
    if (splatCooldown <= 0) {
      splatCooldown = 16;
      const strength = 0.25 + Math.min(input.velocity * 0.02, 0.5);
      fluid.splat(
        input.pointerX,
        input.pointerY,
        (input.pointerX - 0.5) * 2,
        (input.pointerY - 0.5) * 2,
        strength,
      );
    }

    if (input.pulse > 0.5 && !input.reducedMotion) {
      fluid.splat(input.pointerX, input.pointerY, 0, 0, 1.2);
    }

    const modes = input.modeForShader();
    const { w: fw, h: fh } = fluid.fluidSize;
    composite.render({
      fluidTex: fluid.texture,
      width,
      height,
      time: timeSec,
      mode: modes.current,
      modeNext: modes.next,
      modeBlend: modes.blend,
      pointer: [input.pointerX, 1 - input.pointerY],
      velocity: input.velocity,
      pulse: input.pulse,
      breathe,
      fluidTexel: [1 / fw, 1 / fh],
    });

    const bloomThresh = 0.35 - Math.min(input.velocity * 0.005, 0.15);
    post.renderToScreen(composite.texture, width, height, {
      time: timeSec,
      bloomThresh,
      velocity: input.velocity,
      breathe,
    });

    if (audio.active) {
      audio.update(input.pointerY, input.velocity);
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => {
    resizeCanvas(canvas);
  });

  requestAnimationFrame(frame);
}

main();
