AFRAME.registerComponent("dof", {
  schema: {},

  init: function() {
    console.log("**** Component dof Initialised");

    this.system = this.el.sceneEl.systems.effects;

    this.system.register(this);
    this.needsResize = true;
  },

  update: function() {
    this.bypass = !this.data;
  },

  setSize: function(w, h) {
    console.log("setSize " + w + " " + h);
    this.material.uniforms.resolution.value.set(w, h);
  },

  resize: false,
  diffuse: true,
  depth: true,

  // Camera near/far range is 0.0 to 1.0
  // 0.8 to 1.0 is most of the visible range
  uniforms: {
    uBlurNear: { type: "f", value: 0.85 },
    uBlurRange: { type: "f", value: 0.1 }
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

  // https://www.shadertoy.com/view/XdfGDH

  fragment:
    "\n\
  	\n\
  	float normpdf(in float x, in float sigma) {\n\
  		return 0.39894 * exp(-0.5 * x * x / (sigma*sigma) ) / sigma;\n\
  	}\n\
  	\n\
  	void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {\n\
  		// Sample\n\
  		vec3 colourDiffuse = texture2D(tDiffuse, vUv).xyz;\n\
  		vec3 colourDepth = texture2D(tDepth, vUv).zyx;\n\
      \n\
  		// Depth from Sample Range - TODO Optimise\n\
      depth = colourDepth.b;\n\
      if(depth < dof_uBlurNear) { depth = 0.0; }\n\
      else if(depth > dof_uBlurNear + dof_uBlurRange){ depth = 1.0; }\n\
      else { depth = (depth - dof_uBlurNear) / dof_uBlurRange; }\n\
      \n\
  		// Frag Coordinate\n\
  		vec2 fragCoord = uv * resolution.xy;\n\
  		\n\
  		// Blur\n\
  		const int mSize = 7; // Blur Size\n\
  		const int kSize = (mSize-1)/2;\n\
  		float kernel[mSize];\n\
  		vec3 colourBlurred = vec3(0.0);\n\
  		\n\
  		// Create 1D Blur Kernel\n\
  		float sigma = 7.0; // Blur Samples\n\
  		float Z = 0.0;\n\
  		for (int j = 0; j <= kSize; ++j) {\n\
  			kernel[kSize+j] = kernel[kSize-j] = normpdf(float(j), sigma);\n\
  		}\n\
  		\n\
  		// Get the normalization factor (as the gaussian has been clamped)\n\
  		for (int j = 0; j < mSize; ++j) {\n\
  			Z += kernel[j];\n\
  		}\n\
  		\n\
  		// Read out the texels\n\
  		for (int i=-kSize; i <= kSize; ++i) {\n\
  			for (int j=-kSize; j <= kSize; ++j) {\n\
  				colourBlurred += kernel[kSize + j] * kernel[kSize + i] * texture2D(tDiffuse, (fragCoord.xy + vec2(float(i), float(j)) ) / resolution.xy).rgb;\n\
  			}\n\
  		}\n\
  		\n\
      colourBlurred /= (Z*Z);\n\
  		\n\
  		// Out\n\
      color = vec4(mix(colourDiffuse, colourBlurred, depth), 1.0);\n\
      \n\
      // Dev\n\
  		// color = vec4(origColor.rgb, 1.0); // Original\n\
  		// color = vec4(colourDepth.rgb, 1.0); // Depth Texture\n\
      // color = vec4(0.0, 0.0, colourDepth.b, 1.0); // Depth Texture\n\
  		// color = vec4(depth, depth, depth, 1.0); // Depth Value\n\
  		// color = vec4(vUv.x, vUv.y, 0.0, 1.0); // UV\n\
  		// color = vec4(colourBlurred.rgb, 1.0); // Blurred\n\
  		// color = vec4(dof_uBlurNear, dof_uBlurNear, dof_uBlurNear, 1.0);\n\
      // color = vec4(dof_uBlurRange, dof_uBlurRange, dof_uBlurRange, 1.0);\n\
  	}"
});
