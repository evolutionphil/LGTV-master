# Overview

FLIX IPTV is a cross-platform TV application designed for LG WebOS and Samsung Tizen smart TVs. The application provides IPTV streaming capabilities with support for live channels, video-on-demand (VOD), series, catch-up TV, and YouTube integration. It features a comprehensive user interface with channel guides, search functionality, local storage file browsing, and image galleries.

# User Preferences

Preferred communication style: Simple, everyday language.

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
- **Recently Watched**: Automatic tracking of viewing history
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