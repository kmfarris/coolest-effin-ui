#version 300 es
precision highp float;
uniform sampler2D u_prev;
uniform vec2 u_fboSize;
uniform vec2 u_texel;
uniform float u_dissipation;
uniform float u_time;
in vec2 v_uv;
out vec4 o;

vec2 curl(vec2 p, float t) {
  float n = sin(p.x * 6.0 + t * 0.3) * cos(p.y * 5.0 - t * 0.25);
  return vec2(cos(n * 6.28), sin(n * 6.28)) * 0.015;
}

void main() {
  vec2 fragUV = gl_FragCoord.xy / u_fboSize;
  vec4 prev = texture(u_prev, fragUV);
  vec2 vel = curl(fragUV, u_time) + prev.ba * 0.98;
  vec2 back = fragUV - vel * u_texel * 4.0;
  vec4 advected = texture(u_prev, back);
  float dye = advected.r * u_dissipation;
  o = vec4(dye, prev.g, vel);
}
