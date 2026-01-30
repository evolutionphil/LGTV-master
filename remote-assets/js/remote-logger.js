/**
 * FLIX IPTV - Remote Console Logger
 * Samsung TV loglarını backend'e gönderir
 * ES5 uyumlu
 */
(function() {
    'use strict';
    
    // Konfigürasyon
    var CONFIG = {
        enabled: true,
        // Backend URL - otomatik tespit veya window.FLIX_LOG_ENDPOINT ile override
        // Development: current origin, Production: flixapp.net
        endpoint: (function() {
            // Manuel override varsa kullan
            if (typeof window !== 'undefined' && window.FLIX_LOG_ENDPOINT) {
                return window.FLIX_LOG_ENDPOINT;
            }
            // Tizen/WebOS'ta origin yoksa veya file:// ise production endpoint kullan
            if (typeof window !== 'undefined' && window.location) {
                var origin = window.location.origin;
                // file:// veya boş origin durumunda production
                if (!origin || origin === 'null' || origin.indexOf('file:') === 0) {
                    return 'https://flixapp.net/api/logs';
                }
                // Development server (replit, localhost vs)
                return origin + '/api/logs';
            }
            return 'https://flixapp.net/api/logs';
        })(),
        // Logları toplu gönder
        batchSize: 20,
        // Gönderim aralığı (ms)
        flushInterval: 5000,
        // Maksimum bekleyen log sayısı
        maxPending: 200,
        // Debug mode - ekstra log
        debug: false
    };
    
    // Device ID - MAC veya benzersiz ID
    var deviceId = 'unknown';
    
    // Bekleyen loglar
    var pendingLogs = [];
    
    // Flush timer
    var flushTimer = null;
    
    // Orijinal console metodları
    var originalLog = console.log;
    var originalError = console.error;
    var originalWarn = console.warn;
    var originalInfo = console.info;
    
    /**
     * Device ID al
     */
    function getDeviceId() {
        // Önce localStorage'dan dene
        try {
            var stored = localStorage.getItem('flix_device_id');
            if (stored) {
                return stored;
            }
        } catch (e) {}
        
        // Tizen MAC adresi
        if (typeof webapis !== 'undefined' && webapis.network) {
            try {
                var mac = webapis.network.getMac();
                if (mac) {
                    try { localStorage.setItem('flix_device_id', mac); } catch (e) {}
                    return mac;
                }
            } catch (e) {}
        }
        
        // WebOS device ID
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
        
        // Fallback - random ID
        var randomId = 'tv_' + Math.random().toString(36).substr(2, 9);
        try { localStorage.setItem('flix_device_id', randomId); } catch (e) {}
        return randomId;
    }
    
    /**
     * Log entry oluştur
     */
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
    
    /**
     * Log ekle
     */
    function addLog(level, args) {
        if (!CONFIG.enabled) return;
        
        var entry = createLogEntry(level, args);
        pendingLogs.push(entry);
        
        // Maksimum limit
        if (pendingLogs.length > CONFIG.maxPending) {
            pendingLogs = pendingLogs.slice(-CONFIG.maxPending);
        }
        
        // Batch doluysa hemen gönder
        if (pendingLogs.length >= CONFIG.batchSize) {
            flushLogs();
        }
    }
    
    /**
     * Logları backend'e gönder
     */
    function flushLogs() {
        if (pendingLogs.length === 0) return;
        
        var logsToSend = pendingLogs.slice();
        pendingLogs = [];
        
        var payload = JSON.stringify({
            deviceId: deviceId,
            logs: logsToSend
        });
        
        // XMLHttpRequest kullan (ES5 uyumlu)
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
            // Hata durumunda logları geri ekle
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
    
    /**
     * Console metodlarını override et
     */
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
    
    /**
     * Periyodik flush başlat
     */
    function startFlushTimer() {
        if (flushTimer) {
            clearInterval(flushTimer);
        }
        flushTimer = setInterval(flushLogs, CONFIG.flushInterval);
    }
    
    /**
     * Logger'ı başlat
     */
    function init() {
        deviceId = getDeviceId();
        overrideConsole();
        startFlushTimer();
        
        // Sayfa kapanırken son logları gönder
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', function() {
                flushLogs();
            });
            
            // Visibility change - arka plana gidince flush
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'hidden') {
                    flushLogs();
                }
            });
        }
        
        originalLog.call(console, '[RemoteLogger] Initialized, deviceId:', deviceId);
    }
    
    // Global API
    window.FlixRemoteLogger = {
        init: init,
        flush: flushLogs,
        setEndpoint: function(url) {
            CONFIG.endpoint = url;
        },
        enable: function() {
            CONFIG.enabled = true;
        },
        disable: function() {
            CONFIG.enabled = false;
        },
        setDebug: function(val) {
            CONFIG.debug = !!val;
        }
    };
    
    // Otomatik başlat
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
})();
