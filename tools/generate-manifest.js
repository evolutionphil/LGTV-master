/**
 * FLIX IPTV - Remote Manifest Generator
 * 
 * Bu script remote-assets/manifest.json dosyasini olusturur
 * Kullanim: node tools/generate-manifest.js
 * 
 * Parametreler:
 *   --bump=patch|minor|major  Versiyon arttir
 *   --file=path/to/file.js    Sadece bu dosyanin versiyonunu arttir
 *   --base-url=https://...    CDN base URL
 */

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var CONFIG = {
    manifestPath: path.join(__dirname, '..', 'remote-assets', 'manifest.json'),
    baseUrl: 'https://flixapp.pages.dev/',
    filesToInclude: [
        { path: 'css/style.css', priority: 1 },
        { path: 'css/variables.css', priority: 1 },
        { path: 'css/responsive.css', priority: 1 },
        { path: 'css/vod_series_summary.css', priority: 1 },
        { path: 'css/vod_series_player_page.css', priority: 2 },
        { path: 'css/channel_page.css', priority: 2 },
        { path: 'css/homepage.css', priority: 2 },
        { path: 'css/login.css', priority: 1 },
        { path: 'css/guide.css', priority: 3 },
        { path: 'css/catchup.css', priority: 3 },
        { path: 'css/search_page.css', priority: 3 },
        { path: 'css/subtitle.css', priority: 2 },
        { path: 'css/movie_grid.css', priority: 2 },
        { path: 'css/rating.css', priority: 2 },
        { path: 'css/loader.css', priority: 1 },
        { path: 'css/storage_page.css', priority: 3 },
        { path: 'css/youtube_page.css', priority: 3 },
        { path: 'css/gallary.css', priority: 3 },
        { path: 'js/Models/VodModel.js', priority: 1 },
        { path: 'js/Models/LiveModel.js', priority: 1 },
        { path: 'js/Models/SeriesModel.js', priority: 1 },
        { path: 'js/common.js', priority: 1 },
        { path: 'js/common_with_encrypt.js', priority: 1 },
        { path: 'js/main.js', priority: 1 },
        { path: 'js/keyTizen.js', priority: 1 },
        { path: 'js/time_helper.js', priority: 1 },
        { path: 'js/language_codes.js', priority: 1 },
        { path: 'js/seasons_variable.js', priority: 2 },
        { path: 'js/episode_variable.js', priority: 2 },
        { path: 'js/vod_summary.js', priority: 2 },
        { path: 'js/series_summary.js', priority: 2 },
        { path: 'js/player.js', priority: 2 },
        { path: 'js/vod_series_player.js', priority: 2 },
        { path: 'js/home_operation.js', priority: 1 },
        { path: 'js/channel_operation.js', priority: 2 },
        { path: 'js/login_operation.js', priority: 1 },
        { path: 'js/guide_page.js', priority: 3 },
        { path: 'js/catchup.js', priority: 3 },
        { path: 'js/search_page.js', priority: 3 },
        { path: 'js/youtube_page.js', priority: 3 },
        { path: 'js/storage_operation.js', priority: 3 },
        { path: 'js/image_page.js', priority: 3 },
        { path: 'js/settings.js', priority: 3 },
        { path: 'js/trailer.js', priority: 2 },
        { path: 'js/srt_operation.js', priority: 2 },
        { path: 'js/srt_parser.js', priority: 2 },
        { path: 'js/subtitle_fetcher.js', priority: 2 },
        { path: 'js/enhanced_subtitle_workflow.js', priority: 2 },
        { path: 'js/asset-bootstrapper.js', priority: 1 }
    ]
};

function parseArgs() {
    var args = {};
    process.argv.slice(2).forEach(function(arg) {
        if (arg.indexOf('--') === 0) {
            var parts = arg.substring(2).split('=');
            args[parts[0]] = parts[1] || true;
        }
    });
    return args;
}

function getFileSize(filePath) {
    try {
        var fullPath = path.join(__dirname, '..', filePath);
        var stats = fs.statSync(fullPath);
        return stats.size;
    } catch (e) {
        return 0;
    }
}

