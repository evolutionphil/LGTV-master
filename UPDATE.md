# FLIX IPTV - Update Plan v1.1

**Created:** December 4, 2025  
**Target:** Samsung Tizen 2.4+ (2016+) and LG WebOS 3.0+ (2016+)  
**Priority:** Bug fixes and compatibility improvements  
**Rule:** No existing functionality will be broken

---

## How To Use This Document

1. Each task is numbered and independent
2. Complete one task at a time
3. Test the app after each task
4. If something breaks, revert that specific task
5. Move to the next task only after successful testing

---

## Task List Summary

| # | Task | Type | Risk Level |
|---|------|------|------------|
| 1 | Delete attached_assets folder | Cleanup | Very Low |
| 2 | Add production logging flag | Performance | Very Low |
| 3 | Implement URL caching | Performance | Low |
| 4 | Fix black screen on STOP | Bug Fix | Low |
| 5 | Fix favorites empty slot bug | Bug Fix | Low |
| 6 | Fix Movie favorites not saving | Bug Fix | Low |
| 7 | Fix broken background image | Bug Fix | Very Low |
| 8 | Add RETURN/BACK key support | Enhancement | Low |
| 9 | Fix double focus on player overlay | CSS Fix | Very Low |
| 10 | Fix config.xml API version | Config | Very Low |
| 11 | Add 4K/8K detection privileges | Config | Very Low |
| 12 | Add mouse support | Config | Very Low |
| 13 | Add IME keyboard handling | Enhancement | Low |
| 14 | Add mediastorage privilege | Config | Very Low |
| 15 | Fix CSS custom properties | Compatibility | Low |
| 16 | Fix USB Storage Play | Bug Fix | Medium |

---

## Recommended Testing Order

**Start with low-risk config changes:**
1. Tasks 10, 11, 12, 14 (config.xml only - very safe)

**Then CSS fixes:**
2. Tasks 9, 15 (visual only - easy to verify)

**Then bug fixes:**
3. Tasks 4, 5, 6, 7 (specific issues - test each feature)

**Then enhancements:**
4. Tasks 8, 13 (new features - test keyboard)

**Then performance:**
5. Tasks 2, 3 (optimization - test playback)

**Cleanup:**
6. Task 1 (folder deletion - verify build)

**Last - USB fix:**
7. Task 16 (most complex - needs USB drive to test)

---

## Backup Before Starting

Before making any changes:
```bash
git checkout -b update-v1.1
git commit -am "Pre-update backup"
```

After each successful task:
```bash
git commit -am "Task X complete"
```

---

# TASK 1: Delete attached_assets Folder

## What
Remove the `attached_assets/` folder from the project root.

## Why
This folder is not used by the app and was likely created during development. Removing it reduces package size and cleans up the project.

## How
```bash
rm -rf attached_assets/
```

## Files Changed
- Delete: `attached_assets/` (entire folder)

## Testing
1. Build the app
2. Launch on TV
3. Verify all pages load normally
4. Verify all images display correctly

## Rollback
If any issues, the folder can be restored from git.

---

# TASK 2: Add Production Logging Flag

## What
Add a global flag to control console logging. In production, verbose logs will be disabled to improve performance.

## Why
Excessive console.log statements slow down older TVs (especially 2016-2018 models). Production builds should minimize logging.

## How

### Step 1: Add global flag at the top of `js/common.js`:
```javascript
var DEBUG_MODE = false; // Set to true for development, false for production
```

### Step 2: Create helper function in `js/common.js`:
```javascript
function debugLog() {
    if (DEBUG_MODE && console && console.log) {
        console.log.apply(console, arguments);
    }
}
```

### Step 3: In `js/player.js` and `js/channel_operation.js`:
Replace verbose console.log calls with debugLog():
- Keep error logs (console.error) - these are important
- Replace info/debug logs with debugLog()
- Focus on high-frequency logs (inside loops, event handlers, playback events)

