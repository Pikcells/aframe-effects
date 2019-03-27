AFRAME.registerComponent("dof", {
  schema: {
    maxblur: { default: 1.0 }, // Max blur amount
    aperture: { default: 0.025 }, // Aperture - bigger values for shallower depth of field
    focus: { default: 0.75 } // Focus 0.0 to 1.0 depth into scene
  },

  init: function() {
    // Effect
    this.system = this.el.sceneEl.systems.effects;

    this.needsResize = true;
    this.system.register(this);

    // DEV
    this.maxblur = 0.0;
    this.aperture = 0.0;
    this.focus = 0.0;

    var gui = new dat.GUI();
    gui.add(this, "maxblur", 0.0, 1.0);
    gui.add(this, "aperture", 0.0, 1.0);
    gui.add(this, "focus", 0.0, 1.0);
    // END DEV
  },

  // DEV
  tick: function() {
    var UNIFORMS = this.uniforms;

    UNIFORMS.maxblur.value = this.maxblur;
    UNIFORMS.aperture.value = this.aperture;
    UNIFORMS.focus.value = this.focus;

    console.log(
      "maxblur: " +
        this.maxblur +
        " aperture: " +
        this.aperture +
        " focus: " +
        this.focus
    );
  },
  // END DEV

  diffuse: true,
  depth: true,

  uniforms: {
    maxblur: { type: "f", value: 0.0 },
    aperture: { type: "f", value: 0.0 },
    focus: { type: "f", value: 0.0 },

    nearClip: { type: "f", value: 0.0 },
    farClip: { type: "f", value: -10.0 }
  },

  update: function() {
    var UNIFORMS = this.uniforms;

    UNIFORMS.maxblur.value = this.data.maxblur;
    UNIFORMS.aperture.value = this.data.aperture;
    UNIFORMS.focus.value = this.data.focus;
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
    "#include <packing>",

    "uniform sampler2D tColor;",

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

    "float aspect = resolution.x / resolution.y;",
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
});
