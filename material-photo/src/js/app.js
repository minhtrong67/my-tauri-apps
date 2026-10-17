const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],TA=window.__TAURI__;
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch{}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* Lucide icons (ISC license): inner SVG markup, drawn with stroke on a 24x24 grid */
const IC={"person":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/> <circle cx=\"12\" cy=\"7\" r=\"4\"/>","grid":"<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\"/> <rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\"/> <rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\"/> <rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\"/>","image":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\"/> <circle cx=\"9\" cy=\"9\" r=\"2\"/> <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"/>","edit":"<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/> <path d=\"m15 5 4 4\"/>","folder":"<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\"/>","addimg":"<path d=\"M16 5h6\"/> <path d=\"M19 2v6\"/> <path d=\"M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5\"/> <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"/> <circle cx=\"9\" cy=\"9\" r=\"2\"/>","back":"<path d=\"m12 19-7-7 7-7\"/> <path d=\"M19 12H5\"/>","chl":"<path d=\"m15 18-6-6 6-6\"/>","chr":"<path d=\"m9 18 6-6-6-6\"/>","zin":"<circle cx=\"11\" cy=\"11\" r=\"8\"/> <line x1=\"21\" x2=\"16.65\" y1=\"21\" y2=\"16.65\"/> <line x1=\"11\" x2=\"11\" y1=\"8\" y2=\"14\"/> <line x1=\"8\" x2=\"14\" y1=\"11\" y2=\"11\"/>","zout":"<circle cx=\"11\" cy=\"11\" r=\"8\"/> <line x1=\"21\" x2=\"16.65\" y1=\"21\" y2=\"16.65\"/> <line x1=\"8\" x2=\"14\" y1=\"11\" y2=\"11\"/>","fit":"<path d=\"M3 7V5a2 2 0 0 1 2-2h2\"/> <path d=\"M17 3h2a2 2 0 0 1 2 2v2\"/> <path d=\"M21 17v2a2 2 0 0 1-2 2h-2\"/> <path d=\"M7 21H5a2 2 0 0 1-2-2v-2\"/> <rect width=\"10\" height=\"8\" x=\"7\" y=\"8\" rx=\"1\"/>","rr":"<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\"/> <path d=\"M21 3v5h-5\"/>","rl":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/> <path d=\"M3 3v5h5\"/>","copy":"<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/>","del":"<path d=\"M10 11v6\"/> <path d=\"M14 11v6\"/> <path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"/> <path d=\"M3 6h18\"/> <path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/>","play":"<path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\"/>","pause":"<rect x=\"14\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\"/> <rect x=\"5\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\"/>","info":"<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M12 16v-4\"/> <path d=\"M12 8h.01\"/>","print":"<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"/> <path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\"/> <rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"/>","fs":"<path d=\"m15 15 6 6\"/> <path d=\"m15 9 6-6\"/> <path d=\"M21 16v5h-5\"/> <path d=\"M21 8V3h-5\"/> <path d=\"M3 16v5h5\"/> <path d=\"m3 21 6-6\"/> <path d=\"M3 8V3h5\"/> <path d=\"M9 9 3 3\"/>","fsx":"<path d=\"m15 15 6 6m-6-6v4.8m0-4.8h4.8\"/> <path d=\"M9 19.8V15m0 0H4.2M9 15l-6 6\"/> <path d=\"M15 4.2V9m0 0h4.8M15 9l6-6\"/> <path d=\"M9 4.2V9m0 0H4.2M9 9 3 3\"/>","search":"<path d=\"m21 21-4.34-4.34\"/> <circle cx=\"11\" cy=\"11\" r=\"8\"/>","sort":"<path d=\"m21 16-4 4-4-4\"/> <path d=\"M17 20V4\"/> <path d=\"m3 8 4-4 4 4\"/> <path d=\"M7 4v16\"/>","undo":"<path d=\"M9 14 4 9l5-5\"/> <path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\"/>","redo":"<path d=\"m15 14 5-5-5-5\"/> <path d=\"M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13\"/>","compare":"<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"/> <circle cx=\"12\" cy=\"12\" r=\"3\"/>","check":"<path d=\"M20 6 9 17l-5-5\"/>","crop":"<path d=\"M6 2v14a2 2 0 0 0 2 2h14\"/> <path d=\"M18 22V8a2 2 0 0 0-2-2H2\"/>","refresh":"<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/> <path d=\"M21 3v5h-5\"/> <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/> <path d=\"M8 16H3v5\"/>","lib":"<path d=\"m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16\"/> <path d=\"M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2\"/> <circle cx=\"13\" cy=\"7\" r=\"1\" fill=\"currentColor\"/> <rect x=\"8\" y=\"2\" width=\"14\" height=\"14\" rx=\"2\"/>","mood":"<path d=\"M15 10V9\"/> <path d=\"M16.472 15a6 6 0 01-8.943 0\"/> <path d=\"M9 10V9\"/> <circle cx=\"12\" cy=\"12\" r=\"10\"/>","help":"<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/> <path d=\"M12 17h.01\"/>","tune":"<path d=\"M10 5H3\"/> <path d=\"M12 19H3\"/> <path d=\"M14 3v4\"/> <path d=\"M16 17v4\"/> <path d=\"M21 12h-9\"/> <path d=\"M21 19h-5\"/> <path d=\"M21 5h-7\"/> <path d=\"M8 10v4\"/> <path d=\"M8 12H3\"/>","magic":"<path d=\"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72\"/> <path d=\"m14 7 3 3\"/> <path d=\"M5 6v4\"/> <path d=\"M19 14v4\"/> <path d=\"M10 2v2\"/> <path d=\"M7 8H3\"/> <path d=\"M21 16h-4\"/> <path d=\"M11 3H9\"/>","brush":"<path d=\"m11 10 3 3\"/> <path d=\"M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z\"/> <path d=\"M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031\"/>","flip":"<path d=\"M10 12H8\"/> <path d=\"M16 12h-2\"/> <path d=\"M22 12h-2\"/> <path d=\"M4 12H2\"/> <path d=\"M7.298 20.288A1 1 0 008 22h8a1 1 0 00.703-1.712l-3.991-3.99a1 1 0 00-1.424-.001z\"/> <path d=\"M7.298 3.712A1 1 0 018 2h8a1 1 0 01.703 1.712l-3.991 3.99a1 1 0 01-1.424.001z\"/>","flipv":"<path d=\"M12 14v2\"/> <path d=\"M12 20v2\"/> <path d=\"M12 2v2\"/> <path d=\"M12 8v2\"/> <path d=\"M20.288 16.703A1 1 0 0022 16V8a1 1 0 00-1.712-.703l-3.99 3.991a1 1 0 00-.001 1.424z\"/> <path d=\"M3.712 16.703A1 1 0 012 16V8a1 1 0 011.712-.703l3.99 3.991a1 1 0 01.001 1.424z\"/>","settings":"<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/> <circle cx=\"12\" cy=\"12\" r=\"3\"/>","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\"/> <path d=\"M12 2v2\"/> <path d=\"M12 20v2\"/> <path d=\"m4.93 4.93 1.41 1.41\"/> <path d=\"m17.66 17.66 1.41 1.41\"/> <path d=\"M2 12h2\"/> <path d=\"M20 12h2\"/> <path d=\"m6.34 17.66-1.41 1.41\"/> <path d=\"m19.07 4.93-1.41 1.41\"/>","moon":"<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\"/>","monitor":"<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"/> <line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\"/> <line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\"/>","lang":"<path d=\"m5 8 6 6\"/> <path d=\"m4 14 6-6 2-3\"/> <path d=\"M2 5h12\"/> <path d=\"M7 2h1\"/> <path d=\"m22 22-5-10-5 10\"/> <path d=\"M14 18h6\"/>","palette":"<path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\"/> <circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\"/> <circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\"/> <circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\"/> <circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>","type":"<path d=\"M12 4v16\"/> <path d=\"M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2\"/> <path d=\"M9 20h6\"/>","appwin":"<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/> <path d=\"M10 4v4\"/> <path d=\"M2 8h20\"/> <path d=\"M6 4v4\"/>","slides":"<path d=\"M2 3h20\"/> <path d=\"M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3\"/> <path d=\"m7 21 5-5 5 5\"/>","x":"<path d=\"M18 6 6 18\"/> <path d=\"m6 6 12 12\"/>","sparkles":"<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\"/> <path d=\"M20 2v4\"/> <path d=\"M22 4h-4\"/> <circle cx=\"4\" cy=\"20\" r=\"2\"/>","heart":"<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\"/>","download":"<path d=\"M12 15V3\"/> <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/> <path d=\"m7 10 5 5 5-5\"/>","hdd":"<path d=\"M10.7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v4.1\"/> <path d=\"m21 21-1.9-1.9\"/> <circle cx=\"17\" cy=\"17\" r=\"3\"/>","reset":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/> <path d=\"M3 3v5h5\"/>"};
const ico=n=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`,CK=`<svg class="ck" viewBox="0 0 24 24" aria-hidden="true">${IC.check}</svg>`;
$$('[data-ic]').forEach(e=>e.innerHTML=IC[e.dataset.ic]);
/* ---------- i18n ---------- */
const T={vi:{navGal:'Bộ sưu tập',navView:'Xem ảnh',navEdit:'Chỉnh sửa',settings:'Cài đặt',about:'Thông tin ứng dụng',back:'Quay lại',openFile:'Mở ảnh',openFolder:'Mở thư mục',slideshow:'Trình chiếu',info:'Thông tin ảnh',print:'In ảnh',reveal:'Hiện trong thư mục',fullscreen:'Toàn màn hình (F11)',undo:'Hoàn tác (Ctrl+Z)',redo:'Làm lại (Ctrl+Y)',compare:'Giữ để xem ảnh gốc',
 search:'Tìm theo tên tệp',tileSize:'Kích thước ảnh nhỏ',emptyT:'Xem ảnh của bạn',emptyH:'Mở một thư mục hoặc một ảnh để bắt đầu. Bạn cũng có thể kéo thả vào đây.',prev:'Ảnh trước',next:'Ảnh sau',zoomOut:'Thu nhỏ (-)',zoomIn:'Phóng to (+)',fit:'Vừa khung (0)',rotL:'Xoay trái',rotR:'Xoay phải',edit:'Chỉnh sửa (E)',copy:'Sao chép ảnh',del:'Xóa (Delete)',
 sName:'Tên',sDate:'Ngày sửa',sSize:'Kích thước',sAsc:'Tăng dần',sDesc:'Giảm dần',items:'ảnh',of:'/',noMatch:'Không có ảnh nào khớp',
 tCrop:'Cắt và xoay',tAdj:'Điều chỉnh',tFil:'Bộ lọc',tDraw:'Vẽ',aspect:'Tỉ lệ khung',free:'Tự do',orig:'Gốc',straighten:'Căn thẳng',rotate:'Xoay và lật',
 bright:'Độ sáng',contrast:'Tương phản',sat:'Độ bão hòa',warm:'Nhiệt độ màu',sharp:'Độ nét',vig:'Tối góc',blur:'Làm mờ',resetAdj:'Đặt lại điều chỉnh',
 fOrig:'Gốc',fVivid:'Rực rỡ',fWarm:'Ấm',fCool:'Lạnh',fMono:'Đen trắng',fNoir:'Noir',fSepia:'Sepia',fFade:'Phai màu',fDrama:'Kịch tính',
 pen:'Bút',hl:'Bút dạ',color:'Màu',size:'Cỡ nét',undoStroke:'Hoàn tác nét vẽ',clearInk:'Xóa nét vẽ',drawHint:'Vẽ sau khi đã cắt xong. Nét vẽ được lưu theo khung đã cắt.',
 fmt:'Định dạng',quality:'Chất lượng',outSize:'Kích thước xuất',save:'Lưu',saveCopy:'Lưu bản sao',resetAll:'Đặt lại tất cả',cancel:'Hủy',saveOnlyCopy:'Định dạng này chỉ lưu được dưới dạng bản sao',
 fName:'Tên tệp',fPath:'Vị trí',fDim:'Kích thước ảnh',fSz:'Dung lượng',fMod:'Sửa đổi lúc',fType:'Định dạng tệp',
 delT:'Xóa ảnh này?',delP:'Ảnh sẽ được chuyển vào Thùng rác.',delYes:'Xóa',ovT:'Ghi đè ảnh gốc?',ovP:'Thay đổi sẽ được lưu vào chính tệp này. Bạn có thể dùng "Lưu bản sao" để giữ ảnh gốc.',ovYes:'Ghi đè',discT:'Bỏ các thay đổi?',discP:'Những chỉnh sửa chưa lưu sẽ bị mất.',discYes:'Bỏ thay đổi',
 copied:'Đã sao chép ảnh',copyFail:'Không sao chép được ảnh',saved:'Đã lưu ảnh',saveFail:'Không lưu được ảnh',deleted:'Đã chuyển vào Thùng rác',delFail:'Không xóa được ảnh',readFail:'Không đọc được ảnh',noImages:'Thư mục không có ảnh',
 sTheme:'Giao diện',system:'Hệ thống',light:'Sáng',dark:'Tối',sLang:'Ngôn ngữ',sColor:'Màu chủ đề',customColor:'Màu tùy chỉnh',sSlide:'Thời gian mỗi ảnh khi trình chiếu',sec:'giây',version:'Phiên bản',author:'Tác giả:',credit:'Được xây dựng với sự hỗ trợ của Claude (Anthropic)',ok:'Xong',exportOpt:'Tùy chọn xuất',autoScanHint:'Tự động nhập ảnh từ thư mục Pictures của Windows, kể cả thư mục con.',ctxOpen:'Mở',ctxCopyPath:'Sao chép đường dẫn',authorL:'Tác giả',winT:'Cửa sổ khi mở ứng dụng',winRemember:'Ghi nhớ kích thước',winMax:'Luôn phóng to tối đa',winHint:'Ghi nhớ: lần sau mở lại đúng kích thước và vị trí bạn đã chỉnh. Luôn phóng to: ứng dụng luôn mở ở chế độ phóng to tối đa.',aiBy:'Hỗ trợ bởi AI',refresh:'Làm mới',library:'Thư viện ảnh (Pictures)',libTitle:'Ảnh (Pictures)',allFolders:'Tất cả thư mục',scanning:'Đang quét ảnh…',autoScan:'Quét thư mục Pictures khi mở app',sCrop:'Cắt',sAdj:'Chỉnh',sFil:'Lọc',sDraw:'Vẽ',sStick:'Dán',tPen:'Bút',tHlr:'Bút dạ',tLine:'Đường thẳng',tArrow:'Mũi tên',tRect:'Chữ nhật',tOval:'Elip',smooth:'Làm mượt nét vẽ',shiftHint:'Giữ Shift khi vẽ để có nét thẳng (tự bắt 0°, 45°, 90°). Với đường thẳng và mũi tên, Shift khóa góc 45°; với hình, Shift giữ tỉ lệ vuông, tròn.',arrows:'Mũi tên',emoji:'Emoji',stickHint:'Chọn mũi tên hoặc emoji để thêm vào ảnh. Kéo để di chuyển, kéo chấm ở góc để đổi cỡ, kéo chấm tròn phía trên để xoay (Shift: xoay từng 15°). Phím mũi tên để nhích, Delete để xóa.',selected:'Đang chọn',itemSize:'Kích thước',itemRot:'Xoay',dup:'Nhân bản',remove:'Xóa',front:'Đưa lên trên'},
 en:{navGal:'Collection',navView:'Viewer',navEdit:'Edit',settings:'Settings',about:'About',back:'Back',openFile:'Open picture',openFolder:'Open folder',slideshow:'Slideshow',info:'Picture info',print:'Print',reveal:'Show in folder',fullscreen:'Full screen (F11)',undo:'Undo (Ctrl+Z)',redo:'Redo (Ctrl+Y)',compare:'Hold to see the original',
 search:'Search by file name',tileSize:'Thumbnail size',emptyT:'View your pictures',emptyH:'Open a folder or a picture to get started. You can also drag and drop here.',prev:'Previous picture',next:'Next picture',zoomOut:'Zoom out (-)',zoomIn:'Zoom in (+)',fit:'Fit to window (0)',rotL:'Rotate left',rotR:'Rotate right',edit:'Edit (E)',copy:'Copy picture',del:'Delete (Delete)',
 sName:'Name',sDate:'Date modified',sSize:'Size',sAsc:'Ascending',sDesc:'Descending',items:'pictures',of:'of',noMatch:'No matching pictures',
 tCrop:'Crop and rotate',tAdj:'Adjust',tFil:'Filters',tDraw:'Draw',aspect:'Aspect ratio',free:'Free',orig:'Original',straighten:'Straighten',rotate:'Rotate and flip',
 bright:'Brightness',contrast:'Contrast',sat:'Saturation',warm:'Warmth',sharp:'Sharpness',vig:'Vignette',blur:'Blur',resetAdj:'Reset adjustments',
 fOrig:'Original',fVivid:'Vivid',fWarm:'Warm',fCool:'Cool',fMono:'Mono',fNoir:'Noir',fSepia:'Sepia',fFade:'Fade',fDrama:'Dramatic',
 pen:'Pen',hl:'Highlighter',color:'Color',size:'Stroke size',undoStroke:'Undo stroke',clearInk:'Clear drawing',drawHint:'Draw after you finish cropping. Strokes are stored relative to the cropped frame.',
 fmt:'Format',quality:'Quality',outSize:'Output size',save:'Save',saveCopy:'Save a copy',resetAll:'Reset all',cancel:'Cancel',saveOnlyCopy:'This format can only be saved as a copy',
 fName:'File name',fPath:'Location',fDim:'Dimensions',fSz:'File size',fMod:'Modified',fType:'File type',
 delT:'Delete this picture?',delP:'The picture will be moved to the Recycle Bin.',delYes:'Delete',ovT:'Overwrite the original?',ovP:'Changes will be saved to this very file. Use "Save a copy" to keep the original.',ovYes:'Overwrite',discT:'Discard changes?',discP:'Unsaved edits will be lost.',discYes:'Discard',
 copied:'Picture copied',copyFail:'Could not copy the picture',saved:'Picture saved',saveFail:'Could not save the picture',deleted:'Moved to the Recycle Bin',delFail:'Could not delete the picture',readFail:'Could not read the picture',noImages:'This folder has no pictures',
 sTheme:'Theme',system:'System',light:'Light',dark:'Dark',sLang:'Language',sColor:'Theme color',customColor:'Custom color',sSlide:'Slideshow seconds per picture',sec:'seconds',version:'Version',author:'Author:',credit:'Built with the assistance of Claude (Anthropic)',ok:'Done',exportOpt:'Export options',autoScanHint:'Imports pictures from the Windows Pictures folder, including sub folders.',ctxOpen:'Open',ctxCopyPath:'Copy path',authorL:'Author',winT:'Window when the app opens',winRemember:'Remember size',winMax:'Always maximized',winHint:'Remember: the next launch reopens at the size and position you left. Always maximized: the app always opens maximized.',aiBy:'AI assistant',refresh:'Refresh',library:'Pictures library',libTitle:'Pictures',allFolders:'All folders',scanning:'Scanning pictures…',autoScan:'Scan Pictures on startup',sCrop:'Crop',sAdj:'Adjust',sFil:'Filters',sDraw:'Draw',sStick:'Stickers',tPen:'Pen',tHlr:'Highlighter',tLine:'Line',tArrow:'Arrow',tRect:'Box',tOval:'Ellipse',smooth:'Stroke smoothing',shiftHint:'Hold Shift while drawing for a straight stroke (snaps to 0°, 45°, 90°). For lines and arrows Shift locks 45° steps; for shapes it keeps them square or round.',arrows:'Arrows',emoji:'Emoji',stickHint:'Pick an arrow or emoji to add it to the picture. Drag to move, drag the corner dot to resize, drag the round dot on top to rotate (Shift: 15° steps). Arrow keys nudge, Delete removes.',selected:'Selected',itemSize:'Size',itemRot:'Rotation',dup:'Duplicate',remove:'Delete',front:'Bring to front'}};
Object.assign(T.vi,{setSub:'Tùy chỉnh giao diện và cách ứng dụng hoạt động',secLook:'Giao diện',secGeneral:'Chung',secSlide:'Trình chiếu',sMode:'Chế độ màu',colorHint:'Chọn màu Material có sẵn hoặc tự chọn màu bạn thích',sFont:'Phông chữ',fontHint:'Áp dụng cho toàn bộ ứng dụng',fontSys:'Hệ thống',langAuto:'Tự động',langHint:'Tự động theo ngôn ngữ của thiết bị',close:'Đóng',resetApp:'Đặt lại giao diện',flipH:'Lật ngang',flipV:'Lật dọc',license:'Mã nguồn mở, giấy phép MIT'});Object.assign(T.en,{setSub:'Customize how Material Photo looks and behaves',secLook:'Appearance',secGeneral:'General',secSlide:'Slideshow',sMode:'Color mode',colorHint:'Pick a Material color or choose your own',sFont:'Font',fontHint:'Applies to the whole app',fontSys:'System',langAuto:'Auto',langHint:'Auto follows your device language',close:'Close',resetApp:'Reset appearance',flipH:'Flip horizontally',flipV:'Flip vertically',license:'Open source, MIT license'});
/* language: follow the device language (Vietnamese or English) unless the user picked one */
const sysLang=()=>{for(const l of (navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en'])){const c=String(l).slice(0,2).toLowerCase();if(c=='vi'||c=='en')return c}return 'en'};
const DEF={theme:'system',seed:'#769CDF',font:'system'};
let langPref=ls('lang')||'auto',lang=langPref=='auto'?sysLang():langPref,winMode='remember',theme=ls('theme')||DEF.theme,seed=ls('seed')||DEF.seed,fontId=ls('font')||DEF.font,interval=+(ls('interval')||4);
const t=k=>T[lang][k]||k;
/* ---------- Material 3 colors from a customizable seed ---------- */
const rgb=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const lum=h=>{const [r,g,b]=rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
/* Material Design 3 color roles generated from the seed color (HCT tonal palettes, Material Color Utilities) */
const COLORS=[['#769CDF','Xanh dương','Blue'],['#6750A4','Tím','Purple'],['#00BCD4','Xanh ngọc','Cyan'],['#009688','Xanh cổ vịt','Teal'],['#4CAF50','Xanh lá','Green'],['#FFC107','Hổ phách','Amber'],['#FF9800','Cam','Orange'],['#F44336','Đỏ','Red'],['#E91E63','Hồng','Pink'],['#795548','Nâu','Brown'],['#607D8B','Xám xanh','Blue grey']];
const FONTS=[['system','','system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'],['roboto','Roboto','"Roboto",system-ui,"Segoe UI",sans-serif'],['inter','Inter','"Inter",system-ui,"Segoe UI",sans-serif'],['open','Open Sans','"Open Sans",system-ui,"Segoe UI",sans-serif'],['noto','Noto Sans','"Noto Sans",system-ui,"Segoe UI",sans-serif'],['nunito','Nunito','"Nunito",system-ui,"Segoe UI",sans-serif'],['bvp','Be Vietnam Pro','"Be Vietnam Pro",system-ui,"Segoe UI",sans-serif'],['segoe','Segoe UI','"Segoe UI",system-ui,sans-serif'],['arial','Arial','Arial,"Helvetica Neue",sans-serif'],['verdana','Verdana','Verdana,Geneva,sans-serif'],['tahoma','Tahoma','Tahoma,"Segoe UI",sans-serif'],['georgia','Georgia','Georgia,"Times New Roman",serif']];
const isDark=()=>theme=='dark'||(theme=='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
function paint(){const dark=isDark(),r=document.documentElement;let c;try{c=M3.scheme(seed,dark)}catch{seed=DEF.seed;c=M3.scheme(seed,dark)}
 const m={'--primary':c.primary,'--on-primary':c.onPrimary,'--p-cont':c.primaryContainer,'--on-p-cont':c.onPrimaryContainer,'--sec':c.secondary,'--on-sec':c.onSecondary,'--sec-cont':c.secondaryContainer,'--on-sec-cont':c.onSecondaryContainer,'--tert':c.tertiary,'--on-tert':c.onTertiary,'--tert-cont':c.tertiaryContainer,'--on-tert-cont':c.onTertiaryContainer,
  '--surface':c.surface,'--s-low':c.surfaceContainerLow,'--s-cont':c.surfaceContainer,'--s-high':c.surfaceContainerHigh,'--s-highest':c.surfaceContainerHighest,'--on-surface':c.onSurface,'--on-var':c.onSurfaceVariant,'--outline':c.outline,'--outline-v':c.outlineVariant,'--inv':c.inverseSurface,'--on-inv':c.inverseOnSurface,'--err':c.error,'--on-err':c.onError,'--err-cont':c.errorContainer,'--on-err-cont':c.onErrorContainer};
 for(const x in m)r.style.setProperty(x,m[x]);r.style.colorScheme=dark?'dark':'light';try{TA&&TA.window.getCurrentWindow().setTheme(theme=='system'?null:theme)}catch{}}
function applyFont(){document.documentElement.style.setProperty('--font',(FONTS.find(f=>f[0]==fontId)||FONTS[0])[2])}
/* ---------- state ---------- */
const S={dir:'',all:[],list:[],idx:-1,view:'gal',sort:ls('sort')||'name',asc:ls('asc')!=='0',q:'',slide:null,mode:'folder',sub:'',busy:false,animNext:false,dirn:0,fsWin:false};
const asset=(p,v)=>TA?TA.core.convertFileSrc(p)+(v?'?v='+v:''):p,base=p=>p.split(/[\\/]/).filter(Boolean).pop()||p,inv=(c,a)=>TA.core.invoke(c,a);
const fmtSize=n=>n>1048576?(n/1048576).toFixed(1)+' MB':n>1024?(n/1024).toFixed(1)+' KB':n+' B';
function busy(on){S.busy=on;const p=$('#prog');if(p)p.hidden=!on;if(S.view=='gal')titles()}
let tt;function toast(m){const e=$('#sb');e.textContent=m;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),2400)}
function ask(title,text,yes){return new Promise(res=>{$('#askT').textContent=title;$('#askP').textContent=text;$('#askYes').textContent=yes;$('#askNo').textContent=t('cancel');const d=$('#dAsk');d.showModal();
 const end=v=>{d.close();res(v)};$('#askYes').onclick=()=>end(true);$('#askNo').onclick=()=>end(false);d.oncancel=()=>res(false)})}
function menu(anchor,items){closeMenu();const m=document.createElement('div');m.className='menu';m.innerHTML=items.map((it,i)=>it==='-'?'<hr>':`<button class="mi sl" data-i="${i}">${it.on?ico('check'):'<span class="ph"></span>'}<span>${esc(it.t)}</span></button>`).join('');document.body.append(m);
 const r=anchor.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.max(8,Math.min(r.bottom+4,innerHeight-m.offsetHeight-8))+'px';m.onclick=e=>{const b=e.target.closest('.mi');if(b){closeMenu();items[+b.dataset.i].f()}};setTimeout(()=>document.addEventListener('click',closeMenu,{once:true}),0)}
function closeMenu(){$$('.menu').forEach(m=>m.remove())}
addEventListener('blur',closeMenu);addEventListener('resize',closeMenu);document.addEventListener('contextmenu',e=>{if(!e.target.closest('.tile'))closeMenu()});
/* ---------- views ---------- */
function show(v){S.view=v;document.body.classList.toggle('fs',!!S.fsWin&&v=='view');['gal','view','edit'].forEach(x=>$('#v'+x[0].toUpperCase()+x.slice(1)).hidden=x!=v);
 $$('.ri[data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav==v));$$('[data-act]').forEach(a=>a.hidden=a.dataset.act!=v);$('#bBack').hidden=v=='gal';
 $('[data-nav=view]').disabled=$('[data-nav=edit]').disabled=S.idx<0;titles();if(v!='view'&&S.slide)toggleSlide();if(v=='view')requestAnimationFrame(()=>{fit()});if(v=='gal'&&S.idx>=0)focusTile()}
function focusTile(){requestAnimationFrame(()=>{const tl=$(`#grid .tile[data-i="${S.idx}"]`);if(tl){if(tl.scrollIntoView)tl.scrollIntoView({block:'center'});tl.classList.remove('pulse');void tl.offsetWidth;tl.classList.add('pulse')}})}
function titles(){const e=S.list[S.idx];
 if(S.view=='gal'){$('#tTitle').textContent=S.mode=='library'?t('libTitle'):S.dir?base(S.dir):'Material Photo';$('#tSub').textContent=S.busy?t('scanning'):S.dir?`${S.list.length} ${t('items')}`:''}
 else if(e){$('#tTitle').textContent=e.name;$('#tSub').textContent=`${S.idx+1} ${t('of')} ${S.list.length}`}}
