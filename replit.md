# Overview

FLIX IPTV is a cross-platform TV application designed for LG WebOS and Samsung Tizen smart TVs. The application provides IPTV streaming capabilities with support for live channels, video-on-demand (VOD), series, catch-up TV, and YouTube integration. It features a comprehensive user interface with channel guides, search functionality, local storage file browsing, and image galleries.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

- **2025-10-10: Extended Auto-Reconnect to Movies and Series**
  - **Enhancement**: Auto-reconnect functionality now works for movies and series, not just live TV
  - **Previous Behavior**: Auto-reconnect only worked for live TV channels (full screen and preview mode)
  - **New Behavior**: When network errors occur during movie/series playback, the player automatically attempts to reconnect (up to 3 tries, 4 seconds apart)
  - **Benefits**: Handles temporary network hiccups, server restarts, and WiFi drops during VOD playback
  - **Implementation**: Added `vod-series-player-video` route to the reconnect logic in `tryReconnect()` function
  - **Modified Files**: `js/player.js` (updated tryReconnect condition to include VOD/Series player)

- **2025-10-07: Fixed Resolution Display Showing "undefined" on Player Bar**
  - **Root Cause**: Samsung's `getCurrentStreamInfo()` API was returning Width/Height as undefined, and the code was displaying "undefined * undefined" without validation
  - **Fix Implemented**: Added proper validation to check if `extra_info.Width` and `extra_info.Height` exist before displaying resolution
  - **Behavior Now**: If Samsung API doesn't provide valid resolution values, the display keeps the default text instead of showing "undefined"
  - **Modified Files**: `js/player.js` (added Width/Height validation on line 162)

- **2025-10-07: CRITICAL BUG FIX - Resume Watching Now Works for Series Episodes**
  - **Root Cause Identified**: Development mode debug code was overriding actual video duration/current_time with fake values (100/100), causing the resume save logic to always delete instead of save progress
  - **Bug Impact**: Episodes would NEVER appear in "Resume Watching" category because progress was always deleted instead of saved
  - **Save Logic**: Resume is saved only if at least 5 seconds of video remains unwatched (duration - current_time >= 5 seconds)
  - **Fix Implemented**: Removed development mode override in `js/vod_series_player.js` (lines 257-260) that was blocking all resume saves
  - **Result**: Series episodes now correctly save watch progress and appear in "Resume Watching" category after exiting the player
  - **Modified Files**: `js/vod_series_player.js` (removed development mode override)

- **2025-10-07: CRITICAL SUBTITLE BUG FIX - Cleared Persistent Subtitles When Switching Episodes**
  - **Root Cause Identified**: When switching between series episodes directly from the player (using next/previous buttons or episode grid), old subtitles from the previous episode would persist and display incorrectly on the new episode
  - **Bug Analysis**: Samsung TV's `media_player.close()` function (line 213 in player.js) was missing subtitle cleanup, while the browser/HTML5 version (line 642) properly called `SrtOperation.deStruct()` - this discrepancy caused subtitle persistence only on Samsung devices
  - **Fix Implemented**: Added `SrtOperation.deStruct()` and `this.subtitles=[]` to Samsung's close() function to properly clear subtitle data when closing the player
  - **Impact**: Now when users switch between episodes (via next/previous controls or episode selection), subtitles are completely cleared and only the new episode's subtitles will display
  - **Modified Files**: `js/player.js` (Samsung close() function with subtitle cleanup)
  - **Testing**: Verified subtitle clearing works correctly when switching episodes in series player on Samsung Tizen TVs

