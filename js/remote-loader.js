/**
 * FLIX IPTV Remote Asset Loader
 * ES5 Compatible - Works on Tizen 2.4+ and WebOS 3.0+
 * 
 * Bu sistem uzaktan CSS/JS dosyalarini yukler ve cache'ler
 * Internet yoksa yerel dosyalari kullanir
 */

(function(global) {
    'use strict';

    var RemoteLoader = {
        config: {
            manifestUrl: '',
            timeout: 5000,
            cachePrefix: 'flix_remote_',
            debug: false,
            onProgress: null,
            onComplete: null,
            onError: null
        },

        state: {
            platform: 'unknown',
            isOnline: true,
            manifest: null,
            loadedFiles: [],
            failedFiles: [],
            totalFiles: 0,
            completedFiles: 0
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

            this.log('RemoteLoader initialized on ' + this.state.platform);
            this.log('Network status: ' + (this.state.isOnline ? 'online' : 'offline'));

            if (!this.state.isOnline) {
                this.log('Offline mode - using local files');
                this.complete(false);
                return;
            }

            this.loadManifest();
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

        loadManifest: function() {
            var self = this;
            var xhr = new XMLHttpRequest();
            var timeoutId;

            xhr.open('GET', this.config.manifestUrl + '?t=' + Date.now(), true);
            xhr.timeout = this.config.timeout;

            timeoutId = setTimeout(function() {
                xhr.abort();
                self.log('Manifest timeout - using cached or local files');
                self.loadCachedManifest();
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
                            self.loadCachedManifest();
                        }
                    } else {
                        self.log('Manifest load failed: ' + xhr.status);
                        self.loadCachedManifest();
                    }
                }
            };

            xhr.onerror = function() {
                clearTimeout(timeoutId);
                self.log('Manifest network error');
                self.loadCachedManifest();
            };

            xhr.send();
        },

        loadCachedManifest: function() {
            try {
                var cached = localStorage.getItem(this.config.cachePrefix + 'manifest');
                if (cached) {
                    var manifest = JSON.parse(cached);
                    this.state.manifest = manifest;
                    this.log('Using cached manifest v' + manifest.version);
                    this.processManifest(manifest);
                } else {
                    this.log('No cached manifest - using local files');
                    this.complete(false);
                }
            } catch (e) {
                this.log('Cache read error: ' + e.message);
                this.complete(false);
            }
        },

        saveManifestToCache: function(manifest) {
            try {
                localStorage.setItem(this.config.cachePrefix + 'manifest', JSON.stringify(manifest));
                localStorage.setItem(this.config.cachePrefix + 'manifest_time', Date.now().toString());
            } catch (e) {
                this.log('Cache write error: ' + e.message);
            }
        },

        processManifest: function(manifest) {
            var self = this;

            if (manifest.killSwitch === true) {
                this.log('Kill switch active - using local files');
                this.complete(false);
                return;
            }

            var filesToLoad = [];
            var files = manifest.files;

            for (var filePath in files) {
                if (files.hasOwnProperty(filePath)) {
                    var fileInfo = files[filePath];
                    var cachedVersion = this.getCachedVersion(filePath);

                    if (cachedVersion !== fileInfo.version) {
                        filesToLoad.push({
                            path: filePath,
                            info: fileInfo,
                            url: (manifest.baseUrl || '') + filePath + '?v=' + fileInfo.version
                        });
                    } else {
                        this.applyCachedFile(filePath);
                    }
                }
            }

            filesToLoad.sort(function(a, b) {
                return (a.info.priority || 99) - (b.info.priority || 99);
            });

            this.state.totalFiles = filesToLoad.length;

            if (filesToLoad.length === 0) {
                this.log('All files up to date');
                this.complete(true);
                return;
            }

            this.log('Loading ' + filesToLoad.length + ' updated files...');
            this.loadFilesSequentially(filesToLoad, 0);
        },

        loadFilesSequentially: function(files, index) {
            var self = this;

            if (index >= files.length) {
                this.complete(true);
                return;
            }

            var file = files[index];
            this.loadRemoteFile(file, function(success) {
                self.state.completedFiles++;
                
                if (self.config.onProgress) {
                    self.config.onProgress(self.state.completedFiles, self.state.totalFiles, file.path);
                }

                self.loadFilesSequentially(files, index + 1);
            });
        },

        loadRemoteFile: function(file, callback) {
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
                        self.applyFile(file.path, content);
                        self.state.loadedFiles.push(file.path);
                        self.log('Loaded: ' + file.path);
                        callback(true);
                    } else {
                        self.log('Failed to load: ' + file.path + ' (' + xhr.status + ')');
                        self.state.failedFiles.push(file.path);
                        self.applyCachedFile(file.path);
                        callback(false);
                    }
                }
            };

            xhr.onerror = function() {
                clearTimeout(timeoutId);
                self.log('Network error: ' + file.path);
                self.state.failedFiles.push(file.path);
                self.applyCachedFile(file.path);
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

        getCachedContent: function(filePath) {
            try {
                var key = this.config.cachePrefix + this.pathToKey(filePath);
                return localStorage.getItem(key);
            } catch (e) {
                return null;
            }
        },

        applyCachedFile: function(filePath) {
            var content = this.getCachedContent(filePath);
            if (content) {
                this.applyFile(filePath, content);
                this.log('Applied cached: ' + filePath);
            }
        },

        applyFile: function(filePath, content) {
            var ext = filePath.split('.').pop().toLowerCase();

            if (ext === 'css') {
                this.applyCSS(filePath, content);
            } else if (ext === 'js') {
                this.applyJS(filePath, content);
            }
        },

        applyCSS: function(filePath, content) {
            var styleId = 'remote-css-' + this.pathToKey(filePath);
            var existing = document.getElementById(styleId);

            if (existing) {
                existing.parentNode.removeChild(existing);
            }

            var style = document.createElement('style');
            style.id = styleId;
            style.type = 'text/css';
            style.appendChild(document.createTextNode(content));
            document.head.appendChild(style);
        },

        applyJS: function(filePath, content) {
            var scriptId = 'remote-js-' + this.pathToKey(filePath);
            var existing = document.getElementById(scriptId);

            if (existing) {
                existing.parentNode.removeChild(existing);
            }

            var script = document.createElement('script');
            script.id = scriptId;
            script.type = 'text/javascript';
            
            try {
                script.appendChild(document.createTextNode(content));
            } catch (e) {
                script.text = content;
            }

            document.body.appendChild(script);
        },

        pathToKey: function(filePath) {
            return filePath.replace(/[\/\.]/g, '_');
        },

        clearOldCache: function() {
            try {
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.indexOf(this.config.cachePrefix) === 0) {
                        keysToRemove.push(key);
                    }
                }
                for (var j = 0; j < keysToRemove.length; j++) {
                    localStorage.removeItem(keysToRemove[j]);
                }
                this.log('Cleared old cache');
            } catch (e) {
                this.log('Clear cache error: ' + e.message);
            }
        },

        complete: function(fromRemote) {
            this.log('Loading complete. Remote: ' + fromRemote);
            this.log('Loaded: ' + this.state.loadedFiles.length + ', Failed: ' + this.state.failedFiles.length);

            if (this.config.onComplete) {
                this.config.onComplete({
                    fromRemote: fromRemote,
                    loadedFiles: this.state.loadedFiles,
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
                loadedFiles: this.state.loadedFiles,
                failedFiles: this.state.failedFiles
            };
        },

        clearCache: function() {
            this.clearOldCache();
            this.log('Cache cleared');
        },

        forceReload: function() {
            this.clearCache();
            this.state.loadedFiles = [];
            this.state.failedFiles = [];
            this.loadManifest();
        }
    };

    global.RemoteLoader = RemoteLoader;

})(typeof window !== 'undefined' ? window : this);
