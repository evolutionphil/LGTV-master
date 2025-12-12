# Overview

FLIX IPTV is a cross-platform TV application for LG WebOS and Samsung Tizen smart TVs, providing IPTV streaming with live channels, video-on-demand (VOD), series, catch-up TV, and YouTube integration. It features a comprehensive user interface including channel guides, search, local storage file browsing, and image galleries. The application aims to offer a complete entertainment solution with a focus on user experience and broad platform compatibility.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

- **2025-12-12: Hide Movie Duration When Empty/Demo Content**
  - Fixed: Movie details page no longer shows empty duration field when data is unavailable
  - Xtreme playlists: Duration row hidden during loading, shown only if API returns valid duration
  - Non-Xtreme playlists: Checks current_movie.duration and hides row if empty/null/0
  - Both playlist types now have consistent behavior
  - Modified files: `js/vod_summary.js`

- **2025-12-12: Fixed Pause During Rewind/Fast-Forward**
  - Fixed: Pressing pause during rewind or fast-forward now properly pauses the video
  - Clear `seek_timer` in `playPauseVideo` to prevent auto-resume overriding pause
  - Modified files: `js/vod_series_player.js`

- **2025-12-12: Fixed Network Disconnect Resume for VOD/Series**
  - Fixed: When network disconnects during movie/series playback and reconnects, video now resumes from same position
  - Added `reconnect_position` property to track playback position before close
  - In `tryReconnect`: saves current time for VOD/series routes only
  - After successful reconnect: seeks to saved position instead of starting from beginning
  - Reset `reconnect_position` in `init()` and `close()` to prevent stale values
  - Live TV not affected (no position to save for live streams)
  - Modified files: `js/player.js`

- **2025-12-12: Fixed Homepage Video Preview Zoom Issue**
  - Fixed: Homepage live preview was zoomed/cropped on some TVs
  - Added `PLAYER_DISPLAY_MODE_LETTER_BOX` for preview mode to preserve aspect ratio
  - Fullscreen player modes remain unchanged (FULL_SCREEN)
  - Modified files: `js/player.js`

- **2025-12-12: Fixed Power Off/On During Buffering Issue**
  - Fixed: TV power off/on during video buffering no longer auto-resumes content
  - Enhanced `visibilitychange` handler in `js/main.js` to track player state
  - Now saves `media_player.state` and `current_route` before suspend
  - On resume: only restores if video was actually PLAYING (state === 1)
  - If buffering/preparing, closes player and navigates to previous page (vod_summary, series_summary, or home)
  - Applies to all player routes: VOD, Live TV, Catch-up
  - Modified files: `js/main.js`

- **2025-12-12: USB Storage Toast Translation Support**
  - Added translation key `no_usb_connected` for multi-language support
  - Toast message now uses `current_words['no_usb_connected']` with fallback
  - **Backend Required**: Add translation key `no_usb_connected` for all languages

- **2025-12-04: Bug Fixes and Performance Improvements (v1.1 Update)**
  - **DEBUG_MODE flag**: Added `DEBUG_MODE = false` in `js/common.js` for production logging control
  - **URL Caching**: Added `urlCache` object with 5-minute expiry for faster channel switching
  - **Fixed Black Screen on STOP**: Enhanced Samsung player's close() function to properly stop and clear display
  - **Fixed Favorites Empty Slot Bug**: When removing favorites from the favorites view, now properly updates both DOM and movies array
  - **Fixed USB Storage Play**: Restored the `checkCorruptedRemovableDrives` callback function that was commented out
  - **Fixed Broken Background Image**: Background images now hide properly when no backdrop is available, with error handler for failed loads
  - **Fixed Double Focus on Player Overlay**: Changed CSS hover selector to `:hover:not(.active)` to prevent visual conflicts
  - **Config.xml Updates**: API version 2.4, mediastorage privilege, productinfo privilege, mouse support
  - Modified files: `js/common.js`, `js/player.js`, `js/home_operation.js`, `js/storage_operation.js`, `js/vod_summary.js`, `js/series_summary.js`, `css/vod_series_player_page.css`, `config.xml`
  - See UPDATE.md for complete task list and testing instructions

- **2025-12-04: Added webapis.network.getMac() and Wi-Fi Fallback for Tizen 9.0+ MAC Detection**
  - Fixed issue where Samsung Tizen 9.0 TVs (e.g., 25TV_BASIC2) were falling back to hardcoded MAC address
  - Added new fallback steps for better MAC address detection on newer Tizen versions
  - Added MAC address validation helper `isValidMacAddress()` to reject:
    - Empty/null MAC addresses
    - Privacy placeholders (02:00:00:00:00:00, 00:00:00:00:00:00)
    - Malformed MAC formats
  - Updated Samsung MAC detection flow:
    1. ETHERNET_NETWORK (with validation)
    2. DUID (Base64 encoded)
    3. TizenID (Base64 encoded)
    4. **NEW: webapis.network.getMac()** ← Samsung's network API
    5. **NEW: WIFI_NETWORK** ← For Wi-Fi connected TVs
    6. Hardcoded fallback (last resort)
  - Added Wi-Fi feature permission to `config.xml`
  - Enhanced console logging to track which method provided the MAC address
  - Modified files: `js/login_operation.js`, `config.xml`

