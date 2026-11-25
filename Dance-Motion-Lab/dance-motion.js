// dance-motion.js — app shell: source, pose capture, takes, timeline, inspector, export.
import { RS, JOINTS, FONTS, SWEEP_SEGS, CUSTOM, compose, loadFont, boundsOf, drawGuides, PATTERNS } from './dm-render.js?v=60';

const $ = s => document.querySelector(s);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const once = (el,ev) => new Promise(r=>el.addEventListener(ev, r, {once:true}));
const fmtT = t => { if(!isFinite(t)) return '0:00.0'; const m=Math.floor(t/60), s=t-m*60; return `${m}:${s<10?'0':''}${s.toFixed(1)}`; };

const PRESETS = [
  ['Paper',  {bg:'#efe9df',cA:'#e8361c',cB:'#1a1a1a',fg:'#1a1a1a',blend:'multiply'}],
  ['Riso',   {bg:'#f4f0e6',cA:'#ff48b0',cB:'#0078bf',fg:'#1d1d1d',blend:'multiply'}],
  ['Mono',   {bg:'#f2f2f0',cA:'#111111',cB:'#111111',fg:'#111111',blend:'multiply'}],
  ['Night',  {bg:'#0b0b0c',cA:'#c6ff2e',cB:'#2e5bff',fg:'#f2f2f2',blend:'screen'}],
  ['Stage',  {bg:'#000000',cA:'#ffffff',cB:'#ff5a1f',fg:'#ffffff',blend:'screen'}],
  ['Cobalt', {bg:'#1530d8',cA:'#ffffff',cB:'#ffd400',fg:'#ffffff',blend:'source-over'}],
  // light paper (multiply)
  ['Newsprint',   {bg:'#d9d6cd',cA:'#3a3a3a',cB:'#111111',fg:'#111111',blend:'multiply'}],
  ['Sand',        {bg:'#e6d5b8',cA:'#b5441e',cB:'#2b2118',fg:'#2b2118',blend:'multiply'}],
  ['Blush',       {bg:'#f6d5d0',cA:'#e0407a',cB:'#3b0a2a',fg:'#3b0a2a',blend:'multiply'}],
  ['Sunset',      {bg:'#fbe6d0',cA:'#ff6b35',cB:'#7a1f5c',fg:'#3a0f2e',blend:'multiply'}],
  ['Ice',         {bg:'#dfeaf5',cA:'#2f6bff',cB:'#0b1b3a',fg:'#0b1b3a',blend:'multiply'}],
  ['Mint',        {bg:'#d9f2e6',cA:'#0f9d6b',cB:'#12372a',fg:'#12372a',blend:'multiply'}],
  ['Lilac',       {bg:'#e6dcf5',cA:'#7c4dff',cB:'#ff4d94',fg:'#2a1450',blend:'multiply'}],
  ['Lemon',       {bg:'#ffe45c',cA:'#1a1a1a',cB:'#e8361c',fg:'#1a1a1a',blend:'multiply'}],
  // dark stage (screen)
  ['Acid',        {bg:'#0d0d0d',cA:'#d7ff1f',cB:'#ff2fa0',fg:'#d7ff1f',blend:'screen'}],
  ['Ultraviolet', {bg:'#14002e',cA:'#b388ff',cB:'#00e5ff',fg:'#f0e6ff',blend:'screen'}],
  ['Forest',      {bg:'#0f2a20',cA:'#b6f2a0',cB:'#f2e8a0',fg:'#e9f5e0',blend:'screen'}],
  ['Ocean',       {bg:'#06283d',cA:'#5ce1e6',cB:'#ffd166',fg:'#e8f6ff',blend:'screen'}],
  ['Gold',        {bg:'#0a0a0a',cA:'#f5c453',cB:'#c0392b',fg:'#f5c453',blend:'screen'}],
  ['Graphite',    {bg:'#2a2a2e',cA:'#ff8a5c',cB:'#f2f2f0',fg:'#f2f2f0',blend:'screen'}],
  // flat colour (normal)
  ['Tangerine',   {bg:'#ff5a1f',cA:'#fff1e0',cB:'#1a1a1a',fg:'#1a1a1a',blend:'source-over'}],
  ['Signal',      {bg:'#e11d2a',cA:'#ffffff',cB:'#111111',fg:'#ffffff',blend:'source-over'}],
  // more light paper (multiply)
  ['Linen',        {bg:'#ede4d3',cA:'#2f6f5e',cB:'#142b24',fg:'#142b24',blend:'multiply'}],
  ['Peach',        {bg:'#fbd9c4',cA:'#e4572e',cB:'#4a1c40',fg:'#4a1c40',blend:'multiply'}],
  ['Cloud',        {bg:'#e9eef2',cA:'#e8553d',cB:'#16324f',fg:'#16324f',blend:'multiply'}],
  ['Pistachio',    {bg:'#e2ecc8',cA:'#5b8a2b',cB:'#1d2a12',fg:'#1d2a12',blend:'multiply'}],
  ['Rose',         {bg:'#f3d9e2',cA:'#c2185b',cB:'#311b3a',fg:'#311b3a',blend:'multiply'}],
  ['Butter',       {bg:'#f7edb8',cA:'#e8741a',cB:'#3b2a0e',fg:'#3b2a0e',blend:'multiply'}],
  ['Fog',          {bg:'#dfe3e6',cA:'#5a6b78',cB:'#0f1a22',fg:'#0f1a22',blend:'multiply'}],
  ['Terracotta',   {bg:'#ecd2bf',cA:'#b8431f',cB:'#3a1d12',fg:'#3a1d12',blend:'multiply'}],
  ['Lavender',     {bg:'#e5e0f7',cA:'#4f46e5',cB:'#e11d74',fg:'#1e1b4b',blend:'multiply'}],
  ['Seafoam',      {bg:'#d5ece8',cA:'#0e8a8a',cB:'#10303a',fg:'#10303a',blend:'multiply'}],
  // more dark stage (screen)
  ['Neon',         {bg:'#0a0a14',cA:'#00f0ff',cB:'#ff2bd6',fg:'#e8fbff',blend:'screen'}],
  ['Ember',        {bg:'#150a08',cA:'#ff7a3d',cB:'#ffd23f',fg:'#ffe9d6',blend:'screen'}],
  ['Midnight',     {bg:'#080f24',cA:'#6ea8ff',cB:'#c9b8ff',fg:'#eaf0ff',blend:'screen'}],
  ['Moss',         {bg:'#0c150d',cA:'#9be564',cB:'#f4f1a8',fg:'#eef7e2',blend:'screen'}],
  ['Crimson',      {bg:'#14060a',cA:'#ff3b5c',cB:'#ffb3c1',fg:'#ffe3e8',blend:'screen'}],
  ['Plum',         {bg:'#1a0f1f',cA:'#ff9ad5',cB:'#8b7bff',fg:'#fbeaff',blend:'screen'}],
  ['Steel',        {bg:'#13171b',cA:'#9fb4c7',cB:'#f2f5f7',fg:'#f2f5f7',blend:'screen'}],
  ['Sulfur',       {bg:'#0f0f08',cA:'#f2ff3d',cB:'#ff7b00',fg:'#fbffc7',blend:'screen'}],
  // more flat colour (normal)
  ['Mustard',      {bg:'#e8b100',cA:'#1a1a1a',cB:'#fff6d6',fg:'#1a1a1a',blend:'source-over'}],
  ['Pine',         {bg:'#1f4d3a',cA:'#f4ead2',cB:'#f2a541',fg:'#f4ead2',blend:'source-over'}],
  ['Hot pink',     {bg:'#ff3d8b',cA:'#fff0f6',cB:'#1a0a14',fg:'#1a0a14',blend:'source-over'}],
  ['Sky',          {bg:'#6cc6ff',cA:'#ffffff',cB:'#0b2a4a',fg:'#0b2a4a',blend:'source-over'}],
  ['Violet',       {bg:'#5b2bd6',cA:'#ffe66d',cB:'#ffffff',fg:'#ffffff',blend:'source-over'}],
  ['Ink',          {bg:'#101820',cA:'#f2aa4c',cB:'#ffffff',fg:'#ffffff',blend:'source-over'}],
];
const ICONS = {
  chrono:`<svg viewBox="0 0 46 34" fill="currentColor"><g opacity=".3"><circle cx="11" cy="7" r="3"/><path d="M8 11h6l2 10-3 9h-2l1-8-3 8H7l2-9z"/></g><g opacity=".6"><circle cx="22" cy="7" r="3"/><path d="M19 11h6l3 9-3 10h-2l1-8-4 8h-2l2-9z"/></g><circle cx="34" cy="7" r="3"/><path d="M31 11h6l4 7-3 1-2-3 1 5-2 9h-2l0-8-3 8h-2l2-9z"/></svg>`,
  sweep:`<svg viewBox="0 0 46 34" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M12 30 6 9Q24-2 41 12Z" fill="currentColor" fill-opacity=".22" stroke="none"/>${[[6,9],[13,5],[22,3],[32,5],[41,12]].map(([x,y])=>`<path d="M12 30 ${x} ${y}"/>`).join('')}</svg>`,
  traj:`<svg viewBox="0 0 46 34" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M3 26C10 4 18 30 24 14S38 2 43 20" stroke-width="2.4"/><path d="M5 30C14 20 20 24 27 22s10-10 15-4" stroke-width="1.2" opacity=".55"/></svg>`,
  contours:`<svg viewBox="0 0 46 34" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M17 4c4 0 5 4 4 7 4 1 6 6 5 10l-3 9h-8l1-9c-4-1-5-6-3-10 0-4 1-7 4-7z"/><path d="M23 4c4 0 5 4 4 7 4 1 6 6 5 10l-3 9h-8l1-9c-4-1-5-6-3-10 0-4 1-7 4-7z" opacity=".6"/><path d="M29 4c4 0 5 4 4 7 4 1 6 6 5 10l-3 9h-8l1-9c-4-1-5-6-3-10 0-4 1-7 4-7z" opacity=".3"/></svg>`,
};
const PLAY=`<svg viewBox="0 0 16 16"><path d="M5 3l8 5-8 5z" fill="currentColor"/></svg>`, PAUSE=`<svg viewBox="0 0 16 16"><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor"/></svg>`;

/* ---------- inspector ---------- */
const fxA = fx => fx ? ` data-fx="${fx}"` : '';
const R = (k,l,min,max,step,v,fx='',unit='') => `<label class="row"${fxA(fx)}><span>${l}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"${unit?` data-unit="${unit}"`:''}><b class="val"></b></label>`;
const C = (k,l,v,fx='') => `<div class="row c"${fxA(fx)}><label><input type="checkbox" data-k="${k}" ${v?'checked':''}>${l}</label></div>`;
const Sel = (k,l,opts,v,fx='') => `<label class="row t"${fxA(fx)}><span>${l}</span><select data-k="${k}">${opts.map(([a,b])=>`<option value="${a}" ${String(a)===String(v)?'selected':''}>${b}</option>`).join('')}</select></label>`;
const Seg = (k,l,opts,v,fx='') => `<div class="row t"${fxA(fx)}><span>${l}</span><div class="seg"><input type="hidden" data-k="${k}" value="${v}">${opts.map(([a,b])=>`<button data-v="${a}">${b}</button>`).join('')}</div></div>`;
// Swiss grid arrangements (columns, rows, then col / row / span of the title, paragraph and caption)
const GRID_PRESETS = {
  Asymmetric:{gcols:6,tsize:0.12,grows:8,tcol:1,trow:1,tspan:5,bcol:4,brow:7,bspan:3,mcol:1,mrow:8,mspan:3},
  Column:    {gcols:6,tsize:0.07,grows:8,tcol:1,trow:1,tspan:3,bcol:1,brow:6,bspan:2,mcol:1,mrow:8,mspan:2},
  Bottom:    {gcols:6,tsize:0.15,grows:8,tcol:1,trow:6,tspan:6,bcol:1,brow:1,bspan:2,mcol:5,mrow:1,mspan:2},
  Offset:    {gcols:6,tsize:0.1,grows:8,tcol:3,trow:2,tspan:4,bcol:3,brow:7,bspan:3,mcol:1,mrow:8,mspan:2},
};
const LOCK_SVG=`<svg class="lk-c" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg><svg class="lk-o" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 4.8-1"/></svg>`;
// a slider with two handles: start (k) and end (kTo). Equal handles = static; apart = animated start → end.
const Dual = (k,l,min,max,step,v,fx='') => { const inp=(key,cls)=>`<input type="range" class="${cls}" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${v}">`;
  return `<div class="row dual"${fxA(fx)}><span class="dl">${l}<button type="button" class="lock" title="Lock: move start and end together">${LOCK_SVG}</button></span><div class="dtrack"><div class="rail"></div><div class="fillr"></div>${inp(k,'h1')}${inp(k+'To','h2')}</div><b class="val" title="Double-click to reset"></b></div>`; };
