/** A fixed-view resin surface. WebGL 1, one triangle, one local surface map, no required extensions. */
export type AmberRenderer = {
  press: (x: number, y: number) => void;
  move: (x: number, y: number) => void;
  release: () => void;
  resize: () => void;
  suspend: (paused: boolean) => void;
  dispose: () => void;
};

type Options = {
  leaf: readonly number[];
  resin: readonly number[];
  background: readonly number[];
  small: boolean;
  surfaceMapUrl: string;
  signal?: AbortSignal;
  onReady: () => void;
  onLost: () => void;
};

const vertex = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
`;

const fragment = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform sampler2D surfaceMap;
uniform vec3 leafColor, resinColor, background;
uniform vec3 dents[2];
uniform float small;

vec2 surfacePoint(vec2 p) {
  vec2 offset = vec2(0.);
  for (int i = 0; i < 2; i++) {
    vec2 d = p - dents[i].xy;
    offset += normalize(p + vec2(.0001)) * dents[i].z * .20 * exp(-dot(d, d) / .07);
  }
  return p + offset;
}
vec4 surface(vec2 p) {
  return texture2D(surfaceMap, surfacePoint(p) * .5 + .5);
}
float relief(vec2 p) {
  return surface(p).r * .44;
}
float height(vec2 p) {
  float h = relief(p);
  for (int i = 0; i < 2; i++) {
    vec2 d = p - dents[i].xy;
    float distance = dot(d, d);
    h += dents[i].z * (.24 * exp(-distance / .11) - exp(-distance / .024));
  }
  return h;
}
vec2 dentSlope(vec2 p) {
  vec2 slope = vec2(0.);
  for (int i = 0; i < 2; i++) {
    vec2 d = p - dents[i].xy;
    float distance = dot(d, d);
    slope += dents[i].z * d * (2. / .024 * exp(-distance / .024) - .48 / .11 * exp(-distance / .11));
  }
  return slope;
}
void main() {
  vec2 p = (uv - .5) * 2.;
  vec4 data = surface(p);
  float mask = smoothstep(.12, .88, data.a);
  vec2 shadowPoint = p - vec2(.012, -.055);
  float shadow = .045 * (surface(shadowPoint + vec2(.035, 0.)).a + surface(shadowPoint - vec2(.035, 0.)).a
                      + surface(shadowPoint + vec2(0., .035)).a + surface(shadowPoint - vec2(0., .035)).a);
  if (mask < .001) {
    gl_FragColor = vec4(vec3(.22, .12, .035), shadow);
    return;
  }
  float h = height(p);
  float e = .05;
  // A small Sobel footprint smooths the normals of the compact 8-bit relief.
  float tl = relief(p + vec2(-e, e)), tr = relief(p + vec2(e, e));
  float bl = relief(p + vec2(-e, -e)), br = relief(p + vec2(e, -e));
  vec2 slope = vec2(tr + br - tl - bl + 2. * (relief(p + vec2(e, 0.)) - relief(p - vec2(e, 0.))),
                    tl + tr - bl - br + 2. * (relief(p + vec2(0., e)) - relief(p - vec2(0., e)))) / (8. * e);
  vec2 pressure = dentSlope(p);
  vec3 normal = normalize(vec3(-slope - pressure, 1.));
  vec3 reflection = reflect(vec3(0., 0., -1.), normal);
  float fresnel = .045 + .50 * pow(1. - normal.z, 5.);
  // Reflected studio lights follow the mark's upper oval and lower pinpoint.
  vec2 window = (reflection.xy - vec2(-.57, .66));
  window = mat2(.914, -.407, .407, .914) * window / vec2(.27, .11);
  float gloss = smoothstep(.65, .78, normal.z);
  float light = exp(-pow(dot(window, window), 2.) * 1.5) * gloss;
  vec2 pinpoint = (reflection.xy - vec2(.66, -.72)) / .075;
  float lowerLight = exp(-dot(pinpoint, pinpoint) * 1.5) * gloss;
  float diffuse = .85 + .15 * max(0., dot(normal, normalize(vec3(-.5, .7, 1.))));
  float glow = exp(-length((p - vec2(-.24, .36)) / vec2(1.05, 1.2)) * .8);
  vec3 amber = mix(resinColor * .76, mix(resinColor, vec3(1.), .38), glow) * diffuse;
  float thickness = .25 + h * .8 + (1. - normal.z) * .4;
  vec3 transmission = exp(-vec3(.20, .65, 1.5) * thickness);
  vec3 resin = mix(amber, background * transmission + amber * (1. - transmission), .14);
  // Both plans reuse the logo leaf, including its transform and veins.
  vec2 center = vec2(0., -.08);
  vec2 refracted = surfacePoint(p) + normal.xy * .018 + pressure * .055;
  vec2 leafPoint = center + (refracted - center) / mix(1., .7, small);
  vec4 inclusion = texture2D(surfaceMap, leafPoint * .5 + .5);
  vec3 green = leafColor * (.88 + .12 * diffuse);
  green = mix(green, vec3(1.), inclusion.b * .35);
  resin = mix(resin, green * mix(vec3(1.), transmission, .16), inclusion.g);
  resin = mix(resin, vec3(.99, .98, .95), clamp(light * (.90 + fresnel) + lowerLight * .78, 0., .97));
  resin += vec3(.16, .12, .055) * fresnel;
  float rim = 1. - smoothstep(.12, .32, data.r);
  resin *= 1. - rim * .25;
  resin += vec3(.8, .6, .25) * rim * .28 * max(0., dot(normal, vec3(-.6, .8, 0.)));
  gl_FragColor = vec4(resin, mask + shadow * (1. - mask));
}
`;

