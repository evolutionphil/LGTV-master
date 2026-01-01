# Overview

FLIX IPTV is a cross-platform TV application for LG WebOS and Samsung Tizen smart TVs, offering IPTV streaming with live channels, video-on-demand (VOD), series, catch-up TV, and YouTube integration. It features a comprehensive user interface including channel guides, search, local storage file browsing, and image galleries. The application aims to provide a complete entertainment solution with a focus on user experience and broad platform compatibility across various smart TV ecosystems.

# User Preferences

Preferred communication style: Simple, everyday language.
Remote Update Workflow: After every code change, automatically copy all changed files to remote-assets/ folder and run `node tools/generate-manifest.js` to update versions.

# System Architecture

## Frontend Architecture
-   **Single Page Application (SPA)**: Built with vanilla JavaScript and jQuery for dynamic UI.
-   **Responsive Design**: Utilizes Bootstrap 4.4.1 and custom CSS optimized for TV displays.
-   **Modular UI**: Features a modular page system for various functionalities (e.g., homepage, channels, VOD).
-   **TV Remote Control Support**: Custom key handling for Samsung Tizen and LG WebOS.
-   **Media Player Integration**: Platform-specific video player implementations using native TV APIs.
-   **UI/UX**: Focus on readability with white text styling and clear navigation.
-   **Feature Specifications**:
    -   Similar Movies Section on VOD detail page with genre matching and category bonus scoring.
    -   Terms of Use popup on first launch with backend-fetched content and version-based acceptance tracking.
    -   "Hide Blocked Content" toggle feature in settings for filtering content across lists.
    -   Dynamic category count updates reflecting filtered content.

## Backend/API Integration
-   **REST API Communication**: AJAX-based requests to external IPTV services.
-   **IPTV Protocol Support**: M3U playlist parsing and XTREME-style API integration.
-   **Authentication**: MAC address-based device authentication with configurable playlist URLs.
-   **Data Models**: Dedicated models for Live TV, VOD, and Series content.
-   **MAC Address Detection**: Robust detection logic for Tizen (Ethernet, DUID, TizenID, `webapis.network.getMac()`, Wi-Fi, Hardcoded fallback) with preservation of existing user MAC addresses.

## Content Management
-   **Multi-Category Support**: Organizes live channels, movies, and TV series.
-   **Favorites System**: User-customizable favorites with local storage persistence.
-   **Resume Playback**: Saves and restores video progress, including network disconnect recovery.
-   **EPG Integration**: Electronic Program Guide with catch-up TV.

## Local Storage Features
-   **File Browser**: Accesses local file systems for media playback.
-   **Image Gallery**: Photo viewing with slideshow capabilities.
-   **Settings Persistence**: Stores user preferences, themes, and configurations locally.

## External Service Integrations
-   **YouTube Integration**: Supports YouTube playlist and video playback via an HTTPS proxy for Tizen compatibility.
-   **Subtitle Support**: SRT subtitle parsing and display with synchronization.
-   **Multi-language Support**: Internationalization framework with translation key support.
-   **Theme System**: Customizable UI themes.

## Platform Compatibility
-   **Cross-Platform Design**: Unified codebase with platform-specific adaptations for Samsung Tizen and LG WebOS.
-   **Development Tools**: Build scripts for packaging and deployment to both platforms.
-   **Power Management**: Handles TV power off/on events during buffering to prevent auto-resume of content.
-   **Samsung 4K AVPlay Timing**: zoomInOut uses scheduleSetDisplayArea with 250ms delay for preview mode; fullscreen uses synchronous setDisplayArea call.

## Remote Update System v2.0
-   **OTA Updates**: Push CSS/JS updates to TVs without app store resubmission.
-   **Background Download Mode**: Updates download silently in background, applied on next app launch for seamless UX.
-   **Asset Bootstrapper**: `FlixBootstrapper.writeCSS/JS()` loads files from cache or local using `document.write()`.
-   **Manifest-Based Versioning**: JSON manifest (v1.1.1) tracks 49 files with hashes.
-   **Cloudflare CDN**: Hosted at `flixapp.pages.dev` for global distribution.
-   **LocalStorage Cache**: Downloaded files cached locally (~5MB limit respected).
-   **Kill Switch**: Emergency fallback to local files if remote update has issues.
-   **ES5 Compatible**: Works on Tizen 2.4+ and WebOS 3.0+.
-   **Update Flow**: App starts with local/cached files → Background downloads updates → Next launch uses cached updates.
-   **Files**:
    -   `js/asset-bootstrapper.js`: Cache/local file loading with document.write()
    -   `js/remote-loader.js`: Core update logic (background download mode)
    -   `js/remote-config.js`: Configuration (enabled: true, debug: true)
    -   `remote-assets/manifest.json`: Version manifest (49 files)
    -   `tools/generate-manifest.js`: Manifest generator
    -   `tools/copy-to-remote.js`: File copy helper
    -   `docs/REMOTE_UPDATE_SYSTEM.md`: Full documentation

# External Dependencies

## Core Libraries
-   **jQuery 3.4.1**: DOM manipulation and AJAX.
-   **Bootstrap 4.4.1**: CSS framework.
-   **Moment.js**: Date and time manipulation.
-   **Slick Carousel**: Content slider.
-   **Rangeslider.js**: Custom range input controls.
-   **PhotoBox**: Image gallery and lightbox.
-   **LazyLoad**: Optimized image loading.
-   **Velocity.js**: Hardware-accelerated animations.
-   **Hammer.js**: Touch gesture recognition (via CAPH).

## TV Platform SDKs
-   **Samsung Tizen SDK**: Native Tizen APIs.
-   **LG WebOS SDK**: WebOS TV APIs.
-   **CAPH Framework**: Samsung's Smart TV application framework.

## External Services
-   **IPTV Providers**: M3U playlist and XTREME API endpoints.
-   **YouTube API**: Video streaming and playlist management.
-   **Subtitle Services**: SRT subtitle file parsing.
-   **Content Delivery Networks**: Image and media asset hosting.
-   **`https://flixapp.net/youtube-player.html`**: Remote HTTPS player page for YouTube IFrame API.