// dm-render.js — poster rendering for Dance Motion Lab (effects, typography, background pattern, compose).
// Pure drawing: the app sets RS.S (settings) and RS.VW/RS.VH (source video size) before calling.
/* global d3 */

export const RS = { S: null, VW: 1, VH: 1 };

export const JOINTS = [
  ['j_wr','Wrists',[15,16],1], ['j_an','Ankles',[27,28],1], ['j_ft','Toes',[31,32],0], ['j_el','Elbows',[13,14],0],
  ['j_kn','Knees',[25,26],0], ['j_hd','Head',[0],0], ['j_hp','Pelvis',['hip'],0],
];
export const FONTS = {
  unbounded:{fam:'Unbounded',wt:800,wb:300}, inter:{fam:'Inter',wt:800,wb:400}, manrope:{fam:'Manrope',wt:800,wb:400},
  oswald:{fam:'Oswald',wt:700,wb:300}, playfair:{fam:'Playfair Display',wt:800,wb:400}, mono:{fam:'JetBrains Mono',wt:700,wb:400},
  helvetica:{fam:'Helvetica',fb:", 'Helvetica Neue', Arial, sans-serif",sys:true,wt:700,wb:400},   // the system face, as in the Swiss school
};
export const isVector = () => RS.S.fx!=='chrono';

// User-uploaded font. The app (dance-motion.js) loads it and keeps `family` pointing at the current FontFace.
export const CUSTOM = { rec:null };              // the uploaded font in use (family, weight, vs, dataURL …), set by the app
const userFont = () => (typeof RS.S.font==='string' && RS.S.font.startsWith('custom:') && CUSTOM.rec) || null;
function fontSpec(){
  const S=RS.S;
  const u=userFont(); if(u) return {fam:u.family, w:u.weight, vs:u.vs, custom:true};
  const f=FONTS[S.font]||FONTS.inter;
  return {fam:f.fam, fb:f.fb||'', w:S.tweight==='light'?f.wb:f.wt, vs:''};
}

const lerp=(a,b,t)=>a+(b-a)*t;
const clamp01=v=>Math.max(0,Math.min(1,v));
const colAt = u => d3.interpolateLab(RS.S.cA, RS.S.cB)(clamp01(u));
function pickEven(arr, n){ if(arr.length<=n) return arr.slice(); const o=[]; for(let i=0;i<n;i++) o.push(arr[Math.round(i*(arr.length-1)/Math.max(1,n-1))]); return o; }
const mx = x => RS.S.mirror ? RS.VW-x : x;

// Phase picking. A finished poster takes evenly spaced frames. While the poster is still being built (F.stride)
// phases are every s-th frame (s = 1, 2, 4, 8 …): they stay put as new frames arrive, and s doubles only when the
// take outgrows the phase count, so every other phase drops out. The newest frame always leads.
function pickBuild(F, arr, n){
  const L=arr.length;
  if(!F.stride || L<=n) return pickEven(arr,n);
  let s=1; while(Math.floor((L-1)/s)+1>n) s*=2;
  const out=[]; for(let i=0;i<L;i+=s) out.push(arr[i]);
  if((L-1)%s) out.push(arr[L-1]);
  return out;
}

export function boundsOf(arr){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const s of arr) for(const p of s.lm){ if(p.v<.5) continue; const x=mx(p.x); x0=Math.min(x0,x); y0=Math.min(y0,p.y); x1=Math.max(x1,x); y1=Math.max(y1,p.y); }
  if(!isFinite(x0)) return {x0:0,y0:0,x1:RS.VW||1,y1:RS.VH||1};
  const pad=Math.max(x1-x0,y1-y0)*.08;
  return {x0:x0-pad,y0:y0-pad,x1:x1+pad,y1:y1+pad};
}
export function layout(W,H,BB){
  // fixed inset for fitting the figure: the Margins setting only affects text
  const S=RS.S, m=.06*W, bw=Math.max(1,BB.x1-BB.x0), bh=Math.max(1,BB.y1-BB.y0);
  const s=Math.min((W-2*m)/bw,(H-2*m)/bh)*S.scale*(S.cscale??1);
  const cx=W/2+S.ox*W, cy=H/2+S.oy*H;
  return { s, tx:cx-(BB.x0+bw/2)*s, ty:cy-(BB.y0+bh/2)*s };
}
// spread distances grow with the composition scale, not with the figure size
const spread = (u,W,H)=>{ const k=RS.S.cscale??1; return [(u-.5)*RS.S.spx*W*k, (u-.5)*RS.S.spy*H*k]; };
const mapPt = (L,x,y,off)=>[mx(x)*L.s+L.tx+off[0], y*L.s+L.ty+off[1]];
// First frame scale: the oldest phase is drawn at `fscale`, easing to 1 at the newest one; each phase scales around its own hips
const scaleAt = u => lerp(RS.S.fscale ?? 1, 1, u);
function anchorOf(s){
  const a=s.lm?.[23], b=s.lm?.[24];
  if(a&&b&&a.v>.4&&b.v>.4) return [(a.x+b.x)/2,(a.y+b.y)/2];
  const r=s.rect; return r ? [r.x+r.w/2, r.y+r.h/2] : [RS.VW/2,(RS.VH||0)/2];
}
export function drawSampleImg(ctx,L,img,rect,off,k=1,anchor=null){
  ctx.save(); ctx.translate(L.tx+off[0],L.ty+off[1]); ctx.scale(L.s,L.s);
  if(RS.S.mirror){ ctx.translate(RS.VW,0); ctx.scale(-1,1); }
  if(k!==1 && anchor){ ctx.translate(anchor[0],anchor[1]); ctx.scale(k,k); ctx.translate(-anchor[0],-anchor[1]); }
  ctx.drawImage(img,rect.x,rect.y,rect.w,rect.h); ctx.restore();
}
const layerPool=[];
function layerFor(ctx,depth){
  const W=ctx.canvas.width, H=ctx.canvas.height;
  let lc=layerPool[depth]; if(!lc) lc=layerPool[depth]=document.createElement('canvas');
  if(lc.width!==W||lc.height!==H){ lc.width=W; lc.height=H; }
  const lx=lc.getContext('2d'); lx.setTransform(1,0,0,1,0,0); lx.globalAlpha=1; lx.globalCompositeOperation='source-over'; lx.clearRect(0,0,W,H);
  return [lc,lx];
}
let tintC=null;
function tinted(img,color){
  if(!tintC) tintC=document.createElement('canvas');
  if(tintC.width!==img.width||tintC.height!==img.height){ tintC.width=img.width; tintC.height=img.height; }
  const c=tintC.getContext('2d'); c.globalCompositeOperation='copy'; c.drawImage(img,0,0);
  c.globalCompositeOperation='source-in'; c.fillStyle=color; c.fillRect(0,0,img.width,img.height); c.globalCompositeOperation='source-over';
  return tintC;
}