## Files Changed
- `js/common.js` - Add DEBUG_MODE flag and debugLog function
- `js/player.js` - Replace verbose logs with debugLog
- `js/channel_operation.js` - Replace verbose logs with debugLog

## Testing
1. Set DEBUG_MODE = true, verify logs appear in console
2. Set DEBUG_MODE = false, verify logs are suppressed
3. Verify playback works correctly in both modes
4. Verify channel switching works correctly

## Rollback
Remove the DEBUG_MODE flag and revert console.log changes.

---

# TASK 3: Implement URL Caching

## What
Cache stream URLs for recently watched channels/VOD content with a 5-10 minute expiry time.

## Why
Currently, every time you switch back to a channel you watched 2 minutes ago, the app fetches a new stream URL from the server. Caching reduces API calls and speeds up channel switching.

## How

### Step 1: Create URL cache object in `js/common.js`:
```javascript
var urlCache = {
    cache: {},
    maxAge: 5 * 60 * 1000, // 5 minutes in milliseconds
    
    set: function(key, url) {
        this.cache[key] = {
            url: url,
            timestamp: Date.now()
        };
    },
    
    get: function(key) {
        var entry = this.cache[key];
        if (!entry) return null;
        
        // Check if expired
        if (Date.now() - entry.timestamp > this.maxAge) {
            delete this.cache[key];
            return null;
        }
        
        return entry.url;
    },
    
    clear: function() {
        this.cache = {};
    }
};
```

### Step 2: In `js/channel_operation.js`, before fetching stream URL:
```javascript
// Check cache first
var cacheKey = 'live_' + channel.stream_id;
var cachedUrl = urlCache.get(cacheKey);
if (cachedUrl) {
    // Use cached URL
    playStream(cachedUrl);
    return;
}

// Fetch new URL and cache it
fetchStreamUrl(channel, function(url) {
    urlCache.set(cacheKey, url);
    playStream(url);
});
```

### Step 3: Apply same pattern in VOD and Series player files.

## Files Changed
- `js/common.js` - Add urlCache object
- `js/channel_operation.js` - Use cache for live channels
- `js/vod_series_player.js` - Use cache for VOD/Series

## Testing
1. Play a channel, note the load time
2. Switch to another channel
3. Switch back to first channel - should load faster
4. Wait 6 minutes, try again - should fetch fresh URL
5. Verify playback quality is not affected

## Rollback
Remove urlCache object and revert to direct URL fetching.

---

# TASK 4: Fix Black Screen on STOP Button

## What
When user presses STOP button during VOD/Series playback, the screen goes black instead of returning to the content list.

## Why
The current stop handler closes AVPlay but doesn't properly:
- Hide the player page
- Reset fullscreen state
- Navigate back to the movie/series list

## How

### Step 1: In `js/vod_series_player.js`, locate the STOP key handler (keyCode 413 or 10252).

### Step 2: Create or update the gracefulStop function:
```javascript
function gracefulStop() {
    try {
        // 1. Stop AVPlay if playing
        if (webapis && webapis.avplay) {
            var state = webapis.avplay.getState();
            if (state !== 'NONE' && state !== 'IDLE') {
                webapis.avplay.stop();
            }
            webapis.avplay.close();
        }
    } catch (e) {
        console.error('Error stopping AVPlay:', e);
    }
    
    // 2. Hide player container
    $('#player-page').hide();
    $('#player-container').hide();
    
    // 3. Reset fullscreen state
    isFullscreen = false;
    
    // 4. Show the content list page
    if (currentContentType === 'movie') {
        showPage('vod-page');
        // Re-focus on the movie that was playing
    } else if (currentContentType === 'series') {
        showPage('series-page');
        // Re-focus on the episode that was playing
    }
    
    // 5. Restore navigation
    enableNavigation();
}
```

### Step 3: Update STOP key handler to call gracefulStop():
```javascript
case 413:  // STOP on Samsung
case 10252: // VK_STOP
    gracefulStop();
    break;
```

