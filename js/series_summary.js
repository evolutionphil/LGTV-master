"use strict";
var series_summary_page={
    keys:{
        index:1,
        buttons:[],
        focused_part: 'buttons',
        similar_index: 0,
        dropdown_open: false,
        dropdown_index: 0
    },
    min_btn_index:0,
    is_loading:false,
    prev_route:'',
    buttons:$('#series-summary-page .series-action-btn'),
    similar_series: [],
    init:function(prev_route){
        this.prev_route=prev_route;
        showLoader(true);
        this.is_loading=true;
        this.similar_series = [];
        this.keys.similar_index = 0;
        this.keys.focused_part = 'buttons';
        this.keys.dropdown_open = false;
        this.keys.dropdown_index = 0;
        $('#season-dropdown').hide();
        $('.season-dropdown-wrapper').removeClass('open');
        $('#similar-series-section').hide();
        $('#series-summary-image-wrapper img').attr('src','');
        $('#series-summary-page .vod-series-background-img').attr('src','').hide();
        $('#series-summary-name').text(current_series.name);
        $('#series-summary-release-date').text(current_series.releasedate || '');
        $('#series-summary-release-genre').text(current_series.genre || '');
        $('#series-summary-release-country').text(current_series.country || '');
        $('#series-summary-release-director').text(current_series.director || '');
        $('#series-summary-release-cast').text(current_series.cast || '');
        $('#series-summary-description').text(current_series.plot || '');
        if(current_series.seasons && current_series.seasons.length > 0) {
            var seasonText = current_series.seasons.length + ' Season' + (current_series.seasons.length > 1 ? 's' : '');
            $('#series-summary-seasons-count').text(seasonText);
        } else {
            $('#series-summary-seasons-count').text('');
        }
        $('#series-summary-image-wrapper img').attr('src',current_series.cover);
        var backdrop_image='';
        try{
            backdrop_image=current_series.backdrop_path[0];
        }catch (e) {
        }
        
        // Use backdrop if available, otherwise use poster as fallback
        if(backdrop_image) {
            $('#series-summary-page .vod-series-background-img').attr('src', backdrop_image).show().on('error', function() {
                $(this).hide();
            });
        } else if(current_series.cover) {
            $('#series-summary-page .vod-series-background-img').attr('src', current_series.cover).show().on('error', function() {
                $(this).hide();
            });
        } else {
            $('#series-summary-page .vod-series-background-img').hide();
        }
        this.buttons = $('#series-summary-page .series-action-btn');
        this.hoverButtons(1);
        if(current_series.is_favourite){
            $(this.buttons[2]).data('action','remove');
            $(this.buttons[2]).find('span').text('Remove');
            $(this.buttons[2]).find('i').removeClass('fa-heart').addClass('fa-heart-broken');
        }
        else{
            $(this.buttons[2]).data('action','add');
            $(this.buttons[2]).find('span').text('Favorite');
            $(this.buttons[2]).find('i').removeClass('fa-heart-broken').addClass('fa-heart');
        }
        var rating=0;
        if(typeof current_series.rating==="undefined" || current_series.rating==="")
            rating=0;
        else
            rating=parseFloat(current_series.rating);
        if(isNaN(rating))
            rating=0;
        $('#series-rating-mark').text(rating.toFixed(1));
        if(rating > 0) {
            $('#series-rating-container').show();
        } else {
            $('#series-rating-container').hide();
        }
        if(typeof current_series.youtube_trailer!='undefined' && current_series.youtube_trailer!=null && current_series.youtube_trailer.trim()!==''){
            this.min_btn_index=0;
            $('#series-watch-trailer-button').show();
        }else{
            this.min_btn_index=1;
            $('#series-watch-trailer-button').hide();
        }
        $('#current-series-category').text('');
        var categories=SeriesModel.categories;
        var currentCategoryName = '';
        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id==current_series.category_id){
                currentCategoryName = categories[i].category_name;
                $('#current-series-category').text(currentCategoryName);
                break;
            }
        }
        
        var that = this;
        this.loadSimilarSeries(current_series, currentCategoryName);

        // Fetch detailed series info from XTREME API for TMDB data
        if(settings.playlist_type==="xtreme"){
            console.log('=== SERIES API CALL PREPARATION ===');
            console.log('Current series object:', current_series);
            console.log('Series ID field:', current_series.series_id);
            console.log('Stream ID field:', current_series.stream_id);
            
            var seriesApiId = current_series.stream_id || current_series.series_id;
            console.log('Using API ID:', seriesApiId);
            
            $.getJSON(api_host_url + '/player_api.php?username=' + user_name + '&password=' + password + '&action=get_series_info&series_id=' + seriesApiId)
                .then(
                    function(response){
                        console.log('=== XTREME API get_series_info RESPONSE ANALYSIS ===');
                        console.log('Full API response:', response);
                        console.log('Info object:', response.info);
                        
                        var info = response.info;
                        
                        // Store complete info object
                        current_series.info = info;
                        
                        // CRITICAL: Extract TMDB ID from API response for series
                        // Try multiple possible field names for TMDB ID
                        var seriesTmdbId = response.info.tmdb_id || response.info.tmdb || response.info.movie_db_id || response.info.moviedb_id;
                        
                        if(seriesTmdbId) {
                            current_series.tmdb_id = seriesTmdbId;
                            console.log('✅ SERIES TMDB ID extracted and stored:', current_series.tmdb_id);
                        } else {
                            // EXOAPP COMPATIBILITY: Try to derive series TMDB from first episode with TMDB ID
                            console.log('⚠️ NO SERIES TMDB ID in API response - checking episodes for fallback');
                            var derivedSeriesTmdb = null;
                            
                            // Check first episode in first season for TMDB ID
                            if(response.episodes) {
                                var firstSeasonKey = Object.keys(response.episodes)[0];
                                if(firstSeasonKey && response.episodes[firstSeasonKey].length > 0) {
                                    var firstEpisode = response.episodes[firstSeasonKey][0];
                                    if(firstEpisode.info && firstEpisode.info.tmdb_id) {
                                        // In TMDB, episode IDs are different from series IDs, 
                                        // but we can use episode presence to indicate series has TMDB support
                                        console.log('✅ Episodes have TMDB IDs - series supports enhanced subtitle matching');
                                        // Don't set series TMDB since we don't have it, but episodes will work
                                    }
                                }
                            }
                            
                            console.log('ℹ️ Series TMDB not available - will use episode-level TMDB IDs for precise matching');
                        }
                        
                        // Process seasons and episodes with TMDB data - EXOAPP METHODOLOGY
                        console.log('=== EPISODES DATA PROCESSING (EXOAPP METHODOLOGY) ===');
                        console.log('Seasons from API:', response.seasons);
                        console.log('Episodes from API:', response.episodes);
                        
                        var seasons = response.seasons;
                        var episodes = response.episodes;  // Episodes grouped by season number
                        
                        // Process episodes into season structure following exoapp
                        if(response.episodes && seasons && seasons.length > 0) {
                            console.log('✅ Processing episodes with existing seasons data');
                            
                            // Map episodes to their respective seasons
                            seasons.map(function(season) {
                                var seasonKey = season.season_number.toString();
                                season.episodes = episodes[seasonKey] || [];
                                
                                console.log('Season ' + season.season_number + ' episodes:', season.episodes.length);
                                
                                // CRITICAL: Propagate series TMDB ID to episodes for fallback
                                if(season.episodes.length > 0) {
                                    season.episodes.forEach(function(episode, index) {
                                        // Add series TMDB ID to each episode for SubtitleFetcher fallback (if available)
                                        episode.series_tmdb_id = current_series.tmdb_id || null;
                                        
                                        if(episode.info && episode.info.tmdb_id) {
                                            console.log('  Episode ' + (index + 1) + ' - Episode TMDB ID:', episode.info.tmdb_id, '| Series TMDB ID:', episode.series_tmdb_id);
                                        } else {
                                            console.log('  Episode ' + (index + 1) + ' - NO Episode TMDB ID | Series TMDB ID:', episode.series_tmdb_id);
                                        }
                                    });
                                }
                            });
                            
                            current_series.seasons = seasons;
                            
                        } else if(episodes) {
                            console.log('✅ Creating seasons from episodes data (no seasons metadata)');
                            
                            // No seasons data - create seasons from episode keys
                            seasons = [];
                            Object.keys(episodes).map(function(key, index) {
                                var seasonEpisodes = episodes[key];
                                
                                console.log('Creating Season ' + (index + 1) + ' with ' + seasonEpisodes.length + ' episodes');
                                
                                // CRITICAL: Propagate series TMDB ID to episodes before adding to season (if available)
                                seasonEpisodes.forEach(function(episode, episodeIndex) {
                                    episode.series_tmdb_id = current_series.tmdb_id || null;
                                    
                                    if(episode.info && episode.info.tmdb_id) {
                                        console.log('  S' + key + ' E' + (episodeIndex + 1) + ' - Episode TMDB ID:', episode.info.tmdb_id, '| Series TMDB ID:', episode.series_tmdb_id);
                                    } else {
                                        console.log('  S' + key + ' E' + (episodeIndex + 1) + ' - NO Episode TMDB ID | Series TMDB ID:', episode.series_tmdb_id);
                                    }
                                });
                                
                                seasons.push({
                                    season_number: parseInt(key),
                                    name: "Season " + key,
                                    cover: "images/404.png",
                                    episodes: seasonEpisodes  // Each episode now has both info.tmdb_id and series_tmdb_id
                                });
                            });
                            
                            current_series.seasons = seasons;
                        }
                        
                        console.log('=== EPISODE STRUCTURE COMPLETE ===');
                        console.log('Total seasons processed:', current_series.seasons ? current_series.seasons.length : 0);
                        
                        // Update seasons count display
                        if(current_series.seasons && current_series.seasons.length > 0) {
                            var seasonText = current_series.seasons.length + ' Season' + (current_series.seasons.length > 1 ? 's' : '');
                            $('#series-summary-seasons-count').text(seasonText);
                        }
                        
                        // Update enhanced info if available
                        if(info.plot && info.plot !== current_series.plot) {
                            current_series.plot = info.plot;
                            $('#series-summary-description').text(info.plot);
                        }
                        if(info.backdrop_path && info.backdrop_path.length > 0) {
                            var enhancedBackdrop = info.backdrop_path[0];
                            if(enhancedBackdrop) {
                                $('.vod-series-background-img').attr('src', enhancedBackdrop);
                            }
                        }
                        
                        console.log('=== SERIES DATA STORAGE COMPLETE ===');
                        console.log('Current series enhanced data - Name:', current_series.name, 'TMDB:', current_series.tmdb_id);
                    }
                )
                .fail(
                    function(error) {
                        console.log('⚠️ Failed to fetch series info:', error);
                    }
                )
        }
        
        showLoader(false);
        this.is_loading=false;
        current_route="series-summary-page";
        $('#series-summary-page').show();
    },
    goBack:function(){
        current_route=this.prev_route;
        $('#series-summary-page').hide();
        switch (this.prev_route) {
            case "home-page":
                home_page.reEnter();
                // Check if favorites need refresh
                if(favourites_dirty) {
                    favourites_dirty = false;
                    // Update the favorites count in submenu
                    if(typeof home_page.updateRecentFavouriteMoviesCount === 'function') {
                        home_page.updateRecentFavouriteMoviesCount();
                    }
                    // If currently viewing favorites category, refresh the grid
                    if(typeof current_category !== 'undefined' && current_category.category_id === 'favourite') {
                        // Find the favorite category directly from the model's categories array
                        var categories = SeriesModel.categories;
                        for(var i = 0; i < categories.length; i++) {
                            if(categories[i].category_id === 'favourite') {
                                current_category = categories[i];
                                break;
                            }
                        }
                        // Rebuild the grid with updated favorites
                        setTimeout(function() {
                            home_page.showCategoryContent();
                        }, 100);
                    }
                }
                break;
            case "search-page":
                $('#search-page').show();
                break;
        }
    },
    hoverButtons:function(index){
        $(this.buttons).removeClass('active');
        $('#similar-series-container .similar-movie-item').removeClass('active');
        this.keys.index=index;
        this.keys.focused_part = 'buttons';
        $(this.buttons[index]).addClass('active');
    },
    keyMove:function(increment){
        var keys=this.keys;
        keys.index+=increment;
        var min_btn_index=this.min_btn_index;
        if(keys.index<min_btn_index)
            keys.index=2;
        if(keys.index>2)
            keys.index=min_btn_index;
        $('.series-action-btn').removeClass('active');
        $($('.series-action-btn')[keys.index]).addClass('active');
    },
    handleMenuClick:function(){
        var keys=this.keys;
        var buttons=$('.series-action-btn');
        var current_button=buttons[keys.index];
        $(current_button).trigger('click');
    },
    showTrailerVideo:function(){
        trailer_page.back_url="series-summary-page";
        if(!current_series.youtube_trailer){
            showToast("Sorry",'No trailer video available')
        }else
            trailer_page.init(current_series.youtube_trailer,'series-summary-page');
    },
    showSeason:function(){
        seasons_variable.init();
    },
    toggleSeasonDropdown: function(){
        if(this.keys.dropdown_open){
            this.closeSeasonDropdown();
        } else {
            this.openSeasonDropdown();
        }
    },
    openSeasonDropdown: function(){
        var seasons = current_series.seasons || [];
        if(seasons.length === 0){
            showToast("Info", "Sezon bilgisi yükleniyor veya mevcut değil");
            return;
        }
        if(seasons.length === 1){
            current_season = seasons[0];
            episode_variable.init();
            return;
        }
        var html = '';
        for(var i = 0; i < seasons.length; i++){
            var seasonName = seasons[i].name || ('Season ' + seasons[i].season_number);
            html += '<div class="season-dropdown-item" data-index="' + i + '" ' +
                    'onmouseenter="series_summary_page.hoverDropdownItem(' + i + ')" ' +
                    'onclick="series_summary_page.selectSeasonFromDropdown(' + i + ')">' +
                    seasonName + '</div>';
        }
        $('#season-dropdown-list').html(html);
        $('#season-dropdown').show();
        $('.season-dropdown-wrapper').addClass('open');
        this.keys.dropdown_open = true;
        this.keys.dropdown_index = 0;
        this.keys.dropdown_opener_index = this.keys.index;
        this.keys.focused_part = 'dropdown';
        $(this.buttons).removeClass('active');
        this.hoverDropdownItem(0);
    },
    closeSeasonDropdown: function(){
        $('#season-dropdown').hide();
        $('.season-dropdown-wrapper').removeClass('open');
        this.keys.dropdown_open = false;
        this.keys.focused_part = 'buttons';
        var restoreIndex = this.keys.dropdown_opener_index || 1;
        this.hoverButtons(restoreIndex);
    },
    hoverDropdownItem: function(index){
        var items = $('.season-dropdown-item');
        if(index < 0) index = 0;
        if(index >= items.length) index = items.length - 1;
        this.keys.dropdown_index = index;
        items.removeClass('active');
        $(items[index]).addClass('active');
        var dropdown = $('#season-dropdown');
        var activeItem = items[index];
        if(activeItem){
            var itemTop = activeItem.offsetTop;
            var itemHeight = activeItem.offsetHeight;
            var dropdownHeight = dropdown.height();
            var scrollTop = dropdown.scrollTop();
            if(itemTop < scrollTop){
                dropdown.scrollTop(itemTop);
            } else if(itemTop + itemHeight > scrollTop + dropdownHeight){
                dropdown.scrollTop(itemTop + itemHeight - dropdownHeight);
            }
        }
    },
    selectSeasonFromDropdown: function(index){
        var seasons = current_series.seasons || [];
        if(index >= 0 && index < seasons.length){
            current_season = seasons[index];
            this.closeSeasonDropdown();
            episode_variable.init();
        }
    },
    addFavorite:function(targetElement){
        var action=$(targetElement).data('action');
        if(action==="add"){
            SeriesModel.addRecentOrFavouriteMovie(current_series,'favourite');
            current_series.is_favourite=true;
            $(targetElement).data('action','remove');
            $(targetElement).find('span').text('Remove');
            $(targetElement).find('i').removeClass('fa-heart').addClass('fa-heart-broken');
        }
        else{
            current_series.is_favourite=false;
            SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,'favourite');
            $(targetElement).data('action','add');
            $(targetElement).find('span').text('Favorite');
            $(targetElement).find('i').removeClass('fa-heart-broken').addClass('fa-heart');
        }
        favourites_dirty = true;
    },
    loadSimilarSeries: function(series, categoryName) {
        var that = this;
        var allSeries = SeriesModel.movies || [];
        var similar = [];
        var seriesName = (series.name || '').toLowerCase();
        var seriesGenre = (series.genre || '').toLowerCase();
        
        var franchisePatterns = [
            /^(.*?)\s*[\:\-]\s*season\s*\d+/i,
            /^(.*?)\s*[\(\[]\d{4}[\)\]]/i,
            /^(.*?)\s*\d+$/i
        ];
        
        var baseName = seriesName;
        for(var p = 0; p < franchisePatterns.length; p++) {
            var match = seriesName.match(franchisePatterns[p]);
            if(match && match[1]) {
                baseName = match[1].trim();
                break;
            }
        }
        
        allSeries.forEach(function(s) {
            if(s.series_id === series.series_id) return;
            
            var sName = (s.name || '').toLowerCase();
            var sGenre = (s.genre || '').toLowerCase();
            var score = 0;
            
            if(baseName.length > 3 && sName.indexOf(baseName) !== -1) {
                score += 100;
            }
            
            if(s.category_id === series.category_id) {
                score += 30;
            }
            
            if(seriesGenre && sGenre) {
                var genres1 = seriesGenre.split(/[,\/]/);
                var genres2 = sGenre.split(/[,\/]/);
                genres1.forEach(function(g1) {
                    g1 = g1.trim();
                    if(g1.length > 2) {
                        genres2.forEach(function(g2) {
                            if(g2.trim() === g1) score += 15;
                        });
                    }
                });
            }
            
            if(score > 0) {
                similar.push({ series: s, score: score });
            }
        });
        
        similar.sort(function(a, b) { return b.score - a.score; });
        similar = similar.slice(0, 10);
        
        if(similar.length > 0) {
            this.similar_series = similar.map(function(item) { return item.series; });
            this.renderSimilarSeries();
            $('#similar-series-section').show();
        } else {
            $('#similar-series-section').hide();
        }
    },
    renderSimilarSeries: function() {
        var html = '';
        var that = this;
        this.similar_series.forEach(function(series, index) {
            var cover = series.cover || 'images/series.png';
            var name = series.name || '';
            html += '<div class="similar-movie-item" data-index="' + index + '" ' +
                    'onmouseenter="series_summary_page.hoverSimilarSeries(' + index + ')" ' +
                    'onclick="series_summary_page.selectSimilarSeries(' + index + ')">' +
                    '<img src="' + cover + '" onerror="this.src=\'images/series.png\'">' +
                    '<div class="similar-movie-name">' + name + '</div>' +
                    '</div>';
        });
        $('#similar-series-container').html(html);
    },
    hoverSimilarSeries: function(index) {
        if(index < 0) index = 0;
        if(index >= this.similar_series.length) index = this.similar_series.length - 1;
        
        this.keys.similar_index = index;
        $('#similar-series-container .similar-movie-item').removeClass('active');
        
        var activeItem = $('#similar-series-container .similar-movie-item[data-index="' + index + '"]');
        activeItem.addClass('active');
        
        var nameElement = activeItem.find('.similar-movie-name');
        if(nameElement.length > 0) {
            nameElement.removeClass('marquee').find('.marquee-content').each(function() {
                var text = $(this).text().split('    ')[0].trim();
                $(this).parent().text(text);
            });
            
            var textWidth = nameElement[0].scrollWidth;
            var containerWidth = nameElement.width();
            if(textWidth > containerWidth + 5) {
                nameElement.addClass('marquee');
                var originalText = nameElement.text();
                nameElement.html('<span class="marquee-content">' + originalText + '&nbsp;&nbsp;&nbsp;&nbsp;' + originalText + '</span>');
            }
        }
    },
    selectSimilarSeries: function(index) {
        var selectedSeries = this.similar_series[index];
        if(selectedSeries) {
            current_series = selectedSeries;
            this.init(this.prev_route);
        }
    },
    HandleKey:function (e) {
        if(this.is_loading){
            if(e.keyCode===tvKey.RETURN){
                showLoader(false);
                this.is_loading=false;
                this.goBack();
            }
            return;
        }
        var keys = this.keys;
        
        if(keys.dropdown_open){
            switch(e.keyCode){
                case tvKey.RETURN:
                    this.closeSeasonDropdown();
                    break;
                case tvKey.UP:
                    if(keys.dropdown_index > 0){
                        this.hoverDropdownItem(keys.dropdown_index - 1);
                    }
                    break;
                case tvKey.DOWN:
                    var items = $('.season-dropdown-item');
                    if(keys.dropdown_index < items.length - 1){
                        this.hoverDropdownItem(keys.dropdown_index + 1);
                    }
                    break;
                case tvKey.ENTER:
                    this.selectSeasonFromDropdown(keys.dropdown_index);
                    break;
                case tvKey.LEFT:
                case tvKey.RIGHT:
                    break;
            }
            return;
        }
        
        switch (e.keyCode) {
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.LEFT:
                if(keys.focused_part === 'similar') {
                    if(keys.similar_index > 0) {
                        this.hoverSimilarSeries(keys.similar_index - 1);
                    }
                } else {
                    this.keyMove(-1);
                }
                break;
            case tvKey.RIGHT:
                if(keys.focused_part === 'similar') {
                    if(keys.similar_index < this.similar_series.length - 1) {
                        this.hoverSimilarSeries(keys.similar_index + 1);
                    }
                } else {
                    this.keyMove(1);
                }
                break;
            case tvKey.UP:
                if(keys.focused_part === 'similar') {
                    keys.focused_part = 'buttons';
                    $('#similar-series-container .similar-movie-item').removeClass('active');
                    $(this.buttons[keys.index]).addClass('active');
                }
                break;
            case tvKey.DOWN:
                if(keys.focused_part === 'buttons' && this.similar_series.length > 0) {
                    keys.focused_part = 'similar';
                    $(this.buttons).removeClass('active');
                    this.hoverSimilarSeries(keys.similar_index);
                }
                break;
            case tvKey.YELLOW:
                if(!current_series.is_favourite){
                    SeriesModel.addRecentOrFavouriteMovie(current_series, 'favourite');
                    current_series.is_favourite=true;
                    $(this.buttons[2]).find('span').text('Remove');
                    $(this.buttons[2]).find('i').removeClass('fa-heart').addClass('fa-heart-broken');
                }
                else{
                    SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,"favourite");
                    current_series.is_favourite=false;
                    $(this.buttons[2]).find('span').text('Favorite');
                    $(this.buttons[2]).find('i').removeClass('fa-heart-broken').addClass('fa-heart');
                }
                favourites_dirty = true;
                break;
            case tvKey.ENTER:
                if(keys.focused_part === 'similar') {
                    this.selectSimilarSeries(keys.similar_index);
                } else {
                    this.handleMenuClick();
                }
                break;
        }
    }
}
