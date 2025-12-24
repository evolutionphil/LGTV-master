"use strict";
var SrtOperation={
    current_srt_index:0,
    next_srt_time:0,
    srt:[],
    stopped:false,
    subtitle_shown:false,
    init: function (subtitle, current_time) {
        
        // Same seconds logic as Samsung - simple and direct
        // Clear existing subtitles
        $('#' + media_player.parent_id).find('.subtitle-container').html('');
        this.subtitle_shown = false;
        
        // Parse SRT content
        var srt = [];
        if(subtitle && subtitle.content) {
            try {
                SrtParser.init();
                srt = SrtParser.fromSrt(subtitle.content);
            } catch(e) {
                console.error('SRT parsing error:', e);
            }
        }
        
        this.srt = srt;
        if(srt.length > 0) {
            this.stopped = false;
            // Find starting subtitle index using binary search - same as Samsung
            this.current_srt_index = this.findIndex(current_time, 0, srt.length - 1);
            if(this.current_srt_index < 0) this.current_srt_index = 0;
            
        } else {
            this.stopped = true;
        }
        this.next_srt_time = 0;
        
        // Apply global subtitle settings immediately after initialization
        this.applyUserStyles();
    },
    findIndex: function (time,start, end) {  // we will use binary search algorithm here
        if(time==0)
            return 0;

        // Base Condition
        var arr=this.srt;
        if (start > end)
            return end;
        // Find the middle index
        let mid=Math.floor((start + end)/2);

        // Compare mid with given key x
        if (arr[mid].startSeconds<=time && time<arr[mid].endSeconds)
            return mid;


        // If element at mid is greater than x,
        // search in the left half of mid
        if(arr[mid].startSeconds > time)
            return this.findIndex(time, start, mid-1);
        else
            // If element at mid is smaller than x,
            // search in the right half of mid
            return this.findIndex(time, mid+1, end);
    },
    timeChange: function(current_time) {
        // Same seconds logic as Samsung but with better progression handling + DEBUG
        if(this.stopped || !this.srt || this.srt.length === 0) {
            return;
        }
        
        // Track video time for real backward seek detection
        var previous_time = this.last_video_time || 0;
        var is_real_backward_seek = current_time < (previous_time - 1.0); // 1 second tolerance for normal playback jitter
        this.last_video_time = current_time;
        
        var srt_index = this.current_srt_index;
        if(srt_index >= this.srt.length || srt_index < 0) {
            srt_index = this.findIndex(current_time, 0, this.srt.length - 1);
            this.current_srt_index = Math.max(0, srt_index);
            return;
        }
        
        var srt_item = this.srt[srt_index];
        
        
        // **SHOW SUBTITLE**: Current time within subtitle range - same timing as Samsung
        if(current_time >= srt_item.startSeconds && current_time < srt_item.endSeconds) {
            if(!this.subtitle_shown) {
                this.showSubtitle(srt_item.text);
                this.subtitle_shown = true;
            }
        }
        // **HIDE SUBTITLE**: Time passed subtitle end - handle progression
        else if(current_time >= srt_item.endSeconds) {
            var next_srt_item = this.srt[srt_index + 1];
            
            if(next_srt_item && current_time < next_srt_item.startSeconds) {
                // Gap between subtitles - hide current and advance index
                if(this.subtitle_shown) {
                    this.hideSubtitle();
                    this.subtitle_shown = false;
                }
                // FIX: Advance to next subtitle index to avoid getting stuck
                this.current_srt_index = srt_index + 1;
            } else if(next_srt_item && current_time >= next_srt_item.startSeconds && current_time < next_srt_item.endSeconds) {
                // Show next subtitle
                this.showSubtitle(next_srt_item.text);
                this.current_srt_index += 1;
                this.subtitle_shown = true;
            } else {
                // **SEEK DETECTION**: Use binary search to find correct index
                if(this.subtitle_shown) {
                    this.hideSubtitle();
                    this.subtitle_shown = false;
                }
                var new_index = this.findIndex(current_time, 0, this.srt.length - 1);
                this.current_srt_index = new_index;
            }
        }
        // **BACKWARDS SEEK**: Only detect REAL backward seeks, not gaps between subtitles  
        else if(current_time < srt_item.startSeconds && is_real_backward_seek) {
            if(this.subtitle_shown) {
                this.hideSubtitle();
                this.subtitle_shown = false;
            }
            var new_index = this.findIndex(current_time, 0, this.srt.length - 1);
            this.current_srt_index = new_index;
        }
        // **GAP HANDLING**: Video time before subtitle start but no real backward seek
        else if(current_time < srt_item.startSeconds) {
            if(this.subtitle_shown) {
                this.hideSubtitle();
                this.subtitle_shown = false;
            }
        }
    },
    showSubtitle: function(text) {
        // Enhanced subtitle display with better formatting
        var subtitleHtml = '<div class="subtitle-text">' + text.replace(/\n/g, '<br>') + '</div>';
        var subtitleContainer = $('#' + media_player.parent_id).find('.subtitle-container');
        
        // Only show container if there's actual text content
        if(text && text.trim() !== '') {
            subtitleContainer.html(subtitleHtml);
            subtitleContainer.show(); // Ensure container is visible when showing subtitles
            
            // Apply user settings AFTER inserting the HTML so styles apply to new elements
            this.applyUserStyles();
        } else {
            // If no text, hide the container completely
            this.hideSubtitle();
        }
    },
    
    applyUserStyles: function() {
        // Apply user subtitle settings from localStorage (saved by subtitle settings modal)
        var position = parseInt(localStorage.getItem('subtitle_position') || '10');
        // Use level-based size system for consistency
        var level = this.getSubtitleLevel();
        var size = this.getSubtitleSizeFromLevel(level);
        var bgType = localStorage.getItem('subtitle_background') || 'black';
        
        // Get background style based on saved setting
        var backgroundStyle = this.getBackgroundStyleFromType(bgType);
        
        // Apply ONLY positioning styles to subtitle container (no background)
        var subtitleContainer = $('#' + media_player.parent_id).find('.subtitle-container');
        subtitleContainer.css({
            'bottom': position + 'vh',
            'top': 'auto',
            // Remove all visual styling from container - only positioning
            'background': 'transparent',
            'padding': '0',
            'border-radius': '0'
        });
        
        // Apply ALL visual styles ONLY to subtitle text elements
        subtitleContainer.find('.subtitle-text').css({
            'font-size': size + 'px',
            'background': backgroundStyle.background,
            'color': backgroundStyle.color,
            'text-shadow': backgroundStyle.textShadow,
            'padding': backgroundStyle.padding,
            'border-radius': backgroundStyle.borderRadius,
            'box-shadow': backgroundStyle.boxShadow || 'none', // Add box-shadow control
            'border': backgroundStyle.border || 'none',        // Add border control
            'display': 'inline-block' // Ensure background only covers text area
        });
    },
    
    // Subtitle level system (matching vod_series_player.js)
    getSubtitleLevel: function() {
        var level = parseInt(localStorage.getItem('subtitle_level') || '2'); // Default to 'normal' (24px)
        return Number.isFinite(level) ? Math.max(0, Math.min(4, level)) : 2;
    },
    
    getSubtitleSizeFromLevel: function(level) {
        var sizes = [14, 18, 24, 32, 40]; // small, normal, large, extra-large, maximum
        return sizes[level] || 24; // Default to normal size
    },
    
    getBackgroundStyleFromType: function(bgType) {
        switch(bgType) {
            case 'transparent':
            case 'none':
                return {
                    background: 'transparent',
                    color: '#fff',
                    textShadow: 'none', // No shadows/outlines for transparent background
                    padding: '0px',     // No padding to avoid visible borders
                    borderRadius: '0px',
                    border: 'none',     // Remove any borders
                    boxShadow: 'none',  // Remove any shadows
                    outline: 'none'     // Remove any outlines
                };
            case 'black':
                return {
                    background: 'rgba(0,0,0,0.8)',
                    color: '#fff',
                    textShadow: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    boxShadow: 'none',
                    border: 'none'
                };
            case 'gray':
                return {
                    background: 'rgba(255,0,0,0.8)', // Changed to red
                    color: '#fff',
                    textShadow: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    boxShadow: 'none',
                    border: 'none'
                };
            case 'dark':
                return {
                    background: 'rgba(0,128,0,0.8)', // Changed to green
                    color: '#fff',
                    textShadow: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    boxShadow: 'none',
                    border: 'none'
                };
            default:
                return this.getBackgroundStyleFromType('black');
        }
    },

    getSizeValue: function(size) {
        var sizes = {
            'small': '18px',
            'medium': '24px', 
            'large': '32px',
            'extra-large': '40px'
        };
        return sizes[size] || '24px';
    },
    
    getBackgroundValue: function(color) {
        var backgrounds = {
            'transparent': 'transparent',
            'black': 'rgba(0, 0, 0, 0.8)',
            'red': 'rgba(255, 0, 0, 0.8)',
            'white': 'rgba(255, 255, 255, 0.8)',
            'blue': 'rgba(0, 0, 255, 0.8)'
        };
        return backgrounds[color] || 'rgba(0, 0, 0, 0.8)';
    },
    
    getTextColorValue: function(color) {
        var colors = {
            'white': '#ffffff',
            'black': '#000000',
            'yellow': '#ffff00',
            'red': '#ff0000',
            'green': '#00ff00'
        };
        return colors[color] || '#ffffff';
    },
    
    getOutlineValue: function(textColor) {
        // Provide contrast outline based on text color
        if(textColor === 'white' || textColor === 'yellow') {
            return '1px 1px 2px rgba(0, 0, 0, 0.8)';
        } else {
            return '1px 1px 2px rgba(255, 255, 255, 0.8)';
        }
    },
    
    hideSubtitle: function() {
        var subtitleContainer = $('#' + media_player.parent_id).find('.subtitle-container');
        subtitleContainer.html(''); // Clear content
        subtitleContainer.hide(); // Hide the container completely
        
        // Also clear any background styling that might have been applied to container
        subtitleContainer.css({
            'background': 'transparent',
            'padding': '0',
            'border-radius': '0'
        });
    },
    
    stopOperation: function () {
        this.stopped = true;
        this.hideSubtitle();
        this.subtitle_shown = false;
    },
    
    deStruct: function () {
        this.srt = [];
        this.stopped = true;
        this.hideSubtitle();
        this.current_srt_index = 0;
        this.subtitle_shown = false;
    }
}
