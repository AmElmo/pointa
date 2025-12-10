# Changelog - Pointa Server Logger

All notable changes to the Pointa server logger SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-12-10

### Added
- **Server port identification for smart detection**
  - New `serverPort` option to specify which port the backend server runs on
  - Auto-detects from `process.env.PORT` if not explicitly provided
  - Sends `register` message with port when connecting to Pointa server
  - Enables extension to match SDK to correct frontend port

### Changed
- SDK now sends registration message on WebSocket open
- Improved compatibility with multi-port development setups

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

