varying vec4 uTestColor;
uniform mat4 uTestMatrix;
uniform sampler2D uSomeTexture;
void main(void) {
  // Notice the use of a built in variable
  if (!gl_FrontFacing) {
  // And the use of Discard.
    discard;
  }
  gl_FragColor = uTestMatrix * uTestColor;
}