const COLL=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
function sortFn(){const k=S.sort,d=S.asc?1:-1;return (a,b)=>d*(k=='name'?COLL.compare(a.name,b.name):k=='date'?a.mtime-b.mtime:a.size-b.size)}
function subOf(e){const r=(e.folder||'').slice(S.dir.length).replace(/^[\\/]+/,'');return r.split(/[\\/]/)[0]}
function subs(){const m={};S.all.forEach(e=>{const k=subOf(e);if(k)m[k]=(m[k]||0)+1});return m}
function applyFilter(keepPath){const cur=keepPath||(S.list[S.idx]&&S.list[S.idx].path),q=S.q.trim().toLowerCase();
 S.list=S.all.filter(e=>(!q||e.name.toLowerCase().includes(q))&&(!S.sub||subOf(e)==S.sub)).sort(sortFn());S.idx=cur?S.list.findIndex(e=>e.path==cur):-1;renderGallery()}
const TQ={q:[],run:0,MAX:4,tk:0};let tio=null;
function pumpThumbs(){while(TQ.run<TQ.MAX&&TQ.q.length){const [im,e]=TQ.q.shift();if(!im.isConnected)continue;TQ.run++;const done=()=>{TQ.run--;pumpThumbs()};
 (TA?inv('thumb',{path:e.path,size:360}).then(p=>asset(p),()=>asset(e.path)):Promise.resolve(asset(e.path))).then(u=>{if(im.isConnected){im.onerror=()=>{im.onerror=null;im.src=asset(e.path)};im.src=u}}).then(done,done)}}