/* ---------- raster effects ---------- */
// F: frame context {SM, W, H, L, BB, u(s), vis(s), fade(s), uT(t), visT(t), fadeT(t)}
function fxChrono(ctx,F){
  const S=RS.S;
  const ph = pickBuild(F, F.SM.filter(s=>s.mask), S.phases).filter(F.vis);
  if(S.rev) ph.reverse();
  for(const smp of ph){
    const u=F.u(smp);
    ctx.save(); ctx.globalAlpha=lerp(S.aS,S.aE,u)*F.fade(smp); ctx.globalCompositeOperation=S.blend;
    drawSampleImg(ctx,F.L,phaseImg(ctx,smp,u),smp.rect,spread(u,F.W,F.H),scaleAt(u),anchorOf(smp));
    ctx.restore();
  }
}
// Trails, Sweep and Contours draw lines only, so the newest frame of the sequence is shown on top of them: it is where the
// lines come from. While the poster builds it is the frame at the head of the animation, on the finished poster the last one.
function drawLatest(ctx,F,blend){
  const S=RS.S; if(!S.latest) return;
  const smp=F.SM[F.SM.length-1]; if(!smp || !smp.mask) return;
  const u=F.u(smp);
  ctx.save(); ctx.globalAlpha=S.lfA*F.fade(smp); ctx.globalCompositeOperation=blend;
  drawSampleImg(ctx,F.L,phaseImg(ctx,smp,u),smp.rect,spread(u,F.W,F.H));
  ctx.restore();
}
function phaseImg(ctx,smp,u){            // silhouette tinted A→B, photo, or B&W photo
  const S=RS.S;
  if(S.cstyle==='sil') return tinted(smp.mask,colAt(u));
  if(S.cstyle==='mono') ctx.filter='grayscale(1) contrast(1.25)';
  return smp.cut;
}

/* ---------- vector effects (display list) ---------- */
// item: {paths:[[ [x,y],... ]], closed, curve, stroke, fill, w, a, fa} | {circle:[x,y,r], ...} | {group:[items], a}
const jointPos = (lm,j)=> j==='hip' ? (lm[23].v>.4&&lm[24].v>.4 ? {x:(lm[23].x+lm[24].x)/2,y:(lm[23].y+lm[24].y)/2,v:1}:null) : (lm[j].v>.4?lm[j]:null);
function catmull(p0,p1,p2,p3,t){ const t2=t*t,t3=t2*t; return [0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3)); }
const BONES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32],[15,19],[16,20],[27,29],[28,30]];

