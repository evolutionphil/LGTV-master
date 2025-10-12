# Overview

FLIX IPTV is a cross-platform TV application for LG WebOS and Samsung Tizen smart TVs, providing IPTV streaming with live channels, video-on-demand (VOD), series, catch-up TV, and YouTube integration. It features a comprehensive user interface including channel guides, search, local storage file browsing, and image galleries. The application aims to offer a complete entertainment solution with a focus on user experience and broad platform compatibility.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

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