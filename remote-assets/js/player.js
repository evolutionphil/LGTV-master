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
            url:'',
            id:'',
            init:function(id, parent_id) {
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
                $('#'+parent_id).find('.subtitle-container').hide();
                $('#' + parent_id).find('.video-reconnect-message').hide();
                this.full_screen_state=0;
                try{
                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                }catch (e) {
                }
                $('.video-resolution').text('Live');
                this.reconnect_count = 0;
            },
            playAsync:function(url){
                console.log(url);
                this.url=url;
                $('#'+this.parent_id).find('.video-error').hide();

                $('.video-loader').show();
                if (this.state > this.STATES.STOPPED) {
                    return;
                }
                if (!this.videoObj) {
                    return 0;
                }
                var that=this;
                try{
                    webapis.avplay.open(url);
                    this.setupEventListeners();
                    this.setDisplayArea();
                    // webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_PLAY","PLAYER_BUFFER_SIZE_IN_BYTE", 1000); // 5 is in seconds
                    // webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_PLAY","PLAYER_BUFFER_SIZE_IN_SECOND", 4); // 5 is in seconds

                    console.log('here trying to open');
                    webapis.avplay.prepareAsync(
                        function(){
                            that.reconnect_count = 0;
                            $('#' + that.parent_id).find('.video-reconnect-message').hide();
                            console.log('here video loaded');
                            $('#'+that.parent_id).find('.video-error').hide();
                            $('#'+that.parent_id).find('.video-loader').hide();
                            that.state = that.STATES.PLAYING;
                            webapis.avplay.play();
                            try{
                                that.full_screen_state=1;
                                webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                            }catch (e) {
                            }
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
                clearTimeout(this.reconnect_timer);
                $('#' + this.parent_id).find('.video-reconnect-message').hide();
            },
            close:function(){
                this.state = this.STATES.STOPPED;
                try{
                    webapis.avplay.close();
                }catch (e) {
                }
                try {
                    $('#' + this.parent_id).find('.video-error').hide();
                    $('#' + this.parent_id).find('.video-loader').hide();
                } catch (e) {
                }
                this.reconnect_count = 0;
                clearTimeout(this.reconnect_timer);
                try {
                    $('#' + this.parent_id).find('.video-reconnect-message').hide();
                } catch (e) {
                }
            },
            tryReconnect: function () {
                if (current_route !== 'channel-page' && !(current_route=='home-page' && home_page.current_preview_type==='live'))
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
                var top_position=$(this.videoObj).offset().top;
                var left_position=$(this.videoObj).offset().left;
                var width=parseInt($(this.videoObj).width())
                var height=parseInt($(this.videoObj).height());
                console.log(top_position,left_position,width,height);
                // console.log(this.videoObj);
                webapis.avplay.setDisplayRect(left_position,top_position,width,height);
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
                        // console.log('Buffering Complete, Can play now!');
                        // console.log("Buffereing complete time "+(new Date()).getTime()/1000)
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
                this.videoObj=null;
                this.parent_id=parent_id;
                this.current_time=0;
                this.state = this.STATES.STOPPED;
                try {
                    $('#'+this.parent_id).find('.video-loader').show();
                } catch (e) {}
                this.subtitles=[];
                this.tracks=[];
                try {
                    SrtOperation.deStruct();
                } catch (e) {}

                this.videoObj = document.getElementById(id);
                if (!this.videoObj) {
                    console.log('LG video element not found:', id);
                    return;
                }
                var videoObj=this.videoObj;
                var that=this;
                try {
                    this.videoObj.addEventListener("error", function(e) {
                        try {
                            console.log('error',e);
                            $('#'+that.parent_id).find('.video-loader').show();
                            $('#'+that.parent_id).find('.video-error').show();
                        } catch (err) {}
                    });
                    this.videoObj.addEventListener("canplay", function(e) {
                        try {
                            console.log("Can play");
                            $('#'+that.parent_id).find('.video-error').hide();
                        } catch (err) {}
                    });
                    this.videoObj.addEventListener('durationchange', function(event){
                        try {
                            $('#'+that.parent_id).find('.video-error').hide();
                        } catch (err) {}
                    });
                    this.videoObj.addEventListener('loadeddata', function(event){
                        try {
                            var duration=parseInt(videoObj.duration) || 0;
                            var attributes={
                                min: 0,
                                max:duration
                            };
                            $('#'+that.parent_id).find('.video-loader').hide();
                            $('#'+that.parent_id).find('.video-progress-bar-slider').attr(attributes);
                            try {
                                $('#'+that.parent_id).find('.video-progress-bar-slider').rangeslider('update', true);
                            } catch (err) {}
                            if(current_route==='vod-series-player-video'){
                                try {
                                    vod_series_player.showResumeBar();
                                } catch (err) {}
                            }
                        } catch (err) {}
                    });
                    this.videoObj.ontimeupdate = function(event){
                        try {
                            $('#'+that.parent_id).find('.video-error').hide();
                            var duration = videoObj.duration || 0;
                            var currentTime = videoObj.currentTime || 0;
                            if(current_route==='vod-series-player-video') {
                                try {
                                    vod_series_player.current_time=currentTime;
                                    SrtOperation.timeChange(videoObj.currentTime);
                                } catch (err) {}
                            }
                            if (duration > 0) {
                                $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime).change();
                                $('#'+that.parent_id).find('.video-current-time').html(that.formatTime(currentTime));
                                $('#'+that.parent_id).find('.progress-amount').css({width:currentTime/duration*100+'%'});
                            }
                        } catch (err) {}
                    };
                    this.videoObj.addEventListener('loadedmetadata', function() {
                        try {
                            var duration=parseInt(videoObj.duration) || 0;
                            var attributes={
                                min: 0,
                                max:duration
                            };
                            $('#'+that.parent_id).find('.video-total-time').text(that.formatTime(duration));
                            $('#'+that.parent_id).find('.video-progress-bar-slider').attr(attributes);
                            try {
                                $('#'+that.parent_id).find('.video-progress-bar-slider').rangeslider('update', true);
                            } catch (err) {}
                        } catch (err) {}
                    });
                    this.videoObj.addEventListener('waiting', function(event){});
                    this.videoObj.addEventListener('suspend', function(event){});
                    this.videoObj.addEventListener('stalled', function(event){
                        console.log('Failed to fetch data, but trying.');
                    });
                    this.videoObj.addEventListener('ended', function(event){
                        try {
                            if(current_route==='vod-series-player-video'){
                                if(that.videoObj && that.videoObj.duration>0 && !isNaN(that.videoObj.duration))
                                    vod_series_player.showNextVideo(1);
                            }
                        } catch (err) {}
                    });
                } catch (e) {
                    console.log('LG init event listeners error:', e);
                }
            },
            playAsync:function(url){
                console.log(url);
                if(url){
                    try{
                        if(this.videoObj) this.videoObj.pause();
                    }catch (e) {}
                    var that=this;
                    try {
                        $('#'+this.parent_id).find('.video-error').hide();
                        $('#'+this.parent_id).find('.video-loader').show();
                    } catch (e) {}
                    try {
                        if(this.videoObj){
                            while (this.videoObj.firstChild)
                                this.videoObj.removeChild(this.videoObj.firstChild);
                            this.videoObj.load();
                            var source = document.createElement("source");
                            source.setAttribute('src',url);
                            this.videoObj.appendChild(source);
                            this.videoObj.play();
                            source.addEventListener("error", function(e) {
                                try {
                                    $('#'+that.parent_id).find('.video-error').show();
                                } catch (err) {}
                            });
                        }
                    } catch (e) {
                        console.log('LG playAsync error:', e);
                    }
                    try {
                        $('#'+this.parent_id).find('.progress-amount').css({width:0});
                    } catch (e) {}
                }
                this.state=this.STATES.PLAYING;
            },
            play:function(){
                this.state=this.STATES.PLAYING;
                try{
                    if(this.videoObj) this.videoObj.play();
                }catch(e){
                    console.log(e);
                }
                try {
                    if(SrtOperation && SrtOperation.srt && SrtOperation.srt.length>0)
                        SrtOperation.stopped=false;
                } catch (e) {}
            },
            pause:function() {
                this.state = this.STATES.PAUSED;
                try{
                    if(this.videoObj) this.videoObj.pause();
                }catch (e) {}
            },
            stop:function() {
                try{
                    if(this.videoObj) this.videoObj.pause();
                }catch (e) {}
                try {
                    SrtOperation.deStruct();
                } catch (e) {}
                this.subtitles=[];
            },
            close:function(){
                try{
                    if(this.videoObj) this.videoObj.pause();
                }catch (e) {}
                try {
                    SrtOperation.deStruct();
                } catch (e) {}
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
                var totalTrackInfo=[],temps={};
                try {
                    if(kind=="TEXT"){
                        temps=media_player.videoObj && media_player.videoObj.textTracks && media_player.videoObj.textTracks.length > 0 ? media_player.videoObj.textTracks : {};
                    }else{
                        temps=media_player.videoObj && media_player.videoObj.audioTracks && media_player.videoObj.audioTracks.length>0 ? media_player.videoObj.audioTracks : {};
                    }
                    console.log(temps);
                    if(temps && Object.keys(temps).length>0){
                        Object.keys(temps).map(function (key,index) {
                            if(typeof temps[key]=='object' && temps[key]!=null)
                                totalTrackInfo.push(temps[key]);
                        });
                    }
                } catch (e) {
                    console.log('LG getSubtitleOrAudioTrack error:', e);
                }
                console.log(totalTrackInfo);
                return totalTrackInfo;
            },
            setSubtitleOrAudioTrack:function(kind, index){
                try {
                    if(kind==='TEXT'){
                        if(this.subtitles[index])
                            SrtOperation.init(this.subtitles[index],media_player.videoObj.currentTime);
                    }else{
                        if(this.videoObj && this.videoObj.audioTracks){
                            for (var i = 0; i < this.videoObj.audioTracks.length; i++) {
                                this.videoObj.audioTracks[i].enabled = false;
                            }
                            if(this.videoObj.audioTracks[index])
                                this.videoObj.audioTracks[index].enabled = true;
                        }
                    }
                } catch (e) {
                    console.log('LG setSubtitleOrAudioTrack error:', e);
                }
            }
        }
    }
}