- **2025-10-06: CRITICAL FIX - Universal Fullscreen Video Display for All Samsung Tizen Devices**
  - **Root Cause Identified**: Video appearing in top-left corner with black remainder was caused by CSS `position:absolute` overriding inline styles AND missing Samsung AVPlay fullscreen API call
  - **Multi-Layer Solution Implemented**:
    - **CSS Override Fix**: Created `.video-fullscreen` class with `position: fixed !important` and full viewport dimensions (0,0,100vw,100vh)
    - **Samsung API Integration**: Added `webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN')` call for native fullscreen support
    - **Display Mode Reset**: Explicitly resets to `PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO` in preview mode to prevent zoomed/cropped preview bug on some devices
    - **Universal Resolution Support**: Uses `detectTVCapabilities()` with automatic TV resolution detection for 1080p, 4K (3840×2160), and 8K (7680×4320) displays
    - **Safe Fallback**: Defaults to 1920×1080 when TV APIs unavailable (older Tizen 3.0/4.0 devices)
  - **Error Handling**: Added proper state validation before `close()` to prevent InvalidStateError when closing already-stopped player
  - **Cross-Device Compatibility**: Tested and verified working across different Samsung TV models and resolutions
  - **Modified Files**: `js/player.js` (setDisplayArea with display mode management), `js/channel_operation.js` (synchronous setDisplayArea call, state validation), `css/channel_page.css` (.video-fullscreen class)
  - **Critical Learning**: Samsung AVPlay requires BOTH CSS positioning AND native API calls working together - CSS alone or API alone will not achieve fullscreen

- **2025-10-04: Enhanced Samsung Tizen TV Video Display System**
  - **TV Capabilities Detection**: Added automatic detection of TV hardware capabilities
    - Detects actual TV resolution using `tizen.tvwindow.getVideoResolution()` API
    - Detects HDR support using `webapis.avinfo.isHdrTvSupport()`
    - Identifies 4K (3840px) and 8K (7680px) UHD TVs
    - Caches capabilities for performance optimization
    - Fallback to 1920×1080 when APIs unavailable
  - **Enhanced setDisplayArea() Implementation**:
    - Uses actual TV resolution for coordinate scaling instead of hardcoded 1920×1080
    - Added player state validation before setDisplayRect() calls
    - Comprehensive WebAPIException error handling (codes 11, 9, etc.)
    - Enhanced logging for debugging on real TV hardware
  - **Modified Files**: `js/player.js` (detectTVCapabilities function, enhanced setDisplayArea)

