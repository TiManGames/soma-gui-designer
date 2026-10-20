import type { Quad, Scene } from "@core/preview/types";
import type { GfxEntry } from "../state/gfxStore";

/** HPL GUI materials, rendered into an RGBA target before browser composition. */
export class GuiRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly framebuffer: WebGLFramebuffer;
  private readonly target: WebGLTexture;
  private readonly textures = new Map<string, { pixels?: Uint8ClampedArray; texture: WebGLTexture }>();
  private width = 0;
  private height = 0;
  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 is unavailable. Turn Preview off to continue with the wireframe canvas.");
    this.gl = gl;
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!; gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "GUI shader compilation failed");
      return s;
    };
    const vs = shader(gl.VERTEX_SHADER, `#version 300 es
      in vec2 position; in vec2 uv; in vec4 color; uniform vec2 resolution;
      out vec2 vUV; out vec4 vColor;
      void main() { gl_Position=vec4(position.x/resolution.x*2.-1.,1.-position.y/resolution.y*2.,0.,1.); vUV=uv; vColor=color; }`);
    const fs = shader(gl.FRAGMENT_SHADER, `#version 300 es
      precision highp float; in vec2 vUV; in vec4 vColor; uniform sampler2D image;
      out vec4 fragColor; void main() { fragColor=texture(image,vUV)*vColor; }`);
    const program = gl.createProgram()!; gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "GUI shader linking failed");
    this.program = program; this.buffer = gl.createBuffer()!;
    this.framebuffer = gl.createFramebuffer()!; this.target = gl.createTexture()!;
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    for (const [name, count, offset] of [["position", 2, 0], ["uv", 2, 8], ["color", 4, 16]] as const) {
      const location = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, count, gl.FLOAT, false, 32, offset);
    }
    gl.uniform1i(gl.getUniformLocation(program, "image"), 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.disable(gl.DEPTH_TEST); gl.disable(gl.DITHER);
    const white = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.textures.set("", { texture: white });
  }
  render(scene: Scene, width: number, height: number, get: (name: string) => GfxEntry | undefined): void {
    const gl = this.gl;
    width = Math.max(1, Math.round(width)); height = Math.max(1, Math.round(height));
    if (width !== this.width || height !== this.height) {
      this.width = width; this.height = height; this.canvas.width = width; this.canvas.height = height;
      gl.bindTexture(gl.TEXTURE_2D, this.target);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.target, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("GUI render target is incomplete");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer); gl.viewport(0, 0, width, height);
    gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program); gl.uniform2f(gl.getUniformLocation(this.program, "resolution"), width, height);
    for (const q of scene.quads) {
      let cached = this.textures.get(q.texture);
      if (q.texture) {
        const entry = get(q.texture); if (!entry?.pixels || !entry.w || !entry.h) continue;
        if (!cached) { cached = { texture: gl.createTexture()! }; this.textures.set(q.texture, cached); }
        gl.bindTexture(gl.TEXTURE_2D, cached.texture);
        if (cached.pixels !== entry.pixels) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, entry.w, entry.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, entry.pixels); cached.pixels = entry.pixels; }
      } else gl.bindTexture(gl.TEXTURE_2D, cached!.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const wrap = q.wrap === "Mirror" ? gl.MIRRORED_REPEAT : q.wrap === "Repeat" ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      if (q.material === "Diffuse") gl.disable(gl.BLEND);
      else {
        gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
        if (q.material === "Additive") gl.blendFunc(gl.ONE, gl.ONE);
        else if (q.material === "Modulative") gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        else if (q.material === "PremulAlpha") gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      if (q.clip) {
        gl.enable(gl.SCISSOR_TEST);
        const x = Math.max(0, Math.ceil(q.clip.x)), y = Math.max(0, Math.ceil(q.clip.y));
        gl.scissor(x, Math.max(0, height - Math.floor(q.clip.y + q.clip.h)), Math.max(0, Math.floor(q.clip.x + q.clip.w) - x), Math.max(0, Math.floor(q.clip.y + q.clip.h) - y));
      } else gl.disable(gl.SCISSOR_TEST);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer); gl.bufferData(gl.ARRAY_BUFFER, quadVertices(q), gl.STREAM_DRAW); gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.SCISSOR_TEST); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffer); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    const error = gl.getError(); if (error !== gl.NO_ERROR) throw new Error(`GUI rendering error 0x${error.toString(16)}`);
  }
  readPixels(): Uint8Array {
    const gl = this.gl, pixels = new Uint8Array(this.width * this.height * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffer); gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const rows = new Uint8Array(pixels.length), stride = this.width * 4;
    for (let y = 0; y < this.height; y++) rows.set(pixels.subarray(y * stride, (y + 1) * stride), (this.height - y - 1) * stride);
    return rows;
  }
  dispose(): void {
    const gl = this.gl; for (const { texture } of this.textures.values()) gl.deleteTexture(texture);
    gl.deleteTexture(this.target); gl.deleteFramebuffer(this.framebuffer); gl.deleteBuffer(this.buffer); gl.deleteProgram(this.program);
  }
}

export function quadVertices(q: Quad): Float32Array {
  const r = q.rect, xy = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]], uv = [[q.uv[0], q.uv[1]], [q.uv[2], q.uv[1]], [q.uv[2], q.uv[3]], [q.uv[0], q.uv[3]]];
  return new Float32Array([0, 1, 2, 0, 2, 3].flatMap(i => [...xy[i], ...uv[i], ...q.corners[i].map((v, j) => v * q.color[j])]));
}
