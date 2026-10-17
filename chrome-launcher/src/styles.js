// CSS của app (Material 3). Màu lấy từ biến --md-* do theme.js sinh ra từ material-theme.json
export default `
:root{
  --emph:cubic-bezier(.2,0,0,1);--emph-dec:cubic-bezier(.05,.7,.1,1);
  --e1:0 1px 2px color-mix(in srgb,var(--md-shadow) 30%,transparent),0 1px 3px 1px color-mix(in srgb,var(--md-shadow) 15%,transparent);
  --e2:0 1px 2px color-mix(in srgb,var(--md-shadow) 30%,transparent),0 2px 6px 2px color-mix(in srgb,var(--md-shadow) 15%,transparent);
  --e3:0 1px 3px color-mix(in srgb,var(--md-shadow) 30%,transparent),0 4px 8px 3px color-mix(in srgb,var(--md-shadow) 15%,transparent)
}
:root[data-theme=light]{color-scheme:light}
:root[data-theme=dark]{color-scheme:dark}

*{box-sizing:border-box;margin:0}
html,body,#root{height:100%}
body{background:var(--md-surface);color:var(--md-on-surface);font:400 14px/20px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.25px;-webkit-font-smoothing:antialiased;overflow:hidden;user-select:none;-webkit-user-select:none}
input{user-select:text;-webkit-user-select:text}
button,input{font:inherit;letter-spacing:inherit;color:inherit}
button{position:relative;overflow:hidden;cursor:pointer;background:none;border:0;padding:0;-webkit-tap-highlight-color:transparent}
button:disabled{cursor:default}
:focus-visible{outline:3px solid var(--md-primary);outline-offset:2px}
html.theme-anim *{transition:background-color .3s,color .3s,border-color .3s!important}
.rip{position:absolute;border-radius:50%;background:currentColor;pointer-events:none;transform:scale(0);animation:ripple .6s var(--emph-dec) forwards}

/* ---- Nút ---- */
.btn{height:40px;padding:0 24px;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:500;letter-spacing:.1px;white-space:nowrap;transition:background-color .2s,box-shadow .2s,color .2s}
.btn.sm{height:32px;padding:0 14px}
.btn.filled{background:var(--md-primary);color:var(--md-on-primary)}
.btn.filled:hover:not(:disabled){background:color-mix(in srgb,var(--md-primary) 92%,var(--md-on-primary));box-shadow:var(--e1)}
.btn.tonal{background:var(--md-secondary-container);color:var(--md-on-secondary-container)}
.btn.tonal:hover:not(:disabled){background:color-mix(in srgb,var(--md-secondary-container) 92%,var(--md-on-secondary-container));box-shadow:var(--e1)}
.btn.outlined{border:1px solid var(--md-outline);color:var(--md-primary)}
.btn.text{padding:0 12px;color:var(--md-primary)}
.btn.outlined:hover:not(:disabled),.btn.text:hover:not(:disabled){background:color-mix(in srgb,var(--md-primary) 8%,transparent)}
.btn.err{color:var(--md-error)}
.btn.outlined.err{border-color:color-mix(in srgb,var(--md-error) 60%,var(--md-outline))}
.btn.err:hover:not(:disabled){background:color-mix(in srgb,var(--md-error) 8%,transparent)}
button.btn:disabled{color:color-mix(in srgb,var(--md-on-surface) 38%,transparent)}
button.btn.filled:disabled,button.btn.tonal:disabled{background:color-mix(in srgb,var(--md-on-surface) 12%,transparent)}
button.btn.outlined:disabled{border-color:color-mix(in srgb,var(--md-on-surface) 12%,transparent)}
.ib{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;color:var(--md-on-surface-variant);transition:background-color .2s,color .2s}
.ib:hover:not(:disabled){background:color-mix(in srgb,var(--md-on-surface-variant) 8%,transparent)}
.ib.err:hover:not(:disabled){color:var(--md-error);background:color-mix(in srgb,var(--md-error) 8%,transparent)}
.ib[aria-expanded=true]{color:var(--md-primary)}
.ib svg{transition:transform .35s var(--emph)}
.gear[aria-expanded=true] svg{transform:rotate(90deg)}

/* ---- Bố cục ---- */
main{height:100%;display:flex;flex-direction:column;max-width:800px;margin:0 auto;padding:20px 24px 0}
header.top{display:flex;align-items:center;gap:16px;position:relative}
.brand{display:flex;gap:16px;align-items:center;flex:1;min-width:0}
.brand>svg{flex:none;border-radius:12px;box-shadow:var(--e1)}
h1{font-size:24px;line-height:32px;font-weight:400;letter-spacing:0}
.sub{color:var(--md-on-surface-variant)}
.credit{margin-top:4px;font-size:12px;line-height:20px;color:var(--md-on-surface-variant)}
.tag{display:inline-block;padding:0 8px;border-radius:8px;font-weight:500;letter-spacing:.2px}
.tag.author{background:var(--md-primary-container);color:var(--md-on-primary-container)}
.tag.ai{background:var(--md-tertiary-container);color:var(--md-on-tertiary-container)}
.muted{color:var(--md-on-surface-variant)}

/* ---- Thẻ các tab ---- */
.card{margin-top:16px;border-radius:16px;background:var(--md-surface-container-low);border:1px solid var(--md-outline-variant);transition:border-color .3s,background-color .3s}
.card.open{border-color:var(--md-outline);background:var(--md-surface-container)}
.card-head{display:flex;align-items:center;gap:16px;width:100%;min-height:64px;padding:8px 12px 8px 20px;text-align:left;border-radius:16px;transition:background-color .2s}
.card-head:hover{background:color-mix(in srgb,var(--md-on-surface) 8%,transparent)}
.title{font-size:16px;line-height:24px;font-weight:500;letter-spacing:.15px;white-space:nowrap}
.card-head .chips,.card-head .muted{flex:1;min-width:0}
.chips{display:flex;gap:8px;overflow:hidden}
.chip{height:32px;display:inline-flex;align-items:center;gap:8px;padding:0 12px 0 4px;border-radius:8px;border:1px solid var(--md-outline-variant);color:var(--md-on-surface-variant);font-weight:500;max-width:200px;white-space:nowrap;animation:fade .25s}
.chip .fav{border-radius:50%}
.chip .t{overflow:hidden;text-overflow:ellipsis}
.chip em{font-style:normal;color:var(--md-primary)}
.chip.more{padding:0 12px}
.chev{display:grid;place-items:center;width:40px;height:40px;color:var(--md-on-surface-variant);transition:transform .35s var(--emph)}
.card.open .chev{transform:rotate(180deg)}
.collapse{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s var(--emph)}
.collapse.open{grid-template-rows:1fr}
.collapse>div{overflow:hidden;min-height:0}
.card-body,.tabs-body{padding:4px 16px 16px}

.editor{display:grid;gap:12px}
.trows{list-style:none;padding:0;display:grid;gap:12px}
.trows li{display:flex;align-items:center;gap:8px;animation:rise .3s var(--emph-dec) both}
.add{justify-self:start}

.combo{position:relative;flex:1;min-width:0;display:flex;align-items:center;height:48px;border:1px solid var(--md-outline);border-radius:12px;transition:border-color .2s,box-shadow .2s}
.combo:hover{border-color:var(--md-on-surface)}
.combo:focus-within{border-color:var(--md-primary);box-shadow:inset 0 0 0 1px var(--md-primary)}
.combo.bad,.combo.bad:focus-within{border-color:var(--md-error);box-shadow:inset 0 0 0 1px var(--md-error)}
.combo input{flex:1;min-width:0;height:100%;background:none;border:0;outline:0;padding:0 4px 0 16px;font-size:16px;line-height:24px;letter-spacing:.5px}
.combo input::placeholder{color:var(--md-on-surface-variant)}
.cv{width:40px;height:40px;margin-right:3px;border-radius:50%;display:grid;place-items:center;color:var(--md-on-surface-variant);transition:background-color .2s}
.cv:hover{background:color-mix(in srgb,var(--md-on-surface-variant) 8%,transparent)}
.stepper{display:flex;align-items:center;height:48px;padding:0 4px;border:1px solid var(--md-outline-variant);border-radius:12px}
.stepper button{width:32px;height:32px;border-radius:50%;color:var(--md-on-surface-variant);font-size:20px;line-height:1;transition:background-color .2s}
.stepper button:hover:not(:disabled){background:color-mix(in srgb,var(--md-on-surface) 8%,transparent)}
.stepper button:disabled{opacity:.38}
.stepper span{min-width:24px;text-align:center;font-weight:500;font-variant-numeric:tabular-nums}

.drop{list-style:none;position:fixed;z-index:60;padding:8px 0;max-height:300px;overflow:auto;background:var(--md-surface-container);border-radius:16px;box-shadow:var(--e2);transform-origin:top;animation:menu .22s var(--emph-dec)}
.site{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 8px 8px 16px;cursor:pointer}
.site[aria-selected=true]{background:color-mix(in srgb,var(--md-on-surface) 8%,transparent)}
.si{flex:1;min-width:0;display:flex;flex-direction:column}
.si b{font-weight:400;font-size:16px;line-height:24px;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.si small{color:var(--md-on-surface-variant);font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.site .x{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:var(--md-on-surface-variant);opacity:0;transition:opacity .15s,background-color .15s,color .15s}
.site:hover .x,.site[aria-selected=true] .x{opacity:1}
.site .x:hover{color:var(--md-error);background:color-mix(in srgb,var(--md-error) 8%,transparent)}

.fav,.av{display:grid;place-items:center;flex:none;font-weight:500}
.fav{border-radius:8px}
.t0{background:var(--md-primary-container);color:var(--md-on-primary-container)}
.t1{background:var(--md-secondary-container);color:var(--md-on-secondary-container)}
.t2{background:var(--md-tertiary-container);color:var(--md-on-tertiary-container)}

/* ---- Tìm kiếm ---- */
.bar{display:flex;align-items:center;gap:8px;margin:16px 0 8px}
.search{flex:1;min-width:0;height:56px;display:flex;align-items:center;gap:16px;padding:0 20px;border-radius:28px;background:var(--md-surface-container-high);color:var(--md-on-surface-variant);cursor:text;transition:background-color .2s,box-shadow .2s}
.search:focus-within{background:var(--md-surface-container-highest);box-shadow:var(--e1)}
.search input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--md-on-surface);font-size:16px;line-height:24px;letter-spacing:.5px}
.search input::placeholder{color:var(--md-on-surface-variant)}

/* ---- Danh sách profile ---- */
.list{list-style:none;padding:0 8px 130px;margin:0 -8px;flex:1;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:2px}
.list::-webkit-scrollbar{width:8px}
.list::-webkit-scrollbar-thumb{background:var(--md-outline-variant);border-radius:8px}
.list li{display:flex;align-items:center;gap:4px;flex:none;padding-right:8px;border-radius:16px;transition:background-color .25s;animation:rise .4s var(--emph-dec) both;animation-delay:calc(var(--i)*35ms)}
.list li.sel{background:color-mix(in srgb,var(--md-secondary-container) 65%,transparent)}
.row{flex:1;min-width:0;display:flex;align-items:center;gap:16px;padding:8px 8px 8px 4px;border-radius:16px;text-align:left;transition:background-color .2s}
.row:hover:not(:disabled){background:color-mix(in srgb,var(--md-on-surface) 8%,transparent)}
.row:disabled{opacity:.38}
.avw{position:relative;flex:none}
.av{position:relative;overflow:hidden;width:40px;height:40px;border-radius:50%;font-size:18px}
.av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:fade .3s}
.meta{flex:1;min-width:0;display:flex;flex-direction:column}
.meta b{font-weight:500;font-size:16px;line-height:24px;letter-spacing:.15px}
.meta small{color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.go{color:var(--md-primary);font-weight:500;letter-spacing:.1px;opacity:0;transform:translateX(-6px);transition:opacity .2s,transform .3s var(--emph-dec)}
.row:hover .go,.row:focus-visible .go{opacity:1;transform:none}
.dot{position:absolute;right:-3px;bottom:-3px;width:14px;height:14px;border-radius:50%;border:2.5px solid var(--md-surface);background:var(--md-primary)}
.dot.live::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--md-primary);animation:ping 1.9s ease-out infinite}
.dot.wait{background:var(--md-tertiary);animation:blink 1s ease-in-out infinite}
.pill{height:24px;padding:0 10px;display:inline-flex;align-items:center;border-radius:8px;font-size:12px;font-weight:500;letter-spacing:.3px;animation:fade .2s}
.pill.live{background:var(--md-primary-container);color:var(--md-on-primary-container)}
.pill.wait{background:var(--md-tertiary-container);color:var(--md-on-tertiary-container)}
.tabsbtn{height:32px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;border-radius:8px;border:1px solid var(--md-outline-variant);color:var(--md-on-surface-variant);font-weight:500;font-variant-numeric:tabular-nums;transition:background-color .2s,color .2s}
.tabsbtn:hover{background:color-mix(in srgb,var(--md-on-surface) 8%,transparent)}
.tabsbtn.custom{background:var(--md-secondary-container);color:var(--md-on-secondary-container);border-color:transparent}

.chk{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;transition:background-color .2s}
.chk::before{content:"";width:18px;height:18px;border:2px solid var(--md-on-surface-variant);border-radius:2px;transition:background-color .2s,border-color .2s}
.chk::after{content:"";position:absolute;left:50%;top:50%;width:5px;height:10px;border:solid var(--md-on-primary);border-width:0 2px 2px 0;transform:translate(-50%,-62%) rotate(45deg) scale(0);transition:transform .2s var(--emph-dec)}
.chk:hover{background:color-mix(in srgb,var(--md-on-surface) 8%,transparent)}
.chk[aria-checked=true]::before{background:var(--md-primary);border-color:var(--md-primary)}
.chk[aria-checked=true]::after{transform:translate(-50%,-62%) rotate(45deg) scale(1)}

.sk{height:56px;margin:4px 0;border-radius:16px;background:linear-gradient(90deg,var(--md-surface-container) 25%,var(--md-surface-container-high) 50%,var(--md-surface-container) 75%);background-size:200% 100%;animation:shimmer 1.4s linear infinite}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding-bottom:100px;animation:fade .3s}
.empty small{color:var(--md-on-surface-variant);max-width:46ch;word-break:break-word}
.empty .btn{margin-top:8px}
.hint{color:var(--md-error);font-size:12px;line-height:16px;margin:8px 16px 0;animation:fade .2s}

/* ---- Thanh hành động dưới ---- */
footer{position:fixed;inset:auto 0 0 0;display:flex;justify-content:center;padding:32px 24px 16px;background:linear-gradient(transparent,var(--md-surface) 50%);pointer-events:none}
footer>div{pointer-events:auto;width:100%;max-width:752px;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:8px 8px 8px 24px;border-radius:28px;background:var(--md-surface-container-high);box-shadow:var(--e2)}
.count{flex:1;color:var(--md-on-surface-variant);white-space:nowrap}

.toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);min-height:48px;display:flex;align-items:center;padding:0 16px;border-radius:8px;background:var(--md-inverse-surface);color:var(--md-inverse-on-surface);box-shadow:var(--e3);max-width:80vw;z-index:90;animation:snack .3s var(--emph-dec)}
.toast.err{background:var(--md-error-container);color:var(--md-on-error-container)}

/* ---- Cài đặt (popover) ---- */
.panel{position:absolute;right:0;top:56px;z-index:5;width:380px;max-width:calc(100vw - 32px);max-height:calc(100vh - 100px);overflow:auto;padding:20px;border-radius:28px;background:var(--md-surface-container);box-shadow:var(--e3);transform-origin:top right;outline:0;animation:pop .28s var(--emph-dec)}
.panel h2{font-size:22px;line-height:28px;font-weight:400;letter-spacing:0;margin-bottom:12px}
.grp+.grp{margin-top:14px}
.lbl{display:block;color:var(--md-on-surface-variant);font-weight:500;letter-spacing:.1px;margin-bottom:6px}
.note{margin-top:4px;color:var(--md-on-surface-variant);font-size:12px;line-height:16px}
.grp.line{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:10px;border-top:1px solid var(--md-outline-variant)}
.grp.line .lbl{margin:0}

.seg{display:flex;height:40px;border:1px solid var(--md-outline);border-radius:99px;overflow:hidden}
.seg button{flex:1;display:flex;align-items:center;justify-content:center;padding:0 12px;border-left:1px solid var(--md-outline);font-weight:500;letter-spacing:.1px;transition:background-color .2s,color .2s}
.seg button:first-child{border-left:0}
.seg button:hover{background:color-mix(in srgb,var(--md-on-surface) 8%,transparent)}
.seg button[aria-checked=true]{background:var(--md-secondary-container);color:var(--md-on-secondary-container)}
.seg .ck{width:0;margin-right:0;opacity:0;flex:none;transition:width .25s var(--emph),margin .25s var(--emph),opacity .2s}
.seg [aria-checked=true] .ck{width:18px;margin-right:8px;opacity:1}

.opts{display:grid;gap:2px}
.opt{display:flex;gap:16px;align-items:flex-start;text-align:left;padding:8px 12px;border-radius:16px;transition:background-color .2s}
.opt:hover{background:color-mix(in srgb,var(--md-on-surface) 8%,transparent)}
.opt[aria-checked=true]{background:color-mix(in srgb,var(--md-secondary-container) 55%,transparent)}
.opt b{display:block;font-weight:500;font-size:16px;line-height:24px;letter-spacing:.15px}
.opt small{color:var(--md-on-surface-variant)}
.radio{width:20px;height:20px;flex:none;margin-top:2px;position:relative;border-radius:50%;border:2px solid var(--md-on-surface-variant);transition:border-color .2s}
.radio::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--md-primary);transform:scale(0);transition:transform .25s var(--emph-dec)}
.opt[aria-checked=true] .radio{border-color:var(--md-primary)}
.opt[aria-checked=true] .radio::after{transform:scale(1)}

/* ---- Hộp thoại ---- */
.scrim{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:24px;background:color-mix(in srgb,var(--md-scrim) 32%,transparent);animation:fade .25s}
.modal{width:min(560px,100%);max-height:100%;display:flex;flex-direction:column;background:var(--md-surface-container-high);border-radius:28px;box-shadow:var(--e3);outline:0;animation:dlg .32s var(--emph-dec)}
.mh{padding:24px 24px 8px}
.mh h2{font-size:24px;line-height:32px;font-weight:400;letter-spacing:0}
.mb{padding:8px 24px;overflow:auto;min-height:0}
.mb .mt{margin-top:16px}
.mf{display:flex;justify-content:flex-end;gap:8px;padding:16px 24px 24px}

@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(12px)}}
@keyframes pop{from{opacity:0;transform:scale(.92) translateY(-8px)}}
@keyframes menu{from{opacity:0;transform:scaleY(.9)}}
@keyframes dlg{from{opacity:0;transform:scale(.9) translateY(12px)}}
@keyframes snack{from{opacity:0;transform:translate(-50%,16px)}}
@keyframes shimmer{to{background-position:-200% 0}}
@keyframes ping{from{opacity:.7;transform:scale(.6)}to{opacity:0;transform:scale(1.6)}}
@keyframes blink{50%{opacity:.4}}
@keyframes ripple{from{opacity:.16;transform:scale(0)}to{opacity:0;transform:scale(1)}}

@media (max-width:640px){main{padding:16px 12px 0}footer{padding:28px 12px 12px}.count,.pill,.go{display:none}.btn{padding:0 16px}}
@media (prefers-reduced-motion:reduce){*,::before,::after{animation-duration:.01ms!important;animation-delay:0ms!important;transition-duration:.01ms!important}}
`;