- **2025-10-12: Implemented Terms of Use Popup on First Launch**
  - Added first-launch Terms of Use popup with Accept/Decline functionality
  - Terms content fetched from backend API (`/api/device_info` endpoint)
  - Version-based acceptance tracking prevents re-showing same version
  - Decline option exits the app for legal protection
  - Full TV remote control navigation:
    - UP/DOWN arrows: Scroll content
    - LEFT/RIGHT arrows: Navigate between Accept/Decline buttons
    - ENTER: Confirm selection
    - RETURN: Disabled (must accept or decline)
  - Translation system integration for multi-language support
  - White text styling for optimal readability on TV displays
  - Modified files: `index.html`, `js/login_operation.js`
  - Comprehensive legal Terms document created (`TERMS_OF_USE.md`, `TERMS_OF_USE_API_VERSION.txt`)
  - **Backend Required**: Add `terms` object to `/api/device_info` response with structure:
    ```json
    {
      "terms": {
        "version": "1.0",
        "content": "Your terms text here...",
        "updated_date": "2025-10-12"  // optional
      }
    }
    ```
  - **Translation Keys Needed** (add to backend languages array):
    - `terms_title`: "Terms of Use"
    - `accept`: "Accept"
    - `decline`: "Decline"

- **2025-10-12: Fixed Category Count Display with Hide Blocked Content**
  - Category counts now accurately reflect filtered content when "Hide Blocked Content" is enabled
  - Dynamic count calculation for Live TV, Movies, and Series categories
  - Updates both initial display and dynamic count updates (favorites, recent)
  - Modified files: `js/home_operation.js`

- **2025-10-12: Implemented "Hide Blocked Content" Toggle Feature**
  - Added user-controlled toggle in Settings to completely hide blocked content from all lists
  - Positioned after "Hide Series Categories" in settings menu for logical grouping
  - Comprehensive filtering across live channels, movies, series, and search results
  - Smart empty state handling shows appropriate messages when categories are fully blocked
  - Safe navigation with key handler guards to prevent crashes with empty lists
  - Setting persists across app sessions via localStorage
  - Modified files: `js/channel_operation.js`, `js/home_operation.js`, `js/search_page.js`, `index.html`

# System Architecture

## Frontend Architecture
- **Single Page Application (SPA)**: Built with vanilla JavaScript and jQuery for dynamic UI.
- **Responsive Design**: Utilizes Bootstrap 4.4.1 and custom CSS optimized for TV displays.
- **Modular UI**: Features a modular page system for various functionalities (e.g., homepage, channels, VOD).
- **TV Remote Control Support**: Custom key handling for Samsung Tizen and LG WebOS.
- **Media Player Integration**: Platform-specific video player implementations using native TV APIs.

## Backend/API Integration
- **REST API Communication**: AJAX-based requests to external IPTV services.
- **IPTV Protocol Support**: M3U playlist parsing and XTREME-style API integration.
- **Authentication**: MAC address-based device authentication with configurable playlist URLs.
- **Data Models**: Dedicated models for Live TV, VOD, and Series content.

## Content Management
- **Multi-Category Support**: Organizes live channels, movies, and TV series.
- **Favorites System**: User-customizable favorites with local storage persistence.
- **Resume Playback**: Saves and restores video progress.
- **EPG Integration**: Electronic Program Guide with catch-up TV.

## Local Storage Features
- **File Browser**: Accesses local file systems for media playback.
- **Image Gallery**: Photo viewing with slideshow capabilities.
- **Settings Persistence**: Stores user preferences, themes, and configurations locally.

## External Service Integrations
- **YouTube Integration**: Supports YouTube playlist and video playback.
- **Subtitle Support**: SRT subtitle parsing and display with synchronization.
- **Multi-language Support**: Internationalization framework.
- **Theme System**: Customizable UI themes.

## Platform Compatibility
- **Cross-Platform Design**: Unified codebase with platform-specific adaptations for Samsung Tizen and LG WebOS.
- **Development Tools**: Build scripts for packaging and deployment to both platforms.

# External Dependencies

## Core Libraries
- **jQuery 3.4.1**: DOM manipulation and AJAX.
- **Bootstrap 4.4.1**: CSS framework.
- **Moment.js**: Date and time manipulation.
- **Slick Carousel**: Content slider.
- **Rangeslider.js**: Custom range input controls.

## TV Platform SDKs
- **Samsung Tizen SDK**: Native Tizen APIs.
- **LG WebOS SDK**: WebOS TV APIs.
- **CAPH Framework**: Samsung's Smart TV application framework.

## Media and UI Components
- **PhotoBox**: Image gallery and lightbox.
- **LazyLoad**: Optimized image loading.
- **Velocity.js**: Hardware-accelerated animations.
- **Hammer.js**: Touch gesture recognition (via CAPH).

## External Services
- **IPTV Providers**: M3U playlist and XTREME API endpoints.
- **YouTube API**: Video streaming and playlist management.
- **Subtitle Services**: SRT subtitle file parsing.
- **Content Delivery Networks**: Image and media asset hosting.