
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const hostname = '0.0.0.0';
const port = 5000;

// Log dosyası
const LOG_FILE = path.join(__dirname, 'logs', 'tv-console.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB max

// logs klasörünü oluştur
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
}

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Log rotation - eğer dosya çok büyükse temizle
function rotateLogIfNeeded() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      var stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        var backupFile = LOG_FILE + '.old';
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
        }
        fs.renameSync(LOG_FILE, backupFile);
        console.log('Log rotated: tv-console.log -> tv-console.log.old');
      }
    }
  } catch (e) {
    console.error('Log rotation error:', e);
  }
}

// Log yazma fonksiyonu
function appendLog(logEntry) {
  rotateLogIfNeeded();
  var timestamp = new Date().toISOString();
  var line = '[' + timestamp + '] ' + logEntry + '\n';
  fs.appendFile(LOG_FILE, line, function(err) {
    if (err) console.error('Log write error:', err);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // CORS headers for API endpoints
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  // API: POST /api/logs - TV'den log al
  if (pathname === '/api/logs' && req.method === 'POST') {
    var body = '';
    req.on('data', function(chunk) {
      body += chunk.toString();
      // 1MB limit
      if (body.length > 1024 * 1024) {
        res.statusCode = 413;
        res.end('{"error":"Payload too large"}');
        req.destroy();
      }
    });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        var deviceId = data.deviceId || 'unknown';
        var logs = data.logs || [];
        
        console.log('📺 Received ' + logs.length + ' logs from device: ' + deviceId);
        
        logs.forEach(function(log) {
          var level = (log.level || 'LOG').toUpperCase();
          var msg = log.message || '';
          var ts = log.timestamp || '';
          appendLog('[' + deviceId + '] [' + level + '] [' + ts + '] ' + msg);
        });
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end('{"success":true,"received":' + logs.length + '}');
      } catch (e) {
        console.error('Log parse error:', e);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end('{"error":"Invalid JSON"}');
      }
    });
    return;
  }
  
  // API: GET /api/logs - Logları görüntüle
  if (pathname === '/api/logs' && req.method === 'GET') {
    var lines = parsedUrl.query.lines || 100;
    lines = parseInt(lines, 10);
    if (isNaN(lines) || lines < 1) lines = 100;
    if (lines > 10000) lines = 10000;
    
    fs.readFile(LOG_FILE, 'utf8', function(err, data) {
      res.setHeader('Content-Type', 'application/json');
      if (err) {
        if (err.code === 'ENOENT') {
          res.statusCode = 200;
          res.end('{"logs":[],"message":"No logs yet"}');
        } else {
          res.statusCode = 500;
          res.end('{"error":"Could not read logs"}');
        }
        return;
      }
      
      var allLines = data.split('\n').filter(function(l) { return l.trim(); });
      var lastLines = allLines.slice(-lines);
      res.statusCode = 200;
      res.end(JSON.stringify({ logs: lastLines, total: allLines.length, showing: lastLines.length }));
    });
    return;
  }
  
  // API: DELETE /api/logs - Logları temizle
  if (pathname === '/api/logs' && req.method === 'DELETE') {
    fs.writeFile(LOG_FILE, '', function(err) {
      res.setHeader('Content-Type', 'application/json');
      if (err) {
        res.statusCode = 500;
        res.end('{"error":"Could not clear logs"}');
        return;
      }
      console.log('📺 Logs cleared');
      res.statusCode = 200;
      res.end('{"success":true,"message":"Logs cleared"}');
    });
    return;
  }
  
  // API: GET /api/logs/stream - Real-time log viewer HTML
  if (pathname === '/api/logs/viewer') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>FLIX IPTV - Samsung TV Logs</title>
  <meta charset="utf-8">
  <style>
    body { background: #1a1a2e; color: #eee; font-family: monospace; margin: 0; padding: 20px; }
    h1 { color: #e94560; margin-bottom: 10px; }
    .controls { margin-bottom: 15px; }
    button { background: #e94560; color: white; border: none; padding: 8px 16px; cursor: pointer; margin-right: 10px; border-radius: 4px; }
    button:hover { background: #ff6b6b; }
    #log-container { background: #16213e; padding: 15px; border-radius: 8px; max-height: 70vh; overflow-y: auto; }
    .log-line { padding: 3px 0; border-bottom: 1px solid #0f3460; word-break: break-all; }
    .log-line.error { color: #ff6b6b; }
    .log-line.warn { color: #ffc107; }
    .log-line.info { color: #4fc3f7; }
    .status { color: #888; font-size: 12px; margin-top: 10px; }
    .auto-scroll { display: inline-flex; align-items: center; gap: 5px; }
    input[type="checkbox"] { width: 18px; height: 18px; }
  </style>
</head>
<body>
  <h1>📺 Samsung TV Console Logs</h1>
  <div class="controls">
    <button onclick="fetchLogs()">Refresh</button>
    <button onclick="clearLogs()">Clear Logs</button>
    <label class="auto-scroll">
      <input type="checkbox" id="autoRefresh" checked onchange="toggleAutoRefresh()">
      Auto-refresh (3s)
    </label>
  </div>
  <div id="log-container"></div>
  <div class="status" id="status">Loading...</div>
  
  <script>
    var autoRefreshInterval = null;
    
    function fetchLogs() {
      fetch('/api/logs?lines=500')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var container = document.getElementById('log-container');
          var wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
          
          if (data.logs && data.logs.length > 0) {
            container.innerHTML = data.logs.map(function(line) {
              var cls = 'log-line';
              if (line.indexOf('[ERROR]') > -1) cls += ' error';
              else if (line.indexOf('[WARN]') > -1) cls += ' warn';
              else if (line.indexOf('[INFO]') > -1) cls += ' info';
              return '<div class="' + cls + '">' + escapeHtml(line) + '</div>';
            }).join('');
            
            if (wasAtBottom) {
              container.scrollTop = container.scrollHeight;
            }
          } else {
            container.innerHTML = '<div class="log-line">No logs yet. Start using the TV app to see logs here.</div>';
          }
          document.getElementById('status').textContent = 'Total: ' + data.total + ' logs, Showing: ' + data.showing + ' | Last updated: ' + new Date().toLocaleTimeString();
        })
        .catch(function(e) {
          document.getElementById('status').textContent = 'Error: ' + e.message;
        });
    }
    
    function clearLogs() {
      if (confirm('Clear all logs?')) {
        fetch('/api/logs', { method: 'DELETE' })
          .then(function() { fetchLogs(); });
      }
    }
    
    function toggleAutoRefresh() {
      if (document.getElementById('autoRefresh').checked) {
        autoRefreshInterval = setInterval(fetchLogs, 3000);
      } else {
        clearInterval(autoRefreshInterval);
      }
    }
    
    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    fetchLogs();
    toggleAutoRefresh();
  </script>
</body>
</html>`);
    return;
  }
  
  // Default to index.html for root path
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Construct file path
  const filePath = path.join(__dirname, pathname);
  
  // Get file extension for MIME type
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    
    // Read and serve the file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>500 Internal Server Error</h1>');
        return;
      }
      
      res.statusCode = 200;
      res.setHeader('Content-Type', mimeType);
      
      // Cache busting for JavaScript and CSS files to force reload
      if (ext === '.js' || ext === '.css') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      
      res.end(data);
    });
  });
});

server.listen(port, hostname, () => {
  console.log('Server running at http://' + hostname + ':' + port + '/');
  console.log('Serving WebOS TV App - FLIX IPTV');
  console.log('📺 TV Log Viewer: http://' + hostname + ':' + port + '/api/logs/viewer');
});
