# Changelog

## 2.3.0
- **Several documents at once**: document tabs (New / Open add a tab, middle-click or Ctrl+W closes, Ctrl+Tab switches, drag to reorder). Each tab keeps its own undo history, page setup and unsaved state; closing the app asks about every tab with unsaved changes; crash recovery restores all unsaved tabs.
- **Comments, footnotes and endnotes in .docx are now kept**: they show as small markers (hover to read the text), survive editing and are written back on save. They cannot be edited yet.
- Opening an already open file switches to its tab.
- Ribbon rebalanced: icons, labels and drop-down arrows now sit on the same rows across every group (taller ribbon, smaller arrows).
- Verified with LibreOffice: exported files open with notes and comments intact, and a LibreOffice-made document survives an import → export round trip.

## 2.2.0
- Floating format toolbar above a text selection (bold, italic, underline, strike, highlight).
- Ribbon: mouse-wheel scrolling and edge buttons when groups do not fit; search pill and save indicator shrink on narrow windows.
- Opening a .docx that contains comments, footnotes, endnotes, tracked changes or equations now shows a warning, because those parts are not kept on save.
- Landing page: circular theme reveal, sliding menu indicator, card spotlight, swipeable screenshots, sticky download bar on phones, FAQ structured data, paused off-screen animations.

## 2.1.0
- Material 3 Expressive redesign of the app and a new landing page.
- Open .docx/.docm/.dotx/.dotm, .odt/.ott, .rtf, .html, .md, .csv/.tsv and plain text files.
- Custom dropdowns, typed toasts (info / success / warning / error), dialog buttons with icon + colour.
- Interface text size (small / medium / large) and 5 bundled fonts.
- New icon set in Word blue (app, installer, uninstaller).
