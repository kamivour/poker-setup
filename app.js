/* app.js — the clock. One IIFE, ES5 throughout, no build step. Section order:
   I18N, THEMES, defaults, storage, tournament state, audio, wake lock, DOM
   helpers, render(), applyLang()/applyTheme(), clock engine, controls,
   overlays, profile menu, settings, profile editor, export/import, boot.
   The backdrop lives in fx.js (loaded first) and is driven from applyTheme(). */
(function(){
"use strict";

/* ============ i18n ============ */
var I18N = {
  en:{
    level:"Level", brk:"Break", blinds:"Blinds", ante:"Ante", afterBreak:"After break",
    next:"Next", last:"Final level", minShort:"min",
    entries:"Entries", left:"Players left", pool:"Prize pool", payouts:"Payouts",
    first:"1st", second:"2nd", rebuysOk:"buy-ins + rebuys", avg:"avg", chips:"chips", rake:"Rake",
    rakeNote:"Rake is taken off every buy-in before the prize pool.", netPer:"to the pool per entry",
    start:"Start", pause:"Pause", prevLevel:"Previous level", nextLevel:"Next level",
    restart:"Restart level", insertBreak:"Insert break", resetT:"Reset tournament", confirmReset:"Tap again to reset",
    settings:"Settings", theme:"Theme", language:"Language", sound:"Sound", volume:"Volume",
    mute:"Disable level-change alarm", muteHint:"The one-minute warning is muted too.",
    playlist:"Music playlist", soon:"Coming soon", display:"Display",
    awake:"Keep screen awake", awakeHint:"Holds the screen on while the clock runs.", done:"Done",
    editProfile:"Edit profile", newProfile:"New profile", duplicate:"Duplicate profile", del:"Delete",
    save:"Save", cancel:"Cancel", close:"Close", copy:"Copy", copied:"Copied",
    tournament:"Tournament", pname:"Profile name", stack:"Starting stack", buyin:"Buy-in", currency:"Currency",
    generate:"Generate structure", startBB:"Starting BB", levelCount:"Levels", minPer:"Minutes / level",
    growth:"Growth", genBtn:"Generate", genWarn:"This replaces the level table below.",
    levels:"Levels", addLevel:"+ Level", addBreak:"+ Break",
    io:"Export / Import", ioHint:"Copy this text to move your profiles to another device. Paste replacement text and press Import.",
    import:"Import", imported:"Profiles imported.", badJson:"That text isn't a valid backup.",
    cantDelete:"The default profile can't be deleted.",
    slow:"Slow", standard:"Standard", turbo:"Turbo", hyper:"Hyper", custom:"Custom",
    typeNum:"Type", dragBreak:"Drag to move this break",
    chipup:"Colour up", resumeAsk:"Resume the tournament in progress?",
    resumeYes:"Resume", resumeNo:"Dismiss",
    volHint:"Release the slider to hear a test chime. On iPad, Silent Mode mutes the chime as well.",
    defaultLocked:"The default profile is read-only. Duplicate it, then edit the copy."
  },
  vi:{
    level:"Level", brk:"Nghỉ", blinds:"Blind", ante:"Ante", afterBreak:"Sau giờ nghỉ",
    next:"Tiếp theo", last:"Level cuối", minShort:"phút",
    entries:"Lượt mua", left:"Còn lại", pool:"Tổng giải", payouts:"Giải thưởng",
    first:"Nhất", second:"Nhì", rebuysOk:"buy-in + rebuy", avg:"TB", chips:"chip", rake:"Rake",
    rakeNote:"Rake bị trừ khỏi mỗi buy-in trước khi tính tổng giải.", netPer:"vào pool mỗi lượt",
    start:"Bắt đầu", pause:"Tạm dừng", prevLevel:"Level trước", nextLevel:"Level sau",
    restart:"Chạy lại level", insertBreak:"Chèn giờ nghỉ", resetT:"Reset giải", confirmReset:"Bấm lần nữa để reset",
    settings:"Cài đặt", theme:"Giao diện", language:"Ngôn ngữ", sound:"Âm thanh", volume:"Âm lượng",
    mute:"Tắt chuông báo hết level", muteHint:"Tắt luôn cả tiếng báo còn 1 phút.",
    playlist:"Danh sách nhạc", soon:"Sắp có", display:"Hiển thị",
    awake:"Giữ màn hình luôn sáng", awakeHint:"Màn hình không tắt khi đồng hồ đang chạy.", done:"Xong",
    editProfile:"Sửa hồ sơ", newProfile:"Hồ sơ mới", duplicate:"Nhân bản hồ sơ", del:"Xoá",
    save:"Lưu", cancel:"Huỷ", close:"Đóng", copy:"Chép", copied:"Đã chép",
    tournament:"Giải đấu", pname:"Tên hồ sơ", stack:"Stack khởi điểm", buyin:"Tiền mua", currency:"Đơn vị",
    generate:"Tạo cấu trúc tự động", startBB:"BB khởi điểm", levelCount:"Số level", minPer:"Phút mỗi level",
    growth:"Tốc độ tăng", genBtn:"Tạo", genWarn:"Sẽ thay thế toàn bộ bảng level bên dưới.",
    levels:"Bảng level", addLevel:"+ Level", addBreak:"+ Giờ nghỉ",
    io:"Xuất / Nhập", ioHint:"Chép đoạn này để mang hồ sơ sang thiết bị khác. Dán đoạn khác vào rồi bấm Nhập.",
    import:"Nhập", imported:"Đã nhập hồ sơ.", badJson:"Đoạn text này không phải bản sao lưu hợp lệ.",
    cantDelete:"Không xoá được hồ sơ mặc định.",
    slow:"Chậm", standard:"Chuẩn", turbo:"Turbo", hyper:"Siêu nhanh", custom:"Tuỳ chỉnh",
    typeNum:"Gõ số", dragBreak:"Kéo để đổi vị trí giờ nghỉ",
    chipup:"Đổi chip", resumeAsk:"Khôi phục giải đang dở?",
    resumeYes:"Khôi phục", resumeNo:"Bỏ qua",
    volHint:"Thả thanh trượt ra để nghe thử chuông. Trên iPad, chế độ im lặng tắt luôn tiếng chuông này.",
    defaultLocked:"Hồ sơ mặc định chỉ đọc. Nhân bản ra rồi sửa bản sao."
  }
};

var THEMES = [
  {id:"felt",    name:"Felt",     bg:"#0B1410", ink:"#F3EFE3", accent:"#D4A73C"},
  {id:"midnight",name:"Midnight", bg:"#0A0D13", ink:"#E9EDF4", accent:"#6AA9E0", flat:true},
  {id:"bone",    name:"Bone",     bg:"#F1EFE8", ink:"#201E1A", accent:"#BE2F33"},
  {id:"cafe",    name:"Cafe",     bg:"#E9DECA", ink:"#3A2316", accent:"#7A4520"},
  {id:"royal",   name:"Royal",    bg:"#170609", ink:"#F8EFE6", accent:"#E0C158"}
];

/* ============ defaults ============ */
function defaultLevels(){
  var b=[[100,200],[200,300],[200,400],[300,600],[400,800],
         [500,1000],[600,1200],[1000,2000],[2000,4000],[5000,10000]];
  return b.map(function(p){ return {sb:p[0], bb:p[1], ante:p[1], min:20}; });
}
function defaultProfile(){
  return {id:"default", name:"Default", buyin:36000, rake:6000, currency:"₫",
          stack:20000, breakMin:10, levels:defaultLevels()};
}

/* ============ storage ============ */
var K={profiles:"pkclock2.profiles", settings:"pkclock2.settings", active:"pkclock2.active",
       run:"pkclock2.run"};
function lsGet(k,fb){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch(e){ return fb; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

var settings = Object.assign({
  theme:"felt", lang:"en", volume:100, muteAlarm:false, keepAwake:true
}, lsGet(K.settings,{}));
/* Settings saved before the alarm was made louder pinned the volume at 70.
   Lift those to full once, then leave the slider to the user. */
if(settings.sv!==2){ settings.sv=2; settings.volume=100; lsSet(K.settings,settings); }

var profiles = lsGet(K.profiles,null);
if(!profiles || !profiles.length) profiles=[defaultProfile()];
if(!profiles.some(function(p){return p.id==="default";})) profiles.unshift(defaultProfile());

var activeId = lsGet(K.active,"default");
if(!profiles.some(function(p){return p.id===activeId;})) activeId=profiles[0].id;

function profile(){ return profiles.filter(function(p){return p.id===activeId;})[0] || profiles[0]; }
function t(k){ return (I18N[settings.lang]||I18N.en)[k] || I18N.en[k] || k; }

/* ============ tournament state ============ */
var state = {idx:0, remain:0, running:false, endsAt:null, entries:8, warned:false};
function itemAt(i){ return profile().levels[i]; }
function durSec(i){ var it=itemAt(i); return Math.max(1, Math.round((it&&it.min?it.min:1)*60)); }
function levelNumber(i){ var n=0; for(var j=0;j<=i;j++){ if(!profile().levels[j].brk) n++; } return n; }
function nextPlayableAfter(i){
  for(var j=i+1;j<profile().levels.length;j++){ if(!profile().levels[j].brk) return profile().levels[j]; }
  return null;
}

/* ---- the running tournament, saved so a reload can pick it up ----
   iPadOS Safari discards a backgrounded tab when memory runs short, which
   loses the level and the remaining time in the middle of a game. The saved
   run is offered once on load and always comes back paused: the clock never
   restarts by itself. */
var runReady=false, lastRunSave=0;
function saveRun(){
  if(!runReady) return;
  lsSet(K.run, {v:1, at:Date.now(), pid:activeId, idx:state.idx,
                remain:Math.round(state.remain), running:state.running,
                endsAt:state.endsAt, entries:state.entries});
}
function clearRun(){ try{ localStorage.removeItem(K.run); }catch(e){} }

function applyRun(r){
  activeId=r.pid; lsSet(K.active,activeId);
  state.entries=Math.max(0, r.entries|0);
  state.idx=Math.max(0, Math.min(r.idx|0, profile().levels.length-1));
  var rem = (r.running && r.endsAt) ? (r.endsAt-Date.now())/1000 : r.remain;
  state.remain=Math.max(0, Math.min(durSec(state.idx), rem||0));
  state.running=false; state.endsAt=null;
  state.warned = state.remain<=60;
  render(); saveRun();
}

function askResume(onYes){
  var bar=document.createElement("div");
  bar.className="resumebar";
  var msg=document.createElement("span"); msg.textContent=t("resumeAsk");
  var yes=document.createElement("button"); yes.className="btn sm primary"; yes.textContent=t("resumeYes");
  var no=document.createElement("button"); no.className="btn sm quiet"; no.textContent=t("resumeNo");
  bar.appendChild(msg); bar.appendChild(yes); bar.appendChild(no);
  document.body.appendChild(bar);
  function close(){ if(bar.parentNode) bar.parentNode.removeChild(bar); }
  yes.onclick=function(){ close(); onYes(); };
  no.onclick=function(){ close(); clearRun(); };
}

function maybeResume(){
  var r=lsGet(K.run,null);
  runReady=true;
  if(!r || r.v!==1) return;
  if(Date.now()-(r.at||0) > 6*3600*1000){ clearRun(); return; }
  if(!profiles.some(function(p){ return p.id===r.pid; })){ clearRun(); return; }
  var keep=activeId; activeId=r.pid;
  var i=Math.max(0, Math.min(r.idx|0, profile().levels.length-1));
  var started = r.running || i>0 || r.remain < durSec(i)-1;
  activeId=keep;
  if(!started){ clearRun(); return; }
  askResume(function(){ applyRun(r); });
}

document.addEventListener("visibilitychange", function(){ if(document.hidden) saveRun(); });

/* ============ audio ============ */
var actx=null, audioUnlocked=false, master=null;
function audioOn(){
  try{
    if(!actx){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return; actx=new C(); }
    /* iOS keeps a context mute until it has played something while a gesture
       is being handled, so push one silent sample through it the first time.
       Starting a source on a context that is still suspended is fine: it
       plays as soon as the resume below lands. */
    if(!audioUnlocked){
      var b=actx.createBufferSource();
      b.buffer=actx.createBuffer(1,1,actx.sampleRate);
      b.connect(actx.destination);
      b.start(0);
      audioUnlocked=true;
    }
    /* Not just "suspended": iOS also parks the context in the non-standard
       state "interrupted" after Siri, a call, or the screen going off, and it
       never leaves that state on its own. */
    if(actx.state!=="running" && actx.resume) actx.resume();
    /* Everything goes through a limiter so the chime can sit near full scale
       without the two overlapping notes clipping into a rasp. */
    if(!master){
      master=actx.createDynamicsCompressor();
      master.threshold.value=-6;
      master.knee.value=6;
      master.ratio.value=12;
      master.attack.value=0.003;
      master.release.value=0.12;
      master.connect(actx.destination);
    }
  }catch(e){}
}
/* Any tap is a chance to create or revive the context, not only the transport
   buttons — on iPad the alarm is otherwise silent for the rest of the night
   after a single interruption. */
document.addEventListener("touchend", function(){ audioOn(); }, {passive:true});
document.addEventListener("pointerdown", function(){ audioOn(); }, {passive:true});
document.addEventListener("visibilitychange", function(){ if(!document.hidden) audioOn(); });
function tone(freq, start, dur, vol){
  if(!actx) return;
  try{
    var o=actx.createOscillator(), g=actx.createGain();
    /* Triangle, not sine: the extra harmonics carry across a noisy room at the
       same peak level, which is what makes the alarm audible from the far end
       of the table. */
    o.type="triangle"; o.frequency.value=freq;
    var T=actx.currentTime+start;
    g.gain.setValueAtTime(0.0001,T);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002,vol),T+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,T+dur);
    o.connect(g); g.connect(master||actx.destination);
    o.start(T); o.stop(T+dur+0.05);
  }catch(e){}
}
function vol(){ return settings.muteAlarm ? 0 : (settings.volume/100)*0.95; }
function chimeLevel(){ var v=vol(); if(!v) return; audioOn(); tone(784,0,0.3,v); tone(1047,0.24,0.5,v); tone(1568,0.24,0.5,v*0.3); }
function chimeWarn(){ var v=vol(); if(!v) return; audioOn(); tone(660,0,0.18,v*0.75); }

/* ============ wake lock ============ */
var wl=null;
function wakeReq(){
  if(!settings.keepAwake) return;
  try{ if(navigator.wakeLock && !wl){ navigator.wakeLock.request("screen").then(function(s){ wl=s; s.addEventListener("release",function(){wl=null;}); }).catch(function(){}); } }catch(e){}
}
function wakeRel(){ try{ if(wl){ wl.release(); wl=null; } }catch(e){} }
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible" && state.running) wakeReq();
});

