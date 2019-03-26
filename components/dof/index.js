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
  uniforms: {
    uBlurNear: { type: "f", value: 0.25 },
    uBlurRange: { type: "f", value: 0.5 }
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

  //   fragment:
  //     "\n\
  // // uniform sampler2D uTexture; //Image to be processed \n\
  // // uniform sampler2D uDepth; //Linear depth, where 1.0 == far plane \n\
  // uniform vec2 uPixelSize; //The size of a pixel: vec2(1.0/width, 1.0/height) \n\
  // uniform float uFar; // Far plane  \n\
  // \n\
  // const float GOLDEN_ANGLE = 2.39996323; \n\
  // const float MAX_BLUR_SIZE = 20.0; \n\
  // const float RAD_SCALE = 0.5; // Smaller = nicer blur, larger = faster \n\
  // \n\
  // float getBlurSize(float depth, float focusPoint, float focusScale) { \n\
  // 	float coc = clamp((1.0 / focusPoint - 1.0 / depth)*focusScale, -1.0, 1.0);\n\
  // 	return abs(coc) * MAX_BLUR_SIZE;\n\
  // }\n\
  // \n\
  // vec3 depthOfField(vec2 texCoord, float focusPoint, float focusScale) {\n\
  // 	float centerDepth = texture2D(tDepth, texCoord).r * uFar;\n\
  // 	float centerSize = getBlurSize(centerDepth, focusPoint, focusScale);\n\
  // 	vec3 color = texture2D(tDiffuse, texCoord).rgb;\n\
  // 	float tot = 1.0;\n\
  // 	float radius = RAD_SCALE;\n\
  // 	for (float ang = 0.0; radius<MAX_BLUR_SIZE; ang += GOLDEN_ANGLE) {\n\
  // 		vec2 tc = texCoord + vec2(cos(ang), sin(ang)) * uPixelSize * radius;\n\
  // 		vec3 sampleColor = texture2D(tDiffuse, tc).rgb;\n\
  // 		float sampleDepth = texture2D(tDepth, tc).r * uFar;\n\
  // 		float sampleSize = getBlurSize(sampleDepth, focusPoint, focusScale);\n\
  // 		if (sampleDepth > centerDepth)\n\
  // 			sampleSize = clamp(sampleSize, 0.0, centerSize*2.0);\n\
  // 		float m = smoothstep(radius-0.5, radius+0.5, sampleSize);\n\
  // 		color += mix(color/tot, sampleColor, m);\n\
  // 		tot += 1.0;   radius += RAD_SCALE/radius;\n\
  // 	}\n\
  // 	return color /= tot;\n\
  //   }\n\
  // \n\
  // void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {\n\
  // \n\
  // color = vec4(depthOfField(uv, 0.5, 0.5), 1.0);\n\
  // }"

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
  		vec2 fragCoord = uv * resolution.xy;\n\
  		\n\
  		// Blur\n\
  		const int mSize = 11;\n\
  		const int kSize = (mSize-1)/2;\n\
  		float kernel[mSize];\n\
  		vec3 colourBlurred = vec3(0.0);\n\
  		\n\
  		// Create 1D Blur Kernel\n\
  		float sigma = 7.0;\n\
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
  		\n\
  		// Sample range\n\
  		// TODO\n\
  		\n\
  		// Out\n\
  		// color = origColor.rgb; // Original\n\
  		// color = vec4(colourDepth.xyz, 1.0); // Depth Texture\n\
  		// color = vec4(depth, depth, depth, 1.0); // Depth Value\n\
  		// color = vec4(vUv.x, vUv.y, 0.0, 1.0); // UV\n\
  		// color = vec4(colourBlurred.rgb, 1.0); // Blurred\n\
  		color = vec4(mix(colourDiffuse, colourBlurred, depth), 1.0);\n\
  		// color = vec4(dof_uBlurNear, dof_uBlurNear, dof_uBlurNear, 1.0);\n\
  	}"
});
