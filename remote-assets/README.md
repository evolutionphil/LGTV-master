# Remote Assets Folder

Bu klasör CDN'e yüklenecek dosyaları içerir.

## Yapı

```
remote-assets/
├── manifest.json    # Ana manifest dosyası (her zaman yükle)
├── css/             # CSS dosyaları
└── js/              # JavaScript dosyaları
```

## Kullanım

1. CSS veya JS dosyasını düzenle
2. Bu klasöre kopyala
3. Manifest'i güncelle: `node tools/generate-manifest.js --bump=patch`
4. Tüm klasörü CDN'e yükle

## CDN URL

Dosyalar şu adresten erişilebilir olmalı:

- `https://cdn.flixapp.net/manifest.json`
- `https://cdn.flixapp.net/assets/css/style.css`
- `https://cdn.flixapp.net/assets/js/common.js`
