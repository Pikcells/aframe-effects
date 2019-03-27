AFRAME.registerComponent("dof", {
  schema: {},

  init: function() {
    this.system = this.el.sceneEl.systems.effects;

    this.needsResize = true;
    this.system.register(this);
  },

  tick: function() {
    // console.log("dof Tick");
    // this.bypass = !this.data;
  },

  tock: function() {
    // console.log("dof Tock");
  },

  update: function(oldData) {
    console.log("Update");
  },

  setSize: function(width, height) {
    console.log("dof setSize " + width + " " + height);

    var UNIFORMS = this.material.uniforms;

    UNIFORMS.resolution.value.set(width, height);
    UNIFORMS.aspect.value.set(width / height);
  },

  // resize: true,
  diffuse: true,
  depth: true,

  // Camera near/far range is 0.0 to 1.0
  // 0.8 to 1.0 is most of the visible range
  uniforms: {
    maxblur: { type: "f", value: 1.0 }, // max blur amount
    aperture: { type: "f", value: 0.025 }, // aperture - bigger values for shallower depth of field

    nearClip: { type: "f", value: 0.0 },
    farClip: { type: "f", value: -10.0 },

    focus: { type: "f", value: 0.65 },
    aspect: { type: "f", value: 1.0 }

    // "uniform float maxblur;", // max blur amount
    // "uniform float aperture;", // aperture - bigger values for shallower depth of field

    // "uniform float nearClip;",
    // "uniform float farClip;",

    // "uniform float focus;",
    // "uniform float aspect;",

    // uBlurNear: { type: "f", value: 0.8 },
    // uBlurRange: { type: "f", value: 0.1 }
  },

  remove: function() {
    this.material.dispose();
    this.system.unregister(this);
  },

  vertex:
    "\n\
		void main() {\n\
			vUv = uv;\n\
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);\n\
		}",

  // https://threejs.org/examples/webgl_postprocessing_dof.html

  fragment: [
    "#include <common>",

    // "varying vec2 vUv;",

    "uniform sampler2D tColor;",
    // "uniform sampler2D tDepth;",

    // "uniform float maxblur;", // max blur amount
    // "uniform float aperture;", // aperture - bigger values for shallower depth of field

    // "uniform float nearClip;",
    // "uniform float farClip;",

    // "uniform float focus;",
    // "uniform float aspect;",

    "#include <packing>",

    "float getDepth( const in vec2 screenPosition ) {",
    //"	#if DEPTH_PACKING == 1",
    // "	return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );",
    //"	#else",
    "	return texture2D( tDepth, screenPosition ).x;",
    //"	#endif",
    "}",

    "float getViewZ( const in float depth ) {",
    //"	#if PERSPECTIVE_CAMERA == 1",
    "	return perspectiveDepthToViewZ( depth, dof_nearClip, dof_farClip );",
    //"	#else",
    // "	return orthographicDepthToViewZ( depth, dof_nearClip, dof_farClip );",
    //"	#endif",
    "}",

    "void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",

    "float aspect = resolution.y / resolution.x;",

    // "vec2 aspectcorrect = vec2( 1.0, dof_aspect );",
    "vec2 aspectcorrect = vec2( 1.0, aspect );",

    // "float viewZ = getViewZ( getDepth( vUv ) );", // Original
    "float viewZ = - getDepth( vUv );",

    "float factor = ( dof_focus + viewZ );", // viewZ is <= 0, so this is a difference equation

    "vec2 dofblur = vec2 ( clamp( factor * dof_aperture, -dof_maxblur, dof_maxblur ) );",

    "vec2 dofblur9 = dofblur * 0.9;",
    "vec2 dofblur7 = dofblur * 0.7;",
    "vec2 dofblur4 = dofblur * 0.4;",

    "vec4 col = vec4( 0.0 );",

    "col += texture2D( tColor, vUv.xy );",

    "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );",

    "col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );",

    "col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );",

    "col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );",
    "col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );",
    "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );",

    // "gl_FragColor = col / 41.0;",
    // "gl_FragColor.a = 1.0;",

    "color = col / 41.0;",
    "color.a = 1.0;",

    // DEV
    "// color = vec4(1.0, 0.0, 0.0, 1.0); // Render Test - Red",
    "// color = vec4(dof_aspect, 0.0, 0.0, 1.0); // Aspect",
    "// color = vec4(dof_nearClip, dof_farClip, 0.0, 1.0); // Clip",

    "// color = vec4(texture2D( tDepth, vUv ).xyz, 1.0); // Depth Texture",
    "// color = vec4(getDepth( vUv ), 0.0, 0.0, 1.0); // Depth #1",
    "// color = vec4(viewZ, 0.0, 0.0, 1.0); // Depth #2",
    "// color = vec4(aspect, 0.0, 0.0, 1.0); // Aspect",

    "}"
  ].join("\n")

  // https://www.shadertoy.com/view/XdfGDH

  // fragment:
  //   "\n\
  // 	\n\
  // 	float normpdf(in float x, in float sigma) {\n\
  // 		return 0.39894 * exp(-0.5 * x * x / (sigma*sigma) ) / sigma;\n\
  // 	}\n\
  // 	\n\
  // 	void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {\n\
  // 		// Sample\n\
  // 		vec3 colourDiffuse = texture2D(tDiffuse, vUv).xyz;\n\
  // 		vec3 colourDepth = texture2D(tDepth, vUv).zyx;\n\
  //     \n\
  // 		// Depth from Sample Range - TODO Optimise\n\
  //     depth = colourDepth.b;\n\
  //     if(depth < dof_uBlurNear) { depth = 0.0; }\n\
  //     else if(depth > dof_uBlurNear + dof_uBlurRange){ depth = 1.0; }\n\
  //     else { depth = (depth - dof_uBlurNear) / dof_uBlurRange; }\n\
  //     \n\
  // 		// Frag Coordinate\n\
  // 		vec2 fragCoord = uv * resolution.xy;\n\
  // 		\n\
  // 		// Blur\n\
  // 		const int mSize = 21; // Blur Size\n\
  // 		const int kSize = (mSize-1)/2;\n\
  // 		float kernel[mSize];\n\
  // 		vec3 colourBlurred = vec3(0.0);\n\
  // 		\n\
  // 		// Create 1D Blur Kernel\n\
  // 		float sigma = 13.0; // Blur Samples\n\
  // 		float Z = 0.0;\n\
  // 		for (int j = 0; j <= kSize; ++j) {\n\
  // 			kernel[kSize+j] = kernel[kSize-j] = normpdf(float(j), sigma);\n\
  // 		}\n\
  // 		\n\
  // 		// Get the normalization factor (as the gaussian has been clamped)\n\
  // 		for (int j = 0; j < mSize; ++j) {\n\
  // 			Z += kernel[j];\n\
  // 		}\n\
  // 		\n\
  // 		// Read out the texels\n\
  // 		for (int i=-kSize; i <= kSize; ++i) {\n\
  // 			for (int j=-kSize; j <= kSize; ++j) {\n\
  // 				colourBlurred += kernel[kSize + j] * kernel[kSize + i] * texture2D(tDiffuse, (fragCoord.xy + vec2(float(i), float(j)) ) / resolution.xy).rgb;\n\
  // 			}\n\
  // 		}\n\
  // 		\n\
  //     colourBlurred /= (Z*Z);\n\
  // 		\n\
  // 		// Out\n\
  //     color = vec4(mix(colourDiffuse, colourBlurred, depth), 1.0);\n\
  //     \n\
  //     // Dev\n\
  // 		// color = vec4(origColor.rgb, 1.0); // Original\n\
  // 		// color = vec4(colourDepth.rgb, 1.0); // Depth Texture\n\
  //     // color = vec4(0.0, 0.0, colourDepth.b, 1.0); // Depth Texture\n\
  // 		// color = vec4(depth, depth, depth, 1.0); // Depth Value\n\
  // 		// color = vec4(vUv.x, vUv.y, 0.0, 1.0); // UV\n\
  // 		// color = vec4(colourBlurred.rgb, 1.0); // Blurred\n\
  // 		// color = vec4(dof_uBlurNear, dof_uBlurNear, dof_uBlurNear, 1.0);\n\
  //     // color = vec4(dof_uBlurRange, dof_uBlurRange, dof_uBlurRange, 1.0);\n\
  // 	}"
});
