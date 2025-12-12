"use strict";
var youtube_page={
    player:null,
    keys:{
        focused_part:"menu_selection",//"right_screen_part", search_selection
        menu_selection:0,
        player_selection:0
    },
    menu_items:[],
    is_loading:false,
    prev_focus_dom:null,
    playlist:null,
    done : false,
    is_paused:false,
    current_video_id:null,
    current_render_count:0,
    current_video_index:0,

    init:function (playlist) {
        this.current_render_count=0;
        this.current_video_id=null;
        this.playlist=playlist;
        $('#youtube-video-description').html('');
        $('#youtube-playlists-wrapper').html('');
        this.renderItems(playlist.items);
        home_page.Exit();
        $('#youtube-page').show();
        this.hoverMenuItem(0);
        this.showMovie();
        this.is_loading=false;
        current_route="youtube-page";
        this.current_video_index=0;
    },
    goBack:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                try{
                    this.player.destroy();
                }catch (e){
                }
                $('#youtube-page').hide();
                home_page.reEnter();
                break;
            case "full_screen":
                this.zoomInOut(false);
                this.hoverMenuItem(keys.menu_selection);
                break;
        }
    },
    renderItems: function (items) {
        var htmlContent='',current_render_count=this.current_render_count;
        items.map(function (item, index) {
            htmlContent+=
                '<div class="youtube-video-item-container">\
                    <div class="youtube-video-item-wrapper"\
                        onmouseenter="youtube_page.hoverMenuItem('+(current_render_count+index)+')" \
                        onclick="youtube_page.handleMenuClick()" \
                    >\
                        <img class="youtube-video-item-icon" src="'+item.icon+'"> \
                        <div class="youtube-video-item-title-wrapper">\
                            <span class="youtube-video-item-title max-line-3">'+item.title+'</span> \
                        </div> \
                    </div>\
                </div>'
        })
        $('#youtube-playlists-wrapper').append(htmlContent);
        this.menu_items=$('.youtube-video-item-wrapper');
        this.current_render_count=this.menu_items.length;
    },
    zoomInOut:function (zoom) {
        var keys=this.keys;
        if(zoom) {
            $('#youtube-page-player-container').addClass('full_screen');
            keys.focused_part='full_screen';
        }else {
            $('#youtube-page-player-container').removeClass('full_screen');
            this.hoverMenuItem(keys.menu_selection);
            // $(document.getElementById('youtube-page-player').contentWindow.document).keydown(function(e) {
            //     switch (e.keyCode) {
            //         case tvKey.RETURN:
            //             youtube_page.goBack();
            //             break;
            //         case tvKey.RIGHT:
            //             youtube_page.seekTo(5);
            //             break;
            //         case tvKey.LEFT:
            //             youtube_page.seekTo(-5);
            //             break;
            //         case tvKey.ENTER:
            //             youtube_page.playOrPause();
            //             break;
            //     }
            // });
        }
    },
    showMovie: function () {
        var keys=this.keys;
        var items=this.playlist.items;
        var playlist_item=items[keys.menu_selection];
        if(playlist_item.videoId===this.current_video_id) {
            if(keys.focused_part==='menu_selection')  // will make full screen
                this.zoomInOut(true);
        }else {
            if(playlist_item) {
                showLoader(true);
                this.is_loading=true;
                // $('#youtube-page-player').remove();
                // $('#youtube-page-player-container').html('<div id="youtube-page-player"></div>');
                $('#youtube-video-description').html(playlist_item.description);
                if(this.player)
                    this.player.destroy()
                var that=this;
                setTimeout(function (){
                    that.player = new YT.Player('youtube-page-player', {
                        height: '100%',
                        width: '100%',
                        videoId: playlist_item.videoId,
                        events: {
                            'onReady': youtube_page.onPlayerReady,
                            'onStateChange': youtube_page.onPlayerStateChange,
                            'onError':youtube_page.onPlayerError,
                            'onPlaybackQualityChange':youtube_page.onPlaybackQualityChange
                        },
                        playerVars: {
                            controls: 0,
                            loop: 1,
                            rel: 0,
                            enablejsapi: 1,
                            origin: window.location.origin || 'https://flixapp.net'
                        }
                    });
                },200)

                $("#youtube-page-player").on("load",function() {
                    if(current_route!='youtube-page')
                        return;
                    console.log("youtube page player loaded");
                    $("#youtube-page-player").contents().find('.ytp-chrome-top-buttons').hide();
                    $("#youtube-page-player").contents().find('.ytp-right-controls').hide();
                    $("#youtube-page-player").contents().find('.ytp-chrome-top').hide();
                    $("#youtube-page-player").contents().find('.ytp-watermark').hide();
                    showLoader(false);
                    youtube_page.is_loading=false;
                    $(document.getElementById('youtube-page-player').contentWindow.document).keydown(function(e) {
                        switch (e.keyCode) {
                            case tvKey.RETURN:
                                youtube_page.goBack();
                                break;
                            case tvKey.RIGHT:
                                youtube_page.seekTo(5);
                                break;
                            case tvKey.LEFT:
                                youtube_page.seekTo(-5);
                                break;
                            case tvKey.ENTER:
                                youtube_page.playOrPause();
                                break;
                        }
                    });
                });
            }
            this.current_video_id=playlist_item.videoId;
            this.current_video_index=keys.menu_selection;
        }
    },
    onPlayerReady:function(event) {
        showLoader(false);
        youtube_page.is_loading=false;
        $("#youtube-page-player").contents().find('.ytp-chrome-top-buttons').hide();
        $("#youtube-page-player").contents().find('.ytp-right-controls').hide();
        $("#youtube-page-player").contents().find('.ytp-chrome-top').hide();
        setTimeout(function (){
            $("#youtube-page-player").contents().find('.ytp-watermark').hide();
        },200)

        if(current_route==='youtube-page')
            event.target.playVideo();
    },
    onPlayerStateChange:function (event) {
        var data=event.data;
        if(data===YT.PlayerState.ENDED){
            youtube_page.showNextMovie(1);
        }

        console.log(event);
    },
    onPlayerError: function (event) {
        showLoader(false);
        youtube_page.is_loading = false;
        console.log('YouTube Player Error:', event);
        var errorCode = event.data;
        var errorMessages = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or removed',
            101: 'Video not allowed for embedded playback',
            150: 'Video not allowed for embedded playback'
        };
        var message = errorMessages[errorCode] || 'Error ' + errorCode;
        showToast('YouTube Error', message);
        try {
            if (youtube_page.player) {
                youtube_page.player.destroy();
                youtube_page.player = null;
            }
        } catch (e) {}
        youtube_page.current_video_id = null;
        youtube_page.hoverMenuItem(youtube_page.keys.menu_selection);
    },
    onPlaybackQualityChange: function (data) {
        console.log("playback quality changed", data);
    },
    playOrPause:function(){
        if(this.is_paused)
            this.player.playVideo();
        else
            this.player.pauseVideo();
        this.is_paused=!this.is_paused;
    },
    seekTo:function(step){
        var current_time=this.player.getCurrentTime();
        var new_time=current_time+step;
        var duration=this.player.getDuration();
        if(new_time<0)
            new_time=0;
        if(new_time>duration)
            new_time=duration;
        this.player.seekTo(new_time);
    },
    hoverMenuItem:function (index) {
        var keys=this.keys;
        keys.focused_part="menu_selection";
        keys.menu_selection=index;
        $(this.prev_dom).removeClass('active');
        $(this.menu_items[index]).addClass('active');
        this.prev_dom=this.menu_items[index];
        moveScrollPosition($('#youtube-playlists-wrapper'),this.menu_items[index],'vertical',false);
    },
    showNextMovie: function (increment) {
        var keys=this.keys;
        this.current_video_index+=increment;
        if(this.current_video_index<0)
            this.current_video_index=0;
        if(this.current_video_index>=this.menu_items.length)
            this.current_video_index=this.menu_items.length-1
        this.current_video_id=null;
        if(keys.focused_part!='full_screen')
            this.hoverMenuItem(this.current_video_index);
        else
            keys.menu_selection=this.current_video_index;
        this.showMovie();
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                this.showMovie();
                break;
            case 'full_screen':
                this.playOrPause();
                break;
        }
    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                var playlist=this.playlist;
                keys.menu_selection+=increment;
                if(keys.menu_selection<0)
                    keys.menu_selection=0;
                if(increment>0) {
                    if(keys.menu_selection>=this.menu_items.length)
                        keys.menu_selection=this.menu_items.length-1;
                    if(keys.menu_selection>=this.menu_items.length-3 && playlist.totalResults>playlist.items.length && playlist.nextPageToken) {  // get next 50 items
                        // var api_key="AIzaSyAW5Q2i0PgCteY6hAqIC8AQV-EYHRCTZDE";
                        var api_key=youtube_api_key;
                        var nextPageToken=playlist.nextPageToken ? playlist.nextPageToken : '';
                        var url="https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&part=id&part=snippet&maxResults=50&playlistId="+playlist.playlist_id+"&key="+api_key+"&pageToken="+nextPageToken;
                        var that=this;
                        showLoader(true);
                        this.is_loading=true;
                        $.ajax({
                            method:'get',
                            headers: {
                                accepts:'application/json'
                            },
                            url:url,
                            success:function (result) {
                                showLoader(false);
                                that.is_loading=false;
                                try{
                                    var items=result.items;
                                    var video_items=[];
                                    items.map(function (item){
                                        var snippet=item.snippet;
                                        if(snippet.title!='Deleted video'){
                                            if(!snippet.thumbnails.medium)
                                                console.log(snippet.thumbnails);
                                            var icon
                                            try {
                                                icon=snippet.thumbnails.medium.url;
                                            }catch (e) {
                                                icon='images/404.png';
                                            }
                                            video_items.push({
                                                title:snippet.title,
                                                description:snippet.description,
                                                icon:icon,
                                                videoId:snippet.resourceId.videoId
                                            })
                                        }
                                    })
                                    playlist.items=playlist.items.concat(video_items);
                                    if(result.nextPageToken)
                                        playlist.nextPageToken=result.nextPageToken;
                                    else
                                        playlist.nextPageToken='';
                                    if(result.pageInfo)
                                        playlist.totalResults=result.pageInfo.totalResults;
                                    that.renderItems(video_items);
                                }catch (e) {
                                    showLoader(false);
                                    that.is_loading=false;
                                    showToast('Sorry',"Error caused while fetching playlist contents");
                                }
                            },
                            error:function () {
                                showLoader(false);
                                that.is_loading=false;
                                showToast('Sorry',"Error caused while fetching playlist contents");
                            }
                        })
                    }
                }
                this.hoverMenuItem(keys.menu_selection);
                break;
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                break;
            case "full_screen":
                this.seekTo(5*increment);
                break;
        }
    },
    HandleKey:function(e) {
        var keys=this.keys;
        if(this.is_loading){
            if(e.keyCode===tvKey.RETURN){
                showLoader(false);
                this.is_loading=false;
                this.goBack();
            }
            return;
        }

        switch (e.keyCode) {
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1)
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1)
                break;
            case tvKey.DOWN:
                this.handleMenusUpDown(1);
                break;
            case tvKey.UP:
                this.handleMenusUpDown(-1);
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.CH_UP:
                this.showNextMovie(1);
                break;
            case tvKey.CH_DOWN:
                this.showNextMovie(-1);
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
        }
    }
}
