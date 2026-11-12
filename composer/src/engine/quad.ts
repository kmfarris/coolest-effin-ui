import { compileShader, linkProgram } from "./GLContext";
import vert from "../shaders/fluid.vert.glsl?raw";

const QUAD_INTERLEAVED = new Float32Array([
  -1, -1, 0, 0,
  1, -1, 1, 0,
  -1, 1, 0, 1,
  1, -1, 1, 0,
  1, 1, 1, 1,
  -1, 1, 0, 1,
]);

export function createQuadVAO(
  gl: WebGL2RenderingContext,
  fragSource: string,
): { vao: WebGLVertexArrayObject; program: WebGLProgram } {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSource);
  const program = linkProgram(gl, vs, fs);

  const vao = gl.createVertexArray();
  if (!vao) throw new Error("VAO failed");
  const buf = gl.createBuffer();
  const stride = 4 * 4;

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_INTERLEAVED, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
  gl.bindVertexArray(null);

  return { vao, program };
}

export function drawQuad(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): void {
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
