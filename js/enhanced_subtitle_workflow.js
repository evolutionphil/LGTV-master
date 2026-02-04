"use strict";

/**
 * Enhanced Subtitle Workflow Integration
 * Combines API fetching with native subtitle fallback
 */
var EnhancedSubtitleWorkflow = {
    
    /**
     * Initialize enhanced subtitle system for movies or episodes
     * @param {Object} movieData - Movie or episode data
     * @param {string} movieType - 'movie' or 'episode' 
     * @param {Function} successCallback - Called when subtitles are ready
     * @param {Function} errorCallback - Called on error
     */
    initializeSubtitles: function(movieData, movieType, successCallback, errorCallback) {
        var that = this;
        
        console.log('Initializing enhanced subtitles for:', movieData.name, 'Type:', movieType);
        
        // Step 1: Fetch API subtitles first
        SubtitleFetcher.fetchSubtitles(movieData, movieType, 
            function(apiSubtitles) {
                // API subtitles found
                console.log('API subtitles found:', apiSubtitles.length);
                that.setupSubtitleMenu(apiSubtitles, movieData, successCallback);
            },
            function(error) {
                // API failed, fallback to native subtitles
                console.log('API subtitles failed, using native fallback:', error);
                that.useNativeSubtitleFallback(movieData, successCallback, errorCallback);
            }
        );
    },
    
    /**
     * Setup subtitle menu with API and native subtitles combined
     * @param {Array} apiSubtitles - Subtitles from API
     * @param {Object} movieData - Movie data
     * @param {Function} successCallback - Success callback
     */
    setupSubtitleMenu: function(apiSubtitles, movieData, successCallback) {
        // Get native subtitles as fallback
        var nativeSubtitles = SubtitleFetcher.getNativeSubtitles();
        
        // Combine API and native subtitles
        var combinedSubtitles = SubtitleFetcher.combineSubtitles(apiSubtitles, nativeSubtitles);
        
        // Store in media player for access
        if(typeof media_player !== 'undefined') {
            media_player.subtitles = combinedSubtitles;
        }
        
        console.log('Combined subtitles available:', combinedSubtitles.length);
        
        // Apply global subtitle settings for this new content
        this.applyGlobalSubtitleSettings();
        
        if(successCallback) {
            successCallback(combinedSubtitles);
        }
    },
    
    /**
     * Fallback to native subtitles when API fails
     * @param {Object} movieData - Movie data  
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    useNativeSubtitleFallback: function(movieData, successCallback, errorCallback) {
        var nativeSubtitles = SubtitleFetcher.getNativeSubtitles();
        
        if(nativeSubtitles.length > 0) {
            console.log('Using native subtitle fallback:', nativeSubtitles.length);
            
            // Add "Off" option
            var fallbackSubtitles = [{
                source: 'off',
                label: 'Turn Off Subtitles',
                language: 'none'
            }].concat(nativeSubtitles);
            
            // Store in media player
            if(typeof media_player !== 'undefined') {
                media_player.subtitles = fallbackSubtitles;
            }
            
            // Apply global subtitle settings for this new content
            this.applyGlobalSubtitleSettings();
            
            if(successCallback) {
                successCallback(fallbackSubtitles);
            }
        } else {
            console.log('No subtitles available (API and native both failed)');
            if(errorCallback) {
                errorCallback('No subtitles available');
            }
        }
    },
    
    /**
     * Handle subtitle selection from user
     * @param {number} selectedIndex - Index of selected subtitle
     * @param {Function} loadingCallback - Called when loading starts
     * @param {Function} successCallback - Called when subtitle is loaded
     * @param {Function} errorCallback - Called on error
     */
    selectSubtitle: function(selectedIndex, loadingCallback, successCallback, errorCallback) {
        if(!media_player || !media_player.subtitles || selectedIndex >= media_player.subtitles.length) {
            if(errorCallback) errorCallback('Invalid subtitle selection');
            return;
        }
        
        var selectedSubtitle = media_player.subtitles[selectedIndex];
        var subtitleSource = selectedSubtitle.source || 'api';
        
        console.log('Selecting subtitle:', selectedSubtitle.label, 'Source:', subtitleSource);
        
        if(subtitleSource === 'off') {
            // Turn off all subtitles
            this.disableAllSubtitles();
            if(successCallback) successCallback();
            return;
        }
        
        if(subtitleSource === 'native') {
            // Use native subtitle
            this.selectNativeSubtitle(selectedSubtitle, successCallback, errorCallback);
        } else if(subtitleSource === 'api') {
            // Use API subtitle
            this.selectApiSubtitle(selectedSubtitle, loadingCallback, successCallback, errorCallback);
        }
    },
    
    /**
     * Select native subtitle track
     * @param {Object} subtitle - Native subtitle object
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    selectNativeSubtitle: function(subtitle, successCallback, errorCallback) {
        try {
            // Stop API subtitles first
            SrtOperation.stopOperation();
            
            // Enable native subtitle
            var nativeIndex = subtitle.originalIndex || subtitle.index;
            if(typeof nativeIndex !== 'undefined' && nativeIndex !== null && !isNaN(nativeIndex)) {
                media_player.setSubtitleOrAudioTrack("TEXT", nativeIndex);
                console.log('Native subtitle enabled:', nativeIndex);
                if(successCallback) successCallback();
            } else {
                if(errorCallback) errorCallback('Invalid native subtitle index');
            }
        } catch(e) {
            console.error('Error selecting native subtitle:', e);
            if(errorCallback) errorCallback(e);
        }
    },
    
    /**
     * Select API subtitle
     * @param {Object} subtitle - API subtitle object
     * @param {Function} loadingCallback - Loading callback
     * @param {Function} successCallback - Success callback  
     * @param {Function} errorCallback - Error callback
     */
    selectApiSubtitle: function(subtitle, loadingCallback, successCallback, errorCallback) {
        // Disable native subtitles first - only if webapis is available
        try {
            if(platform === 'samsung' && typeof webapis !== 'undefined') {
                console.log('Disabling Samsung native subtitles');
                media_player.setSubtitleOrAudioTrack("TEXT", -1);
            } else if(platform === 'lg' && media_player.videoObj && media_player.videoObj.textTracks) {
                console.log('Disabling LG native subtitles');
                for(var i = 0; i < media_player.videoObj.textTracks.length; i++) {
                    media_player.videoObj.textTracks[i].mode = 'hidden';
                }
            } else if(platform === 'samsung' && typeof webapis === 'undefined') {
                console.log('Samsung platform detected but webapis not available (browser mode)');
            }
        } catch(e) {
            console.error('Error disabling native subtitles:', e);
        }
        
        // Get subtitle file URL - handle different API response formats
        var subtitleUrl = '';
        
        // Since apiData = subtitle (from subtitle_fetcher.js), check subtitle properties directly
        if(subtitle.file) {
            subtitleUrl = subtitle.file;
            if(subtitleUrl.startsWith('/')) {
                subtitleUrl = 'https://exoapp.tv' + subtitleUrl;
            }
        } else if(subtitle.url) {
            subtitleUrl = subtitle.url;
        } else if(subtitle.id && subtitle.language) {
            // Construct API URL for subtitle file
            subtitleUrl = 'https://exoapp.tv/api/subtitle-file?lang=' + subtitle.language + '&id=' + subtitle.id;
        } else {
            // Log the full subtitle object to understand the structure
            console.log('Unable to determine subtitle URL. Subtitle object:', subtitle);
        }
        
        if(!subtitleUrl) {
            if(errorCallback) errorCallback('No subtitle file URL available');
            return;
        }
        
        
        if(loadingCallback) loadingCallback();
        
        // Load subtitle content
        $.ajax({
            url: subtitleUrl,
            method: 'GET',
            dataType: 'text',
            timeout: 15000,
            crossDomain: true,
            beforeSend: function(xhr) {
                // Add headers if needed for CORS
                xhr.setRequestHeader('Accept', 'text/plain, application/x-subrip, */*');
            },
            success: function(subtitleContent) {
                console.log('Subtitle content loaded successfully, length:', subtitleContent ? subtitleContent.length : 0);
                
                if(!subtitleContent || subtitleContent.trim().length === 0) {
                    console.error('Subtitle content is empty');
                    if(errorCallback) errorCallback('Subtitle content is empty');
                    return;
                }
                
                // Get current video time
                var currentTime = 0;
                try {
                    if(platform === 'samsung' && typeof webapis !== 'undefined' && webapis.avplay && webapis.avplay.getCurrentTime) {
                        currentTime = webapis.avplay.getCurrentTime() / 1000; // Convert ms to seconds
                    } else if(media_player.videoObj && media_player.videoObj.currentTime) {
                        currentTime = media_player.videoObj.currentTime;
                    }
                } catch(e) {
                    console.error('Error getting current time:', e);
                    currentTime = 0;
                }
                
                console.log('Initializing SRT with current time:', currentTime);
                
                // Initialize SRT operation
                SrtOperation.init({content: subtitleContent}, currentTime);
                
                // Ensure subtitle container is visible
                $('#' + media_player.parent_id).find('.subtitle-container').show();
                
                if(successCallback) successCallback();
            },
            error: function(xhr, status, error) {
                console.error('Error loading subtitle. Status:', status, 'Error:', error, 'Response:', xhr.responseText);
                console.error('URL that failed:', subtitleUrl);
                console.error('XHR object:', xhr);
                console.error('Response status:', xhr.status);
                
                // Try alternative approach if CORS is the issue
                if(status === 'error' && xhr.status === 0) {
                    console.log('CORS or network error detected, falling back to native subtitles');
                    if(errorCallback) errorCallback('CORS or network error when loading subtitle');
                } else if(xhr.status === 404) {
                    console.log('Subtitle file not found (404)');
                    if(errorCallback) errorCallback('Subtitle file not found');
                } else {
                    if(errorCallback) errorCallback('Failed to load subtitle: ' + (error || status || 'HTTP ' + xhr.status));
                }
            }
        });
    },
    
    /**
     * Disable all subtitles (both API and native)
     */
    disableAllSubtitles: function() {
        // Stop API subtitles
        SrtOperation.stopOperation();
        
        // Disable native subtitles - only if webapis is available
        try {
            if(platform === 'samsung' && typeof webapis !== 'undefined') {
                media_player.setSubtitleOrAudioTrack("TEXT", -1);
            } else if(platform === 'lg' && media_player.videoObj && media_player.videoObj.textTracks) {
                for(var i = 0; i < media_player.videoObj.textTracks.length; i++) {
                    media_player.videoObj.textTracks[i].mode = 'hidden';
                }
            } else if(platform === 'samsung' && typeof webapis === 'undefined') {
                console.log('Samsung platform in browser mode - cannot disable native subtitles');
            }
        } catch(e) {
            console.error('Error disabling subtitles:', e);
        }
        
        console.log('All subtitles disabled');
    },
    
    /**
     * Apply global subtitle settings saved in localStorage
     * This ensures all movies/series use the same subtitle preferences
     */
    applyGlobalSubtitleSettings: function() {
        // Apply global settings via SrtOperation if available
        if(typeof srt_operation !== 'undefined') {
            srt_operation.applyUserStyles();
        }
        
        // Also apply via vod_series_player if available
        if(typeof vod_series_player !== 'undefined' && vod_series_player.applySubtitlePosition) {
            vod_series_player.applySubtitlePosition();
        }
        
        console.log('Global subtitle settings applied for new content');
    }
};