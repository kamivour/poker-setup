/* fx.js — the animated backdrop behind the decorated themes.

   One WebGL fragment shader paints the whole viewport: a lamp over baize for
   Felt, drifting bokeh and steam for Cafe, gold dust and a rim of light for
   Royal, paper under window light for Bone. app.js calls PKFX.setTheme(id,
   flat) whenever the theme changes, and two themes cross-fade inside the
   shader. Flat themes (Midnight) switch the canvas off altogether.

   Budget: the canvas renders at 0.6x CSS pixels (capped at 1.3 Mpx) and at
   most 30 frames a second, pauses while the tab is hidden, and draws a single
   still frame when the user prefers reduced motion. Every motion in the
   shader is periodic in 600 s and the clock wraps at 3600 s, so float
   precision never drifts over a long tournament and the wrap is invisible.

   No WebGL, no GPU (the browser would fall back to software rendering), or a
   lost context: <html> gets the class "nofx" and style.css shows the static
   CSS gradient in --decor instead. Append ?fx=force to the URL to accept
   software rendering, which is how the screenshots are taken.

   The GLSL lives in this file as strings so the page still works from file://
   without a build step. */
(function(){
"use strict";

var SLOT={felt:0, bone:1, cafe:2, royal:3};
var SCALE=0.6, MAX_PX=1.3e6, FRAME_MS=1000/30, MIX_MS=900;

var api={setTheme:function(){}};
window.PKFX=api;
var canvas=document.getElementById("fx");
if(!canvas) return;
var html=document.documentElement;

var force=/[?&]fx=force(&|$)/.test(location.search);
var gl=null;
try{
  var opts={alpha:false, antialias:false, depth:false, stencil:false, preserveDrawingBuffer:false,
            powerPreference:"low-power", failIfMajorPerformanceCaveat:!force};
  gl=canvas.getContext("webgl",opts)||canvas.getContext("experimental-webgl",opts);
}catch(e){ gl=null; }
if(!gl){ html.classList.add("nofx"); return; }

var VERT=[
"attribute vec2 a;",
"varying vec2 v_uv;",
"void main(){ v_uv=a*0.5+0.5; gl_Position=vec4(a,0.0,1.0); }"
].join("\n");

var FRAG=[
"#ifdef GL_FRAGMENT_PRECISION_HIGH",
"precision highp float;",
"#else",
"precision mediump float;",
"#endif",
"uniform vec2 u_res;",
"uniform float u_t;",
"uniform int u_theme;",
"uniform int u_prev;",
"uniform float u_mix;",
"varying vec2 v_uv;",
"const float TAU=6.28318530718;",
"",
"float hash(vec2 p){",
"  vec3 p3=fract(vec3(p.xyx)*0.1031);",
"  p3+=dot(p3,p3.yzx+33.33);",
"  return fract((p3.x+p3.y)*p3.z);",
"}",
"float noise(vec2 p){",
"  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
"  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);",
"}",
"/* noise on a lattice that repeats every `per` units: a field can scroll",
"   forever without its coordinates growing */",
"float noiseT(vec2 p, float per){",
"  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
"  vec2 i0=mod(i,per), i1=mod(i+1.0,per);",
"  return mix(mix(hash(i0),hash(vec2(i1.x,i0.y)),f.x),mix(hash(vec2(i0.x,i1.y)),hash(i1),f.x),f.y);",
"}",
"float fbm(vec2 p){ float v=0.0, a=0.5; for(int k=0;k<3;k++){ v+=a*noise(p); p=p*2.03+vec2(17.0,9.0); a*=0.5; } return v; }",
"float fbmT(vec2 p, float per){ float v=0.0, a=0.5; for(int k=0;k<3;k++){ v+=a*noiseT(p,per); p*=2.0; per*=2.0; a*=0.5; } return v; }",
"float soft(vec2 q, vec2 c, vec2 r, float edge){ return 1.0-smoothstep(0.0,edge,length((q-c)/r)); }",
"",
"/* Felt: one lamp over green baize, the pool of light breathing slowly with",
"   a little haze drifting through the beam; fine fibre in the cloth. */",
"vec3 felt(vec2 p, vec2 q, float t){",
"  vec3 dark=vec3(0.043,0.078,0.063);",
"  vec3 baize=vec3(0.165,0.365,0.235);",
"  float lamp=soft(q,vec2(0.0,0.06),vec2(1.3,1.0),1.2);",
"  lamp*=lamp;",
"  lamp*=0.97+0.03*sin(t*TAU/24.0);",
"  float haze=fbm(p*2.4+vec2(sin(t*TAU/150.0),cos(t*TAU/120.0))*0.5);",
"  lamp*=0.82+0.36*haze;",
"  vec3 col=mix(dark,baize,lamp);",
"  float fib=(noise(p*vec2(150.0,340.0))-0.5)*0.11+(noise(p*55.0)-0.5)*0.05;",
"  col*=1.0+fib;",
"  col*=1.0-0.42*smoothstep(0.6,1.4,length(q));",
"  return col;",
"}",
"",
"/* Cafe: an amber lamp top left, embers bottom right, out-of-focus lights",
"   drifting behind the table and steam rising from a cup at the bottom",
"   left. The lights stay out of the middle so the clock sits on plain dark. */",
"vec3 cafe(vec2 p, vec2 q, float t, float asp){",
"  vec3 base=vec3(0.098,0.071,0.063);",
"  vec3 amber=vec3(0.816,0.541,0.29);",
"  vec3 cream=vec3(0.95,0.78,0.55);",
"  vec3 ember=vec3(0.55,0.22,0.09);",
"  vec3 col=base;",
"  col+=amber*0.15*soft(q,vec2(-1.1,1.0),vec2(1.3,1.0),1.4);",
"  col+=ember*0.32*soft(q,vec2(1.05,-1.05),vec2(1.25,1.0),1.2);",
"  float keep=smoothstep(0.3,0.85,length(q/vec2(1.0,0.8)));",
"  for(int i=0;i<12;i++){",
"    float fi=float(i);",
"    vec2 s=vec2(fi*0.37+0.11,fi*0.71+0.29);",
"    vec2 c=(vec2(hash(s),hash(s+3.1))*2.0-1.0)*vec2(1.05,0.95);",
"    float k=1.0+mod(fi,3.0);",
"    c+=0.14*vec2(sin(t*TAU*k/600.0+fi),cos(t*TAU*(k+1.0)/600.0+fi*1.7));",
"    vec2 cp=c*0.5*vec2(asp,1.0);",
"    float r=0.09+0.15*hash(s+7.7);",
"    float d=length(p-cp)/r;",
"    float disc=(1.0-smoothstep(0.8,1.0,d))*(0.6+0.4*smoothstep(0.55,1.0,d));",
"    float tw=0.7+0.3*sin(t*TAU*(2.0+mod(fi,4.0))/600.0+fi*2.3);",
"    col+=mix(amber,cream,hash(s+9.3))*disc*0.075*tw*keep;",
"  }",
"  vec2 sp=vec2(p.x*3.0+0.3*sin(t*TAU/200.0),p.y*3.5-t*(40.0/600.0));",
"  float st=smoothstep(0.5,0.85,fbmT(sp,8.0));",
"  float sm=exp(-pow((q.x+0.7)/0.32,2.0))*(1.0-smoothstep(-0.9,0.75,q.y))*smoothstep(-1.05,-0.8,q.y);",
"  col+=vec3(0.95,0.85,0.72)*st*sm*0.11;",
"  col*=1.0-0.35*smoothstep(0.7,1.45,length(q));",
"  return col;",
"}",
"",
"/* Royal: near black with a wine glow low in the frame and gold light at the",
"   rim, a slow spotlight sweeping across, and gold dust rising and",
"   twinkling. Each dust mote lives in its own grid cell, which keeps the",
"   cost at one mote per pixel. The middle is kept dark for the clock. */",
"vec3 royal(vec2 p, vec2 q, float t, float asp){",
"  vec3 base=vec3(0.09,0.024,0.035);",
"  vec3 wine=vec3(0.32,0.06,0.10);",
"  vec3 gold=vec3(0.878,0.757,0.345);",
"  vec3 glint=vec3(1.0,0.93,0.72);",
"  float r=length(q/vec2(1.0,0.9));",
"  vec3 col=mix(base,wine,0.5*soft(q,vec2(0.0,-0.95),vec2(1.7,1.0),1.4));",
"  col+=gold*0.15*smoothstep(0.5,1.4,r);",
"  float sw=q.x*0.85-q.y*0.55-1.9*sin(t*TAU/60.0);",
"  col+=gold*0.07*exp(-sw*sw*2.0)*smoothstep(0.3,1.0,r);",
"  float keep=smoothstep(0.42,1.0,r);",
"  vec2 cell=floor(p/0.11);",
"  vec2 h=vec2(hash(cell+0.37),hash(cell+5.11));",
"  if(h.x<0.42){",
"    float m=4.0+floor(h.x*10.0);",
"    float rise=fract(h.y+t*m/600.0);",
"    vec2 pc=(cell+vec2(0.2+0.6*hash(cell+9.7),0.15+0.7*rise))*0.11;",
"    float d=length(p-pc);",
"    float sz=0.0035+0.004*hash(cell+2.2);",
"    float fade=sin(rise*3.14159);",
"    float tw=0.55+0.45*sin(t*TAU*(200.0+floor(hash(cell+4.4)*400.0))/600.0+hash(cell)*TAU);",
"    float g=fade*tw*keep;",
"    col+=mix(gold,glint,0.5)*exp(-d*d/(2.0*sz*sz))*g*0.9;",
"    col+=glint*exp(-d*d/(0.4*sz*sz))*g*0.5;",
"  }",
"  col*=1.0-0.4*smoothstep(0.75,1.5,length(q));",
"  return col;",
"}",
"",
"/* Bone: warm paper under a window, light from the top left that moves",
"   as slowly as the sun, faint mottling and grain. Almost still. */",
"vec3 bone(vec2 p, vec2 q, float t){",
"  vec3 col=vec3(0.945,0.937,0.91);",
"  vec2 lc=vec2(-0.55+0.2*sin(t*TAU/600.0),0.9);",
"  col+=0.06*soft(q,lc,vec2(1.4,1.0),1.5);",
"  float m=fbm(p*3.2+vec2(sin(t*TAU/600.0),cos(t*TAU/600.0))*0.25)-0.44;",
"  col*=1.0+m*0.07;",
"  col*=mix(vec3(1.0),vec3(1.0,0.975,0.93),smoothstep(-0.15,0.25,m));",
"  col*=1.0+(noise(p*280.0)-0.5)*0.045;",
"  col*=1.0-0.11*smoothstep(0.55,1.45,length(q));",
"  return col;",
"}",
"",
"vec3 paint(int th, vec2 p, vec2 q, float t, float asp){",
"  if(th==0) return felt(p,q,t);",
"  if(th==1) return bone(p,q,t);",
"  if(th==2) return cafe(p,q,t,asp);",
"  return royal(p,q,t,asp);",
"}",
"void main(){",
"  vec2 q=v_uv*2.0-1.0;",
"  float asp=u_res.x/u_res.y;",
"  vec2 p=q*0.5*vec2(asp,1.0);",
"  vec3 col=paint(u_theme,p,q,u_t,asp);",
"  if(u_mix<1.0){ col=mix(paint(u_prev,p,q,u_t,asp),col,u_mix); }",
"  col+=(hash(gl_FragCoord.xy)-0.5)*(2.0/255.0);",
"  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);",
"}"
].join("\n");

var prog=null, uRes, uT, uTheme, uPrev, uMix;
function compile(type, src){
  var s=gl.createShader(type);
  gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
    try{ console.warn("fx: "+gl.getShaderInfoLog(s)); }catch(e){}
    return null;
  }
  return s;
}
function setup(){
  var vs=compile(gl.VERTEX_SHADER,VERT), fs=compile(gl.FRAGMENT_SHADER,FRAG);
  if(!vs||!fs) return false;
  prog=gl.createProgram();
  gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) return false;
  gl.useProgram(prog);
  var buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var a=gl.getAttribLocation(prog,"a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  uRes=gl.getUniformLocation(prog,"u_res");
  uT=gl.getUniformLocation(prog,"u_t");
  uTheme=gl.getUniformLocation(prog,"u_theme");
  uPrev=gl.getUniformLocation(prog,"u_prev");
  uMix=gl.getUniformLocation(prog,"u_mix");
  canvas.width=0;
  resize();
  return true;
}

var active=false, cur=0, prev=0, mixStart=0, shown=false;
var raf=0, lastFrame=0, t0=(window.performance&&performance.now)?performance.now():Date.now();
var rm=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null;
function reduced(){ return !!(rm&&rm.matches); }
function now(){ return (window.performance&&performance.now)?performance.now():Date.now(); }

function resize(){
  if(!prog) return;
  var W=window.innerWidth||1, H=window.innerHeight||1, s=SCALE;
  if(W*H*s*s>MAX_PX) s=Math.sqrt(MAX_PX/(W*H));
  var w=Math.max(1,Math.round(W*s)), h=Math.max(1,Math.round(H*s));
  if(canvas.width!==w||canvas.height!==h){
    canvas.width=w; canvas.height=h;
    gl.viewport(0,0,w,h);
    gl.uniform2f(uRes,w,h);
  }
}

function draw(ts){
  var t=((ts-t0)/1000)%3600;
  var mix=1;
  if(mixStart){
    mix=Math.min(1,(ts-mixStart)/MIX_MS);
    mix=mix*mix*(3-2*mix);
    if(mix>=1) mixStart=0;
  }
  gl.uniform1f(uT,t);
  gl.uniform1i(uTheme,cur);
  gl.uniform1i(uPrev,prev);
  gl.uniform1f(uMix,mix);
  gl.drawArrays(gl.TRIANGLES,0,3);
  if(!shown){ shown=true; canvas.classList.add("on"); }
}

function tick(ts){
  raf=0;
  if(!active||document.hidden) return;
  if(ts-lastFrame<FRAME_MS-1){ raf=requestAnimationFrame(tick); return; }
  lastFrame=ts;
  draw(ts);
  /* Reduced motion: one frame is the whole backdrop. A cross-fade still
     needs its frames, so the loop runs until the mix lands. */
  if(!reduced()||mixStart) raf=requestAnimationFrame(tick);
}
function start(){ if(active&&!raf&&!document.hidden) raf=requestAnimationFrame(tick); }
function stop(){ if(raf){ cancelAnimationFrame(raf); raf=0; } }

api.setTheme=function(id, flat){
  var slot=SLOT[id];
  if(flat||slot===undefined){
    active=false; stop(); shown=false; mixStart=0;
    canvas.classList.remove("on");
    return;
  }
  if(active&&slot!==cur){ prev=cur; mixStart=now(); }
  else if(!active){ prev=slot; mixStart=0; }
  cur=slot; active=true;
  start();
};

canvas.addEventListener("webglcontextlost",function(e){
  e.preventDefault(); stop(); prog=null; shown=false;
  canvas.classList.remove("on"); html.classList.add("nofx");
});
canvas.addEventListener("webglcontextrestored",function(){
  if(setup()){ html.classList.remove("nofx"); start(); }
});
document.addEventListener("visibilitychange",function(){ if(document.hidden) stop(); else start(); });
window.addEventListener("resize",function(){ resize(); start(); });
window.addEventListener("orientationchange",function(){ resize(); start(); });
if(rm){ (rm.addEventListener||rm.addListener).call(rm,"change",function(){ start(); }); }

if(!setup()){ html.classList.add("nofx"); prog=null; }
})();
