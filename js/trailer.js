"use strict";
var trailer_page={
    player:null,
    playerFrame:null,
    playerUrl: 'https://flixapp.net/youtube-player.html',
    done : false,
    back_url:'home-page',
    is_paused:false,
    is_loading:false,
    currentTime: 0,
    duration: 0,
    
    init:function(videoId,prev_route){
        showLoader(true);
        this.is_loading=true;
        this.back_url=prev_route;
        this.is_paused=false;
        this.currentTime = 0;
        this.duration = 0;
        $('#series-summary-page').hide();
        $('#vod-summary-page').hide();
        $('#trailer-player-page').show();
        current_route="trailer-page";
        
        this.setupMessageListener();
        
        var iframe = document.getElementById('trailer-player');
        if (!iframe) {
            $('#trailer-player-page').html('<iframe id="trailer-player" style="width:100%;height:100%;border:none;"></iframe>');
            iframe = document.getElementById('trailer-player');
        }
        
        var playerSrc = this.playerUrl + '?videoId=' + encodeURIComponent(videoId);
        iframe.src = playerSrc;
        this.playerFrame = iframe;
        
        console.log('Trailer loading via flixapp player:', playerSrc);
    },
    
    setupMessageListener: function() {
        var that = this;
        if (this._messageHandler) {
            window.removeEventListener('message', this._messageHandler);
        }
        this._messageHandler = function(event) {
            if (current_route !== 'trailer-page') return;
            
            try {
                var message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (!message || !message.type) return;
                
                switch (message.type) {
                    case 'ready':
                        console.log('Trailer Player Ready');
                        showLoader(false);
                        that.is_loading = false;
                        break;
                    case 'stateChange':
                        console.log('Trailer State:', message.data.stateName);
                        if (message.data.state === 1) {
                            that.is_paused = false;
                        }
                        if (message.data.state === 2) {
                            that.is_paused = true;
                        }
                        if (message.data.state === 0) {
                            that.goBack();
                        }
                        break;
                    case 'error':
                        console.log('Trailer Error:', message.data);
                        showLoader(false);
                        that.is_loading = false;
                        showToast('Trailer Error', message.data.message || 'Video not available');
                        that.goBack();
                        break;
                    case 'timeUpdate':
                        that.currentTime = message.data.currentTime;
                        that.duration = message.data.duration;
                        break;
                }
            } catch (e) {
                console.log('Trailer message parse error:', e);
            }
        };
        window.addEventListener('message', this._messageHandler);
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
            var iframe = document.getElementById('trailer-player');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(JSON.stringify(message), '*');
            }
        } catch (e) {
            console.log('Trailer sendCommand error:', e);
        }
    },
    
    goBack:function(){
        current_route=this.back_url;
        
        this.sendCommand('stop');
        
        if (this._messageHandler) {
            window.removeEventListener('message', this._messageHandler);
            this._messageHandler = null;
        }
        
        $('#trailer-player-page').hide();
        var iframe = document.getElementById('trailer-player');
        if (iframe) {
            iframe.src = '';
        }
        $('#trailer-player-page').html('<div id="trailer-player"></div>');
        
        if(this.back_url==="vod-summary-page")
            $('#vod-summary-page').show();
        if(this.back_url==="series-summary-page")
            $('#series-summary-page').show();
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
        this.sendCommand('getState');
        var that = this;
        setTimeout(function() {
            var new_time = that.currentTime + step;
            if (new_time < 0) new_time = 0;
            if (that.duration > 0 && new_time > that.duration) new_time = that.duration;
            that.sendCommand('seek', { time: new_time });
        }, 100);
    },

    HandleKey:function (e) {
        if(this.is_loading){
            if(e.keyCode===tvKey.RETURN){
                this.goBack();
                showLoader(false);
                this.is_loading=false;
            }
            return;
        }
        switch (e.keyCode) {
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.RIGHT:
                this.seekTo(5);
                break;
            case tvKey.LEFT:
                this.seekTo(-5);
                break;
            case tvKey.ENTER:
                this.playOrPause();
                break;
        }
    }
}