function loadThumb(im){if(!window.IntersectionObserver){const e=S.list[+im.dataset.i];if(e)im.src=asset(e.path);return}
 if(!tio)tio=new IntersectionObserver(es=>{for(const x of es)if(x.isIntersecting){tio.unobserve(x.target);const e=S.list[+x.target.dataset.i];if(e)TQ.q.push([x.target,e])}pumpThumbs()},{root:$('#grid'),rootMargin:'700px'});tio.observe(im)}
const tileHtml=i=>{const e=S.list[i];return `<button class="tile sl" data-i="${i}" style="--n:${Math.min(i,28)}" title="${esc(e.name)}"><img data-i="${i}" decoding="async" alt="" onload="this.classList.add('ld');this.parentNode.classList.add('ld')"><span class="tn">${esc(e.name)}</span></button>`};
function renderGallery(){const g=$('#grid'),N=S.list.length,tk=++TQ.tk;g.toggleAttribute('data-anim',S.animNext);S.animNext=false;$('#gEmpty').hidden=S.all.length>0||S.busy;TQ.q=[];
 g.innerHTML=N?'':(S.all.length?`<div class="hint" style="grid-column:1/-1;padding:24px;text-align:center">${esc(t('noMatch'))}</div>`:'');
 let i=0;const step=()=>{if(tk!=TQ.tk)return;const end=Math.min(N,i+240);let html='';for(;i<end;i++)html+=tileHtml(i);g.insertAdjacentHTML('beforeend',html);g.querySelectorAll('img[data-i]:not([data-o])').forEach(im=>{im.dataset.o=1;loadThumb(im)});if(i<N)requestAnimationFrame(step)};step();
 const sb=S.mode=='library'&&Object.keys(subs()).length>0;$('#bFolder').hidden=!sb;$('#folderL').textContent=S.sub||t('allFolders');$('#sortL').textContent=({name:t('sName'),date:t('sDate'),size:t('sSize')})[S.sort]+(S.asc?' ↑':' ↓');titles()}
async function loadLibrary(){busy(true);S.mode='library';S.animNext=true;try{const o=await inv('library');S.dir=o.dir;S.all=o.entries;S.q='';S.sub='';$('#q').value='';S.idx=-1;applyFilter();if(!S.all.length)toast(t('noImages'))}catch{toast(t('readFail'))}busy(false);show('gal')}
async function refresh(){if(S.mode=='library')return loadLibrary();if(!S.dir)return;const cur=S.list[S.idx]&&S.list[S.idx].path;busy(true);S.animNext=true;try{const o=await inv('open_target',{path:S.dir});S.all=o.entries;applyFilter(cur)}catch{toast(t('readFail'))}busy(false)}
async function openPath(p){try{const o=await inv('open_target',{path:p});S.mode='folder';S.sub='';S.animNext=true;S.dir=o.dir;S.all=o.entries;S.q='';$('#q').value='';applyFilter(o.current);
  if(!S.all.length)toast(t('noImages'));if(o.current&&S.idx>=0)openIdx(S.idx);else{S.idx=-1;show('gal')}}catch{toast(t('readFail'))}}
async function pickFile(){if(!TA)return $('#file').click();try{const p=await TA.dialog.open({multiple:false,filters:[{name:'Image',extensions:['png','jpg','jpeg','jfif','gif','webp','bmp','ico','avif','svg']}]});if(p)openPath(p)}catch{toast(t('readFail'))}}
async function pickDir(){if(!TA)return;try{const p=await TA.dialog.open({directory:true,multiple:false});if(p)openPath(p)}catch{toast(t('readFail'))}}
/* ---------- viewer: zoom, pan, navigation ---------- */
const V={s:1,tx:0,ty:0,nw:1,nh:1,drag:null};
const vr=()=>$('#vstage').getBoundingClientRect(),fitS=()=>{const r=vr();return Math.min(r.width/V.nw,r.height/V.nh,1)||1};
function applyT(){const im=$('#vimg');im.style.transition=V.anim?'transform .26s cubic-bezier(.2,0,0,1)':'none';V.anim=false;im.style.width=V.nw+'px';im.style.height=V.nh+'px';im.style.transform=`translate(-50%,-50%) translate(${V.tx}px,${V.ty}px) scale(${V.s})`;$('#zv').textContent=Math.round(V.s*100)+'%'}
function clampT(){const r=vr(),mx=Math.max(0,(V.nw*V.s-r.width)/2),my=Math.max(0,(V.nh*V.s-r.height)/2);V.tx=clamp(V.tx,-mx,mx);V.ty=clamp(V.ty,-my,my)}
function fit(){V.s=fitS();V.tx=V.ty=0;applyT()}
function zoomTo(s2,cx,cy){const r=vr(),px=(cx==null?r.width/2:cx-r.left)-r.width/2,py=(cy==null?r.height/2:cy-r.top)-r.height/2;s2=clamp(s2,fitS(),Math.max(16,fitS()));const u=(px-V.tx)/V.s,w=(py-V.ty)/V.s;V.tx=px-u*s2;V.ty=py-w*s2;V.s=s2;clampT();applyT()}
function openIdx(i){if(!S.list.length)return;S.idx=(i+S.list.length)%S.list.length;const e=S.list[S.idx],im=$('#vimg');im.style.visibility='hidden';
 im.onload=()=>{V.nw=im.naturalWidth||1;V.nh=im.naturalHeight||1;fit();im.style.visibility='';animIn(im);fillInfo()};im.onerror=()=>{im.style.visibility='';toast(t('readFail'))};im.src=asset(e.path,e.mtime);
 show('view');buildStrip();[1,-1].forEach(d=>{const n=S.list[(S.idx+d+S.list.length)%S.list.length];if(n){const p=new Image();p.src=asset(n.path,n.mtime)}})}