/* ============ dom ============ */
function $(id){ return document.getElementById(id); }
var clockEl=$("clock");
var toastT=null;
function toast(msg){
  var el=document.querySelector(".toast");
  if(!el){ el=document.createElement("div"); el.className="toast"; document.body.appendChild(el); }
  el.textContent=msg; el.hidden=false;
  clearTimeout(toastT); toastT=setTimeout(function(){ el.hidden=true; },2400);
}

var SVG_CHIP_PATH='<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="3.4"/>'+
  '<path d="M12 3.4v2.6M12 18v2.6M3.4 12h2.6M18 12h2.6"/>';
var SVG_CHIP='<svg class="svgi chipflag" viewBox="0 0 24 24">'+SVG_CHIP_PATH+'</svg>';
var SVG_PLAY='<svg class="svgi" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/></svg>';
var SVG_PAUSE='<svg class="svgi" viewBox="0 0 24 24"><rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/></svg>';

/* ============ formatting ============ */
function nf(n){
  try{ return new Intl.NumberFormat(settings.lang==="vi"?"vi-VN":"en-US").format(Math.round(n)); }
  catch(e){ return String(Math.round(n)); }
}
function money(n){ return nf(n)+" "+(profile().currency||""); }
function mmss(sec){
  sec=Math.max(0,Math.ceil(sec));
  var m=Math.floor(sec/60), s=sec%60;
  return (m<10?"0":"")+m+":"+(s<10?"0":"")+s;
}
var lastClockStr="";
/* One fixed-width span per glyph (style.css .cd / .cs). The decorated clock
   stacks several text-shadows on the largest text on the page, so repainting
   it is the most expensive thing the page does: nothing is touched on a 250 ms
   tick that changes no digit, and when digits change only those spans are
   rewritten. data-d carries the glyph for the gilded copy Royal paints with
   ::after. A changed glyph gets .tk and rolls in; the class comes off when
   the roll ends (see the controls). */