function getFileHash(filePath) {
    try {
        var fullPath = path.join(__dirname, '..', filePath);
        var content = fs.readFileSync(fullPath, 'utf8');
        // Use same simple hash as remote-loader.js for validation
        return simpleHash(content);
    } catch (e) {
        return '';
    }
}

// Must match simpleHash in remote-loader.js exactly
function simpleHash(str) {
    var hash = 0;
    if (str.length === 0) return hash.toString(16);
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return (hash >>> 0).toString(16);
}

function loadExistingManifest() {
    try {
        var content = fs.readFileSync(CONFIG.manifestPath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return {
            version: '0.0.0',
            files: {}
        };
    }
}

function bumpVersion(version, type) {
    var parts = version.split('.').map(Number);
    
    switch (type) {
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'patch':
        default:
            parts[2]++;
            break;
    }
    
    return parts.join('.');
}

function generateManifest(args) {
    var existing = loadExistingManifest();
    var baseUrl = args['base-url'] || CONFIG.baseUrl;
    
    var manifest = {
        version: existing.version,
        lastUpdate: new Date().toISOString(),
        killSwitch: false,
        forceRefresh: args['force-refresh'] === 'true' || false,
        cacheGeneration: existing.cacheGeneration || 1,
        maxAgeHours: 24,
        baseUrl: baseUrl,
        cachePrefix: 'flix_remote_',
        timeout: 5000,
        files: {}
    };
    
    if (args['force-refresh'] === 'true') {
        manifest.cacheGeneration = (existing.cacheGeneration || 0) + 1;
        console.log('Force refresh enabled - cache generation bumped to ' + manifest.cacheGeneration);
    }

    if (args.bump) {
        manifest.version = bumpVersion(existing.version, args.bump);
        console.log('Bumped version to ' + manifest.version);
    }

    CONFIG.filesToInclude.forEach(function(fileConfig) {
        var filePath = fileConfig.path;
        var size = getFileSize(filePath);
        var hash = getFileHash(filePath);
        
        if (size === 0) {
            console.log('Warning: File not found - ' + filePath);
            return;
        }

        var existingFile = existing.files[filePath] || {};
        var existingHash = existingFile.hash || '';
        
        var fileVersion = existingFile.version || '1.0.0';
        
        if (args.file === filePath) {
            fileVersion = bumpVersion(fileVersion, 'patch');
            console.log('Bumped ' + filePath + ' to v' + fileVersion);
        } else if (hash !== existingHash && existingHash !== '') {
            fileVersion = bumpVersion(fileVersion, 'patch');
            console.log('Auto-bumped ' + filePath + ' to v' + fileVersion + ' (content changed)');
        }

        manifest.files[filePath] = {
            version: fileVersion,
            size: size,
            hash: hash,
            priority: fileConfig.priority
        };
    });

    return manifest;
}

function saveManifest(manifest) {
    var dir = path.dirname(CONFIG.manifestPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(CONFIG.manifestPath, JSON.stringify(manifest, null, 2));
    console.log('\nManifest saved to: ' + CONFIG.manifestPath);
    console.log('Version: ' + manifest.version);
    console.log('Files: ' + Object.keys(manifest.files).length);
}

function printUsage() {
    console.log('FLIX IPTV Manifest Generator');
    console.log('----------------------------');
    console.log('Usage: node tools/generate-manifest.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --bump=patch|minor|major   Bump manifest version');
    console.log('  --file=path/to/file.js     Bump specific file version');
    console.log('  --base-url=https://...     Set CDN base URL');
    console.log('  --help                     Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node tools/generate-manifest.js');
    console.log('  node tools/generate-manifest.js --bump=patch');
    console.log('  node tools/generate-manifest.js --file=js/common.js');
}

function main() {
    var args = parseArgs();
    
    if (args.help) {
        printUsage();
        return;
    }
    
    console.log('Generating manifest...\n');
    
    var manifest = generateManifest(args);
    saveManifest(manifest);
    
    console.log('\nDone!');
}

main();