function buildStrip(){const s=$('#strip'),a=Math.max(0,S.idx-30),z=Math.min(S.list.length,S.idx+31);
 s.innerHTML=S.list.slice(a,z).map((e,j)=>`<button data-i="${a+j}" class="${a+j==S.idx?'on':''}" title="${esc(e.name)}"><img alt=""></button>`).join('');
 s.querySelectorAll('img').forEach(im=>{const e=S.list[+im.parentNode.dataset.i];(TA?inv('thumb',{path:e.path,size:360}).then(p=>asset(p),()=>asset(e.path)):Promise.resolve(asset(e.path))).then(u=>{im.src=u})});
 const on=$('#strip button.on');if(on&&on.scrollIntoView)on.scrollIntoView({inline:'center',block:'nearest'})}
function fillInfo(){const e=S.list[S.idx];if(!e)return;const kv=(a,b)=>`<div class="kv"><small>${esc(a)}</small><div>${esc(b)}</div></div>`;
 $('#info').innerHTML=`<h3>${esc(t('info'))}</h3>`+kv(t('fName'),e.name)+kv(t('fDim'),`${V.nw} × ${V.nh} px`)+kv(t('fSz'),fmtSize(e.size))+kv(t('fMod'),new Date(e.mtime).toLocaleString(lang))+kv(t('fType'),(e.name.split('.').pop()||'').toUpperCase())+kv(t('fPath'),e.path)}
const next=()=>{S.dirn=1;S.list.length&&openIdx(S.idx+1)},prev=()=>{S.dirn=-1;S.list.length&&openIdx(S.idx-1)};
function animIn(im){im.style.setProperty('--dx',(S.dirn||0)*32+'px');im.classList.remove('in');void im.offsetWidth;im.classList.add('in');S.dirn=0}
function toggleSlide(){if(S.slide){clearInterval(S.slide);S.slide=null}else{if(S.view!='view'){if(!S.list.length)return;openIdx(Math.max(0,S.idx))}S.slide=setInterval(next,interval*1000)}
 ['#bSlide','#bSlide0'].forEach(s=>$(s).innerHTML=ico(S.slide?'pause':'play'))}
async function toggleFs(){const on=!S.fsWin;S.fsWin=on;document.body.classList.toggle('fs',on&&S.view=='view');try{await TA.window.getCurrentWindow().setFullscreen(on)}catch{}$('#bFs').innerHTML=ico(on?'fsx':'fs');requestAnimationFrame(()=>{if(S.view=='view')fit();if(S.view=='edit')redrawEd()})}
$('#vstage').addEventListener('wheel',e=>{e.preventDefault();zoomTo(V.s*Math.pow(1.0018,-e.deltaY),e.clientX,e.clientY)},{passive:false});
$('#vstage').addEventListener('pointerdown',e=>{if(e.target.closest('.nav')||V.s<=fitS()+.001)return;V.drag={x:e.clientX,y:e.clientY,tx:V.tx,ty:V.ty};$('#vstage').classList.add('pan');$('#vstage').setPointerCapture(e.pointerId)});
$('#vstage').addEventListener('pointermove',e=>{if(!V.drag)return;V.tx=V.drag.tx+e.clientX-V.drag.x;V.ty=V.drag.ty+e.clientY-V.drag.y;clampT();applyT()});
$('#vstage').addEventListener('pointerup',()=>{V.drag=null;$('#vstage').classList.remove('pan')});
$('#vstage').addEventListener('dblclick',e=>{if(e.target.closest('.nav'))return;V.anim=true;V.s>fitS()+.001?fit():zoomTo(Math.max(1,fitS()*2),e.clientX,e.clientY)});
/* ---------- clipboard, delete, print ---------- */
function loadFull(p){return inv('read_image',{path:p}).then(([m,b])=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=`data:${m};base64,${b}`}))}
const toBlob=(c,ty,q)=>new Promise(r=>c.toBlob(r,ty,q));
async function copyCurrent(){const e=S.list[S.idx];if(!e)return;try{const im=await loadFull(e.path),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);
 await navigator.clipboard.write([new ClipboardItem({'image/png':await toBlob(c,'image/png')})]);toast(t('copied'))}catch{toast(t('copyFail'))}}
async function delCurrent(i){const pos=i==null?S.idx:i,e=S.list[pos];if(!e||!await ask(t('delT'),t('delP'),t('delYes')))return;const inView=S.view=='view';
 try{await inv('delete_file',{path:e.path});S.all=S.all.filter(x=>x.path!=e.path);toast(t('deleted'));
  if(inView){const keep=S.list[pos+1]||S.list[pos-1];applyFilter(keep&&keep.path);if(S.idx>=0)openIdx(S.idx);else show('gal')}
  else{S.idx=-1;applyFilter()}}catch{toast(t('delFail'))}}
function printCurrent(){const e=S.list[S.idx];if(!e)return;const p=$('#printimg');p.onload=()=>{try{window.print()}catch{}};p.src=asset(e.path)}
/* ---------- editor ---------- */
const E0=()=>({rot:0,fh:false,fv:false,angle:0,crop:{x:0,y:0,w:1,h:1},aspect:'free',b:0,c:0,s:0,w:0,sh:0,vg:0,bl:0,gray:0,sepia:0,filter:'orig',ink:[],items:[]});
const ED={src:null,work:null,E:E0(),tab:'crop',stack:[],redo:[],ink:{tool:'pen',color:'#ef4444',size:6,smooth:40},cmp:false,path:'',fmt:'png',q:.92,scale:1,dirty:false,stroke:null,sel:-1,snapPrev:null,free:[],last:null};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
function sharpen(c,w,h,amt){if(amt<=0||w<3||h<3)return;const id=c.getImageData(0,0,w,h),s=id.data,o=new Uint8ClampedArray(s.length);o.set(s);const k=amt/100*1.1;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let ch=0;ch<3;ch++)o[i+ch]=(1+4*k)*s[i+ch]-k*(s[i-4+ch]+s[i+4+ch]+s[i-w*4+ch]+s[i+w*4+ch])}id.data.set(o);c.putImageData(id,0,0)}
const tcache=new WeakMap();function transformed(src,E){const key=E.rot+'|'+E.fh+'|'+E.fv+'|'+E.angle,c=tcache.get(src);if(c&&c.key==key)return c.t;const t=transformedRaw(src,E);tcache.set(src,{key,t});return t}
function transformedRaw(src,E){const sw=src.width||src.naturalWidth,sh=src.height||src.naturalHeight,swap=E.rot%180!=0,tw=swap?sh:sw,th=swap?sw:sh,a=E.angle*Math.PI/180,t=mk(tw,th),c=t.getContext('2d');
 const cover=a?Math.cos(Math.abs(a))+Math.sin(Math.abs(a))*Math.max(tw/th,th/tw):1;
 c.translate(tw/2,th/2);c.rotate(E.rot*Math.PI/180+a);c.scale((E.fh?-1:1)*cover,(E.fv?-1:1)*cover);c.drawImage(src,-sw/2,-sh/2);return t}
/* arrow stamps: [svg path in a 100x100 box, filled?] */
const SHAPES={arrow:['M8 50H80M58 26L88 50L58 74',0],block:['M6 38H54V18L94 50L54 82V62H6Z',1],curve:['M12 82Q16 26 72 30M52 8L76 30L54 50',0],double:['M8 50H92M28 30L8 50L28 70M72 30L92 50L72 70',0],
 diag:['M16 84L82 18M44 16H84V56',0],uturn:['M22 88V46Q22 20 48 20H76M56 2L78 20L56 38',0],pointer:['M12 14L90 50L12 86L34 50Z',1],wave:['M8 64Q28 24 50 54T88 38M68 18L90 38L66 54',0]};
function runPath(c,d){const tk=d.match(/[MLHVQTZ]|-?\d+\.?\d*/g);let i=0,x=0,y=0,qx=0,qy=0,cmd='';const n=()=>+tk[i++];c.beginPath();
 while(i<tk.length){if(/[A-Z]/.test(tk[i]))cmd=tk[i++];
  if(cmd=='M'){x=n();y=n();c.moveTo(x,y);cmd='L'}else if(cmd=='L'){x=n();y=n();c.lineTo(x,y)}else if(cmd=='H'){x=n();c.lineTo(x,y)}else if(cmd=='V'){y=n();c.lineTo(x,y)}
  else if(cmd=='Q'){qx=n();qy=n();x=n();y=n();c.quadraticCurveTo(qx,qy,x,y)}else if(cmd=='T'){qx=2*x-qx;qy=2*y-qy;x=n();y=n();c.quadraticCurveTo(qx,qy,x,y)}else if(cmd=='Z'){c.closePath();cmd=''}else break}}
function drawStroke(c,st,cw,ch){c.save();c.lineCap=c.lineJoin='round';c.strokeStyle=c.fillStyle=st.c;c.globalAlpha=st.hl?.38:1;const lw=st.w*cw,P=st.p,k=st.k||'pen';c.lineWidth=lw;
 if(k=='rect'||k=='oval'){const a=P[0],b=P[P.length-1],x=Math.min(a[0],b[0])*cw,y=Math.min(a[1],b[1])*ch,w=Math.abs(a[0]-b[0])*cw,h=Math.abs(a[1]-b[1])*ch;c.beginPath();if(k=='rect')c.rect(x,y,w,h);else c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);c.stroke()}
 else if(k=='arrow'){const a=P[0],b=P[P.length-1],x0=a[0]*cw,y0=a[1]*ch,x1=b[0]*cw,y1=b[1]*ch,an=Math.atan2(y1-y0,x1-x0),hl=Math.max(lw*4,12);c.beginPath();c.moveTo(x0,y0);c.lineTo(x1-Math.cos(an)*hl*.6,y1-Math.sin(an)*hl*.6);c.stroke();
  c.beginPath();c.moveTo(x1,y1);c.lineTo(x1-hl*Math.cos(an-.5),y1-hl*Math.sin(an-.5));c.lineTo(x1-hl*Math.cos(an+.5),y1-hl*Math.sin(an+.5));c.closePath();c.fill()}
 else{c.beginPath();P.forEach(([x,y],i)=>i?c.lineTo(x*cw,y*ch):c.moveTo(x*cw,y*ch));if(P.length==1)c.lineTo(P[0][0]*cw+.01,P[0][1]*ch);c.stroke()}c.restore()}