## Files Changed
- `js/vod_series_player.js` - Add gracefulStop function and update STOP handler

## Testing
1. Play a movie
2. Press STOP button on remote
3. Verify: Player closes, movie list appears, no black screen
4. Play a series episode
5. Press STOP button
6. Verify: Player closes, series/episode list appears
7. Verify: Can navigate and play another item

## Rollback
Revert STOP handler to previous implementation.

---

# TASK 5: Fix Favorites Empty Slot Bug

## What
When removing a favorite from the detail page, returning to favorites shows an empty slot where the item was.

## Why
The favorites grid/list DOM is not refreshed after removing an item. The model is updated but the UI still shows the old layout.

## How

### Step 1: In `js/channel_operation.js` or wherever favorites are managed, locate the remove favorite function.

### Step 2: After removing from model, trigger UI refresh:
```javascript
function removeFromFavorites(item, type) {
    // 1. Remove from model (existing code)
    FavoritesModel.remove(item.id, type);
    
    // 2. Refresh the favorites UI
    if (typeof refreshFavoritesGrid === 'function') {
        refreshFavoritesGrid(type);
    }
}
```

### Step 3: Create refreshFavoritesGrid function if it doesn't exist:
```javascript
function refreshFavoritesGrid(type) {
    // Clear existing grid
    var container = $('#favorites-' + type + '-container');
    container.empty();
    
    // Get updated favorites from model
    var favorites = FavoritesModel.getAll(type);
    
    // Rebuild the grid
    favorites.forEach(function(item) {
        var element = createFavoriteElement(item, type);
        container.append(element);
    });
    
    // Handle empty state
    if (favorites.length === 0) {
        container.append('<div class="empty-message">No favorites yet</div>');
    }
    
    // Re-initialize navigation
    initializeFavoritesNavigation();
}
```

### Step 4: Call refresh when returning from detail page:
```javascript
function onReturnFromDetailPage() {
    if (previousPage === 'favorites') {
        refreshFavoritesGrid(currentType);
    }
}
```

## Files Changed
- `js/channel_operation.js` - Add refreshFavoritesGrid function
- `js/home_operation.js` - Call refresh on return from detail

## Testing
1. Add 3 channels to favorites
2. Go to favorites page, verify all 3 show
3. Click on middle favorite to open detail
4. Remove from favorites
5. Press BACK to return to favorites
6. Verify: Only 2 items show, no empty slot, proper layout

## Rollback
Revert to previous favorites handling.

---

# TASK 6: Fix Movie Favorites Not Saving

## What
Movie favorites are not being saved/retrieved properly.

## Why
The VodModel uses inconsistent ID fields. When adding a favorite, it may use `id`, but when reading, it looks for `stream_id`. This mismatch causes favorites to not be found.

## How

### Step 1: Locate VodModel in the codebase (likely in `js/models/` or `js/common.js`).

### Step 2: Audit the add function:
```javascript
// CURRENT (problematic)
function addFavorite(movie) {
    var id = movie.id; // Sometimes undefined
    localStorage.setItem('fav_movie_' + id, JSON.stringify(movie));
}

// FIXED
function addFavorite(movie) {
    var id = movie.stream_id || movie.id; // Use stream_id as primary
    if (!id) {
        console.error('Cannot add favorite: no ID found');
        return false;
    }
    localStorage.setItem('fav_movie_' + id, JSON.stringify(movie));
    return true;
}
```

### Step 3: Audit the read/check function:
```javascript
// CURRENT (problematic)
function isFavorite(movie) {
    var id = movie.stream_id; // Doesn't match what was saved
    return localStorage.getItem('fav_movie_' + id) !== null;
}

// FIXED
function isFavorite(movie) {
    var id = movie.stream_id || movie.id; // Same logic as add
    return localStorage.getItem('fav_movie_' + id) !== null;
}
```

