// Courtousy of J3D: https://github.com/drojdjou/J3D
// The MIT License (MIT)
// Copyright (c) 2011 Authors of J3D. All rights reserved.

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//#name Phong
//#description Classic phong shader
//#author bartekd
//! NAMESPACE=J3D
//! CLASS=PhongShader
//! INCLUDE CommonInclude.glsllib
//! INCLUDE VertexInclude.glsllib
//! INCLUDE Lights.glsllib
//! JSREQUIRE J3D.Constants
//! JSCONST POINTSIZE J3D.Constants.PointSize
//! COMMON
varying vec4 vPosition;
varying vec2 vTextureCoord;
varying vec3 vNormal;



//! VERTEX
void main(void) {
	vTextureCoord = getTextureCoord(aTextureCoord);
    vNormal = nMatrix * aVertexNormal;
	vPosition = mMatrix * vec4(aVertexPosition, 1.0);
    gl_Position = pMatrix * vMatrix * vPosition;
    gl_PointSize = POINTSIZE;
}

//! FRAGMENT
uniform vec4 color;
uniform sampler2D colorTexture;
uniform bool hasColorTexture;
uniform float specularIntensity;
uniform float shininess;

void main(void) {
	vec4 tc = color;
	if(hasColorTexture) tc *= texture2D(colorTexture, vTextureCoord);	
	vec3 l = computeLights(vPosition, vNormal, specularIntensity, shininess);	
	gl_FragColor = vec4(tc.rgb * l, color.a);
}

//! OVERRIDE luminance baseLuminance
float luminance(vec3 c) {
    return dot(c.rgb * vec3(0.299, 0.587 , 0.114), vec3(1.0));
}