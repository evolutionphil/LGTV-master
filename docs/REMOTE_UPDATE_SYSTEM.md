# FLIX IPTV - Uzaktan Güncelleme Sistemi

Bu belge, uygulamayı mağazaya tekrar göndermeden CSS ve JavaScript dosyalarını güncelleme sistemini açıklar.

---

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Cloudflare Kurulumu](#cloudflare-kurulumu)
3. [Dosya Güncelleme](#dosya-güncelleme)
4. [Manifest Yönetimi](#manifest-yönetimi)
5. [Sorun Giderme](#sorun-giderme)

---

## Genel Bakış

### Nasıl Çalışır?

```
TV Uygulaması Açılır
        ↓
   Manifest Kontrol (2KB)
        ↓
┌───────────────────────────────────┐
│ Yeni versiyon var mı?            │
├───────────────────────────────────┤
│ EVET → Değişen dosyaları indir   │
│        Cache'e kaydet            │
│        Uygula                     │
├───────────────────────────────────┤
│ HAYIR → Cache'den yükle          │
│         (anında başla)           │
├───────────────────────────────────┤
│ HATA → Yerel dosyaları kullan    │
└───────────────────────────────────┘
```

### Dosya Yapısı

```
remote-assets/
├── manifest.json          # Versiyon bilgileri
├── css/                   # 18 CSS dosyası
│   ├── style.css
│   ├── variables.css
│   ├── responsive.css
│   ├── loader.css
│   ├── login.css
│   ├── homepage.css
│   ├── channel_page.css
│   ├── vod_series_summary.css
│   ├── vod_series_player_page.css
│   ├── guide.css
│   ├── catchup.css
│   ├── search_page.css
│   ├── subtitle.css
│   ├── movie_grid.css
│   ├── rating.css
│   ├── storage_page.css
│   ├── youtube_page.css
│   └── gallary.css
└── js/                    # 30 JavaScript dosyası
    ├── Models/
    │   ├── VodModel.js
    │   ├── LiveModel.js
    │   └── SeriesModel.js
    ├── common.js
    ├── common_with_encrypt.js
    ├── main.js
    ├── keyTizen.js
    ├── time_helper.js
    ├── language_codes.js
    ├── seasons_variable.js
    ├── episode_variable.js
    ├── home_operation.js
    ├── login_operation.js
    ├── channel_operation.js
    ├── vod_summary.js
    ├── series_summary.js
    ├── player.js
    ├── vod_series_player.js
    ├── guide_page.js
    ├── catchup.js
    ├── search_page.js
    ├── youtube_page.js
    ├── storage_operation.js
    ├── image_page.js
    ├── settings.js
    ├── trailer.js
    ├── srt_operation.js
    ├── srt_parser.js
    ├── subtitle_fetcher.js
    └── enhanced_subtitle_workflow.js
```

### Dahil Edilmeyen Dosyalar

| Dosya Tipi | Neden Dahil Edilmedi |
|------------|----------------------|
| **Görüntüler (images/)** | localStorage limiti ~5MB, binary dosyalar desteklenmiyor. Görüntüleri CDN URL'leri ile CSS içinde referans verin. |
| **Kütüphane dosyaları (libs/)** | jQuery, Bootstrap, CAPH vb. nadiren değişir, paket boyutunu artırır. |
| **remote-loader.js, remote-config.js** | Bunlar yükleyici kendisi, uzaktan güncellenmemeli. |
| **Platform dosyaları** | Tizen/WebOS spesifik dosyalar yerelde kalmalı. |

### Görüntüleri Güncelleme

Görüntüleri uzaktan güncellemek için:

1. Yeni görüntüyü CDN'e yükle (örn: `https://flixapp.pages.dev/images/yeni-logo.png`)
2. CSS dosyasında URL'i güncelle:
   ```css
   .logo {
       background-image: url('https://flixapp.pages.dev/images/yeni-logo.png');
   }
   ```
3. CSS'i remote update ile gönder

---

## Cloudflare Kurulumu

### Adım 1: Cloudflare Hesabı

1. https://cloudflare.com adresine git
2. "Sign Up" ile ücretsiz hesap oluştur
3. E-posta doğrulamasını tamamla

### Adım 2: Domain Ekleme

1. Dashboard'da "Add a Site" butonuna tıkla
2. Domain adını gir: `flixapp.net`
3. "Free" planı seç
4. DNS kayıtlarını otomatik tarasın

### Adım 3: Nameserver Değişikliği

Cloudflare sana 2 nameserver verecek. Bunları domain sağlayıcında güncelle:

```
ns1.cloudflare.com
ns2.cloudflare.com
```

**Not:** Değişiklik 24 saate kadar sürebilir.

### Adım 4: SSL/HTTPS Ayarları

1. Sol menüden **SSL/TLS** seç
2. **Full (strict)** modunu seç
3. **Edge Certificates** altında:
   - "Always Use HTTPS" → ON
   - "Automatic HTTPS Rewrites" → ON

### Adım 5: CDN Subdomain Oluşturma

1. Sol menüden **DNS** seç
2. "Add Record" butonuna tıkla:
   - Type: `CNAME`
   - Name: `cdn`
   - Target: `flixapp.net` (veya hosting IP'si)
   - Proxy status: **Proxied** (turuncu bulut)
3. Save

Artık `https://cdn.flixapp.net` kullanılabilir!

### Adım 6: Cache Ayarları

1. Sol menüden **Caching** → **Configuration**
2. **Browser Cache TTL**: 1 hour
3. **Caching Level**: Standard

### Adım 7: Page Rules (Opsiyonel)

Manifest dosyasının cache'lenmemesi için:

1. **Rules** → **Page Rules**
2. Create Page Rule:
   - URL: `cdn.flixapp.net/manifest.json`
   - Setting: Cache Level → Bypass

---

## Dosya Güncelleme

### Basit Güncelleme (Manuel)

1. CSS veya JS dosyasını düzenle
2. Manifest oluştur:
   ```bash
   node tools/generate-manifest.js --bump=patch
   ```
3. Dosyaları CDN'e yükle:
   - `remote-assets/manifest.json`
   - Değiştirdiğin CSS/JS dosyaları

### Otomatik Güncelleme

```bash
# Tüm manifest'i yenile
node tools/generate-manifest.js

# Patch versiyon artır (1.0.0 → 1.0.1)
node tools/generate-manifest.js --bump=patch

# Minor versiyon artır (1.0.1 → 1.1.0)
node tools/generate-manifest.js --bump=minor

# Sadece belirli dosyayı güncelle
node tools/generate-manifest.js --file=js/common.js
```

### FTP/SFTP ile Yükleme

Hosting'e bağlan ve şu dosyaları yükle:

```
cdn.flixapp.net/
├── manifest.json
├── css/
│   └── [değişen CSS dosyaları]
└── js/
    └── [değişen JS dosyaları]
```

---

## Manifest Yönetimi

### Manifest Yapısı

```json
{
  "version": "1.0.0",
  "lastUpdate": "2025-01-15T00:00:00Z",
  "killSwitch": false,
  "baseUrl": "https://cdn.flixapp.net/assets/",
  "timeout": 5000,
  "files": {
    "css/style.css": {
      "version": "1.0.0",
      "size": 18000,
      "hash": "abc12345",
      "priority": 1
    }
  }
}
```

### Alanlar

| Alan | Açıklama |
|------|----------|
| `version` | Manifest versiyonu |
| `killSwitch` | `true` yapılırsa tüm uzak dosyalar devre dışı |
| `baseUrl` | Dosyaların indirileceği URL |
| `timeout` | İndirme timeout süresi (ms) |
| `files` | Dosya listesi ve versiyonları |
| `priority` | Yükleme önceliği (1=en yüksek) |

### Kill Switch (Acil Durum)

Uzak dosyalarda kritik hata varsa:

1. `manifest.json` dosyasını aç
2. `"killSwitch": true` yap
3. CDN'e yükle

Tüm TV'ler otomatik olarak yerel dosyalara dönecek.

---

## Sorun Giderme

### TV Güncellemeyi Almıyor

1. **Cache temizle:** TV ayarlarından uygulama cache'ini temizle
2. **Manifest kontrol:** `https://cdn.flixapp.net/manifest.json` erişilebilir mi?
3. **CORS kontrol:** Browser console'da CORS hatası var mı?

### Dosyalar Yüklenmiyor

1. **Network hatası:** TV'nin interneti var mı?
2. **Timeout:** Dosya boyutu çok büyükse timeout artır
3. **HTTPS:** Sertifika geçerli mi?

### Hatalı Güncelleme Yayınladım

1. Kill switch'i aktifle (`killSwitch: true`)
2. Hatayı düzelt
3. Yeni versiyon yayınla
4. Kill switch'i kapat

### Debug Modu

Uygulamada debug modunu aç:

```javascript
RemoteLoader.init({
    manifestUrl: 'https://cdn.flixapp.net/manifest.json',
    debug: true,  // Console'da log göster
    onComplete: function(result) {
        console.log('Loaded:', result.loadedFiles);
        console.log('Failed:', result.failedFiles);
    }
});
```

---

## Güvenlik Notları

1. **HTTPS zorunlu** - Tizen ve WebOS sadece HTTPS kabul eder
2. **CORS açık olmalı** - Cloudflare bunu otomatik yapar
3. **Dosya bütünlüğü** - Hash kontrolü ile değişiklik algılanır
4. **Fallback** - Hata durumunda yerel dosyalar kullanılır

---

## SSS

**S: Her açılışta dosyalar indirilir mi?**
H: Hayır, sadece manifest kontrol edilir (2KB). Dosyalar cache'den yüklenir.

**S: İnternet yoksa ne olur?**
C: Yerel dosyalar kullanılır, uygulama normal çalışır.

**S: Ne kadar alan kullanır?**
C: localStorage'da ~1MB (tüm dosyalar cache'lenirse)

**S: Hangi dosyalar güncellenebilir?**
C: Tüm CSS ve JS dosyaları. config.xml/appinfo.json hariç.
