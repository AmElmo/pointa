# Firefox Web-Ext Smoke Evidence

Date: 2026-05-29

## Environment

- Browser binary: `C:\Program Files\Zen Browser\zen.exe`
- Browser version: `Mozilla Zen 1.20b`
- Generated package: `dist/firefox/`
- Demo URL: `http://127.0.0.1:8080/testing/demo-app/index.html`
- Pointa server: `http://127.0.0.1:4242`

## Automated Evidence

`web-ext run` was executed against Zen with an isolated temporary profile and the
generated Firefox package:

```bash
npx --yes web-ext run \
  --source-dir "dist/firefox" \
  --firefox-binary "C:\Program Files\Zen Browser\zen.exe" \
  --firefox-profile "<temp-profile>" \
  --profile-create-if-missing \
  --keep-profile-changes \
  --start-url "http://127.0.0.1:8080/testing/demo-app/index.html" \
  --no-reload \
  --no-input \
  --verbose \
  --arg=-no-remote
```

The run validated the manifest, launched Zen against the demo URL, connected to
the Firefox remote debugger, and installed the generated extension as a
temporary add-on:

```text
Running web extension from E:\Development\pointa\dist\firefox
Validating manifest at E:\Development\pointa\dist\firefox\manifest.json
Executing Firefox binary: C:\Program Files\Zen Browser\zen.exe
Installed E:\Development\pointa\dist\firefox as a temporary add-on
```

Temporary-profile Zen processes were stopped after the run. Existing user Zen
processes were not terminated.

## Not Automated

The full browser interaction smoke is still manual because the available local
browser automation controls Chromium, not the user's installed Zen profile.
Zen headless/temp-profile protocol probes exited before the debugger socket was
stable enough for scripted UI interaction. Do not treat this as a product
failure: the `web-ext` installation path above succeeded.

Manual coverage still needed for T-023:

- create an annotation in Zen on the demo page;
- attach or verify a screenshot on the annotation;
- run at least one console/error evidence capture scenario, or record why the
  browser/runtime makes it unavailable.

## Manual Zen Profile Smoke

Use this when testing with the regular Zen profile:

1. Run `npm run firefox:build`.
2. Open `about:debugging#/runtime/this-firefox` in Zen.
3. Choose `Load Temporary Add-on...`.
4. Select `dist/firefox/manifest.json`.
5. Open `http://127.0.0.1:8080/testing/demo-app/index.html`.
6. Click the Pointa toolbar icon and create an annotation on a visible element.
7. Confirm the saved annotation remains linked after reload.
8. Capture or attach a screenshot and confirm the image appears in the saved
   annotation details.
9. Start a bug/issue recording, run one of these in the page console, stop the
   recording, and confirm the event is present in the saved report:

```js
console.error("pointa-zen-smoke-error");
setTimeout(() => { throw new Error("pointa-zen-smoke-runtime-error"); }, 0);
Promise.reject(new Error("pointa-zen-smoke-rejection"));
```

Record the result in `docs/FIREFOX_QA_MATRIX.md` row FQ-02, FQ-04, and one of
FQ-06 through FQ-08.
