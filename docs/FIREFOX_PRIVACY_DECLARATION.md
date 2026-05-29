# Firefox Privacy and Data Collection Declaration

Date: 2026-05-29

## Manifest Declaration

The generated Firefox manifest declares:

```json
{
  "browser_specific_settings": {
    "gecko": {
      "data_collection_permissions": {
        "required": ["websiteActivity", "websiteContent"],
        "optional": []
      }
    }
  }
}
```

This matches the current Firefox package behavior. MDN documents
`browser_specific_settings.gecko.data_collection_permissions` as the manifest
location for Firefox extension data collection declarations for AMO submission.

## Why These Categories Are Required

Pointa's core feature is user-initiated local development feedback. To provide
that feature, the extension can collect or process:

- website content selected by the user, including element selectors, text
  snippets, style metadata, dimensions, and page URLs;
- website activity during recording, including user interactions, console
  messages, runtime errors, promise rejections, fetch/XHR metadata, and failed
  requests;
- screenshots attached to annotations, issue reports, performance reports, and
  inspiration captures;
- backend logs only when the user starts a Pointa recording and the local
  `pointa-server dev` log bridge is connected.

The Firefox package requests `<all_urls>` for persistent visible-tab screenshot
capture from the in-page toolbar, but does not request Firefox `tabs` permission.
It also requests local-development host permissions, `activeTab`, `storage`, and
`scripting`.

## Local-First Storage

Pointa stores annotation and evidence data through the local `pointa-server`
running on `127.0.0.1:4242`. The server writes files under the user's local
`~/.pointa` directory, including:

- `annotations.json`;
- `issue_reports.json`;
- `inspirations.json`;
- `images/{annotationId}/...`;
- `bug_screenshots/...`;
- `inspiration_screenshots/...`;
- `config.json` for local integration settings.

Extension-local browser storage is used for onboarding, settings, and integration
state. Pointa does not require a Pointa-hosted cloud service for the Firefox
local development workflow.

## AI Tool Handling

Pointa exposes local data to AI coding tools through MCP only after the user
configures an AI tool to connect to `pointa-server`. AI tools can then read
annotations, image data, bug reports, performance reports, and related local
evidence through MCP tool calls.

Data handling after an AI tool receives MCP results is controlled by that AI
tool and the user's configuration. AMO/release copy should tell users not to
connect Pointa to an AI tool unless they are comfortable sharing local annotation
and evidence content with that tool.

## Linear Integration Handling

Linear integration is optional. When configured, Pointa can use the stored Linear
API key from local `~/.pointa/config.json` to create or update Linear issues and
upload selected screenshots/debug artifacts to Linear. Pointa can also fetch
Linear attachment content through the `fetch_linear_attachment` MCP tool when
the user requests it and the local Linear key is available.

Linear-bound data may include annotation text, selectors, page URLs, screenshots,
bug report JSON, console/error/network/backend evidence, and performance report
content. This data leaves the user's machine only when the user enables and uses
the Linear integration.

## Listing Copy Requirements

Firefox listing and privacy copy should state:

- Pointa is local-first and designed for local development URLs.
- The Firefox package requests all-site host access so user-initiated screenshot
  attachments keep working from the persistent in-page toolbar after navigation.
- Screenshots, annotations, logs, and page evidence are saved locally by default.
- Console/error/network evidence is captured only while a user-initiated
  recording is active.
- Backend logs are captured only when `pointa-server dev` is connected and a
  recording is active.
- MCP AI tools and Linear integrations can receive Pointa data only when the user
  configures and uses those integrations.
- Responsive viewport capture is unavailable in Firefox; visible screenshot
  capture is used instead.

## Release Checks

- `dist/firefox/manifest.json` must include `websiteActivity` and
  `websiteContent` in required data collection permissions.
- `optional` data collection permissions must remain empty unless an optional
  consent flow is added.
- Any future telemetry, cloud sync, or third-party export must update this file,
  the manifest declaration, and AMO listing copy before release.