function drawClock(str){
  if(str===lastClockStr) return;
  var i;
  if(str.length!==lastClockStr.length){
    var out="";
    for(i=0;i<str.length;i++){
      var ch=str.charAt(i);
      out += ch===":" ? '<span class="cs" data-d=":">:</span>' : '<span class="cd" data-d="'+ch+'">'+ch+'</span>';
    }
    clockEl.innerHTML=out;
  }else{
    var kids=clockEl.children;
    for(i=0;i<str.length;i++){
      var c=str.charAt(i);
      if(c===lastClockStr.charAt(i)) continue;
      kids[i].textContent=c;
      kids[i].setAttribute("data-d",c);
      kids[i].classList.add("tk");
    }
  }
  lastClockStr=str;
}
/* Level change: the eyebrow, blinds and next line rise into place (style.css
   .swap). Keyed on profile and index, so restarting a level does not animate. */
var shownLevel="";
function swapIn(){
  var els=[$("eyebrow"), document.querySelector(".blinds"), $("nextLine")];
  for(var i=0;i<els.length;i++){
    els[i].classList.remove("swap"); void els[i].offsetWidth; els[i].classList.add("swap");
  }
}

/* ============ render ============ */
function render(){
  var p=profile(), it=itemAt(state.idx);
  $("profileName").textContent=p.name;
  if(shownLevel!==activeId+":"+state.idx){ shownLevel=activeId+":"+state.idx; swapIn(); }

  // clock
  drawClock(mmss(state.remain));
  clockEl.className="clock"+(state.remain<=10?" crit":(state.remain<=60?" warn":""));

  // eyebrow + blinds
  if(it.brk){
    $("eyebrow").textContent=t("brk");
    var nx=nextPlayableAfter(state.idx);
    $("lblBlinds").textContent=t("afterBreak");
    if(nx){
      $("valBlinds").innerHTML=nf(nx.sb)+'<span class="sl">/</span><span class="bb">'+nf(nx.bb)+'</span>';
      $("cellAnte").hidden=!nx.ante;
      $("valAnte").textContent=nf(nx.ante||0);
    }else{
      $("valBlinds").textContent="—"; $("cellAnte").hidden=true;
    }
    $("lblAnte").textContent=t("ante");
    $("nextLine").textContent="";
  }else{
    $("eyebrow").innerHTML=t("level")+" "+levelNumber(state.idx)+(it.chipup?" "+SVG_CHIP:"");
    $("lblBlinds").textContent=t("blinds");
    $("lblAnte").textContent=t("ante");
    $("valBlinds").innerHTML=nf(it.sb)+'<span class="sl">/</span><span class="bb">'+nf(it.bb)+'</span>';
    $("cellAnte").hidden=!it.ante;
    $("valAnte").textContent=nf(it.ante||0);

    var n=p.levels[state.idx+1];
    if(!n){ $("nextLine").innerHTML='<b>'+t("last")+'</b>'; }
    else if(n.brk){ $("nextLine").innerHTML=t("next")+' · <b>'+t("brk")+' '+n.min+' '+t("minShort")+'</b>'; }
    else {
      var s=t("next")+' · <b>'+nf(n.sb)+'/'+nf(n.bb)+'</b>';
      if(n.ante) s+=' · '+t("ante").toLowerCase()+' '+nf(n.ante);
      if(n.chipup) s+=' '+SVG_CHIP;
      $("nextLine").innerHTML=s;
    }
  }

  // transport
  $("btnPlay").innerHTML = state.running ? SVG_PAUSE : SVG_PLAY;
  $("btnPlay").setAttribute("aria-label", state.running?t("pause"):t("start"));

  // stats
  $("valEntries").textContent=state.entries;
  $("subEntries").textContent=t("rebuysOk");

  var rake=Math.max(0,Math.min(p.buyin||0, p.rake||0));
  var net=(p.buyin||0)-rake;
  var pool=state.entries*net;
  $("valPool").textContent=money(pool);
  $("subPool").textContent = rake
    ? "("+nf(p.buyin||0)+" − "+nf(rake)+") × "+state.entries
    : nf(net)+" × "+state.entries;

  var step = pool>=50000 ? 1000 : 1;
  var first = Math.round(pool*0.7/step)*step;
  var second = pool-first;
  $("val1st").textContent=money(first);
  $("val2nd").textContent=money(second);
}

