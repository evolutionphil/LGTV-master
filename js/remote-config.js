/**
 * FLIX IPTV App Configuration Loader v3.0
 * Backend'den app-config ceker, remote update ve log sistemini kontrol eder
 * ES5 uyumlu
 */

var REMOTE_UPDATE_CONFIG = {
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

var APP_CONFIG_LOADER = {
    configUrl: 'https://flixapp.net/api/app-config/config',
    loaded: false,
    config: null,

    fetchConfig: function() {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', this.configUrl, true);
        xhr.timeout = 8000;
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var config = JSON.parse(xhr.responseText);
                        self.config = config;
                        self.loaded = true;
                        console.log('[AppConfig] Loaded from backend:', JSON.stringify(config));
                        self.applyConfig(config);
                    } catch (e) {
                        console.warn('[AppConfig] Parse error:', e);
                        self.applyDefaults();
                    }
                } else {
                    console.warn('[AppConfig] Fetch failed, status:', xhr.status);
                    self.applyDefaults();
                }
            }
        };
        
        xhr.onerror = function() {
            console.warn('[AppConfig] Network error - using defaults');
            self.applyDefaults();
        };
        
        xhr.ontimeout = function() {
            console.warn('[AppConfig] Timeout - using defaults');
            self.applyDefaults();
        };
        
        try {
            xhr.send();
        } catch (e) {
            console.warn('[AppConfig] Send error:', e);
            self.applyDefaults();
        }
    },

    applyConfig: function(config) {
        this.applyKillSwitch(config);
        this.applyLogging(config);
        this.applyRemoteUpdate(config);
    },

    applyDefaults: function() {
        console.log('[AppConfig] Using default config (remote update: off, logging: off)');
    },

    applyKillSwitch: function(config) {
        if (config.kill_switch === true) {
            console.warn('[AppConfig] KILL SWITCH ACTIVATED - clearing remote update cache');
            try {
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.indexOf('flix_remote_') === 0) {
                        keysToRemove.push(key);
                    }
                }
                for (var j = 0; j < keysToRemove.length; j++) {
                    localStorage.removeItem(keysToRemove[j]);
                }
                console.log('[AppConfig] Kill switch: cleared ' + keysToRemove.length + ' cached files');
            } catch (e) {
                console.warn('[AppConfig] Kill switch cache clear error:', e);
            }
        }
    },

    applyLogging: function(config) {
        if (typeof FlixRemoteLogger === 'undefined') {
            console.warn('[AppConfig] FlixRemoteLogger not available');
            return;
        }
        
        var macList = config.logging_mac_list;
        if (macList && macList.length > 0) {
            var matched = FlixRemoteLogger.checkMacList(macList);
            if (matched) {
                console.log('[AppConfig] Logging ENABLED - MAC address found in list');
            } else {
                console.log('[AppConfig] Logging DISABLED - MAC address not in list, will retry in 5s');
                setTimeout(function() {
                    var retryMatch = FlixRemoteLogger.checkMacList(macList);
                    if (retryMatch) {
                        console.log('[AppConfig] Logging ENABLED on retry - MAC address found');
                    }
                }, 5000);
            }
        } else {
            FlixRemoteLogger.disable();
            console.log('[AppConfig] Logging DISABLED - empty MAC list');
        }
    },

    applyRemoteUpdate: function(config) {
        if (config.kill_switch === true) {
            console.log('[AppConfig] Remote update skipped - kill switch active');
            return;
        }
        
        if (config.remote_update_enabled === true) {
            REMOTE_UPDATE_CONFIG.enabled = true;
            if (config.manifest_url) {
                REMOTE_UPDATE_CONFIG.manifestUrl = config.manifest_url;
            }
            console.log('[AppConfig] Remote update ENABLED, manifest:', REMOTE_UPDATE_CONFIG.manifestUrl);
            this.startRemoteUpdate();
        } else {
            REMOTE_UPDATE_CONFIG.enabled = false;
            console.log('[AppConfig] Remote update DISABLED by backend');
        }
    },

    startRemoteUpdate: function() {
        function tryStart() {
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
                setTimeout(tryStart, 100);
            }
        }
        tryStart();
    }
};

(function() {
    'use strict';
    
    function initAppConfig() {
        setTimeout(function() {
            APP_CONFIG_LOADER.fetchConfig();
        }, 2000);
    }
    
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAppConfig);
        } else {
            initAppConfig();
        }
    }
})();