function drawItem(c,it,cw,ch){const s=it.s*cw;c.save();c.translate(it.x*cw,it.y*ch);c.rotate(it.r*Math.PI/180);
 if(it.k=='emoji'){c.font=`${s*.82}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(it.g,0,s*.04)}
 else{const sp=SHAPES[it.g];if(sp){c.scale(s/100,s/100);c.translate(-50,-50);c.strokeStyle=c.fillStyle=it.c;c.lineCap=c.lineJoin='round';c.lineWidth=9;runPath(c,sp[0]);sp[1]?c.fill():c.stroke()}}c.restore()}
function renderEdit(src,E,o={}){const T0=transformed(src,E),cr=o.nocrop?{x:0,y:0,w:1,h:1}:E.crop,cx=Math.round(cr.x*T0.width),cy=Math.round(cr.y*T0.height),cw=Math.max(1,Math.round(cr.w*T0.width)),ch=Math.max(1,Math.round(cr.h*T0.height)),out=mk(cw,ch),c=out.getContext('2d');
 c.filter=`brightness(${1+E.b/100}) contrast(${1+E.c/100}) saturate(${1+E.s/100})${E.gray?` grayscale(${E.gray})`:''}${E.sepia?` sepia(${E.sepia})`:''}${E.bl?` blur(${E.bl*cw/1400}px)`:''}`;
 c.drawImage(T0,cx,cy,cw,ch,0,0,cw,ch);c.filter='none';
 if(E.w){c.save();c.globalCompositeOperation='soft-light';c.fillStyle=E.w>0?`rgba(255,150,40,${E.w/100*.55})`:`rgba(40,120,255,${-E.w/100*.55})`;c.fillRect(0,0,cw,ch);c.restore()}
 if(E.sh)sharpen(c,cw,ch,E.sh);
 if(E.vg){const g=c.createRadialGradient(cw/2,ch/2,Math.min(cw,ch)*.25,cw/2,ch/2,Math.hypot(cw,ch)/2);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${E.vg/100*.75})`);c.fillStyle=g;c.fillRect(0,0,cw,ch)}
 if(o.ink!==false&&!o.nocrop){for(const st of E.ink)drawStroke(c,st,cw,ch);for(const it of E.items||[])drawItem(c,it,cw,ch)}
 return out}
const snapE=()=>JSON.stringify(ED.E);
function commit(){ED.stack.push(ED.snapPrev||snapE());ED.snapPrev=null;if(ED.stack.length>60)ED.stack.shift();ED.redo=[];ED.dirty=true;eBtns()}
function beginChange(){if(!ED.snapPrev)ED.snapPrev=snapE()}
function eUndo(){if(!ED.stack.length)return;ED.redo.push(snapE());ED.E=JSON.parse(ED.stack.pop());if(ED.sel>=ED.E.items.length)ED.sel=-1;eBtns();eSync();redrawEd()}
function eRedo(){if(!ED.redo.length)return;ED.stack.push(snapE());ED.E=JSON.parse(ED.redo.pop());if(ED.sel>=ED.E.items.length)ED.sel=-1;eBtns();eSync();redrawEd()}
function eBtns(){$('#eUndo').disabled=!ED.stack.length;$('#eRedo').disabled=!ED.redo.length}
async function startEdit(preRot){const e=S.list[S.idx];if(!e)return;busy(true);try{ED.src=await loadFull(e.path)}catch{busy(false);return toast(t('readFail'))}busy(false);
 const sw=ED.src.naturalWidth,sh=ED.src.naturalHeight,k=Math.min(1,1800/Math.max(sw,sh));ED.work=mk(sw*k,sh*k);ED.work.getContext('2d').drawImage(ED.src,0,0,ED.work.width,ED.work.height);
 ED.E=E0();ED.E.rot=preRot||0;ED.stack=[];ED.redo=[];ED.dirty=!!preRot;ED.sel=-1;ED.path=e.path;ED.tab='crop';const ext=e.name.split('.').pop().toLowerCase();ED.fmt=/^(jpg|jpeg|jfif)$/.test(ext)?'jpeg':ext=='webp'?'webp':'png';ED.scale=1;
 show('edit');buildEdit();eBtns();requestAnimationFrame(redrawEd)}
async function leaveEdit(){if(ED.dirty&&!await ask(t('discT'),t('discP'),t('discYes')))return;ED.src=ED.work=null;ED.dirty=false;S.idx>=0?show('view'):show('gal')}
let eraf;const redrawEd=()=>{cancelAnimationFrame(eraf);eraf=requestAnimationFrame(paintEd)};
function paintEd(){if(!ED.work)return;const E=ED.cmp?E0():ED.E,crop=ED.tab=='crop',o=renderEdit(ED.work,E,{nocrop:crop}),cv=$('#ecv'),st=$('#estage').getBoundingClientRect(),
 fit=Math.min(Math.max(80,st.width-48)/o.width,Math.max(80,st.height-48)/o.height,2);
 cv.width=o.width;cv.height=o.height;cv.style.width=Math.round(o.width*fit)+'px';cv.style.height=Math.round(o.height*fit)+'px';cv.getContext('2d').drawImage(o,0,0);
 cv.className=ED.tab=='draw'?'pen':ED.tab=='stick'?'sel':'';placeBox();placeSbox()}
function placeBox(){const b=$('#cbox'),on=ED.tab=='crop'&&!ED.cmp;b.hidden=!on;if(!on)return;const cv=$('#ecv').getBoundingClientRect(),st=$('#estage').getBoundingClientRect(),c=ED.E.crop;
 b.style.left=cv.left-st.left+c.x*cv.width+'px';b.style.top=cv.top-st.top+c.y*cv.height+'px';b.style.width=c.w*cv.width+'px';b.style.height=c.h*cv.height+'px'}
function placeSbox(){const b=$('#sbox'),it=ED.E.items[ED.sel];b.hidden=!(ED.tab=='stick'&&it&&!ED.cmp);if(b.hidden)return;const cv=$('#ecv').getBoundingClientRect(),st=$('#estage').getBoundingClientRect(),a=it.s*cv.width;
 b.style.left=cv.left-st.left+it.x*cv.width+'px';b.style.top=cv.top-st.top+it.y*cv.height+'px';b.style.width=a+'px';b.style.height=a+'px';b.style.transform=`translate(-50%,-50%) rotate(${it.r}deg)`}
function tdims(){const w=ED.work,swap=ED.E.rot%180!=0;return swap?[w.height,w.width]:[w.width,w.height]}
function aspVal(a){if(a=='free')return 0;const [tw,th]=tdims();if(a=='orig')return tw/th;const [x,y]=a.split(':');return x/y}
function setAspect(a){ED.E.aspect=a;const asp=aspVal(a);if(asp){const [tw,th]=tdims();let w,h;if(tw/th>asp){h=1;w=asp*th/tw}else{w=1;h=tw/asp/th}ED.E.crop={x:(1-w)/2,y:(1-h)/2,w,h}}}
/* crop box: move and resize (handles are named hd, never shadowed) */
$('#cbox').addEventListener('pointerdown',e=>{if(ED.tab!='crop')return;e.preventDefault();const hd=e.target.dataset.h||'move',cv=$('#ecv').getBoundingClientRect(),c0={...ED.E.crop},sx=e.clientX,sy=e.clientY,[tw,th]=tdims(),asp=aspVal(ED.E.aspect),MIN=.04,box=$('#cbox');
 beginChange();try{box.setPointerCapture(e.pointerId)}catch{}
 const mv=ev=>{const dx=(ev.clientX-sx)/cv.width,dy=(ev.clientY-sy)/cv.height;let nc;
  if(hd=='move')nc={x:clamp(c0.x+dx,0,1-c0.w),y:clamp(c0.y+dy,0,1-c0.h),w:c0.w,h:c0.h};
  else{let L=c0.x,T=c0.y,R=c0.x+c0.w,B=c0.y+c0.h;const hw=hd.includes('w'),he=hd.includes('e'),hn=hd.includes('n'),hs=hd.includes('s');
   if(hw)L=clamp(L+dx,0,R-MIN);if(he)R=clamp(R+dx,L+MIN,1);if(hn)T=clamp(T+dy,0,B-MIN);if(hs)B=clamp(B+dy,T+MIN,1);
   if(asp){let w1=R-L,h1=B-T;const cx=(L+R)/2,cy=(T+B)/2;
    if(hd=='n'||hd=='s')w1=h1*th*asp/tw;else h1=w1*tw/asp/th;
    const ax=hw?R:he?L:cx,ay=hn?B:hs?T:cy,mW=hw?R:he?1-L:2*Math.min(cx,1-cx),mH=hn?B:hs?1-T:2*Math.min(cy,1-cy),f=Math.min(1,mW/w1,mH/h1);w1*=f;h1*=f;
    L=hw?ax-w1:he?ax:ax-w1/2;R=L+w1;T=hn?ay-h1:hs?ay:ay-h1/2;B=T+h1}
   nc={x:clamp(L,0,1),y:clamp(T,0,1),w:clamp(R-L,MIN,1),h:clamp(B-T,MIN,1)}}
  ED.E.crop=nc;placeBox()};
 const up=()=>{box.removeEventListener('pointermove',mv);box.removeEventListener('pointerup',up);commit();eSync();redrawEd()};box.addEventListener('pointermove',mv);box.addEventListener('pointerup',up)});
/* drawing: pen, highlighter, line, arrow, rectangle, ellipse. Shift gives straight strokes. */
const npt=e=>{const r=$('#ecv').getBoundingClientRect();return [clamp((e.clientX-r.left)/r.width,0,1),clamp((e.clientY-r.top)/r.height,0,1)]};
function snapEnd(p0,p,k,shift){const r=$('#ecv').getBoundingClientRect(),W=r.width,H=r.height;let dx=(p[0]-p0[0])*W,dy=(p[1]-p0[1])*H;
 if(k=='rect'||k=='oval'){if(shift){const m=Math.max(Math.abs(dx),Math.abs(dy));dx=(dx<0?-1:1)*m;dy=(dy<0?-1:1)*m}}
 else{const len=Math.hypot(dx,dy);let a=Math.atan2(dy,dx);const sn=Math.round(a/(Math.PI/4))*(Math.PI/4);if(k=='pen'){if(Math.abs(a-sn)<.1)a=sn}else if(shift)a=sn;dx=Math.cos(a)*len;dy=Math.sin(a)*len}
 return [clamp(p0[0]+dx/W,0,1),clamp(p0[1]+dy/H,0,1)]}
function itemAt(fx,fy){const cv=$('#ecv').getBoundingClientRect(),its=ED.E.items;for(let i=its.length-1;i>=0;i--){const it=its[i],dx=(fx-it.x)*cv.width,dy=(fy-it.y)*cv.height,a=-it.r*Math.PI/180,rx=dx*Math.cos(a)-dy*Math.sin(a),ry=dx*Math.sin(a)+dy*Math.cos(a),hf=it.s*cv.width/2;if(Math.abs(rx)<=hf&&Math.abs(ry)<=hf)return i}return -1}
function startDrag(e,mode){const it=ED.E.items[ED.sel];if(!it)return;const cv=$('#ecv').getBoundingClientRect(),sx=e.clientX,sy=e.clientY,x0=it.x,y0=it.y,tgt=e.currentTarget||e.target;beginChange();try{tgt.setPointerCapture(e.pointerId)}catch{}
 const mv=ev=>{if(mode=='move'){it.x=clamp(x0+(ev.clientX-sx)/cv.width,0,1);it.y=clamp(y0+(ev.clientY-sy)/cv.height,0,1)}
  else{const cx=cv.left+it.x*cv.width,cy=cv.top+it.y*cv.height,dx=ev.clientX-cx,dy=ev.clientY-cy;if(mode=='se')it.s=clamp(Math.hypot(dx,dy)*Math.SQRT2/cv.width,.02,1.2);else{let a=Math.atan2(dy,dx)*180/Math.PI+90;if(ev.shiftKey)a=Math.round(a/15)*15;it.r=Math.round(((a+540)%360)-180)}}
  placeSbox();eSync();redrawEd()};
 const up=()=>{tgt.removeEventListener('pointermove',mv);tgt.removeEventListener('pointerup',up);commit();redrawEd()};tgt.addEventListener('pointermove',mv);tgt.addEventListener('pointerup',up)}