function fxTraj(F){
  const S=RS.S, {SM,L,W,H}=F, items=[], lines=[], lwU=W/1000;
  const tAt = fi => { const i=Math.floor(fi), j=Math.min(SM.length-1,i+1); return lerp(SM[i].t, SM[j].t, fi-i); };
  const joints = JOINTS.filter(([k])=>S[k]).flatMap(([,,js])=>js);
  const series = joints.map(j=>SM.map((s,i)=>{ const p=jointPos(s.lm,j); return p?{x:p.x,y:p.y,i}:null; }));
  const runsAll=[];
  for(const ser of series){ let run=[]; const flush=()=>{ if(run.length>1) runsAll.push(run); run=[]; };
    for(const p of ser){ if(p) run.push(p); else flush(); } flush(); }
  const w=S.smooth;
  for(const run of runsAll){ const sm=run.map((p,i)=>{ let sx=0,sy=0,c=0; for(let k=-w;k<=w;k++){ const q=run[i+k]; if(q){sx+=q.x;sy+=q.y;c++;} } return {x:sx/c,y:sy/c,i:p.i}; }); run.splice(0,run.length,...sm); }
  const sp=[]; for(const run of runsAll) for(let i=1;i<run.length;i++){ const d=Math.hypot(run[i].x-run[i-1].x,run[i].y-run[i-1].y)/Math.max(1,run[i].i-run[i-1].i); run[i].sp=d; sp.push(d); }
  sp.sort((a,b)=>a-b); const spMax=sp[Math.floor(sp.length*.95)]||1;
  for(const run of runsAll){ run[0].sp=run[1]?.sp??0; for(const p of run) p.sn=Math.min(1,p.sp/spMax); }
  const SUB=5;
  for(const run of runsAll){
    const P=run.map(p=>[p.x,p.y]); let prev=null;
    for(let i=0;i<run.length-1;i++){
      for(let s=0;s<=SUB;s++){ if(i>0&&s===0) continue;
        const t=s/SUB, q=catmull(P[Math.max(0,i-1)],P[i],P[i+1],P[Math.min(P.length-1,i+2)],t);
        const tt=tAt(lerp(run[i].i,run[i+1].i,t)), u=F.uT(tt), sn=lerp(run[i].sn,run[i+1].sn,t);
        const pt=mapPt(L,q[0],q[1],spread(u,W,H));
        if(!F.visT(tt)){ prev=null; continue; }
        if(prev){ const wf = S.wmode==='fast'?.25+1.75*sn : S.wmode==='slow'?.25+1.75*(1-sn) : 1;
          lines.push({paths:[[prev,pt]], stroke:colAt(u), w:S.lw*lwU*wf, a:F.fadeT(tt), cap:(S.tailFade||0)>0?'butt':'round'}); }   // butt caps: no beads where faded segments overlap
        prev=pt;
      }
    }
    if(S.dots) for(const p of run){ const s=SM[p.i]; if(!F.vis(s)) continue; const u=F.u(s); const [x,y]=mapPt(L,p.x,p.y,spread(u,W,H)); lines.push({circle:[x,y,S.lw*lwU*1.6], fill:colAt(u), fa:F.fade(s)}); }
  }
  const pairs = {wr:[[15,16]], an:[[27,28]], x:[[15,28],[16,27]]}[S.ribbon]||[];
  for(const s of SM){ if(!F.vis(s)) continue; const u=F.u(s), off=spread(u,W,H);
    for(const [a,b] of pairs){ const pa=jointPos(s.lm,a), pb=jointPos(s.lm,b); if(!pa||!pb) continue;
      items.push({paths:[[mapPt(L,pa.x,pa.y,off),mapPt(L,pb.x,pb.y,off)]], stroke:colAt(u), w:Math.max(.5,S.lw*lwU*.35), a:S.ribA*F.fade(s)}); } }
  if(S.ghosts>0){
    for(const s of pickBuild(F,SM,S.ghosts)){ if(!F.vis(s)) continue; const u=F.u(s), off=spread(u,W,H), c=colAt(u), a=S.ghA*F.fade(s);
      const paths=[]; for(const [p,q] of BONES){ const pa=s.lm[p],pb=s.lm[q]; if(pa.v>.4&&pb.v>.4) paths.push([mapPt(L,pa.x,pa.y,off),mapPt(L,pb.x,pb.y,off)]); }
      items.push({paths, stroke:c, w:S.lw*lwU*.8, a});
      const n=s.lm[0], e1=s.lm[7], e2=s.lm[8];
      if(n.v>.4){ const r=Math.max(4,Math.hypot(e1.x-e2.x,e1.y-e2.y)*.75)*L.s; const [x,y]=mapPt(L,n.x,n.y,off); items.push({circle:[x,y,r], stroke:c, w:S.lw*lwU*.8, a}); }
    }
  }
  // trajectories share one layer so overlapping segment caps don't bead up
  items.push({group:lines, a:S.alpha});
  return items;
}

// Sweep: the surface a body segment sweeps between consecutive frames (a fan / fabric)
export const SWEEP_SEGS = [
  ['sw_fa','Forearms',[[13,15],[14,16]],1], ['sw_arm','Whole arms',[[11,15],[12,16]],0],
  ['sw_sh','Shins',[[25,27],[26,28]],1], ['sw_leg','Whole legs',[[23,27],[24,28]],0],
  ['sw_sho','Shoulders',[[11,12]],0], ['sw_sp','Spine',[['ms','mh']],0],
];
function segPt(lm,j){
  if(j==='ms'||j==='mh'){ const [a,b]=j==='ms'?[lm[11],lm[12]]:[lm[23],lm[24]]; return a.v>.4&&b.v>.4 ? {x:(a.x+b.x)/2,y:(a.y+b.y)/2} : null; }
  return lm[j].v>.4 ? lm[j] : null;
}
function fxSweep(F){
  const S=RS.S, {SM,L,W,H}=F, quads=[], ribs=[], lwU=W/1000, w=S.smooth;
  const segs=SWEEP_SEGS.filter(([k])=>S[k]).flatMap(([,,ss])=>ss);
  for(const [ja,jb] of segs){
    const tr=SM.map(s=>{ const a=segPt(s.lm,ja), b=segPt(s.lm,jb); return a&&b ? [a.x,a.y,b.x,b.y] : null; });
    const sm=tr.map((p,i)=>{ if(!p) return null; const acc=[0,0,0,0]; let c=0;
      for(let k=-w;k<=w;k++){ const q=tr[i+k]; if(q){ for(let m=0;m<4;m++) acc[m]+=q[m]; c++; } } return acc.map(v=>v/c); });
    for(let i=0;i<SM.length;i++){
      const p=sm[i], s=SM[i]; if(!p || !F.vis(s)) continue;
      const u=F.u(s), off=spread(u,W,H), A=mapPt(L,p[0],p[1],off), B=mapPt(L,p[2],p[3],off);
      if(S.swRib>0 && i%S.swRib===0) ribs.push({paths:[[A,B]], stroke:colAt(u), w:S.lw*lwU*.6, a:S.alpha*F.fade(s)});
      const q=sm[i+1], s2=SM[i+1]; if(!q || !s2 || !F.vis(s2)) continue;
      const u2=F.u(s2), off2=spread(u2,W,H);
      quads.push({paths:[[A,B,mapPt(L,q[2],q[3],off2),mapPt(L,q[0],q[1],off2)]], closed:true, nonzero:true,
        fill:colAt((u+u2)/2), fa: S.swMode==='solid' ? 1 : S.swA*F.fade(s)});
    }
  }
  // Layered: translucent quads pile up where the limb lingers. Solid: one flat surface.
  return (S.swMode==='solid' ? [{group:quads, a:S.swA}] : quads).concat(ribs);
}

