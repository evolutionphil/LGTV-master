"use strict";

/**
 * Enhanced Subtitle Fetcher - API Integration from ExoApp
 * Fetches subtitles from exoapp.tv API with enhanced episode matching
 */
var SubtitleFetcher = {
    apiUrl: 'https://exoapp.tv/api/get-subtitles',
    
    /**
     * Fetch subtitles for movies or series episodes
     * @param {Object} movieData - Movie or episode data
     * @param {string} movieType - 'movie' or 'episode'
     * @param {Function} successCallback - Called on success
     * @param {Function} errorCallback - Called on error
     */
    fetchSubtitles: function(movieData, movieType, successCallback, errorCallback) {
        var subtitleRequestData = {};
        
        // MOVIES: Enhanced processing following exoapp methodology
        if (movieType === 'movie') {
            var originalName = movieData.name || '';
            var cleanedName = originalName;
            
            // Step 1: Extract year from name
            var yearMatch = cleanedName.match(/\((\d{4})\)/);
            var extractedYear = null;
            if (yearMatch) {
                extractedYear = parseInt(yearMatch[1]);
                // Remove year from name: "Movie Name (2023)" → "Movie Name"
                cleanedName = cleanedName.replace(/\s*\(\d{4}\)\s*/, '').trim();
            }
            
            // Step 2: Remove quality indicators that interfere with matching
            var qualityPatterns = /\s*\b(HD|4K|1080p|720p|480p|BluRay|BRRip|WEB-DL|WEBRip|DVDRip|CAMRip|TS|TC|HDTV|PDTV|XviD|x264|x265|HEVC|DivX|AC3|AAC|MP3|Dubbed|Subbed|MultiAudio)\b\s*/gi;
            cleanedName = cleanedName.replace(qualityPatterns, ' ').trim();
            cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
            
            // Step 3: Remove bracketed content (except years)
            cleanedName = cleanedName.replace(/\[.*?\]/g, '').trim();
            cleanedName = cleanedName.replace(/\{.*?\}/g, '').trim();
            cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
            
            // Step 4: Build request data
            subtitleRequestData = {
                movie_name: cleanedName
            };
            
            // Step 5: Add TMDB ID (highest priority for matching)
            if (movieData.tmdb_id) {
                subtitleRequestData.tmdb_id = movieData.tmdb_id;
            }
            
            // Step 6: Add year for better matching
            if (extractedYear) {
                subtitleRequestData.year = extractedYear;
            } else if (movieData.year) {
                subtitleRequestData.year = movieData.year;
            }
            
            console.log('Movie subtitle request - Original:', originalName, 'Cleaned:', cleanedName, 'Year:', subtitleRequestData.year, 'TMDB:', subtitleRequestData.tmdb_id);
        } 
        // EPISODES: ExoApp API format - series with season/episode numbers
        else {
            var episodeName = movieData.title || movieData.name || movieData.episode_name || '';
            
            var parsedEpisode = this.parseEpisodeName(episodeName);
            
            if (parsedEpisode.season_number && parsedEpisode.episode_number) {
                // CORRECT EXOAPP FORMAT: Use season/episode numbers (API auto-detects type)
                subtitleRequestData = {
                    season_number: parseInt(parsedEpisode.season_number),
                    episode_number: parseInt(parsedEpisode.episode_number)
                };
                
                console.log('✅ Using ExoApp series format - Season:', parsedEpisode.season_number, 'Episode:', parsedEpisode.episode_number);
                
                // Store TMDB IDs for staged requests (series TMDB preferred for episodes)
                subtitleRequestData._series_tmdb_fallback = movieData.series_tmdb_id || null;
                subtitleRequestData._episode_tmdb_fallback = movieData.info ? movieData.info.tmdb_id : null;
                
            } else {
                // SMART FALLBACK: Use series name + season/episode from data structure
                console.log('⚠️ Episode parsing failed - using series data structure');
                
                // Get series name from movieData (now passed from vod_series_player.js)
                var seriesName = movieData.series_name;
                if (seriesName) {
                    seriesName = seriesName.replace(/\[.*?\]/g, '').trim(); // Remove [MultiAudio] etc
                }
                
                // Get season/episode from movieData structure  
                var seasonNum = movieData.season || null;
                var episodeNum = movieData.episode_num || null;
                
                if (seriesName && seasonNum && episodeNum) {
                    // Create proper "Series S01 E03" format
                    var seasonStr = 'S' + String(seasonNum).padStart(2, '0');
                    var episodeStr = 'E' + String(episodeNum).padStart(2, '0');
                    var properSeriesTitle = seriesName + ' ' + seasonStr + ' ' + episodeStr;
                    
                    subtitleRequestData = {
                        movie_name: properSeriesTitle
                    };
                    
                    console.log('✅ Using series structure format:', properSeriesTitle);
                } else {
                    // Last resort: use episode name only
                    console.log('⚠️ No series structure available - using episode title');
                    subtitleRequestData = {
                        movie_name: episodeName
                    };
                }
                
                // Store TMDB IDs for fallback
                subtitleRequestData._episode_tmdb_fallback = movieData.info ? movieData.info.tmdb_id : null;
                subtitleRequestData._series_tmdb_fallback = movieData.series_tmdb_id || null;
            }
            
            console.log('Episode subtitle request data:', {
                movie_type: subtitleRequestData.movie_type,
                tmdb_id: subtitleRequestData.tmdb_id,
                movie_name: subtitleRequestData.movie_name,
                original_episode: episodeName
            });
        }
        
        // STAGED REQUESTS: ExoApp API format with TMDB fallbacks
        var that = this;
        
        // Clean up internal fallback fields before sending request
        var episodeTmdbFallback = subtitleRequestData._episode_tmdb_fallback;
        var seriesTmdbFallback = subtitleRequestData._series_tmdb_fallback;
        delete subtitleRequestData._episode_tmdb_fallback;
        delete subtitleRequestData._series_tmdb_fallback;
        
        // STAGE 1: Episode TMDB + Season/Episode (Most specific - ExoApp format)
        if(episodeTmdbFallback && subtitleRequestData.season_number && subtitleRequestData.episode_number) {
            var episodeRequestData = Object.assign({}, subtitleRequestData, {
                tmdb_id: String(episodeTmdbFallback)
            });
            
            this.makeSubtitleRequest(episodeRequestData, function(subtitles) {
                console.log('✅ Episode TMDB + season/episode matching successful');
                if(successCallback) {
                    successCallback(subtitles);
                }
            }, function(error) {
                // STAGE 2: Name-based fallback "Series S01 E01" (reliable for wrong TMDB)
                var parsedEpisode = that.parseEpisodeName(episodeName);
                
                if(parsedEpisode.series_name && parsedEpisode.season_number && parsedEpisode.episode_number) {
                    var seasonStr = 'S' + String(parsedEpisode.season_number).padStart(2, '0');
                    var episodeStr = 'E' + String(parsedEpisode.episode_number).padStart(2, '0');
                    var nameBasedTitle = parsedEpisode.series_name + ' ' + seasonStr + ' ' + episodeStr;
                    
                    var nameBasedRequest = {
                        movie_name: nameBasedTitle
                    };
                    
                    
                    that.makeSubtitleRequest(nameBasedRequest, function(subtitles) {
                        console.log('✅ Name-based series matching successful');
                        if(successCallback) {
                            successCallback(subtitles);
                        }
                    }, function(error2) {
                        // STAGE 3: Season/episode structure only (no TMDB, no name)
                        that.makeSubtitleRequest(subtitleRequestData, function(subtitles) {
                            console.log('✅ Season/episode structure matching successful');
                            if(successCallback) {
                                successCallback(subtitles);
                            }
                        }, function(error3) {
                            // STAGE 4: Series TMDB as last resort
                            if(seriesTmdbFallback) {
                                var seriesRequestData = Object.assign({}, subtitleRequestData, {
                                    tmdb_id: String(seriesTmdbFallback)
                                });
                                
                                that.makeSubtitleRequest(seriesRequestData, successCallback, errorCallback);
                            } else {
                                if(errorCallback) {
                                    errorCallback('No subtitles found in all stages');
                                }
                            }
                        });
                    });
                } else {
                    // Can't parse name - skip to season/episode structure
                    that.makeSubtitleRequest(subtitleRequestData, function(subtitles) {
                        console.log('✅ Season/episode structure matching successful');
                        if(successCallback) {
                            successCallback(subtitles);
                        }
                    }, function(error2) {
                        if(episodeTmdbFallback) {
                            var episodeRequestData = Object.assign({}, subtitleRequestData, {
                                tmdb_id: String(episodeTmdbFallback)
                            });
                            
                            that.makeSubtitleRequest(episodeRequestData, successCallback, errorCallback);
                        } else {
                            if(errorCallback) {
                                errorCallback('No subtitles found in all stages');
                            }
                        }
                    });
                }
            });
        } 
        // STAGE 1B: No episode TMDB - prioritize name-based matching  
        else if(subtitleRequestData.season_number && subtitleRequestData.episode_number) {
            
            var parsedEpisode = this.parseEpisodeName(episodeName);
            
            if(parsedEpisode.series_name && parsedEpisode.season_number && parsedEpisode.episode_number) {
                var seasonStr = 'S' + String(parsedEpisode.season_number).padStart(2, '0');
                var episodeStr = 'E' + String(parsedEpisode.episode_number).padStart(2, '0');
                var nameBasedTitle = parsedEpisode.series_name + ' ' + seasonStr + ' ' + episodeStr;
                
                var nameBasedRequest = {
                    movie_name: nameBasedTitle
                };
                
                
                this.makeSubtitleRequest(nameBasedRequest, function(subtitles) {
                    console.log('✅ Name-based series matching successful');
                    if(successCallback) {
                        successCallback(subtitles);
                    }
                }, function(error) {
                    // STAGE 2B: Season/episode structure fallback
                    that.makeSubtitleRequest(subtitleRequestData, function(subtitles) {
                        console.log('✅ Season/episode structure matching successful');
                        if(successCallback) {
                            successCallback(subtitles);
                        }
                    }, function(error2) {
                        // STAGE 3B: Series TMDB last resort
                        if(seriesTmdbFallback) {
                            var seriesRequestData = Object.assign({}, subtitleRequestData, {
                                tmdb_id: String(seriesTmdbFallback)
                            });
                            
                            that.makeSubtitleRequest(seriesRequestData, successCallback, errorCallback);
                        } else {
                            if(errorCallback) {
                                errorCallback('No subtitles found');
                            }
                        }
                    });
                });
            } else {
                // Can't parse name - fall back to season/episode structure
                this.makeSubtitleRequest(subtitleRequestData, function(subtitles) {
                    console.log('✅ Season/episode structure matching successful');
                    if(successCallback) {
                        successCallback(subtitles);
                    }
                }, function(error) {
                    if(seriesTmdbFallback) {
                        var seriesRequestData = Object.assign({}, subtitleRequestData, {
                            tmdb_id: String(seriesTmdbFallback)
                        });
                        
                        that.makeSubtitleRequest(seriesRequestData, successCallback, errorCallback);
                    } else {
                        if(errorCallback) {
                            errorCallback('No subtitles found');
                        }
                    }
                });
            }
        }
        // STAGE 1C: Movie format fallback (when episode parsing failed)
        else {
            
            // Try with any available TMDB ID first
            if(episodeTmdbFallback || seriesTmdbFallback) {
                var fallbackRequestData = Object.assign({}, subtitleRequestData, {
                    tmdb_id: String(episodeTmdbFallback || seriesTmdbFallback)
                });
                
                this.makeSubtitleRequest(fallbackRequestData, function(subtitles) {
                    console.log('✅ Movie format with TMDB successful');
                    if(successCallback) {
                        successCallback(subtitles);
                    }
                }, function(error) {
                    // Final fallback: movie name only
                    that.makeSubtitleRequest(subtitleRequestData, successCallback, errorCallback);
                });
            } else {
                this.makeSubtitleRequest(subtitleRequestData, successCallback, errorCallback);
            }
        }
    },
    
    /**
     * Make individual subtitle API request
     * @param {Object} requestData - Subtitle request data
     * @param {Function} successCallback - Success callback
     * @param {Function} errorCallback - Error callback
     */
    makeSubtitleRequest: function(requestData, successCallback, errorCallback) {
        $.ajax({
            method: 'post',
            url: this.apiUrl,
            data: requestData,
            dataType: 'json',
            timeout: 10000, // 10 second timeout
            success: function(result) {
                if(result.status === 'success' && result.subtitles && result.subtitles.length > 0) {
                    // Mark subtitles as API source
                    result.subtitles.forEach(function(subtitle) {
                        subtitle.source = 'api';
                        subtitle.apiData = subtitle;
                    });
                    
                    if(successCallback) {
                        successCallback(result.subtitles);
                    }
                } else {
                    if(errorCallback) {
                        errorCallback('No subtitles found');
                    }
                }
            },
            error: function(xhr, status, error) {
                if(errorCallback) {
                    errorCallback(error);
                }
            }
        });
    },
    
    /**
     * Get native subtitle tracks from the current media player
     * @returns {Array} Array of native subtitle tracks
     */
    getNativeSubtitles: function() {
        var nativeSubtitles = [];
        
        try {
            if(typeof media_player !== 'undefined' && media_player.getSubtitleOrAudioTrack) {
                var tracks = media_player.getSubtitleOrAudioTrack("TEXT");
                if(tracks && tracks.length > 0) {
                    tracks.forEach(function(track, index) {
                        var label, language, trackIndex;
                        
                        // Handle Samsung vs LG track structure differences based on data shape
                        if(track.extra_info) {
                            // Samsung structure: track.extra_info contains track_lang and index
                            var extraInfo = typeof track.extra_info === 'string' ? 
                                JSON.parse(track.extra_info) : track.extra_info;
                            language = extraInfo.track_lang || 'unknown';
                            label = 'Track ' + (index + 1) + ' (' + language + ')';
                            // Use Samsung's canonical index for proper track selection
                            trackIndex = extraInfo.index !== undefined ? extraInfo.index : index;
                        } else {
                            // LG structure: track.label, track.language
                            label = track.label || 'Native Track ' + (index + 1);
                            language = track.language || 'unknown';
                            trackIndex = track.index !== undefined ? track.index : index;
                        }
                        
                        nativeSubtitles.push({
                            source: 'native',
                            index: trackIndex,
                            originalIndex: trackIndex,
                            label: label,
                            language: language
                        });
                    });
                }
            }
        } catch(e) {
            console.error('Error getting native subtitles:', e);
        }
        
        return nativeSubtitles;
    },
    
    /**
     * Combine API and native subtitles into a single list
     * @param {Array} apiSubtitles - Subtitles from API
     * @param {Array} nativeSubtitles - Native subtitle tracks
     * @returns {Array} Combined subtitle list
     */
    combineSubtitles: function(apiSubtitles, nativeSubtitles) {
        var combined = [];
        
        // Add "Off" option first
        combined.push({
            source: 'off',
            label: 'Turn Off Subtitles',
            language: 'none'
        });
        
        // Add API subtitles
        if(apiSubtitles && apiSubtitles.length > 0) {
            combined = combined.concat(apiSubtitles);
        }
        
        // Add native subtitles
        if(nativeSubtitles && nativeSubtitles.length > 0) {
            combined = combined.concat(nativeSubtitles);
        }
        
        return combined;
    },
    
    /**
     * Enhanced Episode Name Parser following exoapp methodology
     * @param {string} episodeName - Episode name to parse
     * @returns {Object} Parsed episode data
     */
    parseEpisodeName: function(episodeName) {
        var result = {
            series_name: null,
            season_number: null,
            episode_number: null,
            episode_title: null
        };
        
        if (!episodeName || typeof episodeName !== 'string') {
            return result;
        }
        
        var cleanedName = episodeName.trim();
        
        // Step 1: Remove country/language codes (TR:, ES:, EN:, etc.)
        cleanedName = cleanedName.replace(/^[A-Z]{2}:\s*/i, '');
        
        // Step 2: Try multiple season/episode patterns
        var seasonEpisodePatterns = [
            // "Series Name S01 E01" or "Series Name S01E01"
            /^(.+?)\s+S(\d{1,2})\s*E(\d{1,2})(?:\s*-\s*(.+))?$/i,
            // "Series Name Season 1 Episode 1"
            /^(.+?)\s+Season\s+(\d{1,2})\s+Episode\s+(\d{1,2})(?:\s*-\s*(.+))?$/i,
            // "Series Name 1x01" or "Series Name 1x1"
            /^(.+?)\s+(\d{1,2})x(\d{1,2})(?:\s*-\s*(.+))?$/i,
            // "Series Name (2023) S01E01"
            /^(.+?)\s*\(\d{4}\)\s*S(\d{1,2})E(\d{1,2})(?:\s*-\s*(.+))?$/i
        ];
        
        // Try each pattern
        for (var i = 0; i < seasonEpisodePatterns.length; i++) {
            var match = cleanedName.match(seasonEpisodePatterns[i]);
            if (match) {
                result.series_name = match[1].trim();
                result.season_number = parseInt(match[2]);
                result.episode_number = parseInt(match[3]);
                if (match[4]) {
                    result.episode_title = match[4].trim();
                }
                break;
            }
        }
        
        // Step 3: If no pattern found, extract just series name
        if (!result.series_name) {
            var seriesOnly = cleanedName
                .replace(/\s*\(.*?\)/g, '') // Remove parentheses content
                .replace(/\s*\[.*?\]/g, '') // Remove brackets content  
                .replace(/\s*\{.*?\}/g, '') // Remove curly braces content
                .replace(/\s*-\s*Episode.*$/i, '') // Remove "- Episode X" suffix
                .replace(/\s*Ep\s*\d+.*$/i, '') // Remove "Ep 1" suffix
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
                
            if (seriesOnly && seriesOnly.length > 2) {
                result.series_name = seriesOnly;
            }
        }
        
        // Step 4: Clean and normalize the series name
        if (result.series_name) {
            result.series_name = result.series_name
                .replace(/\s*\(.*?\)/g, '') // Remove remaining parentheses
                .replace(/\s*\[.*?\]/g, '') // Remove remaining brackets
                .replace(/\s*\{.*?\}/g, '') // Remove remaining braces
                .replace(/[^\w\s&'-]/g, ' ') // Keep only safe characters
                .replace(/\s+/g, ' ') // Normalize multiple spaces
                .trim();
        }
        
        return result;
    }
};