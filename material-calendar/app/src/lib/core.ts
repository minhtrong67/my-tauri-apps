export type Ev = { id: string; title: string; loc: string; desc: string; date: string; allDay: boolean; start: string; end: string; color: string; repeat: string; remind: number };
export const COLORS = ['#b3261e', '#0b57d0', '#188038', '#e37400', '#a142f4', '#d01884', '#007b83', '#5f6368'];
export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const mins = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
export function isoWeek(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - n);
  return Math.ceil(((+x - Date.UTC(x.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const dim = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export function occurs(e: Ev, d: Date) {
  const s = parse(e.date);
  if (d < s) return false;
  if (+d === +s) return true;
  switch (e.repeat) {
    case 'daily': return true;
    case 'weekly': return Math.round((utc(d) - utc(s)) / 864e5) % 7 === 0;
    case 'monthly': return d.getDate() === Math.min(s.getDate(), dim(d.getFullYear(), d.getMonth()));
    case 'yearly': return d.getMonth() === s.getMonth() && d.getDate() === Math.min(s.getDate(), dim(d.getFullYear(), s.getMonth()));
  }
  return false;
}
export const eventsOn = (evs: Ev[], d: Date) => evs.filter((e) => occurs(e, d)).sort((a, b) => (+b.allDay - +a.allDay) || a.start.localeCompare(b.start));

export function lanes(list: Ev[]) {
  type L = { e: Ev; s: number; en: number; lane: number; n: number };
  const out: L[] = []; let cl: L[] = []; let end = 0; const le: number[] = [];
  const flush = () => { const n = Math.max(...cl.map((c) => c.lane)) + 1; cl.forEach((c) => { c.n = n; }); out.push(...cl); cl = []; };
  for (const e of list) {
    const s = mins(e.start), en = Math.max(mins(e.end || e.start), s + 30);
    if (cl.length && s >= end) { flush(); le.length = 0; end = 0; }
    let l = le.findIndex((x) => x <= s); if (l < 0) l = le.length;
    le[l] = en; cl.push({ e, s, en, lane: l, n: 1 }); end = Math.max(end, en);
  }
  if (cl.length) flush();
  return out;
}

/* i18n: [en, vi] */
const D: Record<string, [string, string]> = {
  today: ['Today', 'Hôm nay'], month: ['Month', 'Tháng'], week: ['Week', 'Tuần'], day: ['Day', 'Ngày'], agenda: ['Agenda', 'Lịch trình'],
  create: ['Create', 'Tạo mới'], settings: ['Settings', 'Cài đặt'], newEvent: ['New event', 'Sự kiện mới'], editEvent: ['Edit event', 'Sửa sự kiện'],
  title: ['Title', 'Tiêu đề'], loc: ['Location', 'Địa điểm'], date: ['Date', 'Ngày'], allDay: ['All day', 'Cả ngày'], start: ['Start', 'Bắt đầu'], end: ['End', 'Kết thúc'],
  repeat: ['Repeat', 'Lặp lại'], desc: ['Description', 'Mô tả'], save: ['Save', 'Lưu'], cancel: ['Cancel', 'Hủy'], delete: ['Delete', 'Xóa'], duplicate: ['Duplicate', 'Nhân bản'],
  undo: ['Undo', 'Hoàn tác'], saved: ['Event saved', 'Đã lưu sự kiện'], deleted: ['Event deleted', 'Đã xóa sự kiện'], duplicated: ['Event duplicated', 'Đã nhân bản'],
  needTitle: ['Enter a title for the event', 'Hãy nhập tiêu đề sự kiện'], badTime: ['End time must be after start time', 'Giờ kết thúc phải sau giờ bắt đầu'],
  'r.none': ['Does not repeat', 'Không lặp'], 'r.daily': ['Daily', 'Hằng ngày'], 'r.weekly': ['Weekly', 'Hằng tuần'], 'r.monthly': ['Monthly', 'Hằng tháng'], 'r.yearly': ['Yearly', 'Hằng năm'],
  appearance: ['Appearance', 'Giao diện'], theme: ['Theme', 'Chế độ'], system: ['System', 'Hệ thống'], light: ['Light', 'Sáng'], dark: ['Dark', 'Tối'],
  color: ['Theme color', 'Màu chủ đề'], language: ['Language', 'Ngôn ngữ'], font: ['Font', 'Phông chữ'], size: ['Font size', 'Cỡ chữ'], sm: ['Small', 'Nhỏ'], md: ['Medium', 'Vừa'], lg: ['Large', 'Lớn'],
  window: ['Window on startup', 'Cửa sổ khi mở app'], remember: ['Remember size', 'Ghi nhớ kích thước'], rememberD: ['Reopen at the size you last used', 'Mở lại đúng kích thước lần trước'],
  maximized: ['Always maximized', 'Luôn phóng to tối đa'], maximizedD: ['Always start maximized', 'Luôn mở ở chế độ phóng to'],
  calendar: ['Calendar', 'Lịch'], weekStart: ['Week starts on', 'Tuần bắt đầu từ'], mon: ['Monday', 'Thứ hai'], sun: ['Sunday', 'Chủ nhật'], timeFmt: ['Time format', 'Định dạng giờ'],
  lunar: ['Show lunar calendar', 'Hiện âm lịch'], about: ['About', 'Giới thiệu'], author: ['Author', 'Tác giả'], assist: ['Built with help from', 'Với sự hỗ trợ của'],
  nothing: ['Nothing coming up', 'Không có sự kiện'], close: ['Close', 'Đóng'], prev: ['Previous', 'Trước'], next: ['Next', 'Sau'], more: ['more', 'thêm'],
  remind: ['Reminder', 'Nhắc nhở'], 'rm.-1': ['None', 'Không'], 'rm.0': ['At start time', 'Đúng giờ bắt đầu'], 'rm.5': ['5 minutes before', 'Trước 5 phút'], 'rm.15': ['15 minutes before', 'Trước 15 phút'],
  'rm.30': ['30 minutes before', 'Trước 30 phút'], 'rm.60': ['1 hour before', 'Trước 1 giờ'], snooze: ['Snooze 5 min', 'Hoãn 5 phút'], notify: ['System notifications', 'Thông báo hệ thống'],
  data: ['Data', 'Dữ liệu'], export: ['Export', 'Xuất'], import: ['Import', 'Nhập'], exported: ['Events exported', 'Đã xuất sự kiện'], imported: ['Events imported', 'Đã nhập sự kiện'], importBad: ['Could not read that file', 'Không đọc được tệp này'],
  hol: ['Holiday', 'Ngày lễ'], week_n: ['W', 'T'], confirmDel: ['Delete this event?', 'Xóa sự kiện này?'], confirmHint: ['This event will be removed. You can undo right after.', 'Sự kiện sẽ bị xóa. Bạn có thể hoàn tác ngay sau đó.'], moved: ['Event moved', 'Đã chuyển sự kiện'],
  custom: ['Custom color', 'Màu tùy chọn'], sizeHint: ['Applies to the whole app', 'Áp dụng cho toàn bộ ứng dụng'],
};
let L = 0;
export const setLang = (l: string) => { L = (l === 'auto' ? navigator.language.startsWith('vi') : l === 'vi') ? 1 : 0; };
export const t = (k: string) => D[k]?.[L] ?? k;
export const fmt = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat(L ? 'vi-VN' : 'en-US', o).format(d);
export const ft = (hm: string, f: string) => {
  if (!hm || f !== '12') return hm || '';
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
};
