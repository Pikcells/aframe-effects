/**
 * @author zz85 / https://github.com/zz85 | twitter.com/blurspline
 *
 * Depth-of-field shader with bokeh
 * ported from GLSL shader by Martins Upitis
 * http://blenderartists.org/forum/showthread.php?237488-GLSL-depth-of-field-with-bokeh-v2-4-(update)
 *
 * Requires #define RINGS and SAMPLES integers
 */

module.exports = {

	uniforms: {

		"mNear": { value: 1.0 },
		"mFar": { value: 1000.0 },

	},

	vertexShader: [

		"varying float vViewZDepth;",

		"void main() {",

		"	#include <begin_vertex>",
		"	#include <project_vertex>",

		"	vViewZDepth = - mvPosition.z;",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform float mNear;",
		"uniform float mFar;",

		"varying float vViewZDepth;",

		"void main() {",

		"	float color = 1.0 - smoothstep( mNear, mFar, vViewZDepth );",
		"	gl_FragColor = vec4( vec3( color ), 1.0 );",

		"} "

	].join( "\n" )

};