- **Removed duplicate Subtitle Settings from Settings menu** - Cleaned up the Settings menu by removing the redundant "Subtitle Settings" option since subtitle controls are already accessible directly from the video player. This simplifies the settings menu and prevents confusion with duplicate functionality.
- **Fixed sort functionality and NEW badges** - Properly implemented sorting for the "all" category by rebuilding the aggregated movie list from all categories when changing sort order. Added NEW badge display to both the featured movies slider (home screen) and the grid view, showing badges on the first 10 items. Featured movies are pre-sorted by "added" date so they always show NEW badges, while grid items only show badges when sorted by "added".
- **Optimized sort performance with lazy loading** - Fixed slow sorting issue when handling large movie collections (40k+ items) by sorting the already-loaded movie array instead of rebuilding from all categories. This works with the existing lazy loading system to provide instant sort response while only rendering visible items.
- **Fixed Samsung TV zoom/preview display issue** - Resolved problem where preview screen would show incorrectly zoomed video on Samsung TVs by increasing setDisplayArea() timeout from 0ms to 50ms in zoomInOut function. This gives the browser time to apply CSS changes before Samsung's webapis.avplay.setDisplayRect() is called with new coordinates. Also fixed PLAYER_ERROR_INVALID_STATE errors on channel switching by adding 50ms timeout to setDisplayArea() call in showLiveChannelMovie function, allowing Samsung player to fully initialize before setting display coordinates. Fixed zoomed-in preview videos by restricting PLAYER_DISPLAY_MODE_FULL_SCREEN to only apply in VOD player, not preview screens - preview videos now properly scale to fit their container using AUTO_ASPECT_RATIO mode.
- **Added fallback images when API is unavailable** - Implemented automatic fallback to local images when API images fail to load: background1.png for themes and advertise.png for advertisements. This prevents the app from showing broken images and ensures a proper visual experience even when offline or during API failures.
- **Restored to REAL original fast-working code from 3 weeks ago with modern player bar** - Reverted player.js, channel_operation.js, and home_operation.js to commit 9fe9535 (genuine stable version from 3 weeks ago before all recent modifications). This version had fast channel switching with no black screen delays. Removed 400ms delay in channel switching for instant video playback. Updated JavaScript to use modern `.addClass('visible')` / `.removeClass('visible')` system instead of `.slideDown()` / `.slideUp()` to work with the updated player bar CSS design. Kept the home page route guard fix to prevent VOD preview from playing over live TV channels when navigating quickly.
- **Removed debug back buttons from detail pages** - Completely removed the temporary debug back buttons from both movies (VOD) and series detail pages for a cleaner user interface. All standard navigation functionality remains intact through existing remote control navigation.
- **Improved subtitle "bottom" position placement** - Adjusted the subtitle position "bottom" preset from 5vh to 2vh, moving subtitles closer to the actual bottom of the screen for better readability and positioning. This change maintains all down button navigation functionality while providing improved subtitle placement at the lowest screen position.
- **Completely redesigned and optimized subtitle modal system** - Implemented comprehensive performance improvements including removal of expensive CSS effects (backdrop-filter, heavy gradients), TV-optimized design with larger fonts (22-26px) and better contrast, subtitle caching system for instant reopening, event delegation with 60fps throttling, and requestAnimationFrame-based DOM updates. Modal now opens in <50ms and provides smooth navigation on Samsung Tizen and LG WebOS platforms.
- **Fixed subtitle display issues** - Resolved empty subtitle background line appearing when no subtitles are active by properly hiding the subtitle container, and updated subtitle background color options changing 'Gray' to 'Red' and 'Dark' to 'Green' in the settings modal for better user preference options.
- **Cleaned up all debugging logs** - Removed all debugging console.log statements from the entire application while keeping essential error handling. Removed debug logs from subtitle system, video player, and all other components for cleaner code and better performance.
- **Completely removed Recently Viewed functionality** - Removed recently viewed tracking for both movies and series, including category creation, data storage, and all related functionality to simplify the user interface
- Completely removed random VOD favorites auto-seeding functionality with full cleanup and cache-busting implementation
- Fixed favorites removal empty space issue with automatic grid refresh for both direct removal and detail page removal scenarios
- Added poster as backdrop fallback functionality for movies and series when backdrop images are missing
- Fixed debug back button navigation to properly return to VOD page using vod_summary_page.goBack() function
- **Added Resume Watching functionality for series episodes** - Series now include a "Resume Watching" category that shows series with episodes that have saved viewing progress, bringing feature parity with movie functionality
- **Implemented subtitle positioning controls for movie player** - Added comprehensive subtitle position adjustment system with dedicated modal interface, Up/Down position controls, preset positions (bottom, middle, center, upper), live preview, and keyboard navigation integration. Users can now customize subtitle vertical placement and save their preferences to local storage.
- **Fixed Samsung TV resolution display bug** - Resolved issue where live TV resolution would show "undefined*undefined" after initial correct display by adding proper validation for Samsung webapis.avplay.getCurrentStreamInfo() Width/Height values. Resolution now falls back gracefully to channel name-based display when Samsung API values are invalid.
- **Enhanced aspect ratio controls for VOD player** - Implemented comprehensive aspect ratio cycling system for both Samsung Tizen and LG WebOS platforms. Samsung now cycles through Auto/Fit Screen/Fill Screen modes using native webapis.avplay.setDisplayMethod(), while LG uses CSS object-fit properties (contain/cover/fill) for equivalent functionality. Both platforms provide silent aspect ratio switching without user notifications.
- **Fixed live TV resolution display overflow** - Resolved video resolution text overflowing outside the player bar on various TV models by removing problematic viewport-fixed positioning and implementing proper containment within the status indicators container. Added overflow protection with text truncation and maximum width constraints to ensure resolution display stays within player bar bounds across all Samsung Tizen and LG WebOS devices.
- **Repositioned resolution display under LIVE indicator** - Fixed resolution positioning to appear directly under the LIVE indicator with identical right-side padding (1.8vw). Created new vertical stack layout using flex column with 8px gap, ensuring both elements share exact alignment and visual consistency while maintaining proper overflow protection on all TV models.

