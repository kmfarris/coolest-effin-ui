#version 300 es
precision highp float;

uniform sampler2D u_scene;
uniform vec2 u_texel;
uniform float u_time;
uniform float u_bloomThresh;
uniform float u_velocity;
uniform float u_breathe;

in vec2 v_uv;
out vec4 o;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 sampleBloom(vec2 uv) {
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  const float spread = 2.0;
  for (int i = -2; i <= 2; i++) {
    for (int j = -2; j <= 2; j++) {
      vec2 off = vec2(float(i), float(j)) * u_texel * spread;
      float w = 1.0 / (1.0 + float(i * i + j * j));
      vec3 s = texture(u_scene, uv + off).rgb;
      vec3 bright = max(s - u_bloomThresh, 0.0);
      acc += bright * w;
      wsum += w;
    }
  }
  return acc / wsum;
}

vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 ca = u_texel * u_velocity * 0.35;
  float rC = texture(u_scene, v_uv + vec2(ca.x, 0.0)).r;
  float gC = texture(u_scene, v_uv).g;
  float bC = texture(u_scene, v_uv - vec2(ca.x, 0.0)).b;
  vec3 col = vec3(rC, gC, bC);

  vec3 bloom = sampleBloom(v_uv) * (0.65 + u_breathe * 0.1);
  col += bloom;

  float grain = (hash(v_uv * 900.0 + u_time) - 0.5) * 0.04;
  col += grain;

  vec2 p = v_uv - 0.5;
  float vig = 1.0 - dot(p, p) * 1.1;
  col *= smoothstep(0.2, 1.0, vig);

  col = aces(col * 1.05);
  o = vec4(col, 1.0);
}