### Step 4: Ensure all VodModel functions use consistent ID:
- addFavorite
- removeFavorite
- isFavorite
- getAllFavorites

## Files Changed
- `js/vod_model.js` or wherever VodModel is defined
- Possibly `js/common.js` if model is defined there

## Testing
1. Browse to Movies section
2. Open a movie detail page
3. Add to favorites
4. Navigate away
5. Return to movie - verify heart icon shows it's favorited
6. Go to Favorites section - verify movie appears
7. Restart app - verify favorite persists
8. Remove favorite - verify it's removed properly

## Rollback
Revert VodModel ID handling.

---

# TASK 7: Fix Broken Background Image

## What
On movie detail page, when a movie has no backdrop image, the background shows a broken image icon.

## Why
The code sets an empty src on `.vod-series-background-img`, which shows as broken.

## How

### Step 1: Locate where backdrop is set (likely in `js/vod_operation.js` or `js/vod_series_player.js`).

### Step 2: Add validation before setting src:
```javascript
// CURRENT (problematic)
$('.vod-series-background-img').attr('src', movie.backdrop_path);

// FIXED
if (movie.backdrop_path && movie.backdrop_path.length > 0) {
    $('.vod-series-background-img').attr('src', movie.backdrop_path).show();
} else {
    // Option A: Hide the element
    $('.vod-series-background-img').hide();
    
    // Option B: Use fallback image (if you have one)
    // $('.vod-series-background-img').attr('src', 'images/default-backdrop.jpg').show();
    
    // Option C: Use poster as fallback
    // if (movie.cover) {
    //     $('.vod-series-background-img').attr('src', movie.cover).show();
    // } else {
    //     $('.vod-series-background-img').hide();
    // }
}
```

### Step 3: Also handle image load error:
```javascript
$('.vod-series-background-img').on('error', function() {
    $(this).hide();
});
```

## Files Changed
- `js/vod_operation.js` or `js/vod_series_player.js` - Add backdrop validation

## Testing
1. Find a movie WITH backdrop - verify it displays
2. Find a movie WITHOUT backdrop - verify no broken image
3. Verify layout looks good in both cases

## Rollback
Revert backdrop handling.

---

# TASK 8: Add RETURN/BACK Key Support

## What
Map the BACK/RETURN key on Samsung and LG remotes to navigate back through the app.

## Why
Currently BACK key may not work consistently, leaving users stuck on certain pages.

## How

### Step 1: Identify key codes:
- Samsung RETURN: 10009
- LG BACK: 461
- Standard BACKSPACE: 8

### Step 2: In the global key handler (likely `js/common.js` or `js/key_handler.js`):
```javascript
document.addEventListener('keydown', function(e) {
    var keyCode = e.keyCode;
    
    // BACK/RETURN key
    if (keyCode === 10009 || keyCode === 461 || keyCode === 8) {
        e.preventDefault();
        handleBackKey();
        return;
    }
    
    // ... other key handlers
});
```

### Step 3: Create handleBackKey function:
```javascript
function handleBackKey() {
    // 1. If modal is open, close it first
    if (isModalOpen()) {
        closeCurrentModal();
        return;
    }
    
    // 2. If in player, stop and return to list
    if (isPlayerActive()) {
        gracefulStop();
        return;
    }
    
    // 3. If on sub-page, go back to parent
    var currentPage = getCurrentPage();
    
    switch (currentPage) {
        case 'channel-detail':
            showPage('channels');
            break;
        case 'movie-detail':
            showPage('movies');
            break;
        case 'series-detail':
            showPage('series');
            break;
        case 'episode-list':
            showPage('series-detail');
            break;
        case 'settings-submenu':
            showPage('settings');
            break;
        case 'home':
            // On home page, show exit confirmation
            showExitConfirmation();
            break;
        default:
            // Go to home page
            showPage('home');
            break;
    }
}
```