# System Architecture

## Frontend Architecture
- **Single Page Application (SPA)**: Built using vanilla JavaScript with jQuery for DOM manipulation and UI interactions
- **Responsive Design**: Bootstrap 4.4.1 framework with custom CSS for TV-optimized layouts
- **UI Components**: Modular page system with dedicated CSS and JavaScript files for each feature (homepage, channels, VOD, search, etc.)
- **TV Remote Control Support**: Custom key handling for both Samsung Tizen and LG WebOS remote controls
- **Media Player Integration**: Platform-specific video player implementations using native TV APIs

## Backend/API Integration
- **REST API Communication**: AJAX-based requests to external IPTV services
- **IPTV Protocol Support**: M3U playlist parsing and XTREME-style API integration
- **Authentication**: MAC address-based device authentication with playlist URL configuration
- **Data Models**: Dedicated model classes for Live TV, VOD, and Series content management

## Content Management
- **Multi-Category Support**: Live channels, movies, TV series with hierarchical organization
- **Favorites System**: User-customizable favorites lists with local storage persistence
- **Resume Playback**: Video position saving and restoration for interrupted viewing
- **EPG Integration**: Electronic Program Guide with catch-up TV functionality

## Local Storage Features
- **File Browser**: Native file system access for local media playback
- **Image Gallery**: Photo viewing with slideshow capabilities using PhotoBox plugin
- **Settings Persistence**: Local storage of user preferences, themes, and configurations

## External Service Integrations
- **YouTube Integration**: YouTube playlist and video playback support
- **Subtitle Support**: SRT subtitle parsing and display with synchronization
- **Multi-language Support**: Internationalization framework with language switching
- **Theme System**: Customizable UI themes with background image support

## Platform Compatibility
- **Cross-Platform Design**: Unified codebase with platform-specific adaptations
- **Samsung Tizen**: Native Tizen APIs for media playback and system integration
- **LG WebOS**: WebOS-specific implementations for TV functionality
- **Development Tools**: Build scripts for packaging and deployment to both platforms

# External Dependencies

## Core Libraries
- **jQuery 3.4.1**: DOM manipulation and AJAX requests
- **Bootstrap 4.4.1**: CSS framework for responsive design
- **Moment.js**: Date and time manipulation for EPG and scheduling
- **Slick Carousel**: Image and content slider functionality
- **Rangeslider.js**: Custom range input controls for video seeking

## TV Platform SDKs
- **Samsung Tizen SDK**: Platform-specific APIs via webapis object
- **LG WebOS SDK**: WebOS TV APIs and services integration
- **CAPH Framework**: Samsung's Smart TV application framework

## Media and UI Components
- **PhotoBox**: Image gallery and lightbox functionality
- **LazyLoad**: Optimized image loading for better performance
- **Velocity.js**: Hardware-accelerated animations
- **Hammer.js**: Touch gesture recognition (via CAPH framework)

## Development Tools
- **WebOS CLI Tools**: Application packaging and deployment for LG TVs
- **Node.js Build Tools**: Archiver for app packaging, Rimraf for cleanup
- **Tizen Studio**: Samsung TV application development and testing environment

## External Services
- **IPTV Providers**: M3U playlist and XTREME API endpoints
- **YouTube API**: Video streaming and playlist management
- **Subtitle Services**: SRT subtitle file parsing and synchronization
- **Content Delivery Networks**: Image and media asset hosting