/* fx.js — the animated backdrop behind the decorated themes.

   One WebGL fragment shader paints the whole viewport: a lamp over baize for
   Felt, a plaster wall under a warm lamp for Cafe, gold dust and a rim of
   light for Royal, paper under window light for Bone, and a night sky with
   constellations for Midnight. app.js calls PKFX.setTheme(id, flat) whenever
   the theme changes, and two themes cross-fade inside the shader. Flat
   themes (Minimal) switch the canvas off altogether.

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

var SLOT={felt:0, bone:1, cafe:2, royal:3, midnight:4};
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
"/* Cafe: a latte wall under a warm lamp. Trowelled plaster: bumps with a lit",
"   side and a shadow side, sampled one canvas pixel apart so the relief stays",
"   sharp on the 0.6x canvas, over slow mottling that drifts with the light.",
"   The corners fall into warm brown so the room feels close. */",
"float plaster(vec2 g){",
"  float n=noise(g)*0.5;",
"  n+=abs(noise(g*2.3+vec2(3.1,7.3))*2.0-1.0)*0.32;",
"  n+=noise(g*5.1+vec2(11.0,5.0))*0.18;",
"  return n;",
"}",
"vec3 cafe(vec2 p, vec2 q, float t){",
"  vec3 cream=vec3(0.93,0.83,0.68);",
"  vec3 latte=vec3(0.80,0.65,0.48);",
"  vec2 dr=vec2(sin(t*TAU/600.0),cos(t*TAU/600.0))*0.15;",
"  float m=fbm(p*2.2+dr);",
"  vec3 col=mix(cream,latte,smoothstep(0.28,0.76,m));",
"  vec2 g=p*56.0;",
"  float e=56.0/u_res.y;",
"  float h0=plaster(g);",
"  float gx=plaster(g+vec2(e,0.0))-h0;",
"  float gy=plaster(g+vec2(0.0,e))-h0;",
"  float lit=dot(vec2(gx,gy)/e,vec2(-0.6,0.8));",
"  col*=1.0+clamp(lit*0.1,-0.32,0.22);",
"  col*=1.0+(noise(p*230.0)-0.5)*0.06;",
"  vec2 lc=vec2(0.15*sin(t*TAU/600.0),0.95);",
"  col+=vec3(0.10,0.065,0.02)*soft(q,lc,vec2(1.3,1.1),1.4)*(0.96+0.04*sin(t*TAU/30.0));",
"  col*=mix(vec3(1.0),vec3(0.68,0.52,0.38),smoothstep(0.55,1.7,length(q)));",
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
"/* Midnight: a night sky. A gentle slope of colour from near black at the",
"   top to a blue haze low down, a field of faint stars, three constellations",
"   drawn with hairlines (the Plough, Cassiopeia, Orion), all twinkling",
"   slowly, and a meteor every two minutes. The constellations hang from the",
"   corners so they clear the clock on every screen shape. */",
"float star(vec2 p, vec2 c, float r){ vec2 d=p-c; return exp(-dot(d,d)/(2.0*r*r)); }",
"float link(vec2 p, vec2 a, vec2 b, float w){",
"  vec2 ab=b-a; float h=clamp(dot(p-a,ab)/dot(ab,ab),0.0,1.0);",
"  vec2 d=p-a-ab*h; return exp(-dot(d,d)/(2.0*w*w));",
"}",
"float tw(float t, float k, float ph){ return 0.7+0.3*sin(t*TAU*k/600.0+ph); }",
"float cst(vec2 p, vec2 c, float t, float k){",
"  float px=1.0/u_res.y;",
"  return (star(p,c,1.6*px)+0.35*star(p,c,4.5*px))*tw(t,k,k*1.7);",
"}",
"vec3 midnight(vec2 p, vec2 q, float t, float asp){",
"  float px=1.0/u_res.y;",
"  float g=clamp(0.5-0.5*q.y+0.1*q.x,0.0,1.0);",
"  vec3 col=mix(vec3(0.012,0.016,0.04),vec3(0.05,0.075,0.165),g);",
"  col=mix(col,vec3(0.10,0.12,0.24),0.6*smoothstep(0.72,1.0,g));",
"  vec2 cell=floor(p*36.0);",
"  vec2 h=vec2(hash(cell+1.3),hash(cell+7.7));",
"  if(h.x<0.3){",
"    vec2 sc=(cell+vec2(0.15+0.7*hash(cell+3.3),0.15+0.7*hash(cell+5.5)))/36.0;",
"    float sz=(0.9+1.1*hash(cell+2.2))*px;",
"    float b=0.25+0.55*hash(cell+4.4);",
"    b*=tw(t,60.0+floor(h.y*120.0),h.y*TAU);",
"    b*=(1.0-0.7*g)*(0.4+0.6*smoothstep(0.2,0.8,length(q)));",
"    vec3 sc3=mix(vec3(1.0,0.9,0.75),vec3(0.8,0.88,1.0),hash(cell+6.6));",
"    col+=sc3*star(p,sc,sz)*b;",
"  }",
"  float w=0.7*px;",
"  float s=0.078;",
"  vec2 o=vec2(-asp*0.5+0.09,0.5-0.16);",
"  vec2 a0=o, a1=o+s*vec2(0.8,0.35), a2=o+s*vec2(1.5,0.45), a3=o+s*vec2(2.2,0.55);",
"  vec2 a4=o+s*vec2(2.4,-0.15), a5=o+s*vec2(3.3,0.0), a6=o+s*vec2(3.2,0.8);",
"  float ln=link(p,a0,a1,w)+link(p,a1,a2,w)+link(p,a2,a3,w)+link(p,a3,a4,w)+link(p,a4,a5,w)+link(p,a5,a6,w)+link(p,a6,a3,w);",
"  float st=cst(p,a0,t,31.0)+cst(p,a1,t,37.0)+cst(p,a2,t,43.0)+cst(p,a3,t,29.0)+cst(p,a4,t,41.0)+cst(p,a5,t,47.0)+cst(p,a6,t,35.0);",
"  s=0.075; o=vec2(asp*0.5-0.09-1.85*s,0.5-0.2);",
"  vec2 b0=o, b1=o+s*vec2(0.45,0.55), b2=o+s*vec2(0.95,0.25), b3=o+s*vec2(1.45,0.75), b4=o+s*vec2(1.85,0.2);",
"  ln+=link(p,b0,b1,w)+link(p,b1,b2,w)+link(p,b2,b3,w)+link(p,b3,b4,w);",
"  st+=cst(p,b0,t,33.0)+cst(p,b1,t,39.0)+cst(p,b2,t,45.0)+cst(p,b3,t,27.0)+cst(p,b4,t,49.0);",
"  s=0.11; o=vec2(asp*0.5-0.09-1.0*s,-0.5+0.2);",
"  vec2 c0=o+s*vec2(0.0,1.0), c1=o+s*vec2(0.95,1.05), c2=o+s*vec2(0.32,0.5), c3=o+s*vec2(0.5,0.45);",
"  vec2 c4=o+s*vec2(0.68,0.4), c5=o+s*vec2(0.05,-0.1), c6=o+s*vec2(0.9,0.0);",
"  ln+=link(p,c0,c1,w)+link(p,c0,c2,w)+link(p,c2,c3,w)+link(p,c3,c4,w)+link(p,c4,c1,w)+link(p,c2,c5,w)+link(p,c4,c6,w);",
"  st+=cst(p,c0,t,30.0)+cst(p,c1,t,36.0)+cst(p,c2,t,42.0)+cst(p,c3,t,28.0)+cst(p,c4,t,40.0)+cst(p,c5,t,46.0)+cst(p,c6,t,34.0);",
"  col+=vec3(0.55,0.65,0.9)*ln*0.22;",
"  col+=vec3(0.9,0.94,1.0)*st*0.85;",
"  float ci=mod(floor(t/120.0),5.0);",
"  float mt=mod(t,120.0);",
"  if(mt<1.4){",
"    float u=mt/1.4;",
"    vec2 dir=normalize(vec2(-0.8,-0.45));",
"    vec2 ma=vec2((hash(vec2(ci,1.0))-0.5)*asp*0.8+0.2*asp,0.46-0.1*hash(vec2(ci,2.0)));",
"    vec2 mh=ma+dir*u*0.35;",
"    float along=clamp(dot(p-(mh-dir*0.14),dir)/0.14,0.0,1.0);",
"    float mk=link(p,mh-dir*0.14,mh,0.8*px)*along*along*sin(u*3.14159);",
"    col+=vec3(0.9,0.94,1.0)*mk*0.8;",
"  }",
"  return col;",
"}",
"",
"vec3 paint(int th, vec2 p, vec2 q, float t, float asp){",
"  if(th==0) return felt(p,q,t);",
"  if(th==1) return bone(p,q,t);",
"  if(th==2) return cafe(p,q,t);",
"  if(th==4) return midnight(p,q,t,asp);",
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
