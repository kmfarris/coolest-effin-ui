import { createQuadVAO, drawQuad } from "./quad";
import { FBO, DoubleFBO } from "./FBO";

import advectFrag from "../shaders/fluid_advect.frag.glsl?raw";
import splatFrag from "../shaders/fluid_splat.frag.glsl?raw";

export class FluidPass {
  private quadVao: WebGLVertexArrayObject;
  private advectProgram: WebGLProgram;
  private splatProgram: WebGLProgram;
  private fbo: DoubleFBO;
  private lastFw = 0;
  private lastFh = 0;

  constructor(
    private gl: WebGL2RenderingContext,
    fullW: number,
    fullH: number,
    fluidScale: number,
  ) {
    const fw = Math.floor(fullW * fluidScale);
    const fh = Math.floor(fullH * fluidScale);
    this.lastFw = fw;
    this.lastFh = fh;
    this.fbo = new DoubleFBO(gl, fw, fh);

    const advect = createQuadVAO(gl, advectFrag);
    const splat = createQuadVAO(gl, splatFrag);
    this.quadVao = advect.vao;
    this.advectProgram = advect.program;
    this.splatProgram = splat.program;

    this.seedFluid();
  }

  private seedFluid(): void {
    const { gl } = this;
    this.fbo.bindWrite();
    gl.clearColor(0.02, 0.03, 0.04, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.splatProgram);
    const splats: [number, number][] = [
      [0.25, 0.5],
      [0.5, 0.5],
      [0.75, 0.5],
    ];
    for (const [x, y] of splats) {
      this.drawSplat(x, 1 - y, 0.12, 0.12, 0.4, 0.28, 0.1, 0.55);
    }
    this.fbo.swap();
    FBO.unbind(gl);
  }

  resize(fullW: number, fullH: number, fluidScale: number): void {
    const fw = Math.floor(fullW * fluidScale);
    const fh = Math.floor(fullH * fluidScale);
    if (fw === this.lastFw && fh === this.lastFh) return;
    this.lastFw = fw;
    this.lastFh = fh;
    this.fbo.resize(this.gl, fw, fh);
  }

  get texture(): WebGLTexture {
    return this.fbo.readTex;
  }

  get fluidSize(): { w: number; h: number } {
    return { w: this.fbo.width, h: this.fbo.height };
  }

  step(time: number, dissipation: number, reducedMotion: boolean): void {
    const { gl } = this;
    const iterations = reducedMotion ? 1 : 2;
    const fw = this.fbo.width;
    const fh = this.fbo.height;

    for (let i = 0; i < iterations; i++) {
      this.fbo.bindWrite();
      gl.useProgram(this.advectProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fbo.readTex);
      gl.uniform1i(gl.getUniformLocation(this.advectProgram, "u_prev"), 0);
      gl.uniform2f(gl.getUniformLocation(this.advectProgram, "u_fboSize"), fw, fh);
      gl.uniform2f(
        gl.getUniformLocation(this.advectProgram, "u_texel"),
        1 / fw,
        1 / fh,
      );
      gl.uniform1f(
        gl.getUniformLocation(this.advectProgram, "u_dissipation"),
        dissipation,
      );
      gl.uniform1f(gl.getUniformLocation(this.advectProgram, "u_time"), time);
      drawQuad(gl, this.quadVao);
      this.fbo.swap();
    }

    FBO.unbind(gl);
  }

  splat(
    x: number,
    y: number,
    vx: number,
    vy: number,
    strength: number,
  ): void {
    const { gl } = this;
    const fw = this.fbo.width;
    const fh = this.fbo.height;
    const aspect = fw / fh;
    const baseR = 0.042;
    const rx = baseR / aspect;

    this.fbo.bindWrite();
    gl.useProgram(this.splatProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fbo.readTex);
    gl.uniform1i(gl.getUniformLocation(this.splatProgram, "u_prev"), 0);
    gl.uniform2f(gl.getUniformLocation(this.splatProgram, "u_fboSize"), fw, fh);
    const force = Math.min(1.5, Math.hypot(vx, vy) * 0.02 + 0.4);
    this.drawSplat(
      x,
      1 - y,
      rx,
      baseR,
      strength * (0.9 + force * 0.25),
      force * 0.5,
      vy,
      vx,
    );
    this.fbo.swap();
    FBO.unbind(gl);
  }

  private drawSplat(
    px: number,
    py: number,
    radiusX: number,
    radiusY: number,
    dyeR: number,
    dyeG: number,
    dyeB: number,
    strength: number,
  ): void {
    const { gl } = this;
    const prog = this.splatProgram;
    gl.uniform2f(gl.getUniformLocation(prog, "u_point"), px, py);
    gl.uniform2f(gl.getUniformLocation(prog, "u_radius"), radiusX, radiusY);
    gl.uniform3f(gl.getUniformLocation(prog, "u_color"), dyeR, dyeG, dyeB);
    gl.uniform1f(gl.getUniformLocation(prog, "u_strength"), strength);
    drawQuad(gl, this.quadVao);
  }
}
