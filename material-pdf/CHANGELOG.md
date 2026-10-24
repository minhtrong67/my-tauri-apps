# Changelog

## 1.1.0

### Added
- **Standard PDF annotations**: highlights, rectangles, pen strokes and text notes are written as real PDF annotations with appearance streams and stay editable after reopening the file. Annotations from other tools are never modified.
- **Annotations list** in the sidebar (jump to the page, delete).
- **Forms**: fill text fields, checkboxes, radio buttons and dropdowns; values are saved into the PDF.
- **Links**: internal links, bookmarks and web / mail links are clickable (opened in the system browser).
- **Typed toasts** (info / success / warning / error) for light and dark themes, stacked, with a countdown bar.
- **Tailwind CSS 4** (utilities only, coexisting with the Material styles).
- Single-instance behaviour: opening another PDF while the app is running opens it in the existing window.
- Landing page: floating navigation, organic shapes, spring motion, new feature cards, absolute SEO / social meta, `robots.txt`, `sitemap.xml`.

### Changed
- Material 3 Expressive pass: spring motion, shape-morphing buttons, connected button groups, inset rounded reading canvas, floating annotation toolbar, morphing loading indicator, organic shape icons.
- Saving is crash-safe (temp file + atomic rename).
- Large documents open immediately; exact page sizes are read in the background.
- App / Viewer subscribe to the store with selectors (less re-rendering).
- Window position is restored only when it is still on a connected monitor.
- Dialogs trap focus and return it on close; menus and segmented controls support arrow keys.
- README now ships four screenshots (`image01`–`image04`).

## 1.0.0
- First release: reading, search, basic annotations, merge / split / organize, images to PDF, themes, fonts, EN / VI.
