// Generates src/lib/presets.generated.ts: ready-made folder looks with their icon paths inlined (so previews need no icon library).
//   node tools/gen-presets.mjs
import fs from 'node:fs';
import * as mdi from '@mdi/js';
import * as si from 'simple-icons';

const GR = {
  Aqua: ['#00C6FF', '#0072FF'], Sky: ['#56CCF2', '#2F80ED'], Lush: ['#A8E063', '#56AB2F'], Grape: ['#8E2DE2', '#4A00E0'], Rose: ['#FF9A9E', '#FF5C8D'],
  PurpleLove: ['#CC2B5E', '#753A88'], Sunset: ['#FF512F', '#F09819'], Royal: ['#536976', '#292E49'], Ocean: ['#6DD5ED', '#2193B0'], Gold: ['#FFD200', '#F7971E'],
  Mojito: ['#93F9B9', '#1D976C'], Cherry: ['#EB3349', '#F45C43'], Peach: ['#ED4264', '#FFB88C'], Midnight: ['#414345', '#232526'], Instagram: ['#FD1D1D', '#833AB4'],
  Mint: ['#96C93D', '#00B09B'], Flare: ['#F12711', '#F5AF19'], Windows: ['#FFE9A6', '#FFC83D']
};
const g = (name, extra = {}) => ({ style: 'win11', fill: 'linear', angle: 90, color: GR[name][0], color2: GR[name][1], ...extra });
const flat = (c, extra = {}) => ({ style: 'flat', fill: 'solid', color: c, color2: c, iconColor: '#FFFFFF', ...extra });
const win = (c, extra = {}) => ({ style: 'win11', color: c, iconColor: '#FFFFFF', ...extra });