// compact segmented control made of icon buttons (opts: [value, icon html, tooltip])
const SegI = (k,opts,v,id='') => `<div class="seg ico"${id?` id="${id}"`:''}><input type="hidden" data-k="${k}" value="${v}">${opts.map(([a,b,t])=>`<button data-v="${a}" title="${t}" aria-label="${t}">${b}</button>`).join('')}</div>`;
const IC = d => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON_POS = y => IC(`<rect x="3" y="1.8" width="10" height="12.4" rx="1.6" opacity=".55"/><rect x="5.2" y="${y}" width="5.6" height="2" rx=".6" fill="currentColor" stroke="none"/>`);
const ICON_ALIGN = (a,b,c) => IC(`<path d="M${a[0]} 4h${a[1]}M${b[0]} 8h${b[1]}M${c[0]} 12h${c[1]}"/>`);
const DICE=`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2" width="12" height="12" rx="3"/><circle cx="5.6" cy="5.6" r=".9" fill="currentColor" stroke="none"/><circle cx="10.4" cy="5.6" r=".9" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="5.6" cy="10.4" r=".9" fill="currentColor" stroke="none"/><circle cx="10.4" cy="10.4" r=".9" fill="currentColor" stroke="none"/></svg>`;
const diceBtn = (what,title) => `<button type="button" class="dice" data-rand="${what}" title="${title}" aria-label="${title}">${DICE}</button>`;
const Col = (k,l,v) => `<label>${l}<input type="color" data-k="${k}" value="${v}"></label>`;
const More = (inner,fx='',title='More') => `<details class="more"${fxA(fx)}><summary>${title}</summary>${inner}</details>`;

$('#panes').innerHTML = `
<div class="pane on" data-pane="effect">
  <div class="sec"><h4>Effect</h4><div class="tiles"><input type="hidden" data-k="fx" value="chrono">
    <button data-v="chrono">${ICONS.chrono}Chronophotography</button><button data-v="traj">${ICONS.traj}Trails</button>
    <button data-v="sweep">${ICONS.sweep}Sweep</button><button data-v="contours">${ICONS.contours}Contours</button></div></div>
  <div class="sec"><h4>Composition</h4>
    ${R('phases','Phases',2,60,1,40,'chrono')}
    ${R('cnum','Outlines',2,240,1,80,'contours')}
    ${R('cscale','Overall scale',0.2,3,.01,1)}
    ${R('scale','Figure size',0.3,4,.01,1)}
    ${Dual('fscale','First frame scale',0.2,3,.01,1,'chrono contours')}
    ${Dual('spx','Spread across',-1.5,1.5,.01,0)}
    ${Dual('spy','Spread down',-1.5,1.5,.01,0)}
    <div data-anim="fscale spx spy">${Seg('aease','Easing',[['lin','Linear'],['smooth','Smooth']],'smooth')}</div>
    <div class="hint">Two handles per slider: start and end. Drag them apart to animate over the timeline (the finished poster shows the end); the lock moves both together.</div>
    <input type="hidden" data-k="ox" value="0"><input type="hidden" data-k="oy" value="0">
    <div class="hint">Overall scale sizes the whole composition; Figure size changes only the dancer, keeping the spread. Drag on the poster to move, scroll to scale everything.</div>
    <div class="btnrow"><button class="btn" id="resetFrame">Reset position & scale</button></div>
  </div>
  <div class="sec"><h4>Tail</h4>
    ${R('tailLen','Tail length',0.1,30,.1,6,'',' s')}
    ${R('tailFade','Tail fade',0,1,.01,1)}
    <div class="hint">For every effect: how many seconds of history are drawn behind the newest frame, and how much the old end fades. 30 s = the whole move. Pause or scrub the timeline to see the tail of any moment.</div>
  </div>
  <div class="sec">
    ${C('latest','Show latest frame',true,'traj sweep contours')}
    ${Seg('cstyle','Look',[['sil','Silhouette'],['photo','Photo'],['mono','B&W']],'sil','chrono traj sweep contours')}
    ${R('lfA','Frame opacity',0,1,.01,1,'traj sweep contours')}
    <div data-fx="chrono">
      ${R('aS','First opacity',0,1,.01,1)}
      ${R('aE','Last opacity',0,1,.01,1)}
      ${C('rev','Earlier phases on top',false)}
    </div>
    <div data-fx="sweep">
      <div class="joints">${SWEEP_SEGS.map(([k,l,,v])=>`<label><input type="checkbox" data-k="${k}" ${v?'checked':''}>${l}</label>`).join('')}</div>
      ${Seg('swMode','Surface',[['layered','Layered'],['solid','Solid']],'layered')}
      ${R('swA','Fill',0.02,1,.01,.22)}
      ${R('swRib','Ribs every',0,12,1,4)}
      <div class="hint">The surface a limb sweeps through the air — like a fan or fabric. Ribs mark the limb every N frames (0 = off).</div>
    </div>
    <div class="joints" data-fx="traj">${JOINTS.map(([k,l,,v])=>`<label><input type="checkbox" data-k="${k}" ${v?'checked':''}>${l}</label>`).join('')}</div>
    ${Seg('wmode','Width',[['const','Even'],['fast','Speed'],['slow','Pauses']],'fast','traj')}
    ${C('dots','Dot on every frame',false,'traj')}
    ${Sel('ribbon','Ribbons',[['none','None'],['wr','Between hands'],['an','Between feet'],['x','Hand ↔ foot']],'none','traj')}
    ${R('ribA','Ribbon opacity',0,1,.01,.35,'traj')}
    ${R('ghosts','Skeletons',0,24,1,0,'traj')}
    ${R('ghA','Skeleton opacity',0,1,.01,.5,'traj')}
    ${R('cfill','Fill',0,1,.01,0,'contours')}
    ${R('lw','Line width',0.2,12,0.1,2,'traj contours sweep')}
    ${R('alpha','Line opacity',0.05,1,.01,.9,'traj contours sweep')}
    ${R('smooth','Smoothing',0,8,1,2,'traj sweep')}
    ${R('csm','Simplify',1,6,1,2,'contours')}
  </div>
  <div class="sec">${More(`
    ${Seg('model','Model',[['lite','Lite · fast'],['full','Full · precise']],'lite')}
    ${Sel('mres','Model input',[[384,'384 px'],[512,'512 px'],[768,'768 px']],512)}
    ${Sel('res','Photo quality',[[640,'640 px'],[960,'960 px'],[1280,'1280 px']],960)}
    ${C('autocrop','Follow dancer (sharper silhouettes)',true)}
    ${C('mirror','Mirror',false)}`,'','Tracking')}</div>
</div>

<div class="pane" data-pane="style">
  <div class="sec"><h4>Colours</h4>
    <div class="swatches">${PRESETS.map(([n,p],i)=>`<button data-preset="${i}" title="${n}">${[p.bg,p.cA,p.cB].map(c=>`<span style="background:${c}"></span>`).join('')}</button>`).join('')}</div>
    <div class="bgfg">${Col('bg','Background','#efe9df')}<button class="btn swap" id="swapBgFg" title="Swap background and text colours (X)"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13"/></svg></button>${Col('fg','Text','#1a1a1a')}</div>
    <div class="bgfg">${Col('cA','Start (A)','#e8361c')}<button class="btn swap" id="swapAB" title="Swap start and end colours"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13"/></svg></button>${Col('cB','End (B)','#1a1a1a')}</div>
    ${Sel('blend','Blend',[['source-over','Normal'],['multiply','Multiply (riso)'],['screen','Screen'],['difference','Difference']],'multiply')}
    ${R('grain','Grain',0,.6,.01,.12)}
  </div>
  <div class="sec"><h4>Pattern</h4>
    ${Sel('pattern','Pattern',PATTERNS,'none')}
    <div data-pat>
      ${Seg('pcol','Colour',[['fg','Text'],['cA','Start'],['cB','End']],'fg')}
      ${R('psize','Size',.02,.3,.002,.06)}
      ${R('pw','Weight',.02,.5,.01,.12)}
      ${R('pang','Angle',-90,90,1,0,'','°')}
      ${R('pop','Opacity',0,1,.01,.25)}
    </div>
  </div>
</div>

<div class="pane" data-pane="type" id="typoBody">
  <div class="sec"><h4>Layout<span class="hright"><label class="hchk"><input type="checkbox" data-k="showText" checked>Show text</label></span></h4>
    <div class="dim"><div class="tiles t3"><input type="hidden" data-k="tlayout" value="classic"><button data-v="classic"><svg viewBox="0 0 28 36" fill="currentColor"><rect x="3" y="2" width="22" height="32" rx="2" fill="none" stroke="currentColor" opacity=".45"/><rect x="7" y="6" width="14" height="4"/><rect x="9" y="13" width="10" height="1.4" opacity=".7"/><rect x="10" y="16" width="8" height="1.4" opacity=".7"/></svg>Classic</button><button data-v="corners"><svg viewBox="0 0 28 36" fill="currentColor"><rect x="3" y="2" width="22" height="32" rx="2" fill="none" stroke="currentColor" opacity=".45"/><rect x="6" y="6" width="10" height="4"/><rect x="19" y="6" width="3" height="1.4" opacity=".7"/><rect x="19" y="8.6" width="3" height="1.4" opacity=".7"/><rect x="13" y="26" width="9" height="1.4" opacity=".7"/><rect x="13" y="29" width="9" height="1.4" opacity=".7"/></svg>Corners</button><button data-v="stack"><svg viewBox="0 0 28 36" fill="currentColor"><rect x="3" y="2" width="22" height="32" rx="2" fill="none" stroke="currentColor" opacity=".45"/><rect x="6" y="19" width="16" height="3"/><rect x="6" y="23.5" width="16" height="4.5"/><rect x="6" y="6" width="9" height="1.4" opacity=".7"/><rect x="6" y="9" width="7" height="1.4" opacity=".7"/></svg>Stack</button><button data-v="banner"><svg viewBox="0 0 28 36" fill="currentColor"><rect x="3" y="2" width="22" height="32" rx="2" fill="none" stroke="currentColor" opacity=".45"/><rect x="6" y="26" width="16" height="5"/><rect x="6" y="19" width="9" height="1.4" opacity=".7"/><rect x="6" y="22" width="9" height="1.4" opacity=".7"/><rect x="19" y="19" width="3" height="1.4" opacity=".7"/></svg>Banner</button><button data-v="side"><svg viewBox="0 0 28 36" fill="currentColor"><rect x="3" y="2" width="22" height="32" rx="2" fill="none" stroke="currentColor" opacity=".45"/><rect x="6" y="6" width="4" height="24"/><rect x="14" y="26.5" width="8" height="1.4" opacity=".7"/><rect x="14" y="29.5" width="8" height="1.4" opacity=".7"/><rect x="18" y="6" width="4" height="1.4" opacity=".7"/></svg>Side</button><button data-v="grid"><svg viewBox="0 0 28 36" fill="currentColor"><rect x="3" y="2" width="22" height="32" rx="2" fill="none" stroke="currentColor" opacity=".45"/><path d="M10.5 6v24M17.5 6v24M6 12h16M6 24h16" stroke="currentColor" stroke-width=".6" opacity=".35" fill="none"/><rect x="6" y="6" width="12" height="4"/><rect x="13" y="26" width="9" height="1.4" opacity=".7"/><rect x="13" y="29" width="9" height="1.4" opacity=".7"/><rect x="6" y="13" width="7" height="1.4" opacity=".7"/></svg>Grid</button></div>
    <div class="hint" data-lay="classic">One block of text: place it at the top, middle or bottom of the sheet.</div>
    <div class="hint" data-lay="corners">Title top-left, caption top-right, paragraph bottom-right.</div>
    <div class="hint" data-lay="stack">Every word stretched to the full width of the sheet.</div>
    <div class="hint" data-lay="banner">The whole title in one line across the sheet.</div>
    <div class="hint" data-lay="side">The title runs along the edge of the sheet.</div>
    <div class="hint" data-lay="grid">Text snapped to a modular grid, flush left, as in Swiss posters.</div></div>
  </div>
  <div class="sec" data-lay="grid"><h4>Grid</h4>
    <div class="btnrow gridp">${Object.keys(GRID_PRESETS).map(n=>`<button class="btn" data-gridpreset="${n}">${n}</button>`).join('')}</div>
    ${R('gcols','Columns',2,12,1,6)}
    ${R('grows','Rows',2,16,1,8)}
    ${R('ggap','Gutter',0,.05,.001,.015)}
    ${C('gridShow','Show grid',true)}
  </div>
  <div class="sec"><h4>Title</h4>
    <textarea data-k="text" rows="3" placeholder="Poster title">FOUETTÉ</textarea>
    ${C('upper','Uppercase',true)}
    ${Sel('font','Font',Object.entries(FONTS).map(([k,f])=>[k,f.fam]).concat([['__up','＋ upload font…']]),'unbounded')}
    <input type="file" id="fontFile" accept=".ttf,.otf,.woff,.woff2" hidden>
    <div class="icorow">
      <div id="twWrap">${SegI('tweight',[['bold','<span class="wA" style="font-weight:800">A</span>','Bold'],['light','<span class="wA" style="font-weight:300">A</span>','Light']],'bold')}</div>
      <div data-lay="classic stack banner">${SegI('tpos',[['top',ICON_POS(3.6),'Top'],['center',ICON_POS(7),'Middle'],['bottom',ICON_POS(10.4),'Bottom']],'top')}</div>
      <div data-lay="classic stack">${SegI('talign',[['start',ICON_ALIGN([2.5,11],[2.5,7],[2.5,9]),'Align left'],['middle',ICON_ALIGN([2.5,11],[4.5,7],[3.5,9]),'Align centre'],['end',ICON_ALIGN([2.5,11],[6.5,7],[4.5,9]),'Align right']],'middle')}</div>
    </div>
    <div id="fontAxes"></div>
    <div data-lay="classic">${Seg('trot','Rotate',[['0','0°'],['90','90°'],['180','180°'],['270','-90°']],'0')}</div>
    <div data-lay="classic corners grid">${R('tsize','Size',.02,.35,.002,.13)}</div>
    ${R('track','Tracking',-.6,1,.005,0)}
    <div data-lay="classic corners stack grid">${R('lh','Line height',.2,2.5,.01,.92)}</div>
    <div data-lay="corners banner side">${C('tflip','Flip sides',false)}</div>
    <div data-lay="grid">${R('tcol','Column',1,12,1,1)}${R('trow','Row',1,16,1,1)}${R('tspan','Span',1,12,1,5)}</div>
  </div>
  <div class="sec"><h4>Paragraph</h4>
    <textarea data-k="body" rows="3" placeholder="Small paragraph (optional)"></textarea>
    ${R('bsize','Font size',.008,.08,.001,.022)}
    ${R('blh','Leading',.8,2.5,.01,1.4)}
    <div data-lay="classic corners stack banner side">${R('bw','Width',.2,1,.01,.6)}</div>
    <div data-lay="grid">${R('bcol','Column',1,12,1,4)}${R('brow','Row',1,16,1,7)}${R('bspan','Span',1,12,1,3)}</div>
  </div>
  <div class="sec"><h4>Caption</h4>
    <textarea data-k="meta" rows="2" placeholder="Date, place, credits (optional)"></textarea>
    <div data-lay="grid">${R('mcol','Column',1,12,1,1)}${R('mrow','Row',1,16,1,8)}${R('mspan','Span',1,12,1,3)}</div>
    <div class="hint">Set in Helvetica at the paragraph size.</div>
  </div>
  <div class="sec"><h4>Page</h4>
    ${R('margin','Margins',0,.15,.005,.06)}
    ${C('tsym','Symmetric: add an upside-down copy',false)}
    ${C('textBehind','Behind the figure',false)}
  </div>
</div>

<div class="pane" data-pane="export">
  <div class="sec"><h4>Format</h4>
    ${Seg('fmt','Format',[['1.4142','A'],['1.5','2:3'],['1.25','4:5'],['1.3333','3:4'],['1.7778','9:16'],['1','1:1']],'1.4142')}
    <div class="hint" id="sizeHint"></div>
  </div>
  <div class="sec"><h4>Image</h4>
    <div class="btnrow"><button class="btn pri" id="pngBtn">PNG</button></div>
    <div class="hint" id="momentHint"></div>
  </div>
  <div class="sec"><h4>Animated poster</h4>
    ${R('adur','Duration',2,30,.5,6,'',' s')}
    ${C('agrain','Living grain',true)}
    <div class="btnrow"><button class="btn pri" id="mp4Btn">Export MP4</button></div>
    <div class="hint">The video is the timeline's animated preview. Its length is the Duration above.</div>
    <div id="animProg"><div></div></div>
  </div>
</div>`;