## Files Changed
- `js/common.js` or `js/key_handler.js` - Add BACK key handler
- May need to update individual page handlers

## Testing
1. Navigate deep into the app (Home > Movies > Movie Detail)
2. Press BACK - should go to Movies
3. Press BACK - should go to Home
4. Press BACK - should show exit dialog
5. Test same flow with Live TV and Series
6. Test BACK while modal is open
7. Test BACK while playing video

## Rollback
Remove BACK key handler.

---

# TASK 9: Fix Double Focus on Player Overlay

## What
When using a remote to navigate player controls, both hover and focus styles apply, causing visual confusion.

## Why
CSS :hover styles activate even when using D-pad navigation, so icons show both hover and active/focus states.

## How

### Step 1: Locate player control CSS (likely in `css/style.css` or `css/player.css`).

### Step 2: Update hover selectors to exclude active/focused items:
```css
/* CURRENT (problematic) */
.player-control-icon:hover {
    background-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

/* FIXED */
.player-control-icon:hover:not(.active):not(.focused) {
    background-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}
```

### Step 3: Apply to all player overlay elements:
```css
.player-btn:hover:not(.active):not(.focused) { ... }
.progress-bar:hover:not(.active) { ... }
.volume-control:hover:not(.active) { ... }
```

## Files Changed
- `css/style.css` - Update hover selectors
- `css/player.css` - If player styles are separate

## Testing
1. Play a video
2. Show player overlay
3. Use D-pad to navigate controls
4. Verify: Only one control highlighted at a time
5. If using mouse (2021+ TVs), verify hover still works

## Rollback
Revert CSS hover selectors.

---

# TASK 10: Fix config.xml API Version

## What
Change `required_version` from "2.3" to "2.4" in config.xml.

## Why
- Tizen 2.3 is for 2015 TVs (not supported)
- Tizen 2.4 is for 2016 TVs (minimum supported)
- This ensures the app only installs on supported TVs

## How

### Step 1: Open `config.xml`

### Step 2: Find the tizen:application tag:
```xml
<!-- CURRENT -->
<tizen:application id="..." required_version="2.3"/>

<!-- FIXED -->
<tizen:application id="..." required_version="2.4"/>
```

## Files Changed
- `config.xml` - Update required_version

## Testing
1. Build the app
2. Install on Tizen 2.4 (2016) TV - should work
3. Verify app launches and all features work

## Rollback
Change required_version back to "2.3".

---

# TASK 11: Add 4K/8K Detection Privileges

## What
Add `productinfo` privilege to enable panel resolution detection.

## Why
This allows the app to detect if the TV supports 4K/8K and optimize playback accordingly.

## How

### Step 1: Open `config.xml`

### Step 2: Add privilege after existing privileges:
```xml
<tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>
<!-- Add this line: -->
<tizen:privilege name="http://tizen.org/privilege/productinfo"/>
```

### Step 3 (Optional): Add metadata for resolution detection:
```xml
<tizen:metadata key="http://samsung.com/tv/metadata/use.screen.size" value="true"/>
```

## Files Changed
- `config.xml` - Add productinfo privilege

## Testing
1. Build and install app
2. App should launch without privilege errors
3. (Future) Resolution detection API will work

## Rollback
Remove the productinfo privilege line.

---

# TASK 12: Add Mouse Support

## What
Enable mouse/pointer support for 2021+ Samsung TVs with Magic Remote-like features.

## Why
Newer Samsung TVs (2021+) have pointer support. Without this setting, mouse events won't work.

## How

### Step 1: Open `config.xml`

### Step 2: Find or add the tizen:setting element:
```xml
<widget ... >
    <!-- Find tizen:setting or add it -->
    <tizen:setting pointing-device-support="enable"/>
</widget>
```

## Files Changed
- `config.xml` - Add pointing-device-support setting

