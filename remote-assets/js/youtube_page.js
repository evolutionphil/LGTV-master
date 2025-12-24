"use strict";
var youtube_page={
    player:null,
    playerFrame:null,
    playerUrl: 'https://flixapp.net/youtube-player.html',
    keys:{
        focused_part:"menu_selection",
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
    currentTime: 0,
    duration: 0,

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
        this.setupMessageListener();
    },
    setupMessageListener: function() {
        var that = this;
        window.removeEventListener('message', this.handleMessage);
        this.handleMessage = function(event) {
            try {
                var message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (!message || !message.type) return;
                
                switch (message.type) {
                    case 'ready':
                        console.log('YouTube Player Ready');
                        showLoader(false);
                        that.is_loading = false;
                        break;
                    case 'stateChange':
                        console.log('YouTube State:', message.data.stateName);
                        if (message.data.state === 0) {
                            that.showNextMovie(1);
                        }
                        if (message.data.state === 1) {
                            that.is_paused = false;
                        }
                        if (message.data.state === 2) {
                            that.is_paused = true;
                        }
                        break;
                    case 'error':
                        console.log('YouTube Error:', message.data);
                        showLoader(false);
                        that.is_loading = false;
                        showToast('YouTube Error', message.data.message);
                        that.current_video_id = null;
                        that.hoverMenuItem(that.keys.menu_selection);
                        break;
                    case 'timeUpdate':
                        that.currentTime = message.data.currentTime;
                        that.duration = message.data.duration;
                        break;
                    case 'currentState':
                        that.currentTime = message.data.currentTime;
                        that.duration = message.data.duration;
                        that.is_paused = (message.data.state === 2);
                        break;
                }
            } catch (e) {
                console.log('Message parse error:', e);
            }
        };
        window.addEventListener('message', this.handleMessage);
    },
    sendCommand: function(command, data) {
        var message = { command: command };
        if (data) {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    message[key] = data[key];
                }
            }
        }
        try {
            var iframe = document.getElementById('youtube-page-player');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(JSON.stringify(message), '*');
            }
        } catch (e) {
            console.log('sendCommand error:', e);
        }
    },
    goBack:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                window.removeEventListener('message', this.handleMessage);
                $('#youtube-page-player').attr('src', 'about:blank');
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
        }
    },
    showMovie: function () {
        var keys=this.keys;
        var items=this.playlist.items;
        var playlist_item=items[keys.menu_selection];
        if(playlist_item.videoId===this.current_video_id) {
            if(keys.focused_part==='menu_selection')
                this.zoomInOut(true);
        }else {
            if(playlist_item) {
                showLoader(true);
                this.is_loading=true;
                $('#youtube-video-description').html(playlist_item.description);
                
                var playerSrc = this.playerUrl + '?v=' + playlist_item.videoId;
                var iframe = document.getElementById('youtube-page-player');
                
                if (iframe.tagName === 'IFRAME') {
                    iframe.src = playerSrc;
                } else {
                    var container = document.getElementById('youtube-page-player-container');
                    var newIframe = document.createElement('iframe');
                    newIframe.id = 'youtube-page-player';
                    newIframe.src = playerSrc;
                    newIframe.style.width = '100%';
                    newIframe.style.height = '100%';
                    newIframe.style.border = 'none';
                    newIframe.setAttribute('allowfullscreen', 'true');
                    newIframe.setAttribute('allow', 'autoplay; encrypted-media');
                    
                    if (iframe) {
                        container.replaceChild(newIframe, iframe);
                    } else {
                        container.appendChild(newIframe);
                    }
                }
            }
            this.current_video_id=playlist_item.videoId;
            this.current_video_index=keys.menu_selection;
        }
    },
    playOrPause:function(){
        if(this.is_paused) {
            this.sendCommand('play');
        } else {
            this.sendCommand('pause');
        }
        this.is_paused=!this.is_paused;
    },
    seekTo:function(step){
        this.sendCommand('seekBy', { seconds: step });
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
                    if(playlist.nextPageToken && keys.menu_selection>=this.menu_items.length-5)
                        youtube_operation.addPagePlayListItems(playlist.id,playlist.nextPageToken);
                }
                this.hoverMenuItem(keys.menu_selection);
                break;
        }
    },
    HandleKey:function(e){
        if(this.is_loading)
            return;
        var keys=this.keys;
        switch (e.keyCode) {
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.UP:
                this.handleMenusUpDown(-1);
                break;
            case tvKey.DOWN:
                this.handleMenusUpDown(1);
                break;
            case tvKey.LEFT:
                if(keys.focused_part === 'full_screen')
                    this.seekTo(-10);
                break;
            case tvKey.RIGHT:
                if(keys.focused_part === 'full_screen')
                    this.seekTo(10);
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.PLAYPAUSE:
            case tvKey.PLAY:
            case tvKey.PAUSE:
            case tvKey.MEDIA_PLAY:
            case tvKey.MEDIA_PAUSE:
            case tvKey.MEDIA_PLAY_PAUSE:
                if(keys.focused_part === 'full_screen')
                    this.playOrPause();
                break;
            case tvKey.MEDIA_REWIND:
            case tvKey.MEDIA_FAST_FORWARD:
                if(keys.focused_part === 'full_screen') {
                    var step = e.keyCode === tvKey.MEDIA_REWIND ? -10 : 10;
                    this.seekTo(step);
                }
                break;
            case tvKey.MEDIA_TRACK_PREVIOUS:
                this.showNextMovie(-1);
                break;
            case tvKey.MEDIA_TRACK_NEXT:
                this.showNextMovie(1);
                break;
        }
    }
}
