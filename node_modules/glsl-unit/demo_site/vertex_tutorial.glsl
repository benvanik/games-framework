uniform vec4 uTestLocation;
uniform mat4 uTestMatrix;
attribute float aMultiplier;
void main(void) {
  gl_Position = aMultiplier * uTestMatrix * uTestLocation;
}