function applyLang(){
  var m={
    lblBlinds:"blinds", lblAnte:"ante",
    lblEntries:"entries", lblPool:"pool", lblPayouts:"payouts",
    lbl1st:"first", lbl2nd:"second",
    stTitle:"settings", secTheme:"theme", secLang:"language", secSound:"sound",
    lblVolume:"volume", hintVolume:"volHint", lblMute:"mute", hintMute:"muteHint",
    lblPlaylist:"playlist", hintPlaylist:"soon", secDisplay:"display",
    lblAwake:"awake", hintAwake:"awakeHint", btnSettingsDone:"done",
    edTitle:"editProfile", secBasics:"tournament", lblPName:"pname", lblStack:"stack",
    lblBuyin:"buyin", lblRake:"rake", lblCurrency:"currency", secGen:"generate", lblStartBB:"startBB",
    lblLevelCount:"levelCount", lblMinPer:"minPer", lblGrowth:"growth",
    btnGenerate:"genBtn", genWarn:"genWarn", secLevels:"levels",
    btnAddLevel:"addLevel", btnAddBreak:"addBreak", btnIO:"io", btnDeleteProfile:"del",
    btnEdCancel:"cancel", btnEdSave:"save",
    ioTitle:"io", ioHint:"ioHint", btnCopy:"copy", btnIoClose:"close", btnImport:"import",
    thMin:"minShort"
  };
  for(var id in m){ var el=$(id); if(el) el.textContent=t(m[id]); }
  [["btnPrev","prevLevel"],["btnNext","nextLevel"],["btnRestart","restart"],["btnReset","resetT"]]
    .forEach(function(pair){
      var el=$(pair[0]);
      el.setAttribute("aria-label",t(pair[1]));
      el.setAttribute("title",t(pair[1]));
    });
  $("openSettings").setAttribute("aria-label",t("settings"));
  var seg=$("langSeg").children;
  for(var i=0;i<seg.length;i++) seg[i].setAttribute("aria-pressed", String(seg[i].dataset.lang===settings.lang));
  fillSelects();
  render();
}

function applyTheme(){
  document.documentElement.setAttribute("data-app-theme", settings.theme);
  var th=THEMES.filter(function(x){ return x.id===settings.theme; })[0];
  var flat=!!(th && th.flat);
  /* Flat themes keep the plain 2D look: no backdrop, no clock material, no
     glass, no motion on the digits. fx.js switches the canvas off for them. */
  document.documentElement.classList.toggle("flat", flat);
  if(window.PKFX) PKFX.setTheme(settings.theme, flat);
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta && th) meta.setAttribute("content", th.bg);
  var sw=$("swatches").children;
  for(var i=0;i<sw.length;i++){
    var b=sw[i].querySelector(".sw");
    b.setAttribute("aria-pressed", String(b.dataset.theme===settings.theme));
  }
}