$('#sbox').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();startDrag(e,e.target.dataset.h||'move')});
$('#ecv').addEventListener('pointerdown',e=>{if(ED.cmp)return;const p=npt(e);
 if(ED.tab=='stick'){const i=itemAt(p[0],p[1]);ED.sel=i;eSync();placeSbox();if(i>=0){e.preventDefault();startDrag(e,'move')}redrawEd();return}
 if(ED.tab!='draw')return;const k=ED.ink.tool,hl=k=='hl',r=$('#ecv').getBoundingClientRect();
 ED.stroke={k:hl?'pen':k,c:ED.ink.color,hl,w:(hl?ED.ink.size*2.2:ED.ink.size)/r.width,p:[p]};ED.free=[p];ED.last=p;beginChange();ED.E.ink.push(ED.stroke);try{$('#ecv').setPointerCapture(e.pointerId)}catch{}redrawEd()});
$('#ecv').addEventListener('pointermove',e=>{const st=ED.stroke;if(!st)return;const raw=npt(e),k=st.k;
 if(k=='pen'){if(e.shiftKey)st.p=[ED.free[0],snapEnd(ED.free[0],raw,'pen',true)];else{const sm=ED.ink.smooth/100*.85,q=[ED.last[0]+(raw[0]-ED.last[0])*(1-sm),ED.last[1]+(raw[1]-ED.last[1])*(1-sm)];ED.last=q;ED.free.push(q);st.p=ED.free.slice()}}
 else st.p=[st.p[0],snapEnd(st.p[0],raw,k,e.shiftKey)];redrawEd()});
$('#ecv').addEventListener('pointerup',()=>{const st=ED.stroke;if(!st)return;ED.stroke=null;const r=$('#ecv').getBoundingClientRect(),a=st.p[0],b=st.p[st.p.length-1];
 if(st.k!='pen'&&Math.hypot((b[0]-a[0])*r.width,(b[1]-a[1])*r.height)<4){ED.E.ink.pop();ED.snapPrev=null}else commit();redrawEd()});
function addItem(it){beginChange();ED.E.items.push(it);ED.sel=ED.E.items.length-1;commit();eSync();redrawEd()}
function delItem(){if(ED.sel<0)return;beginChange();ED.E.items.splice(ED.sel,1);ED.sel=-1;commit();eSync();redrawEd()}
function dupItem(){const it=ED.E.items[ED.sel];if(it)addItem({...it,x:clamp(it.x+.04,0,1),y:clamp(it.y+.04,0,1)})}
function editKey(e){const K=e.key.toLowerCase(),tg=e.target;if(e.ctrlKey&&K=='z'){e.preventDefault();eUndo();return}if(e.ctrlKey&&K=='y'){e.preventDefault();eRedo();return}
 const it=ED.E.items[ED.sel],inField=tg.tagName=='INPUT'||tg.tagName=='SELECT';
 if(ED.tab=='stick'&&it&&!inField){const st=e.shiftKey?.02:.005;if(e.key=='Delete'||e.key=='Backspace'){e.preventDefault();delItem();return}if(e.ctrlKey&&K=='d'){e.preventDefault();dupItem();return}
  const mv={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];if(mv){e.preventDefault();beginChange();it.x=clamp(it.x+mv[0],0,1);it.y=clamp(it.y+mv[1],0,1);commit();placeSbox();redrawEd();return}}
 if(e.key=='Escape'&&!inField)leaveEdit()}
/* panel */
const RNG=(k,mn,mx,l)=>`<div class="fld"><div class="fl"><span>${esc(t(l))}</span><output data-o="${k}"></output></div><input type="range" data-e="${k}" min="${mn}" max="${mx}" step="1"></div>`;
const SG=(a,o)=>`<div class="seg" data-sg="${a}">${o.map(([v,l])=>`<button data-v="${v}">${CK}${esc(l.startsWith('~')?l.slice(1):t(l))}</button>`).join('')}</div>`;
const FILTERS=[['orig','fOrig',{}],['vivid','fVivid',{c:12,s:35,b:3,sh:20}],['warm','fWarm',{w:40,s:10,b:3}],['cool','fCool',{w:-40,s:5,c:5}],['mono','fMono',{gray:1,c:10}],['noir','fNoir',{gray:1,c:35,b:-8,vg:35}],['sepia','fSepia',{sepia:1,c:5}],['fade','fFade',{c:-18,b:8,s:-20}],['drama','fDrama',{c:30,s:-10,b:-5,vg:45,sh:30}]];
const INKC=['#ef4444','#f59e0b','#facc15','#22c55e','#3b82f6','#a855f7','#ffffff','#111111'];
const TOOLS=[['pen','tPen'],['hl','tHlr'],['line','tLine'],['arrow','tArrow'],['rect','tRect'],['oval','tOval']];
const EMOJI=['😀','😂','😍','😎','🤔','😢','😡','😮','🥳','🙌','👍','👎','👏','🙏','💪','👀','👉','👈','👆','👇','✅','❌','⚠️','❓','❗','💯','❤️','🔥','⭐','✨','💡','🎉','🚀','📌','📎','🔒','🔑','🏆','🎯','🔴','🟢','🔵','➡️','⬅️','⬆️','⬇️','↗️','↘️','🆕','🆗','🛑','💬','📷','🔍','⚡','☀️','🌙','🎁','📝','📍','🧠'];
const colorRow=()=>`<div><div class="gl">${esc(t('color'))}</div><div class="swr" style="gap:6px">${INKC.map(c=>`<button class="swc inkc" data-c="${c}" style="background:${c};box-shadow:inset 0 0 0 1px rgba(128,128,128,.5)">${ico('check')}</button>`).join('')}</div></div>`;
function buildEdit(){const TABS=[['crop','crop','sCrop'],['adj','tune','sAdj'],['filters','magic','sFil'],['draw','brush','sDraw'],['stick','mood','sStick']];
 const body={crop:`<div><div class="gl">${esc(t('aspect'))}</div><div class="cg" id="asp">${[['free',t('free')],['orig',t('orig')],['1:1','1:1'],['4:3','4:3'],['3:2','3:2'],['16:9','16:9'],['9:16','9:16']].map(([v,l])=>`<button class="chip sl" data-a="${v}">${esc(l)}</button>`).join('')}</div></div>
  <div class="fld"><div class="fl"><span>${esc(t('straighten'))}</span><output data-o="angle"></output></div><input type="range" data-e="angle" min="-45" max="45" step="1"></div>
  <div><div class="gl">${esc(t('rotate'))}</div><div class="cg"><button class="ib sl" data-x="rl" title="${esc(t('rotL'))}">${ico('rl')}</button><button class="ib sl" data-x="rr" title="${esc(t('rotR'))}">${ico('rr')}</button><button class="ib sl" data-x="fh" title="${esc(t('flipH'))}" aria-label="${esc(t('flipH'))}">${ico('flip')}</button><button class="ib sl" data-x="fv" title="${esc(t('flipV'))}" aria-label="${esc(t('flipV'))}">${ico('flipv')}</button></div></div>`,
  adj:RNG('b',-100,100,'bright')+RNG('c',-100,100,'contrast')+RNG('s',-100,100,'sat')+RNG('w',-100,100,'warm')+RNG('sh',0,100,'sharp')+RNG('vg',0,100,'vig')+RNG('bl',0,20,'blur')+`<button class="btn text sl" data-x="resetadj">${esc(t('resetAdj'))}</button>`,
  filters:`<div class="fgrid" id="fgrid">${FILTERS.map(([id,l])=>`<button class="fc sl" data-f="${id}"><img alt=""><span>${esc(t(l))}</span></button>`).join('')}</div>`,
  draw:`<div class="cg" id="tools">${TOOLS.map(([v,l])=>`<button class="chip sl" data-tool="${v}">${esc(t(l))}</button>`).join('')}</div>${colorRow()}
  <div class="fld"><div class="fl"><span>${esc(t('size'))}</span><output data-o="size"></output></div><input type="range" data-i2="size" min="2" max="40" step="1"></div>
  <div class="fld"><div class="fl"><span>${esc(t('smooth'))}</span><output data-o="smooth"></output></div><input type="range" data-i2="smooth" min="0" max="100" step="1"></div><div class="hint">${esc(t('shiftHint'))}</div>
  <div class="cg"><button class="btn tonal sl" data-x="ustroke">${esc(t('undoStroke'))}</button><button class="btn text sl" data-x="cink">${esc(t('clearInk'))}</button></div>`,
  stick:`<div class="hint">${esc(t('stickHint'))}</div>${colorRow()}<div><div class="gl">${esc(t('arrows'))}</div><div class="stg">${Object.entries(SHAPES).map(([k,[d,f]])=>`<button class="stb sl" data-shape="${k}"><svg viewBox="0 0 100 100"><path d="${d}" fill="${f?'currentColor':'none'}" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`).join('')}</div></div>
  <div><div class="gl">${esc(t('emoji'))}</div><div class="emo">${EMOJI.map(g=>`<button class="emb" data-emoji="${g}">${g}</button>`).join('')}</div></div>
  <div id="selp" hidden><div class="gl">${esc(t('selected'))}</div><div class="fld"><div class="fl"><span>${esc(t('itemSize'))}</span><output data-o="isz"></output></div><input type="range" data-i3="s" min="2" max="90" step="1"></div>
  <div class="fld"><div class="fl"><span>${esc(t('itemRot'))}</span><output data-o="irot"></output></div><input type="range" data-i3="r" min="-180" max="180" step="1"></div>
  <div class="cg" style="margin-top:12px"><button class="btn tonal sl" data-x="dup">${esc(t('dup'))}</button><button class="btn text sl" data-x="front">${esc(t('front'))}</button><button class="btn text sl" data-x="delitem">${esc(t('remove'))}</button></div></div>`};
 $('#epanel').innerHTML=`<div class="etabs">${TABS.map(([id,ic,l])=>`<button class="etab sl" data-tab="${id}">${ico(ic)}<span>${esc(t(l))}</span></button>`).join('')}</div><div class="ebody" id="ebody">${body[ED.tab]}</div>
 <div class="efoot"><details class="xo"><summary><span>${esc(t('exportOpt'))}</span><output id="xsum"></output></summary><div class="gl" style="margin:0">${esc(t('fmt'))}</div>${SG('fmt',[['png','~PNG'],['jpeg','~JPEG'],['webp','~WebP']])}<div id="qwrap" class="fld"><div class="fl"><span>${esc(t('quality'))}</span><output data-o="q"></output></div><input type="range" data-i2="q" min="50" max="100" step="1"></div>
 <div class="fld"><div class="fl"><span>${esc(t('outSize'))}</span><output id="osz"></output></div>${SG('scale',[[1,'~100%'],[0.75,'~75%'],[0.5,'~50%'],[0.25,'~25%']])}</div></details>
 <div class="row2"><button class="btn tonal sl" id="eSaveCopy">${esc(t('saveCopy'))}</button><button class="btn filled sl" id="eSave">${esc(t('save'))}</button></div><div class="row2"><button class="btn text sl" id="eResetAll">${esc(t('resetAll'))}</button><button class="btn text sl" id="eCancel">${esc(t('cancel'))}</button></div></div>`;eSync();if(ED.tab=='filters')fillThumbs()}
function fillThumbs(){const k=Math.min(1,160/Math.max(ED.work.width,ED.work.height)),mini=mk(ED.work.width*k,ED.work.height*k);mini.getContext('2d').drawImage(ED.work,0,0,mini.width,mini.height);
 $$('#fgrid .fc').forEach(b=>{const f=FILTERS.find(x=>x[0]==b.dataset.f),E={...E0(),...f[2]},o=renderEdit(mini,E,{nocrop:true});b.querySelector('img').src=o.toDataURL('image/jpeg',.7)})}