## Testing
1. Build and install on 2021+ Samsung TV
2. If TV has pointer support, verify mouse cursor appears
3. Verify clicking works on buttons and menus
4. Verify app still works normally on 2016-2020 TVs (D-pad only)

## Rollback
Remove or set pointing-device-support="disable".

---

# TASK 13: Add IME Keyboard Handling

## What
Handle Done and Cancel keys from the virtual keyboard (IME).

## Why
When user finishes typing in search or login fields, pressing Done or Cancel on the virtual keyboard should properly close it and return focus.

## How

### Step 1: Add IME key codes to key handler:
```javascript
// IME (Virtual Keyboard) key codes
var IME_DONE = 65376;
var IME_CANCEL = 65385;
```

### Step 2: Handle these keys in the key handler:
```javascript
case 65376: // IME Done button
    // Blur the input to close keyboard
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        document.activeElement.blur();
    }
    // Trigger search if in search page
    if (currentPage === 'search') {
        performSearch();
    }
    break;

case 65385: // IME Cancel button
    // Blur and close keyboard
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        document.activeElement.blur();
    }
    break;
```

## Files Changed
- `js/common.js` or `js/key_handler.js` - Add IME key handling
- `js/search_page.js` - Ensure search triggers on Done

## Testing
1. Go to Search page
2. Focus on search input
3. Virtual keyboard appears
4. Type something
5. Press Done - keyboard closes, search executes
6. Open keyboard again
7. Press Cancel - keyboard closes, focus returns to page
8. Test on Login page if applicable

## Rollback
Remove IME key handlers.

---

# TASK 14: Add mediastorage Privilege

## What
Add the `mediastorage` privilege required for USB storage access.

## Why
Without this privilege:
- USB storage detection will fail
- App will fail Samsung certification
- Storage Play feature won't work

## How

### Step 1: Open `config.xml`

### Step 2: Add privilege after existing filesystem privileges:
```xml
<tizen:privilege name="http://tizen.org/privilege/filesystem.read"/>
<tizen:privilege name="http://tizen.org/privilege/filesystem.write"/>
<!-- Add this line: -->
<tizen:privilege name="http://tizen.org/privilege/mediastorage"/>
```

## Files Changed
- `config.xml` - Add mediastorage privilege

## Testing
1. Build and install app
2. App should launch without privilege errors
3. (After Task 16) USB detection will work

## Rollback
Remove the mediastorage privilege line.

---

# TASK 15: Fix CSS Custom Properties

## What
Replace CSS custom properties (variables) with hardcoded values for 2016 TV compatibility.

## Why
CSS custom properties (`--variable-name`) are NOT supported on:
- Samsung 2016 TVs (Webkit r152340)
- Samsung 2017 TVs (Chrome 47)

The app must use hardcoded values for these older browsers.

## How

### Step 1: Search for CSS variables in the codebase:
```bash
grep -r "var(--" css/
grep -r ":root" css/
```

### Step 2: For each variable found, replace with its value:
```css
/* CURRENT (won't work on 2016) */
:root {
    --primary-color: #e50914;
    --secondary-color: #141414;
    --text-color: #ffffff;
}

.button {
    background-color: var(--primary-color);
    color: var(--text-color);
}

/* FIXED (works everywhere) */
.button {
    background-color: #e50914;
    color: #ffffff;
}
```

### Step 3: Remove :root declarations if no longer needed.

### Step 4: Document the color values for future reference:
```css
/* 
 * COLOR REFERENCE (do not use CSS variables for 2016 TV compatibility)
 * Primary: #e50914
 * Secondary: #141414
 * Text: #ffffff
 */
```

## Files Changed
- `css/style.css` - Replace CSS variables
- `css/variables.css` - Remove or convert (if exists)
- Any other CSS files with variables

## Testing
1. Build and install on 2016/2017 TV
2. Verify all colors display correctly
3. Verify no styling is broken
4. Compare with 2020+ TV - should look identical

