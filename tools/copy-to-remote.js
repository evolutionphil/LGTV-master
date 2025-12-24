/**
 * FLIX IPTV - Copy Files to Remote Assets
 * 
 * Bu script degistirilen dosyalari remote-assets klasorune kopyalar.
 * Kullanim: node tools/copy-to-remote.js [--all] [--file=path]
 */

var fs = require('fs');
var path = require('path');

var CONFIG = {
    sourceDir: path.join(__dirname, '..'),
    destDir: path.join(__dirname, '..', 'remote-assets'),
    files: [
        'css/style.css',
        'css/variables.css',
        'css/responsive.css',
        'css/vod_series_summary.css',
        'css/vod_series_player_page.css',
        'css/channel_page.css',
        'css/homepage.css',
        'css/login.css',
        'css/guide.css',
        'css/catchup.css',
        'css/search_page.css',
        'css/subtitle.css',
        'css/movie_grid.css',
        'css/rating.css',
        'css/loader.css',
        'css/storage_page.css',
        'css/youtube_page.css',
        'css/gallary.css',
        'js/Models/VodModel.js',
        'js/Models/LiveModel.js',
        'js/Models/SeriesModel.js',
        'js/common.js',
        'js/common_with_encrypt.js',
        'js/main.js',
        'js/keyTizen.js',
        'js/time_helper.js',
        'js/language_codes.js',
        'js/seasons_variable.js',
        'js/episode_variable.js',
        'js/vod_summary.js',
        'js/series_summary.js',
        'js/player.js',
        'js/vod_series_player.js',
        'js/home_operation.js',
        'js/channel_operation.js',
        'js/login_operation.js',
        'js/guide_page.js',
        'js/catchup.js',
        'js/search_page.js',
        'js/youtube_page.js',
        'js/storage_operation.js',
        'js/image_page.js',
        'js/settings.js',
        'js/trailer.js',
        'js/srt_operation.js',
        'js/srt_parser.js',
        'js/subtitle_fetcher.js',
        'js/enhanced_subtitle_workflow.js'
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

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function copyFile(filePath) {
    var sourcePath = path.join(CONFIG.sourceDir, filePath);
    var destPath = path.join(CONFIG.destDir, filePath);
    
    if (!fs.existsSync(sourcePath)) {
        console.log('  [SKIP] ' + filePath + ' (not found)');
        return false;
    }
    
    ensureDir(path.dirname(destPath));
    
    fs.copyFileSync(sourcePath, destPath);
    console.log('  [OK]   ' + filePath);
    return true;
}

function main() {
    var args = parseArgs();
    
    console.log('Copying files to remote-assets...\n');
    
    var filesToCopy = [];
    
    if (args.file) {
        filesToCopy = [args.file];
    } else if (args.all) {
        filesToCopy = CONFIG.files;
    } else {
        console.log('Usage:');
        console.log('  node tools/copy-to-remote.js --all           Copy all files');
        console.log('  node tools/copy-to-remote.js --file=path     Copy specific file');
        console.log('');
        console.log('Example:');
        console.log('  node tools/copy-to-remote.js --all');
        console.log('  node tools/copy-to-remote.js --file=css/style.css');
        return;
    }
    
    var copied = 0;
    filesToCopy.forEach(function(file) {
        if (copyFile(file)) {
            copied++;
        }
    });
    
    console.log('\nCopied ' + copied + '/' + filesToCopy.length + ' files');
    console.log('\nNext steps:');
    console.log('1. node tools/generate-manifest.js --bump=patch');
    console.log('2. Upload remote-assets/ folder to CDN');
}

main();
