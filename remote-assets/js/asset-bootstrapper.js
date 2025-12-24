/**
 * FLIX IPTV Asset Bootstrapper
 * ES5 Compatible - Works on Tizen 2.4+ and WebOS 3.0+
 * 
 * Bu script index.html'in en basinda yuklenir.
 * Cache'de guncel dosya varsa onu kullanir, yoksa yerelden yukler.
 * 
 * KULLANIM:
 * index.html'de <head> icinde ilk script olarak ekle:
 * <script src="js/asset-bootstrapper.js"></script>
 */

(function() {
    'use strict';
    
    var CACHE_PREFIX = 'flix_remote_';
    var DEBUG = false;
    
    function log(msg) {
        if (DEBUG) console.log('[Bootstrapper] ' + msg);
    }
    
    function pathToKey(filePath) {
        return filePath.replace(/[\/\.]/g, '_');
    }
    
    function getCachedContent(filePath) {
        try {
            var key = CACHE_PREFIX + pathToKey(filePath);
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }
    
    function getCachedVersion(filePath) {
        try {
            var key = CACHE_PREFIX + pathToKey(filePath) + '_version';
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }
    
    window.FlixBootstrapper = {
        loadedFromCache: [],
        loadedFromLocal: [],
        
        loadCSS: function(filePath) {
            var cached = getCachedContent(filePath);
            
            if (cached) {
                var style = document.createElement('style');
                style.type = 'text/css';
                style.setAttribute('data-file', filePath);
                style.setAttribute('data-source', 'cache');
                style.setAttribute('data-version', getCachedVersion(filePath) || 'unknown');
                try {
                    style.appendChild(document.createTextNode(cached));
                } catch (e) {
                    style.cssText = cached;
                }
                document.head.appendChild(style);
                this.loadedFromCache.push(filePath);
                log('CSS from cache: ' + filePath);
                return true;
            }
            
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = filePath;
            link.setAttribute('data-source', 'local');
            document.head.appendChild(link);
            this.loadedFromLocal.push(filePath);
            log('CSS from local: ' + filePath);
            return false;
        },
        
        writeCSS: function(filePath) {
            var cached = getCachedContent(filePath);
            
            if (cached) {
                var version = getCachedVersion(filePath) || 'unknown';
                document.write('<style type="text/css" data-file="' + filePath + '" data-source="cache" data-version="' + version + '">' + cached + '</style>');
                this.loadedFromCache.push(filePath);
                log('CSS from cache: ' + filePath);
                return true;
            }
            
            document.write('<link rel="stylesheet" href="' + filePath + '" data-source="local">');
            this.loadedFromLocal.push(filePath);
            log('CSS from local: ' + filePath);
            return false;
        },
        
        loadJS: function(filePath, callback) {
            var self = this;
            var cached = getCachedContent(filePath);
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.setAttribute('data-file', filePath);
            
            if (cached) {
                script.setAttribute('data-source', 'cache');
                script.setAttribute('data-version', getCachedVersion(filePath) || 'unknown');
                try {
                    script.appendChild(document.createTextNode(cached));
                } catch (e) {
                    script.text = cached;
                }
                document.body.appendChild(script);
                self.loadedFromCache.push(filePath);
                log('JS from cache: ' + filePath);
                if (callback) setTimeout(callback, 0);
                return true;
            }
            
            script.src = filePath;
            script.setAttribute('data-source', 'local');
            script.onload = function() {
                self.loadedFromLocal.push(filePath);
                log('JS from local: ' + filePath);
                if (callback) callback();
            };
            script.onerror = function() {
                console.error('[Bootstrapper] Failed to load: ' + filePath);
                if (callback) callback();
            };
            document.body.appendChild(script);
            return false;
        },
        
        writeJS: function(filePath) {
            var cached = getCachedContent(filePath);
            
            if (cached) {
                var version = getCachedVersion(filePath) || 'unknown';
                document.write('<script type="text/javascript" data-file="' + filePath + '" data-source="cache" data-version="' + version + '">' + cached + '<\/script>');
                this.loadedFromCache.push(filePath);
                log('JS from cache: ' + filePath);
                return true;
            }
            
            document.write('<script src="' + filePath + '" data-source="local"><\/script>');
            this.loadedFromLocal.push(filePath);
            log('JS from local: ' + filePath);
            return false;
        },
        
        hasCached: function(filePath) {
            return getCachedContent(filePath) !== null;
        },
        
        getCacheVersion: function(filePath) {
            return getCachedVersion(filePath);
        },
        
        getStats: function() {
            return {
                fromCache: this.loadedFromCache.length,
                fromLocal: this.loadedFromLocal.length,
                cacheFiles: this.loadedFromCache,
                localFiles: this.loadedFromLocal
            };
        },
        
        clearCache: function() {
            try {
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.indexOf(CACHE_PREFIX) === 0) {
                        keysToRemove.push(key);
                    }
                }
                for (var j = 0; j < keysToRemove.length; j++) {
                    localStorage.removeItem(keysToRemove[j]);
                }
                log('Cache cleared: ' + keysToRemove.length + ' entries');
                return keysToRemove.length;
            } catch (e) {
                console.error('[Bootstrapper] Clear cache error:', e);
                return 0;
            }
        }
    };
    
    log('FlixBootstrapper initialized');
    
})();
