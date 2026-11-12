export class FBO {
  readonly texture: WebGLTexture;
  readonly fbo: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;

  constructor(
    private gl: WebGL2RenderingContext,
    width: number,
    height: number,
    opts: {
      internalFormat?: number;
      format?: number;
      type?: number;
      filter?: number;
    } = {},
  ) {
    const filter = opts.filter ?? gl.LINEAR;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);

    const half = {
      internalFormat: opts.internalFormat ?? gl.RGBA16F,
      format: opts.format ?? gl.RGBA,
      type: opts.type ?? gl.HALF_FLOAT,
    };
    const fallback = {
      internalFormat: gl.RGBA8,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
    };

    let packed = this.tryAllocate(filter, half);
    if (!packed) packed = this.tryAllocate(filter, fallback);
    if (!packed) throw new Error("FBO allocation failed");

    this.texture = packed.texture;
    this.fbo = packed.fbo;
  }

  private tryAllocate(
    filter: number,
    spec: { internalFormat: number; format: number; type: number },
  ): { texture: WebGLTexture; fbo: WebGLFramebuffer } | null {
    const { gl } = this;
    const tex = gl.createTexture();
    if (!tex) return null;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      spec.internalFormat,
      this.width,
      this.height,
      0,
      spec.format,
      spec.type,
      null,
    );

    const fbo = gl.createFramebuffer();
    if (!fbo) {
      gl.deleteTexture(tex);
      return null;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
      return null;
    }
    return { texture: tex, fbo };
  }

  bind(): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
  }

  static unbind(gl: WebGL2RenderingContext): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

export class DoubleFBO {
  private read: FBO;
  private write: FBO;

  constructor(gl: WebGL2RenderingContext, w: number, h: number) {
    this.read = new FBO(gl, w, h);
    this.write = new FBO(gl, w, h);
  }

  get readTex(): WebGLTexture {
    return this.read.texture;
  }

  get width(): number {
    return this.read.width;
  }

  get height(): number {
    return this.read.height;
  }

  bindWrite(): void {
    this.write.bind();
  }

  swap(): void {
    const t = this.read;
    this.read = this.write;
    this.write = t;
  }

  resize(gl: WebGL2RenderingContext, w: number, h: number): void {
    if (w === this.read.width && h === this.read.height) return;
    this.read = new FBO(gl, w, h);
    this.write = new FBO(gl, w, h);
  }
}
