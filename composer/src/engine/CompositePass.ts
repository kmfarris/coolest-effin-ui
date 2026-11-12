import { FBO } from "./FBO";
import { createQuadVAO, drawQuad } from "./quad";
import compositeFrag from "../shaders/composite.frag.glsl?raw";

export class CompositePass {
  private vao: WebGLVertexArrayObject;
  private program: WebGLProgram;
  private target: FBO;

  constructor(
    private gl: WebGL2RenderingContext,
    width: number,
    height: number,
  ) {
    this.target = new FBO(gl, width, height);
    const quad = createQuadVAO(gl, compositeFrag);
    this.program = quad.program;
    this.vao = quad.vao;
  }

  resize(width: number, height: number): void {
    if (width === this.target.width && height === this.target.height) return;
    this.target = new FBO(this.gl, width, height);
  }

  get texture(): WebGLTexture {
    return this.target.texture;
  }

  render(uniforms: {
    fluidTex: WebGLTexture;
    width: number;
    height: number;
    time: number;
    mode: number;
    modeNext: number;
    modeBlend: number;
    pointer: [number, number];
    velocity: number;
    pulse: number;
    breathe: number;
    fluidTexel: [number, number];
  }): void {
    const { gl } = this;
    this.target.bind();
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, uniforms.fluidTex);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_fluid"), 0);
    gl.uniform2f(
      gl.getUniformLocation(this.program, "u_res"),
      uniforms.width,
      uniforms.height,
    );
    gl.uniform1f(gl.getUniformLocation(this.program, "u_time"), uniforms.time);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_mode"), uniforms.mode);
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_modeNext"),
      uniforms.modeNext,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_modeBlend"),
      uniforms.modeBlend,
    );
    gl.uniform2f(
      gl.getUniformLocation(this.program, "u_pointer"),
      uniforms.pointer[0],
      uniforms.pointer[1],
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_velocity"),
      uniforms.velocity,
    );
    gl.uniform1f(gl.getUniformLocation(this.program, "u_pulse"), uniforms.pulse);
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_breathe"),
      uniforms.breathe,
    );
    gl.uniform2f(
      gl.getUniformLocation(this.program, "u_fluidTexel"),
      uniforms.fluidTexel[0],
      uniforms.fluidTexel[1],
    );
    drawQuad(gl, this.vao);
    FBO.unbind(gl);
  }
}