/* ---------- settings ---------- */
const S = {}; RS.S = S;
const LS_KEY = 'dance-motion-lab:v3';
const ctrls = [...document.querySelectorAll('[data-k]')];
const ctrlOf = k => document.querySelector(`[data-k="${k}"]`);
// factory defaults, read before any saved value is applied (a hidden input's .value writes its default attribute, so defaultValue can't be trusted later)
const DEFAULTS = new Map(ctrls.map(el=>[el.dataset.k, el.type==='checkbox' ? el.checked : el.value]));
function fmtVal(el){ const v=+el.value; return Math.abs(v)>=100||Number.isInteger(v)&&+el.step>=1 ? String(v) : v.toFixed(+el.step<0.01?3:2); }
function paintRange(el){ const mn=+el.min, mx=+el.max, f=mx>mn ? Math.min(1,Math.max(0,(+el.value-mn)/(mx-mn))) : 0; el.style.setProperty('--p', `calc(${f*100}% + ${6-12*f}px)`); }
document.addEventListener('input', e=>{ if(e.target.matches?.('input[type=range]')) paintRange(e.target); }, true);
function readAll(){
  for(const el of ctrls){ const k=el.dataset.k, v=el.value;
    if(el.type==='checkbox') S[k]=el.checked;
    else if(el.type==='range') { S[k]=+v; (el.closest('.row')||el.parentElement).querySelector('.val').textContent = el.dataset.unit ? +v+el.dataset.unit : fmtVal(el); }
    else if(el.type==='hidden') S[k] = v!=='' && !isNaN(+v) ? +v : v;
    else S[k]=v; }
  document.querySelectorAll('input[type=range]').forEach(paintRange);
  updateDuals();
}
// dual sliders: filled bar between the handles, both values in the value column
function updateDuals(){
  document.querySelectorAll('.row.dual').forEach(row=>{
    const [a,b]=row.querySelectorAll('input'), mn=+a.min, mx=+a.max, pa=(a.value-mn)/(mx-mn), pb=(b.value-mn)/(mx-mn);
    const f=row.querySelector('.fillr'); f.style.left=`calc(${Math.min(pa,pb)*100}% + ${6-12*Math.min(pa,pb)}px)`; f.style.width=`calc((100% - 12px) * ${Math.abs(pa-pb)})`;
    row.classList.toggle('same', a.value===b.value);
    row.querySelector('.val').innerHTML = a.value===b.value ? fmtVal(a) : fmtVal(a)+'<br>'+fmtVal(b);
  });
}
function syncSegs(){ document.querySelectorAll('.seg,.tiles').forEach(seg=>{ const inp=seg.querySelector('input[type=hidden]'); seg.querySelectorAll('button[data-v]').forEach(b=>b.classList.toggle('on', b.dataset.v===inp.value)); }); }
function showFx(){
  document.querySelectorAll('[data-fx],[data-anim],[data-lay],[data-pat]').forEach(el=>{
    const fxOk = (!el.dataset.fx || el.dataset.fx.split(' ').includes(S.fx)) && (!el.dataset.lay || el.dataset.lay.split(' ').includes(S.tlayout||'classic'));
    const anOk = !el.dataset.anim || el.dataset.anim.split(' ').some(k=>S[k+'To']!==undefined && S[k+'To']!==S[k]);
    const patOk = !('pat' in el.dataset) || (S.pattern||'none')!=='none';
    el.style.display = fxOk && anOk && patOk ? '' : 'none'; });
  updateSizeHint();
  $('#typoBody').classList.toggle('off', !S.showText);
}
const setCtrl=(k,v)=>{ const el=ctrlOf(k); if(!el) return; if(el.type==='checkbox') el.checked=v; else el.value=v; };
function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify({...S,_m:8})); }catch(e){} }
try{ const saved=JSON.parse(localStorage.getItem(LS_KEY)||'{}');
  if(saved.fx==='slit') saved.fx='chrono';          // slit-scan effect was removed
  if(!(saved._m>=4)){ delete saved.talign; delete saved.tpos; }   // text now defaults to top-centre
  if(!(saved._m>=8)) delete saved.aS;                          // First opacity now defaults to 1
  if(!(saved._m>=7)){ delete saved.tailLen; delete saved.tailFade; }   // Tail now defaults to 6 s / fade 1
  if(!(saved._m>=6)) delete saved.lfA;                         // Frame opacity now defaults to 1
  if(!(saved._m>=5)){ delete saved.phases; delete saved.cnum; delete saved.adur; }   // new defaults: Phases 40, Outlines 80, Duration 6
  if(saved.tpos==='side'){ saved.tpos='top'; saved.trot=270; }    // the old Side layout is now a 270° rotation
  if(String(saved.font||'').startsWith('custom')) delete saved.font;      // an uploaded font isn't persisted across reloads
  for(const [k,v] of Object.entries(saved)) setCtrl(k,v); }catch(e){}
readAll(); syncSegs(); showFx();
let lastFont=S.font;                              // the Font list's last item is an action, not a font

document.querySelectorAll('.seg,.tiles').forEach(seg=>{
  const inp=seg.querySelector('input[type=hidden]');
  seg.querySelectorAll('button[data-v]').forEach(b=>b.addEventListener('click',()=>{ inp.value=b.dataset.v; syncSegs(); inp.dispatchEvent(new Event('input')); }));
});
document.querySelectorAll('.row.dual').forEach(row=>{
  const [a,b]=row.querySelectorAll('input'), lock=row.querySelector('.lock'); let pa=+a.value, pb=+b.value;
  const snap=()=>{ pa=+a.value; pb=+b.value; };
  row.addEventListener('pointerdown',snap); row.addEventListener('keydown',snap);
  lock.addEventListener('click',()=>{ lock.classList.toggle('on'); lock.title = lock.classList.contains('on') ? 'Unlock' : 'Lock: move start and end together'; });
  for(const [me,other,mp,op] of [[a,b,()=>pa,()=>pb],[b,a,()=>pb,()=>pa]]) me.addEventListener('input',()=>{
    if(lock.classList.contains('on')){ const d=+me.value-mp(); other.value=Math.min(+other.max,Math.max(+other.min,op()+d)); }
  });
  const reset=()=>{ for(const i of [a,b]){ i.value=DEFAULTS.get(i.dataset.k); } a.dispatchEvent(new Event('input',{bubbles:true})); };
  row.querySelector('.val').addEventListener('dblclick',reset);
});
for(const el of ctrls) el.addEventListener('input', ()=>onCtrl(el.dataset.k));
// double-click a slider's number to put it back to its default (the value attribute in the markup)
for(const el of ctrls){
  if(el.type!=='range') continue;
  if(el.closest('.row.dual')) continue;
  const val=el.parentElement.querySelector('.val'); if(!val) continue;
  val.title='Double-click to reset';
  val.addEventListener('dblclick',()=>{ el.value=el.defaultValue; el.dispatchEvent(new Event('input',{bubbles:true})); });
}
function onCtrl(k){
  if(k==='font' && ctrlOf('font').value==='__up'){ ctrlOf('font').value=lastFont; $('#fontFile').click(); return; }
  readAll(); showFx(); save();
  if(k==='font'||k==='text'||k==='body'||k==='meta'||k==='tweight') loadFont().then(schedule);
  if(k==='font'){ lastFont=S.font; activateFont(); }
  if(k==='model'||k==='mres') crashCount=0;
  if(k==='model' || (k==='mres' && !worker)){ initWorker(); return; }
  if(['bg','fg','cA','cB','blend'].includes(k)) markPreset(-1);
  if(k==='autocrop') crop=null;
  if(['autocrop','mres','res'].includes(k) && !isCam && take) startCapture();
  if(k==='adur'){ if(anim.on){ const p=(((performance.now()-anim.t0)/1000)%anim.dur)/anim.dur; anim.t0=performance.now()-p*S.adur*1000; } anim.dur=S.adur; }
  if(k==='capSpeed' && capturing) vid.playbackRate=S.capSpeed;
  if(k==='camSec' && isCam) evictBuffer();
  schedule();
}
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
  const p=PRESETS[+b.dataset.preset][1]; for(const [k,v] of Object.entries(p)) setCtrl(k,v); readAll(); save(); markPreset(+b.dataset.preset); schedule();
}));
function markPreset(i){ document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('on', +b.dataset.preset===i)); }
const lum = hex => { const n=parseInt(hex.slice(1),16);
  const [r,g,b]=[n>>16&255, n>>8&255, n&255].map(v=>{ v/=255; return v<=.03928 ? v/12.92 : ((v+.055)/1.055)**2.4; });
  return .2126*r+.7152*g+.0722*b; };
