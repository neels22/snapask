# Changelog

All notable changes to SnapAsk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2024-11-21

### Added
- **Automatic Updates**: Seamless background updates using electron-updater and GitHub Releases
  - Automatic update checking on startup and every 4 hours
  - Background download of updates
  - User notification when updates are ready
  - Restart now or later options
- **Conversation History**: Complete SQLite-based conversation persistence
  - All conversations saved locally
  - Messages persist across app restarts
  - Conversation list with metadata
  - Full conversation history with messages
- **Main App Window**: Full-featured application window
  - Continue conversations from popup window
  - View conversation history
  - Send additional messages in conversations
  - Beautiful native macOS UI
- **Onboarding Flow**: First-time user experience
  - API key setup wizard
  - Clear instructions for getting started
  - Permission guidance
- **Comprehensive Testing**: Full test suite
  - 27 unit and integration tests
  - 100% test coverage for update system
  - Automated testing with Jest

### Changed
- Improved error handling throughout the application
- Better user feedback for API errors
- Enhanced UI/UX for conversation management

### Technical
- Added electron-builder for distribution
- Integrated electron-updater for auto-updates
- Set up Jest testing framework
- Added comprehensive linting and code quality checks
- Configured GitHub Releases for distribution

## [0.2.0] - Previous Release

### Added
- Google Gemini AI integration
- Screenshot capture with global shortcut
- Floating chat window
- Basic conversation flow

## [0.1.0] - Initial Release

### Added
- Initial project setup
- Basic Electron app structure
- Screenshot capture functionality

[0.3.0]: https://github.com/neels22/snapask/releases/tag/v0.3.0

