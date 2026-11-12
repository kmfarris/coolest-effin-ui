export function createGL(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  return gl;
}

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    gl.deleteShader(shader);
    throw new Error(`Shader compile: ${log}\n${source.slice(0, 200)}`);
  }
  return shader;
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("createProgram failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "";
    gl.deleteProgram(program);
    throw new Error(`Program link: ${log}`);
  }
  return program;
}

export function createFullscreenQuad(gl: WebGL2RenderingContext): {
  vao: WebGLVertexArrayObject;
  program: WebGLProgram;
} {
  const vs = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `#version 300 es
    in vec2 a_pos;
    out vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }`,
  );
  const fs = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `#version 300 es
    precision highp float;
    in vec2 v_uv;
    out vec4 o;
    void main() { o = vec4(v_uv, 0.0, 1.0); }`,
  );
  const program = linkProgram(gl, vs, fs);
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("VAO failed");
  const buf = gl.createBuffer();
  const verts = new Float32Array([-1, -1, 3, -1, -1, 3]);
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return { vao, program };
}

export class QualityGovernor {
  private frameTimes: number[] = [];
  private _fluidScale = 0.5;

  get fluidScale(): number {
    return this._fluidScale;
  }

  tick(dtMs: number): void {
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    if (this.frameTimes.length < 60) return;
    const avg =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    if (avg > 20 && this._fluidScale > 0.35) {
      this._fluidScale = 0.35;
    } else if (avg < 14 && this._fluidScale < 0.5) {
      this._fluidScale = 0.5;
    }
  }
}

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  dprCap = 2,
): { width: number; height: number; dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, dpr };
}
