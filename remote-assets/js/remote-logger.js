/**
 * FLIX IPTV - Remote Console Logger v2.1
 * Samsung/LG TV loglarini backend'e gonderir
 * MAC bazli kontrol - backend'den enable/disable
 * ES5 uyumlu
 */
(function() {
    'use strict';
    
    var CONFIG = {
        enabled: false,
        endpoint: (function() {
            if (typeof window !== 'undefined' && window.FLIX_LOG_ENDPOINT) {
                return window.FLIX_LOG_ENDPOINT;
            }
            if (typeof window !== 'undefined' && window.location) {
                var origin = window.location.origin;
                if (!origin || origin === 'null' || origin.indexOf('file:') === 0) {
                    return 'https://flixapp.net/api/logs';
                }
                return origin + '/api/logs';
            }
            return 'https://flixapp.net/api/logs';
        })(),
        batchSize: 20,
        flushInterval: 5000,
        maxPending: 200,
        debug: false
    };
    
    var deviceId = 'unknown';
    var pendingLogs = [];
    var flushTimer = null;
    var initialized = false;
    
    var originalLog = console.log;
    var originalError = console.error;
    var originalWarn = console.warn;
    var originalInfo = console.info;
    
    function getDeviceId() {
        try {
            var stored = localStorage.getItem('flix_device_id');
            if (stored) {
                return stored;
            }
        } catch (e) {}
        
        if (typeof webapis !== 'undefined' && webapis.network) {
            try {
                var mac = webapis.network.getMac();
                if (mac) {
                    try { localStorage.setItem('flix_device_id', mac); } catch (e) {}
                    return mac;
                }
            } catch (e) {}
        }
        
        if (typeof webOS !== 'undefined' && webOS.deviceInfo) {
            try {
                webOS.deviceInfo(function(info) {
                    if (info && info.serialNumber) {
                        deviceId = info.serialNumber;
                        try { localStorage.setItem('flix_device_id', deviceId); } catch (e) {}
                    }
                });
            } catch (e) {}
        }
        
        var randomId = 'tv_' + Math.random().toString(36).substr(2, 9);
        try { localStorage.setItem('flix_device_id', randomId); } catch (e) {}
        return randomId;
    }
    
    function getDeviceMac() {
        if (typeof mac_address !== 'undefined' && mac_address) {
            return mac_address.toUpperCase().replace(/[^A-F0-9]/g, '');
        }
        try {
            var stored = localStorage.getItem('mac_address');
            if (stored) return stored.toUpperCase().replace(/[^A-F0-9]/g, '');
        } catch (e) {}
        try {
            var devId = localStorage.getItem('flix_device_id');
            if (devId) return devId.toUpperCase().replace(/[^A-F0-9]/g, '');
        } catch (e) {}
        if (typeof webapis !== 'undefined' && webapis.network) {
            try {
                var mac = webapis.network.getMac();
                if (mac) return mac.toUpperCase().replace(/[^A-F0-9]/g, '');
            } catch (e) {}
        }
        return '';
    }
    
    function createLogEntry(level, args) {
        var message = '';
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            if (typeof arg === 'object') {
                try {
                    message += JSON.stringify(arg);
                } catch (e) {
                    message += '[Object]';
                }
            } else {
                message += String(arg);
            }
            if (i < args.length - 1) message += ' ';
        }
        
        return {
            level: level,
            message: message,
            timestamp: new Date().toISOString()
        };
    }
    
    function addLog(level, args) {
        if (!CONFIG.enabled) return;
        
        var entry = createLogEntry(level, args);
        pendingLogs.push(entry);
        
        if (pendingLogs.length > CONFIG.maxPending) {
            pendingLogs = pendingLogs.slice(-CONFIG.maxPending);
        }
        
        if (pendingLogs.length >= CONFIG.batchSize) {
            flushLogs();
        }
    }
    
    function flushLogs() {
        if (pendingLogs.length === 0) return;
        if (!CONFIG.enabled) {
            pendingLogs = [];
            return;
        }
        
        var logsToSend = pendingLogs.slice();
        pendingLogs = [];
        
        var payload = JSON.stringify({
            deviceId: deviceId,
            logs: logsToSend
        });
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', CONFIG.endpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 10000;
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status !== 200 && CONFIG.debug) {
                    originalLog.call(console, '[RemoteLogger] Send failed:', xhr.status);
                }
            }
        };
        
        xhr.onerror = function() {
            if (CONFIG.debug) {
                originalLog.call(console, '[RemoteLogger] Network error');
            }
            pendingLogs = logsToSend.concat(pendingLogs);
            if (pendingLogs.length > CONFIG.maxPending) {
                pendingLogs = pendingLogs.slice(-CONFIG.maxPending);
            }
        };
        
        try {
            xhr.send(payload);
        } catch (e) {
            if (CONFIG.debug) {
                originalLog.call(console, '[RemoteLogger] Send exception:', e);
            }
        }
    }
    
    function overrideConsole() {
        console.log = function() {
            originalLog.apply(console, arguments);
            addLog('log', arguments);
        };
        
        console.error = function() {
            originalError.apply(console, arguments);
            addLog('error', arguments);
        };
        
        console.warn = function() {
            originalWarn.apply(console, arguments);
            addLog('warn', arguments);
        };
        
        console.info = function() {
            originalInfo.apply(console, arguments);
            addLog('info', arguments);
        };
    }
    
    function startFlushTimer() {
        if (flushTimer) {
            clearInterval(flushTimer);
        }
        flushTimer = setInterval(flushLogs, CONFIG.flushInterval);
    }
    
    function stopFlushTimer() {
        if (flushTimer) {
            clearInterval(flushTimer);
            flushTimer = null;
        }
    }
    
    function init() {
        if (initialized) return;
        initialized = true;
        deviceId = getDeviceId();
        overrideConsole();
        
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', function() {
                if (CONFIG.enabled) flushLogs();
            });
            
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'hidden' && CONFIG.enabled) {
                    flushLogs();
                }
            });
        }
        
        originalLog.call(console, '[RemoteLogger] Initialized (disabled by default), deviceId:', deviceId);
    }
    
    function checkMacList(macList) {
        if (!macList || macList.length === 0) return false;
        
        var myMac = getDeviceMac();
        if (!myMac) return false;
        
        for (var i = 0; i < macList.length; i++) {
            var listMac = String(macList[i]).toUpperCase().replace(/[^A-F0-9]/g, '');
            if (listMac && myMac === listMac) {
                return true;
            }
        }
        return false;
    }
    
    window.FlixRemoteLogger = {
        init: init,
        flush: flushLogs,
        getDeviceMac: getDeviceMac,
        setEndpoint: function(url) {
            CONFIG.endpoint = url;
        },
        enable: function() {
            CONFIG.enabled = true;
            startFlushTimer();
            originalLog.call(console, '[RemoteLogger] ENABLED - logs will be sent to backend');
        },
        disable: function() {
            CONFIG.enabled = false;
            flushLogs();
            stopFlushTimer();
            originalLog.call(console, '[RemoteLogger] DISABLED - logs will NOT be sent');
        },
        isEnabled: function() {
            return CONFIG.enabled;
        },
        checkMacList: function(macList) {
            var match = checkMacList(macList);
            if (match) {
                this.enable();
            } else {
                this.disable();
            }
            return match;
        },
        setDebug: function(val) {
            CONFIG.debug = !!val;
        }
    };
    
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
})();