/* ============ clock engine ============ */
function loadLevel(i, autostart){
  state.idx=Math.max(0,Math.min(i, profile().levels.length-1));
  state.remain=durSec(state.idx);
  state.warned=false;
  if(state.running && autostart!==false){ state.endsAt=Date.now()+state.remain*1000; }
  render(); saveRun();
}
function play(){
  audioOn();
  state.running=true;
  state.endsAt=Date.now()+state.remain*1000;
  wakeReq();
  render(); saveRun();
}
function pause(){
  state.running=false;
  state.endsAt=null;
  wakeRel();
  render(); saveRun();
}
function toggle(){ state.running?pause():play(); }

setInterval(function(){
  if(!state.running) return;
  var r=(state.endsAt-Date.now())/1000;
  if(r<=60 && !state.warned && r>0){ state.warned=true; chimeWarn(); }
  if(r<=0){
    if(state.idx < profile().levels.length-1){
      chimeLevel();
      state.idx++;
      state.remain=durSec(state.idx);
      state.warned=false;
      state.endsAt=Date.now()+state.remain*1000;
    }else{
      chimeLevel();
      state.remain=0;
      pause();
      return;
    }
  }else{
    state.remain=r;
  }
  render();
  if(state.running && Date.now()-lastRunSave>5000){ lastRunSave=Date.now(); saveRun(); }
},250);

/* ============ controls ============ */
$("btnPlay").onclick=toggle;
clockEl.onclick=toggle;
clockEl.addEventListener("animationend", function(e){
  if(e.animationName==="roll" && e.target.classList) e.target.classList.remove("tk");
});
clockEl.onkeydown=function(e){ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggle(); } };
/* The sheen sweep also plays on a tap, since the iPad has no hover. The class
   is dropped when the animation ends so the next tap can restart it; the
   forced reflow in between restarts it even on a quick double tap. */
(function(){
  var bs=document.querySelectorAll(".tbtn");
  function shine(){ this.classList.remove("shine"); void this.offsetWidth; this.classList.add("shine"); }
  function done(){ this.classList.remove("shine"); }
  for(var i=0;i<bs.length;i++){
    bs[i].addEventListener("pointerdown", shine, {passive:true});
    bs[i].addEventListener("animationend", done);
  }
})();
$("btnPrev").onclick=function(){ loadLevel(state.idx-1); };
$("btnNext").onclick=function(){ loadLevel(state.idx+1); };
$("btnRestart").onclick=function(){ loadLevel(state.idx); };

var resetArmed=null;
$("btnReset").onclick=function(){
  var b=this;
  if(resetArmed){
    clearTimeout(resetArmed); resetArmed=null; b.classList.remove("armed");
    pause(); state.entries=0; loadLevel(0,false); clearRun();
    return;
  }
  b.classList.add("armed");
  toast(t("confirmReset"));
  resetArmed=setTimeout(function(){ resetArmed=null; b.classList.remove("armed"); },3000);
};

var cbtns=document.querySelectorAll(".cbtn");
for(var ci=0;ci<cbtns.length;ci++){
  cbtns[ci].onclick=function(){
    state.entries=Math.max(0,state.entries+parseInt(this.dataset.d,10));
    render(); saveRun();
  };
}

document.addEventListener("keydown",function(e){
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if(!$("settingsOverlay").hidden||!$("editorOverlay").hidden||!$("ioOverlay").hidden){
    if(e.key==="Escape"){ if(wheel) closeWheel(); else closeAll(); }
    return;
  }
  if(e.key===" "){ e.preventDefault(); toggle(); }
  else if(e.key==="ArrowRight"){ loadLevel(state.idx+1); }
  else if(e.key==="ArrowLeft"){ loadLevel(state.idx-1); }
  else if(e.key==="Backspace"){ e.preventDefault(); loadLevel(state.idx); }
  else if(e.key==="r"||e.key==="R"){ $("btnReset").click(); }
});

/* fullscreen */
(function(){
  var el=document.documentElement;
  var can = el.requestFullscreen || el.webkitRequestFullscreen;
  if(!can){ $("fsBtn").hidden=true; return; }
  $("fsBtn").onclick=function(){
    try{
      if(document.fullscreenElement||document.webkitFullscreenElement){
        (document.exitFullscreen||document.webkitExitFullscreen).call(document);
      }else{ can.call(el); }
    }catch(e){}
  };
})();

/* ============ overlays ============ */
function open(id){ $(id).hidden=false; }
function closeAll(){ closeWheel(); $("settingsOverlay").hidden=true; $("editorOverlay").hidden=true; $("ioOverlay").hidden=true; }
var closers=document.querySelectorAll("[data-close]");
for(var k=0;k<closers.length;k++){
  closers[k].onclick=function(){ $(this.dataset.close).hidden=true; };
}
var ovs=document.querySelectorAll(".overlay");
for(var oi=0;oi<ovs.length;oi++){
  ovs[oi].onclick=function(e){ if(e.target===this) this.hidden=true; };
}

/* ============ profile menu ============ */
var menu=$("profileMenu");
function buildMenu(){
  menu.innerHTML="";
  profiles.forEach(function(p){
    var b=document.createElement("button");
    b.textContent=p.name;
    b.setAttribute("aria-current", String(p.id===activeId));
    b.onclick=function(){
      activeId=p.id; lsSet(K.active,activeId);
      pause(); state.entries=8; loadLevel(0,false);
      menu.hidden=true; $("profilePill").setAttribute("aria-expanded","false");
    };
    menu.appendChild(b);
  });
  var sep=document.createElement("div"); sep.className="sep"; menu.appendChild(sep);
  var locked = activeId==="default";
  [[t("editProfile"),function(){ openEditor(profile()); }, locked],
   [t("duplicate"),function(){ var c=JSON.parse(JSON.stringify(profile())); c.id="p"+Date.now(); c.name=c.name+" ✱"; openEditor(c,true); }],
   [t("newProfile"),function(){ var n=defaultProfile(); n.id="p"+Date.now(); n.name=""; openEditor(n,true); }]
  ].forEach(function(pair){
    var b=document.createElement("button"); b.textContent=pair[0];
    if(pair[2]){ b.classList.add("lockrow"); b.setAttribute("aria-disabled","true"); }
    b.onclick=function(){ menu.hidden=true; $("profilePill").setAttribute("aria-expanded","false"); pair[1](); };
    menu.appendChild(b);
  });
}
$("profilePill").onclick=function(e){
  e.stopPropagation();
  var show=menu.hidden;
  if(show) buildMenu();
  menu.hidden=!show;
  this.setAttribute("aria-expanded",String(show));
};
document.addEventListener("click",function(){ if(!menu.hidden){ menu.hidden=true; $("profilePill").setAttribute("aria-expanded","false"); } });
menu.onclick=function(e){ e.stopPropagation(); };