function ringsOf(s){       // contour rings in source-video coordinates, cached per sample
  if(s.rings) return s.rings;
  const cs = d3.contours().size([s.gw,s.gh]).thresholds([.5])(s.grid)[0];
  const kx=s.rect.w/s.gw, ky=s.rect.h/s.gh;
  s.rings = cs.coordinates.map(poly=>poly.map(ring=>ring.slice(0,-1).map(([x,y])=>[s.rect.x+x*kx,s.rect.y+y*ky])).filter(r=>r.length>=8)).filter(p=>p.length);
  return s.rings;
}
function fxContours(F){
  const S=RS.S, {L,W,H}=F, items=[], lwU=W/1000;
  for(const s of pickBuild(F, F.SM.filter(s=>s.grid), S.cnum)){
    if(!F.vis(s)) continue;
    const u=F.u(s), off=spread(u,W,H), c=colAt(u), fd=F.fade(s);
    const paths=[], k=scaleAt(u), [ax,ay]=anchorOf(s);
    for(const poly of ringsOf(s)) for(const ring of poly){ const r=ring.filter((_,i)=>i%S.csm===0); if(r.length>=4) paths.push(r.map(([x,y])=>mapPt(L,ax+(x-ax)*k,ay+(y-ay)*k,off))); }
    if(paths.length) items.push({paths, closed:true, curve:S.csm>1, stroke:c, fill:S.cfill>0?c:null, fa:S.cfill*fd, w:S.lw*lwU*.5, a:S.alpha*fd});
  }
  return items;
}

const lineC=()=>d3.line().curve(d3.curveCatmullRomClosed.alpha(.5));
function drawItems(ctx,items,blend,depth=1){
  ctx.save(); ctx.globalCompositeOperation=blend; ctx.lineCap='round'; ctx.lineJoin='round';
  for(const it of items){
    if(it.group){
      const [lc,lx]=layerFor(ctx,depth);
      drawItems(lx,it.group,'source-over',depth+1);
      ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=it.a; ctx.drawImage(lc,0,0); ctx.restore();
      continue;
    }
    ctx.lineCap=it.cap||'round';
    ctx.beginPath();
    if(it.circle){ ctx.arc(it.circle[0],it.circle[1],it.circle[2],0,Math.PI*2); }
    else for(const p of it.paths){
      if(it.curve){ lineC().context(ctx)(p); }
      else { ctx.moveTo(p[0][0],p[0][1]); for(let k=1;k<p.length;k++) ctx.lineTo(p[k][0],p[k][1]); if(it.closed) ctx.closePath(); }
    }
    if(it.fill){ ctx.globalAlpha=it.fa; ctx.fillStyle=it.fill; ctx.fill(it.nonzero?'nonzero':'evenodd'); }
    if(it.stroke){ ctx.globalAlpha=it.a; ctx.strokeStyle=it.stroke; ctx.lineWidth=it.w; ctx.stroke(); }
  }
  ctx.restore();
}
/* ---------- typography: one paragraph ---------- */
let measC=null;
function textWidth(str,t){
  if(!measC) measC=document.createElement('canvas').getContext('2d');
  measC.font=`${t.w} ${t.size}px "${t.fam}"${t.fb||''}`;
  const chars=[...str];
  // must match drawText: with tracking the letters are placed one by one (no kerning), otherwise the line is drawn whole
  const w = t.track ? chars.reduce((a,c)=>a+measC.measureText(c).width,0) : measC.measureText(str).width;
  return w + t.track*t.size*Math.max(0,chars.length-1);
}
// ---------- text layouts ----------
// Everything is built from three text blocks: the title (any poster font), a small Helvetica paragraph and a small
// Helvetica caption. A layout decides where they go on the sheet: classic (one block), corners (Swiss grid), stack
// (words stretched to the full width), banner (one line across the sheet) and side (title running up the edge).
function wrapText(txt,tb,mw){
  const fits=str=>textWidth(str,tb)<=mw, lines=[];
  for(const para of txt.split('\n')){
    if(!para.trim()){ lines.push(''); continue; }
    let cur='';
    for(const word of para.trim().split(/\s+/)){
      const next = cur ? cur+' '+word : word;
      if(fits(next)){ cur=next; continue; }
      if(cur){ lines.push(cur); cur=''; }
      if(fits(word)){ cur=word; continue; }
      // a word wider than the sheet: break it by letters so nothing is cut off
      let piece='';
      for(const ch of [...word]){ if(piece && !fits(piece+ch)){ lines.push(piece); piece=''; } piece+=ch; }
      cur=piece;
    }
    lines.push(cur);
  }
  while(lines.length && !lines[lines.length-1]) lines.pop();
  return lines;
}
const HELV={fam:'Helvetica', fb:", 'Helvetica Neue', Arial, sans-serif", w:400, vs:'', track:0};
const fitSize=(str,tb,width)=>{ const w=textWidth(str,{...tb,size:100}); return w>0 ? 100*width/w : tb.size; };
function textCtx(W){
  const S=RS.S, m=S.margin*W, ts=S.tsize*W, bs=(S.bsize||.022)*W;
  return { S, m, ts, bs, blh:bs*(S.blh||1.4), T:S.upper?(S.text||'').toUpperCase():(S.text||''),
           base:{size:ts, ...fontSpec(), track:S.track, anchor:S.talign}, hel:{...HELV,size:bs} };
}
const hasText=t=>!!(t||'').trim();
// a block of small lines whose first (edge 'top', y = top of the block) or last (edge 'bottom', y = bottom) baseline is placed from y
function smallLines(c,lines,x,anchor,edge,y,out){
  const n=lines.length; if(!n) return;
  const y0 = edge==='top' ? y+c.bs*.74 : y-(n-1)*c.blh;
  lines.forEach((l,i)=>{ if(l) out.push({...c.hel,str:l,anchor,x,y:y0+i*c.blh,rot:0}); });
}
const paraLines=(c,wid)=>hasText(c.S.body)?wrapText(c.S.body,c.hel,wid):[];
const capLines=(c,wid)=>hasText(c.S.meta)?wrapText(c.S.meta,c.hel,wid):[];

