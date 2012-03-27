// Credit to Inigo Quilez's ShaderToy
// http://www.iquilezles.org/apps/shadertoy/
#ifdef GL_ES
precision highp float;
#endif
uniform vec2 resolution;
void main(void) {
  vec2 p = (2.0*gl_FragCoord.xy-resolution)/resolution.y;
  float a = atan(p.x,p.y)/3.141593;
  float r = length(p);
  // shape
  float h = abs(a);
  float d = (13.0*h - 22.0*h*h + 10.0*h*h*h)/(6.0-5.0*h);
  // color
  float f = step(r,d) > 0. ? pow(1.0-r/d,0.25) : 0.;
  gl_FragColor = vec4(f,0.0,0.0,1.0);
}