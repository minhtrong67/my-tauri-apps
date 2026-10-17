/* Material 3 dynamic colour: light / dark / system + any seed colour + contrast level. */
const PALETTE=[
 ['blue','#2196F3'],['red','#F44336'],['pink','#E91E63'],['purple','#9C27B0'],['dpurple','#673AB7'],['indigo','#3F51B5'],['lblue','#03A9F4'],['cyan','#00BCD4'],['teal','#009688'],
 ['green','#4CAF50'],['lgreen','#8BC34A'],['lime','#CDDC39'],['yellow','#FFEB3B'],['amber','#FFC107'],['orange','#FF9800'],['dorange','#FF5722'],['brown','#795548'],['grey','#607D8B']];
const ROLE={primary:'p',onPrimary:'on-p',primaryContainer:'pc',onPrimaryContainer:'on-pc',secondary:'s',onSecondary:'on-s',secondaryContainer:'sc',onSecondaryContainer:'on-sc',tertiary:'t',onTertiary:'on-t',tertiaryContainer:'tc',onTertiaryContainer:'on-tc',error:'e',onError:'on-e',errorContainer:'ec',onErrorContainer:'on-ec',background:'bg',onBackground:'on-bg',surface:'sf',onSurface:'on-sf',surfaceVariant:'sfv',onSurfaceVariant:'on-sfv',outline:'ol',outlineVariant:'olv',shadow:'shadow',scrim:'scrim',inverseSurface:'inv',inverseOnSurface:'on-inv',inversePrimary:'inv-p',surfaceTint:'tint',surfaceDim:'sf-dim',surfaceBright:'sf-br',surfaceContainerLowest:'sf-c0',surfaceContainerLow:'sf-c1',surfaceContainer:'sf-c2',surfaceContainerHigh:'sf-c3',surfaceContainerHighest:'sf-c4'};
const mq=window.matchMedia('(prefers-color-scheme: dark)'),_cache={};
const isDark=mode=>mode==='dark'||(mode==='system'&&mq.matches);
function scheme(seed,dark,contrast){const k=seed+dark+contrast;return _cache[k]||(_cache[k]=MCU.scheme(seed,dark,contrast))}
function applyTheme({mode,seed,contrast},animate){
  const r=document.documentElement,d=isDark(mode),s=scheme(seed,d,contrast);
  if(animate){r.classList.add('theme-fade');clearTimeout(applyTheme._t);applyTheme._t=setTimeout(()=>r.classList.remove('theme-fade'),450)}
  for(const k in ROLE)if(s[k])r.style.setProperty('--'+ROLE[k],s[k]);
  r.style.colorScheme=d?'dark':'light';r.dataset.scheme=d?'dark':'light';
  return d}