export function textItems(W,H){
  if(RS.S.showText===false) return [];             // typography switched off
  const c=textCtx(W), L=c.S.tlayout||'classic';
  const out=(L==='grid'?layoutGrid:L==='corners'?layoutCorners:L==='stack'?layoutStack:L==='banner'?layoutBanner:L==='side'?layoutSide:layoutClassic)(c,W,H);
  // Symmetric: the same layout again, turned 180° about the centre of the sheet (top-left word → bottom-right, upside down)
  if(c.S.tsym) for(const t of [...out]) out.push({...t, x:W-t.x, y:H-t.y, rot:t.rot+Math.PI});
  return out;
}
// grid: a modular grid (columns × rows inside the margins); the title, paragraph and caption each sit in a cell range,
// flush left and ragged right, the way Swiss posters are set. The cells come from the Grid and placement settings.
export function gridGeom(W,H){
  const S=RS.S, m=S.margin*W, cols=Math.round(S.gcols||6), rows=Math.round(S.grows||8), g=(S.ggap??.015)*W;
  return { m, cols, rows, g, cw:(W-2*m-(cols-1)*g)/cols, rh:(H-2*m-(rows-1)*g)/rows };
}
function gridCell(G,col,row,span){
  const cl=Math.min(G.cols,Math.max(1,Math.round(col||1))), rw=Math.min(G.rows,Math.max(1,Math.round(row||1))), sp=Math.min(G.cols-cl+1,Math.max(1,Math.round(span||1)));
  return { x:G.m+(cl-1)*(G.cw+G.g), y:G.m+(rw-1)*(G.rh+G.g), w:sp*G.cw+(sp-1)*G.g };
}
function layoutGrid(c,W,H){
  const {S,ts,T,base}=c, G=gridGeom(W,H), out=[], tb={...base,anchor:'start'};
  const t=gridCell(G,S.tcol,S.trow,S.tspan), lh=ts*S.lh;
  wrapText(T,tb,t.w).forEach((l,i)=>{ if(l) out.push({...tb,str:l,x:t.x,y:t.y+ts*.74+i*lh,rot:0}); });
  const b=gridCell(G,S.bcol,S.brow,S.bspan); smallLines(c,paraLines(c,b.w),b.x,'start','top',b.y,out);
  const k=gridCell(G,S.mcol,S.mrow,S.mspan); smallLines(c,capLines(c,k.w),k.x,'start','top',k.y,out);
  return out;
}
// preview-only guides for the grid layout (never part of an export)
export function drawGuides(ctx,W,H){
  const S=RS.S; if(S.showText===false || S.tlayout!=='grid' || !S.gridShow) return;
  const G=gridGeom(W,H); ctx.save(); ctx.strokeStyle='rgba(255,40,110,.55)'; ctx.lineWidth=Math.max(1,W/900);
  for(let i=0;i<G.cols;i++) ctx.strokeRect(G.m+i*(G.cw+G.g), G.m, G.cw, H-2*G.m);
  for(let j=0;j<G.rows;j++){ const y=G.m+j*(G.rh+G.g); ctx.beginPath(); ctx.moveTo(G.m,y); ctx.lineTo(W-G.m,y); ctx.moveTo(G.m,y+G.rh); ctx.lineTo(W-G.m,y+G.rh); ctx.stroke(); }
  ctx.restore();
}
function layoutClassic(c,W,H){
  const {S,m,ts,bs,blh,T,base}=c, lh=ts*S.lh, cap=ts*.74;
  // The block is laid out upright in a frame that is then turned by 0/90/180/270° (clockwise) onto the sheet.
  const rot=((Math.round((+S.trot||0)/90)*90)%360+360)%360, quarter=rot===90||rot===270;
  const Wv=quarter?H:W, Hv=quarter?W:H, maxW=Wv-2*m;
  const lines=wrapText(T, base, maxW);
  const bbase={...c.hel, anchor:S.talign}, wid=maxW*(S.bw||.6);
  const body=paraLines(c,wid), cap2=capLines(c,wid);
  const blines=[...body, ...(cap2.length ? (body.length?['']:[]).concat(cap2) : [])];   // the caption follows the paragraph
  const n=lines.length, bn=blines.length, out=[];
  if(!n && !bn) return out;
  const ax = S.talign==='start'?m : S.talign==='middle'?Wv/2 : Wv-m;
  const bodyAt = n ? (n-1)*lh + ts*.3 + bs*.95 : 0, ext = bn ? bodyAt+(bn-1)*blh : (n-1)*lh, c0 = n ? cap : bs*.74;
  const y0 = S.tpos==='top' ? m+c0 : S.tpos==='bottom' ? Hv-m-ext : (Hv-ext)/2+c0/2;
  const toSheet=(x,y)=> rot===90 ? [W-y,x] : rot===180 ? [W-x,H-y] : rot===270 ? [y,H-x] : [x,y];
  lines.forEach((l,i)=>{ if(!l) return; const [x,y]=toSheet(ax,y0+i*lh); out.push({...base,str:l,x,y,rot:rot*Math.PI/180}); });
  blines.forEach((l,i)=>{ if(!l) return; const [x,y]=toSheet(ax,y0+bodyAt+i*blh); out.push({...bbase,str:l,x,y,rot:rot*Math.PI/180}); });
  return out;
}
// corners: title top-left, caption top-right, paragraph bottom-right (Flip sides mirrors it)
function layoutCorners(c,W,H){
  const {S,m,ts,T,base}=c, out=[], flip=!!S.tflip, xl=flip?W-m:m, xr=flip?m:W-m, al=flip?'end':'start', ar=flip?'start':'end', lh=ts*S.lh;
  wrapText(T,{...base,anchor:al},(W-2*m)*.64).forEach((l,i)=>{ if(l) out.push({...base,anchor:al,str:l,x:xl,y:m+ts*.74+i*lh,rot:0}); });
  smallLines(c,capLines(c,(W-2*m)*.3),xr,ar,'top',m,out);
  smallLines(c,paraLines(c,(W-2*m)*(S.bw||.6)),xr,ar,'bottom',H-m,out);
  return out;
}
// stack: every word (or line) stretched to the full width; paragraph and caption on the opposite edge
function layoutStack(c,W,H){
  const {S,m,T,base}=c, out=[], maxW=W-2*m;
  let parts=T.split('\n').map(x=>x.trim()).filter(Boolean); if(parts.length===1) parts=parts[0].split(/\s+/);
  const items=parts.map(str=>{ const size=Math.min(fitSize(str,base,maxW),.45*W); return {...base,size,anchor:'start',str,x:m}; });
  const ax = S.talign==='start'?m : S.talign==='middle'?W/2 : W-m;
  if(items.length){
    const step=i=>items[i].size*S.lh, h=items[0].size*.74+items.slice(1).reduce((a,t,i)=>a+step(i+1),0);
    const y0 = S.tpos==='top' ? m+items[0].size*.74 : S.tpos==='bottom' ? H-m-(h-items[0].size*.74) : (H-h)/2+items[0].size*.74;
    let y=y0; items.forEach((t,i)=>{ if(i) y+=step(i); out.push({...t,y,rot:0}); });
  }
  const wid=maxW*(S.bw||.6), lines=paraLines(c,wid), cl=capLines(c,wid), all=[...lines, ...(cl.length?(lines.length?['']:[]).concat(cl):[])];
  const edge = S.tpos==='bottom' ? 'top' : 'bottom';                  // title at the bottom → small text at the top, otherwise at the bottom
  smallLines(c,all,ax,S.talign,edge,edge==='top'?m:H-m,out);
  return out;
}
// banner: the whole title in one line across the sheet, a row of paragraph + caption next to it
function layoutBanner(c,W,H){
  const {S,m,T,base,bs}=c, out=[], maxW=W-2*m, flip=!!S.tflip, line=T.replace(/\s*\n\s*/g,' ').trim();
  const size=line ? Math.min(fitSize(line,base,maxW),.5*W) : 0, cap=size*.74, atTop=S.tpos==='top';
  const ty = atTop ? m+cap : H-m;
  if(line) out.push({...base,size,anchor:'start',str:line,x:m,y:ty,rot:0});
  const gap=bs*1.8, edge=atTop ? 'top' : 'bottom', ey = atTop ? ty+gap : ty-cap-gap;
  const pAnchor=flip?'end':'start', pX=flip?W-m:m, cAnchor=flip?'start':'end', cX=flip?m:W-m;
  smallLines(c,paraLines(c,maxW*(S.bw||.6)*.8),pX,pAnchor,edge,ey,out);
  smallLines(c,capLines(c,maxW*.28),cX,cAnchor,edge,ey,out);
  return out;
}
// side: the title runs up (or, flipped, down) the edge of the sheet; paragraph and caption sit in the other column
function layoutSide(c,W,H){
  const {S,m,T,base}=c, out=[], flip=!!S.tflip, line=T.replace(/\s*\n\s*/g,' ').trim();
  const size=line ? Math.min(fitSize(line,base,H-2*m),.3*W) : 0, band=size*.74;
  if(line) out.push(flip ? {...base,size,anchor:'start',str:line,x:W-m-band,y:m,rot:Math.PI/2} : {...base,size,anchor:'start',str:line,x:m+band,y:H-m,rot:-Math.PI/2});
  const colW=(W-2*m-band-m)*(S.bw||.6), x=flip?m:W-m, a=flip?'start':'end';
  smallLines(c,paraLines(c,colW),x,a,'bottom',H-m,out);
  smallLines(c,capLines(c,colW*.6),x,a,'top',m,out);
  return out;
}
function drawText(ctx,t){
  ctx.save(); ctx.fillStyle=RS.S.fg; ctx.font=`${t.w} ${t.size}px "${t.fam}"${t.fb||''}`; ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  ctx.translate(t.x,t.y); if(t.rot) ctx.rotate(t.rot);
  const tr=t.track*t.size, chars=[...t.str];
  const ws = tr ? chars.map(c=>ctx.measureText(c).width) : null;
  const total = tr ? ws.reduce((a,b)=>a+b,0)+tr*(chars.length-1) : ctx.measureText(t.str).width;
  let x = t.anchor==='end'?-total : t.anchor==='middle'?-total/2 : 0;
  if(!tr) ctx.fillText(t.str,x,0); else chars.forEach((c,i)=>{ ctx.fillText(c,x,0); x+=ws[i]+tr; });
  ctx.restore();
}
export async function loadFont(){
  const S=RS.S; if(userFont()) return;                          // the uploaded face is already loaded
  const f=FONTS[S.font]||FONTS.inter, sample=(S.text+(S.body||'')+(S.meta||'')+'АБВабв').slice(0,400);
  try{ await Promise.all([document.fonts.load(`${f.wt} 64px "${f.fam}"`,sample), document.fonts.load(`${f.wb} 64px "${f.fam}"`,sample)]); }catch(e){}
}

