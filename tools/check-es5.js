/**
 * FLIX IPTV - ES5 Compliance Checker
 * 
 * Bu script tum JS dosyalarini tarar ve ES6+ syntax bulur.
 * Kullanim: node tools/check-es5.js
 * 
 * Cikti:
 *   - ES6+ syntax iceren satirlar ve dosyalar
 *   - Onerilen duzeltmeler
 */

var fs = require('fs');
var path = require('path');

var CONFIG = {
    jsDir: path.join(__dirname, '..', 'js'),
    excludeDirs: ['libs', 'node_modules'],
    patterns: [
        { regex: /\blet\s+\w/g, name: 'let declaration', fix: 'Use var instead' },
        { regex: /\bconst\s+\w/g, name: 'const declaration', fix: 'Use var instead' },
        { regex: /=>\s*[\{\(]/g, name: 'arrow function', fix: 'Use function() {}' },
        { regex: /\)\s*=>\s*[^\{\(\s]/g, name: 'arrow function (expression)', fix: 'Use function() { return ...; }' },
        { regex: /`[^`]*\$\{/g, name: 'template literal', fix: 'Use string concatenation' },
        { regex: /\basync\s+function/g, name: 'async function', fix: 'Use callbacks or Promise polyfill' },
        { regex: /\bawait\s+/g, name: 'await keyword', fix: 'Use .then() callbacks' },
        { regex: /\.\.\.(\w+)/g, name: 'spread operator', fix: 'Use Array.prototype.concat or Object.assign polyfill' },
        { regex: /\bclass\s+\w+/g, name: 'class declaration', fix: 'Use function constructor' },
        { regex: /\bimport\s+/g, name: 'ES6 import', fix: 'Use script tags or require' },
        { regex: /\bexport\s+/g, name: 'ES6 export', fix: 'Use global variables' },
        // Object.assign has polyfill in asset-bootstrapper.js - skip check
        // { regex: /\bObject\.assign\(/g, name: 'Object.assign', fix: 'Add polyfill or use manual copy' },
        { regex: /\bArray\.from\(/g, name: 'Array.from', fix: 'Add polyfill or use slice.call' },
        { regex: /\bSymbol\(/g, name: 'Symbol', fix: 'Avoid or add polyfill' },
        { regex: /\bSet\(/g, name: 'Set constructor', fix: 'Use object as hash map' },
        { regex: /\bMap\(/g, name: 'Map constructor', fix: 'Use object as hash map' },
        { regex: /\bfor\s*\(\s*(var|let|const)\s+\w+\s+of\s+/g, name: 'for...of loop', fix: 'Use for(var i=0;...) or forEach' },
        { regex: /\bPromise\s*\./g, name: 'Promise static method', fix: 'Use callbacks' },
        { regex: /new\s+Promise\s*\(/g, name: 'Promise constructor', fix: 'Use callbacks' }
    ]
};

function getAllJsFiles(dir, fileList) {
    fileList = fileList || [];
    var files = fs.readdirSync(dir);
    
    files.forEach(function(file) {
        var filePath = path.join(dir, file);
        var stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (CONFIG.excludeDirs.indexOf(file) === -1) {
                getAllJsFiles(filePath, fileList);
            }
        } else if (file.match(/\.js$/)) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

function checkFile(filePath) {
    var content = fs.readFileSync(filePath, 'utf8');
    var lines = content.split('\n');
    var issues = [];
    
    lines.forEach(function(line, index) {
        var lineNum = index + 1;
        
        // Skip comments
        var trimmedLine = line.trim();
        if (trimmedLine.indexOf('//') === 0) return;
        if (trimmedLine.indexOf('/*') === 0) return;
        if (trimmedLine.indexOf('*') === 0) return;
        
        CONFIG.patterns.forEach(function(pattern) {
            var matches = line.match(pattern.regex);
            if (matches) {
                issues.push({
                    line: lineNum,
                    pattern: pattern.name,
                    fix: pattern.fix,
                    code: line.trim().substring(0, 80)
                });
            }
        });
    });
    
    return issues;
}

function main() {
    console.log('FLIX IPTV - ES5 Compliance Checker\n');
    console.log('Scanning: ' + CONFIG.jsDir + '\n');
    
    var files = getAllJsFiles(CONFIG.jsDir);
    var totalIssues = 0;
    var filesWithIssues = [];
    
    files.forEach(function(file) {
        var relativePath = path.relative(path.join(__dirname, '..'), file);
        var issues = checkFile(file);
        
        if (issues.length > 0) {
            filesWithIssues.push({
                path: relativePath,
                issues: issues
            });
            totalIssues += issues.length;
        }
    });
    
    if (filesWithIssues.length === 0) {
        console.log('✓ All ' + files.length + ' files are ES5 compliant!\n');
        console.log('Note: Make sure polyfills are loaded for:');
        console.log('  - Array.prototype.includes');
        console.log('  - String.prototype.includes');
        console.log('  - Array.prototype.find');
        console.log('  - Array.prototype.findIndex');
        return;
    }
    
    console.log('Found ' + totalIssues + ' potential ES6+ issues in ' + filesWithIssues.length + ' files:\n');
    
    filesWithIssues.forEach(function(fileInfo) {
        console.log('----------------------------------------');
        console.log('FILE: ' + fileInfo.path);
        console.log('----------------------------------------');
        
        fileInfo.issues.forEach(function(issue) {
            console.log('  Line ' + issue.line + ': ' + issue.pattern);
            console.log('    Code: ' + issue.code);
            console.log('    Fix:  ' + issue.fix);
            console.log('');
        });
    });
    
    console.log('\nSummary: ' + totalIssues + ' issues in ' + filesWithIssues.length + '/' + files.length + ' files');
    process.exit(1);
}

main();
