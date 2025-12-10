# Changelog - Pointa Server Logger

All notable changes to the Pointa server logger SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2025-12-10

### Added
- TypeScript type declarations (`index.d.ts`) for better IDE support
- Added `types` field to package.json

## [0.1.0] - 2025-12-05

### Added
- Initial release
- WebSocket connection to Pointa server at `/backend-logs`
- Console method interception (`log`, `warn`, `error`, `info`, `debug`)
- Recording state management (start/stop via server messages)
- Uncaught exception and unhandled rejection capture
- Auto-reconnection with exponential backoff
- Silent operation mode (no console spam when server unavailable)
- Log buffering while connecting
- Verbose mode for debugging SDK itself