/* ============ settings ============ */
$("openSettings").onclick=function(){ open("settingsOverlay"); };
(function(){
  var wrap=$("swatches");
  THEMES.forEach(function(th){
    var item=document.createElement("div"); item.className="swit";
    var b=document.createElement("button");
    b.className="sw"; b.dataset.theme=th.id; b.style.background=th.bg;
    b.setAttribute("aria-label",th.name);
    b.innerHTML='<span class="bar" style="background:'+th.ink+'"></span><span class="dot" style="background:'+th.accent+'"></span>';
    b.onclick=function(){ settings.theme=th.id; lsSet(K.settings,settings); applyTheme(); };
    var n=document.createElement("span"); n.className="swname"; n.textContent=th.name;
    item.appendChild(b); item.appendChild(n); wrap.appendChild(item);
  });
})();
var langBtns=$("langSeg").children;
for(var li=0;li<langBtns.length;li++){
  langBtns[li].onclick=function(){ settings.lang=this.dataset.lang; lsSet(K.settings,settings); applyLang(); };
}
$("volume").value=settings.volume;
$("volume").oninput=function(){ settings.volume=+this.value; lsSet(K.settings,settings); };
$("volume").onchange=function(){ audioOn(); chimeWarn(); };
$("muteAlarm").checked=!!settings.muteAlarm;
$("muteAlarm").onchange=function(){
  settings.muteAlarm=this.checked; lsSet(K.settings,settings);
  if(!this.checked){ audioOn(); chimeWarn(); }
};
$("keepAwake").checked=!!settings.keepAwake;
$("keepAwake").onchange=function(){
  settings.keepAwake=this.checked; lsSet(K.settings,settings);
  if(this.checked && state.running) wakeReq(); else wakeRel();
};

/* ============ preset + free-type selects ============ */
function fillSelects(){
  function fill(sel, vals, labels){
    sel.innerHTML="";
    vals.forEach(function(v,i){
      var o=document.createElement("option"); o.value=v; o.textContent=labels[i]; sel.appendChild(o);
    });
    var c=document.createElement("option"); c.value=""; c.textContent=t("custom"); sel.appendChild(c);
  }
  fill($("edBuyinSel"),[36000,50000,100000,200000,500000],["36.000","50.000","100.000","200.000","500.000"]);
  fill($("genMinSel"),[10,12,15,20,30],["10","12","15","20","30"]);
  fill($("genGrowSel"),[1.25,1.4,1.6,1.8],[t("slow"),t("standard"),t("turbo"),t("hyper")]);
}
function linkPair(sel, inp){
  sel.onchange=function(){ if(this.value!==""){ inp.value=this.value; } };
  inp.oninput=function(){
    var found=false;
    for(var i=0;i<sel.options.length;i++){
      if(sel.options[i].value!=="" && Number(sel.options[i].value)===Number(inp.value)){ sel.selectedIndex=i; found=true; break; }
    }
    if(!found) sel.value="";
  };
}
fillSelects();
linkPair($("edBuyinSel"),$("edBuyin"));
linkPair($("genMinSel"),$("genMin"));
linkPair($("genGrowSel"),$("genGrow"));

/* ============ profile editor ============ */
var edit=null, editIsNew=false;
/* The default profile is the shipped structure and stays read-only: it is the
   one thing guaranteed to be sane when the clock is opened cold. Changing it
   is a code change to defaultProfile(), not a change anyone makes at the
   table. Everyone else duplicates it and edits the copy. */
function openEditor(p, isNew){
  if(!isNew && p.id==="default"){ toast(t("defaultLocked")); return; }
  edit=JSON.parse(JSON.stringify(p));
  editIsNew=!!isNew;
  $("edName").value=edit.name;
  $("edStack").value=edit.stack||0;
  $("edBuyin").value=edit.buyin||0; $("edBuyin").oninput();
  $("edRake").value=edit.rake||0;
  $("edCurrency").value=edit.currency||"";
  $("rakeNote").textContent=t("rakeNote");
  var firstLv=edit.levels.filter(function(l){return !l.brk;})[0]||{bb:200,min:15};
  $("genBB").value=firstLv.bb; $("genCount").value=edit.levels.filter(function(l){return !l.brk;}).length;
  $("genMin").value=firstLv.min; $("genMin").oninput();
  $("genGrow").value=1.4; $("genGrow").oninput();
  $("btnDeleteProfile").hidden = (edit.id==="default"||isNew);
  drawRows();
  open("editorOverlay");
}
function roundChip(v){
  var step = v<100?25 : v<1000?50 : v<5000?100 : v<20000?500 : 1000;
  return Math.max(step, Math.round(v/step)*step);
}
/* ---- value wheel ---- */
var COARSE = !!(window.matchMedia && window.matchMedia("(hover:none) and (pointer:coarse)").matches);
var WH=40, WPAD=80;
var wheel=null;

