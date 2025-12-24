/**
 * FLIX IPTV Remote Update Configuration
 * 
 * Bu dosya uzaktan guncelleme sisteminin yapilandirmasini icerir.
 * CDN kurulumu tamamlaninca enabled: true yapin.
 */

var REMOTE_UPDATE_CONFIG = {
    enabled: false,
    
    manifestUrl: 'https://cdn.flixapp.net/manifest.json',
    
    timeout: 5000,
    
    debug: false,
    
    onProgress: function(completed, total, fileName) {
        if (REMOTE_UPDATE_CONFIG.debug) {
            console.log('[RemoteUpdate] Progress: ' + completed + '/' + total + ' - ' + fileName);
        }
    },
    
    onComplete: function(result) {
        if (REMOTE_UPDATE_CONFIG.debug) {
            console.log('[RemoteUpdate] Complete:', result);
        }
        
        if (typeof window.onRemoteUpdateComplete === 'function') {
            window.onRemoteUpdateComplete(result);
        }
    },
    
    onError: function(error) {
        console.warn('[RemoteUpdate] Error:', error);
    }
};

(function() {
    'use strict';
    
    if (!REMOTE_UPDATE_CONFIG.enabled) {
        if (REMOTE_UPDATE_CONFIG.debug) {
            console.log('[RemoteUpdate] Disabled - using local files');
        }
        return;
    }
    
    function waitForRemoteLoader() {
        if (typeof RemoteLoader !== 'undefined') {
            RemoteLoader.init({
                manifestUrl: REMOTE_UPDATE_CONFIG.manifestUrl,
                timeout: REMOTE_UPDATE_CONFIG.timeout,
                debug: REMOTE_UPDATE_CONFIG.debug,
                onProgress: REMOTE_UPDATE_CONFIG.onProgress,
                onComplete: REMOTE_UPDATE_CONFIG.onComplete,
                onError: REMOTE_UPDATE_CONFIG.onError
            });
        } else {
            setTimeout(waitForRemoteLoader, 50);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForRemoteLoader);
    } else {
        waitForRemoteLoader();
    }
})();
