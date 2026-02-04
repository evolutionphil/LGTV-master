/**
 * FLIX IPTV Remote Update Configuration v2.0
 * 
 * Arka plan guncelleme sistemi:
 * - Ilk acilista yerel/cache dosyalar kullanilir
 * - Arka planda guncellemeler indirilir
 * - Sonraki acilista guncel dosyalar kullanilir
 */

var REMOTE_UPDATE_CONFIG = {
    // Remote update enabled - v1.0.20
    enabled: false,
    
    manifestUrl: 'https://flixapp.pages.dev/manifest.json',
    
    timeout: 5000,
    
    debug: true,
    
    onProgress: function(completed, total, fileName) {
        if (REMOTE_UPDATE_CONFIG.debug) {
            console.log('[RemoteUpdate] Downloading: ' + completed + '/' + total + ' - ' + fileName);
        }
    },
    
    onComplete: function(result) {
        if (REMOTE_UPDATE_CONFIG.debug) {
            console.log('[RemoteUpdate] Background update complete:', result);
            if (result.hasUpdates && result.downloadedFiles.length > 0) {
                console.log('[RemoteUpdate] ' + result.downloadedFiles.length + ' files updated. Restart app to apply.');
            }
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
            console.log('[RemoteUpdate] Disabled');
        }
        return;
    }
    
    function startBackgroundUpdate() {
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
            setTimeout(startBackgroundUpdate, 100);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(startBackgroundUpdate, 1000);
        });
    } else {
        setTimeout(startBackgroundUpdate, 1000);
    }
})();
