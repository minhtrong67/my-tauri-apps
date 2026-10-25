import { useMemo } from "react";
import enBase from "./en.base.json";
import viBase from "./vi.base.json";
import { useSettings, type Lang } from "./stores";

const EN: Record<string, string> = {
  "nav.history": "History",
  "dl.hint": "Paste a link or type a song name",
  "dl.clearInput": "Clear",
  "dl.searching": "Searching YouTube…",
  "dl.noResults": "No results. Try different words.",
  "dl.results": "Results",
  "dl.playlist": "Choose tracks from playlist",
  "dl.playlistFound": "Playlist link detected. Pick the tracks you want.",
  "dl.stopAll": "Stop all",
  "dl.summary": "{a} downloading · {q} waiting · {d} done",
  "dl.editTags": "Edit tags",
  "dl.add": "Add to queue",
  "tag.title": "Title", "tag.artist": "Artist", "tag.album": "Album", "tag.year": "Year",
  "b.cancel": "Cancel", "b.confirm": "Confirm", "b.delete": "Delete", "b.close": "Close", "b.remove": "Remove", "b.clear": "Clear",
  "b.selectAll": "Select all", "b.selectNone": "Select none", "b.reset": "Reset", "b.updateNow": "Update", "b.check": "Check for updates", "b.yes": "Yes",
  "pl.title": "Playlist", "pl.loading": "Reading playlist…", "pl.selected": "{n} of {m} selected", "pl.add": "Add {n} to queue",
  "cf.clearDone.t": "Clear finished items?", "cf.clearDone.b": "Finished, failed and cancelled items will be removed from the queue. Downloaded files are kept.",
  "cf.stopAll.t": "Stop all downloads?", "cf.stopAll.b": "Every running and waiting download will be cancelled.",
  "cf.delFile.t": "Delete this file?", "cf.delFile.b": "“{name}” will be deleted from your disk. This cannot be undone.",
  "cf.clearHist.t": "Clear history?", "cf.clearHist.b": "The whole list will be removed. Your MP3 files stay on disk.",
  "cf.reset.t": "Reset settings?", "cf.reset.b": "Appearance, download and network options go back to their defaults. The save folder is kept.",
  "hi.title": "History", "hi.sub": "Everything you have downloaded. Search, open or download again.",
  "hi.search": "Search history", "hi.empty": "No downloads yet. Finished songs appear here.", "hi.noResult": "Nothing matches your search.",
  "hi.again": "Download again", "hi.delFile": "Delete file", "hi.remove": "Remove from history", "hi.clearAll": "Clear history", "hi.count": "{n} songs",
  "set.fontSize": "Text size", "set.fontSizeDesc": "Scales text across the whole app.",
  "fs.small": "Small", "fs.medium": "Medium", "fs.large": "Large",
  "set.naming": "File names", "set.namingDesc": "How saved files are named.",
  "tpl.artist-title": "Artist - Title", "tpl.title": "Title", "tpl.title-artist": "Title - Artist", "tpl.artist-album-title": "Artist - Album - Title",
  "set.artistFolder": "Folder per artist", "set.artistFolderDesc": "Save each song in a sub-folder named after the artist.",
  "set.dup": "If the file already exists", "dup.rename": "Keep both (add a number)", "dup.skip": "Skip the download", "dup.overwrite": "Replace the old file",
  "set.parallel": "Parallel downloads", "set.parallelDesc": "How many songs download at the same time.",
  "set.speed": "Speed limit", "speed.none": "No limit",
  "set.network": "Network & account",
  "set.cookies": "Use browser cookies", "set.cookiesDesc": "Helps when YouTube asks you to sign in. Close the browser first on Windows.", "ck.none": "Don’t use cookies",
  "set.proxy": "Proxy", "set.proxyDesc": "Optional, e.g. http://127.0.0.1:8080",
  "set.notify": "Desktop notifications", "set.notifyDesc": "Notify when a download finishes.",
  "set.updates": "Check yt-dlp on start", "set.updatesDesc": "Warns you when yt-dlp is outdated (the usual cause of failed downloads).",
  "set.reset": "Reset to defaults", "set.resetDesc": "Restore all options except the save folder.",
  "tb.min": "Minimize", "tb.max": "Maximize", "tb.restore": "Restore", "tb.close": "Close",
  "toast.ytdlpOld": "yt-dlp {cur} is outdated (latest {latest}). Update to avoid failed downloads.",
  "toast.upToDate": "yt-dlp is up to date ({v}).", "toast.added": "{n} added to the queue", "toast.fileDeleted": "File deleted",
  "toast.reset": "Settings restored", "toast.stopped": "Downloads stopped", "toast.checkFailed": "Couldn’t check for updates",
  "notif.title": "Download complete", "src.youtube": "YouTube", "src.tiktok": "TikTok", "src.spotify": "Spotify",
  "tool.checkingNow": "Checking…",
  "e.w_skipped": "already existed, skipped", "e.sha_mismatch": "The downloaded file failed the integrity check. Try again.",
  "e.search_failed": "Search failed: {d}", "e.playlist_failed": "Couldn’t read the playlist: {d}", "e.delete_failed": "Couldn’t delete the file: {d}",
  "e.update_check": "Couldn’t reach GitHub: {d}",
  "ban.updateTitle": "A newer yt-dlp is available",
  "empty.title": "Your queue is empty",
  "dnd.title": "Drop it here", "dnd.sub": "Release a link or text to add it",
  "clip.found": "Link found in your clipboard", "clip.use": "Use link", "clip.dismiss": "Dismiss",
  "set.clipWatch": "Suggest links from the clipboard", "set.clipWatchDesc": "When you return to the app, offer to use a supported link you copied.",
  "undo": "Undo", "toast.removed": "Removed from the list",
  "flt.all": "All", "flt.active": "In progress", "flt.done": "Done", "flt.failed": "Failed",
  "act.retryFailed": "Retry failed", "act.openFolder": "Open save folder",
  "sc.title": "Keyboard shortcuts", "sc.focus": "Focus the search box", "sc.paste": "Paste a link anywhere", "sc.add": "Add to queue",
  "sc.nav": "Go to Download / History / Settings", "sc.settings": "Open Settings", "sc.help": "Show this list", "sc.close": "Close dialogs",
  "about.shortcuts": "Shortcuts", "tb.active": "{n} active",
  "dl.heroTip": "Paste, drop or type — we handle the rest.",
};
const VI: Record<string, string> = {
  "nav.history": "Lịch sử",
  "dl.hint": "Dán link hoặc gõ tên bài hát",
  "dl.clearInput": "Xoá",
  "dl.searching": "Đang tìm trên YouTube…",
  "dl.noResults": "Không có kết quả. Hãy thử từ khoá khác.",
  "dl.results": "Kết quả",
  "dl.playlist": "Chọn bài trong playlist",
  "dl.playlistFound": "Đã nhận ra link playlist. Hãy chọn các bài bạn muốn tải.",
  "dl.stopAll": "Dừng tất cả",
  "dl.summary": "{a} đang tải · {q} đang chờ · {d} xong",
  "dl.editTags": "Sửa thông tin",
  "dl.add": "Thêm vào hàng đợi",
  "tag.title": "Tên bài hát", "tag.artist": "Nghệ sĩ", "tag.album": "Album", "tag.year": "Năm",
  "b.cancel": "Huỷ", "b.confirm": "Xác nhận", "b.delete": "Xoá", "b.close": "Đóng", "b.remove": "Gỡ bỏ", "b.clear": "Dọn",
  "b.selectAll": "Chọn tất cả", "b.selectNone": "Bỏ chọn", "b.reset": "Đặt lại", "b.updateNow": "Cập nhật", "b.check": "Kiểm tra cập nhật", "b.yes": "Đồng ý",
  "pl.title": "Playlist", "pl.loading": "Đang đọc playlist…", "pl.selected": "Đã chọn {n}/{m}", "pl.add": "Thêm {n} bài vào hàng đợi",
  "cf.clearDone.t": "Dọn các mục đã xong?", "cf.clearDone.b": "Các mục đã xong, lỗi hoặc đã huỷ sẽ bị gỡ khỏi hàng đợi. Tệp đã tải vẫn được giữ.",
  "cf.stopAll.t": "Dừng tất cả lượt tải?", "cf.stopAll.b": "Mọi lượt tải đang chạy và đang chờ sẽ bị huỷ.",
  "cf.delFile.t": "Xoá tệp này?", "cf.delFile.b": "“{name}” sẽ bị xoá khỏi ổ đĩa và không thể khôi phục.",
  "cf.clearHist.t": "Xoá lịch sử?", "cf.clearHist.b": "Toàn bộ danh sách sẽ bị xoá. Các tệp MP3 vẫn nằm trên ổ đĩa.",
  "cf.reset.t": "Đặt lại cài đặt?", "cf.reset.b": "Giao diện, tải xuống và mạng sẽ về mặc định. Thư mục lưu được giữ nguyên.",
  "hi.title": "Lịch sử", "hi.sub": "Mọi bài bạn đã tải. Tìm kiếm, mở hoặc tải lại.",
  "hi.search": "Tìm trong lịch sử", "hi.empty": "Chưa có bài nào. Bài tải xong sẽ hiện ở đây.", "hi.noResult": "Không có mục nào khớp.",
  "hi.again": "Tải lại", "hi.delFile": "Xoá tệp", "hi.remove": "Gỡ khỏi lịch sử", "hi.clearAll": "Xoá lịch sử", "hi.count": "{n} bài",
  "set.fontSize": "Cỡ chữ", "set.fontSizeDesc": "Phóng to / thu nhỏ chữ trong toàn bộ app.",
  "fs.small": "Nhỏ", "fs.medium": "Vừa", "fs.large": "Lớn",
  "set.naming": "Tên tệp", "set.namingDesc": "Cách đặt tên cho tệp đã lưu.",
  "tpl.artist-title": "Nghệ sĩ - Tên bài", "tpl.title": "Tên bài", "tpl.title-artist": "Tên bài - Nghệ sĩ", "tpl.artist-album-title": "Nghệ sĩ - Album - Tên bài",
  "set.artistFolder": "Thư mục theo nghệ sĩ", "set.artistFolderDesc": "Lưu mỗi bài vào thư mục con mang tên nghệ sĩ.",
  "set.dup": "Khi tệp đã tồn tại", "dup.rename": "Giữ cả hai (thêm số)", "dup.skip": "Bỏ qua, không tải", "dup.overwrite": "Ghi đè tệp cũ",
  "set.parallel": "Số bài tải cùng lúc", "set.parallelDesc": "Số bài được tải song song.",
  "set.speed": "Giới hạn tốc độ", "speed.none": "Không giới hạn",
  "set.network": "Mạng & tài khoản",
  "set.cookies": "Dùng cookie trình duyệt", "set.cookiesDesc": "Hữu ích khi YouTube yêu cầu đăng nhập. Trên Windows hãy đóng trình duyệt trước.", "ck.none": "Không dùng cookie",
  "set.proxy": "Proxy", "set.proxyDesc": "Tuỳ chọn, ví dụ http://127.0.0.1:8080",
  "set.notify": "Thông báo trên màn hình", "set.notifyDesc": "Báo khi một bài tải xong.",
  "set.updates": "Kiểm tra yt-dlp khi mở app", "set.updatesDesc": "Cảnh báo khi yt-dlp đã cũ (nguyên nhân thường gặp khiến tải lỗi).",
  "set.reset": "Đặt lại mặc định", "set.resetDesc": "Khôi phục mọi tuỳ chọn, trừ thư mục lưu.",
  "tb.min": "Thu nhỏ", "tb.max": "Phóng to", "tb.restore": "Khôi phục", "tb.close": "Đóng",
  "toast.ytdlpOld": "yt-dlp {cur} đã cũ (mới nhất {latest}). Hãy cập nhật để tránh lỗi tải.",
  "toast.upToDate": "yt-dlp đã là bản mới nhất ({v}).", "toast.added": "Đã thêm {n} bài vào hàng đợi", "toast.fileDeleted": "Đã xoá tệp",
  "toast.reset": "Đã khôi phục cài đặt", "toast.stopped": "Đã dừng các lượt tải", "toast.checkFailed": "Không kiểm tra được bản cập nhật",
  "notif.title": "Đã tải xong", "src.youtube": "YouTube", "src.tiktok": "TikTok", "src.spotify": "Spotify",
  "tool.checkingNow": "Đang kiểm tra…",
  "e.w_skipped": "đã có sẵn nên bỏ qua", "e.sha_mismatch": "Tệp tải về không vượt qua bước kiểm tra toàn vẹn. Hãy thử lại.",
  "e.search_failed": "Tìm kiếm thất bại: {d}", "e.playlist_failed": "Không đọc được playlist: {d}", "e.delete_failed": "Không xoá được tệp: {d}",
  "e.update_check": "Không kết nối được GitHub: {d}",
  "ban.updateTitle": "Có bản yt-dlp mới hơn",
  "empty.title": "Hàng đợi đang trống",
  "dnd.title": "Thả vào đây", "dnd.sub": "Thả link hoặc văn bản để thêm vào",
  "clip.found": "Có link trong clipboard của bạn", "clip.use": "Dùng link này", "clip.dismiss": "Bỏ qua",
  "set.clipWatch": "Gợi ý link từ clipboard", "set.clipWatchDesc": "Khi quay lại app, gợi ý dùng link được hỗ trợ mà bạn vừa sao chép.",
  "undo": "Hoàn tác", "toast.removed": "Đã gỡ khỏi danh sách",
  "flt.all": "Tất cả", "flt.active": "Đang xử lý", "flt.done": "Xong", "flt.failed": "Lỗi",
  "act.retryFailed": "Thử lại mục lỗi", "act.openFolder": "Mở thư mục lưu",
  "sc.title": "Phím tắt", "sc.focus": "Chuyển đến ô tìm kiếm", "sc.paste": "Dán link ở bất kỳ đâu", "sc.add": "Thêm vào hàng đợi",
  "sc.nav": "Đến Tải xuống / Lịch sử / Cài đặt", "sc.settings": "Mở Cài đặt", "sc.help": "Hiện danh sách này", "sc.close": "Đóng hộp thoại",
  "about.shortcuts": "Phím tắt", "tb.active": "{n} đang chạy",
  "dl.heroTip": "Dán, thả hoặc gõ — phần còn lại để app lo.",
};