function wheelSteps(f, cur){
  var out=[], v;
  if(f==="min"){ for(v=5; v<=180; v+=5) out.push(v); }
  else if(f==="bb"){ for(v=100; v<=50000; v+=100) out.push(v); }
  else{
    out.push(0); v=25;
    while(v<=100000){ out.push(v); v += v<100?25 : v<1000?50 : v<5000?100 : v<20000?500 : 1000; }
  }
  if(cur>=0 && out.indexOf(cur)<0){ out.push(cur); out.sort(function(a,b){ return a-b; }); }
  return out;
}
function closeWheel(){
  if(!wheel) return;
  wheel.el.remove();
  document.removeEventListener("pointerdown", wheelOutside, true);
  document.removeEventListener("touchstart", wheelOutside, true);
  wheel=null;
}
function wheelOutside(e){
  if(wheel && !wheel.el.contains(e.target) && e.target!==wheel.input) closeWheel();
}
function openWheel(input, field, title){
  closeWheel();
  var cur=Math.max(0, +input.value||0);
  var vals=wheelSteps(field, cur);
  var idx=vals.indexOf(cur); if(idx<0) idx=0;

  var pop=document.createElement("div");
  pop.className="wheelpop";
  pop.innerHTML='<div class="whead"><span class="wtitle">'+title+'</span>'+
                '<button type="button" class="wtype">'+t("typeNum")+'</button></div>'+
                '<div class="wbox"><div class="wheel"><div class="wpad"></div><div class="wlist"></div>'+
                '<div class="wpad"></div></div><div class="wsel"></div></div>';
  var list=pop.querySelector(".wlist");
  list.innerHTML=vals.map(function(v){ return '<div class="wi">'+v+'</div>'; }).join("");
  document.body.appendChild(pop);

  var r=input.getBoundingClientRect();
  var top=r.bottom+6, left=r.left+r.width/2-pop.offsetWidth/2;
  if(top+pop.offsetHeight > innerHeight-8) top=Math.max(8, r.top-6-pop.offsetHeight);
  pop.style.top=Math.max(8, top)+"px";
  pop.style.left=Math.min(Math.max(8,left), innerWidth-pop.offsetWidth-8)+"px";

  var box=pop.querySelector(".wheel"), items=list.children, timer=null;
  function mark(k){
    for(var j=0;j<items.length;j++) items[j].classList.toggle("sel", j===k);
  }
  function commit(k){
    input.value=vals[k];
    input.dispatchEvent(new Event("input"));
  }
  box.scrollTop=idx*WH;
  mark(idx);
  box.addEventListener("scroll", function(){
    clearTimeout(timer);
    var k=Math.min(vals.length-1, Math.max(0, Math.round(box.scrollTop/WH)));
    mark(k);
    timer=setTimeout(function(){ commit(k); }, 90);
  });
  list.addEventListener("click", function(e){
    var it=e.target.closest(".wi"); if(!it) return;
    var k=Array.prototype.indexOf.call(items, it);
    box.scrollTo({top:k*WH, behavior:"smooth"});
    mark(k); commit(k);
  });
  pop.querySelector(".wtype").onclick=function(){
    input.readOnly=false;
    closeWheel();
    input.focus(); input.select();
  };
  wheel={el:pop, input:input};
  setTimeout(function(){
    document.addEventListener("pointerdown", wheelOutside, true);
    document.addEventListener("touchstart", wheelOutside, true);
  },0);
}

/* ---- drag a break row to another position ----
   Touch Events, not Pointer Events: iOS Safari cancels a captured pointer
   as soon as it decides the gesture might be a scroll. */
function startRowDrag(tr, e){
  var touch = e.type==="touchstart";
  if(!touch && e.button) return;
  var id = touch ? e.changedTouches[0].identifier : null;
  e.preventDefault();
  closeWheel();

  var tb=$("lvBody"), doc=document;
  tr.classList.add("dragging");
  doc.body.classList.add("dragging-row");

  function at(ev){
    if(!touch) return ev.clientY;
    var list=ev.touches.length?ev.touches:ev.changedTouches;
    for(var i=0;i<list.length;i++) if(list[i].identifier===id) return list[i].clientY;
    return null;
  }
  function move(ev){
    var y=at(ev);
    if(y==null) return;
    if(ev.cancelable) ev.preventDefault();
    var rows=tb.children;
    for(var i=0;i<rows.length;i++){
      var row=rows[i];
      if(row===tr) continue;
      var r=row.getBoundingClientRect();
      if(y>=r.top && y<=r.bottom){
        tb.insertBefore(tr, y > r.top+r.height/2 ? row.nextSibling : row);
        break;
      }
    }
  }
  function up(ev){
    if(touch && at(ev)==null && ev.type!=="touchcancel") return;
    if(touch){
      doc.removeEventListener("touchmove", move, {passive:false});
      doc.removeEventListener("touchend", up);
      doc.removeEventListener("touchcancel", up);
    }else{
      doc.removeEventListener("mousemove", move);
      doc.removeEventListener("mouseup", up);
    }
    tr.classList.remove("dragging");
    doc.body.classList.remove("dragging-row");
    var old=edit.levels.slice();
    edit.levels=Array.prototype.map.call(tb.children, function(row){ return old[+row.dataset.idx]; });
    drawRows();
  }
  if(touch){
    doc.addEventListener("touchmove", move, {passive:false});
    doc.addEventListener("touchend", up);
    doc.addEventListener("touchcancel", up);
  }else{
    doc.addEventListener("mousemove", move);
    doc.addEventListener("mouseup", up);
  }
}

