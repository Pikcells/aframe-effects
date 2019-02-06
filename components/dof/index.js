// Ported from the shader in Three.js examples
// with the addition of a separate input pass

AFRAME.registerComponent("dof", {
    schema: {
        "tint": { type: "color", default: "#FFFFFF" },
        "threshold": { type: "vec4", default: new THREE.Vector4(0,1,1) },
        "src": { type: "selector", default: null },
        "intensity": { default: 1 },
        "filter": { type: "array", default: [] },
        "ratio": { default: 0.25 }
    },

    init: function () {
        this.system = this.el.sceneEl.systems.effects;
        var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
        this.rtFilter = new THREE.WebGLRenderTarget( 1, 1, pars );
        this.rtTextureGodRays1 = new THREE.WebGLRenderTarget( 1, 1, pars );
        this.rtTextureGodRays2 = new THREE.WebGLRenderTarget( 1, 1, pars );
        
        this.exports = {
            filter: {
                includes: ["packing"],
                uniforms: {
                    "tint": { type: "c", value: new THREE.Color() },
                    "threshold": { type: "v2", value: new THREE.Vector2(0,1) },
                    "samples": { type: "i", value: 4 },
                    "rings": { type: "i", value: 3 }
                },
                depth: true, 
                fragment: [
                    "#include <common>",

                    "uniform sampler2D tColor;",
                    "uniform float textureWidth;",
                    "uniform float textureHeight;",

                    "uniform float focalDepth;  //focal distance value in meters, but you may use autofocus option below",
                    "uniform float focalLength; //focal length in mm",
                    "uniform float fstop; //f-stop value",
                    "uniform bool showFocus; //show debug focus point and focal range (red = focal point, green = focal range)",

                    "/*",
                    "make sure that these two values are the same for your camera, otherwise distances will be wrong.",
                    "*/",

                    "uniform float znear; // camera clipping start",
                    "uniform float zfar; // camera clipping end",

                    "//------------------------------------------",
                    "//user variables",

                    "const int maxringsamples = $rings * $samples;",

                    "uniform bool manualdof; // manual dof calculation",
                    "float ndofstart = 1.0; // near dof blur start",
                    "float ndofdist = 2.0; // near dof blur falloff distance",
                    "float fdofstart = 1.0; // far dof blur start",
                    "float fdofdist = 3.0; // far dof blur falloff distance",

                    "float CoC = 0.03; //circle of confusion size in mm (35mm film = 0.03mm)",

                    "uniform bool vignetting; // use optical lens vignetting",

                    "float vignout = 1.3; // vignetting outer border",
                    "float vignin = 0.0; // vignetting inner border",
                    "float vignfade = 22.0; // f-stops till vignete fades",

                    "uniform bool shaderFocus;",
                    "// disable if you use external focalDepth value",

                    "uniform vec2 focusCoords;",
                    "// autofocus point on screen (0.0,0.0 - left lower corner, 1.0,1.0 - upper right)",
                    "// if center of screen use vec2(0.5, 0.5);",

                    "uniform float maxblur;",
                    "//clamp value of max blur (0.0 = no blur, 1.0 default)",

                    "uniform float threshold; // highlight threshold;",
                    "uniform float gain; // highlight gain;",

                    "uniform float bias; // bokeh edge bias",
                    "uniform float fringe; // bokeh chromatic aberration / fringing",

                    "uniform bool noise; //use noise instead of pattern for sample dithering",

                    "uniform float dithering;",

                    "uniform bool depthblur; // blur the depth buffer",
                    "float dbsize = 1.25; // depth blur size",

                    "/*",
                    "next part is experimental",
                    "not looking good with small sample and ring count",
                    "looks okay starting from samples = 4, $rings = 4",
                    "*/",

                    "uniform bool pentagon; //use pentagon as bokeh shape?",
                    "float feather = 0.4; //pentagon shape feather",

                    "//------------------------------------------",

                    "float penta(vec2 coords) {",
                        "//pentagonal shape",
                        "float scale = float($rings) - 1.3;",
                        "vec4  HS0 = vec4( 1.0,         0.0,         0.0,  1.0);",
                        "vec4  HS1 = vec4( 0.309016994, 0.951056516, 0.0,  1.0);",
                        "vec4  HS2 = vec4(-0.809016994, 0.587785252, 0.0,  1.0);",
                        "vec4  HS3 = vec4(-0.809016994,-0.587785252, 0.0,  1.0);",
                        "vec4  HS4 = vec4( 0.309016994,-0.951056516, 0.0,  1.0);",
                        "vec4  HS5 = vec4( 0.0        ,0.0         , 1.0,  1.0);",

                        "vec4  one = vec4( 1.0 );",

                        "vec4 P = vec4((coords),vec2(scale, scale));",

                        "vec4 dist = vec4(0.0);",
                        "float inorout = -4.0;",

                        "dist.x = dot( P, HS0 );",
                        "dist.y = dot( P, HS1 );",
                        "dist.z = dot( P, HS2 );",
                        "dist.w = dot( P, HS3 );",

                        "dist = smoothstep( -feather, feather, dist );",

                        "inorout += dot( dist, one );",

                        "dist.x = dot( P, HS4 );",
                        "dist.y = HS5.w - abs( P.z );",

                        "dist = smoothstep( -feather, feather, dist );",
                        "inorout += dist.x;",

                        "return clamp( inorout, 0.0, 1.0 );",
                    "}",

                    "float bdepth(vec2 coords) {",
                        "// Depth buffer blur",
                        "float d = 0.0;",
                        "float kernel[9];",
                        "vec2 offset[9];",

                        "vec2 wh = vec2(1.0/textureWidth,1.0/textureHeight) * dbsize;",

                        "offset[0] = vec2(-wh.x,-wh.y);",
                        "offset[1] = vec2( 0.0, -wh.y);",
                        "offset[2] = vec2( wh.x -wh.y);",

                        "offset[3] = vec2(-wh.x,  0.0);",
                        "offset[4] = vec2( 0.0,   0.0);",
                        "offset[5] = vec2( wh.x,  0.0);",

                        "offset[6] = vec2(-wh.x, wh.y);",
                        "offset[7] = vec2( 0.0,  wh.y);",
                        "offset[8] = vec2( wh.x, wh.y);",

                        "kernel[0] = 1.0/16.0;   kernel[1] = 2.0/16.0;   kernel[2] = 1.0/16.0;",
                        "kernel[3] = 2.0/16.0;   kernel[4] = 4.0/16.0;   kernel[5] = 2.0/16.0;",
                        "kernel[6] = 1.0/16.0;   kernel[7] = 2.0/16.0;   kernel[8] = 1.0/16.0;",


                        "for( int i=0; i<9; i++ ) {",
                            "float tmp = texture2D(tDepth, coords + offset[i]).r;",
                            "d += tmp * kernel[i];",
                        "}",

                        "return d;",
                    "}",


                    "vec3 scolor(vec2 coords,float blur) {",
                        "//processing the sample",

                        "vec3 col = vec3(0.0);",
                        "vec2 texel = vec2(1.0/textureWidth,1.0/textureHeight);",

                        "col.r = texture2D(tColor,coords + vec2(0.0,1.0)*texel*fringe*blur).r;",
                        "col.g = texture2D(tColor,coords + vec2(-0.866,-0.5)*texel*fringe*blur).g;",
                        "col.b = texture2D(tColor,coords + vec2(0.866,-0.5)*texel*fringe*blur).b;",

                        "vec3 lumcoeff = vec3(0.299,0.587,0.114);",
                        "float lum = dot(col.rgb, lumcoeff);",
                        "float thresh = max((lum-threshold)*gain, 0.0);",
                        "return col+mix(vec3(0.0),col,thresh*blur);",
                    "}",

                    "vec3 debugFocus(vec3 col, float blur, float depth) {",
                        "float edge = 0.002*depth; //distance based edge smoothing",
                        "float m = clamp(smoothstep(0.0,edge,blur),0.0,1.0);",
                        "float e = clamp(smoothstep(1.0-edge,1.0,blur),0.0,1.0);",

                        "col = mix(col,vec3(1.0,0.5,0.0),(1.0-m)*0.6);",
                        "col = mix(col,vec3(0.0,0.5,1.0),((1.0-e)-(1.0-m))*0.2);",

                        "return col;",
                    "}",

                    "float linearize(float depth) {",
                        "return -zfar * znear / (depth * (zfar - znear) - zfar);",
                    "}",


                    "float vignette() {",
                        "float dist = distance(vUv.xy, vec2(0.5,0.5));",
                        "dist = smoothstep(vignout+(fstop/vignfade), vignin+(fstop/vignfade), dist);",
                        "return clamp(dist,0.0,1.0);",
                    "}",

                    "float gather(float i, float j, int ringsamples, inout vec3 col, float w, float h, float blur) {",
                        "float rings2 = float($rings);",
                        "float step = PI*2.0 / float(ringsamples);",
                        "float pw = cos(j*step)*i;",
                        "float ph = sin(j*step)*i;",
                        "float p = 1.0;",
                        "if (pentagon) {",
                            "p = penta(vec2(pw,ph));",
                        "}",
                        "col += scolor(vUv.xy + vec2(pw*w,ph*h), blur) * mix(1.0, i/rings2, bias) * p;",
                        "return 1.0 * mix(1.0, i /rings2, bias) * p;",
                    "}",

                    "void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
                        "//scene depth calculation",

                        "float dpth = linearize(texture2D(tDepth,vUv.xy).x);",

                        "// Blur depth?",
                        "if ( depthblur ) {",
                            "dpth = linearize(bdepth(vUv.xy));",
                        "}",

                        "//focal plane calculation",

                        "float fDepth = focalDepth;",

                        "if (shaderFocus) {",

                            "fDepth = linearize(texture2D(tDepth,focusCoords).x);",

                        "}",

                        "// dof blur factor calculation",

                        "float blur = 0.0;",

                        "if (manualdof) {",
                            "float a = dpth-fDepth; // Focal plane",
                            "float b = (a-fdofstart)/fdofdist; // Far DoF",
                            "float c = (-a-ndofstart)/ndofdist; // Near Dof",
                            "blur = (a>0.0) ? b : c;",
                        "} else {",
                            "float f = focalLength; // focal length in mm",
                            "float d = fDepth*1000.0; // focal plane in mm",
                            "float o = dpth*1000.0; // depth in mm",

                            "float a = (o*f)/(o-f);",
                            "float b = (d*f)/(d-f);",
                            "float c = (d-f)/(d*fstop*CoC);",

                            "blur = abs(a-b)*c;",
                        "}",

                        "blur = clamp(blur,0.0,1.0);",

                        "// calculation of pattern for dithering",

                        "vec2 noise = vec2(rand(vUv.xy), rand( vUv.xy + vec2( 0.4, 0.6 ) ) )*dithering*blur;",

                        "// getting blur x and y step factor",

                        "float w = (1.0/textureWidth)*blur*maxblur+noise.x;",
                        "float h = (1.0/textureHeight)*blur*maxblur+noise.y;",

                        "// calculation of final color",

                        "vec3 col = vec3(0.0);",

                        "if(blur < 0.05) {",
                            "//some optimization thingy",
                            "col = texture2D(tColor, vUv.xy).rgb;",
                        "} else {",
                            "col = texture2D(tColor, vUv.xy).rgb;",
                            "float s = 1.0;",
                            "int ringsamples;",

                            "for (int i = 1; i <= $rings; i++) {",
                                "/*unboxstart*/",
                                "ringsamples = i * $samples;",

                                "for (int j = 0 ; j < maxringsamples ; j++) {",
                                    "if (j >= ringsamples) break;",
                                    "s += gather(float(i), float(j), ringsamples, col, w, h, blur);",
                                "}",
                                "/*unboxend*/",
                            "}",

                            "col /= s; //divide by sample count",
                        "}",

                        "if (showFocus) {",
                            "col = debugFocus(col, blur, dpth);",
                        "}",

                        "if (vignetting) {",
                            "col *= vignette();",
                        "}",

                        "color.rgb = col;",
                        "color.a = 1.0;",
                    "} "
                ].join( "\n" ),
            },
            blur: {
                uniforms: {
                    step: { type:"f", value: 1.0 },
                    src: { type: "v3", value: new THREE.Vector3( 0.5, 0.5, 0. ) }
                },
                fragment: [
                    "uniform float mNear;",
                    "uniform float mFar;",

                    "varying float vViewZDepth;",

                    "void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",

                    "   float c = 1.0 - smoothstep( mNear, mFar, vViewZDepth );",
                    "   color = vec4( vec3( c ), 1.0 );",

                    "} "

                ].join( "\n" )
            }
        }
        
        this.materialGodraysGenerate = this.system.fuse([this.exports.blur]);
        this.uniforms = {
            "intensity": { type: "f", value: 1 },
            "attenuation": {type: "f", value: 1 },
            "texture": { type: "t", value: this.rtTextureGodRays2 }
        };

        this.materialFilter = null;
        
        this.needsResize = true;
        this.system.register(this);
    },

    setSize: function (w,h) {
       w = Math.round(w * this.data.ratio);
       h = Math.round(h * this.data.ratio);
       this.rtTextureGodRays1.setSize(w,h);
       this.rtTextureGodRays2.setSize(w,h);
       this.rtFilter.setSize(w,h);
    },

    update: function (oldData) {
        this.exports.filter.uniforms.tint.value.set(this.data.tint);
        this.uniforms.intensity.value = this.data.intensity;
        if(this.data.filter !== oldData.filter) {
            if(this.materialFilter) this.materialFilter.dispose();
            this.materialFilter = this.system.fuse(this.data.filter.length ? this.data.filter : [this.exports.filter]);
        }
        this.bypass = this.data.src === null;
    },

    tock: function () {
        if (!this.system.isActive(this, true)) return;
        var self = this;
        
        this.system.tDiffuse.value = this.system.renderTarget.texture;
        this.system.renderPass(this.materialFilter, this.rtFilter, fn )

        var fn = function (material, camera, eye) {
            var cp3 = new THREE.Vector3(), cd3 = new THREE.Vector3();
            var v3 = self.exports.blur.uniforms[ "src" ].value;
            self.data.src.object3D.getWorldPosition(v3);
            camera.getWorldPosition(cp3);
            camera.getWorldDirection(cd3);
            cp3.sub(v3);
            cp3.normalize();
            cd3.normalize();
            self.uniforms.attenuation.value = Math.pow(Math.max(0, -cd3.dot(cp3)), 1.33);
            
            v3.project( camera );
            v3.set((v3.x + 1 ) / 2, (v3.y + 1 ) / 2, 0);
            
        };

        var filterLen = 1.0;
        var TAPS_PER_PASS = 6.0;
        
        var pass = 1.0;
        var stepLen = filterLen * Math.pow( TAPS_PER_PASS, -pass );
        this.exports.blur.uniforms[ "step" ].value = stepLen;
        this.system[ "tDiffuse" ].value = this.rtFilter.texture;
        this.system.renderPass(this.materialGodraysGenerate, this.rtTextureGodRays2, fn )
        
        pass = 2.0;
        stepLen = filterLen * Math.pow( TAPS_PER_PASS, -pass );
        this.exports.blur.uniforms[ "step" ].value = stepLen;
        this.system[ "tDiffuse" ].value = this.rtTextureGodRays2.texture;
        this.system.renderPass(this.materialGodraysGenerate, this.rtTextureGodRays1, fn );
        
        pass = 3.0;
        stepLen = filterLen * Math.pow( TAPS_PER_PASS, -pass );
        this.exports.blur.uniforms[ "step" ].value = stepLen;
        this.system[ "tDiffuse" ].value = this.rtTextureGodRays1.texture;
        this.system.renderPass(this.materialGodraysGenerate, this.rtTextureGodRays2, fn )
    },

    remove: function () {
        this.rtTextureGodRays1.dispose();
        this.rtTextureGodRays2.dispose();
        this.rtFilter.dispose();

        this.materialGodraysGenerate.dispose();
        this.materialFilter.dispose();
        this.system.unregister(this);
    },

    diffuse: true,

    fragment: [
        "float $blendScreen(float base, float blend) {",
        "    return 1.0-((1.0-base)*(1.0-blend));",
        "}",

        "vec3 $blendScreen(vec3 base, vec3 blend) {",
        "    return vec3($blendScreen(base.r,blend.r),$blendScreen(base.g,blend.g),$blendScreen(base.b,blend.b));",
        "}",

        "vec3 $blendScreen(vec3 base, vec3 blend, float opacity) {",
        "    return ($blendScreen(base, blend) * opacity + base * (1.0 - opacity));",
        "}",

        "void $main(inout vec4 color, vec4 origColor, vec2 uv, float depth) {",
        "   vec4 texel = texture2D($texture, uv);",
        "   color.rgb = $blendScreen( color.rgb, texel.rgb, $intensity * $attenuation);",
        "}"
    ].join( "\n" )
});