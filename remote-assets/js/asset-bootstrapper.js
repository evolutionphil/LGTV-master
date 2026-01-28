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

// ES6 Polyfills for older WebOS/Tizen versions
// Array.prototype.includes polyfill
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
        if (this == null) {
            throw new TypeError('Array.prototype.includes called on null or undefined');
        }
        var o = Object(this);
        var len = parseInt(o.length, 10) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(fromIndex, 10) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) { k = 0; }
        }
        var currentElement;
        while (k < len) {
            currentElement = o[k];
            if (searchElement === currentElement ||
               (searchElement !== searchElement && currentElement !== currentElement)) {
                return true;
            }
            k++;
        }
        return false;
    };
}

// String.prototype.includes polyfill
if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        if (typeof start !== 'number') {
            start = 0;
        }
        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}

// Array.prototype.find polyfill
if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = parseInt(list.length, 10) || 0;
        var thisArg = arguments[1];
        var value;
        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}

// Array.prototype.findIndex polyfill
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function(predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = parseInt(list.length, 10) || 0;
        var thisArg = arguments[1];
        var value;
        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return i;
            }
        }
        return -1;
    };
}

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
                // Validate cached content is CSS, not HTML error page
                var trimmed = cached.trim();
                if (trimmed.indexOf('<!DOCTYPE') === 0 || trimmed.indexOf('<html') === 0) {
                    // Invalid cached content (HTML), remove and load from local
                    log('Invalid CSS cache (HTML detected), loading from local: ' + filePath);
                    try {
                        var key = CACHE_PREFIX + pathToKey(filePath);
                        localStorage.removeItem(key);
                        localStorage.removeItem(key + '_version');
                    } catch (e) {}
                } else {
                    var version = getCachedVersion(filePath) || 'unknown';
                    document.write('<style type="text/css" data-file="' + filePath + '" data-source="cache" data-version="' + version + '">' + cached + '</style>');
                    this.loadedFromCache.push(filePath);
                    log('CSS from cache: ' + filePath);
                    return true;
                }
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
                // Validate cached content is JavaScript, not HTML error page
                var trimmed = cached.trim();
                if (trimmed.charAt(0) === '<' || trimmed.indexOf('<!DOCTYPE') === 0 || trimmed.indexOf('<html') === 0) {
                    // Invalid cached content (HTML), remove and load from local
                    log('Invalid JS cache (HTML detected), loading from local: ' + filePath);
                    try {
                        var key = CACHE_PREFIX + pathToKey(filePath);
                        localStorage.removeItem(key);
                        localStorage.removeItem(key + '_version');
                    } catch (e) {}
                } else {
                    var version = getCachedVersion(filePath) || 'unknown';
                    document.write('<script type="text/javascript" data-file="' + filePath + '" data-source="cache" data-version="' + version + '">' + cached + '<\/script>');
                    this.loadedFromCache.push(filePath);
                    log('JS from cache: ' + filePath);
                    return true;
                }
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
        },
        
        applyCachedStyles: function() {
            var self = this;
            var links = document.querySelectorAll('link[data-flix-css]');
            var appliedCount = 0;
            
            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                var filePath = link.getAttribute('data-flix-css');
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
                    
                    link.parentNode.insertBefore(style, link);
                    link.disabled = true;
                    link.setAttribute('data-replaced', 'true');
                    
                    self.loadedFromCache.push(filePath);
                    appliedCount++;
                    log('CSS replaced from cache: ' + filePath);
                } else {
                    self.loadedFromLocal.push(filePath);
                    log('CSS kept local (no cache): ' + filePath);
                }
            }
            
            log('Applied ' + appliedCount + ' cached CSS files');
            return appliedCount;
        }
    };
    
    log('FlixBootstrapper initialized');
    
})();