function eSync(){const xs=$('#xsum');if(xs)xs.textContent=ED.fmt.toUpperCase()+'  ·  '+Math.round(ED.scale*100)+'%';const E=ED.E,pv=r=>r.style.setProperty('--p',((r.value-r.min)/(r.max-r.min)*100)+'%');
 $$('#epanel [data-e]').forEach(r=>{r.value=E[r.dataset.e];pv(r)});
 $$('#epanel [data-i2]').forEach(r=>{const k=r.dataset.i2,v=k=='q'?Math.round(ED.q*100):ED.ink[k];r.value=v;pv(r)});
 $$('#epanel [data-o]').forEach(o=>{const k=o.dataset.o;if(k=='isz'||k=='irot')return;o.textContent=k=='angle'?E.angle+'°':k=='q'?Math.round(ED.q*100)+'%':k=='size'?ED.ink.size:k=='smooth'?ED.ink.smooth+'%':E[k]});
 $$('#epanel .etab').forEach(b=>b.classList.toggle('on',b.dataset.tab==ED.tab));$$('#asp .chip').forEach(b=>b.classList.toggle('on',b.dataset.a==E.aspect));$$('#fgrid .fc').forEach(b=>b.classList.toggle('on',b.dataset.f==E.filter));
 $$('#tools .chip').forEach(b=>b.classList.toggle('on',b.dataset.tool==ED.ink.tool));
 $$('#epanel [data-sg]').forEach(s=>{const k=s.dataset.sg,cur=k=='fmt'?ED.fmt:ED.scale;$$('button',s).forEach(b=>b.classList.toggle('on',String(b.dataset.v)==String(cur)))});
 $$('#epanel .inkc').forEach(b=>b.classList.toggle('on',b.dataset.c==ED.ink.color));const qw=$('#qwrap');if(qw)qw.hidden=ED.fmt=='png';
 const it=E.items[ED.sel],sp=$('#selp');if(sp){sp.hidden=!it;if(it){const r1=$('#epanel [data-i3=s]'),r2=$('#epanel [data-i3=r]');r1.value=Math.round(it.s*100);r2.value=it.r;pv(r1);pv(r2);$('#epanel [data-o=isz]').textContent=Math.round(it.s*100)+'%';$('#epanel [data-o=irot]').textContent=it.r+'°'}}
 const [tw,th]=ED.src?[ED.src.naturalWidth,ED.src.naturalHeight]:[0,0],sw=E.rot%180?th:tw,sh=E.rot%180?tw:th,os=$('#osz');if(os)os.textContent=`${Math.round(sw*E.crop.w*ED.scale)} × ${Math.round(sh*E.crop.h*ED.scale)} px`;
 const cur=S.list[S.idx],ex=cur?cur.name.split('.').pop().toLowerCase():'',ov=/^(png|jpg|jpeg|jfif|webp)$/.test(ex),es=$('#eSave');if(es){es.disabled=!ov;es.title=ov?'':t('saveOnlyCopy')}}
$('#epanel').addEventListener('input',e=>{const el=e.target;
 if(el.dataset.e){beginChange();ED.E[el.dataset.e]=+el.value;if(['b','c','s','w','sh','vg','bl'].includes(el.dataset.e))ED.E.filter='custom';eSync();redrawEd()}
 else if(el.dataset.i3){const it=ED.E.items[ED.sel];if(!it)return;beginChange();if(el.dataset.i3=='s')it.s=+el.value/100;else it.r=+el.value;eSync();placeSbox();redrawEd()}
 else if(el.dataset.i2){const k=el.dataset.i2;if(k=='q')ED.q=+el.value/100;else ED.ink[k]=+el.value;eSync()}});
$('#epanel').addEventListener('change',e=>{if((e.target.dataset.e||e.target.dataset.i3)&&ED.snapPrev)commit()});
$('#epanel').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const E=ED.E;
 if(b.dataset.tab){ED.tab=b.dataset.tab;buildEdit();redrawEd();return}
 if(b.parentElement.dataset.sg){const k=b.parentElement.dataset.sg,v=b.dataset.v;if(k=='fmt')ED.fmt=v;else ED.scale=+v;eSync();return}
 if(b.dataset.tool){ED.ink.tool=b.dataset.tool;eSync();return}
 if(b.dataset.a){beginChange();setAspect(b.dataset.a);commit();eSync();redrawEd();return}
 if(b.dataset.c){ED.ink.color=b.dataset.c;const it=E.items[ED.sel];if(ED.tab=='stick'&&it&&it.k=='shape'){beginChange();it.c=b.dataset.c;commit();redrawEd()}eSync();return}
 if(b.dataset.shape){addItem({k:'shape',g:b.dataset.shape,x:.5,y:.5,s:.2,r:0,c:ED.ink.color});return}
 if(b.dataset.emoji){addItem({k:'emoji',g:b.dataset.emoji,x:.5,y:.5,s:.16,r:0});return}
 if(b.dataset.f){beginChange();const f=FILTERS.find(x=>x[0]==b.dataset.f);Object.assign(E,{b:0,c:0,s:0,w:0,sh:0,vg:0,bl:0,gray:0,sepia:0},f[2],{filter:f[0]});commit();eSync();redrawEd();return}
 const x=b.dataset.x;if(x){
  if(x=='dup'){dupItem();return}if(x=='delitem'){delItem();return}if(x=='front'){const it=E.items[ED.sel];if(it){beginChange();E.items.push(E.items.splice(ED.sel,1)[0]);ED.sel=E.items.length-1;commit();eSync();redrawEd()}return}
  beginChange();
  if(x=='rl'||x=='rr'){E.rot=(E.rot+(x=='rr'?90:270))%360;E.crop={x:0,y:0,w:1,h:1};E.aspect='free'}else if(x=='fh')E.fh=!E.fh;else if(x=='fv')E.fv=!E.fv;
  else if(x=='resetadj')Object.assign(E,{b:0,c:0,s:0,w:0,sh:0,vg:0,bl:0,gray:0,sepia:0,filter:'orig'});else if(x=='ustroke'){if(!E.ink.length){ED.snapPrev=null;return}E.ink.pop()}else if(x=='cink'){if(!E.ink.length){ED.snapPrev=null;return}E.ink=[]}
  commit();eSync();redrawEd();return}
 if(b.id=='eSave')saveEdit(false);else if(b.id=='eSaveCopy')saveEdit(true);else if(b.id=='eResetAll'){beginChange();ED.E=E0();ED.sel=-1;commit();eSync();redrawEd()}else if(b.id=='eCancel')leaveEdit()});
const MIME={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'},EXT={png:'png',jpeg:'jpg',webp:'webp'};
const extFmt=n=>{const x=n.split('.').pop().toLowerCase();return /^(jpg|jpeg|jfif)$/.test(x)?'jpeg':x=='webp'?'webp':'png'};
const b64=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(String(f.result).split(',')[1]);f.readAsDataURL(b)});
async function saveEdit(copy){const e=S.list[S.idx];if(!e)return;if(!copy&&!await ask(t('ovT'),t('ovP'),t('ovYes')))return;busy(true);
 try{const fmt=copy?ED.fmt:extFmt(e.name);let o=renderEdit(ED.src,ED.E);if(ED.scale<1){const s=mk(o.width*ED.scale,o.height*ED.scale),c=s.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(o,0,0,s.width,s.height);o=s}
  if(fmt=='jpeg'){const f=mk(o.width,o.height),c=f.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,f.width,f.height);c.drawImage(o,0,0);o=f}
  const data=await b64(await toBlob(o,MIME[fmt],ED.q));
  if(!copy){await inv('write_image',{path:e.path,data});await refreshEntry(e);toast(t('saved'));ED.dirty=false;busy(false);openIdx(S.idx);return}
  const stem=e.name.replace(/\.[^.]+$/,''),p=await inv('save_image',{name:`${stem}-edited.${EXT[fmt]}`,data,dir:S.dir});if(p){toast(t('saved'));ED.dirty=false;await refreshEntry(e)}}
 catch{toast(t('saveFail'))}busy(false)}
async function refreshEntry(e,pick){pick=pick||e.path;try{const o=await inv(S.mode=='library'?'library':'open_target',S.mode=='library'?undefined:{path:S.dir});S.all=o.entries;applyFilter(pick||e.path)}catch{}}

/* ---------- settings, events ---------- */
const mark=(b,on)=>{b.classList.toggle('on',on);b.setAttribute('aria-checked',on)};
const seg=(a,items,cur,cls='')=>`<div class="seg ${cls}" role="radiogroup">${items.map(([v,n,i])=>`<button type="button" role="radio" aria-checked="${v==cur}" ${a}="${v}" class="${v==cur?'on':''}">${i?ico(i):CK}<span>${esc(n)}</span></button>`).join('')}</div>`;
const colorName=h=>{const c=COLORS.find(x=>x[0].toLowerCase()==h.toLowerCase());return c?c[lang=='vi'?1:2]:t('customColor')};
function setBody(){const box=$('#setBody'),sc=box.scrollTop,cu=!COLORS.some(c=>c[0].toLowerCase()==seed.toLowerCase());
 const row=(ti,su,ctl,cls='')=>`<div class="sr ${cls}"><div class="st"><b>${esc(t(ti))}</b>${su?`<small>${esc(t(su))}</small>`:''}</div>${ctl}</div>`;
 const sec=(k,i,ti,rows)=>`<section class="sc" style="--k:${k}"><h3>${ico(i)}<span>${esc(t(ti))}</span></h3><div class="cd">${rows}</div></section>`;
 const pal=`<div class="pal">${COLORS.map(([h,vn,en])=>`<button type="button" class="swc${h.toLowerCase()==seed.toLowerCase()?' on':''}" data-a="${h}" title="${lang=='vi'?vn:en} ${h}" aria-label="${lang=='vi'?vn:en}" style="background:${h};color:${lum(h)>.5?'#1b1b1b':'#fff'}">${ico('check')}</button>`).join('')}<button type="button" class="swc cu${cu?' on':''}" data-custom title="${esc(t('customColor'))}" aria-label="${esc(t('customColor'))}">${ico('check')}</button></div><div class="pal-i"><i></i><b id="palName"></b><span id="palHex"></span></div>`;
 const fonts=`<div class="fp">${FONTS.map(([id,n,st])=>`<button type="button" class="fb${id==fontId?' on':''}" data-fo="${id}" style="font-family:${st}">${ico('check')}<b>Aa</b><span>${esc(n||t('fontSys'))}</span></button>`).join('')}</div>`;
 box.innerHTML=
  sec(0,'palette','secLook',row('sMode','',seg('data-th',[['system',t('system'),'monitor'],['light',t('light'),'sun'],['dark',t('dark'),'moon']],theme),'col')+row('sColor','colorHint',pal,'col')+row('sFont','fontHint',fonts,'col'))
 +sec(1,'appwin','secGeneral',row('sLang','langHint',seg('data-lg',[['auto',t('langAuto'),'lang'],['vi','Tiếng Việt'],['en','English']],langPref),'col')+row('winT','winHint',seg('data-wm',[['remember',t('winRemember'),'appwin'],['maximized',t('winMax'),'fit']],winMode),'col')+row('autoScan','autoScanHint',`<input type="checkbox" class="sw" data-auto aria-label="${esc(t('autoScan'))}" ${ls('auto')!=='0'?'checked':''}>`))
 +sec(2,'slides','secSlide',row('sSlide','',seg('data-iv',[[2,'2 '+t('sec')],[4,'4 '+t('sec')],[8,'8 '+t('sec')]],interval,'sm')));
 box.scrollTop=sc;syncSet()}
