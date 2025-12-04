"use strict";
var series_summary_page={
    keys:{
        index:1,
        buttons:[]
    },
    min_btn_index:0,
    is_loading:false,
    prev_route:'',
    buttons:$('.series-action-btn'),
    init:function(prev_route){
        this.prev_route=prev_route;
        showLoader(true);
        this.is_loading=true;
        $('#series-summary-image-wrapper img').attr('src','');
        $('.vod-series-background-img').attr('src','').hide();
        $('#series-summary-name').text(current_series.name);
        $('#series-summary-release-date').text(current_series.releasedate);
        $('#series-summary-release-genre').text(current_series.genre);
        $('#series-summary-release-length').text(current_series.duration);
        $('#series-summary-release-country').text(current_series.country);
        $('#series-summary-release-director').text(current_series.director);
        $('#series-summary-release-cast').text(current_series.cast);
        $('#series-summary-description').text(current_series.plot);
        $('#series-summary-image-wrapper img').attr('src',current_series.cover)
        var backdrop_image='';
        try{
            backdrop_image=current_series.backdrop_path[0];
        }catch (e) {
        }
        
        // Use backdrop if available, otherwise use poster as fallback
        if(backdrop_image) {
            $('.vod-series-background-img').attr('src', backdrop_image).show().on('error', function() {
                $(this).hide();
            });
        } else if(current_series.cover) {
            $('.vod-series-background-img').attr('src', current_series.cover).show().on('error', function() {
                $(this).hide();
            });
        } else {
            $('.vod-series-background-img').hide();
        }
        this.hoverButtons(1);
        if(current_series.is_favourite){
            $(this.buttons[2]).data('action','remove')
            $(this.buttons[2]).find('.vod-series-action-btn-txt').text('Remove Favourite')
        }
        else{
            $(this.buttons[2]).data('action','add')
            $(this.buttons[2]).find('.vod-series-action-btn-txt').text('Add Favourite')
        }
        var rating=0;
        if(typeof current_series.rating==="undefined" || current_series.rating==="")
            rating=0;
        else
            rating=parseFloat(current_series.rating);
        if(isNaN(rating))
            rating=0;
        $('#series-rating-container').find('.rating-upper').css({width:rating*10+"%"});
        $('#series-rating-mark').text(rating.toFixed(1));
        if(typeof current_series.youtube_trailer!='undefined' && current_series.youtube_trailer!=null && current_series.youtube_trailer.trim()!==''){
            this.min_btn_index=0;
            $('#series-watch-trailer-button').show();
        }else{
            this.min_btn_index=1;
            $('#series-watch-trailer-button').hide();
        }
        $('#current-series-category').text('');
        var categories=SeriesModel.categories;
        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id==current_series.category_id){
                $('#current-series-category').text(categories[i].category_name);
                break;
            }
        }

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
                    // If currently viewing favorites category, refresh the content
                    if(typeof current_category !== 'undefined' && current_category.category_id === 'favourite') {
                        // Refresh current_category from model to get updated movies array
                        current_category = SeriesModel.getRecentOrFavouriteCategory('favourite');
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
        this.keys.index=index;
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
    addFavorite:function(targetElement){
        var action=$(targetElement).data('action');
        if(action==="add"){
            SeriesModel.addRecentOrFavouriteMovie(current_series,'favourite');
            current_series.is_favourite=true;
            // End
            $(targetElement).data('action','remove');
            $(targetElement).find('.vod-series-action-btn-txt').text('Remove Favourite');
        }
        else{
            current_series.is_favourite=false;
            SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,'favourite')
            $(targetElement).data('action','add');
            $(targetElement).find('.vod-series-action-btn-txt').text('Add Favourite');
        }
        favourites_dirty = true;
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
        switch (e.keyCode) {
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.LEFT:
                this.keyMove(-1);
                break;
            case tvKey.RIGHT:
                this.keyMove(1);
                break;
            case tvKey.YELLOW:
                if(!current_series.is_favourite){
                    SeriesModel.addRecentOrFavouriteMovie(current_series, 'favourite');
                    current_series.is_favourite=true;
                }
                else{
                    SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,"favourite");
                    current_series.is_favourite=false;
                }
                favourites_dirty = true;
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
        }
    }
}
