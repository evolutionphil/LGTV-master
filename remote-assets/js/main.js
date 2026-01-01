//Initialize function
"use strict";
$(document).ready(function () {
    try{
        // Enhanced platform detection from exo app
        if (navigator.userAgent.indexOf('Tizen') > -1) {
            platform = 'samsung';
            console.log('Samsung Tizen platform detected');
        } else if (navigator.userAgent.indexOf('webOS') > -1) {
            platform = 'lg';
            console.log('LG webOS platform detected');
        } else if(window.navigator.userAgent.toLowerCase().includes('web0s') && 
           (window.PalmSystem || typeof window.PalmServiceBridge !== 'undefined')) {
            platform='lg';
            console.log('LG WebOS platform detected (fallback)');
        } else if (typeof tizen !== 'undefined' && tizen.systeminfo) {
            platform='samsung';
            console.log('Samsung Tizen platform detected (fallback)');
        } else {
            // Default to Samsung for compatibility
            platform='samsung';
            console.log('Browser/Other environment detected - using samsung compatibility mode');
        }
    }catch (e) {
        console.log('Platform detection error:', e);
        platform='samsung';
    }
    initKeys();
    initPlayer();
    if(platform==='samsung'){
        $('#home-page-video-preview-lg').hide();
        $('#channel-page-video-lg').hide();
        $('#catchup-page-video-lg').hide();
        $('#vod-series-player-video-lg').hide();
        $('#version-txt').text(samsung_version);
    }
    else if(platform==='lg'){
        $('#home-page-video-preview').hide();
        $('#channel-page-video').hide();
        $('#catchup-page-video').hide();
        $('#vod-series-player-video').hide();
        $('#version-txt').text(lg_version);
    }
    $('#app').addClass(platform);
    
    // Show version indicator on main page
    (function() {
        try {
            var baseVersion = platform === 'samsung' ? samsung_version : lg_version;
            var isRemote = false;
            var remoteVersion = baseVersion;
            
            // Check if we have cached manifest (means remote update is active)
            var cachedManifest = localStorage.getItem('flix_remote_manifest');
            if (cachedManifest) {
                try {
                    var manifest = JSON.parse(cachedManifest);
                    if (manifest.version) {
                        remoteVersion = manifest.version;
                        isRemote = true;
                    }
                } catch(e) {}
            }
            
            // Check if FlixBootstrapper loaded any files from cache
            if (typeof FlixBootstrapper !== 'undefined' && FlixBootstrapper.loadedFromCache && FlixBootstrapper.loadedFromCache.length > 0) {
                isRemote = true;
            }
            
            var versionText = 'v' + remoteVersion + (isRemote ? ' (remote)' : ' (local)');
            $('#app-version-indicator').text(versionText);
            console.log('[VersionIndicator] ' + versionText);
        } catch(e) {
            console.log('[VersionIndicator] Error:', e);
            $('#app-version-indicator').text('v? (error)');
        }
    })();
    setTimeout(function (){
        login_page.getPlayListDetail();
    },200)

    window.onwheel = function(){
        return true;
    }
    var saved_parent_password=localStorage.getItem(storage_id+'parent_account_password');
    parent_account_password=saved_parent_password!=null ? saved_parent_password : parent_account_password;
    if(platform==='samsung'){
        var playerStateBeforeSuspend = null;
        var playerRouteBeforeSuspend = null;
        
        document.addEventListener("visibilitychange", function(){
            // Only call webapis methods if they're available (TV environment)
            if(typeof webapis !== 'undefined' && webapis.avplay) {
                if(document.hidden) {
                    // Save player state and route before suspending
                    try {
                        playerStateBeforeSuspend = media_player ? media_player.state : null;
                        playerRouteBeforeSuspend = current_route;
                        webapis.avplay.suspend();
                    } catch(e) {
                        console.log('Error suspending player:', e);
                    }
                } else {
                    // TV woke up - check if we should restore or close player
                    try {
                        var isPlayerRoute = (playerRouteBeforeSuspend === 'vod-series-player-video' || 
                                           playerRouteBeforeSuspend === 'channel-page' ||
                                           playerRouteBeforeSuspend === 'catch-up');
                        var wasPlaying = playerStateBeforeSuspend === 1; // STATES.PLAYING = 1
                        
                        if (isPlayerRoute && wasPlaying) {
                            // Video was actually playing, safe to restore
                            webapis.avplay.restore();
                        } else if (isPlayerRoute && !wasPlaying) {
                            // Was on player page but not playing (buffering/preparing)
                            // Close the player and go back to previous page
                            console.log('Power resumed during buffering - closing player');
                            media_player.close();
                            
                            // Navigate back based on route
                            if (playerRouteBeforeSuspend === 'vod-series-player-video') {
                                vod_series_player.Exit();
                                if (typeof vod_summary_page !== 'undefined' && vod_summary_page.movie) {
                                    vod_summary_page.reEnter();
                                } else if (typeof series_summary_page !== 'undefined' && series_summary_page.serie) {
                                    series_summary_page.reEnter();
                                } else {
                                    home_page.reEnter();
                                }
                            } else if (playerRouteBeforeSuspend === 'channel-page') {
                                channel_page.goBack();
                            } else if (playerRouteBeforeSuspend === 'catch-up') {
                                catchup_page.goBack();
                            }
                        }
                        // If not on player route, do nothing
                    } catch(e) {
                        console.log('Error handling visibility restore:', e);
                    }
                    
                    // Clear saved state
                    playerStateBeforeSuspend = null;
                    playerRouteBeforeSuspend = null;
                }
            }
        });
    }
    else if(platform==='lg')
        document.addEventListener('keyboardStateChange', keyboardVisibilityChange, false);
    document.addEventListener('keydown', function(e) {
        // Map keyboard Backspace to RETURN for browser/Windows testing
        var keyCode = e.keyCode;
        if(keyCode === 8) { // Backspace key
            keyCode = tvKey.RETURN;
            // Create a modified event-like object for handlers
            e = {keyCode: keyCode, preventDefault: function(){}, stopPropagation: function(){}};
        }
        
        if(platform==='samsung'){
            if(e.keyCode==tvKey.EXIT){
                if(current_route==='vod-series-player-video'){
                    try{
                        vod_series_player.saveVideoTime();
                    }catch (e) {
                    }
                }
                tizen.application.getCurrentApplication().exit();
            }
            switch (e.keyCode) {
                case 65376: // Done
                case 65385: // Cancel
                    $('input').blur();
                    return;
            }
        }
        if(app_loading)
            return;
        switch (current_route) {
            case "login":
                login_page.HandleKey(e);
                break;
            case "home-page":
                home_page.HandleKey(e);
                break;
            case "channel-page":
                channel_page.HandleKey(e);
                break;
            case "catch-up":
                catchup_page.HandleKey(e);
                break;
            case "vod-summary-page":
                vod_summary_page.HandleKey(e);
                break;
            case "vod-series-player-video":
                vod_series_player.HandleKey(e);
                break;
            case "trailer-page":
                trailer_page.HandleKey(e);
                break;
            case "seasons-page":
                seasons_variable.HandleKey(e);
                break;
            case "episode-page":
                episode_variable.HandleKey(e);
                break;
            case "series-summary-page":
                series_summary_page.HandleKey(e);
                break;
            case "search-page":
                search_page.HandleKey(e);
                break;
            case "youtube-page":
                youtube_page.HandleKey(e);
                break;
            case "storage-page":
                storage_page.HandleKey(e);
                break;
            case "image-page":
                image_page.HandleKey(e);
                break;
        }
    });
})


function keyboardVisibilityChange(event) {
    var visibility = event.detail.visibility;
    if(visibility){
    }
    else{
        $('input').blur();
    }
}
