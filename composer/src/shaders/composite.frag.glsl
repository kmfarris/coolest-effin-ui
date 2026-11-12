#version 300 es
precision highp float;

uniform sampler2D u_fluid;
uniform vec2 u_res;
uniform vec2 u_fluidTexel;
uniform float u_time;
uniform float u_mode;       // 0 ink, 1 lattice, 2 helios, 3 obsidian, 4 glass
uniform float u_modeNext;
uniform float u_modeBlend;
uniform vec2 u_pointer;
uniform float u_velocity;
uniform float u_pulse;
uniform float u_breathe;

in vec2 v_uv;
out vec4 o;

#define TAU 6.2831853

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1, 0));
  float c = hash(i + vec2(0, 1));
  float d = hash(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

vec2 voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float md = 1.0;
  vec2 cid = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash(n + g) * vec2(1.0) + g;
      vec2 r = o - f;
      float d = dot(r, r);
      if (d < md) {
        md = d;
        cid = n + g + hash(n + g + 0.1);
      }
    }
  }
  return vec2(sqrt(md), fract(cid.x + cid.y));
}

float sdSphere(vec2 p, float r) {
  return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

vec3 paletteInk(float t, vec3 fluidN) {
  float v = voronoi(v_uv * 8.0 + fluidN.xy * 2.0 + u_time * 0.05).x;
  v = smoothstep(0.0, 0.35, v);
  vec3 deep = vec3(0.03, 0.05, 0.06);
  vec3 copper = vec3(0.55, 0.42, 0.28);
  vec3 chart = vec3(0.35, 0.85, 0.45);
  return mix(deep, mix(copper, chart, v), 0.5 + fluidN.x * 0.5);
}

vec3 paletteLattice(float t, vec3 fluidN) {
  vec2 g = v_uv * 24.0;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float line = min(abs(f.x), abs(f.y));
  line = smoothstep(0.02, 0.0, line);
  float film = sin(dot(v_uv, vec2(12.0, 8.0)) + fluidN.z * 4.0 + t) * 0.5 + 0.5;
  vec3 base = vec3(0.08, 0.1, 0.12);
  vec3 irid = 0.5 + 0.5 * cos(TAU * (film + vec3(0.0, 0.33, 0.67)));
  return mix(base, irid * vec3(0.6, 0.75, 0.55), line * 0.9);
}

vec3 paletteHelios(float t, vec3 fluidN) {
  vec2 p = v_uv - vec2(0.5, 0.48);
  float r = length(p);
  float corona = exp(-r * 5.0) * (0.8 + fluidN.x);
  float flare = pow(max(0.0, dot(normalize(p + 1e-4), vec2(1.0, 0.2))), 8.0);
  vec3 warm = vec3(0.95, 0.55, 0.22);
  vec3 rim = vec3(0.45, 0.78, 0.38);
  return vec3(0.04, 0.03, 0.025) + warm * corona + rim * flare * 0.35;
}

vec3 paletteObsidian(float t, vec3 fluidN) {
  vec2 p = (v_uv - 0.5) * 2.0;
  p += fluidN.xy * 0.3;
  float d1 = sdSphere(p - vec2(-0.25, 0.1), 0.35 + fluidN.x * 0.15);
  float d2 = sdBox(p - vec2(0.3, -0.15), vec2(0.25, 0.4));
  float d = min(d1, d2);
  float spec = pow(max(0.0, 1.0 - abs(d) * 8.0), 3.0);
  vec3 col = vec3(0.02, 0.025, 0.03);
  col += vec3(0.7, 0.55, 0.35) * spec * (0.4 + fluidN.z);
  col += vec3(0.25, 0.55, 0.35) * smoothstep(0.05, 0.0, abs(d)) * 0.5;
  return col;
}

vec3 paletteGlass(float t, vec3 fluidN) {
  vec2 off = (u_pointer - v_uv) * (0.15 + fluidN.x * 0.2);
  float n = fbm(v_uv * 6.0 + off + t * 0.08);
  float frost = smoothstep(0.35, 0.65, n);
  vec3 bg = vec3(0.06, 0.09, 0.11);
  vec3 refr = texture(u_fluid, v_uv + off * 0.5).rgb;
  vec3 tint = vec3(0.5, 0.65, 0.7) * frost;
  return mix(bg, refr * 2.0 + tint, 0.55 + frost * 0.35);
}

vec3 evalMode(float m, vec3 fluidN) {
  if (m < 0.5) return paletteInk(u_time, fluidN);
  if (m < 1.5) return paletteLattice(u_time, fluidN);
  if (m < 2.5) return paletteHelios(u_time, fluidN);
  if (m < 3.5) return paletteObsidian(u_time, fluidN);
  return paletteGlass(u_time, fluidN);
}

void main() {
  vec2 sampleUV = gl_FragCoord.xy / u_res;

  vec4 fluid = texture(u_fluid, sampleUV);
  float hL = texture(u_fluid, sampleUV - vec2(u_fluidTexel.x, 0.0)).r;
  float hR = texture(u_fluid, sampleUV + vec2(u_fluidTexel.x, 0.0)).r;
  float hD = texture(u_fluid, sampleUV - vec2(0.0, u_fluidTexel.y)).r;
  float hU = texture(u_fluid, sampleUV + vec2(0.0, u_fluidTexel.y)).r;
  vec3 n = normalize(vec3(hL - hR, hD - hU, 0.06));
  vec3 fluidN = vec3(fluid.r, fluid.rg);

  vec2 warp = n.xy * (0.028 + u_velocity * 0.0012) * (1.0 + u_breathe * 0.15);
  vec2 uv = sampleUV + warp;
  if (u_pulse > 0.001) {
    float rip = u_pulse * exp(-distance(sampleUV, u_pointer) * 6.0);
    uv += normalize(sampleUV - u_pointer + 1e-4) * rip * 0.04;
  }

  vec3 a = evalMode(u_mode, fluidN);
  vec3 b = evalMode(u_modeNext, fluidN);
  vec3 col = mix(a, b, u_modeBlend);

  float fres = pow(1.0 - max(0.0, dot(n, vec3(0.0, 0.0, 1.0))), 2.0);
  col += vec3(0.45, 0.62, 0.38) * fres * 0.14;
  col += vec3(0.35, 0.5, 0.32) * fluid.r * 0.45;
  col *= 0.88 + fluid.r * 0.42;

  o = vec4(col, 1.0);
}
