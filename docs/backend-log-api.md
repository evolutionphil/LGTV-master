# FLIX IPTV - Backend Log API

Samsung TV'lerden gelen console loglarını kaydetmek için flixapp.net'e eklenecek API.

---

## API Endpoints

### 1. POST /api/logs
TV'den gelen logları kaydeder.

**Request:**
```json
{
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "logs": [
    {
      "level": "log",
      "message": "Player initialized",
      "timestamp": "2026-01-30T10:15:30.123Z"
    },
    {
      "level": "error", 
      "message": "Network timeout",
      "timestamp": "2026-01-30T10:15:31.456Z"
    }
  ]
}
```

**Response:**
```json
{"success": true, "received": 2}
```

### 2. GET /api/logs?lines=100&device=AA:BB:CC
Son logları görüntüler (opsiyonel: device filtresi).

**Response:**
```json
{
  "logs": [
    "[2026-01-30T10:15:30Z] [AA:BB:CC:DD:EE:FF] [LOG] Player initialized",
    "[2026-01-30T10:15:31Z] [AA:BB:CC:DD:EE:FF] [ERROR] Network timeout"
  ],
  "total": 1500,
  "showing": 100
}
```

### 3. DELETE /api/logs
Tüm logları temizler.

---

## PHP Implementasyonu

```php
<?php
// /api/logs endpoint - flixapp.net için

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$logFile = __DIR__ . '/../logs/tv-console.log';
$maxLogSize = 10 * 1024 * 1024; // 10MB

// Log klasörü yoksa oluştur
$logDir = dirname($logFile);
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

// Log rotation
function rotateLog($file, $maxSize) {
    if (file_exists($file) && filesize($file) > $maxSize) {
        $backup = $file . '.old';
        if (file_exists($backup)) {
            unlink($backup);
        }
        rename($file, $backup);
    }
}

// POST - Log kaydet
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    
    // 1MB limit
    if (strlen($input) > 1024 * 1024) {
        http_response_code(413);
        echo json_encode(['error' => 'Payload too large']);
        exit;
    }
    
    $data = json_decode($input, true);
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }
    
    $deviceId = isset($data['deviceId']) ? $data['deviceId'] : 'unknown';
    $logs = isset($data['logs']) ? $data['logs'] : [];
    
    rotateLog($logFile, $maxLogSize);
    
    $lines = [];
    foreach ($logs as $log) {
        $level = isset($log['level']) ? strtoupper($log['level']) : 'LOG';
        $message = isset($log['message']) ? $log['message'] : '';
        $ts = isset($log['timestamp']) ? $log['timestamp'] : date('c');
        
        // Satır içi newline'ları temizle
        $message = str_replace(["\r\n", "\r", "\n"], ' ', $message);
        
        $lines[] = sprintf("[%s] [%s] [%s] [%s] %s\n",
            date('Y-m-d H:i:s'),
            $deviceId,
            $level,
            $ts,
            $message
        );
    }
    
    file_put_contents($logFile, implode('', $lines), FILE_APPEND | LOCK_EX);
    
    echo json_encode(['success' => true, 'received' => count($logs)]);
    exit;
}

// GET - Logları görüntüle
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $lines = isset($_GET['lines']) ? intval($_GET['lines']) : 100;
    $lines = max(1, min(10000, $lines));
    $device = isset($_GET['device']) ? $_GET['device'] : null;
    
    if (!file_exists($logFile)) {
        echo json_encode(['logs' => [], 'message' => 'No logs yet']);
        exit;
    }
    
    $content = file_get_contents($logFile);
    $allLines = array_filter(explode("\n", $content), function($l) { return trim($l) !== ''; });
    
    // Device filtresi
    if ($device) {
        $allLines = array_filter($allLines, function($l) use ($device) {
            return strpos($l, $device) !== false;
        });
        $allLines = array_values($allLines);
    }
    
    $lastLines = array_slice($allLines, -$lines);
    
    echo json_encode([
        'logs' => $lastLines,
        'total' => count($allLines),
        'showing' => count($lastLines)
    ]);
    exit;
}

// DELETE - Logları temizle
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    file_put_contents($logFile, '');
    echo json_encode(['success' => true, 'message' => 'Logs cleared']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
```

---

## Node.js/Express Implementasyonu

```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const LOG_FILE = path.join(__dirname, 'logs', 'tv-console.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// Log klasörü oluştur
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Log rotation
function rotateLog() {
    if (fs.existsSync(LOG_FILE)) {
        const stats = fs.statSync(LOG_FILE);
        if (stats.size > MAX_LOG_SIZE) {
            const backup = LOG_FILE + '.old';
            if (fs.existsSync(backup)) fs.unlinkSync(backup);
            fs.renameSync(LOG_FILE, backup);
        }
    }
}

// POST /api/logs - Log kaydet
app.post('/api/logs', (req, res) => {
    const { deviceId = 'unknown', logs = [] } = req.body;
    
    rotateLog();
    
    const lines = logs.map(log => {
        const level = (log.level || 'log').toUpperCase();
        const message = (log.message || '').replace(/[\r\n]+/g, ' ');
        const ts = log.timestamp || new Date().toISOString();
        
        return `[${new Date().toISOString()}] [${deviceId}] [${level}] [${ts}] ${message}\n`;
    });
    
    fs.appendFileSync(LOG_FILE, lines.join(''));
    
    res.json({ success: true, received: logs.length });
});

// GET /api/logs - Logları görüntüle
app.get('/api/logs', (req, res) => {
    let lines = parseInt(req.query.lines) || 100;
    lines = Math.max(1, Math.min(10000, lines));
    const device = req.query.device;
    
    if (!fs.existsSync(LOG_FILE)) {
        return res.json({ logs: [], message: 'No logs yet' });
    }
    
    let allLines = fs.readFileSync(LOG_FILE, 'utf8')
        .split('\n')
        .filter(l => l.trim());
    
    if (device) {
        allLines = allLines.filter(l => l.includes(device));
    }
    
    const lastLines = allLines.slice(-lines);
    
    res.json({
        logs: lastLines,
        total: allLines.length,
        showing: lastLines.length
    });
});

// DELETE /api/logs - Logları temizle
app.delete('/api/logs', (req, res) => {
    fs.writeFileSync(LOG_FILE, '');
    res.json({ success: true, message: 'Logs cleared' });
});

// Export for integration
module.exports = app;

// Standalone çalıştırma
if (require.main === module) {
    app.listen(3000, () => console.log('Log API running on port 3000'));
}
```

---

## Güvenlik Notları

1. **Rate Limiting** ekleyin (örn: IP başına dakikada 60 istek)
2. **Log dosyasını** web'den erişilemez bir yere koyun (`../logs/` gibi)
3. Opsiyonel: Basit bir **API token** kontrolü ekleyebilirsiniz

---

## Test

```bash
# Log gönder
curl -X POST https://flixapp.net/api/logs \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"TEST-TV","logs":[{"level":"log","message":"Test log","timestamp":"2026-01-30T10:00:00Z"}]}'

# Logları oku
curl https://flixapp.net/api/logs?lines=50

# Logları temizle
curl -X DELETE https://flixapp.net/api/logs
```
