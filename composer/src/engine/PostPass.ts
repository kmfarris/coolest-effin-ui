import { createQuadVAO, drawQuad } from "./quad";
import postFrag from "../shaders/post.frag.glsl?raw";

export class PostPass {
  private vao: WebGLVertexArrayObject;
  private program: WebGLProgram;

  constructor(private gl: WebGL2RenderingContext) {
    const quad = createQuadVAO(gl, postFrag);
    this.program = quad.program;
    this.vao = quad.vao;
  }

  renderToScreen(
    sceneTex: WebGLTexture,
    width: number,
    height: number,
    uniforms: {
      time: number;
      bloomThresh: number;
      velocity: number;
      breathe: number;
    },
  ): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_scene"), 0);
    gl.uniform2f(
      gl.getUniformLocation(this.program, "u_texel"),
      1 / width,
      1 / height,
    );
    gl.uniform1f(gl.getUniformLocation(this.program, "u_time"), uniforms.time);
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_bloomThresh"),
      uniforms.bloomThresh,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_velocity"),
      uniforms.velocity,
    );
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_breathe"),
      uniforms.breathe,
    );
    drawQuad(gl, this.vao);
  }
}