function swapBgFg(){
  const bg=S.bg, fg=S.fg;
  setCtrl('bg',fg); setCtrl('fg',bg);
  // Multiply only shows on light paper and Screen only on dark: keep the blend usable after the swap
  const L=lum(fg);
  if(S.blend==='multiply' && L<.2) setCtrl('blend','screen');
  else if(S.blend==='screen' && L>.5) setCtrl('blend','multiply');
  readAll(); save(); markPreset(-1); schedule();
}
$('#swapBgFg').onclick=swapBgFg;
// Random palette: a harmonious hue pair in one of three moods (light paper / dark stage / flat colour)
const hsl=(h,sat,l)=>{ h=((h%360)+360)%360; sat/=100; l/=100; const a=sat*Math.min(l,1-l);
  const f=n=>{ const k=(n+h/30)%12, c=l-a*Math.max(-1,Math.min(k-3,9-k,1)); return Math.round(255*c).toString(16).padStart(2,'0'); }; return `#${f(0)}${f(8)}${f(4)}`; };
const rnd=(a,b)=>a+Math.random()*(b-a), pick=arr=>arr[Math.floor(Math.random()*arr.length)];
function randomPalette(){
  const h=rnd(0,360), h2=h+pick([30,60,150,180,210,300]), mood=pick(['light','light','dark','dark','flat']);
  if(mood==='light') return {bg:hsl(h+rnd(-10,10),rnd(15,40),rnd(88,95)), cA:hsl(h,rnd(70,95),rnd(45,58)), cB:hsl(h2,rnd(55,90),rnd(14,38)), fg:hsl(h2,rnd(30,60),rnd(8,16)), blend:'multiply'};
  if(mood==='dark')  return {bg:hsl(h2,rnd(20,60),rnd(4,11)), cA:hsl(h,rnd(85,100),rnd(58,68)), cB:hsl(h2,rnd(80,100),rnd(52,66)), fg:hsl(h,rnd(40,90),rnd(86,95)), blend:'screen'};
  const bg=hsl(h,rnd(70,92),rnd(42,54));
  return {bg, cA:hsl(h+180,rnd(20,60),rnd(90,97)), cB:hsl(h2,rnd(60,90),rnd(10,20)), fg: lum(bg)>.35 ? '#111111' : '#ffffff', blend:'source-over'};
}
$('#swapAB').onclick=()=>{ const a=S.cA, b=S.cB; setCtrl('cA',b); setCtrl('cB',a); readAll(); save(); markPreset(-1); schedule(); };

/* ---------- Reset all / Randomize ---------- */
const defaultOf = el => DEFAULTS.get(el.dataset.k);
const CAPTURE_KEYS = ['model','mres','res','autocrop'];
// after many controls were set from code: re-read them once and do the side effects onCtrl() would do for each
function applyBulk(before){
  readAll(); syncSegs(); showFx(); save();
  const changed = k => before[k]!==S[k];
  if(changed('font')){ lastFont=S.font; activateFont(); }
  if(changed('font')||changed('text')||changed('body')||changed('meta')||changed('tweight')) loadFont().then(schedule);
  if(CAPTURE_KEYS.some(changed)){ crashCount=0;
    if(changed('model') || (changed('mres') && !worker)) initWorker();
    else if(!isCam && take) startCapture(); }
  if(changed('capSpeed') && capturing) vid.playbackRate=S.capSpeed;
  if(changed('adur')){ if(anim.on){ const p=(((performance.now()-anim.t0)/1000)%anim.dur)/anim.dur; anim.t0=performance.now()-p*S.adur*1000; } anim.dur=S.adur; }
  schedule();
}
$('#resetAll').onclick=()=>{
  const before={...S};
  for(const el of ctrls) setCtrl(el.dataset.k, defaultOf(el));
  document.querySelectorAll('.lock.on').forEach(b=>b.click());
  markPreset(-1); applyBulk(before); toast('All settings are back to default');
};
// Randomizers: effect (effect + its settings), colours (palette + grain), text (typography); the top button does all three
const chance=p=>Math.random()<p;
const rnum=(k,a,b)=>{ const el=ctrlOf(k); if(!el) return; const st=+el.step||.01, v=Math.round((a+Math.random()*(b-a))/st)*st; setCtrl(k, +Math.min(+el.max,Math.max(+el.min,v)).toFixed(3)); };
function randFx(){
  const set=setCtrl, num=rnum;
  set('fx', pick(['chrono','traj','sweep','contours']));
  num('phases',14,70); num('cnum',40,140); num('scale',.85,1.2); num('cscale',.9,1.2);
  const sx=chance(.5), sy=!sx||chance(.3); set('spx', sx?+(rnd(.1,.7)*(chance(.5)?1:-1)).toFixed(2):0); set('spy', sy?+(rnd(.1,.6)*(chance(.5)?1:-1)).toFixed(2):0);
  set('fscale', chance(.5)?1:+rnd(.5,1.3).toFixed(2));
  num('tailLen',1.5,12); num('tailFade',.3,1); num('aS',.1,1); num('aE',.8,1); set('rev',chance(.2));
  set('cfill', chance(.5)?0:+rnd(.1,.5).toFixed(2)); num('lw',.8,6); num('alpha',.5,1); num('smooth',0,5); num('csm',1,4);
  for(const [k,a,b] of [['fscale',.5,1.4],['spx',-.7,.7],['spy',-.6,.6]]){ if(chance(.2)) num(k+'To',a,b); else set(k+'To',ctrlOf(k).value); }
  num('swA',.08,.6); num('swRib',0,8); set('swMode',pick(['layered','solid']));
  set('wmode',pick(['const','fast','slow'])); set('dots',chance(.25)); set('ribbon',pick(['none','none','wr','an','x'])); num('ribA',.15,.6);
  set('ghosts', chance(.5)?0:Math.round(rnd(4,16))); num('ghA',.2,.7);
  set('cstyle',pick(['sil','sil','photo','mono'])); set('latest',chance(.8)); num('lfA',.6,1);
  for(const group of [JOINTS,SWEEP_SEGS]){ const on=group.map(()=>chance(.5)); if(!on.some(Boolean)) on[Math.floor(Math.random()*on.length)]=true; group.forEach(([k],i)=>set(k,on[i])); }
}
function randColors(){
  if(chance(.5)){ const i=Math.floor(Math.random()*PRESETS.length); for(const [k,v] of Object.entries(PRESETS[i][1])) setCtrl(k,v); markPreset(i); }
  else { for(const [k,v] of Object.entries(randomPalette())) setCtrl(k,v); markPreset(-1); }
  rnum('grain',0,.3);
  setCtrl('pattern', chance(.45) ? 'none' : pick(PATTERNS.slice(1).map(p=>p[0]))); setCtrl('pcol', pick(['fg','fg','cA','cB']));
  rnum('psize',.03,.14); rnum('pw',.05,.3); rnum('pang', pick([0,0,45,90,-45]), pick([0,0,45,90,-45])); rnum('pop',.08,.4);
}
function randText(){
  const set=setCtrl, num=rnum;
  set('tlayout', pick(['classic','classic','corners','stack','banner','side','grid','grid'])); set('tflip', chance(.4));
  for(const [k,v] of Object.entries(GRID_PRESETS[pick(Object.keys(GRID_PRESETS))])) set(k,v);
  if(!userFonts.has(S.font) || chance(.7)) set('font', pick(Object.keys(FONTS)));
  set('tweight',pick(['bold','light'])); set('tpos',pick(['top','top','center','bottom'])); set('talign',pick(['start','middle','middle','end']));
  set('trot', chance(.8)?'0':pick(['90','180','270'])); num('tsize',.08,.2); num('track',-.05,.2); num('lh',.8,1.05); set('upper',chance(.7)); set('tsym',chance(.15));
}
function runRand(what){
  const before={...S};
  if(what==='all'||what==='fx') randFx();
  if(what==='all'||what==='colors') randColors();
  if(what==='all'||what==='text') randText();
  applyBulk(before);
}
$('#randAll').onclick=()=>runRand('all');
function applyGridPreset(name){ const before={...S}; for(const [k,v] of Object.entries(GRID_PRESETS[name])) setCtrl(k,v); applyBulk(before); }
document.querySelectorAll('[data-gridpreset]').forEach(b=>b.addEventListener('click',()=>applyGridPreset(b.dataset.gridpreset)));
document.querySelectorAll('[data-rand]').forEach(b=>b.addEventListener('click',()=>runRand(b.dataset.rand)));

