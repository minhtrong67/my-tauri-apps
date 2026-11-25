// CSS của app theo Microsoft Fluent Design (WinUI 3 / Windows 11): Mica, lớp (layer), góc bo 4/8px, accent xanh Windows
export default `
:root{
  --ease:cubic-bezier(0,0,0,1);--ease-in:cubic-bezier(.7,0,1,.5);
  --font:"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,sans-serif;
  --font-d:"Segoe UI Variable Display","Segoe UI",system-ui,-apple-system,sans-serif;
}
:root,:root[data-theme=light]{
  color-scheme:light;
  --solid:#f3f3f3;--card:rgba(255,255,255,.7);--card-stroke:rgba(0,0,0,.0578);
  --ctl:rgba(255,255,255,.7);--ctl-hover:rgba(249,249,249,.5);--ctl-press:rgba(249,249,249,.3);
  --ctl-stroke:rgba(0,0,0,.0578);--ctl-stroke-b:rgba(0,0,0,.1622);
  --subtle:rgba(0,0,0,.0373);--subtle-press:rgba(0,0,0,.0241);--divider:rgba(0,0,0,.0803);
  --fg:#1a1a1a;--fg2:rgba(0,0,0,.6063);--fg3:rgba(0,0,0,.4458);--fgdis:rgba(0,0,0,.3614);
  --accent:#005fb8;--on-accent:#fff;--accent-text:#003e92;--acc-dis-bg:rgba(0,0,0,.2169);--acc-dis-fg:#fff;
  --flyout:#fcfcfc;--flyout-stroke:rgba(0,0,0,.0578);--scrim:rgba(0,0,0,.3);--dlg-foot:rgba(243,243,243,.9);
  --ok:#0f7b0f;--ok-bg:#dff6dd;--err:#c42b1c;--err-bg:#fde7e9;--warn:#9d5d00;--warn-bg:#fff4ce;
  --info-bg:rgba(0,95,184,.08);--ai-fg:#5c2e91;--ai-bg:rgba(135,100,184,.16);--focus:#000;
  --t0-bg:#cfe4fa;--t0-fg:#0f548c;--t1-bg:#cdeeee;--t1-fg:#0b6a6a;--t2-bg:#e6dcf5;--t2-fg:#5c2e91;
  --shadow-fly:0 8px 16px rgba(0,0,0,.14),0 0 2px rgba(0,0,0,.12);
  --shadow-dlg:0 32px 64px rgba(0,0,0,.19),0 2px 21px rgba(0,0,0,.15);
}
:root[data-theme=dark]{
  color-scheme:dark;
  --solid:#202020;--card:rgba(255,255,255,.0512);--card-stroke:rgba(255,255,255,.0698);
  --ctl:rgba(255,255,255,.0605);--ctl-hover:rgba(255,255,255,.0837);--ctl-press:rgba(255,255,255,.0326);
  --ctl-stroke:rgba(255,255,255,.0698);--ctl-stroke-b:rgba(255,255,255,.0698);
  --subtle:rgba(255,255,255,.0605);--subtle-press:rgba(255,255,255,.0419);--divider:rgba(255,255,255,.0837);
  --fg:#fff;--fg2:rgba(255,255,255,.7849);--fg3:rgba(255,255,255,.5442);--fgdis:rgba(255,255,255,.3628);
  --accent:#60cdff;--on-accent:#000;--accent-text:#99ebff;--acc-dis-bg:rgba(255,255,255,.1581);--acc-dis-fg:rgba(255,255,255,.5302);
  --flyout:#2c2c2c;--flyout-stroke:rgba(255,255,255,.0837);--scrim:rgba(0,0,0,.5);--dlg-foot:rgba(32,32,32,.9);
  --ok:#6ccb5f;--ok-bg:#393d1b;--err:#ff99a4;--err-bg:#442726;--warn:#fce100;--warn-bg:#433519;
  --info-bg:rgba(96,205,255,.1);--ai-fg:#cdb8f5;--ai-bg:rgba(180,150,230,.18);--focus:#fff;
  --t0-bg:#0f3a5f;--t0-fg:#9fd5ff;--t1-bg:#0d4a4a;--t1-fg:#8fe0e0;--t2-bg:#3a2a5a;--t2-fg:#cdb8f5;
  --shadow-fly:0 8px 16px rgba(0,0,0,.37),0 0 2px rgba(0,0,0,.3);
  --shadow-dlg:0 32px 64px rgba(0,0,0,.37),0 2px 21px rgba(0,0,0,.3);
}

*{box-sizing:border-box;margin:0}
html,body,#root{height:100%}
body{background:var(--solid);color:var(--fg);font:400 14px/20px var(--font);-webkit-font-smoothing:antialiased;overflow:hidden;user-select:none;-webkit-user-select:none}
:root[data-fx]:not([data-fx=none]) body{background:transparent}
input{user-select:text;-webkit-user-select:text}
button,input{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0;padding:0;-webkit-tap-highlight-color:transparent}
button:disabled{cursor:default}
:focus-visible{outline:2px solid var(--focus);outline-offset:1px;border-radius:4px}
html.theme-anim *{transition:background-color .25s,color .25s,border-color .25s!important}
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-thumb{background:var(--fg3);border-radius:4px;border:2px solid transparent;background-clip:content-box}

/* ---- Nút ---- */
.btn{height:32px;min-width:80px;padding:0 12px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;background:var(--ctl);border:1px solid var(--ctl-stroke);border-bottom-color:var(--ctl-stroke-b);transition:background-color .083s linear}
.btn:hover:not(:disabled){background:var(--ctl-hover)}
.btn:active:not(:disabled){background:var(--ctl-press);color:var(--fg2)}
.btn.sm{height:28px;min-width:0;padding:0 10px}
.btn.accent{background:var(--accent);color:var(--on-accent);border-color:rgba(255,255,255,.08);border-bottom-color:rgba(0,0,0,.4)}
.btn.accent:hover:not(:disabled){background:color-mix(in srgb,var(--accent) 90%,transparent)}
.btn.accent:active:not(:disabled){background:color-mix(in srgb,var(--accent) 80%,transparent);color:var(--on-accent)}
.btn.danger{color:var(--err)}
.btn:disabled{color:var(--fgdis);background:var(--subtle-press);border-color:transparent}
.btn.accent:disabled{background:var(--acc-dis-bg);color:var(--acc-dis-fg)}
.ib{width:32px;height:32px;flex:none;border-radius:4px;display:grid;place-items:center;color:var(--fg2);transition:background-color .083s linear}
.ib:hover:not(:disabled){background:var(--subtle);color:var(--fg)}
.ib:active:not(:disabled){background:var(--subtle-press)}
.ib:disabled{color:var(--fgdis)}
.ib svg{transition:transform .3s var(--ease)}
.gear[aria-expanded=true]{background:var(--subtle)}
.gear[aria-expanded=true] svg{transform:rotate(90deg)}

/* ---- Bố cục ---- */
main{height:100%;display:flex;flex-direction:column;max-width:800px;margin:0 auto;padding:20px 24px 0}
header.top{display:flex;align-items:flex-start;gap:16px;position:relative}
.brand{display:flex;gap:14px;align-items:center;flex:1;min-width:0}
.brand>svg{flex:none;border-radius:9px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.2))}
h1{font:600 20px/28px var(--font-d)}
.sub{color:var(--fg2)}
.credit{margin-top:4px;font-size:12px;line-height:20px;color:var(--fg2)}
.tag{display:inline-block;padding:0 6px;border-radius:4px;font-weight:600}
.tag.author{background:var(--info-bg);color:var(--accent-text)}
.tag.ai{background:var(--ai-bg);color:var(--ai-fg)}
.grow{flex:1;min-width:0}

/* ---- Thẻ (Card) ---- */
.card{margin-top:16px;padding:16px;border-radius:8px;background:var(--card);border:1px solid var(--card-stroke)}
.card-h{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
.cico{width:32px;height:32px;flex:none;display:grid;place-items:center;border-radius:4px;background:var(--info-bg);color:var(--accent-text)}
.card-h h2{font:600 14px/20px var(--font)}
.card-h p{margin-top:2px;color:var(--fg2);font-size:12px;line-height:16px}
.badge{flex:none;height:20px;padding:0 8px;border-radius:10px;font-size:12px;line-height:20px;font-weight:600;font-variant-numeric:tabular-nums;background:var(--subtle);color:var(--fg2)}

/* ---- Ô chọn nhiều trang ---- */
.picker{position:relative}
.pick{min-height:36px;display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:3px 3px 3px 8px;border-radius:4px;background:var(--ctl);border:1px solid var(--ctl-stroke);border-bottom-color:var(--ctl-stroke-b);cursor:text;transition:background-color .083s linear}
.pick:hover{background:var(--ctl-hover)}
.pick:focus-within{border-bottom-color:var(--accent);box-shadow:inset 0 -1px 0 var(--accent);background:var(--flyout)}
.pick.bad,.pick.bad:focus-within{border-bottom-color:var(--err);box-shadow:inset 0 -1px 0 var(--err)}
.pick input{flex:1;min-width:140px;height:28px;background:none;border:0;outline:0;padding:0 4px}
.pick input::placeholder{color:var(--fg2)}
.tok{height:26px;max-width:210px;display:inline-flex;align-items:center;gap:6px;padding:0 2px 0 4px;border-radius:4px;background:var(--subtle);border:1px solid var(--divider);animation:fade .2s var(--ease)}
.tl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tx{width:20px;height:20px;border-radius:3px;display:grid;place-items:center;color:var(--fg2);flex:none}
.tx:hover{background:var(--subtle);color:var(--fg)}
.cv{width:28px;height:28px;border-radius:4px;display:grid;place-items:center;color:var(--fg2);flex:none}
.cv:hover{background:var(--subtle)}
.pnote{margin-top:6px;font-size:12px;line-height:16px;color:var(--fg2);animation:fade .2s}
.pnote.err{color:var(--err)}

.drop{list-style:none;position:fixed;z-index:60;padding:4px;max-height:320px;overflow:auto;background:var(--flyout);border:1px solid var(--flyout-stroke);border-radius:8px;box-shadow:var(--shadow-fly);transform-origin:top;animation:menu .167s var(--ease)}
.dh{display:flex;justify-content:space-between;padding:6px 10px 4px;font-size:12px;line-height:16px;color:var(--fg2);font-weight:600}
.cnt{font-variant-numeric:tabular-nums}
.dempty{padding:12px 10px;color:var(--fg2)}
.site{position:relative;display:flex;align-items:center;gap:10px;min-height:48px;padding:4px 6px 4px 10px;margin:2px 0;border-radius:4px;cursor:pointer}
.site.hi{background:var(--subtle)}
.site[aria-selected=true]{background:var(--subtle-press)}
.site[aria-selected=true].hi{background:var(--subtle)}
.site[aria-disabled=true]{opacity:.45;cursor:default}
.si{flex:1;min-width:0;display:flex;flex-direction:column}
.si b{font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.si small{color:var(--fg2);font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.site .x{width:28px;height:28px;border-radius:4px;display:grid;place-items:center;color:var(--fg2);opacity:0;transition:opacity .1s}
.site:hover .x,.site.hi .x{opacity:1}
.site .x:hover{color:var(--err);background:var(--subtle)}
.plus{width:20px;height:20px;display:grid;place-items:center;color:var(--accent-text)}
.site.add .si b{color:var(--accent-text)}

.fav,.av{display:grid;place-items:center;flex:none;font-weight:600}
.fav{border-radius:4px}
.t0{background:var(--t0-bg);color:var(--t0-fg)}
.t1{background:var(--t1-bg);color:var(--t1-fg)}
.t2{background:var(--t2-bg);color:var(--t2-fg)}

/* ---- CheckBox ---- */
.cb{width:20px;height:20px;flex:none;border-radius:4px;display:grid;place-items:center;border:1px solid var(--fg2);color:transparent;transition:background-color .083s linear,border-color .083s linear}
.cb svg{transform:scale(.4);transition:transform .167s var(--ease)}
[aria-checked=true]>.cb,[aria-selected=true]>.cb{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
[aria-checked=true]>.cb svg,[aria-selected=true]>.cb svg{transform:none}
button:hover:not(:disabled)>.cb:not(:is([aria-checked=true]>.cb)){background:var(--subtle)}

/* ---- Pivot (chọn trình duyệt) ---- */
.pivot{display:flex;gap:2px;margin-top:16px;overflow-x:auto;scrollbar-width:none}
.pivot::-webkit-scrollbar{display:none}
.pivot button{position:relative;height:36px;padding:0 12px;border-radius:4px;color:var(--fg2);white-space:nowrap;transition:background-color .083s linear,color .083s linear}
.pivot button:hover{background:var(--subtle);color:var(--fg)}
.pivot button[aria-selected=true]{color:var(--fg);font-weight:600}
.pivot button::after{content:"";position:absolute;left:12px;right:12px;bottom:1px;height:3px;border-radius:2px;background:var(--accent);transform:scaleX(0);transition:transform .2s var(--ease)}
.pivot button[aria-selected=true]::after{transform:scaleX(1)}

.infobar{display:flex;align-items:flex-start;gap:10px;margin-top:8px;padding:10px 12px;border-radius:4px;background:var(--info-bg);border:1px solid var(--card-stroke);font-size:12px;line-height:16px;color:var(--fg2);animation:fade .2s}
.infobar svg{flex:none;color:var(--accent-text);margin-top:-1px}

/* ---- Tìm kiếm ---- */
.bar{display:flex;align-items:center;gap:8px;margin:8px 0}
.search{flex:1;min-width:0;height:32px;display:flex;align-items:center;gap:8px;padding:0 10px 0 12px;border-radius:4px;background:var(--ctl);border:1px solid var(--ctl-stroke);border-bottom-color:var(--ctl-stroke-b);color:var(--fg2);cursor:text}
.search:hover{background:var(--ctl-hover)}
.search:focus-within{background:var(--flyout);border-bottom-color:var(--accent);box-shadow:inset 0 -1px 0 var(--accent)}
.search input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--fg)}
.search input::placeholder{color:var(--fg2)}

/* ---- Danh sách profile (ListView) ---- */
.list{list-style:none;padding:0 4px 100px;margin:0 -4px;flex:1;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:2px}
.list li{position:relative;display:flex;align-items:center;gap:4px;flex:none;padding-right:8px;border-radius:4px;animation:rise .3s var(--ease) both;animation-delay:calc(var(--i)*30ms)}
.list li:hover{background:var(--subtle)}
.list li.sel{background:var(--subtle-press)}
.list li.sel:hover{background:var(--subtle)}
.list li.sel::before{content:"";position:absolute;left:0;top:50%;width:3px;height:16px;margin-top:-8px;border-radius:2px;background:var(--accent)}
.rchk{width:40px;height:48px;flex:none;display:grid;place-items:center}
.row{flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:6px 8px 6px 0;border-radius:4px;text-align:left}
.avw{position:relative;flex:none}
.av{position:relative;overflow:hidden;width:40px;height:40px;border-radius:50%;font-size:16px}
.av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:fade .3s}
.meta{flex:1;min-width:0;display:flex;flex-direction:column}
.meta b{font-weight:600}
.meta small{color:var(--fg2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.go{color:var(--accent-text);font-weight:600;opacity:0;transform:translateX(-4px);transition:opacity .15s,transform .2s var(--ease)}
.row:hover .go,.row:focus-visible .go{opacity:1;transform:none}
.dot{position:absolute;right:-2px;bottom:-2px;width:12px;height:12px;border-radius:50%;border:2px solid var(--solid);background:var(--ok)}
.dot.wait{background:var(--warn);animation:blink 1s ease-in-out infinite}
.pill{height:20px;padding:0 8px;display:inline-flex;align-items:center;border-radius:10px;font-size:12px;font-weight:600;animation:fade .2s}
.pill.live{background:var(--ok-bg);color:var(--ok)}
.pill.wait{background:var(--warn-bg);color:var(--warn)}
.sitesbtn{height:28px;padding:0 8px;display:inline-flex;align-items:center;gap:6px;border-radius:4px;border:1px solid var(--divider);color:var(--fg2);font-variant-numeric:tabular-nums;transition:background-color .083s linear}
.sitesbtn:hover{background:var(--subtle);color:var(--fg)}
.sitesbtn.custom{background:var(--info-bg);color:var(--accent-text);border-color:transparent}

.sk{height:48px;margin:2px 0;border-radius:4px;background:linear-gradient(90deg,var(--subtle) 25%,var(--ctl-hover) 50%,var(--subtle) 75%);background-size:200% 100%;animation:shimmer 1.4s linear infinite}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding-bottom:80px;animation:fade .3s}
.empty p{font:600 14px/20px var(--font)}
.empty small{color:var(--fg2);max-width:46ch;word-break:break-word}
.empty .btn{margin-top:8px}

/* ---- Thanh lệnh dưới (CommandBar) ---- */
footer{position:fixed;inset:auto 0 0 0;padding:10px 24px;background:color-mix(in srgb,var(--flyout) 78%,transparent);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-top:1px solid var(--divider)}
footer>div{max-width:752px;margin:0 auto;display:flex;align-items:center;justify-content:flex-end;gap:8px}
.count{flex:1;color:var(--fg2);white-space:nowrap}

.toast{position:fixed;left:50%;bottom:72px;transform:translateX(-50%);min-height:40px;display:flex;align-items:center;padding:0 16px;border-radius:4px;background:var(--flyout);border:1px solid var(--flyout-stroke);border-left:4px solid var(--ok);box-shadow:var(--shadow-fly);max-width:80vw;z-index:90;animation:snack .25s var(--ease)}
.toast.err{border-left-color:var(--err);background:var(--err-bg)}

/* ---- Cài đặt (Flyout) ---- */
.panel{position:absolute;right:0;top:40px;z-index:50;width:380px;max-width:calc(100vw - 32px);max-height:calc(100vh - 80px);overflow:auto;padding:16px;border-radius:8px;background:var(--flyout);border:1px solid var(--flyout-stroke);box-shadow:var(--shadow-fly);transform-origin:top right;outline:0;animation:pop .167s var(--ease)}
.panel h2{font:600 20px/28px var(--font-d);margin-bottom:12px}
.grp+.grp{margin-top:16px}
.lbl{display:block;font-weight:600;margin-bottom:6px}
.note{margin-top:6px;color:var(--fg2);font-size:12px;line-height:16px}
.grp.line{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid var(--divider)}
.grp.line .lbl{margin:0;font-weight:400;color:var(--fg2)}

.seg{display:flex;gap:2px;padding:2px;border-radius:6px;background:var(--subtle);border:1px solid var(--divider)}
.seg button{position:relative;flex:1;height:30px;display:flex;align-items:center;justify-content:center;padding:0 10px;border-radius:4px;color:var(--fg2);white-space:nowrap;transition:background-color .083s linear}
.seg button:hover{background:var(--subtle)}
.seg button[aria-checked=true]{background:var(--ctl-hover);color:var(--fg);box-shadow:0 1px 2px rgba(0,0,0,.12);border:1px solid var(--ctl-stroke)}
.seg button[aria-checked=true]{background:var(--flyout)}
.seg button::after{content:"";position:absolute;left:50%;bottom:1px;width:16px;height:3px;margin-left:-8px;border-radius:2px;background:var(--accent);transform:scaleX(0);transition:transform .2s var(--ease)}
.seg button[aria-checked=true]::after{transform:scaleX(1)}

.opts{display:grid;gap:2px}
.opt{display:flex;gap:12px;align-items:flex-start;text-align:left;padding:8px 10px;border-radius:4px;transition:background-color .083s linear}
.opt:hover{background:var(--subtle)}
.opt b{display:block;font-weight:400}
.opt small{color:var(--fg2);font-size:12px;line-height:16px}
.radio{width:20px;height:20px;flex:none;margin-top:0;position:relative;border-radius:50%;border:1px solid var(--fg2);transition:border-color .1s,background-color .1s}
.radio::after{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--on-accent);transform:scale(0);transition:transform .167s var(--ease)}
.opt[aria-checked=true] .radio{background:var(--accent);border-color:var(--accent)}
.opt[aria-checked=true] .radio::after{transform:scale(1)}

/* ---- Hộp thoại (ContentDialog) ---- */
.scrim{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:24px;background:var(--scrim);animation:fade .167s linear}
.modal{width:min(520px,100%);max-height:100%;display:flex;flex-direction:column;background:var(--flyout);border:1px solid var(--flyout-stroke);border-radius:8px;box-shadow:var(--shadow-dlg);outline:0;animation:dlg .25s var(--ease)}
.mh{padding:24px 24px 8px}
.mh h2{font:600 20px/28px var(--font-d)}
.mb{padding:8px 24px 24px;overflow:auto;min-height:0}
.mb .mt{margin-top:16px}
.mf{display:flex;justify-content:flex-end;gap:8px;padding:24px;background:var(--dlg-foot);border-top:1px solid var(--divider);border-radius:0 0 8px 8px}
.mf .btn{min-width:120px}

@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}}
@keyframes pop{from{opacity:0;transform:scale(.97) translateY(-6px)}}
@keyframes menu{from{opacity:0;transform:scaleY(.94)}}
@keyframes dlg{from{opacity:0;transform:scale(1.04)}}
@keyframes snack{from{opacity:0;transform:translate(-50%,12px)}}
@keyframes shimmer{to{background-position:-200% 0}}
@keyframes blink{50%{opacity:.4}}

@media (max-width:640px){main{padding:16px 12px 0}footer{padding:10px 12px}.count,.pill,.go{display:none}.btn{min-width:0}}
@media (prefers-reduced-motion:reduce){*,::before,::after{animation-duration:.01ms!important;animation-delay:0ms!important;transition-duration:.01ms!important}}
`;