/* updates the selected states in place, so the sheet never jumps or re-renders while clicking */
function syncSet(){$$('#setBody [data-th]').forEach(b=>mark(b,b.dataset.th==theme));$$('#setBody [data-lg]').forEach(b=>mark(b,b.dataset.lg==langPref));$$('#setBody [data-wm]').forEach(b=>mark(b,b.dataset.wm==winMode));$$('#setBody [data-iv]').forEach(b=>mark(b,+b.dataset.iv==interval));
 $$('#setBody [data-fo]').forEach(b=>b.classList.toggle('on',b.dataset.fo==fontId));const cu=!COLORS.some(c=>c[0].toLowerCase()==seed.toLowerCase());
 $$('#setBody .pal .swc').forEach(b=>b.classList.toggle('on',b.dataset.a?b.dataset.a.toLowerCase()==seed.toLowerCase():cu));
 const pn=$('#palName'),ph=$('#palHex'),pd=$('.pal-i i');if(pn){pn.textContent=colorName(seed);ph.textContent=seed.toUpperCase();pd.style.background=seed}}
function applyI18n(){document.documentElement.lang=lang;$$('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));$$('[data-t]').forEach(e=>{e.title=t(e.dataset.t);if(e.tagName=='BUTTON')e.setAttribute('aria-label',t(e.dataset.t));if(e.tagName=='INPUT'&&e.type=='text')e.placeholder=t(e.dataset.t)});$('#q').placeholder=t('search');
 renderGallery();titles();if(S.view=='edit'){buildEdit();redrawEd()}if($('#dSet').open){$('#dSet').classList.add('noanim');setBody()}}
$('#setBody').addEventListener('change',e=>{if('auto' in e.target.dataset)ls('auto',e.target.checked?'1':'0')});
$('#setBody').onclick=e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.th){theme=d.th;ls('theme',theme);paint()}
 else if(d.lg){langPref=d.lg;ls('lang',langPref);lang=langPref=='auto'?sysLang():langPref;applyI18n();return}
 else if(d.a){seed=d.a;ls('seed',seed);paint()}
 else if('custom' in d){$('#cc').value=seed.slice(0,7).toLowerCase();$('#cc').click();return}
 else if(d.fo){fontId=d.fo;ls('font',fontId);applyFont()}
 else if(d.wm){winMode=d.wm;if(TA)inv('set_window_mode',{mode:winMode}).catch(()=>{})}
 else if(d.iv){interval=+d.iv;ls('interval',interval);if(S.slide){toggleSlide();toggleSlide()}}
 else return;syncSet()};
$('#sReset').onclick=()=>{theme=DEF.theme;seed=DEF.seed;fontId=DEF.font;ls('theme',theme);ls('seed',seed);ls('font',fontId);paint();applyFont();syncSet()};
$('#cc').oninput=e=>{seed=e.target.value;ls('seed',seed);paint();syncSet()};
$('#bSet').onclick=()=>{const d=$('#dSet');d.classList.remove('noanim');setBody();d.showModal();document.activeElement&&document.activeElement.blur()};$('#bAbout').onclick=()=>{$('#dAbout').showModal();document.activeElement&&document.activeElement.blur()};$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
/* a click on the dimmed backdrop closes the sheet */
['#dSet','#dAbout'].forEach(s=>$(s).addEventListener('mousedown',e=>{if(e.target===e.currentTarget)e.currentTarget.close()}));
$$('.ri[data-nav]').forEach(b=>b.onclick=()=>{const v=b.dataset.nav;if(S.view==v)return;if(S.view=='edit'&&v!='edit'){leaveEdit().then(()=>{if(S.view!='edit'&&v=='gal')show('gal')});return}if(v=='gal')show('gal');else if(v=='view')openIdx(S.idx);else if(v=='edit')startEdit()});
$('#bBack').onclick=()=>S.view=='edit'?leaveEdit():show('gal');
$('#bOpenF').onclick=$('#eOpenF').onclick=pickFile;$('#bOpenD').onclick=$('#eOpenD').onclick=pickDir;$('#bSlide0').onclick=$('#bSlide').onclick=toggleSlide;
$('#file').onchange=e=>{const f=e.target.files[0];if(f){const u=URL.createObjectURL(f);S.dir='';S.all=[{path:u,name:f.name,size:f.size,mtime:f.lastModified}];applyFilter(u);openIdx(0)}e.target.value=''};
$('#grid').onclick=e=>{const b=e.target.closest('.tile');if(b)openIdx(+b.dataset.i)};$('#strip').onclick=e=>{const b=e.target.closest('button');if(b)openIdx(+b.dataset.i)};
let qt;$('#q').oninput=e=>{clearTimeout(qt);qt=setTimeout(()=>{S.q=e.target.value;applyFilter()},160)};$('#tsr').oninput=e=>{document.documentElement.style.setProperty('--ts',e.target.value+'px');ls('ts',e.target.value)};
$('#bRefresh').onclick=refresh;$('#bLib').onclick=loadLibrary;$('#bFolder').onclick=()=>{const m=subs();menu($('#bFolder'),[{t:t('allFolders')+` (${S.all.length})`,on:!S.sub,f:()=>{S.sub='';applyFilter()}},...Object.keys(m).sort(COLL.compare).map(k=>({t:`${k} (${m[k]})`,on:S.sub==k,f:()=>{S.sub=k;applyFilter()}}))])};
$('#bSort').onclick=()=>menu($('#bSort'),[{t:t('sName'),on:S.sort=='name',f:()=>setSort('name')},{t:t('sDate'),on:S.sort=='date',f:()=>setSort('date')},{t:t('sSize'),on:S.sort=='size',f:()=>setSort('size')},'-',{t:t('sAsc'),on:S.asc,f:()=>setSort(null,true)},{t:t('sDesc'),on:!S.asc,f:()=>setSort(null,false)}]);
function setSort(k,a){if(k)S.sort=k;if(a!=null)S.asc=a;ls('sort',S.sort);ls('asc',S.asc?'1':'0');applyFilter()}
$('#vPrev').onclick=$('#fPrev').onclick=prev;$('#vNext').onclick=$('#fNext').onclick=next;$('#zIn').onclick=()=>{V.anim=true;zoomTo(V.s*1.25)};$('#zOut').onclick=()=>{V.anim=true;zoomTo(V.s/1.25)};$('#zFit').onclick=()=>{V.anim=true;fit()};
$('#rL').onclick=()=>startEdit(270);$('#rR').onclick=()=>startEdit(90);$('#bEdit').onclick=()=>startEdit();$('#bCopy').onclick=copyCurrent;$('#bDel').onclick=delCurrent;$('#bPrint').onclick=printCurrent;$('#bFs').onclick=toggleFs;
$('#bInfo').onclick=()=>{$('#info').hidden=!$('#info').hidden;$('#bInfo').classList.toggle('on',!$('#info').hidden);requestAnimationFrame(()=>{fit()})};
function reveal(i){const e=S.list[i==null?S.idx:i];if(e&&TA&&TA.opener)TA.opener.revealItemInDir(e.path).catch(()=>{})}
$('#bReveal').onclick=()=>reveal();
$('#grid').addEventListener('contextmenu',e=>{const b=e.target.closest('.tile');if(!b)return;e.preventDefault();const i=+b.dataset.i;S.idx=i;menu({getBoundingClientRect:()=>({left:e.clientX,bottom:e.clientY})},[{t:t('ctxOpen'),f:()=>openIdx(i)},{t:t('edit'),f:()=>{S.idx=i;startEdit()}},{t:t('reveal'),f:()=>reveal(i)},{t:t('ctxCopyPath'),f:()=>{try{navigator.clipboard.writeText(S.list[i].path)}catch{}}},'-',{t:t('del'),f:()=>delCurrent(i)}])});
$('#eUndo').onclick=eUndo;$('#eRedo').onclick=eRedo;
['pointerdown'].forEach(ev=>$('#eCmp').addEventListener(ev,()=>{ED.cmp=true;redrawEd()}));['pointerup','pointerleave'].forEach(ev=>$('#eCmp').addEventListener(ev,()=>{if(ED.cmp){ED.cmp=false;redrawEd()}}));
['dragover','dragenter'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$('#vGal').classList.add('drag')}));['dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$('#vGal').classList.remove('drag')}));
document.addEventListener('keydown',e=>{const k=e.key,K=k.toLowerCase();if(k=='Escape'&&$('.menu')){closeMenu();return}if(document.querySelector('dialog[open]'))return;if(e.target.tagName=='INPUT'&&e.target.type=='text')return;
 if(e.ctrlKey&&K=='o'){e.preventDefault();pickFile()}else if(S.view=='edit'){editKey(e)}
 else if(S.view=='view'){if(k=='ArrowRight'||k==' '||k=='PageDown'){e.preventDefault();next()}else if(k=='ArrowLeft'||k=='Backspace'||k=='PageUp'){e.preventDefault();prev()}else if(k=='Home')openIdx(0);else if(k=='End')openIdx(S.list.length-1);else if(k=='+'||k=='=')zoomTo(V.s*1.25);else if(k=='-')zoomTo(V.s/1.25);else if(k=='0')fit();else if(k=='1')zoomTo(1);else if(K=='e')startEdit();else if(k=='Delete')delCurrent();else if(k=='F11'){e.preventDefault();toggleFs()}else if(k=='Escape'){if(S.fsWin)toggleFs();else show('gal')}else if(e.ctrlKey&&K=='c')copyCurrent();else if(K=='i')$('#bInfo').click()}});
if(window.ResizeObserver){new ResizeObserver(()=>{if(S.view=='view'&&V.s<=fitS()+.01)fit();if(S.view=='edit')redrawEd()}).observe($('.col'))}
if(window.matchMedia)matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>theme=='system'&&paint());
if(TA){TA.event.listen('tauri://drag-drop',e=>{$('#vGal').classList.remove('drag');const p=e.payload&&e.payload.paths&&e.payload.paths[0];if(p)openPath(p)});TA.event.listen('tauri://drag-enter',()=>$('#vGal').classList.add('drag'));TA.event.listen('tauri://drag-leave',()=>$('#vGal').classList.remove('drag'));
 TA.event.listen('open-path',e=>openPath(e.payload));inv('startup_path').then(p=>p?openPath(p):autoLoad()).catch(()=>autoLoad())}
function autoLoad(){if(ls('auto')!=='0')loadLibrary()}
document.documentElement.style.setProperty('--ts',(ls('ts')||180)+'px');$('#tsr').value=ls('ts')||180;applyFont();paint();applyI18n();show('gal');
addEventListener('languagechange',()=>{if(langPref=='auto'){lang=sysLang();applyI18n()}});
/* window mode lives in Rust (it must be known before the window is shown). Migrate the old full screen switch once. */
if(TA){const old=ls('startFs')==='1';inv('get_window_mode').then(m=>{winMode=m;if(old&&m=='remember'){winMode='maximized';return inv('set_window_mode',{mode:winMode})}}).catch(()=>{}).then(()=>{try{localStorage.removeItem('startFs')}catch{}});
 /* the window starts hidden; show it after the first paint so there is no white flash */
 requestAnimationFrame(()=>requestAnimationFrame(()=>inv('show_window').catch(()=>{})))}
document.addEventListener('pointerdown',e=>{const el=e.target.closest&&e.target.closest('.btn,.chip,.etab,.fc,.stb,.swc,.sl');if(!el||el.disabled||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
 const r=el.getBoundingClientRect(),d=Math.max(r.width,r.height)*2,s=document.createElement('span');s.className='rip';s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
 if(getComputedStyle(el).position=='static')el.style.position='relative';if(el.classList.contains('ib')||el.classList.contains('ri'))el.style.overflow='hidden';el.append(s);s.addEventListener('animationend',()=>s.remove())},{passive:true});