/* ---------- uploaded fonts ("＋ upload font…" is the last item of the Font list, as in Poster Lab) ---------- */
const AXIS_LABEL={wght:'Weight',wdth:'Width',slnt:'Slant',ital:'Italic',opsz:'Optical size',GRAD:'Grade',XTRA:'Counter width',XOPQ:'Thick stroke',YOPQ:'Thin stroke',YTLC:'Lowercase height',YTUC:'Uppercase height',YTAS:'Ascender',YTDE:'Descender',YTFI:'Figure height',SOFT:'Softness',WONK:'Wonk',CASL:'Casual',CRSV:'Cursive',MONO:'Mono',FILL:'Fill'};
const TYPICAL_AXES=[{tag:'wght',label:'Weight',min:100,def:400,max:900},{tag:'wdth',label:'Width',min:50,def:100,max:200},{tag:'slnt',label:'Slant',min:-15,def:0,max:0}];
const HAS_VS = typeof FontFace!=='undefined' && 'variationSettings' in FontFace.prototype;
// Reads the fvar table (TTF/OTF/WOFF). WOFF2 is Brotli-compressed, so typical axes are offered instead.
async function readAxes(buf){
  const dv=new DataView(buf), tag=(d,o)=>String.fromCharCode(d.getUint8(o),d.getUint8(o+1),d.getUint8(o+2),d.getUint8(o+3));
  const sig=dv.getUint32(0); let fvar=null;
  if(sig===0x774F4632) return {axes:TYPICAL_AXES.map(a=>({...a})), woff2:true};
  if(sig===0x774F4646){                         // WOFF: zlib-compressed tables
    const n=dv.getUint16(12);
    for(let i=0;i<n;i++){ const o=44+i*20; if(tag(dv,o)!=='fvar') continue;
      const off=dv.getUint32(o+4), comp=dv.getUint32(o+8), orig=dv.getUint32(o+12), raw=buf.slice(off,off+comp);
      fvar = comp===orig ? raw : await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer(); }
  } else if(sig===0x00010000 || sig===0x4F54544F || sig===0x74727565){   // TrueType / OTTO / 'true'
    const n=dv.getUint16(4);
    for(let i=0;i<n;i++){ const o=12+i*16; if(tag(dv,o)!=='fvar') continue; const off=dv.getUint32(o+8), len=dv.getUint32(o+12); fvar=buf.slice(off,off+len); }
  }
  if(!fvar) return {axes:[]};
  const f=new DataView(fvar), aoff=f.getUint16(4), cnt=f.getUint16(8), sz=f.getUint16(10), axes=[];
  for(let i=0;i<cnt;i++){ const o=aoff+i*sz; if(f.getUint16(o+16)&1) continue;          // skip hidden axes
    const t=tag(f,o), fx=p=>f.getInt32(p)/65536;
    axes.push({tag:t, label:AXIS_LABEL[t]||t, min:fx(o+4), def:fx(o+8), max:fx(o+12)}); }
  return {axes};
}
const userFonts=new Map();                       // id ('custom:1', …) → record; every upload stays in the list
let userFontN=0, faceN=0, axRaf=0;
// Canvas can't take font-variation-settings, so each axis combination becomes its own FontFace.
async function applyCustomFont(rec){
  const seq=(rec.seq=(rec.seq||0)+1), wa=rec.axes.find(a=>a.tag==='wght');
  const val=a=>+(rec.vars[a.tag] ?? a.def);
  const vs=rec.axes.map(a=>`"${a.tag}" ${+val(a).toFixed(3)}`).join(', ');
  const desc={}; if(vs){ if(HAS_VS) desc.variationSettings=vs; else if(wa) desc.weight=`${wa.min} ${wa.max}`; }
  const fam=`DM Font ${++faceN}`, face=new FontFace(fam, rec.buf, desc);
  await face.load();
  if(seq!==rec.seq) return;                      // a newer slider position superseded this one
  document.fonts.add(face);
  const old=rec.face; Object.assign(rec,{face, family:fam, vs, weight:(!HAS_VS && wa) ? Math.round(val(wa)) : 400});
  if(old) document.fonts.delete(old);
  schedule();
}
function buildAxes(){
  const box=$('#fontAxes'), rec=CUSTOM.rec;
  if(!rec){ box.innerHTML=''; return; }
  if(!rec.axes.length){ box.innerHTML='<div class="hint">Static font — no variable axes.</div>'; return; }
  const shown=v=>+(+v).toFixed(2);
  const note = rec.woff2 ? '<div class="hint">WOFF2: the axes can’t be read here, so typical ones are shown. Use a TTF or OTF file for the exact axes.</div>' : '';
  box.innerHTML='<h4 style="margin:12px 0 4px">Variable axes</h4>'+note+rec.axes.map(a=>{ const v=rec.vars[a.tag] ?? a.def;
    return `<label class="row"><span>${a.label}</span><input type="range" data-axis="${a.tag}" min="${a.min}" max="${a.max}" step="${(a.max-a.min)>20?1:.01}" value="${v}"><b class="val" title="Double-click to reset">${shown(v)}</b></label>`; }).join('')
    +'<div class="btnrow"><button class="btn" id="axesReset">Reset axes</button></div>';
  box.querySelectorAll('input[data-axis]').forEach(inp=>{ paintRange(inp);
    const a=rec.axes.find(x=>x.tag===inp.dataset.axis), val=inp.parentElement.querySelector('.val');
    const set=v=>{ rec.vars[a.tag]=v; inp.value=v; paintRange(inp); val.textContent=shown(v); cancelAnimationFrame(axRaf); axRaf=requestAnimationFrame(()=>applyCustomFont(rec)); };
    inp.addEventListener('input',()=>set(+inp.value));
    val.addEventListener('dblclick',()=>set(a.def));            // double-click an axis value to reset it
  });
  $('#axesReset').onclick=()=>{ rec.vars={}; buildAxes(); applyCustomFont(rec); };
}
function syncFontUI(){ $('#twWrap').style.display = CUSTOM.rec ? 'none' : ''; }     // weight is an axis for uploaded fonts
function activateFont(){ CUSTOM.rec = userFonts.get(S.font) || null; buildAxes(); syncFontUI(); }
$('#fontFile').addEventListener('change', async e=>{
  const file=e.target.files[0]; e.target.value=''; if(!file) return;
  try{
    const buf=await file.arrayBuffer();
    await new FontFace('DM Probe', buf.slice(0)).load();          // reject unreadable files before touching any state
    const info=await readAxes(buf);
    const rec={id:'custom:'+(++userFontN), name:file.name.replace(/\.[^.]+$/,''), file, buf, axes:info.axes, woff2:!!info.woff2, vars:{}, dataURL:'', family:'', vs:'', weight:400, face:null, seq:0};
    userFonts.set(rec.id, rec);
    await applyCustomFont(rec);
    const sel=ctrlOf('font'), opt=document.createElement('option');
    opt.value=rec.id; opt.textContent='★ '+rec.name+(info.axes.length && !info.woff2 ? ' (variable)' : '');
    sel.insertBefore(opt, sel.lastElementChild);                  // above "＋ upload font…"
    setCtrl('font',rec.id); readAll(); lastFont=rec.id; activateFont(); save(); schedule();
    toast(info.woff2 ? 'Font loaded · WOFF2: typical axes shown' : info.axes.length ? `Font loaded · ${info.axes.length} variable ${info.axes.length>1?'axes':'axis'}` : 'Font loaded');
  }catch(err){ console.warn(err); toast('Could not read this font file', 5000); }
});
activateFont();
$('#resetFrame').onclick=()=>{ setCtrl('scale',1); setCtrl('cscale',1); setCtrl('ox',0); setCtrl('oy',0); readAll(); save(); schedule(); };
document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.dataset.pane===b.dataset.tab));
}));

/* ---------- toast ---------- */
let toastEl=null, toastT=0;
function toast(msg, ms=3200){
  if(!toastEl){ toastEl=document.createElement('div'); Object.assign(toastEl.style,{position:'absolute',top:'14px',left:'50%',transform:'translateX(-50%)',background:'#000c',color:'#fff',padding:'8px 14px',borderRadius:'20px',fontSize:'12.5px',zIndex:6,pointerEvents:'none',transition:'opacity .25s',whiteSpace:'nowrap'}); $('#stage').appendChild(toastEl); }
  toastEl.textContent=msg; toastEl.style.opacity=1; clearTimeout(toastT); toastT=setTimeout(()=>toastEl.style.opacity=0, ms);
}

/* ---------- pose worker ---------- */
let worker=null, workerReady=false, inflight=false, fid=0, gen=0, pendingCapture=false, crashCount=0;
const pending=new Map();
function initWorker(){
  if(!worker){ worker=new Worker('pose-worker.js?v=4'); worker.onmessage=onWorker; worker.onerror=e=>toast('Pose model error: '+(e.message||e)); }
  workerReady=false; inflight=false; setStats('loading pose model…');
  worker.postMessage({type:'init', model:S.model});
}
function onWorker(e){
  const d=e.data;
  if(d.type==='ready'){
    workerReady=true; inflight=false; for(const p of pending.values()) p.frame.close(); pending.clear();
    if(!isCam && VW() && (pendingCapture || capturing)) startCapture();
    armCapture(); return;
  }
  if(d.type==='error'){ toast('Pose model failed: '+d.msg, 6000); return; }
  if(d.type==='result') onResult(d);
}

/* ---------- source ---------- */
const vid=$('#vid');
let isCam=false, camStream=null, videoName='', srcURL=null, dur=0;
const VW=()=>vid.videoWidth, VH=()=>vid.videoHeight;
function stopCam(){ if(camStream){ camStream.getTracks().forEach(t=>t.stop()); camStream=null; } isCam=false; }
/* ---------- remember the last video across reloads ---------- */
// The file itself and the selected range live in IndexedDB (localStorage is too small for video).
let restoreSel=null;
const idb=()=>new Promise((res,rej)=>{ const r=indexedDB.open('dance-motion-lab',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
async function kvSet(k,v){ try{ const db=await idb(); await new Promise((res,rej)=>{ const tx=db.transaction('kv','readwrite'); tx.objectStore('kv').put(v,k); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }catch(e){ console.warn('could not save',k,e); } }
async function kvGet(k){ try{ const db=await idb(); return await new Promise((res,rej)=>{ const r=db.transaction('kv').objectStore('kv').get(k); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }catch(e){ return undefined; } }
async function restoreLast(){
  const v=await kvGet('video'); if(!v || !v.blob) return;
  restoreSel=(await kvGet('sel')) || null;
  toast('Restoring your last video…');
  loadVideo(URL.createObjectURL(v.blob), v.name);
}
function loadVideo(url,name,blob){
  if(blob){ kvSet('video',{blob,name}); kvSet('sel',null); restoreSel=null; }   // a newly opened file replaces the remembered one
  stopCam(); vid.srcObject=null; srcURL=url;
  videoName=(name||'video').replace(/\.[^.]+$/,'').slice(0,60);
  vid.loop=false; vid.src=url; vid.load();
  vid.onloadedmetadata=onSourceReady;
}
async function openCamera(){
  try{
    stopCam(); stopAnim();
    camStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
    isCam=true; videoName='camera'; srcURL=null; vid.removeAttribute('src'); vid.srcObject=camStream;
    setCtrl('mirror',true); readAll(); save();
    vid.onloadedmetadata=onSourceReady;
  }catch(e){ toast('Camera unavailable: '+(e.message||e), 5000); }
}
function onSourceReady(){
  RS.VW=VW(); RS.VH=VH();
  resetData();
  $('#empty').style.display='none';
  $('#timeline').className = isCam ? 'cam' : '';
  $('#fname').textContent = isCam ? 'Camera' : videoName;
  const ar=VW()/VH(), mh=Math.min(180, 260/ar), mw=Math.round(mh*ar);   // keep the source monitor small for any aspect
  $('#srcCard').classList.add('has'); $('#srcCard').style.display='flex'; $('#srcCard').style.width=Math.max(232,mw+28)+'px'; $('#monitor').style.width=mw+'px';
  $('#srcCard').classList.remove('collapsed'); setMonToggle();
  $('#srcPlay').style.display = isCam ? 'none' : ''; $('#capRow').style.display = isCam ? 'none' : '';   // camera: no playback, no capture speed
  if(!worker) initWorker();
  if(isCam){ camMode='live'; vid.play().catch(()=>{}); armCapture(); }
  else {
    dur=vid.duration;
    const rs=restoreSel; restoreSel=null;
    sel = rs && rs.b<=dur+.05 && rs.b-rs.a>=.3 ? {a:rs.a,b:rs.b} : {a:0, b:Math.min(dur,6)};
    thumbs=[]; act=null; startScan();
    startCapture();
  }
  requestAnimationFrame(sizeTL); schedule();
}
$('#file').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) loadVideo(URL.createObjectURL(f), f.name, f); e.target.value=''; });
$('#camBtn').onclick=openCamera;
const stage=$('#stage');
stage.addEventListener('dragover', e=>{ e.preventDefault(); stage.classList.add('drag'); });
stage.addEventListener('dragleave', e=>{ if(e.target===stage) stage.classList.remove('drag'); });
stage.addEventListener('drop', e=>{ e.preventDefault(); stage.classList.remove('drag'); const f=e.dataTransfer.files[0]; if(f && f.type.startsWith('video')) loadVideo(URL.createObjectURL(f), f.name, f); });
function setMonToggle(){ $('#monBtn').textContent = $('#srcCard').classList.contains('collapsed') ? 'Show' : 'Hide'; }
$('#monBtn').onclick=()=>{ $('#srcCard').classList.toggle('collapsed'); setMonToggle(); };
// ?src= is fetched to a blob: simple static servers often lack Range support, which breaks seeking
const qsrc=new URLSearchParams(location.search).get('src');
if(qsrc){ fetch(qsrc).then(r=>r.blob()).then(b=>loadVideo(URL.createObjectURL(b), qsrc.split('/').pop())).catch(()=>toast('Could not load '+qsrc)); }
else restoreLast();

/* ---------- capture (frames flow while the video plays) ---------- */
let crop=null, armed=false;
const fullRect=()=>({x:0,y:0,w:VW(),h:VH()});
function captureRect(){
  if(!S.autocrop || !crop) return fullRect();
  const r={x:Math.round(crop.x),y:Math.round(crop.y),w:Math.round(crop.w),h:Math.round(crop.h)};
  return r.w>8&&r.h>8 ? r : fullRect();
}
function updateCrop(lmV){
  const full=fullRect(); let target=full;
  if(lmV){
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const p of lmV){ if(p.v<.3) continue; x0=Math.min(x0,p.x); y0=Math.min(y0,p.y); x1=Math.max(x1,p.x); y1=Math.max(y1,p.y); }
    if(isFinite(x0)){
      const m=Math.max(x1-x0,y1-y0)*.35, minS=Math.max(full.w,full.h)*.22;
      let cx=(x0+x1)/2, cy=(y0+y1)/2, w=Math.max(x1-x0+2*m,minS), h=Math.max(y1-y0+2*m,minS);
      const a=full.w/full.h; if(w/h<a) w=h*a; else h=w/a;   // keep aspect: model input size must stay constant
      if(w>full.w){ w=full.w; h=full.h; }
      target={x:clamp(cx-w/2,0,full.w-w), y:clamp(cy-h/2,0,full.h-h), w, h};
    }
  }
  const k = lmV ? .35 : .5;
  if(!crop) crop={...full};
  for(const key of ['x','y','w','h']) crop[key]+= (target[key]-crop[key])*k;
  const box=$('#cropBox');
  if(S.autocrop){ Object.assign(box.style,{display:'',left:crop.x/full.w*100+'%',top:crop.y/full.h*100+'%',width:crop.w/full.w*100+'%',height:crop.h/full.h*100+'%'}); }
  else box.style.display='none';
}
const needFrames = () => isCam ? (camMode==='live'||camMode==='rec') : capturing;
function armCapture(){ if(armed || !vid.requestVideoFrameCallback) return; armed=true; vid.requestVideoFrameCallback(onFrame); }
async function onFrame(now, meta){
  armed=false; armCapture();
  if(!isCam) tick(meta.mediaTime);
  if(!workerReady || inflight || !needFrames() || !VW()) return;
  const t = isCam ? now/1000 : meta.mediaTime;
  if(!isCam && (t < take.a-0.02 || t > take.b+0.02)) return;
  inflight=true;
  try{
    const rect=captureRect();
    const L=Math.max(VW(),VH()), km=+S.mres/L, kf=+S.res/L;  // fixed output sizes
    // MediaPipe's CPU segmentation aborts unless the input width is a multiple of 4 → snap to 8
    const r8 = v => Math.max(8, Math.round(v/8)*8);
    const [bm, fb] = await Promise.all([
      createImageBitmap(vid, rect.x,rect.y,rect.w,rect.h, {resizeWidth:r8(VW()*km), resizeHeight:r8(VH()*km)}),
      createImageBitmap(vid, rect.x,rect.y,rect.w,rect.h, {resizeWidth:Math.round(VW()*kf), resizeHeight:Math.round(VH()*kf), resizeQuality:'high'}),
    ]);
    const id=++fid; pending.set(id,{t,rect,frame:fb,gen});
    worker.postMessage({type:'frame', bitmap:bm, ts:isCam?now:t*1000, id}, [bm]);
  }catch(e){ inflight=false; }
}

/* ---------- takes ---------- */
let sel={a:0,b:0}, take=null, capturing=false, seekingCap=false, buffer=[], camMode='live', lastCapT=0;
const stats={n:0, fps:0, since:performance.now()};
function release(s){ s.frame?.close(); s.mask?.close(); s.cut?.close(); s.frame=s.mask=s.cut=null; }
function releaseTake(){ if(take){ for(const s of take.samples) release(s); } take=null; }
function clearBuffer(){ for(const s of buffer) release(s); buffer=[]; }
function resetData(){ releaseTake(); clearBuffer(); crop=null; capturing=false; seekingCap=false; liveBB=null; stopAnim(); gen++; }
function evictBuffer(){ const last=buffer.at(-1); while(buffer.length && (buffer.length>400 || buffer[0].t < last.t - S.camSec)) release(buffer.shift()); }

async function startCapture(){
  if(isCam || !VW()) return;
  kvSet('sel',{a:sel.a,b:sel.b});                // remember the range for the next reload
  if(!workerReady){ pendingCapture=true; releaseTake(); take={a:sel.a,b:sel.b,samples:[],complete:false}; schedule(); return; }
  pendingCapture=false; stopAnim();
  releaseTake(); gen++; crop=null; liveBB=null;
  take={a:sel.a, b:sel.b, samples:[], complete:false};
  capturing=false; seekingCap=true; lastCapT=sel.a;
  vid.pause(); vid.currentTime=sel.a;
  await once(vid,'seeked');
  if(!take || take.a!==sel.a) return;            // superseded by a newer selection
  seekingCap=false; capturing=true;
  vid.playbackRate=S.capSpeed; armCapture();
  if(document.hidden) pausedByHide=true; else vid.play().catch(()=>{});
  schedule();
}
function finishCapture(){
  if(!capturing) return;
  capturing=false; take.complete=true; take.bb=boundsOf(take.samples.filter(s=>s.frame));
  vid.playbackRate=1; vid.pause(); vid.currentTime=sel.a;   // the source rests at the start; the timeline play button runs the preview
  toast(take.samples.length ? `Take ready · ${take.samples.length} frames` : 'No dancer found in this selection');
  schedule(); dirtyTL=true;
}
function tick(t){               // keep playback inside the selection
  if(isCam || !VW() || seekingCap) return;
  if(capturing){ if(t>=take.b-0.02) finishCapture(); return; }
  if(t>=sel.b || t<sel.a-0.08){ vid.currentTime=sel.a; }
}
vid.addEventListener('timeupdate',()=>{
  // render loop stalled (hidden pane/tab) → frames aren't reaching the model; pause the capture
  if(capturing && !vid.paused && performance.now()-lastRaf>300){ vid.pause(); pausedByHide=true; return; }
  if(!isCam) tick(vid.currentTime); dirtyTL=true;
});
vid.addEventListener('ended',()=>{ if(isCam) return; if(capturing) finishCapture(); vid.currentTime=sel.a; vid.play().catch(()=>{}); });
vid.addEventListener('play',()=>{ armCapture(); updateSrcBtn(); });
vid.addEventListener('pause',updateSrcBtn);
// hidden pages get no video-frame callbacks: pause a capture instead of finishing it empty
let pausedByHide=false;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ if(capturing && !vid.paused){ vid.pause(); pausedByHide=true; } }
  else if(pausedByHide){ pausedByHide=false; if(capturing) vid.play().catch(()=>{}); }
});

