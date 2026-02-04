"use strict";
var media_player;
function initPlayer() {
    if(platform==='samsung'){
        media_player={
            videoObj:null,
            parent_id:'',
            STATES:{
                STOPPED: 0,
                PLAYING: 1,
                PAUSED: 2,
                PREPARED: 4
            },
            current_time:0,
            full_screen_state:0,
            reconnect_timer: null,
            reconnect_count: 0,
            reconnect_max_count: 20,
            reconnect_position: 0,
            url:'',
            id:'',
            init:function(id, parent_id) {
                console.log('[Player.init] ========== INIT START ==========');
                console.log('[Player.init] id:', id, 'parent_id:', parent_id);
                console.log('[Player.init] Previous parent_id was:', this.parent_id);
                console.log('[Player.init] Previous state was:', this.state);
                console.log('[Player.init] current_route:', typeof current_route !== 'undefined' ? current_route : 'undefined');
                
                this.id=id;
                this.parent_id=parent_id;
                this.STATES={
                    STOPPED: 0,
                    PLAYING: 1,
                    PAUSED: 2,
                    PREPARED: 4
                };
                this.state = this.STATES.STOPPED;
                this.parent_id=parent_id;
                this.current_time=0;
                this.videoObj = document.getElementById(id);
                console.log('[Player.init] videoObj found:', !!this.videoObj);
                
                $('#'+parent_id).find('.subtitle-container').hide();
                $('#' + parent_id).find('.video-reconnect-message').hide();
                this.full_screen_state=0;
                try{
                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                    console.log('[Player.init] setDisplayMethod AUTO_ASPECT_RATIO OK');
                }catch (e) {
                    console.log('[Player.init] setDisplayMethod ERROR:', e.message || e);
                }
                $('.video-resolution').text('Live');
                this.reconnect_count = 0;
                this.reconnect_position = 0;
                console.log('[Player.init] ========== INIT END ==========');
            },
            playAsync:function(url){
                console.log('[Player.playAsync] ========== PLAY START ==========');
                console.log('[Player.playAsync] URL:', url);
                console.log('[Player.playAsync] parent_id:', this.parent_id);
                console.log('[Player.playAsync] current state:', this.state, 'STOPPED=0');
                console.log('[Player.playAsync] current_route:', typeof current_route !== 'undefined' ? current_route : 'undefined');
                
                this.url=url;
                $('#'+this.parent_id).find('.video-error').hide();

                $('.video-loader').show();
                if (this.state > this.STATES.STOPPED) {
                    console.log('[Player.playAsync] Already playing, state:', this.state, '- RETURNING');
                    return;
                }
                if (!this.videoObj) {
                    console.log('[Player.playAsync] No videoObj - RETURNING');
                    return 0;
                }
                var that=this;
                try{
                    console.log('[Player.playAsync] Calling webapis.avplay.open()...');
                    webapis.avplay.open(url);
                    console.log('[Player.playAsync] open() SUCCESS');
                    this.setupEventListeners();
                    console.log('[Player.playAsync] Calling setDisplayArea from playAsync...');
                    this.setDisplayArea();
                    // webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_PLAY","PLAYER_BUFFER_SIZE_IN_BYTE", 1000); // 5 is in seconds
                    // webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_PLAY","PLAYER_BUFFER_SIZE_IN_SECOND", 4); // 5 is in seconds

                    console.log('here trying to open');
                    webapis.avplay.prepareAsync(
                        function(){
                            console.log('[Player.prepareAsync] ========== VIDEO PREPARED ==========');
                            console.log('[Player.prepareAsync] parent_id:', that.parent_id);
                            console.log('[Player.prepareAsync] current_route:', current_route);
                            
                            that.reconnect_count = 0;
                            $('#' + that.parent_id).find('.video-reconnect-message').hide();
                            console.log('[Player.prepareAsync] Video loaded, calling play()');
                            $('#'+that.parent_id).find('.video-error').hide();
                            $('#'+that.parent_id).find('.video-loader').hide();
                            that.state = that.STATES.PLAYING;
                            webapis.avplay.play();
                            console.log('[Player.prepareAsync] play() called');
                            
                            // Tizen 9.0 fix: Only use FULL_SCREEN for actual fullscreen playback
                            // For preview windows, use AUTO_ASPECT_RATIO to respect setDisplayRect
                            var isFullscreenContext = (current_route === 'vod-series-player-video') || 
                                (current_route === 'channel-page' && channel_page && channel_page.full_screen_video) ||
                                (that.parent_id === 'vod-series-player-page') ||
                                (that.parent_id === 'channel-page');
                            
                            console.log('[Player.prepareAsync] isFullscreenContext:', isFullscreenContext);
                            console.log('[Player.prepareAsync] parent_id check: vod-series-player-page=', that.parent_id === 'vod-series-player-page');
                            
                            try{
                                if(isFullscreenContext){
                                    that.full_screen_state=1;
                                    console.log('[Player.prepareAsync] Setting FULL_SCREEN mode');
                                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                                    console.log('[Player.prepareAsync] FULL_SCREEN mode set SUCCESS');
                                }else{
                                    that.full_screen_state=0;
                                    console.log('[Player.prepareAsync] Setting AUTO_ASPECT_RATIO mode (preview)');
                                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                                }
                            }catch (e) {
                                console.log('[Player.prepareAsync] setDisplayMethod ERROR:', e.message || e);
                            }
                            // Re-apply display area after mode is set
                            console.log('[Player.prepareAsync] Scheduling setDisplayArea in 100ms...');
                            setTimeout(function(){ 
                                console.log('[Player.prepareAsync] Delayed setDisplayArea NOW');
                                that.setDisplayArea(); 
                            }, 100);
                            $('#'+that.parent_id).find('.video-total-time').text(that.formatTime(webapis.avplay.getDuration()/1000));
                            $('#'+that.parent_id).find('.video-error').hide();
                            $('#'+that.parent_id).find('.progress-amount').css({width:0})
                            var attributes={
                                min: 0,
                                max:webapis.avplay.getDuration()/1000
                            };
                            $('#'+that.parent_id).find('.video-progress-bar-slider').attr(attributes)
                            $('#'+that.parent_id).find('.video-progress-bar-slider').rangeslider('update', true);
                            $('#'+that.parent_id).find('.video-current-time').text("00:00");
                            if(current_route==='vod-series-player-video')
                                vod_series_player.showResumeBar();
                            if(current_route==='channel-page'){
                                try{
                                    var stream_info=webapis.avplay.getCurrentStreamInfo();
                                    if(typeof stream_info[0]!='undefined'){
                                        var extra_info=JSON.parse(stream_info[0].extra_info);
                                        var w=extra_info.Width;
                                        var h=extra_info.Height;
                                        if(w && h && w!=='undefined' && h!=='undefined'){
                                            $('.video-resolution').text(w+' * '+h);
                                        }else{
                                            $('.video-resolution').text('Live');
                                        }
                                    }
                                }catch (e) {
                                    $('.video-resolution').text('Live');
                                }
                            }
                        },
                        function(e){
                            console.log('video loading failed',e);
                            $('.video-loader').hide();
                            $('#'+that.parent_id).find('.video-error').show();
                            if (that.reconnect_count < that.reconnect_max_count)
                                that.tryReconnect();
                        }
                    );
                }catch(e){
                    console.log('video loading failed',e);
                    $('.video-loader').hide();
                    $('#'+that.parent_id).find('.video-error').show();
                    if (that.reconnect_count < that.reconnect_max_count)
                        that.tryReconnect();
                }
                // console.log((new Date).getTime()/1000);
            },
            play:function(){
                this.state=this.STATES.PLAYING;
                try{
                    webapis.avplay.play();
                }catch(e){
                    console.log(e);
                }
            },
            pause:function() {
                this.state = this.STATES.PAUSED;
                try{
                    webapis.avplay.pause();
                }catch(e){
                    console.log(e);
                }
            },
            stop:function() {
                this.state = this.STATES.STOPPED;
                try{
                    webapis.avplay.stop();
                }catch (e) {
                }
                this.reconnect_count = 0;
                this.reconnect_position = 0;
                clearTimeout(this.reconnect_timer);
                $('#' + this.parent_id).find('.video-reconnect-message').hide();
            },
            close:function(){
                console.log('[Player.close] ========== CLOSE START ==========');
                console.log('[Player.close] Previous state:', this.state);
                console.log('[Player.close] Previous parent_id:', this.parent_id);
                console.log('[Player.close] current_route:', typeof current_route !== 'undefined' ? current_route : 'undefined');
                
                this.state = this.STATES.STOPPED;
                try{
                    webapis.avplay.stop();
                    console.log('[Player.close] stop() SUCCESS');
                }catch (e) {
                    console.log('[Player.close] stop() error (OK if not playing):', e.message || e);
                }
                try{
                    webapis.avplay.close();
                    console.log('[Player.close] close() SUCCESS');
                }catch (e) {
                    console.log('[Player.close] close() error:', e.message || e);
                }
                $('#' + this.parent_id).find('.video-error').hide();
                this.reconnect_count = 0;
                this.reconnect_position = 0;
                this.parent_id = '';
                this.videoObj = null;
                clearTimeout(this.reconnect_timer);
                $('#' + this.parent_id).find('.video-reconnect-message').hide();
                console.log('[Player.close] ========== CLOSE END ==========');
            },
            tryReconnect: function () {
                if (current_route !== 'channel-page' && 
                    !(current_route=='home-page' && home_page.current_preview_type==='live') &&
                    current_route !== 'vod-series-player-video')
                    return;
                clearTimeout(this.reconnect_timer);
                var reconnect_count=this.reconnect_count + 1;
                console.log("here reconnecting", this.reconnect_count);
                if (reconnect_count >= this.reconnect_max_count) {
                    $('#' + this.parent_id).find('.video-reconnect-message').hide();
                    return;
                }
                $('#' + this.parent_id).find('.video-reconnect-message').show();
                var that = this;
                try{
                    media_player.close();
                }catch (e) {
                }
                this.reconnect_count = reconnect_count;
                this.reconnect_timer = setTimeout(function () {
                    that.playAsync(that.url);
                }, 4000)
            },
            setDisplayArea:function() {
                var that = this;
                console.log('[setDisplayArea] ========== SET DISPLAY AREA START ==========');
                console.log('[setDisplayArea] videoObj id:', this.videoObj ? this.videoObj.id : 'NO ELEMENT');
                console.log('[setDisplayArea] parent_id:', this.parent_id);
                console.log('[setDisplayArea] current_route:', typeof current_route !== 'undefined' ? current_route : 'undefined');
                console.log('[setDisplayArea] full_screen_state:', this.full_screen_state);
                
                // Get the video container element
                var $video = $(this.videoObj);
                if (!$video.length) {
                    console.log('[setDisplayArea] ERROR: Video element not found! parent_id=' + this.parent_id);
                    return;
                }
                
                // Determine if this is preview mode
                var isPreview = (this.parent_id === 'home-page');
                console.log('[setDisplayArea] isPreview:', isPreview);
                
                // Check if we should be fullscreen based on route
                var isFullscreenRoute = (current_route === 'vod-series-player-video') || 
                    (current_route === 'channel-page') ||
                    (this.parent_id === 'vod-series-player-page') ||
                    (this.parent_id === 'channel-page');
                console.log('[setDisplayArea] isFullscreenRoute:', isFullscreenRoute);
                
                var top_position, left_position, width, height;
                
                if (isPreview && !isFullscreenRoute) {
                    // Fixed preview position (top-left corner with padding)
                    var $container = $('#home-page-video-preview');
                    console.log('[setDisplayArea] Preview container found:', $container.length > 0);
                    if ($container.length) {
                        var containerOffset = $container.offset();
                        console.log('[setDisplayArea] Container offset raw:', containerOffset);
                        console.log('[setDisplayArea] Container size raw:', $container.width(), 'x', $container.height());
                        left_position = Math.round(containerOffset.left) || 60;
                        top_position = Math.round(containerOffset.top) || 80;
                        width = Math.round($container.width()) || 640;
                        height = Math.round($container.height()) || 360;
                    } else {
                        // Fallback fixed values
                        console.log('[setDisplayArea] Using fallback preview values');
                        left_position = 60;
                        top_position = 80;
                        width = 640;
                        height = 360;
                    }
                } else {
                    // Fullscreen - use full screen dimensions
                    console.log('[setDisplayArea] FULLSCREEN MODE');
                    console.log('[setDisplayArea] videoObj offset:', $video.offset());
                    console.log('[setDisplayArea] videoObj size:', $video.width(), 'x', $video.height());
                    console.log('[setDisplayArea] window size:', window.innerWidth, 'x', window.innerHeight);
                    
                    // For fullscreen, use 0,0 and full screen dimensions
                    if (isFullscreenRoute) {
                        left_position = 0;
                        top_position = 0;
                        width = window.innerWidth || 1920;
                        height = window.innerHeight || 1080;
                        console.log('[setDisplayArea] Using full screen values (0,0)');
                    } else {
                        top_position = Math.round($video.offset().top);
                        left_position = Math.round($video.offset().left);
                        width = parseInt($video.width()) || window.innerWidth;
                        height = parseInt($video.height()) || window.innerHeight;
                    }
                }
                
                console.log('[setDisplayArea] FINAL RECT: x=' + left_position + ', y=' + top_position + ', w=' + width + ', h=' + height);
                
                // Samsung 4K fix: use delay before setDisplayRect
                setTimeout(function() {
                    try {
                        console.log('[setDisplayArea] Calling setDisplayRect NOW with:', left_position, top_position, width, height);
                        webapis.avplay.setDisplayRect(left_position, top_position, width, height);
                        console.log('[setDisplayArea] setDisplayRect SUCCESS');
                    } catch(e) {
                        console.log('[setDisplayArea] setDisplayRect ERROR:', e.message || e);
                    }
                    console.log('[setDisplayArea] ========== SET DISPLAY AREA END ==========');
                }, 250);
            },
            toggleScreenRatio:function(){
                if(this.full_screen_state==1){
                    try{
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                        this.full_screen_state=0;
                    }catch (e) {
                    }
                }else{
                    try{
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                        this.full_screen_state=1;
                    }catch (e) {
                    }
                }
            },
            formatTime:function(seconds) {
                var hh = Math.floor(seconds / 3600),
                    mm = Math.floor(seconds / 60) % 60,
                    ss = Math.floor(seconds) % 60;
                return (hh ? (hh < 10 ? "0" : "") + hh + ":" : "") +
                    ((mm < 10) ? "0" : "") + mm + ":" +
                    ((ss < 10) ? "0" : "") + ss;
            },
            setupEventListeners:function() {
                var that = this;
                var listener = {
                    onbufferingstart: function() {
                        $('#'+that.parent_id).find('.video-loader').show();
                        // console.log("Buffereing Start time "+(new Date()).getTime()/1000)
                    },
                    onbufferingprogress: function(percent) {
                        // console.log("Buffering progress: "+percent);
                    },
                    onbufferingcomplete: function() {
                        $('#'+that.parent_id).find('.video-loader').hide();
                        that.reconnect_count = 0;
                        $('#' + that.parent_id).find('.video-reconnect-message').hide();
                        if (that.reconnect_position > 0) {
                            try {
                                console.log('Reconnect: Seeking to position', that.reconnect_position);
                                webapis.avplay.seekTo(that.reconnect_position);
                                that.reconnect_position = 0;
                            } catch (e) {
                                console.log('Reconnect: Seek failed', e);
                            }
                        }
                    },
                    onstreamcompleted: function() {
                        // console.log('video has ended.');
                        $('#'+that.parent_id).find('.video-error').hide();
                        webapis.avplay.stop();
                        that.state = that.STATES.STOPPED;
                        $('#'+that.parent_id).find('.progress-amount').css({width:'100%'})
                        if(current_route==='vod-series-player-video'){
                            vod_series_player.showNextVideo(1);
                        }
                    },
                    oncurrentplaytime: function(currentTime) {
                        that.current_time=currentTime;
                        if(current_route==='vod-series-player-video')
                            vod_series_player.current_time=currentTime/1000;
                        $('#'+that.parent_id).find('.video-error').hide();
                        var duration =  webapis.avplay.getDuration();
                        if (duration > 0) {
                            $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime/1000).change();
                            $('#'+that.parent_id).find('.video-current-time').html(that.formatTime(currentTime/1000));
                            $('#'+that.parent_id).find('.progress-amount').css({width:currentTime/duration*100+'%'});
                        }
                    },
                    ondrmevent: function(drmEvent, drmData) {
                        // console.log("DRM callback: " + drmEvent + ", data: " + drmData);
                    },
                    onerror : function(type, data) {
                        $('#' + that.parent_id).find('.video-error').show();
                        if (that.current_time > 0) {
                            that.reconnect_position = that.current_time;
                            console.log('Reconnect: Saved position', that.reconnect_position);
                        } else {
                            that.reconnect_position = 0;
                        }
                        if (that.reconnect_count < that.reconnect_max_count)
                            that.tryReconnect();
                    },
                    onsubtitlechange: function(duration, text, data3, data4) {
                        $('#'+that.parent_id).find('.subtitle-container').html("");
                        $('#'+that.parent_id).find('.subtitle-container').html(text);
                        // console.log($('#'+that.parent_id).find('.subtitle-container'));
                        // console.log(that.parent_id,"subtitleText: ",text,data3,data4);
                    }
                }
                webapis.avplay.setListener(listener);
            },
            onDeviceReady:function() {
                document.addEventListener('pause', media_player.onPause);
                document.addEventListener('resume', media_player.onResume);
            },
            onPause:function() {
                this.pause();
            },
            onResume:function() {
                this.play();
            },
            getSubtitleOrAudioTrack:function(kind){
                var result=[];
                // result=[
                //     {
                //         extra_info:{
                //             fourCC: "un",
                //             subtitle_type: "0",
                //             track_lang: "un",
                //             index: 3,
                //             type: "TEXT"
                //         }
                //     }
                // ]
                // return result;
                var all_track_str="";
                var key=kind==="TEXT" ? "track_lang" : "language";
                var default_track_text=kind==="TEXT" ? "Subtitle " : "Audio Track ";
                try{
                    var totalTrackInfo=webapis.avplay.getTotalTrackInfo();
                    console.log(kind, totalTrackInfo);
                    for(var i=0; i<totalTrackInfo.length;i++)
                    {
                        try{
                            if(totalTrackInfo[i].type == kind){
                                var extra_info=JSON.parse(totalTrackInfo[i].extra_info);
                                if(kind==='TEXT' || kind==='AUDIO'){
                                    var language=extra_info[key].trim();
                                    var lower_language=language.toLowerCase();
                                    if(!all_track_str.includes(language) && language!=='' && lower_language!='und' && lower_language!='undefined' && lower_language!='undetermined'){
                                        all_track_str+=(", "+language);
                                        extra_info[key]=typeof language_codes[language]!="undefined" ? language_codes[language] : language;
                                        totalTrackInfo[i].extra_info=extra_info;
                                        result.push(totalTrackInfo[i]);
                                    }
                                    else if(language=='' || lower_language=='und' || lower_language=='undefined' || lower_language=='undetermined'){
                                        extra_info[key]=default_track_text+(i+1);
                                        totalTrackInfo[i].extra_info=extra_info;
                                        result.push(totalTrackInfo[i]);
                                    }
                                }else{
                                    totalTrackInfo[i].extra_info=extra_info;
                                    result.push(totalTrackInfo[i]);
                                }
                            }
                        }catch (e) {
                            console.log(kind, e);
                        }
                    }
                    // console.log(kind, result);
                }catch (e) {

                }
                console.log(result);
                return result;
            },
            setSubtitleOrAudioTrack:function(kind, index){
                try{
                    if(index>-1){
                        webapis.avplay.setSilentSubtitle(true);
                        webapis.avplay.setSelectTrack(kind,index);
                        webapis.avplay.setSilentSubtitle(false);
                    }else{
                        webapis.avplay.setSilentSubtitle(false);
                    }
                }catch (e) {
                }
                if(kind==='TEXT' && index>-1){
                    $('#'+this.parent_id).find('.subtitle-container').show();
                }
            },
            seekTo:function(step){
                var current_page_variable;
                if(current_route==='epg-page')
                    current_page_variable=epg_page;
                if(current_page_variable.current_time===0)
                    current_page_variable.current_time=this.current_time/1000;
                var duration=webapis.avplay.getDuration()/1000;
                var newTime = current_page_variable.current_time + step;
                if(newTime<0)
                    newTime=0;
                if(newTime>=duration)
                    newTime=duration;
                current_page_variable.current_time=newTime;

                webapis.avplay.seekTo(newTime*1000);
                if (duration > 0) {
                    $('#'+this.parent_id).find('.video-progress-bar-slider').val(newTime).change();
                    $('#'+this.parent_id).find('.video-current-time').html(this.formatTime(newTime));
                }
            }
        }
    }
    else if(platform==='lg'){
        media_player={
            id:'',
            videoObj:null,
            parent_id:'',
            current_time:0,
            STATES:{
                STOPPED: 0,
                PLAYING: 1,
                PAUSED: 2,
                PREPARED: 4
            },
            next_video_timer:false,
            next_video_showing:false,
            subtitles:[],
            tracks:[],
            init:function(id, parent_id) {
                id+='-lg';
                this.next_video_showing=false;
                clearTimeout(this.next_video_timer);
                this.id=id;
                this.videoObj=null;     // tag video
                this.parent_id=parent_id;
                this.current_time=0;
                this.state = this.STATES.STOPPED;
                $('#'+this.parent_id).find('.video-loader').show();
                this.subtitles=[];
                this.tracks=[];
                SrtOperation.deStruct();

                this.videoObj = document.getElementById(id);
                var videoObj=this.videoObj;
                var that=this;
                this.videoObj.addEventListener("error", function(e) {
                    console.log('error',e);
                    $('#'+that.parent_id).find('.video-loader').show();
                    $('#'+that.parent_id).find('.video-error').show();
                });
                this.videoObj.addEventListener("canplay", function(e) {
                    console.log("Can play")
                    $('#'+that.parent_id).find('.video-error').hide();
                    // console.log('Video can start, but not sure it will play through.');
                });
                this.videoObj.addEventListener('durationchange', function(event){
                    $('#'+that.parent_id).find('.video-error').hide();
                    // console.log('Not sure why, but the duration of the video has changed.');
                });
                this.videoObj.addEventListener('loadeddata', function(event){
                    var duration=parseInt(videoObj.duration);
                    var attributes={
                        min: 0,
                        max:duration,
                    };
                    $('#'+that.parent_id).find('.video-loader').hide();
                    $('#'+that.parent_id).find('.video-progress-bar-slider').attr(attributes)
                    $('#'+that.parent_id).find('.video-progress-bar-slider').rangeslider('update', true);
                    if(current_route==='vod-series-player-video'){
                        vod_series_player.showResumeBar();
                    }
                });
                this.videoObj.ontimeupdate = function(event){
                    $('#'+that.parent_id).find('.video-error').hide();
                    var duration =  videoObj.duration;
                    var currentTime=videoObj.currentTime;
                    if(current_route==='vod-series-player-video') {
                        vod_series_player.current_time=currentTime;
                        SrtOperation.timeChange(videoObj.currentTime);
                    }
                    if (duration > 0) {
                        $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime).change();
                        $('#'+that.parent_id).find('.video-current-time').html(that.formatTime(currentTime));
                        $('#'+that.parent_id).find('.progress-amount').css({width:currentTime/duration*100+'%'});
                    }
                };
                this.videoObj.addEventListener('loadedmetadata', function() {
                    var duration=parseInt(videoObj.duration);
                    var attributes={
                        min: 0,
                        max:duration,
                    };
                    $('#'+that.parent_id).find('.video-total-time').text(that.formatTime(duration));
                    $('#'+that.parent_id).find('.video-progress-bar-slider').attr(attributes)
                    $('#'+that.parent_id).find('.video-progress-bar-slider').rangeslider('update', true);
                });
                this.videoObj.addEventListener('waiting', function(event){
                    // console.log('Video is waiting for more data.',event);
                });
                this.videoObj.addEventListener('suspend', function(event){
                    // console.log('Data loading has been suspended.');
                    // $('#'+this.parent_id).find('.video-error').show();
                });
                this.videoObj.addEventListener('stalled', function(event){
                    console.log('Failed to fetch data, but trying.');
                    // $('#'+this.parent_id).find('.video-error').show();
                });
                this.videoObj.addEventListener('ended', function(event){
                    // console.log("\n\n\n",'video duration='+that.videoObj.duration);
                    if(current_route==='vod-series-player-video'){
                        if(that.videoObj.duration>0 && !isNaN(that.videoObj.duration))
                            vod_series_player.showNextVideo(1);
                    }
                });
                // this.videoObj.addEventListener('emptied', function(event){
                //     console.log('Uh oh. The media is empty. Did you call load()?');
                //     $('#'+this.parent_id).find('.video-error').show();
                // });
            },
            playAsync:function(url){
                console.log(url);
                if(url){
                    try{
                        this.videoObj.pause();
                    }catch (e) {

                    }
                    var that=this;
                    $('#'+this.parent_id).find('.video-error').hide();
                    $('#'+this.parent_id).find('.video-loader').show();
                    while (this.videoObj.firstChild)
                        this.videoObj.removeChild(this.videoObj.firstChild);
                    this.videoObj.load();
                    var source = document.createElement("source");
                    source.setAttribute('src',url);
                    this.videoObj.appendChild(source);
                    this.videoObj.play();
                    $('#'+this.parent_id).find('.progress-amount').css({width:0})

                    source.addEventListener("error", function(e) {
                        $('#'+that.parent_id).find('.video-error').show();
                    });
                }
                this.state=this.STATES.PLAYING;
            },
            play:function(){
                this.state=this.STATES.PLAYING;
                try{
                    this.videoObj.play();
                }catch(e){
                    console.log(e);
                }
                if(SrtOperation.srt.length>0)  // if has subtitles
                    SrtOperation.stopped=false;
            },
            pause:function() {
                this.state = this.STATES.PAUSED;
                try{
                    this.videoObj.pause();
                }catch (e) {
                }
            },
            stop:function() {
                try{
                    this.videoObj.pause();
                }catch (e) {
                }
                SrtOperation.deStruct();
                this.subtitles=[];
            },
            close:function(){
                try{
                    this.videoObj.pause();
                }catch (e) {
                }
                SrtOperation.deStruct();
                this.subtitles=[];
            },
            toggleScreenRatio:function(){

            },
            setDisplayArea:function(){

            },
            formatTime:function(seconds) {
                var hh = Math.floor(seconds / 3600),
                    mm = Math.floor(seconds / 60) % 60,
                    ss = Math.floor(seconds) % 60;
                return (hh ? (hh < 10 ? "0" : "") + hh + ":" : "") +
                    ((mm < 10) ? "0" : "") + mm + ":" +
                    ((ss < 10) ? "0" : "") + ss;
            },
            seekTo:function(seekTime){

            },
            getSubtitleOrAudioTrack:function(kind){
                var totalTrackInfo=[],temps;
                if(kind=="TEXT"){
                    temps=media_player.videoObj.textTracks.length > 0 ? media_player.videoObj.textTracks : {};
                }else
                    temps=media_player.videoObj.audioTracks.length>0 ? media_player.videoObj.audioTracks : {};
                console.log(temps);
                if(Object.keys(temps).length>0){
                    Object.keys(temps).map(function (key,index) {
                        if(typeof temps[key]=='object' && temps[key]!=null)
                            totalTrackInfo.push(temps[key]);
                    })
                }
                console.log(totalTrackInfo);
                return totalTrackInfo;
            },
            setSubtitleOrAudioTrack:function(kind, index){
                if(kind==='TEXT'){
                    if(this.subtitles[index])
                        SrtOperation.init(this.subtitles[index],media_player.videoObj.currentTime);
                }else{
                    for (var i = 0; i < this.videoObj.audioTracks.length; i++) {
                        this.videoObj.audioTracks[i].enabled = false;
                    }
                    this.videoObj.audioTracks[index].enabled = true;
                }
            }
        }
    }
}