/* ---------- grain ---------- */
let grainTile=null;
function grain(ctx,W,H,shift){
  const S=RS.S; if(S.grain<=0) return;
  if(!grainTile){ grainTile=document.createElement('canvas'); grainTile.width=grainTile.height=256; const g=grainTile.getContext('2d'), im=g.createImageData(256,256);
    for(let i=0;i<im.data.length;i+=4){ const v=Math.random()*255; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; } g.putImageData(im,0,0); }
  ctx.save(); const pat=ctx.createPattern(grainTile,'repeat'); const k=Math.max(1,W/1400);
  pat.setTransform(new DOMMatrix().translate(shift?.[0]||0, shift?.[1]||0).scale(k));
  ctx.globalCompositeOperation='overlay'; ctx.globalAlpha=S.grain; ctx.fillStyle=pat; ctx.fillRect(0,0,W,H); ctx.restore();
}

/* ---------- background pattern ---------- */
export const PATTERNS=[['none','None'],['dots','Dots'],['lines','Lines'],['grid','Grid'],['checker','Checker'],['cross','Crosses'],['rings','Rings'],['triangles','Triangles'],['diamonds','Diamonds'],['waves','Waves'],['rays','Rays']];
// A geometric pattern laid over the paper colour, under everything else. Cell size, weight, angle and opacity are settings;
// the ink is one of the palette colours (text / start / end) so it always belongs to the poster.
function drawPattern(ctx,W,H){
  const S=RS.S, kind=S.pattern||'none'; if(kind==='none') return;
  const c=Math.max(6,(S.psize||.06)*W), t=Math.min(.5,Math.max(.02,S.pw||.12)), col=S[S.pcol||'fg']||S.fg;
  ctx.save(); ctx.globalAlpha=S.pop??.25; ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.translate(W/2,H/2); ctx.rotate((S.pang||0)*Math.PI/180);
  const R=Math.hypot(W,H)/2+c, n=Math.ceil(R/c)+1, TAU=Math.PI*2;
  let fill=false; ctx.beginPath();
  if(kind==='rays'){
    const N=Math.max(8,Math.round(TAU*(W/2)/c)); ctx.lineWidth=c*t*.5;
    for(let k=0;k<N;k++){ const a=k*TAU/N; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R); }
  } else if(kind==='lines'||kind==='grid'){
    ctx.lineWidth=c*t*.5;
    for(let j=-n;j<=n;j++){ ctx.moveTo(-R,j*c); ctx.lineTo(R,j*c); if(kind==='grid'){ ctx.moveTo(j*c,-R); ctx.lineTo(j*c,R); } }
  } else if(kind==='waves'){
    ctx.lineWidth=c*t*.5; const st=c/8;
    for(let j=-n;j<=n;j++){ for(let x=-R;x<=R;x+=st){ const y=j*c+Math.sin(x/c*TAU)*c*.22; x===-R ? ctx.moveTo(x,y) : ctx.lineTo(x,y); } }
  } else {
    ctx.lineWidth=c*t*.4;
    for(let j=-n;j<=n;j++) for(let i=-n;i<=n;i++){
      const x=i*c, y=j*c;
      if(kind==='dots'){ fill=true; ctx.moveTo(x+c*t,y); ctx.arc(x,y,c*t,0,TAU); }
      else if(kind==='checker'){ fill=true; if(((i+j)%2+2)%2===0) ctx.rect(x-c/2,y-c/2,c,c); }
      else if(kind==='cross'){ const a=c*.3; ctx.moveTo(x-a,y); ctx.lineTo(x+a,y); ctx.moveTo(x,y-a); ctx.lineTo(x,y+a); }
      else if(kind==='rings'){ ctx.moveTo(x+c*.42,y); ctx.arc(x,y,c*.42,0,TAU); }
      else if(kind==='diamonds'){ const r=c*.45; ctx.moveTo(x,y-r); ctx.lineTo(x+r,y); ctx.lineTo(x,y+r); ctx.lineTo(x-r,y); ctx.closePath(); }
      else if(kind==='triangles'){ const r=c*.4, f=((i+j)%2+2)%2 ? -1 : 1; ctx.moveTo(x,y-r*f); ctx.lineTo(x+r*.866,y+r*.5*f); ctx.lineTo(x-r*.866,y+r*.5*f); ctx.closePath(); }
    }
  }
  fill ? ctx.fill() : ctx.stroke();
  ctx.restore();
}