let cutC=null;
async function onResult(d){
  inflight=false;
  const p=pending.get(d.id); pending.delete(d.id);
  if(!p) return;
  if(d.error){
    p.frame.close(); console.warn('pose worker error', d.error); worker.terminate(); worker=null;
    if(++crashCount>3){ workerReady=false; toast('Pose model keeps crashing on this video — try another “Model input” size in Tracking', 8000); return; }
    initWorker(); return;
  }
  crashCount=0;
  stats.n++; const now=performance.now(); if(now-stats.since>1000){ stats.fps=stats.n*1000/(now-stats.since); stats.n=0; stats.since=now; }
  if(!d.lm || p.gen!==gen){ p.frame.close(); if(!d.lm) updateCrop(null); return; }
  const {rect}=p, lm=[];
  for(let i=0;i<33;i++) lm.push({x:rect.x+d.lm[i*3]*rect.w, y:rect.y+d.lm[i*3+1]*rect.h, v:d.lm[i*3+2]});
  updateCrop(lm);
  const s={t:p.t, rect, lm, frame:p.frame, mask:null, cut:null, grid:d.grid||null, gw:d.gw, gh:d.gh, rings:null};
  if(d.mask){
    s.mask = await createImageBitmap(new ImageData(d.mask, d.mw, d.mh));
    const fw=s.frame.width, fh=s.frame.height;
    if(!cutC) cutC=document.createElement('canvas');
    if(cutC.width!==fw||cutC.height!==fh){ cutC.width=fw; cutC.height=fh; }
    const cx=cutC.getContext('2d'); cx.globalCompositeOperation='copy'; cx.drawImage(s.frame,0,0);
    cx.globalCompositeOperation='destination-in'; cx.drawImage(s.mask,0,0,fw,fh); cx.globalCompositeOperation='source-over';
    s.cut = await createImageBitmap(cutC);
  }
  if(p.gen!==gen){ release(s); return; }
  if(isCam){
    if(camMode==='rec' && take){ take.samples.push(s); if(s.t>=take.b){ camMode='take'; take.complete=true; take.bb=boundsOf(take.samples); clearBuffer(); toast(`Take ready · ${take.samples.length} frames`); } }
    else if(camMode==='live'){ buffer.push(s); evictBuffer(); }
    else release(s);
  } else {
    if(!take || s.t<take.a-0.03 || s.t>take.b+0.03){ release(s); return; }
    const arr=take.samples; arr.push(s); if(arr.length>1 && arr[arr.length-2].t>s.t) arr.sort((a,b)=>a.t-b.t);
    lastCapT=Math.max(lastCapT,s.t);
    if(take.complete) take.bb=boundsOf(arr);
    dirtyTL=true;
  }
  schedule();
}
function shown(){ return take && take.samples.length ? take.samples : (isCam ? buffer : []); }

/* ---------- camera record ---------- */
$('#recBtn').onclick=async ()=>{
  if(!isCam || camMode==='count' || camMode==='rec') return;
  releaseTake(); stopAnim(); camMode='count';
  const cd=$('#countdown'); cd.style.display='flex';
  for(const n of [3,2,1]){ cd.textContent=n; await new Promise(r=>setTimeout(r,800)); }
  cd.style.display='none';
  gen++; const t0=performance.now()/1000;
  take={a:t0, b:t0+S.camSec, samples:[], complete:false}; camMode='rec'; liveBB=null; schedule();
};
$('#liveBtn').onclick=()=>{ if(!isCam) return; releaseTake(); camMode='live'; gen++; schedule(); };