function drawRows(){
  closeWheel();
  var tb=$("lvBody"); tb.innerHTML="";
  var n=0;
  var titles={sb:"SB", bb:"BB", ante:t("ante"), min:t("minShort")};
  function cell(f, val, extra){
    return '<td><div class="cellw"><input type="number" inputmode="numeric" min="0" '+(extra||"")+
      ' value="'+val+'" data-f="'+f+'">'+
      '<button type="button" class="wchev" tabindex="-1" aria-label="'+titles[f]+'">'+
      '<svg class="svgi" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div></td>';
  }
  edit.levels.forEach(function(lv,i){
    var tr=document.createElement("tr");
    if(lv.brk) tr.className="isbreak";
    if(!lv.brk) n++;
    tr.dataset.idx=i;
    if(lv.brk){
      tr.innerHTML='<td class="lvno"><span class="grip" title="'+t("dragBreak")+'" aria-label="'+t("dragBreak")+'">'+
        '<svg class="svgi" viewBox="0 0 24 24" style="width:14px;height:14px"><circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/>'+
        '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/></svg></span></td>'+
        '<td colspan="3"><span class="breaktag">'+t("brk")+'</span></td>'+
        cell("min", lv.min, 'max="180"')+'<td class="lvact"></td>';
    }else{
      tr.innerHTML='<td class="lvno">'+n+'</td>'+
        cell("sb", lv.sb)+cell("bb", lv.bb)+cell("ante", lv.ante||0)+
        cell("min", lv.min, 'max="180"')+'<td class="lvact"></td>';
    }
    var act=tr.querySelector(".lvact");
    act.innerHTML=(lv.brk ? "" :
        '<button class="mini chip'+(lv.chipup?" on":"")+'" data-a="chip" title="'+t("chipup")+
        '" aria-label="'+t("chipup")+'"><svg class="svgi" viewBox="0 0 24 24" style="width:16px;height:16px">'+
        SVG_CHIP_PATH+'</svg></button>')+
      '<button class="mini x" data-a="del" aria-label="delete"><svg class="svgi" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
    tr.querySelectorAll(".cellw").forEach(function(w){
      var inp=w.querySelector("input"), f=inp.dataset.f;
      inp.oninput=function(){ edit.levels[i][f]=Math.max(0,+this.value||0); };
      inp.onkeydown=function(){ if(wheel && wheel.input===this) closeWheel(); };
      if(COARSE){
        inp.readOnly=true;
        inp.onclick=function(){ openWheel(inp, f, titles[f]); };
      }
      w.querySelector(".wchev").onclick=function(){ openWheel(inp, f, titles[f]); };
    });
    act.querySelector('[data-a="del"]').onclick=function(){
      edit.levels.splice(i,1);
      drawRows();
    };
    var chipBtn=act.querySelector('[data-a="chip"]');
    if(chipBtn) chipBtn.onclick=function(){
      edit.levels[i].chipup=!edit.levels[i].chipup;
      this.classList.toggle("on", !!edit.levels[i].chipup);
    };
    var grip=tr.querySelector(".grip");
    if(grip){
      grip.addEventListener("touchstart", function(e){ startRowDrag(tr, e); }, {passive:false});
      grip.addEventListener("mousedown", function(e){ startRowDrag(tr, e); });
    }
    tb.appendChild(tr);
  });
}
$("btnAddLevel").onclick=function(){
  var last=null;
  for(var i=edit.levels.length-1;i>=0;i--){ if(!edit.levels[i].brk){ last=edit.levels[i]; break; } }
  var bb = last ? roundChip(last.bb*1.4) : 200;
  edit.levels.push({sb:roundChip(bb/2), bb:bb, ante:bb, min:last?last.min:15});
  drawRows();
};
$("btnAddBreak").onclick=function(){ edit.levels.push({brk:true, min:edit.breakMin||10}); drawRows(); };
$("btnGenerate").onclick=function(){
  var bb=Math.max(2,+$("genBB").value||200);
  var cnt=Math.max(2,Math.min(40,+$("genCount").value||14));
  var min=Math.max(1,+$("genMin").value||15);
  var g=Math.max(1.05,Math.min(3,+$("genGrow").value||1.4));
  var out=[];
  for(var i=0;i<cnt;i++){
    out.push({sb:roundChip(bb/2), bb:bb, ante:bb, min:min});
    bb=roundChip(bb*g);
  }
  edit.levels=out; drawRows();
};
$("btnEdSave").onclick=function(){
  if(edit.id==="default"){ toast(t("defaultLocked")); return; }
  edit.name=($("edName").value||"").trim()||"Untitled";
  edit.stack=Math.max(0,+$("edStack").value||0);
  edit.buyin=Math.max(0,+$("edBuyin").value||0);
  edit.rake=Math.max(0,Math.min(edit.buyin,+$("edRake").value||0));
  edit.currency=($("edCurrency").value||"").trim();
  if(!edit.levels.length) edit.levels=defaultLevels();
  var idx=-1;
  for(var i=0;i<profiles.length;i++){ if(profiles[i].id===edit.id){ idx=i; break; } }
  if(idx>=0) profiles[idx]=edit; else profiles.push(edit);
  activeId=edit.id;
  lsSet(K.profiles,profiles); lsSet(K.active,activeId);
  $("editorOverlay").hidden=true;
  pause(); loadLevel(0,false);
};
$("btnDeleteProfile").onclick=function(){
  if(edit.id==="default"){ toast(t("cantDelete")); return; }
  profiles=profiles.filter(function(p){ return p.id!==edit.id; });
  if(!profiles.length) profiles=[defaultProfile()];
  activeId=profiles[0].id;
  lsSet(K.profiles,profiles); lsSet(K.active,activeId);
  $("editorOverlay").hidden=true;
  pause(); loadLevel(0,false);
};

/* ============ export / import ============ */
$("btnIO").onclick=function(){
  $("ioText").value=JSON.stringify({v:1, profiles:profiles}, null, 2);
  open("ioOverlay");
};
$("btnCopy").onclick=function(){
  var ta=$("ioText"); ta.select();
  var b=this, old=t("copy");
  try{ navigator.clipboard.writeText(ta.value); }catch(e){ try{document.execCommand("copy");}catch(e2){} }
  b.textContent=t("copied"); setTimeout(function(){ b.textContent=old; },1400);
};
$("btnImport").onclick=function(){
  try{
    var d=JSON.parse($("ioText").value);
    if(!d.profiles||!d.profiles.length) throw 0;
    profiles=d.profiles;
    if(!profiles.some(function(p){return p.id==="default";})) profiles.unshift(defaultProfile());
    activeId=profiles[0].id;
    lsSet(K.profiles,profiles); lsSet(K.active,activeId);
    $("ioOverlay").hidden=true; $("editorOverlay").hidden=true;
    pause(); loadLevel(0,false); toast(t("imported"));
  }catch(e){ toast(t("badJson")); }
};

/* ============ boot ============ */
applyTheme();
applyLang();
loadLevel(0,false);
maybeResume();
})();
