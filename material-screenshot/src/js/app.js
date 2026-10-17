'use strict';
/* Material Screenshot - editor, UI and window logic */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],TA=window.__TAURI__;
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch{}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ic=(n,c='')=>`<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const inv=(c,a)=>TA.core.invoke(c,a);

/* ---------- preferences ---------- */
let langPref=ls('lang')||'auto',themeMode=ls('theme')||'system',seed=ls('seed')||'#2196F3',contrast=+(ls('contrast')||0),winMode=ls('winMode')||'remember',saveDir=ls('saveDir')||'',askSave=ls('askSave')==='1',dlDir='';
if(!['auto','vi','en'].includes(langPref))langPref='auto';
if(seed.toUpperCase()==='#769CDF'){seed='#2196F3';ls('seed',seed)}
let lang=langPref==='auto'?detectLang():langPref;
const t=k=>(T[lang][k]??T.en[k]??k);
const tc=id=>T[lang].colors[id]||id;
const curTheme=()=>({mode:themeMode,seed,contrast});
const paint=anim=>{applyTheme(curTheme(),anim);try{TA&&TA.window.getCurrentWindow().setTheme(themeMode==='system'?null:themeMode)}catch{}};
mq.addEventListener('change',()=>{if(themeMode==='system')paint(true)});

/* ---------- editor state ---------- */
const DEF={bg:'gradient',c1:'#667eea',c2:'#764ba2',c3:'#f093fb',use3:false,angle:135,solid:'#e5e7eb',blur:0,pad:72,radius:14,shOn:true,shBlur:60,shAlpha:.4,shY:28,shColor:'#000000',bdW:0,bdColor:'#ffffff',bdA:.5,
 frame:'mac',ftheme:'light',ftitle:'',ratio:'auto',cw:1600,ch:900,cap:'',capPos:'bottom',capSize:22,capColor:'#ffffff',tool:'none',ac:'#ef4444',alw:5,asz:32,apx:14,fmt:'png',q:.92,sc:2};
let P=Object.assign({},DEF);try{Object.assign(P,JSON.parse(ls('P')||'{}'),{tool:'none'})}catch{}
const S={img:null,pv:null,pvk:1,name:'image',crop:null,ann:[],stack:[],redo:[],cur:null,cropMode:false,sel:null,bgImg:null,L:null,fit:1};
const FR={none:{id:'none',h:0},win:{id:'win',h:32},mac:{id:'mac',h:38},browser:{id:'browser',h:44},glass:{id:'glass',h:0}};
const iw=im=>im.naturalWidth||im.width,ih=im=>im.naturalHeight||im.height;
const rr=(c,x,y,w,h,r)=>{r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()};
const rgb=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const rgba=(h,a)=>{const [r,g,b]=rgb(h);return `rgba(${r},${g},${b},${a})`};
const FONT='Roboto,system-ui,"Segoe UI",sans-serif';
const ratioVal=()=>{if(P.ratio=='auto')return 0;if(P.ratio=='custom')return Math.max(.05,P.cw)/Math.max(.05,P.ch);const [a,b]=P.ratio.split(':');return a/b};
function layout(){const c=S.crop,F=FR[P.frame]||FR.none,g=P.frame=='glass'?14:0,cw=c.w+2*g,ch=c.h+F.h+2*g,extra=P.cap?Math.round(P.capSize*2.2):0;
 let W=cw+2*P.pad,H=ch+2*P.pad+extra;const r=ratioVal();if(r){if(W/H<r)W=Math.round(H*r);else H=Math.round(W/r)}
 W=Math.round(W);H=Math.round(H);const x=(W-cw)/2,top=(H-extra-ch)/2,y=top+(P.capPos=='top'?extra:0),capY=P.capPos=='top'?top+extra/2:y+ch+extra/2;
 return {W,H,x,y,cw,ch,g,hdr:F.h,ix:x+g,iy:y+g+F.h,iw:c.w,ih:c.h,capY,extra}}
function drawBg(c,q,L){const W=L.W*q,H=L.H*q;
 if(P.bg=='gradient'){const a=P.angle*Math.PI/180,dx=Math.sin(a),dy=-Math.cos(a),n=(Math.abs(W*dx)+Math.abs(H*dy))/2,cx=W/2,cy=H/2,g=c.createLinearGradient(cx-dx*n,cy-dy*n,cx+dx*n,cy+dy*n);
  g.addColorStop(0,P.c1);if(P.use3){g.addColorStop(.5,P.c2);g.addColorStop(1,P.c3)}else g.addColorStop(1,P.c2);c.fillStyle=g;c.fillRect(0,0,W,H)}
 else if(P.bg=='solid'){c.fillStyle=P.solid;c.fillRect(0,0,W,H)}
 else if(P.bg=='image'){if(S.bgImg){const im=S.bgImg,s=Math.max(W/iw(im),H/ih(im))*(P.blur>0?1.1:1);c.save();if(P.blur>0)c.filter=`blur(${P.blur*q}px)`;c.drawImage(im,(W-iw(im)*s)/2,(H-ih(im)*s)/2,iw(im)*s,ih(im)*s);c.restore()}else{c.fillStyle='#808080';c.fillRect(0,0,W,H)}}}
function header(c,F,x,y,w,q){const dk=P.ftheme=='dark',h=F.h*q,fg=dk?'#fff':'#1a1a1a',mid=y+h/2;
 c.fillStyle=F.id=='browser'?(dk?'#2b2b2b':'#e9e9ec'):F.id=='mac'?(dk?'#2d2d2d':'#ececec'):(dk?'#202020':'#f3f3f3');c.fillRect(x,y,w,h);
 c.font=`${12*q}px ${FONT}`;c.textBaseline='middle';c.fillStyle=fg;
 if(F.id=='win'){c.textAlign='left';c.fillText(P.ftitle||'',x+14*q,mid);c.strokeStyle=fg;c.lineWidth=q;const bw=46*q;let bx=x+w-3*bw;
  c.beginPath();c.moveTo(bx+bw/2-5*q,mid);c.lineTo(bx+bw/2+5*q,mid);c.stroke();bx+=bw;c.strokeRect(bx+bw/2-5*q,mid-5*q,10*q,10*q);
  bx+=bw;c.beginPath();c.moveTo(bx+bw/2-5*q,mid-5*q);c.lineTo(bx+bw/2+5*q,mid+5*q);c.moveTo(bx+bw/2+5*q,mid-5*q);c.lineTo(bx+bw/2-5*q,mid+5*q);c.stroke()}
 else{[['#ff5f57',20],['#febc2e',40],['#28c840',60]].forEach(([col,dx])=>{c.fillStyle=col;c.beginPath();c.arc(x+dx*q,mid,6*q,0,7);c.fill()});c.fillStyle=fg;c.globalAlpha=.8;c.textAlign='center';
  if(F.id=='mac')c.fillText(P.ftitle||'',x+w/2,mid);else{const px=x+84*q,pw=w-100*q,ph=26*q;c.globalAlpha=1;c.fillStyle=dk?'#3b3b3b':'#fff';rr(c,px,mid-ph/2,pw,ph,ph/2);c.fill();c.fillStyle=fg;c.globalAlpha=.75;c.fillText(P.ftitle||'example.com',px+pw/2,mid)}c.globalAlpha=1}
 c.fillStyle=dk?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)';c.fillRect(x,y+h-q,w,q)}
function drawAnn(c,list,q,L,src,k){c.save();c.translate(L.ix*q,L.iy*q);c.scale(q,q);const cr=S.crop;
 for(const a of list){c.lineWidth=a.lw||4;c.strokeStyle=c.fillStyle=a.c||'#ef4444';c.lineCap=c.lineJoin='round';
  if(a.t=='rect')c.strokeRect(a.x,a.y,a.w,a.h);
  else if(a.t=='hl'){c.save();c.globalAlpha=.38;c.fillRect(a.x,a.y,a.w,a.h);c.restore()}
  else if(a.t=='arrow'){const an=Math.atan2(a.y1-a.y,a.x1-a.x),hl=Math.max(14,a.lw*4);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(a.x1,a.y1);c.stroke();c.beginPath();c.moveTo(a.x1,a.y1);c.lineTo(a.x1-hl*Math.cos(an-.45),a.y1-hl*Math.sin(an-.45));c.lineTo(a.x1-hl*Math.cos(an+.45),a.y1-hl*Math.sin(an+.45));c.closePath();c.fill()}
  else if(a.t=='text'){c.font=`600 ${a.size}px ${FONT}`;c.textBaseline='top';c.textAlign='left';c.fillText(a.s,a.x,a.y)}
  else if(a.t=='blur'&&a.w>2&&a.h>2){const tw=Math.max(1,Math.round(a.w/a.px)),th=Math.max(1,Math.round(a.h/a.px)),tcv=document.createElement('canvas');tcv.width=tw;tcv.height=th;
   tcv.getContext('2d').drawImage(src,(cr.x+a.x)*k,(cr.y+a.y)*k,a.w*k,a.h*k,0,0,tw,th);c.save();c.imageSmoothingEnabled=false;c.drawImage(tcv,0,0,tw,th,a.x,a.y,a.w,a.h);c.restore()}}
 c.restore()}
/* pv=true draws from the downscaled preview bitmap (fast); export always uses the full image. */
function draw(c,q,L,flat,pv){const src=pv?S.pv:S.img,k=pv?S.pvk:1;c.clearRect(0,0,L.W*q,L.H*q);if(flat){c.fillStyle='#fff';c.fillRect(0,0,L.W*q,L.H*q)}drawBg(c,q,L);
 const x=L.x*q,y=L.y*q,w=L.cw*q,h=L.ch*q,r=P.radius*q,dk=P.ftheme=='dark',glass=P.frame=='glass',F=FR[P.frame]||FR.none;
 c.save();if(P.shOn){c.shadowColor=rgba(P.shColor,P.shAlpha);c.shadowBlur=P.shBlur*q;c.shadowOffsetY=P.shY*q}
 rr(c,x,y,w,h,r);c.fillStyle=glass?'rgba(255,255,255,.3)':(dk?'#1f1f1f':'#fff');c.fill();c.restore();
 c.save();rr(c,x,y,w,h,r);c.clip();if(F.h)header(c,F,x,y,w,q);
 c.save();if(glass){rr(c,L.ix*q,L.iy*q,L.iw*q,L.ih*q,Math.max(0,r-L.g*q));c.clip()}
 c.drawImage(src,S.crop.x*k,S.crop.y*k,S.crop.w*k,S.crop.h*k,L.ix*q,L.iy*q,L.iw*q,L.ih*q);drawAnn(c,S.cur?S.ann.concat(S.cur):S.ann,q,L,src,k);c.restore();c.restore();
 if(glass){c.save();rr(c,x+.5*q,y+.5*q,w-q,h-q,r);c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=q;c.stroke();c.restore()}
 if(P.bdW>0){c.save();rr(c,x+P.bdW*q/2,y+P.bdW*q/2,w-P.bdW*q,h-P.bdW*q,r);c.strokeStyle=rgba(P.bdColor,P.bdA);c.lineWidth=P.bdW*q;c.stroke();c.restore()}
 if(P.cap){c.font=`600 ${P.capSize*q}px ${FONT}`;c.fillStyle=P.capColor;c.textAlign='center';c.textBaseline='middle';c.fillText(P.cap,L.W*q/2,L.capY*q)}}
const selRect=()=>{const s=S.sel,c=S.crop;if(!s)return null;const x=Math.max(0,Math.min(s.x0,s.x1)),y=Math.max(0,Math.min(s.y0,s.y1));return {x,y,w:Math.min(c.w,Math.max(s.x0,s.x1))-x,h:Math.min(c.h,Math.max(s.y0,s.y1))-y}};
function drawCrop(){const cv=$('#cv'),c=S.crop,box=$('#stage').getBoundingClientRect(),fit=Math.min(1,(box.width-48)/c.w,(box.height-110)/c.h),dpr=Math.min(2,window.devicePixelRatio||1),q=fit*dpr,k=S.pvk;
 cv.width=Math.max(1,Math.round(c.w*q));cv.height=Math.max(1,Math.round(c.h*q));cv.style.width=c.w*fit+'px';cv.style.height=c.h*fit+'px';S.fit=fit;
 const x=cv.getContext('2d');x.drawImage(S.pv,c.x*k,c.y*k,c.w*k,c.h*k,0,0,cv.width,cv.height);const s=selRect();
 if(s){x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.rect(0,0,cv.width,cv.height);x.rect(s.x*q,s.y*q,s.w*q,s.h*q);x.fill('evenodd');x.strokeStyle='#fff';x.lineWidth=2*dpr;x.strokeRect(s.x*q,s.y*q,s.w*q,s.h*q)}}
function paintPreview(){if(!S.img)return;if(S.cropMode)return drawCrop();const cv=$('#cv'),L=S.L=layout(),box=$('#stage').getBoundingClientRect(),
 fit=Math.min(1,Math.max(60,box.width-48)/L.W,Math.max(60,box.height-48)/L.H),dpr=Math.min(2,window.devicePixelRatio||1),q=fit*dpr;
 cv.width=Math.max(1,Math.round(L.W*q));cv.height=Math.max(1,Math.round(L.H*q));cv.style.width=L.W*fit+'px';cv.style.height=L.H*fit+'px';S.fit=fit;
 draw(cv.getContext('2d'),cv.width/L.W,L,false,true);cv.classList.toggle('draw',P.tool!='none');info()}
let raf;const redraw=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(paintPreview)};
function exportScale(){const L=layout();let s=P.sc;while(s>1&&(L.W*s>8192||L.H*s>8192))s--;return s}
function renderExport(){const L=layout(),s=exportScale(),c=document.createElement('canvas');c.width=Math.round(L.W*s);c.height=Math.round(L.H*s);draw(c.getContext('2d'),s,L,P.fmt=='jpeg',false);return c}
function info(){if(!S.img){$('#sInfo').textContent=t('ready');$('#sZoom').textContent='';return}const L=S.cropMode?null:layout(),s=exportScale();
 $('#sInfo').textContent=S.cropMode?`${S.crop.w} × ${S.crop.h} px`:`${S.crop.w} × ${S.crop.h} px  →  ${Math.round(L.W*s)} × ${Math.round(L.H*s)} px (${s}x)`;$('#sZoom').textContent=Math.round(S.fit*100)+'%';
 const o=$('#oinfo');if(o&&L)o.textContent=`${Math.round(L.W*s)} × ${Math.round(L.H*s)} px`}

/* ---------- history ---------- */
const snap=()=>JSON.stringify({a:S.ann,c:S.crop});
function pushHist(){S.stack.push(snap());if(S.stack.length>60)S.stack.shift();S.redo=[];btns()}
const restore=j=>{const o=JSON.parse(j);S.ann=o.a;S.crop=o.c};
function undo(){if(!S.stack.length)return;S.redo.push(snap());restore(S.stack.pop());btns();redraw()}
function redo(){if(!S.redo.length)return;S.stack.push(snap());restore(S.redo.pop());btns();redraw()}
function btns(){const has=!!S.img;['#bCrop','#bCopy','#bSave'].forEach(s=>$(s).disabled=!has);$('#bUndo').disabled=!S.stack.length;$('#bRedo').disabled=!S.redo.length}

/* ---------- image sources ---------- */
function makePreview(src){const m=Math.max(iw(src),ih(src)),MAX=2400;if(m<=MAX){S.pv=src;S.pvk=1;return}
 const k=MAX/m,c=document.createElement('canvas');c.width=Math.max(1,Math.round(iw(src)*k));c.height=Math.max(1,Math.round(ih(src)*k));
 const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);S.pv=c;S.pvk=c.width/iw(src)}
function setSource(src,name){S.img=src;makePreview(src);S.name=(name||'image').replace(/\.[^.]+$/,'');S.crop={x:0,y:0,w:iw(src),h:ih(src)};S.ann=[];S.stack=[];S.redo=[];S.cur=null;S.cropMode=false;$('#cropbar').hidden=true;
 $('#empty').hidden=true;const cv=$('#cv');cv.hidden=false;cv.style.animation='none';void cv.offsetWidth;cv.style.animation='';$('#fn').textContent=name||'';btns();redraw()}
const prog=on=>{$('#prog').hidden=!on};
async function fromBlob(b,name,isBg){prog(true);try{const bm=await createImageBitmap(b,{imageOrientation:'from-image'});if(isBg)return bm;setSource(bm,name)}catch{toast(t('readFail'))}finally{prog(false)}}
const MIMES={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp'};
async function fromPath(p){prog(true);try{const buf=await inv('read_image',{path:p}),ext=p.split('.').pop().toLowerCase();await fromBlob(new Blob([buf],{type:MIMES[ext]||'image/png'}),p.split(/[\\/]/).pop())}catch{toast(t('readFail'))}finally{prog(false)}}
async function pick(){if(TA){try{const p=await TA.dialog.open({multiple:false,filters:[{name:'Image',extensions:['png','jpg','jpeg','webp','gif','bmp']}]});if(p)fromPath(p)}catch{toast(t('readFail'))}}else $('#file').click()}
async function pasteBtn(){try{for(const it of await navigator.clipboard.read()){const ty=it.types.find(x=>x.startsWith('image/'));if(ty){fromBlob(await it.getType(ty),'pasted');return}}toast(t('noImage'))}catch{toast(t('pasteFail'))}}
function makeSample(){const c=document.createElement('canvas');c.width=1200;c.height=720;const x=c.getContext('2d');
 x.fillStyle='#f4f6fb';x.fillRect(0,0,1200,720);x.fillStyle='#ffffff';x.fillRect(0,0,230,720);x.fillStyle='#e3e8f4';
 [70,130,190,250,310].forEach((y,i)=>{rr(x,24,y,i==0?182:150+i*6,34,8);x.fill()});x.fillStyle='#415F91';rr(x,24,70,182,34,8);x.fill();
 x.fillStyle='#191c20';x.font=`600 30px ${FONT}`;x.textBaseline='top';x.fillText('Dashboard',270,40);
 [['Visitors','12,480','#415F91'],['Revenue','$8,240','#10893e'],['Orders','342','#c4611a']].forEach(([a,b,col],i)=>{const X=270+i*300;x.fillStyle='#fff';rr(x,X,110,276,130,12);x.fill();x.fillStyle='#6b7280';x.font=`16px ${FONT}`;x.fillText(a,X+20,132);x.fillStyle=col;x.font=`600 40px ${FONT}`;x.fillText(b,X+20,170)});
 x.fillStyle='#fff';rr(x,270,270,876,400,12);x.fill();x.strokeStyle='#415F91';x.lineWidth=5;x.lineJoin='round';x.beginPath();
 [[300,600],[400,520],[500,560],[600,430],[700,470],[800,360],[900,400],[1000,320],[1100,300]].forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();return c}

/* ---------- side panel ---------- */
const R=(k,mn,mx,st,l)=>`<label class="fld"><div class="fl"><span>${esc(t(l))}</span><output data-o="${k}"></output></div><input type="range" data-k="${k}" min="${mn}" max="${mx}" step="${st}"></label>`;
const Cl=(k,l)=>`<label class="fld cr"><span>${esc(t(l))}</span><input type="color" data-k="${k}"></label>`;
const Ck=(k,l)=>`<label class="fld cr"><span>${esc(t(l))}</span><input type="checkbox" class="sw" data-k="${k}"></label>`;
const lab=l=>l.startsWith('~')?l.slice(1):t(l);
const Sg=(k,o)=>`<div class="seg" data-seg="${k}">${o.map(([v,l])=>`<button type="button" data-v="${v}">${ic('check')}<span>${esc(lab(l))}</span></button>`).join('')}</div>`;
const Ch=(k,o)=>`<div class="chips" data-seg="${k}">${o.map(([v,l,i])=>`<button type="button" class="chip" data-v="${v}">${ic('check')}${i?ic(i,'lead'):''}<span>${esc(lab(l))}</span></button>`).join('')}</div>`;
const Tx=(k,l)=>`<label class="fld"><div class="fl"><span>${esc(t(l))}</span></div><input class="tx" type="text" data-k="${k}"></label>`;
const SEC=(id,i,l,ico,h)=>`<section class="sec${OPEN[id]?' open':''}" data-sec="${id}" style="--n:${i}"><button type="button" class="sec-h">${ic(ico,'hi')}<span>${esc(t(l))}</span>${ic('expand','chev')}</button><div class="sec-c"><div><div class="sec-b">${h}</div></div></div></section>`;
let OPEN={looks:1,bg:1,layout:1,frame:1};try{OPEN=Object.assign(OPEN,JSON.parse(ls('open')||'{}'))}catch{}
const PRESETS=[['#2193b0','#6dd5ed'],['#ff7e5f','#feb47b'],['#667eea','#764ba2'],['#11998e','#38ef7d'],['#ee9ca7','#ffdde1'],['#232526','#414345'],['#f12711','#f5af19'],['#a18cd1','#fbc2eb'],['#89f7fe','#66a6ff'],['#ffecd2','#fcb69f'],['#00c6ff','#0072ff'],['#f857a6','#ff5858'],['#134e5e','#71b280'],['#e0e0e0','#ffffff']];
const LOOKS=[['Clean',['#f3f4f6','#e5e7eb'],{bg:'solid',solid:'#f3f4f6',pad:56,radius:12,shOn:true,shBlur:50,shAlpha:.22,shY:20,frame:'none',bdW:0}],
 ['Ocean',['#2193b0','#6dd5ed'],{bg:'gradient',c1:'#2193b0',c2:'#6dd5ed',use3:false,angle:135,pad:72,radius:14,shOn:true,shBlur:60,shAlpha:.4,shY:28,frame:'win',ftheme:'light'}],
 ['Sunset',['#ff7e5f','#feb47b'],{bg:'gradient',c1:'#ff7e5f',c2:'#feb47b',use3:false,angle:135,pad:72,radius:14,shOn:true,shBlur:60,shAlpha:.4,shY:28,frame:'mac',ftheme:'light'}],
 ['Night',['#232526','#414345'],{bg:'gradient',c1:'#232526',c2:'#414345',use3:false,angle:160,pad:64,radius:12,shOn:true,shBlur:60,shAlpha:.55,shY:28,frame:'mac',ftheme:'dark'}],
 ['Aurora',['#667eea','#f093fb'],{bg:'gradient',c1:'#667eea',c2:'#764ba2',c3:'#f093fb',use3:true,angle:135,pad:80,radius:16,shOn:true,shBlur:70,shAlpha:.45,shY:30,frame:'browser',ftheme:'light'}],
 ['Glass',['#89f7fe','#66a6ff'],{bg:'gradient',c1:'#89f7fe',c2:'#66a6ff',use3:false,angle:135,pad:80,radius:22,shOn:true,shBlur:60,shAlpha:.3,shY:24,frame:'glass'}],
 ['Flat',['#ffffff','#e0e0e0'],{bg:'none',pad:0,radius:0,shOn:false,frame:'none',bdW:0}]];
function buildPanel(){
 const looks=SEC('looks',0,'looks','sparkle',`<div class="chips" id="looks">${LOOKS.map(([n,[a,b]],i)=>`<button type="button" class="chip act" data-look="${i}"><span class="dotc" style="background:linear-gradient(135deg,${a},${b})"></span><span>${n}</span></button>`).join('')}</div><div><button type="button" class="btn text sm" id="bReset">${ic('reset')}<span>${esc(t('resetStyle'))}</span></button></div>`);
 const bg=SEC('bg',1,'secBg','image',`${Ch('bg',[['gradient','bgGradient'],['solid','bgSolid'],['image','bgImage'],['none','bgNone']])}
  <div data-for="gradient" class="sub gp" id="gp">${PRESETS.map(([a,b],i)=>`<button type="button" class="gs" data-p="${i}" style="background:linear-gradient(135deg,${a},${b})"></button>`).join('')}</div>
  <div data-for="gradient" class="sub">${R('angle',0,360,1,'angle')}</div><div data-for="gradient" class="sub two">${Cl('c1','color1')}${Cl('c2','color2')}</div>
  <div data-for="gradient" class="sub">${Ck('use3','use3')}</div><div data-for="use3" class="sub">${Cl('c3','color3')}</div>
  <div data-for="solid" class="sub">${Cl('solid','color')}</div><div data-for="image" class="sub"><button type="button" class="btn tonal" id="bBg">${ic('image')}<span>${esc(t('pickBg'))}</span></button></div><div data-for="image" class="sub">${R('blur',0,40,1,'blur')}</div>`);
 const lay=SEC('layout',2,'secLayout','ratio',`${R('pad',0,240,2,'pad')}${R('radius',0,64,1,'radius')}
  <label class="fld"><div class="fl"><span>${esc(t('ratio'))}</span></div><div class="sel"><select class="tx" data-k="ratio">${[['auto',t('auto')],['1:1','1:1'],['4:3','4:3'],['3:2','3:2'],['16:9','16:9'],['9:16','9:16'],['4:5','4:5'],['2:1','2:1'],['custom',t('custom')]].map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('')}</select>${ic('expand')}</div></label>
  <div data-for="custom" class="sub two"><label class="fld"><div class="fl"><span>${esc(t('width'))}</span></div><input class="tx" type="number" min="16" max="8000" data-k="cw"></label><label class="fld"><div class="fl"><span>${esc(t('height'))}</span></div><input class="tx" type="number" min="16" max="8000" data-k="ch"></label></div>
  ${R('bdW',0,16,1,'border')}<div data-for="border" class="sub">${Cl('bdColor','bdColor')}</div><div data-for="border" class="sub">${R('bdA',0,1,.05,'opacity')}</div>
  ${Ck('shOn','shadow')}<div data-for="shadow" class="sub">${R('shBlur',0,150,1,'shBlur')}</div><div data-for="shadow" class="sub">${R('shAlpha',0,1,.05,'opacity')}</div><div data-for="shadow" class="sub">${R('shY',-60,100,1,'shY')}</div><div data-for="shadow" class="sub">${Cl('shColor','color')}</div>`);
 const fr=SEC('frame',3,'secFrame','window',`${Ch('frame',[['none','fNone'],['win','fWin'],['mac','fMac'],['browser','fBrowser'],['glass','fGlass']])}<div data-for="frame" class="sub">${Sg('ftheme',[['light','fLight'],['dark','fDark']])}</div><div data-for="frame" class="sub">${Tx('ftitle','fTitle')}</div>`);
 const cap=SEC('cap',4,'secCap','text',`${Tx('cap','capText')}<div data-for="cap" class="sub">${Sg('capPos',[['top','capTop'],['bottom','capBottom']])}</div><div data-for="cap" class="sub">${R('capSize',10,64,1,'size')}</div><div data-for="cap" class="sub">${Cl('capColor','color')}</div>`);
 const ann=SEC('ann',5,'secAnn','edit',`${Ch('tool',[['none','tNone','cursor'],['rect','tRect','max'],['arrow','tArrow','arrow'],['text','tText','text'],['hl','tHl','marker'],['blur','tBlur','grid']])}<div class="hint">${esc(t('annHint'))}</div>${Cl('ac','color')}${R('alw',1,16,1,'stroke')}${R('asz',12,96,1,'size')}${R('apx',4,40,1,'pixel')}
  <div><button type="button" class="btn tonal sm" id="aClear">${ic('trash')}<span>${esc(t('clearAnn'))}</span></button></div>`);
 const ex=SEC('exp',6,'secExp','download',`${Sg('fmt',[['png','~PNG'],['jpeg','~JPEG'],['webp','~WebP']])}<div data-for="fq" class="sub">${R('q',.5,1,.01,'quality')}</div><div class="fld"><div class="fl"><span>${esc(t('scale'))}</span></div>${Sg('sc',[[1,'~1x'],[2,'~2x'],[3,'~3x']])}</div><div class="hint">${esc(t('outSize'))}: <b id="oinfo"></b></div>`);
 $('#panel').innerHTML=looks+bg+lay+fr+cap+ann+ex;sync()}
function sync(){const vis={gradient:P.bg=='gradient',solid:P.bg=='solid',image:P.bg=='image',use3:P.bg=='gradient'&&P.use3,custom:P.ratio=='custom',border:P.bdW>0,shadow:P.shOn,frame:P.frame!='none'&&P.frame!='glass',cap:!!P.cap,fq:P.fmt!='png'};
 $$('#panel [data-for]').forEach(e=>e.hidden=!vis[e.dataset.for]);
 $$('#panel [data-k]').forEach(e=>{const k=e.dataset.k;if(e.type=='checkbox')e.checked=!!P[k];else if(document.activeElement!==e||e.type!='text'){e.value=P[k];if(e.type=='range'){const mn=+e.min,mx=+e.max;e.style.setProperty('--v',((P[k]-mn)/(mx-mn)*100)+'%')}}});
 $$('#panel [data-o]').forEach(o=>{const k=o.dataset.o,v=P[k];o.textContent=k=='angle'?v+'°':(k=='bdA'||k=='shAlpha'||k=='q')?Math.round(v*100)+'%':v});
 $$('#panel [data-seg]').forEach(s=>{const k=s.dataset.seg;s.querySelectorAll('button').forEach(b=>b.classList.toggle('on',String(b.dataset.v)==String(P[k])))});
 $$('#gp .gs').forEach((b,i)=>b.classList.toggle('on',P.bg=='gradient'&&PRESETS[i][0]==P.c1&&PRESETS[i][1]==P.c2&&!P.use3))}
let saveT;const saveP=()=>{clearTimeout(saveT);saveT=setTimeout(()=>ls('P',JSON.stringify(P)),250)};
const apply=()=>{saveP();sync();redraw()};
$('#panel').addEventListener('input',e=>{const el=e.target,k=el.dataset.k;if(!k)return;P[k]=el.type=='checkbox'?el.checked:(el.type=='range'||el.type=='number')?+el.value:el.value;apply()});
$('#panel').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 const sh=b.closest('.sec-h');if(sh){const s=sh.parentElement;s.classList.toggle('open');OPEN[s.dataset.sec]=s.classList.contains('open')?1:0;ls('open',JSON.stringify(OPEN));return}
 const seg=b.closest('[data-seg]');if(seg){const k=seg.dataset.seg,v=b.dataset.v;P[k]=isNaN(v)?v:+v;apply();return}
 if(b.dataset.p!=null){const [a,c]=PRESETS[+b.dataset.p];P.c1=a;P.c2=c;P.use3=false;P.bg='gradient';apply()}
 else if(b.dataset.look!=null){Object.assign(P,LOOKS[+b.dataset.look][2]);apply()}
 else if(b.id=='bReset'){P=Object.assign({},DEF);apply();toast(t('resetStyle'))}
 else if(b.id=='bBg')$('#fileBg').click();else if(b.id=='aClear'&&S.ann.length){pushHist();S.ann=[];redraw()}});
$('#fileBg').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f){const bm=await fromBlob(f,f.name,true);if(bm){S.bgImg=bm;P.bg='image';apply()}}};

/* ---------- canvas interaction: annotate + crop ---------- */
const cv=$('#cv');
function pt(e){const r=cv.getBoundingClientRect(),fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;
 if(S.cropMode)return {x:Math.max(0,Math.min(S.crop.w,fx*S.crop.w)),y:Math.max(0,Math.min(S.crop.h,fy*S.crop.h))};
 const L=S.L;return {x:Math.max(0,Math.min(L.iw,fx*L.W-L.ix)),y:Math.max(0,Math.min(L.ih,fy*L.H-L.iy))}}
cv.addEventListener('pointerdown',e=>{if(!S.img)return;const p=pt(e);
 if(S.cropMode){S.sel={x0:p.x,y0:p.y,x1:p.x,y1:p.y};cv.setPointerCapture(e.pointerId);return}
 if(P.tool=='none')return;if(P.tool=='text'){textBox(e,p);return}
 S.cur={t:P.tool,x:p.x,y:p.y,w:0,h:0,x1:p.x,y1:p.y,ox:p.x,oy:p.y,c:P.ac,lw:P.alw,px:P.apx};cv.setPointerCapture(e.pointerId)});
const dragTo=(a,p)=>{if(a.t=='arrow'){a.x1=p.x;a.y1=p.y}else{a.x=Math.min(a.ox,p.x);a.y=Math.min(a.oy,p.y);a.w=Math.abs(p.x-a.ox);a.h=Math.abs(p.y-a.oy)}};
cv.addEventListener('pointermove',e=>{if(S.cropMode){if(S.sel&&e.buttons){const p=pt(e);S.sel.x1=p.x;S.sel.y1=p.y;redraw()}return}if(!S.cur)return;dragTo(S.cur,pt(e));redraw()});
cv.addEventListener('pointerup',e=>{if(S.cropMode)return;const a=S.cur;if(!a)return;S.cur=null;dragTo(a,pt(e));
 const tiny=a.t=='arrow'?Math.hypot(a.x1-a.x,a.y1-a.y)<6:(a.w<4||a.h<4);if(tiny){redraw();return}pushHist();S.ann.push(a);redraw()});
function textBox(e,p){const st=$('#stage').getBoundingClientRect(),i=document.createElement('input');i.type='text';i.id='tbx';i.style.left=(e.clientX-st.left)+'px';i.style.top=(e.clientY-st.top)+'px';$('#stage').append(i);i.focus();let done=false;
 const end=ok=>{if(done)return;done=true;const v=i.value.trim();i.remove();if(ok&&v){pushHist();S.ann.push({t:'text',x:p.x,y:p.y,s:v,c:P.ac,size:P.asz});redraw()}};
 i.onkeydown=ev=>{if(ev.key=='Enter')end(true);else if(ev.key=='Escape')end(false)};i.onblur=()=>end(true)}
function enterCrop(){if(!S.img)return;S.cropMode=true;S.sel=null;$('#cropbar').hidden=false;cv.classList.add('draw');redraw()}
function exitCrop(){S.cropMode=false;S.sel=null;$('#cropbar').hidden=true;redraw()}
$('#cOk').onclick=()=>{const s=selRect();if(!s||s.w<8||s.h<8){exitCrop();return}pushHist();const dx=Math.round(s.x),dy=Math.round(s.y);
 S.ann.forEach(a=>{a.x-=dx;a.y-=dy;if(a.x1!=null){a.x1-=dx;a.y1-=dy}});S.crop={x:S.crop.x+dx,y:S.crop.y+dy,w:Math.round(s.w),h:Math.round(s.h)};exitCrop()};
$('#cReset').onclick=()=>{const c=S.crop;if(c.x||c.y||c.w!=iw(S.img)||c.h!=ih(S.img)){pushHist();S.ann.forEach(a=>{a.x+=c.x;a.y+=c.y;if(a.x1!=null){a.x1+=c.x;a.y1+=c.y}});S.crop={x:0,y:0,w:iw(S.img),h:ih(S.img)}}S.sel=null;redraw()};
$('#cNo').onclick=exitCrop;

/* ---------- export ---------- */
let tt;function toast(m){const e=$('#sb');e.textContent=m;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),2400)}
const MIME={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'};
const toBlob=(c,ty,q)=>new Promise(r=>c.toBlob(r,ty,q));
const b64=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(String(f.result).split(',')[1]);f.readAsDataURL(b)});
async function doCopy(){if(!S.img)return toast(t('noImage'));try{const b=await toBlob(renderExport(),'image/png');await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);toast(t('copied'))}catch{toast(t('copyFail'))}}
async function doSave(){if(!S.img)return toast(t('noImage'));if(exportScale()<P.sc)toast(t('limited'));const b=await toBlob(renderExport(),MIME[P.fmt],P.q),name=`${S.name}-beautified.${P.fmt=='jpeg'?'jpg':P.fmt}`;
 if(TA){try{const r=await inv('save_image',{name,data:await b64(b),dir:saveDir,ask:askSave});if(r)toast(`${t('savedTo')} ${r}`)}catch{toast(t('saveFail'))}}else{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast(t('saved'))}}

/* ---------- dialogs ---------- */
const openDlg=d=>{d.classList.remove('closing');if(!d.open)d.showModal()};
const closeDlg=d=>{if(!d.open||d.classList.contains('closing'))return;d.classList.add('closing');setTimeout(()=>{d.close();d.classList.remove('closing')},180)};
$$('dialog').forEach(d=>{d.addEventListener('cancel',e=>{e.preventDefault();closeDlg(d)});d.addEventListener('mousedown',e=>{if(e.target===d)closeDlg(d)})});
$$('[data-close]').forEach(b=>b.onclick=()=>closeDlg(b.closest('dialog')));
function swatchBg(id,s){const sc=scheme(s,isDark(themeMode),0);return `linear-gradient(135deg,${sc.primary} 50%,${sc.primaryContainer} 50%)`}
function setBody(){
 const sg=(a,l,c)=>`<div class="seg">${l.map(([v,n])=>`<button type="button" ${a}="${v}" class="${String(v)==String(c)?'on':''}">${ic('check')}<span>${esc(n)}</span></button>`).join('')}</div>`;
 const known=PALETTE.some(([,s])=>s.toLowerCase()==seed.toLowerCase());
 $('#setBody').innerHTML=`<div><h3>${ic('moon')}${esc(t('sTheme'))}</h3>${sg('data-th',[['system',t('system')],['light',t('light')],['dark',t('dark')]],themeMode)}</div>
 <div><h3>${ic('palette')}${esc(t('sColor'))}</h3><div class="swr">${PALETTE.map(([id,s])=>`<button type="button" class="swatch${s.toLowerCase()==seed.toLowerCase()?' on':''}" data-seed="${s}" title="${esc(tc(id))}" style="background:${swatchBg(id,s)}">${ic('check')}</button>`).join('')}<button type="button" class="swatch cu${known?'':' on'}" data-custom title="${esc(t('customColor'))}">${ic('palette','pal')}${ic('check','chk')}</button></div>
  <div class="hint" style="margin-top:10px">${esc(known?tc(PALETTE.find(([,s])=>s.toLowerCase()==seed.toLowerCase())[0]):t('customColor'))} · ${esc(seed.toUpperCase())}</div></div>
 <div><h3>${ic('contrast')}${esc(t('sContrast'))}</h3>${sg('data-ct',[[0,t('cStd')],[.5,t('cMed')],[1,t('cHigh')]],contrast)}</div>
 <div><h3>${ic('lang')}${esc(t('sLang'))}</h3>${sg('data-lg',[['auto',t('system')],['vi','Tiếng Việt'],['en','English']],langPref)}</div>
 <div><h3>${ic('folder')}${esc(t('sSave'))}</h3><span class="path" title="${esc(saveDir||dlDir)}">${esc(saveDir||(dlDir?dlDir+'  ·  ':'')+t('saveDefault'))}</span>
  <div class="btnrow"><button type="button" class="btn tonal sm" data-pickdir>${ic('folder')}<span>${esc(t('chooseFolder'))}</span></button>${saveDir?`<button type="button" class="btn text sm" data-resetdir>${ic('reset')}<span>${esc(t('resetFolder'))}</span></button>`:''}</div>
  <label class="fld cr" style="margin-top:6px"><span>${esc(t('askSave'))}</span><input type="checkbox" class="sw" data-ask ${askSave?'checked':''}></label></div>
 <div><h3>${ic('window')}${esc(t('sWin'))}</h3><div class="opts">
  <button type="button" class="opt${winMode=='remember'?' on':''}" data-wm="remember">${ic('ratio')}<span><b>${esc(t('winRemember'))}</b><small>${esc(t('winRememberD'))}</small></span><span class="radio"></span></button>
  <button type="button" class="opt${winMode=='maximized'?' on':''}" data-wm="maximized">${ic('full')}<span><b>${esc(t('winMax'))}</b><small>${esc(t('winMaxD'))}</small></span><span class="radio"></span></button></div></div>`}
function applyI18n(){document.documentElement.lang=lang;$$('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));$$('[data-t]').forEach(e=>{e.title=t(e.dataset.t)});buildPanel();info();if($('#dSet').open){setBody();$('#dSet .hi+h2').textContent=t('settings')}}
$('#setBody').onclick=e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.th){themeMode=d.th;ls('theme',themeMode);paint(true)}
 else if(d.ct!=null){contrast=+d.ct;ls('contrast',contrast);paint(true)}
 else if(d.lg){langPref=d.lg;ls('lang',langPref);lang=langPref==='auto'?detectLang():langPref;applyI18n()}
 else if(d.seed){seed=d.seed;ls('seed',seed);paint(true)}
 else if('custom' in d){$('#cc').value=seed.toLowerCase();$('#cc').click();return}
 else if('pickdir' in d){(async()=>{try{const r=await TA.dialog.open({directory:true,multiple:false,defaultPath:saveDir||dlDir||undefined});if(r){saveDir=r;ls('saveDir',r);setBody()}}catch{}})();return}
 else if('resetdir' in d){saveDir='';ls('saveDir','')}
 else if(d.wm){winMode=d.wm;ls('winMode',winMode);if(TA)inv('set_window_mode',{mode:winMode}).catch(()=>{})}
 setBody()};
$('#setBody').addEventListener('change',e=>{if(e.target.dataset.ask!==undefined){askSave=e.target.checked;ls('askSave',askSave?'1':'0')}});
$('#cc').oninput=e=>{seed=e.target.value;ls('seed',seed);paint(true);setBody()};

/* ---------- wiring ---------- */
$('#bOpen').onclick=$('#bOpen2').onclick=pick;$('#bPaste').onclick=$('#bPaste2').onclick=pasteBtn;$('#bSample').onclick=()=>setSource(makeSample(),'sample');
$('#file').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)fromBlob(f,f.name)};
$('#bCrop').onclick=()=>S.cropMode?exitCrop():enterCrop();$('#bUndo').onclick=undo;$('#bRedo').onclick=redo;$('#bCopy').onclick=doCopy;$('#bSave').onclick=doSave;
const openSet=()=>{setBody();openDlg($('#dSet'))};
$('#bSet').onclick=openSet;$('#bAbout').onclick=()=>openDlg($('#dAbout'));
document.addEventListener('pointerdown',e=>{const el=e.target.closest('.btn,.ib,.chip,.opt,.sec-h,.seg button,.swatch,.wc button');if(!el||el.disabled)return;
 const r=el.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,sp=document.createElement('span');sp.className='rip';sp.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;el.appendChild(sp);setTimeout(()=>sp.remove(),600)});
document.addEventListener('paste',e=>{if(e.target.tagName=='INPUT')return;const it=[...(e.clipboardData?e.clipboardData.items:[])].find(x=>x.type.startsWith('image/'));if(it){e.preventDefault();fromBlob(it.getAsFile(),'pasted')}});
const dragOn=on=>$('#stage').classList.toggle('drag',on);
['dragover','dragenter'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();dragOn(true)}));
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)dragOn(false)});
document.addEventListener('drop',e=>{e.preventDefault();dragOn(false);const f=e.dataTransfer&&e.dataTransfer.files[0];if(f&&f.type.startsWith('image/')&&!TA)fromBlob(f,f.name)});
document.addEventListener('keydown',e=>{const tg=e.target;if((tg.tagName=='INPUT'&&tg.type=='text')||tg.tagName=='SELECT'||tg.tagName=='TEXTAREA')return;const k=e.key.toLowerCase();
 if(e.ctrlKey&&k=='o'){e.preventDefault();pick()}else if(e.ctrlKey&&k=='s'){e.preventDefault();doSave()}else if(e.ctrlKey&&e.shiftKey&&k=='c'){e.preventDefault();doCopy()}
 else if(e.ctrlKey&&k==','){e.preventDefault();openSet()}
 else if(e.ctrlKey&&k=='z'){e.preventDefault();undo()}else if(e.ctrlKey&&k=='y'){e.preventDefault();redo()}
 else if(S.cropMode&&k=='enter')$('#cOk').click();else if(S.cropMode&&k=='escape')exitCrop()});
if(document.fonts)document.fonts.load('600 16px Roboto').then(()=>redraw()).catch(()=>{});
if(window.ResizeObserver)new ResizeObserver(()=>redraw()).observe($('#stage'));

/* ---------- Tauri window integration ---------- */
async function initWindow(){
 document.body.classList.add('tw');
 const W=TA.window.getCurrentWindow();
 TA.event.listen('tauri://drag-drop',e=>{dragOn(false);const p=e.payload&&e.payload.paths&&e.payload.paths[0];if(p)fromPath(p)});
 TA.event.listen('tauri://drag-enter',()=>dragOn(true));TA.event.listen('tauri://drag-leave',()=>dragOn(false));
 W.isDecorated().then(d=>{if(d)document.body.classList.add('native')}).catch(()=>{});
 $('#wMin').onclick=()=>W.minimize();$('#wMax').onclick=()=>W.toggleMaximize();$('#wClose').onclick=()=>W.close();
 let q=0;const sync2=()=>W.isMaximized().then(m=>{$('#wMaxUse').setAttribute('href',m?'#i-restore':'#i-max');$('#wMax').dataset.t=m?'restore':'maximize';$('#wMax').title=t(m?'restore':'maximize')}).catch(()=>{});
 W.onResized(()=>{cancelAnimationFrame(q);q=requestAnimationFrame(sync2)});sync2();
 try{winMode=await inv('get_window_mode');ls('winMode',winMode)}catch{}
 try{dlDir=await inv('get_download_dir')}catch{}}
paint(false);applyI18n();btns();
if(TA)initWindow();
/* The window starts hidden (no white flash); reveal it after the first themed paint. */
requestAnimationFrame(()=>requestAnimationFrame(()=>{if(TA)inv('app_ready').catch(()=>{})}));