/* ---------- timeline ---------- */
const tl=$('#tl'); let thumbs=[], act=null, actStep=.25, scanGen=0, scanning=false, dirtyTL=true, tlDrag=null;
function sizeTL(){ const r=tl.getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1); if(r.width<10) return; tl.width=Math.round(r.width*dpr); tl.height=Math.round(r.height*dpr); dirtyTL=true; }
new ResizeObserver(sizeTL).observe(tl);
const tToX = t => t/dur*tl.width, xToT = x => clamp(x/tl.width*dur, 0, dur);
async function startScan(){
  const g=++scanGen; scanning=true;
  const sv=document.createElement('video'); sv.muted=true; sv.preload='auto'; sv.src=srcURL;
  try{
    await once(sv,'loadeddata');
    const D=sv.duration, step=Math.max(.2, D/360), n=Math.ceil(D/step); actStep=step;
    const a=new Float32Array(n); act=a;
    const aw=48, ah=Math.max(8,Math.round(48*sv.videoHeight/sv.videoWidth));
    const sc=document.createElement('canvas'); sc.width=aw; sc.height=ah; const sx=sc.getContext('2d',{willReadFrequently:true});
    const nThumb=Math.max(8,Math.min(40,Math.ceil(D/1.5))); let prev=null, nextThumb=0;
    for(let i=0;i<n;i++){
      if(g!==scanGen) return;
      const t=Math.min(D-0.01, i*step); sv.currentTime=t; await once(sv,'seeked');
      sx.drawImage(sv,0,0,aw,ah); const d=sx.getImageData(0,0,aw,ah).data, gray=new Uint8Array(aw*ah); let diff=0;
      for(let j=0;j<gray.length;j++){ gray[j]=(d[j*4]+d[j*4+1]*2+d[j*4+2])>>2; if(prev) diff+=Math.abs(gray[j]-prev[j]); }
      a[i]=prev?diff/gray.length:0; prev=gray;
      if(t>=nextThumb*D/nThumb){ thumbs.push({t, bmp: await createImageBitmap(sv,{resizeHeight:96, resizeWidth:Math.max(8,Math.round(96*sv.videoWidth/sv.videoHeight))})}); nextThumb++; }
      if(i%5===0) dirtyTL=true;
    }
    if(n>1) a[0]=a[1];
  } finally { if(g===scanGen) scanning=false; sv.removeAttribute('src'); sv.load(); dirtyTL=true; }
}
function cssVar(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function drawTL(){
  if(isCam || !dur || !tl.width) return;
  const c=tl.getContext('2d'), W=tl.width, H=tl.height, dpr=W/tl.getBoundingClientRect().width;
  const ac=cssVar('--ac'), ok=cssVar('--ok'), onAc=cssVar('--on-ac')||'#fff';
  c.clearRect(0,0,W,H); c.fillStyle=cssVar('--panel2'); c.fillRect(0,0,W,H);
  if(thumbs.length){ const tw=H*VW()/VH();
    for(let x=0;x<W;x+=tw){ const t=xToT(x+tw/2); let best=thumbs[0]; for(const th of thumbs) if(Math.abs(th.t-t)<Math.abs(best.t-t)) best=th; c.drawImage(best.bmp,x,0,tw,H); } }
  if(act){ let mxv=0; for(const v of act) mxv=Math.max(mxv,v); mxv=mxv||1;
    c.beginPath(); c.moveTo(0,H);
    for(let i=0;i<act.length;i++){ const v=(act[Math.max(0,i-1)]+act[i]+act[Math.min(act.length-1,i+1)])/3; c.lineTo(tToX(i*actStep), H-(v/mxv)*H*.55); }
    c.lineTo(tToX((act.length-1)*actStep),H); c.closePath();
    c.save(); c.globalAlpha=.16; c.fillStyle=ac; c.fill(); c.restore(); c.strokeStyle=ac; c.lineWidth=1.2*dpr; c.stroke(); }
  const ax=tToX(sel.a), bx=tToX(sel.b);
  c.fillStyle='rgba(0,0,0,.6)'; c.fillRect(0,0,ax,H); c.fillRect(bx,0,W-bx,H);
  if(take && !isCam){ const end = take.complete ? sel.b : clamp(lastCapT,sel.a,sel.b);
    c.fillStyle = take.complete ? ok : ac; c.fillRect(ax, H-4*dpr, tToX(end)-ax, 4*dpr); }
  c.strokeStyle=ac; c.lineWidth=2*dpr; c.strokeRect(ax+dpr, dpr, bx-ax-2*dpr, H-2*dpr);
  c.fillStyle=ac; c.fillRect(ax,0,bx-ax,10*dpr);                       // grab bar: drag it to move the whole range
  c.fillStyle=onAc; for(let i=-2;i<=2;i++) c.fillRect((ax+bx)/2+i*7*dpr-dpr,3.5*dpr,2*dpr,3*dpr);
  for(const x of [ax,bx]){ c.fillStyle=ac; c.fillRect(x-4*dpr,0,8*dpr,H); c.fillStyle=onAc; c.fillRect(x-.75*dpr,H*.32,1.5*dpr,H*.36); }
  const pos = (anim.on || anim.pos!=null) && !isCam ? momentTime() : vid.currentTime;   // the playhead follows the shown moment
  const px=tToX(pos); c.fillStyle='#fff'; c.fillRect(px-dpr,0,2*dpr,H);
  if(scanning){ c.fillStyle='rgba(255,255,255,.75)'; c.font=`${10*dpr}px Inter,sans-serif`; c.textAlign='right'; c.fillText('scanning…',W-6*dpr,12*dpr); }
  $('#tlSel').innerHTML = `Selection <b>${fmtT(sel.a)} – ${fmtT(sel.b)}</b> · ${(sel.b-sel.a).toFixed(1)} s`;
  $('#tlTime').textContent = `${fmtT(pos)} / ${fmtT(dur)}`;
}
tl.title='Click or drag inside the selection to pick a moment · drag the orange top bar to move the range · drag the edges to resize';
function tlZone(e){
  const k=tl.width/tl.clientWidth, x=e.offsetX*k, ax=tToX(sel.a), bx=tToX(sel.b);
  const g=Math.min(10*k, (bx-ax)/4);                // edge grab zones shrink on a short selection, so its middle stays scrubbable
  if(Math.abs(x-ax)<g) return 'a';
  if(Math.abs(x-bx)<g) return 'b';
  if(x>ax && x<bx) return e.offsetY<12 ? 'move' : 'scrub';
  return 'new';
}
tl.addEventListener('pointermove', e=>{
  if(tlDrag){ onTLDrag(e); return; }
  const z=tlZone(e); tl.style.cursor = z==='a'||z==='b' ? 'ew-resize' : z==='move' ? 'grab' : z==='scrub' ? 'pointer' : 'crosshair';
});
tl.addEventListener('pointerdown', e=>{
  if(!dur) return;
  const t=xToT(e.offsetX*tl.width/tl.clientWidth), mode=tlZone(e);
  tlDrag={mode, t0:t, a0:sel.a, b0:sel.b, moved:false};
  try{ tl.setPointerCapture(e.pointerId); }catch(_){}
  if(mode==='scrub'){ if(!capturing) scrubToTime(t); return; }
  if(!capturing) vid.pause();
});
function onTLDrag(e){
  const t=xToT(e.offsetX*tl.width/tl.clientWidth), d=tlDrag, MIN=.4;
  if(d.mode==='scrub'){ if(!capturing) scrubToTime(t); return; }
  if(Math.abs(t-d.t0)>dur*.003) d.moved=true;
  if(!d.moved) return;
  if(d.mode==='a') sel.a=clamp(t,0,sel.b-MIN);
  else if(d.mode==='b') sel.b=clamp(t,sel.a+MIN,dur);
  else if(d.mode==='move'){ const len=d.b0-d.a0, a=clamp(d.a0+t-d.t0,0,dur-len); sel={a,b:a+len}; }
  else { sel={a:Math.min(d.t0,t), b:Math.max(d.t0,t)}; if(sel.b-sel.a<MIN) sel.b=Math.min(dur,sel.a+MIN); }
  vid.currentTime = d.mode==='b' ? sel.b : sel.a;   // scrub preview in the source monitor
  dirtyTL=true;
}
tl.addEventListener('pointerup', e=>{
  const d=tlDrag; tlDrag=null; if(!d || d.mode==='scrub') return;
  if(!d.moved){
    if(d.mode==='new'){ const len=sel.b-sel.a, a=clamp(d.t0,0,dur-len); sel={a,b:a+len}; startCapture(); }   // click outside: move the range there
  } else startCapture();
  dirtyTL=true;
});

/* ---------- poster gestures ---------- */
const cv=$('#cv'); let pDrag=null;
cv.addEventListener('pointerdown', e=>{ if(e.button!==0) return; pDrag={x:e.clientX,y:e.clientY,ox:S.ox,oy:S.oy}; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); });
cv.addEventListener('pointermove', e=>{ if(!pDrag) return; const r=cv.getBoundingClientRect();
  setCtrl('ox', clamp(pDrag.ox+(e.clientX-pDrag.x)/r.width,-.6,.6)); setCtrl('oy', clamp(pDrag.oy+(e.clientY-pDrag.y)/r.height,-.6,.6)); readAll(); schedule(); });
cv.addEventListener('pointerup', ()=>{ pDrag=null; cv.classList.remove('grabbing'); save(); });
cv.addEventListener('wheel', e=>{ e.preventDefault(); setCtrl('cscale', clamp(S.cscale*Math.exp(-e.deltaY*.0015),.2,3)); readAll(); save(); schedule(); }, {passive:false});
cv.addEventListener('dblclick', ()=>$('#resetFrame').click());

/* ---------- keyboard ---------- */
window.addEventListener('keydown', e=>{
  if(e.target.matches('input,textarea,select') || e.metaKey || e.ctrlKey) return;
  const k=e.key;
  if(k===' '){ e.preventDefault(); $('#playBtn').click(); }
  else if(k==='i'||k==='I'){ if(!isCam && vid.currentTime<sel.b-.4){ sel.a=vid.currentTime; startCapture(); } }
  else if(k==='o'||k==='O'){ if(!isCam && vid.currentTime>sel.a+.4){ sel.b=vid.currentTime; startCapture(); } }
  else if(k==='R'){ if(isCam) $('#recBtn').click(); else startCapture(); }      // Shift+R: capture again / record
  else if(k==='r'){ runRand('all'); }
  else if(k==='e'||k==='E'){ runRand('fx'); }
  else if(k==='c'||k==='C'){ runRand('colors'); }
  else if(k==='t'||k==='T'){ runRand('text'); }
  else if(k==='x'||k==='X'){ swapBgFg(); }
  else if(k==='ArrowLeft'||k==='ArrowRight'){                         // step the shown moment by one source frame
    if(isCam || capturing || seekingCap) return;                  // never pause a running capture
    const dt=(k==='ArrowLeft'?-1:1)/30, cur=(anim.on||anim.pos!=null) ? momentTime() : vid.currentTime;
    if(!scrubToTime(cur+dt)){ vid.pause(); vid.currentTime=clamp(vid.currentTime+dt,sel.a,sel.b); } }
  else if(k==='Escape' && (anim.on || anim.pos!=null)){ stopAnim(); }
  else return;
  dirtyTL=true;
});