/* ---------- compose ---------- */
// o: {samples, bb, tFrom, tTo, fade, text, grainOn, grainShift, placeholder}
function frameCtx(W,H,o){
  let SM=(o.samples||[]).filter(s=>s.frame);
  if(!SM.length) return null;
  // TAIL: only the last `tailLen` seconds before the newest frame are the history that gets drawn (30 = all of it),
  // and the old end of that history fades by `tailFade`. Everything downstream (phases, colours, spread) sees just the tail.
  const tailLen=RS.S.tailLen ?? 30, tailFade=RS.S.tailFade ?? 0;
  if(tailLen<29.95){ const head=SM[SM.length-1].t; SM=SM.filter(s=>s.t>=head-tailLen-1e-6); }
  const BB=o.bb||boundsOf(SM), L=layout(W,H,BB);
  const T0=SM[0].t, D=Math.max(1e-6, SM[SM.length-1].t-T0);
  const tFrom=o.tFrom ?? -Infinity, tTo=o.tTo ?? Infinity;
  const F={SM,W,H,L,BB,
    uT:t=>(t-T0)/D,
    visT:t=>t>=tFrom-1e-6 && t<=tTo+1e-6,
    fadeT: tailFade>0 ? t=>1-tailFade*(1-(D>1e-4 ? clamp01((t-T0)/D) : 1)) : ()=>1 };
  F.u=s=>F.uT(s.t); F.vis=s=>F.visT(s.t); F.fade=s=>F.fadeT(s.t); F.stride=!!o.stride;
  return F;
}
function effectItems(F){ const fx=RS.S.fx; return fx==='traj' ? fxTraj(F) : fx==='sweep' ? fxSweep(F) : fxContours(F); }
// Animated parameters: First frame scale / Spread across / Spread down can run from their slider value ("from") to a second
// value ("to") over the animation. o.prog is the animation progress 0…1; without it (live, finished poster) the "to" value shows.
const ANIM_KEYS=['fscale','spx','spy'];
function withAnim(o,fn){
  const S=RS.S, ks=ANIM_KEYS.filter(k=>S[k+'To']!==undefined && S[k+'To']!==S[k]);
  if(!ks.length) return fn();
  const p0=o.prog ?? 1, p=S.aease==='lin' ? p0 : p0*p0*(3-2*p0), orig={};
  for(const k of ks){ orig[k]=S[k]; S[k]=lerp(S[k], S[k+'To'] ?? S[k], p); }
  try{ return fn(); } finally{ for(const k of ks) S[k]=orig[k]; }
}
export function compose(ctx,W,H,o={}){ return withAnim(o,()=>composeIn(ctx,W,H,o)); }
function composeIn(ctx,W,H,o={}){
  const S=RS.S;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1; ctx.fillStyle=S.bg; ctx.fillRect(0,0,W,H); ctx.restore();
  drawPattern(ctx,W,H);
  const texts = o.text===false ? [] : textItems(W,H);
  const F=frameCtx(W,H,o);
  if(!F){
    if(o.placeholder){ ctx.save(); ctx.fillStyle=S.fg; ctx.globalAlpha=.4; ctx.font=`500 ${W*.024}px Inter, sans-serif`; ctx.textAlign='center'; ctx.fillText(o.placeholder, W/2, H/2); ctx.restore(); }
  } else {
    if(S.textBehind) texts.forEach(t=>drawText(ctx,t));
    if(S.fx==='chrono') fxChrono(ctx,F);
    else { drawItems(ctx, effectItems(F), S.blend); if(S.fx!=='chrono') drawLatest(ctx,F,S.blend); }   // newest frame on top of Trails, Sweep and Contours
  }
  if(!S.textBehind || !F) texts.forEach(t=>drawText(ctx,t));
  if(o.grainOn!==false) grain(ctx,W,H,o.grainShift);
}