## Rollback
Restore CSS variables (but app won't work on 2016-2017 TVs).

---

# TASK 16: Fix USB Storage Play

## What
Restore the broken USB storage detection callback and add device attach/detach listeners.

## Why
The Storage Play feature has the code but it's broken:
- `checkCorruptedRemovableDrives` callback is undefined
- No listeners for USB plug/unplug events
- Devices never get enumerated

## How

### Step 1: Open `js/storage_operation.js`

### Step 2: Find the listStorages call:
```javascript
// CURRENT (broken)
tizen.filesystem.listStorages(checkCorruptedRemovableDrives);
// checkCorruptedRemovableDrives is undefined!
```

### Step 3: Create/restore the callback function:
```javascript
function onStoragesFound(storages) {
    console.log('Found ' + storages.length + ' storage devices');
    
    // Filter to only removable storage (USB)
    var removableStorages = [];
    for (var i = 0; i < storages.length; i++) {
        if (storages[i].type === 'REMOVABLE') {
            removableStorages.push(storages[i]);
        }
    }
    
    // Store for later use
    storage_page.storages = removableStorages;
    
    // Update UI
    if (removableStorages.length > 0) {
        storage_page.initPage();
    } else {
        showNoStorageMessage();
    }
}

function onStoragesError(error) {
    console.error('Failed to list storages:', error);
    showNoStorageMessage();
}
```

### Step 4: Update the listStorages call:
```javascript
try {
    tizen.filesystem.listStorages(onStoragesFound, onStoragesError);
} catch (e) {
    console.error('Storage API not available:', e);
}
```

### Step 5: Add storage change listener for plug/unplug:
```javascript
function initStorageListeners() {
    try {
        tizen.filesystem.addStorageStateChangeListener(function(storage) {
            console.log('Storage changed:', storage.label, storage.state);
            
            if (storage.state === 'MOUNTED') {
                // USB plugged in - refresh list
                tizen.filesystem.listStorages(onStoragesFound, onStoragesError);
            } else if (storage.state === 'UNMOUNTED' || storage.state === 'REMOVED') {
                // USB removed - update UI
                removeStorageFromList(storage.label);
            }
        });
    } catch (e) {
        console.error('Could not add storage listener:', e);
    }
}

// Call on app init
initStorageListeners();
```

## Files Changed
- `js/storage_operation.js` - Fix callback and add listeners

## Testing
1. Open Storage Play page (with no USB)
2. Verify "No storage devices" message shows
3. Plug in USB drive
4. Verify USB appears in list
5. Navigate into USB, browse folders
6. Play a video file from USB
7. View an image from USB
8. Remove USB while in Storage Play
9. Verify UI updates to show "No storage"
10. Verify no crashes or errors

## Rollback
Revert storage_operation.js changes.

---

# Quick Reference: Key Codes

| Key | Samsung | LG | Standard |
|-----|---------|-----|----------|
| BACK/RETURN | 10009 | 461 | 8 |
| ENTER/OK | 13 | 13 | 13 |
| UP | 38 | 38 | 38 |
| DOWN | 40 | 40 | 40 |
| LEFT | 37 | 37 | 37 |
| RIGHT | 39 | 39 | 39 |
| PLAY | 415 | 415 | - |
| PAUSE | 19 | 19 | - |
| STOP | 413 | 413 | - |
| REW | 412 | 412 | - |
| FF | 417 | 417 | - |
| RED | 403 | 403 | - |
| GREEN | 404 | 404 | - |
| YELLOW | 405 | 405 | - |
| BLUE | 406 | 406 | - |
| IME DONE | 65376 | - | - |
| IME CANCEL | 65385 | - | - |

---

# If Something Breaks

1. **Identify** which task caused the issue
2. **Revert** that specific task using git:
   ```bash
   git checkout -- <file>
   ```
3. **Report** the issue for investigation
4. **Continue** with other tasks

---

*Document created by FLIX IPTV Development Team*  
*Last updated: December 4, 2025*
