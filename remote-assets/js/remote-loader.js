/**
 * FLIX IPTV Remote Asset Loader v2.0
 * ES5 Compatible - Works on Tizen 2.4+ and WebOS 3.0+
 * 
 * Arka plan guncelleme modu:
 * - Ilk acilista yerel/cache dosyalar kullanilir (hizli)
 * - Arka planda guncellemeler indirilir ve cache'lenir
 * - Sonraki acilista guncel dosyalar kullanilir
 */

(function(global) {
    'use strict';

    var RemoteLoader = {
        config: {
            manifestUrl: '',
            timeout: 5000,
            cachePrefix: 'flix_remote_',
            debug: false,
            cssOnly: false,
            onProgress: null,
            onComplete: null,
            onError: null
        },

        state: {
            platform: 'unknown',
            isOnline: true,
            manifest: null,
            downloadedFiles: [],
            failedFiles: [],
            totalFiles: 0,
            completedFiles: 0,
            hasUpdates: false
        },

        init: function(options) {
            var self = this;
            
            if (options) {
                for (var key in options) {
                    if (options.hasOwnProperty(key)) {
                        this.config[key] = options[key];
                    }
                }
            }

            this.detectPlatform();
            this.checkNetworkStatus();

            this.log('RemoteLoader v2.0 initialized on ' + this.state.platform);
            this.log('Network status: ' + (this.state.isOnline ? 'online' : 'offline'));

            if (!this.state.isOnline) {
                this.log('Offline mode - skipping background update');
                this.complete(false);
                return;
            }

            this.startBackgroundUpdate();
        },

        detectPlatform: function() {
            if (typeof tizen !== 'undefined') {
                this.state.platform = 'tizen';
            } else if (typeof webOS !== 'undefined') {
                this.state.platform = 'webos';
            } else if (typeof window !== 'undefined') {
                this.state.platform = 'browser';
            }
        },

        checkNetworkStatus: function() {
            var self = this;

            try {
                if (this.state.platform === 'tizen' && typeof tizen !== 'undefined' && tizen.systeminfo) {
                    tizen.systeminfo.getPropertyValue('NETWORK', function(network) {
                        self.state.isOnline = network.networkType !== 'NONE';
                    }, function(error) {
                        self.state.isOnline = navigator.onLine !== false;
                    });
                } else if (this.state.platform === 'webos' && typeof webOS !== 'undefined' && webOS.service) {
                    this.state.isOnline = navigator.onLine !== false;
                } else {
                    this.state.isOnline = navigator.onLine !== false;
                }
            } catch (e) {
                this.state.isOnline = true;
            }
        },

        startBackgroundUpdate: function() {
            var self = this;
            
            setTimeout(function() {
                self.log('Starting background update check...');
                self.loadManifest();
            }, 2000);
        },

        loadManifest: function() {
            var self = this;
            var xhr = new XMLHttpRequest();
            var timeoutId;

            xhr.open('GET', this.config.manifestUrl + '?t=' + Date.now(), true);
            xhr.timeout = this.config.timeout;

            timeoutId = setTimeout(function() {
                xhr.abort();
                self.log('Manifest timeout');
                self.complete(false);
            }, this.config.timeout);

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    clearTimeout(timeoutId);
                    
                    if (xhr.status === 200) {
                        try {
                            var manifest = JSON.parse(xhr.responseText);
                            self.state.manifest = manifest;
                            self.saveManifestToCache(manifest);
                            self.processManifest(manifest);
                        } catch (e) {
                            self.log('Manifest parse error: ' + e.message);
                            self.complete(false);
                        }
                    } else {
                        self.log('Manifest load failed: ' + xhr.status);
                        self.complete(false);
                    }
                }
            };

            xhr.onerror = function() {
                clearTimeout(timeoutId);
                self.log('Manifest network error');
                self.complete(false);
            };

            xhr.send();
        },

        saveManifestToCache: function(manifest) {
            try {
                localStorage.setItem(this.config.cachePrefix + 'manifest', JSON.stringify(manifest));
                localStorage.setItem(this.config.cachePrefix + 'manifest_time', Date.now().toString());
            } catch (e) {
                this.log('Cache write error: ' + e.message);
            }
        },

        getCachedManifest: function() {
            try {
                var cached = localStorage.getItem(this.config.cachePrefix + 'manifest');
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (e) {
                this.log('Cache read error: ' + e.message);
            }
            return null;
        },

        processManifest: function(manifest) {
            var self = this;
            var needsClear = false;

            if (manifest.killSwitch === true) {
                this.log('Kill switch active - clearing cache');
                this.clearAllCache();
                this.complete(false);
                return;
            }
            
            // Check forceRefresh flag - clear all cache and re-download everything
            if (manifest.forceRefresh === true) {
                this.log('Force refresh flag active - will clear cache');
                needsClear = true;
            }
            
            // Check cacheGeneration - if changed, clear all cache
            var cachedGeneration = this.getCachedCacheGeneration();
            var newGeneration = manifest.cacheGeneration || 1;
            if (cachedGeneration && cachedGeneration !== newGeneration) {
                this.log('Cache generation changed (' + cachedGeneration + ' -> ' + newGeneration + ') - will clear cache');
                needsClear = true;
            }
            
            // Check maxAgeHours - if cache is too old, clear it
            var maxAgeHours = manifest.maxAgeHours || 24;
            var cacheTime = this.getCacheTime();
            if (cacheTime) {
                var ageHours = (Date.now() - cacheTime) / (1000 * 60 * 60);
                if (ageHours > maxAgeHours) {
                    this.log('Cache expired (' + Math.round(ageHours) + 'h > ' + maxAgeHours + 'h) - will clear cache');
                    needsClear = true;
                }
            }
            
            // Clear cache FIRST, then re-save manifest so it persists
            if (needsClear) {
                this.log('Clearing all cache...');
                this.clearAllCache();
                // Re-save manifest AFTER clearing cache so it persists for next boot
                this.saveManifestToCache(manifest);
                this.log('Manifest re-saved after cache clear');
            }
            
            // Always save cache generation after any clear
            this.saveCacheGeneration(newGeneration);

            var filesToDownload = [];
            var files = manifest.files;

            for (var filePath in files) {
                if (files.hasOwnProperty(filePath)) {
                    var fileInfo = files[filePath];
                    var cachedVersion = this.getCachedVersion(filePath);

                    if (cachedVersion !== fileInfo.version) {
                        filesToDownload.push({
                            path: filePath,
                            info: fileInfo,
                            url: (manifest.baseUrl || '') + filePath + '?v=' + fileInfo.version
                        });
                    }
                }
            }

            filesToDownload.sort(function(a, b) {
                return (a.info.priority || 99) - (b.info.priority || 99);
            });

            this.state.totalFiles = filesToDownload.length;

            if (filesToDownload.length === 0) {
                this.log('All files up to date');
                this.complete(true);
                return;
            }

            this.state.hasUpdates = true;
            this.log('Downloading ' + filesToDownload.length + ' updated files in background...');
            this.downloadFilesSequentially(filesToDownload, 0);
        },

        downloadFilesSequentially: function(files, index) {
            var self = this;

            if (index >= files.length) {
                this.complete(true);
                return;
            }

            var file = files[index];
            this.downloadFile(file, function(success) {
                self.state.completedFiles++;
                
                if (self.config.onProgress) {
                    self.config.onProgress(self.state.completedFiles, self.state.totalFiles, file.path);
                }

                self.downloadFilesSequentially(files, index + 1);
            });
        },

        downloadFile: function(file, callback) {
            var self = this;
            var xhr = new XMLHttpRequest();
            var timeoutId;

            xhr.open('GET', file.url, true);
            xhr.timeout = this.config.timeout;

            timeoutId = setTimeout(function() {
                xhr.abort();
                self.log('File timeout: ' + file.path);
                self.state.failedFiles.push(file.path);
                callback(false);
            }, this.config.timeout);

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    clearTimeout(timeoutId);

                    if (xhr.status === 200) {
                        var content = xhr.responseText;
                        self.cacheFile(file.path, content, file.info.version);
                        self.state.downloadedFiles.push(file.path);
                        self.log('Downloaded: ' + file.path);
                        callback(true);
                    } else {
                        self.log('Failed to download: ' + file.path + ' (' + xhr.status + ')');
                        self.state.failedFiles.push(file.path);
                        callback(false);
                    }
                }
            };

            xhr.onerror = function() {
                clearTimeout(timeoutId);
                self.log('Network error: ' + file.path);
                self.state.failedFiles.push(file.path);
                callback(false);
            };

            xhr.send();
        },

        cacheFile: function(filePath, content, version) {
            try {
                var key = this.config.cachePrefix + this.pathToKey(filePath);
                localStorage.setItem(key, content);
                localStorage.setItem(key + '_version', version);
            } catch (e) {
                this.log('Cache file error: ' + e.message);
                this.clearOldCache();
                try {
                    var key = this.config.cachePrefix + this.pathToKey(filePath);
                    localStorage.setItem(key, content);
                    localStorage.setItem(key + '_version', version);
                } catch (e2) {
                    this.log('Cache still full after cleanup: ' + e2.message);
                }
            }
        },

        getCachedVersion: function(filePath) {
            try {
                var key = this.config.cachePrefix + this.pathToKey(filePath) + '_version';
                return localStorage.getItem(key) || '';
            } catch (e) {
                return '';
            }
        },
        
        getCachedCacheGeneration: function() {
            try {
                var val = localStorage.getItem(this.config.cachePrefix + 'cache_generation');
                return val ? parseInt(val, 10) : null;
            } catch (e) {
                return null;
            }
        },
        
        saveCacheGeneration: function(generation) {
            try {
                localStorage.setItem(this.config.cachePrefix + 'cache_generation', generation.toString());
            } catch (e) {}
        },
        
        getCacheTime: function() {
            try {
                var val = localStorage.getItem(this.config.cachePrefix + 'manifest_time');
                return val ? parseInt(val, 10) : null;
            } catch (e) {
                return null;
            }
        },

        getCachedContent: function(filePath) {
            try {
                var key = this.config.cachePrefix + this.pathToKey(filePath);
                return localStorage.getItem(key);
            } catch (e) {
                return null;
            }
        },

        pathToKey: function(filePath) {
            return filePath.replace(/[\/\.]/g, '_');
        },

        clearOldCache: function() {
            try {
                var keysToRemove = [];
                var prefix = this.config.cachePrefix;
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.indexOf(prefix) === 0) {
                        keysToRemove.push(key);
                    }
                }
                var halfLength = Math.floor(keysToRemove.length / 2);
                for (var j = 0; j < halfLength; j++) {
                    localStorage.removeItem(keysToRemove[j]);
                }
                this.log('Cleared ' + halfLength + ' old cache entries');
            } catch (e) {
                this.log('Clear cache error: ' + e.message);
            }
        },

        clearAllCache: function() {
            try {
                var keysToRemove = [];
                var prefix = this.config.cachePrefix;
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.indexOf(prefix) === 0) {
                        keysToRemove.push(key);
                    }
                }
                for (var j = 0; j < keysToRemove.length; j++) {
                    localStorage.removeItem(keysToRemove[j]);
                }
                this.log('Cleared all cache');
            } catch (e) {
                this.log('Clear cache error: ' + e.message);
            }
        },

        complete: function(success) {
            if (this.state.hasUpdates && this.state.downloadedFiles.length > 0) {
                this.log('Background update complete. ' + this.state.downloadedFiles.length + ' files updated.');
                this.log('Updates will be applied on next app launch.');
            } else {
                this.log('No updates needed.');
            }

            if (this.config.onComplete) {
                this.config.onComplete({
                    success: success,
                    hasUpdates: this.state.hasUpdates,
                    downloadedFiles: this.state.downloadedFiles,
                    failedFiles: this.state.failedFiles,
                    manifest: this.state.manifest
                });
            }
        },

        log: function(message) {
            if (this.config.debug) {
                console.log('[RemoteLoader] ' + message);
            }
        },

        getStatus: function() {
            return {
                platform: this.state.platform,
                isOnline: this.state.isOnline,
                manifestVersion: this.state.manifest ? this.state.manifest.version : null,
                hasUpdates: this.state.hasUpdates,
                downloadedFiles: this.state.downloadedFiles,
                failedFiles: this.state.failedFiles
            };
        },

        clearCache: function() {
            this.clearAllCache();
            this.log('Cache cleared manually');
        },

        hasCachedFile: function(filePath) {
            return this.getCachedContent(filePath) !== null;
        },

        getFileFromCache: function(filePath) {
            return this.getCachedContent(filePath);
        }
    };

    global.RemoteLoader = RemoteLoader;

})(typeof window !== 'undefined' ? window : this);