const DICT: Record<"en" | "vi", Record<string, string>> = { en: { ...enBase, ...EN }, vi: { ...viBase, ...VI } };

export function detectLang(): "en" | "vi" {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language || "en"];
  for (const l of list) { const c = String(l).toLowerCase(); if (c.startsWith("vi")) return "vi"; if (c.startsWith("en")) return "en"; }
  return "en";
}
export const resolveLang = (l: Lang) => (l === "auto" ? detectLang() : l);
type Params = Record<string, string | number | undefined | null>;
const fill = (s: string, p?: Params) => (p ? s.replace(/\{(\w+)\}/g, (_, k) => (p[k] != null ? String(p[k]) : "")) : s);

export function makeT(lang: "en" | "vi") {
  const t = (key: string, p?: Params) => fill(DICT[lang][key] ?? DICT.en[key] ?? key, p);
  /** Dịch thông báo từ backend: "@ma" hoặc "@ma|chi_tiet". */
  const tr = (msg: unknown) => {
    const m = String(msg ?? "");
    if (m[0] !== "@") return m;
    const i = m.indexOf("|");
    const code = i < 0 ? m.slice(1) : m.slice(1, i);
    const detail = i < 0 ? "" : m.slice(i + 1);
    const s = DICT[lang]["e." + code] ?? DICT.en["e." + code];
    return s ? s.replace("{d}", detail) : detail || code;
  };
  return { lang, t, tr };
}
export const currentT = () => makeT(resolveLang(useSettings.getState().s.lang));
export function useI18n() {
  const l = useSettings((s) => s.s.lang);
  const lang = resolveLang(l);
  return useMemo(() => makeT(lang), [lang]);
}