/* ---------- animation ---------- */
const anim={on:false, t0:0, step:null, pos:null, dur:10};   // pos: paused/scrubbed moment as progress 0…1 (null = finished poster)
function animDims(){ return dimsAt(1); }
// The animation is a replay of the capture: at progress p only the frames "captured so far" are drawn, and the
// framing eases toward their growing bounds exactly like the live preview — so phases, gradient and scale
// re-flow as new frames arrive. step(ft) returns the compose() options for ft seconds into the animation.
function makeRebuild(all){
  const smp=all.filter(s=>s.frame).sort((a,b)=>a.t-b.t);
  const T0=smp[0].t, D=smp[smp.length-1].t-T0, finalBB=boundsOf(smp);
  // The framing eases on a fixed 60 Hz grid and is cached, so playback, pause, scrubbing and export show the same frame.
  const cache=[]; let cacheAct=-1;
  const visAt=p=>{ const cut=T0+p*D; let n=0; while(n<smp.length && smp[n].t<=cut+1e-6) n++; return smp.slice(0,Math.max(1,n)); };
  const targetFor=vis=>vis.length>=smp.length ? finalBB : boundsOf(vis);
  return (ft,final)=>{                             // final: the finished poster
    const act=Math.max(.1,S.adur);
    if(act!==cacheAct){ cache.length=0; cacheAct=act; }
    const vis=visAt(final ? 1 : clamp(ft/act,0,1));
    let bb=finalBB;
    if(!final){
      const k=Math.min(Math.floor(Math.max(0,ft)*60), Math.floor(act*60));
      while(cache.length<=k){
        const i=cache.length, tg=targetFor(visAt(Math.min(1,i/60/act))), pv=cache[i-1];
        cache.push(i ? {x0:pv.x0+(tg.x0-pv.x0)*.12, y0:pv.y0+(tg.y0-pv.y0)*.12, x1:pv.x1+(tg.x1-pv.x1)*.12, y1:pv.y1+(tg.y1-pv.y1)*.12} : {...tg});
      }
      bb=cache[k];
    }
    const o={samples:vis, bb:{...bb}, stride:!final, prog: final ? 1 : clamp(ft/act,0,1)};   // the finished poster uses even picks
    if(S.agrain) o.grainShift=[Math.random()*256, Math.random()*256];
    return o;
  };
}
const animProgress=()=> anim.on ? (((performance.now()-anim.t0)/1000)%S.adur)/S.adur : anim.pos;
function momentTime(){ return sel.a+animProgress()*(sel.b-sel.a); }
function stopAnim(){ anim.on=false; anim.pos=null; anim.step=null; updateAnimBtn(); schedule(); dirtyTL=true; }
// Show one moment of the animation (paused). Used by clicking/dragging the timeline and the arrow keys.
function scrubToTime(t){
  if(isCam || !take || !take.complete || capturing) return false;
  const smp=take.samples.filter(s=>s.frame); if(!smp.length) return false;
  t=clamp(t,sel.a,sel.b);
  if(!anim.step) anim.step=makeRebuild(smp);
  anim.on=false; anim.pos=(t-sel.a)/Math.max(1e-6,sel.b-sel.a);
  vid.pause(); vid.currentTime=Math.min(t,sel.b-.02);     // the source card follows
  updateAnimBtn(); schedule(); dirtyTL=true; return true;
}
// PNG exports what the poster shows: the paused moment, or the finished poster
function exportOptions(samples){
  if(anim.step && (anim.on || anim.pos!=null)){
    const p=Math.min(1,animProgress()), o=anim.step(p*S.adur, p>=.9999); delete o.grainShift; return o;
  }
  return {samples, bb:currentBB(samples)};
}
let playHtml='', momentHtml='';
function updateAnimBtn(){                         // the big timeline button: play / pause the animated preview
  const b=$('#playBtn'); if(!b) return;
  const ready = !!take && take.complete && !capturing, html = anim.on ? PAUSE : PLAY;
  if(html!==playHtml){ b.innerHTML=html; playHtml=html; }
  b.classList.toggle('dis', !ready && !anim.on);
  b.title = anim.on ? 'Pause the preview (Space)' : !ready ? 'The preview is available once the capture is finished' : anim.pos!=null ? 'Resume the preview (Space)' : 'Play the animated preview (Space)';
  const mh=$('#momentHint');
  if(mh){
    const when = isCam ? '' : ` <b>${fmtT(momentTime())}</b>`;
    const txt = anim.on ? 'Exports the frame shown on the poster. Pause to pick the exact moment.'
      : anim.pos!=null ? `Exports the paused moment${when} · <button class="lnk" id="momentOff">use the finished poster</button>`
      : 'Exports the finished poster. Pause the preview or click the timeline to export a single moment.';
    if(txt!==momentHtml){ mh.innerHTML=txt; momentHtml=txt; }
  }
}
$('#momentHint').addEventListener('click', e=>{ if(e.target.id==='momentOff') stopAnim(); });
$('#playBtn').onclick=()=>{
  if(anim.on){                                     // pause: freeze the poster at this moment
    const p=animProgress(); anim.on=false; anim.pos=p;
    if(!isCam) vid.currentTime=Math.min(sel.a+p*(sel.b-sel.a), sel.b-.02);
    updateAnimBtn(); schedule(); dirtyTL=true; return;
  }
  const smp = take && take.complete ? take.samples.filter(s=>s.frame) : [];
  if(!smp.length){ toast(isCam ? 'Record a take first' : 'The preview is available once the capture is finished'); return; }
  if(!isCam) vid.pause();
  if(!anim.step) anim.step=makeRebuild(smp);
  const from = anim.pos!=null && anim.pos<.999 ? anim.pos : 0;      // resume where it was paused
  anim.t0=performance.now()-from*S.adur*1000; anim.pos=null; anim.on=true; anim.dur=S.adur;
  updateAnimBtn(); schedule(); dirtyTL=true;
};
function updateSrcBtn(){ const b=$('#srcPlay'); if(b) b.innerHTML = vid.paused ? PLAY : PAUSE; }
$('#srcPlay').onclick=()=>{                       // the source video has its own play button
  if(isCam || capturing || seekingCap) return;
  if(vid.paused){
    if(anim.on || anim.pos!=null) stopAnim();
    if(vid.currentTime<sel.a-.05 || vid.currentTime>=sel.b-.05) vid.currentTime=sel.a;
    vid.play().catch(()=>{}); schedule();
  } else vid.pause();
};
updateSrcBtn(); updateAnimBtn();
async function exportMP4(){
  const samples=shown().filter(s=>s.frame); if(!samples.length){ toast('Capture a take first'); return; }
  if(!window.VideoEncoder || !window.VideoFrame || !window.Mp4Muxer) return exportWebM(samples);
  const btn=$('#mp4Btn'), prog=$('#animProg'), bar=prog.firstElementChild;
  const [W,H]=animDims(), fps=30, N=Math.round(S.adur*fps), bitrate=Math.round(W*H*fps*.2);
  const step=makeRebuild(samples);
  btn.disabled=true; prog.style.display='block'; await loadFont();
  try{
    let codec=null;
    for(const cdc of ['avc1.640033','avc1.640028','avc1.4d0033','avc1.42003e']){
      try{ const s=await VideoEncoder.isConfigSupported({codec:cdc,width:W,height:H,bitrate,framerate:fps}); if(s.supported){ codec=cdc; break; } }catch(e){}
    }
    if(!codec) throw new Error(`H.264 is not supported for ${W}×${H}`);
    const muxer=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(), video:{codec:'avc',width:W,height:H}, fastStart:'in-memory'});
    let err=null;
    const enc=new VideoEncoder({output:(ch,meta)=>muxer.addVideoChunk(ch,meta), error:e=>{err=e;}});
    enc.configure({codec,width:W,height:H,bitrate,framerate:fps});
    const c=document.createElement('canvas'); c.width=W; c.height=H; const ctx=c.getContext('2d');
    for(let i=0;i<N;i++){
      if(err) throw err;
      compose(ctx,W,H,step(i/fps, i===N-1));
      const vf=new VideoFrame(c,{timestamp:Math.round(i*1e6/fps), duration:Math.round(1e6/fps)});
      enc.encode(vf,{keyFrame:i%fps===0}); vf.close();
      while(enc.encodeQueueSize>6) await new Promise(r=>setTimeout(r,2));
      if(i%3===0){ btn.textContent=`Exporting ${Math.round(i/N*100)}%`; bar.style.width=(i/N*100)+'%'; await new Promise(r=>setTimeout(r,0)); }
    }
    await enc.flush(); if(err) throw err;
    muxer.finalize();
    download(new Blob([muxer.target.buffer],{type:'video/mp4'}), fname('mp4'));
    toast(`MP4 saved · ${W}×${H} · ${S.adur} s`);
  }catch(e){ toast('MP4 export failed: '+(e.message||e), 6000); }
  finally{ btn.disabled=false; btn.textContent='Export MP4'; prog.style.display='none'; bar.style.width='0'; }
}
async function exportWebM(samples){
  if(!window.MediaRecorder){ toast('Video export is not supported in this browser'); return; }
  const [W,H]=animDims(), fps=30, N=Math.round(S.adur*fps), step=makeRebuild(samples);
  const c=document.createElement('canvas'); c.width=W; c.height=H; const ctx=c.getContext('2d');
  const mime=['video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  const rec=new MediaRecorder(c.captureStream(fps),{mimeType:mime,videoBitsPerSecond:12e6}), chunks=[];
  rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const done=new Promise(r=>rec.onstop=r);
  compose(ctx,W,H,step(0)); rec.start();
  for(let i=0;i<N;i++){ compose(ctx,W,H,step(i/fps, i===N-1)); await new Promise(r=>setTimeout(r,1000/fps)); }
  rec.stop(); await done;
  download(new Blob(chunks,{type:'video/webm'}), fname('webm')); toast('WebM saved (MP4 encoder unavailable)');
}
$('#mp4Btn').onclick=exportMP4;

/* ---------- preview ---------- */
let dirty=true, liveBB=null, bbMoving=false;
function schedule(){ dirty=true; }
function currentBB(samples){
  if(take && take.complete && take.bb && samples===take.samples) return take.bb;
  return liveBB || boundsOf(samples);
}
function liveBounds(samples){
  if(take && take.complete && take.bb) { bbMoving=false; return take.bb; }
  if(!samples.length) return null;
  const target=boundsOf(samples); bbMoving=false;
  if(!liveBB){ liveBB={...target}; return {...liveBB}; }
  for(const k of ['x0','y0','x1','y1']){ const d=target[k]-liveBB[k]; if(Math.abs(d)>.5) bbMoving=true; liveBB[k]+=d*.12; }
  return {...liveBB};
}
function renderPreview(now){
  const r=stage.getBoundingClientRect(), pad=48;
  const ratio=+S.fmt;
  let h=r.height-pad, w=h/ratio; if(w>r.width-pad){ w=r.width-pad; h=w*ratio; }
  w=Math.max(50,Math.floor(w)); h=Math.max(50,Math.floor(h));
  const dpr=Math.min(2,devicePixelRatio||1);
  cv.style.width=w+'px'; cv.style.height=h+'px';
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
  RS.VW=VW()||1; RS.VH=VH()||1;
  const samples=shown(), bb=liveBounds(samples);
  const building = samples.length>1 && (isCam ? camMode!=='take' : !!take && !take.complete);   // poster still growing
  let o={samples, bb, stride: building,
    placeholder: !VW() ? '' : isCam ? (camMode==='count'?'':'Step into the frame') : (capturing||seekingCap||pendingCapture ? 'Capturing…' : 'No dancer found — try another selection')};
  if(anim.step){
    if(anim.on) o=anim.step(((now-anim.t0)/1000)%S.adur);
    else if(anim.pos!=null){ o=anim.step(anim.pos*S.adur, anim.pos>=.9999); delete o.grainShift; }   // paused: a still frame
  }
  compose(cv.getContext('2d'), cv.width, cv.height, o); drawGuides(cv.getContext('2d'), cv.width, cv.height);
}
function updatePill(){
  const p=$('#pill'); let txt='NO SOURCE', cls='';
  if(VW()){
    if(isCam){ if(camMode==='live'){txt='● LIVE';cls='live';} else if(camMode==='count'){txt='GET READY';cls='cap';}
      else if(camMode==='rec'){ txt=`● REC ${Math.round(clamp((performance.now()/1000-take.a)/(take.b-take.a),0,1)*100)}%`; cls='cap'; }
      else { txt=`TAKE · ${take?.samples.length||0} frames`; cls='take'; } }
    else if(pendingCapture){ txt='LOADING MODEL'; cls='cap'; }
    else if(capturing||seekingCap){ txt=`CAPTURING ${Math.round(clamp((lastCapT-sel.a)/Math.max(.01,sel.b-sel.a),0,1)*100)}%`; cls='cap'; }
    else if(take){ txt=`TAKE · ${take.samples.length} frames`; cls='take'; }
  }
  if(p.textContent!==txt) p.textContent=txt; p.className=cls;
  updateAnimBtn();
}
let statsMsg='';
function setStats(m){ statsMsg=m; $('#stats').textContent=m; }
setInterval(()=>{ if(workerReady) setStats(stats.fps>0 ? `pose model · ${stats.fps.toFixed(0)} fps` : 'pose model ready'); if(performance.now()-stats.since>1500) stats.fps=0; updatePill(); }, 500);
let lastRaf=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  lastRaf=performance.now();
  if(pausedByHide && capturing && !document.hidden){ pausedByHide=false; vid.play().catch(()=>{}); }
  if(dirtyTL || (!vid.paused && !isCam) || anim.on){ drawTL(); dirtyTL=false; }
  const moving = anim.on || bbMoving || (isCam && camMode!=='take');
  if(!dirty && !moving) return;
  dirty=false; renderPreview(now); updatePill();
}
requestAnimationFrame(loop);
new ResizeObserver(schedule).observe(stage);

/* ---------- image export ---------- */
// Sizes follow the poster Format (Style tab): MP4 is 1080 px wide, PNG is 2× that.
function dimsAt(mult){ const w=1080*mult; return [w, Math.round(w*(+S.fmt)/2)*2]; }
function exportDims(){ return dimsAt(2); }
function updateSizeHint(){ const el=$('#sizeHint'); if(!el) return; const [w1,h1]=dimsAt(1), [w2,h2]=dimsAt(2); el.textContent=`PNG ${w2} × ${h2} px · MP4 ${w1} × ${h1} px`; }
// Saving the same file name again numbers it (name-2.png, name-3.png…) instead of replacing the earlier file.
const SAVED_KEY='dance-motion-lab:saved';
function uniqueName(name){
  let used={}; try{ used=JSON.parse(localStorage.getItem(SAVED_KEY)||'{}'); }catch(e){}
  const n=(used[name]||0)+1; used[name]=n;
  try{ localStorage.setItem(SAVED_KEY, JSON.stringify(used)); }catch(e){}
  return n===1 ? name : name.replace(/(\.[^.]+)$/, `-${n}$1`);
}
function download(blob,name){ name=uniqueName(name); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000); }
const fname = ext => `${(videoName||'poster').replace(/[^\w-]+/g,'-')}-${S.fx}${ext==='mp4'||ext==='webm'?'-anim':''}${ext==='png' && anim.step && (anim.on||anim.pos!=null) && !isCam ? '-'+momentTime().toFixed(1)+'s' : ''}.${ext}`;
const yieldUI = ()=>new Promise(r=>setTimeout(r,30));
$('#pngBtn').onclick=async ()=>{
  const samples=shown().filter(s=>s.frame); if(!samples.length){ toast('Nothing to export yet'); return; }
  const [W,H]=exportDims(); toast(`Rendering PNG ${W}×${H}…`); await yieldUI(); await loadFont();
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  compose(c.getContext('2d'),W,H,exportOptions(samples));
  c.toBlob(b=>{ download(b,fname('png')); toast(`PNG saved · ${W}×${H}`); },'image/png');
};

loadFont().then(schedule);
document.fonts.ready.then(schedule);
window.__dml = { S, get take(){return take}, get sel(){return sel}, set sel(v){sel=v}, startCapture, setCtrl, readAll, onCtrl, get thumbs(){return thumbs}, get act(){return act}, stats };

/* ---------- update notice ---------- */
// The local server reports the newest file version; when it changes, offer a reload (no server restart needed).
function showUpdate(){
  if($('#updBar')) return;
  const b=document.createElement('button'); b.id='updBar'; b.className='btn pri'; b.textContent='Updated · Reload';
  Object.assign(b.style,{position:'fixed',left:'50%',bottom:'18px',transform:'translateX(-50%)',zIndex:20,boxShadow:'0 6px 24px #0006'});
  b.onclick=()=>location.reload(); document.body.appendChild(b);
}
if(location.protocol!=='file:'){
  let base=null;
  const check=async()=>{ try{ const r=await fetch('/__dml',{cache:'no-store'}); if(!r.ok) return; const j=await r.json();
    if(base===null) base=j.version; else if(j.version!==base) showUpdate(); }catch(e){} };
  check(); setInterval(check,2000);
}
