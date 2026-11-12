#version 300 es
precision highp float;
uniform sampler2D u_prev;
uniform vec2 u_fboSize;
uniform vec2 u_point;
uniform vec2 u_radius;
uniform vec3 u_color;
uniform float u_strength;
in vec2 v_uv;
out vec4 o;

void main() {
  vec2 fragUV = gl_FragCoord.xy / u_fboSize;
  vec4 prev = texture(u_prev, fragUV);
  vec2 delta = (fragUV - u_point) / u_radius;
  float splat = exp(-dot(delta, delta)) * u_strength;
  float dye = prev.r + splat * u_color.r;
  vec2 vel = prev.ba + normalize(fragUV - u_point + 1e-5) * splat * u_color.g;
  o = vec4(dye, prev.g, vel);
}