// [id, en, vi, design, icon]   icon: "mdi:mdiName" | "brand:siName" | "emoji:😀"
const P = [
  ['work', 'Work', 'Công việc', g('Aqua'), 'mdi:mdiBriefcase'], ['docs', 'Documents', 'Tài liệu', g('Sky'), 'mdi:mdiFileDocument'], ['down', 'Downloads', 'Tải xuống', g('Lush'), 'mdi:mdiDownload'],
  ['pics', 'Pictures', 'Hình ảnh', g('Grape'), 'mdi:mdiImage'], ['music', 'Music', 'Âm nhạc', g('Rose'), 'mdi:mdiMusic'], ['video', 'Videos', 'Video', g('PurpleLove'), 'mdi:mdiMovie'],
  ['games', 'Games', 'Trò chơi', g('Sunset'), 'mdi:mdiGamepadVariant'], ['code', 'Code', 'Mã nguồn', g('Royal'), 'mdi:mdiCodeBraces'], ['projects', 'Projects', 'Dự án', g('Ocean'), 'mdi:mdiRocketLaunch'],
  ['study', 'Study', 'Học tập', g('Gold'), 'mdi:mdiSchool'], ['finance', 'Finance', 'Tài chính', g('Mojito'), 'mdi:mdiCash'], ['travel', 'Travel', 'Du lịch', g('Sky'), 'mdi:mdiAirplane'],
  ['health', 'Health', 'Sức khỏe', g('Cherry'), 'mdi:mdiHeartPulse'], ['photos', 'Photos', 'Ảnh chụp', g('Peach'), 'mdi:mdiCamera'], ['backup', 'Backup', 'Sao lưu', g('Midnight'), 'mdi:mdiBackupRestore'],
  ['archive', 'Archive', 'Lưu trữ', g('Royal'), 'mdi:mdiArchive'], ['private', 'Private', 'Riêng tư', g('Midnight'), 'mdi:mdiLock'], ['fav', 'Favorites', 'Yêu thích', g('Gold'), 'mdi:mdiStar'],
  ['design', 'Design', 'Thiết kế', g('Instagram'), 'mdi:mdiPalette'], ['books', 'Books', 'Sách', g('Peach'), 'mdi:mdiBookOpenPageVariant'], ['shop', 'Shopping', 'Mua sắm', g('Flare'), 'mdi:mdiCart'],
  ['mail', 'Mail', 'Thư', g('Aqua'), 'mdi:mdiEmail'], ['tasks', 'Tasks', 'Nhiệm vụ', g('Mint'), 'mdi:mdiCheckCircle'], ['cloud', 'Cloud', 'Đám mây', g('Sky'), 'mdi:mdiCloud'],
  ['tools', 'Tools', 'Công cụ', g('Royal'), 'mdi:mdiWrench'], ['ai', 'AI', 'AI', g('Grape'), 'mdi:mdiRobot'], ['temp', 'Temp', 'Tạm', g('Midnight'), 'mdi:mdiTimerSand'],
  ['recipes', 'Recipes', 'Công thức', g('Sunset'), 'mdi:mdiChefHat'], ['home', 'Home', 'Nhà', g('Lush'), 'mdi:mdiHome'], ['fonts', 'Fonts', 'Phông chữ', g('Cherry'), 'mdi:mdiFormatFont'],
  ['github', 'GitHub', 'GitHub', win('#24292F'), 'brand:siGithub'], ['gitlab', 'GitLab', 'GitLab', win('#FC6D26'), 'brand:siGitlab'], ['tiktok', 'TikTok', 'TikTok', win('#111111'), 'brand:siTiktok'],
  ['facebook', 'Facebook', 'Facebook', win('#1877F2'), 'brand:siFacebook'], ['instagram', 'Instagram', 'Instagram', g('Instagram', { iconColor: '#FFFFFF' }), 'brand:siInstagram'], ['youtube', 'YouTube', 'YouTube', win('#E5252A'), 'brand:siYoutube'],
  ['discord', 'Discord', 'Discord', win('#5865F2'), 'brand:siDiscord'], ['telegram', 'Telegram', 'Telegram', win('#27A7E7'), 'brand:siTelegram'], ['whatsapp', 'WhatsApp', 'WhatsApp', win('#25D366'), 'brand:siWhatsapp'],
  ['spotify', 'Spotify', 'Spotify', win('#1DB954'), 'brand:siSpotify'], ['steam', 'Steam', 'Steam', win('#1B2838'), 'brand:siSteam'], ['notion', 'Notion', 'Notion', win('#2B2B2B'), 'brand:siNotion'],
  ['figma', 'Figma', 'Figma', win('#A259FF'), 'brand:siFigma'], ['gdrive', 'Google Drive', 'Google Drive', win('#1FA463'), 'brand:siGoogledrive'], ['dropbox', 'Dropbox', 'Dropbox', win('#0061FF'), 'brand:siDropbox'],
  ['x', 'X', 'X', win('#000000'), 'brand:siX'], ['netflix', 'Netflix', 'Netflix', win('#E50914'), 'brand:siNetflix'], ['twitch', 'Twitch', 'Twitch', win('#9146FF'), 'brand:siTwitch'],
  ['reddit', 'Reddit', 'Reddit', win('#FF4500'), 'brand:siReddit'], ['claude', 'Claude', 'Claude', win('#D97757'), 'brand:siClaude'],
  ['neon-star', 'Neon star', 'Sao neon', { style: 'neon', fill: 'solid', color: '#00E5FF', color2: '#00E5FF', iconColor: '#00E5FF' }, 'mdi:mdiStar'],
  ['neon-game', 'Neon game', 'Game neon', { style: 'neon', fill: 'solid', color: '#FF2BD6', color2: '#FF2BD6', iconColor: '#FF2BD6' }, 'mdi:mdiGamepadVariant'],
  ['glass-heart', 'Glass heart', 'Tim kính', { style: 'glass', fill: 'linear', angle: 90, color: '#FF9A9E', color2: '#FF5C8D', iconColor: '#FFFFFF' }, 'mdi:mdiHeart'],
  ['glass-cloud', 'Glass cloud', 'Mây kính', { style: 'glass', fill: 'linear', angle: 90, color: '#7FD3FF', color2: '#2F80ED', iconColor: '#FFFFFF' }, 'mdi:mdiCloud'],
  ['outline', 'Outline', 'Viền', { style: 'outline', fill: 'solid', color: '#3E63DD', color2: '#3E63DD', iconColor: '#3E63DD' }, 'mdi:mdiFolderStar'],
  ['minimal', 'Minimal', 'Tối giản', { style: 'minimal', fill: 'linear', angle: 90, color: '#B7C4D6', color2: '#6C7A8F', iconColor: '#FFFFFF' }, 'mdi:mdiFolderOpen'],
  ['classic', 'Classic', 'Cổ điển', { style: 'classic', fill: 'linear', angle: 90, color: '#FFE9A6', color2: '#F2B33D' }, 'mdi:mdiFileDocumentMultiple'],
  ['win10', 'Windows 10', 'Windows 10', { style: 'win10', fill: 'solid', color: '#F5C84B', color2: '#F5C84B' }, ''],
  ['e-game', 'Game', 'Game', flat('#5B5BD6'), 'emoji:🎮'], ['e-music', 'Music', 'Nhạc', flat('#E93D82'), 'emoji:🎵'], ['e-photo', 'Camera', 'Máy ảnh', flat('#12A594'), 'emoji:📷'],
  ['e-work', 'Briefcase', 'Cặp', flat('#3E63DD'), 'emoji:💼'], ['e-books', 'Books', 'Sách', flat('#F76B15'), 'emoji:📚'], ['e-home', 'House', 'Nhà', flat('#30A46C'), 'emoji:🏠'],
  ['e-heart', 'Heart', 'Trái tim', flat('#E5484D'), 'emoji:❤️'], ['e-star', 'Star', 'Ngôi sao', flat('#FFB224'), 'emoji:⭐'], ['e-lock', 'Lock', 'Khóa', flat('#33363D'), 'emoji:🔒'],
  ['e-fire', 'Hot', 'Nóng', flat('#CE2C4B'), 'emoji:🔥'], ['e-idea', 'Ideas', 'Ý tưởng', flat('#8B8D98'), 'emoji:💡'], ['e-rocket', 'Launch', 'Phóng', flat('#8E4EC6'), 'emoji:🚀']
];

const out = [];
for (const [id, en, vi, design, icon] of P) {
  const d = { ...design };
  if (icon.startsWith('mdi:')) { const p = mdi[icon.slice(4)]; if (!p) { console.warn('missing', icon); continue; } d.icon = icon; d.vec = { p, w: 24, h: 24 }; }
  else if (icon.startsWith('brand:')) { const s = si[icon.slice(6)]; if (!s) { console.warn('missing', icon); continue; } d.icon = icon; d.vec = { p: s.path, w: 24, h: 24, hex: '#' + s.hex }; }
  else if (icon.startsWith('emoji:')) { d.icon = icon; d.emoji = icon.slice(6); }
  out.push({ id, en, vi, design: d });
}
fs.writeFileSync('src/lib/presets.generated.ts', `/* generated by tools/gen-presets.mjs - do not edit */\nimport type { Preset } from './folderDesign';\nexport const PRESETS: Preset[] = ${JSON.stringify(out)};\n`);
console.log('presets:', out.length);
