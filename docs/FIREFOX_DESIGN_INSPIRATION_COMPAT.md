# Firefox Design and Inspiration Compatibility

Date: 2026-05-29

## Status

Design annotations are supported in the Firefox package through the shared
annotation flow. The generated package injects `design-mode.js` and
`design-editor-ui.js`, saves `type: "design-edit"` annotations through the
background `saveAnnotation` action, and stores them through the existing
`/api/annotations` endpoint.

Inspiration capture is supported for visible elements through the shared
visible-tab screenshot path. The generated package injects `inspiration-mode.js`,
uses the Firefox-visible screenshot fallback when responsive viewport emulation
is unavailable, stores screenshot files through `/api/inspiration-screenshots`,
and stores metadata through `/api/inspirations`.

## Firefox Gaps

- Responsive inspiration capture is unavailable in Firefox and the UI hides the
  responsive breakpoint controls when the browser does not report viewport
  emulation support.
- Inspiration screenshots are visible-viewport captures. Offscreen/full-page
  element capture is not promised in Firefox.
- AMO-readiness still requires the `innerHTML` warning cleanup tracked in
  `docs/FIREFOX_AMO_INNERHTML_AUDIT.md`; this is separate from local build
  compatibility.

## Evidence

An isolated local server smoke was run with a temporary Pointa data directory:

- saved a `design-edit` annotation through `/api/annotations`;
- read the saved design annotation back with its CSS changes intact;
- saved a PNG inspiration screenshot through `/api/inspiration-screenshots`;
- saved inspiration metadata through `/api/inspirations`;
- fetched the saved inspiration screenshot by filename.

The smoke confirmed:

- design annotation id: `firefox-t014-design`;
- inspiration id: `firefox-t014-inspiration`;
- screenshot path: `inspiration_screenshots/firefox-t014-inspiration-shot.png`;
- screenshot size: `68` bytes;
- responsive flag: `false`.
