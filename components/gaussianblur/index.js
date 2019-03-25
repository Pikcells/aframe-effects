// Simple directional gausian blur.

AFRAME.registerComponent("blur", {
  schema: {
    size: { value: 1.0 },
    direction: { type: "vec2", value: new THREE.Vector2(1.0, 0.0) }
  },

  init: function() {
    console.log("**** Component blur Initialised");

    this.system = this.el.sceneEl.systems.effects;
    this.uniforms.uResolution.value.set(
      this.el.canvas.width,
      this.el.canvas.width
    );
    this.update(this.data);
    this.system.register(this);
  },

  update: function(data) {
    for (var key in data) {
      this.uniforms[key].value = data[key];
    }
  },

  remove: function() {
    this.system.unregister(this);
  },

  uniforms: {
    size: { type: "f", value: 0.0 },
    uResolution: { type: "v2", value: new THREE.Vector2() },
    direction: { type: "v2", value: new THREE.Vector2(1.0, 0.0) }
  },

  fragment:
    "\
		vec4 blur( vec2 uv, float size, vec2 direction) {\n\
			vec4 color = vec4(0.0);\n\
			vec2 off1 = vec2(1.411764705882353) * direction;\n\
			vec2 off2 = vec2(3.2941176470588234) * direction;\n\
			vec2 off3 = vec2(5.176470588235294) * direction;\n\
			color += texture2D(tDiffuse, uv) * 0.1964825501511404;\n\
			color += texture2D(tDiffuse, uv + (off1 * size)) * 0.2969069646728344;\n\
			color += texture2D(tDiffuse, uv - (off1 * size)) * 0.2969069646728344;\n\
			color += texture2D(tDiffuse, uv + (off2 * size)) * 0.09447039785044732;\n\
			color += texture2D(tDiffuse, uv - (off2 * size)) * 0.09447039785044732;\n\
			color += texture2D(tDiffuse, uv + (off3 * size)) * 0.010381362401148057;\n\
			color += texture2D(tDiffuse, uv - (off3 * size)) * 0.010381362401148057;\n\
			return color;\n\
		}\n\
		void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth){\n\
			float size = $size/float($uResolution[1]);\n\
			color = blur( uv, size, $direction);\n\
		}"
});