/**
 * Asset Bootstrapper
 * Bu fonksiyon index.html'den cagrilir ve dosyalari cache'den veya yerelden yukler
 */
var AssetBootstrapper = {
    cachePrefix: 'flix_remote_',
    
    pathToKey: function(filePath) {
        return filePath.replace(/[\/\.]/g, '_');
    },
    
    getCachedContent: function(filePath) {
        try {
            var key = this.cachePrefix + this.pathToKey(filePath);
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    
    getCachedVersion: function(filePath) {
        try {
            var key = this.cachePrefix + this.pathToKey(filePath) + '_version';
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    
    loadCSS: function(filePath) {
        var cached = this.getCachedContent(filePath);
        
        if (cached) {
            var style = document.createElement('style');
            style.type = 'text/css';
            style.setAttribute('data-file', filePath);
            style.setAttribute('data-source', 'cache');
            try {
                style.appendChild(document.createTextNode(cached));
            } catch (e) {
                style.cssText = cached;
            }
            document.head.appendChild(style);
            return true;
        }
        
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = filePath;
        link.setAttribute('data-source', 'local');
        document.head.appendChild(link);
        return false;
    },
    
    loadJS: function(filePath, callback) {
        var cached = this.getCachedContent(filePath);
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.setAttribute('data-file', filePath);
        
        if (cached) {
            script.setAttribute('data-source', 'cache');
            try {
                script.appendChild(document.createTextNode(cached));
            } catch (e) {
                script.text = cached;
            }
            document.body.appendChild(script);
            if (callback) callback(true);
            return true;
        }
        
        script.src = filePath;
        script.setAttribute('data-source', 'local');
        script.onload = function() {
            if (callback) callback(false);
        };
        script.onerror = function() {
            console.error('Failed to load: ' + filePath);
            if (callback) callback(false);
        };
        document.body.appendChild(script);
        return false;
    },
    
    loadJSSync: function(filePath) {
        var cached = this.getCachedContent(filePath);
        
        if (cached) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.setAttribute('data-file', filePath);
            script.setAttribute('data-source', 'cache');
            try {
                script.appendChild(document.createTextNode(cached));
            } catch (e) {
                script.text = cached;
            }
            document.body.appendChild(script);
            return true;
        }
        
        document.write('<script src="' + filePath + '" data-source="local"><\/script>');
        return false;
    }
};