/** Abortable image loading keeps detached specimens from retaining pending work. */
function loadSurfaceImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement | null> {
  if (!globalThis.Image || signal?.aborted) return Promise.resolve(null);

  return new Promise((resolve) => {
    const image = new Image();
    const abort = () => finish(null);

    const finish = (result: HTMLImageElement | null) => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", abort);

      if (!result) image.removeAttribute("src");

      resolve(result);
    };

    image.crossOrigin = "anonymous";
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    signal?.addEventListener("abort", abort, { once: true });
    image.src = url;
  });
}

/** Returns null when the browser cannot provide the complete renderer. */
export async function createAmberRenderer(canvas: HTMLCanvasElement, options: Options): Promise<AmberRenderer | null> {
  const image = await loadSurfaceImage(options.surfaceMapUrl, options.signal);

  if (!image || options.signal?.aborted) return null;

  const context = canvas.getContext("webgl", {
    alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
  });

  if (!context) return null;

  const gl = context;

  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  let shaders: WebGLShader[] = [];
  let frame = 0;
  let disposed = false;
  let paused = false;
  let lost = false;
  let lastFrame = 0;
  let notified = false;
  let dentLocation: WebGLUniformLocation | null = null;
  let current = -1;
  let next = 0;
  const dents = [{ x: 0, y: 0, start: -1000, end: -1000 }, { x: 0, y: 0, start: -1000, end: -1000 }];
  const values = new Float32Array(6);
  const events = new AbortController();

  function destroyResources() {
    if (buffer) gl.deleteBuffer(buffer);

    if (program) gl.deleteProgram(program);

    if (texture) gl.deleteTexture(texture);

    shaders.forEach((shader) => gl.deleteShader(shader));
    buffer = null;
    texture = null;
    program = null;
    shaders = [];
  }

  function initialize() {
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
        const shader = gl.createShader(type);

        if (!shader) throw new Error("Shader unavailable");

        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed");
      }

      program = gl.createProgram();
      buffer = gl.createBuffer();
      texture = gl.createTexture();

      if (!program || !buffer || !texture) throw new Error("GPU resources unavailable");

      shaders.forEach((shader) => gl.attachShader(program!, shader));
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Shader linking failed");

      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image!);

      if (gl.getError() !== gl.NO_ERROR) throw new Error("Surface texture unavailable");
      gl.uniform1i(gl.getUniformLocation(program, "surfaceMap"), 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");

      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform3fv(gl.getUniformLocation(program, "leafColor"), options.leaf);
      gl.uniform3fv(gl.getUniformLocation(program, "resinColor"), options.resin);
      gl.uniform3fv(gl.getUniformLocation(program, "background"), options.background);
      gl.uniform1f(gl.getUniformLocation(program, "small"), Number(options.small));
      dentLocation = gl.getUniformLocation(program, "dents[0]");

      return true;
    } catch {
      destroyResources();

      return false;
    }
  }

  function draw(time: number) {
    if (!program || disposed || paused || lost) return;

    let moving = false;

    dents.forEach((dent, index) => {
      const age = Math.max(0, time - dent.start);
      const recovery = Math.max(0, time - Math.max(dent.end, dent.start + 120));
      let strength = 0;

      if (recovery < 600) {
        strength = .16 * (1 - Math.pow(1 - Math.min(1, age / 120), 3));

        if (recovery > 0) strength *= Math.exp(-recovery / 130) * Math.cos(recovery / 95);

        moving ||= age < 120 || (dent.end !== Infinity && recovery < 600);
      }

      values.set([dent.x, dent.y, strength], index * 3);
    });
    gl.uniform3fv(dentLocation, values);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!notified) {
      notified = true;
      options.onReady();
    }

    if (moving) schedule();
  }

  function schedule() {
    if (frame || disposed || paused || lost) return;

    frame = requestAnimationFrame((time) => {
      frame = 0;

      if (time - lastFrame < 1000 / 60 - 1) {
        schedule();

        return;
      }

      lastFrame = time;
      draw(time);
    });
  }

  function resize() {
    if (disposed || lost || !program) return;

    const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw(performance.now());
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    notified = false;
    cancelAnimationFrame(frame);
    frame = 0;
    // Context loss already invalidates every GPU handle; never delete them after restoration.
    program = null;
    buffer = null;
    texture = null;
    shaders = [];
    options.onLost();
  }, { signal: events.signal });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    dents.forEach((dent) => { dent.start = -1000; dent.end = -1000; });
    current = -1;

    if (initialize()) resize();
    else options.onLost();
  }, { signal: events.signal });

  if (!initialize()) {
    events.abort();

    return null;
  }

  resize();

  function positionPressure(x: number, y: number) {
    if (current < 0 || disposed || paused || lost) return false;

    const px = x * 2 - 1;
    const py = 1 - y * 2;
    const limit = Math.min(1, .76 / (Math.hypot(px, py) || 1));
    const dent = dents[current]!;
    const nextX = px * limit;
    const nextY = py * limit;

    if (dent.x === nextX && dent.y === nextY) return false;

    dent.x = nextX;
    dent.y = nextY;

    return true;
  }

  return {
    press(x, y) {
      if (disposed || paused || lost) return;

      current = next;
      next = (next + 1) % 2;
      dents[current] = { x: 0, y: 0, start: performance.now(), end: Infinity };
      positionPressure(x, y);
      schedule();
    },
    move(x, y) {
      // Moving the same dent preserves its compression and release timing.
      if (positionPressure(x, y)) schedule();
    },
    release() {
      if (current < 0) return;

      dents[current]!.end = performance.now();
      current = -1;
      schedule();
    },
    resize,
    suspend(value) {
      paused = value;

      if (paused) {
        cancelAnimationFrame(frame);
        frame = 0;
        current = -1;
        dents.forEach((dent) => { dent.start = -1000; dent.end = -1000; });
      } else resize();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      events.abort();
      destroyResources();

      // Optional eager cleanup; rendering never depends on this extension.
      if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
